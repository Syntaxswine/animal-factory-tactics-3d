import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createRifleFiring} from '../dist/tactics/rifle-firing.js';
import {BattleMotion,postureOf} from '../dist/tactics/battle-motion.js';
import {rectangleMembers,pruneSelection,toggleSelection,stanceSelection,setSelectionStance} from '../dist/tactics/battle-selection.js';
import {createGame,setStance,combatCosts} from '../dist/tactics/core/engine.js';

test('rectangle selection works both ways and excludes guards, casualties, absent and other-floor mercs',()=>{
 const units=Array.from({length:8},(_,id)=>({id,team:'squad',hp:100,x:id,y:id,z:0}));
 units[2].hp=0;units[3].away={};units[4].team='guard';units[5].z=1;units[6].casualty='quit';units[7].casualty='captured';
 for(const [a,b] of [[{x:0,y:0},{x:10,y:10}],[{x:10,y:10},{x:0,y:0}]])assert.deepEqual(rectangleMembers(units,0,a,b,u=>u),[0,1]);
 assert.deepEqual([...pruneSelection({units,selected:0},new Set([1,2,6]))],[1]);
 assert.deepEqual([...toggleSelection(new Set([0]),0)],[0]);assert.deepEqual([...toggleSelection(new Set([0,1]),0)],[1]);
});
test('stance changes retain canonical cost, movement guard and unavailable-action rules',()=>{
 const s=createGame(),u=s.units[0];assert.ok(setStance(s,u,'kneeling'));const ap=u.ap;
 s.phase='player';assert.ok(combatCosts(s));assert.ok(setStance(s,u,'prone'));assert.equal(u.ap,ap-2);
 s.queue=[{}];assert.equal(setStance(s,u,'standing'),false);s.queue=[];u.ap=1;assert.equal(setStance(s,u,'standing'),false);
});
test('posture blends can be interrupted, recover to core stance and snap with reduced motion',()=>{
 const m=new BattleMotion(),u={id:0,hp:100,x:0,y:0,stance:'standing'};m.update([u],0);
 u.stance='prone';m.update([u],10);m.update([u],200);const partial=m.sample(u).pose.prone;assert.ok(partial>0&&partial<1);
 u.hp=0;u.casualty='bleeding';m.update([u],210);assert.equal(m.sample(u).pose.prone,partial);m.update([u],1000);assert.equal(m.sample(u).pose.down,1);
 u.casualty='stable';m.update([u],1010);m.update([u],1800);assert.equal(m.sample(u).pose.stable,1);
 u.hp=5;u.casualty=null;u.stance='kneeling';m.update([u],1810);m.update([u],2400);assert.equal(m.sample(u).pose.down,0);assert.equal(m.sample(u).pose.kneel,1);
 u.stance='standing';m.update([u],2410,true);assert.equal(m.sample(u).pose.kneel,0);assert.equal(postureOf({hp:0,casualty:null}),'dead');
});
for(const profile of ANIMAL_MOTION_CATALOG)test(profile.id+': grounded stances, distinct casualties, recovery and low rifle alignment',()=>{
 const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))));
 const posture=createBattlePosture(worker,profile),loc=createWorkerLocomotion(worker,profile);let equipment;
 try{
  if(!profile.unarmed){equipment=createWeaponModel('rifle');worker.equipWeapon(equipment);}
  loc.apply({heading:0,distance:0,blend:0});const standingHeight=worker.diagnostics().max[1];
  const signatures=[];
  for(const pose of [{kneel:1},{prone:1},{down:1},{down:1,stable:1},{down:1,dead:1}])for(const heading of [0,90,225]){
   const sample={pose,heading,distance:.2,blend:0};loc.apply(sample);posture.apply(sample);posture.ground();
   const d=worker.diagnostics();if(pose.kneel)assert.ok(standingHeight-d.max[1]>.22,profile.id+' crouch must visibly lower the body');assert.ok(d.min.every(Number.isFinite)&&d.max.every(Number.isFinite));assert.ok(Math.abs(d.min[1]-.012)<.00001);
   if(!pose.down)for(const c of d.contacts)assert.ok(c.error<1e-5,'carry grip drift');
   if(heading===0)signatures.push(worker.bones.map(b=>b.quaternion.toArray().join(',')).join(';'));
  }
  for(const pose of [{kneel:1},{prone:1}])for(const distance of [.1,.3,.5,.8]){const sample={pose,heading:45,distance,blend:1};loc.apply({...sample,blend:pose.prone?0:1});posture.apply(sample);posture.ground();assert.ok(worker.diagnostics().min[1]>=.0119);}
  assert.equal(new Set(signatures).size,5,'casualty/stance silhouettes must differ');
  loc.apply({heading:0,distance:0,blend:0,pose:{}});assert.equal(worker.root.position.y,0);
  if(!profile.unarmed){const firing=createRifleFiring(worker,profile,posture),target=new T.Vector3(8,.4,3);
   for(const pose of [{kneel:1},{prone:1}]){const sample={pose,heading:0,distance:0,blend:0};const muzzle=firing.apply({aim:1,target,sample});assert.ok(muzzle.direction.angleTo(target.clone().sub(muzzle.origin))<.005,'low rifle must follow core endpoint');}
   for(const weapon of ['assault','smg','shotgun','sniper']){const old=equipment;equipment=createWeaponModel(weapon);worker.equipWeapon(equipment);old.dispose();for(const prone of [.25,.5,1])firing.apply({aim:0,target,sample:{pose:{prone},distance:.3,blend:1}});}
  }
 }finally{loc.dispose();equipment?.dispose();worker.dispose();}
});

test('group stances change every eligible merc, retain selection and report partial AP failures',()=>{
 const s=createGame(),members=s.units.filter(u=>u.team==='squad'),ids=new Set(members.map(u=>u.id));
 for(const stance of ['kneeling','prone','standing']){const result=setSelectionStance(s,ids,stance);assert.equal(result.changed.length,members.length);assert.equal(result.skipped.length,0);assert.ok(stanceSelection(s,ids,stance).all);}
 s.phase='player';members[0].stance='kneeling';members[1].ap=1;const ap=members.map(u=>u.ap),before=[...ids];
 const result=setSelectionStance(s,ids,'kneeling');assert.deepEqual(result.skipped,[members[1].name]);assert.equal(result.changed.length,members.length-2);
 assert.equal(members[0].ap,ap[0]);assert.equal(members[1].ap,1);for(const u of members.slice(2))assert.equal(u.ap,ap[members.indexOf(u)]-2);
 assert.equal(stanceSelection(s,ids,'kneeling').all,false);assert.deepEqual([...ids],before);
 s.queue=[{}];assert.equal(stanceSelection(s,ids,'prone').ready.length,0);assert.equal(setSelectionStance(s,ids,'prone').changed.length,0);
});
