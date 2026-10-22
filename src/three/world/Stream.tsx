"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { floraGlobals } from "../flora/floraMaterials";
import { LAKE, RIVERS, lakeDistance, lakeRadiusAt, type River } from "../layout";
import { skyUniforms } from "../sky/skyState";

/**
 * The stream: a ribbon along the carved channel. Two scrolling noise layers
 * flowing downstream perturb the normal; the surface mixes a deep tea-brown
 * with sky reflection by Fresnel, picks up sun glints, and turns shallow and
 * clear toward the banks.
 */

const vert = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  attribute float aAlong;
  attribute float aSlope;
  attribute float aFoam;
  attribute float aFade;
  varying vec2 vFlow;
  varying vec3 vWorld;
  varying float vSlope;
  varying float vFoam;
  varying float vFade;
  void main() {
    vFlow = vec2(aAlong, uv.y);
    vFade = aFade;
    vSlope = aSlope;
    vFoam = aFoam;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const frag = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uSun;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uShade;
  uniform vec3 uLightColor;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  varying vec2 vFlow;
  varying vec3 vWorld;
  varying float vSlope;
  varying float vFoam;
  varying float vFade;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float n2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
  }
  float waves(vec2 p) {
    return n2(p) * 0.55 + n2(p * 2.3 + 7.1) * 0.3 + n2(p * 5.1 - 3.7) * 0.15;
  }
  void main() {
    // Flow coordinates: along the stream (metres) and across it (-1..1).
    vec2 p1 = vec2(vFlow.x * 0.35 - uTime * 0.9, vFlow.y * 2.2);
    vec2 p2 = vec2(vFlow.x * 0.8 - uTime * 1.6, vFlow.y * 4.0 + 3.0);
    float e = 0.08;
    float h0 = waves(p1) + 0.5 * waves(p2);
    float hx = waves(p1 + vec2(e, 0.0)) + 0.5 * waves(p2 + vec2(e, 0.0));
    float hy = waves(p1 + vec2(0.0, e)) + 0.5 * waves(p2 + vec2(0.0, e));
    vec3 n = normalize(vec3((h0 - hx) * 2.4, 1.0, (h0 - hy) * 2.4));

    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
    float edge = abs(vFlow.y);
    float shallow = smoothstep(0.35, 1.0, edge);
    vec3 base = mix(uDeep, uShallow, shallow) * uShade;
    vec3 skyCol = mix(uHorizon, uZenith, 0.3);
    vec3 col = mix(base, skyCol, clamp(0.12 + fres * 0.85, 0.0, 1.0));
    vec3 R = reflect(-V, n);
    float spec = pow(max(dot(R, normalize(uSun)), 0.0), 220.0);
    col += uLightColor * spec * 3.0 * step(0.0, uSun.y);
    // Bright flecks where ripples break near rocks and banks.
    float foam = smoothstep(0.72, 0.95, h0) * smoothstep(0.6, 1.0, edge);
    col = mix(col, vec3(0.86, 0.88, 0.86) * uShade, foam * 0.35);
    float alpha = mix(0.92, 0.35, smoothstep(0.55, 1.0, edge));

    // White water: rapids where the bed steepens, a falling curtain of
    // streaks over the falls, and churned foam in the plunge pool.
    float rapids = smoothstep(0.05, 0.35, vSlope);
    float falls = smoothstep(0.6, 1.2, vSlope);
    float speed = 1.0 + rapids * 5.0 + falls * 10.0;
    vec2 q = vec2(vFlow.y * mix(3.0, 14.0, falls), vFlow.x * mix(0.5, 0.12, falls) - uTime * speed * 0.6);
    float streak = n2(q * vec2(1.0, 1.0)) * 0.6 + n2(q * vec2(2.3, 2.0) + 4.0) * 0.4;
    float churn = n2(vec2(vFlow.x * 0.6 - uTime * 2.2, vFlow.y * 5.0)) * 0.5 + n2(vec2(vFlow.x * 1.7 + uTime * 1.3, vFlow.y * 9.0 + 2.0)) * 0.5;
    float white = max(rapids * smoothstep(0.42, 0.75, churn) * 0.85, falls * (0.3 + 0.7 * smoothstep(0.28, 0.72, streak)));
    white = max(white, vFoam * smoothstep(0.25, 0.7, churn + vFoam * 0.3));
    vec3 foamCol = vec3(0.92, 0.95, 0.97) * (uShade * 0.92 + 0.08);
    col = mix(col, foamCol, clamp(white, 0.0, 1.0));
    alpha = max(alpha, white * 0.95);
    // Over a falls the sheet frays at its edges: ribbons of water peel away
    // from the main curtain and the rock shows between them.
    float fray = 0.5 + 0.38 * n2(vec2(vFlow.x * 0.06 + sign(vFlow.y) * 13.0, sign(vFlow.y))) + 0.16 * streak;
    alpha *= 1.0 - falls * smoothstep(fray, fray + 0.12, edge);
    // Where a river enters the lake it becomes the lake.
    alpha *= vFade;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function riverGeometry(r: River) {
  const n = r.path.length;
  const pos: number[] = [];
  const uv: number[] = [];
  const along: number[] = [];
  const slope: number[] = [];
  const foam: number[] = [];
  const fade: number[] = [];
  const idx: number[] = [];
  const L = r.levels;
  const slopeAt = (i: number) =>
    (L[Math.max(0, i - 1)] - L[Math.min(n - 1, i + 1)]) / Math.max(1, r.path[Math.max(0, i - 1)].distanceTo(r.path[Math.min(n - 1, i + 1)]));
  // Foam churns in the pools below every drop.
  const poolSources: number[] = [];
  for (let i = 1; i < n - 1; i++) if (slopeAt(i) > 0.6 && slopeAt(i + 1) <= 0.6) poolSources.push(i);
  let dist = 0;
  for (let i = 0; i < n; i++) {
    const p = r.path[i];
    const prev = r.path[Math.max(0, i - 1)];
    const next = r.path[Math.min(n - 1, i + 1)];
    if (i > 0) dist += p.distanceTo(prev);
    const tan = new THREE.Vector2(next.x - prev.x, next.y - prev.y).normalize();
    const side = new THREE.Vector2(-tan.y, tan.x);
    const sl = slopeAt(i);
    // Over the falls the sheet spreads and stands proud of the rock so the
    // channel walls never slice it.
    const steep = Math.min(1, Math.max(0, (sl - 0.3) / 0.6));
    let pool = 0;
    for (const src of poolSources) if (i >= src) pool = Math.max(pool, Math.exp(-(i - src) / 2.5));
    const w = (r.widths[i] + 1.2) * (1 + steep * 0.35);
    const ld = lakeDistance(p.x, p.y);
    const f = Math.min(1, Math.max(0, (ld - 0.82) / 0.24));
    // Sink the ribbon under the lake surface as it fades into it.
    const y = L[i] + steep * 1.6 - (1 - f) * 0.3;
    for (const s of [-1, 1]) {
      pos.push(p.x + side.x * w * s, y, p.y + side.y * w * s);
      uv.push(i / (n - 1), s);
      along.push(dist);
      slope.push(sl);
      foam.push(pool);
      fade.push(f);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    if (fade[a] === 0 && fade[a + 2] === 0) continue;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute("aSlope", new THREE.Float32BufferAttribute(slope, 1));
  g.setAttribute("aFoam", new THREE.Float32BufferAttribute(foam, 1));
  g.setAttribute("aFade", new THREE.Float32BufferAttribute(fade, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** The lake: open water with wind ripples, shallow and clear toward the shore. */
const lakeVert = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const lakeFrag = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uSun;
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uShade;
  uniform vec3 uLightColor;
  uniform vec3 uCenter;
  uniform float uRadius;
  varying vec3 vWorld;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float n2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
  }
  float waves(vec2 p) { return n2(p) * 0.55 + n2(p * 2.3 + 7.1) * 0.3 + n2(p * 5.1 - 3.7) * 0.15; }
  void main() {
    vec2 q = vWorld.xz * 0.11;
    vec2 p1 = q + vec2(uTime * 0.16, uTime * 0.05);
    vec2 p2 = q * 2.1 + vec2(-uTime * 0.11, uTime * 0.13) + 5.0;
    float e = 0.06;
    float h0 = waves(p1) + 0.5 * waves(p2);
    float hx = waves(p1 + vec2(e, 0.0)) + 0.5 * waves(p2 + vec2(e, 0.0));
    float hy = waves(p1 + vec2(0.0, e)) + 0.5 * waves(p2 + vec2(0.0, e));
    vec3 n = normalize(vec3((h0 - hx) * 1.2, 1.0, (h0 - hy) * 1.2));
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
    float shore = smoothstep(0.55, 1.0, length(vWorld.xz - uCenter.xz) / uRadius);
    vec3 deep = vec3(0.07, 0.12, 0.11) * uShade;
    vec3 shallow = vec3(0.24, 0.27, 0.2) * uShade;
    vec3 base = mix(deep, shallow, shore * 0.7);
    vec3 skyCol = mix(uHorizon, uZenith, 0.35);
    vec3 col = mix(base, skyCol, clamp(0.1 + fres * 0.9, 0.0, 1.0));
    vec3 R = reflect(-V, n);
    col += uLightColor * pow(max(dot(R, normalize(uSun)), 0.0), 260.0) * 3.2 * step(0.0, uSun.y);
    gl_FragColor = vec4(col, mix(0.94, 0.7, shore));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function Lake() {
  const { geometry, material } = useMemo(() => {
    // A disc a little larger than the farthest shore; the rising banks hide
    // the rest, so the shoreline is wherever the land meets the water.
    let maxR = 0;
    for (let a = 0; a < Math.PI * 2; a += 0.05) maxR = Math.max(maxR, lakeRadiusAt(a));
    const g = new THREE.CircleGeometry(maxR * 1.12, 96);
    g.rotateX(-Math.PI / 2);
    g.translate(LAKE.x, LAKE.level + 0.02, LAKE.z);
    const m = new THREE.ShaderMaterial({
      vertexShader: lakeVert,
      fragmentShader: lakeFrag,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: floraGlobals.uTime,
        uSun: skyUniforms.uLightDir,
        uHorizon: skyUniforms.uHorizon,
        uZenith: skyUniforms.uZenith,
        uShade: skyUniforms.uShade,
        uLightColor: skyUniforms.uLightColor,
        uCenter: { value: new THREE.Vector3(LAKE.x, LAKE.level, LAKE.z) },
        uRadius: { value: maxR },
      },
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    return { geometry: g, material: m };
  }, []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <mesh geometry={geometry} material={material} renderOrder={1} raycast={() => undefined} />;
}

export function Stream() {
  const geometries = useMemo(() => RIVERS.map(riverGeometry), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: floraGlobals.uTime,
          uSun: skyUniforms.uLightDir,
          uHorizon: skyUniforms.uHorizon,
          uZenith: skyUniforms.uZenith,
          uShade: skyUniforms.uShade,
          uLightColor: skyUniforms.uLightColor,
          uDeep: { value: new THREE.Color("#1d2a22") },
          uShallow: { value: new THREE.Color("#5b5a44") },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      }),
    [],
  );
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <>
      {geometries.map((g, i) => (
        <mesh key={RIVERS[i].id} geometry={g} material={material} renderOrder={1} raycast={() => undefined} />
      ))}
      <Lake />
    </>
  );
}
