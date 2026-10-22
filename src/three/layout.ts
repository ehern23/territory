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

/** Lip, fall direction and height of the great falls' hanging valley (see escarpment). */
const LIP = new THREE.Vector2(905, -1372);
const FALL_DIR = new THREE.Vector2(-0.576, 0.818);
const SHELF = 470;

/* ------------------------------------------------------------------------ */
/* Water: rivers, a lake, waterfalls                                         */
/* ------------------------------------------------------------------------ */

/**
 * The valley's water. The main river falls out of the northern mountains,
 * runs south through the forest and fills a lake mid-valley. A larger river
 * leaves a hanging valley on the north-east range in a tall falls and winds
 * down into the same lake. A creek tumbles off the western range in small
 * cascades. Below the forest the joined river leaves through a gap in the
 * southern range and runs on toward a coast nobody can see.
 *
 * Water levels follow the land and never rise downstream; where the land
 * drops faster than the bank can follow, the water becomes a waterfall.
 */

export interface River {
  id: string;
  /** Evenly spaced centreline points (x, z). */
  path: THREE.Vector2[];
  /** Water surface height at each point. */
  levels: number[];
  /** Half-width of the water at each point. */
  widths: number[];
  /** How open the banks are at each point (0 = canopy closes over, 1 = wide meadow). */
  open: number[];
  /** Channel depth below the surface. */
  depth: number;
}

export interface Lake {
  x: number;
  z: number;
  /** Mean radius; the shore wanders around it. */
  radius: number;
  level: number;
}

function spline(ctrl: [number, number][], spacing: number) {
  const curve = new THREE.SplineCurve(ctrl.map(([x, z]) => new THREE.Vector2(x, z)));
  return curve.getSpacedPoints(Math.max(8, Math.round(curve.getLength() / spacing)));
}

const MAIN_CTRL: [number, number][] = [
  [-120, -1250],
  [-90, -980],
  [-130, -780],
  [-60, -560],
  [70, -440],
  [72, -290],
  [40, -200],
  [-20, -130],
  [-70, 40],
  [-10, 190],
  [110, 330],
  [90, 520],
  [160, 760],
  [120, 1050],
  // Out of the forest, through the southern gap and away toward the coast.
  [60, 1380],
  [170, 1760],
  [70, 2250],
  [190, 2850],
  [110, 3500],
  [210, 4300],
];

const EAST_CTRL: [number, number][] = [
  [1205, -1790],
  [1112, -1668],
  [1046, -1570],
  [978, -1468],
  [930, -1405],
  [905, -1372],
  [868, -1320],
  [840, -1280],
  [790, -1180],
  [735, -1040],
  [672, -880],
  [598, -726],
  [482, -572],
  [384, -432],
  [292, -318],
  [196, -258],
  [130, -248],
];

const CREEK_CTRL: [number, number][] = [
  [-1520, -330],
  [-1440, -262],
  [-1350, -214],
  [-1230, -190],
  [-1080, -140],
  [-930, -96],
  [-790, -40],
  [-650, 4],
  [-520, 38],
  [-380, 66],
  [-240, 58],
  [-120, 36],
  [-74, 30],
];

/** Where the rivers meet: a lake on the main river, mid-valley. */
export const LAKE: Lake = { x: 66, z: -246, radius: 92, level: 0 };

/** The lake shore wanders: radius as a function of direction. */
export function lakeRadiusAt(angle: number) {
  const n = noise2(Math.cos(angle) * 1.6 + 7.3, Math.sin(angle) * 1.6 - 2.1) - 0.5;
  const n2 = noise2(Math.cos(angle) * 3.7 - 1.1, Math.sin(angle) * 3.7 + 4.4) - 0.5;
  return LAKE.radius * (1 + n * 0.55 + n2 * 0.22 + 0.12 * Math.sin(angle * 2 + 0.7));
}

/** 0 at the lake centre, 1 on the shore. */
export function lakeDistance(x: number, z: number) {
  const dx = x - LAKE.x;
  const dz = z - LAKE.z;
  return Math.hypot(dx, dz) / lakeRadiusAt(Math.atan2(dz, dx));
}

/** Gap in the southern range that the river leaves through. */
const GAP = spline(MAIN_CTRL.slice(13), 60);

function gapFactor(x: number, z: number) {
  if (z < 700) return 0;
  let d = Infinity;
  for (let i = 0; i < GAP.length - 1; i++) d = Math.min(d, segDist(x, z, GAP[i], GAP[i + 1]));
  return (1 - smooth(170, 520, d)) * smooth(650, 950, z);
}

