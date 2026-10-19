"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { seededRng } from "@/lib/random";
import { generateTree, type TreeShape } from "../flora/generateTree";
import { generateConifer } from "../flora/generateConifer";
import { buildTreeGeometries, type TreeGeometries } from "../flora/treeMeshes";
import { getFoliageAtlas } from "../flora/foliageAtlas";
import { getNeedleAtlas } from "./atlases";
import { createBarkMaterial, createFoliageMaterial, createTreeUniforms, floraGlobals, type LodFade } from "../flora/floraMaterials";
import { BARK_TEX, configureBarkMaps } from "../flora/barkMaps";
import { SUN_DIR, fbm, groundCover, mountainFactor, terrainHeight } from "../layout";

/**
 * The wild forest around the accounts: tens of thousands of trees of six
 * species (four broadleaf, two conifer) from the same generators as the
 * account trees.
 *
 * Near the camera each tree is real geometry with wind, shadows and
 * translucency. Farther out it is an impostor: the same tree captured at load
 * from eight angles into an atlas and drawn as a camera-facing card that
 * blends between the two nearest captures. The hand-off is a dithered
 * cross-fade, so trees never pop.
 */

interface Species {
  kind: "broadleaf" | "conifer";
  shape: () => TreeShape;
}

const SPECIES: Species[] = [
  { kind: "broadleaf", shape: () => generateTree({ seed: 9101, height: 34, trunkRadius: 1.2, limbs: limbs(5), spread: 1.05, depth: 1, cardSize: 5.8, leafDensity: 1.4 }) },
  { kind: "broadleaf", shape: () => generateTree({ seed: 9202, height: 42, trunkRadius: 1.3, limbs: limbs(4), spread: 0.72, upright: 1.35, depth: 1, cardSize: 6.4, leafDensity: 1.4 }) },
  { kind: "broadleaf", shape: () => generateTree({ seed: 9303, height: 26, trunkRadius: 0.9, limbs: limbs(4), spread: 1.0, upright: 1.05, depth: 1, cardSize: 4.8, leafDensity: 1.4 }) },
  { kind: "broadleaf", shape: () => generateTree({ seed: 9404, height: 38, trunkRadius: 1.4, limbs: limbs(6), spread: 1.2, upright: 0.9, depth: 1, cardSize: 6.2, leafDensity: 1.4 }) },
  { kind: "conifer", shape: () => generateConifer({ seed: 7101, height: 40, trunkRadius: 0.95, width: 0.25, cardSize: 3.6, density: 1.1 }) },
  { kind: "conifer", shape: () => generateConifer({ seed: 7202, height: 28, trunkRadius: 0.7, width: 0.3, cardSize: 3.0, density: 1.1 }) },
];

function limbs(n: number) {
  return Array.from({ length: n }, (_, i) => ({ weight: 0.55 + (0.45 * ((i * 7) % 5)) / 4 }));
}

const VIEWS = 8;
const LOD: LodFade = { near: 150, far: 195 };
const LOD_TOUCH: LodFade = { near: 95, far: 130 };

interface TreeInstance {
  x: number;
  y: number;
  z: number;
  species: number;
  scale: number;
  yaw: number;
  tint: THREE.Color;
}

