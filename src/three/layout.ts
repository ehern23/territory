import * as THREE from "three";
import { seededRng } from "@/lib/random";
import { useTerritoryStore } from "@/store/useTerritoryStore";

/**
 * The territory as a place.
 *
 * A dense temperate forest about two kilometres across, crossed by a stream
 * that falls out of the northern mountains. The strategic accounts are giant
 * emergent trees scattered through it, each standing in its own small glade;
 * one sits up on the foothills. A ring of forested, rocky mountains closes the
 * horizon. One height function serves terrain, vegetation, water and creatures.
 * The establishing camera looks from the south (+Z) toward the mountains (−Z).
 */

/**
 * Strategic accounts, spread across the map, by position in the territory.
 * Any seller's eight accounts fill the same glades in order (the original
 * Vercel order was jpmc, walmart, disney, amex, nike, starbucks, marriott,
 * ford). Slot 0 is the central flagship; slot 7 sits up on the foothills.
 */
const ACCOUNT_SLOTS: [number, number][] = [
  [40, 40],
  [-290, 200],
  [300, 230],
  [-430, -150],
  [400, -110],
  [-210, -390],
  [230, -430],
  [-40, -690],
];

/** Radius of the open glade around each account tree. */
export const GLADE_RADIUS = 58;
/** The managed forest; mountains rise beyond it. */
export const FOREST_RADIUS = 900;
/** Extent covered by GPU height / ground-cover maps. */
export const MAP_HALF = 1200;

export const WORLD_CENTER = new THREE.Vector3(0, 0, -160);
export const SUN_DIR = new THREE.Vector3(-0.78, 0.42, -0.46).normalize();

/* ------------------------------------------------------------------------ */
/* Noise                                                                     */
/* ------------------------------------------------------------------------ */

function hash2(ix: number, iz: number) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export function noise2(x: number, z: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function fbm(x: number, z: number, octaves = 5) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise2(x * f, z * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return v;
}

/** Ridged multifractal: sharp crests, eroded-looking valleys. */
function ridged(x: number, z: number, octaves = 6) {
  let v = 0;
  let amp = 0.55;
  let f = 1;
  let weight = 1;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(noise2(x * f, z * f) * 2 - 1);
    n *= n;
    n *= weight;
    weight = Math.min(1, n * 1.8);
    v += n * amp;
    f *= 2.07;
    amp *= 0.5;
  }
  return v;
}

/* ------------------------------------------------------------------------ */
/* Stream                                                                    */
/* ------------------------------------------------------------------------ */

const STREAM_CTRL: [number, number][] = [
  [-120, -1250],
  [-90, -980],
  [-130, -780],
  [-60, -560],
  [70, -440],
  [80, -270],
  [-20, -130],
  [-70, 40],
  [-10, 190],
  [110, 330],
  [90, 520],
  [160, 760],
  [120, 1050],
];

export const STREAM_PATH: THREE.Vector2[] = (() => {
  const curve = new THREE.SplineCurve(STREAM_CTRL.map(([x, z]) => new THREE.Vector2(x, z)));
  return curve.getSpacedPoints(160);
})();

const STREAM_HALF_WIDTH = 9.5;
const STREAM_BANK = 22;

