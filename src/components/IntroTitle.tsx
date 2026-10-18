"use client";

import { AnimatePresence, motion } from "motion/react";
import { useProgress } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";

/** Title card over the establishing shot; gone the moment the camera settles. */
export function IntroTitle() {
  const introDone = useTerritoryStore((s) => s.introDone);
  const { active, progress } = useProgress();
  const loaded = !active && progress >= 100;
  return (
    <AnimatePresence>
      {loaded && !introDone && (
        <motion.div
          key="intro-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 1.2, delay: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute inset-x-0 top-[30%] z-20 flex flex-col items-center text-center pointer-events-none px-6"
        >
          <span className="eyebrow" style={{ color: "rgba(242,238,229,0.8)" }}>
            Illustrative Vercel Majors territory
          </span>
          <h1 className="display text-[40px] md:text-[64px] mt-3" style={{ textShadow: "0 2px 30px rgba(6,10,8,0.45)" }}>
            Every account is alive.
          </h1>
          <p className="text-[15px] md:text-[17px] text-paper-80 mt-3 max-w-[560px]" style={{ textShadow: "0 1px 16px rgba(6,10,8,0.5)" }}>
            Height is potential. The canopy is engagement health. Fruit is pipeline.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
