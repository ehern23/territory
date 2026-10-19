import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView, TerritorySummary } from "@/store/selectors";
import type { Prospect } from "@/domain/types";
import { STAGE_BY_MATURITY, formatMoney } from "@/domain/commercial";
import { HEALTH_LABEL } from "@/domain/health";

/**
 * The interview narrative: five acts, nine beats, about four minutes.
 * Each beat's `enter` mutates territory state; the scene and camera follow.
 * Going backwards replays beats from a clean territory, so every beat is
 * reproducible no matter how the presenter navigates.
 *
 * The story follows whichever seller is active: the flagship account is the
 * territory's first account, the live limb is its first business unit with an
 * opportunity, and the expansion is its forming (latent) opportunity.
 */

/** Who and what the demo focuses on, derived from the active territory. */
export interface DemoPlan {
  focusId: string;
  focusName: string;
  /** Business unit carrying the live evaluation. */
  branchUnitId: string | null;
  branchUnitName: string;
  /** A deliberately dormant business unit, if the account has one. */
  dormantUnitName: string | null;
  /** The opportunity an executive meeting should bring to life. */
  expansionOppId: string | null;
  expansionUnitName: string;
}

export interface DemoContext {
  summary: TerritorySummary;
  view: (id: string) => AccountView | undefined;
  /** Flagship health before the simulated neglect. */
  healthBeforeNeglect: number;
  plan: DemoPlan;
  /** The stakeholder most recently met at the flagship, if any. */
  lastMeeting: Prospect | null;
}

export interface DemoBeat {
  act: number;
  actTitle: string;
  title: string | ((plan: DemoPlan) => string);
  body: (c: DemoContext) => string;
  enter: () => void;
}

const S = () => useTerritoryStore.getState();

export function demoPlan(s: Pick<ReturnType<typeof S>, "accounts"> = S()): DemoPlan {
  const account = s.accounts[0];
  if (!account) {
    return { focusId: "", focusName: "", branchUnitId: null, branchUnitName: "", dormantUnitName: null, expansionOppId: null, expansionUnitName: "" };
  }
  const branch = account.businessUnits.find((bu) => account.opportunities.some((o) => o.businessUnitId === bu.id)) ?? account.businessUnits[0];
  const dormant = account.businessUnits.find((bu) => bu.status === "dormant");
  const expansion = account.opportunities.find((o) => o.latent) ?? account.opportunities[1] ?? account.opportunities[0];
  const expansionUnit = expansion ? account.businessUnits.find((bu) => bu.id === expansion.businessUnitId) : undefined;
  return {
    focusId: account.id,
    focusName: account.name,
    branchUnitId: branch?.id ?? null,
    branchUnitName: branch?.name ?? "",
    dormantUnitName: dormant?.name ?? null,
    expansionOppId: expansion?.id ?? null,
    expansionUnitName: expansionUnit?.name ?? branch?.name ?? "",
  };
}

/** "VP, Engineer's Platform & Experience" → "VP of Engineer's Platform & Experience". */
export function spokenTitle(title: string): string {
  return title.replace(", ", " of ");
}

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
function countWord(n: number) {
  return NUMBER_WORDS[n] ?? String(n);
}

export function beatTitle(beat: DemoBeat, plan: DemoPlan = demoPlan()): string {
  return typeof beat.title === "function" ? beat.title(plan) : beat.title;
}

