import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createWeaponModel,WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {paintedBurnSupported,paintedOperatorSupported} from '../dist/tactics/painted-fire-state.js';
import {BattleFire} from '../dist/tactics/battle-fire.js';
import {BattleCombat} from '../dist/tactics/battle-combat.js';
import {BattleMotion} from '../dist/tactics/battle-motion.js';
import {recordBurn,firePoint} from '../dist/tactics/fire-events.js';

const data=new Map(profiles.map(p=>[p.id,JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))]));
const camera=new T.PerspectiveCamera();camera.position.set(20,15,20);
function model(profile,id='rifle'){
 const worker=profile.create(data.get(profile.id)),root=new T.Group();root.add(worker.root);
 const paint={material:new T.MeshStandardMaterial(),setGripForearm(){}},posture=createBattlePosture(worker,profile),locomotion=createWorkerLocomotion(worker,profile);
 for(const part of worker.parts)part.material=paint.material;
 const equipment=profile.unarmed?null:createWeaponModel(id);if(equipment)worker.equipWeapon(equipment);
 return {worker,root,profile,paint,posture,locomotion,equipment,weapon:profile.unarmed?undefined:id,dispose(){this.locomotion?.dispose();equipment?.dispose();worker.dispose();paint.material.dispose();}};
}
function setup(profile,id='rifle'){
 const u={id:0,species:profile.id,team:'squad',stance:'standing',weapon:id,x:10,y:12,z:0,heading:90,hp:100,burningTurns:3};
 const state={units:[u],detected:new Set(),visible:new Set()},r={scene:new T.Scene(),loader:{loadAsync:async()=>new T.Texture()},diagnostics:[],motion:new BattleMotion(),traversal:{active:null},flameEffects:{update(){}}};
 return {u,state,r,f:new BattleFire(r),c:new BattleCombat(),m:model(profile,id)};
}

test('all catalog animals can burn; only the authored eleven mammals can operate flamethrowers',()=>{
 for(const p of profiles){const u={species:p.id,weapon:'flamethrower'};assert.ok(paintedBurnSupported(u));assert.equal(paintedOperatorSupported(u),!p.unarmed);assert.equal(paintedBurnSupported({...u,stance:'prone'}),false);}
 assert.equal(paintedOperatorSupported({species:'donkey',outfit:'blue-hawaiian',weapon:'flamethrower'}),false);
 assert.equal(paintedBurnSupported({species:'unknown'}),false);
});

for(const p of profiles)test(p.id+': survivors preserve every loadout and restore walking after live panic and ash',async()=>{
 for(const id of p.unarmed?['hands']:Object.keys(WEAPON_MODELS)){
  const {u,state,r,f,c,m}=setup(p,id);await f.ready;
  try{
   recordBurn(state,u,'ignite');f.observe(state,c,0,false,0);
   for(const t of [200,800,1800,4500]){assert.ok(f.pose(m,u,null,t,state,camera),r.diagnostics.join(';'));const d=f.sessions.get(0).motion.diagnostics();assert.equal(d.drop,null);assert.equal(d.state.collapse,0);assert.ok(m.worker.parts.every(p=>p.visible));if(p.unarmed)assert.equal(d.support,null,'living hen tipped over');}
   const from=firePoint(u);u.x++;u.y++;u.heading=45;recordBurn(state,u,'panic',[from,firePoint(u)]);f.observe(state,c,5000,false,0);
   for(const t of [5050,5700,6500])assert.ok(f.pose(m,u,null,t,state,camera),r.diagnostics.join(';'));
   u.burningTurns=0;f.observe(state,c,9000,false,0);assert.equal(f.sessions.size,0);assert.ok(m.locomotion);
   m.locomotion.apply({distance:.6,blend:1,heading:90,pose:{}});m.posture.apply({pose:{}});
   for(const part of m.worker.parts){const a=part.geometry.attributes.skinIndex;for(const i of a.array)assert.ok(i<part.skeleton.bones.length,'skin references a retired skeleton');}
   // A later fatal hit uses the same unit and rig, including nonzero heading.
   u.hp=0;recordBurn(state,u,'ash');f.observe(state,c,10000,false,0);assert.ok(f.pose(m,u,null,11000,state,camera));await Promise.resolve();
   assert.ok(f.pose(m,u,null,16000,state,camera));const session=f.sessions.get(0);assert.ok(session.effects.ash.visible);assert.ok(m.worker.parts.every(p=>!p.visible));
   if(p.unarmed){const q=session.motion.groundPoint(5.4,session.playback.route);assert.ok(session.effects.ash.position.distanceTo(new T.Vector3(q.x,q.y,q.z))<1e-8);assert.ok(session.effects.ash.position.distanceTo(new T.Vector3(u.x,0,u.y))>.2,'hen ash did not follow her sideways fall');}
   assert.deepEqual(r.diagnostics,[]);
  }finally{f.dispose();m.dispose();}
 }
});

