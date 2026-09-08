"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import {
  accountClearings,
  creekCenterX,
  creekDistance,
  terrainHeight,
} from "./layout";
import { createRng, seededRng } from "@/lib/random";
import { createGrassMaterial } from "./materials";

const SOIL = new THREE.Color("#5c4e38");
const MOSS = new THREE.Color("#4f7242");
const GRASS = new THREE.Color("#5e8248");
const LITTER = new THREE.Color("#6c5a34");
const BANK = new THREE.Color("#3a4636");
const WATER = new THREE.Color("#5aa4a0");
const WATER_BED = new THREE.Color("#3d5852");
const WATER_SHINE = new THREE.Color("#8fc9c2");
const ROCK_A = new THREE.Color("#6e6b62");
const ROCK_B = new THREE.Color("#5a574e");
const BUSH = new THREE.Color("#4a6c3e");
const WOODS_BARK = new THREE.Color("#4a4336");
const WOODS_CROWN = new THREE.Color("#3c5e38");
const WOODS_CROWN_B = new THREE.Color("#4a6a3c");
const YOUNG_CROWN = new THREE.Color("#4e7240");
const HILL = new THREE.Color("#6a7e68");
const RIDGE = new THREE.Color("#7e8c86");
const WALL = new THREE.Color("#3a5640");

interface ScatterSpec {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

function inClearing(x: number, z: number, clearings: { x: number; z: number }[], r: number) {
  return clearings.some((c) => Math.hypot(x - c.x, z - c.z) < r);
}

/** Keep a meadow along the establishing sightline so groves don't wall off the accounts. */
function inSightline(x: number, z: number) {
  return z > 10 && z < 115 && x > -20 && x < 78;
}

function composeItem(
  x: number,
  z: number,
  s: number,
  rng: ReturnType<typeof seededRng>,
  yLift: number | ((s: number) => number),
): ScatterSpec {
  const lift = typeof yLift === "function" ? yLift(s) : yLift;
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rng.gauss() * 0.12, rng.range(0, Math.PI * 2), rng.gauss() * 0.1),
  );
  const squash = rng.range(0.78, 1.18);
  return {
    position: new THREE.Vector3(x, terrainHeight(x, z) + lift, z),
    quaternion: q,
    scale: new THREE.Vector3(s * squash, s, s / squash),
  };
}

function placeInBounds(
  count: number,
  seed: string,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  scaleRange: [number, number],
  yLift: number | ((s: number) => number),
  clearings: { x: number; z: number }[],
  excludeR: number,
  opts: { avoidCreek?: number; keepSightline?: boolean } = {},
): ScatterSpec[] {
  const rng = seededRng("landscape-v12b", seed);
  const out: ScatterSpec[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 12) {
    guard += 1;
    const x = rng.range(x0, x1);
    const z = rng.range(z0, z1);
    if (inClearing(x, z, clearings, excludeR)) continue;
    if (opts.avoidCreek && creekDistance(x, z) < opts.avoidCreek && z > -210 && z < 70) continue;
    if (opts.keepSightline && inSightline(x, z)) continue;
    out.push(composeItem(x, z, rng.range(scaleRange[0], scaleRange[1]), rng, yLift));
  }
  return out;
}

function placeGroves(
  groves: number,
  perMin: number,
  perMax: number,
  seed: string,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  scaleRange: [number, number],
  yLift: number | ((s: number) => number),
  clearings: { x: number; z: number }[],
  excludeR: number,
  groveRadius: number,
  opts: { avoidCreek?: number; keepSightline?: boolean } = {},
): ScatterSpec[] {
  const rng = seededRng("landscape-v12b-grove", seed);
  const out: ScatterSpec[] = [];
  let guard = 0;
  let made = 0;
  while (made < groves && guard < groves * 16) {
    guard += 1;
    const cx = rng.range(x0, x1);
    const cz = rng.range(z0, z1);
    if (inClearing(cx, cz, clearings, excludeR + groveRadius * 0.4)) continue;
    if (opts.keepSightline && inSightline(cx, cz)) continue;
    if (opts.avoidCreek && creekDistance(cx, cz) < (opts.avoidCreek ?? 0) + 4 && cz > -210 && cz < 70) continue;
    made += 1;
    const n = rng.int(perMin, perMax);
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(rng.range(0.08, 1)) * groveRadius;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (inClearing(x, z, clearings, excludeR)) continue;
      if (opts.avoidCreek && creekDistance(x, z) < opts.avoidCreek && z > -210 && z < 70) continue;
      out.push(composeItem(x, z, rng.range(scaleRange[0], scaleRange[1]), rng, yLift));
    }
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
      mesh.instanceMatrix.dispose();
    },
    [mesh],
  );
  if (items.length === 0) return null;
  return <primitive object={mesh} />;
}

