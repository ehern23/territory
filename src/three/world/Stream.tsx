"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { floraGlobals } from "../flora/floraMaterials";
import { STREAM_LEVELS, STREAM_PATH, streamWidth } from "../layout";
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
  varying vec2 vFlow;
  varying vec3 vWorld;
  varying float vSlope;
  varying float vFoam;
  void main() {
    vFlow = vec2(aAlong, uv.y);
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
    float white = max(rapids * smoothstep(0.42, 0.75, churn) * 0.85, falls * (0.55 + 0.45 * smoothstep(0.3, 0.7, streak)));
    white = max(white, vFoam * smoothstep(0.25, 0.7, churn + vFoam * 0.3));
    vec3 foamCol = vec3(0.92, 0.95, 0.97) * (uShade * 0.92 + 0.08);
    col = mix(col, foamCol, clamp(white, 0.0, 1.0));
    alpha = max(alpha, white * 0.95);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function Stream() {
  const geometry = useMemo(() => {
    const n = STREAM_PATH.length;
    const pos: number[] = [];
    const uv: number[] = [];
    const along: number[] = [];
    const slope: number[] = [];
    const foam: number[] = [];
    const idx: number[] = [];
    // The plunge pool sits just below the steepest drop.
    let fallsEnd = 0;
    for (let i = 1; i < n - 1; i++) {
      const sl = (STREAM_LEVELS[i - 1] - STREAM_LEVELS[i + 1]) / Math.max(1, STREAM_PATH[i - 1].distanceTo(STREAM_PATH[i + 1]));
      if (sl > 0.6) fallsEnd = i;
    }
    let dist = 0;
    for (let i = 0; i < n; i++) {
      const p = STREAM_PATH[i];
      const prev = STREAM_PATH[Math.max(0, i - 1)];
      const next = STREAM_PATH[Math.min(n - 1, i + 1)];
      if (i > 0) dist += p.distanceTo(prev);
      const tan = new THREE.Vector2(next.x - prev.x, next.y - prev.y).normalize();
      const side = new THREE.Vector2(-tan.y, tan.x);
      const w0 = streamWidth(i / (n - 1)) + 1.2;
      const y0 = STREAM_LEVELS[i];
      const sl = (STREAM_LEVELS[Math.max(0, i - 1)] - STREAM_LEVELS[Math.min(n - 1, i + 1)]) / Math.max(1, prev.distanceTo(next));
      // Over the falls the sheet spreads and stands proud of the rock so the
      // channel walls never slice it.
      const steep = Math.min(1, Math.max(0, (sl - 0.3) / 0.6));
      const fromFalls = fallsEnd > 0 && i >= fallsEnd ? i - fallsEnd : 1e9;
      const pool = Math.exp(-fromFalls / 2.5);
      const w = w0 * (1 + steep * 0.35);
      const y = y0 + steep * 1.6;
      for (const s of [-1, 1]) {
        pos.push(p.x + side.x * w * s, y, p.y + side.y * w * s);
        uv.push(i / (n - 1), s);
        along.push(dist);
        slope.push(sl);
        foam.push(pool);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
    g.setAttribute("aSlope", new THREE.Float32BufferAttribute(slope, 1));
    g.setAttribute("aFoam", new THREE.Float32BufferAttribute(foam, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }, []);

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
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} renderOrder={1} raycast={() => undefined} />;
}
