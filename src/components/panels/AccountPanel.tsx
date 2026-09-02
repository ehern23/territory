"use client";

import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView } from "@/store/selectors";
import { formatPercent } from "@/domain/penetration";
import { scoreBand } from "@/domain/score";
import { MATURITY_LABEL } from "@/domain/opportunity";
import { SEASON_HEX } from "@/three/palette";
import { Eyebrow, Meter, Section, SeasonChip, Stat } from "../ui";
import { PanelHeader } from "./PanelHeader";

/**
 * Default account surface and the semantic organizational navigator:
 * Account → Business Unit → Team → Prospect, fully keyboard operable.
 */
export function AccountPanel({ view }: { view: AccountView }) {
  const focusBusinessUnit = useTerritoryStore((s) => s.focusBusinessUnit);
  const selectOpportunity = useTerritoryStore((s) => s.selectOpportunity);
  const setView = useTerritoryStore((s) => s.setView);
  const setNavigatorOpen = useTerritoryStore((s) => s.setNavigatorOpen);
  const { account, score, coverage, units, opportunities } = view;

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        eyebrow={account.sector}
        title={account.name}
        aside={<SeasonChip season={account.season} />}
        onClose={() => setNavigatorOpen(false)}
      />

      <p className="text-[13px] text-paper-60 leading-relaxed -mt-2">{account.thesis}</p>

      <div className="grid grid-cols-3 gap-3">
        <button type="button" className="text-left" onClick={() => setView("score")} aria-label="Open demo strategic score">
          <Stat label="Demo score" value={score} sub={scoreBand(score)} />
        </button>
        <Stat label="Penetration" value={formatPercent(coverage.penetration)} sub={`${coverage.contacted} of ${coverage.mapped}`} />
        <Stat label="Meetings" value={coverage.meetings} sub={`${coverage.engaged} engaged`} />
      </div>

      <div className="hairline" />

      <Section title="Organizations">
        <ul className="flex flex-col -mx-2">
          {units.map(({ unit, coverage: c }) => (
            <li key={unit.id}>
              <button type="button" className="row-btn" onClick={() => focusBusinessUnit(unit.id)}>
                <span
                  className="dot"
                  style={{ background: SEASON_HEX[unit.status === "dormant" ? "winter" : unit.status === "reactivating" ? "spring" : unit.season] }}
                  aria-hidden
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] truncate">{unit.name}</span>
                  <span className="block text-[11.5px] text-paper-40">
                    {unit.status === "dormant"
                      ? "Dormant · Winter"
                      : unit.status === "reactivating"
                        ? "Reactivating · Spring"
                        : `${c.mapped} mapped · ${c.engaged} engaged`}
                  </span>
                </span>
                <span className="w-16 flex flex-col items-end gap-1">
                  <span className="text-[12px] tabular-nums text-paper-60">{formatPercent(c.penetration)}</span>
                  <span className="w-full">
                    <Meter value={c.penetration} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      {opportunities.some((o) => o.maturity) && (
        <Section title="Emerging opportunities">
          <ul className="flex flex-col -mx-2">
            {opportunities
              .filter((o) => o.maturity)
              .map((o) => (
                <li key={o.opportunity.id}>
                  <button type="button" className="row-btn" onClick={() => selectOpportunity(o.opportunity.id)}>
                    <span className="dot" style={{ background: "#b0483a" }} aria-hidden />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] truncate">{o.opportunity.name}</span>
                      <span className="block text-[11.5px] text-paper-40">
                        {o.maturity && MATURITY_LABEL[o.maturity]} · {o.meetingCount} meetings · momentum {o.momentum}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </Section>
      )}

      <div className="hairline" />
      <div className="flex flex-col gap-1">
        <Eyebrow>Reading the tree</Eyebrow>
        <p className="text-[12px] text-paper-40 leading-relaxed">
          Branches are organizations, leaves are people. Green is unworked; leaves warm through yellow and orange
          as relationships progress, turn red when a meeting is booked, and fall to the base. Fruit is commercial
          opportunity. Bare branches are dormant by choice.
        </p>
      </div>
    </div>
  );
}
