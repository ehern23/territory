"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { WATERFALLS, terrainHeight } from "../layout";
import { WORLD_MAP_GLSL, getWorldMaps, worldMapUniforms } from "./worldMaps";
import { getRockTextures } from "./rockTexture";

/**
 * One terrain mesh from the forest floor to the far ranges.
 *
 * The grid is warped with sinh so vertices are dense where people look (a few
 * metres apart in the forest) and coarse at the horizon. The surface colour
 * is decided in the shader from place: mossy forest floor, open meadow, wet
 * stream bed, forested mountain slopes, bare rock and snow.
 */

const EXTENT = 5200;
const WARP = 3.5;
const FALLS = Math.max(1, Math.min(8, WATERFALLS.length));

function warp(u: number) {
  return (EXTENT * Math.sinh(WARP * u)) / Math.sinh(WARP);
}

const TERRAIN_PARS = /* glsl */ `
${WORLD_MAP_GLSL}
uniform sampler2D uRockColor;
uniform sampler2D uRockNormal;
float gRock;
vec3 triWeights(vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  return w / (w.x + w.y + w.z);
}
vec3 triColor(vec3 p, vec3 n, float s) {
  vec3 w = triWeights(n);
  return texture2D(uRockColor, p.zy * s).rgb * w.x + texture2D(uRockColor, p.xz * s).rgb * w.y + texture2D(uRockColor, p.xy * s).rgb * w.z;
}
// Whiteout-blended triplanar normal, in world space.
vec3 triNormal(vec3 p, vec3 n, float s) {
  vec3 w = triWeights(n);
  vec3 tx = texture2D(uRockNormal, p.zy * s).xyz * 2.0 - 1.0;
  vec3 ty = texture2D(uRockNormal, p.xz * s).xyz * 2.0 - 1.0;
  vec3 tz = texture2D(uRockNormal, p.xy * s).xyz * 2.0 - 1.0;
  tx = vec3(tx.xy + n.zy, abs(tx.z) * n.x);
  ty = vec3(ty.xy + n.xz, abs(ty.z) * n.y);
  tz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
  return normalize(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z);
}
#define FALLS ${FALLS}
uniform vec3 uFallsTop[FALLS];
uniform vec3 uFallsBase[FALLS];
uniform float uFallsWidth[FALLS];
varying vec3 vWorld;
varying vec3 vWorldNormal;
float tHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1.0, 0.0)), u.x), mix(tHash(i + vec2(0.0, 1.0)), tHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float tFbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * tNoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
`;

