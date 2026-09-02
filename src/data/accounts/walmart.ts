import { defineAccount, dormancy } from "../builders";

/** Walmart — significant dormant branches beside a warming platform organization. Fictional people. */
export const walmart = defineAccount({
  id: "walmart",
  name: "Walmart",
  ticker: "WMT",
  seed: 73301,
  sector: "Retail",
  season: "summer",
  thesis:
    "A retailer that operates like a technology company at the center, with a large platform engineering organization and public in-house ML platform work. Several business-aligned technology groups are deliberately held dormant.",
  scale: { opportunity: 0.85, enterprise: 1, complexity: 0.85 },
  score: [
    { key: "technical-scale", label: "Developer / technical scale", value: 9, weight: 1.5, reasoning: "Walmart Global Tech is a very large engineering organization by public description.", evidenceType: "verified" },
    { key: "ai-intensity", label: "AI intensity", value: 8, weight: 1.2, reasoning: "Publicly documented internal ML platform and generative AI initiatives.", evidenceType: "verified" },
    { key: "engineering-complexity", label: "Engineering complexity", value: 8, weight: 0.8, reasoning: "Stores, supply chain, e-commerce, advertising and membership businesses each carry technology.", evidenceType: "inference" },
    { key: "seat-expansion", label: "Potential seat expansion", value: 8, weight: 1.3, reasoning: "Central platform adoption could propagate to business-aligned groups.", evidenceType: "inference" },
    { key: "logo-value", label: "Strategic logo value", value: 8, weight: 0.8, reasoning: "Flagship retail reference.", evidenceType: "inference" },
    { key: "surface-area", label: "Organizational surface area", value: 7, weight: 1, reasoning: "Five organizations mapped; two dormant.", evidenceType: "demo" },
    { key: "timing", label: "Timing signals", value: 6, weight: 1, reasoning: "Platform engineering conversation active; business groups quiet.", evidenceType: "demo" },
    { key: "governance-fit", label: "Enterprise / governance fit", value: 7, weight: 0.9, reasoning: "Large enterprise with mature procurement.", evidenceType: "inference" },
    { key: "competitive-friction", label: "Competitive friction", value: 5, weight: 0.9, reasoning: "Strong internal platform culture; may prefer build over buy in places.", evidenceType: "inference" },
  ],
  intelligence: [
    { id: "walmart.root.tech", category: "Developer Scale", title: "Walmart Global Tech", summary: "Walmart publicly operates a large central technology organization, Walmart Global Tech, with engineering hubs in several countries.", evidenceType: "verified", sourceLabel: "Walmart Global Tech", sourceUrl: "https://tech.walmart.com" },
    { id: "walmart.root.ml", category: "AI Adoption", title: "In-house ML platform", summary: "Walmart has publicly written about its internal machine learning platform and generative AI applications across the business.", evidenceType: "verified", sourceLabel: "Walmart Global Tech blog", sourceUrl: "https://tech.walmart.com" },
    { id: "walmart.root.build", category: "Competitive Environment", title: "Build-over-buy tendency", summary: "Seller hypothesis: strong internal platform culture means adoption depends on fitting inside existing paved paths rather than replacing them.", evidenceType: "inference" },
    { id: "walmart.root.supply", category: "Transformation Initiatives", title: "Supply chain automation", summary: "Publicly discussed automation and technology investment in supply chain and stores.", evidenceType: "verified", sourceLabel: "Walmart corporate news", sourceUrl: "https://corporate.walmart.com/news" },
    { id: "walmart.root.dormant", category: "Timing Signals", title: "Business groups held dormant", summary: "Advertising and membership technology groups show no current trigger; capacity is deliberately concentrated on the platform organization.", evidenceType: "demo" },
  ],
  businessUnits: [
    {
      id: "wgt", name: "Walmart Global Tech", shortName: "Global Tech", priority: "high", season: "fall",
      thesis: "Central engineering organization. Platform Engineering is in active conversation; a bud of opportunity is forming.",
      teams: [
        {
          id: "platform", name: "Platform Engineering", fn: "platform", size: 8, condition: "warming",
          rich: [
            { key: "wgt.vp-platform", name: "Esme Calloway", title: "VP, Platform Engineering", persona: "Economic Buyer", influence: 5, status: "engaged", hypothesis: "Owns the developer platform for the central org. Engaged after a peer reference; cautious about anything outside the paved path.", painPoints: ["Consistency across hubs", "Developer onboarding"], nextAction: "Bring a paved-path integration proposal.", lastTouch: "2026-08-22" },
            { key: "wgt.dir-devex", name: "Tariq Nakamura", title: "Director, Developer Experience", persona: "Champion", influence: 4, status: "engaged", hypothesis: "Wants to run a measured pilot; asked about productivity metrics.", nextAction: "Share pilot measurement plan.", lastTouch: "2026-08-27" },
          ],
        },
        { id: "element", name: "ML Platform", fn: "data-ai", size: 6, condition: "light" },
        { id: "cloud", name: "Cloud Engineering", fn: "infrastructure", size: 5, condition: "untouched" },
      ],
    },
    {
      id: "stores", name: "Stores Technology", shortName: "Stores", priority: "medium", season: "summer",
      thesis: "Large embedded engineering population; relevant after the central platform relationship matures.",
      teams: [
        { id: "store-apps", name: "Store Applications", fn: "product-engineering", size: 6, condition: "light" },
        { id: "associate", name: "Associate Tools", fn: "product-engineering", size: 4, condition: "untouched" },
      ],
    },
    {
      id: "supply", name: "Supply Chain Technology", shortName: "Supply Chain", priority: "medium", season: "summer",
      thesis: "Automation-heavy engineering; strong technical fit, early days.",
      teams: [
        { id: "automation", name: "Automation Engineering", fn: "platform", size: 6, condition: "light" },
        { id: "logistics", name: "Logistics Systems", fn: "product-engineering", size: 4, condition: "untouched" },
      ],
    },
    {
      id: "ads", name: "Walmart Connect", shortName: "Advertising", priority: "low", season: "winter", status: "dormant",
      thesis: "Advertising technology group. Smaller engineering footprint and no identified initiative.",
      dormancyReason: dormancy("low-relevance", "Smaller engineering population relative to the platform organization and no identified developer-tooling initiative.", "Hold. Revisit if the group standardizes on the central developer platform."),
      reactivation: { signal: { type: "engineering-hub", strength: "moderate", title: "Advertising engineering expansion announced", description: "The advertising technology group announced a new engineering hub and a platform modernization effort.", evidenceType: "demo", sourceLabel: "Simulated signal" }, recommendation: "Qualify the new hub leadership; sequence behind the central platform relationship." },
      teams: [{ id: "ads-eng", name: "Ads Engineering", fn: "product-engineering", size: 3, condition: "dormant", latent: 4 }],
    },
    {
      id: "sams", name: "Sam's Club Technology", shortName: "Sam's Club", priority: "low", season: "winter", status: "dormant",
      thesis: "Membership business technology group; previous outreach reached no platform owner.",
      dormancyReason: dormancy("previous-disqualification", "Previous outreach reached individual engineers but surfaced no platform ownership or initiative.", "Do not spend active prospecting capacity here. Revisit on leadership change."),
      reactivation: { signal: { type: "executive-change", strength: "strong", title: "New head of engineering appointed", description: "A new head of engineering has been appointed with a public mandate to modernize the membership platform.", evidenceType: "demo", sourceLabel: "Simulated signal" }, recommendation: "Re-open with the new engineering leader; lead with the central platform relationship." },
      teams: [{ id: "member", name: "Membership Platform", fn: "product-engineering", size: 3, condition: "dormant", latent: 5 }],
    },
  ],
  opportunities: [
    {
      id: "platform-pilot", businessUnitId: "wgt", name: "Platform Engineering Pilot", stage: "Bud", baselineMaturity: "bud",
      stakeholders: ["wgt.vp-platform", "wgt.dir-devex"], champion: "wgt.dir-devex", baseMeetingCount: 1,
      signals: ["Pilot measurement plan requested"], nextStep: "Agree pilot scope and productivity metrics.",
    },
  ],
  signals: [
    { id: "ml-blog", type: "technical-announcement", strength: "moderate", title: "Public ML platform engineering writing", description: "Walmart Global Tech continues to publish about its internal ML platform.", date: "2026-06-30", evidenceType: "verified", sourceLabel: "Walmart Global Tech blog", sourceUrl: "https://tech.walmart.com" },
    { id: "pilot-ask", businessUnitId: "wgt", type: "developer-productivity", strength: "moderate", title: "Pilot metrics requested", description: "Developer Experience director asked for a measurement plan.", date: "2026-08-27", evidenceType: "demo" },
  ],
});
