"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useExploreStore } from "@/store/useExploreStore";
import { useUiStore } from "@/store/useUiStore";
import { exploreBridge } from "@/three/explore/ExploreController";
import { useLiquidGlass } from "./glass/Glass";

/**
 * Everything on screen for explore mode: the way in, a crosshair that names
 * the account giant you are looking at, a one-time key guide, and a status
 * pill with the way out.
 */

function Key({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <kbd className={`explore-key ${wide ? "explore-key--wide" : ""}`}>{children}</kbd>;
}

export function ExploreHud() {
  const active = useExploreStore((s) => s.active);
  const locked = useExploreStore((s) => s.locked);
  const flying = useExploreStore((s) => s.flying);
  const aim = useExploreStore((s) => s.aimAccountId);
  const showHint = useExploreStore((s) => s.showHint);
  const enter = useExploreStore((s) => s.enter);
  const dismissHint = useExploreStore((s) => s.dismissHint);
  const mode = useTerritoryStore((s) => s.mode);
  const introDone = useTerritoryStore((s) => s.introDone);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const aimName = useTerritoryStore((s) => (aim ? s.accountsById[aim]?.name : null));
  const mapOpen = useUiStore((s) => s.map);
  const enterRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const canEnter = !active && mode === "forest" && introDone && !demoActive && !isTouch;
  useLiquidGlass(enterRef, { radius: 999, strength: 22, blur: 6, saturate: 1.6, bevel: 12, enabled: canEnter });
  useLiquidGlass(pillRef, { radius: 999, strength: 22, blur: 6, saturate: 1.6, bevel: 12, enabled: active });
  useLiquidGlass(hintRef, { radius: 22, strength: 48, blur: 9, saturate: 1.5, enabled: active && showHint });

  // The guide steps aside once the explorer starts moving.
  useEffect(() => {
    if (!active || !showHint) return;
    const t = window.setTimeout(dismissHint, 14000);
    return () => window.clearTimeout(t);
  }, [active, showHint, dismissHint]);

  return (
    <>
      <AnimatePresence>
        {canEnter && (
          <motion.button
            ref={enterRef}
            key="explore-enter"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35 }}
            className={`glass glass-pill absolute right-4 z-30 flex items-center gap-2 h-9 pl-3.5 pr-2 text-[12.5px] text-paper transition-[bottom] duration-500 ${mapOpen ? "bottom-[272px]" : "bottom-[72px]"}`}
            onClick={() => enter("ground")}
            title="Walk the forest. W A S D to move, the mouse to look."
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="13" cy="4.5" r="1.8" />
              <path d="M10 21l2-6 3 3v3M8.5 11.5 11 8l3 1.5 2 3.5M11 8l-1 5" />
            </svg>
            Explore on foot
            <Key>W</Key>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && (
          <motion.div key="explore-hud" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-30">
            {/* Crosshair and what it is on. */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className={`explore-crosshair ${aim ? "is-on" : ""}`} aria-hidden />
              <AnimatePresence>
                {aimName && (
                  <motion.span
                    key={aim}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 px-3 py-1.5 rounded-full text-[12px] text-paper"
                    style={{ background: "rgba(13,16,14,0.55)", backdropFilter: "blur(8px)" }}
                  >
                    {aimName} · {locked ? "click to open" : "click to look, then click to open"}
                  </motion.span>
                )}
              </AnimatePresence>
              {!locked && !aimName && (
                <span className="mt-3 px-3 py-1.5 rounded-full text-[12px] text-paper-80" style={{ background: "rgba(13,16,14,0.5)", backdropFilter: "blur(8px)" }}>
                  Click to look around
                </span>
              )}
            </div>

            {/* First-time guide. */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  ref={hintRef}
                  key="explore-hint"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="glass glass-strong pointer-events-auto absolute left-1/2 -translate-x-1/2 top-[76px] p-4 w-[min(420px,calc(100vw-24px))]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="eyebrow">Explore the territory</span>
                    <button type="button" className="text-[11px] text-paper-60 hover:text-paper" onClick={dismissHint}>
                      Got it
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-[12.5px] text-paper-80">
                    <span className="flex items-center gap-1.5">
                      <Key>W</Key>
                      <Key>A</Key>
                      <Key>S</Key>
                      <Key>D</Key> move
                    </span>
                    <span className="flex items-center gap-1.5">Mouse · look</span>
                    <span className="flex items-center gap-1.5">
                      <Key wide>Space</Key> jump, again to double jump
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Key wide>Space</Key>
                      <Key wide>Space</Key> fly / land
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Key wide>Shift</Key> sprint
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Key>C</Key> descend in flight
                    </span>
                    <span className="flex items-center gap-1.5 col-span-2">Aim at a giant and click to open the account</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status and the way out. */}
            <div ref={pillRef} className="glass glass-pill pointer-events-auto absolute left-4 bottom-5 flex items-center gap-3 h-10 pl-4 pr-1.5 text-[12.5px]">
              <span className="text-paper">{flying ? "Flying" : "On foot"}</span>
              <span className="text-paper-40 hidden md:inline">
                {flying ? "Space up · C down · double-tap Space to land" : "Shift sprint · double-tap Space to fly"}
              </span>
              <button type="button" className="btn btn-sm btn-pill btn-ghost !text-paper" onClick={() => exploreBridge.leave()}>
                Exit <Key wide>Esc</Key>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
