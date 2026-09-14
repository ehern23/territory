import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BranchSegment, TreeSkeleton } from "./treeGen";

export type Detail = "full" | "reduced";

export interface TeamGeometry {
  teamId: string;
  businessUnitId: string;
  geometry: THREE.BufferGeometry;
}

export interface BusinessUnitGeometry {
  businessUnitId: string;
  /** Major limb only. */
  limb: THREE.BufferGeometry;
  teams: TeamGeometry[];
}

export interface TreeGeometry {
  trunk: THREE.BufferGeometry;
  businessUnits: BusinessUnitGeometry[];
  roots: THREE.BufferGeometry | null;
  /** Everything woody merged into one geometry (forest LOD). */
  merged: THREE.BufferGeometry;
}

/** Tapered tube along a curve with a radius function. */
export function buildTube(
  curve: THREE.Curve<THREE.Vector3>,
  radiusAt: (t: number) => number,
  tubular: number,
  radial: number,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubular, false);
  const vertexCount = (tubular + 1) * (radial + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  const P = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let vi = 0;
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, P);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const r = radiusAt(t);
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);
      normal.set(
        cos * N.x + sin * B.x,
        cos * N.y + sin * B.y,
        cos * N.z + sin * B.z,
      ).normalize();
      normals[vi * 3] = normal.x;
      normals[vi * 3 + 1] = normal.y;
      normals[vi * 3 + 2] = normal.z;
      positions[vi * 3] = P.x + r * normal.x;
      positions[vi * 3 + 1] = P.y + r * normal.y;
      positions[vi * 3 + 2] = P.z + r * normal.z;
      uvs[vi * 2] = j / radial;
      uvs[vi * 2 + 1] = t;
      vi++;
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute("uv2", geo.attributes.uv);
  geo.setIndex(indices);
  return geo;
}

/** Closes a tapered tube with a small cap so tips don't show a hole. */
function segmentGeometry(seg: BranchSegment, detail: Detail): THREE.BufferGeometry {
  const isTrunk = seg.kind === "trunk";
  const full = detail === "full";
  const tubular =
    seg.kind === "trunk" ? (full ? 36 : 20)
    : seg.kind === "bu" ? (full ? 22 : 12)
    : seg.kind === "team" ? (full ? 14 : 8)
    : seg.kind === "root" ? (full ? 14 : 8)
    : full ? 4 : 3;
  const radial =
    seg.kind === "trunk" ? (full ? 28 : 18)
    : seg.kind === "bu" ? (full ? 9 : 6)
    : seg.kind === "team" ? (full ? 7 : 5)
    : seg.kind === "root" ? (full ? 7 : 5)
    : full ? 4 : 3;

  const r0 = seg.radiusStart;
  const r1 = seg.radiusEnd;
  const radiusAt = isTrunk
    ? (t: number) => {
        // Root flare, slow taper, then a pinch so the leader ends inside the crown.
        const flare = 1 + 0.55 * (1 - smoothstep(0, 0.14, t));
        const pinch = 1 - 0.72 * smoothstep(0.86, 1, t);
        return Math.max(r1, (r0 / 1.62) * (1 - 0.52 * t) * pinch) * flare;
      }
    : (t: number) => THREE.MathUtils.lerp(r0, r1, easeTaper(t)) * (1 - 0.32 * Math.pow(t, 6));

  const tube = buildTube(seg.curve, radiusAt, tubular, radial);
  if (isTrunk) {
    const positions = tube.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i <= tubular; i++) {
      const t = i / tubular;
      const center = seg.curve.getPointAt(t);
      for (let j = 0; j <= radial; j++) {
        const index = i * (radial + 1) + j;
        const angle = j / radial * Math.PI * 2;
        const flute = 1 + (0.06 + 0.16 * Math.exp(-t * 12)) * Math.sin(angle * 7 + t * 1.4)
          + 0.035 * Math.sin(angle * 11 - t * 7);
        positions.setXYZ(index,
          center.x + (positions.getX(index) - center.x) * flute,
          positions.getY(index),
          center.z + (positions.getZ(index) - center.z) * flute);
      }
    }
    tube.computeVertexNormals();
  }
  if (seg.kind === "twig") return tube;

  // Tip cap
  const tip = seg.curve.getPointAt(1);
  const cap = new THREE.SphereGeometry(radiusAt(1) * 0.98, radial, Math.max(3, Math.floor(radial / 2)));
  cap.translate(tip.x, tip.y, tip.z);
  if (cap.attributes.uv) cap.setAttribute("uv2", cap.attributes.uv);
  const merged = mergeGeometries([tube, cap], false);
  tube.dispose();
  cap.dispose();
  const geo = merged ?? tube;
  if (geo.attributes.uv && !geo.attributes.uv2) geo.setAttribute("uv2", geo.attributes.uv);
  return geo;
}

