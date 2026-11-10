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
/** The baked noise repeats every FBM_PERIOD lattice cells. */
const FBM_PERIOD = 32;

let fbmTexture: THREE.DataTexture | null = null;

/**
 * Five octaves of value noise (the terrain shader's old tFbm), baked once
 * into a texture that tiles: each octave's lattice wraps at the texture edge.
 */
function getFbmTexture(size: number): THREE.DataTexture {
  if (fbmTexture) return fbmTexture;
  const hash = (x: number, y: number, seed: number) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const data = new Uint8Array(size * size);
  const sum = new Float32Array(size * size);
  let amp = 0.5;
  for (let o = 0; o < 5; o++) {
    const cells = FBM_PERIOD << o;
    // Lattice values for this octave, then a smooth bilinear blend per texel.
    const lattice = new Float32Array(cells * cells);
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) lattice[j * cells + i] = hash(i, j, o + 1);
    const scale = cells / size;
    for (let y = 0; y < size; y++) {
      const fy = (y + 0.5) * scale;
      const y0 = Math.floor(fy) % cells;
      const y1 = (y0 + 1) % cells;
      let ty = fy - Math.floor(fy);
      ty = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x + 0.5) * scale;
        const x0 = Math.floor(fx) % cells;
        const x1 = (x0 + 1) % cells;
        let tx = fx - Math.floor(fx);
        tx = tx * tx * (3 - 2 * tx);
        const a = lattice[y0 * cells + x0];
        const b = lattice[y0 * cells + x1];
        const c = lattice[y1 * cells + x0];
        const d = lattice[y1 * cells + x1];
        sum[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
    }
    amp *= 0.5;
  }
  for (let i = 0; i < sum.length; i++) data[i] = Math.round(Math.min(1, sum[i]) * 255);
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 2;
  tex.needsUpdate = true;
  fbmTexture = tex;
  return tex;
}

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
// Every noise and rock fetch below takes explicit screen-space gradients, so
// whole blocks can sit behind branches (valley floor vs. mountain) without the
// seams that implicit derivatives give at a branch edge.
vec3 gPx; vec3 gPy;
vec3 triColor(vec3 p, vec3 n, float s) {
  vec3 w = triWeights(n);
  return textureGrad(uRockColor, p.zy * s, gPx.zy * s, gPy.zy * s).rgb * w.x
    + textureGrad(uRockColor, p.xz * s, gPx.xz * s, gPy.xz * s).rgb * w.y
    + textureGrad(uRockColor, p.xy * s, gPx.xy * s, gPy.xy * s).rgb * w.z;
}
// Whiteout-blended triplanar normal, in world space.
vec3 triNormal(vec3 p, vec3 n, float s) {
  vec3 w = triWeights(n);
  vec3 tx = textureGrad(uRockNormal, p.zy * s, gPx.zy * s, gPy.zy * s).xyz * 2.0 - 1.0;
  vec3 ty = textureGrad(uRockNormal, p.xz * s, gPx.xz * s, gPy.xz * s).xyz * 2.0 - 1.0;
  vec3 tz = textureGrad(uRockNormal, p.xy * s, gPx.xy * s, gPy.xy * s).xyz * 2.0 - 1.0;
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
// Fractal noise comes from a baked, tiling, mip-mapped texture. Summing five
// octaves of hashed noise per call, two dozen calls a pixel, was most of the
// frame on a high-density display; one fetch is the same field, filtered.
uniform sampler2D uFbm;
#define FBM_INV ${(1 / FBM_PERIOD).toFixed(6)}
vec2 gXZ; vec2 gFx; vec2 gFy;
/** fbm(xz * k + off). */
float fbm(float k, vec2 off) { return textureGrad(uFbm, (gXZ * k + off) * FBM_INV, gFx * k, gFy * k).r; }
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
    // The same vertices, drawn as tiles so the GPU skips what is off screen.
    return splitGrid(g, seg, TILES);
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
      uFbm: { value: getFbmTexture(1024) },
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
            gXZ = xz;
            gFx = dFdx(xz) * FBM_INV;
            gFy = dFdy(xz) * FBM_INV;
            gPx = dFdx(vWorld);
            gPy = dFdy(vWorld);
            float h = vWorld.y;
            float slope = 1.0 - clamp(vWorldNormal.y, 0.0, 1.0);
            float dist = length(xz - vec2(0.0, -80.0));
            float inMap = 1.0 - smoothstep(1050.0, 1180.0, max(abs(xz.x), abs(xz.y + 0.0)));
            vec4 cov = worldCover(xz);
            // 0 on the valley floor, 1 on the ranges.
            float m = clamp(smoothstep(800.0, 1250.0, dist) + smoothstep(-450.0, -900.0, xz.y) * 0.8, 0.0, 1.0);
            float viewDist = length(vViewPosition);
            vec3 col = vec3(0.0);
            float nearDetail = 1.0;
            float farDetail = 1.0;

            if (m < 0.999) {
              float lum = dot(textureGrad(map, vMapUv, gPx.xz / 6.0, gPy.xz / 6.0).rgb, vec3(0.3, 0.55, 0.15));
              float lumFar = dot(textureGrad(map, vMapUv * 0.11, gPx.xz * (0.11 / 6.0), gPy.xz * (0.11 / 6.0)).rgb, vec3(0.3, 0.55, 0.15));
              nearDetail = 0.6 + 0.9 * mix(lum, lumFar, smoothstep(60.0, 260.0, viewDist));
              // Forest floor: moss, leaf litter and needles.
              float patchN = fbm(0.035, vec2(0.0));
              vec3 moss = mix(vec3(0.26, 0.33, 0.13), vec3(0.36, 0.38, 0.17), patchN);
              vec3 litter = vec3(0.40, 0.31, 0.19);
              vec3 floorCol = mix(moss, litter, smoothstep(0.55, 0.75, fbm(0.021, vec2(7.0))) * 0.55);
              // Meadow grass where cover is open.
              vec3 meadow = mix(vec3(0.33, 0.46, 0.16), vec3(0.47, 0.52, 0.22), fbm(0.05, vec2(0.0)));
              col = mix(floorCol, meadow, smoothstep(0.55, 0.95, cov.r) * inMap);
              // Water's edge: silt and wet grass in patches, never one even band.
              float edge = cov.a * inMap;
              if (edge > 0.002) {
                vec3 edgeCol = mix(vec3(0.30, 0.27, 0.21), vec3(0.22, 0.29, 0.15), smoothstep(0.35, 0.7, fbm(0.06, vec2(3.0))));
                col = mix(col, edgeCol, edge * (0.5 + 0.5 * fbm(0.11, vec2(-2.0))));
              }
            }

            // Beyond the forest: forested slopes, rock and snow.
            if (m > 0.001) {
              float canopyN = fbm(0.06, vec2(0.0));
              vec3 canopy = mix(vec3(0.13, 0.21, 0.11), vec3(0.24, 0.32, 0.15), canopyN);
              canopy = mix(canopy, vec3(0.20, 0.24, 0.14), smoothstep(0.62, 0.8, fbm(0.013, vec2(3.0))));
              float treeline = 380.0 + (fbm(0.004, vec2(0.0)) - 0.5) * 140.0;
              float rocky = clamp(smoothstep(0.34, 0.58, slope) + smoothstep(treeline, treeline + 70.0, h), 0.0, 1.0);
              vec3 range = canopy;
              if (rocky > 0.002) {
                // Rock: banded strata, dark fissures down the fall line, lichen
                // and scrub clinging wherever the slope eases.
                float strata = fbm(0.012, vec2(h * 0.11 + 31.0, 17.0));
                float bands = 0.5 + 0.5 * sin(h * 0.21 + fbm(0.015, vec2(0.0)) * 14.0);
                vec3 rock = mix(vec3(0.36, 0.35, 0.33), vec3(0.6, 0.58, 0.54), strata * 0.75 + bands * 0.18 + fbm(0.024, vec2(3.0)) * 0.12);
                rock = mix(rock, vec3(0.52, 0.47, 0.4), smoothstep(0.55, 0.8, fbm(0.017, vec2(11.0))) * 0.5);
                float fissure = smoothstep(0.62, 0.8, fbm(0.05, vec2(0.0, h * 0.012)));
                rock *= 1.0 - fissure * 0.45;
                rock *= 0.78 + 0.4 * fbm(0.11, vec2(0.0));
                float lichen = smoothstep(0.58, 0.75, fbm(0.045, vec2(5.0))) * (1.0 - smoothstep(0.35, 0.6, slope));
                rock = mix(rock, vec3(0.42, 0.44, 0.3), lichen * 0.6);
                // Scrub and krummholz soften the edge between forest and rock.
                float scrub = smoothstep(0.45, 0.7, fbm(0.03, vec2(21.0))) * (1.0 - smoothstep(0.5, 0.7, slope)) * (1.0 - smoothstep(treeline + 60.0, treeline + 160.0, h));
                vec3 scrubCol = mix(vec3(0.2, 0.26, 0.13), vec3(0.32, 0.33, 0.18), fbm(0.08, vec2(0.0)));
                // Real rock surface: triplanar detail at two scales.
                vec3 rn = normalize(vWorldNormal);
                vec3 tri = triColor(vWorld, rn, 1.0 / 22.0) * 0.6 + triColor(vWorld, rn, 1.0 / 97.0) * 0.4;
                float triL = dot(tri, vec3(0.33));
                rock = rock * (0.42 + 1.25 * triL) * mix(vec3(1.0), tri / max(triL, 0.05), 0.35);
                range = mix(canopy, rock, rocky);
                range = mix(range, scrubCol, scrub * rocky * 0.75);
              }
              float snowLine = 600.0 + (fbm(0.006, vec2(2.0)) - 0.5) * 120.0;
              float snow = smoothstep(snowLine, snowLine + 40.0, h) * (1.0 - smoothstep(0.42, 0.62, slope));
              range = mix(range, vec3(0.92, 0.94, 0.97), snow);
              col = mix(col, range, m);
              gRock = m * rocky;
              farDetail = 0.85 + 0.3 * fbm(0.31, vec2(0.0));
            }

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
              if (wet > 0.002) {
                vec3 wetRock = mix(vec3(0.17, 0.18, 0.17), vec3(0.3, 0.31, 0.27), fbm(0.12, vec2(0.0)));
                wetRock = mix(wetRock, vec3(0.2, 0.27, 0.14), smoothstep(0.55, 0.75, fbm(0.08, vec2(4.0))) * 0.6);
                col = mix(col, wetRock, wet * (0.55 + 0.45 * smoothstep(0.15, 0.4, slope)) * (1.0 - cov.a));
              }
            }

            // Palette above is authored in sRGB; lighting works in linear.
            col = pow(col, vec3(2.2));
            diffuseColor.rgb = col * mix(nearDetail, farDetail, m);
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
    m.customProgramCacheKey = () => "territory-terrain-v8";
    return m;
  }, [tex, maps]);

  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geometry.forEach((g) => g.dispose()), [geometry]);

  return (
    <>
      {geometry.map((g, i) => (
        <mesh key={i} geometry={g} material={material} receiveShadow raycast={() => undefined} />
      ))}
    </>
  );
}

