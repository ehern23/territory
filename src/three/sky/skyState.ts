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
  /** Colour of the glow around the sun in the sky. */
  sun: THREE.Color;
  /**
   * Colour of the direct light on the ground. Much paler than the glow: these
   * are sRGB values and lighting is linear, where a sunset orange is almost
   * pure red. Green leaves reflect next to none of that and the forest turned
   * brown; a pale gold key keeps them green and warms them.
   */
  key: THREE.Color;
  /** Haze colour toward the horizon. */
  fog: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
}

// Sun elevation keyframes (degrees). Night through twilight to full day.
// The key (sun) and the fill (hemiSky) pull apart as the sun drops: a warm
// key over a cool fill is what makes an evening read as gold, not brown.
const KEYS: Key[] = [
  { el: -18, zenith: c("#03060f"), horizon: c("#0c1730"), sun: c("#3a4a78"), key: c("#3a4a78"), fog: c("#0e1830"), hemiSky: c("#7f92c0"), hemiGround: c("#2a3040") },
  { el: -9, zenith: c("#081230"), horizon: c("#232d5c"), sun: c("#6a5a90"), key: c("#6a5a90"), fog: c("#1e2850"), hemiSky: c("#8090c2"), hemiGround: c("#2c2e3c") },
  { el: -4, zenith: c("#16265c"), horizon: c("#c0685c"), sun: c("#ff6a48"), key: c("#ff9a6a"), fog: c("#58507a"), hemiSky: c("#8a90c8"), hemiGround: c("#3a3438") },
  { el: 0, zenith: c("#27488c"), horizon: c("#f6935a"), sun: c("#ff8038"), key: c("#ffb27a"), fog: c("#c08a78"), hemiSky: c("#96a0cc"), hemiGround: c("#4e3e30") },
  { el: 4, zenith: c("#2f5ea8"), horizon: c("#f9bb74"), sun: c("#ffa24e"), key: c("#ffd09a"), fog: c("#deb088"), hemiSky: c("#9cb0dc"), hemiGround: c("#6e5838") },
  { el: 10, zenith: c("#346cc0"), horizon: c("#f0d4a8"), sun: c("#ffc684"), key: c("#ffe0b8"), fog: c("#dccbb0"), hemiSky: c("#b0c4e8"), hemiGround: c("#7c6c48") },
  { el: 22, zenith: c("#2b6ac8"), horizon: c("#bcd3e6"), sun: c("#ffe6c4"), key: c("#fff0d8"), fog: c("#bccbd6"), hemiSky: c("#c4d8f0"), hemiGround: c("#857c58") },
  { el: 50, zenith: c("#2262c6"), horizon: c("#aacbe8"), sun: c("#fff4e2"), key: c("#fff8ec"), fog: c("#b4c8d8"), hemiSky: c("#c8dcf4"), hemiGround: c("#857c58") },
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
  /** Distance haze for the atmosphere pass, per metre. */
  haze: number;
  /** Valley-mist density at the valley floor, per metre. */
  mist: number;
  mistColor: THREE.Color;
  /** How much a cloud's shadow darkens the ground, 0-1. */
  cloudShadow: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  /** Image-based fill, relative to midday. */
  envIntensity: number;
  /** Overall scene light relative to a clear midday, for unlit shaders. */
  shade: THREE.Color;
  /** The same, split: sky fill and direct light. shade = shadeAmbient + shadeDirect. */
  shadeAmbient: THREE.Color;
  shadeDirect: THREE.Color;
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
  haze: 0.0003,
  mist: 0.0002,
  mistColor: c("#c3cdd2"),
  cloudShadow: 0.2,
  hemiSky: c("#c8dcf2"),
  hemiGround: c("#857c58"),
  hemiIntensity: 1.35,
  envIntensity: 1,
  shade: new THREE.Color(1, 1, 1),
  shadeAmbient: new THREE.Color(0.45, 0.45, 0.45),
  shadeDirect: new THREE.Color(0.55, 0.55, 0.55),
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
  uShadeAmbient: { value: sky.shadeAmbient },
  uShadeDirect: { value: sky.shadeDirect },
  uNight: { value: 0 },
  uMoonIllum: { value: 0.5 },
  uCloudCover: { value: 0.2 },
  uCloudHeavy: { value: 0 },
  uFlash: { value: 0 },
  uRain: { value: 0 },
};

