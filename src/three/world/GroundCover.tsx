"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { createRng } from "@/lib/random";
import { UNFLIPPED_NORMAL, floraGlobals } from "../flora/floraMaterials";
import { WORLD_MAP_GLSL, getWorldMaps, worldMapUniforms } from "./worldMaps";
import { getFernAtlas, getFlowerAtlas, getGrassAtlas } from "./atlases";

/**
 * Ground cover that exists everywhere.
 *
 * Each layer is a fixed set of instances spread over a square patch that
 * travels with the camera: positions wrap toroidally, so as the view moves
 * the same instances reappear ahead of it. Height and density come from the
 * world maps in the vertex shader, so there is no per-frame CPU work and the
 * cost is the same whether you are in a glade or on the far side of the map.
 */

type Channel = "grass" | "ferns" | "flowers" | "pebbles";

interface LayerSpec {
  channel: Channel;
  count: number;
  size: number;
  geometry: () => THREE.BufferGeometry;
  material: () => THREE.MeshStandardMaterial;
  scale: [number, number];
  /** Extra vertical stretch range. */
  stretch: [number, number];
  sink: number;
  wind: number;
  /** Atlas laid out as N cells side by side; one is picked per instance. */
  cells?: number;
}

const CHANNEL_EXPR: Record<Channel, string> = {
  grass: "cov.r",
  ferns: "cov.g",
  flowers: "cov.b",
  // Pebbles gather on stream banks and lightly everywhere else.
  pebbles: "max(smoothstep(0.02, 0.4, cov.a) * (1.0 - smoothstep(0.75, 0.95, cov.a)), 0.06)",
};

