import { describe, expect, it } from "vitest";
import {
  ARCHETYPE_LABEL,
  PRESETS,
  archetypeSeeds,
  buildTerritoryFromProfile,
  classifySeller,
  findPreset,
  presetById,
  profileForCompany,
  resolveTerritory,
} from "@/data/profiles";
import { computeHealth } from "@/domain/health";
import { evaluateOpportunity } from "@/domain/opportunity";
import type { SellerArchetype } from "@/domain/profile";
import type { Account } from "@/domain/types";

const SEEDED = PRESETS.filter((p) => p.seeds.length > 0);

function healthOf(account: Account, days: number) {
  const prospects = account.businessUnits.flatMap((bu) => bu.teams.flatMap((t) => t.prospects));
  const byId = Object.fromEntries(prospects.map((p) => [p.id, p]));
  const opportunities = account.opportunities.map((o) => evaluateOpportunity(o, byId));
  return computeHealth({ prospects, opportunities, daysSinceActivity: days, signals: account.signals });
}

describe("curated presets", () => {
  it("cover the sellers we demo to", () => {
    expect(PRESETS.map((p) => p.profile.id)).toEqual(["vercel", "stripe", "ramp", "anthropic", "openai", "cursor", "cognition", "datadog", "snowflake"]);
  });

  it.each(SEEDED.map((p) => [p.profile.id, p] as const))("%s has eight well-formed ICP targets", (_, preset) => {
    expect(preset.seeds).toHaveLength(8);
    const ids = new Set(preset.seeds.map((s) => s.id));
    expect(ids.size).toBe(8);
    for (const seed of preset.seeds) {
      expect(seed.name.toLowerCase()).not.toContain(preset.profile.company.toLowerCase());
      expect(seed.units.length).toBeGreaterThanOrEqual(2);
      expect(seed.units.length).toBeLessThanOrEqual(4);
      expect(seed.units[0].status).toBe("active");
      expect(seed.stakeholders.length).toBeGreaterThanOrEqual(3);
      expect(seed.stakeholders.length).toBeLessThanOrEqual(6);
      expect(seed.opportunities.length).toBeGreaterThanOrEqual(1);
      expect(seed.opportunities.length).toBeLessThanOrEqual(2);
      const units = new Set(seed.units.map((u) => u.key));
      const people = new Set(seed.stakeholders.map((s) => s.key));
      expect(people.size).toBe(seed.stakeholders.length);
      for (const s of seed.stakeholders) expect(units.has(s.unit)).toBe(true);
      for (const o of seed.opportunities) {
        expect(units.has(o.unit)).toBe(true);
        expect(o.stakeholders.every((k) => people.has(k))).toBe(true);
      }
      expect(seed.intelligence.length).toBeGreaterThan(0);
    }
    // The flagship carries the expansion the guided demo grows.
    expect(preset.seeds[0].opportunities.some((o) => o.stage === "Forming")).toBe(true);
  });

  it("target different companies for every seller", () => {
    const seen = new Map<string, string>();
    for (const preset of SEEDED) {
      for (const seed of preset.seeds) {
        expect(seen.get(seed.name), `${seed.name} appears for ${preset.profile.id} and ${seen.get(seed.name)}`).toBeUndefined();
        seen.set(seed.name, preset.profile.id);
      }
    }
  });
});

