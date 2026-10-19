import type {
  AccountSeed,
  SellerArchetype,
  SellerProfile,
  SellerRole,
  StakeholderSeed,
  UnitFunction,
} from "@/domain/profile";
import type { Persona, RelationshipStatus } from "@/domain/types";
import type { Tier } from "@/domain/commercial";
import { anthropic } from "./presets/anthropic";
import { datadog } from "./presets/datadog";
import { ramp } from "./presets/ramp";
import { snowflake } from "./presets/snowflake";
import { stripe } from "./presets/stripe";

/**
 * Unknown sellers. A keyword and known-company classifier picks an archetype,
 * and the archetype supplies a plausible ICP and eight target accounts, so any
 * input grows a sensible forest instantly and offline. Where a curated preset
 * covers the category, its targets are borrowed (with the seller's name
 * swapped in); otherwise targets come from a short list of well-known
 * companies with generated, clearly hypothetical organisations.
 */

export const ARCHETYPE_LABEL: Record<SellerArchetype, string> = {
  devtools: "Developer tools",
  payments: "Payments & fintech",
  spend: "Finance & spend",
  "ai-platform": "AI platform",
  "data-infra": "Data infrastructure",
  observability: "Observability",
  security: "Security",
  "hr-saas": "HR & people software",
  generic: "B2B software",
};

/* ------------------------------------------------------------------------ */
/* Classifier                                                                */
/* ------------------------------------------------------------------------ */

const KNOWN: Record<string, SellerArchetype> = {};
const known = (archetype: SellerArchetype, names: string[]) => names.forEach((n) => (KNOWN[n] = archetype));
known("payments", ["adyen", "checkout.com", "checkout", "paypal", "braintree", "square", "block", "marqeta", "plaid", "rapyd", "klarna", "affirm", "worldpay", "fiserv", "toast", "paddle", "chargebee", "recurly", "airwallex", "wise", "modern treasury", "mercury", "dwolla", "nuvei", "bolt", "afterpay", "visa", "mastercard"]);
known("spend", ["brex", "navan", "bill.com", "bill", "expensify", "coupa", "airbase", "spendesk", "pleo", "tipalti", "zip", "procurify", "emburse", "center", "divvy", "payhawk", "precoro", "vendr", "tropic", "rillet", "numeric", "floqast", "blackline"]);
known("devtools", ["github", "gitlab", "jetbrains", "replit", "sourcegraph", "postman", "linear", "netlify", "render", "launchdarkly", "circleci", "harness", "jfrog", "codeium", "tabnine", "warp", "supabase", "fly.io", "railway", "temporal", "sentry", "atlassian", "vercel", "cloudflare", "hashicorp", "docker", "buildkite", "graphite", "coderabbit", "factory", "augment", "poolside", "magic", "bolt.new", "lovable", "stackblitz", "neon", "planetscale", "retool", "mintlify", "stainless"]);
known("ai-platform", ["mistral", "mistral ai", "cohere", "xai", "perplexity", "together", "together ai", "hugging face", "huggingface", "scale", "scale ai", "glean", "writer", "jasper", "harvey", "sierra", "decagon", "hebbia", "runway", "elevenlabs", "ai21", "character.ai", "fireworks", "fireworks ai", "baseten", "modal", "replicate", "groq", "cerebras", "deepmind", "google deepmind", "meta ai", "inflection", "adept", "moveworks", "aisera", "abridge", "ambience", "hippocratic"]);
known("data-infra", ["databricks", "confluent", "fivetran", "dbt", "dbt labs", "clickhouse", "mongodb", "elastic", "redis", "cockroach", "cockroach labs", "starburst", "teradata", "cloudera", "airbyte", "hex", "sigma", "sigma computing", "thoughtspot", "looker", "tableau", "alteryx", "informatica", "collibra", "alation", "monte carlo", "pinecone", "weaviate", "motherduck", "singlestore", "couchbase", "datastax", "palantir"]);
known("observability", ["new relic", "dynatrace", "grafana", "grafana labs", "honeycomb", "chronosphere", "splunk", "pagerduty", "sumo logic", "observe", "logz.io", "lightstep", "appdynamics", "solarwinds", "incident.io", "rootly", "firehydrant", "cribl"]);
known("security", ["crowdstrike", "palo alto networks", "palo alto", "wiz", "okta", "zscaler", "sentinelone", "snyk", "1password", "abnormal", "abnormal security", "netskope", "rapid7", "tenable", "vanta", "drata", "lacework", "orca", "orca security", "arctic wolf", "proofpoint", "mimecast", "fortinet", "check point", "cyberark", "sailpoint", "beyond identity", "chainguard", "semgrep", "socket", "island", "huntress", "expel", "tanium", "illumio", "axonius", "material security"]);
known("hr-saas", ["rippling", "gusto", "deel", "workday", "lattice", "greenhouse", "bamboohr", "remote", "hibob", "culture amp", "ashby", "justworks", "adp", "paylocity", "paycom", "ukg", "personio", "oyster", "papaya global", "eightfold", "gem", "lever", "leapsome", "15five", "betterworks", "cornerstone", "docebo", "degreed"]);
known("generic", ["salesforce", "hubspot", "gong", "outreach", "zoominfo", "clari", "notion", "asana", "monday", "monday.com", "zoom", "docusign", "servicenow", "slack", "miro", "airtable", "box", "dropbox", "intercom", "zendesk", "twilio", "klaviyo", "braze", "apollo", "salesloft", "highspot", "seismic", "6sense", "clay", "attio", "figma", "canva", "loom", "calendly"]);