function segDist(x: number, z: number, a: THREE.Vector2, b: THREE.Vector2) {
  const abx = b.x - a.x;
  const abz = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.y) * abz) / (abx * abx + abz * abz || 1)));
  return Math.hypot(a.x + abx * t - x, a.y + abz * t - z);
}

const BANK = 22;

/** Natural irregularity: rivers are never the same width for long. */
function wobble(along: number, seed: number) {
  return 1 + (noise2(along * 0.012 + seed, seed * 3.1) - 0.5) * 0.45 + (noise2(along * 0.05 - seed, seed) - 0.5) * 0.12;
}

function buildRiver(
  id: string,
  ctrl: [number, number][],
  opts: {
    width: (t: number, along: number) => number;
    depth: number;
    reaches?: [number, number][];
    floor?: (i: number, p: THREE.Vector2) => number;
    lakeLevel?: number;
    /** Break steep runs into a staircase of cascades this tall, with a plunge pool below each. */
    steps?: [number, number];
  },
): River {
  const path = spline(ctrl, 16);
  const n = path.length;
  const levels: number[] = [];
  const widths: number[] = [];
  const open: number[] = [];
  let prev = Infinity;
  let along = 0;
  for (let i = 0; i < n; i++) {
    const p = path[i];
    if (i > 0) along += p.distanceTo(path[i - 1]);
    const t = i / (n - 1);
    let o = 0;
    for (const [c, half] of opts.reaches ?? []) o = Math.max(o, 1 - smooth(half * 0.45, half, Math.abs(t - c)));
    // In the lake, the water is the lake.
    const inLake = lakeDistance(p.x, p.y) < 1.05;
    if (inLake) o = 1;
    const bank = landHeight(p.x, p.y) - 1.25;
    prev = Math.min(prev, bank);
    if (opts.floor) prev = Math.max(prev, opts.floor(i, p));
    levels.push(inLake && opts.lakeLevel !== undefined ? opts.lakeLevel : prev);
    widths.push(opts.width(t, along) * wobble(along, id.length * 7.7) * (1 + 0.6 * o));
    open.push(o);
  }
  if (opts.steps) {
    // A mountain stream does not slide down a slope: it drops over a ledge,
    // pools, runs a little, and drops again. Each step is a different height.
    const [lo, hi] = opts.steps;
    let i = 0;
    while (i < n - 1) {
      const slope = (levels[i] - levels[i + 1]) / Math.max(1, path[i].distanceTo(path[i + 1]));
      if (slope < 0.35) {
        i++;
        continue;
      }
      const step = lo + (hi - lo) * noise2(i * 0.73 + 2.9, 6.1);
      let j = i + 1;
      while (j < n - 1 && levels[i] - levels[j] < step) j++;
      // The pool below the ledge lies at the next lip's level.
      for (let k = i + 1; k < j; k++) levels[k] = levels[j];
      i = j;
    }
  }
  return { id, path, levels, widths, open, depth: opts.depth };
}

/** The main river; its level where it crosses the lake sets the lake. */
const MAIN_RAW = buildRiver("main", MAIN_CTRL, {
  // Narrow near the source, a real river below the lake, broad toward the coast.
  width: (t, along) => 9.5 * (0.55 + 0.6 * Math.min(1, along / 2300)) * (along > 1400 ? 1.45 : 1) * (1 + Math.max(0, along - 2900) / 2600),
  depth: 2.2,
  reaches: [
    [0.11, 0.022],
    [0.26, 0.025],
    [0.38, 0.025],
    [0.5, 0.022],
    [0.66, 0.05],
    [0.86, 0.06],
  ],
});
LAKE.level = (() => {
  for (let i = 0; i < MAIN_RAW.path.length; i++) if (lakeDistance(MAIN_RAW.path[i].x, MAIN_RAW.path[i].y) < 1) return MAIN_RAW.levels[i];
  return 0;
})();
// Through the lake the main river is level with it.
for (let i = 0; i < MAIN_RAW.path.length; i++) {
  if (lakeDistance(MAIN_RAW.path[i].x, MAIN_RAW.path[i].y) < 1.05) MAIN_RAW.levels[i] = LAKE.level;
  else if (i > 0 && MAIN_RAW.levels[i] > MAIN_RAW.levels[i - 1]) MAIN_RAW.levels[i] = MAIN_RAW.levels[i - 1];
}

