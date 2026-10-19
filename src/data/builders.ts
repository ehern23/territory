import type {
  Account,
  BusinessUnit,
  BusinessUnitStatus,
  DormancyReason,
  Opportunity,
  Persona,
  Priority,
  Prospect,
  ReactivationScenario,
  RelationshipStatus,
  RootIntelligence,
  Season,
  Signal,
  StrategicScoreComponent,
  Team,
} from "@/domain/types";
import { seededRng, type Rng } from "@/lib/random";
import { FIRST_NAMES, LAST_NAMES, TITLES, type FunctionKind } from "./names";

/**
 * Compact authoring helpers for demo accounts.
 *
 * Each account declares a handful of rich, hand-written prospects per team and
 * lets `fill` deterministically generate lighter synthetic prospects around
 * them. Everything synthetic is labelled `evidenceType: "demo"`.
 */

export type TeamCondition =
  | "untouched" // healthy summer canopy, almost no outreach
  | "light" // early outreach
  | "warming" // fall: engagement building
  | "hot" // strong fall engagement, meetings
  | "dormant" // winter: sparse, some disqualified
  | "spring"; // recently reactivated: fresh, unworked

export interface RichProspectSpec {
  name: string;
  title: string;
  persona: Persona;
  influence: 1 | 2 | 3 | 4 | 5;
  status?: RelationshipStatus;
  priority?: Priority;
  hypothesis: string;
  painPoints?: string[];
  signals?: string[];
  nextAction?: string;
  lastTouch?: string;
  notes?: string[];
  /** Stable id suffix so opportunities can reference this person. */
  key: string;
  latent?: boolean;
}

export interface TeamSpec {
  id: string;
  name: string;
  priority?: Priority;
  season?: Season;
  thesis?: string;
  fn: FunctionKind;
  /** Total prospects including rich ones. */
  size: number;
  condition: TeamCondition;
  rich?: RichProspectSpec[];
  /** Number of additional latent prospects (hidden until reactivation). */
  latent?: number;
}

export interface BusinessUnitSpec {
  id: string;
  name: string;
  shortName?: string;
  priority: Priority;
  season: Season;
  status?: BusinessUnitStatus;
  thesis: string;
  teams: TeamSpec[];
  dormancyReason?: DormancyReason;
  reactivation?: ReactivationScenario;
}

export interface OpportunitySpec {
  id: string;
  businessUnitId: string;
  name: string;
  stage: string;
  baselineMaturity?: Opportunity["baselineMaturity"];
  latent?: boolean;
  /** Prospect keys (rich prospects) that count as stakeholders. */
  stakeholders: string[];
  champion?: string;
  baseMeetingCount?: number;
  signals?: string[];
  nextStep: string;
}