const KEYWORDS: [SellerArchetype, RegExp][] = [
  ["observability", /\b(observ|monitor|logging|logs?|trac(e|ing)|metrics?|apm|incident|uptime|telemetry)/],
  ["security", /\b(secur|cyber|threat|identity|auth|guard|shield|defen[cs]|zero ?trust|vault|siem|soc\b|compliance)/],
  ["spend", /\b(spend|expense|procure|purchas|invoice|payables|\bap\b|card|corporate card|treasury|accounting|close|bookkeep|cfo)/],
  ["payments", /\b(pay|payments?|checkout|merchant|acquir|billing|fintech|bank|lend|loan|wallet|remit|money|cash)/],
  ["hr-saas", /\b(hr|people|payroll|talent|recruit|hiring|hire|benefits?|workforce|employee|onboard)/],
  ["ai-platform", /(\bai\b|\.ai\b|\bllm|\bgpt|\bmodel|\bagent|intelligen|neural|cognit|\bml\b|machine learning|copilot|assistant)/],
  ["data-infra", /\b(data|db\b|database|warehouse|lake|stream|analytics|query|sql|etl|pipeline|vector|bi\b)/],
  ["devtools", /\b(dev|code|coding|git|ci\b|cd\b|deploy|api|sdk|cloud|stack|build|test|ide\b|software|engineer|platform|ops\b)/],
];

/** Pick a plausible seller archetype from a company name. */
export function classifySeller(company: string): SellerArchetype {
  const name = company.trim().toLowerCase().replace(/\s+/g, " ");
  if (!name) return "generic";
  const bare = name.replace(/,?\s+(inc|inc\.|llc|ltd|corp|corporation|co|company|labs|technologies|technology|hq)\.?$/, "").trim();
  if (KNOWN[name]) return KNOWN[name];
  if (KNOWN[bare]) return KNOWN[bare];
  for (const [archetype, re] of KEYWORDS) if (re.test(name)) return archetype;
  return "generic";
}

/* ------------------------------------------------------------------------ */
/* Archetype profiles                                                        */
/* ------------------------------------------------------------------------ */

interface ArchetypeCopy {
  product: (company: string) => string;
  category: string;
  motion: string;
  icp: string;
  valueProps: string[];
  personas: string[];
}

