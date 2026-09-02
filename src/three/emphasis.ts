import type { View } from "@/store/useTerritoryStore";

export interface FocusState {
  focusBusinessUnitId: string | null;
  focusTeamId: string | null;
  view: View;
}

/**
 * Spatial emphasis: 1 = fully present, lower = quieted.
 * Selecting a business unit or team quiets everything else so the relevant
 * organizational area comes forward.
 */
export function emphasisFor(
  focus: FocusState,
  businessUnitId: string,
  teamId?: string,
): number {
  if (focus.focusTeamId) {
    if (teamId && teamId === focus.focusTeamId) return 1;
    if (businessUnitId === focus.focusBusinessUnitId) return teamId ? 0.5 : 0.8;
    return 0.3;
  }
  if (focus.focusBusinessUnitId) {
    return businessUnitId === focus.focusBusinessUnitId ? 1 : 0.34;
  }
  return 1;
}
