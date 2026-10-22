import type { SellerPreset } from "@/domain/profile";
import { intel, opp, person, signal, unit } from "../dsl";

/**
 * Snowflake territory: data-heavy enterprises. Target companies are real;
 * theses are seller inference; people, stages and dollars are demo.
 */
export const snowflake: SellerPreset = {
  aliases: ["snowflake", "snowflake inc", "snowflake computing"],
  profile: {
    id: "snowflake",
    company: "Snowflake",
    productName: "Snowflake",
    product: "The AI Data Cloud: warehousing, data engineering, sharing and AI on governed data",
    category: "data cloud",
    role: "AE",
    territoryLabel: "Snowflake Enterprise",
    motion: "data platform consolidation",
    icp: "Data-heavy enterprises consolidating warehouses and lakes, sharing data with partners, and building AI on governed data.",
    valueProps: [
      "One governed platform for analytics, data engineering and AI",
      "Secure data sharing with partners and customers",
      "Elastic, consumption-based scale",
      "AI on data that stays under governance",
    ],
    personas: ["Chief Data Officer", "VP Data Engineering", "Head of Analytics", "CIO", "Director, Data Governance"],
    archetype: "data-infra",
    source: "preset",
  },
  seeds: [
    {
      id: "cvs",
      name: "CVS Health",
      sector: "Health care",
      tier: 1,
      potentialArr: 9_000_000,
      motion: "data platform consolidation",
      lastActivityDaysAgo: 3,
      lastActivity: "Migration assessment readout with Enterprise Data & Analytics",
      thesis:
        "Pharmacy, benefits and insurance businesses generate very large clinical, claims and retail datasets under HIPAA. Warehouse migration is the opening; governed sharing across businesses is the expansion. Seller hypothesis. CVS Caremark is held dormant.",
      units: [
        unit("data", "Enterprise Data & Analytics", "data-ai", "Central data platform and analytics. The live migration assessment.", { size: 1.4, short: "Enterprise Data" }),
        unit("aetna", "Aetna", "data-ai", "Health benefits data and actuarial analytics."),
        unit("pharmacy", "CVS Pharmacy", "operations", "Retail pharmacy and front-store analytics.", { short: "Pharmacy" }),
        unit("caremark", "CVS Caremark", "data-ai", "Pharmacy benefits; separate platform roadmap in this demo.", { dormant: true, short: "Caremark" }),
      ],
      stakeholders: [
        person("dir-platform", "Director, Data Platform", "Technical Buyer", 4, "data", "meeting", "Meeting booked to finalize migration waves."),
        person("architect", "Principal Data Architect", "Champion", 4, "data", "engaged", "Champion: built the migration cost model."),
        person("cdo", "Chief Data Officer", "Executive Sponsor", 5, "data", "unworked", "Sponsor for cross-business data strategy. Unworked."),
        person("governance", "Head of Data Governance", "Security", 3, "data", "engaged", "Will approve sharing only with row-level controls."),
        person("vp-actuarial", "VP, Actuarial Data", "Technical Buyer", 4, "aetna", "researched", "Actuarial teams want fresher claims data."),
        person("dir-rx", "Director, Pharmacy Analytics", "Influencer", 4, "pharmacy", "unworked", "Would use shared benefits data for adherence programs."),
      ],
      opportunities: [
        opp("migrate", "Warehouse migration for enterprise analytics", "data", 3_500_000, "Qualified", ["dir-platform", "architect"], "Finalize migration waves and the cost model.", "architect"),
        opp("share", "Governed data sharing across Aetna and Pharmacy", "aetna", 5_500_000, "Forming", ["cdo", "governance", "vp-actuarial", "dir-rx"], "Executive session on cross-business sharing under governance.", "governance"),
      ],
      signals: [
        signal("Legacy warehouse end-of-support", "Demo: incumbent warehouse contract and hardware refresh due.", "platform-migration", "strong", "data"),
        signal("Governance program", "Demo: enterprise data governance program funded.", "governance", "moderate", "data"),
      ],
      intelligence: [
        intel("Company Scale", "Integrated health company", "CVS Health combines CVS Pharmacy, Aetna and CVS Caremark, generating very large clinical, claims and retail datasets."),
        intel("Security / Governance", "Protected health information", "HIPAA governs much of the data. Seller inference: governance features decide platform choice."),
        intel("Executive Priorities", "Seller hypothesis", "Consolidating analytics and enabling governed sharing across businesses could reduce cost and unlock new insights. Not a confirmed opportunity."),
      ],
    },
    {
      id: "caterpillar",
      name: "Caterpillar",
      sector: "Industrial equipment",
      tier: 1,
      potentialArr: 5_500_000,
      motion: "equipment telemetry",
      lastActivityDaysAgo: 6,
      lastActivity: "Telemetry architecture session with Cat Digital",
      thesis:
        "A large connected fleet and an independent dealer network make telemetry analytics and secure dealer sharing natural use cases. Seller hypothesis.",
      units: [
        unit("digital", "Cat Digital", "data-ai", "Connected-equipment data and digital services.", { size: 1.3 }),
        unit("dealers", "Dealer Services", "revenue", "Data shared with independent dealers.", { short: "Dealers" }),
        unit("financial", "Financial Products", "finance", "Equipment financing analytics.", { short: "Financial" }),
      ],
      stakeholders: [
        person("dir-de", "Director, Data Engineering", "Technical Buyer", 4, "digital", "engaged", "Owns the telemetry pipeline."),
        person("architect", "Senior Data Architect", "Champion", 3, "digital", "engaged", "Champion: sketched the dealer-sharing model."),
        person("dir-dealer", "Director, Dealer Data", "Influencer", 4, "dealers", "contacted", "Dealers ask for fleet insights."),
        person("cdo", "Chief Digital Officer", "Economic Buyer", 5, "digital", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("telemetry", "Equipment telemetry analytics", "digital", 2_000_000, "Discovery", ["dir-de", "architect", "dir-dealer"], "Size telemetry volumes; agree a dealer-sharing pilot.", "architect"),
      ],
      signals: [signal("Connected fleet growth", "Demo: more connected assets reporting telemetry.", "product-launch", "moderate", "digital")],
      intelligence: [
        intel("Digital Surface", "Connected equipment", "Caterpillar connects a large fleet of machines and offers digital services through Cat Digital."),
        intel("Business Model", "Dealer network", "Caterpillar sells through independent dealers. Seller inference: secure data sharing with dealers is a natural use case."),
      ],
    },
    {
      id: "pepsico",
      name: "PepsiCo",
      sector: "Food and beverage",
      tier: 1,
      potentialArr: 5_000_000,
      motion: "revenue management analytics",
      lastActivityDaysAgo: 11,
      lastActivity: "Discovery agenda shared with Data & Analytics",
      thesis:
        "Data collaboration with retailers drives revenue management across a global portfolio. Revenue growth management data products are the opening. Seller hypothesis.",
      units: [
        unit("da", "Data & Analytics", "data-ai", "Enterprise data engineering and analytics.", { size: 1.3, short: "Data & Analytics" }),
        unit("commercial", "Revenue Management", "revenue", "Pricing, promotion and retailer analytics.", { short: "Revenue Mgmt" }),
        unit("supply", "Supply Chain", "operations", "Planning and logistics analytics."),
      ],
      stakeholders: [
        person("vp-de", "VP, Data Engineering", "Technical Buyer", 4, "da", "engaged", "Owns the enterprise data platform roadmap."),
        person("dir-rgm", "Director, Revenue Management Analytics", "Champion", 3, "commercial", "engaged", "Retailer feeds arrive in a dozen formats."),
        person("cdo", "Chief Data Officer", "Economic Buyer", 5, "da", "unworked", "Budget owner."),
        person("dir-supply", "Director, Supply Chain Analytics", "Influencer", 3, "supply", "researched", "Wants demand signals faster."),
      ],
      opportunities: [
        opp("rgm", "Revenue growth management data products", "commercial", 1_600_000, "Discovery", ["vp-de", "dir-rgm"], "Map retailer data feeds into a shared data model.", "dir-rgm"),
      ],
      signals: [signal("Retail data collaboration", "Demo: new retailer data partnerships planned.", "market-expansion", "moderate", "commercial")],
      intelligence: [
        intel("Company Scale", "Global portfolio", "PepsiCo owns brands such as Pepsi, Lay's and Gatorade and sells in more than 200 countries and territories."),
        intel("Business Model", "Retail partnerships", "Seller inference: data collaboration with retailers drives revenue management."),
      ],
    },
    {
      id: "sp-global",
      name: "S&P Global",
      sector: "Financial data",
      tier: 2,
      potentialArr: 4_000_000,
      motion: "data delivery to customers",
      lastActivityDaysAgo: 23,
      lastActivity: "Follow-up sent to Head of Data Delivery",
      thesis:
        "Customers increasingly want ratings, market and commodity data delivered into their own platforms. Zero-copy delivery could cut cost. Seller hypothesis.",
      units: [
        unit("mi", "Market Intelligence", "data-ai", "Market data and analytics products.", { size: 1.2, short: "Market Intel" }),
        unit("ratings", "Ratings", "business", "Credit ratings."),
        unit("commodity", "Commodity Insights", "data-ai", "Energy and commodities data.", { short: "Commodities" }),
      ],
      stakeholders: [
        person("head-delivery", "Head of Data Delivery", "Technical Buyer", 4, "mi", "engaged", "Owns how customers receive data."),
        person("dir-products", "Director, Data Products", "Champion", 3, "mi", "contacted", "Customers ask for delivery into their platforms."),
        person("cdo", "Chief Data Officer", "Economic Buyer", 5, "mi", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("delivery", "Data delivery through secure sharing", "mi", 1_400_000, "Discovery", ["head-delivery", "dir-products"], "Re-engage with a marketplace distribution model.", "dir-products"),
      ],
      signals: [signal("New data products", "Demo: new datasets planned for customer delivery.", "product-launch", "moderate", "mi")],
      intelligence: [
        intel("Business Model", "Data and benchmarks", "S&P Global sells ratings, market data, indices and commodity insights to financial institutions and corporations."),
        intel("Digital Surface", "Data delivery", "Customers increasingly want data delivered into their own platforms. Seller inference: zero-copy sharing reduces delivery cost."),
      ],
    },
    {
      id: "progressive",
      name: "Progressive",
      sector: "Insurance",
      tier: 2,
      potentialArr: 3_600_000,
      motion: "telematics analytics",
      lastActivityDaysAgo: 9,
      lastActivity: "Usage-data workshop with Data Engineering",
      thesis:
        "Usage-based insurance produces large telematics datasets, and faster analytics supports pricing advantage. A telematics workload proof of concept is the opening. Seller hypothesis.",
      units: [
        unit("data", "Data Engineering", "data-ai", "Enterprise data engineering.", { size: 1.2 }),
        unit("claims", "Claims Analytics", "data-ai", "Claims and fraud analytics.", { short: "Claims" }),
        unit("pricing", "Pricing & Actuarial", "finance", "Pricing research and actuarial teams.", { short: "Pricing" }),
      ],
      stakeholders: [
        person("dir-de", "Director, Data Engineering", "Technical Buyer", 4, "data", "engaged", "Ran the usage-data workshop."),
        person("architect", "Lead Data Architect", "Champion", 3, "data", "engaged", "Champion: owns the benchmark plan."),
        person("cio", "Chief Information Officer", "Economic Buyer", 5, "data", "unworked", "Budget owner."),
        person("dir-pricing", "Director, Pricing Research", "Influencer", 3, "pricing", "contacted", "Wants faster model iterations."),
      ],
      opportunities: [
        opp("telematics", "Telematics data platform", "data", 1_200_000, "Qualified", ["dir-de", "architect", "dir-pricing"], "Benchmark telematics-scale workloads in a proof of concept.", "architect"),
      ],
      signals: [signal("Pricing sophistication", "Demo: pricing teams expanding usage-based models.", "earnings-priority", "moderate", "pricing")],
      intelligence: [
        intel("Business Model", "Data-driven auto insurer", "Progressive is a large US auto insurer known for usage-based insurance through Snapshot."),
        intel("Executive Priorities", "Pricing segmentation", "Seller inference: faster analytics on telematics data supports pricing advantage."),
      ],
    },
    {
      id: "mcdonalds",
      name: "McDonald's",
      sector: "Restaurants",
      tier: 2,
      potentialArr: 3_000_000,
      motion: "loyalty analytics",
      lastActivityDaysAgo: 32,
      lastActivity: "Discovery meeting with Director, Global Data Platform",
      thesis:
        "A loyalty program across many markets produces rich customer data, and restaurant-technology platform choices are being made now. Position for specific analytics and sharing workloads. Seller hypothesis.",
      units: [
        unit("data", "Global Data & Analytics", "data-ai", "Global data platform.", { size: 1.2, short: "Global Data" }),
        unit("loyalty", "Loyalty & Digital", "revenue", "MyMcDonald's Rewards and the app.", { short: "Loyalty" }),
        unit("restaurants", "Restaurant Technology", "operations", "No trigger in this demo.", { dormant: true, short: "Restaurant Tech" }),
      ],
      stakeholders: [
        person("dir-platform", "Director, Global Data Platform", "Technical Buyer", 4, "data", "engaged", "Took the discovery meeting."),
        person("loyalty-mgr", "Senior Manager, Loyalty Analytics", "Champion", 3, "loyalty", "contacted", "Wants member-level insights faster."),
        person("cdao", "Chief Data & Analytics Officer", "Economic Buyer", 5, "data", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("loyalty", "Loyalty analytics platform", "loyalty", 1_000_000, "Discovery", ["dir-platform", "loyalty-mgr"], "Rebook the loyalty data deep dive.", "loyalty-mgr"),
      ],
      signals: [signal("Loyalty program growth", "Demo: loyalty membership targets raised.", "product-launch", "moderate", "loyalty")],
      intelligence: [
        intel("Digital Surface", "Loyalty at scale", "McDonald's runs the MyMcDonald's Rewards program and app across many markets."),
        intel("Competitive Environment", "Hyperscaler partnership", "McDonald's has a strategic partnership with Google Cloud for restaurant technology. Seller inference: position for specific analytics and sharing workloads."),
      ],
    },
    {
      id: "ulta",
      name: "Ulta Beauty",
      sector: "Beauty retail",
      tier: 3,
      potentialArr: 2_000_000,
      motion: "loyalty member analytics",
      lastActivityDaysAgo: 40,
      lastActivity: "Reference requested by Director, Data Engineering",
      thesis:
        "A very large loyalty program and a retail media business make member analytics and brand data collaboration natural workloads. Seller hypothesis.",
      units: [
        unit("data", "Data & Analytics", "data-ai", "Data engineering and analytics.", { size: 1.2 }),
        unit("marketing", "Marketing & Retail Media", "revenue", "Loyalty, CRM and retail media.", { short: "Marketing" }),
      ],
      stakeholders: [
        person("dir-de", "Director, Data Engineering", "Technical Buyer", 4, "data", "engaged", "Asked for a retail reference."),
        person("mgr-ca", "Manager, Customer Analytics", "Champion", 3, "marketing", "contacted", "Builds member segments by hand."),
        person("cdto", "Chief Digital & Technology Officer", "Economic Buyer", 5, "data", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("loyalty", "Loyalty member analytics", "marketing", 650_000, "Discovery", ["dir-de", "mgr-ca"], "Send the reference; propose a member-360 pilot.", "mgr-ca"),
      ],
      signals: [signal("Retail media growth", "Demo: more brands buying retail media.", "product-launch", "weak", "marketing")],
      intelligence: [
        intel("Business Model", "Loyalty-driven retailer", "Ulta Beauty has a very large loyalty program and sells through stores and online."),
        intel("Digital Surface", "Retail media", "Ulta runs a retail media business. Seller inference: data collaboration with brands is a later opportunity."),
      ],
    },
    {
      id: "fox",
      name: "Fox Corporation",
      sector: "Media",
      tier: 3,
      potentialArr: 1_800_000,
      motion: "audience data",
      lastActivityDaysAgo: 80,
      lastActivity: "Intro call with Director, Data Engineering",
      thesis:
        "Audience data shared with advertisers is the core opportunity, especially around Tubi's ad-supported streaming. The thread stalled after an intro call. Seller hypothesis.",
      units: [
        unit("data", "Fox Data & Analytics", "data-ai", "Enterprise data and analytics.", { short: "Data" }),
        unit("tubi", "Tubi", "product-engineering", "Free ad-supported streaming.", { size: 1.1 }),
        unit("news", "Fox News Media", "revenue", "No trigger in this demo.", { dormant: true, short: "News" }),
      ],
      stakeholders: [
        person("dir-de", "Director, Data Engineering", "Technical Buyer", 4, "data", "contacted", "Took an intro call; no follow-up since."),
        person("audience", "Senior Manager, Audience Analytics", "Champion", 3, "tubi", "researched", "Ad sales wants audience segments faster."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "data", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("audience", "Audience data platform for ad sales", "tubi", 600_000, "Discovery", ["dir-de", "audience"], "Re-open around ad-sales data collaboration.", "audience"),
      ],
      signals: [signal("Streaming growth", "Demo: streaming audience growth targets.", "product-launch", "weak", "tubi")],
      intelligence: [
        intel("Business Model", "News, sports and Tubi", "Fox Corporation owns Fox News, Fox Sports and Tubi."),
        intel("Digital Surface", "Ad-supported streaming", "Seller inference: audience data shared with advertisers is the core opportunity."),
      ],
    },
  ],
};
