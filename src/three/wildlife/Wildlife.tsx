"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { createRng, seededRng, type Rng } from "@/lib/random";
import { GLADE_RADIUS, accountIds, accountPosition, groundCover, terrainHeight } from "../layout";
import { getAccountTree } from "../flora/accountTrees";
import { floraGlobals } from "../flora/floraMaterials";
import { cone, creatureMaterial, ellipsoid, limb, merge } from "./creatureParts";

/**
 * Life in the forest: rabbits and squirrels in the glades, a wolf that now
 * and then trots across the view, birds perched on a giant's limb, and flocks
 * wheeling over the canopy. Everything is cheap: a few dozen small meshes
 * animated on the CPU.
 */

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------------ */
/* Models                                                                    */
/* ------------------------------------------------------------------------ */

function wolfModel() {
  const fur = "#6b655c";
  const belly = "#a8a090";
  const dark = "#3a3632";
  const body = merge([
    ellipsoid([0.42, 0.44, 1.0], [0, 1.18, 0], fur, { under: belly }),
    ellipsoid([0.46, 0.52, 0.5], [0, 1.24, 0.72], fur, { under: belly }),
    ellipsoid([0.4, 0.44, 0.46], [0, 1.18, -0.72], fur, { under: belly }),
    // Ruff around the neck.
    ellipsoid([0.42, 0.46, 0.34], [0, 1.42, 1.02], "#7a7266", { rot: [0.5, 0, 0] }),
  ]);
  const head = merge([
    ellipsoid([0.28, 0.27, 0.34], [0, 0, 0], fur, { under: belly }),
    ellipsoid([0.13, 0.12, 0.3], [0, -0.08, 0.38], "#7d7569", { under: belly }),
    ellipsoid([0.06, 0.05, 0.05], [0, -0.02, 0.67], "#1d1b19"),
    cone(0.09, 0.24, [0.15, 0.27, -0.05], dark, [-0.25, 0, -0.3]),
    cone(0.09, 0.24, [-0.15, 0.27, -0.05], dark, [-0.25, 0, 0.3]),
  ]);
  const tail = merge([
    limb(V(0, 0, 0), V(0, -0.35, -0.5), 0.12, 0.17, fur),
    ellipsoid([0.17, 0.17, 0.38], [0, -0.48, -0.72], fur, { rot: [0.7, 0, 0] }),
    ellipsoid([0.1, 0.1, 0.16], [0, -0.66, -0.98], dark, { rot: [0.7, 0, 0] }),
  ]);
  const upper = merge([limb(V(0, 0, 0), V(0, -0.55, 0), 0.13, 0.09, fur)]);
  const lower = merge([limb(V(0, 0, 0), V(0, -0.58, 0), 0.08, 0.06, belly), ellipsoid([0.08, 0.05, 0.12], [0, -0.6, 0.04], dark)]);
  return { body, head, tail, upper, lower };
}

function rabbitModel() {
  const fur = "#8a7a64";
  const light = "#cbbfa8";
  const body = merge([
    ellipsoid([0.3, 0.28, 0.4], [0, 0.32, 0], fur, { under: light }),
    ellipsoid([0.31, 0.3, 0.3], [0, 0.3, -0.2], fur, { under: light }),
    ellipsoid([0.09, 0.09, 0.09], [0, 0.4, -0.46], "#efeae0"),
  ]);
  const head = merge([
    ellipsoid([0.18, 0.18, 0.22], [0, 0, 0], fur, { under: light }),
    ellipsoid([0.035, 0.035, 0.035], [0.12, 0.05, 0.12], "#14110e"),
    ellipsoid([0.035, 0.035, 0.035], [-0.12, 0.05, 0.12], "#14110e"),
    ellipsoid([0.055, 0.24, 0.025], [0.07, 0.25, -0.06], fur, { rot: [-0.35, 0, -0.15] }),
    ellipsoid([0.055, 0.24, 0.025], [-0.07, 0.25, -0.06], fur, { rot: [-0.35, 0, 0.15] }),
  ]);
  return { body, head };
}

