"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useSkyStore } from "@/store/useSkyStore";
import { useBiomeStore } from "@/store/useBiomeStore";
import { BIOMES } from "../biomes/biomes";
import { floraDebug } from "../flora/floraMaterials";
import { celestial, clockFromDate, partOfDay, type Celestial } from "./celestial";
import { composeSky, sky, syncSkyUniforms } from "./skyState";
import { WEATHER, autoWeather, emptyWeather, type WeatherKind, type WeatherParams } from "./weather";

/**
 * Drives the sky once per frame: the seller's clock (or a scrubbed hour, or a
 * time-lapse) places the sun and moon, the forecast (or a pinned condition)
 * sets the weather, and the two are composed into the shared sky state.
 *
 * Weather changes ease over several seconds; lightning comes in short,
 * irregular bursts during storms.
 */

/** A full day passes in two minutes of time-lapse. */
const LAPSE_HOURS_PER_SECOND = 24 / 120;

export function SkyController() {
  const cel = useRef<Celestial | null>(null);
  const current = useMemo<WeatherParams>(() => ({ ...WEATHER.fair }), []);
  const target = useMemo<WeatherParams>(() => emptyWeather(), []);
  const composed = useMemo<WeatherParams>(() => emptyWeather(), []);
  const state = useRef({
    lapseOffset: 0,
    displayHours: -1,
    readoutAt: 0,
    kind: "fair" as WeatherKind,
    nextStrike: 4,
    strikes: 0,
    first: true,
  });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const { timeMode, manualHours, weatherMode } = useSkyStore.getState();
    const s = state.current;
    const now = new Date();
    const clockHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

    let hours = clockHours;
    if (timeMode === "manual") {
      // Glide to a scrubbed hour rather than jumping.
      if (s.displayHours < 0) s.displayHours = manualHours;
      let diff = manualHours - s.displayHours;
      if (diff > 12) diff -= 24;
      if (diff < -12) diff += 24;
      s.displayHours = floraDebug.settle ? manualHours : (s.displayHours + diff * Math.min(1, dt * 4) + 24) % 24;
      hours = s.displayHours;
      s.lapseOffset = hours - clockHours;
    } else if (timeMode === "timelapse") {
      s.lapseOffset += dt * LAPSE_HOURS_PER_SECOND;
      hours = (((clockHours + s.lapseOffset) % 24) + 24) % 24;
      s.displayHours = hours;
    } else {
      s.lapseOffset = 0;
      s.displayHours = hours;
    }

    const clock = clockFromDate(now, hours);
    cel.current = celestial(clock, cel.current ?? undefined);

    // Weather: the forecast follows the (possibly accelerated) clock.
    const absHours = now.getTime() / 3_600_000 - now.getTimezoneOffset() / 60 + (hours - clockHours);
    if (weatherMode === "auto") {
      const f = autoWeather(absHours, target);
      s.kind = f.kind;
    } else {
      Object.assign(target, WEATHER[weatherMode] ?? WEATHER.fair);
      s.kind = weatherMode;
    }
    const ease = s.first || floraDebug.settle ? 1 : Math.min(1, dt * 0.45);
    for (const k of Object.keys(target) as (keyof WeatherParams)[]) current[k] += (target[k] - current[k]) * ease;
    s.first = false;

    // Lightning: bursts of one to three strikes, a few seconds apart.
    if (current.lightning > 0.5) {
      s.nextStrike -= dt;
      if (s.nextStrike <= 0) {
        sky.flash = 0.7 + Math.random() * 0.5;
        s.strikes = Math.random() < 0.45 ? 1 + Math.floor(Math.random() * 2) : 0;
        s.nextStrike = s.strikes > 0 ? 0.12 + Math.random() * 0.2 : 4 + Math.random() * 9;
      }
    }
    sky.flash *= Math.exp(-dt * 9);

    // The biome's own air: redwood fog, sea haze.
    Object.assign(composed, current);
    composed.haze = Math.min(1, current.haze + BIOMES[useBiomeStore.getState().biome].haze);
    composeSky(cel.current, composed);
    syncSkyUniforms();

    // UI readout, a few times a second.
    s.readoutAt -= dt;
    if (s.readoutAt <= 0) {
      s.readoutAt = 0.25;
      const label = partOfDay(clock.solarHours, sky.sunElevationDeg);
      const prev = useSkyStore.getState().readout;
      const rounded = Math.round(hours * 60) / 60;
      if (prev.label !== label || prev.weather !== s.kind || Math.abs(prev.hours - rounded) > 1 / 120) {
        useSkyStore.getState().setReadout({ hours: rounded, label, weather: s.kind, night: sky.night > 0.5 });
      }
    }
  });
  return null;
}
