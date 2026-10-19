import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { buildAccountView, summarize } from "@/store/selectors";
import { DEMO_BEATS, applyDemoStep, beatTitle, demoPlan, lastMeetingAt } from "@/components/demo/script";
import { DEFAULT_PROFILE, archetypeProfile, archetypeSeeds, presetById } from "@/data/profiles";
import { accountIds, accountPosition, accountSlotIndex } from "@/three/layout";
import { researchToTerritory, type ResearchOutput } from "@/data/profiles/research";
import { POST } from "@/app/api/territory/route";

const S = () => useTerritoryStore.getState();
const view = (id: string) => buildAccountView(S(), id)!;
const total = () => summarize(S().accounts.map((a) => view(a.id)));
const stripe = presetById("stripe")!;

beforeEach(() => {
  S().loadProfile(DEFAULT_PROFILE, null, { persist: false, announce: false });
});
afterAll(() => {
  S().loadProfile(DEFAULT_PROFILE, null, { persist: false, announce: false });
});

describe("loadProfile", () => {
  it("rebuilds every derived slice for the new seller", () => {
    S().enterAccount("jpmc");
    S().setFilter("attention");
    S().loadProfile(stripe.profile, null, { persist: false });
    const s = S();
    expect(s.profile.id).toBe("stripe");
    expect(s.accounts.map((a) => a.id)).toEqual(stripe.seeds.map((seed) => seed.id));
    expect(Object.keys(s.accountsById)).toHaveLength(8);
    expect(Object.keys(s.commercial).sort()).toEqual(stripe.seeds.map((seed) => seed.id).sort());
    expect(s.daysSince.doordash).toBe(2);
    expect(s.daysSince.wayfair).toBe(83);
    expect(Object.values(s.prospectsById).every((p) => s.accountsById[p.accountId])).toBe(true);
    expect(Object.values(s.opportunitiesById).every((o) => s.accountsById[o.accountId])).toBe(true);
    expect(s.signals.every((x) => s.accountsById[x.accountId])).toBe(true);
    expect(s.mode).toBe("forest");
    expect(s.activeAccountId).toBeNull();
    expect(s.filter).toBe("all");
    expect(s.notices.at(-1)?.title).toBe("Selling for Stripe");
  });

  it("derives the starting activity history from the data", () => {
    const vercel = S().activities;
    expect(vercel.some((a) => a.accountId === "jpmc" && a.message === "Meeting booked with Director, Internal Developer Platform")).toBe(true);
    expect(vercel.some((a) => a.accountId === "jpmc" && a.message === "Engineer's Platform AI-Assisted Delivery qualified")).toBe(true);
    S().loadProfile(stripe.profile, null, { persist: false });
    const acts = S().activities;
    expect(acts.every((a) => S().accountsById[a.accountId])).toBe(true);
    expect(acts.some((a) => a.accountId === "doordash" && a.kind === "meeting")).toBe(true);
    // The most recent touch per account is the recorded last activity.
    const latest = acts.filter((a) => a.accountId === "doordash").sort((x, y) => y.timestamp - x.timestamp)[0];
    expect(latest.message).toBe(S().commercial.doordash.lastActivity);
  });

  it("resets to the active seller's starting territory", () => {
    S().loadProfile(stripe.profile, null, { persist: false });
    const initial = total();
    S().simulateNeglect("doordash", 40);
    S().runActivity("atlassian", "multithread");
    expect(total().health).not.toBe(initial.health);
    S().resetDemo();
    expect(S().profile.id).toBe("stripe");
    expect(total()).toEqual(initial);
  });

  it("returns to the untouched Vercel territory", () => {
    const before = JSON.stringify(total());
    S().loadProfile(stripe.profile, null, { persist: false });
    S().loadProfile(DEFAULT_PROFILE, null, { persist: false });
    expect(S().accounts.map((a) => a.id)).toEqual(["jpmc", "walmart", "disney", "amex", "nike", "starbucks", "marriott", "ford"]);
    expect(JSON.stringify(total())).toBe(before);
  });

  it("slots any territory into the same eight glades", () => {
    const vercelJpmc = accountPosition("jpmc");
    S().loadProfile(stripe.profile, null, { persist: false });
    expect(accountIds()).toEqual(S().accounts.map((a) => a.id));
    expect(accountSlotIndex("doordash")).toBe(0);
    expect(accountSlotIndex("wayfair")).toBe(7);
    expect(accountSlotIndex("jpmc")).toBe(-1);
    const flagship = accountPosition("doordash");
    expect(Math.abs(flagship.x - vercelJpmc.x)).toBeLessThan(6);
    expect(Math.abs(flagship.z - vercelJpmc.z)).toBeLessThan(6);
  });
});

