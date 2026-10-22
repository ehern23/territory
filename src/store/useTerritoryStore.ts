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
import { STAGE_BY_MATURITY, formatMoney, type AccountCommercial } from "@/domain/commercial";
import type { AccountSeed, SellerProfile } from "@/domain/profile";
import { ARCHETYPE_LABEL, DEFAULT_TERRITORY, resolveTerritory, type ActiveTerritory } from "@/data/profiles";
import { saveSeller } from "./persistence";

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

export type ResearchStatus = "idle" | "researching" | "done" | "unavailable" | "failed";

interface TerritoryState {
  /** Who is selling: drives which accounts grow and how they are described. */
  profile: SellerProfile;
  /** Seeds behind a generated territory; persisted for researched profiles. */
  profileSeeds: AccountSeed[] | null;
  /** Commercial overlay for the active territory. */
  commercial: Record<string, AccountCommercial>;
  /** The active territory's starting state; reset returns here. */
  baseline: Snapshot;
  /** Onboarding card ("Where do you sell?") visible. */
  onboardingOpen: boolean;
  /** Optional Claude research of an unknown seller's ICP. */
  research: { status: ResearchStatus; company: string | null };

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
  /** Minimap jump request: glide to this point of the map. */
  flyTarget: { x: number; z: number; nonce: number } | null;
  reducedMotion: boolean;
  isTouch: boolean;
  isCompact: boolean;
  /** Lowered automatically when the device can't hold its frame rate. */
  lowPower: boolean;

  pulses: Pulse[];
  reactivations: Reactivation[];
  notices: Notice[];
  undoStack: UndoEntry[];

