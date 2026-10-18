import type { OpportunityMaturity, RelationshipStatus } from "@/domain/types";

/** Interface colours that mirror what the scene shows. */

/** Relationship progression: muted until a real conversation, then green. */
export const STATUS_HEX: Record<RelationshipStatus, string> = {
  unworked: "#7d8277",
  researched: "#a3a88f",
  contacted: "#d7b45a",
  engaged: "#9fcf6e",
  meeting: "#6fd08f",
  disqualified: "#5d5953",
};

/** Matches the fruit material in the scene. */
export const FRUIT_HEX: Record<OpportunityMaturity, string> = {
  seed: "#93a35e",
  bud: "#c2c063",
  young: "#e2a843",
  growing: "#e57a3a",
  ripe: "#cf3f2c",
};

export const SEASON_HEX = {
  spring: "#b5dc6e",
  summer: "#7fbf5a",
  fall: "#d7b45a",
  winter: "#8b8378",
} as const;