/** Direct sunlight at midday. */
const SUN_INTENSITY = 3.4;

const tmp = new THREE.Color();
const grey = new THREE.Color();
// Nearly neutral: green leaves reflect almost nothing under a saturated blue
// light. The blue of the night comes from the grade (AerialEffect).
const MOON = c("#c2cde6");

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
    out.lightIntensity = out.night * (1.7 + 1.7 * Math.max(moonUp, 0.2));
  } else {
    out.lightDir.copy(cel.sun);
    if (out.lightDir.y < 0.06) out.lightDir.y = 0.06;
    out.lightDir.normalize();
    sample(el, (k) => k.key, out.lightColor);
    // A low sun keeps most of its strength: the camera exposes for it.
    out.lightIntensity = SUN_INTENSITY * sunUp * (0.86 + 0.14 * smooth(2, 25, el));
  }

  // Weather: cloud dims the direct light and greys the sky.
  const w = weather;
  // At night cloud mostly hides the moon's disc, not the forest: keep a floor
  // so a rainy night still reads as moonlit rather than black.
  out.lightIntensity *= 1 - w.dim * (1 - 0.55 * out.night);
  out.hemiIntensity = (1.75 - 0.4 * day - 0.08 * out.golden) * (1 + w.dim * 0.15);
  out.envIntensity = 0.12 + 0.88 * day;
  const lum = 0.08 + 0.92 * day;
  grey.setRGB(0.42, 0.45, 0.49).multiplyScalar(lum);
  const g = w.heavy * 0.85 + w.dim * 0.15;
  out.zenith.lerp(tmp.copy(grey).multiplyScalar(0.8), g);
  out.horizon.lerp(grey, g * 0.9);
  out.fog.lerp(tmp.copy(grey).multiplyScalar(1.05), Math.min(1, g * 0.8 + w.haze * 0.3) * (1 - out.night * 0.6));
  out.hemiSky.lerp(tmp.copy(grey).multiplyScalar(1.6), g * 0.6 * (1 - out.night * 0.75));
  out.sunGlow.multiplyScalar(1 - w.dim * 0.7);
  // The air (see world/AerialEffect). Distance haze softens the ranges but
  // never hides the territory: from the overview, about a kilometre out, well
  // over three quarters of the forest's contrast survives.
  out.haze = Math.min(0.0007, 0.00028 * (1 + w.haze * 1.5 + w.rain * 0.5) * (1 - out.golden * 0.15));
  // Mist pools on the valley floor at first light, lingers thinly through a
  // clear evening and night, and burns off by mid-morning.
  const morning = cel.sun.x > 0 ? 1 : 0.15;
  out.mist = 0.0001 + 0.0008 * out.golden * morning + 0.0003 * out.night + 0.0034 * w.haze;
  // Mist takes the sky's light, not the sun's: pale and slightly cool.
  out.mistColor.copy(out.fog).lerp(out.hemiSky, 0.55).multiplyScalar(0.8);
  out.cloudShadow = 0.36 * Math.min(1, out.lightIntensity / 3) * (1 - 0.6 * w.heavy) * (1 - 0.5 * out.night);
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
  overMidday(out.shadeAmbient.copy(out.hemiSky).multiplyScalar(out.hemiIntensity * 0.46));
  overMidday(out.shadeDirect.copy(out.lightColor).multiplyScalar(out.lightIntensity * 0.2));
  out.shade.copy(out.shadeAmbient).add(out.shadeDirect);
  return out;
}

function overMidday(col: THREE.Color) {
  col.r /= MIDDAY.r;
  col.g /= MIDDAY.g;
  col.b /= MIDDAY.b;
  return col;
}

/** Midday scene light: sky fill plus direct sun, in the proportions the shaders above assume. */
const MIDDAY = c("#c8dcf4")
  .multiplyScalar(1.35 * 0.46)
  .add(c("#fff4e2").multiplyScalar(SUN_INTENSITY * 0.2));

export function syncSkyUniforms() {
  skyUniforms.uNight.value = sky.night;
  skyUniforms.uMoonIllum.value = sky.moonIllumination;
  skyUniforms.uCloudCover.value = sky.weather.cover;
  skyUniforms.uCloudHeavy.value = sky.weather.heavy;
  skyUniforms.uFlash.value = sky.flash;
  skyUniforms.uRain.value = sky.weather.rain;
}