export function Terrain() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const maps = getWorldMaps(isTouch);
  const tex = useTexture({
    map: "assets/textures/forest_floor/diff.jpg",
    normalMap: "assets/textures/forest_floor/nor.jpg",
  });

  const geometry = useMemo(() => {
    // Dense enough that the mountains read as rock faces, not facets.
    const seg = isTouch ? 420 : 760;
    const verts = (seg + 1) * (seg + 1);
    const pos = new Float32Array(verts * 3);
    const uv = new Float32Array(verts * 2);
    const xs = new Float32Array(seg + 1);
    for (let i = 0; i <= seg; i++) xs[i] = warp(-1 + (2 * i) / seg);
    let k = 0;
    for (let j = 0; j <= seg; j++) {
      const z = xs[j] - 160;
      for (let i = 0; i <= seg; i++) {
        const x = xs[i];
        pos[k * 3] = x;
        pos[k * 3 + 1] = terrainHeight(x, z);
        pos[k * 3 + 2] = z;
        uv[k * 2] = x / 6;
        uv[k * 2 + 1] = z / 6;
        k++;
      }
    }
    const idx = new Uint32Array(seg * seg * 6);
    let o = 0;
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i;
        const b = a + 1;
        const c = a + seg + 1;
        const d = c + 1;
        idx[o++] = a;
        idx[o++] = c;
        idx[o++] = b;
        idx[o++] = b;
        idx[o++] = c;
        idx[o++] = d;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [isTouch]);

  const material = useMemo(() => {
    for (const t of [tex.map, tex.normalMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
    }
    tex.map.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshStandardMaterial({
      map: tex.map,
      normalMap: tex.normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.95,
      metalness: 0,
      envMapIntensity: 0.35,
    });
    const rock = getRockTextures();
    const uniforms = {
      ...worldMapUniforms(maps),
      uRockColor: { value: rock.color },
      uRockNormal: { value: rock.normal },
      uFallsTop: { value: Array.from({ length: FALLS }, (_, i) => WATERFALLS[i]?.top.clone() ?? new THREE.Vector3(0, -1e4, 0)) },
      uFallsBase: { value: Array.from({ length: FALLS }, (_, i) => WATERFALLS[i]?.base.clone() ?? new THREE.Vector3(1, -1e4, 0)) },
      uFallsWidth: { value: Array.from({ length: FALLS }, (_, i) => WATERFALLS[i]?.width ?? 0) },
    };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\nvarying vec3 vWorld;\nvarying vec3 vWorldNormal;`)
        .replace(
          "#include <worldpos_vertex>",
          `#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${TERRAIN_PARS}`)
        .replace(
          "#include <map_fragment>",
          /* glsl */ `
          gRock = 0.0;
          {
            vec2 xz = vWorld.xz;
            float h = vWorld.y;
            float slope = 1.0 - clamp(vWorldNormal.y, 0.0, 1.0);
            float dist = length(xz - vec2(0.0, -80.0));
            float inMap = 1.0 - smoothstep(1050.0, 1180.0, max(abs(xz.x), abs(xz.y + 0.0)));
            vec4 cov = worldCover(xz);
            float lum = dot(texture2D(map, vMapUv).rgb, vec3(0.3, 0.55, 0.15));
            float lumFar = dot(texture2D(map, vMapUv * 0.11).rgb, vec3(0.3, 0.55, 0.15));
            float detail = mix(lum, lumFar, smoothstep(60.0, 260.0, length(vViewPosition)));

            // Forest floor: moss, leaf litter and needles.
            float patchN = tFbm(xz * 0.035);
            vec3 moss = mix(vec3(0.26, 0.33, 0.13), vec3(0.36, 0.38, 0.17), patchN);
            vec3 litter = vec3(0.40, 0.31, 0.19);
            vec3 floorCol = mix(moss, litter, smoothstep(0.55, 0.75, tFbm(xz * 0.021 + 7.0)) * 0.55);
            // Meadow grass where cover is open.
            vec3 meadow = mix(vec3(0.33, 0.46, 0.16), vec3(0.47, 0.52, 0.22), tFbm(xz * 0.05));
            vec3 col = mix(floorCol, meadow, smoothstep(0.55, 0.95, cov.r) * inMap);
            // Wet gravel in the stream bed.
            col = mix(col, vec3(0.30, 0.27, 0.21), cov.a * inMap);

            // Beyond the forest: forested slopes, rock and snow.
            float m = smoothstep(800.0, 1250.0, dist) + smoothstep(-450.0, -900.0, xz.y) * 0.8;
            m = clamp(m, 0.0, 1.0);
            float canopyN = tFbm(xz * 0.06);
            vec3 canopy = mix(vec3(0.13, 0.21, 0.11), vec3(0.24, 0.32, 0.15), canopyN);
            canopy = mix(canopy, vec3(0.20, 0.24, 0.14), smoothstep(0.62, 0.8, tFbm(xz * 0.013 + 3.0)));
            // Rock: banded strata, dark fissures down the fall line, lichen
            // and scrub clinging wherever the slope eases.
            float strata = tNoise(vec2(xz.x * 0.012 + h * 0.11, xz.y * 0.012));
            float bands = 0.5 + 0.5 * sin(h * 0.21 + tFbm(xz * 0.015) * 14.0);
            vec3 rock = mix(vec3(0.36, 0.35, 0.33), vec3(0.6, 0.58, 0.54), strata * 0.75 + bands * 0.18 + tFbm(xz * 0.024 + 3.0) * 0.12);
            rock = mix(rock, vec3(0.52, 0.47, 0.4), smoothstep(0.55, 0.8, tFbm(xz * 0.017 + 11.0)) * 0.5);
            float fissure = smoothstep(0.62, 0.8, tFbm(vec2(xz.x * 0.05, xz.y * 0.05 + h * 0.012)));
            rock *= 1.0 - fissure * 0.45;
            rock *= 0.78 + 0.4 * tFbm(xz * 0.11);
            float lichen = smoothstep(0.58, 0.75, tFbm(xz * 0.045 + 5.0)) * (1.0 - smoothstep(0.35, 0.6, slope));
            rock = mix(rock, vec3(0.42, 0.44, 0.3), lichen * 0.6);
            float treeline = 380.0 + (tFbm(xz * 0.004) - 0.5) * 140.0;
            float rocky = clamp(smoothstep(0.34, 0.58, slope) + smoothstep(treeline, treeline + 70.0, h), 0.0, 1.0);
            // Scrub and krummholz soften the edge between forest and rock.
            float scrub = smoothstep(0.45, 0.7, tFbm(xz * 0.03 + 21.0)) * (1.0 - smoothstep(0.5, 0.7, slope)) * (1.0 - smoothstep(treeline + 60.0, treeline + 160.0, h));
            vec3 scrubCol = mix(vec3(0.2, 0.26, 0.13), vec3(0.32, 0.33, 0.18), tFbm(xz * 0.08));
            // Real rock surface: triplanar detail at two scales.
            vec3 rn = normalize(vWorldNormal);
            vec3 tri = triColor(vWorld, rn, 1.0 / 22.0) * 0.6 + triColor(vWorld, rn, 1.0 / 97.0) * 0.4;
            float triL = dot(tri, vec3(0.33));
            rock = rock * (0.42 + 1.25 * triL) * mix(vec3(1.0), tri / max(triL, 0.05), 0.35);
            vec3 range = mix(canopy, rock, rocky);
            range = mix(range, scrubCol, scrub * rocky * 0.75);
            float snowLine = 600.0 + (tFbm(xz * 0.006 + 2.0) - 0.5) * 120.0;
            float snow = smoothstep(snowLine, snowLine + 40.0, h) * (1.0 - smoothstep(0.42, 0.62, slope));
            range = mix(range, vec3(0.92, 0.94, 0.97), snow);
            col = mix(col, range, m);
            gRock = m * rocky;

            // The falls: dark, wet rock around each drop and its plunge pool.
            {
              float wet = 0.0;
              for (int i = 0; i < FALLS; i++) {
                vec2 ab = uFallsBase[i].xz - uFallsTop[i].xz;
                float k = clamp(dot(xz - uFallsTop[i].xz, ab) / max(dot(ab, ab), 1.0), 0.0, 1.2);
                float dFalls = length(xz - (uFallsTop[i].xz + ab * k));
                float reach = 8.0 + uFallsWidth[i];
                wet = max(wet, (1.0 - smoothstep(reach, reach * 2.6, dFalls)) * smoothstep(-0.1, 0.1, k));
              }
              vec3 wetRock = mix(vec3(0.17, 0.18, 0.17), vec3(0.3, 0.31, 0.27), tFbm(xz * 0.12));
              wetRock = mix(wetRock, vec3(0.2, 0.27, 0.14), smoothstep(0.55, 0.75, tFbm(xz * 0.08 + 4.0)) * 0.6);
              col = mix(col, wetRock, wet * (0.55 + 0.45 * smoothstep(0.15, 0.4, slope)) * (1.0 - cov.a));
            }

            // Palette above is authored in sRGB; lighting works in linear.
            col = pow(col, vec3(2.2));
            float d = mix(0.6 + 0.9 * detail, 0.85 + 0.3 * tFbm(xz * 0.31), m);
            diffuseColor.rgb = col * d;
          }
          `,
        )
        .replace(
          "#include <normal_fragment_maps>",
          /* glsl */ `
          #include <normal_fragment_maps>
          if (gRock > 0.01) {
            vec3 nW = triNormal(vWorld, normalize(vWorldNormal), 1.0 / 22.0);
            vec3 nV = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
            normal = normalize(mix(normal, nV, clamp(gRock, 0.0, 1.0) * 0.9));
          }
          `,
        );
    };
    m.customProgramCacheKey = () => "territory-terrain-v6";
    return m;
  }, [tex, maps]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} receiveShadow raycast={() => undefined} />;
}
