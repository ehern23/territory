"use client";

import { useMemo } from "react";
import type { Account, Activity, BusinessUnit, Prospect, Team } from "@/domain/types";
import { coverageOf, type CoverageStats } from "@/domain/penetration";
import type { OpportunityState } from "@/domain/opportunity";
import { computeStrategicScore } from "@/domain/score";
import { computeHealth, needsAttention, type AccountHealth } from "@/domain/health";
import { pipelineOf, formatMoney, type AccountCommercial, type PipelineSummary } from "@/domain/commercial";
import { deterministicStrategyEngine } from "@/domain/strategy";
import { COMMERCIAL } from "@/data/commercial";
import {
  currentBusinessUnits,
  evaluateVisibleOpportunities,
  useTerritoryStore,
  type SampleActivity,
  type TerritoryFilter,
} from "./useTerritoryStore";

export interface BusinessUnitView {
  unit: BusinessUnit;
  coverage: CoverageStats;
  teams: { team: Team; coverage: CoverageStats; prospects: Prospect[] }[];
  prospects: Prospect[];
}

export interface NextAction {
  title: string;
  reason: string;
  activity: SampleActivity;
  cta: string;
}

export interface AccountView {
  account: Account;
  commercial: AccountCommercial;
  score: number;
  units: BusinessUnitView[];
  coverage: CoverageStats;
  opportunities: OpportunityState[];
  health: AccountHealth;
  pipeline: PipelineSummary;
  daysSince: number;
  lastActivity: Activity | null;
  keyPeople: Prospect[];
  next: NextAction;
}

const FALLBACK_COMMERCIAL: AccountCommercial = {
  tier: 3,
  potentialArr: 0,
  motion: "",
  lastActivityDaysAgo: 30,
  lastActivity: "",
  dealValues: {},
};

type Slice = Pick<
  ReturnType<typeof useTerritoryStore.getState>,
  "accountsById" | "businessUnitsById" | "prospectsById" | "opportunitiesById" | "signals" | "activities" | "daysSince"
>;

function isRich(p: Prospect) {
  return !/\.[pl]\d+$/.test(p.id);
}

export function buildAccountView(s: Slice, accountId: string): AccountView | null {
  const account = s.accountsById[accountId];
  if (!account) return null;
  const commercial = COMMERCIAL[accountId] ?? FALLBACK_COMMERCIAL;
  const units = currentBusinessUnits(s, accountId).map((unit) => {
    const teams = unit.teams.map((team) => {
      const prospects = team.prospects.map((p) => s.prospectsById[p.id] ?? p);
      return { team, coverage: coverageOf(prospects), prospects };
    });
    const prospects = teams.flatMap((t) => t.prospects);
    return { unit, coverage: coverageOf(prospects), teams, prospects };
  });
  const allProspects = units.flatMap((u) => u.prospects);
  const opportunities = evaluateVisibleOpportunities(s, accountId);
  const signals = s.signals.filter((x) => x.accountId === accountId);
  const daysSince = s.daysSince[accountId] ?? commercial.lastActivityDaysAgo;
  const health = computeHealth({ prospects: allProspects, opportunities, daysSinceActivity: daysSince, signals });
  const pipeline = pipelineOf(opportunities, commercial.dealValues);

  let lastActivity: Activity | null = null;
  for (const a of s.activities) if (a.accountId === accountId && (!lastActivity || a.timestamp >= lastActivity.timestamp)) lastActivity = a;

  const keyPeople = allProspects
    .filter((p) => !p.latent && p.relationshipStatus !== "disqualified")
    .sort((a, b) => Number(isRich(b)) - Number(isRich(a)) || b.influence - a.influence)
    .slice(0, 5);

  const view: Omit<AccountView, "next"> = {
    account,
    commercial,
    score: computeStrategicScore(account.strategicScore),
    units,
    coverage: coverageOf(allProspects),
    opportunities,
    health,
    pipeline,
    daysSince,
    lastActivity,
    keyPeople,
  };
  return { ...view, next: nextActionFor(view, s) };
}