function squirrelModel() {
  const fur = "#8a4a24";
  const light = "#d8c0a0";
  const body = merge([
    ellipsoid([0.12, 0.13, 0.26], [0, 0.2, 0], fur, { under: light }),
    ellipsoid([0.1, 0.1, 0.12], [0, 0.3, 0.24], fur, { under: light }),
    cone(0.035, 0.08, [0.05, 0.42, 0.22], fur),
    cone(0.035, 0.08, [-0.05, 0.42, 0.22], fur),
    ellipsoid([0.02, 0.02, 0.02], [0.06, 0.33, 0.33], "#100c0a"),
    ellipsoid([0.02, 0.02, 0.02], [-0.06, 0.33, 0.33], "#100c0a"),
  ]);
  const tailParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const a = t * 2.4;
    tailParts.push(ellipsoid([0.08 + t * 0.07, 0.08 + t * 0.07, 0.1], [0, 0.18 + Math.sin(a) * 0.32, -0.22 - Math.sin(a * 0.6) * 0.22 + t * 0.05], "#9a5a30"));
  }
  return { body, tail: merge(tailParts) };
}

function songbirdModel() {
  const back = "#5a4636";
  const breast = "#b8643a";
  return merge([
    ellipsoid([0.12, 0.12, 0.2], [0, 0.14, 0], back, { under: breast }),
    ellipsoid([0.09, 0.09, 0.09], [0, 0.26, 0.13], back),
    cone(0.025, 0.08, [0, 0.25, 0.25], "#d8a040", [Math.PI / 2, 0, 0], 4),
    ellipsoid([0.05, 0.015, 0.14], [0, 0.16, -0.22], back, { rot: [0.35, 0, 0] }),
  ]);
}

/** Flying bird: body plus two wings whose tips carry aWing for the flap. */
function flyerGeometry() {
  const body = ellipsoid([0.16, 0.14, 0.42], [0, 0, 0], "#2e2a26", { detail: [8, 6] });
  const wing = (s: number) => {
    const g = new THREE.BufferGeometry();
    const pts = [0.1 * s, 0, 0.18, 0.1 * s, 0, -0.16, 1.15 * s, 0, -0.05, 0.1 * s, 0, 0.18, 1.15 * s, 0, -0.05, 1.3 * s, 0, 0.12];
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const c = new THREE.Color("#3a3530");
    g.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: 6 }, () => [c.r, c.g, c.b]).flat(), 3));
    g.computeVertexNormals();
    return g;
  };
  const g = merge([body, wing(1), wing(-1)]);
  const p = g.attributes.position as THREE.BufferAttribute;
  const w = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) w[i] = Math.max(0, Math.abs(p.getX(i)) - 0.12);
  g.setAttribute("aWing", new THREE.BufferAttribute(w, 1));
  return g;
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

function groundAt(x: number, z: number) {
  return terrainHeight(x, z);
}

function yawTo(from: THREE.Vector3, to: THREE.Vector3) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