const COPY: Record<SellerArchetype, ArchetypeCopy> = {
  payments: {
    product: (c) => `${c} payments and financial infrastructure`,
    category: "payments infrastructure",
    motion: "payments modernization",
    icp: "Digital-first enterprises, marketplaces and subscription businesses with complex, multi-country money movement.",
    valueProps: ["Higher authorization rates and lower cost of acceptance", "Global payment methods through one integration", "Payouts and onboarding for platforms", "Recurring billing without custom code"],
    personas: ["Head of Payments", "CFO / VP Finance", "VP Engineering", "Director, Revenue Operations"],
  },
  spend: {
    product: (c) => `${c} spend management and finance automation`,
    category: "spend management",
    motion: "finance automation",
    icp: "Multi-entity, fast-growing companies whose finance teams are buried in expenses, invoices and month-end reconciliation.",
    valueProps: ["Policy enforced before the spend happens", "AP automation from invoice to payment", "A faster close", "Real-time spend visibility"],
    personas: ["CFO", "Corporate Controller", "VP, Finance", "AP Manager", "Head of Procurement"],
  },
  "ai-platform": {
    product: (c) => `${c} enterprise AI platform`,
    category: "enterprise AI",
    motion: "enterprise AI deployment",
    icp: "Large enterprises with heavy knowledge work and large engineering organizations that need capable, governed AI.",
    valueProps: ["Capable models for complex work", "Agents for coding and operations", "Enterprise security and governance", "Deployment options that fit existing clouds"],
    personas: ["CIO / CTO", "Chief Data & AI Officer", "VP Engineering", "CISO", "Head of AI Platform"],
  },
  "data-infra": {
    product: (c) => `${c} data platform`,
    category: "data platform",
    motion: "data platform consolidation",
    icp: "Data-heavy enterprises consolidating warehouses and pipelines, sharing data with partners and building AI on governed data.",
    valueProps: ["One governed platform for analytics and AI", "Lower cost through consolidation", "Secure data sharing", "Elastic scale"],
    personas: ["Chief Data Officer", "VP Data Engineering", "Head of Analytics", "CIO"],
  },
  observability: {
    product: (c) => `${c} observability platform`,
    category: "observability",
    motion: "observability consolidation",
    icp: "Cloud-native, high-scale digital businesses with many services, especially those consolidating monitoring tools.",
    valueProps: ["Correlated metrics, traces and logs", "Tool consolidation", "Faster incident resolution", "Telemetry cost control"],
    personas: ["VP Infrastructure", "Head of SRE", "Director, Platform Engineering", "VP Engineering"],
  },
  devtools: {
    product: (c) => `${c} developer platform`,
    category: "developer tooling",
    motion: "developer platform standardization",
    icp: "Engineering organizations with hundreds to thousands of developers that want faster, safer delivery and a consistent toolchain.",
    valueProps: ["Faster delivery with less toil", "A consistent paved path across teams", "Enterprise security and governance", "Measurable developer productivity"],
    personas: ["VP Engineering", "Head of Developer Experience", "Director, Platform Engineering", "CISO"],
  },
  security: {
    product: (c) => `${c} security platform`,
    category: "security",
    motion: "security consolidation",
    icp: "Large, regulated or high-target enterprises consolidating security tooling across cloud, identity and operations.",
    valueProps: ["Fewer tools, better coverage", "Faster detection and response", "Audit-ready compliance evidence", "Cloud and identity in one view"],
    personas: ["CISO", "Director, Security Operations", "Head of Cloud Security", "Director, Identity"],
  },
  "hr-saas": {
    product: (c) => `${c} people platform`,
    category: "people software",
    motion: "HR platform consolidation",
    icp: "Large, distributed employers with frontline or global workforces and fragmented HR, payroll and talent systems.",
    valueProps: ["One system for the employee lifecycle", "Faster hiring and onboarding", "Payroll accuracy across regions", "Better workforce data"],
    personas: ["Chief People Officer", "VP, People Operations", "Director, Talent Acquisition", "Payroll Director"],
  },
  generic: {
    product: (c) => `${c} platform`,
    category: "business software",
    motion: "operations modernization",
    icp: "Large enterprises with complex operations looking to modernize processes, consolidate tools and show measurable ROI.",
    valueProps: ["Measurable productivity gains", "Tool consolidation", "Enterprise security and controls", "Fast time to value"],
    personas: ["COO", "CIO", "VP, Operations", "VP, Finance"],
  },
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "seller";
}

