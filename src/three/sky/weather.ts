/**
 * Weather: a handful of named conditions, each a set of parameters the sky,
 * lights, haze, wind and rain read. The automatic forecast is deterministic
 * per three-hour block of the seller's day, so everyone opening the territory
 * at the same hour shares the same sky, and conditions drift in and out.
 */

export type WeatherKind = "clear" | "fair" | "cloudy" | "overcast" | "rain" | "storm" | "mist";

export interface WeatherParams {
  /** Fraction of the sky with cloud, 0-1. */
  cover: number;
  /** How grey and heavy the cloud is, 0-1. */
  heavy: number;
  /** How much direct sun the cloud blocks, 0-1. */
  dim: number;
  /** Rain intensity, 0-1. */
  rain: number;
  /** Wind strength multiplier (1 = summer breeze). */
  wind: number;
  /** Extra haze, 0-1. */
  haze: number;
  /** Lightning likelihood, 0-1. */
  lightning: number;
}

export const WEATHER: Record<WeatherKind, WeatherParams> = {
  clear: { cover: 0.06, heavy: 0, dim: 0, rain: 0, wind: 0.8, haze: 0, lightning: 0 },
  fair: { cover: 0.32, heavy: 0.05, dim: 0.04, rain: 0, wind: 1, haze: 0.05, lightning: 0 },
  cloudy: { cover: 0.62, heavy: 0.3, dim: 0.35, rain: 0, wind: 1.3, haze: 0.2, lightning: 0 },
  overcast: { cover: 0.95, heavy: 0.55, dim: 0.72, rain: 0, wind: 1.2, haze: 0.45, lightning: 0 },
  rain: { cover: 1, heavy: 0.72, dim: 0.8, rain: 0.65, wind: 1.7, haze: 0.6, lightning: 0 },
  storm: { cover: 1, heavy: 0.95, dim: 0.9, rain: 1, wind: 2.8, haze: 0.75, lightning: 1 },
  mist: { cover: 0.25, heavy: 0.1, dim: 0.25, rain: 0, wind: 0.4, haze: 1, lightning: 0 },
};

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  clear: "Clear",
  fair: "Fair",
  cloudy: "Cloudy",
  overcast: "Overcast",
  rain: "Rain",
  storm: "Thunderstorm",
  mist: "Morning mist",
};

export const WEATHER_KINDS: WeatherKind[] = ["clear", "fair", "cloudy", "overcast", "rain", "storm", "mist"];

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const BLOCK_HOURS = 3;

/** The forecast for one three-hour block. Mostly fine summer weather. */
export function forecastBlock(block: number): WeatherKind {
  const r = hash(block);
  const hourOfDay = (((block * BLOCK_HOURS) % 24) + 24) % 24;
  if (r < 0.32) return "clear";
  if (r < 0.62) return "fair";
  if (r < 0.76) return "cloudy";
  if (r < 0.84) return "overcast";
  if (r < 0.91) return "rain";
  if (r < 0.95) return "storm";
  // Mist pools in the valley only in the early morning.
  return hourOfDay >= 3 && hourOfDay < 9 ? "mist" : "fair";
}

export function blendWeather(a: WeatherParams, b: WeatherParams, t: number, out: WeatherParams): WeatherParams {
  for (const k of Object.keys(a) as (keyof WeatherParams)[]) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

/**
 * Automatic weather at an absolute time (hours since the Unix epoch, local).
 * Each block eases into the next over its last 40 minutes.
 */
export function autoWeather(absHours: number, out: WeatherParams): { kind: WeatherKind; params: WeatherParams } {
  const block = Math.floor(absHours / BLOCK_HOURS);
  const into = absHours / BLOCK_HOURS - block;
  const now = forecastBlock(block);
  const next = forecastBlock(block + 1);
  const t = Math.max(0, (into - 0.78) / 0.22);
  const s = t * t * (3 - 2 * t);
  blendWeather(WEATHER[now], WEATHER[next], s, out);
  return { kind: s > 0.5 ? next : now, params: out };
}

export function emptyWeather(): WeatherParams {
  return { ...WEATHER.clear };
}
