import type { Tier } from "./commercial";
import type { Persona, RelationshipStatus, RootCategory, SignalStrength, SignalType } from "./types";

/**
 * Who is selling. A seller profile reshapes the whole territory: which
 * companies grow as trees, how their organisations are drawn, and the language
 * of every opportunity. Profiles are curated presets, a deterministic archetype
 * for unknown companies, or (optionally) researched by Claude.
 */

export type SellerRole = "AE" | "SDR" | "AM";

export const ROLE_LABEL: Record<SellerRole, string> = {
  AE: "Account Executive",
  SDR: "Sales Development",
  AM: "Account Manager",
};

export type SellerArchetype =
  | "devtools"
  | "payments"
  | "spend"
  | "ai-platform"
  | "data-infra"
  | "observability"
  | "security"
  | "hr-saas"
  | "generic";

export interface SellerProfile {
  /** Stable id: a preset id ("stripe") or "custom:<slug>". */
  id: string;
  /** The seller's company as the user typed or we know it. */
  company: string;
  /** Flagship product name used in opportunity copy ("Claude", "Stripe"). */
  productName: string;
  /** What they sell, in a short phrase. */
  product: string;
  /** Category noun phrase ("payments infrastructure"). */
  category: string;
  role: SellerRole;
  /** Territory label for the honesty banner ("Vercel Majors"). */
  territoryLabel: string;
  /** Motion shown in each account header ("platform standardization"). */
  motion: string;
  /** Ideal customer profile, one or two sentences. */
  icp: string;
  valueProps: string[];
  /** Buyer personas, as titles. */
  personas: string[];
  archetype: SellerArchetype;
  /** Where this profile came from. */
  source: "preset" | "archetype" | "researched";
}

/* ------------------------------------------------------------------------ */
/* Compact account seeds                                                     */
/* ------------------------------------------------------------------------ */

/**
 * The compact, hand-authorable description of one target account. The seed
 * builder turns it into a full `Account` plus its commercial overlay.
 *
 * Evidence: company-level facts in a seed (sector, organisations, theses,
 * intelligence) are seller inference about a real company. Stakeholders are
 * fictional titles; activity, stages and dollar values are demo data.
 *
 * Strings may use `{seller}` and `{product}` tokens, replaced from the profile.
 */
export interface AccountSeed {
  /** Slug, unique within the territory. */
  id: string;
  name: string;
  ticker?: string;
  sector: string;
  thesis: string;
  tier: Tier;
  /** Potential ARR in dollars (demo). */
  potentialArr: number;
  /** Account-specific motion ("payments modernization"). */
  motion: string;
  units: UnitSeed[];
  stakeholders: StakeholderSeed[];
  opportunities: OpportunitySeed[];
  signals: SignalSeed[];
  lastActivityDaysAgo: number;
  lastActivity: string;
  intelligence: IntelSeed[];
}

export type UnitFunction =
  | "platform"
  | "product-engineering"
  | "data-ai"
  | "security"
  | "infrastructure"
  | "developer-experience"
  | "business"
  | "procurement"
  | "finance"
  | "payments"
  | "operations"
  | "people"
  | "revenue";

export interface UnitSeed {
  key: string;
  name: string;
  shortName?: string;
  status: "active" | "dormant";
  thesis: string;
  /** Function of the generated people in this unit. */
  fn: UnitFunction;
  /** Relative headcount of the unit (1 = typical). */
  size?: number;
}

export interface StakeholderSeed {
  key: string;
  title: string;
  persona: Persona;
  influence: 1 | 2 | 3 | 4 | 5;
  /** Unit key. */
  unit: string;
  status: RelationshipStatus;
  hypothesis: string;
}

export type SeedStage = "Forming" | "Discovery" | "Qualified" | "Technical validation" | "Commercial";

export interface OpportunitySeed {
  key: string;
  name: string;
  /** Unit key. */
  unit: string;
  /** Deal value, ARR dollars (demo). */
  value: number;
  /** "Forming" opportunities are latent until a second stakeholder engages. */
  stage: SeedStage;
  /** Stakeholder keys. */
  stakeholders: string[];
  champion?: string;
  nextStep: string;
}

export interface SignalSeed {
  title: string;
  description: string;
  type: SignalType;
  strength: SignalStrength;
  unit?: string;
}

export interface IntelSeed {
  category: RootCategory;
  title: string;
  summary: string;
}

/** A preset bundles the profile with its hand-written seeds. */
export interface SellerPreset {
  profile: SellerProfile;
  /** Search aliases, lowercase ("open ai", "chatgpt"). */
  aliases: string[];
  seeds: AccountSeed[];
}
