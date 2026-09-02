import type { Account, BusinessUnit, Prospect, Signal } from "./types";
import { businessUnitProspects, coverageOf, type CoverageStats } from "./penetration";
import type { OpportunityState } from "./opportunity";

/**
 * Strategy engine contract.
 *
 * V1 ships a deterministic implementation that reasons over local territory
 * state. The interface is intentionally narrow so an LLM-backed engine (or a
 * research agent) can replace it later without touching the UI or scene.
 */
export interface StrategyInput {
  account: Account;
  businessUnits: BusinessUnit[];
  prospectsById: Record<string, Prospect>;
  opportunities: OpportunityState[];
  signals: Signal[];
}

export type MoveKind = "multithread" | "advance-opportunity" | "reengage" | "hold";

export interface StrategyMove {
  id: string;
  kind: MoveKind;
  title: string;
  headline: string;
  businessUnitId: string;
  businessUnitName: string;
  prospectIds: string[];
  opportunityId?: string;
  coverage: CoverageStats;
  reason: string;
  /** Internal ranking weight; higher = more urgent. */
  urgency: number;
}

export interface StrategyResult {
  primary: StrategyMove | null;
  alternatives: StrategyMove[];
  summary: string;
  generatedBy: string;
}

export interface StrategyEngine {
  readonly name: string;
  analyze(input: StrategyInput): StrategyResult;
}

const PRIORITY_WEIGHT = { high: 1, medium: 0.65, low: 0.3 } as const;
const STRENGTH_WEIGHT = { weak: 0.3, moderate: 0.6, strong: 1 } as const;

function pickMultithreadTargets(prospects: Prospect[], limit = 3): Prospect[] {
  const candidates = prospects
    .filter(
      (p) =>
        !p.latent &&
        (p.relationshipStatus === "unworked" || p.relationshipStatus === "researched"),
    )
    .sort((a, b) => b.influence - a.influence || a.name.localeCompare(b.name));

  // Prefer persona diversity: one economic/executive, one technical, one champion-type.
  const chosen: Prospect[] = [];
  const seenPersona = new Set<string>();
  for (const p of candidates) {
    if (chosen.length >= limit) break;
    if (!seenPersona.has(p.persona)) {
      chosen.push(p);
      seenPersona.add(p.persona);
    }
  }
  for (const p of candidates) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(p)) chosen.push(p);
  }
  return chosen;
}

