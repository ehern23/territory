import * as THREE from "three";
import type { Celestial } from "./celestial";
import type { WeatherParams } from "./weather";

/**
 * The live state of the sky, written once per frame by the SkyController and
 * read by every material that cares about light: the sky dome, terrain and
 * foliage (through scene lights), impostors, water, rain and fireflies.
 *
 * Uniform objects are shared by reference, so a shader that binds
 * `skyUniforms.uLightDir` sees the sun move without any per-material update.
 */

const c = (hex: string) => new THREE.Color(hex);

interface Key {
  el: number;
  zenith: THREE.Color;
  horizon: THREE.Color;
  /** Colour of direct sunlight and of the glow around the sun. */
  sun: THREE.Color;
  /** Haze colour toward the horizon. */
  fog: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
}

// Sun elevation keyframes (degrees). Night through twilight to full day.
const KEYS: Key[] = [
  { el: -18, zenith: c("#050b1c"), horizon: c("#16223c"), sun: c("#3a4a78"), fog: c("#1a2640"), hemiSky: c("#6a86c8"), hemiGround: c("#262c3a") },
  { el: -9, zenith: c("#0b1634"), horizon: c("#2e3862"), sun: c("#6a5a90"), fog: c("#2a3456"), hemiSky: c("#7088c8"), hemiGround: c("#2a2c38") },
  { el: -4, zenith: c("#1c2c5e"), horizon: c("#9a6684"), sun: c("#ff6a48"), fog: c("#5a5678"), hemiSky: c("#8a94c8"), hemiGround: c("#3a3438") },
  { el: 0, zenith: c("#2c4c8c"), horizon: c("#f08a62"), sun: c("#ff7a3c"), fog: c("#b48a86"), hemiSky: c("#a4a8c8"), hemiGround: c("#4a3e34") },
  { el: 4, zenith: c("#3864a8"), horizon: c("#f6b884"), sun: c("#ff9a52"), fog: c("#d4b49c"), hemiSky: c("#a8b4d0"), hemiGround: c("#6a5a40") },
  { el: 10, zenith: c("#3a6fbe"), horizon: c("#e8d2b4"), sun: c("#ffc890"), fog: c("#d2cbbe"), hemiSky: c("#bccbe0"), hemiGround: c("#7a6e4c") },
  { el: 22, zenith: c("#2d6cc6"), horizon: c("#b9d0e2"), sun: c("#ffe4c0"), fog: c("#bccbd6"), hemiSky: c("#c4d8f0"), hemiGround: c("#857c58") },
  { el: 50, zenith: c("#2464c4"), horizon: c("#a9c8e4"), sun: c("#fff4e2"), fog: c("#b4c8d8"), hemiSky: c("#c8dcf4"), hemiGround: c("#857c58") },
];