function lerpAngle(a: number, b: number, k: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

/* ------------------------------------------------------------------------ */
/* Rabbits                                                                   */
/* ------------------------------------------------------------------------ */

function Rabbit({ home, trunk, seed }: { home: THREE.Vector3; trunk: number; seed: number }) {
  const model = useMemo(rabbitModel, []);
  const mat = creatureMaterial();
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const st = useRef({
    rng: createRng(seed),
    pos: home.clone().add(V(trunk + 10, 0, 6)),
    yaw: 0,
    target: new THREE.Vector3(),
    hops: 0,
    hopT: 0,
    wait: 1 + (seed % 5),
    from: new THREE.Vector3(),
  });
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const r = root.current;
    if (!r) return;
    let lift = 0;
    let stretch = 1;
    if (s.hops > 0) {
      s.hopT += dt / 0.34;
      const k = Math.min(1, s.hopT);
      const dir = s.target.clone().sub(s.from);
      const step = Math.min(1.4, dir.length());
      const next = s.from.clone().addScaledVector(dir.normalize(), step * k);
      s.pos.set(next.x, 0, next.z);
      lift = Math.sin(k * Math.PI) * 0.55;
      stretch = 1 + Math.sin(k * Math.PI) * 0.18;
      s.yaw = lerpAngle(s.yaw, yawTo(s.from, s.target), 0.4);
      if (k >= 1) {
        s.hops -= 1;
        s.hopT = 0;
        s.from.copy(s.pos);
        if (s.from.distanceTo(s.target) < 0.8) s.hops = 0;
      }
    } else {
      s.wait -= dt;
      if (s.wait <= 0) {
        // Pick a new spot in the glade, away from the trunk.
        const a = s.rng.range(0, Math.PI * 2);
        const d = s.rng.range(trunk + 5, GLADE_RADIUS * 0.8);
        s.target.set(home.x + Math.cos(a) * d, 0, home.z + Math.sin(a) * d);
        s.from.copy(s.pos);
        s.hops = s.rng.int(3, 7);
        s.hopT = 0;
        s.wait = s.rng.range(2, 6);
      }
    }
    const y = groundAt(s.pos.x, s.pos.z);
    r.position.set(s.pos.x, y + lift, s.pos.z);
    r.rotation.y = s.yaw;
    if (body.current) body.current.scale.set(1, 1 / stretch, stretch);
    // Nibble and look around while resting.
    if (head.current) {
      const t = floraGlobals.uTime.value + seed;
      head.current.rotation.x = s.hops > 0 ? -0.2 : 0.25 + Math.max(0, Math.sin(t * 2.3)) * 0.35;
      head.current.rotation.y = s.hops > 0 ? 0 : Math.sin(t * 0.7) * 0.5;
    }
  });
  return (
    <group ref={root} scale={1.25}>
      <group ref={body}>
        <mesh geometry={model.body} material={mat} castShadow />
        <mesh ref={head} geometry={model.head} material={mat} position={[0, 0.55, 0.32]} castShadow />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------------ */
/* Squirrels                                                                 */
/* ------------------------------------------------------------------------ */

function Squirrel({ home, trunk, seed }: { home: THREE.Vector3; trunk: number; seed: number }) {
  const model = useMemo(squirrelModel, []);
  const mat = creatureMaterial();
  const root = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  const st = useRef({
    rng: createRng(seed * 31),
    mode: "rest" as "rest" | "dash" | "toTrunk" | "climb" | "down",
    pos: home.clone().add(V(trunk + 14, 0, -8)),
    target: new THREE.Vector3(),
    yaw: 0,
    t: 0,
    height: 0,
    climbTo: 12,
    angle: 0,
    wait: 1.5,
  });
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const r = root.current;
    if (!r) return;
    const speed = 7;
    if (s.mode === "rest") {
      s.wait -= dt;
      if (s.wait <= 0) {
        if (s.rng.chance(0.35)) {
          s.mode = "toTrunk";
          s.angle = s.rng.range(0, Math.PI * 2);
          s.target.set(home.x + Math.cos(s.angle) * (trunk + 0.4), 0, home.z + Math.sin(s.angle) * (trunk + 0.4));
          s.climbTo = s.rng.range(8, 22);
        } else {
          s.mode = "dash";
          const a = s.rng.range(0, Math.PI * 2);
          const d = s.rng.range(trunk + 4, GLADE_RADIUS * 0.85);
          s.target.set(home.x + Math.cos(a) * d, 0, home.z + Math.sin(a) * d);
        }
      }
    } else if (s.mode === "dash" || s.mode === "toTrunk") {
      const dir = s.target.clone().sub(s.pos);
      const dist = dir.length();
      // Squirrels run in bursts.
      const burst = 0.5 + 0.5 * Math.max(0, Math.sin(floraGlobals.uTime.value * 9 + seed));
      const step = Math.min(dist, speed * burst * dt);
      if (dist > 0.05) {
        s.pos.addScaledVector(dir.normalize(), step);
        s.yaw = lerpAngle(s.yaw, Math.atan2(dir.x, dir.z), 0.3);
      }
      if (dist < 0.1) {
        if (s.mode === "toTrunk") s.mode = "climb";
        else {
          s.mode = "rest";
          s.wait = s.rng.range(1, 4);
        }
      }
    } else if (s.mode === "climb") {
      s.height += dt * 4.5;
      if (s.height >= s.climbTo) {
        s.mode = "down";
        s.t = s.rng.range(1.5, 3.5);
      }
    } else if (s.mode === "down") {
      if (s.t > 0) s.t -= dt;
      else {
        s.height -= dt * 5.5;
        if (s.height <= 0) {
          s.height = 0;
          s.mode = "rest";
          s.wait = s.rng.range(0.5, 2);
        }
      }
    }
    const y = groundAt(s.pos.x, s.pos.z);
    const onTrunk = s.mode === "climb" || s.mode === "down";
    r.position.set(s.pos.x, y + s.height, s.pos.z);
    if (onTrunk) {
      // Face the trunk, body vertical, head up or down.
      const out = Math.atan2(s.pos.x - home.x, s.pos.z - home.z);
      r.rotation.set(0, out + Math.PI, 0);
      r.rotateX(s.mode === "climb" ? -Math.PI / 2 : s.t > 0 ? -Math.PI / 2 : Math.PI / 2);
    } else {
      r.rotation.set(0, s.yaw, 0);
    }
    if (tail.current) tail.current.rotation.x = Math.sin(floraGlobals.uTime.value * 6 + seed) * 0.12;
  });
  return (
    <group ref={root} scale={1.6}>
      <mesh geometry={model.body} material={mat} castShadow />
      <mesh ref={tail} geometry={model.tail} material={mat} castShadow />
    </group>
  );
}

