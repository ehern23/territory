"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { ScatterSpec, MeshPart } from "./forestKit";

export function InstancedParts({
  parts,
  items,
}: {
  parts: MeshPart[];
  items: ScatterSpec[];
}) {
  if (items.length === 0 || parts.length === 0) return null;
  return (
    <>
      {parts.map((part, i) => (
        <InstancedScatter key={i} geometry={part.geometry} material={part.material} items={items} />
      ))}
    </>
  );
}

export function InstancedScatter({
  geometry,
  material,
  items,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: ScatterSpec[];
}) {
  const mesh = useMemo(() => {
    const inst = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
    inst.frustumCulled = false;
    inst.castShadow = false;
    inst.receiveShadow = false;
    const m = new THREE.Matrix4();
    items.forEach((item, i) => {
      m.compose(item.position, item.quaternion, item.scale);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.count = Math.max(1, items.length);
    return inst;
  }, [geometry, material, items]);
  useEffect(
    () => () => {
      mesh.dispose();
    },
    [mesh],
  );
  if (items.length === 0) return null;
  return <primitive object={mesh} />;
}
