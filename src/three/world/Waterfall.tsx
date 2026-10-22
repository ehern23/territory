"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { floraGlobals } from "../flora/floraMaterials";
import { WATERFALLS, type WaterfallSite } from "../layout";
import { skyUniforms } from "../sky/skyState";

/**
 * Mist off each of the falls. Soft puffs boil up out of the plunge pool and peel off
 * the face of the falls, drift downstream with the wind, and catch the light:
 * warm when the sun is low behind them, and, when the sun is behind the
 * viewer, a faint rainbow at 42° from the antisolar point, as real spray does.
 */

const vert = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  attribute vec4 aSeed;
  uniform float uTime;
  uniform vec3 uTop;
  uniform vec3 uBase;
  uniform vec2 uFlow;
  uniform vec3 uWind;
  uniform float uWidth;
  uniform float uScale;
  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vWorld;
  varying float vSeed;
  void main() {
    float life = fract(uTime * (0.035 + aSeed.z * 0.03) + aSeed.w);
    vec3 origin;
    float face = step(0.62, aSeed.x);
    if (face > 0.5) {
      // Peeling off the face of the falls.
      // Mostly the lower half, where the falling water breaks up.
      float k = mix(0.45, 1.0, aSeed.y);
      origin = mix(uTop, uBase, k);
      origin.y += 2.0;
    } else {
      // Boiling out of the plunge pool.
      float a = aSeed.y * 6.2831853;
      float r = sqrt(aSeed.x / 0.62) * uWidth * 1.6;
      origin = uBase + vec3(cos(a) * r, 0.5, sin(a) * r);
    }
    vec3 drift = vec3(uFlow.x, 0.0, uFlow.y) * life * 38.0 * uScale + vec3(uWind.x, 0.0, uWind.z) * life * 10.0;
    vec3 center = origin + drift + vec3(0.0, life * mix(55.0, 25.0, face) * uScale, 0.0);
    float size = mix(10.0, 34.0, life) * (0.7 + aSeed.z * 0.6) * pow(uScale, 0.8);

    vec3 toCam = normalize(cameraPosition - center);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    vec3 up = cross(toCam, right);
    float spin = aSeed.w * 6.28 + uTime * 0.05 * (aSeed.z - 0.5);
    vec2 p = vec2(cos(spin) * position.x - sin(spin) * position.y, sin(spin) * position.x + cos(spin) * position.y);
    vec3 wp = center + (right * p.x + up * p.y) * size;
    vUv = uv;
    vWorld = wp;
    vSeed = aSeed.w;
    vAlpha = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.55, 1.0, life));
    vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const frag = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uShade;
  uniform vec3 uSunDir;
  uniform vec3 uSunGlow;
  uniform float uNight;
  uniform float uCloudCover;
  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vWorld;
  varying float vSeed;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  float n2(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
  }
  vec3 spectrum(float x) {
    // x: 0 inner (violet) .. 1 outer (red)
    return clamp(vec3(
      smoothstep(0.45, 0.85, x) - smoothstep(0.95, 1.05, x),
      smoothstep(0.2, 0.5, x) - smoothstep(0.6, 0.85, x),
      smoothstep(-0.05, 0.15, x) - smoothstep(0.3, 0.55, x)
    ), 0.0, 1.0);
  }
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    float n = n2(vUv * 3.0 + vSeed * 17.0) * 0.6 + n2(vUv * 7.0 - vSeed * 9.0) * 0.4;
    float a = smoothstep(1.0, 0.0, r) * smoothstep(0.25, 0.75, n + 0.35 * (1.0 - r)) * vAlpha * 0.16;
    if (a < 0.003) discard;

    vec3 V = normalize(vWorld - cameraPosition);
    vec3 S = normalize(uSunDir);
    float sunUp = smoothstep(-0.02, 0.08, S.y) * (1.0 - uCloudCover * 0.8);
    // Forward scattering: spray glows when it lies toward the sun.
    float toward = pow(max(dot(V, S), 0.0), 6.0);
    vec3 col = vec3(0.86, 0.9, 0.94) * (uShade * 0.85 + 0.12) + uSunGlow * toward * 0.9 * sunUp;
    // The primary bow sits between 40.5° and 42.5° from the antisolar point.
    float ang = acos(clamp(dot(V, -S), -1.0, 1.0));
    float bow = (ang - 0.7069) / (0.7418 - 0.7069);
    float inBand = smoothstep(-0.25, 0.1, bow) * (1.0 - smoothstep(0.9, 1.25, bow));
    col += spectrum(bow) * inBand * 1.4 * sunUp * (1.0 - uNight);
    gl_FragColor = vec4(col, a);
    #include <fog_fragment>
  }
`;

/** How much spray a falls throws, relative to the main river's. */
function power(site: WaterfallSite) {
  return Math.sqrt((site.width * (site.top.y - site.base.y)) / (10.3 * 147));
}

export function Waterfall() {
  return (
    <>
      {WATERFALLS.map((site, i) => (
        <Mist key={i} site={site} />
      ))}
    </>
  );
}

function Mist({ site }: { site: WaterfallSite }) {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const { geometry, material } = useMemo(() => {
    const p = power(site);
    const count = Math.round((isTouch ? 90 : 220) * Math.min(2.4, Math.max(0.25, p)));
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute("position", quad.attributes.position);
    g.setAttribute("uv", quad.attributes.uv);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) seed[i] = Math.random();
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 4));
    g.instanceCount = count;
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: floraGlobals.uTime,
        uWind: floraGlobals.uWind,
        uTop: { value: site.top.clone() },
        uBase: { value: site.base.clone() },
        uFlow: { value: site.flow.clone() },
        uWidth: { value: site.width },
        uScale: { value: Math.min(2.2, Math.max(0.35, p)) },
        uShade: skyUniforms.uShade,
        uSunDir: skyUniforms.uSunDir,
        uSunGlow: skyUniforms.uSunGlow,
        uNight: skyUniforms.uNight,
        uCloudCover: skyUniforms.uCloudCover,
      },
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    return { geometry: g, material: m };
  }, [isTouch, site]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={3} raycast={() => undefined} />;
}