function buildTerrainGeometry(segments: number): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(640, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  const clearings = accountClearings();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    const dist = Math.hypot(x - 8, z + 40);
    tmp.copy(MOSS).lerp(SOIL, THREE.MathUtils.clamp(dist / 420, 0, 1));
    const grain = (Math.sin(x * 0.055) * Math.cos(z * 0.048) + 1) * 0.5;
    tmp.lerp(GRASS, 0.42 + grain * 0.28);
    tmp.lerp(LITTER, grain * 0.14);
    if (inClearing(x, z, clearings, 24)) tmp.lerp(GRASS, 0.5);
    const creek = Math.exp(-(creekDistance(x, z) ** 2) / 42);
    if (z > -210 && z < 70) tmp.lerp(BANK, creek * 0.88);
    const mottling = (Math.sin(x * 0.21 + z * 0.16) + Math.sin(x * 0.09 - z * 0.11)) * 0.03;
    tmp.offsetHSL(0.01, 0.06, mottling);
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
  const geometry = useMemo(() => buildTerrainGeometry(isTouch ? 56 : 128), [isTouch]);
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

function buildCreekRibbon(width: number, yLift: number): THREE.BufferGeometry {
  const segs = 96;
  const z0 = 64;
  const z1 = -210;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const left = new THREE.Vector3();
  const right = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = THREE.MathUtils.lerp(z0, z1, t);
    const x = creekCenterX(z);
    const zN = z - 1.2;
    const tx = creekCenterX(zN) - x;
    const tz = zN - z;
    const len = Math.hypot(tx, tz) || 1;
    const px = -tz / len;
    const pz = tx / len;
    const w = width * (1 + 0.22 * Math.sin(t * 8.4));
    const y = terrainHeight(x, z) + yLift;
    left.set(x + px * w, y, z + pz * w);
    right.set(x - px * w, y, z - pz * w);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, t * 10, 1, t * 10);
    if (i < segs) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function Water() {
  const view = useTerritoryStore((s) => s.view);
  const mode = useTerritoryStore((s) => s.mode);
  const reduced = useTerritoryStore((s) => s.reducedMotion);
  const bedGeo = useMemo(() => buildCreekRibbon(5.6, 0.05), []);
  const waterGeo = useMemo(() => buildCreekRibbon(4.1, 0.24), []);
  const shineGeo = useMemo(() => buildCreekRibbon(1.35, 0.3), []);
  const bedMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: WATER_BED,
        roughness: 0.92,
        metalness: 0,
        transparent: true,
        opacity: 0.9,
      }),
    [],
  );
  const waterMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: WATER,
        roughness: 0.18,
        metalness: 0.08,
        transparent: true,
        opacity: 0.84,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [],
  );
  const shineMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: WATER_SHINE,
        roughness: 0.12,
        metalness: 0.12,
        transparent: true,
        opacity: 0.55,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [],
  );
  useEffect(
    () => () => {
      bedGeo.dispose();
      waterGeo.dispose();
      shineGeo.dispose();
      bedMat.dispose();
      waterMat.dispose();
      shineMat.dispose();
    },
    [bedGeo, waterGeo, shineGeo, bedMat, waterMat, shineMat],
  );
  useFrame((_, dt) => {
    const roots = mode === "account" && view === "roots";
    const k = 1 - Math.exp(-dt * 5);
    bedMat.opacity += ((roots ? 0 : 0.9) - bedMat.opacity) * k;
    waterMat.opacity += ((roots ? 0 : 0.84) - waterMat.opacity) * k;
    shineMat.opacity += ((roots ? 0 : 0.5) - shineMat.opacity) * k;
    if (!reduced) {
      waterMat.emissive.set(WATER).multiplyScalar(0.08 + Math.sin(performance.now() * 0.0011) * 0.025);
    }
  });
  return (
    <group>
      <mesh geometry={bedGeo} material={bedMat} />
      <mesh geometry={waterGeo} material={waterMat} />
      <mesh geometry={shineGeo} material={shineMat} />
    </group>
  );
}

