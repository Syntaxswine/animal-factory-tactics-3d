import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {BattleMotion} from '../dist/tactics/battle-motion.js';
const settled=[{down:1},{down:1,stable:1},{down:1,dead:1}];
function rig(profile,weapon='rifle'){
 const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),posture=createBattlePosture(worker,profile),loc=createWorkerLocomotion(worker,profile),gun=profile.unarmed?null:createWeaponModel(weapon);if(gun)worker.equipWeapon(gun);
 return {worker,posture,loc,gun,apply(pose,heading=0){const sample={pose,heading,blend:0,distance:0};loc.apply(sample);posture.apply(sample);if(Object.values(pose).some(Boolean))posture.ground();},dispose(){loc.dispose();gun?.dispose();worker.dispose();}};
}
function surface(worker,filter=()=>true){const out=[],v=new T.Vector3();for(const part of worker.parts){if(!filter(part))continue;for(const i of new Set(part.geometry.index.array)){part.getVertexPosition(i,v).applyMatrix4(part.matrixWorld);out.push(v.clone());}}return out;}
function signature(worker){return surface(worker).flatMap(v=>v.toArray());}
function equivalent(a,b,label){assert.equal(a.length,b.length);let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-b[i]));assert.ok(max<1e-5,`${label}: ${max}`);}
for(const profile of profiles){
 test(profile.id+': settled torso support, floor clearance and released equipment',()=>{
  const r=rig(profile);
  try{for(const pose of settled)for(const heading of [0,90,225]){
   r.apply(pose,heading);const points=surface(r.worker),min=Math.min(...points.map(p=>p.y));assert.ok(Math.abs(min-.012)<1e-5);
   // Do not allow a tail, ear or toe to be the only grounded region.
   const torso=surface(r.worker,p=>/shirt|jacket|waistcoat|overalls|trousers|feathered body/.test(p.name));assert.ok(Math.min(...torso.map(p=>p.y))<.09,profile.id+' torso floats');
   assert.ok(points.every(v=>v.toArray().every(Number.isFinite)));if(r.gun){assert.equal(r.gun.root.visible,false);assert.ok(r.worker.gripHands.every(h=>!h.visible));}
  }}finally{r.dispose();}
 });
 test(profile.id+': first-entry history, equipment independence and recovery are deterministic',()=>{
  const baseline=rig(profile),fromProne=rig(profile,'hmg');
  try{
   baseline.apply({});const neutral=signature(baseline.worker);fromProne.apply({prone:1});fromProne.apply({prone:.7,down:.3});
   for(const pose of settled){baseline.apply(pose);fromProne.apply(pose);equivalent(signature(baseline.worker),signature(fromProne.worker),profile.id+' endpoint history');}
   baseline.apply({});equivalent(signature(baseline.worker),neutral,'recover neutral');if(baseline.gun)assert.equal(baseline.gun.root.visible,true);
   for(const stance of [{kneel:1},{prone:1}]){baseline.apply(stance);const expected=signature(baseline.worker);baseline.apply({down:1,stable:1});baseline.apply(stance);equivalent(signature(baseline.worker),expected,'restore retained stance');}
  }finally{baseline.dispose();fromProne.dispose();}
 });
 test(profile.id+': dense collapse and recovery remain finite and do not jump at endpoints',()=>{
  const r=rig(profile);
  try{for(const [from,to] of [[{},settled[0]],[{kneel:1},settled[2]],[{prone:1},settled[2]],[settled[0],settled[1]],[settled[1],{prone:1}]]){
   let previous;
   for(let frame=0;frame<=40;frame++){const t=frame/40,pose=Object.fromEntries(['kneel','prone','down','stable','dead'].map(k=>[k,(from[k]||0)*(1-t)+(to[k]||0)*t]));r.apply(pose);const points=surface(r.worker);assert.ok(points.every(p=>p.y>=-.00001));if(previous){let jump=0;for(let i=0;i<points.length;i++)jump=Math.max(jump,points[i].distanceTo(previous[i]));assert.ok(jump<.20,profile.id+' transition discontinuity '+jump);}previous=points;}
  }}finally{r.dispose();}
 });
}
test('casualty clock preserves states and retained stance, and reduced motion snaps',()=>{
 const m=new BattleMotion(),u={id:0,hp:100,x:2,y:3,z:2,stance:'prone',heading:225};m.update([u],0);u.hp=0;u.casualty='bleeding';m.update([u],10);m.update([u],660);assert.equal(m.sample(u).pose.down,1);u.casualty='stable';m.update([u],670,true);assert.equal(m.sample(u).pose.stable,1);u.hp=5;u.casualty=null;m.update([u],680,true);assert.equal(m.sample(u).pose.prone,1);assert.equal(m.sample(u).pose.down,0);assert.equal(m.sample(u).z,2);u.hp=0;m.update([u],690,true);assert.equal(m.sample(u).pose.dead,1);
});
