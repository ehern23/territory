"use client";

import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette, HueSaturation, BrightnessContrast } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useTerritoryStore } from "@/store/useTerritoryStore";

function flag(name: string) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Restrained grade: ambient occlusion grounds trunks, a soft bloom lets the
 * sun and ripe fruit breathe, filmic tone mapping keeps highlights soft.
 * Touch devices skip AO to protect frame rate.
 */
export function Effects() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const tm = flag("tm");
  const mode = tm === "agx" ? ToneMappingMode.AGX : tm === "neutral" ? ToneMappingMode.NEUTRAL : ToneMappingMode.ACES_FILMIC;
  const ao = flag("ao") !== "0" && !isTouch;
  return (
    <EffectComposer multisampling={isTouch ? 0 : 4} enableNormalPass={false}>
      {ao ? <N8AO aoRadius={4} intensity={1.4} distanceFalloff={1} quality="medium" halfRes /> : <></>}
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.4} mipmapBlur />
      <ToneMapping mode={mode} />
      <HueSaturation saturation={0.05} />
      <BrightnessContrast brightness={0} contrast={0.04} />
      <Vignette offset={0.32} darkness={0.42} />
    </EffectComposer>
  );
}
