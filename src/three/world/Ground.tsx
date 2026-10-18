"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { createRng, seededRng } from "@/lib/random";
import { UNFLIPPED_NORMAL, floraGlobals, supportsAlphaToCoverage } from "../flora/floraMaterials";
import { accountClearings, clearingFactor, terrainHeight } from "../layout";

const TEX = {
  map: "/assets/textures/forest_floor/diff.jpg",
  normalMap: "/assets/textures/forest_floor/nor.jpg",
};

function smooth(e0: number, e1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, z: number) {
  return (
    Math.sin(x * 0.031 + 1.7) * Math.cos(z * 0.027 + 0.3) * 0.5 +
    Math.sin(x * 0.083 + z * 0.061) * 0.3 +
    Math.sin(x * 0.17 - z * 0.13 + 2.1) * 0.2
  );
}

const MEADOW = new THREE.Color("#5f7333");
const DRY = new THREE.Color("#8f8a4c");
const FLOOR = new THREE.Color("#55492f");
const SHADE = new THREE.Color("#4a5a2a");

/** Ground colour as a function of place: meadow, dry patches, lawns under crowns, forest floor. */
function groundColor(x: number, z: number, out: THREE.Color) {
  const e = clearingFactor(x, z);
  const n = valueNoise(x, z);
  out.copy(MEADOW).lerp(DRY, smooth(0.05, 0.6, n) * 0.55);
  for (const c of accountClearings()) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < 26) out.lerp(SHADE, (1 - d / 26) * 0.5);
  }
  out.lerp(FLOOR, smooth(0.92, 1.3, e + n * 0.08));
  return out;
}

export function Terrain() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const maps = useTexture(TEX);
  const geometry = useMemo(() => {
    const seg = isTouch ? 140 : 240;
    const geo = new THREE.PlaneGeometry(2600, 2600, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) - 200;
      pos.setZ(i, z);
      pos.setY(i, terrainHeight(x, z));
      groundColor(x, z, c);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [isTouch]);

  const material = useMemo(() => {
    for (const t of [maps.map, maps.normalMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(160, 160);
      t.anisotropy = 8;
    }
    maps.map.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: maps.map,
      normalMap: maps.normalMap,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 0.96,
      metalness: 0,
      envMapIntensity: 0.4,
    });
    // The photo texture contributes only luminance detail; colour comes from the vertex palette.
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        /* glsl */ `
        #ifdef USE_MAP
          vec4 texel = texture2D(map, vMapUv);
          float l = dot(texel.rgb, vec3(0.3, 0.55, 0.15));
          diffuseColor.rgb *= 0.55 + 1.6 * l;
        #endif
        `,
      );
    };
    m.customProgramCacheKey = () => "territory-ground-v1";
    return m;
  }, [maps]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} receiveShadow />;
}

/* ------------------------------------------------------------------------ */
/* Grass                                                                     */
/* ------------------------------------------------------------------------ */

let grassTex: THREE.DataTexture | null = null;

function getGrassAtlas() {
  if (grassTex || typeof document === "undefined") return grassTex;
  const W = 512;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const rng = createRng(77);
  ctx.lineCap = "round";
  for (let i = 0; i < 240; i++) {
    const x = rng.range(14, W - 14);
    const h = H * rng.range(0.4, 0.97);
    const lean = rng.gauss() * 40;
    const w = rng.range(2.5, 5);
    const v = rng.range(0.72, 1.0);
    const dry = rng.chance(0.1);
    const r = Math.round(255 * v * (dry ? 0.98 : 0.78));
    const g = Math.round(255 * v * (dry ? 0.9 : 0.95));
    const b = Math.round(255 * v * (dry ? 0.55 : 0.5));
    // Tapered blade as a filled curve.
    ctx.beginPath();
    ctx.moveTo(x - w / 2, H);
    ctx.quadraticCurveTo(x - w / 2 + lean * 0.3, H - h * 0.55, x + lean, H - h);
    ctx.quadraticCurveTo(x + w / 2 + lean * 0.3, H - h * 0.55, x + w / 2, H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, H, 0, H - h);
    grad.addColorStop(0, `rgb(${Math.round(r * 0.82)},${Math.round(g * 0.86)},${Math.round(b * 0.76)})`);
    grad.addColorStop(1, `rgb(${r},${g},${b})`);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  const data = new Uint8ClampedArray(ctx.getImageData(0, 0, W, H).data);
  // Dilate colour into transparent texels so mips keep the blade colour.
  for (let pass = 0; pass < 4; pass++) {
    const src = new Uint8ClampedArray(data);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        if (src[i + 3] > 0) continue;
        for (const o of [4, -4, W * 4, -W * 4]) {
          if (src[i + o + 3] > 0) {
            data[i] = src[i + o];
            data[i + 1] = src[i + o + 1];
            data[i + 2] = src[i + o + 2];
            break;
          }
        }
      }
    }
  }
  const tex = new THREE.DataTexture(new Uint8Array(data.buffer), W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  // Canvas rows run top-down; flip so blades grow up from v = 0.
  tex.flipY = false;
  tex.needsUpdate = true;
  grassTex = tex;
  return tex;
}

