import { defineAccount } from "../builders";

/** Goldman Sachs — strong fall engagement. Fictional people. */
export const goldman = defineAccount({
  id: "goldman",
  name: "Goldman Sachs",
  ticker: "GS",
  seed: 88412,
  sector: "Investment banking",
  season: "fall",
  thesis:
    "A firm that has been publicly vocal about deploying AI to its engineers. Engagement is deep across the central Engineering organization; several meetings have already fallen, and a firmwide opportunity is ripening.",
  scale: { opportunity: 0.85, enterprise: 0.75, complexity: 0.8 },
  score: [
    { key: "technical-scale", label: "Developer / technical scale", value: 8, weight: 1.5, reasoning: "Engineering is one of the firm's largest divisions by public description.", evidenceType: "verified" },
    { key: "ai-intensity", label: "AI intensity", value: 10, weight: 1.2, reasoning: "Publicly discussed firmwide AI assistant rollout and AI coding pilots.", evidenceType: "verified" },
    { key: "engineering-complexity", label: "Engineering complexity", value: 8, weight: 0.8, reasoning: "Central engineering plus divisional technology groups.", evidenceType: "inference" },
    { key: "seat-expansion", label: "Potential seat expansion", value: 8, weight: 1.3, reasoning: "Central standard would propagate across divisions.", evidenceType: "inference" },
    { key: "logo-value", label: "Strategic logo value", value: 9, weight: 0.8, reasoning: "Highly visible technology-forward bank.", evidenceType: "inference" },
    { key: "surface-area", label: "Organizational surface area", value: 7, weight: 1, reasoning: "Four organizations mapped.", evidenceType: "demo" },
    { key: "timing", label: "Timing signals", value: 9, weight: 1, reasoning: "Active pilots and executive AI commentary.", evidenceType: "verified" },
    { key: "governance-fit", label: "Enterprise / governance fit", value: 8, weight: 0.9, reasoning: "Regulated, enterprise-first procurement.", evidenceType: "inference" },
    { key: "competitive-friction", label: "Competitive friction", value: 7, weight: 0.9, reasoning: "Publicly reported pilots of other AI coding tools raise competitive intensity.", evidenceType: "verified" },
  ],
  intelligence: [
    { id: "gs.root.ai", category: "AI Adoption", title: "Firmwide AI assistant", summary: "Goldman Sachs has publicly discussed rolling out a generative AI assistant to employees across the firm.", evidenceType: "verified", sourceLabel: "Public reporting, 2025", sourceUrl: "https://www.goldmansachs.com" },
    { id: "gs.root.coding", category: "Competitive Environment", title: "Publicly reported AI coding pilots", summary: "Public reporting in 2025 described the firm piloting autonomous AI software-engineering tools. Competitive intensity is high; differentiation matters.", evidenceType: "verified", sourceLabel: "Public reporting, 2025", sourceUrl: "https://www.goldmansachs.com" },
    { id: "gs.root.platform", category: "Developer Tooling", title: "Developer platform culture", summary: "The firm publicly operates developer-facing platforms and has a long-standing engineering culture with internal tooling.", evidenceType: "verified", sourceLabel: "Goldman Sachs Developer", sourceUrl: "https://developer.gs.com" },
    { id: "gs.root.exec", category: "Executive Priorities", title: "Productivity framing", summary: "Leadership has framed AI as a lever for engineer productivity in public statements.", evidenceType: "verified", sourceLabel: "Public commentary", sourceUrl: "https://www.goldmansachs.com" },
    { id: "gs.root.thread", category: "Engineering Complexity", title: "Multithreaded engagement", summary: "Demo state: relationships span the platform group, developer experience, and a divisional technology team, creating a credible firmwide conversation.", evidenceType: "demo" },
  ],
  businessUnits: [
    {
      id: "eng", name: "Engineering", shortName: "Engineering", priority: "high", season: "fall",
      thesis: "Central engineering division. Multiple engaged stakeholders and meetings; the firmwide opportunity is forming here.",
      teams: [
        {
          id: "platform", name: "Platform Engineering", fn: "platform", size: 8, condition: "hot",
          rich: [
            { key: "eng.md-platform", name: "Beatriz Castellanos", title: "Managing Director, Platform Engineering", persona: "Economic Buyer", influence: 5, status: "engaged", hypothesis: "Executive owner of platform engineering; wants a firmwide decision rather than team-by-team adoption.", painPoints: ["Fragmented AI tool usage", "Governance of model access"], nextAction: "Present firmwide rollout options.", lastTouch: "2026-08-28" },
            { key: "eng.vp-devex", name: "Emeka Thorne", title: "VP, Developer Experience", persona: "Champion", influence: 4, status: "meeting", hypothesis: "Champion. Has run internal comparisons and advocates a standard.", nextAction: "Prepare evaluation readout for the platform meeting.", lastTouch: "2026-08-27" },
            { key: "eng.dir-sec", name: "Gwen Whitlock", title: "Director, Engineering Security", persona: "Security", influence: 4, status: "engaged", hypothesis: "Security owner participating in the evaluation; her sign-off gates the rollout.", nextAction: "Complete data-handling questionnaire.", lastTouch: "2026-08-25" },
          ],
        },
        {
          id: "devex", name: "Developer Experience", fn: "developer-experience", size: 6, condition: "hot",
          rich: [
            { key: "eng.head-prod", name: "Viggo Eriksen", title: "Head of Engineering Productivity", persona: "Technical Buyer", influence: 4, status: "meeting", hypothesis: "Owns productivity measurement; will define the success criteria.", nextAction: "Align on evaluation metrics.", lastTouch: "2026-08-26" },
          ],
        },
        { id: "core", name: "Core Infrastructure", fn: "infrastructure", size: 5, condition: "warming" },
      ],
    },
    {
      id: "gbm", name: "Global Banking & Markets Technology", shortName: "Banking & Markets", priority: "high", season: "fall",
      thesis: "Divisional technology with performance-sensitive systems. Warming behind the central engagement.",
      teams: [
        { id: "markets", name: "Markets Engineering", fn: "platform", size: 6, condition: "warming" },
        { id: "banking", name: "Banking Engineering", fn: "product-engineering", size: 4, condition: "light" },
      ],
    },
    {
      id: "awm", name: "Asset & Wealth Management Technology", shortName: "Asset & Wealth", priority: "medium", season: "summer",
      thesis: "Follows the central decision; light outreach so far.",
      teams: [{ id: "awm-eng", name: "Investment Engineering", fn: "product-engineering", size: 5, condition: "light" }],
    },
    {
      id: "platform-solutions", name: "Platform Solutions", shortName: "Platform Solutions", priority: "low", season: "summer",
      thesis: "Smaller, product-oriented engineering. Relevant later.",
      teams: [{ id: "txb", name: "Transaction Banking Engineering", fn: "product-engineering", size: 4, condition: "untouched" }],
    },
  ],
  opportunities: [
    {
      id: "firmwide", businessUnitId: "eng", name: "Firmwide AI Developer Tooling Standard", stage: "Growing",
      baselineMaturity: "growing", stakeholders: ["eng.md-platform", "eng.vp-devex", "eng.dir-sec", "eng.head-prod"],
      champion: "eng.vp-devex", baseMeetingCount: 3, signals: ["Internal comparison completed", "Security questionnaire in progress"],
      nextStep: "Firmwide rollout options review with the platform MD.",
    },
    {
      id: "markets-follow", businessUnitId: "gbm", name: "Markets Engineering Pilot", stage: "Bud", baselineMaturity: "bud",
      stakeholders: [], baseMeetingCount: 1, nextStep: "Confirm divisional pilot after the central decision.",
    },
  ],
  signals: [
    { id: "ai-assistant", type: "ai-initiative", strength: "strong", title: "Firmwide AI assistant rollout", description: "Publicly discussed generative AI assistant rollout to employees.", date: "2026-06-01", evidenceType: "verified", sourceLabel: "Public reporting", sourceUrl: "https://www.goldmansachs.com" },
    { id: "eval", businessUnitId: "eng", type: "developer-productivity", strength: "strong", title: "Evaluation readout scheduled", description: "Platform engineering scheduled an evaluation readout.", date: "2026-08-27", evidenceType: "demo" },
  ],
});
