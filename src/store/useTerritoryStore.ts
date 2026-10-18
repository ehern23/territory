import { create } from "zustand";
import type {
  Account,
  Activity,
  ActivityKind,
  BusinessUnit,
  Opportunity,
  Prospect,
  RelationshipStatus,
  Signal,
} from "@/domain/types";
import { STATUS_LABEL } from "@/domain/relationship";
import { evaluateOpportunity, type OpportunityState } from "@/domain/opportunity";
import { STAGE_BY_MATURITY, formatMoney } from "@/domain/commercial";
import { territory } from "@/data";
import { COMMERCIAL } from "@/data/commercial";

export type Mode = "forest" | "account";
export type PanelTab = "overview" | "organization" | "intelligence" | "activity";
export type TerritoryFilter = "all" | "attention" | "pipeline" | "tier1";

/** A sample seller action the demo (or the user) can run against an account. */
export type SampleActivity = "follow-up" | "discovery-call" | "exec-meeting" | "multithread";

export interface Pulse {
  id: number;
  accountId: string;
  kind: "growth" | "fruit" | "wither" | "signal";
  startedAt: number;
}

export interface Reactivation {
  businessUnitId: string;
  startedAt: number;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  kind: "signal" | "info" | "growth" | "warning";
}

interface UndoEntry {
  label: string;
  prospects: Record<string, Prospect>;
  activitiesLength: number;
  daysSince: Record<string, number>;
}

interface Snapshot {
  prospectsById: Record<string, Prospect>;
  businessUnitsById: Record<string, BusinessUnit>;
  signals: Signal[];
  activities: Activity[];
  daysSince: Record<string, number>;
}

interface TerritoryState {
  accounts: Account[];
  accountsById: Record<string, Account>;
  prospectsById: Record<string, Prospect>;
  businessUnitsById: Record<string, BusinessUnit>;
  opportunitiesById: Record<string, Opportunity>;
  signals: Signal[];
  activities: Activity[];
  /** Days since the last seller activity, per account. */
  daysSince: Record<string, number>;

  mode: Mode;
  activeAccountId: string | null;
  hoveredAccountId: string | null;
  panelTab: PanelTab;
  focusBusinessUnitId: string | null;
  focusTeamId: string | null;
  selectedProspectId: string | null;
  selectedOpportunityId: string | null;
  filter: TerritoryFilter;
  /** Compact layouts: territory sheet expanded. */
  overviewOpen: boolean;
  /** Establishing shot has finished (or was skipped). */
  introDone: boolean;
  demo: { active: boolean; step: number };
  cameraNonce: number;
  reducedMotion: boolean;
  isTouch: boolean;
  isCompact: boolean;

  pulses: Pulse[];
  reactivations: Reactivation[];
  notices: Notice[];
  undoStack: UndoEntry[];

  // navigation
  enterAccount: (id: string) => void;
  returnToForest: () => void;
  setHovered: (id: string | null) => void;
  setPanelTab: (tab: PanelTab) => void;
  focusBusinessUnit: (id: string | null) => void;
  focusTeam: (id: string | null) => void;
  selectProspect: (id: string | null) => void;
  selectOpportunity: (id: string | null) => void;
  clearSelection: () => void;
  setFilter: (f: TerritoryFilter) => void;
  setOverviewOpen: (open: boolean) => void;
  setIntroDone: () => void;
  resetCamera: () => void;
  setReducedMotion: (v: boolean) => void;
  setIsTouch: (v: boolean) => void;
  setIsCompact: (v: boolean) => void;

  // relationship lifecycle
  setProspectStatus: (id: string, status: RelationshipStatus, opts?: { silent?: boolean }) => void;
  undo: () => void;

  // territory simulation
  runActivity: (accountId: string, kind: SampleActivity) => void;
  simulateNeglect: (accountId: string, days: number) => void;
  simulateTrigger: (businessUnitId: string) => void;
  completeReactivation: (businessUnitId: string) => void;
  dismissNotice: (id: string) => void;
  notify: (n: Omit<Notice, "id">) => void;
  resetDemo: () => void;

