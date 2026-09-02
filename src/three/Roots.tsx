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

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: ROOT_COLOR.clone(), roughness: 0.95, transparent: true, opacity: 0 }),
    [],
  );
  const nodeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color("#c9b9a3"), roughness: 0.5, transparent: true, opacity: 0 }),
    [],
  );
  useEffect(() => () => { material.dispose(); nodeMaterial.dispose(); }, [material, nodeMaterial]);

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 5);
    const target = rootsMode ? 1 : 0;
    material.opacity += (target - material.opacity) * k;
    nodeMaterial.opacity += (target - nodeMaterial.opacity) * k;
    if (groupRef.current) groupRef.current.visible = material.opacity > 0.02;
  });

  if (!model.geometry.roots) return null;
  const items = account?.intelligence ?? [];

  return (
    <group ref={groupRef}>
      <mesh geometry={model.geometry.roots} material={material} />
      {model.skeleton.rootAnchors.map((anchor) => {
        const item = items.find((i) => i.id === anchor.intelligenceId);
        if (!item) return null;
        const selected = selectedRootId === item.id;
        return (
          <group key={item.id} position={anchor.position}>
            <mesh
              material={nodeMaterial}
              scale={selected ? 0.34 : 0.26}
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
                position={[0, -0.9, 0]}
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
