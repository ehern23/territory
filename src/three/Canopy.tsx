"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { seededRng } from "@/lib/random";
import type { TreeSkeleton } from "./treeGen";
import { OLD_GROWTH } from "./biome";

/** Small cupped blades arranged in three dimensions, shared by every spray instance. */
function sprayGeometry() {
  const rng=seededRng("old-growth-volume");
  const positions:number[]=[],colors:number[]=[],indices:number[]=[];
  for(let leaf=0;leaf<10;leaf++) {
    const level=leaf/10,angle=leaf*2.4;
    const center=new THREE.Vector3(Math.cos(angle)*.4,level*2.4,Math.sin(angle)*.4);
    const direction=new THREE.Vector3(Math.cos(angle),.18+level*.3,Math.sin(angle)).normalize();
    const side=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,1,0)).normalize();
    const length=rng.range(.85,1.5)*(1-level*.3),width=rng.range(.22,.36);
    const start=positions.length/3;
    for(let j=0;j<=3;j++) {
      const t=j/3,w=Math.sin(t*Math.PI)*width;
      for(const k of [-1,0,1]) {
        const p=center.clone().addScaledVector(direction,t*length).addScaledVector(side,w*k);
        p.y+=Math.sin(t*Math.PI)*.16-Math.abs(k)*w*.35;
        positions.push(p.x,p.y,p.z);
        const shade=.80+level*.16+(k===0?.06:0);
        colors.push(shade*.93,shade,shade*.85);
      }
    }
    for(let j=0;j<3;j++)for(let k=0;k<2;k++) {
      const v=start+j*3+k;indices.push(v,v+3,v+1,v+3,v+4,v+1);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

/** Botanical mass belongs to existing organizational limbs. Dormancy still strips that limb.
 * Focus opens the foliage around the selected team/person, retaining the crown elsewhere.
 * Breeze runs in the vertex shader; instance matrices update only on semantic state changes.
 */
export function DecorativeCanopy({skeleton,active}:{skeleton:TreeSkeleton;active:boolean}) {
  const units=useTerritoryStore(s=>s.businessUnitsById);
  const reactivations=useTerritoryStore(s=>s.reactivations);
  const reduced=useTerritoryStore(s=>s.reducedMotion);
  const touch=useTerritoryStore(s=>s.isTouch);
  const focus=useTerritoryStore(s=>s.focusBusinessUnitId);
  const team=useTerritoryStore(s=>s.focusTeamId);
  const selected=useTerritoryStore(s=>s.selectedProspectId);
  const mesh=useRef<THREE.InstancedMesh>(null);
  const uniforms=useMemo(()=>({uTime:{value:0}}),[]);
  const matrix=useRef(new THREE.Matrix4());
  const scale=useRef(new THREE.Vector3());
  const color=useRef(new THREE.Color());

  const geometry=useMemo(sprayGeometry,[]);
  const material=useMemo(()=>{
    const m=new THREE.MeshStandardMaterial({vertexColors:true,color:OLD_GROWTH.canopy,side:THREE.DoubleSide,
      roughness:0.86,envMapIntensity:0.3});
    m.onBeforeCompile=shader=>{
      shader.uniforms.uTime=uniforms.uTime;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float phase=instanceMatrix[3].x*0.13+instanceMatrix[3].z*0.19;
        transformed.x+=sin(uTime*0.65+phase)*max(position.y,0.0)*0.022;
        transformed.z+=sin(uTime*0.48+phase)*max(position.y,0.0)*0.018;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.04;');
    };
    m.customProgramCacheKey=()=>"old-growth-foliage-1";
    return m;
  },[uniforms]);
  const anchors=useMemo(()=>{
    const list:{p:THREE.Vector3;q:THREE.Quaternion;s:number;bu:string;team?:string}[]=[];
    // Follow actual fine branchlets: coherent shelves rather than random floating blobs.
    for(const twig of skeleton.twigs) {
      if(!twig.businessUnitId || twig.id.endsWith('.twig'))continue;
      const rng=seededRng(skeleton.seed,twig.id,'sprays');
      const count=touch?4:7;
      for(let i=0;i<count;i++) {
        const t=0.3+i/count*0.7;
        const p=twig.curve.getPointAt(t);
        const tangent=twig.curve.getTangentAt(t);
        const yaw=Math.atan2(tangent.x,tangent.z)+rng.range(-1,1);
        const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-1.9,-0.95),yaw,rng.range(-0.6,0.6),'YXZ'));
        list.push({p,q,s:rng.range(1.0,1.65)*(touch?1.15:1),bu:twig.businessUnitId,team:twig.teamId});
      }
    }
    for (const branch of skeleton.branches) {
      if (!branch.businessUnitId) continue;
      const rng=seededRng(skeleton.seed,branch.id,"crown-shelves");
      for(let i=0;i<(touch?35:70);i++) {
        const t=rng.range(.48,1);
        const p=branch.curve.getPointAt(t);
        const a=rng.range(0,Math.PI*2),r=rng.range(.5,4.4)*(1-t*.45);
        p.add(new THREE.Vector3(Math.cos(a)*r,rng.range(-.6,2),Math.sin(a)*r));
        const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-1.9,-.8),a,rng.range(-.6,.6),'YXZ'));
        list.push({p,q,s:rng.range(1.15,1.8),bu:branch.businessUnitId,team:branch.teamId});
      }
    }
    // The terminal leader carries the highest existing unit's canopy, never a fabricated organization.
    const upper=skeleton.branches.filter(b=>b.kind==='bu').sort((a,b)=>b.curve.points[0].y-a.curve.points[0].y)[0];
    if(upper?.businessUnitId) {
      const rng=seededRng(skeleton.seed,"leader");
      for(let i=0;i<(touch?65:130);i++) {
        const t=rng.range(.70,1.03),a=rng.range(0,Math.PI*2);
        const p=skeleton.trunk.curve.getPointAt(Math.min(t,1));
        const r=rng.range(.5,1)*(1.06-t)*skeleton.height*.45;
        p.add(new THREE.Vector3(Math.cos(a)*r,rng.range(0,3),Math.sin(a)*r));
        list.push({p,q:new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.4,a,rng.range(-.4,.4),'YXZ')),s:rng.range(1.1,1.7),bu:upper.businessUnitId});
      }
    }
    return list;
  },[skeleton,touch]);
  const dirty=useRef(true);
  const reactivationMap=useMemo(()=>new Map(reactivations.map(r=>[r.businessUnitId,r.startedAt])),[reactivations]);
  useEffect(()=>{dirty.current=true;},[anchors,units,focus,team,selected,active,reduced,reactivations]);
  useFrame((_,dt)=>{
    if(reduced)uniforms.uTime.value=0;else uniforms.uTime.value+=dt;
    const inst=mesh.current;if(!inst)return;
    const now=performance.now();
    const hasLiveReactivation=reactivations.some(r=>now-r.startedAt<2200);
    if(!dirty.current && !hasLiveReactivation)return;
    anchors.forEach((a,i)=>{
      const bu=units[a.bu];
      let presence=bu?.status==='dormant'?0:1;
      const startedAt=reactivationMap.get(a.bu);
      if(startedAt!==undefined && !reduced)presence=THREE.MathUtils.clamp((now-startedAt)/2200,0,1);
      // Inspection clears a local window. No decorative foliage can capture input.
      if(active && focus===a.bu)presence*=team ? (a.team===team?0.22:0.8) : 0.62;
      if(active && selected && (!focus || focus===a.bu))presence*=0.45;
      scale.current.setScalar(a.s*presence);
      matrix.current.compose(a.p,a.q,scale.current);inst.setMatrixAt(i,matrix.current);
      const shade=0.64+((i*13)%29)/80;
      inst.setColorAt(i,color.current.setRGB(shade*.93,shade,shade*.90));
    });
    inst.instanceMatrix.needsUpdate=true;if(inst.instanceColor)inst.instanceColor.needsUpdate=true;dirty.current=false;
  });
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  return <instancedMesh ref={mesh} args={[geometry,material,anchors.length]} frustumCulled={false}
    raycast={()=>undefined} receiveShadow />;
}
