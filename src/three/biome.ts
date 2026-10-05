import * as THREE from "three";

/** Low late-day sun from the west-northwest: long shadows across the territory and warm rim light on crowns. */
export const SUN_DIR = new THREE.Vector3(-0.78, 0.38, -0.5).normalize();

/** Art direction only. Account topology and status colors live outside this layer. */
export const OLD_GROWTH = {
  fog: "#a7bcb2",
  ground: "#84966b",
  canopy: "#3f683c",
  sunlight: "#fff0d5",
  exposure: 0.96,
  desktopDpr: 1.5,
  mobileDpr: 1.15,
} as const;