export const deterministicStrategyEngine: StrategyEngine = {
  name: "Deterministic territory heuristics",
  analyze(input) {
    const moves: StrategyMove[] = [];
    const recentSignalsByBu = new Map<string, number>();
    for (const s of input.signals) {
      if (!s.businessUnitId) continue;
      recentSignalsByBu.set(
        s.businessUnitId,
        (recentSignalsByBu.get(s.businessUnitId) ?? 0) + STRENGTH_WEIGHT[s.strength],
      );
    }

    for (const bu of input.businessUnits) {
      const prospects = businessUnitProspects(bu).map(
        (p) => input.prospectsById[p.id] ?? p,
      );
      const coverage = coverageOf(prospects);
      const signalBoost = recentSignalsByBu.get(bu.id) ?? 0;

      if (bu.status === "dormant") {
        moves.push({
          id: `hold-${bu.id}`,
          kind: "hold",
          title: `Hold ${bu.name}`,
          headline: `${bu.name} is dormant. Do not spend active prospecting capacity here.`,
          businessUnitId: bu.id,
          businessUnitName: bu.name,
          prospectIds: [],
          coverage,
          reason:
            bu.dormancyReason?.detail ??
            "No compelling trigger currently identified for this organization.",
          urgency: 0.05,
        });
        continue;
      }

      const whitespace = 1 - coverage.penetration;
      const relevance = PRIORITY_WEIGHT[bu.priority];
      const surface = Math.log2(coverage.mapped + 1) / 4; // ~0.5 for 3 people, ~1 for 15
      const targets = pickMultithreadTargets(prospects);

      if (targets.length > 0) {
        const urgency =
          relevance * (0.35 + 0.65 * whitespace) * (0.6 + 0.4 * surface) +
          signalBoost * 0.35 +
          (bu.status === "reactivating" ? 0.25 : 0);

        const reasonParts: string[] = [];
        if (bu.status === "reactivating") {
          reasonParts.push("Fresh external signal has reopened this organization");
        }
        if (bu.priority === "high") reasonParts.push("high strategic relevance");
        if (whitespace > 0.6) reasonParts.push("low current penetration");
        else if (whitespace > 0.3) reasonParts.push("meaningful remaining whitespace");
        if (targets.some((t) => t.influence >= 4)) reasonParts.push("high-influence stakeholders still unworked");
        if (signalBoost > 0.5) reasonParts.push("active timing signals");

        const headline =
          bu.status === "reactivating"
            ? `Re-engage ${bu.name}. New signal has made this organization relevant again.`
            : coverage.contacted === 0
              ? `${bu.name} is untouched. Open the organization with a multithreaded first wave.`
              : `${bu.name} remains underpenetrated. Multithread beyond the current relationships.`;

        moves.push({
          id: `multithread-${bu.id}`,
          kind: bu.status === "reactivating" ? "reengage" : "multithread",
          title:
            bu.status === "reactivating" ? `Re-engage ${bu.name}` : `Multithread ${bu.name}`,
          headline,
          businessUnitId: bu.id,
          businessUnitName: bu.name,
          prospectIds: targets.map((t) => t.id),
          coverage,
          reason: capitalize(reasonParts.join(" + ")) + ".",
          urgency,
        });
      }
    }

    for (const state of input.opportunities) {
      if (!state.maturity) continue;
      const opp = state.opportunity;
      const bu = input.businessUnits.find((b) => b.id === opp.businessUnitId);
      if (!bu) continue;
      const prospects = businessUnitProspects(bu).map((p) => input.prospectsById[p.id] ?? p);
      const coverage = coverageOf(prospects);
      const unengagedStakeholders = opp.stakeholderIds
        .map((id) => input.prospectsById[id])
        .filter(
          (p): p is Prospect =>
            Boolean(p) &&
            p.relationshipStatus !== "engaged" &&
            p.relationshipStatus !== "meeting" &&
            p.relationshipStatus !== "disqualified",
        )
        .sort((a, b) => b.influence - a.influence);

      const maturityWeight = { seed: 0.2, bud: 0.45, young: 0.6, growing: 0.75, ripe: 0.55 }[
        state.maturity
      ];

      moves.push({
        id: `advance-${opp.id}`,
        kind: "advance-opportunity",
        title: `Advance ${opp.name}`,
        headline:
          unengagedStakeholders.length > 0
            ? `${opp.name} is ${state.maturity}. Widen the thread before it stalls.`
            : `${opp.name} is ${state.maturity}. Convert momentum into the next step.`,
        businessUnitId: bu.id,
        businessUnitName: bu.name,
        prospectIds: unengagedStakeholders.slice(0, 3).map((p) => p.id),
        opportunityId: opp.id,
        coverage,
        reason:
          `${state.engagedCount} engaged stakeholder${state.engagedCount === 1 ? "" : "s"}, ` +
          `${state.meetingCount} meeting${state.meetingCount === 1 ? "" : "s"}. ` +
          `Next step: ${opp.nextStep}`,
        urgency: maturityWeight + (unengagedStakeholders.length > 0 ? 0.1 : 0),
      });
    }

    moves.sort((a, b) => b.urgency - a.urgency);
    const primary = moves[0] ?? null;
    const alternatives = moves.slice(1, 4);

    const activeBus = input.businessUnits.filter((b) => b.status !== "dormant").length;
    const dormantBus = input.businessUnits.length - activeBus;
    const summary =
      `${input.businessUnits.length} organizations mapped, ${dormantBus} held dormant. ` +
      `${input.opportunities.filter((o) => o.maturity).length} emerging opportunit${
        input.opportunities.filter((o) => o.maturity).length === 1 ? "y" : "ies"
      }.`;

    return {
      primary,
      alternatives,
      summary,
      generatedBy: deterministicStrategyEngine.name,
    };
  },
};

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