export function archetypeProfile(company: string, role: SellerRole, archetype = classifySeller(company)): SellerProfile {
  const name = company.trim().replace(/\s+/g, " ").slice(0, 60) || "Your company";
  const copy = COPY[archetype];
  return {
    id: `custom:${slugify(name)}`,
    company: name,
    productName: name,
    product: copy.product(name),
    category: copy.category,
    role,
    territoryLabel: `${name} Enterprise`,
    motion: copy.motion,
    icp: copy.icp,
    valueProps: copy.valueProps,
    personas: copy.personas,
    archetype,
    source: "archetype",
  };
}

/* ------------------------------------------------------------------------ */
/* Archetype targets                                                         */
/* ------------------------------------------------------------------------ */

/** Curated presets whose targets transfer to a category peer. */
const BORROW: Partial<Record<SellerArchetype, AccountSeed[]>> = {
  payments: stripe.seeds,
  spend: ramp.seeds,
  "ai-platform": anthropic.seeds,
  "data-infra": snowflake.seeds,
  observability: datadog.seeds,
};

/** Borrowed seeds must not carry another vendor's product names. */
function debrand(seeds: AccountSeed[]): AccountSeed[] {
  const strip = (s: string) => s.replace(/\{product\} (Code|Enterprise)\b/g, "{product}");
  const json = JSON.stringify(seeds);
  return JSON.parse(strip(json)) as AccountSeed[];
}

interface Template {
  units: [name: string, fn: UnitFunction, thesis: string][];
  people: [title: string, persona: Persona, influence: 1 | 2 | 3 | 4 | 5, unit: number][];
  plays: [visible: string, expansion: string];
  reasons: string[];
  targets: [name: string, sector: string][];
}

