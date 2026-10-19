import type {
  IntelSeed,
  OpportunitySeed,
  SeedStage,
  SignalSeed,
  StakeholderSeed,
  UnitFunction,
  UnitSeed,
} from "@/domain/profile";
import type { Persona, RelationshipStatus, RootCategory, SignalStrength, SignalType } from "@/domain/types";

/**
 * Terse constructors for hand-written seeds, so each target account reads as
 * a short brief rather than a wall of object keys.
 */

export function unit(
  key: string,
  name: string,
  fn: UnitFunction,
  thesis: string,
  opts: { short?: string; dormant?: boolean; size?: number } = {},
): UnitSeed {
  return { key, name, shortName: opts.short, status: opts.dormant ? "dormant" : "active", thesis, fn, size: opts.size };
}

export function person(
  key: string,
  title: string,
  persona: Persona,
  influence: 1 | 2 | 3 | 4 | 5,
  unitKey: string,
  status: RelationshipStatus,
  hypothesis: string,
): StakeholderSeed {
  return { key, title, persona, influence, unit: unitKey, status, hypothesis };
}

export function opp(
  key: string,
  name: string,
  unitKey: string,
  value: number,
  stage: SeedStage,
  stakeholders: string[],
  nextStep: string,
  champion?: string,
): OpportunitySeed {
  return { key, name, unit: unitKey, value, stage, stakeholders, nextStep, champion };
}

export function signal(
  title: string,
  description: string,
  type: SignalType,
  strength: SignalStrength,
  unitKey?: string,
): SignalSeed {
  return { title, description, type, strength, unit: unitKey };
}

export function intel(category: RootCategory, title: string, summary: string): IntelSeed {
  return { category, title, summary };
}