function easeTaper(t: number) {
  // Slightly convex taper: thick for longer, then thins toward the tip.
  return 1 - Math.pow(1 - t, 1.35);
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function buildTreeGeometry(skeleton: TreeSkeleton, detail: Detail): TreeGeometry {
  const trunkCore = segmentGeometry(skeleton.trunk, detail);
  const buttresses: THREE.BufferGeometry[] = [];
  for(let i=0;i<7;i++) {
    const angle=i*2.399+skeleton.seed*.01, r=skeleton.trunkRadius;
    const dir=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
    const curve=new THREE.CatmullRomCurve3([
      dir.clone().multiplyScalar(r*.55).setY(r*.7),
      dir.clone().multiplyScalar(r*1.4).setY(.8),
      dir.clone().multiplyScalar(r*2.1).setY(.18),
      dir.clone().multiplyScalar(r*2.9).setY(-.5),
    ]);
    buttresses.push(buildTube(curve,t=>r*.3*Math.pow(1-t,1.8)+.02,10,7));
  }
  const trunkShoots = skeleton.twigs
    .filter((t) => !t.businessUnitId)
    .map((t) => segmentGeometry(t, detail));
  trunkShoots.push(...buttresses);
  let trunk = trunkCore;
  if (trunkShoots.length) {
    trunk = mergeGeometries([trunkCore, ...trunkShoots], false) ?? trunkCore;
    if (trunk !== trunkCore) trunkCore.dispose();
    for (const g of trunkShoots) g.dispose();
  }
  const all: THREE.BufferGeometry[] = [trunk];

  const byBu = new Map<string, BusinessUnitGeometry>();
  for (const seg of skeleton.branches) {
    if (!seg.businessUnitId) continue;
    let entry = byBu.get(seg.businessUnitId);
    if (!entry) {
      entry = { businessUnitId: seg.businessUnitId, limb: new THREE.BufferGeometry(), teams: [] };
      byBu.set(seg.businessUnitId, entry);
    }
    const g = segmentGeometry(seg, detail);
    all.push(g);
    if (seg.kind === "bu") {
      const limbTwigs = skeleton.twigs
        .filter((t) => t.businessUnitId === seg.businessUnitId && !t.teamId)
        .map((t) => segmentGeometry(t, detail));
      entry.limb = limbTwigs.length ? (mergeGeometries([g, ...limbTwigs], false) ?? g) : g;
      for (const tg of limbTwigs) all.push(tg);
    } else if (seg.kind === "team" && seg.teamId) {
      const twigGeos = skeleton.twigs
        .filter((t) => t.teamId === seg.teamId)
        .map((t) => segmentGeometry(t, detail));
      const teamGeo = twigGeos.length ? (mergeGeometries([g, ...twigGeos], false) ?? g) : g;
      for (const tg of twigGeos) {
        all.push(tg);
      }
      entry.teams.push({ teamId: seg.teamId, businessUnitId: seg.businessUnitId, geometry: teamGeo });
    }
  }

  let roots: THREE.BufferGeometry | null = null;
  if (skeleton.roots.length) {
    const rootGeos = skeleton.roots.map((r) => segmentGeometry(r, detail));
    roots = mergeGeometries(rootGeos, false);
    rootGeos.forEach((g) => g.dispose());
  }

  const merged = mergeGeometries(all, false) ?? trunk;

  return {
    trunk,
    businessUnits: [...byBu.values()],
    roots,
    merged,
  };
}

/** Single leaflet blade: base at origin, tip at +y, gentle midrib fold and cup. */
function leafletGeometry(length: number, width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width * 0.8, length * 0.14, width, length * 0.56, 0, length);
  shape.bezierCurveTo(-width, length * 0.56, -width * 0.8, length * 0.14, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 8);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const fold = Math.abs(x) * 0.28;
    const cup = Math.sin((y / length) * Math.PI) * 0.05 * length;
    pos.setZ(i, -fold + cup);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

let leafGeometry: THREE.BufferGeometry | null = null;
/**
 * Shared leaf: a single ovate blade on a short petiole. Base at origin, tip
 * along +y, blade normal along +z. Stakeholders render as a tuft of these so
 * the canopy reads as foliage rather than a scatter of large flat shapes.
 */
export function getLeafGeometry(): THREE.BufferGeometry {
  if (leafGeometry) return leafGeometry;
  const petiole = new THREE.PlaneGeometry(0.035, 0.22, 1, 1);
  petiole.translate(0, 0.11, -0.005);
  const blade = leafletGeometry(0.82, 0.3);
  blade.translate(0, 0.2, 0);
  const merged = mergeGeometries([petiole, blade], false) ?? blade;
  petiole.dispose();
  if (merged !== blade) blade.dispose();
  merged.computeVertexNormals();
  leafGeometry = merged;
  return merged;
}

let fruitGeometry: THREE.BufferGeometry | null = null;
/** Abstract seed-pod: a softly elongated sphere with a small stem. */
export function getFruitGeometry(): THREE.BufferGeometry {
  if (fruitGeometry) return fruitGeometry;
  const body = new THREE.SphereGeometry(1, 20, 14);
  const pos = body.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const s = 1 - 0.18 * Math.max(0, y);
    pos.setX(i, pos.getX(i) * s * (1 - 0.06 * Math.abs(pos.getZ(i))));
    pos.setZ(i, pos.getZ(i) * s);
    pos.setY(i, y * 1.28);
  }
  pos.needsUpdate = true;
  body.computeVertexNormals();
  const stem = new THREE.CylinderGeometry(0.06, 0.09, 0.5, 6);
  stem.translate(0, 1.35, 0);
  const merged = mergeGeometries([body, stem], false) ?? body;
  fruitGeometry = merged;
  return merged;
}
