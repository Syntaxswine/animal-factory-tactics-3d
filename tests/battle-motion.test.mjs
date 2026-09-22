import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BattleMotion,MOVEMENT_MS} from '../dist/tactics/battle-motion.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createGame,move,stepMovement} from '../dist/tactics/core/engine.js';
const unit={id:0,x:3,y:4,z:0,heading:350,hp:100};
test('movement interpolates without changing simulation coordinates and settles after stopping',()=>{
 const m=new BattleMotion(),start=structuredClone(unit),end={...unit,x:4,heading:10};m.update([start],0);m.update([end],10);m.update([end],10+MOVEMENT_MS/2);
 const p=m.sample(end);assert.equal(p.x,3.5);assert.equal(p.heading,360);assert.ok(p.blend>0);assert.equal(end.x,4);assert.deepEqual(start,unit);
 m.update([end],10+MOVEMENT_MS);assert.equal(m.sample(end).x,4);m.update([end],2000);assert.equal(m.sample(end).blend,0);
});
test('hidden routes, floor changes, casualties and reduced motion do not interpolate',()=>{
 const m=new BattleMotion();m.update([unit],0);m.update([],100);m.update([{...unit,x:20}],200);assert.equal(m.sample(unit).x,20);
 m.update([{...unit,x:21,z:1}],300);assert.equal(m.sample(unit).x,21);
 m.update([{...unit,x:22,z:1}],400,true);assert.equal(m.sample(unit).x,22);assert.equal(m.sample(unit).blend,0);
 m.update([{...unit,x:23,z:1,hp:0}],500);assert.equal(m.sample(unit).x,23);assert.equal(m.sample(unit).blend,0);
});
test('animated and unanimated movement replay leave identical core state',()=>{
 const a=createGame(),b=structuredClone(a),motion=new BattleMotion();let time=0;
 for(const state of [a,b])assert.ok(move(state,state.units[0],5,4));
 motion.update(a.units,time);
 while(a.queue.length){stepMovement(a);motion.update(a.units,time+=MOVEMENT_MS);motion.update(a.units,time+MOVEMENT_MS/2);}
 while(b.queue.length)stepMovement(b);
 assert.deepEqual(a,b);
});
for(const profile of ANIMAL_MOTION_CATALOG)test(profile.id+': gameplay gait keeps planted feet grounded and equipment grips together',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))),worker=profile.create(data),motion=createWorkerLocomotion(worker,profile);
 let equipment;
 try{
  for(const weapon of profile.unarmed?['hands']:['rifle','pistol','knife','assault']){
   if(!profile.unarmed){const old=equipment;equipment=createWeaponModel(weapon);worker.equipWeapon(equipment);old?.dispose();}
   for(const heading of [0,45,180,315])for(const distance of [0,.1,.3,.5,.8,1.1,1.8]){
    const state=motion.apply({distance,blend:1,heading});
    const feet=worker.bones.filter(b=>profile.unarmed?/^foot /.test(b.name):/^hoof/.test(b.name));
    for(const foot of feet){const side=foot.name.endsWith('-1')?-1:1,world=foot.getWorldPosition(new T.Vector3());assert.ok(Number.isFinite(world.x)&&Number.isFinite(world.y));if(state.feet[side].planted)assert.ok(world.y>=.04&&world.y<=.21,profile.id+' planted foot height '+world.y);}
    if(!profile.unarmed)for(const contact of worker.diagnostics().contacts)assert.ok(contact.error<1e-6,profile.id+' carry grip drift');
   }
  }
  motion.apply({distance:2,blend:0,heading:0});assert.ok(Math.abs(worker.root.position.y)<1e-8);
  if(!profile.unarmed)assert.deepEqual(worker.bones.find(b=>b.name==='shin1').quaternion.toArray(),[0,0,0,1]);
 }finally{motion.dispose();equipment?.dispose();worker.dispose();}
});
