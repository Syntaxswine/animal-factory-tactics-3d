import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createOffhandEquipment} from '../dist/tactics/offhand-equipment.js';

for(const animal of ['horse','goat','donkey','sheep','skunk','cow'])test(animal+' displays paired items without changing inventory, limb lengths or the primary weapon',()=>{
 const p=ANIMAL_MOTION_CATALOG.find(p=>p.id===animal),worker=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));
 const controller=createOffhandEquipment(worker),lengths=worker.bones.map(b=>b.position.length());let gun;
 try{
  for(const pair of [['pistol','grenade'],['grenade','pistol'],['pistol','pistol-offhand']]){
   worker.equipWeapon();gun?.dispose();gun=createWeaponModel(pair[0]);worker.equipWeapon(gun);worker.pose('carry');
   const unit={weapon:pair[0],slots:pair,pack:pair.map(kind=>({type:'weapon',kind,rounds:3,condition:85})),ammo:{pistol:3,'pistol-offhand':5,grenade:2}},before=structuredClone(unit);
   controller.sync(unit);assert.ok(controller.gun.root.visible);assert.equal(worker.weapon,gun);assert.equal(controller.gun.id,pair[1]==='pistol-offhand'?'pistol':pair[1]);
   for(const target of [new T.Vector3(10,1.3,3),new T.Vector3(-5,.9,7)]){worker.pose('carry');controller.sync(unit,{aim:target});assert.ok(worker.bones.every((b,i)=>Math.abs(b.position.length()-lengths[i])<1e-9));assert.ok(controller.gun.root.matrixWorld.elements.every(Number.isFinite));}
   controller.sync(unit,{hidden:true});assert.equal(controller.gun.root.visible,false);assert.deepEqual(unit,before);
   controller.sync({...unit,slots:[pair[0],null]});assert.equal(controller.gun,null);assert.equal(worker.weapon,gun);
  }
 }finally{controller.dispose();controller.dispose();worker.equipWeapon();gun?.dispose();worker.dispose();}
});
