"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useAccountView } from "@/store/selectors";
import { applyDemoStep } from "./demo/script";
import { Legend } from "./Legend";

export function TopBar() {
  const mode = useTerritoryStore((s) => s.mode);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const returnToForest = useTerritoryStore((s) => s.returnToForest);
  const resetDemo = useTerritoryStore((s) => s.resetDemo);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const introDone = useTerritoryStore((s) => s.introDone);
  const setIntroDone = useTerritoryStore((s) => s.setIntroDone);
  const view = useAccountView(mode === "account" ? activeAccountId : null);
  const [legend, setLegend] = useState(false);

  return (
    <header
      className={`absolute left-4 top-[max(14px,env(safe-area-inset-top))] z-40 flex items-center justify-between gap-3 pointer-events-none ${
        mode === "account" && !isCompact ? "right-[432px]" : "right-4"
      }`}
    >
      <div className="flex items-center gap-3 pointer-events-auto min-w-0">
        <button
          type="button"
          onClick={mode === "account" ? returnToForest : undefined}
          className="flex items-center gap-2.5 min-w-0"
          aria-label={mode === "account" ? "Back to territory" : "Territory"}
        >
          <Mark />
          <span className="flex flex-col items-start leading-none min-w-0">
            <span className="wordmark">Territory</span>
            {!isCompact && <span className="text-[11.5px] text-paper-60 mt-1">A living map of a book of business</span>}
          </span>
        </button>
        <AnimatePresence>
          {view && !isCompact && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-[13px] min-w-0"
            >
              <span className="text-paper-40">/</span>
              <span className="truncate font-medium">{view.account.name}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1.5 pointer-events-auto relative">
        {!introDone && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={setIntroDone}>
            Skip intro
          </button>
        )}
        {mode === "account" && !demoActive && (
          <button type="button" className="btn btn-sm btn-pill glass !rounded-full" onClick={returnToForest}>
            ← {isCompact ? "Forest" : "Territory"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-pill glass !rounded-full"
          onClick={() => setLegend((v) => !v)}
          aria-expanded={legend}
          aria-label="How to read the forest"
        >
          {isCompact ? "?" : "How to read it"}
        </button>
        {!demoActive && (
          <>
            <button type="button" className="btn btn-sm btn-pill glass !rounded-full" onClick={resetDemo} aria-label="Reset demo data">
              {isCompact ? "↺" : "Reset"}
            </button>
            <button type="button" className="btn btn-sm btn-pill btn-primary !rounded-full" onClick={() => applyDemoStep(0)}>
              <span aria-hidden>▶</span> {isCompact ? "Demo" : "Guided demo"}
            </button>
          </>
        )}
        <AnimatePresence>{legend && <Legend onClose={() => setLegend(false)} />}</AnimatePresence>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="flex-none">
      <circle cx="14" cy="14" r="13.25" fill="rgba(13,16,14,0.55)" stroke="rgba(242,238,229,0.18)" strokeWidth="1" />
      <path d="M14 21.5v-6.2" stroke="#f2eee5" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 15.6c-3.9 0-6-2.4-6-5.3 0-2.9 2.6-4.8 6-4.8s6 1.9 6 4.8c0 2.9-2.1 5.3-6 5.3Z" fill="#9fcf6e" />
      <circle cx="17.2" cy="12.4" r="1.5" fill="#e2a843" />
    </svg>
  );
}
