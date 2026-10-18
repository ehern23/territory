"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";

const TONE: Record<string, string> = {
  growth: "#9fcf6e",
  signal: "#b5dc6e",
  warning: "#d98b48",
  info: "#f2eee5",
};

/** Quiet toasts that name what just changed in the forest. */
export function Notices() {
  const notices = useTerritoryStore((s) => s.notices);
  const dismiss = useTerritoryStore((s) => s.dismissNotice);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const mode = useTerritoryStore((s) => s.mode);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (notices.length === 0) return;
    const id = notices[0].id;
    const t = setTimeout(() => dismiss(id), 5200);
    return () => clearTimeout(t);
  }, [notices, dismiss]);

  return (
    <div
      className={`absolute z-40 flex flex-col gap-2 pointer-events-none ${
        isCompact
          ? "inset-x-2 top-[calc(max(8px,env(safe-area-inset-top))+52px)]"
          : mode === "account"
            ? "right-[432px] top-[72px] w-[360px]"
            : "right-4 top-[72px] w-[360px]"
      }`}
    >
      <AnimatePresence>
        {notices.slice(-2).map((n) => (
          <motion.div
            key={n.id}
            role="status"
            initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="glass glass-strong px-4 py-3 flex items-start gap-3 pointer-events-auto !rounded-[14px]"
          >
            <span className="mt-1.5 dot" style={{ background: TONE[n.kind] ?? TONE.info }} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold">{n.title}</div>
              <p className="text-[12px] text-paper-60 mt-0.5 leading-snug">{n.body}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm -mr-2 -mt-1" onClick={() => dismiss(n.id)} aria-label="Dismiss">
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
