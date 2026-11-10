"use client";

import { AnimatePresence, motion } from "motion/react";
import { useProgress } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useSkyStore } from "@/store/useSkyStore";

/**
 * A greeting that follows the seller's own clock, and the sky they are
 * actually looking at: the line about gold light only appears while the sun
 * is low, not for the whole evening.
 */
function greeting(hours: number, sky: string) {
  if (sky === "Night" || sky === "Before dawn") {
    return hours >= 3 && hours < 9 ? "Up before the sun. The forest is still asleep." : "Working late. The forest is asleep, but your pipeline isn't.";
  }
  if (sky === "Sunrise" || sky === "Early morning") return "Good morning. Your territory is waking up.";
  if (sky === "Golden hour" || sky === "Sunset") return "Good evening. The light is going gold over your accounts.";
  if (hours < 12) return "Good morning. The forest is up before you.";
  return "Good afternoon. Here is how the day is growing.";
}

/** Title card over the establishing shot; gone the moment the camera settles. */
export function IntroTitle() {
  const introDone = useTerritoryStore((s) => s.introDone);
  const label = useTerritoryStore((s) => s.profile.territoryLabel);
  const { active, progress } = useProgress();
  const hours = useSkyStore((s) => s.readout.hours);
  const skyLabel = useSkyStore((s) => s.readout.label);
  const ready = skyLabel !== "";
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
          // Low in the frame: the establishing shot keeps the flagship and the sky above it.
          className="absolute inset-x-0 bottom-[17%] md:bottom-[11%] z-20 flex flex-col items-center text-center pointer-events-none px-6"
        >
          <span
            className="eyebrow px-3 py-1.5 rounded-full"
            style={{ color: "var(--color-paper)", background: "rgba(13,16,14,0.42)", backdropFilter: "blur(8px)" }}
          >
            Illustrative {label} territory
          </span>
          {ready && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 1.4 }}
              className="text-[13px] md:text-[14px] text-paper-80 mt-3"
              style={{ textShadow: "0 1px 12px rgba(6,10,8,0.6)" }}
            >
              {greeting(hours, skyLabel)}
            </motion.p>
          )}
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
