"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { floraGlobals, updateSunView } from "../flora/floraMaterials";
import { FOREST_CENTER, SUN_DIR } from "../layout";

/**
 * Late-afternoon light: a low warm sun behind the left shoulder of the
 * meadow, cool sky fill, and haze that pushes the far forest back.
 */

export const FOG_COLOR = new THREE.Color("#c3cdd2");
const HORIZON = new THREE.Color("#b4c6d2");
const ZENITH = new THREE.Color("#2a5fa8");
const SUN_COLOR = new THREE.Color("#ffdcb0");

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vDir = wp.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * wp;
    gl_Position.z = gl_Position.w;
  }
`;

const skyFrag = /* glsl */ `
  uniform vec3 uSun;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunCol;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
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

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    float sunDot = max(dot(d, uSun), 0.0);
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.03, 0.62, h), 0.6));
    col += uSunCol * pow(sunDot, 5.0) * 0.7 * (1.0 - smoothstep(0.0, 0.6, h));
    col += uSunCol * pow(sunDot, 80.0) * 0.8;
    col += uSunCol * smoothstep(0.99935, 0.9997, sunDot) * 6.0;

    if (h > 0.0) {
      vec2 uv = d.xz / (h + 0.14) * 0.85 + vec2(uTime * 0.0035, uTime * 0.0012);
      float c = fbm(uv * 1.5);
      float cover = smoothstep(0.56, 0.86, c) * smoothstep(0.0, 0.16, h);
      float lit = fbm(uv * 1.5 + uSun.xz * 0.06);
      vec3 cloud = mix(vec3(0.78, 0.8, 0.86), vec3(1.08, 1.04, 0.98), smoothstep(0.35, 0.75, lit));
      cloud += uSunCol * pow(sunDot, 4.0) * 0.6;
      col = mix(col, cloud, cover * 0.6);
    } else {
      col = mix(uHorizon, uHorizon * 0.85, smoothstep(0.0, -0.25, h));
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function SkyDome() {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        uniforms: {
          uSun: { value: SUN_DIR.clone() },
          uZenith: { value: ZENITH.clone() },
          uHorizon: { value: HORIZON.clone() },
          uSunCol: { value: SUN_COLOR.clone() },
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
      <sphereGeometry args={[1800, 48, 24]} />
    </mesh>
  );
}

/** Advances global flora uniforms once per frame. */
function FloraClock() {
  const reduced = useTerritoryStore((s) => s.reducedMotion);
  useFrame(({ camera }, dt) => {
    floraGlobals.uTime.value += Math.min(dt, 0.1) * (reduced ? 0.2 : 1);
    updateSunView(SUN_DIR, camera);
  });
  return null;
}

function Sun() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const light = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.copy(FOREST_CENTER);
    scene.add(l.target);
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);
  const pos = FOREST_CENTER.clone().addScaledVector(SUN_DIR, 420);
  const size = isTouch ? 2048 : 4096;
  return (
    <directionalLight
      ref={light}
      position={pos}
      intensity={3.0}
      color={SUN_COLOR}
      castShadow
      shadow-mapSize-width={size}
      shadow-mapSize-height={size}
      shadow-camera-left={-235}
      shadow-camera-right={235}
      shadow-camera-top={200}
      shadow-camera-bottom={-200}
      shadow-camera-near={60}
      shadow-camera-far={900}
      shadow-bias={-0.0004}
      shadow-normalBias={0.35}
    />
  );
}

export function Atmosphere() {
  return (
    <>
      <color attach="background" args={[FOG_COLOR]} />
      <fogExp2 attach="fog" args={[FOG_COLOR, 0.0009]} />
      <SkyDome />
      <FloraClock />
      <Sun />
      <hemisphereLight args={["#c8dcf2", "#857c58", 1.35]} />
      <directionalLight position={[180, 90, 200]} intensity={0.35} color="#a9c0dc" />
    </>
  );
}

/** HDRI contributes soft image-based fill and specular only; it is never the visible sky. */
export function ImageBasedLight() {
  return (
    <Environment
      files="/assets/hdri/noon_grass_1k.hdr"
      background={false}
      environmentIntensity={0.42}
      resolution={256}
    />
  );
}