test('hen fire interruption and repeated restarts retire temporary rigs and restore the original walking pose',async()=>{
 const p=profiles.find(p=>p.id==='hen'),{u,state,r,f,c,m}=setup(p,'hands'),control=model(p,'hands');await f.ready;
 const sample={distance:.42,blend:1,heading:123,pose:{}},snapshot=w=>w.parts.map(part=>part.getVertexPosition(0,new T.Vector3()).applyMatrix4(part.matrixWorld).toArray());
 try{
  control.locomotion.apply(sample);const expected=snapshot(control.worker);
  for(const stop of ['extinguished','hidden','casualty','weapon','floor','reduced','traversal']){
   Object.assign(u,{hp:100,team:'squad',weapon:'hands',burningTurns:3});delete u.burnedRemains;recordBurn(state,u,'ignite');f.observe(state,c,0,false,0);assert.ok(f.pose(m,u,null,500,state,camera));await Promise.resolve();
   if(stop==='extinguished')u.burningTurns=0;if(stop==='hidden')u.away=true;if(stop==='casualty')u.hp=0;if(stop==='weapon')u.weapon='rifle';if(stop==='traversal')r.traversal.active={event:{unitId:u.id}};
   f.observe(state,c,2000,stop==='reduced',stop==='floor'?1:0);assert.equal(f.sessions.size,0,stop);
   m.locomotion.apply(sample);const actual=snapshot(m.worker);for(let i=0;i<actual.length;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(actual[i][j]-expected[i][j])<1e-7,stop+' changed walking skin');
   const thighs=[];m.worker.root.traverse(o=>{if(o.name.startsWith('thigh '))thighs.push(o);});assert.equal(thighs.length,2,'temporary thighs leaked');u.away=false;r.traversal.active=null;f.clear();
  }
  assert.deepEqual(r.diagnostics,[]);
 }finally{f.dispose();m.dispose();control.dispose();}
});

test('fatal breakup covers separate hats and grip materials and restores their shader hooks',async()=>{
 const {u,state,f,c,m}=setup(profiles[0],'hmg');await f.ready;
 const hat=new T.Mesh(new T.BoxGeometry(.2,.1,.2),new T.MeshStandardMaterial());m.worker.bones.find(b=>b.name==='head').add(hat);const compile=hat.material.onBeforeCompile,key=hat.material.customProgramCacheKey;
 try{u.hp=0;recordBurn(state,u,'ash');f.observe(state,c,0,false,0);assert.ok(f.pose(m,u,null,900,state,camera));assert.notEqual(hat.material.onBeforeCompile,compile);await Promise.resolve();assert.ok(f.pose(m,u,null,6000,state,camera));assert.equal(hat.visible,false);f.clear();assert.equal(hat.material.onBeforeCompile,compile);assert.equal(hat.material.customProgramCacheKey,key);assert.equal(hat.visible,true);}finally{f.dispose();hat.removeFromParent();hat.geometry.dispose();hat.material.dispose();m.dispose();}
});

test('all authored operators use painted timing and release held casualties at flame impact',()=>{
 for(const p of profiles.filter(p=>!p.unarmed)){
  const u={id:0,species:p.id,team:'squad',weapon:'flamethrower',hp:100,x:10,y:12,z:0},victim={...u,id:1},state={units:[u,victim],detected:new Set()},c=new BattleCombat();c.observe(state,0);victim.hp=0;
  state.effect={shooter:0,ax:10,ay:12,flame:{},downed:[1]};c.observe(state,10);assert.ok(c.active.paintedFire);c.advance(649);assert.ok(c.held.has(1));c.advance(650);assert.equal(c.held.has(1),false);c.advance(2110);assert.equal(c.busy,false);
 }
});
