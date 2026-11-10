"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { floraGlobals } from "../flora/floraMaterials";
import { SKY_GRADIENT_GLSL } from "../sky/skyGlsl";
import { sky, skyUniforms } from "../sky/skyState";
import { FBM_PERIOD, getFbmTexture } from "./noiseTexture";

/**
 * The air between the camera and the forest, as one screen pass over the
 * finished frame and its depth:
 *
 * - Aerial perspective. Distant ground fades toward the colour the sky has in
 *   that same direction, so ridges dissolve gold toward a low sun and blue
 *   away from it. A single fog colour can only ever match one side.
 * - Valley mist. A thin layer that thickens toward the valley floor: the
 *   canopy sits in it at dawn and the account giants stand clear of it.
 * - Cloud shadows. Soft patches that drift over the whole valley with the
 *   wind, sized and thinned by the cloud cover.
 *
 * It replaces per-material scene fog, so every surface (lit, unlit, impostor)
 * is hazed identically and no shader pays for fog of its own.
 */

const FRAG = /* glsl */ `
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform vec2 uTan;
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunGlow;
uniform vec3 uMistColor;
uniform vec3 uLightDir;
uniform float uHaze;
uniform float uMist;
uniform float uCloudShadow;
uniform float uCloudCover;
uniform float uNight;
uniform float uTime;
uniform sampler2D uNoise;

${SKY_GRADIENT_GLSL}

/** Scale height of the valley mist, metres. */
#define MIST_FALL ${(1 / 42).toFixed(6)}
#define NOISE_INV ${(1 / FBM_PERIOD).toFixed(6)}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // The sky dome paints its own air.
  if (depth >= 0.9999995) { outputColor = vec4(inputColor.rgb, 1.0); return; }
  float viewZ = getViewZ(depth);
  vec3 vp = vec3((uv * 2.0 - 1.0) * uTan * -viewZ, viewZ);
  float dist = length(vp);
  vec3 dir = normalize((uCamWorld * vec4(vp, 0.0)).xyz);
  vec3 wp = uCamPos + dir * dist;
  vec3 col = inputColor.rgb;

  // Cloud shadows, cast along the light from a deck well above the peaks.
  if (uCloudShadow > 0.001) {
    vec2 q = (wp.xz + uLightDir.xz / max(uLightDir.y, 0.25) * (1500.0 - wp.y)) * (NOISE_INV / 520.0);
    q += uTime * vec2(0.0011, 0.00038);
    float c = texture2D(uNoise, q).r * 0.65 + texture2D(uNoise, q * 0.47 + 0.37).r * 0.45;
    float thresh = mix(0.86, 0.3, uCloudCover);
    col *= 1.0 - uCloudShadow * smoothstep(thresh - 0.06, thresh + 0.3, c);
  }

  // Aerial perspective toward the sky just above the horizon in this direction.
  vec3 toSky = normalize(vec3(dir.x, max(dir.y, 0.0) * 0.35 + 0.03, dir.z));
  // Squared falloff: the valley stays clear and the haze gathers on the ranges.
  float haze = 1.0 - exp(-pow(dist * uHaze, 2.0));
  // Thin haze over nearby forest is far dimmer than the open sky; only the
  // farthest ridges reach the sky's own brightness.
  vec3 air = skyGradient(toSky) * mix(0.5, 1.0, haze);
  col = mix(col, air, haze);

  // Valley mist: density falls off exponentially with height, integrated
  // along the ray in closed form.
  if (uMist > 0.0) {
    float y0 = max(uCamPos.y, -30.0);
    float y1 = max(wp.y, -30.0);
    // (1 - exp(-x)) / x, with its series near x = 0 where the difference of
    // two nearly equal exponentials would turn to noise along the eye line.
    float x = (y1 - y0) * MIST_FALL;
    float column = exp(-y0 * MIST_FALL) * (abs(x) > 0.02 ? (1.0 - exp(-x)) / x : 1.0 - 0.5 * x);
    float mist = 1.0 - exp(-uMist * column * dist);
    // Mist glows where the light comes through it.
    float through = pow(max(dot(dir, normalize(uSunDir)), 0.0), 6.0);
    vec3 mistCol = uMistColor + uSunGlow * through * 0.35;
    col = mix(col, mistCol, mist);
  }

  // Alpha-to-coverage leaves fractional alpha along leaf edges; every later
  // effect blends by it, which drew a pale hairline around each leaf.
  // Night vision: by moonlight the eye loses colour and what is left leans
  // blue. Done here so every surface cools together.
  if (uNight > 0.001) {
    // The eye also adapts: lift the ground so the forest keeps its shapes.
    col *= 1.0 + 1.1 * uNight;
    float l = dot(col, vec3(0.25, 0.6, 0.15));
    col = mix(col, l * vec3(0.62, 0.82, 1.3), uNight * 0.62);
  }

  outputColor = vec4(col, 1.0);
}
`;

class AerialEffect extends Effect {
  constructor() {
    super("AerialEffect", FRAG, {
      blendFunction: BlendFunction.SET,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["uCamWorld", new THREE.Uniform(new THREE.Matrix4())],
        ["uCamPos", new THREE.Uniform(new THREE.Vector3())],
        ["uTan", new THREE.Uniform(new THREE.Vector2(1, 1))],
        ["uSunDir", skyUniforms.uSunDir as THREE.Uniform],
        ["uLightDir", skyUniforms.uLightDir as THREE.Uniform],
        ["uZenith", skyUniforms.uZenith as THREE.Uniform],
        ["uHorizon", skyUniforms.uHorizon as THREE.Uniform],
        ["uSunGlow", skyUniforms.uSunGlow as THREE.Uniform],
        ["uMistColor", new THREE.Uniform(sky.mistColor)],
        ["uHaze", new THREE.Uniform(0.0003)],
        ["uMist", new THREE.Uniform(0)],
        ["uCloudShadow", new THREE.Uniform(0)],
        ["uCloudCover", skyUniforms.uCloudCover as THREE.Uniform],
        ["uNight", skyUniforms.uNight as THREE.Uniform],
        ["uTime", floraGlobals.uTime as THREE.Uniform],
        ["uNoise", new THREE.Uniform(getFbmTexture())],
      ]),
    });
  }
}

export function Aerial() {
  const effect = useMemo(() => new AerialEffect(), []);
  useFrame(({ camera }) => {
    const u = effect.uniforms;
    (u.get("uCamWorld")!.value as THREE.Matrix4).copy(camera.matrixWorld);
    (u.get("uCamPos")!.value as THREE.Vector3).copy(camera.position);
    const cam = camera as THREE.PerspectiveCamera;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    (u.get("uTan")!.value as THREE.Vector2).set(t * cam.aspect, t);
    u.get("uHaze")!.value = sky.haze;
    u.get("uMist")!.value = sky.mist;
    u.get("uCloudShadow")!.value = sky.cloudShadow;
  });
  return <primitive object={effect} dispose={null} />;
}
