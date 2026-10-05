"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTerritoryStore } from "@/store/useTerritoryStore";
import { seededRng } from "@/lib/random";
import type { TreeSkeleton } from "./treeGen";
import { OLD_GROWTH, SUN_DIR } from "./biome";

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

/**
 * Sight-line clearing for the inspected tree. The camera rig writes the orbit
 * target and a radius every frame; sprays inside the cone from the camera to the
 * target (and a sphere around it) collapse in the vertex shader. Decorative
 * foliage has no raycast, so clearing never changes what can be clicked.
 */
export const canopyClearing={target:{value:new THREE.Vector3()},radius:{value:0}};

const CROWN_LIT_LINEAR=new THREE.Color().setRGB(1.16,1.18,0.8);
const RECEDE_LINEAR=new THREE.Color().setRGB(0.34,0.42,0.42);
/** The inspected tree's decorative mass sits a value step below its people, who read as the lit layer. */
const DEEP_LINEAR=new THREE.Color().setRGB(0.2,0.3,0.27);
/** Share of decorative sprays kept on the inspected tree, so people and fruit stay visible inside the crown. */
const ACTIVE_DENSITY=0.78;
/** Opportunities hang in an opening of the crown so fruit is visible before it is selected. */
const FRUIT_OPENING_SQ=4.2*4.2;

/** Botanical mass belongs to existing organizational limbs. Dormancy still strips that limb.
 * Focus opens the foliage around the selected team/person, retaining the crown elsewhere.
 * Breeze runs in the vertex shader; instance matrices update only on semantic state changes.
 */
