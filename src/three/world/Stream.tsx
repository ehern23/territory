"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { floraGlobals } from "../flora/floraMaterials";
import { STREAM_LEVELS, STREAM_PATH, SUN_DIR, streamWidth } from "../layout";

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
  varying vec2 vFlow;
  varying vec3 vWorld;
  void main() {
    vFlow = vec2(aAlong, uv.y);
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
  uniform vec3 uSky;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  varying vec2 vFlow;
  varying vec3 vWorld;
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
    vec3 base = mix(uDeep, uShallow, shallow);
    vec3 col = mix(base, uSky, clamp(0.12 + fres * 0.85, 0.0, 1.0));
    vec3 R = reflect(-V, n);
    float spec = pow(max(dot(R, normalize(uSun)), 0.0), 220.0);
    col += vec3(1.0, 0.9, 0.75) * spec * 3.0;
    // Bright flecks where ripples break near rocks and banks.
    float foam = smoothstep(0.72, 0.95, h0) * smoothstep(0.6, 1.0, edge);
    col = mix(col, vec3(0.86, 0.88, 0.86), foam * 0.35);
    float alpha = mix(0.92, 0.35, smoothstep(0.55, 1.0, edge));
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
    const idx: number[] = [];
    let dist = 0;
    for (let i = 0; i < n; i++) {
      const p = STREAM_PATH[i];
      const prev = STREAM_PATH[Math.max(0, i - 1)];
      const next = STREAM_PATH[Math.min(n - 1, i + 1)];
      if (i > 0) dist += p.distanceTo(prev);
      const tan = new THREE.Vector2(next.x - prev.x, next.y - prev.y).normalize();
      const side = new THREE.Vector2(-tan.y, tan.x);
      const w = streamWidth(i / (n - 1)) + 1.2;
      const y = STREAM_LEVELS[i];
      for (const s of [-1, 1]) {
        pos.push(p.x + side.x * w * s, y, p.y + side.y * w * s);
        uv.push(i / (n - 1), s);
        along.push(dist);
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
          uSun: { value: SUN_DIR.clone() },
          uSky: { value: new THREE.Color("#9fb6c8") },
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
