"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { useAccountView } from "@/store/selectors";
import { scoreBand } from "@/domain/score";
import { formatPercent } from "@/domain/penetration";
import { territory } from "@/data";
import { Eyebrow, EvidenceTag, SeasonChip } from "./ui";

/**
 * Forest mode: a single restrained card for the selected account (or market
 * silhouette). The forest stays visible; nothing else covers it.
 */
export function ForestOverlay() {
  const selectedAccountId = useTerritoryStore((s) => s.selectedAccountId);
  const selectedMarketId = useTerritoryStore((s) => s.selectedMarketId);
  const reduce = useReducedMotion();
  const view = useAccountView(selectedAccountId);
  const market = selectedMarketId ? territory.market.find((m) => m.id === selectedMarketId) : null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center md:items-start gap-3 px-3 md:px-6 pb-[max(14px,env(safe-area-inset-bottom))] md:pb-6 pointer-events-none">
      <AnimatePresence mode="wait">
        {view && (
          <motion.div
            key={view.account.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="surface w-full max-w-[460px] p-4 md:p-5 pointer-events-auto"
          >
            <AccountCard view={view} />
          </motion.div>
        )}
        {market && (
          <motion.div
            key={market.id}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="surface w-full max-w-[460px] p-4 md:p-5 pointer-events-auto"
          >
            <MarketCard market={market} />
          </motion.div>
        )}
      </AnimatePresence>
      <AccountStrip selectedAccountId={selectedAccountId} />
      {!view && !market && (
        <p className="text-[12px] text-paper-40 pointer-events-none text-center self-center hidden sm:block">
          Select a tree to inspect an account · drag to rotate · scroll or pinch to zoom
        </p>
      )}
    </div>
  );
}

/** Semantic list of the strategic accounts — keyboard-reachable alternative to clicking trees. */
function AccountStrip({ selectedAccountId }: { selectedAccountId: string | null }) {
  const accounts = useTerritoryStore((s) => s.accounts);
  const selectAccount = useTerritoryStore((s) => s.selectAccount);
  const enterAccount = useTerritoryStore((s) => s.enterAccount);
  return (
    <nav
      aria-label="Strategic accounts"
      className="self-center max-w-full overflow-x-auto scroll pointer-events-auto"
    >
      <ul className="flex items-center gap-1 px-1 py-1 whitespace-nowrap">
        {accounts.map((a) => {
          const selected = a.id === selectedAccountId;
          return (
            <li key={a.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => selectAccount(a.id)}
                onDoubleClick={() => enterAccount(a.id)}
                className={`btn btn-sm btn-pill btn-ghost ${selected ? "is-active" : ""}`}
              >
                {a.name}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AccountCard({ view }: { view: NonNullable<ReturnType<typeof useAccountView>> }) {
  const enterAccount = useTerritoryStore((s) => s.enterAccount);
  const selectAccount = useTerritoryStore((s) => s.selectAccount);
  const { account, score, coverage, opportunities } = view;
  const live = opportunities.filter((o) => o.maturity).length;
  const dormant = view.units.filter((u) => u.unit.status === "dormant").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-semibold leading-tight tracking-tight">{account.name}</h2>
            <SeasonChip season={account.season} />
          </div>
          <p className="text-[12px] text-paper-40 mt-0.5">{account.sector}</p>
        </div>
        <div className="text-right flex-none">
          <Eyebrow>Demo strategic score</Eyebrow>
          <div className="text-[24px] font-semibold tabular-nums leading-none mt-1">
            {score}
            <span className="text-[12px] text-paper-40 font-medium ml-1.5">{scoreBand(score)}</span>
          </div>
        </div>
      </div>

      <p className="text-[13px] text-paper-60 leading-relaxed">{account.thesis}</p>

      <div className="grid grid-cols-[1fr_1.15fr_1fr_1.4fr] gap-3 text-[13px]">
        <Mini label="Mapped" value={coverage.mapped} />
        <Mini label="Penetration" value={formatPercent(coverage.penetration)} />
        <Mini label="Meetings" value={coverage.meetings} />
        <Mini label="Opportunities" value={live} />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-[11.5px] text-paper-40">
          {account.businessUnits.length} organizations
          {dormant > 0 && ` · ${dormant} dormant`}
        </span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => selectAccount(null)}>
            Dismiss
          </button>
          <button type="button" className="btn btn-primary" onClick={() => enterAccount(account.id)}>
            Enter account
          </button>
        </div>
      </div>
    </div>
  );
}

function MarketCard({ market }: { market: (typeof territory.market)[number] }) {
  const selectMarket = useTerritoryStore((s) => s.selectMarket);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Deprioritized market</Eyebrow>
          <h2 className="text-[20px] font-semibold leading-tight tracking-tight mt-1">{market.name}</h2>
        </div>
        <EvidenceTag type={market.evidenceType} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Mini label="Potential" value={market.potential} />
        <Mini label="Current friction" value={market.friction} />
      </div>
      <div>
        <Eyebrow>Seller hypothesis</Eyebrow>
        <p className="text-[13px] text-paper-60 leading-relaxed mt-1">{market.hypothesis}</p>
      </div>
      <p className="text-[11.5px] text-paper-40">
        Biggest company ≠ automatically best account. This is a seller hypothesis, not a fact about {market.name}.
      </p>
      <div className="flex justify-end">
        <button type="button" className="btn btn-ghost" onClick={() => selectMarket(null)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="eyebrow truncate">{label}</span>
      <span className="text-[15px] font-medium tabular-nums leading-tight mt-0.5">{value}</span>
    </div>
  );
}
