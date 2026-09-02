import type { Momentum, Opportunity, OpportunityMaturity, Prospect } from "./types";

export const MATURITY_ORDER: OpportunityMaturity[] = [
  "seed",
  "bud",
  "young",
  "growing",
  "ripe",
];

export const MATURITY_LABEL: Record<OpportunityMaturity, string> = {
  seed: "Seed",
  bud: "Bud",
  young: "Young",
  growing: "Growing",
  ripe: "Ripe",
};

export const MATURITY_DESCRIPTION: Record<OpportunityMaturity, string> = {
  seed: "Weak early signal.",
  bud: "Possible opportunity forming.",
  young: "Confirmed interest.",
  growing: "Multiple conversations, increasing traction.",
  ripe: "Strong, qualified opportunity.",
};

export function maturityRank(m: OpportunityMaturity): number {
  return MATURITY_ORDER.indexOf(m);
}

export interface OpportunityState {
  opportunity: Opportunity;
  /** null when the opportunity is still latent (no fruit rendered). */
  maturity: OpportunityMaturity | null;
  engagedCount: number;
  meetingCount: number;
  stakeholderCount: number;
  momentum: Momentum;
  /** 0-1 continuous strength used for rendering size / richness. */
  strength: number;
}

/**
 * Deterministic opportunity evaluation.
 *
 * Fruit represents commercial opportunity, never people. Its maturity is
 * derived from how many stakeholders are genuinely engaged and how many
 * meetings exist. Conversation intelligence (Gong) or CRM data could later
 * feed the same inputs.
 */
export function evaluateOpportunity(
  opportunity: Opportunity,
  prospectsById: Record<string, Prospect>,
): OpportunityState {
  const stakeholders = opportunity.stakeholderIds
    .map((id) => prospectsById[id])
    .filter((p): p is Prospect => Boolean(p) && p.relationshipStatus !== "disqualified");

  const engagedCount = stakeholders.filter(
    (p) => p.relationshipStatus === "engaged" || p.relationshipStatus === "meeting",
  ).length;
  const meetingsFromProspects = stakeholders.filter(
    (p) => p.relationshipStatus === "meeting",
  ).length;
  const meetingCount = opportunity.baseMeetingCount + meetingsFromProspects;

  // Engagement points: a meeting is worth more than an engaged conversation.
  const points = engagedCount + meetingCount * 1.5;

  let derived: OpportunityMaturity | null;
  if (opportunity.latent && engagedCount < 2) derived = null;
  else if (points < 1) derived = "seed";
  else if (points < 4) derived = "bud";
  else if (points < 6) derived = "young";
  else if (points < 8.5) derived = "growing";
  else derived = "ripe";

  let maturity = derived;
  if (opportunity.baselineMaturity) {
    if (
      maturity === null ||
      maturityRank(opportunity.baselineMaturity) > maturityRank(maturity)
    ) {
      maturity = opportunity.baselineMaturity;
    }
  }

  const momentum: Momentum =
    engagedCount >= 3 || meetingCount >= 3
      ? "high"
      : engagedCount >= 1 || meetingCount >= 1
        ? "building"
        : "low";

  const strength =
    maturity === null ? 0 : (maturityRank(maturity) + Math.min(1, points / 10)) / 5;

  return {
    opportunity,
    maturity,
    engagedCount,
    meetingCount,
    stakeholderCount: stakeholders.length,
    momentum,
    strength: Math.min(1, strength),
  };
}
