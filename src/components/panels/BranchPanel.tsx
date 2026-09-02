"use client";

import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView } from "@/store/selectors";
import { formatPercent } from "@/domain/penetration";
import { STATUS_LABEL } from "@/domain/relationship";
import { EvidenceTag, Kv, Meter, PriorityLabel, Section, SeasonChip, StatusDot } from "../ui";
import { PanelHeader } from "./PanelHeader";

export function BranchPanel({
  view,
  businessUnitId,
  teamId,
}: {
  view: AccountView;
  businessUnitId: string;
  teamId: string | null;
}) {
  const focusBusinessUnit = useTerritoryStore((s) => s.focusBusinessUnit);
  const focusTeam = useTerritoryStore((s) => s.focusTeam);
  const selectProspect = useTerritoryStore((s) => s.selectProspect);
  const simulateTrigger = useTerritoryStore((s) => s.simulateTrigger);
  const allSignals = useTerritoryStore((s) => s.signals);
  const signals = allSignals.filter((x) => x.businessUnitId === businessUnitId);

  const bu = view.units.find((u) => u.unit.id === businessUnitId);
  if (!bu) return null;
  const team = teamId ? bu.teams.find((t) => t.team.id === teamId) : null;
  const unit = bu.unit;
  const dormant = unit.status === "dormant";
  const reactivating = unit.status === "reactivating";
  const coverage = team ? team.coverage : bu.coverage;
  const season = dormant ? "winter" : reactivating ? "spring" : unit.season;

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        eyebrow={team ? unit.name : "Business unit"}
        title={team ? team.team.name : unit.name}
        aside={
          <>
            <SeasonChip season={season} label={dormant ? "Winter · Dormant" : reactivating ? "Spring · Reactivating" : season} />
            <span className="text-[12px] text-paper-40">
              Priority <PriorityLabel priority={team ? team.team.priority : unit.priority} />
            </span>
          </>
        }
        onClose={() => (team ? focusTeam(null) : focusBusinessUnit(null))}
        closeLabel={team ? "Back to business unit" : "Close business unit"}
      />

      {dormant ? (
        <DormantExplainer view={view} businessUnitId={businessUnitId} onTrigger={() => simulateTrigger(unit.id)} />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Num label="Mapped" value={coverage.mapped} />
            <Num label="Contacted" value={coverage.contacted} />
            <Num label="Engaged" value={coverage.engaged} />
            <Num label="Meetings" value={coverage.meetings} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[12px]">
              <span className="text-paper-40">Penetration</span>
              <span className="tabular-nums">{formatPercent(coverage.penetration)}</span>
            </div>
            <Meter value={coverage.penetration} />
          </div>
        </>
      )}

      <Section title="Branch thesis">
        <p className="text-[13px] text-paper-60 leading-relaxed">{team?.team.thesis ?? unit.thesis}</p>
      </Section>

      {reactivating && signals.length > 0 && (
        <Section title="Signal">
          {signals.slice(-1).map((s) => (
            <div key={s.id} className="surface-quiet p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium">{s.title}</span>
                <EvidenceTag type={s.evidenceType} />
              </div>
              <p className="text-[12.5px] text-paper-60 leading-relaxed">{s.description}</p>
              <span className="text-[11px] text-paper-40">{s.date}</span>
            </div>
          ))}
        </Section>
      )}

      {!team && !dormant && (
        <Section title="Teams">
          <ul className="flex flex-col -mx-2">
            {bu.teams.map((t) => (
              <li key={t.team.id}>
                <button type="button" className="row-btn" onClick={() => focusTeam(t.team.id)}>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] truncate">{t.team.name}</span>
                    <span className="block text-[11.5px] text-paper-40">
                      {t.coverage.mapped} mapped · {t.coverage.engaged} engaged · {t.coverage.meetings} meetings
                    </span>
                  </span>
                  <span className="text-[12px] tabular-nums text-paper-60">{formatPercent(t.coverage.penetration)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(team || dormant) && (
        <Section title={team ? "People" : "People currently mapped"}>
          <ul className="flex flex-col -mx-2">
            {(team ? team.prospects : bu.prospects)
              .filter((p) => !p.latent)
              .sort((a, b) => b.influence - a.influence)
              .map((p) => (
                <li key={p.id}>
                  <button type="button" className="row-btn" onClick={() => selectProspect(p.id)}>
                    <StatusDot status={p.relationshipStatus} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] truncate">{p.name}</span>
                      <span className="block text-[11.5px] text-paper-40 truncate">{p.title}</span>
                    </span>
                    <span className="text-[11px] text-paper-40 whitespace-nowrap">{STATUS_LABEL[p.relationshipStatus]}</span>
                  </button>
                </li>
              ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function DormantExplainer({
  view,
  businessUnitId,
  onTrigger,
}: {
  view: AccountView;
  businessUnitId: string;
  onTrigger: () => void;
}) {
  const bu = view.units.find((u) => u.unit.id === businessUnitId)!;
  const reason = bu.unit.dormancyReason;
  return (
    <div className="surface-quiet p-4 flex flex-col gap-3">
      <div className="eyebrow">Why this branch is dormant</div>
      <Kv k="Current priority" v={<span className="uppercase tracking-wide text-[12px]">Low</span>} />
      <div>
        <div className="text-[12px] text-paper-40">Reason</div>
        <div className="text-[13px] mt-0.5">{reason?.label}</div>
        <p className="text-[12.5px] text-paper-60 leading-relaxed mt-1">{reason?.detail}</p>
      </div>
      <div>
        <div className="text-[12px] text-paper-40">Recommendation</div>
        <p className="text-[12.5px] text-paper-60 leading-relaxed mt-0.5">{reason?.recommendation}</p>
      </div>
      <p className="text-[11.5px] text-paper-40 leading-relaxed">
        Strategic selling is resource allocation. Not all whitespace is valuable whitespace.
      </p>
      {bu.unit.reactivation && (
        <button type="button" className="btn btn-primary w-full" onClick={onTrigger}>
          Simulate trigger
        </button>
      )}
      <p className="text-[11px] text-paper-20">Local demo: simulates an external signal a research agent would surface.</p>
    </div>
  );
}

function Num({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="eyebrow">{label}</span>
      <span className="text-[17px] font-medium tabular-nums leading-tight">{value}</span>
    </div>
  );
}
