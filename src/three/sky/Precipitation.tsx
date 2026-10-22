"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { floraGlobals } from "../flora/floraMaterials";
import { terrainHeight, accountPosition, accountIds, RIVERS, LAKE } from "../layout";
import { sky, skyUniforms } from "./skyState";

/**
 * Weather and night life in the air: rain streaks that fall around the
 * camera and lean with the wind, forked lightning on the horizon during
 * storms, and fireflies drifting over the clearings and the stream on warm
 * clear nights.
 */

const RAIN_BOX = { w: 160, h: 110 };

const rainVert = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  attribute vec3 aSeed;
  uniform float uTime;
  uniform vec3 uWind;
  uniform vec3 uFocus;
  uniform float uRain;
  varying float vAlpha;
  void main() {
    float speed = 38.0 + aSeed.z * 14.0;
    vec3 p;
    p.x = (aSeed.x - 0.5) * ${RAIN_BOX.w.toFixed(1)};
    p.z = (aSeed.y - 0.5) * ${RAIN_BOX.w.toFixed(1)};
    p.y = ${RAIN_BOX.h.toFixed(1)} - mod(uTime * speed + aSeed.z * 997.0, ${RAIN_BOX.h.toFixed(1)});
    // Wrap the field around the camera so rain is always near.
    vec3 center = uFocus;
    p.xz = center.xz + mod(p.xz - center.xz + ${(RAIN_BOX.w / 2).toFixed(1)}, ${RAIN_BOX.w.toFixed(1)}) - ${(RAIN_BOX.w / 2).toFixed(1)};
    p.y += center.y - ${(RAIN_BOX.h * 0.55).toFixed(1)};
    vec3 lean = vec3(uWind.x, 0.0, uWind.z) * 0.18;
    vec3 fall = normalize(vec3(0.0, -1.0, 0.0) + lean);
    // A thin streak: stretch the quad along the fall direction, face the camera sideways.
    vec3 toCam = normalize(cameraPosition - p);
    vec3 side = normalize(cross(fall, toCam));
    float len = 2.6 + aSeed.z * 1.6;
    vec3 wp = p + fall * position.y * len + side * position.x * 0.05;
    // Streaks right at the lens read as scratches: fade the nearest ones.
    float near = smoothstep(4.0, 18.0, distance(cameraPosition, p));
    vAlpha = uRain * (0.12 + 0.2 * aSeed.z) * near * step(aSeed.x * 0.999, uRain * 1.05 + 0.05);
    vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const rainFrag = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uShade;
  uniform float uFlash;
  varying float vAlpha;
  void main() {
    vec3 col = vec3(0.72, 0.76, 0.82) * (uShade * 0.9 + 0.1) + uFlash * 0.6;
    gl_FragColor = vec4(col, vAlpha);
    #include <fog_fragment>
  }
`;

function Rain() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const mesh = useRef<THREE.Mesh>(null);
  const focus = useMemo(() => ({ value: new THREE.Vector3() }), []);
  const { geometry, material } = useMemo(() => {
    const count = isTouch ? 2500 : 7000;
    const quad = new THREE.PlaneGeometry(1, 1);
    quad.translate(0, -0.5, 0);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute("position", quad.attributes.position);
    const seed = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) seed[i] = Math.random();
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 3));
    g.instanceCount = count;
    const m = new THREE.ShaderMaterial({
      vertexShader: rainVert,
      fragmentShader: rainFrag,
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        uTime: floraGlobals.uTime,
        uWind: floraGlobals.uWind,
        uFocus: focus,
        uRain: skyUniforms.uRain,
        uShade: skyUniforms.uShade,
        uFlash: skyUniforms.uFlash,
      },
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    return { geometry: g, material: m };
  }, [isTouch, focus]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ camera }) => {
    const m = mesh.current;
    if (!m) return;
    m.visible = sky.weather.rain > 0.02;
    focus.value.copy(camera.position);
  });
  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} raycast={() => undefined} />;
}

/** A forked bolt far off, shown for the instant of a flash. */
function Lightning() {
  const line = useRef<THREE.Mesh>(null);
  const last = useRef(0);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.8), transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }),
    [],
  );
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ camera }) => {
    const m = line.current;
    if (!m) return;
    // A new strike: rebuild the bolt somewhere in front of the camera.
    if (sky.flash > 0.65 && sky.flash > last.current + 0.2) {
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const ang = (Math.random() - 0.5) * 1.3;
      fwd.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      const dist = 2200 + Math.random() * 1600;
      const base = camera.position.clone().addScaledVector(fwd, dist);
      base.y = 0;
      const top = 1500;
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const pos: number[] = [];
      const addBranch = (start: THREE.Vector3, steps: number, width: number) => {
        let p = start.clone();
        for (let i = 0; i < steps; i++) {
          const next = p.clone().add(new THREE.Vector3(0, -top / 14, 0)).addScaledVector(right, (Math.random() - 0.5) * 120);
          const a = p;
          const b = next;
          const w = width * (1 - i / (steps + 2));
          pos.push(a.x - right.x * w, a.y, a.z - right.z * w, a.x + right.x * w, a.y, a.z + right.z * w, b.x + right.x * w, b.y, b.z + right.z * w);
          pos.push(a.x - right.x * w, a.y, a.z - right.z * w, b.x + right.x * w, b.y, b.z + right.z * w, b.x - right.x * w, b.y, b.z - right.z * w);
          if (i > 2 && Math.random() < 0.18 && width > 3) addBranch(next, Math.floor(steps * 0.4), width * 0.5);
          p = next;
        }
      };
      addBranch(new THREE.Vector3(base.x, top, base.z), 14, 7);
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geometry.computeBoundingSphere();
    }
    last.current = sky.flash;
    material.opacity = sky.flash > 0.3 ? Math.min(1, sky.flash) : 0;
    m.visible = material.opacity > 0.01;
  });
  return <mesh ref={line} geometry={geometry} material={material} frustumCulled={false} renderOrder={-50} raycast={() => undefined} />;
}

const flyVert = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uNight;
  uniform float uPixel;
  varying float vGlow;
  void main() {
    vec3 p = position;
    float t = uTime * (0.25 + aSeed.x * 0.3) + aSeed.y * 40.0;
    p += vec3(sin(t * 1.3) * 3.0, sin(t * 0.9 + aSeed.z * 6.0) * 1.4 + 1.6, cos(t * 1.1) * 3.0);
    float blink = pow(max(0.0, sin(uTime * (0.8 + aSeed.z * 1.4) + aSeed.x * 30.0)), 6.0);
    vGlow = blink * uNight;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.9 + blink * 2.6) * uPixel * 60.0 / -mv.z;
  }
`;

const flyFrag = /* glsl */ `
  varying float vGlow;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d) * vGlow;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(1.4, 1.6, 0.6) * a, a);
  }
`;

function Fireflies() {
  const points = useRef<THREE.Points>(null);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const { geometry, material } = useMemo(() => {
    const pos: number[] = [];
    const seed: number[] = [];
    const add = (x: number, z: number, spread: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * spread;
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        pos.push(px, terrainHeight(px, pz) + 0.8 + Math.random() * 4, pz);
        seed.push(Math.random(), Math.random(), Math.random());
      }
    };
    for (const id of accountIds()) {
      const p = accountPosition(id);
      add(p.x, p.z, 55, isTouch ? 30 : 60);
    }
    // Along the water where it runs through the forest, and round the lake.
    for (const r of RIVERS)
      for (let i = 0; i < r.path.length; i += 3) {
        const p = r.path[i];
        if (Math.hypot(p.x, p.y + 80) < 1200) add(p.x, p.y, 24, isTouch ? 2 : 4);
      }
    add(LAKE.x, LAKE.z, LAKE.radius * 1.4, isTouch ? 20 : 40);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 3));
    const m = new THREE.ShaderMaterial({
      vertexShader: flyVert,
      fragmentShader: flyFrag,
      uniforms: { uTime: floraGlobals.uTime, uNight: { value: 0 }, uPixel: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, [isTouch]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ gl }) => {
    // Out on warm, dry nights only.
    const n = Math.max(0, sky.night - 0.2) / 0.8;
    material.uniforms.uNight.value = n * (1 - sky.weather.rain) * (1 - sky.weather.heavy * 0.6);
    material.uniforms.uPixel.value = gl.getPixelRatio() * (gl.domElement.height / gl.getPixelRatio()) / 900;
    if (points.current) points.current.visible = material.uniforms.uNight.value > 0.01;
  });
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} raycast={() => undefined} />;
}

export function Precipitation() {
  return (
    <>
      <Rain />
      <Lightning />
      <Fireflies />
    </>
  );
}
