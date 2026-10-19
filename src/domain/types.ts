/**
 * Territory domain model.
 *
 * These types describe the strategic territory independent of how it is
 * rendered. The forest is the data model: every visual element in the 3D
 * scene is derived from these objects.
 *
 * Evidence discipline: every important object carries an `evidenceType` so the
 * interface can always distinguish publicly sourced facts, seller hypotheses,
 * and synthetic demonstration data.
 */

export type EvidenceType = "verified" | "inference" | "demo";

export type Season = "spring" | "summer" | "fall" | "winter";

export type Priority = "high" | "medium" | "low";

export type Persona =
  | "Executive Sponsor"
  | "Economic Buyer"
  | "Technical Buyer"
  | "Champion"
  | "Influencer"
  | "Security"
  | "Procurement"
  | "Developer";

export type RelationshipStatus =
  | "unworked"
  | "researched"
  | "contacted"
  | "engaged"
  | "meeting"
  | "disqualified";

export type BusinessUnitStatus = "active" | "dormant" | "reactivating";

export type OpportunityMaturity = "seed" | "bud" | "young" | "growing" | "ripe";

export type Momentum = "low" | "building" | "high";

export type SignalType =
  | "executive-change"
  | "ai-initiative"
  | "developer-productivity"
  | "acquisition"
  | "engineering-hub"
  | "product-launch"
  | "hiring-surge"
  | "governance"
  | "competitive-displacement"
  | "earnings-priority"
  | "technical-announcement"
  // Seller-agnostic additions (payments, finance, data, AI platforms…)
  | "market-expansion"
  | "platform-migration"
  | "finance-transformation";

export type SignalStrength = "weak" | "moderate" | "strong";

export interface Evidence {
  evidenceType: EvidenceType;
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface Prospect extends Evidence {
  id: string;
  name: string;
  title: string;
  accountId: string;
  businessUnitId: string;
  teamId: string;
  persona: Persona;
  /** 1 (peripheral) to 5 (decisive). */
  influence: 1 | 2 | 3 | 4 | 5;
  relationshipStatus: RelationshipStatus;
  priority: Priority;
  lastTouch?: string;
  nextAction?: string;
  hypothesis: string;
  painPoints: string[];
  signals: string[];
  notes: string[];
  /**
   * Latent prospects are not yet part of the active prospecting surface.
   * They emerge as new leaves when a dormant branch is reactivated.
   */
  latent?: boolean;
  /** Demo meeting date once a meeting is booked. */
  meetingDate?: string;
}

export interface Team {
  id: string;
  businessUnitId: string;
  accountId: string;
  name: string;
  priority: Priority;
  season: Season;
  thesis?: string;
  prospects: Prospect[];
}

export interface DormancyReason {
  code:
    | "low-relevance"
    | "no-trigger"
    | "strong-incumbent"
    | "poor-timing"
    | "no-buying-surface"
    | "org-freeze"
    | "previous-disqualification"
    | "low-expected-return";
  label: string;
  detail: string;
  recommendation: string;
}

export interface ReactivationScenario {
  signal: Omit<Signal, "id" | "accountId" | "businessUnitId" | "date">;
  recommendation: string;
}

export interface BusinessUnit {
  id: string;
  accountId: string;
  name: string;
  shortName?: string;
  priority: Priority;
  season: Season;
  status: BusinessUnitStatus;
  thesis: string;
  teams: Team[];
  dormancyReason?: DormancyReason;
  /** Local demo scenario used by "Simulate Trigger". */
  reactivation?: ReactivationScenario;
}

export interface Signal extends Evidence {
  id: string;
  accountId: string;
  businessUnitId?: string;
  type: SignalType;
  strength: SignalStrength;
  title: string;
  description: string;
  date: string;
}

export interface Opportunity extends Evidence {
  id: string;
  accountId: string;
  businessUnitId: string;
  name: string;
  /** Floor for maturity: the opportunity is never rendered weaker than this. */
  baselineMaturity?: OpportunityMaturity;
  /**
   * Latent opportunities are only revealed once stakeholder engagement in the
   * business unit justifies them (e.g. a second engaged stakeholder).
   */
  latent?: boolean;
  stakeholderIds: string[];
  championId?: string;
  /** Meetings recorded outside of prospects (demo history). */
  baseMeetingCount: number;
  signals: string[];
  nextStep: string;
  stage: string;
}

/**
 * Strategic score dimensions. Keys are stable identifiers; every component
 * carries its own human label, so a seller of payments, spend management or AI
 * platforms can describe the same dimension in their own language. Only
 * `competitive-friction` changes the arithmetic (it counts against the score).
 */
export type ScoreKey =
  // Seller-agnostic dimensions
  | "account-scale"
  | "use-case-fit"
  | "expansion-potential"
  | "ai-intensity"
  | "logo-value"
  | "surface-area"
  | "timing"
  | "governance-fit"
  | "competitive-friction"
  // Developer-platform dimensions (the original Vercel territory)
  | "technical-scale"
  | "engineering-complexity"
  | "seat-expansion";

export interface StrategicScoreComponent {
  key: ScoreKey;
  label: string;
  /** 0-10 */
  value: number;
  /** relative weight */
  weight: number;
  reasoning: string;
  evidenceType: EvidenceType;
}

export interface StrategicScore {
  components: StrategicScoreComponent[];
}

/**
 * Intelligence categories ("roots"). The first group is seller-agnostic; the
 * developer-specific categories remain for the developer-platform territory.
 */
export type RootCategory =
  | "Company Scale"
  | "Business Model"
  | "Digital Surface"
  | "Current Stack"
  | "AI Adoption"
  | "Security / Governance"
  | "Transformation Initiatives"
  | "Competitive Environment"
  | "Executive Priorities"
  | "Timing Signals"
  // Developer-platform categories
  | "Developer Scale"
  | "Engineering Complexity"
  | "Developer Tooling";

export interface RootIntelligence extends Evidence {
  id: string;
  accountId: string;
  category: RootCategory;
  title: string;
  summary: string;
}

export interface Account {
  id: string;
  name: string;
  /** Deterministic seed driving procedural geometry. */
  seed: number;
  /** Shorthand used in dense UI. */
  ticker?: string;
  sector: string;
  thesis: string;
  season: Season;
  /** Relative size cues, 0-1. */
  scale: {
    opportunity: number;
    enterprise: number;
    complexity: number;
  };
  strategicScore: StrategicScore;
  businessUnits: BusinessUnit[];
  intelligence: RootIntelligence[];
  opportunities: Opportunity[];
  signals: Signal[];
}

export interface MarketSilhouette {
  id: string;
  name: string;
  potential: string;
  friction: string;
  hypothesis: string;
  evidenceType: EvidenceType;
}

export type ActivityKind =
  | "researched"
  | "contacted"
  | "engaged"
  | "meeting"
  | "disqualified"
  | "opportunity"
  | "reactivation"
  | "score"
  | "undo";

export interface Activity {
  id: string;
  accountId: string;
  kind: ActivityKind;
  message: string;
  timestamp: number;
  prospectId?: string;
  businessUnitId?: string;
  opportunityId?: string;
}

export interface Territory {
  accounts: Account[];
  market: MarketSilhouette[];
}