/** Terrain tiles per side. */
const TILES = 4;

/**
 * Split an indexed (seg × seg) grid into tiles × tiles geometries that share
 * the grid's vertex buffers (uploaded once) and differ only in their index
 * range and bounds, so each tile can be frustum-culled on its own.
 */
function splitGrid(grid: THREE.BufferGeometry, seg: number, tiles: number): THREE.BufferGeometry[] {
  const pos = grid.attributes.position as THREE.BufferAttribute;
  const edges = Array.from({ length: tiles + 1 }, (_, t) => Math.round((t * seg) / tiles));
  const out: THREE.BufferGeometry[] = [];
  const v = new THREE.Vector3();
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const [i0, i1, j0, j1] = [edges[tx], edges[tx + 1], edges[ty], edges[ty + 1]];
      const idx = new Uint32Array((i1 - i0) * (j1 - j0) * 6);
      const box = new THREE.Box3();
      let o = 0;
      for (let j = j0; j < j1; j++) {
        for (let i = i0; i < i1; i++) {
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
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) box.expandByPoint(v.fromBufferAttribute(pos, j * (seg + 1) + i));
      const g = new THREE.BufferGeometry();
      for (const name of Object.keys(grid.attributes)) g.setAttribute(name, grid.attributes[name]);
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.boundingBox = box;
      g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      out.push(g);
    }
  }
  return out;
}
