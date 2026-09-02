import { defineAccount } from "../builders";

/** Meta — growing opportunity fruit under real competitive friction. Fictional people. */
export const meta = defineAccount({
  id: "meta",
  name: "Meta",
  ticker: "META",
  seed: 30977,
  sector: "Technology",
  season: "fall",
  thesis:
    "An enormous, AI-native engineering organization that builds much of its own tooling. Friction is real, but an opportunity in Developer Infrastructure has grown through multiple conversations and is now the most mature fruit in the territory.",
  scale: { opportunity: 0.9, enterprise: 0.9, complexity: 0.9 },
  score: [
    { key: "technical-scale", label: "Developer / technical scale", value: 10, weight: 1.5, reasoning: "Tens of thousands of engineers by public description.", evidenceType: "verified" },
    { key: "ai-intensity", label: "AI intensity", value: 10, weight: 1.2, reasoning: "Publicly develops frontier open-weight models and internal AI coding assistance.", evidenceType: "verified" },
    { key: "engineering-complexity", label: "Engineering complexity", value: 9, weight: 0.8, reasoning: "Monorepo-scale infrastructure with heavy internal tooling.", evidenceType: "verified" },
    { key: "seat-expansion", label: "Potential seat expansion", value: 9, weight: 1.3, reasoning: "Very large engineering population.", evidenceType: "inference" },
    { key: "logo-value", label: "Strategic logo value", value: 9, weight: 0.8, reasoning: "Marquee engineering reference.", evidenceType: "inference" },
    { key: "surface-area", label: "Organizational surface area", value: 8, weight: 1, reasoning: "Five organizations mapped.", evidenceType: "demo" },
    { key: "timing", label: "Timing signals", value: 7, weight: 1, reasoning: "Active conversations; internal tooling roadmap unknown.", evidenceType: "demo" },
    { key: "governance-fit", label: "Enterprise / governance fit", value: 6, weight: 0.9, reasoning: "Sophisticated buyer with strong internal opinions on tooling.", evidenceType: "inference" },
    { key: "competitive-friction", label: "Competitive friction", value: 9, weight: 0.9, reasoning: "Publicly documented internal AI coding tools; strong build culture.", evidenceType: "verified" },
  ],
  intelligence: [
    { id: "meta.root.llama", category: "AI Adoption", title: "Frontier open-weight models", summary: "Meta publicly develops and releases the Llama family of open-weight models.", evidenceType: "verified", sourceLabel: "Meta AI", sourceUrl: "https://ai.meta.com" },
    { id: "meta.root.internal", category: "Competitive Environment", title: "Internal AI coding assistance", summary: "Meta's engineering blog has publicly described internal AI-assisted coding tools. Expect a build-versus-buy conversation.", evidenceType: "verified", sourceLabel: "Engineering at Meta", sourceUrl: "https://engineering.fb.com" },
    { id: "meta.root.monorepo", category: "Engineering Complexity", title: "Monorepo-scale infrastructure", summary: "Publicly documented large monorepo and custom developer infrastructure.", evidenceType: "verified", sourceLabel: "Engineering at Meta", sourceUrl: "https://engineering.fb.com" },
    { id: "meta.root.fit", category: "Developer Tooling", title: "Fit requires integration depth", summary: "Seller hypothesis: adoption depends on fitting into custom developer infrastructure rather than replacing it. The opportunity is complementary, not substitutive.", evidenceType: "inference" },
    { id: "meta.root.momentum", category: "Timing Signals", title: "Multi-conversation momentum", summary: "Demo state: several positive multi-stakeholder conversations in Developer Infrastructure have matured the opportunity.", evidenceType: "demo" },
  ],
  businessUnits: [
    {
      id: "infra", name: "Infrastructure", shortName: "Infrastructure", priority: "high", season: "fall",
      thesis: "Owns developer infrastructure. Deep, multithreaded engagement and the most mature opportunity in the territory.",
      teams: [
        {
          id: "devinfra", name: "Developer Infrastructure", fn: "developer-experience", size: 8, condition: "hot",
          rich: [
            { key: "infra.dir-devinfra", name: "Rhea Bhatt", title: "Director, Developer Infrastructure", persona: "Technical Buyer", influence: 5, status: "meeting", hypothesis: "Owns the developer infrastructure roadmap; the decision maker for complementary tooling.", nextAction: "Present integration architecture at the next working session.", lastTouch: "2026-08-28" },
            { key: "infra.pe-devinfra", name: "Soren Jansen", title: "Principal Engineer, Developer Tools", persona: "Champion", influence: 4, status: "engaged", hypothesis: "Champion who has advocated complementary tooling internally.", nextAction: "Co-author internal proposal.", lastTouch: "2026-08-26" },
            { key: "infra.em-ide", name: "Xiomara Reyes-Olmo", title: "Engineering Manager, IDE Platform", persona: "Influencer", influence: 3, status: "engaged", hypothesis: "Runs the internal IDE platform team; integration partner.", nextAction: "Schedule integration deep-dive.", lastTouch: "2026-08-24" },
          ],
        },
        { id: "core-systems", name: "Core Systems", fn: "infrastructure", size: 5, condition: "warming" },
        { id: "ai-infra", name: "AI Infrastructure", fn: "data-ai", size: 6, condition: "light" },
      ],
    },
    {
      id: "foa", name: "Family of Apps Engineering", shortName: "Family of Apps", priority: "medium", season: "summer",
      thesis: "Product engineering at scale; adoption follows infrastructure decisions.",
      teams: [
        { id: "product-eng", name: "Product Engineering", fn: "product-engineering", size: 6, condition: "warming" },
        { id: "growth", name: "Growth Engineering", fn: "product-engineering", size: 4, condition: "untouched" },
      ],
    },
    {
      id: "rl", name: "Reality Labs", shortName: "Reality Labs", priority: "medium", season: "summer",
      thesis: "Hardware and software engineering with different toolchains; light outreach.",
      teams: [{ id: "rl-software", name: "Reality Labs Software", fn: "product-engineering", size: 5, condition: "light" }],
    },
    {
      id: "monetization", name: "Monetization", shortName: "Monetization", priority: "low", season: "summer",
      thesis: "Ads engineering; relevant after the infrastructure decision.",
      teams: [{ id: "ads-eng", name: "Ads Engineering", fn: "product-engineering", size: 4, condition: "untouched" }],
    },
    {
      id: "integrity", name: "Integrity & Security", shortName: "Integrity", priority: "medium", season: "summer",
      thesis: "Security review participants for any external tool.",
      teams: [{ id: "prodsec", name: "Product Security", fn: "security", size: 4, condition: "light" }],
    },
  ],
  opportunities: [
    {
      id: "devinfra", businessUnitId: "infra", name: "Developer Infrastructure Complementary Tooling", stage: "Growing",
      baselineMaturity: "growing", stakeholders: ["infra.dir-devinfra", "infra.pe-devinfra", "infra.em-ide"],
      champion: "infra.pe-devinfra", baseMeetingCount: 4, signals: ["Integration deep-dive scheduled", "Internal proposal co-authored"],
      nextStep: "Integration architecture review with the IDE platform team.",
    },
  ],
  signals: [
    { id: "internal-tools", type: "technical-announcement", strength: "moderate", title: "Internal AI coding tools described publicly", description: "Engineering blog posts describing internal AI-assisted development.", date: "2026-05-20", evidenceType: "verified", sourceLabel: "Engineering at Meta", sourceUrl: "https://engineering.fb.com" },
    { id: "deep-dive", businessUnitId: "infra", type: "developer-productivity", strength: "strong", title: "Integration deep-dive scheduled", description: "IDE platform team scheduled an integration deep-dive.", date: "2026-08-24", evidenceType: "demo" },
  ],
});