function nextActionFor(v: Omit<AccountView, "next">, s: Slice): NextAction {
  const engaged = v.keyPeople.find((p) => p.relationshipStatus === "engaged" || p.relationshipStatus === "meeting");
  if (v.daysSince > 30) {
    return {
      title: `Re-engage · ${v.daysSince} days without a touch`,
      reason: `${v.daysSince} days without activity${engaged ? `; ${engaged.name} was the last live thread` : ""}. Recency is the largest drag on health.`,
      activity: "exec-meeting",
      cta: "Book executive meeting",
    };
  }
  const result = deterministicStrategyEngine.analyze({
    account: v.account,
    businessUnits: v.units.map((u) => u.unit),
    prospectsById: s.prospectsById,
    opportunities: v.opportunities,
    signals: s.signals.filter((x) => x.accountId === v.account.id),
  });
  const move = result.primary;
  if (!v.health.execEngaged && v.health.engagedStakeholders > 0) {
    const exec = v.units
      .filter((u) => u.unit.status !== "dormant")
      .flatMap((u) => u.prospects)
      .filter((p) => !p.latent && p.influence >= 5 && p.relationshipStatus !== "engaged" && p.relationshipStatus !== "meeting" && p.relationshipStatus !== "disqualified")
      .sort((a, b) => Number(isRich(b)) - Number(isRich(a)))[0];
    return {
      title: "Earn executive sponsorship",
      reason: exec
        ? `${v.health.engagedStakeholders} people engaged, but no one with budget authority. ${exec.name} (${exec.title}) is the missing sponsor.`
        : `${v.health.engagedStakeholders} people engaged, but no one with budget authority yet.`,
      activity: "exec-meeting",
      cta: "Book executive meeting",
    };
  }
  if (move?.kind === "advance-opportunity") {
    return { title: move.title, reason: move.reason, activity: "multithread", cta: "Multithread the deal" };
  }
  if (move) {
    return { title: move.title, reason: move.reason, activity: "discovery-call", cta: "Run discovery call" };
  }
  return { title: "Keep the thread warm", reason: "No urgent gaps. A specific follow-up maintains recency.", activity: "follow-up", cta: "Send follow-up" };
}

function useSlice(): Slice {
  const accountsById = useTerritoryStore((s) => s.accountsById);
  const businessUnitsById = useTerritoryStore((s) => s.businessUnitsById);
  const prospectsById = useTerritoryStore((s) => s.prospectsById);
  const opportunitiesById = useTerritoryStore((s) => s.opportunitiesById);
  const signals = useTerritoryStore((s) => s.signals);
  const activities = useTerritoryStore((s) => s.activities);
  const daysSince = useTerritoryStore((s) => s.daysSince);
  return useMemo(
    () => ({ accountsById, businessUnitsById, prospectsById, opportunitiesById, signals, activities, daysSince }),
    [accountsById, businessUnitsById, prospectsById, opportunitiesById, signals, activities, daysSince],
  );
}

/** Live view of an account: static structure + current relationship and commercial state. */
export function useAccountView(accountId: string | null): AccountView | null {
  const slice = useSlice();
  return useMemo(() => (accountId ? buildAccountView(slice, accountId) : null), [slice, accountId]);
}

/** Live views for every account, in territory order. */
export function useAccountViews(): AccountView[] {
  const slice = useSlice();
  const accounts = useTerritoryStore((s) => s.accounts);
  return useMemo(
    () => accounts.map((a) => buildAccountView(slice, a.id)).filter((v): v is AccountView => v !== null),
    [slice, accounts],
  );
}

export interface PriorityItem {
  accountId: string;
  accountName: string;
  title: string;
  reason: string;
  activity: SampleActivity;
  cta: string;
  urgency: number;
  atStake: number;
}

export interface TerritorySummary {
  accounts: number;
  attention: number;
  activeOpportunities: number;
  pipeline: number;
  weighted: number;
  potential: number;
  health: number;
  priorities: PriorityItem[];
}

export function summarize(views: AccountView[]): TerritorySummary {
  let pipeline = 0;
  let weighted = 0;
  let potential = 0;
  let healthWeighted = 0;
  let active = 0;
  let attention = 0;
  for (const v of views) {
    pipeline += v.pipeline.open;
    weighted += v.pipeline.weighted;
    potential += v.commercial.potentialArr;
    healthWeighted += v.health.score * v.commercial.potentialArr;
    active += v.pipeline.count;
    if (needsAttention(v.health)) attention += 1;
  }
  const priorities = views
    .map((v) => {
      const atStake = v.pipeline.open + v.commercial.potentialArr * 0.25;
      const urgency = (1 - v.health.score / 100) * (0.6 + atStake / 4_000_000) + (v.daysSince > 30 ? 0.3 : 0);
      return {
        accountId: v.account.id,
        accountName: v.account.name,
        title: v.next.title,
        reason: v.next.reason,
        activity: v.next.activity,
        cta: v.next.cta,
        urgency,
        atStake,
      };
    })
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 4);
  return {
    accounts: views.length,
    attention,
    activeOpportunities: active,
    pipeline,
    weighted,
    potential,
    health: potential > 0 ? Math.round(healthWeighted / potential) : 0,
    priorities,
  };
}

export function useTerritorySummary(): TerritorySummary {
  const views = useAccountViews();
  return useMemo(() => summarize(views), [views]);
}

export function matchesFilter(v: AccountView, filter: TerritoryFilter): boolean {
  switch (filter) {
    case "attention":
      return needsAttention(v.health);
    case "pipeline":
      return v.pipeline.count > 0 && v.pipeline.open >= 1_000_000;
    case "tier1":
      return v.commercial.tier === 1;
    default:
      return true;
  }
}

export const FILTER_LABEL: Record<TerritoryFilter, string> = {
  all: "All accounts",
  attention: "Needs attention",
  pipeline: "$1M+ pipeline",
  tier1: "Tier 1",
};

export { formatMoney };

// Development-only handle for runtime inspection.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __accountView?: unknown }).__accountView = (id: string) =>
    buildAccountView(useTerritoryStore.getState(), id);
}