const TEMPLATES: Partial<Record<SellerArchetype, Template>> = {
  devtools: {
    units: [
      ["Engineering Platform", "developer-experience", "Owns shared developer tooling and standards."],
      ["Product Engineering", "product-engineering", "Large delivery teams under release pressure."],
      ["Cloud Infrastructure", "infrastructure", "Cloud and runtime platforms."],
      ["Security Engineering", "security", "Reviews any tool that touches source code; no trigger yet."],
    ],
    people: [
      ["Director, Developer Experience", "Technical Buyer", 4, 0],
      ["Staff Engineer, Developer Tools", "Champion", 3, 0],
      ["VP, Engineering", "Executive Sponsor", 5, 0],
      ["Director, Application Security", "Security", 3, 0],
      ["Director, Product Engineering", "Technical Buyer", 4, 1],
      ["Head of Cloud Platform", "Influencer", 4, 2],
    ],
    plays: ["{product} pilot for platform teams", "Engineering-wide {product} standard"],
    reasons: ["a large engineering organization", "many teams shipping on shared platforms", "pressure to deliver faster without adding risk"],
    targets: [["Goldman Sachs", "Investment banking"], ["Shopify", "Commerce platform"], ["Netflix", "Streaming"], ["T-Mobile", "Telecommunications"], ["Expedia Group", "Online travel"], ["Lyft", "Mobility"], ["Etsy", "Online marketplace"], ["Toyota Motor North America", "Automotive"]],
  },
  security: {
    units: [
      ["Security Operations", "security", "Detection, response and the security operations center."],
      ["Identity & Access", "security", "Workforce and customer identity."],
      ["Cloud Platform", "infrastructure", "Cloud accounts, workloads and posture."],
      ["Governance, Risk & Compliance", "security", "Audit and policy; no trigger yet."],
    ],
    people: [
      ["Director, Security Operations", "Technical Buyer", 4, 0],
      ["Senior Manager, Detection Engineering", "Champion", 3, 0],
      ["Chief Information Security Officer", "Executive Sponsor", 5, 0],
      ["Head of Security Architecture", "Security", 3, 0],
      ["Director, Identity Engineering", "Technical Buyer", 4, 1],
      ["Head of Cloud Security", "Influencer", 4, 2],
    ],
    plays: ["{product} for the security operations center", "Enterprise-wide {product} consolidation"],
    reasons: ["a large, high-value attack surface", "regulatory and audit pressure", "tool sprawl across cloud, identity and operations"],
    targets: [["Bank of America", "Banking"], ["Kaiser Permanente", "Health care"], ["Lockheed Martin", "Aerospace and defense"], ["Johnson & Johnson", "Health care products"], ["State Farm", "Insurance"], ["The Home Depot", "Home improvement retail"], ["Moderna", "Biotechnology"], ["Twilio", "Communications platform"]],
  },
  "hr-saas": {
    units: [
      ["People Operations", "people", "HR operations and systems."],
      ["Talent Acquisition", "people", "Recruiting at volume."],
      ["Finance & Payroll", "finance", "Payroll and workforce costs."],
      ["Learning & Development", "people", "Training programs; no trigger yet."],
    ],
    people: [
      ["VP, People Operations", "Technical Buyer", 4, 0],
      ["People Systems Manager", "Champion", 3, 0],
      ["Chief People Officer", "Executive Sponsor", 5, 0],
      ["Director, HR Technology", "Influencer", 3, 0],
      ["Director, Talent Acquisition", "Technical Buyer", 4, 1],
      ["Payroll Director", "Influencer", 4, 2],
    ],
    plays: ["{product} for people operations", "Global people platform consolidation"],
    reasons: ["a large, distributed workforce", "high-volume hiring", "fragmented HR and payroll systems"],
    targets: [["HCA Healthcare", "Health care"], ["Chipotle Mexican Grill", "Restaurants"], ["Accenture", "Professional services"], ["Salesforce", "Enterprise software"], ["Dollar General", "Retail"], ["Hyatt Hotels", "Hospitality"], ["Cintas", "Business services"], ["Mayo Clinic", "Health care"]],
  },
  generic: {
    units: [
      ["Business Operations", "operations", "Core operating processes."],
      ["Information Technology", "business", "Enterprise applications and vendor decisions."],
      ["Finance", "finance", "Budgets, controls and ROI cases."],
      ["Customer Experience", "revenue", "Customer-facing programs; no trigger yet."],
    ],
    people: [
      ["Director, Business Operations", "Technical Buyer", 4, 0],
      ["Senior Manager, Process Excellence", "Champion", 3, 0],
      ["Chief Operating Officer", "Executive Sponsor", 5, 0],
      ["Director, IT Risk", "Security", 3, 0],
      ["Director, Enterprise Applications", "Technical Buyer", 4, 1],
      ["VP, Finance", "Influencer", 4, 2],
    ],
    plays: ["{product} pilot in operations", "Enterprise-wide {product} rollout"],
    reasons: ["complex, multi-site operations", "a mandate to consolidate tools", "pressure to show measurable ROI"],
    targets: [["Honeywell", "Industrial technology"], ["3M", "Diversified manufacturing"], ["Medtronic", "Medical devices"], ["Deloitte", "Professional services"], ["Schneider Electric", "Energy management"], ["Thermo Fisher Scientific", "Life sciences tools"], ["Emerson", "Industrial automation"], ["Marsh McLennan", "Professional services"]],
  },
};

const TIERS: Tier[] = [1, 1, 1, 2, 2, 2, 3, 3];
const POTENTIAL = [4_800_000, 3_900_000, 3_400_000, 2_600_000, 2_400_000, 2_100_000, 1_600_000, 1_400_000];
const DAYS = [2, 6, 12, 24, 9, 31, 40, 82];
const LAST = [
  "Pilot scoping call with the champion",
  "Working session with the technical buyer",
  "Discovery agenda shared",
  "Follow-up sent after the first call",
  "Evaluation criteria agreed",
  "Discovery meeting",
  "Reference requested",
  "Intro call",
];

/** Relationship warmth by position, so the forest shows the full range of health. */
function statusFor(index: number, person: number): RelationshipStatus {
  if (index === 0) return (["meeting", "engaged", "unworked", "engaged", "researched", "unworked"] as const)[person];
  const warm = index <= 2 || index === 4;
  const cold = index >= 6;
  if (person === 0) return cold ? "contacted" : "engaged";
  if (person === 1) return warm ? "engaged" : cold ? "researched" : "contacted";
  if (person === 4) return warm ? "contacted" : "researched";
  return "unworked";
}

