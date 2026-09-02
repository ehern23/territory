import type { RelationshipStatus } from "./types";

export const STATUS_ORDER: RelationshipStatus[] = [
  "unworked",
  "researched",
  "contacted",
  "engaged",
  "meeting",
];

export const STATUS_LABEL: Record<RelationshipStatus, string> = {
  unworked: "Unworked",
  researched: "Researched",
  contacted: "Contacted",
  engaged: "Engaged",
  meeting: "Meeting booked",
  disqualified: "Disqualified",
};

/** 0 (unworked) … 4 (meeting). Disqualified sits outside the progression. */
export function statusRank(status: RelationshipStatus): number {
  const i = STATUS_ORDER.indexOf(status);
  return i === -1 ? -1 : i;
}

export function isWorked(status: RelationshipStatus): boolean {
  return status === "contacted" || status === "engaged" || status === "meeting";
}

export function isEngagedOrBeyond(status: RelationshipStatus): boolean {
  return status === "engaged" || status === "meeting";
}

export function nextStatus(status: RelationshipStatus): RelationshipStatus | null {
  const r = statusRank(status);
  if (r === -1 || r >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[r + 1];
}

export const STATUS_DESCRIPTION: Record<RelationshipStatus, string> = {
  unworked: "Mapped, no outreach yet.",
  researched: "Context gathered, outreach being prepared.",
  contacted: "Outreach sent, awaiting a real conversation.",
  engaged: "Two-way conversation underway.",
  meeting: "Meeting on the calendar.",
  disqualified: "Not a productive use of seller time right now.",
};