function sample(el: number, pick: (k: Key) => THREE.Color, out: THREE.Color) {
  if (el <= KEYS[0].el) return out.copy(pick(KEYS[0]));
  for (let i = 1; i < KEYS.length; i++) {
    if (el <= KEYS[i].el) {
      const a = KEYS[i - 1];
      const b = KEYS[i];
      const t = (el - a.el) / (b.el - a.el);
      return out.copy(pick(a)).lerp(pick(b), t * t * (3 - 2 * t));
    }
  }
  return out.copy(pick(KEYS[KEYS.length - 1]));
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface SkyState {
  sunDir: THREE.Vector3;
  moonDir: THREE.Vector3;
  /** The light that casts shadows: the sun by day, the moon by night. */
  lightDir: THREE.Vector3;
  lightColor: THREE.Color;
  lightIntensity: number;
  zenith: THREE.Color;
  horizon: THREE.Color;
  sunGlow: THREE.Color;
  fog: THREE.Color;
  fogDensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  /** Image-based fill, relative to midday. */
  envIntensity: number;
  /** Overall scene light relative to a clear midday, for unlit shaders. */
  shade: THREE.Color;
  /** 0 by day, 1 in full night. */
  night: number;
  /** Peaks at sunrise and sunset. */
  golden: number;
  moonIllumination: number;
  moonPhase: number;
  sunElevationDeg: number;
  weather: WeatherParams;
  /** Lightning flash brightness, 0-1, decays quickly. */
  flash: number;
  /** Wind strength multiplier. */
  wind: number;
}

export const sky: SkyState = {
  sunDir: new THREE.Vector3(-0.78, 0.42, -0.46).normalize(),
  moonDir: new THREE.Vector3(0.5, 0.4, 0.3).normalize(),
  lightDir: new THREE.Vector3(-0.78, 0.42, -0.46).normalize(),
  lightColor: c("#ffdcb0"),
  lightIntensity: 3,
  zenith: c("#2a5fa8"),
  horizon: c("#b4c6d2"),
  sunGlow: c("#ffdcb0"),
  fog: c("#c3cdd2"),
  fogDensity: 0.00029,
  hemiSky: c("#c8dcf2"),
  hemiGround: c("#857c58"),
  hemiIntensity: 1.35,
  envIntensity: 1,
  shade: new THREE.Color(1, 1, 1),
  night: 0,
  golden: 0,
  moonIllumination: 0.5,
  moonPhase: 0.5,
  sunElevationDeg: 25,
  weather: { cover: 0.2, heavy: 0, dim: 0, rain: 0, wind: 1, haze: 0, lightning: 0 },
  flash: 0,
  wind: 1,
};

/** Shared uniforms. Values are the live objects above, so no copying is needed. */
export const skyUniforms = {
  uSunDir: { value: sky.sunDir },
  uMoonDir: { value: sky.moonDir },
  uLightDir: { value: sky.lightDir },
  uLightColor: { value: sky.lightColor },
  uZenith: { value: sky.zenith },
  uHorizon: { value: sky.horizon },
  uSunGlow: { value: sky.sunGlow },
  uShade: { value: sky.shade },
  uNight: { value: 0 },
  uMoonIllum: { value: 0.5 },
  uCloudCover: { value: 0.2 },
  uCloudHeavy: { value: 0 },
  uFlash: { value: 0 },
  uRain: { value: 0 },
};

const tmp = new THREE.Color();
const grey = new THREE.Color();
const MOON = c("#a8c0f0");

/**
 * Compose the full sky state from the sun and moon positions and the weather.
 * Pure apart from writing into `out`.
 */
export function composeSky(cel: Celestial, weather: WeatherParams, out: SkyState = sky): SkyState {
  const el = (cel.sunElevation * 180) / Math.PI;
  out.sunElevationDeg = el;
  out.sunDir.copy(cel.sun);
  out.moonDir.copy(cel.moon);
  out.moonIllumination = cel.moonIllumination;
  out.moonPhase = cel.moonPhase;
  Object.assign(out.weather, weather);

  sample(el, (k) => k.zenith, out.zenith);
  sample(el, (k) => k.horizon, out.horizon);
  sample(el, (k) => k.sun, out.sunGlow);
  sample(el, (k) => k.fog, out.fog);
  sample(el, (k) => k.hemiSky, out.hemiSky);
  sample(el, (k) => k.hemiGround, out.hemiGround);

  const day = smooth(-6, 8, el);
  out.night = 1 - smooth(-14, -3, el);
  out.golden = smooth(-5, 1, el) * (1 - smooth(6, 16, el));

  // Direct light: the sun, handing over to the moon after dusk. Near the
  // horizon both fade so the shadow-casting light can swap without a jump.
  const sunUp = smooth(-1.5, 6, el);
  const moonEl = (cel.moonElevation * 180) / Math.PI;
  const moonUp = smooth(-1, 8, moonEl) * (0.35 + 0.65 * cel.moonIllumination) * out.night;
  const useMoon = sunUp < 0.02;
  if (useMoon) {
    // Moonlight, or with the moon down, the glow of the night sky from high
    // overhead, so the forest always reads.
    if (moonUp > 0.05) out.lightDir.copy(cel.moon);
    else out.lightDir.set(0.25, 0.9, 0.35).normalize();
    if (out.lightDir.y < 0.25) {
      out.lightDir.y = 0.25;
      out.lightDir.normalize();
    }
    out.lightColor.copy(MOON);
    out.lightIntensity = out.night * (1.1 + 1.1 * Math.max(moonUp, 0.2));
  } else {
    out.lightDir.copy(cel.sun);
    if (out.lightDir.y < 0.06) out.lightDir.y = 0.06;
    out.lightDir.normalize();
    out.lightColor.copy(out.sunGlow);
    out.lightIntensity = 3.1 * sunUp * (0.55 + 0.45 * smooth(2, 20, el));
  }

  // Weather: cloud dims the direct light and greys the sky.
  const w = weather;
  // At night cloud mostly hides the moon's disc, not the forest: keep a floor
  // so a rainy night still reads as moonlit rather than black.
  out.lightIntensity *= 1 - w.dim * (1 - 0.55 * out.night);
  out.hemiIntensity = (2.0 - 0.6 * day) * (1 + w.dim * 0.15);
  out.envIntensity = 0.12 + 0.88 * day;
  const lum = 0.08 + 0.92 * day;
  grey.setRGB(0.42, 0.45, 0.49).multiplyScalar(lum);
  const g = w.heavy * 0.85 + w.dim * 0.15;
  out.zenith.lerp(tmp.copy(grey).multiplyScalar(0.8), g);
  out.horizon.lerp(grey, g * 0.9);
  out.fog.lerp(tmp.copy(grey).multiplyScalar(1.05), Math.min(1, g * 0.8 + w.haze * 0.3) * (1 - out.night * 0.6));
  out.hemiSky.lerp(tmp.copy(grey).multiplyScalar(1.6), g * 0.6 * (1 - out.night * 0.75));
  out.sunGlow.multiplyScalar(1 - w.dim * 0.7);
  // Haze softens distance but never hides the territory: from the overview
  // (about 1.3 km out) at least two thirds of the forest's contrast survives.
  out.fogDensity = Math.min(0.00044, 0.00026 * (1 + w.haze * 1.3 + w.rain * 0.4) * (1 + out.night * 0.15));
  out.wind = w.wind;

  // Lightning lights everything for a moment.
  if (out.flash > 0.001) {
    const f = out.flash;
    out.hemiIntensity += f * 2.4;
    out.hemiSky.lerp(tmp.set(0.85, 0.88, 1), Math.min(1, f));
    out.zenith.lerp(tmp.set(0.5, 0.52, 0.62), f * 0.6);
    out.horizon.lerp(tmp.set(0.6, 0.62, 0.72), f * 0.6);
  }

  // Scene light relative to a clear midday, for shaders without lights.
  sceneLight(out.hemiSky, out.hemiIntensity, out.lightColor, out.lightIntensity, out.shade);
  out.shade.r /= MIDDAY.r;
  out.shade.g /= MIDDAY.g;
  out.shade.b /= MIDDAY.b;
  return out;
}

function sceneLight(hemi: THREE.Color, hemiI: number, light: THREE.Color, lightI: number, out: THREE.Color) {
  return out.copy(hemi).multiplyScalar(hemiI * 0.46).add(tmp.copy(light).multiplyScalar(lightI * 0.2));
}

const MIDDAY = sceneLight(c("#c8dcf4"), 1.4, c("#fff4e2"), 3.1, new THREE.Color());

export function syncSkyUniforms() {
  skyUniforms.uNight.value = sky.night;
  skyUniforms.uMoonIllum.value = sky.moonIllumination;
  skyUniforms.uCloudCover.value = sky.weather.cover;
  skyUniforms.uCloudHeavy.value = sky.weather.heavy;
  skyUniforms.uFlash.value = sky.flash;
  skyUniforms.uRain.value = sky.weather.rain;
}