  // seller profile
  loadProfile: (profile: SellerProfile, seeds?: AccountSeed[] | null, opts?: { persist?: boolean; announce?: boolean }) => void;
  setOnboardingOpen: (open: boolean) => void;
  setResearch: (research: { status: ResearchStatus; company: string | null }) => void;

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
  flyTo: (x: number, z: number) => void;
  setReducedMotion: (v: boolean) => void;
  setIsTouch: (v: boolean) => void;
  setIsCompact: (v: boolean) => void;
  setLowPower: (v: boolean) => void;

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

let activityCounter = 0;
function makeActivity(accountId: string, kind: ActivityKind, message: string, extra: Partial<Activity> = {}): Activity {
  activityCounter += 1;
  return { id: `act-${activityCounter}`, accountId, kind, message, timestamp: Date.now(), ...extra };
}

const DAY = 86_400_000;
const SYNTHETIC_ID = /\.[pl]\d+$/;

/**
 * Starting history, derived from the territory itself: the last recorded touch
 * per account, then (older) each booked meeting with a named stakeholder and
 * each opportunity that already has a stage.
 */
function seedActivities(accounts: Account[], commercial: Record<string, AccountCommercial>): Activity[] {
  const now = Date.now();
  const items: Activity[] = [];
  const push = (accountId: string, kind: ActivityKind, message: string, daysAgo: number, extra: Partial<Activity> = {}) => {
    activityCounter += 1;
    items.push({ id: `act-seed-${activityCounter}`, accountId, kind, message, timestamp: now - daysAgo * DAY, ...extra });
  };
  for (const a of accounts) {
    const c = commercial[a.id];
    if (!c) continue;
    push(a.id, "contacted", c.lastActivity, c.lastActivityDaysAgo);
    const meetings = a.businessUnits
      .flatMap((bu) => bu.teams.flatMap((t) => t.prospects))
      .filter((p) => !p.latent && p.relationshipStatus === "meeting" && !SYNTHETIC_ID.test(p.id));
    meetings.forEach((p, i) =>
      push(a.id, "meeting", `Meeting booked with ${p.title}`, c.lastActivityDaysAgo + 6 + i * 3, { prospectId: p.id, businessUnitId: p.businessUnitId }),
    );
    a.opportunities
      .filter((o) => !o.latent && o.baselineMaturity)
      .forEach((o, i) =>
        push(
          a.id,
          "opportunity",
          `${o.name} ${o.baselineMaturity === "bud" ? "formed" : "qualified"}`,
          c.lastActivityDaysAgo + 3 + i * 4,
          { opportunityId: o.id, businessUnitId: o.businessUnitId },
        ),
      );
  }
  return items.sort((x, y) => x.timestamp - y.timestamp);
}

/** Everything derived from a territory: lookups and the starting snapshot. */
function derive(active: ActiveTerritory) {
  const { territory, commercial } = active;
  const baseline: Snapshot = {
    prospectsById: index(territory.accounts.flatMap((a) => a.businessUnits.flatMap((bu) => bu.teams.flatMap((t) => t.prospects)))),
    businessUnitsById: index(territory.accounts.flatMap((a) => a.businessUnits)),
    signals: territory.accounts.flatMap((a) => a.signals),
    activities: seedActivities(territory.accounts, commercial),
    daysSince: Object.fromEntries(territory.accounts.map((a) => [a.id, commercial[a.id]?.lastActivityDaysAgo ?? 14])),
  };
  return {
    profile: active.profile,
    profileSeeds: active.seeds ?? null,
    commercial,
    baseline,
    accounts: territory.accounts,
    accountsById: index(territory.accounts),
    opportunitiesById: index(territory.accounts.flatMap((a) => a.opportunities)),
    ...baseline,
  };
}

const INITIAL = derive(DEFAULT_TERRITORY);

let noticeCounter = 0;
let pulseCounter = 0;

const SELECTION_CLEARED = {
  focusBusinessUnitId: null,
  focusTeamId: null,
  selectedProspectId: null,
  selectedOpportunityId: null,
} as const;

/** UI state that returns to its starting point whenever the territory changes. */
const FRESH_VIEW = {
  mode: "forest" as Mode,
  activeAccountId: null,
  hoveredAccountId: null,
  panelTab: "overview" as PanelTab,
  ...SELECTION_CLEARED,
  filter: "all" as TerritoryFilter,
  overviewOpen: false,
  reactivations: [] as Reactivation[],
  notices: [] as Notice[],
  undoStack: [] as UndoEntry[],
  pulses: [] as Pulse[],
};

export const useTerritoryStore = create<TerritoryState>((set, get) => ({
  ...INITIAL,
  onboardingOpen: false,
  research: { status: "idle", company: null },

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
  flyTarget: null,
  reducedMotion: false,
  isTouch: false,
  isCompact: false,
  lowPower: false,

  pulses: [],
  reactivations: [],
  notices: [],
  undoStack: [],

  loadProfile: (profile, seeds, opts = {}) => {
    const next = derive(resolveTerritory(profile, seeds ?? undefined));
    set((s) => ({
      ...next,
      ...FRESH_VIEW,
      demo: { active: false, step: 0 },
      cameraNonce: s.cameraNonce + 1,
      notices:
        opts.announce === false
          ? []
          : [
              {
                id: `notice-${++noticeCounter}`,
                kind: "growth",
                title: `Selling for ${profile.company}`,
                body:
                  profile.source === "researched"
                    ? `Researched ICP · ${next.accounts.length} target accounts regrown · illustrative data`
                    : profile.source === "archetype"
                      ? `${next.accounts.length} accounts from a ${ARCHETYPE_LABEL[profile.archetype].toLowerCase()} ICP · illustrative data`
                      : `${next.accounts.length} ICP accounts regrown · illustrative ${profile.territoryLabel} territory`,
              },
            ],
    }));
    if (opts.persist !== false) saveSeller(next.profile, profile.source === "researched" ? next.profileSeeds : null);
  },

  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
  setResearch: (research) => set({ research }),

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
  flyTo: (x, z) =>
    set((s) => ({
      mode: "forest",
      activeAccountId: null,
      ...SELECTION_CLEARED,
      introDone: true,
      flyTarget: { x, z, nonce: (s.flyTarget?.nonce ?? 0) + 1 },
    })),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setIsTouch: (v) => set({ isTouch: v }),
  setIsCompact: (v) => set({ isCompact: v }),
  setLowPower: (v) => set({ lowPower: v }),

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
      const value = s.commercial[prospect.accountId]?.dealValues[state.opportunity.id] ?? 0;
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
      ...s.baseline,
      ...FRESH_VIEW,
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
