import { z } from "zod";
import type {
  AccountSeed,
  OpportunitySeed,
  SeedStage,
  SellerArchetype,
  SellerProfile,
  SellerRole,
  StakeholderSeed,
  UnitSeed,
} from "@/domain/profile";
import type { Tier } from "@/domain/commercial";
import { ARCHETYPE_LABEL, archetypeProfile, archetypeSeeds } from "./archetypes";

/**
 * Optional Claude research of an unknown seller's ICP. The schema is what the
 * model must return; `researchToTerritory` validates and clamps it into seeds
 * the deterministic builder understands, padding from the archetype when the
 * answer is thin. Model output is treated as data, never trusted blindly.
 */

const PERSONAS = ["Executive Sponsor", "Economic Buyer", "Technical Buyer", "Champion", "Influencer", "Security", "Procurement", "Developer"] as const;
const STATUSES = ["unworked", "researched", "contacted", "engaged", "meeting"] as const;
const STAGES = ["Forming", "Discovery", "Qualified", "Technical validation", "Commercial"] as const;
const FUNCTIONS = ["platform", "product-engineering", "data-ai", "security", "infrastructure", "developer-experience", "business", "procurement", "finance", "payments", "operations", "people", "revenue"] as const;
const SIGNAL_TYPES = ["executive-change", "ai-initiative", "developer-productivity", "acquisition", "product-launch", "hiring-surge", "governance", "earnings-priority", "market-expansion", "platform-migration", "finance-transformation"] as const;
const CATEGORIES = ["Company Scale", "Business Model", "Digital Surface", "Current Stack", "AI Adoption", "Security / Governance", "Transformation Initiatives", "Competitive Environment", "Executive Priorities", "Timing Signals"] as const;

/**
 * Enumerations are plain strings with the allowed values described, then
 * coerced during conversion: one off-list value should not cost the whole
 * answer.
 */
function oneOf(values: readonly string[], note = "") {
  return z.string().describe(`${note ? `${note} ` : ""}One of: ${values.join(", ")}.`);
}
function pick<T extends string>(values: readonly T[], value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  return values.find((x) => x.toLowerCase() === v.toLowerCase()) ?? fallback;
}

export const ResearchSchema = z.object({
  seller: z.object({
    productName: z.string().describe("Flagship product name as customers say it, e.g. 'Stripe' or 'Claude'."),
    product: z.string().describe("What the seller sells, one short phrase."),
    category: z.string().describe("Lowercase category noun phrase, e.g. 'payments infrastructure'."),
    icp: z.string().describe("Ideal customer profile, one or two sentences."),
    valueProps: z.array(z.string()).describe("Three or four crisp value propositions."),
    personas: z.array(z.string()).describe("Four or five buyer titles."),
    motion: z.string().describe("Lowercase motion label, e.g. 'payments modernization'."),
  }),
  accounts: z
    .array(
      z.object({
        name: z.string().describe("A real, well-known company that fits the ICP. Never the seller or its competitors."),
        sector: z.string(),
        thesis: z.string().describe("Two or three sentences: why this account fits, framed as a seller hypothesis."),
        tier: z.number().describe("1 strategic, 2 growth, 3 develop."),
        potentialArr: z.number().describe("Plausible annual contract potential in USD for this seller."),
        motion: z.string().describe("Lowercase entry motion for this account."),
        lastActivity: z.string().describe("A short, generic description of the last seller touch, e.g. 'Discovery agenda shared with Payments'."),
        units: z.array(
          z.object({
            key: z.string().describe("Short lowercase slug, unique within the account."),
            name: z.string().describe("A business unit or department that plausibly exists at this company."),
            shortName: z.string().nullable(),
            status: oneOf(["active", "dormant"]),
            thesis: z.string(),
            fn: oneOf(FUNCTIONS, "Function of most people in the unit."),
          }),
        ),
        stakeholders: z.array(
          z.object({
            key: z.string().describe("Short lowercase slug, unique within the account."),
            title: z.string().describe("A job title only. Never a real person's name."),
            persona: oneOf(PERSONAS),
            influence: z.number().describe("1 peripheral to 5 decisive."),
            unit: z.string().describe("Key of the unit this person sits in."),
            status: oneOf(STATUSES, "Demo relationship status."),
            hypothesis: z.string().describe("One sentence on what this role likely cares about."),
          }),
        ),
        opportunities: z.array(
          z.object({
            key: z.string(),
            name: z.string().describe("Opportunity name in the seller's language."),
            unit: z.string(),
            value: z.number().describe("Deal value in USD."),
            stage: oneOf(STAGES),
            stakeholders: z.array(z.string()).describe("Stakeholder keys involved."),
            nextStep: z.string(),
          }),
        ),
        signals: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            type: oneOf(SIGNAL_TYPES),
            strength: oneOf(["weak", "moderate", "strong"]),
            unit: z.string().nullable(),
          }),
        ),
        intelligence: z.array(
          z.object({
            category: oneOf(CATEGORIES),
            title: z.string(),
            summary: z.string().describe("Widely known, stable facts only. No precise figures or dates you are unsure of."),
          }),
        ),
      }),
    )
    .describe("Exactly eight target accounts, strongest fit first."),
});

