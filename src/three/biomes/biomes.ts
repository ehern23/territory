import { generateTree, type TreeParams, type TreeShape } from "../flora/generateTree";
import { generateConifer } from "../flora/generateConifer";
import { fbm, streamDistance, streamWidth } from "../layout";
import type { seededRng } from "@/lib/random";

/**
 * Biomes: the kind of forest the territory grows in. A biome is data: the
 * species of the wild forest and where each grows, how thick the floor
 * cover is, how hazy the air is, and how the account giants are shaped. The
 * scene reads the active biome, so adding one is mostly adding an entry here.
 *
 * Mountain forest and Redwood grove are complete. Mangrove and Kelp forest
 * are planned: they need new ground (tidal flats, a sea floor) and new
 * light (underwater caustics), so they are listed but not yet selectable.
 */

export type BiomeId = "mountain" | "redwood" | "mangrove" | "kelp";

export interface Species {
  name: string;
  kind: "broadleaf" | "conifer";
  /** Needle cards instead of leaf clusters. */
  needles?: boolean;
  bark?: string;
  /** Leaf colour relative to the shared health palette. */
  tint: [number, number, number];
  shape: () => TreeShape;
}

export interface PickContext {
  rng: ReturnType<typeof seededRng>;
  x: number;
  y: number;
  z: number;
  /** How mountainous the place is, 0-1. */
  mf: number;
  /** Clearing / meadow openness nearby, 0-1. */
  open: number;
}

export interface Biome {
  id: BiomeId;
  name: string;
  tagline: string;
  available: boolean;
  /** Two colours for the picker swatch. */
  swatch: [string, string];
  species: Species[];
  pick: (c: PickContext, sp: Record<string, number>) => number;
  /** Multipliers on the forest floor layers. */
  cover: { grass: number; ferns: number; flowers: number; pebbles: number };
  /** Extra haze (0-1), added to the weather's. */
  haze: number;
  /** Overrides on the account giants' growth habit. */
  accountHabit: Partial<TreeParams>;
}

export function limbs(n: number) {
  return Array.from({ length: n }, (_, i) => ({ weight: 0.55 + (0.45 * ((i * 7) % 5)) / 4 }));
}

function smoothstep(v: number, a: number, b: number) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function nearStream(x: number, z: number, margin: number) {
  if (Math.abs(x) > 420 || z < -1300 || z > 1100) return false;
  const { d, t } = streamDistance(x, z);
  return d < streamWidth(t) + margin;
}

/* ------------------------------------------------------------------------ */
/* Mountain forest                                                           */
/* ------------------------------------------------------------------------ */

