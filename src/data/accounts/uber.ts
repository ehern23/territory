import { defineAccount, dormancy } from "../builders";

/** Uber — mixed conditions with a young opportunity and a previously disqualified branch. Fictional people. */
export const uber = defineAccount({
  id: "uber",
  name: "Uber",
  ticker: "UBER",
  seed: 19086,
  sector: "Technology / mobility",
  season: "fall",
  thesis:
    "An engineering-led company with a public developer platform culture and a large, polyglot codebase. A young opportunity is forming in the Developer Platform organization; Freight was disqualified previously and is held dormant.",
  scale: { opportunity: 0.65, enterprise: 0.6, complexity: 0.75 },
  score: [
    { key: "technical-scale", label: "Developer / technical scale", value: 7, weight: 1.5, reasoning: "Several thousand engineers by public description.", evidenceType: "inference" },
    { key: "ai-intensity", label: "AI intensity", value: 8, weight: 1.2, reasoning: "Publicly documented ML platform and AI investment.", evidenceType: "verified" },
    { key: "engineering-complexity", label: "Engineering complexity", value: 8, weight: 0.8, reasoning: "Large monorepos across multiple languages, publicly described.", evidenceType: "verified" },
    { key: "seat-expansion", label: "Potential seat expansion", value: 7, weight: 1.3, reasoning: "Central platform adoption would cover most engineers.", evidenceType: "inference" },
    { key: "logo-value", label: "Strategic logo value", value: 7, weight: 0.8, reasoning: "Well-known engineering brand.", evidenceType: "inference" },
    { key: "surface-area", label: "Organizational surface area", value: 6, weight: 1, reasoning: "Five organizations mapped; one dormant.", evidenceType: "demo" },
    { key: "timing", label: "Timing signals", value: 7, weight: 1, reasoning: "Active developer platform conversations.", evidenceType: "demo" },
    { key: "governance-fit", label: "Enterprise / governance fit", value: 7, weight: 0.9, reasoning: "Mature security and procurement functions.", evidenceType: "inference" },
    { key: "competitive-friction", label: "Competitive friction", value: 6, weight: 0.9, reasoning: "Strong internal tooling culture; some incumbents likely.", evidenceType: "inference" },
  ],
  intelligence: [
    { id: "uber.root.blog", category: "Developer Tooling", title: "Public developer platform writing", summary: "Uber's engineering blog publicly documents its monorepos, build systems and developer platform work.", evidenceType: "verified", sourceLabel: "Uber Engineering Blog", sourceUrl: "https://www.uber.com/blog/engineering/" },
    { id: "uber.root.ml", category: "AI Adoption", title: "In-house ML platform", summary: "Uber has publicly described its internal machine learning platform and its use across the business.", evidenceType: "verified", sourceLabel: "Uber Engineering Blog", sourceUrl: "https://www.uber.com/blog/engineering/" },
    { id: "uber.root.polyglot", category: "Engineering Complexity", title: "Polyglot monorepos", summary: "Publicly described large monorepos in multiple languages; comprehension and navigation are real costs.", evidenceType: "verified", sourceLabel: "Uber Engineering Blog", sourceUrl: "https://www.uber.com/blog/engineering/" },
    { id: "uber.root.freight", category: "Timing Signals", title: "Freight previously disqualified", summary: "Demo state: prior outreach to the Freight technology group found no sponsor. Held dormant pending a leadership or strategy change.", evidenceType: "demo" },
    { id: "uber.root.hypothesis", category: "Executive Priorities", title: "Efficiency emphasis", summary: "Seller hypothesis: continued public emphasis on operating efficiency favors tooling with clear productivity evidence.", evidenceType: "inference" },
  ],
  businessUnits: [
    {
      id: "devplat", name: "Developer Platform", shortName: "Developer Platform", priority: "high", season: "fall",
      thesis: "Owns the engineering toolchain. A young opportunity is forming with a champion in place.",
      teams: [
        {
          id: "devex", name: "Developer Experience", fn: "developer-experience", size: 7, condition: "hot",
          rich: [
            { key: "devplat.dir-devex", name: "Juniper Mbeki", title: "Director, Developer Platform", persona: "Technical Buyer", influence: 4, status: "engaged", hypothesis: "Owns the toolchain roadmap; open to a scoped evaluation.", nextAction: "Define evaluation cohort.", lastTouch: "2026-08-26" },
            { key: "devplat.sem-devex", name: "Oren Zielinski", title: "Senior Engineering Manager, Developer Experience", persona: "Champion", influence: 3, status: "meeting", hypothesis: "Champion; ran an informal trial and wants a formal evaluation.", nextAction: "Prepare evaluation kickoff.", lastTouch: "2026-08-28" },
          ],
        },
        { id: "build", name: "Build & Release", fn: "platform", size: 5, condition: "warming" },
      ],
    },
    {
      id: "core", name: "Core Platform", shortName: "Core Platform", priority: "high", season: "summer",
      thesis: "Infrastructure and data platforms; warming behind the developer platform conversation.",
      teams: [
        { id: "infra", name: "Infrastructure", fn: "infrastructure", size: 6, condition: "warming" },
        { id: "data", name: "Data Platform", fn: "data-ai", size: 5, condition: "light" },
      ],
    },
    {
      id: "mobility", name: "Mobility Engineering", shortName: "Mobility", priority: "medium", season: "summer",
      thesis: "Product engineering for rides; follows platform decisions.",
      teams: [{ id: "rider", name: "Rider & Driver Apps", fn: "product-engineering", size: 6, condition: "light" }],
    },
    {
      id: "delivery", name: "Delivery Engineering", shortName: "Delivery", priority: "medium", season: "summer",
      thesis: "Product engineering for delivery; untouched.",
      teams: [{ id: "eats", name: "Delivery Apps", fn: "product-engineering", size: 5, condition: "untouched" }],
    },
    {
      id: "freight", name: "Freight Technology", shortName: "Freight", priority: "low", season: "winter", status: "dormant",
      thesis: "Logistics technology group; disqualified after earlier outreach found no sponsor.",
      dormancyReason: dormancy("previous-disqualification", "Earlier outreach found no sponsor and a small platform team already committed to existing tooling.", "Do not re-engage without a leadership change or a platform initiative."),
      reactivation: { signal: { type: "executive-change", strength: "strong", title: "New Freight engineering leadership", description: "A new head of engineering for Freight has been appointed with a stated focus on platform modernization.", evidenceType: "demo", sourceLabel: "Simulated signal" }, recommendation: "Re-engage Freight with the new engineering leader; reference the Developer Platform relationship." },
      teams: [{ id: "freight-eng", name: "Freight Engineering", fn: "product-engineering", size: 3, condition: "dormant", latent: 4 }],
    },
  ],
  opportunities: [
    {
      id: "devplat-eval", businessUnitId: "devplat", name: "Developer Platform Evaluation", stage: "Young", baselineMaturity: "young",
      stakeholders: ["devplat.dir-devex", "devplat.sem-devex"], champion: "devplat.sem-devex", baseMeetingCount: 1,
      signals: ["Informal trial completed"], nextStep: "Evaluation kickoff with a defined cohort.",
    },
  ],
  signals: [
    { id: "eng-blog", type: "technical-announcement", strength: "weak", title: "Developer platform writing", description: "Ongoing public engineering writing about developer platform work.", date: "2026-07-08", evidenceType: "verified", sourceLabel: "Uber Engineering Blog", sourceUrl: "https://www.uber.com/blog/engineering/" },
    { id: "trial", businessUnitId: "devplat", type: "developer-productivity", strength: "strong", title: "Informal trial completed", description: "A developer experience manager completed an informal trial and requested a formal evaluation.", date: "2026-08-28", evidenceType: "demo" },
  ],
});
