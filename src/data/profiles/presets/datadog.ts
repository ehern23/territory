import type { SellerPreset } from "@/domain/profile";
import { intel, opp, person, signal, unit } from "../dsl";

/**
 * Datadog territory: cloud-native, high-scale digital businesses. Target
 * companies are real; theses are seller inference; people, stages and dollars
 * are demo.
 */
export const datadog: SellerPreset = {
  aliases: ["datadog", "datadog inc", "datadoghq"],
  profile: {
    id: "datadog",
    company: "Datadog",
    productName: "Datadog",
    product: "Observability and security platform: infrastructure, APM, logs, RUM and cloud security",
    category: "observability",
    role: "AE",
    territoryLabel: "Datadog Enterprise",
    motion: "observability consolidation",
    icp: "Cloud-native, high-scale digital businesses with many services and teams, especially those consolidating monitoring tools or migrating to the cloud.",
    valueProps: [
      "One platform for metrics, traces, logs and user experience",
      "Consolidate fragmented monitoring tools",
      "Faster incident resolution with correlated telemetry",
      "Cloud security on the same agent",
    ],
    personas: ["VP Infrastructure", "Head of SRE", "Director, Platform Engineering", "CISO", "VP Engineering"],
    archetype: "observability",
    source: "preset",
  },
  seeds: [
    {
      id: "airbnb",
      name: "Airbnb",
      sector: "Travel marketplace",
      tier: 1,
      potentialArr: 6_000_000,
      motion: "observability consolidation",
      lastActivityDaysAgo: 2,
      lastActivity: "APM proof-of-value review with Infrastructure",
      thesis:
        "A global marketplace on a service-oriented architecture, with a real build-versus-buy debate. Tracing for core services is the opening; consolidating monitoring tools platform-wide is the expansion. Seller hypothesis. Data Platform is held dormant.",
      units: [
        unit("infra", "Infrastructure", "infrastructure", "Core services, SRE and observability. The live proof of value.", { size: 1.4 }),
        unit("product", "Product Engineering", "product-engineering", "Guest and host experiences.", { short: "Product" }),
        unit("payments", "Payments Engineering", "payments", "Global payments platform; reliability is revenue.", { short: "Payments" }),
        unit("data", "Data Platform", "data-ai", "Separate tooling roadmap; no trigger in this demo.", { dormant: true, short: "Data" }),
      ],
      stakeholders: [
        person("dir-obs", "Director, Observability", "Technical Buyer", 4, "infra", "meeting", "Meeting booked to review the proof-of-value results."),
        person("sre-mgr", "SRE Manager, Core Services", "Champion", 4, "infra", "engaged", "Champion: tired of correlating incidents across four tools."),
        person("vp-infra", "VP, Infrastructure", "Executive Sponsor", 5, "infra", "unworked", "Sponsor for consolidation. Unworked."),
        person("cloudsec", "Head of Cloud Security", "Security", 3, "infra", "engaged", "Interested in security signals on the same agent."),
        person("dir-payments", "Director, Payments Engineering", "Technical Buyer", 4, "payments", "researched", "Payment incidents are revenue incidents."),
        person("dir-guest", "Director, Guest Experience Engineering", "Influencer", 4, "product", "unworked", "Would want real-user monitoring."),
      ],
      opportunities: [
        opp("apm", "APM and tracing for core services", "infra", 2_000_000, "Qualified", ["dir-obs", "sre-mgr"], "Proof of value on two critical services; agree success metrics.", "sre-mgr"),
        opp("consolidate", "Platform-wide observability consolidation", "infra", 4_000_000, "Forming", ["vp-infra", "cloudsec", "dir-payments", "dir-guest"], "Executive review of tool-consolidation savings.", "cloudsec"),
      ],
      signals: [
        signal("Monitoring cost review", "Demo: infrastructure leadership reviewing tooling spend.", "earnings-priority", "strong", "infra"),
        signal("SRE hiring", "Demo: open SRE and observability roles.", "hiring-surge", "moderate", "infra"),
      ],
      intelligence: [
        intel("Digital Surface", "Global marketplace", "Airbnb runs a global marketplace for stays and experiences on a service-oriented architecture."),
        intel("Developer Tooling", "Open-source infrastructure culture", "Airbnb has open-sourced infrastructure tools over the years. Seller inference: build-versus-buy is a real debate for observability."),
        intel("Executive Priorities", "Seller hypothesis", "Consolidating monitoring tools could cut cost while improving incident response. Not a confirmed opportunity."),
      ],
    },
    {
      id: "coinbase",
      name: "Coinbase",
      sector: "Crypto exchange",
      tier: 1,
      potentialArr: 4_500_000,
      motion: "reliability at peak volume",
      lastActivityDaysAgo: 6,
      lastActivity: "Incident-review workshop with SRE",
      thesis:
        "Traffic spikes with market volatility, and security monitoring sits alongside reliability. Tracing for peak-volume incidents is the opening. Seller hypothesis.",
      units: [
        unit("platform", "Platform Engineering", "infrastructure", "Infrastructure and SRE.", { size: 1.3, short: "Platform" }),
        unit("exchange", "Exchange Engineering", "product-engineering", "Trading systems.", { short: "Exchange" }),
        unit("security", "Security", "security", "Detection and response."),
      ],
      stakeholders: [
        person("head-sre", "Head of SRE", "Technical Buyer", 4, "platform", "engaged", "Ran the incident-review workshop."),
        person("sre-trading", "SRE Manager, Trading Systems", "Champion", 3, "platform", "engaged", "Lives through every volatility spike."),
        person("dr", "Director, Detection & Response", "Security", 4, "security", "contacted", "Evaluating security signals alongside telemetry."),
        person("vp-eng", "VP, Engineering", "Economic Buyer", 5, "platform", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("peak", "Peak-volume reliability and tracing", "platform", 1_500_000, "Discovery", ["head-sre", "sre-trading", "dr"], "Map the last high-volume incident to telemetry gaps.", "sre-trading"),
      ],
      signals: [signal("Volatility-driven traffic spikes", "Demo: recent peak-volume incident reviewed by leadership.", "earnings-priority", "moderate", "exchange")],
      intelligence: [
        intel("Business Model", "Exchange and platform", "Coinbase runs a crypto exchange and broader platform; traffic spikes with market volatility."),
        intel("Security / Governance", "Regulated and security-sensitive", "Security monitoring sits alongside reliability."),
      ],
    },
    {
      id: "hilton",
      name: "Hilton",
      sector: "Hospitality",
      tier: 1,
      potentialArr: 3_600_000,
      motion: "digital guest experience",
      lastActivityDaysAgo: 12,
      lastActivity: "Discovery agenda shared with Digital Engineering",
      thesis:
        "The Honors app carries booking, check-in and digital key at thousands of hotels, and cloud modernization is the moment to standardize observability. Real-user monitoring is the opening. Seller hypothesis.",
      units: [
        unit("digital", "Digital Engineering", "product-engineering", "Hilton Honors app, digital key and booking.", { size: 1.2, short: "Digital" }),
        unit("cloud", "Cloud Infrastructure", "infrastructure", "Cloud platforms and operations.", { short: "Cloud" }),
        unit("property", "Property Technology", "operations", "Systems used inside hotels.", { short: "Property Tech" }),
      ],
      stakeholders: [
        person("dir-digital", "Director, Digital Engineering", "Technical Buyer", 4, "digital", "engaged", "Owns app reliability on travel days."),
        person("sre-lead", "SRE Lead, Digital", "Champion", 3, "digital", "engaged", "Wants journey-level visibility."),
        person("cio", "Chief Information Officer", "Economic Buyer", 5, "cloud", "unworked", "Sets the modernization agenda."),
        person("property-dir", "Director, Property Systems", "Influencer", 3, "property", "researched", "Hotel-side systems."),
      ],
      opportunities: [
        opp("rum", "Real-user monitoring for the Honors app", "digital", 1_000_000, "Discovery", ["dir-digital", "sre-lead"], "Instrument booking and digital-key journeys in a pilot.", "sre-lead"),
      ],
      signals: [signal("Cloud migration", "Demo: migration waves scheduled.", "platform-migration", "moderate", "cloud")],
      intelligence: [
        intel("Digital Surface", "Hilton Honors app", "The app supports booking, check-in and digital key at thousands of hotels."),
        intel("Transformation Initiatives", "Cloud modernization", "Hilton has publicly discussed modernizing its technology on the cloud. Seller inference: migrations are the moment to standardize observability."),
      ],
    },
    {
      id: "nordstrom",
      name: "Nordstrom",
      sector: "Fashion retail",
      tier: 2,
      potentialArr: 2_600_000,
      motion: "e-commerce reliability",
      lastActivityDaysAgo: 24,
      lastActivity: "Follow-up sent to Director, Site Reliability",
      thesis:
        "A large share of sales is digital, so peak-season reliability is the sharpest pain. Holiday readiness is the opening. Seller hypothesis.",
      units: [
        unit("digital", "Digital Commerce", "product-engineering", "Web and app commerce.", { size: 1.2, short: "Digital" }),
        unit("platform", "Platform & Infrastructure", "infrastructure", "Shared infrastructure and SRE.", { short: "Platform" }),
        unit("stores", "Store Technology", "operations", "No trigger in this demo.", { dormant: true, short: "Stores" }),
      ],
      stakeholders: [
        person("dir-sre", "Director, Site Reliability", "Technical Buyer", 4, "platform", "engaged", "Owns peak readiness."),
        person("em-checkout", "Engineering Manager, Checkout", "Champion", 3, "digital", "contacted", "Checkout incidents are the costliest."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "platform", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("peak", "Holiday-peak readiness", "digital", 800_000, "Discovery", ["dir-sre", "em-checkout"], "Re-engage before the holiday code freeze.", "em-checkout"),
      ],
      signals: [signal("Peak planning", "Demo: holiday readiness reviews started.", "earnings-priority", "moderate", "digital")],
      intelligence: [
        intel("Company Scale", "Privately held retailer", "Nordstrom was taken private in 2025 by the Nordstrom family and El Puerto de Liverpool."),
        intel("Digital Surface", "Digital commerce", "A large share of sales is digital. Seller inference: peak-season reliability is the sharpest pain."),
      ],
    },
    {
      id: "chime",
      name: "Chime",
      sector: "Consumer fintech",
      tier: 2,
      potentialArr: 2_400_000,
      motion: "log management consolidation",
      lastActivityDaysAgo: 9,
      lastActivity: "Logging cost analysis shared with Platform Engineering",
      thesis:
        "Telemetry cost per member is a CFO-visible metric for a newly public company. Log consolidation is the opening. Seller hypothesis.",
      units: [
        unit("platform", "Platform Engineering", "infrastructure", "Infrastructure, SRE and observability.", { size: 1.2, short: "Platform" }),
        unit("product", "Member Products", "product-engineering", "Banking app and member features.", { short: "Product" }),
        unit("risk", "Risk & Security", "security", "Security operations and fraud.", { short: "Security" }),
      ],
      stakeholders: [
        person("dir-plat", "Director, Platform Engineering", "Technical Buyer", 4, "platform", "engaged", "Asked for the cost analysis."),
        person("staff-sre", "Staff SRE", "Champion", 3, "platform", "engaged", "Champion: knows exactly which logs nobody reads."),
        person("vp-eng", "VP, Engineering", "Economic Buyer", 5, "platform", "contacted", "Wants cost down without losing visibility."),
        person("secops", "Head of Security Operations", "Security", 3, "risk", "researched", "Shares the log pipeline."),
      ],
      opportunities: [
        opp("logs", "Log management consolidation", "platform", 850_000, "Qualified", ["dir-plat", "staff-sre", "vp-eng"], "Validate log volumes and retention tiers.", "staff-sre"),
      ],
      signals: [signal("Public-company cost focus", "Demo: infrastructure cost targets set.", "earnings-priority", "moderate", "platform")],
      intelligence: [
        intel("Business Model", "Mobile banking", "Chime offers mobile banking through partner banks and went public in 2025."),
        intel("Executive Priorities", "Unit economics", "Seller inference: telemetry cost per member is a CFO-visible metric."),
      ],
    },
    {
      id: "reddit",
      name: "Reddit",
      sector: "Social platform",
      tier: 2,
      potentialArr: 2_200_000,
      motion: "tracing for ads serving",
      lastActivityDaysAgo: 30,
      lastActivity: "Discovery meeting with Director, Infrastructure",
      thesis:
        "Advertising is the main revenue line, so ads latency and reliability tie directly to revenue. Tracing for ads serving is the opening. Seller hypothesis.",
      units: [
        unit("infra", "Infrastructure", "infrastructure", "Core infrastructure and SRE.", { size: 1.2 }),
        unit("ads", "Ads Engineering", "product-engineering", "Ads serving and measurement.", { short: "Ads" }),
        unit("product", "Consumer Product", "product-engineering", "Feeds, communities and apps.", { short: "Product" }),
      ],
      stakeholders: [
        person("dir-infra", "Director, Infrastructure", "Technical Buyer", 4, "infra", "engaged", "Took the discovery meeting."),
        person("sre-mgr", "SRE Manager", "Champion", 3, "infra", "contacted", "Wants fewer pages for ads latency."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "infra", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("apm", "Tracing for ads serving", "ads", 700_000, "Discovery", ["dir-infra", "sre-mgr"], "Rebook the ads-latency deep dive.", "sre-mgr"),
      ],
      signals: [signal("Ads platform growth", "Demo: new ad formats launching.", "product-launch", "moderate", "ads")],
      intelligence: [
        intel("Business Model", "Ads-funded communities", "Reddit hosts communities and is monetized mainly through advertising, plus data licensing."),
        intel("Digital Surface", "Traffic growth", "Seller inference: ads latency and reliability tie directly to revenue."),
      ],
    },
    {
      id: "lululemon",
      name: "Lululemon",
      sector: "Athletic apparel",
      tier: 3,
      potentialArr: 1_800_000,
      motion: "e-commerce experience monitoring",
      lastActivityDaysAgo: 40,
      lastActivity: "Reference requested by Director, Digital Engineering",
      thesis:
        "International growth adds services and regions to monitor on a large e-commerce business. User-experience monitoring is the opening. Seller hypothesis.",
      units: [
        unit("digital", "Digital Engineering", "product-engineering", "E-commerce and app.", { size: 1.2, short: "Digital" }),
        unit("stores", "Store Technology", "operations", "Store systems.", { short: "Stores" }),
      ],
      stakeholders: [
        person("dir-digital", "Director, Digital Engineering", "Technical Buyer", 4, "digital", "engaged", "Asked for a retail reference."),
        person("sre-lead", "SRE Lead", "Champion", 3, "digital", "contacted", "Owns launch-day reliability."),
        person("cto", "Chief Technology Officer", "Economic Buyer", 5, "digital", "unworked", "Budget owner."),
      ],
      opportunities: [
        opp("rum", "User-experience monitoring for e-commerce", "digital", 600_000, "Discovery", ["dir-digital", "sre-lead"], "Send the reference; propose a launch-day pilot.", "sre-lead"),
      ],
      signals: [signal("International expansion", "Demo: new regional sites planned.", "market-expansion", "weak", "digital")],
      intelligence: [
        intel("Digital Surface", "Direct-to-consumer", "Lululemon sells through stores and a large e-commerce business."),
        intel("Executive Priorities", "International growth", "Lululemon has emphasized international growth. Seller inference: new regions add services to monitor."),
      ],
    },
    {
      id: "southwest",
      name: "Southwest Airlines",
      sector: "Airline",
      tier: 3,
      potentialArr: 2_000_000,
      motion: "operations reliability",
      lastActivityDaysAgo: 85,
      lastActivity: "Intro call with Director, Technology Operations",
      thesis:
        "Investment in operational technology plus new booking flows add surface area to monitor. Operational systems observability is the opening; the thread has gone cold. Seller hypothesis.",
      units: [
        unit("ops", "Technology Operations", "infrastructure", "Operational systems and reliability.", { size: 1.2, short: "Tech Ops" }),
        unit("digital", "Digital Products", "product-engineering", "Booking and app.", { short: "Digital" }),
        unit("crew", "Crew & Operations Systems", "operations", "No trigger in this demo.", { dormant: true, short: "Crew Systems" }),
      ],
      stakeholders: [
        person("dir-ops", "Director, Technology Operations", "Technical Buyer", 4, "ops", "contacted", "Took an intro call; no follow-up since."),
        person("sre-mgr", "Manager, Site Reliability", "Champion", 3, "ops", "researched", "Owns incident response."),
        person("cio", "Chief Information Officer", "Economic Buyer", 5, "ops", "unworked", "Owns operational technology investment."),
      ],
      opportunities: [
        opp("ops", "Operational systems observability", "ops", 600_000, "Discovery", ["dir-ops", "sre-mgr"], "Re-open with an operations-resilience angle.", "sre-mgr"),
      ],
      signals: [signal("Systems modernization investment", "Demo: operational systems upgrades scheduled.", "platform-migration", "weak", "ops")],
      intelligence: [
        intel("Transformation Initiatives", "Operational technology investment", "After its December 2022 operational disruption, Southwest committed to investing in operational technology."),
        intel("Business Model", "Changing commercial model", "Southwest has announced assigned seating and other product changes. Seller inference: new booking flows add digital surface area."),
      ],
    },
  ],
};
