"use client";

import { useEffect, useRef, useState } from "react";
import { perfStats, slot, summarize, type PerfSummary } from "@/lib/perfStats";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useExploreStore } from "@/store/useExploreStore";
import { useUiStore } from "@/store/useUiStore";
import { useBiomeStore } from "@/store/useBiomeStore";
import { useSkyStore } from "@/store/useSkyStore";

/**
 * Performance stats (sky panel, the ` key, or `?perf`): a live read-out of frame pacing. The graph shows every frame's
 * duration; a bar above the refresh line is a frame the display showed twice.
 * "Copy report" puts a plain-text summary on the clipboard to paste back.
 */

const GRAPH_W = 264;
const GRAPH_H = 72;
const GRAPH_MS = 50;

function report(s: PerfSummary) {
  const t = useTerritoryStore.getState();
  const e = useExploreStore.getState();
  const ui = useUiStore.getState();
  const fmt = (v: number | null, d = 1) => (v === null ? "n/a" : v.toFixed(d));
  return [
    `Territory perf report (${new Date().toISOString()})`,
    `Window: last ${s.seconds}s, ${s.frames} frames`,
    `Display: ~${s.refreshHz} Hz · FPS ${fmt(s.fps)} · 1% low ${fmt(s.low1)} · dropped ${s.dropped}`,
    `Frame ms: median ${fmt(s.medianFrame)} · worst ${fmt(s.worst)}`,
    `CPU ms: avg ${fmt(s.cpu)} · worst ${fmt(s.cpuWorst)}`,
    `GPU ms: avg ${fmt(s.gpu)} · worst ${fmt(s.gpuWorst)}${perfStats.gpuSupported ? "" : " (timer not exposed)"}`,
    `Draw calls ${perfStats.calls} · triangles ${perfStats.triangles.toLocaleString()} · programs ${perfStats.programs}`,
    `Canvas ${perfStats.width}x${perfStats.height} @ dpr ${perfStats.dpr} (device ${window.devicePixelRatio})`,
    `GPU: ${perfStats.renderer}`,
    `State: mode ${t.mode}, explore ${e.active ? (e.flying ? "flying" : "on foot") : "off"}, panels ${ui.overview ? "overview " : ""}${ui.map ? "map" : ""}`,
    `Biome ${useBiomeStore.getState().biome} · weather ${useSkyStore.getState().readout.weather} · touch ${t.isTouch} · lowPower ${t.lowPower}`,
    `UA: ${navigator.userAgent}`,
  ].join("\n");
}

export function PerfHud() {
  const perf = useUiStore((s) => s.perf);
  const setPerf = useUiStore((s) => s.setPerf);
  // Decided after mount so the server render and the first client render agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // ` toggles the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "`" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable)) return;
      setPerf(!useUiStore.getState().perf);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPerf]);
  return mounted && perf ? <PerfPanel onClose={() => setPerf(false)} /> : null;
}

function PerfPanel({ onClose }: { onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [s, setS] = useState<PerfSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setS(summarize(5)), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = canvas.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      ctx.clearRect(0, 0, GRAPH_W, GRAPH_H);
      const y = (ms: number) => GRAPH_H - (Math.min(ms, GRAPH_MS) / GRAPH_MS) * GRAPH_H;
      // Reference lines: 120, 60 and 30 fps.
      ctx.lineWidth = 1;
      for (const [ms, a] of [
        [8.33, 0.35],
        [16.67, 0.5],
        [33.3, 0.35],
      ] as const) {
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y(ms)) + 0.5);
        ctx.lineTo(GRAPH_W, Math.round(y(ms)) + 0.5);
        ctx.stroke();
      }
      const n = Math.min(perfStats.count, GRAPH_W / 2);
      let interval = 1000;
      for (let i = 0; i < n; i++) interval = Math.min(interval, perfStats.frame[slot(i)] || 1000);
      interval = Math.max(4, interval);
      for (let i = 0; i < n; i++) {
        const k = slot(i);
        const f = perfStats.frame[k];
        const x = GRAPH_W - (i + 1) * 2;
        ctx.fillStyle = f > interval * 2.5 ? "#ef6f5e" : f > interval * 1.5 ? "#e8b44c" : "#7fcf8a";
        ctx.fillRect(x, y(f), 2, GRAPH_H - y(f));
        const g = perfStats.gpu[k];
        if (!Number.isNaN(g)) {
          ctx.fillStyle = "rgba(140,190,255,0.9)";
          ctx.fillRect(x, y(g), 2, 1.5);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report(summarize(10)));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this report", report(summarize(10)));
    }
  };

  const fmt = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? "–" : v.toFixed(d));
  return (
    <div className="perf-hud" data-open={open}>
      <div className="perf-hud__head">
        <button type="button" className="perf-hud__title" onClick={() => setOpen((o) => !o)}>
          {open ? "Performance" : `${fmt(s?.fps, 0)} fps`}
        </button>
        <span className="flex gap-1.5">
          {open && (
            <button type="button" className="perf-hud__btn" onClick={copy}>
              {copied ? "Copied" : "Copy report"}
            </button>
          )}
          <button type="button" className="perf-hud__btn" onClick={onClose} aria-label="Hide performance stats" title="Hide (`)">
            ×
          </button>
        </span>
      </div>
      {open && (
        <>
          <div className="perf-hud__big">
            <div>
              <b>{fmt(s?.fps, 0)}</b>
              <span>fps</span>
            </div>
            <div>
              <b>{fmt(s?.low1, 0)}</b>
              <span>1% low</span>
            </div>
            <div>
              <b className={s && s.dropped > 0 ? "is-bad" : ""}>{s?.dropped ?? "–"}</b>
              <span>dropped / 5s</span>
            </div>
            <div>
              <b>{s?.refreshHz ?? "–"}</b>
              <span>Hz display</span>
            </div>
          </div>
          <canvas ref={canvas} width={GRAPH_W} height={GRAPH_H} className="perf-hud__graph" />
          <div className="perf-hud__legend">
            <span>bars: frame time · blue: GPU · lines: 120 / 60 / 30 fps</span>
          </div>
          <dl className="perf-hud__rows">
            <dt>Frame</dt>
            <dd>
              {fmt(s?.medianFrame)} ms median · {fmt(s?.worst)} worst
            </dd>
            <dt>CPU</dt>
            <dd>
              {fmt(s?.cpu)} ms avg · {fmt(s?.cpuWorst)} worst
            </dd>
            <dt>GPU</dt>
            <dd>{perfStats.gpuSupported ? `${fmt(s?.gpu)} ms avg · ${fmt(s?.gpuWorst)} worst` : "timer not exposed by browser"}</dd>
            <dt>Draws</dt>
            <dd>
              {perfStats.calls} calls · {(perfStats.triangles / 1e6).toFixed(2)}M tris
            </dd>
            <dt>Canvas</dt>
            <dd>
              {perfStats.width}×{perfStats.height} @ {perfStats.dpr}x
            </dd>
          </dl>
        </>
      )}
    </div>
  );
}
