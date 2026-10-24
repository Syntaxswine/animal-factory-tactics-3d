import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {WEAPONS} from '../dist/tactics/core/engine.js';
import {ANIMAL_MOTION_CATALOG as catalog} from '../dist/tactics/animal-motion-catalog.js';
import {createWeaponModel,WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
import {CRAWL_WEAPONS,crawlWeaponProfile} from '../dist/tactics/crawl-state.js';
import {createCrawlMotion} from '../dist/tactics/crawl-motion.js';
import {createCasualtyHeadClearance} from '../dist/tactics/casualty-weapon-clearance.js';
const profiles=catalog.filter(p=>!p.unarmed),pairs=[['pistol','pistol'],['pistol','knife'],['pistol','grenade'],['knife','pistol'],['knife','grenade'],['grenade','pistol'],['grenade','knife']];
const vector=a=>new T.Vector3(...a);
function actor(p,id,left){const worker=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),gun=createWeaponModel(id),offhand=left?createWeaponModel(left):null;worker.equipWeapon?.(gun);return {worker,gun,offhand,dispose(){offhand?.dispose();gun.dispose();worker.dispose();}};}
function pose(worker){return {root:worker.root.matrixWorld.toArray(),bones:worker.parts[0].skeleton.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]),parts:worker.parts.map(m=>Array.from(m.geometry.attributes.position.array))};}
function minimum(object){let low=Infinity;object.traverse(mesh=>{if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position;for(const i of new Set(mesh.geometry.index?.array||Array.from({length:a.count},(_,i)=>i))){const p=mesh.isSkinnedMesh?mesh.getVertexPosition(i,new T.Vector3()):new T.Vector3().fromBufferAttribute(a,i);low=Math.min(low,p.applyMatrix4(mesh.matrixWorld).y);}});return low;}

test('Every gameplay weapon has an explicit crawl carry, including the second-pistol item alias',()=>{
 assert.deepEqual(Object.keys(CRAWL_WEAPONS),Object.keys(WEAPON_MODELS));
 for(const id of Object.keys(WEAPONS))assert.ok(crawlWeaponProfile(id),id);
 assert.equal(new Set(Object.values(CRAWL_WEAPONS).map(p=>p.label)).size,13);
 assert.equal(crawlWeaponProfile('pistol-offhand'),crawlWeaponProfile('pistol'));
 assert.throws(()=>crawlWeaponProfile('unknown'));
});

test('Heavy equipment shortens the actual pull while compact weapons and long tubes keep their different carrying axes',()=>{
 const rows={};for(const id of ['hands','pistol','rifle','hmg','rpg','flamethrower']){const a=actor(catalog[0],id),motion=createCrawlMotion(a.worker,catalog[0]);try{const state=motion.at(motion.stride*.1),axis=new T.Vector3(1,0,0).applyQuaternion(a.gun.root.quaternion);rows[id]={stride:motion.stride,axis,carry:state.carry};assert.ok((state.grip?.error||0)<1e-6);}finally{motion.dispose();a.dispose();}}
 assert.ok(rows.hmg.stride<rows.rifle.stride*.8);assert.ok(rows.flamethrower.stride<rows.rifle.stride*.85);
 assert.ok(rows.pistol.axis.x>.98&&rows.rpg.axis.x>.98);assert.ok(rows.rifle.axis.z<-.7);
 assert.notEqual(rows.pistol.carry,rows.hmg.carry);
});

