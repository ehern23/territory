"use client";

import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView } from "@/store/selectors";
import { STATUS_DESCRIPTION, STATUS_LABEL, STATUS_ORDER, nextStatus, statusRank } from "@/domain/relationship";
import type { RelationshipStatus } from "@/domain/types";
import { LEAF_HEX } from "@/three/palette";
import { EvidenceTag, Kv, Section, StatusDot } from "../ui";
import { PanelHeader } from "./PanelHeader";

const ACTION_LABEL: Record<RelationshipStatus, string> = {
  unworked: "Reset to unworked",
  researched: "Mark researched",
  contacted: "Mark contacted",
  engaged: "Mark engaged",
  meeting: "Book meeting",
  disqualified: "Disqualify",
};

export function ProspectPanel({ view, prospectId }: { view: AccountView; prospectId: string }) {
  const prospect = useTerritoryStore((s) => s.prospectsById[prospectId]);
  const setProspectStatus = useTerritoryStore((s) => s.setProspectStatus);
  const undo = useTerritoryStore((s) => s.undo);
  const canUndo = useTerritoryStore((s) => s.undoStack.length > 0);
  const undoLabel = useTerritoryStore((s) => s.undoStack[s.undoStack.length - 1]?.label);
  const selectProspect = useTerritoryStore((s) => s.selectProspect);
  const allActivities = useTerritoryStore((s) => s.activities);
  const activities = allActivities.filter((a) => a.prospectId === prospectId);

  if (!prospect) return null;
  const bu = view.units.find((u) => u.unit.id === prospect.businessUnitId);
  const team = bu?.teams.find((t) => t.team.id === prospect.teamId);
  const status = prospect.relationshipStatus;
  const rank = statusRank(status);
  const inProgress = status !== "meeting" && status !== "disqualified";
  const next = nextStatus(status);

  const action = (target: RelationshipStatus, label: string, primary = false) => {
    const targetRank = statusRank(target);
    const done = status !== "disqualified" && rank >= targetRank;
    return (
      <button
        key={target}
        type="button"
        className={`btn ${primary && !done ? "btn-primary" : ""} justify-between`}
        disabled={done}
        onClick={() => setProspectStatus(prospectId, target)}
      >
        <span>{label}</span>
        {done && <span aria-hidden className="text-paper-40">✓</span>}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        eyebrow={prospect.persona}
        title={prospect.name}
        aside={
          <>
            <span className="text-[12.5px] text-paper-60">{prospect.title}</span>
            <EvidenceTag type={prospect.evidenceType} label="Demo person" />
          </>
        }
        onClose={() => selectProspect(null)}
      />

      {/* Relationship progression */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[13px]">
            <StatusDot status={status} size={10} />
            {STATUS_LABEL[status]}
          </span>
          <span className="text-[11.5px] text-paper-40">{STATUS_DESCRIPTION[status]}</span>
        </div>
        <ol className="flex gap-1" aria-label="Relationship progression">
          {STATUS_ORDER.map((s, i) => (
            <li
              key={s}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                background: status !== "disqualified" && i <= rank ? LEAF_HEX[s] : "rgba(236,230,220,0.08)",
              }}
              aria-current={s === status ? "step" : undefined}
              title={STATUS_LABEL[s]}
            />
          ))}
        </ol>
        {status === "meeting" && prospect.meetingDate && (
          <p className="text-[12px] text-paper-60">
            Meeting {prospect.meetingDate} · leaf has fallen to the base of the tree.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4">
        <Kv k="Influence" v={<Influence value={prospect.influence} />} />
        <Kv k="Priority" v={<span className="capitalize">{prospect.priority}</span>} />
        <Kv k="Business unit" v={bu?.unit.shortName ?? bu?.unit.name} />
        <Kv k="Team" v={team?.team.name} />
      </div>

      <Section title="Actions">
        <div className="grid grid-cols-1 gap-2">
          {inProgress && next && action(next, ACTION_LABEL[next], true)}
          <div className="grid grid-cols-2 gap-2">
            {inProgress &&
              STATUS_ORDER.filter((s) => statusRank(s) > rank + 1).map((s) => action(s, ACTION_LABEL[s]))}
            {status !== "disqualified" && status !== "meeting" && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setProspectStatus(prospectId, "disqualified")}
              >
                Disqualify
              </button>
            )}
            {(status === "disqualified" || status === "meeting") && (
              <button type="button" className="btn btn-ghost" onClick={() => setProspectStatus(prospectId, "unworked")}>
                Reset to unworked
              </button>
            )}
            {canUndo && (
              <button type="button" className="btn btn-ghost" onClick={undo}>
                {undoLabel ?? "Undo"}
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Why this person">
        <p className="text-[13px] text-paper-60 leading-relaxed">{prospect.hypothesis}</p>
      </Section>

      {prospect.painPoints.length > 0 && (
        <Section title="Likely priorities">
          <ul className="flex flex-wrap gap-1.5">
            {prospect.painPoints.map((p) => (
              <li key={p} className="tag normal-case tracking-normal text-[11.5px] font-medium">
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {prospect.signals.length > 0 && (
        <Section title="Signals">
          <ul className="flex flex-col gap-1 text-[12.5px] text-paper-60">
            {prospect.signals.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Outreach timeline">
        {activities.length === 0 && !prospect.lastTouch ? (
          <p className="text-[12.5px] text-paper-40">No outreach yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-[12.5px]">
            {prospect.lastTouch && activities.length === 0 && (
              <li className="flex justify-between gap-3 text-paper-60">
                <span>Last touch</span>
                <span className="text-paper-40 tabular-nums">{prospect.lastTouch}</span>
              </li>
            )}
            {[...activities].reverse().map((a) => (
              <li key={a.id} className="flex justify-between gap-3 text-paper-60">
                <span className="truncate">{a.message}</span>
                <span className="text-paper-40 tabular-nums whitespace-nowrap">
                  {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Next action">
        <p className="text-[13px] leading-relaxed">{prospect.nextAction}</p>
      </Section>

      {prospect.notes.length > 0 && (
        <Section title="Notes">
          <ul className="flex flex-col gap-1 text-[12.5px] text-paper-60">
            {prospect.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Influence({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Influence ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-3 rounded-sm"
          style={{ background: i <= value ? "rgba(236,230,220,0.85)" : "rgba(236,230,220,0.12)" }}
          aria-hidden
        />
      ))}
    </span>
  );
}
