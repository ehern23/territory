"use client";

import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView } from "@/store/selectors";
import { MATURITY_DESCRIPTION, MATURITY_LABEL, MATURITY_ORDER, maturityRank } from "@/domain/opportunity";
import { FRUIT_HEX } from "@/three/palette";
import { STAGE_BY_MATURITY, WIN_PROBABILITY, formatMoney } from "@/domain/commercial";
import { EvidenceTag, Kv, Section, StatusDot } from "../ui";
import { PanelHeader } from "./PanelHeader";

export function OpportunityPanel({ view, opportunityId }: { view: AccountView; opportunityId: string }) {
  const selectOpportunity = useTerritoryStore((s) => s.selectOpportunity);
  const selectProspect = useTerritoryStore((s) => s.selectProspect);
  const prospectsById = useTerritoryStore((s) => s.prospectsById);

  const state = view.opportunities.find((o) => o.opportunity.id === opportunityId);
  if (!state) return null;
  const opp = state.opportunity;
  const bu = view.units.find((u) => u.unit.id === opp.businessUnitId);
  const champion = opp.championId ? prospectsById[opp.championId] : undefined;
  const stakeholders = opp.stakeholderIds.map((id) => prospectsById[id]).filter(Boolean);
  if (!state.maturity) {
    return (
      <div className="flex flex-col gap-5">
        <PanelHeader
          eyebrow="Opportunity"
          title={opp.name}
          aside={
            <>
              <span className="text-[12.5px] text-paper-60">{bu?.unit.name}</span>
              <EvidenceTag type={opp.evidenceType} />
            </>
          }
          onClose={() => selectOpportunity(null)}
        />
        <p className="text-[13px] text-paper-60 leading-relaxed">
          Not yet visible as fruit. Fruit appears when a second stakeholder engages — a commercial
          surface, not a person.
        </p>
      </div>
    );
  }
  const rank = maturityRank(state.maturity);

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        eyebrow="Opportunity"
        title={opp.name}
        aside={
          <>
            <span className="text-[12.5px] text-paper-60">{bu?.unit.name}</span>
            <EvidenceTag type={opp.evidenceType} />
          </>
        }
        onClose={() => selectOpportunity(null)}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[13px]">
            <span className="dot" style={{ background: FRUIT_HEX[state.maturity], width: 10, height: 10 }} aria-hidden />
            {STAGE_BY_MATURITY[state.maturity]} · {MATURITY_LABEL[state.maturity].toLowerCase()} fruit
          </span>
          <span className="text-[11.5px] text-paper-40">{MATURITY_DESCRIPTION[state.maturity]}</span>
        </div>
        <ol className="flex gap-1" aria-label="Opportunity maturity">
          {MATURITY_ORDER.map((m, i) => (
            <li
              key={m}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i <= rank ? FRUIT_HEX[m] : "rgba(236,230,220,0.08)" }}
              title={STAGE_BY_MATURITY[m]}
            />
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-x-4">
        <Kv k="Deal value" v={<span className="num font-medium">{formatMoney(view.commercial.dealValues[opp.id] ?? 0)}</span>} />
        <Kv k="Win probability" v={`${Math.round(WIN_PROBABILITY[state.maturity] * 100)}%`} />
        <Kv k="Momentum" v={<span className="capitalize">{state.momentum}</span>} />
        <Kv k="Stakeholders" v={state.stakeholderCount} />
        <Kv k="Engaged" v={state.engagedCount} />
        <Kv k="Meetings" v={state.meetingCount} />
        <Kv k="Champion" v={champion ? champion.name : "Not yet identified"} />
      </div>

      <Section title="Engagement strength">
        <div className="meter">
          <span style={{ width: `${Math.round(state.strength * 100)}%`, background: FRUIT_HEX[state.maturity] }} />
        </div>
        <p className="text-[12px] text-paper-40 leading-relaxed">
          Fruit grows as more stakeholders engage and meetings accumulate. Conversation intelligence could feed
          the same inputs later.
        </p>
      </Section>

      <Section title="Stakeholders">
        <ul className="flex flex-col -mx-2">
          {stakeholders
            .sort((a, b) => b.influence - a.influence)
            .map((p) => (
              <li key={p.id}>
                <button type="button" className="row-btn" onClick={() => selectProspect(p.id)}>
                  <StatusDot status={p.relationshipStatus} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] truncate">
                      {p.name}
                      {champion?.id === p.id && <span className="text-paper-40"> · champion</span>}
                    </span>
                    <span className="block text-[11.5px] text-paper-40 truncate">{p.title}</span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </Section>

      {opp.signals.length > 0 && (
        <Section title="Signals">
          <ul className="flex flex-col gap-1 text-[12.5px] text-paper-60">
            {opp.signals.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Next step">
        <p className="text-[13px] leading-relaxed">{opp.nextStep}</p>
      </Section>
    </div>
  );
}
