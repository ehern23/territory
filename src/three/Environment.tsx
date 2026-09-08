"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { FOG } from "./palette";

/**
 * Calm cinematic lighting: readable bark and foliage without flattening the
 * dark, premium evening. Atmosphere does the work of distance — not extra geometry.
 */
export function Atmosphere() {
  const mode = useTerritoryStore((s) => s.mode);
  const view = useTerritoryStore((s) => s.view);
  const fogRef = useRef<THREE.Fog>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const bounceRef = useRef<THREE.DirectionalLight>(null);

  useFrame((_, dt) => {
    const fog = fogRef.current;
    if (!fog) return;
    const k = 1 - Math.exp(-dt * 3);
    const roots = mode === "account" && view === "roots";
    const nearTarget = mode === "forest" ? 24 : roots ? 12 : 28;
    const farTarget = mode === "forest" ? 420 : roots ? 200 : 300;
    fog.near += (nearTarget - fog.near) * k;
    fog.far += (farTarget - fog.far) * k;
    if (fillRef.current) {
      const t = roots ? 0.95 : 0.58;
      fillRef.current.intensity += (t - fillRef.current.intensity) * k;
    }
    if (bounceRef.current) {
      const t = roots ? 1.15 : 0.32;
      bounceRef.current.intensity += (t - bounceRef.current.intensity) * k;
    }
  });

  return (
    <>
      <color attach="background" args={[FOG]} />
      <fog ref={fogRef} attach="fog" args={[FOG, 24, 420]} />
      <ambientLight intensity={0.16} color="#8d8880" />
      <hemisphereLight args={["#9aa3ad", "#2a2618", 0.95]} />
      <directionalLight position={[88, 48, 70]} intensity={2.35} color="#ffe6cf" />
      <directionalLight ref={fillRef} position={[-78, 34, -48]} intensity={0.7} color="#9aabc0" />
      <directionalLight ref={bounceRef} position={[18, 6, 90]} intensity={0.42} color="#cbb79a" />
    </>
  );
}