export function DecorativeCanopy({skeleton,active,dim=0}:{skeleton:TreeSkeleton;active:boolean;dim?:number}) {
  const units=useTerritoryStore(s=>s.businessUnitsById);
  const reactivations=useTerritoryStore(s=>s.reactivations);
  const reduced=useTerritoryStore(s=>s.reducedMotion);
  const touch=useTerritoryStore(s=>s.isTouch);
  const focus=useTerritoryStore(s=>s.focusBusinessUnitId);
  const team=useTerritoryStore(s=>s.focusTeamId);
  const selected=useTerritoryStore(s=>s.selectedProspectId);
  const coverage=useTerritoryStore(s=>active && s.view==='penetration');
  const mesh=useRef<THREE.InstancedMesh>(null);
  const uniforms=useMemo(()=>({uTime:{value:0},uClearOn:{value:0}}),[]);
  uniforms.uClearOn.value=active?1:0;
  const matrix=useRef(new THREE.Matrix4());
  const scale=useRef(new THREE.Vector3());
  const color=useRef(new THREE.Color());

  const geometry=useMemo(sprayGeometry,[]);
  const material=useMemo(()=>{
    const m=new THREE.MeshStandardMaterial({vertexColors:true,color:OLD_GROWTH.canopy,side:THREE.DoubleSide,
      roughness:0.86,envMapIntensity:0.3});
    m.onBeforeCompile=shader=>{
      shader.uniforms.uTime=uniforms.uTime;
      shader.uniforms.uClearOn=uniforms.uClearOn;
      shader.uniforms.uClearTarget=canopyClearing.target;
      shader.uniforms.uClearRadius=canopyClearing.radius;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;\nuniform float uClearOn;\nuniform vec3 uClearTarget;\nuniform float uClearRadius;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        vec4 sprayWorld=modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
        float keep=smoothstep(9.0,25.0,distance(cameraPosition,sprayWorld.xyz));
        float clearR=uClearRadius*uClearOn;
        if(clearR>0.01) {
          vec3 ab=uClearTarget-cameraPosition;
          float along=clamp(dot(sprayWorld.xyz-cameraPosition,ab)/max(dot(ab,ab),1e-4),0.0,1.0);
          float r=clearR*max(along,0.75);
          keep*=smoothstep(r*0.75,r*1.2,distance(sprayWorld.xyz,cameraPosition+ab*along));
        }
        transformed*=keep;
        float phase=instanceMatrix[3].x*0.13+instanceMatrix[3].z*0.19;
        transformed.x+=sin(uTime*0.65+phase)*max(position.y,0.0)*0.022;
        transformed.z+=sin(uTime*0.48+phase)*max(position.y,0.0)*0.018;`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.04;');
    };
    m.customProgramCacheKey=()=>"old-growth-foliage-2";
    return m;
  },[uniforms]);
  const anchors=useMemo(()=>{
    const list:{p:THREE.Vector3;q:THREE.Quaternion;s:number;bu:string;team?:string;keep:number}[]=[];
    // Forest trees are seen from 150+ units: fewer, larger sprays hold the same silhouette.
    const lod=active?1:0.55;
    const grow=active?1:1.22;
    const quality=(touch?0.5:1)*lod;
    // Follow actual fine branchlets: coherent shelves rather than random floating blobs.
    for(const twig of skeleton.twigs) {
      if(!twig.businessUnitId || twig.id.endsWith('.twig'))continue;
      const rng=seededRng(skeleton.seed,twig.id,'sprays');
      const count=Math.max(2,Math.round(7*quality));
      for(let i=0;i<count;i++) {
        const t=0.3+i/count*0.7;
        const p=twig.curve.getPointAt(t);
        const tangent=twig.curve.getTangentAt(t);
        const yaw=Math.atan2(tangent.x,tangent.z)+rng.range(-1,1);
        const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-1.9,-0.95),yaw,rng.range(-0.6,0.6),'YXZ'));
        list.push({p,q,s:rng.range(1.0,1.65)*(touch?1.15:1)*grow,bu:twig.businessUnitId,team:twig.teamId,keep:rng.next()});
      }
    }
    for (const branch of skeleton.branches) {
      if (!branch.businessUnitId) continue;
      const rng=seededRng(skeleton.seed,branch.id,"crown-shelves");
      for(let i=0;i<Math.round(70*quality);i++) {
        const t=rng.range(.48,1);
        const p=branch.curve.getPointAt(t);
        const a=rng.range(0,Math.PI*2),r=rng.range(.5,4.4)*(1-t*.45);
        p.add(new THREE.Vector3(Math.cos(a)*r,rng.range(-.6,2),Math.sin(a)*r));
        const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-1.9,-.8),a,rng.range(-.6,.6),'YXZ'));
        list.push({p,q,s:rng.range(1.15,1.8)*grow,bu:branch.businessUnitId,team:branch.teamId,keep:rng.next()});
      }
    }
    // The terminal leader carries the highest existing unit's canopy, never a fabricated organization.
    const upper=skeleton.branches.filter(b=>b.kind==='bu').sort((a,b)=>b.curve.points[0].y-a.curve.points[0].y)[0];
    if(upper?.businessUnitId) {
      const rng=seededRng(skeleton.seed,"leader");
      for(let i=0;i<Math.round(130*quality);i++) {
        const t=rng.range(.70,1.03),a=rng.range(0,Math.PI*2);
        const p=skeleton.trunk.curve.getPointAt(Math.min(t,1));
        const r=rng.range(.5,1)*(1.06-t)*skeleton.height*.45;
        p.add(new THREE.Vector3(Math.cos(a)*r,rng.range(0,3),Math.sin(a)*r));
        list.push({p,q:new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.4,a,rng.range(-.4,.4),'YXZ')),s:rng.range(1.1,1.7)*grow,bu:upper.businessUnitId,keep:rng.next()});
      }
    }
    return list;
  },[skeleton,touch,active]);
  // Sun-side, upper and outer sprays catch light; the interior falls into shade.
  const tints=useMemo(()=>{
    const base=skeleton.height*0.32,span=Math.max(1,skeleton.crownTop-base);
    return anchors.map((a,i)=>{
      const vertical=THREE.MathUtils.clamp((a.p.y-base)/span,0,1);
      const radial=THREE.MathUtils.clamp(Math.hypot(a.p.x,a.p.z)/skeleton.canopyRadius,0,1);
      const sun=THREE.MathUtils.clamp(0.5+(a.p.x*SUN_DIR.x+a.p.z*SUN_DIR.z)/(skeleton.canopyRadius*1.6),0,1);
      const light=THREE.MathUtils.clamp(vertical*0.45+radial*0.3+sun*0.25+(((i*37)%23)/23-0.5)*0.22,0,1);
      return new THREE.Color().setRGB(0.4,0.5,0.43).lerp(CROWN_LIT_LINEAR,light);
    });
  },[anchors,skeleton]);
  const dirty=useRef(true);
  const reactivationMap=useMemo(()=>new Map(reactivations.map(r=>[r.businessUnitId,r.startedAt])),[reactivations]);
  useEffect(()=>{dirty.current=true;},[anchors,units,focus,team,selected,active,reduced,reactivations,dim,coverage]);
  useFrame((_,dt)=>{
    if(reduced)uniforms.uTime.value=0;else uniforms.uTime.value+=dt;
    const inst=mesh.current;if(!inst)return;
    const now=performance.now();
    const hasLiveReactivation=reactivations.some(r=>now-r.startedAt<2200);
    if(!dirty.current && !hasLiveReactivation)return;
    const selectedLeaf=selected ? skeleton.leaves.find(l=>l.prospectId===selected) : undefined;
    anchors.forEach((a,i)=>{
      const bu=units[a.bu];
      let presence=bu?.status==='dormant'?0:1;
      const startedAt=reactivationMap.get(a.bu);
      if(startedAt!==undefined && !reduced)presence=THREE.MathUtils.clamp((now-startedAt)/2200,0,1);
      if(active && a.keep>(coverage?0.5:ACTIVE_DENSITY))presence=0;
      if(active && skeleton.fruit.some(f=>a.p.distanceToSquared(f.position)<FRUIT_OPENING_SQ))presence=0;
      // Inspection clears a local window. No decorative foliage can capture input.
      if(active && focus===a.bu)presence*=team ? (a.team===team?0.15:0.7) : 0.5;
      else if(active && focus)presence*=0.85;
      if(active && selected) {
        presence*=0.7;
        if(selectedLeaf && a.p.distanceToSquared(selectedLeaf.position)<64)presence=0;
      }
      scale.current.setScalar(a.s*presence);
      matrix.current.compose(a.p,a.q,scale.current);inst.setMatrixAt(i,matrix.current);
      color.current.copy(tints[i]);
      if(active)color.current.lerp(DEEP_LINEAR,coverage?0.7:0.42);
      if(coverage)color.current.multiplyScalar(0.7);
      if(active && focus && focus!==a.bu)color.current.multiplyScalar(0.62);
      if(dim>0)color.current.lerp(RECEDE_LINEAR,dim*0.7);
      inst.setColorAt(i,color.current);
    });
    inst.instanceMatrix.needsUpdate=true;if(inst.instanceColor)inst.instanceColor.needsUpdate=true;dirty.current=false;
  });
  useEffect(()=>()=>{geometry.dispose();material.dispose();},[geometry,material]);
  return <instancedMesh ref={mesh} args={[geometry,material,anchors.length]} frustumCulled={false}
    raycast={()=>undefined} receiveShadow />;
}
