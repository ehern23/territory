import type { SellerPreset } from "@/domain/profile";
import { intel, opp, person, signal, unit } from "../dsl";

/**
 * Ramp territory: finance teams with distributed spend. Target companies are
 * real; theses are seller inference; people, stages and dollars are demo.
 */
export const ramp: SellerPreset = {
  aliases: ["ramp", "ramp financial", "ramp business corporation", "ramp.com"],
  profile: {
    id: "ramp",
    company: "Ramp",
    productName: "Ramp",
    product: "Spend management: corporate cards, expense, bill pay and procurement",
    category: "spend management",
    role: "AE",
    territoryLabel: "Ramp Enterprise",
    motion: "finance automation",
    icp: "Multi-entity, fast-growing companies whose finance teams are buried in expense reports, invoices and month-end reconciliation, with spend spread across many locations and teams.",
    valueProps: [
      "Cards with policy built in, before the spend happens",
      "AP automation from invoice capture to payment",
      "A faster close through automatic receipt and GL matching",
      "Real-time visibility into every dollar",
    ],
    personas: ["CFO", "Corporate Controller", "VP, Finance", "AP Manager", "Head of Procurement"],
    archetype: "spend",
    source: "preset",
  },
  seeds: [
    {
      id: "zillow",
      name: "Zillow Group",
      sector: "Real estate marketplace",
      tier: 1,
      potentialArr: 1_800_000,
      motion: "card and expense consolidation",
      lastActivityDaysAgo: 3,
      lastActivity: "Pilot scoping call with the Controller's team",
      thesis:
        "Several brands, entities and cost centers make consolidated spend visibility valuable. Cards and expense are the opening; procure-to-pay across the group is the expansion. Seller hypothesis, not a confirmed opportunity. Zillow Home Loans is held dormant.",
      units: [
        unit("finance", "Finance & Accounting", "finance", "Controllership, AP and FP&A for a multi-brand group. The live evaluation sits here.", { size: 1.4, short: "Finance" }),
        unit("procurement", "Procurement", "procurement", "Software and vendor spend across brands."),
        unit("ops", "Business Operations", "operations", "Field and agent-facing operations generate distributed spend.", { short: "Operations" }),
        unit("loans", "Zillow Home Loans", "finance", "Regulated lending entity with separate controls; no trigger in this demo.", { dormant: true, short: "Home Loans" }),
      ],
      stakeholders: [
        person("controller", "Corporate Controller", "Technical Buyer", 4, "finance", "meeting", "Owns the close. Meeting booked to review receipt matching and GL coding."),
        person("ap", "Senior Manager, Accounts Payable", "Champion", 4, "finance", "engaged", "Champion: invoice volume has outgrown the current AP workflow."),
        person("cfo", "Chief Financial Officer", "Economic Buyer", 5, "finance", "unworked", "Sponsor for any company-wide spend platform. Unworked."),
        person("proc", "Head of Procurement", "Technical Buyer", 4, "procurement", "researched", "Would own intake-to-pay for vendors."),
        person("ops-dir", "Director, Business Operations", "Influencer", 3, "ops", "engaged", "Field teams wait on reimbursements; wants cards with limits instead."),
        person("fpa", "Director, FP&A", "Influencer", 4, "finance", "unworked", "Wants spend data by brand without waiting for the close."),
      ],
      opportunities: [
        opp("cards", "Corporate cards and expense consolidation", "finance", 600_000, "Qualified", ["controller", "ap"], "Pilot with two brands' finance teams; agree GL mapping.", "ap"),
        opp("p2p", "Procure-to-pay across the group", "procurement", 900_000, "Forming", ["cfo", "ops-dir", "proc", "fpa"], "CFO alignment on consolidating intake, approvals and bill pay.", "ops-dir"),
      ],
      signals: [
        signal("Shorter close targeted", "Demo: finance leadership targets a faster month-end close.", "finance-transformation", "strong", "finance"),
        signal("Finance systems hiring", "Demo: roles posted for finance systems and AP automation.", "hiring-surge", "moderate", "finance"),
      ],
      intelligence: [
        intel("Business Model", "Multi-brand group", "Zillow Group operates several brands, including Zillow, Trulia, StreetEasy and Zillow Home Loans. Seller inference: multiple entities and cost centers make consolidated spend visibility valuable."),
        intel("Executive Priorities", "Seller hypothesis", "Consolidating cards, expense and AP onto one platform could shorten the close and enforce policy at the point of spend. Not a confirmed opportunity."),
      ],
    },
    {
      id: "carvana",
      name: "Carvana",
      sector: "Online auto retail",
      tier: 1,
      potentialArr: 1_500_000,
      motion: "AP automation",
      lastActivityDaysAgo: 6,
      lastActivity: "AP workflow walkthrough with Accounts Payable",
      thesis:
        "A vertically integrated model (buying, reconditioning, selling and delivering cars) produces large volumes of vendor invoices and field purchases. Cutting manual AP cost per vehicle is the framing. Seller hypothesis.",
      units: [
        unit("finance", "Finance", "finance", "High invoice volume from reconditioning, logistics and auction partners.", { size: 1.2 }),
        unit("recon", "Inspection & Reconditioning", "operations", "Distributed facilities buying parts and services daily.", { short: "Reconditioning" }),
        unit("logistics", "Logistics", "operations", "Car haulers and last-mile delivery vendors."),
      ],
      stakeholders: [
        person("ap-dir", "Director, Accounts Payable", "Technical Buyer", 4, "finance", "engaged", "Invoice volume and vendor variety strain the current process."),
        person("ap-mgr", "AP Manager", "Champion", 3, "finance", "engaged", "Day-to-day owner; wants capture and approvals that actually match POs."),
        person("ops-vp", "VP, Reconditioning Operations", "Influencer", 4, "recon", "contacted", "Facility managers need fast, controlled purchasing."),
        person("cao", "Chief Accounting Officer", "Economic Buyer", 5, "finance", "unworked", "Final sign-off on AP systems."),
      ],
      opportunities: [
        opp("ap", "Invoice automation for reconditioning vendors", "finance", 500_000, "Discovery", ["ap-dir", "ap-mgr", "ops-vp"], "Process-map one facility's invoices end to end.", "ap-mgr"),
      ],
      signals: [signal("Unit-economics focus", "Demo: per-vehicle cost reduction named in planning.", "earnings-priority", "moderate", "recon")],
      intelligence: [
        intel("Business Model", "Vertically integrated used-car retail", "Carvana buys, reconditions, sells and delivers vehicles online, operating its own inspection centers and logistics network."),
        intel("Executive Priorities", "Unit economics", "Carvana has publicly focused on per-unit profitability. Seller inference: cutting manual AP cost per vehicle is a resonant framing."),
      ],
    },
    {
      id: "chobani",
      name: "Chobani",
      sector: "Food and beverage manufacturing",
      tier: 2,
      potentialArr: 1_100_000,
      motion: "plant-level spend control",
      lastActivityDaysAgo: 12,
      lastActivity: "Discovery agenda shared with the Controller",
      thesis:
        "Plant-level purchasing for maintenance, packaging and services is high-volume and hard to control centrally. New capacity is a natural moment to set spend policy. Seller hypothesis.",
      units: [
        unit("plants", "Manufacturing", "operations", "Plants in New York and Idaho buy maintenance, packaging and services.", { size: 1.2, short: "Plants" }),
        unit("finance", "Finance", "finance", "Controllership across plants and entities."),
        unit("brand", "Brand & Marketing", "revenue", "Agency, events and media spend.", { short: "Brand" }),
      ],
      stakeholders: [
        person("controller", "Corporate Controller", "Technical Buyer", 4, "finance", "engaged", "Wants plant spend visible before the close, not after."),
        person("plant-fin", "Plant Finance Manager", "Champion", 3, "plants", "engaged", "Chases receipts from maintenance teams every month."),
        person("cfo", "Chief Financial Officer", "Economic Buyer", 5, "finance", "unworked", "Would sponsor a group-wide rollout."),
        person("mktg-ops", "Director, Marketing Operations", "Influencer", 3, "brand", "researched", "Manages agency and event spend."),
      ],
      opportunities: [
        opp("plant", "Plant purchasing on controlled cards", "plants", 350_000, "Discovery", ["controller", "plant-fin"], "Pilot cards with policy at one plant.", "plant-fin"),
      ],
      signals: [signal("Capacity expansion", "Demo: new production capacity increases plant-level purchasing.", "market-expansion", "moderate", "plants")],
      intelligence: [
        intel("Business Model", "Branded food manufacturer", "Chobani makes yogurt, oat-based products and creamers, with major plants in New York and Idaho."),
        intel("Transformation Initiatives", "Growth investments", "Chobani has invested in new production capacity. Seller inference: new facilities are a natural moment to set spend policy."),
      ],
    },
    {
      id: "sweetgreen",
      name: "Sweetgreen",
      sector: "Restaurants",
      tier: 2,
      potentialArr: 900_000,
      motion: "multi-location spend",
      lastActivityDaysAgo: 23,
      lastActivity: "Follow-up sent to Director, Restaurant Finance",
      thesis:
        "Every restaurant generates local purchasing for supplies, repairs and services. Field cards with policy could replace reimbursements and petty cash. Seller hypothesis.",
      units: [
        unit("restaurants", "Restaurant Operations", "operations", "Field managers spend daily on supplies, repairs and services.", { size: 1.3, short: "Restaurants" }),
        unit("finance", "Finance", "finance", "Accounting and FP&A for a growing footprint."),
        unit("automation", "Kitchen Automation", "product-engineering", "Infinite Kitchen program; capital spend runs through separate processes. No trigger.", { dormant: true, short: "Automation" }),
      ],
      stakeholders: [
        person("dir-fin", "Director, Restaurant Finance", "Technical Buyer", 4, "finance", "engaged", "Owns restaurant-level P&L reporting."),
        person("field", "Regional Operations Director", "Champion", 3, "restaurants", "contacted", "General managers spend personal cards and wait for reimbursement."),
        person("cfo", "Chief Financial Officer", "Economic Buyer", 5, "finance", "unworked", "Sponsor for any finance platform change."),
      ],
      opportunities: [
        opp("field", "Field cards for restaurant managers", "restaurants", 300_000, "Discovery", ["dir-fin", "field"], "Rebook the working session that slipped.", "field"),
      ],
      signals: [signal("New restaurant openings", "Demo: new openings add locations to manage.", "market-expansion", "moderate", "restaurants")],
      intelligence: [
        intel("Business Model", "Multi-location restaurants", "Sweetgreen operates a growing number of restaurants across the US. Each location generates local purchasing."),
        intel("Transformation Initiatives", "Kitchen automation", "Sweetgreen is rolling out its automated Infinite Kitchen in some locations. Seller inference: automation capital spend runs through different processes than daily restaurant spend."),
      ],
    },
    {
      id: "warby-parker",
      name: "Warby Parker",
      sector: "Eyewear retail",
      tier: 2,
      potentialArr: 1_000_000,
      motion: "retail store spend",
      lastActivityDaysAgo: 8,
      lastActivity: "Expense policy review with Finance Operations",
      thesis:
        "A growing store fleet means frequent, distributed spend on supplies and services. Policy at the card plus automatic receipts could remove store expense friction. Seller hypothesis.",
      units: [
        unit("retail", "Retail Stores", "operations", "Local store spend on supplies and services.", { size: 1.2, short: "Stores" }),
        unit("finance", "Finance Operations", "finance", "AP, expense and close.", { short: "Finance Ops" }),
        unit("supply", "Optical Lab & Supply Chain", "operations", "Labs and fulfillment vendors.", { short: "Supply Chain" }),
      ],
      stakeholders: [
        person("fin-ops", "Director, Finance Operations", "Technical Buyer", 4, "finance", "engaged", "Owns expense policy and the close calendar."),
        person("retail-ops", "Senior Manager, Retail Operations", "Champion", 3, "retail", "engaged", "Store leaders lose time to receipts and reimbursements."),
        person("vp-fin", "VP, Finance", "Economic Buyer", 4, "finance", "contacted", "Would approve a pilot that pays for itself."),
        person("supply-dir", "Director, Supply Chain", "Influencer", 3, "supply", "researched", "Manages lab and fulfillment vendors."),
      ],
      opportunities: [
        opp("stores", "Store spend on policy-controlled cards", "retail", 380_000, "Qualified", ["fin-ops", "retail-ops", "vp-fin"], "Pilot in one region; measure receipt compliance.", "retail-ops"),
      ],
      signals: [signal("Store expansion", "Demo: new store openings planned this year.", "market-expansion", "moderate", "retail")],
      intelligence: [
        intel("Business Model", "Direct-to-consumer retail", "Warby Parker sells glasses and contacts online and through a growing fleet of retail stores that also offer eye exams."),
        intel("Executive Priorities", "Seller hypothesis", "Policy at the card plus automatic receipts could reduce store expense friction. Not a confirmed opportunity."),
      ],
    },
    {
      id: "equinox",
      name: "Equinox Group",
      sector: "Premium fitness and hospitality",
      tier: 2,
      potentialArr: 900_000,
      motion: "club and hotel spend",
      lastActivityDaysAgo: 32,
      lastActivity: "Discovery meeting with VP, Finance",
      thesis:
        "Clubs, hotels and SoulCycle each have distinct operating spend under one finance team. Club purchasing and contractor payments are the opening. Seller hypothesis.",
      units: [
        unit("clubs", "Clubs", "operations", "Clubs in major cities with local purchasing and contractor spend.", { size: 1.2 }),
        unit("hotels", "Equinox Hotels", "operations", "Hotel operations with hospitality-style procurement.", { short: "Hotels" }),
        unit("finance", "Finance", "finance", "Shared finance across brands, including SoulCycle."),
      ],
      stakeholders: [
        person("vp-fin", "VP, Finance", "Economic Buyer", 4, "finance", "engaged", "Took the discovery meeting; wants club-level savings evidence."),
        person("club-ops", "Director, Club Operations", "Champion", 3, "clubs", "contacted", "Club managers juggle contractors and supplies."),
        person("proc", "Procurement Manager", "Procurement", 2, "finance", "researched", "Owns vendor terms across brands."),
      ],
      opportunities: [
        opp("clubs", "Club purchasing and contractor payments", "clubs", 320_000, "Discovery", ["vp-fin", "club-ops"], "Re-engage with a club-level savings analysis.", "club-ops"),
      ],
      signals: [signal("Brand portfolio changes", "Demo: leadership changes across brands.", "executive-change", "weak", "finance")],
      intelligence: [
        intel("Business Model", "Multi-brand premium fitness", "Equinox Group operates Equinox clubs, Equinox Hotels and SoulCycle; each brand has distinct operating spend."),
        intel("Company Scale", "Privately held", "Equinox Group is privately held. Seller inference: finance balances growth investments with tight spend control."),
      ],
    },
    {
      id: "discord",
      name: "Discord",
      sector: "Communications platform",
      tier: 3,
      potentialArr: 700_000,
      motion: "software spend",
      lastActivityDaysAgo: 38,
      lastActivity: "Reference requested by Finance Operations",
      thesis:
        "A software-heavy cost base makes SaaS renewals and vendor sprawl a visible line. Renewal management is the likely entry point. Seller hypothesis.",
      units: [
        unit("finance", "Finance", "finance", "AP, expense and FP&A.", { size: 1.1 }),
        unit("it", "IT & Business Systems", "business", "SaaS sprawl and renewals.", { short: "Business Systems" }),
      ],
      stakeholders: [
        person("fin-ops", "Head of Finance Operations", "Technical Buyer", 4, "finance", "engaged", "Asked for a reference before going further."),
        person("it-dir", "Director, Business Systems", "Influencer", 3, "it", "contacted", "Tracks SaaS renewals in spreadsheets."),
        person("cfo", "Chief Financial Officer", "Economic Buyer", 5, "finance", "unworked", "Would sponsor if savings are clear."),
      ],
      opportunities: [
        opp("saas", "SaaS spend and renewals management", "it", 250_000, "Discovery", ["fin-ops", "it-dir"], "Send the reference and a renewal-savings estimate.", "fin-ops"),
      ],
      signals: [signal("Efficiency focus", "Demo: operating-efficiency goals set for the year.", "earnings-priority", "weak", "finance")],
      intelligence: [
        intel("Business Model", "Consumer platform with subscriptions", "Discord is a communications platform monetized partly through Nitro subscriptions."),
        intel("Executive Priorities", "Seller hypothesis", "Renewal management and software spend visibility are the likely entry point. Not a confirmed opportunity."),
      ],
    },
    {
      id: "canva",
      name: "Canva",
      sector: "Visual communication software",
      tier: 3,
      potentialArr: 800_000,
      motion: "global travel and expense",
      lastActivityDaysAgo: 79,
      lastActivity: "Intro call with Global Head of Finance Operations",
      thesis:
        "Offices across several countries make multi-currency, multi-entity expense a natural fit. The conversation stalled after an intro call. Seller hypothesis.",
      units: [
        unit("finance", "Global Finance", "finance", "Finance across Australia, the US and Europe.", { size: 1.1, short: "Finance" }),
        unit("workplace", "People & Workplace", "people", "Offsites, travel and workplace spend.", { short: "Workplace" }),
        unit("procurement", "Procurement", "procurement", "Centralized procurement initiative paused in this demo.", { dormant: true }),
      ],
      stakeholders: [
        person("fin-ops", "Global Head of Finance Operations", "Technical Buyer", 4, "finance", "contacted", "Took an intro call; no follow-up since."),
        person("ap", "AP Lead", "Champion", 3, "finance", "researched", "Handles reimbursements in several currencies."),
        person("workplace", "Director, Workplace Experience", "Influencer", 3, "workplace", "unworked", "Owns offsite and travel programs."),
      ],
      opportunities: [
        opp("tne", "Global travel and expense", "finance", 300_000, "Discovery", ["fin-ops", "ap"], "Re-open: the last conversation was months ago.", "ap"),
      ],
      signals: [signal("Global hiring", "Demo: open roles across several offices.", "hiring-surge", "weak", "workplace")],
      intelligence: [
        intel("Business Model", "Freemium SaaS, global", "Canva is headquartered in Sydney with offices around the world and sells Pro, Teams and Enterprise plans."),
        intel("Company Scale", "Global workforce", "Thousands of employees across several countries. Seller inference: travel and offsite spend is material."),
      ],
    },
  ],
};
