"use client";

import type { ReactNode } from "react";
import type { EvidenceType, RelationshipStatus, Season } from "@/domain/types";
import { STATUS_LABEL } from "@/domain/relationship";
import { LEAF_HEX, SEASON_HEX } from "@/three/palette";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function EvidenceTag({ type, label }: { type: EvidenceType; label?: string }) {
  const text = label ?? (type === "verified" ? "Verified" : type === "inference" ? "Inference" : "Demo");
  const glyph = type === "verified" ? "●" : type === "inference" ? "◐" : "○";
  return (
    <span className={`tag tag-${type}`} title={EVIDENCE_HELP[type]}>
      <span aria-hidden style={{ fontSize: 8 }}>{glyph}</span>
      {text}
    </span>
  );
}

export const EVIDENCE_HELP: Record<EvidenceType, string> = {
  verified: "Publicly sourced information",
  inference: "Seller hypothesis based on available evidence",
  demo: "Synthetic demonstration data",
};

export function StatusDot({ status, size = 8 }: { status: RelationshipStatus; size?: number }) {
  return (
    <span
      className="dot"
      style={{ width: size, height: size, background: LEAF_HEX[status] }}
      aria-hidden
    />
  );
}

export function StatusChip({ status }: { status: RelationshipStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-paper-60">
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SeasonChip({ season, label }: { season: Season; label?: string }) {
  return (
    <span className="tag" style={{ color: SEASON_HEX[season] }}>
      <span className="dot" style={{ width: 6, height: 6, background: SEASON_HEX[season] }} aria-hidden />
      {label ?? season}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="eyebrow">{label}</span>
      <span className="text-[17px] font-medium leading-tight tabular-nums">{value}</span>
      {sub && <span className="text-[11.5px] text-paper-40 truncate">{sub}</span>}
    </div>
  );
}

export function Meter({ value, color }: { value: number; color?: string }) {
  return (
    <div className="meter" role="img" aria-label={`${Math.round(value * 100)} percent`}>
      <span style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, background: color }} />
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Eyebrow>{title}</Eyebrow>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Kv({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-[13px]">
      <span className="text-paper-40">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

export function PriorityLabel({ priority }: { priority: "high" | "medium" | "low" }) {
  const map = { high: "High", medium: "Medium", low: "Low" };
  return <span className="capitalize">{map[priority]}</span>;
}

export function Spark() {
  return (
    <span aria-hidden className="text-accent" style={{ fontSize: 12, lineHeight: 1 }}>
      ✦
    </span>
  );
}
