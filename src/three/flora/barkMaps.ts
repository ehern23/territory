import * as THREE from "three";

/** CC0 bark (Poly Haven `bark_brown_02`), shared by every tree. */
export const BARK_TEX = {
  map: "assets/textures/bark/diff.jpg",
  normalMap: "assets/textures/bark/nor.jpg",
  arm: "assets/textures/bark/arm.jpg",
};

export function configureBarkMaps(maps: { map: THREE.Texture; normalMap: THREE.Texture; arm: THREE.Texture }) {
  for (const t of [maps.map, maps.normalMap, maps.arm]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.needsUpdate = true;
  }
  maps.map.colorSpace = THREE.SRGBColorSpace;
  maps.normalMap.colorSpace = THREE.NoColorSpace;
  maps.arm.colorSpace = THREE.NoColorSpace;
  return maps;
}
