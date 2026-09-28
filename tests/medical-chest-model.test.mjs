import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createMedicalChest} from '../dist/tactics/medical-chest.js';
import {BattleLoot} from '../dist/tactics/battle-loot.js';
test('medical chest is floor-rooted with elongated footprint and visible details',()=>{
 const m=createMedicalChest(),b=new T.Box3().setFromObject(m),size=b.getSize(new T.Vector3());assert.ok(Math.abs(b.min.y)<1e-8);assert.ok(size.x/size.z>1.9);assert.ok(m.getObjectByName('carry-handle'));assert.ok(m.getObjectByName('medical-cross-arms'));for(const part of m.children)assert.ok(part.castShadow&&part.receiveShadow);m.userData.dispose();
});
test('ground loot uses chest, updates mixed piles, keeps picking, elevation and resource cleanup',()=>{
 const scene=new T.Scene(),loot=new BattleLoot(scene),p={x:0,y:0,z:1,items:[{type:'tool',kind:'largeMedicalKit',count:1,charges:7}]},s={loot:[p],visible:new Set(['0,0,1'])};loot.sync(s,1);const chest=loot.models.get(p);assert.equal(chest.name,'large-medical-chest');assert.equal(chest.position.y,2.12);
 scene.updateMatrixWorld(true);assert.equal(loot.pick(new T.Raycaster(new T.Vector3(0,4,0),new T.Vector3(0,-1,0))),p);
 let disposed=0;chest.children[0].geometry.addEventListener('dispose',()=>disposed++);p.items=[{type:'utility',kind:'medkits',count:1}];loot.sync(s,1);assert.equal(disposed,1);assert.equal(loot.models.get(p).userData.medical,false);
 p.items.push({type:'tool',kind:'largeMedicalKit',count:1,charges:1});loot.sync(s,1);assert.equal(loot.models.get(p).name,'large-medical-chest');loot.sync(s,0);assert.equal(loot.models.size,0);loot.dispose();assert.equal(scene.children.length,0);
});
