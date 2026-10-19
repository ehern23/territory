"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useSkyStore } from "@/store/useSkyStore";
import { WEATHER_KINDS, WEATHER_LABEL, type WeatherKind } from "@/three/sky/weather";
import { BIOMES, BIOME_ORDER } from "@/three/biomes/biomes";
import { useBiomeStore } from "@/store/useBiomeStore";
import { useLiquidGlass } from "./glass/Glass";
import { LensGroup } from "./glass/Lens";

/**
 * The sky over the territory. A quiet pill shows the seller's time of day and
 * the weather; opening it lets them scrub through the day, run it as a
 * time-lapse, return to their own clock, or pin the weather.
 */

function formatTime(hours: number) {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export function SkyIcon({ weather, night, size = 16 }: { weather: WeatherKind; night: boolean; size?: number }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const cloud = <path d="M7 18h10a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 6.7 11.2 3.4 3.4 0 0 0 7 18z" />;
  if (weather === "storm")
    return (
      <svg {...s} aria-hidden>
        {cloud}
        <path d="M12.5 13.5 10.5 17h3l-2 3.5" />
      </svg>
    );
  if (weather === "rain")
    return (
      <svg {...s} aria-hidden>
        <path d="M7 15h10a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 6.7 8.2 3.4 3.4 0 0 0 7 15z" />
        <path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5" />
      </svg>
    );
  if (weather === "overcast" || weather === "cloudy")
    return (
      <svg {...s} aria-hidden>
        {cloud}
      </svg>
    );
  if (weather === "mist")
    return (
      <svg {...s} aria-hidden>
        <path d="M4 9h12M6 13h14M4 17h11" />
      </svg>
    );
  if (night)
    return (
      <svg {...s} aria-hidden>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z" />
      </svg>
    );
  return (
    <svg {...s} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      {weather === "fair" && <path d="M13 19h6a2.6 2.6 0 0 0 .2-5.2" opacity="0.6" />}
    </svg>
  );
}

// The track shows the colour of the sky through the day.
const DAY_GRADIENT =
  "linear-gradient(90deg, #0b1430 0%, #13204a 18%, #6b5a8a 24%, #f09a6a 27%, #8fb6dc 34%, #5c94d6 50%, #8fb6dc 66%, #f2a060 72%, #7a4f78 76%, #13204a 82%, #0b1430 100%)";

export function SkyControl() {
  const introDone = useTerritoryStore((s) => s.introDone);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const mode = useTerritoryStore((s) => s.mode);
  const onboarding = useTerritoryStore((s) => s.onboardingOpen);
  const readout = useSkyStore((s) => s.readout);
  const timeMode = useSkyStore((s) => s.timeMode);
  const weatherMode = useSkyStore((s) => s.weatherMode);
  const setManualHours = useSkyStore((s) => s.setManualHours);
  const setTimeMode = useSkyStore((s) => s.setTimeMode);
  const setWeatherMode = useSkyStore((s) => s.setWeatherMode);
  const biome = useBiomeStore((s) => s.biome);
  const setBiome = useBiomeStore((s) => s.setBiome);
  const [open, setOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const visible = introDone && !demoActive && !(isCompact && onboarding);
  useLiquidGlass(pillRef, { radius: 999, strength: 22, blur: 6, saturate: 1.6, bevel: 12, enabled: visible });
  useLiquidGlass(panelRef, { radius: 22, strength: 48, blur: 9, saturate: 1.5, enabled: visible && open });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !pillRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const shift = mode === "account" && !isCompact ? "-translate-x-[216px]" : "";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sky-control"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className={`absolute left-1/2 -translate-x-1/2 z-40 ${isCompact ? "top-[calc(max(14px,env(safe-area-inset-top))+48px)]" : "sky-control-top"}`}
        >
          <div className={`flex flex-col items-center transition-transform duration-500 ${shift}`}>
            <button
              ref={pillRef}
              type="button"
              className="glass glass-pill flex items-center gap-2 h-9 px-3.5 text-[12.5px] text-paper"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={`Sky: ${readout.label}, ${WEATHER_LABEL[readout.weather]}. Change time and weather`}
            >
              <span className="text-paper-80">
                <SkyIcon weather={readout.weather} night={readout.night} />
              </span>
              <span className="num font-medium">{formatTime(readout.hours)}</span>
              {!isCompact && (
                <>
                  <span className="text-paper-40">·</span>
                  <span className="text-paper-60">{readout.weather === "clear" || readout.weather === "fair" ? readout.label : WEATHER_LABEL[readout.weather]}</span>
                </>
              )}
              {timeMode !== "live" && <span className="sky-dot" aria-hidden />}
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  ref={panelRef}
                  key="sky-panel"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                  className="glass glass-strong mt-2 p-4 w-[min(340px,calc(100vw-24px))] flex flex-col gap-4"
                  role="dialog"
                  aria-label="Time, weather and forest"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <span className="eyebrow">Time of day</span>
                      <span className="text-[11px] text-paper-40">{timeMode === "live" ? "Your local time" : timeMode === "timelapse" ? "Time-lapse" : "Scrubbing"}</span>
                    </div>
                    <div className="relative h-8 flex items-center">
                      <div className="absolute inset-x-0 h-2 rounded-full" style={{ background: DAY_GRADIENT }} aria-hidden />
                      <input
                        type="range"
                        min={0}
                        max={24}
                        step={0.05}
                        value={readout.hours}
                        onChange={(e) => setManualHours(Number(e.target.value))}
                        className="sky-range relative w-full"
                        aria-label="Hour of day"
                        aria-valuetext={formatTime(readout.hours)}
                      />
                    </div>
                    <div className="flex justify-between text-[10.5px] text-paper-40 num -mt-1">
                      <span>12a</span>
                      <span>6a</span>
                      <span>12p</span>
                      <span>6p</span>
                      <span>12a</span>
                    </div>
                    <LensGroup className="flex gap-1.5" role="radiogroup" aria-label="Clock">
                      {(
                        [
                          ["live", "My time"],
                          ["timelapse", "Time-lapse"],
                        ] as const
                      ).map(([m, label]) => (
                        <button
                          key={m}
                          type="button"
                          role="radio"
                          aria-checked={timeMode === m}
                          data-lens
                          className={`chip ${timeMode === m ? "is-active" : ""}`}
                          onClick={() => setTimeMode(m)}
                        >
                          {label}
                        </button>
                      ))}
                    </LensGroup>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="eyebrow">Forest</span>
                    <LensGroup className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Forest" radius={14}>
                      {BIOME_ORDER.map((id) => {
                        const b = BIOMES[id];
                        const active = biome === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            aria-disabled={!b.available}
                            data-lens
                            title={b.tagline}
                            className={`biome-card ${active ? "is-active" : ""} ${b.available ? "" : "is-soon"}`}
                            onClick={() => b.available && setBiome(id)}
                          >
                            <span className="biome-card__swatch" style={{ background: `linear-gradient(135deg, ${b.swatch[0]}, ${b.swatch[1]})` }} aria-hidden />
                            <span className="flex flex-col items-start min-w-0">
                              <span className="text-[12px] font-medium truncate">{b.name}</span>
                              <span className="text-[10.5px] text-paper-40">{b.available ? (active ? "Growing here" : "Explore") : "Coming soon"}</span>
                            </span>
                          </button>
                        );
                      })}
                    </LensGroup>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="eyebrow">Weather</span>
                    <LensGroup className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Weather">
                      {(["auto", ...WEATHER_KINDS] as const).map((w) => (
                        <button
                          key={w}
                          type="button"
                          role="radio"
                          aria-checked={weatherMode === w}
                          data-lens
                          className={`chip ${weatherMode === w ? "is-active" : ""}`}
                          onClick={() => setWeatherMode(w)}
                        >
                          {w !== "auto" && <SkyIcon weather={w} night={false} size={13} />}
                          {w === "auto" ? "Forecast" : WEATHER_LABEL[w]}
                        </button>
                      ))}
                    </LensGroup>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
