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
import { territory } from "@/data";

export type Mode = "forest" | "account";
export type View = "tree" | "roots" | "penetration" | "analyze" | "score" | "activity";

export interface FallingLeaf {
  prospectId: string;
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
  kind: "signal" | "info";
}

interface UndoEntry {
  label: string;
  prospects: Record<string, Prospect>;
  activitiesLength: number;
}

interface TerritoryState {
  accounts: Account[];
  accountsById: Record<string, Account>;
  prospectsById: Record<string, Prospect>;
  businessUnitsById: Record<string, BusinessUnit>;
  opportunitiesById: Record<string, Opportunity>;
  signals: Signal[];
  activities: Activity[];

  mode: Mode;
  view: View;
  selectedAccountId: string | null;
  activeAccountId: string | null;
  focusBusinessUnitId: string | null;
  focusTeamId: string | null;
  selectedProspectId: string | null;
  selectedOpportunityId: string | null;
  selectedRootId: string | null;
  selectedMarketId: string | null;
  navigatorOpen: boolean;
  cameraResetNonce: number;
  reducedMotion: boolean;
  isTouch: boolean;
  /** Viewport narrower than the md breakpoint — panels become bottom sheets. */
  isCompact: boolean;

  fallingLeaves: FallingLeaf[];
  reactivations: Reactivation[];
  notices: Notice[];
  undoStack: UndoEntry[];

  // navigation
  selectAccount: (id: string | null) => void;
  enterAccount: (id: string) => void;
  returnToForest: () => void;
  focusBusinessUnit: (id: string | null) => void;
  focusTeam: (id: string | null) => void;
  selectProspect: (id: string | null) => void;
  selectOpportunity: (id: string | null) => void;
  selectRoot: (id: string | null) => void;
  selectMarket: (id: string | null) => void;
  setView: (view: View) => void;
  toggleView: (view: View) => void;
  setNavigatorOpen: (open: boolean) => void;
  /** Return the contextual panel to the account-level organization overview. */
  openOrganization: () => void;
  resetView: () => void;
  clearSelection: () => void;
  setReducedMotion: (v: boolean) => void;
  setIsTouch: (v: boolean) => void;
  setIsCompact: (v: boolean) => void;

  // relationship lifecycle
  setProspectStatus: (id: string, status: RelationshipStatus) => void;
  bookMeeting: (id: string) => void;
  undo: () => void;
  completeFall: (prospectId: string) => void;

  // living territory
  simulateTrigger: (businessUnitId: string) => void;
  completeReactivation: (businessUnitId: string) => void;
  dismissNotice: (id: string) => void;
}

function index<T extends { id: string }>(items: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) out[item.id] = item;
  return out;
}

const accountsById = index(territory.accounts);
const prospectsById = index(
  territory.accounts.flatMap((a) =>
    a.businessUnits.flatMap((bu) => bu.teams.flatMap((t) => t.prospects)),
  ),
);
const businessUnitsById = index(territory.accounts.flatMap((a) => a.businessUnits));
const opportunitiesById = index(territory.accounts.flatMap((a) => a.opportunities));

let activityCounter = 0;
function makeActivity(
  accountId: string,
  kind: ActivityKind,
  message: string,
  extra: Partial<Activity> = {},
): Activity {
  activityCounter += 1;
  return {
    id: `act-${activityCounter}`,
    accountId,
    kind,
    message,
    timestamp: Date.now(),
    ...extra,
  };
}

function seedActivities(): Activity[] {
  const items: Activity[] = [];
  const now = Date.now();
  const day = 86_400_000;
  const seed: [string, ActivityKind, string, number][] = [
    ["jpmc", "engaged", "Director, AI Platform engaged", 6],
    ["jpmc", "meeting", "Meeting booked with Director, Trading Platforms", 8],
    ["goldman", "opportunity", "Firmwide AI Developer Tooling Standard reached Growing", 4],
    ["meta", "meeting", "Meeting booked with Director, Developer Infrastructure", 3],
    ["blackrock", "reactivation", "Wealth Technology reactivated by AI initiative signal", 11],
    ["walmart", "opportunity", "Platform Engineering Pilot formed", 5],
    ["uber", "meeting", "Meeting booked with Senior Engineering Manager, Developer Experience", 4],
  ];
  for (const [accountId, kind, message, daysAgo] of seed) {
    activityCounter += 1;
    items.push({
      id: `act-seed-${activityCounter}`,
      accountId,
      kind,
      message,
      timestamp: now - daysAgo * day,
    });
  }
  return items;
}

let noticeCounter = 0;

