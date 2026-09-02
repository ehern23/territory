"use client";

import { useMemo } from "react";
import type { Account, BusinessUnit, Prospect, Team } from "@/domain/types";
import { coverageOf, type CoverageStats } from "@/domain/penetration";
import type { OpportunityState } from "@/domain/opportunity";
import { computeStrategicScore } from "@/domain/score";
import {
  currentBusinessUnits,
  evaluateVisibleOpportunities,
  useTerritoryStore,
} from "./useTerritoryStore";

export interface BusinessUnitView {
  unit: BusinessUnit;
  coverage: CoverageStats;
  teams: { team: Team; coverage: CoverageStats; prospects: Prospect[] }[];
  prospects: Prospect[];
}

export interface AccountView {
  account: Account;
  score: number;
  units: BusinessUnitView[];
  coverage: CoverageStats;
  opportunities: OpportunityState[];
}

/** Live view of an account: static structure + current relationship state. */
export function useAccountView(accountId: string | null): AccountView | null {
  const accountsById = useTerritoryStore((s) => s.accountsById);
  const businessUnitsById = useTerritoryStore((s) => s.businessUnitsById);
  const prospectsById = useTerritoryStore((s) => s.prospectsById);
  const opportunitiesById = useTerritoryStore((s) => s.opportunitiesById);

  return useMemo(() => {
    if (!accountId) return null;
    const account = accountsById[accountId];
    if (!account) return null;
    const units = currentBusinessUnits({ accountsById, businessUnitsById }, accountId).map((unit) => {
      const teams = unit.teams.map((team) => {
        const prospects = team.prospects.map((p) => prospectsById[p.id] ?? p);
        return { team, coverage: coverageOf(prospects), prospects };
      });
      const prospects = teams.flatMap((t) => t.prospects);
      return { unit, coverage: coverageOf(prospects), teams, prospects };
    });
    const allProspects = units.flatMap((u) => u.prospects);
    return {
      account,
      score: computeStrategicScore(account.strategicScore),
      units,
      coverage: coverageOf(allProspects),
      opportunities: evaluateVisibleOpportunities({ accountsById, prospectsById, opportunitiesById }, accountId),
    };
  }, [accountId, accountsById, businessUnitsById, prospectsById, opportunitiesById]);
}

export interface TerritorySummary {
  accounts: number;
  mapped: number;
  engaged: number;
  meetings: number;
  opportunities: number;
}

export function useTerritorySummary(): TerritorySummary {
  const accounts = useTerritoryStore((s) => s.accounts);
  const accountsById = useTerritoryStore((s) => s.accountsById);
  const prospectsById = useTerritoryStore((s) => s.prospectsById);
  const opportunitiesById = useTerritoryStore((s) => s.opportunitiesById);
  return useMemo(() => {
    let mapped = 0;
    let engaged = 0;
    let meetings = 0;
    let opportunities = 0;
    for (const a of accounts) {
      const prospects = a.businessUnits.flatMap((bu) =>
        bu.teams.flatMap((t) => t.prospects.map((p) => prospectsById[p.id] ?? p)),
      );
      const c = coverageOf(prospects);
      mapped += c.mapped;
      engaged += c.engaged;
      meetings += c.meetings;
      opportunities += evaluateVisibleOpportunities(
        { accountsById, prospectsById, opportunitiesById },
        a.id,
      ).filter((o) => o.maturity).length;
    }
    return { accounts: accounts.length, mapped, engaged, meetings, opportunities };
  }, [accounts, accountsById, prospectsById, opportunitiesById]);
}