export interface SignalSpec {
  id: string;
  businessUnitId?: string;
  type: Signal["type"];
  strength: Signal["strength"];
  title: string;
  description: string;
  date: string;
  evidenceType: Signal["evidenceType"];
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface AccountSpec {
  id: string;
  name: string;
  ticker?: string;
  seed: number;
  sector: string;
  thesis: string;
  season: Season;
  scale: Account["scale"];
  score: StrategicScoreComponent[];
  intelligence: Omit<RootIntelligence, "accountId">[];
  businessUnits: BusinessUnitSpec[];
  opportunities: OpportunitySpec[];
  signals: SignalSpec[];
  /**
   * Optional seller voice for generated prospects. Defaults describe a
   * developer-platform seller; other sellers pass their own framing.
   */
  voice?: ProspectVoice;
}

export interface ProspectVoice {
  hypotheses?: Partial<Record<FunctionKind, string[]>>;
  pain?: Partial<Record<FunctionKind, string[]>>;
}

const STATUS_MIX: Record<TeamCondition, [RelationshipStatus, number][]> = {
  untouched: [["unworked", 0.86], ["researched", 0.14]],
  light: [["unworked", 0.6], ["researched", 0.2], ["contacted", 0.15], ["engaged", 0.05]],
  warming: [
    ["unworked", 0.34],
    ["researched", 0.16],
    ["contacted", 0.26],
    ["engaged", 0.2],
    ["meeting", 0.04],
  ],
  hot: [
    ["unworked", 0.14],
    ["researched", 0.1],
    ["contacted", 0.26],
    ["engaged", 0.36],
    ["meeting", 0.14],
  ],
  dormant: [["unworked", 0.6], ["disqualified", 0.4]],
  spring: [["unworked", 0.8], ["researched", 0.2]],
};

const GENERIC_HYPOTHESES: Record<FunctionKind, string[]> = {
  platform: [
    "Owns shared engineering platforms; cares about consistency and adoption across teams.",
    "Likely measured on developer throughput and platform reliability.",
  ],
  "product-engineering": [
    "Ships customer-facing software under delivery pressure; sensitive to cycle time.",
    "Balances feature velocity against quality; would value fewer context switches.",
  ],
  "data-ai": [
    "Builds ML systems; likely evaluating how AI tooling changes the engineering workflow.",
    "Interested in model-assisted development for data pipelines and experimentation.",
  ],
  security: [
    "Gatekeeper for any developer tool touching source code; cares about data handling.",
    "Will ask about retention, model training on customer code, and audit trails.",
  ],
  infrastructure: [
    "Runs cloud and runtime platforms; values reliability and standardization.",
    "Likely influences which tools are permitted in the internal developer platform.",
  ],
  "developer-experience": [
    "Directly accountable for developer productivity; natural champion territory.",
    "Measures onboarding time, build health, and inner-loop speed.",
  ],
  business: [
    "Controls technology budget allocation; needs a business case, not a demo.",
    "Interested in seat-level ROI and portfolio-wide standardization.",
  ],
  procurement: [
    "Manages enterprise vendor terms; engage once a sponsor exists.",
    "Cares about contract flexibility and consolidation.",
  ],
  finance: [
    "Owns the close and the controls around it; measured on accuracy and days-to-close.",
    "Feels manual work in AP and reconciliation first; a natural early champion.",
  ],
  payments: [
    "Owns payment acceptance and its economics; authorization rate and cost are the scoreboard.",
    "Balances conversion against fraud and compliance in every change.",
  ],
  operations: [
    "Runs the processes everyone else depends on; values fewer handoffs.",
    "Measured on throughput and cost to serve.",
  ],
  people: [
    "Owns the employee lifecycle systems; adoption and data quality matter most.",
    "Will weigh change management as heavily as features.",
  ],
  revenue: [
    "Accountable for customer-facing growth programs; wants measurable lift.",
    "Sponsors pilots when they map to a quarterly target.",
  ],
};

const GENERIC_PAIN: Record<FunctionKind, string[]> = {
  platform: ["Fragmented tooling", "Slow inner loop", "Adoption of internal standards"],
  "product-engineering": ["Long review cycles", "Legacy code comprehension", "Onboarding"],
  "data-ai": ["Notebook-to-production gap", "Experiment velocity", "Pipeline maintenance"],
  security: ["Source code exposure", "Shadow AI tooling", "Audit requirements"],
  infrastructure: ["Config sprawl", "Toil in operations", "Migration backlog"],
  "developer-experience": ["Build times", "Context switching", "Tool sprawl"],
  business: ["Cost visibility", "Vendor consolidation", "Demonstrable ROI"],
  procurement: ["Contract complexity", "Security review time", "Renewal timing"],
  finance: ["Manual reconciliation", "Slow month-end close", "Policy compliance"],
  payments: ["Authorization rates", "Processing cost", "Fragmented providers"],
  operations: ["Manual handoffs", "Process visibility", "Cost to serve"],
  people: ["System sprawl", "Onboarding time", "Data quality"],
  revenue: ["Attribution", "Personalization at scale", "Campaign velocity"],
};

const NEXT_ACTIONS: Record<RelationshipStatus, string[]> = {
  unworked: ["Research recent work and shared context.", "Identify a warm path in."],
  researched: ["Send a specific, relevant first note.", "Reference a recent public talk or post."],
  contacted: ["Follow up with a concrete question.", "Offer a short working session."],
  engaged: ["Propose a scoped pilot conversation.", "Ask for an introduction to a peer."],
  meeting: ["Prepare discovery questions.", "Confirm attendees and agenda."],
  disqualified: ["Revisit only on a new trigger."],
};

function pickWeighted<T>(rng: Rng, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

function demoDate(rng: Rng, daysBackMax: number): string {
  const base = new Date(Date.UTC(2026, 7, 28));
  base.setUTCDate(base.getUTCDate() - rng.int(1, daysBackMax));
  return base.toISOString().slice(0, 10);
}

function uniqueName(rng: Rng, used: Set<string>, teamFirsts?: Set<string>): string {
  for (let i = 0; i < 80; i++) {
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const name = `${first} ${last}`;
    if (!used.has(name) && (!teamFirsts || !teamFirsts.has(first))) {
      used.add(name);
      teamFirsts?.add(first);
      return name;
    }
  }
  const fallback = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)} ${used.size}`;
  used.add(fallback);
  return fallback;
}

function buildTeam(
  accountId: string,
  bu: BusinessUnitSpec,
  spec: TeamSpec,
  usedNames: Set<string>,
  voice?: ProspectVoice,
): Team {
  const hypotheses = voice?.hypotheses?.[spec.fn] ?? GENERIC_HYPOTHESES[spec.fn];
  const pains = voice?.pain?.[spec.fn] ?? GENERIC_PAIN[spec.fn];
  const rng = seededRng(accountId, bu.id, spec.id);
  const teamId = `${accountId}.${bu.id}.${spec.id}`;
  const buId = `${accountId}.${bu.id}`;
  const prospects: Prospect[] = [];
  const teamFirsts = new Set<string>();

  for (const rich of spec.rich ?? []) {
    usedNames.add(rich.name);
    teamFirsts.add(rich.name.split(" ")[0] ?? rich.name);
    const status = rich.status ?? (rich.latent ? "unworked" : "unworked");
    prospects.push({
      id: `${accountId}.${rich.key}`,
      name: rich.name,
      title: rich.title,
      accountId,
      businessUnitId: buId,
      teamId,
      persona: rich.persona,
      influence: rich.influence,
      relationshipStatus: status,
      priority: rich.priority ?? (rich.influence >= 4 ? "high" : "medium"),
      lastTouch: rich.lastTouch ?? (status === "unworked" ? undefined : demoDate(rng, 30)),
      nextAction: rich.nextAction ?? rng.pick(NEXT_ACTIONS[status]),
      hypothesis: rich.hypothesis,
      painPoints: rich.painPoints ?? rng.pick(pains).split("|"),
      signals: rich.signals ?? [],
      notes: rich.notes ?? [],
      evidenceType: "demo",
      latent: rich.latent,
    });
  }

  const remaining = Math.max(0, spec.size - prospects.length);
  const titles = TITLES[spec.fn];
  for (let i = 0; i < remaining; i++) {
    const tmpl = rng.pick(titles);
    const status = pickWeighted(rng, STATUS_MIX[spec.condition]);
    const priority: Priority =
      tmpl.influence >= 4 ? "high" : tmpl.influence >= 2 ? "medium" : "low";
    prospects.push({
      id: `${teamId}.p${i + 1}`,
      name: uniqueName(rng, usedNames, teamFirsts),
      title: tmpl.title,
      accountId,
      businessUnitId: buId,
      teamId,
      persona: tmpl.persona,
      influence: tmpl.influence,
      relationshipStatus: status,
      priority,
      lastTouch: status === "unworked" ? undefined : demoDate(rng, 45),
      nextAction: rng.pick(NEXT_ACTIONS[status]),
      hypothesis: rng.pick(hypotheses),
      painPoints: [rng.pick(pains)],
      signals: [],
      notes: [],
      evidenceType: "demo",
    });
  }

  const latentCount = spec.latent ?? 0;
  for (let i = 0; i < latentCount; i++) {
    const tmpl = rng.pick(titles);
    prospects.push({
      id: `${teamId}.l${i + 1}`,
      name: uniqueName(rng, usedNames, teamFirsts),
      title: tmpl.title,
      accountId,
      businessUnitId: buId,
      teamId,
      persona: tmpl.persona,
      influence: tmpl.influence,
      relationshipStatus: "unworked",
      priority: tmpl.influence >= 4 ? "high" : "medium",
      hypothesis: rng.pick(hypotheses),
      painPoints: [rng.pick(pains)],
      signals: [],
      notes: [],
      evidenceType: "demo",
      latent: true,
      nextAction: "Newly surfaced by signal. Research and qualify.",
    });
  }

  return {
    id: teamId,
    businessUnitId: buId,
    accountId,
    name: spec.name,
    priority: spec.priority ?? bu.priority,
    season: spec.season ?? bu.season,
    thesis: spec.thesis,
    prospects,
  };
}

export function defineAccount(spec: AccountSpec): Account {
  const usedNames = new Set<string>();
  const businessUnits: BusinessUnit[] = spec.businessUnits.map((bu) => ({
    id: `${spec.id}.${bu.id}`,
    accountId: spec.id,
    name: bu.name,
    shortName: bu.shortName,
    priority: bu.priority,
    season: bu.season,
    status: bu.status ?? "active",
    thesis: bu.thesis,
    teams: bu.teams.map((t) => buildTeam(spec.id, bu, t, usedNames, spec.voice)),
    dormancyReason: bu.dormancyReason,
    reactivation: bu.reactivation,
  }));

  const opportunities: Opportunity[] = spec.opportunities.map((o) => ({
    id: `${spec.id}.opp.${o.id}`,
    accountId: spec.id,
    businessUnitId: `${spec.id}.${o.businessUnitId}`,
    name: o.name,
    stage: o.stage,
    baselineMaturity: o.baselineMaturity,
    latent: o.latent,
    stakeholderIds: o.stakeholders.map((k) => `${spec.id}.${k}`),
    championId: o.champion ? `${spec.id}.${o.champion}` : undefined,
    baseMeetingCount: o.baseMeetingCount ?? 0,
    signals: o.signals ?? [],
    nextStep: o.nextStep,
    evidenceType: "demo",
  }));

  const signals: Signal[] = spec.signals.map((s) => ({
    id: `${spec.id}.sig.${s.id}`,
    accountId: spec.id,
    businessUnitId: s.businessUnitId ? `${spec.id}.${s.businessUnitId}` : undefined,
    type: s.type,
    strength: s.strength,
    title: s.title,
    description: s.description,
    date: s.date,
    evidenceType: s.evidenceType,
    sourceLabel: s.sourceLabel,
    sourceUrl: s.sourceUrl,
  }));

  return {
    id: spec.id,
    name: spec.name,
    ticker: spec.ticker,
    seed: spec.seed,
    sector: spec.sector,
    thesis: spec.thesis,
    season: spec.season,
    scale: spec.scale,
    strategicScore: { components: spec.score },
    businessUnits,
    intelligence: spec.intelligence.map((i) => ({ ...i, accountId: spec.id })),
    opportunities,
    signals,
  };
}

export const DORMANCY: Record<DormancyReason["code"], Omit<DormancyReason, "detail" | "recommendation">> = {
  "low-relevance": { code: "low-relevance", label: "Low relevance" },
  "no-trigger": { code: "no-trigger", label: "No compelling trigger" },
  "strong-incumbent": { code: "strong-incumbent", label: "Strong incumbent" },
  "poor-timing": { code: "poor-timing", label: "Poor timing" },
  "no-buying-surface": { code: "no-buying-surface", label: "No technical buying surface" },
  "org-freeze": { code: "org-freeze", label: "Organizational freeze" },
  "previous-disqualification": {
    code: "previous-disqualification",
    label: "Previously disqualified",
  },
  "low-expected-return": { code: "low-expected-return", label: "Low expected return" },
};

export function dormancy(
  code: DormancyReason["code"],
  detail: string,
  recommendation = "Do not spend active prospecting capacity here until a trigger appears.",
): DormancyReason {
  return { ...DORMANCY[code], detail, recommendation };
}
