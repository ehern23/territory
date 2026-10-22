import * as THREE from "three";

/**
 * Flora shaders, built on MeshStandardMaterial so trees keep physically based
 * lighting, fog, shadows and image-based light.
 *
 * Global uniforms (time, wind, sun) are shared by every flora material and
 * advanced once per frame by <FloraClock/>. Per-tree uniforms carry the
 * account's vitality and the state of each scaffold limb (business unit).
 */

export const MAX_LIMBS = 12;

/** QA aid: `?settle=1` snaps eased visuals to their targets (software-rendered screenshots). */
export const floraDebug = {
  settle: typeof window !== "undefined" && new URLSearchParams(window.location.search).has("settle"),
};

/**
 * Touch devices render without MSAA; alpha-to-coverage needs multisampling,
 * so they fall back to a plain alpha cut.
 */
export function supportsAlphaToCoverage() {
  return (
    typeof window !== "undefined" &&
    !window.matchMedia("(pointer: coarse)").matches &&
    !new URLSearchParams(window.location.search).has("lite") &&
    !new URLSearchParams(window.location.search).has("noa2c")
  );
}

export const floraGlobals = {
  uTime: { value: 0 },
  /** xz = wind direction × strength. */
  uWind: { value: new THREE.Vector3(1.0, 0, 0.35) },
  /** Sun direction in view space (updated per frame). */
  uSunView: { value: new THREE.Vector3(0, 1, 0) },
  uSunColor: { value: new THREE.Color("#ffd9a8") },
  /** Leaf colour ramp from withered (0) to thriving (1). */
  uPal: {
    value: [
      new THREE.Color("#94582c"),
      new THREE.Color("#c08636"),
      new THREE.Color("#a29a3a"),
      new THREE.Color("#5f9234"),
      new THREE.Color("#3f8a2e"),
    ],
  },
  uSpringColor: { value: new THREE.Color("#b5dc6e") },
  uMossColor: { value: new THREE.Color("#5d6e2c") },
};

export interface TreeUniforms {
  uVitality: { value: number };
  uDim: { value: number };
  uGlow: { value: number };
  uLimbDormant: { value: number[] };
  uLimbSpring: { value: number[] };
  uLimbFocus: { value: number[] };
}

export function createTreeUniforms(vitality = 0.85): TreeUniforms {
  return {
    uVitality: { value: vitality },
    uDim: { value: 0 },
    uGlow: { value: 0 },
    uLimbDormant: { value: new Array(MAX_LIMBS).fill(0) },
    uLimbSpring: { value: new Array(MAX_LIMBS).fill(0) },
    uLimbFocus: { value: new Array(MAX_LIMBS).fill(1) },
  };
}

const COMMON_VERTEX = /* glsl */ `
uniform float uTime;
uniform vec3 uWind;
uniform float uVitality;
uniform float uLimbDormant[${MAX_LIMBS}];
uniform float uLimbSpring[${MAX_LIMBS}];
uniform float uLimbFocus[${MAX_LIMBS}];

vec3 floraWind(vec3 wp, float flex) {
  float t = uTime;
  float phase = dot(wp.xz, vec2(0.021, 0.017));
  float gust = 0.55 + 0.45 * sin(t * 0.33 + phase * 0.7) * sin(t * 0.19 + 1.3);
  float sway = sin(t * 1.05 + phase * 3.0) * 0.6 + sin(t * 1.83 + phase * 5.0) * 0.25;
  vec3 o = vec3(uWind.x, 0.0, uWind.z) * (gust * 0.9 + sway * 0.55) * flex;
  o.y -= abs(sway) * flex * 0.1 * length(uWind.xz);
  return o;
}

vec3 floraToLocal(vec3 w) {
  #ifdef USE_INSTANCING
    mat3 im = mat3(instanceMatrix);
    return transpose(im) * w / dot(im[0], im[0]);
  #else
    return w;
  #endif
}

vec3 floraWorld(vec3 p) {
  vec4 w = vec4(p, 1.0);
  #ifdef USE_INSTANCING
    w = instanceMatrix * w;
  #endif
  return (modelMatrix * w).xyz;
}

void floraLimb(float limb, out float dormant, out float spring, out float focus) {
  dormant = 0.0;
  spring = 0.0;
  focus = 1.0;
  if (limb > -0.5) {
    int li = int(limb + 0.5);
    dormant = uLimbDormant[li];
    spring = uLimbSpring[li];
    focus = uLimbFocus[li];
  }
}
`;

