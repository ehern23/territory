"use client";

import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useAccountView, useTerritorySummary } from "@/store/selectors";
import { Eyebrow } from "./ui";

export function Header() {
  const mode = useTerritoryStore((s) => s.mode);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const focusTeamId = useTerritoryStore((s) => s.focusTeamId);
  const focusBusinessUnit = useTerritoryStore((s) => s.focusBusinessUnit);
  const focusTeam = useTerritoryStore((s) => s.focusTeam);
  const returnToForest = useTerritoryStore((s) => s.returnToForest);
  const summary = useTerritorySummary();
  const view = useAccountView(mode === "account" ? activeAccountId : null);

  const bu = view?.units.find((u) => u.unit.id === focusBusinessUnitId);
  const team = bu?.teams.find((t) => t.team.id === focusTeamId);

  return (
    <header className="absolute left-4 right-4 top-4 md:left-7 md:right-7 md:top-6 z-30 flex items-start justify-between pointer-events-none">
      <div className="flex flex-col gap-5 pointer-events-auto">
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            className="wordmark text-left"
            onClick={mode === "account" ? returnToForest : undefined}
            aria-label={mode === "account" ? "Territory — return to forest" : "Territory"}
          >
            Territory
          </button>
          <Eyebrow>Hypothetical strategic territory</Eyebrow>
        </div>

        {mode === "forest" ? (
          <dl className="hidden sm:flex items-start gap-8 text-[13px]">
            <Stat label="Strategic accounts" value={summary.accounts} />
            <Stat label="People mapped" value={summary.mapped} />
            <Stat label="Engaged" value={summary.engaged} />
            <Stat label="Meetings" value={summary.meetings} />
            <Stat label="Emerging opportunities" value={summary.opportunities} />
          </dl>
        ) : (
          view && (
            <nav aria-label="Organization breadcrumb" className="flex flex-wrap items-center gap-1 text-[13px]">
              <button type="button" className="btn btn-ghost btn-sm -ml-2" onClick={returnToForest}>
                Forest
              </button>
              <Sep />
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${!bu ? "text-paper" : ""}`}
                onClick={() => focusBusinessUnit(null)}
                aria-current={!bu ? "page" : undefined}
              >
                {view.account.name}
              </button>
              {bu && (
                <>
                  <Sep />
                  <button
                    type="button"
                    className={`btn btn-ghost btn-sm ${!team ? "text-paper" : ""}`}
                    onClick={() => focusTeam(null)}
                    aria-current={!team ? "page" : undefined}
                  >
                    {bu.unit.shortName ?? bu.unit.name}
                  </button>
                </>
              )}
              {team && (
                <>
                  <Sep />
                  <span className="px-2 text-paper" aria-current="page">
                    {team.team.name}
                  </span>
                </>
              )}
            </nav>
          )
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 pointer-events-auto pt-0.5">
        <span className="eyebrow hidden sm:inline">Built with Cursor</span>
        <span className="text-[11px] text-paper-20 hidden sm:inline leading-relaxed">Hypothetical · demo data</span>
        <span className="text-[10px] text-paper-20 sm:hidden tracking-[0.12em] uppercase">Demo</span>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <dt className="eyebrow whitespace-nowrap">{label}</dt>
      <dd className="text-[20px] font-medium tabular-nums leading-none tracking-tight">{value}</dd>
    </div>
  );
}

function Sep() {
  return (
    <span aria-hidden className="text-paper-20">
      /
    </span>
  );
}
