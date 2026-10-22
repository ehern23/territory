"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { createRng, seededRng } from "@/lib/random";
import { BARK_TEX, configureBarkMaps } from "../flora/barkMaps";
import {
  GLADE_RADIUS,
  RIVERS,
  accountClearings,
  fbm,
  groundCover,
  lakeDistance,
  terrainHeight,
} from "../layout";

/**
 * Boulders and fallen logs. Rocks are displaced, flattened icosahedra with
 * moss on their upper faces; they gather along the stream banks and lie
 * scattered through the forest. Logs are bark-textured trunks lying in the
 * leaf litter with a mossy top.
 */

function rockGeometry(seed: number) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const o = seed * 13.7;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n =
      0.72 +
      0.42 * fbm(v.x * 1.3 + o, v.z * 1.3 + v.y * 0.7 - o, 4) +
      0.18 * Math.abs(fbm(v.x * 4 + o, v.y * 4 + v.z * 2, 2) - 0.5);
    v.multiplyScalar(n);
    v.y = v.y * 0.62 + 0.25;
    // Flatten facets a little for a fractured look.
    v.x = Math.round(v.x * 5) / 5 * 0.25 + v.x * 0.75;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function rockMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color("#8a857c"), roughness: 0.92, metalness: 0, envMapIntensity: 0.5 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRockN;\nvarying vec3 vRockP;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         mat3 rm = mat3(instanceMatrix);
         vRockN = normalize(rm * normal);
         vRockP = (instanceMatrix * vec4(position, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRockN;\nvarying vec3 vRockP;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         float grain = fract(sin(dot(floor(vRockP * 3.1), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
         float streak = 0.5 + 0.5 * sin(vRockP.y * 6.0 + vRockP.x * 1.3);
         diffuseColor.rgb *= 0.78 + 0.18 * grain + 0.1 * streak;
         float moss = smoothstep(0.45, 0.85, vRockN.y);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.26, 0.33, 0.12) * (0.8 + 0.4 * grain), moss * 0.85);`,
      );
  };
  m.customProgramCacheKey = () => "territory-rock-v1";
  return m;
}

function nearGlade(x: number, z: number, r: number) {
  return accountClearings().some((c) => Math.hypot(x - c.x, z - c.z) < r);
}

interface Placement {
  matrix: THREE.Matrix4;
}

function placeRocks(count: number): Placement[][] {
  const rng = seededRng("rocks", count);
  const out: Placement[][] = [[], [], []];
  const push = (x: number, z: number, s: number) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.gauss() * 0.15, rng.range(0, Math.PI * 2), rng.gauss() * 0.15));
    const sc = new THREE.Vector3(s * rng.range(0.9, 1.5), s * rng.range(0.6, 1.1), s * rng.range(0.9, 1.4));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, terrainHeight(x, z) - s * 0.35, z), q, sc);
    out[rng.int(0, 2)].push({ matrix: m });
  };
  // River banks: clusters of rocks, some in the water; boulders choke the falls.
  for (const river of RIVERS) {
    const path = river.path;
    for (let i = 0; i < path.length; i += 2) {
      const p = path[i];
      if (lakeDistance(p.x, p.y) < 1.1 || Math.hypot(p.x, p.y + 80) > 1700) continue;
      const prev = path[Math.max(0, i - 1)];
      const next = path[Math.min(path.length - 1, i + 1)];
      const side = new THREE.Vector2(-(next.y - prev.y), next.x - prev.x).normalize();
      const w = river.widths[i];
      const steep = i < path.length - 1 && river.levels[i] - river.levels[i + 1] > 4;
      const n = steep ? rng.int(2, 5) : rng.int(0, 3);
      for (let k = 0; k < n; k++) {
        // Beside a falls the boulders sit on the ledges either side, never on the sheet.
        const off = (rng.chance(0.5) ? 1 : -1) * w * (steep ? rng.range(1.5, 2.3) : rng.range(0.5, 1.6));
        const x = p.x + side.x * off + rng.gauss() * 2;
        const z = p.y + side.y * off + rng.gauss() * 2;
        if (nearGlade(x, z, GLADE_RADIUS * 0.6)) continue;
        push(x, z, rng.range(0.6, 2.4) * (0.75 + w / 24) * (steep ? 1.5 : 1));
      }
    }
  }
  // Scattered through the forest and up into the foothills.
  let guard = 0;
  let made = 0;
  while (made < count && guard < count * 8) {
    guard++;
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * 1300;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r - 120;
    const c = groundCover(x, z);
    if (c.water > 0.1 || nearGlade(x, z, GLADE_RADIUS * 0.9)) continue;
    const big = rng.chance(0.12 + c.rock * 0.5);
    push(x, z, big ? rng.range(2.5, 6) : rng.range(0.7, 2.2));
    made++;
  }
  return out;
}

function logGeometry() {
  const g = new THREE.CylinderGeometry(0.42, 0.5, 1, 12, 6, false);
  g.rotateZ(Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const rng = createRng(3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    // Slight sag and knots.
    p.setY(i, p.getY(i) - Math.cos(x * Math.PI) * 0.04 + (rng.next() - 0.5) * 0.03);
  }
  g.computeVertexNormals();
  return g;
}

function placeLogs(count: number) {
  const rng = seededRng("logs", count);
  const out: THREE.Matrix4[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 10) {
    guard++;
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(rng.next()) * 850;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r - 120;
    const c = groundCover(x, z);
    if (c.water > 0.05 || c.trees < 0.3 || nearGlade(x, z, GLADE_RADIUS * 1.1)) continue;
    const len = rng.range(7, 16);
    const rad = rng.range(0.9, 1.6);
    const yaw = rng.range(0, Math.PI * 2);
    const y0 = terrainHeight(x, z);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y0 + rad * 0.32, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, rng.gauss() * 0.04)),
      new THREE.Vector3(len, rad, rad),
    );
    out.push(m);
  }
  return out;
}

export function Rocks() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const barkMaps = useTexture(BARK_TEX);
  const sets = useMemo(() => {
    const geos = [rockGeometry(1), rockGeometry(2), rockGeometry(3)];
    const mat = rockMaterial();
    const placed = placeRocks(isTouch ? 260 : 620);
    const meshes = geos.map((g, i) => {
      const list = placed[i];
      const m = new THREE.InstancedMesh(g, mat, Math.max(1, list.length));
      list.forEach((p, k) => m.setMatrixAt(k, p.matrix));
      m.count = list.length;
      m.castShadow = !isTouch;
      m.receiveShadow = true;
      m.raycast = () => undefined;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      return m;
    });
    const logMat = new THREE.MeshStandardMaterial({
      ...(() => {
        const maps = configureBarkMaps(barkMaps);
        return { map: maps.map, normalMap: maps.normalMap, roughnessMap: maps.arm };
      })(),
      color: new THREE.Color("#7d7468"),
      roughness: 0.95,
    });
    logMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying float vUpN;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvUpN = normalize(mat3(instanceMatrix) * normal).y;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vUpN;")
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.32, 0.1), smoothstep(0.3, 0.9, vUpN) * 0.8);`,
        );
    };
    logMat.customProgramCacheKey = () => "territory-log-v1";
    const logs = placeLogs(isTouch ? 30 : 70);
    const logMesh = new THREE.InstancedMesh(logGeometry(), logMat, Math.max(1, logs.length));
    logs.forEach((m, k) => logMesh.setMatrixAt(k, m));
    logMesh.count = logs.length;
    logMesh.castShadow = !isTouch;
    logMesh.receiveShadow = true;
    logMesh.raycast = () => undefined;
    logMesh.instanceMatrix.needsUpdate = true;
    logMesh.computeBoundingSphere();
    return { meshes, logMesh, mat, logMat };
  }, [isTouch, barkMaps]);

  useEffect(
    () => () => {
      sets.meshes.forEach((m) => m.geometry.dispose());
      sets.mat.dispose();
      sets.logMesh.geometry.dispose();
      sets.logMat.dispose();
    },
    [sets],
  );

  return (
    <group>
      {sets.meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <primitive object={sets.logMesh} />
    </group>
  );
}
