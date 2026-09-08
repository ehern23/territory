import * as THREE from "three";

function makeCanvas(size: number): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas.getContext("2d");
}

let barkMaps: { map: THREE.Texture; bump: THREE.Texture } | null = null;

/** Vertical-grain bark, generated once and shared. Stylized, not a photo scan. */
export function getBarkMaps(): { map: THREE.Texture; bump: THREE.Texture } {
  if (barkMaps) return barkMaps;
  const ctx = makeCanvas(512);
  if (!ctx) {
    const map = new THREE.Texture();
    barkMaps = { map, bump: map };
    return barkMaps;
  }
  const { canvas } = ctx;
  const size = canvas.width;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ridge = Math.sin(x * 0.22 + Math.sin(y * 0.04) * 2.4);
      const grain = Math.sin(x * 0.9 + y * 0.015) * 0.35;
      const n =
        0.48 +
        0.28 * ridge +
        0.14 * grain +
        0.1 * Math.sin((x * 3.1 + y * 0.4) * 0.07);
      const i = (y * size + x) * 4;
      const warm = 0.1 * Math.sin(y * 0.11);
      img.data[i] = Math.floor(70 + n * 58 + warm * 24);
      img.data[i + 1] = Math.floor(54 + n * 42);
      img.data[i + 2] = Math.floor(40 + n * 26);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 4);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;

  const bumpCtx = makeCanvas(256);
  if (bumpCtx) {
    const b = bumpCtx.canvas.width;
    const data = bumpCtx.createImageData(b, b);
    for (let y = 0; y < b; y++) {
      for (let x = 0; x < b; x++) {
        const ridge = Math.sin(x * 0.45 + Math.sin(y * 0.08) * 2.2);
        const v = Math.floor(118 + ridge * 86);
        const i = (y * b + x) * 4;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
        data.data[i + 3] = 255;
      }
    }
    bumpCtx.putImageData(data, 0, 0);
  }
  const bump = bumpCtx ? new THREE.CanvasTexture(bumpCtx.canvas) : map;
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2, 4);
  barkMaps = { map, bump };
  return barkMaps;
}

export function createBarkMaterial(color: THREE.Color) {
  const { map, bump } = getBarkMaps();
  return new THREE.MeshStandardMaterial({
    color,
    map,
    bumpMap: bump,
    bumpScale: 0.78,
    roughness: 0.88,
    metalness: 0.02,
  });
}

/**
 * Leaf material with a touch of self-illumination derived from the diffuse
 * colour so autumn status remains readable on the underside of a tuft.
 */
export function createLeafMaterial(options: { color?: THREE.Color; roughness?: number } = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: options.color ?? new THREE.Color("#ffffff"),
    roughness: options.roughness ?? 0.72,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * 0.28;",
    );
  };
  material.customProgramCacheKey = () => "territory-leaf-v12";
  return material;
}

export function createGrassMaterial(color: THREE.Color, wind: boolean) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.userData.uTime = { value: 0 };
  if (!wind) return material;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = material.userData.uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(position);
         float h = max(position.y, 0.0);
         float t = uTime * 0.65 + instanceMatrix[3][0] * 0.12 + instanceMatrix[3][2] * 0.08;
         transformed.x += sin(t) * h * 0.22;
         transformed.z += cos(t * 0.7) * h * 0.1;`,
      );
  };
  material.customProgramCacheKey = () => "territory-grass-wind";
  return material;
}
