import type { SellerPreset } from "@/domain/profile";
import { intel, opp, person, signal, unit } from "../dsl";

/**
 * Cursor enterprise territory. Target companies are real; organisations and
 * theses are seller inference; people, stages and dollars are demo.
 */
export const cursor: SellerPreset = {
  aliases: ["cursor", "anysphere", "cursor ai", "cursor.com"],
  profile: {
    id: "cursor",
    company: "Cursor",
    productName: "Cursor",
    product: "Cursor, the AI code editor and coding agents for engineering teams",
    category: "AI coding",
    role: "AE",
    territoryLabel: "Cursor Enterprise",
    motion: "AI coding rollout",
    icp: "Engineering organizations with hundreds to tens of thousands of developers that want measurable gains in velocity, with enterprise security and admin controls.",
    valueProps: [
      "Codebase-aware AI in an editor developers already know",
      "Agents that take on multi-file changes and background tasks",
      "Enterprise controls: SSO, privacy mode, admin and usage analytics",
      "Fast adoption through a VS Code-compatible experience",
    ],
    personas: ["VP Engineering", "Head of Developer Productivity", "CTO", "Director, Platform Engineering", "CISO"],
    archetype: "devtools",
    source: "preset",
  },
  seeds: [
    {
      id: "capital-one",
      name: "Capital One",
      sector: "Banking",
      tier: 1,
      potentialArr: 5_000_000,
      motion: "enterprise AI coding standard",
      lastActivityDaysAgo: 2,
      lastActivity: "Pilot measurement review with Developer Experience",
      thesis:
        "A large in-house engineering organization on a modern, cloud-native toolchain lowers the bar for new developer tools, while bank-grade security sets the bar for code handling. A platform-team pilot is the opening; a firmwide standard is the expansion. Seller hypothesis. Retail Bank Technology is held dormant.",
      units: [
        unit("tech", "Enterprise Technology", "developer-experience", "Central platforms and developer experience. The live pilot.", { size: 1.4, short: "Enterprise Tech" }),
        unit("card", "Card Technology", "product-engineering", "Card products and servicing apps.", { short: "Card" }),
        unit("data", "Data & ML Platforms", "data-ai", "Data engineering and ML platform teams.", { short: "Data & ML" }),
        unit("bank", "Retail Bank Technology", "product-engineering", "Separate tooling decisions; no trigger in this demo.", { dormant: true, short: "Retail Bank" }),
      ],
      stakeholders: [
        person("dir-dx", "Director, Developer Experience", "Technical Buyer", 4, "tech", "meeting", "Meeting booked to review pilot metrics."),
        person("sem-tools", "Senior Engineering Manager, Developer Tools", "Champion", 4, "tech", "engaged", "Champion: runs the pilot and the adoption dashboard."),
        person("cto", "Chief Technology Officer", "Executive Sponsor", 5, "tech", "unworked", "Sponsor for a firmwide standard. Unworked."),
        person("appsec", "Director, Application Security", "Security", 3, "tech", "engaged", "Reviewing privacy mode and data retention; constructive so far."),
        person("vp-card", "VP, Card Engineering", "Technical Buyer", 4, "card", "researched", "Large teams under delivery pressure."),
        person("dir-ml", "Director, ML Platform", "Influencer", 4, "data", "unworked", "Would bring data and ML engineers."),
      ],
      opportunities: [
        opp("pilot", "{product} pilot for platform teams", "tech", 1_600_000, "Qualified", ["dir-dx", "sem-tools"], "Expand the pilot to 500 engineers; finalize privacy-mode controls.", "sem-tools"),
        opp("standard", "Firmwide AI coding standard", "tech", 3_400_000, "Forming", ["cto", "appsec", "vp-card", "dir-ml"], "Executive review of pilot outcomes with Application Security.", "appsec"),
      ],
      signals: [
        signal("Developer productivity OKR", "Demo: engineering leadership set velocity goals for the year.", "developer-productivity", "strong", "tech"),
        signal("Security review started", "Demo: Application Security opened a formal review.", "governance", "moderate", "tech"),
      ],
      intelligence: [
        intel("Developer Scale", "Large in-house engineering", "Capital One employs a large in-house technology workforce and describes itself as a technology company that does banking."),
        intel("Transformation Initiatives", "All-in on public cloud", "Capital One completed its move to the public cloud and exited its data centers in 2020. Seller inference: a modern toolchain lowers the bar for new developer tools."),
        intel("Security / Governance", "Regulated bank", "Source-code handling and data retention will be scrutinized."),
      ],
    },
    {
      id: "uber",
      name: "Uber",
      sector: "Mobility and delivery",
      tier: 1,
      potentialArr: 4_400_000,
      motion: "agents for migration work",
      lastActivityDaysAgo: 7,
      lastActivity: "Agent workflow demo for Developer Platform",
      thesis:
        "A large engineering organization with a strong internal tooling culture sets a high bar: fit existing workflows, don't replace them. Background agents on migration backlogs are the opening. Seller hypothesis.",
      units: [
        unit("devplat", "Developer Platform", "developer-experience", "Developer tooling, monorepos and CI.", { size: 1.3, short: "Dev Platform" }),
        unit("mobility", "Mobility Engineering", "product-engineering", "Rides products.", { short: "Mobility" }),
        unit("delivery", "Delivery Engineering", "product-engineering", "Uber Eats and delivery products.", { short: "Delivery" }),
      ],
      stakeholders: [
        person("dir-devplat", "Director, Developer Platform", "Technical Buyer", 4, "devplat", "engaged", "Interested in agents that open reviewable PRs."),
        person("staff", "Staff Engineer, Developer Productivity", "Champion", 3, "devplat", "engaged", "Champion: owns the migration tooling."),
        person("vp-delivery", "VP, Engineering, Delivery", "Economic Buyer", 4, "delivery", "contacted", "Has the largest migration backlog."),
        person("cto", "Chief Technology Officer", "Executive Sponsor", 5, "devplat", "unworked", "Sets engineering tooling direction."),
      ],
      opportunities: [
        opp("agents", "Background agents for migration work", "devplat", 1_300_000, "Discovery", ["dir-devplat", "staff", "vp-delivery"], "Pick two migration backlogs; run agents against them.", "staff"),
      ],
      signals: [signal("Internal AI tooling investment", "Demo: developer platform roadmap prioritizes AI tooling.", "developer-productivity", "moderate", "devplat")],
      intelligence: [
        intel("Developer Scale", "Large engineering organization", "Uber runs a large engineering organization and has written publicly about its monorepos and developer platform."),
        intel("Developer Tooling", "Strong internal tooling culture", "Uber has built many internal developer tools. Seller inference: the bar is integration with existing workflows."),
      ],
    },
    {
      id: "adobe",
      name: "Adobe",
      sector: "Creative and document software",
      tier: 1,
      potentialArr: 4_000_000,
      motion: "AI coding for product engineering",
      lastActivityDaysAgo: 12,
      lastActivity: "Discovery agenda shared with Engineering Productivity",
      thesis:
        "Large, long-lived codebases across desktop, web and services, built by leaders who already ship generative AI features. IP handling decides the pace. Seller hypothesis.",
      units: [
        unit("dm", "Digital Media Engineering", "product-engineering", "Creative Cloud and Document Cloud engineering.", { size: 1.3, short: "Digital Media" }),
        unit("dx", "Digital Experience Engineering", "product-engineering", "Experience Cloud engineering.", { short: "Digital Experience" }),
        unit("prod", "Engineering Productivity", "developer-experience", "Developer tools and build infrastructure.", { short: "Eng Productivity" }),
      ],
      stakeholders: [
        person("dir-prod", "Director, Engineering Productivity", "Technical Buyer", 4, "prod", "engaged", "Owns developer tooling standards."),
        person("sem", "Senior Engineering Manager, Developer Tools", "Champion", 3, "prod", "contacted", "Collecting team feedback on AI editors."),
        person("vp-dm", "VP, Engineering, Digital Media", "Economic Buyer", 5, "dm", "unworked", "Largest engineering budget."),
        person("prodsec", "Director, Product Security", "Security", 3, "prod", "researched", "Will review IP handling and retention."),
      ],
      opportunities: [
        opp("eval", "{product} evaluation for Digital Media", "dm", 1_100_000, "Discovery", ["dir-prod", "sem"], "Agree evaluation criteria and the IP-handling review.", "sem"),
      ],
      signals: [signal("Generative AI product push", "Demo: AI features prioritized across product lines.", "product-launch", "moderate", "dm")],
      intelligence: [
        intel("Digital Surface", "Broad product portfolio", "Adobe builds Creative Cloud, Document Cloud and Experience Cloud, with large, long-lived codebases."),
        intel("AI Adoption", "Firefly and AI features", "Adobe ships generative AI features such as Firefly. Seller inference: engineering leaders already think in AI-assisted workflows."),
        intel("Security / Governance", "IP sensitivity", "Source code is core IP; expect scrutiny of data handling and retention."),
      ],
    },
    {
      id: "paypal",
      name: "PayPal",
      sector: "Digital payments",
      tier: 2,
      potentialArr: 3_200_000,
      motion: "developer velocity",
      lastActivityDaysAgo: 25,
      lastActivity: "Follow-up sent to Head of Developer Experience",
      thesis:
        "Leadership emphasis on execution speed makes developer velocity metrics resonate across PayPal, Venmo and Braintree engineering. Seller hypothesis.",
      units: [
        unit("platform", "Platform Engineering", "developer-experience", "Developer platforms and tooling.", { size: 1.2, short: "Platform" }),
        unit("venmo", "Venmo Engineering", "product-engineering", "Venmo product teams.", { short: "Venmo" }),
        unit("risk", "Risk Engineering", "data-ai", "Fraud and risk models and services.", { short: "Risk" }),
      ],
      stakeholders: [
        person("head-dx", "Head of Developer Experience", "Technical Buyer", 4, "platform", "engaged", "Wants a cycle-time baseline before committing."),
        person("lead", "Engineering Lead, Developer Tools", "Champion", 3, "platform", "contacted", "Trialled AI editors with one team."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "platform", "unworked", "Owns engineering direction."),
        person("venmo-dir", "Director, Venmo Engineering", "Influencer", 3, "venmo", "researched", "Fast-moving product teams."),
      ],
      opportunities: [
        opp("velocity", "{product} for platform engineering", "platform", 1_000_000, "Discovery", ["head-dx", "lead"], "Re-engage with a cycle-time baseline from a comparable rollout.", "lead"),
      ],
      signals: [signal("Engineering efficiency mandate", "Demo: efficiency targets set for engineering.", "earnings-priority", "moderate", "platform")],
      intelligence: [
        intel("Developer Scale", "Large engineering workforce", "PayPal operates PayPal, Venmo and Braintree with a large engineering organization."),
        intel("Executive Priorities", "Execution and efficiency", "PayPal leadership has emphasized execution speed and efficiency. Seller inference: developer velocity metrics resonate."),
      ],
    },
    {
      id: "workday",
      name: "Workday",
      sector: "Enterprise software",
      tier: 2,
      potentialArr: 3_000_000,
      motion: "AI coding rollout",
      lastActivityDaysAgo: 10,
      lastActivity: "Security questionnaire returned to Product Security",
      thesis:
        "Engineering is already investing in AI-native development as products add AI agents. Closing the security review unlocks a seat pilot. Seller hypothesis.",
      units: [
        unit("eng", "Product Development", "product-engineering", "HR and finance application engineering.", { size: 1.3, short: "Product Dev" }),
        unit("platform", "Platform & Infrastructure", "infrastructure", "Shared services and infrastructure.", { short: "Platform" }),
        unit("sec", "Product Security", "security", "Security review for engineering tools.", { short: "Security" }),
      ],
      stakeholders: [
        person("vp-prod", "VP, Engineering Productivity", "Technical Buyer", 4, "eng", "engaged", "Sponsor for the pilot."),
        person("mgr-tools", "Senior Manager, Developer Tools", "Champion", 3, "eng", "engaged", "Champion: drafted the pilot plan."),
        person("prodsec", "Director, Product Security", "Security", 4, "sec", "contacted", "Reviewing the questionnaire."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "eng", "unworked", "Final sign-off."),
      ],
      opportunities: [
        opp("rollout", "{product} for product development", "eng", 1_000_000, "Qualified", ["vp-prod", "mgr-tools", "prodsec"], "Close the security review; start a 200-seat pilot.", "mgr-tools"),
      ],
      signals: [signal("AI agents in products", "Demo: new agent features on the product roadmap.", "product-launch", "moderate", "eng")],
      intelligence: [
        intel("Digital Surface", "HR and finance cloud", "Workday builds HR and finance applications used by large enterprises."),
        intel("AI Adoption", "AI agents in products", "Workday has announced AI agents in its products. Seller inference: engineering is already investing in AI-native development."),
      ],
    },
    {
      id: "spotify",
      name: "Spotify",
      sector: "Audio streaming",
      tier: 2,
      potentialArr: 2_600_000,
      motion: "agents in golden paths",
      lastActivityDaysAgo: 31,
      lastActivity: "Discovery meeting with Director, Developer Experience",
      thesis:
        "Autonomous squads adopt bottom-up, then platform teams standardize through golden paths. Agents that plug into those paths fit the culture. Seller hypothesis.",
      units: [
        unit("platform", "Platform", "developer-experience", "Developer experience, including Backstage.", { size: 1.2 }),
        unit("product", "Product Engineering", "product-engineering", "Consumer and creator product squads.", { short: "Product" }),
        unit("ml", "ML Platform", "data-ai", "Personalization and ML infrastructure.", { short: "ML" }),
      ],
      stakeholders: [
        person("dir-dx", "Director, Developer Experience", "Technical Buyer", 4, "platform", "engaged", "Took the discovery meeting; wants golden-path integration."),
        person("staff", "Staff Engineer, Backstage", "Influencer", 3, "platform", "contacted", "Would build the integration."),
        person("vp-eng", "VP, Engineering", "Economic Buyer", 5, "product", "unworked", "Owns product engineering."),
      ],
      opportunities: [
        opp("agents", "Agentic coding inside golden-path workflows", "platform", 800_000, "Discovery", ["dir-dx", "staff"], "Re-engage with an agent-plus-golden-path proposal.", "dir-dx"),
      ],
      signals: [signal("Developer experience survey", "Demo: survey flags review wait times.", "developer-productivity", "moderate", "platform")],
      intelligence: [
        intel("Developer Tooling", "Backstage", "Spotify created Backstage, the open-source developer portal now under the CNCF. Seller inference: tools that plug into golden paths fit the culture."),
        intel("Developer Scale", "Autonomous squads", "Spotify's engineering model gives teams autonomy. Seller inference: bottom-up adoption followed by central standardization."),
      ],
    },
    {
      id: "robinhood",
      name: "Robinhood",
      sector: "Retail brokerage",
      tier: 3,
      potentialArr: 1_600_000,
      motion: "AI coding for a lean team",
      lastActivityDaysAgo: 40,
      lastActivity: "Reference call offered to Head of Engineering Productivity",
      thesis:
        "A fast-shipping product team under broker-dealer controls. Velocity is the pitch; vendor-risk review is the gate. Seller hypothesis.",
      units: [
        unit("eng", "Engineering", "product-engineering", "Trading, retirement and banking products.", { size: 1.2 }),
        unit("infra", "Infrastructure", "infrastructure", "Platform and reliability.", { short: "Infra" }),
      ],
      stakeholders: [
        person("head-prod", "Head of Engineering Productivity", "Technical Buyer", 4, "eng", "engaged", "Interested; wants to hear from a peer."),
        person("staff", "Staff Engineer, Tooling", "Champion", 3, "eng", "contacted", "Already uses AI editors personally."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "eng", "unworked", "Owns engineering budget."),
      ],
      opportunities: [
        opp("rollout", "{product} for core product teams", "eng", 600_000, "Discovery", ["head-prod", "staff"], "Schedule the reference call that slipped.", "staff"),
      ],
      signals: [signal("Rapid product launches", "Demo: aggressive launch calendar.", "product-launch", "weak", "eng")],
      intelligence: [
        intel("Business Model", "Retail investing platform", "Robinhood offers trading, retirement and banking products and ships features quickly."),
        intel("Security / Governance", "Regulated broker-dealer", "Code-handling and vendor-risk reviews apply."),
      ],
    },
    {
      id: "snap",
      name: "Snap",
      sector: "Camera and social",
      tier: 3,
      potentialArr: 1_800_000,
      motion: "AI coding rollout",
      lastActivityDaysAgo: 81,
      lastActivity: "Intro call with Director, Developer Productivity",
      thesis:
        "Cost discipline means productivity framing beats net-new spend framing. The thread stalled after an intro call. Seller hypothesis.",
      units: [
        unit("eng", "Snapchat Engineering", "product-engineering", "Core app engineering.", { size: 1.2, short: "Snapchat" }),
        unit("ar", "AR Platform", "product-engineering", "Lens Studio and Spectacles.", { short: "AR" }),
        unit("infra", "Infrastructure", "infrastructure", "Cost programs paused tooling changes in this demo.", { dormant: true }),
      ],
      stakeholders: [
        person("dir-prod", "Director, Developer Productivity", "Technical Buyer", 4, "eng", "contacted", "Took an intro call; no follow-up since."),
        person("principal", "Principal Engineer, Developer Tools", "Champion", 3, "eng", "researched", "Advocates for AI tooling internally."),
        person("vp-eng", "VP, Engineering", "Economic Buyer", 5, "eng", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("pilot", "{product} pilot for Snapchat engineering", "eng", 600_000, "Discovery", ["dir-prod", "principal"], "Re-open: the last conversation was months ago.", "principal"),
      ],
      signals: [signal("AR platform investment", "Demo: AR teams growing.", "product-launch", "weak", "ar")],
      intelligence: [
        intel("Digital Surface", "Snapchat and AR", "Snap builds Snapchat, Lens Studio and Spectacles."),
        intel("Executive Priorities", "Cost discipline", "Snap has run cost-reduction programs. Seller inference: productivity framing beats net-new spend framing."),
      ],
    },
  ],
};
