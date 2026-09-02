import * as THREE from "three";
import type { OpportunityMaturity, RelationshipStatus } from "@/domain/types";

/**
 * Restrained natural palette. Autumn relationship progression:
 * green → yellow → orange → red → fall.
 */
export const LEAF_COLORS: Record<RelationshipStatus, THREE.Color> = {
  unworked: new THREE.Color("#5f7a4e"),
  researched: new THREE.Color("#7f8a49"),
  contacted: new THREE.Color("#b8933b"),
  engaged: new THREE.Color("#b8642e"),
  meeting: new THREE.Color("#8f3323"),
  disqualified: new THREE.Color("#5a534b"),
};

export const LEAF_HEX: Record<RelationshipStatus, string> = {
  unworked: "#6f8a5e",
  researched: "#8c9852",
  contacted: "#c9a24a",
  engaged: "#c9703a",
  meeting: "#9c3a29",
  disqualified: "#6b645c",
};

export const NEW_LEAF_COLOR = new THREE.Color("#8fb36a");
export const DORMANT_LEAF_COLOR = new THREE.Color("#6d5f4d");
export const BUD_COLOR = new THREE.Color("#b6c48a");

export const BARK = new THREE.Color("#4a4139");
export const BARK_DORMANT = new THREE.Color("#57524c");
export const BARK_SPRING = new THREE.Color("#4f4738");
export const BARK_FOREST_FAR = new THREE.Color("#2c2b2f");
export const ROOT_COLOR = new THREE.Color("#5a4d40");

export const FRUIT_COLORS: Record<OpportunityMaturity, THREE.Color> = {
  seed: new THREE.Color("#6f6553"),
  bud: new THREE.Color("#7d6650"),
  young: new THREE.Color("#8c5d40"),
  growing: new THREE.Color("#8f4a37"),
  ripe: new THREE.Color("#7f3a34"),
};

export const FRUIT_HEX: Record<OpportunityMaturity, string> = {
  seed: "#8a7f68",
  bud: "#a08462",
  young: "#b97a4a",
  growing: "#c05a3e",
  ripe: "#b04444",
};

export const FRUIT_SCALE: Record<OpportunityMaturity, number> = {
  seed: 0.16,
  bud: 0.21,
  young: 0.27,
  growing: 0.33,
  ripe: 0.4,
};

export const BACKGROUND = "#14151a";
export const FOG = "#15161b";
export const GROUND = "#1b1c21";

export const SEASON_HEX = {
  spring: "#8fb36a",
  summer: "#6f8a5e",
  fall: "#c9703a",
  winter: "#8b8378",
} as const;
