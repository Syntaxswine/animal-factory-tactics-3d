import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createRifleFiring} from '../dist/tactics/rifle-firing.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {stanceSurfaces} from '../tools/stance-surface-metrics.mjs';
for(const p of profiles.filter(p=>p.proneAim&&(!process.env.REVIEW_ANIMAL||p.id===process.env.REVIEW_ANIMAL)))test(p.id+': continuous kneel/prone legs, finite normalized skinning and reproducible firing poses',()=>{
 const w=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),gun=createWeaponModel('rifle');w.equipWeapon(gun);const posture=createBattlePosture(w,p),f=createRifleFiring(w,p,posture);
 const tails=w.parts.filter(p=>p.name.includes('tail')).map(part=>({part,original:part.geometry.attributes.position.array.slice()}));
 const apply=t=>{w.pose('carry');posture.apply({pose:{kneel:1-t,prone:t},heading:0,blend:0});w.root.updateMatrixWorld(true);return w.bones.filter(b=>/thigh|shin|hoof/.test(b.name)).map(b=>b.getWorldPosition(new T.Vector3()));};
 try{
  const before=apply(.0009),after=apply(.0011);assert.ok(before.every((v,i)=>v.distanceTo(after[i])<.002),'kneeling IK switches off at prone=.001');
  let previous=apply(0);for(let t=.01;t<=1.00001;t+=.01){const now=apply(Math.min(t,1));assert.ok(previous.every((v,i)=>v.distanceTo(now[i])<.06),'leg discontinuity');previous=now;}
  let prior=null;
  for(let n=0;n<=100;n++){
   const t=n/100,r=f.apply({aim:1,target:new T.Vector3(6,.48,0),sample:{pose:{kneel:1-t,prone:t},heading:0,blend:0}}),surface=stanceSurfaces(w),now=w.bones.map(b=>b.getWorldPosition(new T.Vector3()));
   assert.equal(r.supported,true,'ordinary low endpoint must remain aligned throughout transition');assert.ok(surface.body>=.0119);assert.ok(surface.weapon>=0,'weapon crossed floor');
   if(prior)assert.ok(now.every((v,i)=>v.distanceTo(prior[i])<.06),'grounded full-controller joint jump');prior=now;
   assert.ok(Math.min(...surface.knees)<.07,'descent lost the supporting knee: '+JSON.stringify({t,surface}));assert.ok(surface.feet.every(y=>y<.05),'descent lost hoof/boot support: '+JSON.stringify({t,surface}));
   if(n===100)assert.ok(surface.knees.every(y=>y<(p.proneAim.kneeClearance??.04)),'settled prone knee floats: '+JSON.stringify({t,surface}));
   if(n===100&&p.proneAim.kneeClearance)assert.ok(surface.belly<.03&&surface.feet.every(y=>y<.03),'rounded build must be supported by belly and boots: '+JSON.stringify(surface));
  }
  for(const part of w.parts){const a=part.geometry.attributes.skinWeight;if(a)for(let i=0;i<a.count;i++){const weights=[a.getX(i),a.getY(i),a.getZ(i),a.getW(i)];assert.ok(weights.every(v=>v>=0&&Number.isFinite(v)));assert.ok(Math.abs(weights.reduce((a,b)=>a+b)-1)<1e-5);}}
  for(const prone of [0,.25,.5,.75,1])for(const xyz of [[6,.48,0],[1,1.4,0],[2,3,0]]){
   const options={aim:1,recoil:.25,target:new T.Vector3(...xyz),sample:{pose:{kneel:1-prone,prone},heading:0,blend:0}},first=f.apply(options);
   for(const c of w.diagnostics().contacts)assert.ok(c.error<1e-6);assert.ok(w.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)));
   f.apply({...options,target:new T.Vector3(9,.4,3)});const again=f.apply(options);assert.equal(again.supported,first.supported);assert.ok(first.origin.distanceTo(again.origin)<1e-8);
  }
  if(p.longTail||p.proneAim.tailUpright){const axis=p.proneAim.tailUpright?0:1;w.pose('carry');posture.apply({pose:p.proneAim.tailUpright?{prone:1}:{kneel:1},heading:0});for(const {part,original}of tails){const top=Math.max(...Array.from({length:original.length/3},(_,i)=>original[i*3+axis]));for(let i=0;i<original.length;i+=3)if(original[i+axis]>=top-.025)assert.ok(Math.hypot(...[0,1,2].map(j=>part.geometry.attributes.position.array[i+j]-original[i+j]))<1e-6,'tail root detached');}w.pose('carry');posture.apply({pose:{},heading:0});for(const {part,original}of tails)assert.deepEqual(part.geometry.attributes.position.array,original,'tail did not restore standing geometry');}
  if(p.proneAim.tailUpright){w.pose('carry');posture.apply({pose:{prone:1},heading:0});for(const {part,original}of tails){const ys=Array.from({length:original.length/3},(_,i)=>original[i*3+1]),crown=Math.min(...ys)+(Math.max(...ys)-Math.min(...ys))*.45,index=part.geometry.index.array,position=part.geometry.attributes.position.array;let checked=0;for(let i=0;i<index.length;i+=3)for(let j=0;j<3;j++){const a=index[i+j]*3,b=index[i+(j+1)%3]*3;if(original[a+1]>crown&&original[b+1]>crown){const length=values=>Math.hypot(...[0,1,2].map(k=>values[a+k]-values[b+k]));assert.ok(Math.abs(length(original)-length(position))<2e-6,'broad plume crown distorted');checked++;}}assert.ok(checked>100);}}
 }finally{gun.dispose();w.dispose();}
});
