"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CLEARING, SUN_DIR } from "../layout";

/**
 * Distant ridgelines. Three layered bands of hills behind the forest, shaded
 * by aerial perspective (nearer = darker green-blue, farther = paler) so the
 * horizon reads as landscape instead of fog.
 */

const LAYERS = [
  { radius: 760, height: 70, color: "#5f7466", seed: 1.3 },
  { radius: 980, height: 120, color: "#7f939a", seed: 2.7 },
  { radius: 1250, height: 190, color: "#a3b5be", seed: 4.1 },
];

function ridge(a: number, seed: number) {
  return (
    0.55 +
    0.25 * Math.sin(a * 3 + seed) +
    0.12 * Math.sin(a * 7.3 + seed * 2.1) +
    0.08 * Math.sin(a * 15.7 + seed * 3.7)
  );
}

function Layer({ radius, height, color, seed }: (typeof LAYERS)[number]) {
  const geometry = useMemo(() => {
    const seg = 220;
    const pos: number[] = [];
    const shade: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const h = Math.max(0.1, ridge(a, seed)) * height;
      const x = CLEARING.x + Math.cos(a) * radius;
      const z = CLEARING.z + Math.sin(a) * radius;
      // Hills facing the sun are lit a touch warmer.
      const facing = Math.max(0, -(Math.cos(a) * SUN_DIR.x + Math.sin(a) * SUN_DIR.z));
      pos.push(x, -20, z, x, h, z);
      shade.push(0.82, 0.92 + facing * 0.12);
    }
    for (let i = 0; i < seg; i++) {
      const b = i * 2;
      idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aShade", new THREE.Float32BufferAttribute(shade, 1));
    g.setIndex(idx);
    return g;
  }, [radius, height, seed]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) }, uHaze: { value: new THREE.Color("#c3cdd2") } },
        vertexShader: /* glsl */ `
          attribute float aShade;
          varying float vShade;
          varying float vY;
          void main() {
            vShade = aShade;
            vY = position.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform vec3 uHaze;
          varying float vShade;
          varying float vY;
          void main() {
            // Haze pools in the valleys.
            float haze = 1.0 - smoothstep(-10.0, 80.0, vY);
            vec3 c = mix(uColor * vShade, uHaze, haze * 0.65);
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        side: THREE.DoubleSide,
        fog: false,
      }),
    [color],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} renderOrder={-50} raycast={() => undefined} />;
}

export function Horizon() {
  return (
    <group>
      {LAYERS.map((l) => (
        <Layer key={l.radius} {...l} />
      ))}
    </group>
  );
}
