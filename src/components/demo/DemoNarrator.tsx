"use client";

import { useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { buildAccountView, summarize, useAccountViews } from "@/store/selectors";
import { DEMO_BEATS, applyDemoStep } from "./script";

/**
 * Presenter card for the guided demo. → / Space advance, ← goes back,
 * Esc exits. Every beat is replayable from a clean territory.
 */
export function DemoNarrator() {
  const demo = useTerritoryStore((s) => s.demo);
  const exitDemo = useTerritoryStore((s) => s.exitDemo);
  const resetDemo = useTerritoryStore((s) => s.resetDemo);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const reduce = useReducedMotion();
  const views = useAccountViews();
  const state = useTerritoryStore();

  const go = useCallback((step: number) => {
    const s = useTerritoryStore.getState();
    const target = Math.max(0, Math.min(DEMO_BEATS.length - 1, step));
    if (target === s.demo.step + 1) {
      useTerritoryStore.setState({ demo: { active: true, step: target }, notices: [] });
      DEMO_BEATS[target].enter();
    } else {
      applyDemoStep(target);
    }
  }, []);

  useEffect(() => {
    if (!demo.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(useTerritoryStore.getState().demo.step + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(useTerritoryStore.getState().demo.step - 1);
      } else if (e.key === "Escape") {
        exitDemo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demo.active, go, exitDemo]);

  const beat = DEMO_BEATS[demo.step];
  const text = useMemo(() => {
    if (!demo.active || !beat) return "";
    const summary = summarize(views);
    const jp = state.daysSince.jpmc ?? 0;
    const before = buildAccountView({ ...state, daysSince: { ...state.daysSince, jpmc: Math.max(0, jp - 75) } }, "jpmc");
    return beat.body({
      summary,
      view: (id) => views.find((v) => v.account.id === id),
      healthBeforeNeglect: before?.health.score ?? 0,
    });
  }, [demo.active, beat, views, state]);

  const last = demo.step === DEMO_BEATS.length - 1;

  return (
    <AnimatePresence>
      {demo.active && beat && (
        <motion.section
          key="narrator"
          initial={reduce ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className={
            isCompact
              ? "glass glass-strong absolute inset-x-2 top-[calc(max(8px,env(safe-area-inset-top))+52px)] z-40 p-4"
              : "glass glass-strong absolute left-1/2 -translate-x-1/2 bottom-5 w-[min(600px,calc(100%-480px-48px))] min-w-[440px] z-40 p-5"
          }
          role="region"
          aria-label="Guided demo"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow" style={{ color: "var(--color-accent)" }}>
              Act {beat.act} of 5 · {beat.actTitle}
            </span>
            <button type="button" className="btn btn-ghost btn-sm -mr-2" onClick={exitDemo} aria-label="Exit demo">
              Exit
            </button>
          </div>
          <motion.div
            key={demo.step}
            initial={reduce ? false : { opacity: 0.2, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
              <h2 className={`display ${isCompact ? "text-[19px]" : "text-[22px]"} mt-2`}>{beat.title}</h2>
              <p className={`${isCompact ? "text-[12.5px]" : "text-[13.5px]"} text-paper-80 leading-relaxed mt-2`}>{text}</p>
          </motion.div>
          <div className="flex items-center justify-between gap-3 mt-4">
            <ol className="flex items-center gap-1.5" aria-label="Progress">
              {DEMO_BEATS.map((b, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Go to ${b.title}`}
                    aria-current={i === demo.step ? "step" : undefined}
                    className="block h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === demo.step ? 20 : 6,
                      background: i <= demo.step ? "var(--color-paper)" : "rgba(242,238,229,0.22)",
                    }}
                  />
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-2">
              {!isCompact && (
                <span className="text-[11px] text-paper-40 hidden lg:inline-flex items-center gap-1 mr-1">
                  <span className="kbd">←</span>
                  <span className="kbd">→</span>
                </span>
              )}
              <button type="button" className="btn btn-sm" onClick={() => go(demo.step - 1)} disabled={demo.step === 0}>
                Back
              </button>
              {last ? (
                <>
                  <button type="button" className="btn btn-sm" onClick={() => resetDemo()}>
                    Explore freely
                  </button>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => applyDemoStep(0)}>
                    Restart
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => go(demo.step + 1)}>
                  Next
                </button>
              )}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
