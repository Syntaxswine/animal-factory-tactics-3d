import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createWeaponModel,WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
import {createPaintedFireMotion} from '../dist/tactics/painted-fire-motion.js';
import {fireSelection} from '../dist/tactics/painted-fire-actor.js';
import {fireBodyZones,fireZoneCenter} from '../dist/tactics/painted-fire-zones.js';
import {makeBurnRoute,burnState,FIRE_TIME} from '../dist/tactics/painted-fire-state.js';
const V=()=>new T.Vector3(),route=(n=3)=>makeBurnRoute(Array.from({length:n+1},(_,x)=>({x,z:0})));
function setup(profile,id){const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))));let weapon;
 if(!profile.unarmed&&id!=='rifle'){weapon=createWeaponModel(id);worker.equipWeapon(weapon);}const motion=createPaintedFireMotion(worker,profile);
 return {worker,motion,dispose(){motion.dispose();weapon?.dispose();worker.skeleton.dispose();worker.dispose();}};
}
function minY(objects,filter=()=>true){let y=Infinity;const v=V();for(const part of objects){const p=part.geometry?.attributes.position;if(!p)continue;const indices=part.geometry.index?new Set(part.geometry.index.array):Array.from({length:p.count},(_,i)=>i);for(const i of indices)if(filter(part,i)){if(part.isSkinnedMesh)part.getVertexPosition(i,v);else v.fromBufferAttribute(p,i);v.applyMatrix4(part.matrixWorld);y=Math.min(y,v.y);}}return y;}
function bodyMeshes(worker){const out=[...worker.parts];for(const glove of worker.gripHands||[])if(glove.visible)glove.traverse(o=>{if(o.isMesh)out.push(o);});return out;}
function propMeshes(worker){const out=[];for(const root of [worker.weapon?.root,worker.weapon?.mount,worker.weapon?.hose].filter(Boolean))root.traverse(o=>{if(o.isMesh)out.push(o);});return out;}

