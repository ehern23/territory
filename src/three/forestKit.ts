"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF, useTexture } from "@react-three/drei";
import { seededRng } from "@/lib/random";
import { accountClearings, creekDistance, terrainHeight } from "./layout";

export const ASSET = {
  forestDiff: "/assets/textures/forest_floor/diff.jpg",
  forestNor: "/assets/textures/forest_floor/nor.jpg",
  forestArm: "/assets/textures/forest_floor/arm.jpg",
  barkDiff: "/assets/textures/bark/diff.jpg",
  barkNor: "/assets/textures/bark/nor.jpg",
  barkArm: "/assets/textures/bark/arm.jpg",
  foliageDiff: "/assets/textures/foliage/leaves_diff.jpg",
  foliageNor: "/assets/textures/foliage/leaves_nor.jpg",
  foliageArm: "/assets/textures/foliage/leaves_arm.jpg",
  hdri: "/assets/hdri/noon_grass_1k.hdr",
  fern: "/assets/models/fern_02.glb",
  grass: "/assets/models/grass_medium_01.glb",
  rock: "/assets/models/rock_moss_set_01.glb",
  shrub: "/assets/models/shrub_02.glb",
  tree: "/assets/models/tree_small_02.glb",
  treeLod: "/assets/models/tree_small_02_lod.glb",
} as const;

useGLTF.preload(ASSET.fern);
useGLTF.preload(ASSET.grass);
useGLTF.preload(ASSET.rock);
useGLTF.preload(ASSET.shrub);
useGLTF.preload(ASSET.tree);
useGLTF.preload(ASSET.treeLod);

export interface ScatterSpec {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

export interface MeshPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/** Distant market silhouettes stay readable through the forest wall. */
const MARKET_KEEP = [
  { x: -248, z: -310, r: 22 },
  { x: 262, z: -288, r: 22 },
  { x: 36, z: -368, r: 22 },
];

function inClearing(x: number, z: number, clearings: { x: number; z: number }[], r: number) {
  if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < r)) return true;
  return MARKET_KEEP.some((c) => Math.hypot(x - c.x, z - c.z) < c.r);
}

export function inSightline(x: number, z: number) {
  return z > 10 && z < 115 && x > -20 && x < 78;
}

function wrapMaps(tex: THREE.Texture, repeat: number, srgb: boolean) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function useForestFloorMaterial() {
  const maps = useTexture({
    map: ASSET.forestDiff,
    normalMap: ASSET.forestNor,
    arm: ASSET.forestArm,
  });
  const material = useMemo(() => {
    wrapMaps(maps.map, 36, true);
    wrapMaps(maps.normalMap, 36, false);
    wrapMaps(maps.arm, 36, false);
    return new THREE.MeshStandardMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.arm,
      metalnessMap: maps.arm,
      aoMap: maps.arm,
      aoMapIntensity: 0.55,
      color: new THREE.Color("#d8d2c2"),
      roughness: 0.95,
      metalness: 0.02,
      envMapIntensity: 0.35,
      normalScale: new THREE.Vector2(0.85, 0.85),
      transparent: true,
      opacity: 1,
    });
  }, [maps]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

export function useBarkMaterial() {
  const maps = useTexture({
    map: ASSET.barkDiff,
    normalMap: ASSET.barkNor,
    arm: ASSET.barkArm,
  });
  const material = useMemo(() => {
    wrapMaps(maps.map, 1, true);
    maps.map.repeat.set(1.4, 4);
    wrapMaps(maps.normalMap, 1, false);
    maps.normalMap.repeat.set(1.4, 4);
    wrapMaps(maps.arm, 1, false);
    maps.arm.repeat.set(1.4, 4);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#c4b49c"),
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.arm,
      metalnessMap: maps.arm,
      aoMap: maps.arm,
      aoMapIntensity: 0.65,
      roughness: 0.9,
      metalness: 0.03,
      envMapIntensity: 0.28,
      normalScale: new THREE.Vector2(1.1, 1.1),
    });
  }, [maps]);
  return material;
}

function cloneStandard(mat: THREE.Material): THREE.Material {
  const c = mat.clone();
  c.side = mat.side;
  if (c instanceof THREE.MeshStandardMaterial) {
    c.envMapIntensity = 0.4;
    if (c.transparent || c.alphaTest > 0) {
      c.alphaTest = Math.max(c.alphaTest, 0.22);
      c.transparent = false;
      c.depthWrite = true;
    }
  }
  return c;
}