function joinLevel(x: number, z: number) {
  let best = Infinity;
  let level = LAKE.level;
  MAIN_RAW.path.forEach((p, i) => {
    const d = Math.hypot(p.x - x, p.y - z);
    if (d < best) {
      best = d;
      level = MAIN_RAW.levels[i];
    }
  });
  return level;
}

const EAST_RAW = (() => {
  const end = EAST_CTRL[EAST_CTRL.length - 1];
  const floor = Math.min(LAKE.level, joinLevel(end[0], end[1]));
  return buildRiver("east", EAST_CTRL, {
    // A big river: the falls are twice as wide as the main river's.
    width: (t) => 10 + 9 * smooth(0.08, 0.3, t) - 3 * smooth(0.5, 1, t),
    depth: 2.8,
    reaches: [
      [0.31, 0.06],
      [0.62, 0.05],
    ],
    floor: () => floor,
    lakeLevel: LAKE.level,
  });
})();

const CREEK_RAW = (() => {
  const end = CREEK_CTRL[CREEK_CTRL.length - 1];
  const floor = joinLevel(end[0], end[1]);
  return buildRiver("creek", CREEK_CTRL, {
    width: (t) => 3.2 + 2.6 * t,
    depth: 1.2,
    reaches: [[0.55, 0.06]],
    floor: () => floor,
    steps: [22, 46],
  });
})();

export const RIVERS: River[] = [MAIN_RAW, EAST_RAW, CREEK_RAW];
/** The main river (kept for older callers). */
export const STREAM_PATH = MAIN_RAW.path;
export const STREAM_LEVELS = MAIN_RAW.levels;

/* A coarse grid of river segments so distance queries stay cheap. */
const RCELL = 64;
const riverGrid = new Map<string, [River, number][]>();
for (const r of RIVERS) {
  for (let i = 0; i < r.path.length - 1; i++) {
    const a = r.path[i];
    const b = r.path[i + 1];
    const reach = Math.max(r.widths[i], r.widths[i + 1]) + BANK + 50;
    const x0 = Math.floor((Math.min(a.x, b.x) - reach) / RCELL);
    const x1 = Math.floor((Math.max(a.x, b.x) + reach) / RCELL);
    const z0 = Math.floor((Math.min(a.y, b.y) - reach) / RCELL);
    const z1 = Math.floor((Math.max(a.y, b.y) + reach) / RCELL);
    for (let gz = z0; gz <= z1; gz++)
      for (let gx = x0; gx <= x1; gx++) {
        const k = `${gx},${gz}`;
        const list = riverGrid.get(k);
        if (list) list.push([r, i]);
        else riverGrid.set(k, [[r, i]]);
      }
  }
}

export interface RiverHit {
  river: River;
  /** Distance to the centreline. */
  d: number;
  /** Path parameter, 0 at the source to 1 at the end. */
  t: number;
  /** Fractional point index. */
  f: number;
}

const NO_RIVER: RiverHit = { river: MAIN_RAW, d: Infinity, t: 0, f: 0 };

/** The nearest river to (x, z). Far from any river, d is Infinity. */
export function riverAt(x: number, z: number): RiverHit {
  const list = riverGrid.get(`${Math.floor(x / RCELL)},${Math.floor(z / RCELL)}`);
  if (!list) return NO_RIVER;
  let best: RiverHit | null = null;
  for (const [r, i] of list) {
    const a = r.path[i];
    const b = r.path[i + 1];
    const abx = b.x - a.x;
    const abz = b.y - a.y;
    let t = ((x - a.x) * abx + (z - a.y) * abz) / (abx * abx + abz * abz);
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(a.x + abx * t - x, a.y + abz * t - z);
    // Measure against the edge, so a narrow creek never wins over the river it joins.
    const edge = d - THREE.MathUtils.lerp(r.widths[i], r.widths[i + 1], t);
    if (
      !best ||
      edge <
        best.d -
          THREE.MathUtils.lerp(
            best.river.widths[Math.floor(best.f)],
            best.river.widths[Math.min(best.river.path.length - 1, Math.floor(best.f) + 1)],
            best.f % 1,
          )
    ) {
      best = { river: r, d, t: (i + t) / (r.path.length - 1), f: i + t };
    }
  }
  return best ?? NO_RIVER;
}

function sampleArr(arr: number[], f: number) {
  const i = Math.max(0, Math.min(arr.length - 2, Math.floor(f)));
  return arr[i] + (arr[i + 1] - arr[i]) * Math.max(0, Math.min(1, f - i));
}

