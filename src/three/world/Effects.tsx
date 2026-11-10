"use client";

import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { Aerial } from "./AerialEffect";

/**
 * The air first (see AerialEffect), then a restrained grade: a soft bloom lets the sun, the water and ripe fruit
 * breathe, and filmic tone mapping keeps highlights soft. Touch devices skip
 * MSAA to protect frame rate.
 *
 * There is no screen-space ambient occlusion. Measured on a 2x display it was
 * a third of the frame, and over dense foliage it mostly added murk; crowns
 * get their depth from baked leaf shading and the soft shadow map instead.
 */
export function Effects() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  return (
    <EffectComposer multisampling={isTouch ? 0 : 4} enableNormalPass={false}>
      <Aerial />
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.4} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={0.05} />
      <BrightnessContrast brightness={0} contrast={0.04} />
      <Vignette offset={0.3} darkness={0.36} />
    </EffectComposer>
  );
}
