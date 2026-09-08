"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { accountSlotList, creekDistance, terrainHeight } from "./layout";
import { seededRng } from "@/lib/random";

const TERRAIN_RADIUS = 620;
const GROUND_NEAR = new THREE.Color("#23241f");
const GROUND_FAR = new THREE.Color("#1a1b18");
const CREEK = new THREE.Color("#161512");
const ROCK = new THREE.Color("#2a2a28");
const BUSH = new THREE.Color("#2c3228");
const SAPLING_BARK = new THREE.Color("#3a3934");
const SAPLING_CROWN = new THREE.Color("#3d4636");
const HILL = new THREE.Color("#1c1c1e");

function buildTerrainGeometry(segments: number): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(TERRAIN_RADIUS, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const dist = Math.hypot(x, z + 48);
    tmp.copy(GROUND_NEAR).lerp(GROUND_FAR, THREE.MathUtils.clamp(dist / 420, 0, 1));
    const creek = Math.exp(-(creekDistance(x, z) ** 2) / 38);
    if (z > -170 && z < 48) tmp.lerp(CREEK, creek * 0.85);
    // Subtle mottling so the plane does not read as a shader demo.
    const grain = (Math.sin(x * 0.11) * Math.cos(z * 0.09) + 1) * 0.04;
    tmp.offsetHSL(0, 0, grain - 0.02);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function Terrain() {
  const view = useTerritoryStore((s) => s.view);
  const mode = useTerritoryStore((s) => s.mode);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const geometry = useMemo(() => buildTerrainGeometry(isTouch ? 48 : 96), [isTouch]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.98,
        metalness: 0,
        transparent: true,
        opacity: 1,
        depthWrite: true,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 4.5);
    const roots = mode === "account" && view === "roots";
    const target = roots ? 0 : 1;
    material.opacity += (target - material.opacity) * k;
    material.depthWrite = material.opacity > 0.55;
  });

  return <mesh geometry={geometry} material={material} />;
}

interface ScatterSpec {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

function placeScatter(
  count: number,
  seed: string,
  minR: number,
  maxR: number,
  scaleRange: [number, number],
  yLift: number,
  exclude: THREE.Vector3[],
  excludeR: number,
): ScatterSpec[] {
  const rng = seededRng("landscape", seed);
  const out: ScatterSpec[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 8) {
    guard += 1;
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.range(minR * minR, maxR * maxR));
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r - 40;
    if (exclude.some((p) => Math.hypot(x - p.x, z - p.z) < excludeR)) continue;
    if (creekDistance(x, z) < 7 && z > -160 && z < 40) continue;
    const y = terrainHeight(x, z) + yLift;
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rng.gauss() * 0.12, rng.range(0, Math.PI * 2), rng.gauss() * 0.1),
    );
    const s = rng.range(scaleRange[0], scaleRange[1]);
    const squash = rng.range(0.72, 1.15);
    out.push({
      position: new THREE.Vector3(x, y, z),
      quaternion: q,
      scale: new THREE.Vector3(s * squash, s, s / squash),
    });
  }
  return out;
}

function InstancedScatter({
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
    inst.frustumCulled = true;
    inst.castShadow = false;
    inst.receiveShadow = false;
    const m = new THREE.Matrix4();
    items.forEach((item, i) => {
      m.compose(item.position, item.quaternion, item.scale);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    return inst;
  }, [geometry, material, items]);

  useEffect(
    () => () => {
      mesh.instanceMatrix.dispose();
    },
    [mesh],
  );
  if (items.length === 0) return null;
  return <primitive object={mesh} />;
}

function Vegetation() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const trees = useMemo(accountSlotList, []);
  const rockGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const bushGeo = useMemo(() => new THREE.SphereGeometry(1, 6, 4), []);
  const trunkGeo = useMemo(() => new THREE.ConeGeometry(0.18, 1.4, 5), []);
  const crownGeo = useMemo(() => new THREE.ConeGeometry(0.7, 1.8, 6), []);
  const rockMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: ROCK, roughness: 1, metalness: 0 }),
    [],
  );
  const bushMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: BUSH, roughness: 1 }),
    [],
  );
  const barkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SAPLING_BARK, roughness: 1 }),
    [],
  );
  const crownMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SAPLING_CROWN, roughness: 0.95 }),
    [],
  );

  const rocks = useMemo(
    () => placeScatter(isTouch ? 28 : 64, "rocks", 12, 240, [0.55, 2.2], 0.2, trees, 12),
    [isTouch, trees],
  );
  const bushes = useMemo(
    () => placeScatter(isTouch ? 22 : 52, "bushes", 16, 220, [0.7, 1.8], 0.3, trees, 14),
    [isTouch, trees],
  );
  const saplings = useMemo(
    () => placeScatter(isTouch ? 10 : 22, "saplings", 32, 230, [1.1, 2.2], 0, trees, 20),
    [isTouch, trees],
  );
  const saplingCrowns = useMemo(
    () =>
      saplings.map((s) => ({
        ...s,
        position: s.position.clone().add(new THREE.Vector3(0, 1.35 * s.scale.y, 0)),
        scale: s.scale.clone().multiply(new THREE.Vector3(1.15, 0.85, 1.15)),
      })),
    [saplings],
  );

  useEffect(
    () => () => {
      rockGeo.dispose();
      bushGeo.dispose();
      trunkGeo.dispose();
      crownGeo.dispose();
      rockMat.dispose();
      bushMat.dispose();
      barkMat.dispose();
      crownMat.dispose();
    },
    [rockGeo, bushGeo, trunkGeo, crownGeo, rockMat, bushMat, barkMat, crownMat],
  );

  return (
    <group>
      <InstancedScatter geometry={rockGeo} material={rockMat} items={rocks} />
      <InstancedScatter geometry={bushGeo} material={bushMat} items={bushes} />
      <InstancedScatter geometry={trunkGeo} material={barkMat} items={saplings} />
      <InstancedScatter geometry={crownGeo} material={crownMat} items={saplingCrowns} />
    </group>
  );
}

/** Soft distant landforms — scale, not geography. */
function Horizon() {
  const hills = useMemo(() => {
    const rng = seededRng("hills", 1);
    return Array.from({ length: 5 }, (_, i) => {
      const t = i / 4;
      const x = THREE.MathUtils.lerp(-380, 400, t) + rng.gauss() * 30;
      const z = -340 - rng.range(0, 80);
      return {
        position: [x, terrainHeight(x, z) - 8, z] as [number, number, number],
        scale: [70 + rng.range(0, 40), 16 + rng.range(0, 10), 42 + rng.range(0, 18)] as [number, number, number],
      };
    });
  }, []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: HILL, roughness: 1, fog: true }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group>
      {hills.map((h, i) => (
        <mesh key={i} position={h.position} scale={h.scale} material={material}>
          <sphereGeometry args={[1, 10, 6]} />
        </mesh>
      ))}
    </group>
  );
}

export function Landscape() {
  return (
    <group>
      <Terrain />
      <Vegetation />
      <Horizon />
    </group>
  );
}