/** Tuft of three splayed quads; v = 1 at the root. */
function tuftGeometry(w: number, h: number, splay: number, quads = 3) {
  const g = new THREE.BufferGeometry();
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k < quads; k++) {
    const a = (k / quads) * Math.PI * 2;
    const ox = Math.cos(a);
    const oz = Math.sin(a);
    const tx = -oz * w;
    const tz = ox * w;
    const lx = ox * splay;
    const lz = oz * splay;
    const base = pos.length / 3;
    pos.push(-tx + ox * 0.1, 0, -tz + oz * 0.1, tx + ox * 0.1, 0, tz + oz * 0.1, tx + lx, h, tz + lz, -tx + lx, h, -tz + lz);
    uv.push(0, 1, 1, 1, 1, 0, 0, 0);
    for (let q = 0; q < 4; q++) nor.push(ox * 0.25, 1, oz * 0.25);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** A fern: fronds arching out and down from the crown, each a strip of quads. */
function fernGeometry() {
  const g = new THREE.BufferGeometry();
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const fronds = 6;
  const segs = 3;
  const rng = createRng(5);
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + rng.gauss() * 0.25;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const len = 1.0 + rng.next() * 0.35;
    const rise = 0.55 + rng.next() * 0.25;
    const base = pos.length / 3;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      // Arch: rises then droops at the tip.
      const p = dir.clone().multiplyScalar(len * t).setY(rise * Math.sin(t * Math.PI * 0.85) - t * t * 0.25);
      const w = 0.42 * (1 - t * 0.25);
      for (const sgn of [-1, 1]) {
        const q = p.clone().addScaledVector(side, sgn * w);
        pos.push(q.x, q.y, q.z);
        uv.push(sgn < 0 ? 0 : 1, 1 - t);
        nor.push(dir.x * 0.3, 1, dir.z * 0.3);
      }
    }
    for (let s = 0; s < segs; s++) {
      const i0 = base + s * 2;
      idx.push(i0, i0 + 1, i0 + 3, i0, i0 + 3, i0 + 2);
    }
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** A small irregular stone. */
function pebbleGeometry() {
  const g = new THREE.IcosahedronGeometry(0.5, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  const rng = createRng(19);
  const bumps = Array.from({ length: p.count }, () => 0.8 + rng.next() * 0.35);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const key = Math.abs(Math.round(v.x * 97 + v.y * 31 + v.z * 13)) % p.count;
    v.multiplyScalar(bumps[key]);
    v.y *= 0.55;
    p.setXYZ(i, v.x, v.y + 0.15, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function coverMaterial(map: THREE.Texture | null, color: string, opts: { alpha?: boolean; roughness?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    map: map ?? undefined,
    color: new THREE.Color(color),
    alphaTest: opts.alpha === false ? 0 : 0.5,
    side: opts.alpha === false ? THREE.FrontSide : THREE.DoubleSide,
    roughness: opts.roughness ?? 0.9,
    metalness: 0,
    envMapIntensity: 0.4,
  });
}

function CoverLayer({ spec }: { spec: LayerSpec }) {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const lowPower = useTerritoryStore((s) => s.lowPower);
  const maps = getWorldMaps(isTouch);
  const count = Math.round(spec.count * (isTouch ? 0.38 : 1) * (lowPower ? 0.5 : 1));
  const size = spec.size * (isTouch ? 0.78 : 1);

  const { mesh, center } = useMemo(() => {
    const base = spec.geometry();
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    for (const [k, v] of Object.entries(base.attributes)) geo.setAttribute(k, v);
    const seeds = new Float32Array(count * 4);
    const rng = createRng(count * 7 + spec.channel.length);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = rng.next() * size;
      seeds[i * 4 + 1] = rng.next() * size;
      seeds[i * 4 + 2] = rng.next();
      seeds[i * 4 + 3] = rng.next();
    }
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
    geo.instanceCount = count;

    const material = spec.material();
    const center = { value: new THREE.Vector3() };
    const uniforms = {
      ...worldMapUniforms(maps),
      uCenter: center,
      uSize: { value: size },
      uScale: { value: new THREE.Vector2(...spec.scale) },
      uStretch: { value: new THREE.Vector2(...spec.stretch) },
      uSink: { value: spec.sink },
      uWindAmt: { value: spec.wind },
      uTime: floraGlobals.uTime,
      uWind: floraGlobals.uWind,
    };
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          /* glsl */ `#include <common>
          ${WORLD_MAP_GLSL}
          uniform vec3 uCenter; uniform float uSize; uniform vec2 uScale; uniform vec2 uStretch;
          uniform float uSink; uniform float uWindAmt; uniform float uTime; uniform vec3 uWind;
          attribute vec4 aSeed;
          varying float vRand; varying float vH;`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          /* glsl */ `
          vec2 cWorld = aSeed.xy + uSize * floor((uCenter.xz - aSeed.xy) / uSize + 0.5);
          // Tiny jitter keeps rows from lining up between the wrap and the map.
          cWorld += (vec2(fract(aSeed.z * 91.7), fract(aSeed.w * 53.3)) - 0.5) * 0.6;
          vec4 cov = worldCover(cWorld);
          float density = ${CHANNEL_EXPR[spec.channel]};
          float keep = step(aSeed.z, density);
          vec2 rel = abs(cWorld - uCenter.xz) / (0.5 * uSize);
          float edge = 1.0 - smoothstep(0.72, 1.0, max(rel.x, rel.y));
          float s = mix(uScale.x, uScale.y, aSeed.w) * keep * edge * (0.65 + 0.35 * density);
          float ang = aSeed.w * 6.2831 + aSeed.z * 17.0;
          mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
          vRand = aSeed.w;
          vec3 objectNormal = vec3(normal);
          objectNormal.xz = rot * objectNormal.xz;
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(tangent.xyz);
          #endif
          `,
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `
          vec3 transformed = vec3(position);
          vH = position.y;
          transformed.y *= mix(uStretch.x, uStretch.y, fract(aSeed.z * 13.1));
          transformed.xz = rot * transformed.xz;
          transformed *= s;
          {
            float ph = dot(cWorld, vec2(0.05, 0.04));
            float sw = sin(uTime * 1.6 + ph) * 0.6 + sin(uTime * 2.7 + ph * 1.7) * 0.25 + 0.35;
            transformed.xz += uWind.xz * sw * uWindAmt * transformed.y * transformed.y / max(s, 0.001);
          }
          transformed += vec3(cWorld.x, worldHeight(cWorld) - uSink, cWorld.y);
          ${spec.cells ? `#ifdef USE_MAP\n vMapUv.x = (vMapUv.x + floor(fract(aSeed.w * 7.3) * ${spec.cells}.0)) / ${spec.cells}.0;\n#endif` : ""}
          `,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying float vRand; varying float vH;`)
        .replace("#include <normal_fragment_begin>", UNFLIPPED_NORMAL)
        .replace(
          "vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;",
          "vec3 totalSpecular = (reflectedLight.directSpecular + reflectedLight.indirectSpecular) * 0.25;",
        )
        .replace(
          "#include <map_fragment>",
          /* glsl */ `#include <map_fragment>
          diffuseColor.rgb *= 0.82 + 0.3 * vRand;
          ${spec.channel === "pebbles" ? "" : "diffuseColor.rgb *= mix(0.72, 1.06, smoothstep(0.0, 0.8, vH));"}`,
        );
    };
    material.customProgramCacheKey = () => `territory-cover-${spec.channel}-v1`;

    const m = new THREE.Mesh(geo, material);
    m.frustumCulled = false;
    m.receiveShadow = true;
    m.castShadow = false;
    m.raycast = () => undefined;
    return { mesh: m, center };
  }, [spec, maps, count, size]);

  useFrame(({ camera }) => {
    // Centre the patch ahead of the camera so what it looks at is covered.
    const f = new THREE.Vector3();
    camera.getWorldDirection(f);
    f.y = 0;
    if (f.lengthSq() > 1e-4) f.normalize();
    center.value.set(camera.position.x + f.x * size * 0.3, 0, camera.position.z + f.z * size * 0.3);
  });

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

const LAYERS: LayerSpec[] = [
  {
    channel: "grass",
    count: 150000,
    size: 270,
    geometry: () => tuftGeometry(0.55, 0.8, 0.35),
    material: () => coverMaterial(getGrassAtlas(), "#76854f"),
    scale: [0.55, 1.2],
    stretch: [0.9, 1.5],
    sink: 0.05,
    wind: 0.35,
  },
  {
    channel: "ferns",
    count: 12000,
    size: 300,
    geometry: fernGeometry,
    material: () => coverMaterial(getFernAtlas(), "#8c9d6a"),
    scale: [1.4, 2.6],
    stretch: [0.9, 1.25],
    sink: 0.1,
    wind: 0.08,
  },
  {
    channel: "flowers",
    count: 9000,
    size: 260,
    geometry: () => tuftGeometry(0.4, 0.8, 0.3),
    material: () => coverMaterial(getFlowerAtlas(), "#ffffff"),
    cells: 4,
    scale: [0.9, 1.5],
    stretch: [1.0, 1.4],
    sink: 0.05,
    wind: 0.3,
  },
  {
    channel: "pebbles",
    count: 7000,
    size: 220,
    geometry: pebbleGeometry,
    material: () => coverMaterial(null, "#8a847a", { alpha: false, roughness: 0.85 }),
    scale: [0.25, 1.1],
    stretch: [0.7, 1.2],
    sink: 0.12,
    wind: 0,
  },
];

export function GroundCover() {
  return (
    <group>
      {LAYERS.map((l) => (
        <CoverLayer key={l.channel} spec={l} />
      ))}
    </group>
  );
}