export const DEMO_BEATS: DemoBeat[] = [
  {
    act: 1,
    actTitle: "The territory",
    title: "A book of business, grown instead of listed",
    body: ({ summary }) =>
      `${countWord(summary.accounts)} strategic accounts and ${formatMoney(summary.potential)} of potential ARR. Every tree is an account: height is potential, the canopy is engagement health, and fruit is pipeline. CRM rows become something you can read at a glance.`,
    enter: () => {
      S().returnToForest();
      useTerritoryStore.setState({ filter: "all" });
    },
  },
  {
    act: 1,
    actTitle: "The territory",
    title: "Health is visible before it's reported",
    body: ({ summary }) =>
      `Full green crowns are relationships in motion. Yellowing, thinning crowns are accounts going quiet — ${summary.attention} of ${summary.accounts} today. Fruit glows brighter as a deal ripens from discovery toward commercial.`,
    enter: () => {
      useTerritoryStore.setState({ filter: "all" });
    },
  },
  {
    act: 2,
    actTitle: "Account intelligence",
    title: (plan) => plan.focusName,
    body: ({ view, plan }) => {
      const v = view(plan.focusId);
      if (!v) return "";
      return `Tier ${v.commercial.tier}, ${formatMoney(v.commercial.potentialArr)} potential. Health ${v.health.score} — ${HEALTH_LABEL[v.health.band].toLowerCase()}. ${formatMoney(v.pipeline.open)} open pipeline, last touch ${v.daysSince} days ago. Stakeholders, opportunities and the next best action come from the same data that shapes the tree.`;
    },
    enter: () => S().enterAccount(demoPlan().focusId),
  },
  {
    act: 2,
    actTitle: "Account intelligence",
    title: "The org chart is the branch structure",
    body: ({ plan }) =>
      `Each limb is a business unit. ${plan.branchUnitName} carries the live evaluation, so it's the fullest. ` +
      (plan.dormantUnitName
        ? `The bare limb is ${plan.dormantUnitName} — dormant by deliberate choice, not neglect. Not all whitespace is worth a seller's time.`
        : "Thinner limbs are organizations not yet worked. Not all whitespace is worth a seller's time."),
    enter: () => S().focusBusinessUnit(demoPlan().branchUnitId),
  },
  {
    act: 3,
    actTitle: "Changing account health",
    title: "Seventy-five quiet days",
    body: ({ view, plan, healthBeforeNeglect }) => {
      const v = view(plan.focusId);
      if (!v) return "";
      return `Skip ahead with no activity. Recency collapses and relationships cool: health falls from ${healthBeforeNeglect} to ${v.health.score}. The canopy yellows and thins — the account says it's at risk before the forecast does.`;
    },
    enter: () => {
      S().focusBusinessUnit(null);
      useTerritoryStore.setState({ panelTab: "overview" });
      S().simulateNeglect(demoPlan().focusId, 75);
    },
  },
  {
    act: 4,
    actTitle: "Opportunity creation",
    title: "One executive meeting",
    body: ({ view, plan, lastMeeting }) => {
      const v = view(plan.focusId);
      if (!v) return "";
      const opp = v.opportunities.find((o) => o.opportunity.id === plan.expansionOppId);
      const value = plan.expansionOppId ? (v.commercial.dealValues[plan.expansionOppId] ?? 0) : 0;
      const who = lastMeeting ? `A meeting with ${lastMeeting.name}, ${spokenTitle(lastMeeting.title)}.` : "An executive meeting.";
      return `${who} Recency resets, a second senior thread opens, and a ${formatMoney(value)} opportunity buds on the ${plan.expansionUnitName} limb${opp?.maturity ? ` — ${STAGE_BY_MATURITY[opp.maturity]}` : ""}. Health is back to ${v.health.score}.`;
    },
    enter: () => S().runActivity(demoPlan().focusId, "exec-meeting"),
  },
  {
    act: 4,
    actTitle: "Opportunity creation",
    title: "Multithread, and the fruit ripens",
    body: ({ view, plan }) => {
      const v = view(plan.focusId);
      if (!v) return "";
      const opp = v.opportunities.find((o) => o.opportunity.id === plan.expansionOppId);
      return `Two more stakeholders engage on the expansion. The deal advances to ${opp?.maturity ? STAGE_BY_MATURITY[opp.maturity] : "the next stage"}, the fruit grows and warms in colour, and open pipeline on this account is now ${formatMoney(v.pipeline.open)}.`;
    },
    enter: () => {
      const plan = demoPlan();
      S().runActivity(plan.focusId, "multithread");
      if (plan.expansionOppId && S().opportunitiesById[plan.expansionOppId]) S().selectOpportunity(plan.expansionOppId);
    },
  },
  {
    act: 5,
    actTitle: "Territory strategy",
    title: "Where to spend next week",
    body: ({ summary }) => {
      const top = summary.priorities.slice(0, 2).map((p) => p.accountName);
      return `Back to the territory, filtered to accounts that need attention: ${summary.attention} light up. Priorities rank health against dollars at stake — ${top.join(" and ")} lead the list. The forest turns a pipeline review into a plan.`;
    },
    enter: () => {
      S().returnToForest();
      useTerritoryStore.setState({ filter: "attention" });
    },
  },
  {
    act: 5,
    actTitle: "Territory strategy",
    title: "Territory",
    body: () =>
      "Accounts as a living system: health you can see, pipeline that grows from real engagement, and a recommendation for what to do next. Built with Next.js, React Three Fiber and custom GLSL shaders, with Claude Code.",
    enter: () => {
      useTerritoryStore.setState({ filter: "all" });
    },
  },
];

/** Rebuild the state for `step` from a clean territory. */
export function applyDemoStep(step: number) {
  const s = S();
  // Clean slate, demo stays active.
  s.resetDemo();
  useTerritoryStore.setState({ demo: { active: true, step }, introDone: true, onboardingOpen: false });
  for (let i = 0; i < step; i++) DEMO_BEATS[i].enter();
  useTerritoryStore.setState({ notices: [] });
  DEMO_BEATS[step].enter();
  useTerritoryStore.setState({ demo: { active: true, step } });
}

/** The stakeholder most recently met at an account, from the activity log. */
export function lastMeetingAt(
  s: Pick<ReturnType<typeof S>, "activities" | "prospectsById">,
  accountId: string,
): Prospect | null {
  for (let i = s.activities.length - 1; i >= 0; i--) {
    const a = s.activities[i];
    if (a.accountId === accountId && a.kind === "meeting" && a.prospectId) return s.prospectsById[a.prospectId] ?? null;
  }
  return null;
}
