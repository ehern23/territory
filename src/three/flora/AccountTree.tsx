"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { getAccountTree, type AccountTreeModel } from "./accountTrees";
import { getFoliageAtlas } from "./foliageAtlas";
import { MAX_LIMBS, createBarkMaterial, createFoliageMaterial, createTreeUniforms } from "./floraMaterials";
import { BARK_TEX, configureBarkMaps } from "./barkMaps";

export interface TreeVisualState {
  /** 0 withered … 1 thriving. */
  vitality: number;
  /** Per limb: 0 normal, 1 dormant. */
  dormant: number[];
  /** Per limb: 0..1 fresh spring growth. */
  spring: number[];
  /** Per limb emphasis: 1 present, 0 quieted. */
  focus: number[];
  /** Whole-tree quieting (filters, other account active). */
  dim: number;
  /** Hover / selection lift. */
  glow: number;
}

interface Props {
  accountId: string;
  position: THREE.Vector3;
  /** Read every frame; the tree eases toward it. */
  stateRef: React.MutableRefObject<TreeVisualState>;
  onSelect?: () => void;
  onHover?: (hovered: boolean) => void;
  children?: (model: AccountTreeModel) => React.ReactNode;
}

function ease(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function AccountTree({ accountId, position, stateRef, onSelect, onHover, children }: Props) {
  const model = useMemo(() => getAccountTree(accountId), [accountId]);
  const maps = useTexture(BARK_TEX);
  const uniforms = useMemo(() => createTreeUniforms(stateRef.current.vitality), [stateRef]);
  const bark = useMemo(() => createBarkMaterial(configureBarkMaps(maps), uniforms), [maps, uniforms]);
  const foliage = useMemo(() => createFoliageMaterial(getFoliageAtlas(), uniforms), [uniforms]);

  useEffect(
    () => () => {
      bark.dispose();
      foliage.material.dispose();
      foliage.depth.dispose();
    },
    [bark, foliage],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = stateRef.current;
    // Health changes are deliberately slow so a transformation is watchable.
    uniforms.uVitality.value = ease(uniforms.uVitality.value, s.vitality, 1.1, dt);
    uniforms.uDim.value = ease(uniforms.uDim.value, s.dim, 4, dt);
    uniforms.uGlow.value = ease(uniforms.uGlow.value, s.glow, 6, dt);
    for (let i = 0; i < MAX_LIMBS; i++) {
      uniforms.uLimbDormant.value[i] = ease(uniforms.uLimbDormant.value[i], s.dormant[i] ?? 0, 1.4, dt);
      uniforms.uLimbSpring.value[i] = ease(uniforms.uLimbSpring.value[i], s.spring[i] ?? 0, 1.2, dt);
      uniforms.uLimbFocus.value[i] = ease(uniforms.uLimbFocus.value[i], s.focus[i] ?? 1, 5, dt);
    }
  });

  const hit = useMemo(() => {
    if (!model) return null;
    const { crownRadii, crownTop } = model.shape;
    const r = Math.max(crownRadii.x, crownRadii.z) * 0.72;
    const g = new THREE.CylinderGeometry(r, r * 0.45, crownTop, 12, 1);
    g.translate(0, crownTop / 2, 0);
    return g;
  }, [model]);
  useEffect(() => () => hit?.dispose(), [hit]);

  if (!model || !hit) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.();
  };

  return (
    <group position={position}>
      <mesh geometry={model.geometries.bark} material={bark} castShadow receiveShadow />
      <mesh
        geometry={model.geometries.foliage}
        material={foliage.material}
        customDepthMaterial={foliage.depth}
        castShadow
        receiveShadow
        raycast={() => undefined}
      />
      <mesh
        geometry={hit}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover?.(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
          onHover?.(false);
        }}
      >
        <meshBasicMaterial visible={false} />
      </mesh>
      {children?.(model)}
    </group>
  );
}
