import { describe, expect, it } from "vitest";
import { computeHealth, healthBand } from "@/domain/health";
import { formatMoney, pipelineOf } from "@/domain/commercial";
import { evaluateOpportunity } from "@/domain/opportunity";
import { territory } from "@/data";
import type { Prospect } from "@/domain/types";

const jpmc = territory.accounts.find((a) => a.id === "jpmc")!;
const prospects: Prospect[] = jpmc.businessUnits.flatMap((bu) => bu.teams.flatMap((t) => t.prospects));
const byId = Object.fromEntries(prospects.map((p) => [p.id, p]));
const opps = jpmc.opportunities.map((o) => evaluateOpportunity(o, byId));

describe("account health", () => {
  it("falls as days without activity grow", () => {
    const fresh = computeHealth({ prospects, opportunities: opps, daysSinceActivity: 2, signals: jpmc.signals });
    const stale = computeHealth({ prospects, opportunities: opps, daysSinceActivity: 77, signals: jpmc.signals });
    expect(fresh.score).toBeGreaterThan(stale.score + 40);
    expect(fresh.band).toBe("thriving");
    expect(["at-risk", "withering"]).toContain(stale.band);
    expect(stale.vitality).toBeLessThan(fresh.vitality);
  });

  it("rewards engaged stakeholders", () => {
    const none = prospects.map((p) => ({ ...p, relationshipStatus: "unworked" as const }));
    const cold = computeHealth({ prospects: none, opportunities: [], daysSinceActivity: 5, signals: [] });
    const warm = computeHealth({ prospects, opportunities: opps, daysSinceActivity: 5, signals: [] });
    expect(warm.score).toBeGreaterThan(cold.score);
    expect(cold.drivers.some((d) => d.label === "No engaged stakeholders")).toBe(true);
  });

  it("maps scores to bands", () => {
    expect(healthBand(90)).toBe("thriving");
    expect(healthBand(60)).toBe("healthy");
    expect(healthBand(45)).toBe("cooling");
    expect(healthBand(30)).toBe("at-risk");
    expect(healthBand(10)).toBe("withering");
  });
});

describe("pipeline", () => {
  it("counts discovery-stage and later opportunities only", () => {
    const values = { [opps[0].opportunity.id]: 1_800_000, [opps[1].opportunity.id]: 3_200_000 };
    const p = pipelineOf(opps, values);
    // The expansion is latent until a second stakeholder engages.
    expect(opps[1].maturity).toBeNull();
    expect(p.open).toBe(1_800_000);
    expect(p.weighted).toBeGreaterThan(0);
    expect(p.weighted).toBeLessThan(p.open);
  });

  it("formats money compactly", () => {
    expect(formatMoney(1_800_000)).toBe("$1.8M");
    expect(formatMoney(31_000_000)).toBe("$31M");
    expect(formatMoney(950_000)).toBe("$950K");
  });
});
