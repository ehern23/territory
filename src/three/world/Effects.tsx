"use client";

import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useTerritoryStore } from "@/store/useTerritoryStore";

/**
 * Restrained grade: ambient occlusion grounds trunks, a soft bloom lets the
 * sun and ripe fruit breathe, filmic tone mapping keeps highlights soft.
 * Touch devices skip AO and MSAA to protect frame rate.
 */
export function Effects() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  return (
    <EffectComposer multisampling={isTouch ? 0 : 4} enableNormalPass={false}>
      {isTouch ? <></> : <N8AO aoRadius={4} intensity={1.4} distanceFalloff={1} quality="medium" halfRes />}
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.4} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={0.05} />
      <BrightnessContrast brightness={0} contrast={0.04} />
      <Vignette offset={0.32} darkness={0.42} />
    </EffectComposer>
  );
}