function makeRockGeometry(seed: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const rng = createRng(seed);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 0.55 + rng.range(0, 0.7) + 0.18 * Math.sin(v.x * 2.6 + v.z * 1.8 + seed);
    v.multiplyScalar(n);
    v.x *= rng.range(0.72, 1.28);
    v.z *= rng.range(0.7, 1.25);
    if (v.y < 0) v.y *= 0.28;
    else v.y *= rng.range(0.45, 0.85);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function grassBlade(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([-0.28, 0, 0, 0.28, 0, 0, 0.0, 1, 0.12, -0.1, 0.5, 0.04]);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
}

function grassTuft(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const g = grassBlade();
    g.rotateY((i / 12) * Math.PI * 2 + i * 0.11);
    g.translate((i % 4) * 0.18 - 0.27, 0, ((i * 3) % 5) * 0.08 - 0.16);
    g.scale(1.35, 0.7 + (i % 5) * 0.16, 1.35);
    blades.push(g);
  }
  return mergeGeos(blades);
}

function fernFrond(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const g = grassBlade();
    g.rotateY((i - 2.5) * 0.42);
    g.scale(1.8, 0.85 + i * 0.1, 1.8);
    blades.push(g);
  }
  return mergeGeos(blades);
}

function mergeGeos(blades: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  let base = 0;
  blades.forEach((g) => {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i));
    const index = g.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i++) idx.push(index.getX(i) + base);
    }
    base += p.count;
    g.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function treeCrownGeo(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1.7, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const rng = createRng(41);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.x *= 1.45;
    v.z *= 1.35;
    v.y *= 0.58;
    v.multiplyScalar(0.88 + rng.range(0, 0.28));
    if (v.y < 0) v.y *= 0.35;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function WoodsLife() {
  const view = useTerritoryStore((s) => s.view);
  const mode = useTerritoryStore((s) => s.mode);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const reduced = useTerritoryStore((s) => s.reducedMotion);
  const group = useRef<THREE.Group>(null);
  const clearings = useMemo(accountClearings, []);
  const grassMat = useMemo(
    () => createGrassMaterial(new THREE.Color("#5c8044"), !reduced && !isTouch),
    [reduced, isTouch],
  );
  const fernMat = useMemo(
    () => createGrassMaterial(new THREE.Color("#4a6e38"), !reduced && !isTouch),
    [reduced, isTouch],
  );
  const bushMat = useMemo(() => new THREE.MeshStandardMaterial({ color: BUSH, roughness: 0.95 }), []);
  const barkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: WOODS_BARK, roughness: 0.95 }), []);
  const crownMat = useMemo(() => new THREE.MeshStandardMaterial({ color: WOODS_CROWN, roughness: 0.9 }), []);
  const crownMatB = useMemo(() => new THREE.MeshStandardMaterial({ color: WOODS_CROWN_B, roughness: 0.9 }), []);
  const youngMat = useMemo(() => new THREE.MeshStandardMaterial({ color: YOUNG_CROWN, roughness: 0.9 }), []);
  const rockMatA = useMemo(() => new THREE.MeshStandardMaterial({ color: ROCK_A, roughness: 0.94 }), []);
  const rockMatB = useMemo(() => new THREE.MeshStandardMaterial({ color: ROCK_B, roughness: 0.96 }), []);
  const woodMat = useMemo(() => new THREE.MeshStandardMaterial({ color: WOODS_BARK, roughness: 1 }), []);
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: WALL, roughness: 1, fog: true }), []);

  const tuftGeo = useMemo(grassTuft, []);
  const fernGeo = useMemo(fernFrond, []);
  const bushGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const rng = createRng(7);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.x *= 1.25;
      v.z *= 1.15;
      v.y *= 0.62;
      v.multiplyScalar(0.85 + rng.range(0, 0.28));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.34, 0.58, 8.8, 6), []);
  const crownGeo = useMemo(treeCrownGeo, []);
  const youngTrunk = useMemo(() => new THREE.CylinderGeometry(0.1, 0.16, 4.2, 4), []);
  const rockA = useMemo(() => makeRockGeometry(11), []);
  const rockB = useMemo(() => makeRockGeometry(29), []);
  const stickGeo = useMemo(() => new THREE.CylinderGeometry(0.05, 0.08, 1.6, 4), []);
  const wallGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 8, 6);
    g.scale(1.4, 0.7, 1.15);
    return g;
  }, []);

  const d = isTouch ? 0.38 : 1;
  const tufts = useMemo(
    () => [
      ...placeInBounds(Math.round(700 * d), "tuft", -200, 220, -220, 95, [1.8, 3.4], 0, clearings, 5, { avoidCreek: 2.4 }),
      ...placeInBounds(Math.round(140 * d), "tuft-fg", -55, 95, 12, 115, [2.1, 3.8], 0, clearings, 6, { avoidCreek: 2 }),
    ],
    [clearings, d],
  );
  const ferns = useMemo(
    () => placeInBounds(Math.round(80 * d), "ferns", -180, 210, -200, 70, [1.1, 2.4], 0, clearings, 10, { avoidCreek: 2 }),
    [clearings, d],
  );
  const bushes = useMemo(
    () => [
      ...placeInBounds(Math.round(55 * d), "bush", -210, 230, -230, 80, [1.1, 2.4], 0.35, clearings, 14, {
        avoidCreek: 5,
      }),
      ...placeInBounds(Math.round(18 * d), "bush-fg", -40, 80, 28, 100, [1.3, 2.2], 0.4, clearings, 12, {
        avoidCreek: 4,
      }),
    ],
    [clearings, d],
  );
  const woods = useMemo(
    () =>
      placeGroves(
        Math.round(18 * d),
        5,
        11,
        "woods",
        -240,
        250,
        -250,
        70,
        [0.72, 1.35],
        (s) => 4.4 * s,
        clearings,
        26,
        16,
        { avoidCreek: 9, keepSightline: true },
      ),
    [clearings, d],
  );
  const woodsFar = useMemo(
    () =>
      placeGroves(
        Math.round(12 * d),
        6,
        12,
        "woods-far",
        -360,
        360,
        -430,
        -180,
        [0.85, 1.55],
        (s) => 4.4 * s,
        clearings,
        30,
        22,
        { avoidCreek: 12 },
      ),
    [clearings, d],
  );
  const woodsAlt = useMemo(() => woods.filter((_, i) => i % 2 === 0), [woods]);
  const woodsMain = useMemo(() => woods.filter((_, i) => i % 2 === 1), [woods]);
  const liftCrown = (items: ScatterSpec[], y: number, xz: number, yScale = 0.82) =>
    items.map((s) => ({
      ...s,
      position: s.position.clone().add(new THREE.Vector3(0, y * s.scale.y, 0)),
      scale: s.scale.clone().multiply(new THREE.Vector3(xz, yScale, xz)),
    }));
  const woodsCrowns = useMemo(() => liftCrown(woodsMain, 3.7, 2.35), [woodsMain]);
  const woodsCrownsAlt = useMemo(() => liftCrown(woodsAlt, 3.65, 2.2), [woodsAlt]);
  const woodsFarCrowns = useMemo(() => liftCrown(woodsFar, 3.8, 2.6, 0.9), [woodsFar]);
  const young = useMemo(
    () => [
      ...placeInBounds(Math.round(40 * d), "young", -180, 210, -200, 60, [0.85, 1.4], (s) => 2.1 * s, clearings, 16, {
        avoidCreek: 6,
      }),
      ...placeInBounds(Math.round(12 * d), "young-fg", -30, 70, 24, 95, [0.9, 1.35], (s) => 2.1 * s, clearings, 14, {
        avoidCreek: 5,
      }),
    ],
    [clearings, d],
  );
  const youngCrowns = useMemo(() => liftCrown(young, 1.85, 1.45, 0.9), [young]);
  const rocks1 = useMemo(
    () => placeInBounds(Math.round(16 * d), "rock-a", -180, 200, -190, 70, [0.55, 1.8], (s) => -0.28 * s, clearings, 8, { avoidCreek: 1.6 }),
    [clearings, d],
  );
  const rocks2 = useMemo(
    () => placeInBounds(Math.round(12 * d), "rock-b", -160, 190, -180, 60, [0.4, 1.3], (s) => -0.24 * s, clearings, 9, { avoidCreek: 1.4 }),
    [clearings, d],
  );
  const creekRocks = useMemo(() => {
    const rng = seededRng("landscape-v12b", "creek-rock");
    const out: ScatterSpec[] = [];
    for (let i = 0; i < Math.round(10 * d); i++) {
      const z = rng.range(-180, 40);
      const side = rng.chance(0.5) ? 1 : -1;
      const x = creekCenterX(z) + side * rng.range(2.4, 5.2);
      out.push(composeItem(x, z, rng.range(0.45, 1.1), rng, (s) => -0.18 * s));
    }
    return out;
  }, [d]);
  const sticks = useMemo(
    () => placeInBounds(Math.round(16 * d), "sticks", -150, 180, -170, 50, [0.7, 1.5], 0.05, clearings, 12, { avoidCreek: 3 }),
    [clearings, d],
  );
  const wall = useMemo(() => {
    const rng = seededRng("landscape-v12b", "wall");
    const out: ScatterSpec[] = [];
    const n = Math.round(36 * d);
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      const x = THREE.MathUtils.lerp(-420, 430, t) + rng.gauss() * 28;
      const z = -390 - rng.range(0, 80);
      const s = rng.range(14, 28);
      out.push({
        position: new THREE.Vector3(x, terrainHeight(x, z) + s * 0.35, z),
        quaternion: new THREE.Quaternion(),
        scale: new THREE.Vector3(s, s * 0.55, s * 0.7),
      });
    }
    return out;
  }, [d]);

  useEffect(
    () => () => {
      tuftGeo.dispose();
      fernGeo.dispose();
      bushGeo.dispose();
      trunkGeo.dispose();
      crownGeo.dispose();
      youngTrunk.dispose();
      rockA.dispose();
      rockB.dispose();
      stickGeo.dispose();
      wallGeo.dispose();
      grassMat.dispose();
      fernMat.dispose();
      bushMat.dispose();
      barkMat.dispose();
      crownMat.dispose();
      crownMatB.dispose();
      youngMat.dispose();
      rockMatA.dispose();
      rockMatB.dispose();
      woodMat.dispose();
      wallMat.dispose();
    },
    [
      tuftGeo,
      fernGeo,
      bushGeo,
      trunkGeo,
      crownGeo,
      youngTrunk,
      rockA,
      rockB,
      stickGeo,
      wallGeo,
      grassMat,
      fernMat,
      bushMat,
      barkMat,
      crownMat,
      crownMatB,
      youngMat,
      rockMatA,
      rockMatB,
      woodMat,
      wallMat,
    ],
  );

  useFrame((_, dt) => {
    const roots = mode === "account" && view === "roots";
    if (group.current) group.current.visible = !roots;
    if (grassMat.userData.uTime) grassMat.userData.uTime.value += dt;
    if (fernMat.userData.uTime) fernMat.userData.uTime.value += dt;
  });

  return (
    <group ref={group}>
      <InstancedScatter geometry={tuftGeo} material={grassMat} items={tufts} />
      <InstancedScatter geometry={fernGeo} material={fernMat} items={ferns} />
      <InstancedScatter geometry={bushGeo} material={bushMat} items={bushes} />
      <InstancedScatter geometry={trunkGeo} material={barkMat} items={woods} />
      <InstancedScatter geometry={crownGeo} material={crownMat} items={woodsCrowns} />
      <InstancedScatter geometry={crownGeo} material={crownMatB} items={woodsCrownsAlt} />
      <InstancedScatter geometry={trunkGeo} material={barkMat} items={woodsFar} />
      <InstancedScatter geometry={crownGeo} material={crownMat} items={woodsFarCrowns} />
      <InstancedScatter geometry={youngTrunk} material={barkMat} items={young} />
      <InstancedScatter geometry={crownGeo} material={youngMat} items={youngCrowns} />
      <InstancedScatter geometry={rockA} material={rockMatA} items={rocks1} />
      <InstancedScatter geometry={rockB} material={rockMatB} items={rocks2} />
      <InstancedScatter geometry={rockA} material={rockMatA} items={creekRocks} />
      <InstancedScatter geometry={stickGeo} material={woodMat} items={sticks} />
      <InstancedScatter geometry={wallGeo} material={wallMat} items={wall} />
    </group>
  );
}