function templateSeeds(t: Template, archetype: SellerArchetype): AccountSeed[] {
  return t.targets.map(([name, sector], index) => {
    const flagship = index === 0;
    const withDormant = flagship || index % 3 === 1;
    const unitCount = withDormant ? 4 : 3;
    const units = t.units.slice(0, unitCount).map(([uname, fn, thesis], u) => ({
      key: `u${u}`,
      name: uname,
      status: (u === 3 ? "dormant" : "active") as "active" | "dormant",
      thesis: u === 3 ? `${thesis} Held dormant in this demo.` : thesis,
      fn,
      size: u === 0 ? 1.3 : 1,
    }));
    const peopleIdx = flagship ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 4];
    const stakeholders: StakeholderSeed[] = peopleIdx.map((p, n) => {
      const [title, persona, influence, unitIdx] = t.people[p];
      return {
        key: `p${p}`,
        title,
        persona,
        influence,
        unit: `u${Math.min(unitIdx, 2)}`,
        status: statusFor(index, flagship ? n : p),
        hypothesis:
          persona === "Executive Sponsor"
            ? "Would sponsor a broad rollout. Generated stakeholder; verify the real org before outreach."
            : persona === "Champion"
              ? "Likely day-to-day champion if the pilot shows results. Generated stakeholder."
              : "Generated stakeholder from the archetype; title is typical for this kind of organization.",
      };
    });
    const reason = t.reasons[index % t.reasons.length];
    return {
      id: name,
      name,
      sector,
      tier: TIERS[index],
      potentialArr: POTENTIAL[index],
      motion: COPY[archetype].motion,
      lastActivityDaysAgo: DAYS[index],
      lastActivity: LAST[index],
      thesis: `${name} plausibly fits a ${COPY[archetype].category} ICP: ${reason}. Generated from the ${ARCHETYPE_LABEL[archetype].toLowerCase()} archetype rather than research, so organisations and people are illustrative.`,
      units,
      stakeholders,
      opportunities: flagship
        ? [
            { key: "pilot", name: t.plays[0], unit: "u0", value: 1_400_000, stage: "Qualified", stakeholders: ["p0", "p1"], champion: "p1", nextStep: "Expand the pilot and agree success metrics." },
            { key: "expand", name: t.plays[1], unit: "u0", value: 2_800_000, stage: "Forming", stakeholders: ["p2", "p3", "p4", "p5"], champion: "p3", nextStep: "Executive review of pilot outcomes." },
          ]
        : [
            {
              key: "pilot",
              name: t.plays[0],
              unit: "u0",
              value: Math.round(POTENTIAL[index] * 0.3),
              stage: index <= 2 || index === 4 ? "Qualified" : "Discovery",
              stakeholders: ["p0", "p1"],
              champion: "p1",
              nextStep: index >= 6 ? "Re-open the thread; the last touch was weeks ago." : "Agree a scoped pilot and success metrics.",
            },
          ],
      signals: [
        { title: `${units[0].name} initiative`, description: "Illustrative signal generated for the demo.", type: "platform-migration", strength: index <= 2 ? "strong" : "moderate", unit: "u0" },
      ],
      intelligence: [
        { category: "Business Model", title: sector, summary: `${name} operates in ${sector.toLowerCase()}. Beyond name and sector, nothing here is asserted about the company.` },
        { category: "Executive Priorities", title: "Archetype hypothesis", summary: `Seller hypothesis: ${reason} makes ${COPY[archetype].category} relevant. Verify before outreach.` },
      ],
    } satisfies AccountSeed;
  });
}

/** Eight target seeds for an archetype. Deterministic. */
export function archetypeSeeds(archetype: SellerArchetype): AccountSeed[] {
  const borrowed = BORROW[archetype];
  if (borrowed) return debrand(borrowed);
  return templateSeeds(TEMPLATES[archetype] ?? TEMPLATES.generic!, archetype);
}