describe("guided demo for any seller", () => {
  const sellers = [
    ["stripe", () => S().loadProfile(stripe.profile, null, { persist: false })],
    ["ramp", () => S().loadProfile(presetById("ramp")!.profile, null, { persist: false })],
    ["archetype", () => S().loadProfile(archetypeProfile("Northwind Security", "AE"), archetypeSeeds("security"), { persist: false })],
  ] as const;

  it.each(sellers)("%s: every beat replays and the expansion grows", (_, load) => {
    load();
    const plan = demoPlan();
    expect(plan.focusId).toBe(S().accounts[0].id);
    expect(plan.expansionOppId).toBeTruthy();

    applyDemoStep(2);
    expect(S().activeAccountId).toBe(plan.focusId);
    const start = view(plan.focusId).pipeline.open;

    applyDemoStep(5);
    const met = lastMeetingAt(S(), plan.focusId);
    expect(met?.influence).toBe(5);
    expect(view(plan.focusId).opportunities.find((o) => o.opportunity.id === plan.expansionOppId)?.maturity).not.toBeNull();

    applyDemoStep(6);
    expect(view(plan.focusId).pipeline.open).toBeGreaterThan(start);
    expect(S().selectedOpportunityId).toBe(plan.expansionOppId);

    for (let i = 0; i < DEMO_BEATS.length; i++) {
      applyDemoStep(i);
      const s = S();
      const views = s.accounts.map((a) => buildAccountView(s, a.id)!);
      const text = DEMO_BEATS[i].body({
        summary: summarize(views),
        view: (id) => views.find((v) => v.account.id === id),
        healthBeforeNeglect: 80,
        plan: demoPlan(),
        lastMeeting: lastMeetingAt(s, plan.focusId),
      });
      expect(text.length).toBeGreaterThan(40);
      expect(text).not.toMatch(/JPMorgan|Engineer's Platform|Thea Halloran|undefined/);
      expect(beatTitle(DEMO_BEATS[i]).length).toBeGreaterThan(0);
    }
    expect(beatTitle(DEMO_BEATS[2])).toBe(S().accounts[0].name);
  });
});

describe("ICP research", () => {
  const account = (name: string, extra: Partial<ResearchOutput["accounts"][number]> = {}): ResearchOutput["accounts"][number] => ({
    name,
    sector: "Logistics",
    thesis: `${name} moves a lot of money.`,
    tier: 1.4,
    potentialArr: 90_000_000,
    motion: "payments modernization",
    lastActivity: "Discovery call",
    units: [
      { key: "Pay Ops", name: "Payments Operations", shortName: null, status: "active", thesis: "Owns payments.", fn: "payments" },
      { key: "fin", name: "Finance", shortName: "Fin", status: "dormant", thesis: "Finance.", fn: "Finance" },
      { key: "eng", name: "Engineering", shortName: null, status: "dormant", thesis: "Engineering.", fn: "not-a-function" },
    ],
    stakeholders: [
      { key: "cfo", title: "Chief Financial Officer", persona: "Economic Buyer", influence: 9, unit: "fin", status: "unworked", hypothesis: "Budget." },
      { key: "dir", title: "Director, Payments", persona: "technical buyer", influence: 4, unit: "Pay Ops", status: "meeting", hypothesis: "Owner." },
      { key: "pm", title: "Product Manager, Checkout", persona: "Champion", influence: 3, unit: "missing", status: "engaged", hypothesis: "Champion." },
    ],
    opportunities: [
      { key: "x", name: "Checkout modernization", unit: "fin", value: 1_000, stage: "Forming", stakeholders: ["dir", "pm", "ghost"], nextStep: "Scope it." },
      { key: "y", name: "Global expansion", unit: "Pay Ops", value: 2_000_000, stage: "Forming", stakeholders: ["cfo", "dir"], nextStep: "Exec session." },
    ],
    signals: [{ title: "Hiring", description: "Payments roles.", type: "hiring-surge", strength: "loud", unit: null }],
    intelligence: [{ category: "Business Model", title: "Marketplace", summary: "Moves money." }],
    ...extra,
  });

  const output: ResearchOutput = {
    seller: {
      productName: "Northwind Pay",
      product: "Payments for marketplaces",
      category: "Payments Infrastructure",
      icp: "Marketplaces.",
      valueProps: ["Faster payouts"],
      personas: ["Head of Payments"],
      motion: "Payments Modernization",
    },
    accounts: [account("Northwind Pay"), account("Globex"), account("Initech"), account("Umbrella"), account("Hooli"), account("Broken", { units: [] })],
  };

  it("validates, clamps and pads a research answer into eight seeds", () => {
    const result = researchToTerritory("Northwind Pay", "AE", "payments", output)!;
    expect(result.profile.source).toBe("researched");
    expect(result.profile.id).toBe("custom:northwind-pay");
    expect(result.profile.category).toBe("payments infrastructure");
    expect(result.seeds).toHaveLength(8);
    expect(result.seeds.map((s) => s.name)).not.toContain("Northwind Pay");
    expect(result.seeds.map((s) => s.name)).not.toContain("Broken");
    const globex = result.seeds.find((s) => s.name === "Globex")!;
    expect(globex.tier).toBe(1);
    expect(globex.potentialArr).toBe(50_000_000);
    expect(globex.units.map((u) => u.status)).toEqual(["active", "dormant", "active"]);
    expect(globex.units[2].fn).toBe("business");
    expect(globex.stakeholders[0].influence).toBe(5);
    expect(globex.stakeholders[1].persona).toBe("Technical Buyer");
    expect(globex.stakeholders[2].unit).toBe(globex.units[0].key);
    // First opportunity is never latent and never hangs on a dormant limb.
    expect(globex.opportunities[0].stage).toBe("Discovery");
    expect(globex.opportunities[0].unit).toBe(globex.units[0].key);
    expect(globex.opportunities[0].value).toBe(50_000);
    expect(globex.opportunities[0].stakeholders).toEqual(["dir", "pm"]);
    expect(globex.opportunities[1].stage).toBe("Forming");
    expect(globex.signals[0].strength).toBe("moderate");

    S().loadProfile(result.profile, result.seeds, { persist: false });
    expect(S().accounts).toHaveLength(8);
    expect(S().profile.source).toBe("researched");
  });

  it("rejects answers with too little to use", () => {
    expect(researchToTerritory("Northwind Pay", "AE", "payments", { ...output, accounts: output.accounts.slice(0, 2) })).toBeNull();
  });

  it("route answers 501 when no API key is configured", async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const res = await POST(new Request("http://localhost/api/territory", { method: "POST", body: JSON.stringify({ company: "Northwind Pay", role: "AE" }) }));
      expect(res.status).toBe(501);
    } finally {
      if (key !== undefined) process.env.ANTHROPIC_API_KEY = key;
    }
  });
});
