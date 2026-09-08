"use client";

import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { Atmosphere, ImageBasedLight } from "./Environment";
import { Landscape } from "./Landscape";
import { Silhouettes } from "./Silhouettes";
import { Tree } from "./Tree";
import { CameraRig } from "./CameraRig";

export function Scene() {
  const accounts = useTerritoryStore((s) => s.accounts);
  const clearSelection = useTerritoryStore((s) => s.clearSelection);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const setIsTouch = useTerritoryStore((s) => s.setIsTouch);
  const setReducedMotion = useTerritoryStore((s) => s.setReducedMotion);
  const setIsCompact = useTerritoryStore((s) => s.setIsCompact);

  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    const applyTouch = () => setIsTouch(touch.matches);
    const applyMotion = () => setReducedMotion(motion.matches);
    const applyCompact = () => setIsCompact(compact.matches);
    applyTouch();
    applyMotion();
    applyCompact();
    touch.addEventListener("change", applyTouch);
    motion.addEventListener("change", applyMotion);
    compact.addEventListener("change", applyCompact);
    return () => {
      touch.removeEventListener("change", applyTouch);
      motion.removeEventListener("change", applyMotion);
      compact.removeEventListener("change", applyCompact);
    };
  }, [setIsTouch, setReducedMotion, setIsCompact]);

  return (
    <Canvas
      className="territory-canvas"
      dpr={isTouch ? [1, 1.5] : [1, 2]}
      camera={{ fov: 44, near: 0.5, far: 2800, position: [70, 28, 128] }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.18,
      }}
      onCreated={(state) => {
        // Development-only handle for runtime inspection.
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __t?: unknown }).__t = state;
        }
      }}
      onPointerMissed={(e) => {
        if (e.type === "click") clearSelection();
      }}
      style={{ touchAction: "none" }}
    >
      <Atmosphere />
      <Suspense fallback={null}>
        <ImageBasedLight />
      </Suspense>
      <Suspense fallback={null}>
        <Landscape />
      </Suspense>
      <Suspense fallback={null}>
        <Silhouettes />
        {accounts.map((a) => (
          <Tree key={a.id} accountId={a.id} />
        ))}
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}
