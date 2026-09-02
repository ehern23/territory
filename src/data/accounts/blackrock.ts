import { defineAccount } from "../builders";

/** BlackRock — spring reactivation in progress. Fictional people. */
export const blackrock = defineAccount({
  id: "blackrock",
  name: "BlackRock",
  ticker: "BLK",
  seed: 55910,
  sector: "Asset management",
  season: "spring",
  thesis:
    "A technology-forward asset manager whose Aladdin platform is itself a software business. A fresh AI initiative has reopened an organization that had gone quiet: new leaves are emerging on a previously dormant branch.",
  scale: { opportunity: 0.7, enterprise: 0.7, complexity: 0.75 },
  score: [
    { key: "technical-scale", label: "Developer / technical scale", value: 7, weight: 1.5, reasoning: "Large engineering organization for an asset manager, anchored by the Aladdin platform.", evidenceType: "verified" },
    { key: "ai-intensity", label: "AI intensity", value: 8, weight: 1.2, reasoning: "Publicly announced AI capabilities inside the Aladdin platform.", evidenceType: "verified" },
    { key: "engineering-complexity", label: "Engineering complexity", value: 7, weight: 0.8, reasoning: "Platform business plus internal investment technology.", evidenceType: "inference" },
    { key: "seat-expansion", label: "Potential seat expansion", value: 7, weight: 1.3, reasoning: "Aladdin engineering is the primary expansion path.", evidenceType: "inference" },
    { key: "logo-value", label: "Strategic logo value", value: 8, weight: 0.8, reasoning: "Marquee financial technology reference.", evidenceType: "inference" },
    { key: "surface-area", label: "Organizational surface area", value: 6, weight: 1, reasoning: "Four organizations mapped.", evidenceType: "demo" },
    { key: "timing", label: "Timing signals", value: 8, weight: 1, reasoning: "Fresh AI initiative and hiring in a previously quiet organization.", evidenceType: "demo" },
    { key: "governance-fit", label: "Enterprise / governance fit", value: 8, weight: 0.9, reasoning: "Regulated, enterprise-controls oriented.", evidenceType: "inference" },
    { key: "competitive-friction", label: "Competitive friction", value: 4, weight: 0.9, reasoning: "No evidence of a committed alternative.", evidenceType: "inference" },
  ],
  intelligence: [
    { id: "blk.root.aladdin", category: "Developer Tooling", title: "Aladdin is a software business", summary: "BlackRock's Aladdin platform is offered to external clients, which means engineering quality and velocity are commercial concerns, not just internal ones.", evidenceType: "verified", sourceLabel: "BlackRock Aladdin", sourceUrl: "https://www.blackrock.com/aladdin" },
    { id: "blk.root.ai", category: "AI Adoption", title: "AI inside Aladdin", summary: "BlackRock has publicly announced generative AI capabilities within the Aladdin platform.", evidenceType: "verified", sourceLabel: "BlackRock newsroom", sourceUrl: "https://www.blackrock.com/corporate/newsroom" },
    { id: "blk.root.spring", category: "Timing Signals", title: "Reactivation under way", summary: "A simulated AI initiative signal has reopened the Wealth Technology organization. New stakeholders have surfaced and none have been worked yet.", evidenceType: "demo" },
    { id: "blk.root.exec", category: "Executive Priorities", title: "Technology as growth engine", summary: "Leadership publicly frames technology services as a growth pillar.", evidenceType: "verified", sourceLabel: "Investor communications", sourceUrl: "https://ir.blackrock.com" },
    { id: "blk.root.gov", category: "Security / Governance", title: "Client data sensitivity", summary: "Seller hypothesis: because Aladdin holds client portfolio data, model-data handling will be the first security question.", evidenceType: "inference" },
  ],
  businessUnits: [
    {
      id: "aladdin", name: "Aladdin Engineering", shortName: "Aladdin", priority: "high", season: "summer",
      thesis: "Core platform engineering. Early outreach underway; the largest technical population in the account.",
      teams: [
        {
          id: "core", name: "Core Platform", fn: "platform", size: 8, condition: "light",
          rich: [
            { key: "aladdin.md-eng", name: "Hugo Rasmussen", title: "Managing Director, Aladdin Engineering", persona: "Economic Buyer", influence: 5, hypothesis: "Owns Aladdin engineering. Would sponsor a platform-wide standard.", nextAction: "Sequence after a technical champion exists." },
            { key: "aladdin.dir-devex", name: "Zara Ikeda", title: "Director, Engineering Effectiveness", persona: "Technical Buyer", influence: 4, status: "contacted", hypothesis: "Runs engineering effectiveness; responded positively to a peer-referenced note.", nextAction: "Offer a short working session.", lastTouch: "2026-08-18" },
          ],
        },
        { id: "data", name: "Data Platform", fn: "data-ai", size: 5, condition: "light" },
        { id: "client", name: "Client Experience", fn: "product-engineering", size: 5, condition: "untouched" },
      ],
    },
    {
      id: "wealth", name: "Wealth Technology", shortName: "Wealth Tech", priority: "high", season: "spring", status: "reactivating",
      thesis: "Previously dormant. A new AI initiative and hiring wave have surfaced fresh, unworked stakeholders. Look again.",
      teams: [
        {
          id: "advisor", name: "Advisor Platform", fn: "product-engineering", size: 6, condition: "spring",
          rich: [
            { key: "wealth.head-ai", name: "Saoirse Vance", title: "Head of AI Engineering, Wealth (new)", persona: "Executive Sponsor", influence: 5, hypothesis: "Recently appointed to lead the wealth AI initiative. New leaders reset tooling decisions.", nextAction: "Research appointment and first public statements.", signals: ["New role created for AI initiative (demo)"] },
          ],
        },
        { id: "wealth-data", name: "Wealth Data", fn: "data-ai", size: 4, condition: "spring" },
      ],
    },
    {
      id: "systematic", name: "Systematic Investing", shortName: "Systematic", priority: "medium", season: "summer",
      thesis: "Quant research engineering; smaller but technically sophisticated.",
      teams: [{ id: "research-eng", name: "Research Engineering", fn: "data-ai", size: 5, condition: "light" }],
    },
    {
      id: "techops", name: "Technology & Operations", shortName: "Tech & Ops", priority: "low", season: "summer",
      thesis: "Corporate technology; relevant only after platform adoption.",
      teams: [{ id: "corp", name: "Corporate Engineering", fn: "infrastructure", size: 4, condition: "untouched" }],
    },
  ],
  opportunities: [
    {
      id: "aladdin-seed", businessUnitId: "aladdin", name: "Aladdin Engineering Effectiveness", stage: "Seed", baselineMaturity: "seed",
      stakeholders: ["aladdin.dir-devex", "aladdin.md-eng"], baseMeetingCount: 0, nextStep: "Convert the effectiveness director into a working session.",
    },
  ],
  signals: [
    { id: "wealth-ai", businessUnitId: "wealth", type: "ai-initiative", strength: "strong", title: "Wealth AI initiative announced", description: "New AI engineering leadership and open roles in Wealth Technology.", date: "2026-08-20", evidenceType: "demo" },
    { id: "aladdin-ai", type: "product-launch", strength: "moderate", title: "AI capabilities in Aladdin", description: "Public announcement of generative AI capabilities within the platform.", date: "2026-05-14", evidenceType: "verified", sourceLabel: "BlackRock newsroom", sourceUrl: "https://www.blackrock.com/corporate/newsroom" },
  ],
});
