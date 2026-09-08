"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import type { TreeModel } from "./useTreeModel";
import { ROOT_COLOR } from "./palette";

const EVIDENCE_GLYPH = { verified: "●", inference: "◐", demo: "○" } as const;

/**
 * Root system: account intelligence beneath the tree. Always present in the
 * scene but only visible when the ground fades in Roots mode, so the camera
 * composition shift reveals structure that was there all along.
 */
export function Roots({ model, active }: { model: TreeModel; active: boolean }) {
  const view = useTerritoryStore((s) => (active ? s.view : "tree"));
  const selectedRootId = useTerritoryStore((s) => s.selectedRootId);
  const selectRoot = useTerritoryStore((s) => s.selectRoot);
  const account = useTerritoryStore((s) => s.accountsById[model.skeleton.accountId]);
  const rootsMode = view === "roots";
  const radius = model.skeleton.trunkRadius;

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ROOT_COLOR.clone(),
        roughness: 0.92,
        metalness: 0.04,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const nodeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#cfc0a8"),
        roughness: 0.45,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const soilMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#141210"),
        roughness: 1,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      material.dispose();
      nodeMaterial.dispose();
      soilMaterial.dispose();
    },
    [material, nodeMaterial, soilMaterial],
  );

  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 5);
    const target = rootsMode ? 1 : 0;
    material.opacity += (target - material.opacity) * k;
    nodeMaterial.opacity += (target - nodeMaterial.opacity) * k;
    soilMaterial.opacity += ((rootsMode ? 0.88 : 0) - soilMaterial.opacity) * k;
    if (lightRef.current) {
      lightRef.current.intensity += ((rootsMode ? 2.4 : 0) - lightRef.current.intensity) * k;
    }
    if (groupRef.current) groupRef.current.visible = material.opacity > 0.02 || soilMaterial.opacity > 0.02;
  });

  if (!model.geometry.roots) return null;
  const items = account?.intelligence ?? [];
  const bowlR = Math.max(model.skeleton.height * 0.42, radius * 14);

  return (
    <group ref={groupRef}>
      <mesh geometry={model.geometry.roots} material={material} />
      {/* Soil chamber: looking beneath the surface, not at glowing tubes in a void. */}
      <mesh material={soilMaterial} rotation={[Math.PI, 0, 0]} position={[0, 0.2, 0]} scale={[bowlR, bowlR * 0.42, bowlR]}>
        <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, -radius * 3, radius * 2]}
        color="#c4a07a"
        intensity={0}
        distance={bowlR * 1.6}
        decay={2}
      />
      <hemisphereLight args={["#6d5c4a", "#1a1612", rootsMode ? 0.55 : 0]} />
      {model.skeleton.rootAnchors.map((anchor) => {
        const item = items.find((i) => i.id === anchor.intelligenceId);
        if (!item) return null;
        const selected = selectedRootId === item.id;
        return (
          <group key={item.id} position={anchor.position}>
            <mesh
              material={nodeMaterial}
              scale={selected ? 0.48 : 0.36}
              onClick={
                active && rootsMode
                  ? (e) => {
                      e.stopPropagation();
                      selectRoot(item.id);
                    }
                  : undefined
              }
            >
              <sphereGeometry args={[1, 14, 10]} />
            </mesh>
            {rootsMode && active && (
              <Html
                center
                position={[0, -1.15, 0]}
                zIndexRange={[10, 0]}
                style={{ pointerEvents: "auto" }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectRoot(item.id);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`root-label ${selected ? "is-selected" : ""}`}
                  aria-pressed={selected}
                >
                  <span className="root-label__glyph" aria-hidden>{EVIDENCE_GLYPH[item.evidenceType]}</span>
                  {item.category}
                </button>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
