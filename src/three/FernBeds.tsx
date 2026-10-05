"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { seededRng } from "@/lib/random";
import { accountClearings, creekDistance, terrainHeight } from "./layout";

type FernShader = { uniforms: Record<string, { value: number }> };

const PLANT_COUNT_DESKTOP = 900;
const PLANT_COUNT_TOUCH = 420;

function fernGeometry() {
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const rng=seededRng("swordfern-fronds");
  const up=new THREE.Vector3(0,1,0);
  function blade(start:THREE.Vector3,end:THREE.Vector3,width:number,c:THREE.Color) {
    const v=positions.length/3;
    const side=new THREE.Vector3().crossVectors(end.clone().sub(start),up).normalize().multiplyScalar(width);
    const middle=start.clone().lerp(end,.44);
    const points=[start,middle.clone().add(side),end,middle.clone().sub(side),middle.clone().addScaledVector(up,.045)];
    points.forEach(p=>{positions.push(p.x,p.y,p.z);colors.push(c.r,c.g,c.b);});
    indices.push(v,v+1,v+4,v+1,v+2,v+4,v+2,v+3,v+4,v+3,v,v+4);
  }
  for(let f=0;f<8;f++) {
    const a=f*2.399,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
    const side=new THREE.Vector3(-dir.z,0,dir.x),length=rng.range(1.8,2.6),height=rng.range(1.1,1.7);
    let previous=new THREE.Vector3();
    for(let i=1;i<=13;i++) {
      const t=i/14,p=dir.clone().multiplyScalar(t*length);p.y=Math.sin(t*Math.PI*.83)*height;
      const color=new THREE.Color().setHSL(.25+rng.range(0,.055),.40,.18+t*.055);
      blade(previous,p,.018,color); previous=p;
      for(const sign of [-1,1]) {
        const reach=Math.sin(t*Math.PI)**.65*.58;
        const end=p.clone().addScaledVector(side,sign*reach).addScaledVector(dir,.10+t*.10);
        end.y-=.04;
        blade(p,end,.08*(1-t*.65),color);
      }
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}

function plantMatrices(count: number) {
  const clearings = accountClearings();
  const patches = [
    [-7, 28], [28, 4], [-30, -1], [67, -4], [96, -54],
    [-75, -49], [-15, -107], [43, -121], [-34, -159],
    [40, 126], [72, 112], [96, 142],
    [-128, 90], [132, 76], [-116, -202], [148, -176],
    [-168, -138], [168, -88], [0, -218], [0, 112],
  ];
  const rng = seededRng("territory-fern-beds");
  const out: THREE.Matrix4[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 16) {
    attempts++;
    const patch = patches[rng.int(0, patches.length - 1)];
    const x = patch[0] + rng.range(-16, 16);
    const z = patch[1] + rng.range(-16, 16);
    if (creekDistance(x, z) < 6) continue;
    if (clearings.some(({ x: cx, z: cz }) => Math.hypot(x - cx, z - cz) < 9)) continue;
    const h = rng.range(0.8, 2.4);
    const spread = rng.range(0.72, 1.9);
    const yaw = rng.range(0, Math.PI * 2);
    const position = new THREE.Vector3(x, terrainHeight(x, z) + 0.02, z);
    const scale = new THREE.Vector3(spread, h, spread);
    out.push(new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), scale));
  }
  return out;
}

export function FernBeds() {
  const view = useTerritoryStore((s) => s.view);
  const isTouch = useTerritoryStore((s) => s.isTouch);
  const reducedMotion = useTerritoryStore((s) => s.reducedMotion);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const geometry = useMemo(fernGeometry, []);
  const matrices = useMemo(() => plantMatrices(isTouch ? PLANT_COUNT_TOUCH : PLANT_COUNT_DESKTOP), [isTouch]);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: "#93a676",
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.2,
      side: THREE.DoubleSide,
      transparent: false,
      depthWrite: true,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uFernTime = { value: 0 };
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        "#include <common>\n        uniform float uFernTime;",
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n        transformed.x += sin(uFernTime * 0.7 + position.y * 2.3) * position.y * 0.045;\n        transformed.z += cos(uFernTime * 0.62 + position.x * 1.8) * position.y * 0.035;",
      );
      (m.userData as { fernShader?: FernShader }).fernShader = shader as FernShader;
    };
    return m;
  }, []);
  useFrame((state) => {
    const shader = (material.userData as { fernShader?: FernShader }).fernShader;
    if (shader) shader.uniforms.uFernTime.value = reducedMotion ? 0 : state.clock.elapsedTime;
  });
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.frustumCulled = true;
    mesh.receiveShadow = true;
    mesh.raycast = () => undefined;
  }, [matrices]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  
  return <instancedMesh visible={view !== "roots"} ref={meshRef} args={[geometry, material, matrices.length]} matrixAutoUpdate={false} />;
}
