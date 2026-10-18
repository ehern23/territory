import * as THREE from "three";
import { seededRng } from "@/lib/random";

/**
 * Territory composition: the strategic accounts stand in an open meadow,
 * ringed by ordinary forest that rises toward a back ridge. Every tree inside
 * the clearing is an account; nothing else grows there taller than a shrub.
 * The establishing camera looks from +Z toward −Z.
 */

export const FOREST_CENTER = new THREE.Vector3(4, 0, -66);

/** The meadow is an ellipse; backdrop forest grows outside it. */
export const CLEARING = { x: 4, z: -66, rx: 215, rz: 165 };

const ACCOUNT_SLOTS: Record<string, [number, number]> = {
  jpmc: [6, -40],
  walmart: [-70, -14],
  disney: [80, -8],
  amex: [-128, -82],
  nike: [138, -74],
  starbucks: [-52, -124],
  marriott: [62, -132],
  ford: [-4, -186],
};

export const SUN_DIR = new THREE.Vector3(-0.86, 0.38, -0.34).normalize();

export function clearingFactor(x: number, z: number): number {
  const dx = (x - CLEARING.x) / CLEARING.rx;
  const dz = (z - CLEARING.z) / CLEARING.rz;
  return Math.sqrt(dx * dx + dz * dz);
}

function rawHeight(x: number, z: number): number {
  const a = Math.sin(x * 0.0058 + 0.4) * Math.cos(z * 0.0052) * 7.5;
  const b = Math.sin(x * 0.014 + 1.4) * Math.sin(z * 0.013) * 2.6;
  const c = Math.sin(x * 0.037 + 0.2) * Math.cos(z * 0.031 + 0.8) * 1.4;
  const d = Math.sin(x * 0.021 - z * 0.017 + 0.6) * 2.2;
  // The far side of the meadow rises into a ridge; the sides roll up gently.
  const back = THREE.MathUtils.clamp((-z - 60) / 260, 0, 1);
  const ridge = back * back * (3 - 2 * back) * 26;
  const e = clearingFactor(x, z);
  const rim = THREE.MathUtils.smoothstep(e, 0.9, 2.2) * 16;
  // Far beyond the forest the land falls away so the mesh edge hides behind the ridgelines.
  const falloff = THREE.MathUtils.smoothstep(e, 3.2, 5.5) * 70;
  return a + b + c + d + ridge + rim - falloff;
}

/** World height, with gentle lawns levelled under each strategic tree. */
export function terrainHeight(x: number, z: number): number {
  let h = rawHeight(x, z);
  for (const slot of Object.values(ACCOUNT_SLOTS)) {
    const d = Math.hypot(x - slot[0], z - slot[1]);
    if (d >= 30) continue;
    const lawn = rawHeight(slot[0], slot[1]);
    const k = 1 - d / 30;
    h = h + (lawn - h) * (k * k * (3 - 2 * k));
  }
  return h;
}

export function accountPosition(accountId: string): THREE.Vector3 {
  const slot = ACCOUNT_SLOTS[accountId];
  if (!slot) return new THREE.Vector3();
  const rng = seededRng("slot", accountId);
  const x = slot[0] + rng.gauss() * 1.2;
  const z = slot[1] + rng.gauss() * 1.2;
  return new THREE.Vector3(x, terrainHeight(x, z), z);
}

export function accountClearings(): { x: number; z: number }[] {
  return Object.values(ACCOUNT_SLOTS).map(([x, z]) => ({ x, z }));
}
