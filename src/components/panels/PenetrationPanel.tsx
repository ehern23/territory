"use client";

import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView } from "@/store/selectors";
import { formatPercent } from "@/domain/penetration";
import { Meter, Section } from "../ui";
import { PanelHeader } from "./PanelHeader";

/**
 * Coverage by organization. The tree stays primary: worked stakeholders come
 * forward in the scene while this surface gives the numbers.
 */
export function PenetrationPanel({ view }: { view: AccountView }) {
  const setView = useTerritoryStore((s) => s.setView);
  const focusBusinessUnit = useTerritoryStore((s) => s.focusBusinessUnit);
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const units = [...view.units].sort((a, b) => b.coverage.penetration - a.coverage.penetration);

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        eyebrow="Penetration view"
        title={formatPercent(view.coverage.penetration)}
        aside={
          <span className="text-[12.5px] text-paper-60">
            {view.coverage.contacted} of {view.coverage.mapped} mapped stakeholders contacted or beyond
          </span>
        }
        onClose={() => setView("tree")}
      />

      <Section title="By organization">
        <ul className="flex flex-col gap-1 -mx-2">
          {units.map(({ unit, coverage }) => {
            const dormant = unit.status === "dormant";
            const active = focusBusinessUnitId === unit.id;
            return (
              <li key={unit.id}>
                <button
                  type="button"
                  className={`row-btn flex-col items-stretch gap-1.5 ${active ? "is-active" : ""}`}
                  onClick={() => focusBusinessUnit(active ? null : unit.id)}
                  aria-pressed={active}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className={`text-[13.5px] truncate ${dormant ? "text-paper-40" : ""}`}>{unit.name}</span>
                    <span className="text-[13px] tabular-nums">{dormant ? "Dormant" : formatPercent(coverage.penetration)}</span>
                  </span>
                  <Meter value={dormant ? 0 : coverage.penetration} color={dormant ? "#8b8378" : undefined} />
                  <span className="text-[11.5px] text-paper-40">
                    {coverage.mapped} mapped · {coverage.contacted} contacted · {coverage.engaged} engaged · {coverage.meetings} meetings
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <p className="text-[11.5px] text-paper-40 leading-relaxed">
        In the scene, unworked leaves recede and worked stakeholders stay bright, so coverage reads spatially
        before you read a number.
      </p>
    </div>
  );
}
