import * as THREE from "three";

/**
 * Soft shadows for three 0.185.
 *
 * three 0.185 deprecates PCFSoftShadowMap (it is silently downgraded to
 * PCFShadowMap with a warning). PCFShadowMap itself filters through hardware
 * comparison samples spread over a rotated Vogel disk of `shadow.radius`
 * texels, but with only five taps, so a wide radius turns grainy. This widens
 * the disk to more taps so the penumbra can be broad and still smooth. It
 * only touches the directional/spot PCF path; depth passes, custom depth
 * materials (wind and foliage thinning) and point lights are untouched.
 */

/** Phones and `?lite` get fewer taps; the penumbra stays the same width. */
const LIGHT =
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)").matches || new URLSearchParams(window.location.search).has("lite"));

export const SOFT_SHADOW_TAPS = LIGHT ? 8 : 12;

/** The five-tap block in three's PCF getShadow(). */
const FIVE_TAPS =
  /shadow = \(\s*texture\( shadowMap, vec3\( shadowCoord\.xy \+ vogelDiskSample\( 0, 5, phi \) \* radius, shadowCoord\.z \) \)[\s\S]*?\) \* 0\.2;/;

let installed = false;

/** Patch three's shadow chunk once, before any material compiles. */
export function installSoftShadows() {
  if (installed) return;
  installed = true;
  const chunk = THREE.ShaderChunk.shadowmap_pars_fragment;
  if (!FIVE_TAPS.test(chunk)) {
    // A three upgrade changed the chunk: keep its own filter rather than break shaders.
    console.warn("[territory] soft shadows: three's PCF shadow chunk changed; using its default filter.");
    return;
  }
  THREE.ShaderChunk.shadowmap_pars_fragment = chunk.replace(
    FIVE_TAPS,
    /* glsl */ `shadow = 0.0;
				for ( int i = 0; i < ${SOFT_SHADOW_TAPS}; i ++ ) {
					shadow += texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( i, ${SOFT_SHADOW_TAPS}, phi ) * radius, shadowCoord.z ) );
				}
				shadow /= ${SOFT_SHADOW_TAPS}.0;`,
  );
}

/**
 * Shadow softness in world metres: the blur radius of a shadow's edge. A high
 * sun in a clear sky gives crisp edges; cloud and a low sun spread them.
 */
export function penumbraMetres(cloudCover: number, sunElevationDeg: number, night: number) {
  const low = 1 - THREE.MathUtils.smoothstep(sunElevationDeg, 4, 30);
  return 0.32 * (1 + 1.4 * cloudCover) * (1 + 0.7 * low) * (1 + 0.5 * night);
}

/** Convert a world-space penumbra into PCF radius texels for a shadow camera. */
export function shadowRadiusTexels(metres: number, frustumWidth: number, mapSize: number) {
  // Past ~9 texels even 12 taps start to read as grain.
  return THREE.MathUtils.clamp(metres / (frustumWidth / mapSize), 1, 9);
}