function Horizon() {
  const hills = useMemo(() => {
    const rng = seededRng("hills-v12", 2);
    return Array.from({ length: 8 }, (_, i) => {
      const t = i / 7;
      const x = THREE.MathUtils.lerp(-540, 540, t) + rng.gauss() * 40;
      const z = -430 - rng.range(0, 110);
      return {
        position: [x, terrainHeight(x, z) + 10, z] as [number, number, number],
        scale: [100 + rng.range(0, 55), 26 + rng.range(0, 16), 52 + rng.range(0, 22)] as [number, number, number],
      };
    });
  }, []);
  const ridges = useMemo(() => {
    const rng = seededRng("ridge-v12", 3);
    return Array.from({ length: 5 }, (_, i) => {
      const t = i / 4;
      const x = THREE.MathUtils.lerp(-400, 500, t) + rng.gauss() * 50;
      const z = -640 - rng.range(0, 90);
      return {
        position: [x, 32 + rng.range(0, 16), z] as [number, number, number],
        scale: [150 + rng.range(0, 70), 40 + rng.range(0, 18), 44] as [number, number, number],
      };
    });
  }, []);
  const hillMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: HILL, roughness: 1, fog: true }),
    [],
  );
  const ridgeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: RIDGE, roughness: 1, fog: true }),
    [],
  );
  useEffect(
    () => () => {
      hillMat.dispose();
      ridgeMat.dispose();
    },
    [hillMat, ridgeMat],
  );
  return (
    <group>
      {hills.map((h, i) => (
        <mesh key={`h${i}`} position={h.position} scale={h.scale} material={hillMat}>
          <sphereGeometry args={[1, 12, 7]} />
        </mesh>
      ))}
      {ridges.map((h, i) => (
        <mesh key={`r${i}`} position={h.position} scale={h.scale} material={ridgeMat}>
          <sphereGeometry args={[1, 10, 6]} />
        </mesh>
      ))}
    </group>
  );
}