function placeForest(dense: boolean): TreeInstance[] {
  const rng = seededRng("wild-forest", dense ? 1 : 0);
  const spacing = dense ? 12.5 : 17;
  const out: TreeInstance[] = [];
  for (let gz = -1900; gz < 1500; gz += spacing) {
    for (let gx = -1700; gx < 1700; gx += spacing) {
      const x = gx + rng.gauss() * spacing * 0.45;
      const z = gz + rng.gauss() * spacing * 0.45;
      const r = Math.hypot(x, z + 80);
      if (r > 1750) continue;
      const c = groundCover(x, z);
      if (rng.next() > c.trees) continue;
      const mf = mountainFactor(x, z);
      const conifer = rng.next() < THREE.MathUtils.clamp(0.12 + mf * 0.95 + (fbm(x * 0.004 + 9, z * 0.004, 2) - 0.5) * 0.7, 0, 0.95);
      const species = conifer ? 4 + (rng.chance(0.55) ? 0 : 1) : rng.int(0, 3);
      const scale = rng.range(0.78, 1.28) * (1 - mf * 0.25);
      const warm = !conifer && rng.chance(0.1) ? rng.range(0.1, 0.28) : 0;
      const v = rng.range(0.82, 1.08);
      const tint = conifer
        ? new THREE.Color(v * 0.72, v * 0.86, v * 0.82)
        : new THREE.Color(v * (1 + warm * 0.8), v * (1 + warm * 0.2), v * (1 - warm));
      out.push({ x, y: terrainHeight(x, z) - 0.4, z, species, scale, yaw: rng.range(0, Math.PI * 2), tint });
    }
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Materials per species                                                     */
/* ------------------------------------------------------------------------ */

interface SpeciesAssets {
  geometries: TreeGeometries;
  bark: THREE.Material;
  foliage: { material: THREE.Material; depth: THREE.Material };
  /** Captures without LOD dithering. */
  captureBark: THREE.Material;
  captureFoliage: THREE.Material;
  /** Square capture extent and the bottom of the frame, in tree units. */
  frame: number;
  bottom: number;
}

function useSpeciesAssets(lod: LodFade) {
  const maps = useTexture(BARK_TEX);
  return useMemo(() => {
    configureBarkMaps(maps);
    const uniforms = createTreeUniforms(0.86);
    const leaf = getFoliageAtlas();
    const needle = getNeedleAtlas();
    const barkLod = createBarkMaterial(maps, uniforms, { moss: 0.6, lod });
    const barkCap = createBarkMaterial(maps, uniforms, { moss: 0.6 });
    const leafLod = createFoliageMaterial(leaf, uniforms, { translucency: 0.6, alphaToCoverage: false, lod });
    const leafCap = createFoliageMaterial(leaf, uniforms, { translucency: 0.6, alphaToCoverage: false });
    const needleLod = createFoliageMaterial(needle, uniforms, { translucency: 0.3, alphaToCoverage: false, lod });
    const needleCap = createFoliageMaterial(needle, uniforms, { translucency: 0.3, alphaToCoverage: false });
    return SPECIES.map((sp): SpeciesAssets => {
      const shape = sp.shape();
      const geometries = buildTreeGeometries(shape, { lowDetail: true, cardScale: sp.kind === "broadleaf" ? 1.35 : 1.15 });
      const box = new THREE.Box3().setFromBufferAttribute(geometries.foliage.attributes.position as THREE.BufferAttribute);
      box.union(new THREE.Box3().setFromBufferAttribute(geometries.bark.attributes.position as THREE.BufferAttribute));
      let reach = 0;
      for (const g of [geometries.foliage, geometries.bark]) {
        const p = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) reach = Math.max(reach, Math.hypot(p.getX(i), p.getZ(i)));
      }
      const frame = Math.max(reach * 2, box.max.y - box.min.y) * 1.02;
      const conifer = sp.kind === "conifer";
      return {
        geometries,
        bark: barkLod,
        foliage: conifer ? needleLod : leafLod,
        captureBark: barkCap,
        captureFoliage: conifer ? needleCap.material : leafCap.material,
        frame,
        bottom: box.min.y,
      };
    });
  }, [maps, lod]);
}

/* ------------------------------------------------------------------------ */
/* Near field: real geometry                                                 */
/* ------------------------------------------------------------------------ */

function NearForest({ trees, assets, lod, shadows }: { trees: TreeInstance[]; assets: SpeciesAssets[]; lod: LodFade; shadows: boolean }) {
  const capacity = 900;
  const meshes = useMemo(
    () =>
      assets.map((a) => {
        const bark = new THREE.InstancedMesh(a.geometries.bark, a.bark, capacity);
        const leaves = new THREE.InstancedMesh(a.geometries.foliage, a.foliage.material, capacity);
        leaves.customDepthMaterial = a.foliage.depth;
        for (const m of [bark, leaves]) {
          m.count = 0;
          m.castShadow = shadows;
          m.receiveShadow = true;
          m.frustumCulled = false;
          m.raycast = () => undefined;
          m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        }
        leaves.setColorAt(0, new THREE.Color(1, 1, 1));
        return { bark, leaves };
      }),
    [assets, shadows],
  );
  const last = useRef(new THREE.Vector3(1e9, 0, 0));
  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) }),
    [],
  );

  useFrame(({ camera }) => {
    if (camera.position.distanceToSquared(last.current) < 64) return;
    last.current.copy(camera.position);
    const r2 = lod.far * lod.far;
    const counts = new Array(assets.length).fill(0);
    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;
    for (const t of trees) {
      const dx = t.x - cx;
      const dy = t.y - cy;
      const dz = t.z - cz;
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      const k = counts[t.species];
      if (k >= capacity) continue;
      tmp.p.set(t.x, t.y, t.z);
      tmp.q.setFromAxisAngle(tmp.up, t.yaw);
      tmp.s.setScalar(t.scale);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      const { bark, leaves } = meshes[t.species];
      bark.setMatrixAt(k, tmp.m);
      leaves.setMatrixAt(k, tmp.m);
      leaves.setColorAt(k, t.tint);
      counts[t.species] = k + 1;
    }
    meshes.forEach(({ bark, leaves }, i) => {
      bark.count = counts[i];
      leaves.count = counts[i];
      bark.instanceMatrix.needsUpdate = true;
      leaves.instanceMatrix.needsUpdate = true;
      if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    });
  });

  useEffect(
    () => () => {
      meshes.forEach(({ bark, leaves }) => {
        bark.dispose();
        leaves.dispose();
      });
    },
    [meshes],
  );

  return (
    <>
      {meshes.map(({ bark, leaves }, i) => (
        <group key={i}>
          <primitive object={bark} />
          <primitive object={leaves} />
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Far field: impostors                                                      */
/* ------------------------------------------------------------------------ */

function captureAtlas(gl: THREE.WebGLRenderer, assets: SpeciesAssets[], cell: number, msaa: boolean) {
  const W = VIEWS * cell;
  const H = assets.length * cell;
  const rt = new THREE.WebGLRenderTarget(W, H, {
    samples: msaa ? 4 : 0,
    colorSpace: THREE.SRGBColorSpace,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
  });
  rt.texture.anisotropy = 4;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#cfe0f2", "#6a6444", 1.6));
  scene.add(new THREE.AmbientLight("#ffffff", 0.25));
  const key = new THREE.DirectionalLight("#ffe6c4", 2.6);
  key.position.set(0.4, 0.9, 1);
  scene.add(key);
  const holder = new THREE.Group();
  scene.add(holder);

  const prev = {
    target: gl.getRenderTarget(),
    viewport: gl.getViewport(new THREE.Vector4()),
    scissor: gl.getScissor(new THREE.Vector4()),
    scissorTest: gl.getScissorTest(),
    clear: gl.getClearColor(new THREE.Color()),
    alpha: gl.getClearAlpha(),
    autoClear: gl.autoClear,
    shadows: gl.shadowMap.enabled,
  };
  gl.shadowMap.enabled = false;
  gl.autoClear = false;
  gl.setRenderTarget(rt);
  // Clear to foliage green with zero alpha so mip edges never darken.
  gl.setClearColor(new THREE.Color(0.16, 0.24, 0.1), 0);
  gl.setScissorTest(false);
  gl.clear(true, true, true);
  gl.setScissorTest(true);

  assets.forEach((a, s) => {
    holder.clear();
    const bark = new THREE.Mesh(a.geometries.bark, a.captureBark);
    const leaves = new THREE.Mesh(a.geometries.foliage, a.captureFoliage);
    holder.add(bark, leaves);
    const half = a.frame / 2;
    const cam = new THREE.OrthographicCamera(-half, half, a.bottom + a.frame, a.bottom, 0.1, 400);
    cam.position.set(0, 0, 200);
    cam.lookAt(0, 0, 0);
    // lookAt from y = 0 keeps the vertical frame aligned with the tree.
    cam.position.y = 0;
    cam.updateMatrixWorld();
    for (let v = 0; v < VIEWS; v++) {
      holder.rotation.y = -(v / VIEWS) * Math.PI * 2;
      holder.updateMatrixWorld(true);
      gl.setViewport(v * cell, s * cell, cell, cell);
      gl.setScissor(v * cell, s * cell, cell, cell);
      gl.clear(true, true, false);
      gl.render(scene, cam);
    }
  });

  gl.setRenderTarget(prev.target);
  gl.setViewport(prev.viewport);
  gl.setScissor(prev.scissor);
  gl.setScissorTest(prev.scissorTest);
  gl.setClearColor(prev.clear, prev.alpha);
  gl.autoClear = prev.autoClear;
  gl.shadowMap.enabled = prev.shadows;
  return rt;
}

const IMPOSTOR_VERT = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  attribute vec3 aPos;
  attribute float aSize;
  attribute float aSpecies;
  attribute float aYaw;
  attribute vec3 aTint;
  uniform float uViews;
  uniform float uSpeciesCount;
  uniform float uTime;
  uniform vec3 uWind;
  uniform vec3 uSun;
  varying vec2 vUv0;
  varying vec2 vUv1;
  varying float vBlend;
  varying vec3 vTint;
  varying float vDist;
  varying float vLight;
  uniform vec2 uLod;
  void main() {
    vec3 toCam = cameraPosition - aPos;
    vDist = length(toCam);
    // Inside the detailed range the real tree draws: emit no fragments at all.
    if (vDist < uLod.x) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec2 d = normalize(toCam.xz);
    float ang = atan(d.x, d.y) - aYaw;
    float f = fract(ang / 6.2831853) * uViews;
    float i0 = floor(f);
    vBlend = f - i0;
    float i1 = mod(i0 + 1.0, uViews);
    vec2 cellUv = vec2(uv.x, uv.y);
    vUv0 = vec2((i0 + cellUv.x) / uViews, (aSpecies + cellUv.y) / uSpeciesCount);
    vUv1 = vec2((i1 + cellUv.x) / uViews, (aSpecies + cellUv.y) / uSpeciesCount);

    vec3 fwd = normalize(toCam);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 up = normalize(mix(vec3(0.0, 1.0, 0.0), cross(fwd, right), 0.35));
    vec3 wp = aPos + right * position.x * aSize + up * position.y * aSize;
    float sway = sin(uTime * 0.9 + aPos.x * 0.05 + aPos.z * 0.03);
    wp.xz += uWind.xz * sway * position.y * position.y * 0.6;
    vTint = aTint;
    // Sun behind the viewer lights the visible side; against the sun it darkens.
    vLight = 0.82 + 0.26 * dot(normalize(uSun.xz), d);
    vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const IMPOSTOR_FRAG = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform sampler2D uAtlas;
  uniform vec2 uAtlasSize;
  uniform vec2 uLod;
  varying vec2 vUv0;
  varying vec2 vUv1;
  varying float vBlend;
  varying vec3 vTint;
  varying float vDist;
  varying float vLight;
  void main() {
    float fadeNear = 1.0 - smoothstep(uLod.x, uLod.y, vDist);
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (ign <= fadeNear) discard;
    vec4 a = texture2D(uAtlas, vUv0);
    vec4 b = texture2D(uAtlas, vUv1);
    vec4 c = mix(a, b, vBlend);
    vec2 tc = vUv0 * uAtlasSize;
    float lod = max(0.0, 0.5 * log2(max(dot(dFdx(tc), dFdx(tc)), dot(dFdy(tc), dFdy(tc)))));
    c.a *= 1.0 + lod * 0.35;
    if (c.a < 0.5) discard;
    // The atlas was cleared to foliage green, so edge texels need no unpremultiply.
    vec3 col = c.rgb * vTint * vLight;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function ImpostorField({ trees, assets, lod }: { trees: TreeInstance[]; assets: SpeciesAssets[]; lod: LodFade }) {
  const gl = useThree((s) => s.gl);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

  useEffect(() => {
    const cell = isTouch ? 256 : 512;
    const rt = captureAtlas(gl, assets, cell, !isTouch);
    const quad = new THREE.PlaneGeometry(1, 1);
    quad.translate(0, 0.5, 0);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index;
    geo.setAttribute("position", quad.attributes.position);
    geo.setAttribute("uv", quad.attributes.uv);
    const n = trees.length;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const species = new Float32Array(n);
    const yaw = new Float32Array(n);
    const tint = new Float32Array(n * 3);
    trees.forEach((t, i) => {
      const a = assets[t.species];
      pos[i * 3] = t.x;
      pos[i * 3 + 1] = t.y + a.bottom * t.scale;
      pos[i * 3 + 2] = t.z;
      size[i] = a.frame * t.scale;
      species[i] = t.species;
      yaw[i] = t.yaw;
      tint[i * 3] = t.tint.r;
      tint[i * 3 + 1] = t.tint.g;
      tint[i * 3 + 2] = t.tint.b;
    });
    geo.setAttribute("aPos", new THREE.InstancedBufferAttribute(pos, 3));
    geo.setAttribute("aSize", new THREE.InstancedBufferAttribute(size, 1));
    geo.setAttribute("aSpecies", new THREE.InstancedBufferAttribute(species, 1));
    geo.setAttribute("aYaw", new THREE.InstancedBufferAttribute(yaw, 1));
    geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 3));
    geo.instanceCount = n;
    const material = new THREE.ShaderMaterial({
      vertexShader: IMPOSTOR_VERT,
      fragmentShader: IMPOSTOR_FRAG,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uAtlas: { value: rt.texture },
        uAtlasSize: { value: new THREE.Vector2(rt.width, rt.height) },
        uViews: { value: VIEWS },
        uSpeciesCount: { value: assets.length },
        uLod: { value: new THREE.Vector2(lod.near, lod.far) },
        uTime: floraGlobals.uTime,
        uWind: floraGlobals.uWind,
        uSun: { value: SUN_DIR.clone() },
      },
      fog: true,
    });
    const m = new THREE.Mesh(geo, material);
    m.frustumCulled = false;
    m.raycast = () => undefined;
    setMesh(m);
    return () => {
      rt.dispose();
      geo.dispose();
      material.dispose();
      quad.dispose();
    };
  }, [gl, assets, trees, isTouch, lod]);

  return mesh ? <primitive object={mesh} /> : null;
}

export function WildForest() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const lod = isTouch ? LOD_TOUCH : LOD;
  const assets = useSpeciesAssets(lod);
  const trees = useMemo(() => placeForest(!isTouch), [isTouch]);
  return (
    <group>
      <NearForest trees={trees} assets={assets} lod={lod} shadows={!isTouch} />
      <ImpostorField trees={trees} assets={assets} lod={lod} />
    </group>
  );
}
