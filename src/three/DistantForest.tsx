"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { seededRng } from "@/lib/random";
import { terrainHeight } from "./layout";

type Layer = {
  count: number;
  inner: number;
  outer: number;
  minHeight: number;
  maxHeight: number;
  color: string;
  opacity: number;
  seed: string;
};

const LAYERS: Layer[] = [
  { count: 72, inner: 340, outer: 500, minHeight: 74, maxHeight: 112, color: "#294b43", opacity: 0.78, seed: "near" },
  { count: 64, inner: 470, outer: 660, minHeight: 86, maxHeight: 132, color: "#35584f", opacity: 0.61, seed: "middle" },
  { count: 52, inner: 620, outer: 850, minHeight: 102, maxHeight: 150, color: "#42665c", opacity: 0.46, seed: "far" },
];

function coniferTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // A narrow trunk and uneven branch shelves make the card read as an old
  // conifer at distance. Dabs and fine twigs keep the silhouette open rather
  // than turning it into a geometric cone.
  const rng = seededRng("distant-pnw-conifer-texture");
  ctx.clearRect(0, 0, 128, 256);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(60, 188, 8, 68);
  for (let shelf = 0; shelf < 12; shelf++) {
    const y = 24 + shelf * 14 + rng.range(-3, 3);
    const half = 9 + shelf * 4.35 + rng.range(-3, 4);
    ctx.lineCap = "round";
    ctx.lineWidth = rng.range(2.5, 5.2);
    ctx.beginPath();
    ctx.moveTo(64 + rng.range(-2, 2), y - 3);
    ctx.quadraticCurveTo(64 - half * 0.45, y + rng.range(-4, 3), 64 - half, y + rng.range(-1, 7));
    ctx.moveTo(64 + rng.range(-2, 2), y - 2);
    ctx.quadraticCurveTo(64 + half * 0.48, y + rng.range(-4, 3), 64 + half, y + rng.range(-1, 7));
    ctx.stroke();
    // Short upturned twigs break up the shelf rhythm.
    for (const side of [-1, 1]) {
      for (let twig = 0; twig < 3; twig++) {
        const tx = 64 + side * rng.range(half * 0.35, half * 0.95);
        const ty = y + rng.range(0, 7);
        ctx.lineWidth = rng.range(1, 2.2);
        ctx.beginPath();
        ctx.moveTo(tx, ty + 3);
        ctx.lineTo(tx + side * rng.range(3, 9), ty - rng.range(2, 8));
        ctx.stroke();
      }
    }
    for (let dab = 0; dab < 8 + shelf; dab++) {
      const dx = 64 + rng.range(-half, half);
      const dy = y + rng.range(-5, 9);
      ctx.beginPath();
      ctx.arc(dx, dy, rng.range(1.2, 3.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Fine transparent gaps suggest needles and sky between branch shelves.
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 130; i++) {
    const x = rng.range(23, 105);
    const y = rng.range(28, 213);
    ctx.fillRect(x, y, rng.range(1, 3), rng.range(1, 5));
  }
  ctx.globalCompositeOperation = "source-over";
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function mountainRidge(seed: string, radius: number, segments: number, base: number, height: number) {
  const rng = seededRng(seed);
  const positions: number[] = [];
  const indices: number[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= segments; i++) widths.push(height * (0.9 + Math.sin(i / segments * Math.PI * 8 + seed.length) * .20 + Math.sin(i / segments * Math.PI * 18) * .07 + Math.sin(i / segments * Math.PI * 32) * .025));
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const r = radius;
    const y = base + widths[i];
    positions.push(Math.cos(a) * r, y, Math.sin(a) * r);
    positions.push(Math.cos(a) * r, base, Math.sin(a) * r);
  }
  for (let i = 0; i < segments; i++) {
    const n = i * 2;
    indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function ForestLayer({ layer, texture }: { layer: Layer; texture: THREE.Texture }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        color: layer.color,
        transparent: true,
        opacity: layer.opacity,
        alphaTest: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      }),
    [layer.color, layer.opacity, texture],
  );
  const matrices = useMemo(() => {
    const rng = seededRng("distant-pnw", layer.seed);
    const out: THREE.Matrix4[] = [];
    for (let i = 0; i < layer.count; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const radius = rng.range(layer.inner, layer.outer);
      const height = rng.range(layer.minHeight, layer.maxHeight);
      const scale = height * rng.range(0.86, 1.08);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = terrainHeight(x, z) + rng.range(-1.5, 1.5);
      const s = new THREE.Vector3(scale * rng.range(0.55, 0.75), scale, scale * rng.range(0.55, 0.75));
      // Two crossed cards per tree; each instance is one card and shares the
      // same material/geometry, so setup is paid once and never per frame.
      for (const yaw of [angle + Math.PI / 4, angle + Math.PI / 4 + Math.PI / 2]) {
        out.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), s));
      }
    }
    return out;
  }, [layer]);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.frustumCulled = true;
    mesh.raycast = () => undefined;
  }, [matrices]);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} matrixAutoUpdate={false} />;
}

export function DistantForest() {
  const view = useTerritoryStore((s) => s.view);
  const texture = useMemo(coniferTexture, []);
  const ridges = useMemo(
    () => [
      { geometry: mountainRidge("ridge-a", 1080, 160, -70, 258), color: "#6f8e8a", opacity: 0.88 },
      { geometry: mountainRidge("ridge-b", 1290, 160, -82, 300), color: "#93aaa6", opacity: 0.8 },
    ],
    [],
  );
  const ridgeMaterials = useMemo(
    () => ridges.map((r) => new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: r.opacity, depthWrite: false, side: THREE.DoubleSide, fog: false })),
    [ridges],
  );
  useEffect(() => {
    return () => {
      texture.dispose();
      ridges.forEach((r) => r.geometry.dispose());
      ridgeMaterials.forEach((m) => m.dispose());
    };
  }, [ridgeMaterials, ridges, texture]);

  return (
    <group name="distant-forest" visible={view !== "roots"}>
      {ridges.map((ridge, i) => <mesh key={i} geometry={ridge.geometry} material={ridgeMaterials[i]} />)}
      {LAYERS.map((layer) => <ForestLayer key={layer.seed} layer={layer} texture={texture} />)}
    </group>
  );
}
