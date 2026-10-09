import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {STOCKED_WEAPONS} from '../dist/tactics/weapon-carry-fit.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createRifleFiring} from '../dist/tactics/rifle-firing.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createEquipmentDraw} from '../dist/tactics/equipment-draw.js';
import {rifleArmCrossings} from './helpers/idle-rifle-clearance.mjs';
const animals=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed&&!p.id.startsWith('pig-'));
for(const p of animals)test(p.id+': carried rifle and aiming controller meet without an arm snap or stock crossing',()=>{
 const worker=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),weapon=createWeaponModel('rifle');worker.equipWeapon(weapon);const firing=createRifleFiring(worker,p);
 try{
  worker.pose('carry');const original=worker.bones.map(b=>b.getWorldPosition(new T.Vector3()));
  const result=firing.apply({aim:0,target:new T.Vector3(8,1.4,0),sample:{pose:{},heading:0}});assert.ok(result.supported);
  worker.bones.forEach((b,i)=>assert.ok(b.getWorldPosition(new T.Vector3()).distanceTo(original[i])<1e-8,'carry endpoint '+b.name));
  for(let i=0;i<=40;i++){
   const aim=i/40;const result=firing.apply({aim,target:new T.Vector3(8,1.4,0),sample:{pose:{},heading:0}});assert.ok(result.supported,'raise reach '+aim);
   assert.deepEqual(rifleArmCrossings({parts:worker.parts.filter(p=>p.name.includes('forearm'))},weapon),[],'forearm crosses broad stock at '+aim);
  }
 }finally{weapon.dispose();worker.skeleton.dispose();worker.dispose();}
});
test('all fitted long guns finish drawing in the same carry used by locomotion',()=>{
 for(const p of animals){const worker=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),motion=createWorkerLocomotion(worker,p);
  try{for(const id of STOCKED_WEAPONS){const gun=createWeaponModel(id);worker.equipWeapon(gun);const draw=createEquipmentDraw(worker,p);
   try{let near;for(const progress of [.8,.95,.99,.9999,1]){motion.apply({distance:.5,blend:0,heading:0});const result=draw.apply(progress);assert.ok(result.contacts.every(c=>!c.engaged||c.error<1e-5),id+' grip');const elbow=worker.bones.find(b=>b.name==='forearm1').getWorldPosition(new T.Vector3());if(progress===.9999)near=elbow;if(progress===1)assert.ok(near.distanceTo(elbow)<.0001,id+' final elbow snap');}}
   finally{draw.dispose();worker.equipWeapon();gun.dispose();}
  }}finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}
 }
});

test('stocked-weapon draws have continuous elbows and no reach-gate teleport',()=>{
 for(const p of animals){const worker=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));
  try{for(const id of STOCKED_WEAPONS){const gun=createWeaponModel(id);worker.equipWeapon(gun);const draw=createEquipmentDraw(worker,p);
   const snapshot=()=>[gun.root.getWorldPosition(new T.Vector3()),...worker.bones.map(b=>b.getWorldPosition(new T.Vector3()))];
   const at=t=>{worker.pose('carry');const result=draw.apply(t);assert.ok(result.contacts.every(c=>!c.engaged||c.error<1e-5),`${p.id}/${id} detached grip at ${t}`);return snapshot();};
   try{
    let previous=at(0);
    for(let i=1;i<=200;i++){const t=i/200,now=at(t);assert.ok(now.every((v,j)=>v.distanceTo(previous[j])<.045),`${p.id}/${id} abrupt joint movement at ${t}`);previous=now;}
    for(const gate of [.25,.95,1]){const before=at(gate-.000001),after=at(gate);assert.ok(after.every((v,j)=>v.distanceTo(before[j])<.0001),`${p.id}/${id} gate jump at ${gate}`);}
   }finally{draw.dispose();worker.equipWeapon();gun.dispose();}
  }}finally{worker.skeleton.dispose();worker.dispose();}
 }
});

test('HMG handle contact and its glove cuff follow the final raised and drawn arm',()=>{
 const p=animals.find(p=>p.id==='horse'),worker=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),gun=createWeaponModel('hmg');worker.equipWeapon(gun);
 const firing=createRifleFiring(worker,p),draw=createEquipmentDraw(worker,p);
 const cuffIsCurrent=label=>{const cuff=worker.root.getObjectByName('fitted glove cuff'),before=Array.from(cuff.geometry.attributes.position.array);cuff.update();const after=cuff.geometry.attributes.position.array;assert.ok(before.every((v,i)=>Math.abs(v-after[i])<1e-6),label+' stale cuff');};
 try{
  worker.pose('carry');const hand=worker.bones.find(b=>b.name==='hand-1'),palm=hand.worldToLocal(gun.anchors.support.getWorldPosition(new T.Vector3()));
  for(const aim of [0,.25,.5,.75,1]){assert.ok(firing.apply({aim,target:new T.Vector3(8,1.4,0),sample:{pose:{},heading:0}}).supported);assert.ok(hand.localToWorld(palm.clone()).distanceTo(gun.anchors.support.getWorldPosition(new T.Vector3()))<1e-5,'HMG handle grip');cuffIsCurrent('aim '+aim);}
  for(const t of [.15,.5,.75,.96]){worker.pose('carry');draw.apply(t);cuffIsCurrent('draw '+t);}
 }finally{draw.dispose();gun.dispose();worker.skeleton.dispose();worker.dispose();}
});

for(const p of animals)test(p.id+': all stocked weapons remain reachable while raising',()=>{
 const worker=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));
 try{for(const id of STOCKED_WEAPONS){const gun=createWeaponModel(id);worker.equipWeapon(gun);const firing=createRifleFiring(worker,p);
  try{for(let i=0;i<=100;i++){
   const aim=i/100,result=firing.apply({aim,target:new T.Vector3(8,1.4,0),sample:{pose:{},heading:0}});
   assert.ok(result.supported,`${p.id}/${id} raise falls back to carry at ${aim}`);
   assert.ok(worker.diagnostics().contacts.every(c=>c.error<1e-5),`${p.id}/${id} hand contact`);
   // The narrow stock neck is inside the closed grasp. Allow 2 mm at that
   // boundary, but no broad butt through either forearm during the lift.
   assert.deepEqual(rifleArmCrossings({parts:worker.parts.filter(p=>p.name.includes('forearm'))},gun).filter(h=>h.minLocalX<-.102),[],`${p.id}/${id} forearm crossing at ${aim}`);
  }}finally{worker.equipWeapon();gun.dispose();}
 }}finally{worker.skeleton.dispose();worker.dispose();}
});
