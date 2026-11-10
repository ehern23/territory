"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { OpportunityMaturity } from "@/domain/types";
import { maturityRank } from "@/domain/opportunity";
import type { AccountTreeModel } from "./accountTrees";
import { floraDebug, floraGlobals } from "./floraMaterials";

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
const GLOW: Record<OpportunityMaturity, number> = { seed: 0, bud: 0.06, young: 0.14, growing: 0.24, ripe: 0.4 };

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

/** Pseudo-random but stable offsets for the fruit in a cluster. */
const CLUSTER = [
  [0, 0, 0],
  [0.95, 0.35, 0.3],
  [-0.8, 0.55, 0.45],
  [0.2, 0.6, -0.95],
] as const;

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
  const fruitRefs = useRef<(THREE.Mesh | null)[]>([]);
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: COLOR[spec.maturity].clone(),
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.5,
      sheen: 0.5,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color("#ffe2b0"),
      emissive: COLOR[spec.maturity].clone(),
      emissiveIntensity: 0,
    });
    // Organic skin: a paler shoulder by the stem, a deeper blush underneath,
    // and faint vertical streaks.
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
           // A warm rim keeps ripening fruit legible from the territory overview.
           float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.5);
           totalEmissiveRadiance += emissive * rim * 2.2;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
           float yy = clamp(vObj.y * 0.5 + 0.5, 0.0, 1.0);
           float streak = 0.5 + 0.5 * sin(atan(vObj.z, vObj.x) * 9.0 + vObj.y * 2.0);
           diffuseColor.rgb *= mix(0.72, 1.12, smoothstep(0.1, 0.95, yy));
           diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.02, 0.8), smoothstep(0.75, 1.0, yy));
           diffuseColor.rgb *= 0.94 + 0.06 * streak;`,
        );
    };
    m.customProgramCacheKey = () => "territory-fruit-v2";
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => material.dispose(), [material]);

  // Bigger deals bear more fruit; each fruit grows with maturity.
  const count = Math.max(1, Math.min(4, Math.round(spec.value / 900_000)));
  const radius = 2.1 * (0.95 + 0.35 * Math.sqrt(Math.min(4_000_000, spec.value) / 3_000_000)) * (0.62 + 0.11 * maturityRank(spec.maturity));
  const stemLen = 2.4;
  // The cluster's size is a lightly under-damped spring: fruit swells a touch
  // past its size and settles, both when it first sets and each time the deal
  // matures. Each fruit of a cluster also has its own 0-1 "set" so a second
  // or third fruit grows in rather than appearing at full size.
  const scaleRef = useRef(0);
  const velRef = useRef(0);
  const setRef = useRef<number[]>([]);
  const stemRef = useRef<THREE.Group>(null);
  const phase = useMemo(() => (hang.x * 13.1 + hang.z * 7.3) % 10, [hang]);

  useFrame((_, rawDt) => {
    const settle = floraDebug.settle;
    const dt = settle ? 10 : Math.min(rawDt, 0.1);
    const k = 1 - Math.exp(-dt * 1.8);
    if (settle) {
      scaleRef.current = radius;
      velRef.current = 0;
    } else {
      // Two sub-steps keep the spring stable through a slow frame.
      const h = dt / 2;
      for (let i = 0; i < 2; i++) {
        velRef.current += ((radius - scaleRef.current) * 26 - velRef.current * 6.2) * h;
        scaleRef.current += velRef.current * h;
      }
    }
    material.color.lerp(COLOR[spec.maturity], k);
    material.emissive.lerp(COLOR[spec.maturity], k);
    const targetGlow = GLOW[spec.maturity] * (selected ? 1.5 : 1);
    material.emissiveIntensity += (targetGlow - material.emissiveIntensity) * k;
    const r = Math.max(0.001, scaleRef.current);
    const stem = Math.min(1, (r / radius) * 1.6);
    if (stemRef.current) stemRef.current.scale.y = stem;
    fruitRefs.current.forEach((m, i) => {
      if (!m) return;
      const o = CLUSTER[i];
      const shrink = i === 0 ? 1 : 0.86 - i * 0.05;
      // Later fruit wait for the ones before them.
      const before = i === 0 ? 1 : (setRef.current[i - 1] ?? 0);
      const set = settle ? 1 : (setRef.current[i] ?? 0) + (1 - (setRef.current[i] ?? 0)) * (1 - Math.exp(-dt * 3.2)) * (before > 0.6 ? 1 : 0);
      setRef.current[i] = set;
      const grown = set * set * (3 - 2 * set);
      m.scale.setScalar(Math.max(0.001, r * shrink * grown));
      m.position.set(o[0] * r * 1.05 * grown, -stemLen * stem - r + o[1] * r * grown, o[2] * r * 1.05 * grown);
    });
    if (group.current) {
      // The cluster hangs and swings gently with the wind.
      const t = floraGlobals.uTime.value;
      group.current.rotation.z = Math.sin(t * 1.3 + phase) * 0.06;
      group.current.rotation.x = Math.cos(t * 1.1 + phase) * 0.05;
    }
  });

  const handlers = onSelect
    ? {
        onClick: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          onSelect(spec.opportunityId);
        },
        onPointerOver: (e: { stopPropagation: () => void }) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          document.body.style.cursor = "";
        },
      }
    : {};

  return (
    <group ref={group} position={hang}>
      {/* Scaled about the twig it hangs from, so the stem grows downward. */}
      <group ref={stemRef}>
        <mesh position={[0, -stemLen / 2, 0]}>
          <cylinderGeometry args={[0.07, 0.13, stemLen, 6]} />
          <meshStandardMaterial color="#4f4430" roughness={0.9} />
        </mesh>
      </group>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            fruitRefs.current[i] = m;
          }}
          geometry={sphere}
          material={material}
          castShadow
          {...handlers}
        />
      ))}
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
