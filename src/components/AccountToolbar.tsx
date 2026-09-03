"use client";

import { useTerritoryStore, type View } from "@/store/useTerritoryStore";
import { Spark } from "./ui";

/**
 * The only persistent chrome in account mode: a quiet pill of primary controls.
 * Everything here is real; nothing decorative.
 */
export function AccountToolbar() {
  const view = useTerritoryStore((s) => s.view);
  const toggleView = useTerritoryStore((s) => s.toggleView);
  const resetView = useTerritoryStore((s) => s.resetView);
  const returnToForest = useTerritoryStore((s) => s.returnToForest);
  const navigatorOpen = useTerritoryStore((s) => s.navigatorOpen);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const atOverview = useTerritoryStore(
    (s) => s.view === "tree" && !s.selectedProspectId && !s.selectedOpportunityId && !s.focusBusinessUnitId,
  );
  const openOrganization = useTerritoryStore((s) => s.openOrganization);
  const setNavigatorOpen = useTerritoryStore((s) => s.setNavigatorOpen);
  const orgActive = atOverview && (!isCompact || navigatorOpen);

  const item = (v: View, label: React.ReactNode, aria?: string) => (
    <button
      type="button"
      className={`btn btn-ghost btn-pill ${view === v ? "is-active" : ""}`}
      onClick={() => toggleView(v)}
      aria-pressed={view === v}
      aria-label={aria}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(14px,env(safe-area-inset-bottom))] pointer-events-none md:pr-[400px]">
      <div
        role="toolbar"
        aria-label="Account controls"
        className="surface-quiet toolbar-compact scroll-x flex items-center gap-0.5 p-1 pointer-events-auto max-w-full"
      >
        <button type="button" className="btn btn-ghost btn-pill" onClick={returnToForest}>
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">Forest</span>
        </button>
        <span className="w-px h-5 bg-line mx-1" aria-hidden />
        <button
          type="button"
          className={`btn btn-ghost btn-pill ${orgActive ? "is-active" : ""}`}
          onClick={() => {
            if (orgActive && isCompact) setNavigatorOpen(false);
            else openOrganization();
          }}
          aria-pressed={orgActive}
          aria-label="Organization overview"
        >
          Org
        </button>
        {item("roots", "Roots")}
        {item("penetration", "Penetration")}
        {item("score", "Score")}
        {item(
          "analyze",
          <>
            <Spark />
            <span>Analyze</span>
          </>,
          "Analyze account",
        )}
        {item("activity", "Activity")}
        <span className="w-px h-5 bg-line mx-1" aria-hidden />
        <button type="button" className="btn btn-ghost btn-pill" onClick={resetView} aria-label="Reset view">
          <span className="hidden sm:inline">Reset</span>
          <span className="sm:hidden" aria-hidden>↺</span>
        </button>
      </div>
    </div>
  );
}