  // guided demo
  startDemo: () => void;
  setDemoStep: (step: number) => void;
  exitDemo: () => void;
}

function index<T extends { id: string }>(items: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) out[item.id] = item;
  return out;
}

const accountsById = index(territory.accounts);
const initialProspects = index(
  territory.accounts.flatMap((a) => a.businessUnits.flatMap((bu) => bu.teams.flatMap((t) => t.prospects))),
);
const initialBusinessUnits = index(territory.accounts.flatMap((a) => a.businessUnits));
const opportunitiesById = index(territory.accounts.flatMap((a) => a.opportunities));
const initialSignals = territory.accounts.flatMap((a) => a.signals);
const initialDays: Record<string, number> = Object.fromEntries(
  territory.accounts.map((a) => [a.id, COMMERCIAL[a.id]?.lastActivityDaysAgo ?? 14]),
);

let activityCounter = 0;
function makeActivity(accountId: string, kind: ActivityKind, message: string, extra: Partial<Activity> = {}): Activity {
  activityCounter += 1;
  return { id: `act-${activityCounter}`, accountId, kind, message, timestamp: Date.now(), ...extra };
}

function seedActivities(): Activity[] {
  const now = Date.now();
  const day = 86_400_000;
  const items: Activity[] = [];
  for (const a of territory.accounts) {
    const c = COMMERCIAL[a.id];
    if (!c) continue;
    activityCounter += 1;
    items.push({
      id: `act-seed-${activityCounter}`,
      accountId: a.id,
      kind: "contacted",
      message: c.lastActivity,
      timestamp: now - c.lastActivityDaysAgo * day,
    });
  }
  const extra: [string, ActivityKind, string, number][] = [
    ["jpmc", "meeting", "Meeting booked with Director, Internal Developer Platform", 8],
    ["jpmc", "opportunity", "Engineer's Platform AI-Assisted Delivery qualified", 5],
    ["walmart", "opportunity", "Developer Experience Platform Evaluation formed", 11],
    ["disney", "meeting", "Meeting booked with Director, Web Experiences", 15],
    ["starbucks", "meeting", "Discovery meeting with Director, Mobile Experience", 33],
  ];
  for (const [accountId, kind, message, daysAgo] of extra) {
    activityCounter += 1;
    items.push({ id: `act-seed-${activityCounter}`, accountId, kind, message, timestamp: now - daysAgo * day });
  }
  return items.sort((x, y) => x.timestamp - y.timestamp);
}

const initialActivities = seedActivities();

const INITIAL: Snapshot = {
  prospectsById: initialProspects,
  businessUnitsById: initialBusinessUnits,
  signals: initialSignals,
  activities: initialActivities,
  daysSince: initialDays,
};

let noticeCounter = 0;
let pulseCounter = 0;

const SELECTION_CLEARED = {
  focusBusinessUnitId: null,
  focusTeamId: null,
  selectedProspectId: null,
  selectedOpportunityId: null,
} as const;

