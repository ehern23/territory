import type { AccountSeed, SellerPreset, SellerProfile, SellerRole } from "@/domain/profile";
import type { AccountCommercial } from "@/domain/commercial";
import type { Territory } from "@/domain/types";
import { territory as vercelTerritory } from "../index";
import { COMMERCIAL as VERCEL_COMMERCIAL } from "../commercial";
import { buildTerritoryFromProfile } from "./build";
import { archetypeProfile, archetypeSeeds, classifySeller } from "./archetypes";
import { vercel } from "./presets/vercel";
import { stripe } from "./presets/stripe";
import { ramp } from "./presets/ramp";
import { anthropic } from "./presets/anthropic";
import { openai } from "./presets/openai";
import { cursor } from "./presets/cursor";
import { cognition } from "./presets/cognition";
import { datadog } from "./presets/datadog";
import { snowflake } from "./presets/snowflake";

export { buildTerritoryFromProfile } from "./build";
export { ARCHETYPE_LABEL, archetypeProfile, archetypeSeeds, classifySeller } from "./archetypes";

/** Curated sellers, in the order the onboarding card suggests them. */
export const PRESETS: SellerPreset[] = [vercel, stripe, ramp, anthropic, openai, cursor, cognition, datadog, snowflake];

export const DEFAULT_PROFILE: SellerProfile = vercel.profile;

/** Everything the store needs for one seller. */
export interface ActiveTerritory {
  profile: SellerProfile;
  territory: Territory;
  commercial: Record<string, AccountCommercial>;
  /** Seeds behind a generated territory (absent for the hand-built default). */
  seeds?: AccountSeed[];
}

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,]+$/, "");
}

export function findPreset(input: string): SellerPreset | undefined {
  const q = normalize(input);
  if (!q) return undefined;
  return PRESETS.find((p) => p.profile.id === q || p.aliases.includes(q));
}

export function presetById(id: string): SellerPreset | undefined {
  return PRESETS.find((p) => p.profile.id === id);
}

/**
 * The profile and seeds for whatever the user typed: a preset when we know the
 * company, otherwise a deterministic archetype.
 */
export function profileForCompany(company: string, role: SellerRole): { profile: SellerProfile; seeds?: AccountSeed[]; preset: boolean } {
  const preset = findPreset(company);
  if (preset) return { profile: { ...preset.profile, role }, preset: true };
  const archetype = classifySeller(company);
  return { profile: archetypeProfile(company, role, archetype), seeds: archetypeSeeds(archetype), preset: false };
}

/** Build the active territory for a profile (and, for researched profiles, its seeds). */
export function resolveTerritory(profile: SellerProfile, seeds?: AccountSeed[]): ActiveTerritory {
  if (profile.id === vercel.profile.id && !seeds?.length) {
    return { profile, territory: vercelTerritory, commercial: VERCEL_COMMERCIAL };
  }
  const resolved = seeds?.length ? seeds : (presetById(profile.id)?.seeds ?? archetypeSeeds(profile.archetype));
  const built = buildTerritoryFromProfile(profile, resolved);
  return { profile, territory: built.territory, commercial: built.commercial, seeds: resolved };
}

export const DEFAULT_TERRITORY: ActiveTerritory = resolveTerritory(DEFAULT_PROFILE);