const MOUNTAIN_SPECIES: Species[] = [
  { name: "maple", kind: "broadleaf", tint: [1, 1, 1], shape: () => generateTree({ seed: 9101, height: 34, trunkRadius: 1.2, limbs: limbs(5), spread: 1.05, depth: 1, cardSize: 5.8, leafDensity: 1.4 }) },
  { name: "poplar", kind: "broadleaf", tint: [0.95, 1.06, 0.88], shape: () => generateTree({ seed: 9202, height: 46, trunkRadius: 1.0, limbs: limbs(7), spread: 0.42, upright: 1.9, depth: 1, cardSize: 5.0, leafDensity: 1.6, clearBole: 0.12 }) },
  { name: "hornbeam", kind: "broadleaf", tint: [1, 1.02, 0.96], shape: () => generateTree({ seed: 9303, height: 26, trunkRadius: 0.9, limbs: limbs(4), spread: 1.0, upright: 1.05, depth: 1, cardSize: 4.8, leafDensity: 1.4 }) },
  { name: "oak", kind: "broadleaf", tint: [0.84, 0.93, 0.78], shape: () => generateTree({ seed: 9404, height: 30, trunkRadius: 1.9, limbs: limbs(7), spread: 1.5, upright: 0.62, lean: 1.7, depth: 1, cardSize: 6.4, leafDensity: 1.5, clearBole: 0.22 }) },
  { name: "birch", kind: "broadleaf", bark: "#ddd6c8", tint: [1.12, 1.18, 0.8], shape: () => generateTree({ seed: 9505, height: 30, trunkRadius: 0.55, limbs: limbs(5), spread: 0.62, upright: 1.35, lean: 1.3, depth: 1, cardSize: 3.8, leafDensity: 1.6, clearBole: 0.35 }) },
  { name: "willow", kind: "broadleaf", tint: [1.06, 1.14, 0.78], shape: () => generateTree({ seed: 9606, height: 22, trunkRadius: 1.3, limbs: limbs(6), spread: 1.15, upright: 1.05, lean: 1.5, depth: 2, cardSize: 3.2, leafDensity: 0.95, clearBole: 0.25, droop: 1 }) },
  { name: "spruce", kind: "conifer", needles: true, tint: [0.84, 0.98, 0.9], shape: () => generateConifer({ seed: 7101, height: 40, trunkRadius: 0.95, width: 0.25, cardSize: 3.6, density: 1.1 }) },
  { name: "fir", kind: "conifer", needles: true, tint: [0.8, 0.96, 0.92], shape: () => generateConifer({ seed: 7202, height: 28, trunkRadius: 0.7, width: 0.3, cardSize: 3.0, density: 1.1 }) },
  { name: "pine", kind: "conifer", needles: true, bark: "#6e5040", tint: [0.92, 1.0, 0.86], shape: () => generateTree({ seed: 9707, height: 44, trunkRadius: 1.0, limbs: limbs(5), spread: 0.8, upright: 0.75, depth: 1, cardSize: 4.2, leafDensity: 1.3, clearBole: 0.62 }) },
];

function pickMountain({ rng, x, y, z, mf, open }: PickContext, sp: Record<string, number>) {
  // Conifers take over as the ground climbs; broadleaf keeps the valley.
  const coniferP = 0.12 + mf * 0.6 + smoothstep(y, 60, 240) * 0.75 + (fbm(x * 0.004 + 9, z * 0.004, 2) - 0.5) * 0.7;
  if (rng.next() < Math.min(0.97, Math.max(0, coniferP))) {
    // Pines on the lower, warmer slopes; spruce and fir higher up.
    if (y < 260 && rng.chance(0.3)) return sp.pine;
    return rng.chance(0.55) ? sp.spruce : sp.fir;
  }
  // Willows lean over the water.
  if (nearStream(x, z, 26) && rng.chance(0.6)) return sp.willow;
  // Birches stand in pale groves.
  if (fbm(x * 0.006 + 31, z * 0.006 - 12, 2) > 0.6 && rng.chance(0.75)) return sp.birch;
  // Broad oaks hold the edges of clearings.
  if ((open > 0.15 || fbm(x * 0.005 - 7, z * 0.005 + 17, 2) > 0.64) && rng.chance(0.55)) return sp.oak;
  if (rng.chance(0.08)) return sp.poplar;
  return rng.chance(0.6) ? sp.maple : sp.hornbeam;
}

/* ------------------------------------------------------------------------ */
/* Redwood grove                                                             */
/* ------------------------------------------------------------------------ */

