import { create } from "zustand";
import type { WeatherKind } from "@/three/sky/weather";

/**
 * Time and weather controls. By default the territory keeps the seller's own
 * clock and the forecast; the sky control can scrub to any hour, run the day
 * as a time-lapse, or pin the weather.
 */

export type TimeMode = "live" | "manual" | "timelapse";

export interface SkyReadout {
  /** Local clock hours shown in the UI, 0-24. */
  hours: number;
  label: string;
  weather: WeatherKind;
  night: boolean;
}

interface SkyStore {
  timeMode: TimeMode;
  manualHours: number;
  weatherMode: "auto" | WeatherKind;
  readout: SkyReadout;
  setTimeMode: (m: TimeMode) => void;
  setManualHours: (h: number) => void;
  setWeatherMode: (w: "auto" | WeatherKind) => void;
  setReadout: (r: SkyReadout) => void;
}

function initialMode(): { timeMode: TimeMode; manualHours: number; weatherMode: "auto" | WeatherKind } {
  const fallback = { timeMode: "live" as TimeMode, manualHours: 17.5, weatherMode: "auto" as const };
  if (typeof window === "undefined") return fallback;
  const q = new URLSearchParams(window.location.search);
  const t = q.get("time");
  const w = q.get("weather") as WeatherKind | null;
  const out: { timeMode: TimeMode; manualHours: number; weatherMode: "auto" | WeatherKind } = { ...fallback };
  if (t === "lapse") out.timeMode = "timelapse";
  else if (t && !Number.isNaN(Number(t))) {
    out.timeMode = "manual";
    out.manualHours = Math.min(24, Math.max(0, Number(t)));
  }
  if (w) out.weatherMode = w;
  return out;
}

export const useSkyStore = create<SkyStore>((set) => ({
  ...initialMode(),
  readout: { hours: 12, label: "", weather: "clear", night: false },
  setTimeMode: (timeMode) => set({ timeMode }),
  setManualHours: (manualHours) => set({ manualHours, timeMode: "manual" }),
  setWeatherMode: (weatherMode) => set({ weatherMode }),
  setReadout: (readout) => set({ readout }),
}));

if (typeof window !== "undefined") {
  (window as unknown as { __sky?: unknown }).__sky = useSkyStore;
}
