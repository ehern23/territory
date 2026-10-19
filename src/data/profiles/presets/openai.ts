import type { SellerPreset } from "@/domain/profile";
import { intel, opp, person, signal, unit } from "../dsl";

/**
 * OpenAI enterprise territory. Target companies are real; organisations and
 * theses are seller inference; people, stages and dollars are demo.
 */
export const openai: SellerPreset = {
  aliases: ["openai", "open ai", "chatgpt", "openai inc"],
  profile: {
    id: "openai",
    company: "OpenAI",
    productName: "ChatGPT Enterprise",
    product: "ChatGPT Enterprise, the OpenAI API platform and agents",
    category: "enterprise AI",
    role: "AE",
    territoryLabel: "OpenAI Enterprise",
    motion: "ChatGPT Enterprise rollout",
    icp: "Large enterprises seeking company-wide AI adoption for knowledge workers and customer-facing teams, plus product teams building AI experiences on the API.",
    valueProps: [
      "ChatGPT Enterprise for every employee, with admin controls",
      "An API platform for custom assistants and agents",
      "Enterprise security: SSO, data controls, no training on business data by default",
      "Fast time-to-value for broad knowledge-work adoption",
    ],
    personas: ["CIO", "Chief Digital Officer", "Head of AI", "Transformation lead", "CISO"],
    archetype: "ai-platform",
    source: "preset",
  },
  seeds: [
    {
      id: "target",
      name: "Target",
      sector: "Retail",
      tier: 1,
      potentialArr: 6_500_000,
      motion: "company-wide AI adoption",
      lastActivityDaysAgo: 3,
      lastActivity: "Pilot readout with Enterprise AI",
      thesis:
        "A large headquarters and frontline workforce could make AI a company-wide workflow. Headquarters pilots are the opening; store and supply-chain teams are the expansion. Seller hypothesis, not a confirmed opportunity. Merchandising is held dormant.",
      units: [
        unit("tech", "Target Tech", "data-ai", "Enterprise technology and AI platform. Owns the live evaluation.", { size: 1.4 }),
        unit("stores", "Stores & Supply Chain", "operations", "Store teams and distribution centers: frontline knowledge at scale.", { short: "Stores" }),
        unit("digital", "Digital & Guest Experience", "product-engineering", "Target.com and app experiences.", { short: "Digital" }),
        unit("merch", "Merchandising", "revenue", "No AI initiative in scope for this demo.", { dormant: true }),
      ],
      stakeholders: [
        person("dir-ai", "Director, Enterprise AI", "Technical Buyer", 4, "tech", "meeting", "Meeting booked to review the pilot readout."),
        person("pm", "Principal Product Manager, AI Assistants", "Champion", 4, "tech", "engaged", "Champion: owns the headquarters pilot and its adoption metrics."),
        person("cio", "Chief Information Officer", "Executive Sponsor", 5, "tech", "unworked", "Sponsor for a company-wide rollout. Unworked."),
        person("governance", "Head of AI Governance", "Security", 3, "tech", "engaged", "Approves use cases; supportive of a phased frontline rollout."),
        person("stores-dir", "Director, Store Operations Technology", "Technical Buyer", 4, "stores", "researched", "Owns the tools store teams use every shift."),
        person("vp-digital", "VP, Digital Product", "Influencer", 4, "digital", "unworked", "Would bring guest-facing use cases."),
      ],
      opportunities: [
        opp("pilot", "{product} for headquarters teams", "tech", 2_400_000, "Qualified", ["dir-ai", "pm"], "Expand pilot cohorts; finalize admin and data controls.", "pm"),
        opp("frontline", "AI assistant for store and supply-chain teams", "stores", 4_000_000, "Forming", ["cio", "governance", "stores-dir", "vp-digital"], "Executive session on frontline use cases and rollout sequencing.", "governance"),
      ],
      signals: [
        signal("Frontline AI interest", "Demo: store operations asked for an assistant pilot.", "ai-initiative", "strong", "stores"),
        signal("AI governance council", "Demo: a cross-functional AI council approving use cases.", "governance", "moderate", "tech"),
      ],
      intelligence: [
        intel("Company Scale", "Large retail workforce", "Target operates nearly two thousand stores across the US with a large frontline and headquarters workforce."),
        intel("AI Adoption", "Frontline AI tools", "Target has publicly described generative AI tools for store team members. Seller inference: frontline adoption at scale needs simple, governed experiences."),
        intel("Executive Priorities", "Seller hypothesis", "Expanding from headquarters pilots to store teams could make AI a company-wide workflow. Not a confirmed opportunity."),
      ],
    },
    {
      id: "verizon",
      name: "Verizon",
      sector: "Telecommunications",
      tier: 1,
      potentialArr: 5_500_000,
      motion: "AI for customer care",
      lastActivityDaysAgo: 6,
      lastActivity: "Care-quality evaluation plan sent to AI & Data",
      thesis:
        "Customer care is a major cost and satisfaction lever for tens of millions of customers. Agent-assist judged on resolution, not demos, is the opening. Seller hypothesis.",
      units: [
        unit("ai", "AI & Data", "data-ai", "Central AI products and data platform.", { size: 1.3 }),
        unit("care", "Customer Care", "revenue", "Contact centers and digital channels.", { short: "Care" }),
        unit("network", "Network Operations", "infrastructure", "Network engineering and field operations.", { short: "Network" }),
      ],
      stakeholders: [
        person("vp-ai", "VP, AI Products", "Technical Buyer", 4, "ai", "engaged", "Owns AI products for care and sales."),
        person("dir-care", "Director, Care Transformation", "Champion", 4, "care", "engaged", "Champion: measured on handle time and first-contact resolution."),
        person("field", "Director, Field Operations Technology", "Influencer", 3, "network", "contacted", "Field technicians need fast answers on site."),
        person("cdao", "Chief Data & AI Officer", "Economic Buyer", 5, "ai", "unworked", "Final say on AI platform providers."),
      ],
      opportunities: [
        opp("care", "Agent-assist for customer care", "care", 1_900_000, "Qualified", ["vp-ai", "dir-care", "field"], "Measure handle time and resolution in a controlled cohort.", "dir-care"),
      ],
      signals: [signal("Customer experience priority", "Demo: customer experience named a top priority this year.", "earnings-priority", "strong", "care")],
      intelligence: [
        intel("Business Model", "Consumer and business connectivity", "Verizon serves tens of millions of wireless customers; customer care is a major cost and satisfaction lever."),
        intel("AI Adoption", "AI in customer experience", "Verizon has publicly described using generative AI in customer service. Seller inference: quality is judged on resolution, not demos."),
      ],
    },
    {
      id: "delta",
      name: "Delta Air Lines",
      sector: "Airline",
      tier: 1,
      potentialArr: 4_200_000,
      motion: "AI for operations",
      lastActivityDaysAgo: 12,
      lastActivity: "Discovery agenda shared with Digital & Technology",
      thesis:
        "Disruptions are costly, and coordinating crews, aircraft and customers depends on fast access to procedures and data. An operations copilot is the opening; customer service follows. Seller hypothesis.",
      units: [
        unit("dt", "Digital & Technology", "data-ai", "Enterprise technology and AI engineering.", { size: 1.2, short: "Digital & Tech" }),
        unit("ops", "Operations Control", "operations", "Irregular operations, crew and maintenance coordination.", { short: "Ops Control" }),
        unit("cx", "Customer Experience", "revenue", "Reservations, app and service experiences.", { short: "Customer" }),
      ],
      stakeholders: [
        person("dir-ai", "Director, AI Engineering", "Technical Buyer", 4, "dt", "engaged", "Builds the internal AI platform."),
        person("ops-lead", "Senior Manager, Operations Technology", "Champion", 3, "ops", "engaged", "Wants faster answers during irregular operations."),
        person("vp-cx", "VP, Customer Experience", "Economic Buyer", 4, "cx", "researched", "Owns rebooking and service experiences."),
        person("cio", "Chief Information Officer", "Executive Sponsor", 5, "dt", "unworked", "Sets the technology agenda."),
      ],
      opportunities: [
        opp("irops", "Operations copilot for disruptions", "ops", 1_300_000, "Discovery", ["dir-ai", "ops-lead"], "Workshop on irregular-operations knowledge sources.", "ops-lead"),
      ],
      signals: [signal("Customer app innovation", "Demo: new app features planned for travel days.", "product-launch", "moderate", "cx")],
      intelligence: [
        intel("Business Model", "Premium network carrier", "Delta runs a large global network where disruptions are costly. Coordination depends on fast access to procedures and data."),
        intel("Digital Surface", "Fly Delta app", "The app is central to the customer experience. Seller inference: AI assistance in rebooking and service is a visible use case."),
      ],
    },
    {
      id: "lowes",
      name: "Lowe's",
      sector: "Home improvement retail",
      tier: 2,
      potentialArr: 3_400_000,
      motion: "AI for associates and Pros",
      lastActivityDaysAgo: 22,
      lastActivity: "Follow-up sent to Director, AI Products",
      thesis:
        "Lowe's has launched AI assistants for customers and associates; extending to Pro customers and back-office work is the expansion path. Seller hypothesis.",
      units: [
        unit("tech", "Lowe's Technology", "data-ai", "AI products and platform.", { short: "Technology" }),
        unit("stores", "Store Operations", "operations", "Associates answering project and product questions.", { size: 1.2, short: "Stores" }),
        unit("pro", "Pro Customers", "revenue", "Contractor and Pro business.", { short: "Pro" }),
      ],
      stakeholders: [
        person("dir-ai", "Director, AI Products", "Technical Buyer", 4, "tech", "engaged", "Owns the assistant roadmap."),
        person("pm-assoc", "Senior Product Manager, Associate Tools", "Champion", 3, "stores", "contacted", "Wants associates to answer project questions faster."),
        person("cdio", "Chief Digital & Information Officer", "Economic Buyer", 5, "tech", "unworked", "Owns digital investment."),
        person("pro-dir", "Director, Pro Experience", "Influencer", 3, "pro", "researched", "Pros need quotes and product answers quickly."),
      ],
      opportunities: [
        opp("assist", "Associate assistant expansion", "stores", 1_100_000, "Discovery", ["dir-ai", "pm-assoc"], "Agree the knowledge sources and success metrics.", "pm-assoc"),
      ],
      signals: [signal("AI shopping assistant", "Demo: assistant features expanding to more journeys.", "product-launch", "moderate", "tech")],
      intelligence: [
        intel("AI Adoption", "AI for associates and customers", "Lowe's has publicly launched AI assistants for customers and store associates. Seller inference: Pro customers and back-office work are the expansion path."),
        intel("Company Scale", "Large store footprint", "Lowe's operates more than 1,700 stores in the US."),
      ],
    },
    {
      id: "unilever",
      name: "Unilever",
      sector: "Consumer goods",
      tier: 2,
      potentialArr: 3_800_000,
      motion: "AI for marketing content",
      lastActivityDaysAgo: 9,
      lastActivity: "Content-workflow review with Marketing Technology",
      thesis:
        "Heavy marketing spend across a global brand portfolio makes brand-safe content at scale a direct productivity lever. Content workflows are the opening; R&D knowledge follows. Seller hypothesis.",
      units: [
        unit("mt", "Marketing Technology", "revenue", "Content operations and marketing platforms.", { size: 1.2, short: "Marketing Tech" }),
        unit("rd", "R&D", "data-ai", "Product research and formulation knowledge."),
        unit("it", "Unilever Technology", "business", "Global IT and digital.", { short: "Technology" }),
      ],
      stakeholders: [
        person("dir-mt", "Director, Marketing Technology", "Technical Buyer", 4, "mt", "engaged", "Owns the content supply chain tooling."),
        person("content", "Global Head of Content Operations", "Champion", 3, "mt", "engaged", "Champion: time-to-asset is the scoreboard."),
        person("cdo", "Chief Digital Officer", "Economic Buyer", 5, "it", "unworked", "Owns enterprise AI decisions."),
        person("rd-digital", "Head of R&D Digital", "Influencer", 3, "rd", "researched", "Interested in research knowledge retrieval."),
      ],
      opportunities: [
        opp("content", "Content creation workflows for brand teams", "mt", 1_200_000, "Qualified", ["dir-mt", "content"], "Pilot with two brands; measure time-to-asset.", "content"),
      ],
      signals: [signal("Marketing efficiency program", "Demo: marketing productivity targets set for brand teams.", "earnings-priority", "strong", "mt")],
      intelligence: [
        intel("Company Scale", "Global brand portfolio", "Unilever owns brands such as Dove, Hellmann's and Vaseline and spends heavily on marketing."),
        intel("Executive Priorities", "Productivity", "Unilever has run productivity programs and publicly discussed AI in marketing content. Seller inference: brand-safe content at scale is the use case."),
      ],
    },
    {
      id: "novartis",
      name: "Novartis",
      sector: "Pharmaceuticals",
      tier: 2,
      potentialArr: 3_200_000,
      motion: "AI for knowledge workers",
      lastActivityDaysAgo: 33,
      lastActivity: "Discovery meeting with Head of AI Enablement",
      thesis:
        "A focused medicines company with validated systems and patient-data constraints. A catalogue of governed knowledge-work use cases is the opening. Seller hypothesis.",
      units: [
        unit("ddit", "Data, Digital & IT", "data-ai", "Enterprise data, digital and AI enablement.", { size: 1.2, short: "Digital & IT" }),
        unit("dev", "Development", "data-ai", "Clinical development teams."),
        unit("ops", "Operations", "operations", "Manufacturing; no trigger in this demo.", { dormant: true }),
      ],
      stakeholders: [
        person("head-ai", "Head of AI Enablement", "Technical Buyer", 4, "ddit", "engaged", "Took the discovery meeting; wants validated use cases."),
        person("dev-dir", "Director, Clinical Data Science", "Champion", 3, "dev", "contacted", "Sees value in protocol and document drafting."),
        person("cdo", "Chief Digital Officer", "Economic Buyer", 5, "ddit", "unworked", "Owns the AI agenda."),
      ],
      opportunities: [
        opp("rollout", "{product} for knowledge workers", "ddit", 1_200_000, "Discovery", ["head-ai", "dev-dir"], "Re-engage with a validated-use-case catalogue.", "dev-dir"),
      ],
      signals: [signal("AI governance policy update", "Demo: internal AI policy updated.", "governance", "moderate", "ddit")],
      intelligence: [
        intel("Company Scale", "Focused medicines company", "Novartis is a global pharmaceutical company focused on innovative medicines after spinning off Sandoz in 2023."),
        intel("Security / Governance", "GxP and data privacy", "Validated systems and patient data shape any AI deployment."),
      ],
    },
    {
      id: "mastercard",
      name: "Mastercard",
      sector: "Payments network",
      tier: 3,
      potentialArr: 2_600_000,
      motion: "API platform for internal assistants",
      lastActivityDaysAgo: 41,
      lastActivity: "Reference requested by Director, Developer Platforms",
      thesis:
        "AI in fraud detection is long established; internal productivity on the API platform is a separate, nearer-term motion. Seller hypothesis.",
      units: [
        unit("tech", "Technology", "product-engineering", "Engineering and developer platforms.", { size: 1.2 }),
        unit("services", "Services", "revenue", "Consulting and data services for customers."),
      ],
      stakeholders: [
        person("dir-dev", "Director, Developer Platforms", "Technical Buyer", 4, "tech", "engaged", "Asked for a reference before a build."),
        person("principal", "Principal Engineer, AI Enablement", "Champion", 3, "tech", "contacted", "Prototyped an internal assistant."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "tech", "unworked", "Sets platform direction."),
      ],
      opportunities: [
        opp("api", "API platform for internal assistants", "tech", 800_000, "Discovery", ["dir-dev", "principal"], "Send the reference; propose a scoped assistant build.", "principal"),
      ],
      signals: [signal("Agentic commerce interest", "Demo: product teams exploring agent-initiated payments.", "product-launch", "moderate", "tech")],
      intelligence: [
        intel("Business Model", "Global payments network", "Mastercard connects consumers, merchants, issuers and governments; security and reliability are paramount."),
        intel("AI Adoption", "AI in fraud and commerce", "Mastercard has long used AI in fraud detection and has spoken publicly about agentic commerce. Seller inference: internal productivity is a separate, nearer-term motion."),
      ],
    },
    {
      id: "kroger",
      name: "Kroger",
      sector: "Grocery retail",
      tier: 3,
      potentialArr: 2_000_000,
      motion: "AI for store teams",
      lastActivityDaysAgo: 86,
      lastActivity: "Intro call with Director, Associate Experience",
      thesis:
        "Thousands of stores across several banners mean frontline knowledge at scale. An associate knowledge assistant is the opening. Seller hypothesis. The thread has gone cold.",
      units: [
        unit("tech", "Technology & Digital", "business", "Enterprise technology and digital.", { short: "Technology" }),
        unit("stores", "Store Operations", "operations", "Associates across banners and formats.", { size: 1.2, short: "Stores" }),
        unit("pharmacy", "Pharmacy", "operations", "Regulated; no initiative in this demo.", { dormant: true }),
      ],
      stakeholders: [
        person("dir-assoc", "Director, Associate Experience", "Technical Buyer", 4, "stores", "contacted", "Took an intro call; no follow-up since."),
        person("pm", "Senior Product Manager, Store Tools", "Champion", 3, "stores", "researched", "Owns the associate app."),
        person("cio", "Chief Information Officer", "Economic Buyer", 5, "tech", "unworked", "Owns the technology agenda."),
      ],
      opportunities: [
        opp("assist", "Associate knowledge assistant", "stores", 600_000, "Discovery", ["dir-assoc", "pm"], "Re-open with a store-operations demo.", "pm"),
      ],
      signals: [signal("Store technology refresh", "Demo: associate devices being refreshed.", "platform-migration", "weak", "stores")],
      intelligence: [
        intel("Company Scale", "Large grocery footprint", "Kroger is one of the largest US grocers, operating thousands of stores under several banners."),
        intel("Digital Surface", "Retail media and data", "Kroger runs a retail media business, Kroger Precision Marketing. Seller inference: AI in marketing is a later motion."),
      ],
    },
  ],
};