export const riverWidthAt = (r: River, f: number) => sampleArr(r.widths, f);
export const riverLevelAt = (r: River, f: number) => sampleArr(r.levels, f);
export const riverOpenAt = (r: River, f: number) => sampleArr(r.open, f);

/** Distance from (x, z) to the main river (compatibility). */
export function streamDistance(x: number, z: number): { d: number; t: number } {
  const h = riverAt(x, z);
  return { d: h.d, t: h.t };
}

/** Main-river half-width at path parameter t (compatibility). */
export function streamWidth(t: number) {
  return riverWidthAt(MAIN_RAW, t * (MAIN_RAW.path.length - 1));
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
  // The river leaves through a broad gap in the southern range.
  return Math.max(ring, north) * (1 - 0.92 * gapFactor(x, z));
}

export function landHeight(x: number, z: number) {
  const m = mountainFactor(x, z);
  // The valley floor rolls: long low swells, a few rounded knolls, and the
  // small undulations underfoot.
  const swells = (fbm(x * 0.0019 + 21.7, z * 0.0019 - 4.3, 3) - 0.47) * 62;
  const knolls = smooth(0.56, 0.78, fbm(x * 0.0042 + 5.1, z * 0.0042 + 9.3, 3)) * 22;
  const roll =
    (swells + knolls) * (1 - m * 0.6) + (fbm(x * 0.0042 + 11.3, z * 0.0042 - 3.1, 4) - 0.5) * 22 + (fbm(x * 0.017 - 7.7, z * 0.017 + 2.2, 3) - 0.5) * 6;
  if (m <= 0.001) return roll;
  // Five octaves: finer ridges than the mesh can carry only read as facets;
  // the rock texture supplies that detail instead.
  const peaks = ridged(x * 0.0021 + 3.7, z * 0.0021 - 8.4, 5);
  const massif = fbm(x * 0.0009 + 1.3, z * 0.0009 + 5.6, 3);
  const mountains = peaks * 760 * (0.55 + massif) + 40;
  return escarpment(x, z, roll + mountains * m * m * (3 - 2 * m));
}

/**
 * The great falls' hanging valley: a high shelf in the north-east range that
 * ends in a cliff. The cliff line wanders and the shelf undulates, so it
 * reads as a glacial step rather than a cut.
 */

function escarpment(x: number, z: number, h: number) {
  const dx = x - LIP.x;
  const dz = z - LIP.y;
  const s = dx * FALL_DIR.x + dz * FALL_DIR.y;
  const q = dx * -FALL_DIR.y + dz * FALL_DIR.x;
  if (s > 60 || s < -1100 || Math.abs(q) > 420) return h;
  const lateral = 1 - smooth(170, 380, Math.abs(q));
  const upstream = smooth(-1000, -700, s);
  // The cliff edge bows and is notched; the shelf rises gently upstream.
  const edge = s + Math.sin(q * 0.011 + 0.6) * 22 + (noise2(q * 0.03 + 4.1, 7.7) - 0.5) * 26;
  const shelf = SHELF - s * 0.07 + (fbm(x * 0.006 + 2.2, z * 0.006 - 5.1, 3) - 0.5) * 34;
  const k = lateral * upstream * (1 - smooth(-14, 16, edge));
  return Math.max(h, h + (shelf - h) * k);
}

