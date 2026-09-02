"use client";

import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView } from "@/store/selectors";
import type { ActivityKind } from "@/domain/types";
import { PanelHeader } from "./PanelHeader";

const KIND_COLOR: Record<ActivityKind, string> = {
  researched: "#8c9852",
  contacted: "#c9a24a",
  engaged: "#c9703a",
  meeting: "#9c3a29",
  disqualified: "#6b645c",
  opportunity: "#b04444",
  reactivation: "#9fc27a",
  score: "#d1a15a",
  undo: "#8b8378",
};

export function ActivityPanel({ view }: { view: AccountView }) {
  const setView = useTerritoryStore((s) => s.setView);
  const allActivities = useTerritoryStore((s) => s.activities);
  const activities = allActivities.filter((a) => a.accountId === view.account.id);
  const selectProspect = useTerritoryStore((s) => s.selectProspect);
  const focusBusinessUnit = useTerritoryStore((s) => s.focusBusinessUnit);
  const selectOpportunity = useTerritoryStore((s) => s.selectOpportunity);

  const items = [...activities].reverse();

  return (
    <div className="flex flex-col gap-4">
      <PanelHeader
        eyebrow="Activity"
        title={view.account.name}
        aside={<span className="text-[12.5px] text-paper-60">{items.length} events in this session and demo history</span>}
        onClose={() => setView("tree")}
      />
      {items.length === 0 ? (
        <p className="text-[13px] text-paper-40">No activity yet.</p>
      ) : (
        <ol className="flex flex-col -mx-2">
          {items.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="row-btn min-h-[40px] py-1.5"
                onClick={() => {
                  if (a.prospectId) selectProspect(a.prospectId);
                  else if (a.opportunityId) selectOpportunity(a.opportunityId);
                  else if (a.businessUnitId) focusBusinessUnit(a.businessUnitId);
                }}
              >
                <span className="dot" style={{ background: KIND_COLOR[a.kind] }} aria-hidden />
                <span className="flex-1 min-w-0 text-[13px] truncate">{a.message}</span>
                <time className="text-[11px] text-paper-40 tabular-nums whitespace-nowrap" dateTime={new Date(a.timestamp).toISOString()}>
                  {relative(a.timestamp)}
                </time>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function relative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}
