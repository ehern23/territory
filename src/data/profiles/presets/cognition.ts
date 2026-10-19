import type { SellerPreset } from "@/domain/profile";
import { intel, opp, person, signal, unit } from "../dsl";

/**
 * Cognition territory: enterprises with large legacy codebases and migration
 * backlogs. Target companies are real; theses are seller inference; people,
 * stages and dollars are demo.
 */
export const cognition: SellerPreset = {
  aliases: ["cognition", "cognition ai", "cognition labs", "devin", "windsurf"],
  profile: {
    id: "cognition",
    company: "Cognition",
    productName: "Devin",
    product: "Devin, the autonomous AI software engineer, and Windsurf",
    category: "autonomous software engineering",
    role: "AE",
    territoryLabel: "Cognition Enterprise",
    motion: "agentic modernization",
    icp: "Enterprises with large legacy codebases and long migration backlogs (banks, insurers, logistics and industrials) that want autonomous agents to clear modernization work.",
    valueProps: [
      "Devin takes tickets end to end: plan, code, test, open the PR",
      "Parallel agents for large migrations and upgrades",
      "Windsurf for engineers in the loop",
      "Enterprise deployment with security controls",
    ],
    personas: ["CIO", "Head of Engineering Modernization", "VP Engineering", "Director, Platform Engineering", "CISO"],
    archetype: "devtools",
    source: "preset",
  },
  seeds: [
    {
      id: "citi",
      name: "Citi",
      sector: "Global banking",
      tier: 1,
      potentialArr: 6_000_000,
      motion: "legacy modernization",
      lastActivityDaysAgo: 3,
      lastActivity: "Migration pilot planning with Engineering Excellence",
      thesis:
        "A multi-year transformation and close regulatory attention make modernization backlogs large and visible, and every change must be reviewable. A scoped upgrade pilot is the opening; a firmwide modernization program is the expansion. Seller hypothesis. Wealth Technology is held dormant.",
      units: [
        unit("tech", "Citi Technology", "developer-experience", "Engineering excellence and developer platforms. The live pilot.", { size: 1.4, short: "Technology" }),
        unit("markets", "Markets Technology", "platform", "Trading and risk systems with long-lived code.", { short: "Markets" }),
        unit("services", "Services Technology", "product-engineering", "Treasury and trade services platforms.", { short: "Services" }),
        unit("wealth", "Wealth Technology", "product-engineering", "No modernization trigger in this demo.", { dormant: true, short: "Wealth" }),
      ],
      stakeholders: [
        person("dir-ee", "Director, Engineering Excellence", "Technical Buyer", 4, "tech", "meeting", "Meeting booked to scope a migration pilot."),
        person("sem-mod", "Senior Engineering Manager, Modernization", "Champion", 4, "tech", "engaged", "Champion: owns a large Java upgrade backlog."),
        person("cio", "Chief Information Officer", "Executive Sponsor", 5, "tech", "unworked", "Sponsor for a firmwide program. Unworked."),
        person("tech-risk", "Head of Technology Risk", "Security", 3, "tech", "engaged", "Will approve agent output only with full audit trails."),
        person("md-markets", "Managing Director, Markets Technology", "Technical Buyer", 4, "markets", "researched", "Owns the oldest trading-system code."),
        person("dir-services", "Director, Services Engineering", "Influencer", 4, "services", "unworked", "Treasury platforms with upgrade debt."),
      ],
      opportunities: [
        opp("pilot", "{product} pilot on a Java upgrade backlog", "tech", 1_800_000, "Qualified", ["dir-ee", "sem-mod"], "Run parallel agents on a scoped upgrade backlog with risk sign-off.", "sem-mod"),
        opp("program", "Firmwide modernization program", "markets", 4_500_000, "Forming", ["cio", "tech-risk", "md-markets", "dir-services"], "Executive review of pilot throughput and controls.", "tech-risk"),
      ],
      signals: [
        signal("Transformation milestones", "Demo: modernization milestones tied to the transformation program.", "platform-migration", "strong", "tech"),
        signal("Engineering hiring", "Demo: roles posted for modernization engineering.", "hiring-surge", "moderate", "tech"),
      ],
      intelligence: [
        intel("Transformation Initiatives", "Multi-year transformation", "Citi has been executing a multi-year transformation, simplifying its organization and modernizing risk and data systems. Seller inference: modernization backlogs are large and visible."),
        intel("Developer Scale", "Large engineering population", "Citi employs a large global technology workforce."),
        intel("Security / Governance", "Regulatory scrutiny", "Change management and controls are under close regulatory attention. Seller inference: agent output must be reviewable and auditable."),
      ],
    },
    {
      id: "wells-fargo",
      name: "Wells Fargo",
      sector: "Banking",
      tier: 1,
      potentialArr: 5_000_000,
      motion: "service migration",
      lastActivityDaysAgo: 6,
      lastActivity: "Backlog assessment shared with Platform Modernization",
      thesis:
        "Ongoing cloud and technology modernization leaves services to migrate and upgrade under rigorous model-risk and change-control review. Seller hypothesis.",
      units: [
        unit("tech", "Enterprise Technology", "platform", "Platform modernization and shared services.", { size: 1.3, short: "Enterprise Tech" }),
        unit("consumer", "Consumer Technology", "product-engineering", "Consumer banking applications.", { short: "Consumer" }),
        unit("cib", "Corporate & Investment Banking Technology", "product-engineering", "Wholesale platforms.", { short: "CIB" }),
      ],
      stakeholders: [
        person("dir-mod", "Director, Platform Modernization", "Technical Buyer", 4, "tech", "engaged", "Commissioned the backlog assessment."),
        person("lead", "Lead Software Engineer, Modernization", "Champion", 3, "tech", "engaged", "Hands-on evaluator; wants reviewable PRs."),
        person("vp-consumer", "VP, Consumer Engineering", "Influencer", 4, "consumer", "contacted", "Has the next migration wave."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "tech", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("migration", "Service migration with parallel agents", "tech", 1_500_000, "Discovery", ["dir-mod", "lead", "vp-consumer"], "Turn the backlog assessment into a pilot proposal.", "lead"),
      ],
      signals: [signal("Cloud migration milestones", "Demo: migration waves scheduled for the year.", "platform-migration", "moderate", "tech")],
      intelligence: [
        intel("Transformation Initiatives", "Cloud and modernization", "Wells Fargo has announced multi-cloud partnerships and ongoing technology modernization."),
        intel("Security / Governance", "Regulated bank", "Expect rigorous model-risk and change-control review."),
      ],
    },
    {
      id: "fedex",
      name: "FedEx",
      sector: "Logistics",
      tier: 1,
      potentialArr: 3_800_000,
      motion: "application migration",
      lastActivityDaysAgo: 13,
      lastActivity: "Discovery agenda shared with Application Modernization",
      thesis:
        "Consolidating operating companies and redesigning the network creates application migration work across decades of systems. Seller hypothesis.",
      units: [
        unit("it", "FedEx IT", "platform", "Enterprise applications and architecture.", { size: 1.3 }),
        unit("dataworks", "FedEx Dataworks", "data-ai", "Data and analytics organization.", { short: "Dataworks" }),
        unit("ops", "Operations Technology", "operations", "Hub, fleet and sortation systems.", { short: "Ops Tech" }),
      ],
      stakeholders: [
        person("dir-mod", "Director, Application Modernization", "Technical Buyer", 4, "it", "engaged", "Owns the consolidation migration plan."),
        person("architect", "Principal Architect", "Champion", 3, "it", "engaged", "Champion: mapped candidate applications."),
        person("cio", "Chief Information Officer", "Economic Buyer", 5, "it", "unworked", "Sets the modernization agenda."),
        person("ops-dir", "Director, Operations Systems", "Influencer", 3, "ops", "researched", "Systems that cannot go down."),
      ],
      opportunities: [
        opp("migrate", "Agent-led migration of legacy services", "it", 1_200_000, "Discovery", ["dir-mod", "architect"], "Scope a candidate application portfolio.", "architect"),
      ],
      signals: [signal("Network consolidation program", "Demo: application consolidation milestones announced internally.", "platform-migration", "strong", "ops")],
      intelligence: [
        intel("Transformation Initiatives", "One FedEx and network redesign", "FedEx has been consolidating its operating companies and redesigning its network. Seller inference: consolidation creates application migration work."),
        intel("Developer Scale", "Large IT estate", "Decades of systems across air, ground and freight."),
      ],
    },
    {
      id: "allstate",
      name: "Allstate",
      sector: "Insurance",
      tier: 2,
      potentialArr: 2_800_000,
      motion: "claims platform modernization",
      lastActivityDaysAgo: 24,
      lastActivity: "Follow-up sent to Director, Claims Technology",
      thesis:
        "Claims systems are core, and faster change there is a lever on loss-adjustment expense. Test coverage is the low-risk opening. Seller hypothesis.",
      units: [
        unit("claims", "Claims Technology", "product-engineering", "Claims platforms and integrations.", { size: 1.2, short: "Claims" }),
        unit("tech", "Enterprise Technology", "platform", "Shared platforms and architecture.", { short: "Enterprise Tech" }),
        unit("protection", "Allstate Protection Plans", "product-engineering", "Consumer protection plans engineering.", { short: "Protection Plans" }),
      ],
      stakeholders: [
        person("dir-claims", "Director, Claims Technology", "Technical Buyer", 4, "claims", "engaged", "Interested if agents start with tests, not features."),
        person("em", "Engineering Manager, Claims Platform", "Champion", 3, "claims", "contacted", "Owns the test-coverage backlog."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "tech", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("claims", "Claims platform test coverage and upgrades", "claims", 900_000, "Discovery", ["dir-claims", "em"], "Propose agents on test coverage first: low risk, visible results.", "em"),
      ],
      signals: [signal("Claims system replacement", "Demo: claims platform roadmap under review.", "platform-migration", "moderate", "claims")],
      intelligence: [
        intel("Business Model", "Personal lines insurer", "Allstate sells auto, home and other personal insurance; claims systems are core."),
        intel("Executive Priorities", "Cost and speed", "Seller inference: faster claims-system change is a lever on loss-adjustment expense."),
      ],
    },
    {
      id: "prudential",
      name: "Prudential Financial",
      sector: "Insurance and asset management",
      tier: 2,
      potentialArr: 2_600_000,
      motion: "dependency upgrades",
      lastActivityDaysAgo: 9,
      lastActivity: "Pilot criteria agreed with Engineering Enablement",
      thesis:
        "Years of products and acquisitions leave upgrade and migration backlogs across insurance, retirement and PGIM. Dependency upgrades are the measurable opening. Seller hypothesis.",
      units: [
        unit("tech", "Global Technology", "developer-experience", "Engineering enablement and platforms.", { size: 1.2, short: "Technology" }),
        unit("pgim", "PGIM Technology", "product-engineering", "Asset management platforms.", { short: "PGIM" }),
        unit("retirement", "Retirement Technology", "product-engineering", "Retirement and group insurance platforms.", { short: "Retirement" }),
      ],
      stakeholders: [
        person("dir-enable", "Director, Engineering Enablement", "Technical Buyer", 4, "tech", "engaged", "Agreed the pilot criteria."),
        person("lead", "Lead Engineer, Developer Platforms", "Champion", 3, "tech", "engaged", "Will run the pilot day to day."),
        person("cio", "Chief Information Officer", "Economic Buyer", 5, "tech", "unworked", "Final sign-off."),
        person("pgim-head", "Head of PGIM Engineering", "Influencer", 3, "pgim", "researched", "Could be the second team."),
      ],
      opportunities: [
        opp("pilot", "{product} pilot on dependency upgrades", "tech", 850_000, "Qualified", ["dir-enable", "lead"], "Start the pilot; measure merged PRs per week.", "lead"),
      ],
      signals: [signal("Developer productivity goals", "Demo: engineering enablement targets set.", "developer-productivity", "moderate", "tech")],
      intelligence: [
        intel("Business Model", "Insurance, retirement and PGIM", "Prudential Financial operates insurance and retirement businesses and the PGIM asset manager."),
        intel("Transformation Initiatives", "Technology simplification", "Seller inference: years of products and acquisitions leave upgrade and migration backlogs."),
      ],
    },
    {
      id: "humana",
      name: "Humana",
      sector: "Health insurance",
      tier: 2,
      potentialArr: 2_400_000,
      motion: "legacy modernization",
      lastActivityDaysAgo: 33,
      lastActivity: "Discovery meeting with Director, Enterprise Applications",
      thesis:
        "Enterprise applications carry modernization debt, and strict controls apply to anything near protected health information. A security brief is the way back in. Seller hypothesis.",
      units: [
        unit("apps", "Enterprise Applications", "platform", "Core enterprise applications.", { size: 1.2, short: "Applications" }),
        unit("centerwell", "CenterWell Technology", "product-engineering", "Primary care, pharmacy and home health.", { short: "CenterWell" }),
        unit("data", "Data & Analytics", "data-ai", "No trigger in this demo.", { dormant: true }),
      ],
      stakeholders: [
        person("dir-apps", "Director, Enterprise Applications", "Technical Buyer", 4, "apps", "engaged", "Took the discovery meeting; security is the open question."),
        person("em", "Engineering Manager, Modernization", "Champion", 3, "apps", "contacted", "Owns the modernization backlog."),
        person("cio", "Chief Information Officer", "Economic Buyer", 5, "apps", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("modern", "Legacy application modernization", "apps", 800_000, "Discovery", ["dir-apps", "em"], "Re-engage with a security brief for agents on PHI-adjacent code.", "em"),
      ],
      signals: [signal("Modernization budget review", "Demo: application modernization budget under review.", "platform-migration", "weak", "apps")],
      intelligence: [
        intel("Business Model", "Medicare Advantage focus", "Humana is a major Medicare Advantage insurer and operates CenterWell health services."),
        intel("Security / Governance", "PHI and compliance", "Expect strict controls on code and data access."),
      ],
    },
    {
      id: "boeing",
      name: "Boeing",
      sector: "Aerospace",
      tier: 3,
      potentialArr: 2_200_000,
      motion: "IT application modernization",
      lastActivityDaysAgo: 40,
      lastActivity: "Reference requested by Director, IT Modernization",
      thesis:
        "Export controls and stringent quality processes decide feasibility, and modernization must tie to quality. Deployment model is the first question. Seller hypothesis.",
      units: [
        unit("it", "Information & Digital Technology", "platform", "Enterprise IT and digital.", { size: 1.2, short: "IT" }),
        unit("services", "Global Services Software", "product-engineering", "Services and support software.", { short: "Services" }),
      ],
      stakeholders: [
        person("dir-mod", "Director, IT Modernization", "Technical Buyer", 4, "it", "engaged", "Asked for a reference in a regulated industry."),
        person("fellow", "Senior Technical Fellow, Software", "Champion", 3, "it", "contacted", "Respected internal voice on tooling."),
        person("cio", "Chief Information Officer", "Economic Buyer", 5, "it", "unworked", "Owns the IT agenda."),
      ],
      opportunities: [
        opp("modern", "Agent-assisted application modernization", "it", 700_000, "Discovery", ["dir-mod", "fellow"], "Send the reference; address export-control questions.", "fellow"),
      ],
      signals: [signal("Quality and compliance focus", "Demo: quality programs prioritized across engineering.", "governance", "moderate", "it")],
      intelligence: [
        intel("Security / Governance", "Export controls and quality", "Aerospace software is subject to export controls and stringent quality processes. Seller inference: deployment model and data residency decide feasibility."),
        intel("Executive Priorities", "Quality and safety", "Boeing leadership has focused on quality and safety improvements. Seller inference: modernization pitches must tie to quality."),
      ],
    },
    {
      id: "comcast",
      name: "Comcast",
      sector: "Media and connectivity",
      tier: 3,
      potentialArr: 2_000_000,
      motion: "platform migration",
      lastActivityDaysAgo: 82,
      lastActivity: "Intro call with Director, Engineering Platforms",
      thesis:
        "Many platforms across connectivity, media and streaming mean recurring migration work. The thread stalled after an intro call. Seller hypothesis.",
      units: [
        unit("connectivity", "Connectivity & Platforms Technology", "platform", "Xfinity platforms and shared services.", { size: 1.2, short: "Connectivity" }),
        unit("peacock", "Peacock Engineering", "product-engineering", "Streaming product engineering.", { short: "Peacock" }),
        unit("sky", "Sky Technology", "product-engineering", "Separate tooling decisions in Europe.", { dormant: true, short: "Sky" }),
      ],
      stakeholders: [
        person("dir-plat", "Director, Engineering Platforms", "Technical Buyer", 4, "connectivity", "contacted", "Took an intro call; no follow-up since."),
        person("principal", "Principal Engineer", "Champion", 3, "connectivity", "researched", "Owns a migration backlog."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "connectivity", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("migration", "Agent-led platform migration", "connectivity", 600_000, "Discovery", ["dir-plat", "principal"], "Re-open with a scoped migration example.", "principal"),
      ],
      signals: [signal("Platform consolidation", "Demo: platform consolidation discussed in planning.", "platform-migration", "weak", "connectivity")],
      intelligence: [
        intel("Business Model", "Connectivity, media and Sky", "Comcast operates Xfinity connectivity, NBCUniversal, Peacock and Sky."),
        intel("Developer Scale", "Large engineering estate", "Seller inference: many platforms across businesses mean recurring migration work."),
      ],
    },
  ],
};