test('All seven legal paired carries fit every armed species with both grips, native reach, floor clearance and intact heads',()=>{
 let count=0;for(const p of profiles)for(const [right,left]of pairs){const a=actor(p,right,left),motion=createCrawlMotion(a.worker,p,{offhand:a.offhand});try{const lengths=a.worker.bones.filter(b=>b.parent.isBone).map(b=>[b,b.position.length()]);let previous;
  for(const phase of [.1,.11,.6,.61]){const state=motion.at(motion.stride*phase,{heading:35,position:new T.Vector3(3,1,-2)});assert.ok(state.grip.error<1e-6&&state.offhandGrip.error<1e-6,p.id+'/'+right+'/'+left);assert.equal(a.worker.weapon,a.gun);assert.equal(a.offhand.root.parent,a.worker.root);for(const [bone,length]of lengths)assert.ok(Math.abs(bone.position.length()-length)<1e-7);
   for(const mesh of a.worker.parts)assert.ok(minimum(mesh)>=.999,p.id+'/'+right+'/'+left+'/'+mesh.name+' floor');assert.ok(minimum(a.gun.root)>=.999&&minimum(a.offhand.root)>=.999,p.id+' prop floor');
   const head=createCasualtyHeadClearance(a.worker);try{assert.ok(head.clear(a.gun)&&head.clear(a.offhand),p.id+'/'+right+'/'+left+' head');}finally{head.dispose();}
   if(previous)for(const arm of state.arms){const old=previous.arms.find(a=>a.side===arm.side);if(arm.primary&&old.primary&&arm.planted&&old.planted)assert.ok(vector(arm.contact==='hand'?arm.wrist:arm.elbow).distanceTo(vector(old.contact==='hand'?old.wrist:old.elbow))<1e-6,p.id+' paired support slide');}previous=state;
  }count++;
 }finally{motion.dispose();a.dispose();}}assert.equal(count,77);
});

test('Paired reverse scrubbing preserves exact poses and never exchanges the primary and offhand assets',()=>{
 for(const p of profiles.filter(p=>['horse','pig-director','skunk'].includes(p.id)))for(const pair of pairs){const a=actor(p,...pair),motion=createCrawlMotion(a.worker,p,{offhand:a.offhand});try{motion.at(.137,{heading:-70});const before={body:pose(a.worker),right:a.gun.root.matrixWorld.toArray(),left:a.offhand.root.matrixWorld.toArray()};for(const distance of [2,-.5,0,.8,-2,.137])motion.at(distance,{heading:-70});assert.deepEqual({body:pose(a.worker),right:a.gun.root.matrixWorld.toArray(),left:a.offhand.root.matrixWorld.toArray()},before);assert.equal(a.worker.weapon,a.gun);}finally{motion.dispose();a.dispose();}}
});

test('Offhand disposal restores the borrowed prop parent and transform without disposing caller resources',()=>{
 for(const p of profiles.filter(p=>['horse','pig-director','dog'].includes(p.id)))for(const left of ['pistol','grenade']){const a=actor(p,'pistol',left),parent=new T.Group();parent.add(a.offhand.root);a.offhand.root.position.set(4,5,6);a.offhand.root.rotation.y=.3;a.offhand.root.visible=false;a.worker.pose('carry');a.worker.root.position.set(2,1,3);a.worker.root.rotation.y=.4;a.worker.root.updateMatrixWorld(true);const before=pose(a.worker),transform=[...a.offhand.root.position.toArray(),...a.offhand.root.quaternion.toArray()];let disposed=0;for(const m of a.offhand.parts){m.geometry.addEventListener('dispose',()=>disposed++);m.material.addEventListener('dispose',()=>disposed++);}const motion=createCrawlMotion(a.worker,p,{offhand:a.offhand});motion.at(-.7);motion.dispose();motion.dispose();assert.deepEqual(pose(a.worker),before);assert.equal(a.worker.weapon,a.gun);assert.equal(a.offhand.root.parent,parent);assert.equal(a.offhand.root.visible,false);assert.deepEqual([...a.offhand.root.position.toArray(),...a.offhand.root.quaternion.toArray()],transform);assert.equal(disposed,0);a.dispose();}
});

test('Illegal paired equipment is rejected before changing the caller pose or ownership',()=>{
 for(const [p,right,left]of [[catalog[0],'rifle','pistol'],[catalog[0],'knife','knife'],[catalog.at(-1),'hands','pistol']]){const a=actor(p,right,left),before=pose(a.worker);assert.throws(()=>createCrawlMotion(a.worker,p,{offhand:a.offhand}),/valid pair/);assert.deepEqual(pose(a.worker),before);assert.equal(a.offhand.root.parent,null);a.dispose();}
});
