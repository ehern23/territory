"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { terrainHeight } from "./layout";
import { InstancedParts } from "./InstancedParts";
import {
  placeGroves,
  placeInBounds,
  useForestFloorMaterial,
  useGltfParts,
  ASSET,
} from "./forestKit";

function Terrain() {
  const view = useTerritoryStore((s) => s.view);
  const mode = useTerritoryStore((s) => s.mode);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const geometry = useMemo(() => {
    const geo = new THREE.CircleGeometry(980, isTouch ? 40 : 88);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    if (geo.attributes.uv) geo.setAttribute("uv2", geo.attributes.uv);
    geo.computeVertexNormals();
    return geo;
  }, [isTouch]);
  const material = useForestFloorMaterial();
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4.5);
    const roots = mode === "account" && view === "roots";
    material.opacity += ((roots ? 0 : 1) - material.opacity) * k;
    material.depthWrite = material.opacity > 0.55;
  });
  return <mesh geometry={geometry} material={material} receiveShadow={false} />;
}

function Ecology() {
  const view = useTerritoryStore((s) => s.view);
  const mode = useTerritoryStore((s) => s.mode);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const group = useRef<THREE.Group>(null);
  const d = isTouch ? 0.34 : 1;

  const treesNear = useGltfParts(ASSET.tree, "group");
  const treesFar = useGltfParts(ASSET.treeLod, "group");
  const grass = useGltfParts(ASSET.grass, "group");
  const ferns = useGltfParts(ASSET.fern, "group");
  const shrubs = useGltfParts(ASSET.shrub, "group");
  const rocksAll = useGltfParts(ASSET.rock, "separate");
  const rockA = useMemo(() => rocksAll.slice(0, 1), [rocksAll]);
  const rockB = useMemo(() => rocksAll.slice(1, 2), [rocksAll]);
  const rockC = useMemo(() => rocksAll.slice(2, 3), [rocksAll]);

  const nearTrees = useMemo(
    () => [
      ...placeGroves(Math.round(8 * d), 3, 6, "trees-near", -240, 250, -230, 50, [4.6, 6.2], 0, 32, 18, {
        keepSightline: true,
      }),
      ...placeGroves(Math.round(5 * d), 3, 5, "trees-vale", -160, 200, -200, -40, [4.2, 5.8], 0, 32, 16, {
        keepSightline: true,
      }),
      ...placeGroves(Math.round(4 * d), 3, 5, "trees-left", -300, -30, -160, 90, [3.2, 4.4], 0, 28, 16, {
        keepSightline: true,
      }),
      ...placeGroves(Math.round(4 * d), 3, 5, "trees-right", 88, 330, -160, 90, [3.2, 4.4], 0, 28, 16, {
        keepSightline: true,
      }),
      ...placeInBounds(Math.round(8 * d), "trees-fg", -160, 190, 118, 210, [2.4, 3.4], 0, 22, {
        keepSightline: true,
      }),
    ],
    [d],
  );
  const farTrees = useMemo(
    () => [
      ...placeGroves(Math.round(7 * d), 4, 7, "trees-far", -400, 410, -560, -220, [6.5, 11], 0, 40, 30, {
        keepSightline: true,
      }),
      ...placeInBounds(Math.round(28 * d), "wall-back", -720, 720, -820, -300, [12, 20], 0, 44, {
        keepSightline: true,
      }),
      ...placeInBounds(Math.round(22 * d), "belt", -480, 500, -400, -230, [10, 16], 0, 38, {
        keepSightline: true,
      }),
      ...placeInBounds(Math.round(10 * d), "wall-left", -760, -300, -420, 30, [6, 10], 0, 36, {
        keepSightline: true,
      }),
      ...placeInBounds(Math.round(10 * d), "wall-right", 280, 760, -420, 30, [6, 10], 0, 36, {
        keepSightline: true,
      }),
    ],
    [d],
  );
  const grassClumps = useMemo(
    () => [
      ...placeInBounds(Math.round(50 * d), "grass", -200, 220, -200, 95, [2.4, 3.6], 0, 10),
      ...placeInBounds(Math.round(16 * d), "grass-fg", -55, 105, 18, 120, [3.4, 5.2], 0, 11),
    ],
    [d],
  );
  const fernItems = useMemo(
    () => [
      ...placeInBounds(Math.round(24 * d), "fern", -190, 220, -200, 80, [5.5, 8.5], 0, 16, {
        keepSightline: true,
      }),
      ...placeInBounds(Math.round(8 * d), "fern-edge-l", -95, -16, 22, 112, [6, 9.5], 0, 8),
      ...placeInBounds(Math.round(8 * d), "fern-edge-r", 68, 145, 22, 112, [6, 9.5], 0, 8),
    ],
    [d],
  );
  const shrubItems = useMemo(
    () =>
      placeInBounds(Math.round(16 * d), "shrub", -220, 240, -230, 85, [1.8, 2.6], 0, 16, {
        keepSightline: true,
      }),
    [d],
  );
  const rocks1 = useMemo(
    () => placeInBounds(Math.round(5 * d), "rock-a", -160, 180, -170, 80, [0.7, 1.35], (s) => -0.22 * s, 12),
    [d],
  );
  const rocks2 = useMemo(
    () => placeInBounds(Math.round(4 * d), "rock-b", -150, 170, -160, 70, [0.55, 1.15], (s) => -0.24 * s, 14),
    [d],
  );
  const rocks3 = useMemo(
    () => placeInBounds(Math.round(4 * d), "rock-c", -80, 120, 30, 100, [0.6, 1.2], (s) => -0.2 * s, 14),
    [d],
  );

  useFrame(() => {
    if (group.current) group.current.visible = !(mode === "account" && view === "roots");
  });

  return (
    <group ref={group}>
      <InstancedParts parts={treesNear} items={nearTrees} />
      <InstancedParts parts={treesFar} items={farTrees} />
      <InstancedParts parts={grass} items={grassClumps} />
      <InstancedParts parts={ferns} items={fernItems} />
      <InstancedParts parts={shrubs} items={shrubItems} />
      <InstancedParts parts={rockA} items={rocks1} />
      <InstancedParts parts={rockB} items={rocks2} />
      <InstancedParts parts={rockC} items={rocks3} />
    </group>
  );
}

export function Landscape() {
  return (
    <group>
      <Terrain />
      <Suspense fallback={null}>
        <Ecology />
      </Suspense>
    </group>
  );
}