/** Distance from (x, z) to the stream centreline, and the path parameter there. */
export function streamDistance(x: number, z: number): { d: number; t: number } {
  let best = Infinity;
  let bestT = 0;
  const n = STREAM_PATH.length;
  for (let i = 0; i < n - 1; i++) {
    const a = STREAM_PATH[i];
    const b = STREAM_PATH[i + 1];
    const abx = b.x - a.x;
    const abz = b.y - a.y;
    const len2 = abx * abx + abz * abz;
    // Cheap reject: segments are ~16 units long.
    const mx = (a.x + b.x) / 2 - x;
    const mz = (a.y + b.y) / 2 - z;
    if (mx * mx + mz * mz > (best + 20) * (best + 20)) continue;
    let t = ((x - a.x) * abx + (z - a.y) * abz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + abx * t - x;
    const pz = a.y + abz * t - z;
    const d = Math.sqrt(px * px + pz * pz);
    if (d < best) {
      best = d;
      bestT = (i + t) / (n - 1);
    }
  }
  return { d: best, t: bestT };
}

/**
 * Reaches where the river opens up: it widens, the canopy pulls back and it
 * runs bright through the forest. Between them the banks close in and the
 * crowns hide it. The first is the plunge pool under the falls.
 */
const OPEN_REACHES: [number, number][] = [
  [0.205, 0.04],
  [0.455, 0.045],
  [0.7, 0.045],
  [0.915, 0.04],
];

export function streamOpenness(t: number) {
  let o = 0;
  for (const [c, half] of OPEN_REACHES) o = Math.max(o, 1 - smoothstep01(half * 0.45, half, Math.abs(t - c)));
  return o;
}

function smoothstep01(e0: number, e1: number, x: number) {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

export function streamWidth(t: number) {
  // Narrower near the source, wider downstream, broad in the open reaches.
  return STREAM_HALF_WIDTH * (0.55 + 0.6 * t) * (1 + 0.6 * streamOpenness(t));
}

/* ------------------------------------------------------------------------ */
/* Terrain                                                                   */
/* ------------------------------------------------------------------------ */

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** How mountainous a place is, 0 in the forest basin → 1 in the ranges. */
export function mountainFactor(x: number, z: number) {
  const r = Math.hypot(x, z + 80);
  const ring = smooth(FOREST_RADIUS * 0.95, FOREST_RADIUS * 1.85, r);
  const north = smooth(-480, -1150, z) * 0.75;
  return Math.max(ring, north);
}

function landHeight(x: number, z: number) {
  const roll =
    (fbm(x * 0.0042 + 11.3, z * 0.0042 - 3.1, 4) - 0.5) * 34 +
    (fbm(x * 0.017 - 7.7, z * 0.017 + 2.2, 3) - 0.5) * 6;
  const m = mountainFactor(x, z);
  if (m <= 0.001) return roll;
  const peaks = ridged(x * 0.0021 + 3.7, z * 0.0021 - 8.4, 6);
  const massif = fbm(x * 0.0009 + 1.3, z * 0.0009 + 5.6, 3);
  const mountains = peaks * 760 * (0.55 + massif) + 40;
  return roll + mountains * m * m * (3 - 2 * m);
}

/** Raw height before glades are levelled. */
function rawHeight(x: number, z: number): number {
  let h = landHeight(x, z);
  // Cut the stream channel down to its water level, with soft banks.
  if (Math.abs(x) < 400 && z > -1300 && z < 1100) {
    const { d, t } = streamDistance(x, z);
    const w = streamWidth(t);
    if (d < w + STREAM_BANK) {
      const level = streamLevelAt(t);
      const depth = 1.4 + 1.2 * t;
      const inner = level + 0.6 - (depth + 0.6) * (1 - smooth(w * 0.3, w * 1.15, d));
      const s = smooth(w * 1.1, w + STREAM_BANK, d);
      h = inner + (h - inner) * s;
    }
  }
  return h;
}

/** World height, with level glades under each strategic tree. */
export function terrainHeight(x: number, z: number): number {
  let h = rawHeight(x, z);
  for (const slot of Object.values(ACCOUNT_SLOTS)) {
    const dx = x - slot[0];
    const dz = z - slot[1];
    const d2 = dx * dx + dz * dz;
    const R = GLADE_RADIUS * 1.3;
    if (d2 >= R * R) continue;
    const lawn = landHeight(slot[0], slot[1]);
    const k = 1 - Math.sqrt(d2) / R;
    h = h + (lawn - h) * (k * k * (3 - 2 * k));
  }
  return h;
}

/** Water surface height along the stream (never rises downstream). */
export const STREAM_LEVELS: number[] = (() => {
  const out: number[] = [];
  let prev = Infinity;
  for (const p of STREAM_PATH) {
    const bank = landHeight(p.x, p.y) - 1.25;
    prev = Math.min(prev, bank);
    out.push(prev);
  }
  return out;
})();

function streamLevelAt(t: number) {
  const f = Math.max(0, Math.min(1, t)) * (STREAM_LEVELS.length - 1);
  const i = Math.min(STREAM_LEVELS.length - 2, Math.floor(f));
  return STREAM_LEVELS[i] + (STREAM_LEVELS[i + 1] - STREAM_LEVELS[i]) * (f - i);
}

/* ------------------------------------------------------------------------ */
/* Accounts                                                                  */
/* ------------------------------------------------------------------------ */

/** Glade index of an account in the active territory (-1 when unknown). */
export function accountSlotIndex(accountId: string): number {
  const i = useTerritoryStore.getState().accounts.findIndex((a) => a.id === accountId);
  return i < ACCOUNT_SLOTS.length ? i : -1;
}

function accountSlot(accountId: string): [number, number] | undefined {
  return ACCOUNT_SLOTS[accountSlotIndex(accountId)];
}

export function accountPosition(accountId: string): THREE.Vector3 {
  const slot = accountSlot(accountId);
  if (!slot) return new THREE.Vector3();
  const rng = seededRng("slot", accountId);
  const x = slot[0] + rng.gauss() * 1.2;
  const z = slot[1] + rng.gauss() * 1.2;
  return new THREE.Vector3(x, terrainHeight(x, z), z);
}

export function accountClearings(): { x: number; z: number }[] {
  return ACCOUNT_SLOTS.map(([x, z]) => ({ x, z }));
}

/** Ids of the active territory's accounts that have a glade, in slot order. */
export function accountIds(): string[] {
  return useTerritoryStore
    .getState()
    .accounts.slice(0, ACCOUNT_SLOTS.length)
    .map((a) => a.id);
}

/**
 * Azimuth the camera approaches an account from: from the south (where the
 * overview sits), swung toward the sunlit side.
 */
export function accountApproachAzimuth(accountId: string) {
  const slot = accountSlot(accountId) ?? [0, 0];
  const lateral = THREE.MathUtils.clamp(slot[0] / 600, -0.6, 0.6);
  return 0.18 + lateral;
}

/* ------------------------------------------------------------------------ */
/* Ground cover                                                              */
/* ------------------------------------------------------------------------ */

export interface GroundCover {
  /** 0 = deep forest, 1 = open (glade, meadow, above treeline). */
  open: number;
  /** Tree density 0..1. */
  trees: number;
  grass: number;
  ferns: number;
  flowers: number;
  water: number;
  rock: number;
}

function gladeFactor(x: number, z: number) {
  let g = 0;
  for (const [sx, sz] of Object.values(ACCOUNT_SLOTS)) {
    const d = Math.hypot(x - sx, z - sz);
    g = Math.max(g, 1 - smooth(GLADE_RADIUS * 0.75, GLADE_RADIUS * 1.15, d));
  }
  return g;
}

/** What grows at (x, z). Shared by trees, grass, ferns, flowers and the ground shader. */
export function groundCover(x: number, z: number): GroundCover {
  const glade = gladeFactor(x, z);
  // Natural meadows: a few soft openings in the canopy.
  const meadow = smooth(0.66, 0.74, fbm(x * 0.0035 + 40, z * 0.0035 - 17, 3));
  const m = mountainFactor(x, z);
  const h = m > 0.01 ? terrainHeight(x, z) : 0;
  const treeline = 1 - smooth(350, 470, h + (fbm(x * 0.01, z * 0.01, 2) - 0.5) * 80);
  let water = 0;
  let bank = 0;
  if (Math.abs(x) < 400 && z > -1300 && z < 1100) {
    const { d, t } = streamDistance(x, z);
    const w = streamWidth(t);
    const reach = streamOpenness(t);
    water = 1 - smooth(w - 0.8, w + 0.6, d);
    // Open reaches clear a wide grassy margin; elsewhere trees crowd the bank
    // and their crowns close over the water.
    bank = 1 - smooth(w + 0.5 + reach * 26, w + 4 + reach * 40, d);
  }
  const open = Math.max(glade, meadow * (1 - m), bank * 0.8, 1 - treeline);
  const patch = fbm(x * 0.02 - 5, z * 0.02 + 9, 3);
  const trees = (1 - open) * (1 - water) * treeline * (0.75 + 0.25 * fbm(x * 0.008, z * 0.008, 2));
  const wet = fallsWetness(x, z);
  const grass = (1 - water) * (1 - wet) * Math.min(1, 0.5 + open * 0.6 + smooth(0.45, 0.7, patch) * 0.35) * (1 - smooth(380, 480, h));
  const ferns = (1 - water) * (1 - glade) * (1 - open * 0.7) * smooth(0.3, 0.55, fbm(x * 0.013 + 3, z * 0.013 - 8, 3)) * treeline;
  const flowers = (1 - water) * Math.max(glade * 0.8, meadow * 0.9) * smooth(0.4, 0.62, fbm(x * 0.03 + 7, z * 0.03, 2));
  const rock = Math.max(bank * 0.6, (1 - treeline) * 0.5);
  return { open, trees, grass, ferns: ferns * (1 - wet * 0.5), flowers: flowers * (1 - wet), water, rock: Math.max(rock, wet) };
}

/** Spray-soaked rock around the falls, 0-1. */
function fallsWetness(x: number, z: number) {
  const a = WATERFALL.top;
  const b = WATERFALL.base;
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const k = Math.max(0, Math.min(1.2, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz)));
  const d = Math.hypot(x - (a.x + abx * k), z - (a.z + abz * k));
  return 1 - smooth(18, 46, d);
}

/* ------------------------------------------------------------------------ */
/* Waterfall                                                                 */
/* ------------------------------------------------------------------------ */

export interface WaterfallSite {
  /** Lip of the falls, on the water surface. */
  top: THREE.Vector3;
  /** Plunge pool at the foot. */
  base: THREE.Vector3;
  /** Downstream direction at the foot (xz). */
  flow: THREE.Vector2;
  width: number;
}

/** The longest steep run of the stream, from where it leaves the hanging valley. */
export const WATERFALL: WaterfallSite = (() => {
  const n = STREAM_PATH.length;
  let start = -1;
  let end = -1;
  let bestDrop = 0;
  let runStart = -1;
  for (let i = 1; i < n - 1; i++) {
    const seg = STREAM_PATH[i].distanceTo(STREAM_PATH[i + 1]);
    const steep = (STREAM_LEVELS[i] - STREAM_LEVELS[i + 1]) / Math.max(1, seg) > 0.5;
    if (steep && runStart < 0) runStart = i;
    if (!steep && runStart >= 0) {
      const drop = STREAM_LEVELS[runStart] - STREAM_LEVELS[i];
      if (drop > bestDrop) {
        bestDrop = drop;
        start = runStart;
        end = i;
      }
      runStart = -1;
    }
  }
  if (start < 0) {
    start = 0;
    end = 1;
  }
  const a = STREAM_PATH[start];
  const b = STREAM_PATH[end];
  const flow = STREAM_PATH[Math.min(n - 1, end + 1)].clone().sub(b).normalize();
  return {
    top: new THREE.Vector3(a.x, STREAM_LEVELS[start], a.y),
    base: new THREE.Vector3(b.x, STREAM_LEVELS[end], b.y),
    flow,
    width: streamWidth(end / (n - 1)),
  };
})();