const REDWOOD_SPECIES: Species[] = [
  { name: "redwood", kind: "conifer", needles: true, bark: "#8a4a32", tint: [0.86, 1.0, 0.86], shape: () => generateConifer({ seed: 8101, height: 68, trunkRadius: 2.6, width: 0.15, cardSize: 4.6, density: 1.15, firstWhorl: 0.48, flare: 0.8 }) },
  { name: "young redwood", kind: "conifer", needles: true, bark: "#8a4a32", tint: [0.9, 1.04, 0.86], shape: () => generateConifer({ seed: 8202, height: 46, trunkRadius: 1.5, width: 0.18, cardSize: 3.8, density: 1.1, firstWhorl: 0.36, flare: 0.5 }) },
  { name: "douglas fir", kind: "conifer", needles: true, bark: "#5e4a3e", tint: [0.8, 0.96, 0.9], shape: () => generateConifer({ seed: 8303, height: 50, trunkRadius: 1.3, width: 0.22, cardSize: 3.8, density: 1.05, firstWhorl: 0.3 }) },
  { name: "tanoak", kind: "broadleaf", tint: [0.86, 0.98, 0.8], shape: () => generateTree({ seed: 8404, height: 20, trunkRadius: 0.8, limbs: limbs(5), spread: 1.1, upright: 1.0, lean: 1.6, depth: 1, cardSize: 4.2, leafDensity: 1.4 }) },
  { name: "bay laurel", kind: "broadleaf", tint: [0.82, 0.94, 0.74], shape: () => generateTree({ seed: 8505, height: 16, trunkRadius: 0.9, limbs: limbs(6), spread: 1.25, upright: 0.9, lean: 1.8, depth: 1, cardSize: 3.8, leafDensity: 1.5, clearBole: 0.15 }) },
];

function pickRedwood({ rng, y, mf }: PickContext, sp: Record<string, number>) {
  // Redwoods own the valley floor and the fog belt; fir takes the high ground,
  // and tanoak and bay laurel fill the understorey between the giants.
  if (y > 320 || mf > 0.6) return rng.chance(0.8) ? sp["douglas fir"] : sp["young redwood"];
  const r = rng.next();
  if (r < 0.42) return sp.redwood;
  if (r < 0.66) return sp["young redwood"];
  if (r < 0.78) return sp["douglas fir"];
  return rng.chance(0.6) ? sp.tanoak : sp["bay laurel"];
}

/* ------------------------------------------------------------------------ */
/* Registry                                                                  */
/* ------------------------------------------------------------------------ */

export const BIOMES: Record<BiomeId, Biome> = {
  mountain: {
    id: "mountain",
    name: "Mountain forest",
    tagline: "Mixed woodland in a high valley, under jagged peaks",
    available: true,
    swatch: ["#2f5a2c", "#a9c8e4"],
    species: MOUNTAIN_SPECIES,
    pick: pickMountain,
    cover: { grass: 1, ferns: 1, flowers: 1, pebbles: 1 },
    haze: 0,
    accountHabit: {},
  },
  redwood: {
    id: "redwood",
    name: "Redwood grove",
    tagline: "Coast redwoods in the fog, the tallest trees on Earth",
    available: true,
    swatch: ["#7a3a24", "#5a7a5a"],
    species: REDWOOD_SPECIES,
    pick: pickRedwood,
    cover: { grass: 0.35, ferns: 2.4, flowers: 0.35, pebbles: 0.7 },
    haze: 0.35,
    // Account giants grow tall and narrow, crowns held high like old redwoods.
    accountHabit: { spread: 0.78, upright: 1.45, clearBole: 0.42 },
  },
  mangrove: {
    id: "mangrove",
    name: "Mangrove",
    tagline: "Stilt roots over warm tidal water",
    available: false,
    swatch: ["#3d6a4a", "#6fb6b0"],
    species: MOUNTAIN_SPECIES,
    pick: pickMountain,
    cover: { grass: 0.2, ferns: 0.4, flowers: 0.2, pebbles: 0.2 },
    haze: 0.2,
    accountHabit: {},
  },
  kelp: {
    id: "kelp",
    name: "Kelp forest",
    tagline: "Swaying kelp, shafts of light, seals overhead",
    available: false,
    swatch: ["#1f4a52", "#6aa8a0"],
    species: MOUNTAIN_SPECIES,
    pick: pickMountain,
    cover: { grass: 0, ferns: 0, flowers: 0, pebbles: 1 },
    haze: 0.6,
    accountHabit: {},
  },
};

export const BIOME_ORDER: BiomeId[] = ["mountain", "redwood", "mangrove", "kelp"];

export function speciesIndex(biome: Biome) {
  return Object.fromEntries(biome.species.map((s, i) => [s.name, i])) as Record<string, number>;
}
