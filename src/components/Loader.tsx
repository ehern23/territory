"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useProgress } from "@react-three/drei";

/** Calm loading veil while textures compile; fades into the establishing shot. */
export function Loader() {
  const { active, progress } = useProgress();
  const [done, setDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!active && progress >= 100) {
      const t = setTimeout(() => setDone(true), 700);
      return () => clearTimeout(t);
    }
  }, [active, progress]);
  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          initial={false}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute inset-0 z-50 grid place-items-center"
          style={{ background: "radial-gradient(ellipse at 50% 40%, #26302a 0%, #0e110f 70%)" }}
        >
          <div className="flex flex-col items-center gap-5 w-[220px]">
            <span className="wordmark text-[18px]">Territory</span>
            <div className="loader-bar w-full" aria-hidden>
              <span style={{ width: `${mounted ? Math.max(6, progress) : 6}%` }} />
            </div>
            <span className="eyebrow">Growing the forest</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
