"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { seededRng } from "@/lib/random";
import type { TreeSkeleton } from "./treeGen";
import { ASSET } from "./forestKit";

/**
 * Non-interactive canopy mass. Prospect leaves remain the only clickable foliage.
 * Decorative cards follow branch dormancy and stay visually secondary (olive, no status colors).
 */
const UP = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4();
const tmpS = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();

export function DecorativeCanopy({
  skeleton,
  active,
}: {
  skeleton: TreeSkeleton;
  active: boolean;
}) {
  const businessUnitsById = useTerritoryStore((s) => s.businessUnitsById);
  const reactivations = useTerritoryStore((s) => s.reactivations);
  const reducedMotion = useTerritoryStore((s) => s.reducedMotion);
  const maps = useTexture({
    map: ASSET.foliageDiff,
    normalMap: ASSET.foliageNor,
    arm: ASSET.foliageArm,
  });
  const perLeaf = active ? 6 : 8;
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(active ? 1.2 : 3.1, active ? 1.4 : 3.5);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, 0.04 + uv.getX(i) * 0.5, 0.06 + uv.getY(i) * 0.88);
    }
    uv.needsUpdate = true;
    return g;
  }, [active]);
  const material = useMemo(() => {
    maps.map.colorSpace = THREE.SRGBColorSpace;
    maps.normalMap.colorSpace = THREE.NoColorSpace;
    maps.arm.colorSpace = THREE.NoColorSpace;
    const m = new THREE.MeshStandardMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.arm,
      metalnessMap: maps.arm,
      color: new THREE.Color("#4a6040"),
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide,
      alphaTest: 0.28,
      transparent: false,
      depthWrite: true,
      envMapIntensity: 0.2,
    });
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
           vec4 sampledDiffuseColor = texture2D( map, vMapUv );
           diffuseColor.a *= smoothstep(0.03, 0.12, dot(sampledDiffuseColor.rgb, vec3(0.3, 0.54, 0.16)));
           diffuseColor.rgb *= sampledDiffuseColor.rgb;
         #endif`,
      );
    };
    m.customProgramCacheKey = () => "deco-foliage-luma";
    return m;
  }, [maps]);

  const anchors = useMemo(() => {
    const list: { position: THREE.Vector3; quaternion: THREE.Quaternion; businessUnitId: string; scale: number }[] = [];
    skeleton.leaves.forEach((leaf) => {
      const rng = seededRng(skeleton.seed, leaf.prospectId, "canopy");
      for (let j = 0; j < perLeaf; j++) {
        const yaw = rng.range(0, Math.PI * 2);
        const pitch = rng.range(-0.5, 0.35);
        const r = rng.range(0.4, 1.65);
        const position = leaf.position.clone().add(
          new THREE.Vector3(Math.cos(yaw) * r, rng.range(-0.1, 0.9), Math.sin(yaw) * r),
        );
        const quaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(pitch, yaw, rng.gauss() * 0.4, "YXZ"),
        );
        list.push({
          position,
          quaternion,
          businessUnitId: leaf.businessUnitId,
          scale: active ? 0.58 + (j % 5) * 0.08 : 1.15 + (j % 5) * 0.12,
        });
      }
    });
    if (active) {
      skeleton.twigs.forEach((twig, i) => {
        if (!twig.businessUnitId) return;
        const rng = seededRng(skeleton.seed, twig.id, "canopy-twig");
        const n = 2 + (i % 2);
        for (let k = 0; k < n; k++) {
          const t = rng.range(0.25, 0.95);
          const position = twig.curve
            .getPointAt(t)
            .add(new THREE.Vector3(rng.gauss() * 0.35, rng.range(0.05, 0.55), rng.gauss() * 0.35));
          const quaternion = new THREE.Quaternion().setFromUnitVectors(
            UP,
            new THREE.Vector3(rng.gauss(), 1, rng.gauss()).normalize(),
          );
          list.push({ position, quaternion, businessUnitId: twig.businessUnitId, scale: 0.55 });
        }
      });
    }
    return list;
  }, [skeleton, perLeaf, active]);

  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) mesh.raycast = () => undefined;
  }, [anchors.length]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = performance.now();
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const bu = businessUnitsById[a.businessUnitId];
      let presence = 1;
      if (bu?.status === "dormant") presence = 0;
      else if (bu?.status === "reactivating") {
        const r = reactivations.find((x) => x.businessUnitId === a.businessUnitId);
        const e = r ? (now - r.startedAt) / 2200 : 0.4;
        presence = THREE.MathUtils.clamp(e, 0, 1);
      }
      const sway = active && !reducedMotion ? Math.sin(now * 0.0007 + i) * 0.04 : 0;
      tmpQ.copy(a.quaternion);
      if (sway) {
        tmpQ2.setFromAxisAngle(UP, sway);
        tmpQ.multiply(tmpQ2);
      }
      const s = a.scale * presence;
      tmpS.set(s, s, s);
      tmpM.compose(a.position, tmpQ, tmpS);
      mesh.setMatrixAt(i, tmpM);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  if (anchors.length === 0) return null;
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, anchors.length]}
      frustumCulled={false}
      castShadow={false}
    />
  );
}
