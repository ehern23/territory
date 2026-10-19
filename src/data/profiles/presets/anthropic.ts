import type { SellerPreset } from "@/domain/profile";
import { intel, opp, person, signal, unit } from "../dsl";

/**
 * Anthropic enterprise territory. Target companies are real; organisations and
 * theses are seller inference; people, stages and dollars are demo. Nothing
 * here describes an actual customer relationship.
 */
export const anthropic: SellerPreset = {
  aliases: ["anthropic", "anthropic pbc", "claude"],
  profile: {
    id: "anthropic",
    company: "Anthropic",
    productName: "Claude",
    product: "Claude for enterprise: Claude Enterprise, Claude Code and the Claude Developer Platform",
    category: "enterprise AI",
    role: "AE",
    territoryLabel: "Anthropic Enterprise",
    motion: "enterprise Claude deployment",
    icp: "Large, often regulated enterprises with heavy knowledge work and large engineering organizations that need frontier models with strong safety, security and governance.",
    valueProps: [
      "Frontier reasoning for complex, high-stakes work",
      "Agentic coding with Claude Code across large codebases",
      "Enterprise controls: SSO, audit logs and data-retention settings",
      "Available on the Claude API, Amazon Bedrock, Google Cloud Vertex AI and Microsoft Foundry",
    ],
    personas: ["CIO / CTO", "Chief Data & AI Officer", "VP Engineering", "CISO", "Head of AI Platform"],
    archetype: "ai-platform",
    source: "preset",
  },
  seeds: [
    {
      id: "pfizer",
      name: "Pfizer",
      sector: "Biopharmaceuticals",
      tier: 1,
      potentialArr: 7_500_000,
      motion: "enterprise {product} deployment",
      lastActivityDaysAgo: 2,
      lastActivity: "Security review kickoff with the AI Platform team",
      thesis:
        "Large R&D, medical and engineering organizations do document-heavy, high-stakes work under strict regulation. Agentic coding for modernization is the opening; governed knowledge work in R&D and Medical is the expansion. Seller hypothesis, not a confirmed opportunity. Global Supply is held dormant.",
      units: [
        unit("digital", "Digital & Technology", "data-ai", "Enterprise AI platform and engineering. The live evaluation of {product} for coding and knowledge work.", { size: 1.4, short: "Digital" }),
        unit("rd", "Research & Development", "data-ai", "Scientists and clinical teams with document-heavy, high-stakes workflows.", { short: "R&D" }),
        unit("commercial", "Commercial & Medical", "revenue", "Medical, marketing and field teams; content review is regulated.", { short: "Commercial" }),
        unit("supply", "Global Supply", "operations", "Manufacturing and supply. No AI initiative in scope for this demo.", { dormant: true }),
      ],
      stakeholders: [
        person("head-ai", "Head of AI Platform", "Technical Buyer", 4, "digital", "meeting", "Meeting booked to review model governance and deployment options."),
        person("dir-eng", "Director, Engineering Productivity", "Champion", 4, "digital", "engaged", "Champion: wants agentic coding for application modernization."),
        person("cdto", "Chief Digital & Technology Officer", "Executive Sponsor", 5, "digital", "unworked", "Sponsor for any enterprise-wide rollout. Unworked."),
        person("ai-risk", "Head of AI Risk & Security", "Security", 3, "digital", "engaged", "Runs AI governance reviews; supportive if controls are clear."),
        person("rd-dir", "Director, R&D Informatics", "Technical Buyer", 4, "rd", "researched", "Would own scientific use cases such as literature and protocol review."),
        person("med-dir", "Director, Medical Content", "Influencer", 4, "commercial", "unworked", "Medical-legal review is slow; interested in governed drafting."),
      ],
      opportunities: [
        opp("code", "{product} Code for engineering modernization", "digital", 2_200_000, "Qualified", ["head-ai", "dir-eng"], "Scoped pilot with two engineering teams, sequenced with AI Risk & Security.", "dir-eng"),
        opp("enterprise", "{product} Enterprise for R&D and Medical", "rd", 5_000_000, "Forming", ["cdto", "ai-risk", "rd-dir", "med-dir"], "Executive working session on governed knowledge-work use cases.", "ai-risk"),
      ],
      signals: [
        signal("AI governance board approvals", "Demo: the internal AI governance board is approving new use cases.", "governance", "strong", "digital"),
        signal("Engineering productivity mandate", "Demo: engineering leadership set cycle-time goals for modernization work.", "developer-productivity", "moderate", "digital"),
      ],
      intelligence: [
        intel("Company Scale", "Global biopharma", "Pfizer is one of the largest biopharmaceutical companies, with large R&D, manufacturing, medical and commercial organizations."),
        intel("AI Adoption", "Public AI ambitions", "Pfizer has spoken publicly about applying AI across research, manufacturing and commercial work. Seller inference: governance and validation will shape any deployment."),
        intel("Security / Governance", "Regulated content", "Clinical, medical and promotional content is heavily regulated. Seller inference: auditability and data handling are gating requirements."),
      ],
    },
    {
      id: "unitedhealth",
      name: "UnitedHealth Group",
      sector: "Health care and insurance",
      tier: 1,
      potentialArr: 6_000_000,
      motion: "agentic coding at scale",
      lastActivityDaysAgo: 5,
      lastActivity: "Use-case prioritization with Optum Technology",
      thesis:
        "Optum runs a very large engineering organization with long-lived codebases, and operations teams process enormous volumes of documents. Agentic coding is the opening; governed operations automation follows. Seller hypothesis.",
      units: [
        unit("optum", "Optum Technology", "product-engineering", "Large engineering organization building health services software.", { size: 1.4, short: "Optum Tech" }),
        unit("ops", "Claims & Member Operations", "operations", "Document-heavy processes in claims and member services.", { short: "Operations" }),
        unit("clinical", "Clinical Programs", "data-ai", "Care management teams; any AI use is closely governed.", { short: "Clinical" }),
      ],
      stakeholders: [
        person("vp-eng", "VP, Engineering Platforms", "Technical Buyer", 4, "optum", "engaged", "Interested in agentic coding for large legacy codebases."),
        person("dir-dx", "Director, Developer Experience", "Champion", 3, "optum", "engaged", "Wants measurable cycle-time gains before scaling."),
        person("ops-dir", "Director, Operations Automation", "Influencer", 4, "ops", "contacted", "Owns automation in claims processing."),
        person("svp-tech", "SVP, Technology", "Economic Buyer", 5, "optum", "unworked", "Budget owner for engineering tooling."),
      ],
      opportunities: [
        opp("code", "Agentic coding across Optum engineering", "optum", 1_800_000, "Discovery", ["vp-eng", "dir-dx", "ops-dir"], "Define a pilot on a modernization backlog with cycle-time goals.", "dir-dx"),
      ],
      signals: [signal("Engineering modernization", "Demo: modernization backlog named in engineering planning.", "platform-migration", "moderate", "optum")],
      intelligence: [
        intel("Company Scale", "Very large technology organization", "UnitedHealth Group includes UnitedHealthcare and Optum; Optum runs a large technology organization serving health systems and payers."),
        intel("Security / Governance", "Protected health information", "HIPAA and member data make deployment controls central. Seller inference: data-retention and audit features matter as much as raw capability."),
      ],
    },
    {
      id: "blackrock",
      name: "BlackRock",
      sector: "Asset management",
      tier: 1,
      potentialArr: 4_500_000,
      motion: "AI for investment research",
      lastActivityDaysAgo: 13,
      lastActivity: "Discovery agenda shared with Aladdin Engineering",
      thesis:
        "Analysts synthesize filings, research and data under model-risk controls, and Aladdin engineering is a product-embedding motion of its own. Research workflows are the opening. Seller hypothesis.",
      units: [
        unit("aladdin", "Aladdin Engineering", "product-engineering", "Builds the Aladdin platform used by BlackRock and external clients.", { size: 1.3, short: "Aladdin" }),
        unit("research", "Investment Research", "data-ai", "Analysts synthesizing filings, research and data.", { short: "Research" }),
        unit("client", "Global Client Service", "revenue", "No initiative identified in this demo.", { dormant: true, short: "Client Service" }),
      ],
      stakeholders: [
        person("dir-aladdin", "Director, Aladdin Developer Platform", "Technical Buyer", 4, "aladdin", "engaged", "Owns how engineers build on Aladdin; curious about agentic coding."),
        person("applied-ai", "Head of Applied AI, Investments", "Champion", 4, "research", "contacted", "Wants research summarization analysts actually trust."),
        person("md-tech", "Managing Director, Technology", "Economic Buyer", 5, "aladdin", "unworked", "Budget owner for platform tooling."),
        person("tech-risk", "Director, Technology Risk", "Security", 3, "aladdin", "researched", "Model-risk review gatekeeper."),
      ],
      opportunities: [
        opp("research", "{product} for investment research workflows", "research", 1_500_000, "Discovery", ["dir-aladdin", "applied-ai"], "Map three research workflows; agree an evaluation set.", "applied-ai"),
      ],
      signals: [signal("AI features in Aladdin", "Demo: AI capabilities on the Aladdin product roadmap.", "product-launch", "moderate", "aladdin")],
      intelligence: [
        intel("Digital Surface", "Aladdin platform", "BlackRock's Aladdin is an investment and risk platform used internally and licensed to other institutions. Seller inference: AI inside Aladdin is a product-embedding motion, distinct from internal productivity."),
        intel("Security / Governance", "Regulated asset manager", "Model risk management and data controls will shape any deployment."),
      ],
    },
    {
      id: "siemens",
      name: "Siemens",
      sector: "Industrial technology",
      tier: 2,
      potentialArr: 3_800_000,
      motion: "AI for industrial software",
      lastActivityDaysAgo: 26,
      lastActivity: "Follow-up sent to Head of Software Engineering, Digital Industries",
      thesis:
        "A large engineering workforce maintains complex industrial software. Code generation and documentation are strong fits; large industrials usually work with several model providers, so win on specific workloads. Seller hypothesis.",
      units: [
        unit("di", "Digital Industries Software", "product-engineering", "Industrial software portfolio with a large engineering population.", { size: 1.3, short: "Digital Industries" }),
        unit("si", "Smart Infrastructure", "product-engineering", "Building and grid technology.", { short: "Smart Infra" }),
        unit("corp", "Technology & AI", "data-ai", "Central AI research and platforms.", { short: "Technology" }),
      ],
      stakeholders: [
        person("head-eng", "Head of Software Engineering, Digital Industries", "Technical Buyer", 4, "di", "engaged", "Interested if IP handling and on-premise options are clear."),
        person("principal", "Principal Engineer, Developer Tools", "Champion", 3, "di", "contacted", "Ran an internal comparison of coding assistants."),
        person("cto", "Chief Technology Officer, Digital Industries", "Economic Buyer", 5, "di", "unworked", "Sets the AI tooling direction for the business."),
        person("ai-dir", "Director, AI Platforms", "Influencer", 3, "corp", "researched", "Runs the central model catalogue."),
      ],
      opportunities: [
        opp("code", "{product} Code for industrial software teams", "di", 1_200_000, "Discovery", ["head-eng", "principal"], "Revive the thread with a security and IP-handling brief.", "principal"),
      ],
      signals: [signal("Industrial AI push", "Demo: new industrial AI initiatives announced internally.", "ai-initiative", "moderate", "corp")],
      intelligence: [
        intel("Company Scale", "Global engineering workforce", "Siemens employs a large global engineering and software workforce across its businesses."),
        intel("AI Adoption", "Industrial AI focus", "Siemens has publicly positioned industrial AI as a strategic priority. Seller inference: code generation and documentation for complex industrial software are strong fits."),
        intel("Competitive Environment", "Multiple model partners", "Large industrials typically work with several AI providers. Seller inference: win on specific workloads, not exclusivity."),
      ],
    },
    {
      id: "att",
      name: "AT&T",
      sector: "Telecommunications",
      tier: 2,
      potentialArr: 4_000_000,
      motion: "AI for customer care",
      lastActivityDaysAgo: 9,
      lastActivity: "Agent-assist workshop with the Chief Data Office",
      thesis:
        "Large contact-center operations make support quality and cost a board-level metric, and a central platform team decides which models employees can use. Agent-assist is the opening. Seller hypothesis.",
      units: [
        unit("cdo", "Chief Data Office", "data-ai", "Central data and AI platform team.", { size: 1.2, short: "Data Office" }),
        unit("care", "Customer Care", "revenue", "Contact centers and digital support.", { short: "Care" }),
        unit("network", "Network Engineering", "infrastructure", "Large engineering organization running the network.", { short: "Network" }),
      ],
      stakeholders: [
        person("vp-ai", "VP, AI Platform", "Technical Buyer", 4, "cdo", "engaged", "Owns the internal model catalogue and evaluation process."),
        person("architect", "Distinguished Architect, Generative AI", "Champion", 4, "cdo", "engaged", "Champion: impressed by long-context reasoning on care transcripts."),
        person("care-dir", "Director, Digital Care", "Influencer", 3, "care", "contacted", "Measured on resolution and handle time."),
        person("cdo-exec", "Chief Data Officer", "Economic Buyer", 5, "cdo", "unworked", "Final say on platform providers."),
      ],
      opportunities: [
        opp("care", "{product} for agent-assist in customer care", "care", 1_400_000, "Qualified", ["vp-ai", "architect", "care-dir"], "Evaluate against current agent-assist quality metrics.", "architect"),
      ],
      signals: [signal("Internal AI platform expansion", "Demo: new models added to the internal AI platform.", "ai-initiative", "strong", "cdo")],
      intelligence: [
        intel("AI Adoption", "Internal generative AI platform", "AT&T has described internal generative AI tools for employees. Seller inference: the platform team decides which models are available."),
        intel("Business Model", "Consumer and business connectivity", "Large contact-center operations make support quality and cost a board-level metric."),
      ],
    },
    {
      id: "intuit",
      name: "Intuit",
      sector: "Financial software",
      tier: 2,
      potentialArr: 3_000_000,
      motion: "models for product features",
      lastActivityDaysAgo: 30,
      lastActivity: "Discovery meeting with Director, AI Platform",
      thesis:
        "An internal generative AI platform serves TurboTax, Credit Karma, QuickBooks and Mailchimp, and model choice is made per use case. Earning a place in the model portfolio is the opening. Seller hypothesis.",
      units: [
        unit("platform", "Generative AI Platform", "data-ai", "Internal platform for building AI features across products.", { size: 1.2, short: "AI Platform" }),
        unit("eng", "Product Engineering", "product-engineering", "TurboTax, QuickBooks, Credit Karma and Mailchimp engineering.", { short: "Product Eng" }),
      ],
      stakeholders: [
        person("dir-platform", "Director, AI Platform", "Technical Buyer", 4, "platform", "engaged", "Runs model evaluations for product teams."),
        person("staff", "Staff Engineer, AI Platform", "Influencer", 3, "platform", "contacted", "Built the evaluation harness."),
        person("vp-eng", "VP, Engineering", "Economic Buyer", 5, "eng", "unworked", "Owns product engineering budgets."),
      ],
      opportunities: [
        opp("models", "{product} in the model portfolio for product features", "platform", 1_000_000, "Discovery", ["dir-platform", "staff"], "Re-engage on evaluation results for two product use cases.", "dir-platform"),
      ],
      signals: [signal("Seasonal readiness planning", "Demo: tax-season readiness reviews under way.", "earnings-priority", "weak", "eng")],
      intelligence: [
        intel("Digital Surface", "Consumer and small-business products", "Intuit makes TurboTax, Credit Karma, QuickBooks and Mailchimp."),
        intel("AI Adoption", "Internal AI platform", "Intuit has publicly invested in an internal generative AI platform and AI features across its products. Seller inference: model choice is made per use case by a platform team."),
      ],
    },
    {
      id: "booking",
      name: "Booking Holdings",
      sector: "Online travel",
      tier: 3,
      potentialArr: 2_600_000,
      motion: "agentic travel experiences",
      lastActivityDaysAgo: 40,
      lastActivity: "Reference architecture requested by Booking.com Applied AI",
      thesis:
        "AI trip planning depends on tool use and reliability over long conversations. A planning assistant is the opening across a portfolio of travel brands. Seller hypothesis.",
      units: [
        unit("booking", "Booking.com Engineering", "product-engineering", "The largest brand's product and AI engineering.", { size: 1.3, short: "Booking.com" }),
        unit("brands", "Portfolio Brands", "product-engineering", "Priceline, Agoda, Kayak and OpenTable engineering.", { short: "Brands" }),
      ],
      stakeholders: [
        person("ai-dir", "Director, Applied AI", "Technical Buyer", 4, "booking", "engaged", "Asked for a reference architecture."),
        person("pm", "Principal Product Manager, Trip Planning", "Champion", 3, "booking", "contacted", "Owns the trip-planning experience."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "booking", "unworked", "Sets platform direction."),
      ],
      opportunities: [
        opp("planner", "Agentic trip-planning assistant", "booking", 900_000, "Discovery", ["ai-dir", "pm"], "Send the reference architecture; propose an offline evaluation.", "pm"),
      ],
      signals: [signal("AI trip planning", "Demo: AI trip-planning features expanded.", "product-launch", "moderate", "booking")],
      intelligence: [
        intel("Business Model", "Portfolio of travel brands", "Booking Holdings owns Booking.com, Priceline, Agoda, Kayak and OpenTable."),
        intel("AI Adoption", "AI trip planning", "Online travel companies have launched AI trip-planning features. Seller inference: tool use and reliability over long conversations are the evaluation criteria."),
      ],
    },
    {
      id: "pg",
      name: "Procter & Gamble",
      sector: "Consumer goods",
      tier: 3,
      potentialArr: 2_200_000,
      motion: "AI for R&D knowledge",
      lastActivityDaysAgo: 84,
      lastActivity: "Intro call with Director, Digital Innovation",
      thesis:
        "Large R&D and brand organizations hold decades of product knowledge. A governed R&D knowledge assistant is a credible first workload. Seller hypothesis. The thread has gone cold.",
      units: [
        unit("it", "Information Technology", "business", "Global IT and digital.", { size: 1.1, short: "IT" }),
        unit("rd", "Research & Development", "data-ai", "Product research and formulation knowledge.", { short: "R&D" }),
        unit("brand", "Brand Operations", "revenue", "Agency-led content; no internal AI initiative in this demo.", { dormant: true, short: "Brands" }),
      ],
      stakeholders: [
        person("dir-digital", "Director, Digital Innovation", "Technical Buyer", 4, "it", "contacted", "Took an intro call; no follow-up since."),
        person("rd-km", "Associate Director, R&D Knowledge Management", "Champion", 3, "rd", "researched", "Wants researchers to find prior work faster."),
        person("cio", "Chief Information Officer", "Economic Buyer", 5, "it", "unworked", "Owns the digital agenda."),
      ],
      opportunities: [
        opp("knowledge", "R&D knowledge assistant", "rd", 700_000, "Discovery", ["dir-digital", "rd-km"], "Re-open with a governed knowledge-retrieval demo.", "rd-km"),
      ],
      signals: [signal("Digital productivity program", "Demo: productivity targets set for digital teams.", "platform-migration", "weak", "it")],
      intelligence: [
        intel("Company Scale", "Global consumer goods leader", "P&G owns brands such as Tide, Pampers and Gillette, with large R&D and brand organizations."),
        intel("Executive Priorities", "Productivity programs", "P&G has publicly emphasized productivity and digitization. Seller inference: knowledge reuse across R&D is a credible first workload."),
      ],
    },
  ],
};
