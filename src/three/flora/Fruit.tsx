"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { OpportunityMaturity } from "@/domain/types";
import { maturityRank } from "@/domain/opportunity";
import type { AccountTreeModel } from "./accountTrees";
import { floraGlobals } from "./floraMaterials";

/**
 * Opportunity fruit. Size follows deal value, colour and inner glow follow
 * maturity: a pale green bud in discovery, amber when qualified, a deep warm
 * red that softly glows when commercial. The glow keeps pipeline legible from
 * the territory overview without flashing or particles.
 */

export interface FruitSpec {
  opportunityId: string;
  maturity: OpportunityMaturity;
  value: number;
}

const COLOR: Record<OpportunityMaturity, THREE.Color> = {
  seed: new THREE.Color("#93a35e"),
  bud: new THREE.Color("#c2c063"),
  young: new THREE.Color("#e2a843"),
  growing: new THREE.Color("#e57a3a"),
  ripe: new THREE.Color("#cf3f2c"),
};
const GLOW: Record<OpportunityMaturity, number> = { seed: 0, bud: 0.25, young: 0.6, growing: 1.0, ripe: 1.6 };

const sphere = new THREE.SphereGeometry(1, 28, 20);
// A slightly pear-shaped fruit reads as organic rather than as a ball.
{
  const p = sphere.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = 1 + (y < 0 ? 0.12 * -y : -0.1 * y);
    p.setXYZ(i, p.getX(i) * k, y * 1.08, p.getZ(i) * k);
  }
  sphere.computeVertexNormals();
}

function OneFruit({
  spec,
  hang,
  selected,
  onSelect,
}: {
  spec: FruitSpec;
  hang: THREE.Vector3;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: COLOR[spec.maturity].clone(),
        roughness: 0.35,
        clearcoat: 0.6,
        clearcoatRoughness: 0.35,
        sheen: 0.4,
        sheenColor: new THREE.Color("#ffd9a0"),
        emissive: COLOR[spec.maturity].clone(),
        emissiveIntensity: 0,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const stemLen = 2.2;
  const radius = 1.6 * (1.0 + 1.25 * Math.sqrt(Math.min(4_000_000, spec.value) / 3_000_000)) * (0.6 + 0.1 * maturityRank(spec.maturity));
  const scaleRef = useRef(0);
  const phase = useMemo(() => Math.random() * 10, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const k = 1 - Math.exp(-dt * 1.8);
    scaleRef.current += (radius - scaleRef.current) * k;
    material.color.lerp(COLOR[spec.maturity], k);
    material.emissive.lerp(COLOR[spec.maturity], k);
    const targetGlow = GLOW[spec.maturity] * (selected ? 1.6 : 1);
    material.emissiveIntensity += (targetGlow - material.emissiveIntensity) * k;
    if (mesh.current) {
      const s = scaleRef.current;
      mesh.current.scale.setScalar(Math.max(0.001, s));
      mesh.current.position.y = -stemLen - s;
    }
    if (group.current) {
      // Hangs and swings gently with the wind.
      const t = floraGlobals.uTime.value;
      group.current.rotation.z = Math.sin(t * 1.3 + phase) * 0.06;
      group.current.rotation.x = Math.cos(t * 1.1 + phase) * 0.05;
    }
  });

  return (
    <group ref={group} position={hang}>
      <mesh position={[0, -stemLen / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, stemLen, 5]} />
        <meshStandardMaterial color="#4f4430" roughness={0.9} />
      </mesh>
      <mesh
        ref={mesh}
        geometry={sphere}
        material={material}
        castShadow
        onClick={(e) => {
          if (!onSelect) return;
          e.stopPropagation();
          onSelect(spec.opportunityId);
        }}
        onPointerOver={(e) => {
          if (!onSelect) return;
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      />
    </group>
  );
}

export function FruitCluster({
  model,
  fruit,
  selectedId,
  onSelect,
}: {
  model: AccountTreeModel;
  fruit: FruitSpec[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <group>
      {fruit.map((spec) => (
        <OneFruit
          key={spec.opportunityId}
          spec={spec}
          hang={model.fruitHang[spec.opportunityId] ?? model.shape.crownCenter}
          selected={selectedId === spec.opportunityId}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
