"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { Eyebrow } from "./ui";

export function Notices() {
  const notices = useTerritoryStore((s) => s.notices);
  const dismiss = useTerritoryStore((s) => s.dismissNotice);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (notices.length === 0) return;
    const id = notices[0].id;
    const t = setTimeout(() => dismiss(id), 6000);
    return () => clearTimeout(t);
  }, [notices, dismiss]);

  return (
    <div className="absolute left-1/2 top-[max(16px,env(safe-area-inset-top))] z-40 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none w-full max-w-[420px] px-3">
      <AnimatePresence>
        {notices.slice(0, 2).map((n) => (
          <motion.div
            key={n.id}
            role="status"
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="surface w-full px-4 py-3 flex items-start gap-3 pointer-events-auto"
          >
            <span className="mt-1 dot" style={{ background: "#9fc27a" }} aria-hidden />
            <div className="min-w-0 flex-1">
              <Eyebrow>{n.title}</Eyebrow>
              <p className="text-[13px] mt-0.5">{n.body}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm -mr-2" onClick={() => dismiss(n.id)} aria-label="Dismiss">
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
