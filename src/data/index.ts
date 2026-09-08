import type { MarketSilhouette, Territory } from "@/domain/types";
import { jpmc } from "./accounts/jpmc";
import { walmart } from "./accounts/walmart";
import { disney } from "./accounts/disney";
import { amex } from "./accounts/amex";
import { nike } from "./accounts/nike";
import { starbucks } from "./accounts/starbucks";
import { marriott } from "./accounts/marriott";
import { ford } from "./accounts/ford";

/**
 * Deprioritized market: large companies that are not in the active territory.
 * These are seller hypotheses, not judgments about the companies.
 */
export const market: MarketSilhouette[] = [
  {
    id: "amazon",
    name: "Amazon",
    potential: "Extremely high",
    friction: "High",
    hypothesis:
      "Very large technical workforce, but first-party developer tooling and incumbent dynamics may reduce expected near-term win probability.",
    evidenceType: "inference",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    potential: "Extremely high",
    friction: "Very high",
    hypothesis:
      "One of the largest engineering organizations in the world, but it owns competing developer tooling. Expected near-term return on seller effort is low.",
    evidenceType: "inference",
  },
  {
    id: "google",
    name: "Google",
    potential: "Extremely high",
    friction: "Very high",
    hypothesis:
      "Deep internal developer infrastructure and first-party AI coding tools. Strategically interesting, commercially distant.",
    evidenceType: "inference",
  },
];

export const territory: Territory = {
  accounts: [jpmc, walmart, disney, amex, nike, starbucks, marriott, ford],
  market,
};
