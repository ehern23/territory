"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { FOG, GROUND } from "./palette";

function makeRadialTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(0.7, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Charcoal ground that fades to reveal roots in Roots mode. */
export function Ground() {
  const view = useTerritoryStore((s) => s.view);
  const mode = useTerritoryStore((s) => s.mode);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(GROUND), roughness: 1, transparent: true, opacity: 1 }),
    [],
  );
  const poolTexture = useMemo(makeRadialTexture, []);
  const poolMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#2b2c33"),
        alphaMap: poolTexture ?? undefined,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    [poolTexture],
  );
  useEffect(
    () => () => {
      material.dispose();
      poolMaterial.dispose();
      poolTexture?.dispose();
    },
    [material, poolMaterial, poolTexture],
  );

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 5);
    const target = mode === "account" && view === "roots" ? 0.08 : 1;
    material.opacity += (target - material.opacity) * k;
    poolMaterial.opacity += (target * 0.7 - poolMaterial.opacity) * k;
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} material={material} receiveShadow={false}>
        <circleGeometry args={[900, 72]} />
      </mesh>
      {/* One soft pool of light under the strategic territory. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, -40]} material={poolMaterial}>
        <circleGeometry args={[260, 48]} />
      </mesh>
    </group>
  );
}

/** Fog and lighting tuned for a calm, dim, slightly warm evening. */
export function Atmosphere() {
  const mode = useTerritoryStore((s) => s.mode);
  const fogRef = useRef<THREE.Fog>(null);
  useFrame((_, dt) => {
    const fog = fogRef.current;
    if (!fog) return;
    const k = 1 - Math.exp(-dt * 3);
    const nearTarget = mode === "forest" ? 200 : 60;
    const farTarget = mode === "forest" ? 720 : 300;
    fog.near += (nearTarget - fog.near) * k;
    fog.far += (farTarget - fog.far) * k;
  });
  return (
    <>
      <color attach="background" args={[FOG]} />
      <fog ref={fogRef} attach="fog" args={[FOG, 200, 720]} />
      <hemisphereLight args={["#8d919c", "#3b342c", 0.8]} />
      <directionalLight position={[60, 90, 40]} intensity={1.9} color="#ffe6cf" />
      <directionalLight position={[-70, 30, -60]} intensity={0.45} color="#a6b6c9" />
    </>
  );
}