/** Raw height before glades are levelled. */
function rawHeight(x: number, z: number): number {
  let h = landHeight(x, z);
  // The lake: a soft-shored basin, with a low rim so the water never spills.
  const ld = lakeDistance(x, z);
  if (ld < 1.5) {
    const bed = LAKE.level - 0.4 - 5.5 * (1 - smooth(0.25, 1.0, ld));
    const rim = Math.max(h, LAKE.level + 0.9 + (ld - 1) * 6);
    const shore = smooth(0.92, 1.45, ld);
    h = ld < 1 ? bed + (Math.min(h, LAKE.level - 0.2) - bed) * smooth(0.82, 1.0, ld) : bed + (rim - bed) * shore;
  }
  // Cut each river's channel down to its water level, with soft banks.
  const r = riverAt(x, z);
  if (r.d < Infinity) {
    const w = riverWidthAt(r.river, r.f);
    if (r.d < w + BANK) {
      const level = riverLevelAt(r.river, r.f);
      const depth = r.river.depth;
      const inner = level + 0.6 - (depth + 0.6) * (1 - smooth(w * 0.3, w * 1.15, r.d));
      const s = smooth(w * 1.1, w + BANK, r.d);
      const carved = inner + (h - inner) * s;
      // In the lake the river only deepens the bed; it never raises banks.
      h = ld < 1.3 ? Math.min(h, carved) : carved;
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
  const r = riverAt(x, z);
  if (r.d < Infinity) {
    const w = riverWidthAt(r.river, r.f);
    const reach = riverOpenAt(r.river, r.f);
    water = 1 - smooth(w - 0.8, w + 0.6, r.d);
    // Open reaches clear a wide grassy margin; elsewhere trees crowd the bank
    // and their crowns close over the water.
    bank = 1 - smooth(w + 0.5 + reach * 26, w + 4 + reach * 40, r.d);
  }
  const ld = lakeDistance(x, z);
  if (ld < 1.7) {
    water = Math.max(water, 1 - smooth(0.97, 1.03, ld));
    // A meadow shore, wider on some sides than others.
    bank = Math.max(bank, 1 - smooth(1.04, 1.25 + 0.35 * noise2(x * 0.02, z * 0.02), ld));
  }
  const open = Math.max(glade, meadow * (1 - m), bank * 0.8, 1 - treeline);
  const patch = fbm(x * 0.02 - 5, z * 0.02 + 9, 3);
  const trees = (1 - open) * (1 - water) * treeline * (0.75 + 0.25 * fbm(x * 0.008, z * 0.008, 2));
  const wet = fallsWetness(x, z);
  const grass = (1 - water) * (1 - wet) * Math.min(1, 0.5 + open * 0.6 + smooth(0.45, 0.7, patch) * 0.35) * (1 - smooth(380, 480, h));
  const ferns = (1 - water) * (1 - glade) * (1 - open * 0.7) * smooth(0.3, 0.55, fbm(x * 0.013 + 3, z * 0.013 - 8, 3)) * treeline;
  const flowers = (1 - water) * Math.max(glade * 0.8, meadow * 0.9) * smooth(0.4, 0.62, fbm(x * 0.03 + 7, z * 0.03, 2));
  const rock = Math.max(bank * 0.6, (1 - treeline) * 0.5);
  return {
    open,
    trees,
    grass,
    ferns: ferns * (1 - wet * 0.5),
    flowers: flowers * (1 - wet),
    water,
    rock: Math.max(rock, wet),
  };
}

/** Spray-soaked rock around the falls, 0-1. */
function fallsWetness(x: number, z: number) {
  let wet = 0;
  for (const f of WATERFALLS) {
    const a = f.top;
    const b = f.base;
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const k = Math.max(0, Math.min(1.2, ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz)));
    const d = Math.hypot(x - (a.x + abx * k), z - (a.z + abz * k));
    const reach = f.width * 1.6 + 8;
    wet = Math.max(wet, 1 - smooth(reach, reach * 2.4, d));
  }
  return wet;
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

/**
 * Every place a river drops faster than it runs: the main river's falls out
 * of its hanging valley, the great falls on the north-east range, and the
 * creek's small cascades. Sorted from the tallest.
 */
export const WATERFALLS: WaterfallSite[] = (() => {
  const out: (WaterfallSite & { drop: number })[] = [];
  for (const r of RIVERS) {
    const n = r.path.length;
    const minDrop = r.id === "creek" ? 8 : 18;
    let runStart = -1;
    for (let i = 1; i < n; i++) {
      const seg = r.path[i - 1].distanceTo(r.path[i]);
      const steep = i < n - 1 && (r.levels[i] - r.levels[i + 1]) / Math.max(1, seg) > 0.5;
      if (steep && runStart < 0) runStart = i;
      if (!steep && runStart >= 0) {
        const drop = r.levels[runStart] - r.levels[i];
        if (drop >= minDrop) {
          const a = r.path[runStart];
          const b = r.path[i];
          out.push({
            top: new THREE.Vector3(a.x, r.levels[runStart], a.y),
            base: new THREE.Vector3(b.x, r.levels[i], b.y),
            flow: r.path[Math.min(n - 1, i + 1)].clone().sub(b).normalize(),
            width: r.widths[i],
            drop,
          });
        }
        runStart = -1;
      }
    }
  }
  return out.sort((a, b) => b.drop - a.drop);
})();

/** The main river's falls (kept for older callers). */
export const WATERFALL: WaterfallSite = WATERFALLS.find((f) => Math.hypot(f.top.x - MAIN_CTRL[2][0], f.top.z - MAIN_CTRL[2][1]) < 500) ?? WATERFALLS[0];
