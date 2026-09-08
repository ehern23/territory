import * as THREE from "three";
import { seededRng } from "@/lib/random";

/**
 * Forest composition: eight strategic accounts as a crescent grove opening
 * toward the camera (positive Z), with depth, elevation, and breathing room.
 * Distant silhouettes sit on a rear arc so they never compete in the foreground.
 */

export const FOREST_CENTER = new THREE.Vector3(0, 0, -48);

/**
 * World-space slots in metres-ish units. Camera looks from +Z toward −Z.
 * Foreground / midground / background are deliberate, not a random scatter.
 */
const ACCOUNT_SLOTS: Record<string, [number, number]> = {
  // Foreground — the three monuments the camera meets first
  jpmc: [0, 28],
  goldman: [-62, 4],
  meta: [64, 10],
  // Midground
  apple: [-88, -48],
  blackrock: [92, -42],
  // Background — the ridge of the territory
  bofa: [-42, -98],
  walmart: [48, -104],
  uber: [8, -148],
};

export function terrainHeight(x: number, z: number): number {
  const a = Math.sin(x * 0.0068 + 0.35) * Math.cos(z * 0.0062) * 6.2;
  const b = Math.sin(x * 0.017 + 1.6) * Math.sin(z * 0.015) * 2.4;
  const c = Math.sin(x * 0.038 + 0.2) * Math.cos(z * 0.033 + 0.7) * 0.7;
  const dx = x;
  const dz = z + 48;
  const grove = Math.exp(-(dx * dx + dz * dz) / (210 * 210)) * 2.6;
  const back = THREE.MathUtils.clamp((-z - 20) / 140, 0, 1);
  const rise = back * back * (3 - 2 * back) * 5.4;
  return a + b + c + grove + rise - creekDepression(x, z);
}

/** A shallow dry wash threading the grove, never under a trunk. */
function creekDepression(x: number, z: number): number {
  if (z < -170 || z > 46) return 0;
  const cx = 16 * Math.sin(z * 0.015 + 0.55) + 18;
  const d = x - cx;
  return Math.exp(-(d * d) / 42) * 2.1;
}

export function creekDistance(x: number, z: number): number {
  const cx = 16 * Math.sin(z * 0.015 + 0.55) + 18;
  return Math.abs(x - cx);
}

export function accountPosition(accountId: string): THREE.Vector3 {
  const slot = ACCOUNT_SLOTS[accountId];
  if (!slot) return new THREE.Vector3();
  const rng = seededRng("slot", accountId);
  const x = slot[0] + rng.gauss() * 1.8;
  const z = slot[1] + rng.gauss() * 1.8;
  return new THREE.Vector3(x, terrainHeight(x, z), z);
}

export function accountSlotList(): THREE.Vector3[] {
  return Object.keys(ACCOUNT_SLOTS).map((id) => accountPosition(id));
}

export interface SilhouetteSlot {
  id: string;
  marketId?: string;
  position: THREE.Vector3;
  height: number;
  seed: number;
}

/**
 * Broader-market trees live on a rear arc: smaller, farther, lower contrast.
 * Named markets are placed explicitly so they never duplicate a territory account.
 */
export function silhouetteSlots(marketIds: string[]): SilhouetteSlot[] {
  const slots: SilhouetteSlot[] = [];
  const named: { id: string; x: number; z: number }[] = [
    { id: marketIds[0] ?? "amazon", x: -210, z: -268 },
    { id: marketIds[1] ?? "microsoft", x: 228, z: -252 },
    { id: marketIds[2] ?? "google", x: 28, z: -318 },
  ];

  named.forEach((n, i) => {
    const rng = seededRng("silhouette-named", n.id);
    const x = n.x + rng.gauss() * 4;
    const z = n.z + rng.gauss() * 4;
    slots.push({
      id: `sil-m-${n.id}`,
      marketId: n.id,
      position: new THREE.Vector3(x, terrainHeight(x, z), z),
      height: 18 + rng.range(0, 5),
      seed: 1400 + i,
    });
  });

  const ambience = 12;
  for (let i = 0; i < ambience; i++) {
    const rng = seededRng("silhouette", i);
    const t = i / (ambience - 1);
    const angle = Math.PI * (0.62 + t * 0.76) + rng.gauss() * 0.08;
    const radius = 250 + rng.range(0, 110);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 40;
    slots.push({
      id: `sil-${i}`,
      position: new THREE.Vector3(x, terrainHeight(x, z), z),
      height: 14 + rng.range(0, 8),
      seed: 900 + i,
    });
  }
  return slots;
}
