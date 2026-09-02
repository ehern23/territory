import { defineAccount, dormancy } from "../builders";

/**
 * JPMorganChase — hero demo account.
 * Mixed conditions: a warming Enterprise Technology organization, a strong
 * Markets Technology opportunity, an untouched consumer canopy, and a dormant
 * Asset & Wealth Management branch prepared for spring reactivation.
 *
 * Organizational structure is illustrative demo data, not an authoritative
 * org chart. All people are fictional.
 */
export const jpmc = defineAccount({
  id: "jpmc",
  name: "JPMorganChase",
  ticker: "JPM",
  seed: 41127,
  sector: "Global financial services",
  season: "fall",
  thesis:
    "One of the largest technology organizations in financial services, with public commitments to firmwide AI and a large, federated engineering population. Penetration is concentrated in Markets Technology; Enterprise Technology is the strategic whitespace.",
  scale: { opportunity: 1, enterprise: 1, complexity: 0.95 },
  score: [
    { key: "technical-scale", label: "Developer / technical scale", value: 10, weight: 1.5, reasoning: "Tens of thousands of technologists across lines of business, per public statements.", evidenceType: "verified" },
    { key: "ai-intensity", label: "AI intensity", value: 9, weight: 1.2, reasoning: "Firmwide AI programs and an internal LLM assistant have been publicly discussed.", evidenceType: "verified" },
    { key: "engineering-complexity", label: "Engineering complexity", value: 9, weight: 0.8, reasoning: "Federated engineering across consumer, markets, asset management and central technology.", evidenceType: "inference" },
    { key: "seat-expansion", label: "Potential seat expansion", value: 10, weight: 1.3, reasoning: "Multiple independent engineering organizations, each a standalone expansion path.", evidenceType: "inference" },
    { key: "logo-value", label: "Strategic logo value", value: 9, weight: 0.8, reasoning: "Reference value across regulated industries.", evidenceType: "inference" },
    { key: "surface-area", label: "Organizational surface area", value: 9, weight: 1, reasoning: "Four major technology organizations mapped, fourteen teams.", evidenceType: "demo" },
    { key: "timing", label: "Timing signals", value: 7, weight: 1, reasoning: "Active developer-productivity language in public communications; no confirmed RFP.", evidenceType: "inference" },
    { key: "governance-fit", label: "Enterprise / governance fit", value: 8, weight: 0.9, reasoning: "Highly regulated; enterprise controls are a requirement rather than a blocker.", evidenceType: "inference" },
    { key: "competitive-friction", label: "Competitive friction", value: 6, weight: 0.9, reasoning: "Incumbent developer-tool vendors and internal platforms are likely present.", evidenceType: "inference" },
  ],
  intelligence: [
    { id: "jpmc.root.scale", category: "Developer Scale", title: "Very large technologist population", summary: "JPMorganChase has publicly described a technology workforce in the tens of thousands and an annual technology budget in the mid-teens of billions of dollars.", evidenceType: "verified", sourceLabel: "JPMorganChase public disclosures", sourceUrl: "https://www.jpmorganchase.com" },
    { id: "jpmc.root.ai", category: "AI Adoption", title: "Firmwide AI assistant rollout", summary: "The firm has publicly discussed rolling out an internal LLM-based assistant to large numbers of employees and pursuing AI use cases across the business.", evidenceType: "verified", sourceLabel: "Public reporting, 2024", sourceUrl: "https://www.jpmorganchase.com/newsroom" },
    { id: "jpmc.root.complexity", category: "Engineering Complexity", title: "Federated engineering", summary: "Engineering is organized by line of business with a central Enterprise Technology function. Standards likely flow from the center; adoption decisions likely sit with the lines of business.", evidenceType: "inference" },
    { id: "jpmc.root.tooling", category: "Developer Tooling", title: "Internal developer platform investment", summary: "Seller hypothesis: significant investment in an internal developer platform and paved paths means any AI tooling must fit an existing golden path.", evidenceType: "inference" },
    { id: "jpmc.root.security", category: "Security / Governance", title: "Model-data controls are decisive", summary: "Any tool touching source code will be reviewed for data retention, training exclusion, and audit. Expect security review to be a named workstream, not an afterthought.", evidenceType: "inference" },
    { id: "jpmc.root.exec", category: "Executive Priorities", title: "Productivity language in public commentary", summary: "Leadership has repeatedly framed AI as a productivity lever for the firm in public commentary.", evidenceType: "verified", sourceLabel: "Public interviews and shareholder letters", sourceUrl: "https://www.jpmorganchase.com/ir" },
    { id: "jpmc.root.timing", category: "Timing Signals", title: "Demo signal set", summary: "Signals in this territory are simulated for demonstration. A research agent would populate this root from public sources.", evidenceType: "demo" },
  ],
  businessUnits: [
    {
      id: "ccb",
      name: "Consumer & Community Banking",
      shortName: "Consumer",
      priority: "medium",
      season: "summer",
      thesis:
        "Very large product-engineering population shipping consumer digital experiences. Relevant, but no active initiative identified; healthy prospecting surface with little outreach so far.",
      teams: [
        {
          id: "digital", name: "Digital Products", fn: "product-engineering", size: 6, condition: "light",
          rich: [
            { key: "ccb.dir-digital", name: "Imogen Fairweather", title: "Director of Engineering, Digital Products", persona: "Technical Buyer", influence: 4, status: "contacted", hypothesis: "Runs large delivery teams under release pressure; cycle time is her scoreboard.", painPoints: ["Release cadence", "Legacy code comprehension"], nextAction: "Follow up with a mobile-team specific example." },
          ],
        },
        { id: "payments", name: "Payments Engineering", fn: "product-engineering", size: 4, condition: "untouched" },
        { id: "platform", name: "Consumer Platform", fn: "platform", size: 4, condition: "untouched" },
      ],
    },
    {
      id: "cib",
      name: "Commercial & Investment Bank",
      shortName: "CIB",
      priority: "high",
      season: "fall",
      thesis:
        "Markets Technology is the most engaged organization in the account. Multiple stakeholders are in conversation and a technical evaluation is forming.",
      teams: [
        {
          id: "markets", name: "Markets Technology", fn: "platform", size: 7, condition: "hot",
          rich: [
            { key: "cib.vp-markets", name: "Anders Lindqvist", title: "VP, Markets Technology", persona: "Champion", influence: 4, status: "engaged", hypothesis: "Emerging champion. Owns trading platform engineering and has publicly (internally) pushed for faster delivery.", painPoints: ["Slow onboarding to complex codebases", "Review bottlenecks"], signals: ["Asked for a pilot scope after second call"], nextAction: "Send pilot proposal for two platform teams.", lastTouch: "2026-08-26" },
            { key: "cib.dir-trading", name: "Selin Marchetti", title: "Director, Trading Platforms", persona: "Technical Buyer", influence: 4, status: "meeting", hypothesis: "Technical decision maker for the trading platform group; will scrutinize security posture.", painPoints: ["Context switching across services"], nextAction: "Prepare discovery agenda for the platform team meeting.", lastTouch: "2026-08-24" },
            { key: "cib.staff-markets", name: "Kaito Achterberg", title: "Staff Engineer, Markets Infrastructure", persona: "Influencer", influence: 2, status: "engaged", hypothesis: "Hands-on technical influencer; his experience will shape the evaluation.", nextAction: "Share evaluation checklist.", lastTouch: "2026-08-20" },
          ],
        },
        { id: "payments-tech", name: "Payments Technology", fn: "platform", size: 5, condition: "warming" },
        { id: "banking-platforms", name: "Banking Platforms", fn: "product-engineering", size: 4, condition: "light" },
      ],
    },
    {
      id: "awm",
      name: "Asset & Wealth Management",
      shortName: "Asset & Wealth",
      priority: "low",
      season: "winter",
      status: "dormant",
      thesis:
        "Smaller technology organization relative to the rest of the firm. No initiative, trigger, or sponsor currently identified; previous outreach did not surface a technical buying surface.",
      dormancyReason: dormancy(
        "no-trigger",
        "No meaningful trigger or relevant initiative currently identified. Earlier outreach reached individual engineers but no platform owner.",
        "Do not spend active prospecting capacity here. Revisit on an executive change, a platform initiative, or a hiring surge.",
      ),
      reactivation: {
        signal: {
          type: "ai-initiative",
          strength: "strong",
          title: "New AI Developer Platform initiative detected",
          description:
            "Asset & Wealth Management technology has announced an AI developer platform initiative with new leadership and open engineering roles. The organization now has a reason to evaluate developer tooling.",
          evidenceType: "demo",
          sourceLabel: "Simulated signal",
        },
        recommendation:
          "Re-engage Asset & Wealth Management. Prioritize the new platform leadership and the freshly surfaced Investment Platforms team.",
      },
      teams: [
        {
          id: "investment-platforms", name: "Investment Platforms", fn: "platform", size: 3, condition: "dormant", latent: 4,
          rich: [
            { key: "awm.head-platform", name: "Rowan Winterbourne", title: "Head of AI Developer Platform (new)", persona: "Executive Sponsor", influence: 5, hypothesis: "Newly appointed leader of the AI developer platform initiative. Likely to define tooling standards for the organization.", painPoints: ["Standing up a platform team quickly"], latent: true, nextAction: "Research appointment announcement and open roles." },
          ],
        },
        { id: "data-analytics", name: "Data & Analytics", fn: "data-ai", size: 2, condition: "dormant", latent: 3 },
      ],
    },
    {
      id: "et",
      name: "Enterprise Technology",
      shortName: "Enterprise Tech",
      priority: "high",
      season: "summer",
      thesis:
        "Central technology organization that sets developer standards for the firm. Highly relevant and largely unpenetrated: the strategic whitespace of this account.",
      teams: [
        {
          id: "dx", name: "Developer Experience", fn: "developer-experience", size: 9, condition: "untouched",
          thesis: "Directly accountable for developer productivity firmwide. The natural home for a platform-level relationship.",
          rich: [
            { key: "et.vp-dx", name: "Thea Halloran", title: "VP, Developer Experience", persona: "Economic Buyer", influence: 5, status: "unworked", hypothesis: "Owns the firmwide developer experience agenda. If AI-assisted development becomes a standard, it will be decided in her organization.", painPoints: ["Inner-loop speed across thousands of repositories", "Tool sprawl", "Measuring developer productivity"], signals: ["Developer productivity referenced in recent internal town hall (demo)"], nextAction: "Research recent public talks; identify a warm path via Markets Technology champion." },
            { key: "et.dir-devprod", name: "Idris Okafor", title: "Director, Developer Productivity", persona: "Technical Buyer", influence: 4, status: "unworked", hypothesis: "Runs the productivity metrics program. Would be the technical evaluator for any rollout.", painPoints: ["Build times", "Onboarding time"], nextAction: "Identify shared context; prepare a metrics-oriented note." },
            { key: "et.staff-devtools", name: "Nadia Petrova", title: "Staff Engineer, Developer Tools", persona: "Influencer", influence: 2, status: "researched", hypothesis: "Builds internal CLI and IDE integrations. Would be an early hands-on evaluator.", nextAction: "Reference her recent internal tooling work (demo)." },
            { key: "et.head-engprod", name: "Mateo Sandoval", title: "Head of Engineering Productivity", persona: "Technical Buyer", influence: 4, status: "unworked", hypothesis: "Peer to the productivity director with a mandate across platform teams.", nextAction: "Sequence after first conversation with the VP." },
          ],
        },
        {
          id: "aiml", name: "AI / ML Platform", fn: "data-ai", size: 7, condition: "warming",
          rich: [
            { key: "et.dir-ai-platform", name: "Priya Bergstrom", title: "Director, AI Platform", persona: "Technical Buyer", influence: 4, status: "engaged", hypothesis: "Owns the internal AI platform. Interested in how AI-assisted development integrates with firm-approved models and controls.", painPoints: ["Model governance", "Integration with internal platforms"], nextAction: "Propose joint session with Developer Experience.", lastTouch: "2026-08-25" },
            { key: "et.ml-lead", name: "Yusuf Dahlgren", title: "ML Platform Lead", persona: "Champion", influence: 3, status: "contacted", hypothesis: "Hands-on lead who responded to first outreach; potential champion inside the AI platform team.", nextAction: "Follow up with a concrete example on pipeline code.", lastTouch: "2026-08-19" },
          ],
        },
        { id: "cloud", name: "Cloud Platform", fn: "infrastructure", size: 5, condition: "light" },
        {
          id: "cyber", name: "Cybersecurity", fn: "security", size: 4, condition: "light",
          rich: [
            { key: "et.dir-prodsec", name: "Farah Ashcombe", title: "Director, Product Security", persona: "Security", influence: 4, status: "researched", hypothesis: "Will own the security review. Engaging early avoids a late-stage block.", painPoints: ["Source code exposure to third-party models", "Audit trails"], nextAction: "Prepare security and data-handling brief before first contact." },
          ],
        },
        { id: "infra", name: "Infrastructure", fn: "infrastructure", size: 5, condition: "untouched" },
      ],
    },
  ],
  opportunities: [
    {
      id: "markets-eval",
      businessUnitId: "cib",
      name: "Markets Technology AI-Assisted Development",
      stage: "Technical evaluation forming",
      baselineMaturity: "young",
      stakeholders: ["cib.vp-markets", "cib.dir-trading", "cib.staff-markets"],
      champion: "cib.vp-markets",
      baseMeetingCount: 2,
      signals: ["Pilot scope requested", "Security questionnaire started"],
      nextStep: "Technical evaluation with two platform teams.",
    },
    {
      id: "dx-standard",
      businessUnitId: "et",
      name: "AI Developer Productivity Expansion",
      stage: "Forming",
      latent: true,
      stakeholders: ["et.vp-dx", "et.dir-devprod", "et.staff-devtools", "et.head-engprod", "et.dir-ai-platform"],
      champion: "et.dir-ai-platform",
      baseMeetingCount: 0,
      signals: [],
      nextStep: "Joint working session between Developer Experience and AI Platform.",
    },
  ],
  signals: [
    { id: "productivity-commentary", type: "earnings-priority", strength: "moderate", title: "AI framed as a productivity lever", description: "Firm leadership continues to frame AI as a productivity lever in public commentary.", date: "2026-07-15", evidenceType: "verified", sourceLabel: "Public commentary", sourceUrl: "https://www.jpmorganchase.com/ir" },
    { id: "markets-pilot", businessUnitId: "cib", type: "developer-productivity", strength: "strong", title: "Pilot scope requested by Markets Technology", description: "The Markets Technology champion asked for a pilot scope covering two platform teams.", date: "2026-08-26", evidenceType: "demo" },
    { id: "dx-hiring", businessUnitId: "et", type: "hiring-surge", strength: "moderate", title: "Developer Experience hiring", description: "Several open roles referencing developer productivity and internal tooling.", date: "2026-08-10", evidenceType: "demo" },
  ],
});