export type ResearchOutput = z.infer<typeof ResearchSchema>;

export function researchPrompt(company: string, role: SellerRole, archetype: SellerArchetype): { system: string; user: string } {
  const system = [
    "You design illustrative sales territories for a demo app called Territory, where each target account is drawn as a tree.",
    "Return real, well-known companies that plausibly fit the seller's ideal customer profile. Never include the seller itself or its direct competitors, and prefer a varied mix of industries.",
    "Company-level context must be widely known and stable. Do not invent precise figures, dates, deals, customer relationships or quotes; when unsure, describe the general shape of the business instead.",
    "Stakeholders are job titles only, never real people's names. Opportunity names, stages, values and activity are illustrative demo data and should read like a seller's CRM.",
    "Write crisply, in plain sentences, without hype.",
  ].join(" ");
  const user = [
    `Seller: ${company}`,
    `Seller's role: ${role === "SDR" ? "sales development rep" : role === "AM" ? "account manager (expansion)" : "account executive"}`,
    `Likely category (from a keyword classifier; correct it if wrong): ${ARCHETYPE_LABEL[archetype]}`,
    "",
    "Describe what the seller sells and its ICP, then propose exactly eight target accounts, strongest fit first.",
    "For each account give 2 to 4 business units (at most one dormant, the first one active and most relevant), 3 to 6 stakeholders spread across those units with at least one decisive (influence 5) executive, and 1 or 2 opportunities in the seller's language.",
    "For the first account, add a second opportunity at stage 'Forming' that involves the decisive executive plus two or three other stakeholders.",
    "Add one to three signals and two or three intelligence bullets per account.",
    "Keep every string short: theses under 45 words, hypotheses and summaries under 25 words, names and titles as they would appear in a CRM.",
  ].join("\n");
  return { system, user };
}

/* ------------------------------------------------------------------------ */
/* Validation and conversion                                                 */
/* ------------------------------------------------------------------------ */

const DAYS = [2, 6, 12, 24, 9, 31, 40, 82];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const text = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

function uniqueKey(base: string, used: Set<string>, fallback: string) {
  let key = slug(base) || fallback;
  let n = 2;
  while (used.has(key)) key = `${slug(base) || fallback}-${n++}`;
  used.add(key);
  return key;
}

type RawAccount = ResearchOutput["accounts"][number];

/** Cold accounts should look cold, whatever the model guessed. */
function coolFor(index: number, status: StakeholderSeed["status"]): StakeholderSeed["status"] {
  return index >= 6 && (status === "engaged" || status === "meeting") ? "contacted" : status;
}

