"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTerritoryStore, type PanelTab } from "@/store/useTerritoryStore";
import { useAccountView, type AccountView } from "@/store/selectors";
import { HEALTH_HEX, HEALTH_LABEL } from "@/domain/health";
import { STAGE_BY_MATURITY, TIER_LABEL, formatDaysAgo, formatMoney } from "@/domain/commercial";
import { MATURITY_LABEL } from "@/domain/opportunity";
import { STATUS_LABEL } from "@/domain/relationship";
import { formatPercent } from "@/domain/penetration";
import { computeStrategicScore, scoreContribution } from "@/domain/score";
import { FRUIT_HEX, SEASON_HEX } from "@/three/palette";
import { EvidenceTag, Meter, StatusDot } from "./ui";
import { BranchPanel } from "./panels/BranchPanel";
import { ProspectPanel } from "./panels/ProspectPanel";
import { OpportunityPanel } from "./panels/OpportunityPanel";

/**
 * Account intelligence. Desktop: a right-hand glass panel. Compact: a bottom
 * sheet that opens at a summary height and expands for detail. The tree stays
 * visible either way.
 */
export function AccountPanel() {
  const mode = useTerritoryStore((s) => s.mode);
  const activeAccountId = useTerritoryStore((s) => s.activeAccountId);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const view = useAccountView(mode === "account" ? activeAccountId : null);
  const reduce = useReducedMotion();
  // On phones the narrator carries the story during the demo; the tree needs the screen.
  if (isCompact && demoActive) return null;

  return (
    <AnimatePresence>
      {view &&
        (isCompact ? (
          <motion.section
            key="sheet"
            initial={reduce ? false : { y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 60, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass glass-strong absolute inset-x-2 bottom-[max(8px,env(safe-area-inset-bottom))] z-30 max-h-[50vh] flex flex-col overflow-hidden"
            aria-label={`${view.account.name} account intelligence`}
          >
            <div className="flex justify-center pt-2">
              <span className="block h-1 w-9 rounded-full bg-paper-20" aria-hidden />
            </div>
            <div className="scroll flex-1 px-4 pb-5 pt-2">
              <PanelBody view={view} />
            </div>
          </motion.section>
        ) : (
          <motion.aside
            key="side"
            initial={reduce ? false : { x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: 24, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass absolute right-4 top-4 bottom-4 w-[400px] z-30 flex flex-col overflow-hidden"
            aria-label={`${view.account.name} account intelligence`}
          >
            <div className="scroll flex-1 p-5">
              <PanelBody view={view} />
            </div>
          </motion.aside>
        ))}
    </AnimatePresence>
  );
}

const TABS: { id: PanelTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "organization", label: "Organization" },
  { id: "intelligence", label: "Intel" },
  { id: "activity", label: "Activity" },
];

function PanelBody({ view }: { view: AccountView }) {
  const tab = useTerritoryStore((s) => s.panelTab);
  const setTab = useTerritoryStore((s) => s.setPanelTab);
  const returnToForest = useTerritoryStore((s) => s.returnToForest);
  const selectedOpportunityId = useTerritoryStore((s) => s.selectedOpportunityId);
  const selectedProspectId = useTerritoryStore((s) => s.selectedProspectId);
  const focusBusinessUnitId = useTerritoryStore((s) => s.focusBusinessUnitId);
  const focusTeamId = useTerritoryStore((s) => s.focusTeamId);
  const { account, commercial, health } = view;

  let body: React.ReactNode;
  if (tab === "overview") {
    body = selectedOpportunityId ? <OpportunityPanel view={view} opportunityId={selectedOpportunityId} /> : <Overview view={view} />;
  } else if (tab === "organization") {
    body = selectedProspectId ? (
      <ProspectPanel view={view} prospectId={selectedProspectId} />
    ) : focusBusinessUnitId ? (
      <BranchPanel view={view} businessUnitId={focusBusinessUnitId} teamId={focusTeamId} />
    ) : (
      <Organization view={view} />
    );
  } else if (tab === "intelligence") {
    body = <Intelligence view={view} />;
  } else {
    body = <ActivityTimeline view={view} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="eyebrow">{account.sector}</div>
            <h2 className="display text-[26px] mt-1.5">{account.name}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="tag">{TIER_LABEL[commercial.tier]}</span>
              <span className="tag" style={{ color: HEALTH_HEX[health.band] }}>
                <span className="dot" style={{ width: 6, height: 6, background: HEALTH_HEX[health.band] }} aria-hidden />
                {HEALTH_LABEL[health.band]}
              </span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm -mr-2 -mt-1" onClick={returnToForest} aria-label="Back to territory">
            ✕
          </button>
        </div>
        <div className="tabs" role="tablist" aria-label="Account sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      {body}
    </div>
  );
}

function Overview({ view }: { view: AccountView }) {
  const runActivity = useTerritoryStore((s) => s.runActivity);
  const simulateNeglect = useTerritoryStore((s) => s.simulateNeglect);
  const selectOpportunity = useTerritoryStore((s) => s.selectOpportunity);
  const selectProspect = useTerritoryStore((s) => s.selectProspect);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const { account, commercial, health, pipeline, opportunities, keyPeople, next } = view;
  const live = opportunities.filter((o) => o.maturity);

  return (
    <div className="flex flex-col gap-6">
      {/* Health */}
      <section className="flex items-end gap-5">
        <div className="flex flex-col">
          <span className="eyebrow">Account health</span>
          <span className="flex items-baseline gap-1.5 mt-1">
            <motion.span key={health.score} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="display num text-[44px]">
              {health.score}
            </motion.span>
            <span className="text-paper-40 text-[13px]">/ 100</span>
          </span>
        </div>
        <ul className="flex-1 flex flex-col gap-1 pb-1.5">
          {health.drivers.map((d) => (
            <li key={d.label} className="flex items-center gap-2 text-[12px] text-paper-80">
              <span
                aria-hidden
                className="dot"
                style={{
                  width: 6,
                  height: 6,
                  background: d.tone === "positive" ? "var(--color-thriving)" : d.tone === "negative" ? "var(--color-risk)" : "var(--color-paper-40)",
                }}
              />
              <span className="truncate">{d.label}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="meter -mt-3" aria-hidden>
        <span style={{ width: `${health.score}%`, background: HEALTH_HEX[health.band] }} />
      </div>

      {/* Commercial */}
      <section className="grid grid-cols-3 gap-3">
        <Figure label="Potential" value={formatMoney(commercial.potentialArr)} sub="ARR" />
        <Figure label="Pipeline" value={pipeline.open > 0 ? formatMoney(pipeline.open) : "—"} sub={`${formatMoney(pipeline.weighted)} weighted`} />
        <Figure
          label="Last touch"
          value={view.daysSince <= 1 ? (view.daysSince === 0 ? "Today" : "1 day") : `${view.daysSince} days`}
          sub={view.daysSince > 30 ? "Going cold" : view.daysSince > 14 ? "Cooling" : "Recent"}
          warn={view.daysSince > 14}
        />
      </section>

      {/* Next best action */}
      <section className="surface-quiet p-4 flex flex-col gap-2.5" style={{ borderColor: "rgba(233,199,123,0.28)" }}>
        <div className="flex items-center justify-between">
          <span className="eyebrow" style={{ color: "var(--color-accent)" }}>
            Recommended next action
          </span>
        </div>
        <h3 className="text-[15px] font-semibold leading-snug">{next.title}</h3>
        <p className="text-[12.5px] text-paper-60 leading-relaxed">{next.reason}</p>
        {!demoActive && (
          <button type="button" className="btn btn-accent self-start mt-1" onClick={() => runActivity(account.id, next.activity)}>
            {next.cta}
          </button>
        )}
      </section>

      {/* Opportunities */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Opportunities · fruit</span>
          <span className="text-[11.5px] text-paper-40">{live.length} active</span>
        </div>
        {live.length === 0 ? (
          <p className="text-[12.5px] text-paper-40">No qualified pipeline yet. Engage a second stakeholder to grow fruit.</p>
        ) : (
          <ul className="flex flex-col -mx-2">
            {live.map((o) => (
              <li key={o.opportunity.id}>
                <button type="button" className="row-btn" onClick={() => selectOpportunity(o.opportunity.id)}>
                  <span className="dot" style={{ background: FRUIT_HEX[o.maturity!], width: 10, height: 10 }} aria-hidden />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] truncate">{o.opportunity.name}</span>
                    <span className="block text-[11.5px] text-paper-40">
                      {STAGE_BY_MATURITY[o.maturity!]} · {MATURITY_LABEL[o.maturity!].toLowerCase()} fruit
                    </span>
                  </span>
                  <span className="num text-[13px] font-medium">{formatMoney(commercial.dealValues[o.opportunity.id] ?? 0)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stakeholders */}
      <section className="flex flex-col gap-2">
        <span className="eyebrow">Key stakeholders</span>
        <ul className="flex flex-col -mx-2">
          {keyPeople.map((p) => (
            <li key={p.id}>
              <button type="button" className="row-btn" onClick={() => selectProspect(p.id)}>
                <StatusDot status={p.relationshipStatus} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] truncate">{p.name}</span>
                  <span className="block text-[11.5px] text-paper-40 truncate">{p.title}</span>
                </span>
                <span className="text-[11px] text-paper-60 whitespace-nowrap">{STATUS_LABEL[p.relationshipStatus]}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Simulation */}
      {!demoActive && (
        <section className="flex flex-col gap-2.5">
          <div>
            <span className="eyebrow">Simulate sales activity</span>
            <p className="text-[11.5px] text-paper-40 mt-1">Run a sample action and watch the tree respond.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn" onClick={() => runActivity(account.id, "discovery-call")}>
              Discovery call
            </button>
            <button type="button" className="btn" onClick={() => runActivity(account.id, "exec-meeting")}>
              Executive meeting
            </button>
            <button type="button" className="btn" onClick={() => runActivity(account.id, "multithread")}>
              Multithread deal
            </button>
            <button type="button" className="btn" onClick={() => simulateNeglect(account.id, 60)}>
              Skip 60 days
            </button>
          </div>
        </section>
      )}

      <p className="text-[11px] text-paper-40 leading-relaxed">
        {commercial.motion}. Illustrative account: people are fictional, CRM activity and dollar values are demo data.
      </p>
    </div>
  );
}

function Figure({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="eyebrow truncate">{label}</span>
      <span className="num text-[18px] font-semibold leading-tight mt-1 truncate">{value}</span>
      {sub && (
        <span className="text-[11px] truncate mt-0.5" style={{ color: warn ? "var(--color-risk)" : "var(--color-paper-40)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function Organization({ view }: { view: AccountView }) {
  const focusBusinessUnit = useTerritoryStore((s) => s.focusBusinessUnit);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12.5px] text-paper-60 leading-relaxed">
        Each limb is a business unit. Fullness follows engagement; a bare limb is dormant by choice; fresh green is a
        branch reactivated by a new signal.
      </p>
      <ul className="flex flex-col -mx-2">
        {view.units.map(({ unit, coverage }) => {
          const season = unit.status === "dormant" ? "winter" : unit.status === "reactivating" ? "spring" : "summer";
          return (
            <li key={unit.id}>
              <button type="button" className="row-btn" onClick={() => focusBusinessUnit(unit.id)}>
                <span className="dot" style={{ background: SEASON_HEX[season] }} aria-hidden />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] truncate">{unit.name}</span>
                  <span className="block text-[11.5px] text-paper-40">
                    {unit.status === "dormant"
                      ? "Dormant · bare limb"
                      : unit.status === "reactivating"
                        ? "Reactivated · new growth"
                        : `${coverage.mapped} mapped · ${coverage.engaged} engaged`}
                  </span>
                </span>
                <span className="w-14 flex flex-col items-end gap-1">
                  <span className="num text-[12px] text-paper-60">{formatPercent(coverage.penetration)}</span>
                  <span className="w-full">
                    <Meter value={coverage.penetration} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Intelligence({ view }: { view: AccountView }) {
  const { account } = view;
  const score = computeStrategicScore(account.strategicScore);
  const signals = useTerritoryStore((s) => s.signals).filter((x) => x.accountId === account.id);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <span className="eyebrow">Thesis</span>
        <p className="text-[12.5px] text-paper-80 leading-relaxed">{account.thesis}</p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Strategic fit</span>
          <span className="num text-[13px] font-medium">{score} / 100</span>
        </div>
        <ul className="flex flex-col gap-2">
          {account.strategicScore.components.map((c) => (
            <li key={c.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-paper-80">{c.label}</span>
                <span className="num text-paper-40">+{scoreContribution(c, account.strategicScore)}</span>
              </div>
              <Meter value={(c.key === "competitive-friction" ? 10 - c.value : c.value) / 10} color="rgba(242,238,229,0.55)" />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <span className="eyebrow">Signals</span>
        <ul className="flex flex-col gap-2">
          {[...signals].reverse().map((s) => (
            <li key={s.id} className="surface-quiet p-3 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12.5px] font-medium leading-snug">{s.title}</span>
                <EvidenceTag type={s.evidenceType} />
              </div>
              <p className="text-[12px] text-paper-60 leading-relaxed">{s.description}</p>
              <span className="text-[11px] text-paper-40">
                {s.date}
                {s.sourceUrl && (
                  <>
                    {" · "}
                    <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-paper-20 hover:text-paper">
                      {s.sourceLabel ?? "Source"}
                    </a>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <span className="eyebrow">Roots · account research</span>
        <ul className="flex flex-col gap-2">
          {account.intelligence.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 pb-2 border-b border-line last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[10.5px] text-paper-40 uppercase tracking-wider">{item.category}</span>
                  <span className="block text-[12.5px] font-medium leading-snug mt-0.5">{item.title}</span>
                </div>
                <EvidenceTag type={item.evidenceType} />
              </div>
              <p className="text-[12px] text-paper-60 leading-relaxed">{item.summary}</p>
              {item.sourceUrl && (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-paper-40 underline decoration-paper-20 hover:text-paper">
                  {item.sourceLabel ?? "Source"}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ActivityTimeline({ view }: { view: AccountView }) {
  const activities = useTerritoryStore((s) => s.activities).filter((a) => a.accountId === view.account.id);
  const now = Date.now();
  return (
    <ol className="flex flex-col">
      {[...activities].reverse().map((a, i) => {
        const days = Math.max(0, Math.round((now - a.timestamp) / 86_400_000));
        return (
          <li key={a.id} className="flex gap-3">
            <span className="flex flex-col items-center pt-1.5">
              <span className="dot" style={{ width: 7, height: 7, background: a.kind === "opportunity" ? FRUIT_HEX.young : "var(--color-paper-40)" }} />
              {i < activities.length - 1 && <span className="w-px flex-1 bg-line my-1" />}
            </span>
            <span className="flex-1 pb-4">
              <span className="block text-[12.5px] leading-snug">{a.message}</span>
              <span className="block text-[11px] text-paper-40 mt-0.5">{days === 0 ? "Just now" : formatDaysAgo(days)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