test('coverage is 25 outfits, 289 supported target loadouts and 22 operators',()=>{
 let variants=0,targets=0,operators=0;for(const p of profiles)for(const outfit of ['normal','red-hats',...(p.id==='donkey'?['blue-hawaiian']:[])]){variants++;const unarmed=p.unarmed||outfit==='blue-hawaiian';for(const id of unarmed?['hands']:Object.keys(WEAPON_MODELS)){assert.equal(fireSelection(p.id,outfit,id).weapon,id);targets++;}if(!unarmed){assert.equal(fireSelection(p.id,outfit,'rifle',true).weapon,'flamethrower');operators++;}}
 assert.deepEqual([variants,targets,operators],[25,289,22]);assert.equal(fireSelection('hen','red-hats','rifle').weapon,'hands');assert.equal(fireSelection('donkey','blue-hawaiian','hmg').weapon,'hands');assert.throws(()=>fireSelection('hen','normal','flamethrower',true));assert.throws(()=>fireSelection('horse','blue-hawaiian','hands'));
});
for(const p of profiles){
 test(p.id+': all loadouts keep reachable limbs, reversible poses and grounded equipment',()=>{
  for(const id of p.unarmed?['hands']:Object.keys(WEAPON_MODELS)){const a=setup(p,id);try{
   const lengths=a.worker.bones.map(b=>b.position.length());
   for(const n of [0,1,3]){const r=route(n),times=Array.from({length:109},(_,i)=>i*.05);let previous;
    for(const t of times){const d=a.motion.burn(t,r);assert.ok(d.gripError<1e-7,p.id+' '+id+' grips at '+t);assert.ok([-1,1].some(s=>d.feet[s].planted));
     for(const side of [-1,1]){const f=d.feet[side];if(previous?.feet[side].planted&&f.planted&&f.worldDistance===previous.feet[side].worldDistance)assert.ok(V().fromArray(f.ankle).distanceTo(V().fromArray(previous.feet[side].ankle))<1e-7,'planted foot slid');}previous=d;
     a.worker.bones.forEach((b,i)=>{if(!['hips','pelvis'].includes(b.name))assert.ok(Math.abs(b.position.length()-lengths[i])<1e-7,'bone length changed '+b.name);});
    }
    const expected=a.motion.burn(1.27,r);a.motion.burn(5.4,r);assert.deepEqual(a.motion.burn(1.27,r),expected);assert.ok(a.worker.parts.every(o=>o.visible));
    const settled=FIRE_TIME.hit+burnState(0,r).runEnd+.62;a.motion.burn(settled,r);assert.ok(minY(bodyMeshes(a.worker))>-.005,p.id+' '+id+' body below floor');
    if(!p.unarmed){const names=a.worker.bones.map((b,i)=>/^(hand-1|fingers-1)$/.test(b.name)?i:-1).filter(i=>i>=0),glove=a.worker.gripHands?.find(g=>g.visible),y=glove?minY([glove]):minY(a.worker.parts,(part,i)=>{const at=part.geometry.attributes;let w=0;for(let k=0;k<4;k++)if(names.includes(at.skinIndex.getComponent(i,k)))w+=at.skinWeight.getComponent(i,k);return w>.8;});assert.ok(y>=-.003&&y<.004,`${p.id} ${id} support surface ${y}`);}
    a.motion.burn(5.4,r);if(id!=='hands'){const floor=minY(propMeshes(a.worker));assert.ok(floor>=.005&&floor<.015,`${p.id} ${id} landed equipment: ${floor}`);}
   }
  }finally{a.dispose();}}
 });
 test(p.id+': mesh soles and flame envelope fit species geometry',()=>{
  const a=setup(p,p.unarmed?'hands':'rifle');try{const zones=fireBodyZones(a.worker);assert.ok(zones.length>=8);const r=route();
   for(let t=0;t<=3.61;t+=.05){const d=a.motion.burn(t,r);for(const side of [-1,1])if(d.feet[side].planted){const y=minY(a.worker.parts.filter(o=>/hoof|boot|foot|scaly leg/.test(o.name)&&o.name.endsWith(' '+side)));assert.ok(y>=-.003&&y<.008,`${p.id} sole ${side} at ${t}: ${y}`);}for(const z of zones)assert.ok(fireZoneCenter(z).toArray().every(Number.isFinite));}
   if(p.unarmed)assert.throws(()=>a.motion.fire(.7),/no authored/);
  }finally{a.dispose();}
 });
 if(!p.unarmed)test(p.id+': flamethrower has two planted feet and two contacts throughout the spray',()=>{
  const a=setup(p,'flamethrower');try{let origin;for(let t=0;t<=2.15;t+=.025){const d=a.motion.fire(t);assert.equal(d.hands.length,2);assert.ok(d.gripError<1e-7);assert.ok(minY(a.worker.parts.filter(o=>/hoof|boot|foot/.test(o.name)))>-.003);if(t>=FIRE_TIME.ignite&&t<FIRE_TIME.cutoff+FIRE_TIME.travel){if(!origin)origin=d.muzzle;assert.ok(V().fromArray(d.muzzle).distanceTo(V().fromArray(origin))<1e-7);}assert.ok(a.worker.weapon.mount.visible&&a.worker.weapon.hose.visible);}}
  finally{a.dispose();}
 });
 if(!p.unarmed)test(p.id+': releasing equipment has no instantaneous wrist or elbow change',()=>{
  for(const id of ['rifle','hmg']){const a=setup(p,id);try{const r=route(),start=FIRE_TIME.hit+burnState(0,r).runEnd;
   for(const time of [start,start+.31]){const sample=t=>{a.motion.burn(t,r);return [-1,1].flatMap(side=>['forearm','hand'].map(n=>{const b=a.motion.bones[n+side];return {p:b.getWorldPosition(V()),q:b.getWorldQuaternion(new T.Quaternion())};}));};const before=sample(time-.000001),after=sample(time+.000001);for(let i=0;i<before.length;i++){assert.ok(before[i].p.distanceTo(after[i].p)<.0001,`${id} joint jumped`);assert.ok(before[i].q.angleTo(after[i].q)<.001,`${id} joint snapped`);}}
   if(id==='hmg'){a.motion.burn(1.3,r);const cuff=a.worker.gripHands[0].children.find(c=>c.update),before=Array.from(cuff.geometry.attributes.position.array);cuff.update();assert.deepEqual(Array.from(cuff.geometry.attributes.position.array),before,'fitted cuff lagged behind the final arm pose');}
  }finally{a.dispose();}}
 });
 if(!p.unarmed)test(p.id+': fuel pack and lance each settle independently and the hose remains attached',()=>{
  const a=setup(p,'flamethrower');try{a.motion.burn(5.4,route());const gun=a.worker.weapon;
   for(const part of [gun.root,gun.mount]){const meshes=[];part.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.ok(Math.abs(minY(meshes)-.006)<1e-6,'rigid equipment still suspended');}
   const pos=gun.hose.geometry.attributes.position,ends=[0,pos.count-7];for(const [i,name]of ['hoseOut','hoseIn'].entries()){const center=V();for(let k=0;k<7;k++)center.add(V().fromBufferAttribute(pos,ends[i]+k));center.multiplyScalar(1/7).applyMatrix4(gun.hose.matrixWorld);assert.ok(center.distanceTo(gun.anchors[name].getWorldPosition(V()))<.003,'hose socket detached');}
  }finally{a.dispose();}
 });
}