const FOLIAGE_PARS = /* glsl */ `
${COMMON_VERTEX}
uniform vec3 uPal[5];
uniform vec3 uSpringColor;
attribute vec3 aCenter;
attribute vec4 aLeaf;
attribute float aShade;
#ifdef FLORA_COLOR
varying vec3 vLeafTint;
varying float vFocus;
#endif

vec3 leafPalette(float v) {
  float x = clamp(v, 0.0, 1.0) * 4.0;
  int i = int(min(floor(x), 3.0));
  return mix(uPal[i], uPal[i + 1], x - float(i));
}
`;

const FOLIAGE_VERTEX = /* glsl */ `
#include <begin_vertex>
{
  float dormant; float spring; float focus;
  floraLimb(aLeaf.z, dormant, spring, focus);
  float dens = mix(0.24, 1.0, smoothstep(0.06, 0.8, uVitality)) * (1.0 - dormant);
  float keep = 1.0 - smoothstep(dens - 0.1, dens + 0.001, aLeaf.y);
  transformed = aCenter + (transformed - aCenter) * keep;

  #ifdef FLORA_COLOR
    float v = clamp(uVitality + (aLeaf.x - 0.5) * 0.46, 0.0, 1.0);
    vec3 tint = leafPalette(v);
    tint = mix(tint, uSpringColor, spring * (0.55 + 0.45 * aLeaf.x));
    vLeafTint = tint * aShade;
    vFocus = focus;
  #endif

  vec3 wc = floraWorld(aCenter);
  vec3 w = floraWind(wc, aLeaf.w);
  float fl = sin(uTime * 4.1 + aLeaf.x * 61.0 + wc.x * 0.3) * 0.5 + sin(uTime * 6.7 + aLeaf.y * 37.0) * 0.3;
  w += normal * fl * 0.06 * length(position - aCenter) * length(uWind.xz);
  transformed += floraToLocal(w);
}
`;

/** Cards shade by their volume normal on both faces (no back-face flip). */
export const UNFLIPPED_NORMAL = /* glsl */ `
#include <normal_fragment_begin>
normal = normalize(vNormal);
nonPerturbedNormal = normal;
`;

const SHARED_FRAGMENT_PARS = /* glsl */ `
uniform vec3 uSunView;
uniform vec3 uSunColor;
uniform float uDim;
uniform float uGlow;
`;

function quietGrade(focusExpr: string) {
  return /* glsl */ `
  {
    float quiet = max(uDim, 1.0 - ${focusExpr});
    float luma = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
    outgoingLight = mix(outgoingLight, vec3(luma) * vec3(0.78, 0.8, 0.84), quiet * 0.72);
    outgoingLight += diffuseColor.rgb * uGlow;
  }
  #include <opaque_fragment>
  `;
}

/**
 * Distance LOD for instanced backdrop trees: past `near` the detailed tree
 * dithers out over to `far` while its impostor dithers in, so there is no pop.
 */
export interface LodFade {
  near: number;
  far: number;
}

const LOD_VERTEX = /* glsl */ `
#ifdef FLORA_LOD
  vLodDist = distance(cameraPosition, floraWorld(vec3(0.0)));
#endif
`;

const LOD_FRAGMENT = /* glsl */ `
#ifdef FLORA_LOD
  float floraFade = 1.0 - smoothstep(uLodFade.x, uLodFade.y, vLodDist);
  #ifndef ALPHA_TO_COVERAGE
  {
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    if (ign > floraFade) discard;
  }
  #endif
#endif
`;

/**
 * Alpha test with sharpened alpha-to-coverage. three's stock A2C path maps
 * alpha through smoothstep(cutoff, cutoff + fwidth), so an opaque texel next
 * to a transparent one only gets half coverage. At a distance every leaf is
 * next to a gap, so whole crowns turned into a shimmering 50% stipple. This
 * centres the ramp on the cutoff and keeps it one pixel wide, which keeps
 * crowns solid and leaves only the silhouettes antialiased.
 */
