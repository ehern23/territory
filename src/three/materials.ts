import * as THREE from "three";

/**
 * Leaf material with a touch of self-illumination derived from the diffuse
 * colour. Real leaves are translucent; without this, leaves whose normals
 * face away from the key light render nearly black and the autumn colour
 * progression (the product's main signal) becomes unreadable.
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
      "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * 0.42;",
    );
  };
  material.customProgramCacheKey = () => "territory-leaf";
  return material;
}
