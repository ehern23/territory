import { defineAccount, dormancy } from "../builders";

/** Apple — mixed conditions: light outreach, two dormant organizations, high friction. Fictional people. */
export const apple = defineAccount({
  id: "apple",
  name: "Apple",
  ticker: "AAPL",
  seed: 61234,
  sector: "Technology",
  season: "summer",
  thesis:
    "A vast engineering organization with a strong internal-tools culture and first-party developer tooling. Attractive but high-friction: the realistic path is narrow, so capacity is concentrated on services and AI/ML engineering while hardware and retail technology are held dormant.",
  scale: { opportunity: 0.8, enterprise: 0.95, complexity: 0.9 },
  score: [
    { key: "technical-scale", label: "Developer / technical scale", value: 10, weight: 1.5, reasoning: "Very large software engineering population.", evidenceType: "inference" },
    { key: "ai-intensity", label: "AI intensity", value: 8, weight: 1.2, reasoning: "Publicly announced platform-level AI features and developer tooling AI.", evidenceType: "verified" },
    { key: "engineering-complexity", label: "Engineering complexity", value: 9, weight: 0.8, reasoning: "Operating systems, services, hardware, and applications engineering.", evidenceType: "inference" },
    { key: "seat-expansion", label: "Potential seat expansion", value: 7, weight: 1.3, reasoning: "Large, but adoption path is narrow.", evidenceType: "inference" },
    { key: "logo-value", label: "Strategic logo value", value: 10, weight: 0.8, reasoning: "Marquee reference.", evidenceType: "inference" },
    { key: "surface-area", label: "Organizational surface area", value: 6, weight: 1, reasoning: "Five organizations mapped; two dormant.", evidenceType: "demo" },
    { key: "timing", label: "Timing signals", value: 4, weight: 1, reasoning: "No trigger identified beyond public AI announcements.", evidenceType: "inference" },
    { key: "governance-fit", label: "Enterprise / governance fit", value: 5, weight: 0.9, reasoning: "Highly secretive culture; strict controls on external tooling likely.", evidenceType: "inference" },
    { key: "competitive-friction", label: "Competitive friction", value: 9, weight: 0.9, reasoning: "First-party developer tooling with AI features announced publicly.", evidenceType: "verified" },
  ],
  intelligence: [
    { id: "apple.root.ai", category: "AI Adoption", title: "Platform-level AI features", summary: "Apple publicly announced Apple Intelligence features across its platforms (WWDC 2024) and continues to expand them.", evidenceType: "verified", sourceLabel: "Apple Newsroom", sourceUrl: "https://www.apple.com/newsroom" },
    { id: "apple.root.xcode", category: "Competitive Environment", title: "First-party AI developer tooling", summary: "Apple publicly announced AI-assisted coding features in its own developer tools. Any external tool competes with the first-party path.", evidenceType: "verified", sourceLabel: "Apple Developer", sourceUrl: "https://developer.apple.com" },
    { id: "apple.root.secrecy", category: "Security / Governance", title: "Secrecy culture", summary: "Seller hypothesis: unreleased-product confidentiality makes external code tooling a hard security conversation. Services engineering is the most plausible entry point.", evidenceType: "inference" },
    { id: "apple.root.services", category: "Transformation Initiatives", title: "Services engineering growth", summary: "Services has grown into a major business line by public financial reporting, implying a large and growing server-side engineering population.", evidenceType: "verified", sourceLabel: "Apple investor relations", sourceUrl: "https://investor.apple.com" },
    { id: "apple.root.hold", category: "Timing Signals", title: "Two organizations held dormant", summary: "Hardware Technologies and Retail Technology show no buying surface for external developer tooling; capacity is deliberately withheld.", evidenceType: "demo" },
  ],
  businessUnits: [
    {
      id: "services", name: "Services Engineering", shortName: "Services", priority: "high", season: "summer",
      thesis: "Large server-side engineering organization; the most plausible entry point.",
      teams: [
        {
          id: "cloud-services", name: "Cloud Services", fn: "platform", size: 7, condition: "light",
          rich: [
            { key: "services.dir-platform", name: "Ines Lindqvist", title: "Director, Services Platform Engineering", persona: "Technical Buyer", influence: 4, status: "contacted", hypothesis: "Runs platform engineering for services; responded briefly to an outreach referencing a shared contact.", nextAction: "Follow up with a concrete, low-commitment ask.", lastTouch: "2026-08-15" },
          ],
        },
        { id: "commerce", name: "Commerce Engineering", fn: "product-engineering", size: 5, condition: "untouched" },
      ],
    },
    {
      id: "aiml", name: "AI / ML", shortName: "AI / ML", priority: "high", season: "summer",
      thesis: "Rapidly growing organization; technically relevant, culturally cautious.",
      teams: [
        { id: "ml-platform", name: "ML Platform", fn: "data-ai", size: 6, condition: "light" },
        { id: "applied", name: "Applied ML", fn: "data-ai", size: 5, condition: "untouched" },
      ],
    },
    {
      id: "software", name: "Software Engineering", shortName: "Software", priority: "medium", season: "summer",
      thesis: "Operating systems and applications; deeply tied to first-party tooling.",
      teams: [{ id: "frameworks", name: "Frameworks", fn: "platform", size: 6, condition: "untouched" }],
    },
    {
      id: "hardware", name: "Hardware Technologies", shortName: "Hardware", priority: "low", season: "winter", status: "dormant",
      thesis: "Silicon and hardware engineering with specialized toolchains.",
      dormancyReason: dormancy("no-buying-surface", "Specialized hardware toolchains and confidentiality constraints leave no meaningful external developer-tooling buying surface.", "Hold indefinitely. Revisit only if a software platform initiative emerges."),
      reactivation: { signal: { type: "technical-announcement", strength: "moderate", title: "Hardware software platform initiative", description: "A new internal software platform effort inside hardware engineering has surfaced, with open roles for platform engineers.", evidenceType: "demo", sourceLabel: "Simulated signal" }, recommendation: "Qualify carefully; confidentiality constraints remain." },
      teams: [{ id: "silicon-sw", name: "Silicon Software", fn: "platform", size: 3, condition: "dormant", latent: 3 }],
    },
    {
      id: "retail", name: "Retail Technology", shortName: "Retail Tech", priority: "low", season: "winter", status: "dormant",
      thesis: "Retail systems engineering; small and not currently relevant.",
      dormancyReason: dormancy("low-expected-return", "Small engineering footprint relative to the effort required to reach it.", "Do not spend active prospecting capacity here."),
      reactivation: { signal: { type: "hiring-surge", strength: "moderate", title: "Retail engineering hiring surge", description: "A burst of open engineering roles in retail technology.", evidenceType: "demo", sourceLabel: "Simulated signal" }, recommendation: "Low priority even with the signal; monitor." },
      teams: [{ id: "retail-systems", name: "Retail Systems", fn: "product-engineering", size: 2, condition: "dormant", latent: 3 }],
    },
  ],
  opportunities: [],
  signals: [
    { id: "wwdc", type: "product-launch", strength: "moderate", title: "AI developer tooling announced", description: "First-party AI-assisted coding features announced publicly.", date: "2026-06-09", evidenceType: "verified", sourceLabel: "Apple Developer", sourceUrl: "https://developer.apple.com" },
  ],
});