function grassGeometry() {
  // A tuft: three quads splayed outward so blades read from above as well as
  // from the side. v = 1 at the root (canvas bottom row).
  const g = new THREE.BufferGeometry();
  const w = 0.55;
  const h = 0.8;
  const splay = 0.35;
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const ox = Math.cos(a);
    const oz = Math.sin(a);
    // Quad tangent is perpendicular to its outward lean.
    const tx = -oz * w;
    const tz = ox * w;
    const lx = ox * splay;
    const lz = oz * splay;
    const base = pos.length / 3;
    pos.push(-tx + ox * 0.15, 0, -tz + oz * 0.15, tx + ox * 0.15, 0, tz + oz * 0.15, tx + lx, h, tz + lz, -tx + lx, h, -tz + lz);
    uv.push(0, 1, 1, 1, 1, 0, 0, 0);
    for (let q = 0; q < 4; q++) nor.push(ox * 0.25, 1, oz * 0.25);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function Grass() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const count = isTouch ? 26000 : 80000;

  const mesh = useMemo(() => {
    const geometry = grassGeometry();
    const material = new THREE.MeshStandardMaterial({
      map: getGrassAtlas() ?? undefined,
      alphaTest: 0.5,
      alphaToCoverage: supportsAlphaToCoverage(),
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0,
      color: new THREE.Color("#8fa257"),
      envMapIntensity: 0.4,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = floraGlobals.uTime;
      shader.uniforms.uWind = floraGlobals.uWind;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>\nuniform float uTime;\nuniform vec3 uWind;\nattribute vec2 aGrass;\nvarying vec2 vGrass;\nvarying float vH;`,
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `
          #include <begin_vertex>
          vGrass = aGrass;
          vH = position.y;
          {
            vec3 wp = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            float ph = dot(wp.xz, vec2(0.05, 0.04));
            float s = sin(uTime * 1.6 + ph) * 0.6 + sin(uTime * 2.7 + ph * 1.7) * 0.25 + 0.35;
            vec3 w = vec3(uWind.x, 0.0, uWind.z) * s * 0.35 * position.y * position.y;
            mat3 im = mat3(instanceMatrix);
            transformed += transpose(im) * w / dot(im[0], im[0]);
          }
          `,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\nvarying vec2 vGrass;\nvarying float vH;`)
        .replace("#include <normal_fragment_begin>", UNFLIPPED_NORMAL)
        .replace(
          "#include <map_fragment>",
          /* glsl */ `
          #include <map_fragment>
          diffuseColor.rgb *= mix(vec3(0.9, 0.98, 0.8), vec3(1.1, 1.02, 0.78), vGrass.y);
          diffuseColor.rgb *= 0.86 + 0.22 * vGrass.x;
          diffuseColor.rgb *= mix(0.82, 1.04, smoothstep(0.0, 0.8, vH));
          `,
        );
    };
    material.customProgramCacheKey = () => "territory-grass-v2";

    const inst = new THREE.InstancedMesh(geometry, material, count);
    const attr = new Float32Array(count * 2);
    const rng = seededRng("grass", count);
    const clearings = accountClearings();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    let i = 0;
    let guard = 0;
    while (i < count && guard < count * 6) {
      guard++;
      let x: number;
      let z: number;
      if (rng.chance(0.42)) {
        // Lawns around the account trees get extra density for close-ups.
        const c = rng.pick(clearings);
        const a = rng.range(0, Math.PI * 2);
        const r = 5 + Math.sqrt(rng.next()) * 36;
        x = c.x + Math.cos(a) * r;
        z = c.z + Math.sin(a) * r;
      } else {
        x = rng.range(-240, 250);
        z = rng.range(-250, 120);
      }
      const e = clearingFactor(x, z);
      if (e > 1.12 || (e > 0.95 && rng.chance((e - 0.95) * 5))) continue;
      const scale = rng.range(0.75, 1.45) * (1.0 - Math.max(0, e - 0.9));
      p.set(x, terrainHeight(x, z) - 0.05, z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.range(0, Math.PI * 2));
      s.set(scale * rng.range(0.85, 1.25), scale * rng.range(0.9, 1.5), scale);
      m.compose(p, q, s);
      inst.setMatrixAt(i, m);
      attr[i * 2] = rng.next();
      attr[i * 2 + 1] = Math.max(0, valueNoise(x, z) * 0.9 + rng.gauss() * 0.25);
      i++;
    }
    inst.count = i;
    geometry.setAttribute("aGrass", new THREE.InstancedBufferAttribute(attr, 2));
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    inst.receiveShadow = true;
    inst.raycast = () => undefined;
    return inst;
  }, [count]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}

/* ------------------------------------------------------------------------ */
/* Wildflowers                                                               */
/* ------------------------------------------------------------------------ */

let flowerTex: THREE.DataTexture | null = null;

/** Four cells of small meadow flowers on stems: white, butter-yellow, lilac, cream. */
function getFlowerAtlas() {
  if (flowerTex || typeof document === "undefined") return flowerTex;
  const C = 128;
  const canvas = document.createElement("canvas");
  canvas.width = C * 4;
  canvas.height = C;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const rng = createRng(31);
  const petals = ["#f4f1e8", "#f1d65a", "#c7a6e0", "#f5e6bf"];
  const centers = ["#e7b53a", "#c98a1e", "#f0e2a0", "#d9a53a"];
  for (let cell = 0; cell < 4; cell++) {
    const ox = cell * C;
    for (let f = 0; f < 4; f++) {
      const x = ox + 22 + f * 26 + rng.gauss() * 6;
      const top = C * rng.range(0.12, 0.42);
      ctx.strokeStyle = "rgb(96,124,58)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x + rng.gauss() * 4, C);
      ctx.quadraticCurveTo(x + rng.gauss() * 8, (C + top) / 2, x, top);
      ctx.stroke();
      const r = rng.range(6, 9.5);
      ctx.fillStyle = petals[cell];
      const n = cell === 2 ? 0 : 6;
      if (n === 0) {
        // Clover-like head.
        for (let k = 0; k < 9; k++) {
          ctx.beginPath();
          ctx.arc(x + rng.gauss() * r * 0.5, top + rng.gauss() * r * 0.5, r * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * r * 0.6, top + Math.sin(a) * r * 0.45, r * 0.55, r * 0.32, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = centers[cell];
        ctx.beginPath();
        ctx.arc(x, top, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const data = new Uint8ClampedArray(ctx.getImageData(0, 0, C * 4, C).data);
  for (let pass = 0; pass < 3; pass++) {
    const src = new Uint8ClampedArray(data);
    for (let i = 4; i < data.length - 4; i += 4) {
      if (src[i + 3] > 0) continue;
      for (const o of [4, -4]) {
        if (src[i + o + 3] > 0) {
          data[i] = src[i + o];
          data[i + 1] = src[i + o + 1];
          data[i + 2] = src[i + o + 2];
          break;
        }
      }
    }
  }
  const tex = new THREE.DataTexture(new Uint8Array(data.buffer), C * 4, C, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  flowerTex = tex;
  return tex;
}

export function Wildflowers() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const count = isTouch ? 1500 : 4200;
  const mesh = useMemo(() => {
    const geometry = grassGeometry();
    const material = new THREE.MeshStandardMaterial({
      map: getFlowerAtlas() ?? undefined,
      alphaTest: 0.5,
      alphaToCoverage: supportsAlphaToCoverage(),
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0,
      envMapIntensity: 0.4,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = floraGlobals.uTime;
      shader.uniforms.uWind = floraGlobals.uWind;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\nuniform float uTime;\nuniform vec3 uWind;\nattribute float aCell;`)
        .replace(
          "#include <uv_vertex>",
          `#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vec2((uv.x + aCell) * 0.25, uv.y);\n#endif`,
        )
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `
          #include <begin_vertex>
          {
            vec3 wp = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
            float ph = dot(wp.xz, vec2(0.05, 0.04));
            float s = sin(uTime * 1.9 + ph) * 0.6 + 0.3;
            vec3 w = vec3(uWind.x, 0.0, uWind.z) * s * 0.3 * position.y * position.y;
            mat3 im = mat3(instanceMatrix);
            transformed += transpose(im) * w / dot(im[0], im[0]);
          }
          `,
        );
      shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_begin>", UNFLIPPED_NORMAL);
    };
    material.customProgramCacheKey = () => "territory-flowers-v1";

    const inst = new THREE.InstancedMesh(geometry, material, count);
    const cells = new Float32Array(count);
    const rng = seededRng("flowers", count);
    const clearings = accountClearings();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    let i = 0;
    let guard = 0;
    while (i < count && guard < count * 12) {
      guard++;
      const x = rng.range(-230, 240);
      const z = rng.range(-240, 110);
      const e = clearingFactor(x, z);
      if (e > 1.0) continue;
      // Flowers grow in drifts, not evenly.
      const n = valueNoise(x * 1.7 + 40, z * 1.7 - 20);
      if (n < 0.25 && !rng.chance(0.05)) continue;
      if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < 12)) continue;
      const s = rng.range(0.9, 1.5);
      m.compose(
        new THREE.Vector3(x, terrainHeight(x, z) - 0.05, z),
        q.setFromAxisAngle(up, rng.range(0, Math.PI * 2)),
        new THREE.Vector3(s, s * rng.range(1.0, 1.4), s),
      );
      inst.setMatrixAt(i, m);
      // Each drift leans toward one colour.
      cells[i] = Math.floor(((n * 7 + 10) % 4) + (rng.chance(0.25) ? rng.int(1, 3) : 0)) % 4;
      i++;
    }
    inst.count = i;
    geometry.setAttribute("aCell", new THREE.InstancedBufferAttribute(cells, 1));
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    inst.receiveShadow = true;
    inst.raycast = () => undefined;
    return inst;
  }, [count]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
}
