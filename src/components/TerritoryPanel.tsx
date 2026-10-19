"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLiquidGlass } from "./glass/Glass";
import { LensGroup } from "./glass/Lens";
import { useTerritoryStore, type TerritoryFilter } from "@/store/useTerritoryStore";
import { FILTER_LABEL, matchesFilter, summarize, useAccountViews } from "@/store/selectors";
import { formatMoney } from "@/domain/commercial";
import { HEALTH_HEX, healthBand } from "@/domain/health";

/**
 * Territory overview: the handful of numbers a seller checks first, filters
 * that re-light the forest, and a ranked list of where to go next.
 */

const FILTERS: TerritoryFilter[] = ["all", "attention", "pipeline", "tier1"];

export function TerritoryPanel() {
  const mode = useTerritoryStore((s) => s.mode);
  const isCompact = useTerritoryStore((s) => s.isCompact);
  const introDone = useTerritoryStore((s) => s.introDone);
  const overviewOpen = useTerritoryStore((s) => s.overviewOpen);
  const setOverviewOpen = useTerritoryStore((s) => s.setOverviewOpen);
  const demoActive = useTerritoryStore((s) => s.demo.active);
  const reduce = useReducedMotion();
  const visible = mode === "forest" && introDone;
  const asideRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  useLiquidGlass(asideRef, { radius: 22, strength: 64, blur: 9, saturate: 1.5, enabled: visible && !isCompact });
  useLiquidGlass(sheetRef, { radius: 22, strength: 48, blur: 9, saturate: 1.5, enabled: visible && isCompact && !demoActive });

  if (isCompact) {
    return (
      <AnimatePresence>
        {visible && !demoActive && (
          <motion.section
            ref={sheetRef}
            key="territory-sheet"
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="glass glass-strong absolute inset-x-2 bottom-[max(8px,env(safe-area-inset-bottom))] z-30 flex flex-col overflow-hidden max-h-[62vh]"
          >
            <button
              type="button"
              className="flex flex-col items-center pt-2 pb-1 w-full"
              onClick={() => setOverviewOpen(!overviewOpen)}
              aria-expanded={overviewOpen}
              aria-label={overviewOpen ? "Collapse territory overview" : "Expand territory overview"}
            >
              <span className="block h-1 w-9 rounded-full bg-paper-20" aria-hidden />
            </button>
            <div className="scroll px-4 pb-4">
              <Summary compact />
              {overviewOpen && (
                <div className="mt-4 flex flex-col gap-4">
                  <Filters />
                  <Priorities />
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          ref={asideRef}
          key="territory-panel"
          initial={reduce ? false : { x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          className="glass absolute left-4 top-[76px] w-[340px] max-h-[calc(100%-170px)] z-30 flex flex-col overflow-hidden"
          aria-label="Territory overview"
        >
          <div className="scroll p-5 flex flex-col gap-5">
            <Summary />
            <Filters />
            {!demoActive && <Priorities />}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Summary({ compact = false }: { compact?: boolean }) {
  const views = useAccountViews();
  const s = summarize(views);
  const band = healthBand(s.health);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Territory health</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="display num text-[38px]" style={{ color: HEALTH_HEX[band] }}>
              {s.health}
            </span>
            <span className="text-paper-40 text-[12px]">weighted by potential</span>
          </div>
        </div>
        <HealthStrip />
      </div>
      <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-2"} gap-x-4 gap-y-3`}>
        <Kpi label="Open pipeline" value={formatMoney(s.pipeline)} sub={`${formatMoney(s.weighted)} weighted`} />
        <Kpi label="Needs attention" value={`${s.attention} of ${s.accounts}`} sub="accounts cooling" warn={s.attention > 0} />
        <Kpi label="Active opps" value={String(s.activeOpportunities)} sub={compact ? undefined : `${formatMoney(s.potential)} potential`} />
        {!compact && <Kpi label="Accounts" value={String(s.accounts)} sub="strategic book" />}
      </div>
    </div>
  );
}

/** One mark per account, coloured by health: the forest in a line. */
function HealthStrip() {
  const views = useAccountViews();
  const setHovered = useTerritoryStore((s) => s.setHovered);
  const hovered = useTerritoryStore((s) => s.hoveredAccountId);
  return (
    <div className="flex items-end gap-1 pb-2" aria-hidden>
      {views.map((v) => (
        <span
          key={v.account.id}
          onPointerEnter={() => setHovered(v.account.id)}
          onPointerLeave={() => setHovered(null)}
          className="block w-[5px] rounded-full transition-all duration-500"
          style={{
            height: 8 + v.health.score * 0.22,
            background: HEALTH_HEX[v.health.band],
            opacity: hovered && hovered !== v.account.id ? 0.35 : 1,
          }}
        />
      ))}
    </div>
  );
}

function Kpi({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="eyebrow truncate">{label}</span>
      <span className="num text-[20px] font-semibold leading-tight mt-1" style={warn ? { color: "var(--color-cooling)" } : undefined}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-paper-40 truncate">{sub}</span>}
    </div>
  );
}

function Filters() {
  const filter = useTerritoryStore((s) => s.filter);
  const setFilter = useTerritoryStore((s) => s.setFilter);
  const views = useAccountViews();
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow">Light up the forest</span>
      <LensGroup className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter accounts">
        {FILTERS.map((f) => {
          const n = views.filter((v) => matchesFilter(v, f)).length;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={filter === f}
              data-lens
              className={`chip ${filter === f ? "is-active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABEL[f]}
              <span className="num opacity-60">{n}</span>
            </button>
          );
        })}
      </LensGroup>
    </div>
  );
}

function Priorities() {
  const views = useAccountViews();
  const s = summarize(views);
  const enterAccount = useTerritoryStore((st) => st.enterAccount);
  const setHovered = useTerritoryStore((st) => st.setHovered);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Where to focus next</span>
        <span className="text-[10.5px] text-paper-40">health × dollars at stake</span>
      </div>
      <LensGroup as="ol" radius={12} className="flex flex-col -mx-2">
        {s.priorities.slice(0, 3).map((p, i) => {
          const v = views.find((x) => x.account.id === p.accountId);
          return (
            <li key={p.accountId}>
              <button
                type="button"
                data-lens
                className="row-btn items-start"
                onClick={() => enterAccount(p.accountId)}
                onPointerEnter={() => setHovered(p.accountId)}
                onPointerLeave={() => setHovered(null)}
              >
                <span className="num text-[11px] text-paper-40 w-3 pt-0.5">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    {v && <span className="dot" style={{ background: HEALTH_HEX[v.health.band] }} aria-hidden />}
                    <span className="text-[13px] font-medium truncate">{p.accountName}</span>
                    <span className="num text-[11px] text-paper-40 ml-auto">{formatMoney(p.atStake)}</span>
                  </span>
                  <span className="block text-[12px] text-paper-60 mt-0.5 leading-snug">{p.title}</span>
                </span>
              </button>
            </li>
          );
        })}
      </LensGroup>
    </div>
  );
}