const SHARP_ALPHATEST = /* glsl */ `
#ifdef USE_ALPHATEST
  #ifdef ALPHA_TO_COVERAGE
    diffuseColor.a = clamp((diffuseColor.a - alphaTest) / max(fwidth(diffuseColor.a), 0.0001) + 0.5, 0.0, 1.0);
    #ifdef FLORA_LOD
      // With coverage available the LOD hand-off fades through sub-pixel
      // coverage instead of a screen-space dither.
      diffuseColor.a *= floraFade;
    #endif
    if (diffuseColor.a <= 0.0) discard;
  #else
    if (diffuseColor.a < alphaTest) discard;
  #endif
#endif
`;

const LOD_PARS_V = "#ifdef FLORA_LOD\nvarying float vLodDist;\n#endif";
const LOD_PARS_F = "#ifdef FLORA_LOD\nvarying float vLodDist;\nuniform vec2 uLodFade;\n#endif";

function bindUniforms(shader: THREE.WebGLProgramParametersWithUniforms, tree: TreeUniforms, extra: Record<string, { value: unknown }> = {}) {
  Object.assign(shader.uniforms, floraGlobals, tree, extra);
}

/** Leaf-card foliage. One per tree (per-tree uniforms), or shared for the backdrop. */
export function createFoliageMaterial(
  atlas: THREE.Texture | null,
  tree: TreeUniforms,
  opts: { translucency?: number; alphaToCoverage?: boolean; lod?: LodFade } = {},
) {
  const material = new THREE.MeshStandardMaterial({
    map: atlas ?? undefined,
    roughness: 0.78,
    metalness: 0,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    alphaToCoverage: (opts.alphaToCoverage ?? true) && supportsAlphaToCoverage(),
    envMapIntensity: 0.55,
  });
  const translucency = { value: opts.translucency ?? 0.85 };
  const atlasSize = { value: new THREE.Vector2(1024, 1024) };
  const lodFade = { value: new THREE.Vector2(opts.lod?.near ?? 0, opts.lod?.far ?? 0) };
  material.onBeforeCompile = (shader) => {
    bindUniforms(shader, tree, { uTranslucency: translucency, uAtlasSize: atlasSize, uLodFade: lodFade });
    shader.defines = { ...(shader.defines ?? {}), FLORA_COLOR: "", ...(opts.lod ? { FLORA_LOD: "" } : {}) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${FOLIAGE_PARS}\n${LOD_PARS_V}`)
      .replace("#include <begin_vertex>", FOLIAGE_VERTEX + LOD_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\n${SHARED_FRAGMENT_PARS}\n${LOD_PARS_F}\nuniform float uTranslucency;\nuniform vec2 uAtlasSize;\nvarying vec3 vLeafTint;\nvarying float vFocus;`,
      )
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${LOD_FRAGMENT}`)
      .replace("#include <alphatest_fragment>", SHARP_ALPHATEST)
      .replace("#include <normal_fragment_begin>", UNFLIPPED_NORMAL)
      // Leaf cards facing the sun would otherwise glint as white speckle.
      .replace(
        "vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;",
        "vec3 totalSpecular = (reflectedLight.directSpecular + reflectedLight.indirectSpecular) * 0.2;",
      )
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        #ifdef USE_MAP
          vec4 texel = texture2D(map, vMapUv);
          // Keep alpha coverage under minification so distant crowns stay full.
          vec2 tc = vMapUv * uAtlasSize;
          vec2 ddx = dFdx(tc);
          vec2 ddy = dFdy(tc);
          float lod = max(0.0, 0.5 * log2(max(dot(ddx, ddx), dot(ddy, ddy))));
          texel.a *= 1.0 + lod * 0.45;
          diffuseColor *= texel;
        #endif
        diffuseColor.rgb *= vLeafTint;
        `,
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
        {
          vec3 V = normalize(vViewPosition);
          float back = pow(saturate(dot(-V, uSunView)), 3.0);
          outgoingLight += diffuseColor.rgb * uSunColor * (back * uTranslucency + 0.05);
        }
        ${quietGrade("vFocus")}
        `,
      );
  };
  material.customProgramCacheKey = () => `flora-foliage-v5${opts.lod ? "-lod" : ""}`;

  const depth = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: atlas ?? undefined,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  depth.onBeforeCompile = (shader) => {
    bindUniforms(shader, tree);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${FOLIAGE_PARS}`)
      .replace("#include <begin_vertex>", FOLIAGE_VERTEX);
  };
  depth.customProgramCacheKey = () => "flora-foliage-depth-v1";

  return { material, depth };
}

