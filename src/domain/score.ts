import type { StrategicScore, StrategicScoreComponent } from "./types";

/**
 * Demo Strategic Score: an explainable 0-100 composite.
 * This is a demonstration heuristic, not any vendor's actual methodology.
 */
export function computeStrategicScore(score: StrategicScore): number {
  const totalWeight = score.components.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = score.components.reduce((s, c) => {
    // Competitive friction is a drag: high friction lowers the score.
    const v = c.key === "competitive-friction" ? 10 - c.value : c.value;
    return s + (v / 10) * c.weight;
  }, 0);
  return Math.round((weighted / totalWeight) * 100);
}

export function scoreContribution(
  component: StrategicScoreComponent,
  score: StrategicScore,
): number {
  const totalWeight = score.components.reduce((s, c) => s + c.weight, 0);
  const v =
    component.key === "competitive-friction" ? 10 - component.value : component.value;
  return Math.round(((v / 10) * component.weight * 100) / totalWeight);
}

export function scoreBand(value: number): string {
  if (value >= 80) return "Tier 1";
  if (value >= 65) return "Tier 2";
  if (value >= 50) return "Tier 3";
  return "Watch";
}