export const useTerritoryStore = create<TerritoryState>((set, get) => ({
  accounts: territory.accounts,
  accountsById,
  prospectsById,
  businessUnitsById,
  opportunitiesById,
  signals: territory.accounts.flatMap((a) => a.signals),
  activities: seedActivities(),

  mode: "forest",
  view: "tree",
  selectedAccountId: null,
  activeAccountId: null,
  focusBusinessUnitId: null,
  focusTeamId: null,
  selectedProspectId: null,
  selectedOpportunityId: null,
  selectedRootId: null,
  selectedMarketId: null,
  navigatorOpen: false,
  cameraResetNonce: 0,
  reducedMotion: false,
  isTouch: false,
  isCompact: false,

  fallingLeaves: [],
  reactivations: [],
  notices: [],
  undoStack: [],

  selectAccount: (id) => set({ selectedAccountId: id, selectedMarketId: null }),

  enterAccount: (id) =>
    set({
      mode: "account",
      view: "tree",
      activeAccountId: id,
      selectedAccountId: id,
      focusBusinessUnitId: null,
      focusTeamId: null,
      selectedProspectId: null,
      selectedOpportunityId: null,
      selectedRootId: null,
      selectedMarketId: null,
      navigatorOpen: false,
    }),

  returnToForest: () =>
    set((s) => ({
      mode: "forest",
      view: "tree",
      activeAccountId: null,
      selectedAccountId: s.activeAccountId,
      focusBusinessUnitId: null,
      focusTeamId: null,
      selectedProspectId: null,
      selectedOpportunityId: null,
      selectedRootId: null,
      navigatorOpen: false,
    })),

  focusBusinessUnit: (id) =>
    set((s) => ({
      focusBusinessUnitId: id,
      focusTeamId: null,
      selectedProspectId: null,
      selectedOpportunityId: null,
      selectedRootId: null,
      view: s.view === "roots" ? "tree" : s.view,
    })),

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
        selectedRootId: null,
        view: s.view === "roots" ? "tree" : s.view,
      };
    }),

  selectProspect: (id) =>
    set((s) => {
      if (!id) return { selectedProspectId: null };
      const p = s.prospectsById[id];
      return {
        selectedProspectId: id,
        selectedOpportunityId: null,
        selectedRootId: null,
        focusBusinessUnitId: p ? p.businessUnitId : s.focusBusinessUnitId,
        focusTeamId: p ? p.teamId : s.focusTeamId,
        view: s.view === "roots" ? "tree" : s.view,
      };
    }),

  selectOpportunity: (id) =>
    set((s) => {
      if (!id) return { selectedOpportunityId: null };
      const o = s.opportunitiesById[id];
      return {
        selectedOpportunityId: id,
        selectedProspectId: null,
        selectedRootId: null,
        focusBusinessUnitId: o ? o.businessUnitId : s.focusBusinessUnitId,
        focusTeamId: null,
        view: s.view === "roots" ? "tree" : s.view,
      };
    }),

  selectRoot: (id) => set({ selectedRootId: id, selectedProspectId: null, selectedOpportunityId: null }),

  selectMarket: (id) => set({ selectedMarketId: id, selectedAccountId: id ? null : get().selectedAccountId }),

  setView: (view) =>
    set((s) => ({
      view,
      selectedRootId: view === "roots" ? s.selectedRootId : null,
      selectedProspectId: view === "tree" ? s.selectedProspectId : null,
      selectedOpportunityId: view === "tree" ? s.selectedOpportunityId : null,
    })),

  toggleView: (view) => {
    const current = get().view;
    get().setView(current === view ? "tree" : view);
  },

  setNavigatorOpen: (open) => set({ navigatorOpen: open }),

  openOrganization: () =>
    set({
      navigatorOpen: true,
      view: "tree",
      focusBusinessUnitId: null,
      focusTeamId: null,
      selectedProspectId: null,
      selectedOpportunityId: null,
      selectedRootId: null,
    }),

  resetView: () =>
    set((s) => ({
      cameraResetNonce: s.cameraResetNonce + 1,
      focusBusinessUnitId: null,
      focusTeamId: null,
      selectedProspectId: null,
      selectedOpportunityId: null,
      selectedRootId: null,
      view: "tree",
    })),

  clearSelection: () =>
    set((s) => {
      if (s.mode === "forest") return { selectedAccountId: null, selectedMarketId: null };
      if (s.selectedProspectId || s.selectedOpportunityId || s.selectedRootId) {
        return { selectedProspectId: null, selectedOpportunityId: null, selectedRootId: null };
      }
      if (s.focusTeamId) return { focusTeamId: null };
      if (s.focusBusinessUnitId) return { focusBusinessUnitId: null };
      return {};
    }),

  setReducedMotion: (v) => set({ reducedMotion: v }),
  setIsTouch: (v) => set({ isTouch: v }),
  setIsCompact: (v) => set({ isCompact: v }),

  setProspectStatus: (id, status) => {
    const s = get();
    const prospect = s.prospectsById[id];
    if (!prospect || prospect.relationshipStatus === status) return;

    const before = evaluateVisibleOpportunities(s, prospect.accountId);
    const undoEntry: UndoEntry = {
      label: `Undo ${STATUS_LABEL[status].toLowerCase()}`,
      prospects: s.prospectsById,
      activitiesLength: s.activities.length,
    };

    const today = new Date().toISOString().slice(0, 10);
    const updated: Prospect = {
      ...prospect,
      relationshipStatus: status,
      lastTouch: status === "unworked" ? prospect.lastTouch : today,
      nextAction: nextActionFor(status, prospect),
      meetingDate: status === "meeting" ? demoMeetingDate() : undefined,
      notes:
        status === "disqualified"
          ? [...prospect.notes, "Disqualified in demo session."]
          : prospect.notes,
    };
    const prospectsNext = { ...s.prospectsById, [id]: updated };

    const kind: ActivityKind =
      status === "researched"
        ? "researched"
        : status === "contacted"
          ? "contacted"
          : status === "engaged"
            ? "engaged"
            : status === "meeting"
              ? "meeting"
              : status === "disqualified"
                ? "disqualified"
                : "researched";

    const activities = [
      ...s.activities,
      makeActivity(prospect.accountId, kind, `${activityVerb(status)} ${prospect.title}`, {
        prospectId: id,
        businessUnitId: prospect.businessUnitId,
      }),
    ];

    // Opportunity consequences.
    const after = evaluateVisibleOpportunities({ ...s, prospectsById: prospectsNext }, prospect.accountId);
    for (const state of after) {
      const prev = before.find((b) => b.opportunity.id === state.opportunity.id);
      if (!prev?.maturity && state.maturity) {
        activities.push(
          makeActivity(prospect.accountId, "opportunity", `Opportunity formed: ${state.opportunity.name}`, {
            opportunityId: state.opportunity.id,
            businessUnitId: state.opportunity.businessUnitId,
          }),
        );
      } else if (prev?.maturity && state.maturity && prev.maturity !== state.maturity) {
        activities.push(
          makeActivity(
            prospect.accountId,
            "opportunity",
            `${state.opportunity.name} is now ${state.maturity}`,
            { opportunityId: state.opportunity.id, businessUnitId: state.opportunity.businessUnitId },
          ),
        );
      }
    }

    set({
      prospectsById: prospectsNext,
      activities,
      undoStack: [...s.undoStack.slice(-19), undoEntry],
      fallingLeaves:
        status === "meeting" && !s.reducedMotion
          ? [...s.fallingLeaves, { prospectId: id, startedAt: performance.now() }]
          : s.fallingLeaves.filter((f) => f.prospectId !== id),
    });
  },

  bookMeeting: (id) => get().setProspectStatus(id, "meeting"),

  undo: () => {
    const s = get();
    const entry = s.undoStack[s.undoStack.length - 1];
    if (!entry) return;
    set({
      prospectsById: entry.prospects,
      activities: s.activities.slice(0, entry.activitiesLength),
      undoStack: s.undoStack.slice(0, -1),
      fallingLeaves: [],
    });
  },

  completeFall: (prospectId) =>
    set((s) => ({ fallingLeaves: s.fallingLeaves.filter((f) => f.prospectId !== prospectId) })),

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

    // Surface latent prospects as new leaves.
    const prospectsNext = { ...s.prospectsById };
    for (const team of bu.teams) {
      for (const p of team.prospects) {
        const current = prospectsNext[p.id];
        if (current?.latent) {
          prospectsNext[p.id] = { ...current, latent: false };
        }
      }
    }

    noticeCounter += 1;
    set({
      businessUnitsById: { ...s.businessUnitsById, [bu.id]: updatedBu },
      prospectsById: prospectsNext,
      signals: [...s.signals, signal],
      reactivations: [...s.reactivations, { businessUnitId: bu.id, startedAt: performance.now() }],
      notices: [
        ...s.notices,
        { id: `notice-${noticeCounter}`, kind: "signal", title: "Signal detected", body: signal.title },
      ],
      activities: [
        ...s.activities,
        makeActivity(bu.accountId, "reactivation", `${bu.name} reactivated: ${signal.title}`, {
          businessUnitId: bu.id,
        }),
        makeActivity(bu.accountId, "score", `${bu.name} priority raised to high`, {
          businessUnitId: bu.id,
        }),
      ],
      undoStack: [],
    });
  },

  completeReactivation: (businessUnitId) =>
    set((s) => ({
      reactivations: s.reactivations.filter((r) => r.businessUnitId !== businessUnitId),
    })),

  dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
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
      return "Contacted";
    case "engaged":
      return "Engaged";
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
  return account.opportunities.map((o) =>
    evaluateOpportunity(s.opportunitiesById[o.id] ?? o, s.prospectsById),
  );
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

// Development-only handle for runtime inspection.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __territory?: unknown }).__territory = useTerritoryStore;
}

/** Current prospects for an account (live status). */
export function currentProspects(
  s: Pick<TerritoryState, "accountsById" | "prospectsById">,
  accountId: string,
): Prospect[] {
  const account = s.accountsById[accountId];
  if (!account) return [];
  return account.businessUnits.flatMap((bu) =>
    bu.teams.flatMap((t) => t.prospects.map((p) => s.prospectsById[p.id] ?? p)),
  );
}
