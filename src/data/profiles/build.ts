import type {
  Account,
  RelationshipStatus,
  Season,
  StrategicScoreComponent,
  Territory,
} from "@/domain/types";
import type { AccountCommercial } from "@/domain/commercial";
import type { AccountSeed, OpportunitySeed, SeedStage, SellerProfile, SellerRole, UnitSeed } from "@/domain/profile";
import { hashString, seededRng } from "@/lib/random";
import {
  defineAccount,
  dormancy,
  type BusinessUnitSpec,
  type OpportunitySpec,
  type ProspectVoice,
  type RichProspectSpec,
  type TeamCondition,
  type TeamSpec,
} from "../builders";
import { FIRST_NAMES, LAST_NAMES, type FunctionKind } from "../names";

/**
 * Seeds → territory. Deterministic: the same profile and seeds always grow the
 * same forest. People are fictional (generated names on real-sounding titles);
 * stages, activity and dollar values are demo data; company-level statements
 * in the seeds are seller inference.
 */

export interface BuiltTerritory {
  territory: Territory;
  commercial: Record<string, AccountCommercial>;
}

const ROLE_MOTION: Record<SellerRole, string> = {
  AE: "Net-new",
  SDR: "Pipeline",
  AM: "Expansion",
};

const STAGE_MATURITY: Record<SeedStage, OpportunitySpec["baselineMaturity"]> = {
  Forming: undefined,
  Discovery: "bud",
  Qualified: "young",
  "Technical validation": "growing",
  Commercial: "ripe",
};

const STAGE_MEETINGS: Record<SeedStage, number> = {
  Forming: 0,
  Discovery: 0,
  Qualified: 1,
  "Technical validation": 2,
  Commercial: 3,
};

/** Generic team names per function; units with the same function vary by offset. */
const TEAM_NAMES: Record<FunctionKind, string[]> = {
  platform: ["Platform Engineering", "Architecture", "Shared Services"],
  "product-engineering": ["Product Engineering", "Digital Products", "Mobile & Web"],
  "data-ai": ["Data & AI Platform", "Analytics Engineering", "Applied AI"],
  security: ["Security Engineering", "Governance & Risk", "Identity"],
  infrastructure: ["Cloud Platform", "Site Reliability", "Infrastructure Operations"],
  "developer-experience": ["Developer Experience", "Developer Productivity", "Engineering Enablement"],
  business: ["Strategy & Transformation", "Business Technology", "Office of the CIO"],
  procurement: ["Strategic Sourcing", "Vendor Management", "Procurement Operations"],
  finance: ["Controllership", "Accounts Payable", "FP&A"],
  payments: ["Payments Platform", "Checkout", "Risk & Fraud"],
  operations: ["Business Operations", "Process Excellence", "Field Operations"],
  people: ["People Operations", "Talent Acquisition", "HR Technology"],
  revenue: ["Customer Experience", "Marketing Technology", "Sales Operations"],
};

/** A senior title per function, used for the leader that surfaces on reactivation. */
const NEW_LEADER: Record<FunctionKind, string> = {
  platform: "Head of Platform Engineering (new)",
  "product-engineering": "VP, Product Engineering (new)",
  "data-ai": "Head of Data & AI (new)",
  security: "Chief Information Security Officer (new)",
  infrastructure: "VP, Cloud Infrastructure (new)",
  "developer-experience": "Head of Developer Experience (new)",
  business: "Chief Transformation Officer (new)",
  procurement: "Chief Procurement Officer (new)",
  finance: "Chief Accounting Officer (new)",
  payments: "Head of Payments (new)",
  operations: "VP, Operations (new)",
  people: "Chief People Officer (new)",
  revenue: "Chief Customer Officer (new)",
};

const ENGAGED: RelationshipStatus[] = ["engaged", "meeting"];

/** Replace `{seller}` / `{product}` tokens. */
export function fillTokens(text: string, profile: Pick<SellerProfile, "company" | "productName">): string {
  return text.replaceAll("{seller}", profile.company).replaceAll("{product}", profile.productName);
}

/** Generated prospects speak about the seller's category rather than developer tools. */
function voiceFor(profile: SellerProfile): ProspectVoice {
  const c = profile.category;
  return {
    hypotheses: {
      security: [
        `Will review any ${c} vendor for data handling, access controls and audit trails.`,
        "Gatekeeper for third-party risk; engage before a pilot, not after.",
      ],
      business: [
        "Controls budget allocation; needs a business case, not a demo.",
        `Interested in measurable ROI and in consolidating vendors around ${c}.`,
      ],
      procurement: [
        "Manages enterprise vendor terms; engage once a sponsor exists.",
        "Cares about contract flexibility and consolidation.",
      ],
      platform: [
        "Owns shared platforms; cares about consistency and adoption across teams.",
        `Would weigh how ${c} fits the existing architecture.`,
      ],
    },
    pain: {
      security: ["Third-party risk review", "Data residency", "Audit requirements"],
      business: ["Cost visibility", "Vendor consolidation", "Demonstrable ROI"],
    },
  };
}

