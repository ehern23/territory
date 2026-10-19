import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Small modelling kit for creatures: ellipsoids, tapered limbs and cones with
 * baked vertex colour, merged into one geometry per moving part. Creatures
 * are seen at a distance, so the work goes into silhouette and proportion.
 */

export interface Part {
  geometry: THREE.BufferGeometry;
}

function colorize(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, shadeAxis?: { y0: number; y1: number; under: THREE.ColorRepresentation }) {
  const c = new THREE.Color(color);
  const u = shadeAxis ? new THREE.Color(shadeAxis.under) : c;
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    tmp.copy(c);
    if (shadeAxis) {
      const t = THREE.MathUtils.smoothstep(p.getY(i), shadeAxis.y0, shadeAxis.y1);
      tmp.copy(u).lerp(c, t);
    }
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}

function clean(g: THREE.BufferGeometry) {
  const out = g.index ? g.toNonIndexed() : g;
  out.deleteAttribute("uv");
  return out;
}

export function ellipsoid(
  radii: [number, number, number],
  at: [number, number, number],
  color: THREE.ColorRepresentation,
  opts: { rot?: [number, number, number]; under?: THREE.ColorRepresentation; detail?: [number, number] } = {},
) {
  const [ws, hs] = opts.detail ?? [12, 9];
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.scale(radii[0], radii[1], radii[2]);
  if (opts.under) colorize(g, color, { y0: -radii[1] * 0.6, y1: radii[1] * 0.3, under: opts.under });
  else colorize(g, color);
  if (opts.rot) g.rotateX(opts.rot[0]).rotateY(opts.rot[1]).rotateZ(opts.rot[2]);
  g.translate(...at);
  return clean(g);
}

/** Tapered limb from a to b. */
export function limb(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, color: THREE.ColorRepresentation, sides = 7) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1, false);
  colorize(g, color);
  g.translate(0, len / 2, 0);
  const dir = b.clone().sub(a).normalize();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
  g.translate(a.x, a.y, a.z);
  return clean(g);
}

export function cone(r: number, h: number, at: [number, number, number], color: THREE.ColorRepresentation, rot: [number, number, number] = [0, 0, 0], sides = 6) {
  const g = new THREE.ConeGeometry(r, h, sides);
  colorize(g, color);
  g.rotateX(rot[0]).rotateY(rot[1]).rotateZ(rot[2]);
  g.translate(...at);
  return clean(g);
}

export function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts, false);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

let sharedMaterial: THREE.MeshStandardMaterial | null = null;

/** One fur/feather material for all creatures: vertex colour, soft and matte. */
export function creatureMaterial() {
  if (sharedMaterial) return sharedMaterial;
  sharedMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.6,
  });
  // A soft sheen at grazing angles reads as fur.
  sharedMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `{
         float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);
         outgoingLight += diffuseColor.rgb * rim * 0.35;
       }
       #include <opaque_fragment>`,
    );
  };
  sharedMaterial.customProgramCacheKey = () => "territory-creature-v1";
  return sharedMaterial;
}
