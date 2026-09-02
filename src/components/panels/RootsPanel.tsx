"use client";

import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView } from "@/store/selectors";
import { EVIDENCE_HELP, EvidenceTag, Section } from "../ui";
import { PanelHeader } from "./PanelHeader";

export function RootsPanel({ view }: { view: AccountView }) {
  const setView = useTerritoryStore((s) => s.setView);
  const selectedRootId = useTerritoryStore((s) => s.selectedRootId);
  const selectRoot = useTerritoryStore((s) => s.selectRoot);
  const items = view.account.intelligence;
  const selected = items.find((i) => i.id === selectedRootId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        eyebrow="Roots"
        title="Account intelligence"
        aside={<span className="text-[12.5px] text-paper-60">{view.account.name}</span>}
        onClose={() => setView("tree")}
      />

      {selected ? (
        <div className="surface-quiet p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">{selected.category}</div>
              <h3 className="text-[15px] font-medium mt-1 leading-snug">{selected.title}</h3>
            </div>
            <EvidenceTag type={selected.evidenceType} />
          </div>
          <p className="text-[13px] text-paper-60 leading-relaxed">{selected.summary}</p>
          {selected.sourceLabel && (
            <p className="text-[12px] text-paper-40">
              Source:{" "}
              {selected.sourceUrl ? (
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-paper-20 hover:text-paper">
                  {selected.sourceLabel}
                </a>
              ) : (
                selected.sourceLabel
              )}
            </p>
          )}
          <p className="text-[11.5px] text-paper-40">{EVIDENCE_HELP[selected.evidenceType]}.</p>
          <button type="button" className="btn btn-ghost btn-sm self-start -ml-2" onClick={() => selectRoot(null)}>
            ← All roots
          </button>
        </div>
      ) : (
        <p className="text-[13px] text-paper-60 leading-relaxed -mt-2">
          What the seller knows about this account, beneath the surface. Select a root in the scene or below.
        </p>
      )}

      <Section title="Intelligence">
        <ul className="flex flex-col -mx-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`row-btn ${selectedRootId === item.id ? "is-active" : ""}`}
                onClick={() => selectRoot(item.id)}
                aria-pressed={selectedRootId === item.id}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] text-paper-40 uppercase tracking-wider">{item.category}</span>
                  <span className="block text-[13.5px] truncate">{item.title}</span>
                </span>
                <EvidenceTag type={item.evidenceType} />
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <div className="hairline" />
      <ul className="flex flex-col gap-1 text-[11.5px] text-paper-40">
        <li><span className="text-[#a7c3a0]">● Verified</span> — publicly sourced information</li>
        <li><span className="text-accent">◐ Inference</span> — seller hypothesis based on available evidence</li>
        <li><span>○ Demo</span> — synthetic demonstration information</li>
      </ul>
    </div>
  );
}