/** Bake a glTF scene into instance-ready parts. `group` shares one transform; `separate` centers each mesh. */
export function partsFromScene(scene: THREE.Object3D, mode: "group" | "separate"): MeshPart[] {
  scene.updateMatrixWorld(true);
  const parts: MeshPart[] = [];
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    if (mode === "separate") {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (box) {
        const c = new THREE.Vector3();
        box.getCenter(c);
        geometry.translate(-c.x, -c.y, -c.z);
      }
    }
    const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    parts.push({ geometry, material: cloneStandard(src) });
  });
  return parts;
}

export function useGltfParts(url: string, mode: "group" | "separate") {
  const gltf = useGLTF(url);
  return useMemo(() => partsFromScene(gltf.scene, mode), [gltf, mode]);
}

export function composeItem(
  x: number,
  z: number,
  s: number,
  rng: ReturnType<typeof seededRng>,
  yLift: number | ((s: number) => number),
): ScatterSpec {
  const lift = typeof yLift === "function" ? yLift(s) : yLift;
  return {
    position: new THREE.Vector3(x, terrainHeight(x, z) + lift, z),
    quaternion: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, rng.range(0, Math.PI * 2), 0),
    ),
    scale: new THREE.Vector3(s, s, s),
  };
}

export function placeInBounds(
  count: number,
  seed: string,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  scaleRange: [number, number],
  yLift: number | ((s: number) => number),
  excludeR: number,
  opts: { avoidCreek?: number; keepSightline?: boolean } = {},
): ScatterSpec[] {
  const rng = seededRng("landscape-v13", seed);
  const clearings = accountClearings();
  const out: ScatterSpec[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 14) {
    guard += 1;
    const x = rng.range(x0, x1);
    const z = rng.range(z0, z1);
    if (inClearing(x, z, clearings, excludeR)) continue;
    if (opts.avoidCreek && creekDistance(x, z) < opts.avoidCreek && z > -210 && z < 70) continue;
    if (opts.keepSightline && inSightline(x, z)) continue;
    out.push(composeItem(x, z, rng.range(scaleRange[0], scaleRange[1]), rng, yLift));
  }
  return out;
}

export function placeGroves(
  groves: number,
  perMin: number,
  perMax: number,
  seed: string,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  scaleRange: [number, number],
  yLift: number | ((s: number) => number),
  excludeR: number,
  groveRadius: number,
  opts: { keepSightline?: boolean } = {},
): ScatterSpec[] {
  const rng = seededRng("landscape-v13-grove", seed);
  const clearings = accountClearings();
  const out: ScatterSpec[] = [];
  let guard = 0;
  let made = 0;
  while (made < groves && guard < groves * 18) {
    guard += 1;
    const cx = rng.range(x0, x1);
    const cz = rng.range(z0, z1);
    if (inClearing(cx, cz, clearings, excludeR + groveRadius * 0.35)) continue;
    if (opts.keepSightline && inSightline(cx, cz)) continue;
    made += 1;
    const n = rng.int(perMin, perMax);
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(rng.range(0.05, 1)) * groveRadius;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (inClearing(x, z, clearings, excludeR)) continue;
      out.push(composeItem(x, z, rng.range(scaleRange[0], scaleRange[1]), rng, yLift));
    }
  }
  return out;
}

/** Distant forest wall around the territory so the ground never meets a void. */
export function placeRing(
  count: number,
  seed: string,
  rMin: number,
  rMax: number,
  scaleRange: [number, number],
  yLift: number | ((s: number) => number),
  excludeR: number,
  opts: { keepSightline?: boolean } = {},
): ScatterSpec[] {
  const rng = seededRng("landscape-v13-ring", seed);
  const clearings = accountClearings();
  const out: ScatterSpec[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 16) {
    guard += 1;
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(rMin, rMax);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r - 40;
    if (inClearing(x, z, clearings, excludeR)) continue;
    if (opts.keepSightline && inSightline(x, z)) continue;
    out.push(composeItem(x, z, rng.range(scaleRange[0], scaleRange[1]), rng, yLift));
  }
  return out;
}