const BARK_PARS = /* glsl */ `
${COMMON_VERTEX}
attribute vec2 aBark;
varying float vDormant;
varying float vFocus;
varying float vUp;
`;

const BARK_VERTEX = /* glsl */ `
#include <begin_vertex>
{
  float dormant; float spring; float focus;
  floraLimb(aBark.y, dormant, spring, focus);
  vDormant = dormant;
  vFocus = focus;
  vec3 wp = floraWorld(position);
  transformed += floraToLocal(floraWind(wp, aBark.x));
  vec3 n = objectNormal;
  #ifdef USE_INSTANCING
    n = mat3(instanceMatrix) * n;
  #endif
  vUp = normalize(mat3(modelMatrix) * n).y;
}
`;

export function createBarkMaterial(
  maps: { map: THREE.Texture; normalMap: THREE.Texture; arm: THREE.Texture } | null,
  tree: TreeUniforms,
  opts: { color?: THREE.ColorRepresentation; moss?: number; lod?: LodFade } = {},
) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.color ?? "#5b5249"),
    map: maps?.map,
    normalMap: maps?.normalMap,
    roughnessMap: maps?.arm,
    aoMap: maps?.arm,
    aoMapIntensity: 0.35,
    roughness: 0.92,
    metalness: 0,
    normalScale: new THREE.Vector2(0.9, 0.9),
    envMapIntensity: 0.5,
  });
  const moss = { value: opts.moss ?? 0.5 };
  const lodFade = { value: new THREE.Vector2(opts.lod?.near ?? 0, opts.lod?.far ?? 0) };
  material.onBeforeCompile = (shader) => {
    bindUniforms(shader, tree, { uMoss: moss, uLodFade: lodFade });
    if (opts.lod) shader.defines = { ...(shader.defines ?? {}), FLORA_LOD: "" };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${BARK_PARS}\n${LOD_PARS_V}`)
      .replace("#include <begin_vertex>", BARK_VERTEX + LOD_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\n${SHARED_FRAGMENT_PARS}\n${LOD_PARS_F}\nuniform vec3 uMossColor;\nuniform float uMoss;\nvarying float vDormant;\nvarying float vFocus;\nvarying float vUp;`,
      )
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${LOD_FRAGMENT}`)
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        #include <map_fragment>
        {
          // The photo bark is treated as luminance detail over a controlled
          // grey-brown, so crevices never crush to black.
          float l = dot(diffuseColor.rgb, vec3(0.33)) / max(dot(diffuse, vec3(0.33)), 0.001);
          diffuseColor.rgb = diffuse * (0.3 + 1.05 * l);
          float m = smoothstep(0.25, 0.85, vUp) * uMoss;
          diffuseColor.rgb = mix(diffuseColor.rgb, uMossColor * (0.55 + 0.9 * l), m);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l) * vec3(1.05, 1.02, 1.0), vDormant * 0.65);
        }
        `,
      )
      .replace(
        "#include <opaque_fragment>",
        // A little bounce light keeps shaded bark from collapsing to black.
        `outgoingLight += diffuseColor.rgb * vec3(0.12, 0.13, 0.11);\n${quietGrade("vFocus")}`,
      );
  };
  material.customProgramCacheKey = () => `flora-bark-v3${opts.lod ? "-lod" : ""}`;
  return material;
}

/** Keep the view-space sun direction current for translucency. */
export function updateSunView(sunWorld: THREE.Vector3, camera: THREE.Camera) {
  floraGlobals.uSunView.value.copy(sunWorld).transformDirection(camera.matrixWorldInverse);
}