function toSeed(raw: RawAccount, index: number): AccountSeed | null {
  const name = text(raw.name, 80);
  if (!name) return null;

  const unitKeys = new Map<string, string>();
  const usedUnits = new Set<string>();
  const units: UnitSeed[] = [];
  for (const u of raw.units.slice(0, 4)) {
    const uname = text(u.name, 60);
    if (!uname) continue;
    const key = uniqueKey(u.key || uname, usedUnits, `u${units.length}`);
    unitKeys.set(text(u.key, 60), key);
    units.push({
      key,
      name: uname,
      shortName: text(u.shortName, 24) || undefined,
      status: u.status === "dormant" && units.some((x) => x.status === "active") && !units.some((x) => x.status === "dormant") ? "dormant" : "active",
      thesis: text(u.thesis) || `${uname} at ${name}.`,
      fn: pick(FUNCTIONS, u.fn, "business"),
      size: units.length === 0 ? 1.3 : 1,
    });
  }
  if (units.length < 2) return null;
  const active = units.filter((u) => u.status === "active");
  const unitOf = (k: string | null | undefined) => {
    const key = unitKeys.get(text(k, 60)) ?? (units.some((u) => u.key === k) ? (k as string) : undefined);
    const unit = units.find((u) => u.key === key);
    return unit ?? active[0];
  };

  const personKeys = new Map<string, string>();
  const usedPeople = new Set<string>();
  const stakeholders: StakeholderSeed[] = [];
  for (const p of raw.stakeholders.slice(0, 6)) {
    const title = text(p.title, 80);
    if (!title) continue;
    const key = uniqueKey(p.key || title, usedPeople, `p${stakeholders.length}`);
    personKeys.set(text(p.key, 60), key);
    stakeholders.push({
      key,
      title,
      persona: pick(PERSONAS, p.persona, "Influencer"),
      influence: Math.round(clamp(p.influence, 1, 5)) as StakeholderSeed["influence"],
      unit: unitOf(p.unit).key,
      status: coolFor(index, pick(STATUSES, p.status, "unworked")),
      hypothesis: text(p.hypothesis, 240) || "Likely stakeholder for this motion.",
    });
  }
  if (stakeholders.length < 2) return null;

  const opportunities: OpportunitySeed[] = [];
  for (const o of raw.opportunities.slice(0, 2)) {
    const oname = text(o.name, 90);
    if (!oname) continue;
    const people = o.stakeholders.map((k) => personKeys.get(text(k, 60)) ?? (usedPeople.has(k) ? k : null)).filter((k): k is string => !!k);
    const stage = pick(STAGES, o.stage, "Discovery");
    const firstStage: SeedStage = stage === "Forming" ? "Discovery" : stage;
    opportunities.push({
      key: opportunities.length === 0 ? "opp" : "expansion",
      name: oname,
      unit: unitOf(o.unit).key,
      value: Math.round(clamp(o.value, 50_000, 20_000_000)),
      stage: opportunities.length === 0 ? firstStage : stage,
      stakeholders: people.length > 0 ? [...new Set(people)] : stakeholders.slice(0, 2).map((s) => s.key),
      nextStep: text(o.nextStep, 200) || "Agree the next step with the champion.",
    });
  }
  if (opportunities.length === 0) return null;
  // Opportunities must hang on an active limb.
  for (const o of opportunities) if (units.find((u) => u.key === o.unit)?.status === "dormant") o.unit = active[0].key;

  return {
    id: slug(name) || `account-${index + 1}`,
    name,
    sector: text(raw.sector, 60) || "Enterprise",
    thesis: text(raw.thesis, 600),
    tier: Math.round(clamp(raw.tier, 1, 3)) as Tier,
    potentialArr: Math.round(clamp(raw.potentialArr, 200_000, 50_000_000)),
    motion: text(raw.motion, 60) || "expansion",
    units,
    stakeholders,
    opportunities,
    signals: raw.signals.slice(0, 3).map((s) => ({
      title: text(s.title, 90),
      description: text(s.description, 240),
      type: pick(SIGNAL_TYPES, s.type, "product-launch"),
      strength: pick(["weak", "moderate", "strong"] as const, s.strength, "moderate"),
      unit: s.unit ? unitOf(s.unit).key : undefined,
    })).filter((s) => s.title && s.description),
    lastActivityDaysAgo: DAYS[index] ?? 30,
    lastActivity: text(raw.lastActivity, 90) || "Intro call",
    intelligence: raw.intelligence
      .slice(0, 4)
      .map((i) => ({ category: pick(CATEGORIES, i.category, "Business Model"), title: text(i.title, 80), summary: text(i.summary, 500) }))
      .filter((i) => i.title && i.summary),
  };
}

/**
 * Validate a research answer into a profile and exactly eight seeds. Accounts
 * that fail validation are replaced by archetype targets.
 */
export function researchToTerritory(
  company: string,
  role: SellerRole,
  archetype: SellerArchetype,
  output: ResearchOutput,
): { profile: SellerProfile; seeds: AccountSeed[] } | null {
  const base = archetypeProfile(company, role, archetype);
  const seller = output.seller;
  const profile: SellerProfile = {
    ...base,
    productName: text(seller.productName, 40) || base.productName,
    product: text(seller.product, 160) || base.product,
    category: text(seller.category, 50).toLowerCase() || base.category,
    icp: text(seller.icp, 400) || base.icp,
    valueProps: seller.valueProps.map((v) => text(v, 120)).filter(Boolean).slice(0, 4),
    personas: seller.personas.map((v) => text(v, 60)).filter(Boolean).slice(0, 5),
    motion: text(seller.motion, 60).toLowerCase() || base.motion,
    source: "researched",
  };
  if (profile.valueProps.length === 0) profile.valueProps = base.valueProps;
  if (profile.personas.length === 0) profile.personas = base.personas;

  const sellerName = company.trim().toLowerCase();
  const seen = new Set<string>();
  const seeds: AccountSeed[] = [];
  // Strongest fit first: tier, then potential.
  const ranked = output.accounts
    .filter((a) => text(a.name).toLowerCase() !== sellerName)
    .slice(0, 12)
    .sort((a, b) => clamp(a.tier, 1, 3) - clamp(b.tier, 1, 3) || b.potentialArr - a.potentialArr);
  for (const raw of ranked) {
    if (seeds.length >= 8) break;
    const seed = toSeed(raw, seeds.length);
    if (!seed || seen.has(seed.id)) continue;
    seen.add(seed.id);
    seeds.push(seed);
  }
  if (seeds.length < 4) return null;
  for (const filler of archetypeSeeds(archetype)) {
    if (seeds.length >= 8) break;
    if (seen.has(filler.id) || seen.has(slug(filler.name))) continue;
    seen.add(filler.id);
    seeds.push({ ...filler, lastActivityDaysAgo: DAYS[seeds.length] ?? filler.lastActivityDaysAgo });
  }
  return { profile, seeds };
}
