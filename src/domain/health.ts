import type { Prospect, Signal } from "./types";
import type { OpportunityState } from "./opportunity";
import { MATURITY_LABEL } from "./opportunity";

/**
 * Account health: an explainable 0–100 composite of the things a seller
 * controls (recency, stakeholder depth, executive access, deal momentum) plus
 * the outside world (timing signals). It drives the tree's vitality: canopy
 * density and leaf colour.
 *
 * Neglect is modelled honestly: as days without activity grow, recency falls
 * and existing relationships are discounted, so a once-healthy account fades.
 */

export type HealthBand = "thriving" | "healthy" | "cooling" | "at-risk" | "withering";

export interface HealthDriver {
  label: string;
  tone: "positive" | "neutral" | "negative";
}

export interface AccountHealth {
  score: number;
  band: HealthBand;
  /** 0..1, consumed by the renderer. */
  vitality: number;
  drivers: HealthDriver[];
  engagedStakeholders: number;
  execEngaged: boolean;
}

export const HEALTH_LABEL: Record<HealthBand, string> = {
  thriving: "Thriving",
  healthy: "Healthy",
  cooling: "Cooling",
  "at-risk": "At risk",
  withering: "Withering",
};

export const HEALTH_HEX: Record<HealthBand, string> = {
  thriving: "#7fbf5a",
  healthy: "#a9c46a",
  cooling: "#d7b45a",
  "at-risk": "#d98b48",
  withering: "#b8674a",
};

export function healthBand(score: number): HealthBand {
  if (score >= 72) return "thriving";
  if (score >= 55) return "healthy";
  if (score >= 40) return "cooling";
  if (score >= 26) return "at-risk";
  return "withering";
}

export function needsAttention(h: AccountHealth): boolean {
  return h.band === "cooling" || h.band === "at-risk" || h.band === "withering";
}

export interface HealthInput {
  prospects: Prospect[];
  opportunities: OpportunityState[];
  daysSinceActivity: number;
  signals: Signal[];
}

export function computeHealth(input: HealthInput): AccountHealth {
  const days = Math.max(0, input.daysSinceActivity);
  const recency = clamp01(1 - (days - 4) / 56);

  const active = input.prospects.filter((p) => !p.latent && p.relationshipStatus !== "disqualified");
  let engagedInfluence = 0;
  let engaged = 0;
  let topExec = 0;
  for (const p of active) {
    if (p.relationshipStatus === "engaged" || p.relationshipStatus === "meeting") {
      engaged += 1;
      engagedInfluence += p.influence * (p.relationshipStatus === "meeting" ? 1.3 : 1);
      topExec = Math.max(topExec, p.influence);
    }
  }
  // Relationships cool when nobody tends them.
  const decay = 0.5 + 0.5 * recency;
  const engagement = clamp01(engagedInfluence / 16) * decay;
  const exec = (topExec >= 5 ? 1 : topExec >= 4 ? 0.6 : topExec >= 3 ? 0.25 : 0) * decay;

  let momentum = 0;
  let best: OpportunityState | null = null;
  for (const o of input.opportunities) {
    if (!o.maturity) continue;
    if (o.strength > momentum) {
      momentum = o.strength;
      best = o;
    }
  }
  momentum *= 0.6 + 0.4 * recency;

  let signalScore = 0;
  for (const s of input.signals) signalScore += s.strength === "strong" ? 0.35 : s.strength === "moderate" ? 0.15 : 0.05;
  signalScore = clamp01(signalScore);

  const score = Math.round(100 * (0.38 * recency + 0.22 * engagement + 0.12 * exec + 0.2 * momentum + 0.08 * signalScore));
  const band = healthBand(score);

  const drivers: HealthDriver[] = [];
  if (days <= 7) drivers.push({ label: days <= 1 ? "Active in the last day" : `Active ${days} days ago`, tone: "positive" });
  else if (days <= 21) drivers.push({ label: `Last touch ${days} days ago`, tone: "neutral" });
  else drivers.push({ label: `No activity in ${days} days`, tone: "negative" });

  if (engaged >= 3) drivers.push({ label: `${engaged} stakeholders engaged`, tone: "positive" });
  else if (engaged > 0) drivers.push({ label: `Single-threaded · ${engaged} engaged`, tone: "neutral" });
  else drivers.push({ label: "No engaged stakeholders", tone: "negative" });

  if (topExec >= 5) drivers.push({ label: "Executive sponsor engaged", tone: "positive" });
  else drivers.push({ label: "No executive access yet", tone: topExec >= 4 ? "neutral" : "negative" });

  if (best?.maturity) {
    drivers.push({
      label: `Deal momentum · ${MATURITY_LABEL[best.maturity].toLowerCase()} fruit`,
      tone: best.strength >= 0.45 ? "positive" : "neutral",
    });
  } else {
    drivers.push({ label: "No qualified pipeline", tone: "negative" });
  }

  return {
    score,
    band,
    vitality: Math.min(1, Math.max(0.04, (score - 12) / 72)),
    drivers,
    engagedStakeholders: engaged,
    execEngaged: topExec >= 5,
  };
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
