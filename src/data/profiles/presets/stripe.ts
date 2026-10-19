import type { SellerPreset } from "@/domain/profile";
import { intel, opp, person, signal, unit } from "../dsl";

/**
 * Stripe enterprise territory. Target companies are real; organisations and
 * theses are seller inference; people, stages, activity and dollars are demo.
 * No statement here describes an actual commercial relationship.
 */
export const stripe: SellerPreset = {
  aliases: ["stripe", "stripe inc", "stripe, inc."],
  profile: {
    id: "stripe",
    company: "Stripe",
    productName: "Stripe",
    product: "Financial infrastructure: payments, billing and platform payouts",
    category: "payments infrastructure",
    role: "AE",
    territoryLabel: "Stripe Enterprise",
    motion: "payments modernization",
    icp: "Digital-first enterprises, marketplaces and SaaS companies with complex, global money movement: multi-country acceptance, platform payouts and subscription billing.",
    valueProps: [
      "Higher authorization rates and lower cost of acceptance",
      "One integration for global payment methods",
      "Embedded payouts and onboarding for platforms",
      "Subscription and usage billing without custom code",
    ],
    personas: ["Head of Payments", "CFO / VP Finance", "VP Engineering", "Director, Revenue Operations"],
    archetype: "payments",
    source: "preset",
  },
  seeds: [
    {
      id: "doordash",
      name: "DoorDash",
      sector: "Local commerce marketplace",
      tier: 1,
      potentialArr: 9_500_000,
      motion: "marketplace payouts",
      lastActivityDaysAgo: 2,
      lastActivity: "Payout architecture review with Marketplace Payments",
      thesis:
        "A three-sided marketplace moves money in at checkout and out to merchants and Dashers in many countries. Faster, cheaper payouts and a single acceptance layer across markets could support a payments-modernization conversation. Seller hypothesis, not a confirmed opportunity. Demo activity is concentrated in Marketplace Payments; Ads is held dormant.",
      units: [
        unit("marketplace", "Marketplace Payments", "payments", "Consumer checkout, merchant settlement and Dasher payouts. The live evaluation: payout speed and cost as the marketplace adds markets.", { size: 1.5, short: "Marketplace Payments" }),
        unit("intl", "International", "product-engineering", "Expansion beyond the US, including Wolt, adds local payment methods, currencies and payout rails.", { short: "International" }),
        unit("commerce", "Commerce Platform", "product-engineering", "Storefront and Drive serve merchants' own channels: a payments-for-platforms surface.", { short: "Commerce Platform" }),
        unit("ads", "Ads", "revenue", "Advertising business. No payments buying surface identified in this demo.", { dormant: true }),
      ],
      stakeholders: [
        person("vp-payments", "VP, Payments", "Economic Buyer", 5, "marketplace", "unworked", "Owns payments economics across the marketplace. Unworked: the sponsor a global consolidation would need."),
        person("dir-payouts", "Director, Payouts Engineering", "Technical Buyer", 4, "marketplace", "meeting", "Technical owner of payout rails. Meeting booked to review instant-payout reliability and reconciliation."),
        person("pm-merchant", "Group Product Manager, Merchant Payments", "Champion", 4, "marketplace", "engaged", "Emerging champion: wants faster merchant settlement without adding reconciliation work."),
        person("risk", "Head of Payment Risk", "Security", 3, "marketplace", "engaged", "Balances conversion against fraud. Open to a shared risk layer across markets."),
        person("intl-dir", "Director, International Payments", "Technical Buyer", 4, "intl", "researched", "Would own local payment methods and currencies for new markets."),
        person("treasury", "Director, Treasury Operations", "Influencer", 4, "marketplace", "unworked", "Cares about funding flows, FX and the cost of moving money between entities."),
      ],
      opportunities: [
        opp("payouts", "Instant payouts for merchants and Dashers", "marketplace", 2_400_000, "Qualified", ["dir-payouts", "pm-merchant"], "Technical validation of payout rails in two markets, sequenced with Payment Risk.", "pm-merchant"),
        opp("global", "Global acceptance consolidation", "marketplace", 4_200_000, "Forming", ["vp-payments", "risk", "intl-dir", "treasury"], "Executive alignment on a multi-market acceptance roadmap.", "risk"),
      ],
      signals: [
        signal("Payout pilot scope requested", "Demo: Merchant Payments asked for a two-market payout pilot scope.", "platform-migration", "strong", "marketplace"),
        signal("Payments engineering hiring", "Demo: open roles referencing payouts, ledgering and local payment methods.", "hiring-surge", "moderate", "marketplace"),
      ],
      intelligence: [
        intel("Business Model", "Three-sided marketplace", "DoorDash connects consumers, merchants and Dashers. Money moves in at checkout and out as merchant settlements and Dasher earnings, so every new market multiplies payment methods, currencies and payout rails."),
        intel("Transformation Initiatives", "International expansion", "DoorDash acquired Wolt in 2022 and operates in many countries. Seller inference: local acceptance and cross-border payouts become a platform problem rather than a per-market integration."),
        intel("Executive Priorities", "Seller hypothesis", "Faster payouts and one acceptance layer could support a {seller} conversation spanning checkout, payouts and reconciliation. Not a confirmed opportunity."),
      ],
    },
    {
      id: "atlassian",
      name: "Atlassian",
      sector: "Collaboration software",
      tier: 1,
      potentialArr: 5_200_000,
      motion: "Billing migration",
      lastActivityDaysAgo: 6,
      lastActivity: "Billing data-model workshop with Commerce Platform",
      thesis:
        "Cloud subscriptions, upgrades, proration and partner revenue all flow through billing. Replacing custom billing code and adding usage-based pricing could support a Billing migration, with Marketplace payouts as a second motion. Seller hypothesis, not a confirmed opportunity.",
      units: [
        unit("commerce", "Commerce Platform", "payments", "Owns quoting, subscriptions and invoicing for Jira, Confluence and the cloud portfolio. The live billing conversation.", { size: 1.3, short: "Commerce" }),
        unit("marketplace", "Atlassian Marketplace", "platform", "Third-party app ecosystem with revenue sharing to partners: a platform-payouts surface.", { short: "Marketplace" }),
        unit("finance", "Finance & Revenue", "finance", "Revenue recognition and collections across cloud and Data Center plans.", { short: "Finance" }),
      ],
      stakeholders: [
        person("dir-commerce", "Director, Commerce Engineering", "Technical Buyer", 4, "commerce", "engaged", "Owns the billing engine; open to retiring custom proration and invoicing code."),
        person("pm-billing", "Principal Product Manager, Billing", "Champion", 3, "commerce", "engaged", "Champion: wants usage-based pricing for cloud products without a long build."),
        person("revops", "Head of Revenue Operations", "Influencer", 3, "finance", "contacted", "Cares about clean billing data for revenue recognition."),
        person("partners", "Head of Marketplace Partnerships", "Influencer", 3, "marketplace", "unworked", "Owns partner payouts; a second motion once billing lands."),
        person("vp-finsys", "VP, Finance Systems", "Economic Buyer", 5, "finance", "unworked", "Would sign off on any change to the billing system of record."),
      ],
      opportunities: [
        opp("billing", "Subscription and usage Billing migration", "commerce", 1_600_000, "Discovery", ["dir-commerce", "pm-billing", "revops"], "Map current billing objects to a target data model; agree a migration cohort.", "pm-billing"),
      ],
      signals: [
        signal("Usage-based packaging on the roadmap", "Demo: new usage-based packaging discussed in billing roadmap reviews.", "platform-migration", "moderate", "commerce"),
        signal("Finance systems hiring", "Demo: roles posted for billing and revenue systems.", "hiring-surge", "weak", "finance"),
      ],
      intelligence: [
        intel("Business Model", "Cloud subscriptions at scale", "Atlassian sells Jira, Confluence and related products, increasingly as cloud subscriptions after ending sales of new Server licences. Plan changes, upgrades and proration all flow through billing."),
        intel("Digital Surface", "Marketplace ecosystem", "The Atlassian Marketplace lists thousands of partner apps. Seller inference: partner payouts and tax handling are a natural platform-payments conversation."),
      ],
    },
    {
      id: "instacart",
      name: "Instacart",
      sector: "Online grocery marketplace",
      tier: 1,
      potentialArr: 4_800_000,
      motion: "shopper payouts",
      lastActivityDaysAgo: 11,
      lastActivity: "Discovery agenda shared with Shopper Payments",
      thesis:
        "Shoppers fund orders at checkout and are paid per batch, while retailers settle on their own terms. Payout speed and card-funding reliability are the opening; embedded payments for retailers' storefronts is the longer play. Seller hypothesis.",
      units: [
        unit("shopper", "Shopper Payments", "payments", "Funding shopper cards at checkout and paying out earnings: high-volume, real-time money movement.", { size: 1.2, short: "Shopper Payments" }),
        unit("enterprise", "Enterprise Platform", "product-engineering", "Technology that powers retailers' own storefronts and in-store experiences.", { short: "Enterprise" }),
        unit("ads", "Instacart Ads", "revenue", "Advertising business. No payments buying surface identified in this demo.", { dormant: true, short: "Ads" }),
      ],
      stakeholders: [
        person("dir-shopper", "Director, Shopper Payments", "Technical Buyer", 4, "shopper", "meeting", "Meeting booked to discuss payout speed and card-funding reliability."),
        person("em-payments", "Engineering Manager, Payments Infrastructure", "Champion", 3, "shopper", "engaged", "Owns integrations and incident load; wants fewer processor-specific code paths."),
        person("vp-finance", "VP, Finance", "Economic Buyer", 5, "shopper", "unworked", "Budget owner for processing and payout costs."),
        person("gpm-retail", "Group Product Manager, Retailer Platform", "Influencer", 3, "enterprise", "researched", "Would own payments embedded in retailer storefronts."),
      ],
      opportunities: [
        opp("payouts", "Shopper earnings payouts", "shopper", 1_100_000, "Discovery", ["dir-shopper", "em-payments"], "Quantify payout cost and speed; propose a single-market pilot.", "em-payments"),
      ],
      signals: [
        signal("Faster shopper earnings", "Demo: leadership commentary emphasizes faster access to shopper earnings.", "earnings-priority", "moderate", "shopper"),
        signal("Retailer platform growth", "Demo: new retailer storefront launches on the enterprise platform.", "product-launch", "weak", "enterprise"),
      ],
      intelligence: [
        intel("Business Model", "Marketplace with shopper payouts", "Instacart partners with grocers and retailers; shoppers fulfil orders and are paid per batch. Money moves at checkout, to retailers and out to shoppers."),
        intel("Digital Surface", "Enterprise platform for retailers", "Instacart's enterprise offerings power retailers' own online storefronts and in-store technology such as Caper Carts. Seller inference: embedded payments for retailers is a later-stage motion."),
      ],
    },
    {
      id: "peloton",
      name: "Peloton",
      sector: "Connected fitness",
      tier: 2,
      potentialArr: 2_400_000,
      motion: "subscription billing",
      lastActivityDaysAgo: 24,
      lastActivity: "Follow-up sent to Director, Subscriptions Engineering",
      thesis:
        "Recurring memberships are the core of the business, so involuntary churn from failed renewals is a measurable lever. A recovery-and-dunning conversation fits a cost-conscious leadership team better than a platform rebuild. Seller hypothesis.",
      units: [
        unit("subs", "Subscriptions", "payments", "Membership billing for All-Access and App tiers: renewals, dunning and failed-payment recovery.", { size: 1.2 }),
        unit("commerce", "Hardware Commerce", "product-engineering", "Bike, Tread and Row checkout, financing and returns.", { short: "Hardware" }),
        unit("intl", "International", "product-engineering", "Smaller international footprint; no expansion trigger in this demo.", { dormant: true }),
      ],
      stakeholders: [
        person("dir-subs", "Director, Subscriptions Engineering", "Technical Buyer", 4, "subs", "engaged", "Wants to recover failed renewals without rebuilding dunning logic."),
        person("pm-membership", "Senior Product Manager, Membership", "Champion", 3, "subs", "contacted", "Measures churn from involuntary payment failure."),
        person("vp-fpa", "VP, Financial Planning", "Economic Buyer", 4, "subs", "unworked", "Would sponsor if recovery maps to retention targets."),
        person("ecommerce", "Head of E-commerce", "Influencer", 3, "commerce", "researched", "Owns hardware checkout conversion."),
      ],
      opportunities: [
        opp("recovery", "Failed-payment recovery and dunning", "subs", 650_000, "Discovery", ["dir-subs", "pm-membership", "vp-fpa"], "Size involuntary churn; propose a recovery benchmark.", "dir-subs"),
      ],
      signals: [signal("Retention in focus", "Demo: membership retention named as a planning priority.", "earnings-priority", "moderate", "subs")],
      intelligence: [
        intel("Business Model", "Recurring membership revenue", "Peloton sells connected-fitness hardware and recurring memberships; subscription revenue is the core of the business. Seller inference: involuntary churn from failed payments is a measurable lever."),
        intel("Executive Priorities", "Cost discipline", "Peloton has publicly emphasized cost discipline and sustainable growth. Seller inference: a cost-neutral recovery story lands better than a platform rebuild."),
      ],
    },
    {
      id: "ea",
      name: "Electronic Arts",
      sector: "Interactive entertainment",
      tier: 2,
      potentialArr: 3_600_000,
      motion: "global in-game commerce",
      lastActivityDaysAgo: 9,
      lastActivity: "First reply from Director, Commerce Platform",
      thesis:
        "Direct purchases on PC and the web sell digital goods to players in many countries, where local payment methods and fraud controls decide conversion. Seller hypothesis.",
      units: [
        unit("commerce", "EA Commerce Platform", "payments", "Direct purchases of games, in-game currency and subscriptions on PC and web.", { size: 1.2, short: "Commerce" }),
        unit("play", "EA Play", "product-engineering", "Subscription service with monthly and annual plans."),
        unit("studios", "Studios", "product-engineering", "Console revenue flows mostly through platform stores; no direct payments surface identified.", { dormant: true }),
      ],
      stakeholders: [
        person("dir-commerce", "Director, Commerce Platform", "Technical Buyer", 4, "commerce", "engaged", "Replied to first outreach; curious about local payment methods in growth regions."),
        person("fraud", "Head of Fraud & Trust", "Security", 3, "commerce", "researched", "Digital goods attract fraud; will scrutinize risk tooling."),
        person("vp-digital", "VP, Digital Platform", "Economic Buyer", 5, "commerce", "unworked", "Owns direct-to-player revenue strategy."),
        person("play-lead", "Product Lead, EA Play", "Influencer", 3, "play", "contacted", "Owns subscription plans and renewals."),
      ],
      opportunities: [
        opp("methods", "Local payment methods for direct purchases", "commerce", 900_000, "Discovery", ["dir-commerce", "fraud"], "Pick two growth markets and model authorization uplift.", "dir-commerce"),
      ],
      signals: [signal("Commerce engineering roles", "Demo: roles posted for commerce and payments engineering.", "hiring-surge", "moderate", "commerce")],
      intelligence: [
        intel("Business Model", "Live services and direct purchases", "EA earns much of its revenue from live services and in-game purchases. PC and web purchases flow through EA's own commerce stack; console purchases mostly through platform stores."),
        intel("Digital Surface", "Global player base", "Players buy from many countries. Seller inference: local payment methods and fraud controls on digital goods are the core conversation."),
      ],
    },
    {
      id: "live-nation",
      name: "Live Nation",
      sector: "Live events and ticketing",
      tier: 2,
      potentialArr: 3_200_000,
      motion: "peak-volume checkout",
      lastActivityDaysAgo: 31,
      lastActivity: "Discovery meeting with Director, Checkout Engineering",
      thesis:
        "High-demand on-sales concentrate enormous payment volume into minutes, so authorization rates and checkout latency at peak are revenue. Seller hypothesis.",
      units: [
        unit("ticketing", "Ticketmaster Checkout", "payments", "On-sales create extreme traffic spikes; authorization and latency at peak decide revenue.", { size: 1.3, short: "Ticketing" }),
        unit("venues", "Venue Operations", "operations", "Concessions and on-site commerce across owned and operated venues.", { short: "Venues" }),
        unit("sponsorship", "Sponsorship & Advertising", "revenue", "No payments surface identified in this demo.", { dormant: true, short: "Sponsorship" }),
      ],
      stakeholders: [
        person("dir-checkout", "Director, Checkout Engineering", "Technical Buyer", 4, "ticketing", "engaged", "Owns checkout performance during on-sales."),
        person("payops", "Senior Manager, Payment Operations", "Champion", 3, "ticketing", "contacted", "Sees every decline spike after a major on-sale."),
        person("treasury", "VP, Treasury", "Economic Buyer", 4, "ticketing", "unworked", "Owns processing cost and settlement timing."),
        person("venue-tech", "Director, Venue Technology", "Influencer", 3, "venues", "researched", "Would own on-site payments."),
      ],
      opportunities: [
        opp("peak", "Peak on-sale authorization optimization", "ticketing", 1_200_000, "Discovery", ["dir-checkout", "payops"], "Benchmark authorization rates during the next major on-sale.", "payops"),
      ],
      signals: [signal("On-sale reliability scrutiny", "Demo: checkout performance during peak on-sales is a recurring executive topic.", "earnings-priority", "moderate", "ticketing")],
      intelligence: [
        intel("Business Model", "Ticketing and live events", "Live Nation operates concerts, venues and Ticketmaster. High-demand on-sales concentrate payment volume into very short windows."),
        intel("Security / Governance", "Regulatory attention", "Ticketing practices draw regulatory and public scrutiny. Seller inference: transparency in fees and refunds raises the bar for payment flows."),
      ],
    },
    {
      id: "duolingo",
      name: "Duolingo",
      sector: "Consumer subscriptions",
      tier: 3,
      potentialArr: 2_000_000,
      motion: "web subscriptions",
      lastActivityDaysAgo: 38,
      lastActivity: "Reference requested by Monetization Engineering",
      thesis:
        "Paid tiers are sold mostly through app stores, with web checkout as an alternative channel in some markets. Localized pricing and payment methods matter wherever web purchase is used. Seller hypothesis.",
      units: [
        unit("monetization", "Monetization", "payments", "Super and Max subscriptions; pricing experiments across many countries.", { size: 1.2 }),
        unit("growth", "Growth Engineering", "product-engineering", "Experiments on paywalls, trials and onboarding.", { short: "Growth" }),
      ],
      stakeholders: [
        person("em-monetization", "Engineering Manager, Monetization", "Champion", 3, "monetization", "engaged", "Runs pricing experiments; interested in localized web checkout."),
        person("dir-monetization", "Director, Monetization", "Technical Buyer", 4, "monetization", "contacted", "Owns subscription revenue across channels."),
        person("vp-finance", "VP, Finance", "Economic Buyer", 4, "monetization", "unworked", "Would weigh channel economics."),
      ],
      opportunities: [
        opp("web", "Web checkout for subscriptions", "monetization", 500_000, "Discovery", ["em-monetization", "dir-monetization"], "Send the reference; propose a single-country web checkout test.", "em-monetization"),
      ],
      signals: [signal("Web purchase channel interest", "Demo: product discussion of web purchase flows.", "platform-migration", "weak", "monetization")],
      intelligence: [
        intel("Business Model", "Freemium subscriptions", "Duolingo offers a free app with paid tiers such as Super. Most subscribers buy through mobile app stores."),
        intel("Company Scale", "Global learner base", "Duolingo serves learners in most countries. Seller inference: localized pricing and payment methods matter wherever web purchase is offered."),
      ],
    },
    {
      id: "wayfair",
      name: "Wayfair",
      sector: "Home goods e-commerce",
      tier: 3,
      potentialArr: 1_800_000,
      motion: "B2B invoicing",
      lastActivityDaysAgo: 83,
      lastActivity: "Intro call with Director, Wayfair Professional",
      thesis:
        "Wayfair Professional serves business buyers who expect invoices, net terms and purchase orders. Invoicing is the wedge; consumer checkout is a later conversation. Seller hypothesis. The thread has gone cold.",
      units: [
        unit("pro", "Wayfair Professional", "finance", "B2B program for businesses buying furnishings; invoicing and net terms are core.", { size: 1.1, short: "Professional" }),
        unit("checkout", "Consumer Checkout", "payments", "Consumer checkout and financing.", { short: "Checkout" }),
        unit("physical", "Physical Retail", "operations", "Large-format stores; no payments initiative identified in this demo.", { dormant: true, short: "Stores" }),
      ],
      stakeholders: [
        person("dir-pro", "Director, Wayfair Professional", "Technical Buyer", 4, "pro", "contacted", "Took an intro call; no follow-up since."),
        person("ar", "Senior Manager, Accounts Receivable", "Champion", 3, "pro", "researched", "Feels the cost of manual invoicing and collections."),
        person("vp-payments", "VP, Payments", "Economic Buyer", 4, "checkout", "unworked", "Owns consumer payments strategy."),
      ],
      opportunities: [
        opp("invoicing", "B2B invoicing and net terms", "pro", 450_000, "Discovery", ["dir-pro", "ar"], "Re-open the thread; the last touch was months ago.", "ar"),
      ],
      signals: [signal("Physical retail expansion", "Demo: new stores add in-person payment needs.", "market-expansion", "weak", "physical")],
      intelligence: [
        intel("Business Model", "Consumer and B2B channels", "Wayfair sells home goods online and runs Wayfair Professional for business buyers, who expect invoices, net terms and purchase orders."),
        intel("Transformation Initiatives", "Physical retail", "Wayfair has opened large-format physical stores. Seller inference: unified online and in-store payments is a long-term, not near-term, conversation."),
      ],
    },
  ],
};
