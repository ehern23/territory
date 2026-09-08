import * as THREE from "three";
import { seededRng } from "@/lib/random";

/**
 * Territory composition: eight strategic accounts occupy an irregular
 * stretch of land — a clearing, a slope, a back ridge — inside a much
 * larger forest. Camera looks from +Z toward −Z.
 */

export const FOREST_CENTER = new THREE.Vector3(6, 0, -36);

const ACCOUNT_SLOTS: Record<string, [number, number]> = {
  jpmc: [10, 18],
  goldman: [-52, -14],
  meta: [78, -22],
  apple: [-92, -68],
  blackrock: [118, -78],
  bofa: [-36, -124],
  walmart: [64, -138],
  uber: [-14, -178],
};

export function creekCenterX(z: number): number {
  return 24 + 26 * Math.sin(z * 0.011 + 0.5) + 9 * Math.sin(z * 0.028 + 1.1);
}

export function creekDistance(x: number, z: number): number {
  return Math.abs(x - creekCenterX(z));
}

function creekDepression(x: number, z: number): number {
  if (z < -210 || z > 58) return 0;
  const d = creekDistance(x, z);
  return Math.exp(-(d * d) / 36) * 2.4;
}

function rawHeight(x: number, z: number): number {
  const a = Math.sin(x * 0.0058 + 0.4) * Math.cos(z * 0.0052) * 11.2;
  const b = Math.sin(x * 0.014 + 1.4) * Math.sin(z * 0.013) * 4.4;
  const c = Math.sin(x * 0.033 + 0.2) * Math.cos(z * 0.029 + 0.8) * 1.35;
  const dx = x - 8;
  const dz = z + 40;
  const basin = Math.exp(-(dx * dx + dz * dz) / (240 * 240)) * 1.6;
  const back = THREE.MathUtils.clamp((-z - 10) / 170, 0, 1);
  const rise = back * back * (3 - 2 * back) * 11;
  const east = THREE.MathUtils.smoothstep(x, 40, 160) * 3.2;
  return a + b + c + basin + rise + east - creekDepression(x, z);
}

/** World height, with gentle lawns flattened under each strategic tree. */
export function terrainHeight(x: number, z: number): number {
  let h = rawHeight(x, z);
  for (const slot of Object.values(ACCOUNT_SLOTS)) {
    const d = Math.hypot(x - slot[0], z - slot[1]);
    if (d >= 26) continue;
    const lawn = rawHeight(slot[0], slot[1]);
    const k = 1 - d / 26;
    h = h + (lawn - h) * (k * k);
  }
  return h;
}

export function accountPosition(accountId: string): THREE.Vector3 {
  const slot = ACCOUNT_SLOTS[accountId];
  if (!slot) return new THREE.Vector3();
  const rng = seededRng("slot", accountId);
  const x = slot[0] + rng.gauss() * 1.6;
  const z = slot[1] + rng.gauss() * 1.6;
  return new THREE.Vector3(x, terrainHeight(x, z), z);
}

export function accountSlotList(): THREE.Vector3[] {
  return Object.keys(ACCOUNT_SLOTS).map((id) => accountPosition(id));
}

export function accountClearings(): { x: number; z: number }[] {
  return Object.values(ACCOUNT_SLOTS).map(([x, z]) => ({ x, z }));
}

export interface SilhouetteSlot {
  id: string;
  marketId?: string;
  position: THREE.Vector3;
  height: number;
  seed: number;
}

export function silhouetteSlots(marketIds: string[]): SilhouetteSlot[] {
  const slots: SilhouetteSlot[] = [];
  const named: { id: string; x: number; z: number }[] = [
    { id: marketIds[0] ?? "amazon", x: -248, z: -310 },
    { id: marketIds[1] ?? "microsoft", x: 262, z: -288 },
    { id: marketIds[2] ?? "google", x: 36, z: -368 },
  ];

  named.forEach((n, i) => {
    const rng = seededRng("silhouette-named", n.id);
    const x = n.x + rng.gauss() * 5;
    const z = n.z + rng.gauss() * 5;
    slots.push({
      id: `sil-m-${n.id}`,
      marketId: n.id,
      position: new THREE.Vector3(x, terrainHeight(x, z), z),
      height: 20 + rng.range(0, 6),
      seed: 1400 + i,
    });
  });

  const ambience = 14;
  for (let i = 0; i < ambience; i++) {
    const rng = seededRng("silhouette", i);
    const t = i / Math.max(1, ambience - 1);
    const angle = Math.PI * (0.55 + t * 0.9) + rng.gauss() * 0.1;
    const radius = 280 + rng.range(0, 130);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 50;
    slots.push({
      id: `sil-${i}`,
      position: new THREE.Vector3(x, terrainHeight(x, z), z),
      height: 15 + rng.range(0, 9),
      seed: 900 + i,
    });
  }
  return slots;
}
