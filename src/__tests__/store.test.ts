import { beforeEach, describe, expect, it } from "vitest";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { buildAccountView, summarize } from "@/store/selectors";
import { DEMO_BEATS, applyDemoStep } from "@/components/demo/script";

const S = () => useTerritoryStore.getState();
const view = (id: string) => buildAccountView(S(), id)!;

beforeEach(() => {
  S().resetDemo();
});

describe("territory store", () => {
  it("withers an account when it is neglected", () => {
    const before = view("jpmc").health.score;
    S().simulateNeglect("jpmc", 75);
    expect(view("jpmc").health.score).toBeLessThan(before - 40);
  });

  it("forms a new opportunity from an executive meeting", () => {
    const before = view("jpmc").pipeline.open;
    S().runActivity("jpmc", "exec-meeting");
    const after = view("jpmc");
    expect(after.daysSince).toBe(0);
    expect(after.opportunities.find((o) => o.opportunity.id === "jpmc.opp.dx-standard")?.maturity).not.toBeNull();
    expect(after.pipeline.open).toBeGreaterThan(before);
  });

  it("advances the opportunity when the deal is multithreaded", () => {
    S().runActivity("jpmc", "exec-meeting");
    const bud = view("jpmc").opportunities.find((o) => o.opportunity.id === "jpmc.opp.dx-standard")!.strength;
    S().runActivity("jpmc", "multithread");
    const grown = view("jpmc").opportunities.find((o) => o.opportunity.id === "jpmc.opp.dx-standard")!.strength;
    expect(grown).toBeGreaterThan(bud);
  });

  it("reactivates a dormant business unit on a simulated trigger", () => {
    S().simulateTrigger("jpmc.awm");
    expect(S().businessUnitsById["jpmc.awm"].status).toBe("reactivating");
  });

  it("resets to the starting territory", () => {
    const initial = summarize(S().accounts.map((a) => view(a.id)));
    S().simulateNeglect("ford", 30);
    S().runActivity("jpmc", "multithread");
    S().resetDemo();
    const again = summarize(S().accounts.map((a) => view(a.id)));
    expect(again.health).toBe(initial.health);
    expect(again.pipeline).toBe(initial.pipeline);
  });

  it("ranks priorities with the coldest, most valuable accounts first", () => {
    const s = summarize(S().accounts.map((a) => view(a.id)));
    expect(s.priorities[0].accountId).toBe("ford");
    expect(s.attention).toBeGreaterThan(0);
  });
});

describe("guided demo", () => {
  it("replays every beat deterministically", () => {
    for (let i = 0; i < DEMO_BEATS.length; i++) {
      applyDemoStep(i);
      const first = JSON.stringify(summarize(S().accounts.map((a) => view(a.id))));
      applyDemoStep(i);
      const second = JSON.stringify(summarize(S().accounts.map((a) => view(a.id))));
      expect(second).toBe(first);
      expect(S().demo).toEqual({ active: true, step: i });
    }
  });

  it("ends the opportunity act with more pipeline than it started", () => {
    applyDemoStep(2);
    const start = view("jpmc").pipeline.open;
    applyDemoStep(6);
    expect(view("jpmc").pipeline.open).toBeGreaterThan(start);
  });
});
