import * as THREE from "three";
import { seededRng } from "@/lib/random";

/**
 * Forest composition: eight strategic accounts in a loose, deliberately
 * uneven cluster, plus distant silhouettes representing the wider market.
 */

export const FOREST_CENTER = new THREE.Vector3(0, 0, 0);

const ACCOUNT_SLOTS: Record<string, [number, number]> = {
  // Front row
  jpmc: [0, 6],
  goldman: [-34, -10],
  meta: [36, -6],
  // Middle
  apple: [-58, -40],
  blackrock: [60, -36],
  // Back
  bofa: [-24, -70],
  walmart: [26, -74],
  uber: [-2, -104],
};

/** Spacing so the account camera (orbit radius ~60) does not sit inside a neighbour's crown. */
const SPACING = 1.4;

export function accountPosition(accountId: string): THREE.Vector3 {
  const slot = ACCOUNT_SLOTS[accountId];
  if (!slot) return new THREE.Vector3();
  const rng = seededRng("slot", accountId);
  return new THREE.Vector3(slot[0] * SPACING + rng.gauss() * 2.5, 0, slot[1] * SPACING + rng.gauss() * 2.5);
}

export interface SilhouetteSlot {
  id: string;
  marketId?: string;
  position: THREE.Vector3;
  height: number;
  seed: number;
}

/** Distant market silhouettes. Three are named and selectable; the rest are ambience. */
export function silhouetteSlots(marketIds: string[]): SilhouetteSlot[] {
  const slots: SilhouetteSlot[] = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const rng = seededRng("silhouette", i);
    const angle = (i / count) * Math.PI * 2 + rng.gauss() * 0.15 + 0.35;
    const radius = 215 + rng.range(0, 80);
    const height = 34 + rng.range(-4, 12);
    const marketId = i % 5 === 1 && marketIds.length ? marketIds[Math.floor(i / 5) % marketIds.length] : undefined;
    slots.push({
      id: `sil-${i}`,
      marketId,
      position: new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius),
      height,
      seed: 900 + i,
    });
  }
  return slots;
}
