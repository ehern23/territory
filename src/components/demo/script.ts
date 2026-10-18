import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView, TerritorySummary } from "@/store/selectors";
import { STAGE_BY_MATURITY, formatMoney } from "@/domain/commercial";
import { HEALTH_LABEL } from "@/domain/health";

/**
 * The interview narrative: five acts, nine beats, about four minutes.
 * Each beat's `enter` mutates territory state; the scene and camera follow.
 * Going backwards replays beats from a clean territory, so every beat is
 * reproducible no matter how the presenter navigates.
 */

export interface DemoContext {
  summary: TerritorySummary;
  view: (id: string) => AccountView | undefined;
  /** JPMorganChase health before the simulated neglect. */
  healthBeforeNeglect: number;
}

export interface DemoBeat {
  act: number;
  actTitle: string;
  title: string;
  body: (c: DemoContext) => string;
  enter: () => void;
}

const S = () => useTerritoryStore.getState();
const FOCUS = "jpmc";

export const DEMO_BEATS: DemoBeat[] = [
  {
    act: 1,
    actTitle: "The territory",
    title: "A book of business, grown instead of listed",
    body: ({ summary }) =>
      `Eight strategic accounts and ${formatMoney(summary.potential)} of potential ARR. Every tree is an account: height is potential, the canopy is engagement health, and fruit is pipeline. CRM rows become something you can read at a glance.`,
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
    title: "JPMorganChase",
    body: ({ view }) => {
      const v = view(FOCUS);
      if (!v) return "";
      return `Tier 1, ${formatMoney(v.commercial.potentialArr)} potential. Health ${v.health.score} — ${HEALTH_LABEL[v.health.band].toLowerCase()}. ${formatMoney(v.pipeline.open)} open pipeline, last touch ${v.daysSince} days ago. Stakeholders, opportunities and the next best action come from the same data that shapes the tree.`;
    },
    enter: () => S().enterAccount(FOCUS),
  },
  {
    act: 2,
    actTitle: "Account intelligence",
    title: "The org chart is the branch structure",
    body: () =>
      "Each limb is a business unit. Enterprise Technology carries the live evaluation, so it's the fullest. The bare limb is Asset & Wealth Management — dormant by deliberate choice, not neglect. Not all whitespace is worth a seller's time.",
    enter: () => S().focusBusinessUnit(`${FOCUS}.et`),
  },
  {
    act: 3,
    actTitle: "Changing account health",
    title: "Seventy-five quiet days",
    body: ({ view, healthBeforeNeglect }) => {
      const v = view(FOCUS);
      if (!v) return "";
      return `Skip ahead with no activity. Recency collapses and relationships cool: health falls from ${healthBeforeNeglect} to ${v.health.score}. The canopy yellows and thins — the account says it's at risk before the forecast does.`;
    },
    enter: () => {
      S().focusBusinessUnit(null);
      useTerritoryStore.setState({ panelTab: "overview" });
      S().simulateNeglect(FOCUS, 75);
    },
  },
  {
    act: 4,
    actTitle: "Opportunity creation",
    title: "One executive meeting",
    body: ({ view }) => {
      const v = view(FOCUS);
      const opp = v?.opportunities.find((o) => o.opportunity.id === `${FOCUS}.opp.dx-standard`);
      const value = v?.commercial.dealValues[`${FOCUS}.opp.dx-standard`] ?? 0;
      if (!v) return "";
      return `A meeting with Thea Halloran, VP of Engineer's Platform & Experience. Recency resets, a second senior thread opens, and a ${formatMoney(value)} opportunity buds on the Enterprise Technology limb${opp?.maturity ? ` — ${STAGE_BY_MATURITY[opp.maturity]}` : ""}. Health is back to ${v.health.score}.`;
    },
    enter: () => S().runActivity(FOCUS, "exec-meeting"),
  },
  {
    act: 4,
    actTitle: "Opportunity creation",
    title: "Multithread, and the fruit ripens",
    body: ({ view }) => {
      const v = view(FOCUS);
      const opp = v?.opportunities.find((o) => o.opportunity.id === `${FOCUS}.opp.dx-standard`);
      if (!v) return "";
      return `Two more stakeholders engage on the expansion. The deal advances to ${opp?.maturity ? STAGE_BY_MATURITY[opp.maturity] : "the next stage"}, the fruit grows and warms in colour, and open pipeline on this account is now ${formatMoney(v.pipeline.open)}.`;
    },
    enter: () => {
      S().runActivity(FOCUS, "multithread");
      const opp = `${FOCUS}.opp.dx-standard`;
      if (S().opportunitiesById[opp]) S().selectOpportunity(opp);
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
  useTerritoryStore.setState({ demo: { active: true, step }, introDone: true });
  for (let i = 0; i < step; i++) DEMO_BEATS[i].enter();
  useTerritoryStore.setState({ notices: [] });
  DEMO_BEATS[step].enter();
  useTerritoryStore.setState({ demo: { active: true, step } });
}