describe("seed builder", () => {
  const stripe = presetById("stripe")!;
  const built = buildTerritoryFromProfile(stripe.profile, stripe.seeds);

  it("is deterministic", () => {
    const again = buildTerritoryFromProfile(stripe.profile, stripe.seeds);
    expect(JSON.stringify(again)).toBe(JSON.stringify(built));
  });

  it("grows full accounts and the commercial overlay", () => {
    const { accounts } = built.territory;
    expect(accounts).toHaveLength(8);
    for (const account of accounts) {
      const prospects = new Set(account.businessUnits.flatMap((bu) => bu.teams.flatMap((t) => t.prospects.map((p) => p.id))));
      expect(prospects.size).toBeGreaterThan(10);
      for (const o of account.opportunities) {
        expect(o.stakeholderIds.every((id) => prospects.has(id))).toBe(true);
        expect(account.businessUnits.some((bu) => bu.id === o.businessUnitId)).toBe(true);
        expect(built.commercial[account.id].dealValues[o.id]).toBeGreaterThan(0);
      }
      expect(built.commercial[account.id].motion).toMatch(/^Net-new · /);
      const dormant = account.businessUnits.filter((bu) => bu.status === "dormant");
      for (const bu of dormant) expect(bu.reactivation).toBeDefined();
    }
  });

  it("keeps evidence honest", () => {
    for (const account of built.territory.accounts) {
      for (const p of account.businessUnits.flatMap((bu) => bu.teams.flatMap((t) => t.prospects))) expect(p.evidenceType).toBe("demo");
      for (const o of account.opportunities) expect(o.evidenceType).toBe("demo");
      for (const s of account.signals) expect(s.evidenceType).toBe("demo");
      const evidence = new Set(account.intelligence.map((i) => i.evidenceType));
      expect(evidence.has("verified")).toBe(false);
      expect(evidence.has("inference")).toBe(true);
    }
  });

  it("replaces seller tokens", () => {
    const json = JSON.stringify(built);
    expect(json).not.toContain("{seller}");
    expect(json).not.toContain("{product}");
    const anthropic = resolveTerritory(presetById("anthropic")!.profile);
    expect(anthropic.territory.accounts[0].opportunities.map((o) => o.name)).toContain("Claude Code for engineering modernization");
  });

  it("grows a forest with the full range of health", () => {
    for (const preset of SEEDED) {
      const t = buildTerritoryFromProfile(preset.profile, preset.seeds);
      const bands = t.territory.accounts.map((a) => healthOf(a, t.commercial[a.id].lastActivityDaysAgo).band);
      expect(bands[0]).toBe("thriving");
      expect(bands).toContain("withering");
      expect(bands.some((b) => b === "cooling" || b === "at-risk")).toBe(true);
    }
  });

  it("applies the seller's role to the motion", () => {
    const am = buildTerritoryFromProfile({ ...stripe.profile, role: "AM" }, stripe.seeds);
    expect(Object.values(am.commercial).every((c) => c.motion.startsWith("Expansion · "))).toBe(true);
  });
});

describe("seller classifier", () => {
  it.each([
    ["Adyen", "payments"],
    ["Brex", "spend"],
    ["Mistral AI", "ai-platform"],
    ["Databricks", "data-infra"],
    ["Grafana Labs", "observability"],
    ["Wiz", "security"],
    ["Rippling", "hr-saas"],
    ["GitHub", "devtools"],
    ["HubSpot", "generic"],
    ["Northwind Payments Inc.", "payments"],
    ["Acme Cyber Defense", "security"],
    ["Helix Data Cloud", "data-infra"],
    ["Northwind Traders", "generic"],
    ["", "generic"],
  ] as const)("%s → %s", (company, archetype) => {
    expect(classifySeller(company)).toBe(archetype);
  });

  it("recognises presets by name and alias", () => {
    expect(findPreset("Open AI")?.profile.id).toBe("openai");
    expect(findPreset("  stripe ")?.profile.id).toBe("stripe");
    expect(findPreset("Anysphere")?.profile.id).toBe("cursor");
    const { profile, preset } = profileForCompany("Stripe", "SDR");
    expect(preset).toBe(true);
    expect(profile.role).toBe("SDR");
  });

  it("gives any company a sensible eight-account territory", () => {
    const { profile, seeds, preset } = profileForCompany("Northwind Security", "AE");
    expect(preset).toBe(false);
    expect(profile.archetype).toBe("security");
    expect(profile.source).toBe("archetype");
    expect(profile.id).toBe("custom:northwind-security");
    expect(seeds).toHaveLength(8);
    const t = resolveTerritory(profile, seeds);
    expect(t.territory.accounts).toHaveLength(8);
    expect(JSON.stringify(t.territory)).toContain("Northwind Security");
  });

  it.each(Object.keys(ARCHETYPE_LABEL) as SellerArchetype[])("archetype %s builds", (archetype) => {
    const seeds = archetypeSeeds(archetype);
    expect(seeds).toHaveLength(8);
    const t = buildTerritoryFromProfile(profileForCompany(`Acme ${archetype}`, "AE").profile, seeds);
    expect(t.territory.accounts).toHaveLength(8);
    // Borrowed preset targets never carry another vendor's product names.
    const json = JSON.stringify(t);
    for (const brand of ["Claude", "ChatGPT", "Stripe", "Ramp", "Datadog", "Snowflake"]) expect(json).not.toContain(brand);
  });
});
