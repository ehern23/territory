"use client";

import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { AccountView } from "@/store/selectors";
import { scoreBand, scoreContribution } from "@/domain/score";
import { EvidenceTag, Meter, Section } from "../ui";
import { PanelHeader } from "./PanelHeader";

export function ScorePanel({ view }: { view: AccountView }) {
  const setView = useTerritoryStore((s) => s.setView);
  const { account, score } = view;
  const components = [...account.strategicScore.components].sort(
    (a, b) => scoreContribution(b, account.strategicScore) - scoreContribution(a, account.strategicScore),
  );

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader
        eyebrow="Demo strategic score"
        title={
          <span className="tabular-nums">
            {score}
            <span className="text-[13px] text-paper-40 font-medium ml-2">{scoreBand(score)}</span>
          </span>
        }
        aside={<span className="text-[12.5px] text-paper-60">{account.name}</span>}
        onClose={() => setView("tree")}
      />

      <p className="text-[12.5px] text-paper-40 leading-relaxed -mt-2">
        A weighted, explainable composite for demonstration. Competitive friction counts against the score. This is
        an illustrative Demo Strategic Score, not Vercel&apos;s actual methodology.
      </p>

      <Section title="Components">
        <ul className="flex flex-col gap-3">
          {components.map((c) => {
            const contribution = scoreContribution(c, account.strategicScore);
            const inverted = c.key === "competitive-friction";
            return (
              <li key={c.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px]">{c.label}</span>
                  <span className="flex items-center gap-2">
                    <EvidenceTag type={c.evidenceType} />
                    <span className="text-[12px] tabular-nums text-paper-60 w-10 text-right">
                      {inverted ? `${c.value}/10` : `${c.value}/10`}
                    </span>
                  </span>
                </div>
                <Meter value={(inverted ? 10 - c.value : c.value) / 10} color={inverted ? "#8b8378" : undefined} />
                <p className="text-[12px] text-paper-40 leading-relaxed">
                  {c.reasoning}{" "}
                  <span className="text-paper-20">
                    · +{contribution} pts{inverted ? " (friction inverted)" : ""}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
