import type { OpportunityMaturity } from "./types";
import type { OpportunityState } from "./opportunity";

/**
 * Commercial layer: what a seller's forecast sees. Maturity is derived from
 * stakeholder engagement (see opportunity.ts); here it maps onto CRM stages,
 * win probability and dollar value.
 */

export type Tier = 1 | 2 | 3;

export interface AccountCommercial {
  tier: Tier;
  /** Annual recurring revenue the account could plausibly represent. */
  potentialArr: number;
  /** Relationship framing shown in the header. */
  motion: string;
  /** Days since the last meaningful seller activity at the start of the demo. */
  lastActivityDaysAgo: number;
  lastActivity: string;
  /** Opportunity id → deal value (ARR). */
  dealValues: Record<string, number>;
}

export const STAGE_BY_MATURITY: Record<OpportunityMaturity, string> = {
  seed: "Prospecting",
  bud: "Discovery",
  young: "Qualified",
  growing: "Technical validation",
  ripe: "Commercial",
};

export const WIN_PROBABILITY: Record<OpportunityMaturity, number> = {
  seed: 0.05,
  bud: 0.1,
  young: 0.25,
  growing: 0.5,
  ripe: 0.75,
};

export const TIER_LABEL: Record<Tier, string> = {
  1: "Tier 1 · Strategic",
  2: "Tier 2 · Growth",
  3: "Tier 3 · Develop",
};

export interface PipelineSummary {
  /** Open pipeline: discovery stage and beyond. */
  open: number;
  weighted: number;
  count: number;
}

export function pipelineOf(opps: OpportunityState[], dealValues: Record<string, number>): PipelineSummary {
  let open = 0;
  let weighted = 0;
  let count = 0;
  for (const o of opps) {
    if (!o.maturity || o.maturity === "seed") continue;
    const v = dealValues[o.opportunity.id] ?? 0;
    open += v;
    weighted += v * WIN_PROBABILITY[o.maturity];
    count += 1;
  }
  return { open, weighted, count };
}

export function formatMoney(v: number, opts: { precise?: boolean } = {}): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `$${m >= 10 || !opts.precise ? m.toFixed(m >= 10 ? 0 : 1) : m.toFixed(2)}M`;
  }
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

export function formatDaysAgo(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}
