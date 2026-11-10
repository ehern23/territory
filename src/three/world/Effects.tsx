"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, ToneMapping, Vignette } from "@react-three/postprocessing";
import { EffectPass, FXAAEffect, ToneMappingMode } from "postprocessing";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { Aerial } from "./AerialEffect";

/**
 * The air first (see AerialEffect), then a restrained grade: a soft bloom
 * lets the sun, the water and ripe fruit breathe, and filmic tone mapping
 * keeps highlights soft. Touch devices skip MSAA to protect frame rate and
 * smooth edges with FXAA instead.
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
      {isTouch ? <Antialias /> : <></>}
    </EffectComposer>
  );
}

/**
 * FXAA over the finished, tone-mapped frame, as a pass of its own: without
 * MSAA, leaf cut-outs stair-step, and this rounds them off for a fraction of
 * a millisecond. (Merged into the main pass it would read the raw scene and
 * drop the effects before it.)
 */
function Antialias() {
  const camera = useThree((s) => s.camera);
  const pass = useMemo(() => new EffectPass(camera, new FXAAEffect()), [camera]);
  useEffect(() => () => pass.dispose(), [pass]);
  return <primitive object={pass} dispose={null} />;
}
