import type { BusinessUnit, Prospect, Team } from "./types";
import { isEngagedOrBeyond, isWorked } from "./relationship";

export interface CoverageStats {
  mapped: number;
  researched: number;
  contacted: number;
  engaged: number;
  meetings: number;
  disqualified: number;
  /** contacted + engaged + meeting over mapped (excluding disqualified). */
  penetration: number;
}

export function coverageOf(prospects: Prospect[]): CoverageStats {
  const active = prospects.filter((p) => !p.latent);
  const stats: CoverageStats = {
    mapped: 0,
    researched: 0,
    contacted: 0,
    engaged: 0,
    meetings: 0,
    disqualified: 0,
    penetration: 0,
  };
  for (const p of active) {
    if (p.relationshipStatus === "disqualified") {
      stats.disqualified += 1;
      continue;
    }
    stats.mapped += 1;
    if (p.relationshipStatus === "researched") stats.researched += 1;
    if (isWorked(p.relationshipStatus)) stats.contacted += 1;
    if (isEngagedOrBeyond(p.relationshipStatus)) stats.engaged += 1;
    if (p.relationshipStatus === "meeting") stats.meetings += 1;
  }
  stats.penetration = stats.mapped === 0 ? 0 : stats.contacted / stats.mapped;
  return stats;
}

export function teamProspects(team: Team): Prospect[] {
  return team.prospects;
}

export function businessUnitProspects(bu: BusinessUnit): Prospect[] {
  return bu.teams.flatMap((t) => t.prospects);
}

export function formatPercent(v: number): string {
  return `${Math.round(v * 100)}%`;
}