export const useTerritoryStore = create<TerritoryState>((set, get) => ({
  accounts: territory.accounts,
  accountsById,
  prospectsById: INITIAL.prospectsById,
  businessUnitsById: INITIAL.businessUnitsById,
  opportunitiesById,
  signals: INITIAL.signals,
  activities: INITIAL.activities,
  daysSince: INITIAL.daysSince,

  mode: "forest",
  activeAccountId: null,
  hoveredAccountId: null,
  panelTab: "overview",
  ...SELECTION_CLEARED,
  filter: "all",
  overviewOpen: false,
  introDone: false,
  demo: { active: false, step: 0 },
  cameraNonce: 0,
  reducedMotion: false,
  isTouch: false,
  isCompact: false,

  pulses: [],
  reactivations: [],
  notices: [],
  undoStack: [],

  enterAccount: (id) =>
    set({
      mode: "account",
      activeAccountId: id,
      hoveredAccountId: null,
      panelTab: "overview",
      overviewOpen: false,
      introDone: true,
      ...SELECTION_CLEARED,
    }),

  returnToForest: () =>
    set({ mode: "forest", activeAccountId: null, panelTab: "overview", ...SELECTION_CLEARED }),

  setHovered: (id) => set({ hoveredAccountId: id }),

  setPanelTab: (tab) =>
    set((s) => ({
      panelTab: tab,
      selectedProspectId: tab === "organization" ? s.selectedProspectId : null,
      selectedOpportunityId: tab === "overview" ? s.selectedOpportunityId : null,
    })),

  focusBusinessUnit: (id) =>
    set({ focusBusinessUnitId: id, focusTeamId: null, selectedProspectId: null, selectedOpportunityId: null, panelTab: "organization" }),

  focusTeam: (id) =>
    set((s) => {
      const team = id
        ? Object.values(s.businessUnitsById)
            .flatMap((bu) => bu.teams)
            .find((t) => t.id === id)
        : null;
      return {
        focusTeamId: id,
        focusBusinessUnitId: team ? team.businessUnitId : s.focusBusinessUnitId,
        selectedProspectId: null,
        selectedOpportunityId: null,
        panelTab: "organization",
      };
    }),

  selectProspect: (id) =>
    set((s) => {
      if (!id) return { selectedProspectId: null };
      const p = s.prospectsById[id];
      return {
        selectedProspectId: id,
        selectedOpportunityId: null,
        focusBusinessUnitId: p ? p.businessUnitId : s.focusBusinessUnitId,
        focusTeamId: p ? p.teamId : s.focusTeamId,
        panelTab: "organization",
      };
    }),

  selectOpportunity: (id) =>
    set((s) => {
      if (!id) return { selectedOpportunityId: null };
      const o = s.opportunitiesById[id];
      return {
        selectedOpportunityId: id,
        selectedProspectId: null,
        focusBusinessUnitId: o ? o.businessUnitId : s.focusBusinessUnitId,
        focusTeamId: null,
        panelTab: "overview",
      };
    }),

  clearSelection: () =>
    set((s) => {
      if (s.mode === "forest") return {};
      if (s.selectedProspectId || s.selectedOpportunityId) return { selectedProspectId: null, selectedOpportunityId: null };
      if (s.focusTeamId) return { focusTeamId: null };
      if (s.focusBusinessUnitId) return { focusBusinessUnitId: null };
      return {};
    }),

  setFilter: (filter) => set((s) => ({ filter: s.filter === filter ? "all" : filter })),
  setOverviewOpen: (open) => set({ overviewOpen: open }),
  setIntroDone: () => set({ introDone: true }),
  resetCamera: () => set((s) => ({ cameraNonce: s.cameraNonce + 1 })),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setIsTouch: (v) => set({ isTouch: v }),
  setIsCompact: (v) => set({ isCompact: v }),

  setProspectStatus: (id, status, opts = {}) => {
    const s = get();
    const prospect = s.prospectsById[id];
    if (!prospect || prospect.relationshipStatus === status) return;

    const before = evaluateVisibleOpportunities(s, prospect.accountId);
    const undoEntry: UndoEntry = {
      label: `Undo ${STATUS_LABEL[status].toLowerCase()}`,
      prospects: s.prospectsById,
      activitiesLength: s.activities.length,
      daysSince: s.daysSince,
    };

    const today = new Date().toISOString().slice(0, 10);
    const updated: Prospect = {
      ...prospect,
      relationshipStatus: status,
      lastTouch: status === "unworked" ? prospect.lastTouch : today,
      nextAction: nextActionFor(status, prospect),
      meetingDate: status === "meeting" ? demoMeetingDate() : undefined,
      notes: status === "disqualified" ? [...prospect.notes, "Disqualified in demo session."] : prospect.notes,
    };
    const prospectsNext = { ...s.prospectsById, [id]: updated };

    const kind: ActivityKind =
      status === "contacted" || status === "engaged" || status === "meeting" || status === "disqualified"
        ? status
        : "researched";
    const activities = [
      ...s.activities,
      makeActivity(prospect.accountId, kind, `${activityVerb(status)} ${prospect.name}, ${prospect.title}`, {
        prospectId: id,
        businessUnitId: prospect.businessUnitId,
      }),
    ];

    const notices: Notice[] = [];
    const pulses: Pulse[] = [];
    const after = evaluateVisibleOpportunities({ ...s, prospectsById: prospectsNext }, prospect.accountId);
    for (const state of after) {
      const prev = before.find((b) => b.opportunity.id === state.opportunity.id);
      const value = COMMERCIAL[prospect.accountId]?.dealValues[state.opportunity.id] ?? 0;
      if (!prev?.maturity && state.maturity) {
        activities.push(
          makeActivity(prospect.accountId, "opportunity", `Opportunity formed: ${state.opportunity.name}`, {
            opportunityId: state.opportunity.id,
            businessUnitId: state.opportunity.businessUnitId,
          }),
        );
        notices.push({
          id: `notice-${++noticeCounter}`,
          kind: "growth",
          title: "New fruit · opportunity formed",
          body: `${state.opportunity.name} · ${formatMoney(value)} entered ${STAGE_BY_MATURITY[state.maturity]}`,
        });
        pulses.push({ id: ++pulseCounter, accountId: prospect.accountId, kind: "fruit", startedAt: performance.now() });
      } else if (prev?.maturity && state.maturity && prev.maturity !== state.maturity) {
        activities.push(
          makeActivity(prospect.accountId, "opportunity", `${state.opportunity.name} advanced to ${STAGE_BY_MATURITY[state.maturity]}`, {
            opportunityId: state.opportunity.id,
            businessUnitId: state.opportunity.businessUnitId,
          }),
        );
        notices.push({
          id: `notice-${++noticeCounter}`,
          kind: "growth",
          title: "Fruit ripening · deal advanced",
          body: `${state.opportunity.name} is now ${STAGE_BY_MATURITY[state.maturity]}`,
        });
        pulses.push({ id: ++pulseCounter, accountId: prospect.accountId, kind: "fruit", startedAt: performance.now() });
      }
    }

    const engagedMore = status === "engaged" || status === "meeting" || status === "contacted";
    if (engagedMore) pulses.push({ id: ++pulseCounter, accountId: prospect.accountId, kind: "growth", startedAt: performance.now() });

    set({
      prospectsById: prospectsNext,
      activities,
      daysSince: engagedMore ? { ...s.daysSince, [prospect.accountId]: 0 } : s.daysSince,
      undoStack: [...s.undoStack.slice(-19), undoEntry],
      notices: opts.silent ? s.notices : [...s.notices, ...notices],
      pulses: [...s.pulses.slice(-12), ...pulses],
    });
  },

  undo: () => {
    const s = get();
    const entry = s.undoStack[s.undoStack.length - 1];
    if (!entry) return;
    set({
      prospectsById: entry.prospects,
      activities: s.activities.slice(0, entry.activitiesLength),
      daysSince: entry.daysSince,
      undoStack: s.undoStack.slice(0, -1),
    });
  },

  runActivity: (accountId, kind) => {
    const s = get();
    const account = s.accountsById[accountId];
    if (!account) return;
    const prospects = currentProspects(s, accountId).filter((p) => !p.latent);
    const opps = evaluateVisibleOpportunities(s, accountId);
    const oppStakeholders = new Set(account.opportunities.flatMap((o) => o.stakeholderIds));
    const activeBu = (p: Prospect) => s.businessUnitsById[p.businessUnitId]?.status !== "dormant";
    const rank = (p: Prospect) =>
      p.influence * 10 +
      (oppStakeholders.has(p.id) ? 6 : 0) +
      (s.businessUnitsById[p.businessUnitId]?.priority === "high" ? 3 : 0) +
      // Hand-authored stakeholders make better demo moments than generated ones.
      (/\.[pl]\d+$/.test(p.id) ? 0 : 4);

    if (kind === "follow-up") {
      const target = prospects
        .filter((p) => p.relationshipStatus === "engaged" || p.relationshipStatus === "meeting" || p.relationshipStatus === "contacted")
        .sort((a, b) => rank(b) - rank(a))[0];
      set({
        daysSince: { ...s.daysSince, [accountId]: 0 },
        activities: [
          ...s.activities,
          makeActivity(accountId, "contacted", target ? `Follow-up sent to ${target.name}, ${target.title}` : "Account research refreshed"),
        ],
        pulses: [...s.pulses.slice(-12), { id: ++pulseCounter, accountId, kind: "growth", startedAt: performance.now() }],
      });
      return;
    }

    if (kind === "exec-meeting") {
      const target = prospects
        .filter((p) => activeBu(p) && p.influence >= 4 && p.relationshipStatus !== "meeting" && p.relationshipStatus !== "disqualified")
        .sort((a, b) => rank(b) - rank(a))[0];
      if (target) get().setProspectStatus(target.id, "meeting");
      else get().runActivity(accountId, "follow-up");
      return;
    }

    if (kind === "discovery-call") {
      const target = prospects
        .filter((p) => activeBu(p) && (p.relationshipStatus === "unworked" || p.relationshipStatus === "researched" || p.relationshipStatus === "contacted"))
        .sort((a, b) => rank(b) - rank(a))[0];
      if (target) get().setProspectStatus(target.id, "engaged");
      else get().runActivity(accountId, "follow-up");
      return;
    }

    // Multithread: widen the most advanced opportunity (or the strongest organisation).
    const open = opps.filter((o) => o.maturity).sort((a, b) => b.strength - a.strength)[0];
    const pool = open
      ? open.opportunity.stakeholderIds.map((id) => s.prospectsById[id]).filter(Boolean)
      : prospects.filter(activeBu);
    const targets = pool
      .filter((p) => p.relationshipStatus === "unworked" || p.relationshipStatus === "researched" || p.relationshipStatus === "contacted")
      .sort((a, b) => rank(b) - rank(a))
      .slice(0, 2);
    const extra =
      targets.length < 2
        ? prospects
            .filter((p) => activeBu(p) && !targets.includes(p) && (p.relationshipStatus === "unworked" || p.relationshipStatus === "researched"))
            .sort((a, b) => rank(b) - rank(a))
            .slice(0, 2 - targets.length)
        : [];
    const all = [...targets, ...extra];
    if (all.length === 0) {
      get().runActivity(accountId, "follow-up");
      return;
    }
    for (const p of all) get().setProspectStatus(p.id, "engaged");
  },

  simulateNeglect: (accountId, days) => {
    const s = get();
    const account = s.accountsById[accountId];
    if (!account) return;
    set({
      daysSince: { ...s.daysSince, [accountId]: (s.daysSince[accountId] ?? 0) + days },
      pulses: [...s.pulses.slice(-12), { id: ++pulseCounter, accountId, kind: "wither", startedAt: performance.now() }],
      notices: [
        ...s.notices,
        {
          id: `notice-${++noticeCounter}`,
          kind: "warning",
          title: `${days} days pass without activity`,
          body: `${account.name}: relationships cool and the canopy thins.`,
        },
      ],
    });
  },

  simulateTrigger: (businessUnitId) => {
    const s = get();
    const bu = s.businessUnitsById[businessUnitId];
    if (!bu || bu.status !== "dormant" || !bu.reactivation) return;

    const signal: Signal = {
      id: `${bu.id}.sig.reactivation-${Date.now()}`,
      accountId: bu.accountId,
      businessUnitId: bu.id,
      date: new Date().toISOString().slice(0, 10),
      ...bu.reactivation.signal,
    };
    const updatedBu: BusinessUnit = {
      ...bu,
      status: "reactivating",
      season: "spring",
      priority: "high",
      thesis: bu.reactivation.recommendation,
      teams: bu.teams.map((t) => ({ ...t, season: "spring", priority: "high" })),
    };
    const prospectsNext = { ...s.prospectsById };
    for (const team of bu.teams) {
      for (const p of team.prospects) {
        const current = prospectsNext[p.id];
        if (current?.latent) prospectsNext[p.id] = { ...current, latent: false };
      }
    }
    set({
      businessUnitsById: { ...s.businessUnitsById, [bu.id]: updatedBu },
      prospectsById: prospectsNext,
      signals: [...s.signals, signal],
      reactivations: [...s.reactivations, { businessUnitId: bu.id, startedAt: performance.now() }],
      pulses: [...s.pulses.slice(-12), { id: ++pulseCounter, accountId: bu.accountId, kind: "signal", startedAt: performance.now() }],
      notices: [
        ...s.notices,
        { id: `notice-${++noticeCounter}`, kind: "signal", title: "Signal detected · branch in bud", body: signal.title },
      ],
      activities: [
        ...s.activities,
        makeActivity(bu.accountId, "reactivation", `${bu.name} reactivated: ${signal.title}`, { businessUnitId: bu.id }),
      ],
      undoStack: [],
    });
  },

  completeReactivation: (businessUnitId) =>
    set((s) => ({ reactivations: s.reactivations.filter((r) => r.businessUnitId !== businessUnitId) })),

  dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
  notify: (n) => set((s) => ({ notices: [...s.notices, { ...n, id: `notice-${++noticeCounter}` }] })),

  resetDemo: () =>
    set((s) => ({
      ...INITIAL,
      mode: "forest",
      activeAccountId: null,
      hoveredAccountId: null,
      panelTab: "overview",
      ...SELECTION_CLEARED,
      filter: "all",
      overviewOpen: false,
      reactivations: [],
      notices: [],
      undoStack: [],
      pulses: [],
      demo: { active: false, step: 0 },
      cameraNonce: s.cameraNonce + 1,
    })),

  startDemo: () => {
    get().resetDemo();
    set({ demo: { active: true, step: 0 }, introDone: true });
  },
  setDemoStep: (step) => set({ demo: { active: true, step } }),
  exitDemo: () => set({ demo: { active: false, step: 0 } }),
}));

function demoMeetingDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function activityVerb(status: RelationshipStatus): string {
  switch (status) {
    case "researched":
      return "Researched";
    case "contacted":
      return "Reached out to";
    case "engaged":
      return "Discovery call with";
    case "meeting":
      return "Meeting booked with";
    case "disqualified":
      return "Disqualified";
    default:
      return "Reset";
  }
}

function nextActionFor(status: RelationshipStatus, p: Prospect): string {
  switch (status) {
    case "researched":
      return "Send a specific, relevant first note.";
    case "contacted":
      return "Follow up with a concrete question within a week.";
    case "engaged":
      return "Propose a short working session; ask for a peer introduction.";
    case "meeting":
      return "Prepare discovery agenda and confirm attendees.";
    case "disqualified":
      return "Revisit only on a new trigger.";
    default:
      return p.nextAction ?? "Research and identify a warm path in.";
  }
}

/** Evaluate all opportunities for an account against the given state. */
export function evaluateVisibleOpportunities(
  s: Pick<TerritoryState, "accountsById" | "prospectsById" | "opportunitiesById">,
  accountId: string,
): OpportunityState[] {
  const account = s.accountsById[accountId];
  if (!account) return [];
  return account.opportunities.map((o) => evaluateOpportunity(s.opportunitiesById[o.id] ?? o, s.prospectsById));
}

/** Current business units (with live status) for an account. */
export function currentBusinessUnits(
  s: Pick<TerritoryState, "accountsById" | "businessUnitsById">,
  accountId: string,
): BusinessUnit[] {
  const account = s.accountsById[accountId];
  if (!account) return [];
  return account.businessUnits.map((bu) => s.businessUnitsById[bu.id] ?? bu);
}

/** Current prospects for an account (live status). */
export function currentProspects(s: Pick<TerritoryState, "accountsById" | "prospectsById">, accountId: string): Prospect[] {
  const account = s.accountsById[accountId];
  if (!account) return [];
  return account.businessUnits.flatMap((bu) => bu.teams.flatMap((t) => t.prospects.map((p) => s.prospectsById[p.id] ?? p)));
}

// Development-only handle for runtime inspection.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __territory?: unknown }).__territory = useTerritoryStore;
}
