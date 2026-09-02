import { defineAccount } from "../builders";

/** Bank of America — mostly untouched summer canopy. Fictional people. */
export const bofa = defineAccount({
  id: "bofa",
  name: "Bank of America",
  ticker: "BAC",
  seed: 22019,
  sector: "Global financial services",
  season: "summer",
  thesis:
    "Large, well-funded technology organization with public AI ambitions. Almost entirely unworked: a healthy prospecting surface where the first task is simply to open the right doors.",
  scale: { opportunity: 0.9, enterprise: 0.95, complexity: 0.8 },
  score: [
    { key: "technical-scale", label: "Developer / technical scale", value: 9, weight: 1.5, reasoning: "Multi-billion-dollar annual technology spend has been publicly discussed.", evidenceType: "verified" },
    { key: "ai-intensity", label: "AI intensity", value: 7, weight: 1.2, reasoning: "Long-running consumer AI assistant and public AI investment commentary.", evidenceType: "verified" },
    { key: "engineering-complexity", label: "Engineering complexity", value: 8, weight: 0.8, reasoning: "Large, line-of-business-aligned engineering with central technology functions.", evidenceType: "inference" },
    { key: "seat-expansion", label: "Potential seat expansion", value: 9, weight: 1.3, reasoning: "Several distinct engineering organizations.", evidenceType: "inference" },
    { key: "logo-value", label: "Strategic logo value", value: 8, weight: 0.8, reasoning: "Top-tier regulated reference.", evidenceType: "inference" },
    { key: "surface-area", label: "Organizational surface area", value: 8, weight: 1, reasoning: "Five technology organizations mapped.", evidenceType: "demo" },
    { key: "timing", label: "Timing signals", value: 5, weight: 1, reasoning: "No specific developer-tooling trigger identified yet.", evidenceType: "inference" },
    { key: "governance-fit", label: "Enterprise / governance fit", value: 8, weight: 0.9, reasoning: "Regulated environment; enterprise controls required.", evidenceType: "inference" },
    { key: "competitive-friction", label: "Competitive friction", value: 5, weight: 0.9, reasoning: "Incumbent tooling likely; no evidence of a committed alternative.", evidenceType: "inference" },
  ],
  intelligence: [
    { id: "bofa.root.spend", category: "Developer Scale", title: "Large technology budget", summary: "Bank of America has publicly described annual technology spend in the low-teens of billions of dollars, with a meaningful share directed to new initiatives.", evidenceType: "verified", sourceLabel: "Public disclosures", sourceUrl: "https://newsroom.bankofamerica.com" },
    { id: "bofa.root.ai", category: "AI Adoption", title: "Consumer-facing AI assistant", summary: "The bank has operated a consumer virtual assistant for several years and talks publicly about AI investment.", evidenceType: "verified", sourceLabel: "Bank of America newsroom", sourceUrl: "https://newsroom.bankofamerica.com" },
    { id: "bofa.root.org", category: "Engineering Complexity", title: "Central technology with LOB alignment", summary: "Seller hypothesis: a central Global Technology function with engineering embedded in consumer, wealth, and markets organizations.", evidenceType: "inference" },
    { id: "bofa.root.competitive", category: "Competitive Environment", title: "No committed alternative observed", summary: "No public evidence of a standardized AI coding tool; assume incumbents are present but not entrenched.", evidenceType: "inference" },
    { id: "bofa.root.timing", category: "Timing Signals", title: "Awaiting trigger", summary: "No developer-tooling-specific trigger identified. First outreach should create the trigger, not wait for it.", evidenceType: "demo" },
  ],
  businessUnits: [
    {
      id: "gto", name: "Global Technology & Operations", shortName: "Global Technology", priority: "high", season: "summer",
      thesis: "Central technology organization; owns developer platforms and standards. The right first door.",
      teams: [
        {
          id: "devplat", name: "Developer Platforms", fn: "developer-experience", size: 8, condition: "light",
          rich: [
            { key: "gto.head-devplat", name: "Callum Grantham", title: "Head of Developer Platforms", persona: "Economic Buyer", influence: 5, hypothesis: "Owns paved paths for the bank's engineers. Any standard tool decision runs through him.", painPoints: ["Tool sprawl", "Consistent developer experience across LOBs"], nextAction: "Research recent platform announcements; draft a peer-referenced note." },
            { key: "gto.dir-devex", name: "Amara Oyelaran", title: "Director, Developer Experience", persona: "Technical Buyer", influence: 4, status: "contacted", hypothesis: "Responded to first outreach with a question about security review process.", nextAction: "Answer security question with a concise data-handling brief.", lastTouch: "2026-08-21" },
          ],
        },
        { id: "cloud", name: "Cloud & Infrastructure", fn: "infrastructure", size: 6, condition: "untouched" },
        { id: "data", name: "Enterprise Data & AI", fn: "data-ai", size: 6, condition: "untouched" },
      ],
    },
    {
      id: "consumer", name: "Consumer Banking Technology", shortName: "Consumer", priority: "medium", season: "summer",
      thesis: "Largest product engineering population; relevant once a central standard exists.",
      teams: [
        { id: "digital", name: "Digital Banking", fn: "product-engineering", size: 7, condition: "untouched" },
        { id: "payments", name: "Payments", fn: "product-engineering", size: 5, condition: "untouched" },
      ],
    },
    {
      id: "markets", name: "Global Markets Technology", shortName: "Markets", priority: "medium", season: "summer",
      thesis: "Complex, performance-sensitive codebases; strong fit but no active relationship.",
      teams: [
        { id: "trading", name: "Trading Technology", fn: "platform", size: 6, condition: "untouched" },
        { id: "risk", name: "Risk Technology", fn: "platform", size: 4, condition: "untouched" },
      ],
    },
    {
      id: "wealth", name: "Wealth Management Technology", shortName: "Wealth", priority: "low", season: "summer",
      thesis: "Relevant but lower priority until a central relationship exists.",
      teams: [{ id: "advisor", name: "Advisor Platforms", fn: "product-engineering", size: 5, condition: "untouched" }],
    },
    {
      id: "cyber", name: "Global Information Security", shortName: "Security", priority: "medium", season: "summer",
      thesis: "Engage early; security approval is on the critical path for any developer tool.",
      teams: [
        {
          id: "appsec", name: "Application Security", fn: "security", size: 4, condition: "light",
          rich: [
            { key: "cyber.dir-appsec", name: "Leandro Quintero", title: "Director, Application Security", persona: "Security", influence: 4, status: "researched", hypothesis: "Likely owner of third-party developer tool review.", nextAction: "Prepare a security brief before outreach." },
          ],
        },
      ],
    },
  ],
  opportunities: [],
  signals: [
    { id: "ai-commentary", type: "earnings-priority", strength: "moderate", title: "AI investment commentary", description: "Public commentary continues to emphasize technology and AI investment.", date: "2026-07-20", evidenceType: "verified", sourceLabel: "Public commentary", sourceUrl: "https://investor.bankofamerica.com" },
    { id: "devplat-roles", businessUnitId: "gto", type: "hiring-surge", strength: "weak", title: "Developer platform roles open", description: "A handful of open roles referencing developer platforms and internal tooling.", date: "2026-08-12", evidenceType: "demo" },
  ],
});
