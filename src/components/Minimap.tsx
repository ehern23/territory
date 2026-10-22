"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useAccountViews } from "@/store/selectors";
import { HEALTH_HEX } from "@/domain/health";
import { STREAM_PATH, accountPosition, groundCover, mountainFactor, terrainHeight } from "@/three/layout";
import { cameraPose } from "@/three/cameraPose";
import { GlassMorph, FoldButton } from "./glass/GlassMorph";
import { useUiStore } from "@/store/useUiStore";

/**
 * Map of the territory. Painted once from the same world functions as the
 * scene; the view cone follows the camera every frame. Click an account to
 * fly to it, anywhere else to glide there.
 */

const MIN_X = -1250;
const MAX_X = 1250;
const MIN_Z = -1500;
const MAX_Z = 1000;
const RES = 120;

function toMap(x: number, z: number, size: number) {
  return [((x - MIN_X) / (MAX_X - MIN_X)) * size, ((z - MIN_Z) / (MAX_Z - MIN_Z)) * size] as const;
}

function paintTerrain(): string {
  const canvas = document.createElement("canvas");
  canvas.width = RES;
  canvas.height = RES;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(RES, RES);
  for (let j = 0; j < RES; j++) {
    for (let i = 0; i < RES; i++) {
      const x = MIN_X + ((i + 0.5) / RES) * (MAX_X - MIN_X);
      const z = MIN_Z + ((j + 0.5) / RES) * (MAX_Z - MIN_Z);
      const c = groundCover(x, z);
      const m = mountainFactor(x, z);
      const h = m > 0.05 ? terrainHeight(x, z) : 0;
      const hx = m > 0.05 ? terrainHeight(x + 12, z) - h : 0;
      // Forest dark green, meadows lighter, rock grey, snow white; hillshade from the west.
      let r = 34 + c.open * 40;
      let g = 58 + c.open * 50;
      let b = 32 + c.open * 18;
      const rock = Math.min(1, Math.max(0, (h - 380) / 90));
      r += (120 - r) * rock;
      g += (118 - g) * rock;
      b += (112 - b) * rock;
      const snow = Math.min(1, Math.max(0, (h - 600) / 60));
      r += (225 - r) * snow;
      g += (230 - g) * snow;
      b += (235 - b) * snow;
      const shade = Math.max(0.6, Math.min(1.35, 1 - hx * 0.03));
      const o = (j * RES + i) * 4;
      img.data[o] = Math.min(255, r * shade);
      img.data[o + 1] = Math.min(255, g * shade);
      img.data[o + 2] = Math.min(255, b * shade);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export function Minimap() {
  const mode = useTerritoryStore((s) => s.mode);
  const introDone = useTerritoryStore((s) => s.introDone);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const enterAccount = useTerritoryStore((s) => s.enterAccount);
  const flyTo = useTerritoryStore((s) => s.flyTo);
  const setHovered = useTerritoryStore((s) => s.setHovered);
  const views = useAccountViews();
  const [image, setImage] = useState("");
  const open = useUiStore((s) => s.map);
  const setPanel = useUiStore((s) => s.setPanel);
  const cone = useRef<SVGGElement>(null);
  const size = 188;
  const visible = introDone && !isCompact && !(demoActive && mode === "account");

  useEffect(() => {
    // Defer the paint so it never competes with the first frames of the scene.
    const id = window.setTimeout(() => setImage(paintTerrain()), 400);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const g = cone.current;
      if (g) {
        const [x, y] = toMap(cameraPose.x, cameraPose.z, size);
        const deg = (-cameraPose.yaw * 180) / Math.PI;
        g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stream = useMemo(
    () =>
      STREAM_PATH.filter((_, i) => i % 3 === 0)
        .map((p, i) => {
          const [x, y] = toMap(p.x, p.y, size);
          return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" "),
    [],
  );

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * size;
    const my = ((e.clientY - r.top) / r.height) * size;
    const x = MIN_X + (mx / size) * (MAX_X - MIN_X);
    const z = MIN_Z + (my / size) * (MAX_Z - MIN_Z);
    flyTo(x, z);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="minimap"
          initial={{ opacity: 0, filter: "blur(8px)", scale: 0.98 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className={`absolute bottom-5 z-30 flex ${mode === "account" ? "left-4" : "right-4 justify-end"}`}
        >
          <GlassMorph
            as="div"
            open={open}
            onOpen={() => setPanel("map", true)}
            label="Territory map"
            className=""
            panelClassName="p-2.5"
            strength={40}
            blur={6}
            bubble={
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4z" />
                  <path d="M9 4v13.5M15 6.5V20" />
                </svg>
                <span className="text-paper-80">Map</span>
              </>
            }
          >
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="eyebrow">Territory map</span>
            <FoldButton onClick={() => setPanel("map", false)} label="Hide the map (M)" />
          </div>
          {(
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="block rounded-[14px] cursor-crosshair"
              onClick={onClick}
              role="img"
              aria-label="Map of accounts; click to travel"
            >
              <defs>
                <radialGradient id="mm-vignette" cx="50%" cy="50%" r="70%">
                  <stop offset="60%" stopColor="black" stopOpacity="0" />
                  <stop offset="100%" stopColor="black" stopOpacity="0.45" />
                </radialGradient>
                <linearGradient id="mm-cone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f2eee5" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#f2eee5" stopOpacity="0" />
                </linearGradient>
              </defs>
              {image ? <image href={image} width={size} height={size} preserveAspectRatio="none" /> : <rect width={size} height={size} fill="#22301f" />}
              <path d={stream} fill="none" stroke="#9cc4d8" strokeOpacity="0.85" strokeWidth="1.6" strokeLinecap="round" />
              <rect width={size} height={size} fill="url(#mm-vignette)" />
              <g ref={cone}>
                <path d="M0 0 L-16 44 L16 44 Z" fill="url(#mm-cone)" />
                <circle r="3" fill="#f2eee5" />
              </g>
              {views.map((v) => {
                const p = accountPosition(v.account.id);
                const [x, y] = toMap(p.x, p.z, size);
                const active = activeAccountId === v.account.id;
                return (
                  <g
                    key={v.account.id}
                    transform={`translate(${x} ${y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      enterAccount(v.account.id);
                    }}
                    onPointerEnter={() => setHovered(v.account.id)}
                    onPointerLeave={() => setHovered(null)}
                    className="cursor-pointer"
                  >
                    <title>{v.account.name}</title>
                    <circle r={active ? 8 : 6.5} fill="rgba(10,14,11,0.6)" />
                    <circle r={active ? 5 : 4} fill={HEALTH_HEX[v.health.band]} stroke="#f2eee5" strokeWidth={active ? 1.6 : 0.8} />
                  </g>
                );
              })}
            </svg>
          )}
          </GlassMorph>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