/* ------------------------------------------------------------------------ */
/* Wolf                                                                      */
/* ------------------------------------------------------------------------ */

function Wolf() {
  const model = useMemo(wolfModel, []);
  const mat = creatureMaterial();
  const controls = useThree((s) => s.controls) as unknown as { getTarget?: (v: THREE.Vector3) => THREE.Vector3 } | null;
  const mode = useTerritoryStore((s) => s.mode);
  const introDone = useTerritoryStore((s) => s.introDone);
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const tail = useRef<THREE.Mesh>(null);
  const legs = useRef<{ upper: THREE.Group | null; lower: THREE.Group | null }[]>([0, 1, 2, 3].map(() => ({ upper: null, lower: null })));
  const st = useRef({
    active: false,
    next: 14,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    t: 0,
    duration: 20,
    rng: createRng(4242),
  });
  // A new scene invites a visit soon after.
  useEffect(() => {
    st.current.next = Math.min(st.current.next, mode === "account" ? 9 : 18);
  }, [mode]);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const r = root.current;
    if (!r) return;
    if (!s.active) {
      r.visible = false;
      if (!introDone) return;
      s.next -= dt;
      if (s.next > 0) return;
      // Cross the view: a path perpendicular to the line of sight, in front of what we look at.
      const target = new THREE.Vector3();
      if (controls?.getTarget) controls.getTarget(target);
      const toCam = camera.position.clone().sub(target).setY(0);
      const dist = toCam.length();
      toCam.normalize();
      const side = new THREE.Vector3(-toCam.z, 0, toCam.x);
      const near = Math.min(dist * 0.35, 70);
      const mid = target.clone().addScaledVector(toCam, near);
      const span = Math.max(50, Math.min(140, dist * 0.45));
      const dirSign = s.rng.chance(0.5) ? 1 : -1;
      s.from.copy(mid).addScaledVector(side, -span * dirSign);
      s.to.copy(mid).addScaledVector(side, span * dirSign);
      const c = groundCover(mid.x, mid.z);
      if (c.water > 0.2) {
        s.next = 6;
        return;
      }
      s.t = 0;
      s.duration = (span * 2) / 5.5;
      s.active = true;
    }
    s.t += dt / s.duration;
    if (s.t >= 1) {
      s.active = false;
      s.next = s.rng.range(45, 80);
      r.visible = false;
      return;
    }
    r.visible = true;
    const p = s.from.clone().lerp(s.to, s.t);
    // A gentle meander.
    const side = new THREE.Vector3(-(s.to.z - s.from.z), 0, s.to.x - s.from.x).normalize();
    p.addScaledVector(side, Math.sin(s.t * Math.PI * 2) * 4);
    const y = groundAt(p.x, p.z);
    r.position.set(p.x, y, p.z);
    r.rotation.y = yawTo(s.from, s.to) + Math.cos(s.t * Math.PI * 2) * 0.15;
    // Trot: diagonal pairs move together.
    const phase = floraGlobals.uTime.value * 7.5;
    const order = [0, Math.PI, Math.PI, 0];
    legs.current.forEach((l, i) => {
      const a = Math.sin(phase + order[i]);
      if (l.upper) l.upper.rotation.x = a * 0.55;
      if (l.lower) l.lower.rotation.x = Math.max(0, -Math.cos(phase + order[i])) * 0.9 * (i < 2 ? -1 : 1);
    });
    r.position.y += Math.abs(Math.sin(phase)) * 0.08;
    if (head.current) head.current.rotation.set(0.1 + Math.sin(phase * 0.5) * 0.04, Math.sin(s.t * 9) * 0.15, 0);
    if (tail.current) tail.current.rotation.y = Math.sin(phase * 0.5) * 0.2;
  });

  const legPos: [number, number, number][] = [
    [0.22, 1.02, 0.72],
    [-0.22, 1.02, 0.72],
    [0.22, 1.02, -0.72],
    [-0.22, 1.02, -0.72],
  ];
  return (
    <group ref={root} scale={1.45} visible={false}>
      <mesh geometry={model.body} material={mat} castShadow />
      <mesh ref={head} geometry={model.head} material={mat} position={[0, 1.62, 1.28]} castShadow />
      <mesh ref={tail} geometry={model.tail} material={mat} position={[0, 1.3, -1.08]} castShadow />
      {legPos.map((p, i) => (
        <group
          key={i}
          position={p}
          ref={(g) => {
            legs.current[i].upper = g;
          }}
        >
          <mesh geometry={model.upper} material={mat} castShadow />
          <group
            position={[0, -0.55, 0]}
            ref={(g) => {
              legs.current[i].lower = g;
            }}
          >
            <mesh geometry={model.lower} material={mat} castShadow />
          </group>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------------ */
/* Perched songbirds                                                         */
/* ------------------------------------------------------------------------ */

function PerchedBirds({ accountId, count }: { accountId: string; count: number }) {
  const geometry = useMemo(songbirdModel, []);
  const mat = creatureMaterial();
  const model = getAccountTree(accountId);
  const base = useMemo(() => accountPosition(accountId), [accountId]);
  const birds = useRef<(THREE.Group | null)[]>([]);
  const perch = model?.shape.perches[0];
  const layout = useMemo(() => {
    const rng = seededRng("perch", accountId);
    return Array.from({ length: count }, (_, i) => ({ offset: (i - (count - 1) / 2) * 0.9 + rng.gauss() * 0.15, phase: rng.range(0, 10) }));
  }, [accountId, count]);
  useFrame(() => {
    const t = floraGlobals.uTime.value;
    birds.current.forEach((b, i) => {
      if (!b) return;
      const l = layout[i];
      // Short hops along the limb and quick head turns.
      const hop = Math.max(0, Math.sin(t * 0.9 + l.phase) - 0.92) * 6;
      b.position.y = hop * 0.3;
      b.rotation.y = Math.sin(t * 0.6 + l.phase) > 0.3 ? 0.6 : -0.4;
      const head = b.children[0];
      if (head) head.rotation.z = Math.sin(t * 3.1 + l.phase) * 0.12;
    });
  });
  if (!perch) return null;
  const across = new THREE.Vector3(perch.along.z, 0, -perch.along.x);
  return (
    <group position={base.clone().add(perch.position)}>
      {layout.map((l, i) => (
        <group key={i} position={perch.along.clone().multiplyScalar(l.offset).toArray()}>
          <group
            ref={(g) => {
              birds.current[i] = g;
            }}
            rotation={[0, Math.atan2(across.x, across.z), 0]}
            scale={2.2}
          >
            <mesh geometry={geometry} material={mat} castShadow />
          </group>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------------ */
/* Flocks                                                                    */
/* ------------------------------------------------------------------------ */

function Flock({ seed, center, radius, height, count }: { seed: number; center: THREE.Vector3; radius: number; height: number; count: number }) {
  const geometry = useMemo(flyerGeometry, []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    const uniforms = { uTime: floraGlobals.uTime };
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nattribute float aWing;\nattribute float aPhase;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float cycle = uTime * 9.0 + aPhase * 6.28;
           // Flap in bursts, then glide.
           float burst = smoothstep(-0.2, 0.4, sin(uTime * 0.7 + aPhase * 3.0));
           transformed.y += sin(cycle) * aWing * 0.75 * burst + aWing * 0.12 * (1.0 - burst);`,
        );
    };
    m.customProgramCacheKey = () => "territory-flyer-v1";
    return m;
  }, []);
  const mesh = useMemo(() => {
    const g = geometry.clone();
    const phase = new Float32Array(count);
    const rng = createRng(seed);
    for (let i = 0; i < count; i++) phase[i] = rng.next();
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    const m = new THREE.InstancedMesh(g, material, count);
    m.frustumCulled = false;
    m.raycast = () => undefined;
    return m;
  }, [geometry, material, count, seed]);
  const offsets = useMemo(() => {
    const rng = createRng(seed * 7);
    return Array.from({ length: count }, () => V(rng.gauss() * 14, rng.gauss() * 5, rng.gauss() * 14));
  }, [count, seed]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(2.2, 2.2, 2.2), p: new THREE.Vector3() }), []);
  useFrame(() => {
    const t = floraGlobals.uTime.value * 0.06 + seed;
    for (let i = 0; i < count; i++) {
      const o = offsets[i];
      const tt = t + i * 0.002;
      const x = center.x + Math.cos(tt) * radius + Math.cos(tt * 2.3) * radius * 0.25;
      const z = center.z + Math.sin(tt) * radius * 0.7 + Math.sin(tt * 1.7) * radius * 0.2;
      const dx = -Math.sin(tt) * radius - Math.sin(tt * 2.3) * radius * 0.575;
      const dz = Math.cos(tt) * radius * 0.7 + Math.cos(tt * 1.7) * radius * 0.34;
      const y = height + Math.sin(tt * 3 + i) * 6;
      const wob = floraGlobals.uTime.value * 0.8 + i;
      tmp.p.set(x + o.x + Math.sin(wob) * 2, y + o.y, z + o.z + Math.cos(wob) * 2);
      tmp.e.set(0, Math.atan2(dx, dz), -Math.sin(tt * 2) * 0.35);
      tmp.q.setFromEuler(tmp.e);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  useEffect(() => () => mesh.dispose(), [mesh]);
  return <primitive object={mesh} />;
}

/* ------------------------------------------------------------------------ */

export function Wildlife() {
  const isTouch = useTerritoryStore((s) => s.isTouch);
  // Glades follow the active territory's accounts.
  const accounts = useTerritoryStore((s) => s.accounts);
  const glades = useMemo(
    () =>
      accountIds().map((id, i) => {
        const model = getAccountTree(id);
        return { id, home: accountPosition(id), trunk: (model?.shape.trunkRadius ?? 4) * 1.7, i };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- accountIds() reads the same accounts
    [accounts],
  );
  const flagship = accounts[0]?.id;
  const third = accounts[2]?.id;
  return (
    <group>
      {glades.map((g) => (
        <group key={g.id}>
          <Rabbit home={g.home} trunk={g.trunk} seed={g.i * 13 + 1} />
          {!isTouch && <Rabbit home={g.home} trunk={g.trunk} seed={g.i * 13 + 7} />}
          <Squirrel home={g.home} trunk={g.trunk} seed={g.i * 13 + 3} />
        </group>
      ))}
      {flagship && <PerchedBirds key={flagship} accountId={flagship} count={5} />}
      {third && <PerchedBirds key={third} accountId={third} count={3} />}
      <Wolf />
      <Flock seed={1} center={V(-80, 0, -120)} radius={260} height={190} count={isTouch ? 10 : 18} />
      <Flock seed={2} center={V(180, 0, 120)} radius={160} height={150} count={isTouch ? 7 : 12} />
    </group>
  );
}