function uniqueSlug(base: string, used: Set<string>): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "account";
  let id = clean;
  let n = 2;
  while (used.has(id)) id = `${clean}-${n++}`;
  used.add(id);
  return id;
}

function nameFor(rngSeed: string, used: Set<string>): string {
  const rng = seededRng("seed-person", rngSeed);
  for (let i = 0; i < 60; i++) {
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const fallback = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}-${used.size}`;
  used.add(fallback);
  return fallback;
}

function demoDate(daysAgo: number): string {
  const base = new Date(Date.UTC(2026, 7, 28));
  base.setUTCDate(base.getUTCDate() - daysAgo);
  return base.toISOString().slice(0, 10);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Latent ("Forming") opportunities need one engaged stakeholder so a single
 * executive meeting can bring them to bud, exactly like the hand-built demo.
 */
function normalizeStatuses(seed: AccountSeed): Map<string, RelationshipStatus> {
  const status = new Map(seed.stakeholders.map((s) => [s.key, s.status] as const));
  for (const opp of seed.opportunities) {
    if (opp.stage !== "Forming") continue;
    const people = opp.stakeholders.map((k) => seed.stakeholders.find((s) => s.key === k)).filter(Boolean);
    if (people.some((p) => ENGAGED.includes(status.get(p!.key)!))) continue;
    const candidate = people.filter((p) => p!.influence < 5).sort((a, b) => b!.influence - a!.influence)[0];
    if (candidate) status.set(candidate.key, "engaged");
  }
  return status;
}

function unitPriority(unit: UnitSeed, seed: AccountSeed, firstOppUnit: string | undefined): BusinessUnitSpec["priority"] {
  if (unit.status === "dormant") return "low";
  if (unit.key === firstOppUnit) return "high";
  return seed.opportunities.some((o) => o.unit === unit.key) ? "high" : "medium";
}

function buildUnit(
  seed: AccountSeed,
  unit: UnitSeed,
  unitIndex: number,
  profile: SellerProfile,
  status: Map<string, RelationshipStatus>,
  usedNames: Set<string>,
  firstOppUnit: string | undefined,
): BusinessUnitSpec {
  const fn = unit.fn as FunctionKind;
  const names = TEAM_NAMES[fn];
  const size = clamp(unit.size ?? (unitIndex === 0 ? 1.2 : 1), 0.4, 2);
  const people = seed.stakeholders.filter((s) => s.unit === unit.key);
  const warm = people.some((p) => ENGAGED.includes(status.get(p.key)!));
  const recent = seed.lastActivityDaysAgo <= 14;
  const quiet = seed.lastActivityDaysAgo > 40;
  const priority = unitPriority(unit, seed, firstOppUnit);

  const rich: RichProspectSpec[] = people.map((p) => {
    const s = status.get(p.key) ?? p.status;
    return {
      key: p.key,
      name: nameFor(`${profile.id}|${seed.id}|${p.key}`, usedNames),
      title: fillTokens(p.title, profile),
      persona: p.persona,
      influence: p.influence,
      status: s,
      hypothesis: fillTokens(p.hypothesis, profile),
      lastTouch: s === "unworked" || s === "researched" ? undefined : demoDate(seed.lastActivityDaysAgo + (p.influence % 3)),
    };
  });

  if (unit.status === "dormant") {
    const teams: TeamSpec[] = [
      {
        id: "t1",
        name: names[unitIndex % names.length],
        fn,
        size: Math.max(rich.length, Math.round(2 + size)),
        condition: "dormant",
        latent: 3,
        rich: [
          ...rich,
          {
            key: `${unit.key}-new-leader`,
            name: nameFor(`${profile.id}|${seed.id}|${unit.key}|leader`, usedNames),
            title: NEW_LEADER[fn],
            persona: "Executive Sponsor",
            influence: 5,
            hypothesis: `Newly appointed leader (demo scenario) with a mandate that could include ${profile.category}.`,
            latent: true,
            nextAction: "Research the appointment and open roles.",
          },
        ],
      },
      { id: "t2", name: names[(unitIndex + 1) % names.length], fn, size: 2, condition: "dormant", latent: 2 },
    ];
    return {
      id: unit.key,
      name: fillTokens(unit.name, profile),
      shortName: unit.shortName,
      priority,
      season: "winter",
      status: "dormant",
      thesis: fillTokens(unit.thesis, profile),
      dormancyReason: dormancy(
        "no-trigger",
        `No active initiative, trigger or sponsor identified in ${unit.name} for ${profile.category} in this demo.`,
        "Hold. Revisit on an executive change, a new initiative or a hiring surge.",
      ),
      reactivation: {
        signal: {
          type: "executive-change",
          strength: "strong",
          title: `New ${unit.shortName ?? unit.name} leadership and initiative detected`,
          description: `${unit.name} has new leadership and open roles tied to an initiative where ${profile.category} is relevant. Simulated signal for the demo.`,
          evidenceType: "demo",
          sourceLabel: "Simulated signal",
        },
        recommendation: `Re-engage ${unit.name}. Prioritize the new leader and the freshly surfaced team.`,
      },
      teams,
    };
  }

  const coreCondition: TeamCondition = warm ? (recent ? "hot" : quiet ? "light" : "warming") : quiet ? "untouched" : "light";
  const sideCondition: TeamCondition = warm && recent ? "warming" : quiet ? "untouched" : "light";
  const teams: TeamSpec[] = [
    {
      id: "t1",
      name: names[unitIndex % names.length],
      fn,
      size: rich.length + Math.round(3 + 2 * size),
      condition: coreCondition,
      rich,
    },
    {
      id: "t2",
      name: names[(unitIndex + 1) % names.length],
      fn,
      size: Math.round(2 + 2.5 * size),
      condition: sideCondition,
    },
  ];
  if (size >= 1.2) {
    teams.push({ id: "t3", name: names[(unitIndex + 2) % names.length], fn, size: Math.round(2 + size), condition: quiet ? "untouched" : "light" });
  }
  return {
    id: unit.key,
    name: fillTokens(unit.name, profile),
    shortName: unit.shortName,
    priority,
    season: warm ? "fall" : "summer",
    status: "active",
    thesis: fillTokens(unit.thesis, profile),
    teams,
  };
}

function scoreFor(seed: AccountSeed, profile: SellerProfile, potentialShare: number): StrategicScoreComponent[] {
  const rng = seededRng("score", profile.id, seed.id);
  const active = seed.units.filter((u) => u.status === "active").length;
  const strong = seed.signals.filter((s) => s.strength === "strong").length;
  const tierValue = seed.tier === 1 ? 9 : seed.tier === 2 ? 7 : 6;
  return [
    {
      key: "account-scale",
      label: "Account scale",
      value: clamp(Math.round(tierValue + potentialShare), 4, 10),
      weight: 1.4,
      reasoning: `Seller estimate from tier and ${seed.potentialArr >= 1e6 ? "seven-figure" : "six-figure"} potential (demo values).`,
      evidenceType: "demo",
    },
    {
      key: "use-case-fit",
      label: `${capitalize(profile.category)} fit`,
      value: clamp(tierValue + rng.int(0, 1), 5, 10),
      weight: 1.3,
      reasoning: `Seller hypothesis: ${seed.motion} is a plausible entry point. See the account thesis.`,
      evidenceType: "inference",
    },
    {
      key: "expansion-potential",
      label: "Expansion potential",
      value: clamp(4 + active * 2, 4, 10),
      weight: 1,
      reasoning: `${active} active organizations could each become a separate buying motion.`,
      evidenceType: "inference",
    },
    {
      key: "surface-area",
      label: "Organizational surface area",
      value: clamp(seed.units.length * 2 + 2, 4, 10),
      weight: 0.8,
      reasoning: `${seed.units.length} organizations mapped in this illustrative territory.`,
      evidenceType: "demo",
    },
    {
      key: "timing",
      label: "Timing signals",
      value: clamp(4 + strong * 3 + seed.signals.length, 3, 10),
      weight: 1,
      reasoning: `${seed.signals.length} demo signal${seed.signals.length === 1 ? "" : "s"} on the account.`,
      evidenceType: "demo",
    },
    {
      key: "competitive-friction",
      label: "Competitive friction",
      value: rng.int(3, 6),
      weight: 0.9,
      reasoning: "Incumbent providers and in-house builds are likely present. Seller assumption.",
      evidenceType: "inference",
    },
  ];
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function opportunitySpec(o: OpportunitySeed, accountId: string, profile: SellerProfile): OpportunitySpec {
  return {
    id: o.key,
    businessUnitId: o.unit,
    name: fillTokens(o.name, profile),
    stage: o.stage === "Forming" ? "Forming" : o.stage,
    baselineMaturity: STAGE_MATURITY[o.stage],
    latent: o.stage === "Forming" ? true : undefined,
    stakeholders: o.stakeholders,
    champion: o.champion,
    baseMeetingCount: STAGE_MEETINGS[o.stage],
    signals: [],
    nextStep: fillTokens(o.nextStep, profile),
  };
}

function seedAccount(seed: AccountSeed, id: string, profile: SellerProfile, potentialShare: number, oppScale: number): Account {
  const status = normalizeStatuses(seed);
  const usedNames = new Set<string>();
  const firstOppUnit = seed.opportunities[0]?.unit;
  const warm = seed.stakeholders.some((s) => ENGAGED.includes(status.get(s.key)!));
  const season: Season = warm ? "fall" : "summer";
  const visibleOpps = seed.opportunities.filter((o) => o.stage !== "Forming");

  return defineAccount({
    id,
    name: seed.name,
    ticker: seed.ticker,
    seed: hashString(`${profile.id}|${seed.id}`) % 900_000 + 10_000,
    sector: seed.sector,
    season,
    thesis: fillTokens(seed.thesis, profile),
    scale: {
      opportunity: oppScale,
      enterprise: clamp(seed.tier === 1 ? 0.92 : seed.tier === 2 ? 0.72 : 0.55, 0, 1),
      complexity: clamp(seed.units.length / 4, 0.4, 1),
    },
    score: scoreFor(seed, profile, potentialShare),
    intelligence: [
      ...seed.intelligence.map((i, n) => ({
        id: `${id}.root.${n}`,
        category: i.category,
        title: fillTokens(i.title, profile),
        summary: fillTokens(i.summary, profile),
        evidenceType: "inference" as const,
      })),
      {
        id: `${id}.root.crm`,
        category: "Timing Signals" as const,
        title: "Demo CRM state",
        summary:
          visibleOpps.length > 0
            ? `Demo CRM: ${visibleOpps.map((o) => `${fillTokens(o.name, profile)} (${o.stage.toLowerCase()})`).join("; ")}. Last activity: ${seed.lastActivity}.`
            : `Demo CRM: no qualified pipeline yet. Last activity: ${seed.lastActivity}.`,
        evidenceType: "demo" as const,
      },
    ],
    businessUnits: seed.units.map((u, i) => buildUnit(seed, u, i, profile, status, usedNames, firstOppUnit)),
    opportunities: seed.opportunities.map((o) => opportunitySpec(o, id, profile)),
    signals: seed.signals.map((s, i) => ({
      id: `s${i + 1}`,
      businessUnitId: s.unit,
      type: s.type,
      strength: s.strength,
      title: fillTokens(s.title, profile),
      description: fillTokens(s.description, profile),
      date: demoDate(Math.max(1, seed.lastActivityDaysAgo - 2 + i * 9)),
      evidenceType: "demo",
      sourceLabel: "Illustrative signal",
    })),
    voice: voiceFor(profile),
  });
}

/**
 * Turn a profile's seeds into full accounts and the commercial overlay.
 * Expects eight seeds (the forest has eight glades) but works with any count.
 */
export function buildTerritoryFromProfile(profile: SellerProfile, seeds: AccountSeed[]): BuiltTerritory {
  const usedIds = new Set<string>();
  const potentials = seeds.map((s) => s.potentialArr);
  const max = Math.max(1, ...potentials);
  const min = Math.min(max, ...potentials);
  const accounts: Account[] = [];
  const commercial: Record<string, AccountCommercial> = {};

  for (const seed of seeds) {
    const id = uniqueSlug(seed.id || seed.name, usedIds);
    const share = max === min ? 1 : (seed.potentialArr - min) / (max - min);
    const account = seedAccount(seed, id, profile, share, 0.3 + 0.7 * share);
    accounts.push(account);
    const dealValues: Record<string, number> = {};
    for (const o of seed.opportunities) dealValues[`${id}.opp.${o.key}`] = Math.max(50_000, Math.round(o.value));
    commercial[id] = {
      tier: seed.tier,
      potentialArr: seed.potentialArr,
      motion: `${ROLE_MOTION[profile.role]} · ${fillTokens(seed.motion, profile)}`,
      lastActivityDaysAgo: seed.lastActivityDaysAgo,
      lastActivity: fillTokens(seed.lastActivity, profile),
      dealValues,
    };
  }

  return { territory: { accounts, market: [] }, commercial };
}