function Birds() {
  const reduced = useTerritoryStore((s) => s.reducedMotion);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const mode = useTerritoryStore((s) => s.mode);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([-1.1, 0, 0, 0, 0.08, 0, 1.1, 0, 0, 0, 0.08, 0, 0, -0.12, 0.2], 3),
    );
    g.setIndex([0, 1, 2, 1, 3, 4]);
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#2a322e", side: THREE.DoubleSide, fog: true }), []);
  const tmpM = useMemo(() => new THREE.Matrix4(), []);
  const tmpQ = useMemo(() => new THREE.Quaternion(), []);
  const tmpP = useMemo(() => new THREE.Vector3(), []);
  const tmpS = useMemo(() => new THREE.Vector3(2.6, 2.6, 2.6), []);
  const tmpD = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const show = !reduced && !isTouch && mode === "forest";
    mesh.visible = show;
    if (!show) return;
    const t = clock.elapsedTime * 0.07;
    for (let i = 0; i < 3; i++) {
      const a = t + i * 2.15;
      const x = Math.cos(a) * 170 + 18;
      const z = Math.sin(a) * 95 - 90;
      const y = 58 + Math.sin(a * 2 + i) * 7;
      const next = a + 0.02;
      tmpD.set(Math.cos(next) * 170 + 18 - x, 0, Math.sin(next) * 95 - 90 - z).normalize();
      tmpQ.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tmpD);
      tmpP.set(x, y, z);
      tmpM.compose(tmpP, tmpQ, tmpS);
      mesh.setMatrixAt(i, tmpM);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  if (reduced || isTouch) return null;
  return <instancedMesh ref={meshRef} args={[geo, mat, 3]} frustumCulled={false} />;
}

function Turtle() {
  const view = useTerritoryStore((s) => s.view);
  const mode = useTerritoryStore((s) => s.mode);
  const hidden = mode === "account" && view === "roots";
  const z = -36;
  const x = creekCenterX(z) + 2.4;
  const y = terrainHeight(x, z) + 0.08;
  return (
    <group position={[x, y, z]} rotation={[0, -0.6, 0]} scale={0.38} visible={!hidden}>
      <mesh>
        <sphereGeometry args={[0.55, 8, 6]} />
        <meshStandardMaterial color="#4a5a3c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.12, 0]} scale={[1.15, 0.45, 0.95]}>
        <sphereGeometry args={[0.58, 8, 6]} />
        <meshStandardMaterial color="#3e4c34" roughness={0.92} />
      </mesh>
      <mesh position={[0.62, 0.02, 0.12]} scale={[0.35, 0.22, 0.28]}>
        <sphereGeometry args={[0.4, 6, 5]} />
        <meshStandardMaterial color="#4a5a3c" roughness={0.9} />
      </mesh>
    </group>
  );
}

export function Landscape() {
  return (
    <group>
      <Terrain />
      <Water />
      <WoodsLife />
      <Horizon />
      <Birds />
      <Turtle />
    </group>
  );
}
