"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { floraGlobals } from "../flora/floraMaterials";
import { skyUniforms } from "./skyState";

/**
 * The sky: a gradient from horizon to zenith that runs through the whole
 * day, a sun with its scattering glow, a moon with the right phase, stars
 * and the Milky Way at night, and two layers of drifting cloud whose cover
 * and weight come from the weather. Lightning lights the cloud from inside.
 */

const vert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vDir = wp.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * wp;
    gl_Position.z = gl_Position.w;
  }
`;

const frag = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunGlow;
  uniform vec3 uLightColor;
  uniform float uNight;
  uniform float uMoonIllum;
  uniform float uCloudCover;
  uniform float uCloudHeavy;
  uniform float uFlash;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  // Stars live in cells on a sphere; a few cells hold one star each.
  vec3 stars(vec3 d) {
    vec3 acc = vec3(0.0);
    for (int layer = 0; layer < 2; layer++) {
      float scale = layer == 0 ? 180.0 : 420.0;
      vec3 p = d * scale;
      vec3 cell = floor(p);
      float h = hash3(cell + float(layer) * 17.0);
      float thresh = layer == 0 ? 0.965 : 0.94;
      if (h > thresh) {
        vec3 jitter = vec3(hash3(cell + 1.3), hash3(cell + 2.7), hash3(cell + 5.1));
        vec3 center = (cell + 0.25 + 0.5 * jitter) / scale;
        float dist = length(d - normalize(center)) * scale;
        float size = layer == 0 ? 0.11 : 0.07;
        float star = smoothstep(size, 0.0, dist);
        float twinkle = 0.75 + 0.25 * sin(uTime * (1.5 + h * 4.0) + h * 40.0);
        vec3 tint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.86, 0.72), hash3(cell + 9.9));
        acc += tint * star * twinkle * (layer == 0 ? 2.4 : 1.0) * (h - thresh) / (1.0 - thresh) * 1.6;
      }
    }
    return acc;
  }

  vec3 milkyWay(vec3 d) {
    // A band along a tilted great circle.
    vec3 n = normalize(vec3(0.35, 0.42, 0.84));
    float band = exp(-pow(dot(d, n) / 0.17, 2.0));
    vec2 uv = vec2(atan(d.z, d.x), dot(d, n)) * vec2(3.0, 9.0);
    float dust = fbm(uv * 1.7 + 3.0);
    float glow = band * (0.35 + 0.9 * fbm(uv * 3.1));
    glow *= 1.0 - smoothstep(0.45, 0.8, dust) * 0.7 * band;
    return vec3(0.55, 0.6, 0.78) * glow * 0.16;
  }

  vec3 moonDisc(vec3 d, out float mask) {
    vec3 m = normalize(uMoonDir);
    vec3 t1 = normalize(cross(abs(m.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), m));
    vec3 t2 = cross(m, t1);
    float radius = 0.022;
    vec2 p = vec2(dot(d, t1), dot(d, t2)) / radius;
    float r2 = dot(p, p);
    mask = smoothstep(1.0, 0.94, sqrt(r2)) * step(0.0, dot(d, m));
    if (r2 > 1.0) return vec3(0.0);
    vec3 n = normalize(p.x * t1 + p.y * t2 - sqrt(1.0 - r2) * m);
    // Lit from the sun's direction; the phase follows from geometry.
    float lit = smoothstep(-0.06, 0.12, dot(n, normalize(uSunDir)));
    // A simple mare pattern.
    float mare = fbm(p * 2.6 + 4.0);
    vec3 albedo = mix(vec3(0.92, 0.92, 0.88), vec3(0.6, 0.62, 0.64), smoothstep(0.45, 0.7, mare));
    // The unlit side keeps a faint earthshine.
    return albedo * (lit * 1.6 + 0.04);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
    float moonDot = max(dot(d, normalize(uMoonDir)), 0.0);
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.02, 0.6, h), 0.55));

    // Scattering: a broad warm glow around the sun, strongest near the horizon.
    float lowSun = 1.0 - smoothstep(-0.1, 0.5, uSunDir.y);
    col += uSunGlow * pow(sunDot, 4.0) * (0.25 + 0.75 * lowSun) * (1.0 - smoothstep(0.0, 0.7, h)) * 0.9;
    col += uSunGlow * pow(sunDot, 60.0) * 0.7;
    // Twilight band: the horizon away from the sun picks up pink and blue.
    float twilight = smoothstep(-0.3, -0.02, uSunDir.y) * (1.0 - smoothstep(0.02, 0.2, uSunDir.y));
    col += vec3(0.32, 0.16, 0.26) * twilight * (1.0 - smoothstep(0.0, 0.35, h)) * (1.0 - sunDot) * 0.5;

    float clear = 1.0 - uCloudCover * 0.9;
    if (h > 0.0) {
      // Night sky.
      float starVis = uNight * clear * smoothstep(0.0, 0.18, h);
      col += (stars(d) + milkyWay(d)) * starVis;

      // Sun disc.
      col += uSunGlow * smoothstep(0.99935, 0.99975, sunDot) * 8.0 * clear * step(-0.02, uSunDir.y);

      // Moon disc and halo.
      float mm;
      vec3 moon = moonDisc(d, mm);
      float moonVis = smoothstep(-0.02, 0.06, uMoonDir.y) * (0.25 + 0.75 * uNight) * clear;
      col = mix(col, moon + col * 0.25, mm * moonVis);
      col += vec3(0.55, 0.62, 0.8) * pow(moonDot, 300.0) * 0.35 * uMoonIllum * moonVis;
      col += vec3(0.4, 0.46, 0.62) * pow(moonDot, 18.0) * 0.12 * uMoonIllum * uNight * clear;

      // Clouds: two layers projected on a dome.
      vec2 uv = d.xz / (h + 0.14) * 0.85;
      float t = uTime;
      vec2 uv1 = uv + vec2(t * 0.0035, t * 0.0012);
      vec2 uv2 = uv * 0.55 + vec2(t * 0.0021, -t * 0.0008) + 7.0;
      float c1 = fbm(uv1 * 1.5);
      float c2 = fbm(uv2 * 1.1);
      float thresh = mix(0.86, 0.3, uCloudCover);
      float cover = smoothstep(thresh, thresh + 0.28, c1 * 0.65 + c2 * 0.45) * smoothstep(0.0, 0.12, h);
      cover = max(cover, smoothstep(0.75, 1.0, uCloudCover) * smoothstep(0.0, 0.08, h) * (0.75 + 0.25 * c2));
      float thick = smoothstep(thresh, thresh + 0.6, c1 * 0.65 + c2 * 0.45);
      float lit = fbm(uv1 * 1.5 + uSunDir.xz * 0.08);

      vec3 dayLight = uLightColor;
      vec3 bright = mix(vec3(0.82, 0.84, 0.9), vec3(1.06, 1.03, 0.98), smoothstep(0.35, 0.75, lit));
      vec3 shadowed = vec3(0.5, 0.53, 0.6);
      vec3 cloud = mix(bright, shadowed, thick * (0.4 + 0.6 * uCloudHeavy));
      cloud = mix(cloud, vec3(0.28, 0.3, 0.34), uCloudHeavy * 0.7);
      // Light level follows the sky: dim at night, coloured at dusk.
      float level = max(max(uZenith.r, uZenith.g), uZenith.b) * 2.4 + max(max(uHorizon.r, uHorizon.g), uHorizon.b) * 0.6;
      cloud *= clamp(level, 0.03, 1.15);
      // Undersides catch the low sun at dawn and dusk.
      cloud += uSunGlow * pow(sunDot, 3.0) * (0.35 + 0.65 * lowSun) * (1.0 - uCloudHeavy * 0.8) * 0.9;
      cloud += uSunGlow * lowSun * smoothstep(-0.25, 0.05, uSunDir.y) * (1.0 - thick) * 0.35 * (1.0 - uCloudHeavy);
      // Moonlit edges.
      cloud += vec3(0.25, 0.3, 0.42) * pow(moonDot, 6.0) * uMoonIllum * uNight * 0.5;
      // Lightning glows inside the cloud.
      cloud += vec3(0.75, 0.78, 0.95) * uFlash * (0.6 + 0.8 * thick);
      col = mix(col, cloud, cover * (0.62 + 0.3 * uCloudHeavy));
    } else {
      col = mix(uHorizon, uHorizon * 0.85, smoothstep(0.0, -0.25, h));
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function SkyDome() {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uSunDir: skyUniforms.uSunDir,
          uMoonDir: skyUniforms.uMoonDir,
          uZenith: skyUniforms.uZenith,
          uHorizon: skyUniforms.uHorizon,
          uSunGlow: skyUniforms.uSunGlow,
          uLightColor: skyUniforms.uLightColor,
          uNight: skyUniforms.uNight,
          uMoonIllum: skyUniforms.uMoonIllum,
          uCloudCover: skyUniforms.uCloudCover,
          uCloudHeavy: skyUniforms.uCloudHeavy,
          uFlash: skyUniforms.uFlash,
          uTime: floraGlobals.uTime,
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera }) => {
    ref.current?.position.copy(camera.position);
  });
  return (
    <mesh ref={ref} material={material} frustumCulled={false} renderOrder={-100}>
      <sphereGeometry args={[6000, 64, 32]} />
    </mesh>
  );
}
