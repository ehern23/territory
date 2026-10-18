import type { AccountCommercial } from "@/domain/commercial";

/**
 * Demo commercial overlay. Potential, deal values and activity history are
 * synthetic (evidenceType "demo") and describe an illustrative territory,
 * not any real commercial relationship.
 */
export const COMMERCIAL: Record<string, AccountCommercial> = {
  jpmc: {
    tier: 1,
    potentialArr: 6_500_000,
    motion: "Net-new · platform standardization",
    lastActivityDaysAgo: 2,
    lastActivity: "Pilot scoping call with the EPX champion",
    dealValues: { "jpmc.opp.epx-eval": 1_800_000, "jpmc.opp.dx-standard": 3_200_000 },
  },
  walmart: {
    tier: 1,
    potentialArr: 5_200_000,
    motion: "Net-new · developer experience",
    lastActivityDaysAgo: 6,
    lastActivity: "Pilot measurement plan sent to Developer Productivity",
    dealValues: { "walmart.opp.devex-pilot": 1_400_000 },
  },
  disney: {
    tier: 1,
    potentialArr: 4_100_000,
    motion: "Net-new · streaming web delivery",
    lastActivityDaysAgo: 12,
    lastActivity: "Discovery agenda shared with Web Experiences",
    dealValues: { "disney.opp.streaming-eval": 950_000 },
  },
  amex: {
    tier: 2,
    potentialArr: 3_400_000,
    motion: "Net-new · governed app delivery",
    lastActivityDaysAgo: 24,
    lastActivity: "Follow-up sent to Director, Digital Experience",
    dealValues: { "amex.opp.app-delivery": 1_100_000 },
  },
  nike: {
    tier: 2,
    potentialArr: 3_800_000,
    motion: "Net-new · launch-grade delivery",
    lastActivityDaysAgo: 9,
    lastActivity: "First reply from Director, Web Platform",
    dealValues: { "nike.opp.launch-delivery": 850_000 },
  },
  starbucks: {
    tier: 2,
    potentialArr: 2_900_000,
    motion: "Net-new · mobile ordering",
    lastActivityDaysAgo: 31,
    lastActivity: "Discovery meeting with Director, Mobile Experience",
    dealValues: { "starbucks.opp.mobile-ordering": 1_250_000 },
  },
  marriott: {
    tier: 2,
    potentialArr: 2_600_000,
    motion: "Net-new · platform standards",
    lastActivityDaysAgo: 46,
    lastActivity: "Reference architecture requested by TIP.AI",
    dealValues: { "marriott.opp.tipai-standards": 780_000 },
  },
  ford: {
    tier: 3,
    potentialArr: 2_200_000,
    motion: "Net-new · connected owner apps",
    lastActivityDaysAgo: 83,
    lastActivity: "Intro call with Director, Digital Experience",
    dealValues: { "ford.opp.owner-app": 600_000 },
  },
};
