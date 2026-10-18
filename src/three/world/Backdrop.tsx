"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { seededRng } from "@/lib/random";
import { generateTree } from "../flora/generateTree";
import { buildTreeGeometries } from "../flora/treeMeshes";
import { getFoliageAtlas } from "../flora/foliageAtlas";
import { createBarkMaterial, createFoliageMaterial, createTreeUniforms } from "../flora/floraMaterials";
import { CLEARING, clearingFactor, terrainHeight } from "../layout";
import { BARK_TEX, configureBarkMaps } from "../flora/barkMaps";

/**
 * The ordinary forest around the territory: four species built by the same
 * generator as the account trees, instanced. Not interactive and never
 * inside the meadow, so every tree in the clearing reads as an account.
 */

const SPECIES = [
  { seed: 9101, height: 34, trunkRadius: 1.2, limbs: 5, spread: 1.05, upright: 1 },
  { seed: 9202, height: 42, trunkRadius: 1.3, limbs: 4, spread: 0.72, upright: 1.35 },
  { seed: 9303, height: 26, trunkRadius: 0.9, limbs: 4, spread: 1.0, upright: 1.05 },
  { seed: 9404, height: 38, trunkRadius: 1.4, limbs: 6, spread: 1.2, upright: 0.9 },
];

interface Placement {
  matrix: THREE.Matrix4;
  color: THREE.Color;
  /** Close enough to the meadow for its shadow to matter. */
  near: boolean;
}

function placeForest(count: number): Placement[][] {
  const rng = seededRng("backdrop", count);
  const out: Placement[][] = SPECIES.map(() => []);
  let guard = 0;
  let made = 0;
  while (made < count && guard < count * 30) {
    guard++;
    const a = rng.range(0, Math.PI * 2);
    // Denser at the edge of the meadow, thinning into the haze.
    const e = 1.06 + Math.pow(rng.next(), 1.6) * 2.4;
    const x = CLEARING.x + Math.cos(a) * CLEARING.rx * e;
    const z = CLEARING.z + Math.sin(a) * CLEARING.rz * e;
    // Keep the establishing view open: nothing between camera and meadow.
    if (z > 70 && Math.abs(x - 10) < 230 && e < 2.2) continue;
    if (clearingFactor(x, z) < 1.04) continue;
    const species = rng.int(0, SPECIES.length - 1);
    const s = rng.range(0.75, 1.3) * (1 + Math.max(0, e - 1.6) * 0.25);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, terrainHeight(x, z) - 0.4, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, Math.PI * 2)),
      new THREE.Vector3(s, s, s),
    );
    const warm = rng.chance(0.12) ? rng.range(0.1, 0.3) : 0;
    const v = rng.range(0.82, 1.08);
    const color = new THREE.Color(v * (1 + warm * 0.8), v * (1 + warm * 0.2), v * (1 - warm));
    out[species].push({ matrix: m, color, near: e < 1.45 });
    made++;
  }
  return out;
}

function SpeciesInstances({
  index,
  placements,
  barkMaterial,
  foliage,
  shadows,
}: {
  index: number;
  placements: Placement[];
  barkMaterial: THREE.Material;
  foliage: { material: THREE.Material; depth: THREE.Material };
  shadows: boolean;
}) {
  const geoms = useMemo(() => {
    const sp = SPECIES[index];
    const shape = generateTree({
      seed: sp.seed,
      height: sp.height,
      trunkRadius: sp.trunkRadius,
      limbs: Array.from({ length: sp.limbs }, (_, i) => ({ weight: 0.55 + 0.45 * ((i * 7) % 5) / 4 })),
      spread: sp.spread,
      upright: sp.upright,
      depth: 1,
      cardSize: sp.height * 0.17,
      leafDensity: 1.4,
    });
    return buildTreeGeometries(shape, { lowDetail: true });
  }, [index]);

  const meshes = useMemo(() => {
    const n = Math.max(1, placements.length);
    const bark = new THREE.InstancedMesh(geoms.bark, barkMaterial, n);
    const leaves = new THREE.InstancedMesh(geoms.foliage, foliage.material, n);
    leaves.customDepthMaterial = foliage.depth;
    placements.forEach((p, i) => {
      bark.setMatrixAt(i, p.matrix);
      leaves.setMatrixAt(i, p.matrix);
      leaves.setColorAt(i, p.color);
    });
    bark.count = leaves.count = placements.length;
    for (const m of [bark, leaves]) {
      m.instanceMatrix.needsUpdate = true;
      m.castShadow = shadows;
      m.receiveShadow = true;
      m.frustumCulled = false;
      m.raycast = () => undefined;
    }
    if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    return { bark, leaves };
  }, [geoms, placements, barkMaterial, foliage, shadows]);

  useEffect(
    () => () => {
      meshes.bark.dispose();
      meshes.leaves.dispose();
    },
    [meshes],
  );
  useEffect(
    () => () => {
      geoms.bark.dispose();
      geoms.foliage.dispose();
    },
    [geoms],
  );

  return (
    <>
      <primitive object={meshes.bark} />
      <primitive object={meshes.leaves} />
    </>
  );
}

export function Backdrop() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const count = isTouch ? 170 : 420;
  const maps = useTexture(BARK_TEX);
  const uniforms = useMemo(() => createTreeUniforms(0.86), []);
  const barkMaterial = useMemo(() => createBarkMaterial(configureBarkMaps(maps), uniforms, { moss: 0.6 }), [maps, uniforms]);
  const foliage = useMemo(() => createFoliageMaterial(getFoliageAtlas(), uniforms, { translucency: 0.6 }), [uniforms]);
  const placements = useMemo(() => placeForest(count), [count]);

  useEffect(
    () => () => {
      barkMaterial.dispose();
      foliage.material.dispose();
      foliage.depth.dispose();
    },
    [barkMaterial, foliage],
  );

  return (
    <group>
      {SPECIES.map((_, i) => (
        <group key={i}>
          <SpeciesInstances
            index={i}
            placements={placements[i].filter((p) => p.near)}
            barkMaterial={barkMaterial}
            foliage={foliage}
            shadows={!isTouch}
          />
          <SpeciesInstances
            index={i}
            placements={placements[i].filter((p) => !p.near)}
            barkMaterial={barkMaterial}
            foliage={foliage}
            shadows={false}
          />
        </group>
      ))}
    </group>
  );
}
