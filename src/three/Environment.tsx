"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { FOG } from "./palette";

const SUN_DIR = new THREE.Vector3(0.38, 0.58, -0.52).normalize();

const skyVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const skyFrag = /* glsl */ `
  varying vec3 vWorld;
  uniform vec3 uSun;
  void main() {
    vec3 dir = normalize(vWorld);
    float h = dir.y;
    vec3 zenith = vec3(0.38, 0.66, 0.96);
    vec3 mid = vec3(0.55, 0.76, 0.94);
    vec3 horizon = vec3(0.78, 0.80, 0.86);
    vec3 ground = vec3(0.52, 0.62, 0.50);
    vec3 col;
    if (h > 0.0) {
      float t = smoothstep(0.0, 0.22, h);
      col = mix(horizon, mix(mid, zenith, smoothstep(0.08, 0.7, h)), t);
    } else {
      col = mix(horizon, ground, pow(clamp(-h * 1.4, 0.0, 1.0), 0.5));
    }
    float sun = pow(max(dot(dir, normalize(uSun)), 0.0), 140.0);
    float glow = pow(max(dot(dir, normalize(uSun)), 0.0), 8.0);
    col += vec3(1.0, 0.94, 0.78) * sun * 2.1;
    col += vec3(1.0, 0.88, 0.68) * glow * 0.28;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        uniforms: { uSun: { value: SUN_DIR.clone() } },
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh material={material} frustumCulled={false} renderOrder={-20}>
      <sphereGeometry args={[1600, 32, 20]} />
    </mesh>
  );
}

function makeCloudTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 9; i++) {
    const x = 60 + (i % 3) * 48 + (i * 13) % 40;
    const y = 90 + Math.floor(i / 3) * 28;
    const r = 28 + (i * 7) % 22;
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Clouds() {
  const reduced = useTerritoryStore((s) => s.reducedMotion);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(makeCloudTexture, []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex ?? undefined,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [tex],
  );
  const count = isTouch ? 5 : 9;
  const poses = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const t = i / count;
        return {
          x: -480 + t * 980 + (i % 2) * 50,
          y: 210 + (i % 3) * 36,
          z: -340 - (i % 4) * 80,
          s: 92 + (i % 5) * 22,
        };
      }),
    [count],
  );
  useEffect(
    () => () => {
      material.dispose();
      tex?.dispose();
    },
    [material, tex],
  );
  useFrame((_, dt) => {
    if (reduced || !group.current) return;
    group.current.children.forEach((child, i) => {
      child.position.x += dt * (1.6 + (i % 3) * 0.4);
      if (child.position.x > 520) child.position.x = -520;
    });
  });
  return (
    <group ref={group}>
      {poses.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} rotation={[0.12, 0.2, 0]} material={material} renderOrder={-10}>
          <planeGeometry args={[p.s * 2.4, p.s]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Daylight: a temperate morning / late-afternoon. The sky is present.
 * Fog is atmospheric haze, not a brown void.
 */
export function Atmosphere() {
  const mode = useTerritoryStore((s) => s.mode);
  const view = useTerritoryStore((s) => s.view);
  const fogRef = useRef<THREE.Fog>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);

  useFrame((_, dt) => {
    const fog = fogRef.current;
    if (!fog) return;
    const k = 1 - Math.exp(-dt * 3);
    const roots = mode === "account" && view === "roots";
    const nearTarget = mode === "forest" ? 280 : roots ? 10 : 36;
    const farTarget = mode === "forest" ? 1600 : roots ? 200 : 560;
    fog.near += (nearTarget - fog.near) * k;
    fog.far += (farTarget - fog.far) * k;
    if (keyRef.current) {
      const t = roots ? 0.55 : 2.45;
      keyRef.current.intensity += (t - keyRef.current.intensity) * k;
    }
  });

  return (
    <>
      <color attach="background" args={[FOG]} />
      <fog ref={fogRef} attach="fog" args={[FOG, 280, 1600]} />
      <SkyDome />
      <Clouds />
      <ambientLight intensity={0.52} color="#efe8dc" />
      <hemisphereLight args={["#c8d8ec", "#6e8458", 0.95]} />
      <directionalLight
        ref={keyRef}
        position={[SUN_DIR.x * 280, SUN_DIR.y * 280, SUN_DIR.z * 280]}
        intensity={2.45}
        color="#ffe8c4"
      />
      <directionalLight position={[-110, 48, 70]} intensity={0.42} color="#9bb4c8" />
      <mesh position={SUN_DIR.clone().multiplyScalar(980)} renderOrder={-12}>
        <sphereGeometry args={[22, 16, 12]} />
        <meshBasicMaterial color="#fff6d8" fog={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}
