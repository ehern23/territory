import * as THREE from "three";

/**
 * Where the sun and moon are. The territory keeps the seller's own clock: the
 * sun rises in the east (+x) when their morning starts and sets in the west
 * (-x), arcing through the south (+z) at a mid-northern latitude. North is -z,
 * toward the mountains.
 *
 * The maths is the standard low-precision solar model (declination from the
 * day of the year, hour angle from local solar time) and a mean-phase moon.
 * It is accurate to a degree or two, which is far more than the eye needs.
 */

export const LATITUDE_DEG = 38;
const DEG = Math.PI / 180;
const SYNODIC_DAYS = 29.530588853;
/** A known new moon: 2000-01-06 18:14 UTC. */
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);

export interface SkyClock {
  /** Day of the year, 0-365. */
  dayOfYear: number;
  /** Local solar time in hours, 0-24. */
  solarHours: number;
  /** Moon age in days since new moon, 0-29.5. */
  moonAge: number;
}

export function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

/** Daylight saving shifts the clock an hour ahead of the sun; undo it. */
export function dstOffsetHours(date: Date) {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  const standard = Math.max(jan, jul);
  return (standard - date.getTimezoneOffset()) / 60;
}

export function moonAge(date: Date) {
  const days = (date.getTime() - NEW_MOON_EPOCH) / 86_400_000;
  return ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
}

/** Fraction of the moon's disc that is lit, 0 (new) to 1 (full). */
export function moonIllumination(age: number) {
  return (1 - Math.cos((age / SYNODIC_DAYS) * Math.PI * 2)) / 2;
}

export function clockFromDate(date: Date, hoursOverride?: number): SkyClock {
  const clockHours = hoursOverride ?? date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const solar = (((clockHours - dstOffsetHours(date)) % 24) + 24) % 24;
  return { dayOfYear: dayOfYear(date), solarHours: solar, moonAge: moonAge(date) };
}

/** Elevation and azimuth (from north, clockwise) in radians. */
export function horizontalPosition(declination: number, hourAngle: number, latitude = LATITUDE_DEG * DEG) {
  const sinEl = Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const el = Math.asin(THREE.MathUtils.clamp(sinEl, -1, 1));
  const cosAz = (Math.sin(declination) - Math.sin(el) * Math.sin(latitude)) / Math.max(1e-6, Math.cos(el) * Math.cos(latitude));
  let az = Math.acos(THREE.MathUtils.clamp(cosAz, -1, 1));
  if (Math.sin(hourAngle) > 0) az = Math.PI * 2 - az;
  return { elevation: el, azimuth: az };
}

export function directionFrom(elevation: number, azimuth: number, out = new THREE.Vector3()) {
  const c = Math.cos(elevation);
  return out.set(c * Math.sin(azimuth), Math.sin(elevation), -c * Math.cos(azimuth));
}

export function sunDeclination(day: number) {
  return -23.44 * DEG * Math.cos(((Math.PI * 2) / 365) * (day + 10));
}

export interface Celestial {
  sun: THREE.Vector3;
  moon: THREE.Vector3;
  sunElevation: number;
  moonElevation: number;
  moonIllumination: number;
  /** Moon age as a fraction of the synodic month, 0-1. */
  moonPhase: number;
}

export function celestial(clock: SkyClock, out?: Celestial): Celestial {
  const o = out ?? {
    sun: new THREE.Vector3(),
    moon: new THREE.Vector3(),
    sunElevation: 0,
    moonElevation: 0,
    moonIllumination: 0,
    moonPhase: 0,
  };
  const dec = sunDeclination(clock.dayOfYear);
  const hourAngle = (clock.solarHours - 12) * 15 * DEG;
  const s = horizontalPosition(dec, hourAngle);
  directionFrom(s.elevation, s.azimuth, o.sun);
  o.sunElevation = s.elevation;

  // The moon trails the sun by its age: new moon rides with the sun, full
  // moon rises at sunset. A full moon sits opposite the sun in declination.
  const phase = clock.moonAge / SYNODIC_DAYS;
  const moonHour = hourAngle - phase * Math.PI * 2;
  const moonDec = -dec * Math.cos(phase * Math.PI * 2) + 5.1 * DEG * Math.sin(phase * Math.PI * 4);
  const m = horizontalPosition(moonDec, moonHour);
  directionFrom(m.elevation, m.azimuth, o.moon);
  o.moonElevation = m.elevation;
  o.moonIllumination = moonIllumination(clock.moonAge);
  o.moonPhase = phase;
  return o;
}

/** Human labels for the time of day, for the sky control and greetings. */
export function partOfDay(solarHours: number, sunElevationDeg: number) {
  if (sunElevationDeg < -6) return solarHours < 12 ? "Before dawn" : "Night";
  if (sunElevationDeg < 2) return solarHours < 12 ? "Sunrise" : "Sunset";
  if (sunElevationDeg < 12) return solarHours < 12 ? "Early morning" : "Golden hour";
  if (solarHours < 11) return "Morning";
  if (solarHours < 14.5) return "Midday";
  return "Afternoon";
}
