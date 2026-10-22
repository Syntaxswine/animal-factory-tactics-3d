import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BattleBlood,bloodClipPlanes} from '../dist/tactics/battle-blood.js';
import {BloodSprayPool,BLOOD_EMITTER_LIMIT,BLOOD_PARTICLE_LIMIT} from '../dist/tactics/blood-spray-pool.js';
import {BloodStainBatches,BLOOD_STAIN_ACTORS,BLOOD_STAINS_PER_ACTOR,STAIN_VERTICES} from '../dist/tactics/blood-stain-batches.js';
import {gunshotSprayFrame,poseGunshotVictim} from '../dist/tactics/gunshot-spray-frame.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {normalizeSettings,readSettings,saveSettings} from '../dist/tactics/settings-3d.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {blankMap,edgeKey} from '../dist/tactics/core/maps.js';
import {BattleShotEffects} from '../dist/tactics/battle-shot-effects.js';
import {GunshotImpactDebug} from '../dist/tactics/gunshot-impact-debug.js';
import {projectBloodStain} from '../dist/tactics/painted-blood-stain.js';

const fixture=JSON.parse(fs.readFileSync(new URL('../dist/tactics/fixtures/gunshot-impacts.v1.json',import.meta.url))),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function model(receipt){
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===receipt.victim.species),worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),root=new T.Group();root.add(worker.root);
 return {profile,worker,root,posture:createBattlePosture(worker,profile),locomotion:createWorkerLocomotion(worker,profile)};
}
function release(m){m.locomotion.dispose();m.worker.skeleton.dispose();m.worker.dispose();m.root.removeFromParent();}
function scenario(name='torso',options={}){
 const receipt=structuredClone(fixture.cases.find(c=>c.id===name).actions[0].bodyImpacts[0]),scene=new T.Scene(),m=model(receipt),textures=[new T.Texture(),new T.Texture()];scene.add(m.root);
 const blood=new BattleBlood(scene,{textures,...options}),victim={id:receipt.victimId,team:'guard',hp:receipt.hpAfter,maxHp:receipt.maxHp,x:receipt.victim.x,y:receipt.victim.y,z:receipt.victim.z,casualty:receipt.casualtyAfter};
 const state={definition:{},phase:'player',units:[victim],detected:new Set([victim.id]),visible:new Set(),concealedInteriors:new Set(),seed:983};
 for(let x=victim.x-2;x<=victim.x+2;x++)for(let y=victim.y-2;y<=victim.y+2;y++)state.visible.add(victim.z?`${x},${y},${victim.z}`:`${x},${y}`);
 const active={phase:{discharged:true,impact:true,trace:true},knownUnitIds:[victim.id],shooterVisible:false,event:{shooter:receipt.shooterId,bodyImpacts:[receipt],trajectories:[{...receipt.contact,kind:'unit',unitId:victim.id,projectileId:receipt.projectileId,origin:receipt.origin}],ax:10,ay:10}};
 const camera=new T.PerspectiveCamera();camera.position.set(victim.x-4,5,victim.y+3);camera.lookAt(victim.x,1,victim.y);camera.updateMatrixWorld(true);
 return {receipt,scene,m,blood,state,active,camera,dispose(){blood.dispose();release(m);}};
}

test('live receipts are captured once at discharge, including a visible victim of an unseen shooter',()=>{
 const s=scenario();try{
  const before=structuredClone(s.state),event=structuredClone(s.active.event);s.active.phase.discharged=false;s.blood.begin(s.active,s.state,0);assert.equal(s.blood.capture(s.receipt.victimId,s.m),false);
  s.active.phase.discharged=true;s.blood.begin(s.active,s.state,380);assert.equal(s.blood.capture(s.receipt.victimId,s.m),true);const drawn=s.blood.update(445,s.camera);
  assert.ok(drawn.liveCards>0);assert.equal(drawn.drawCalls,1);assert.equal(s.blood.pool.active,1);assert.equal(s.blood.stains.slots.filter(x=>x.owner!==null).length,1);
  s.blood.begin(s.active,s.state,445);assert.equal(s.blood.capture(s.receipt.victimId,s.m),false);assert.equal(s.blood.pool.active,1);
  assert.deepEqual(s.state,before);assert.deepEqual(s.active.event,event);
 }finally{s.dispose();}
});

test('ordinary sprays outlive the trace without blocking the queue, pause with presentation time and retire',()=>{
 const s=scenario();try{
  s.blood.begin(s.active,s.state,0);s.blood.capture(s.receipt.victimId,s.m);s.blood.update(65,s.camera);
  const matrix=Array.from(s.blood.pool.effect.mesh.instanceMatrix.array);s.blood.update(65,s.camera);assert.deepEqual(Array.from(s.blood.pool.effect.mesh.instanceMatrix.array),matrix);
  s.blood.begin(null,s.state,300);assert.ok(s.blood.update(300,s.camera).liveCards>0,'A 260-ms non-rifle shot may end before its spray');
  s.blood.update(500,s.camera);assert.equal(s.blood.pool.active,0);assert.equal(s.blood.pool.effect.mesh.visible,false);
 }finally{s.dispose();}
});

test('hidden, undiscovered or concealed impacts are consumed without a later replay',()=>{
 for(const hide of [s=>s.state.visible.clear(),s=>s.state.detected.clear(),s=>{s.active.knownUnitIds=[];},s=>s.state.concealedInteriors=new Set(s.state.visible)]){
  const s=scenario();try{
   hide(s);s.blood.begin(s.active,s.state,0);assert.equal(s.blood.capture(s.receipt.victimId,s.m),false);
   s.state.detected.add(s.receipt.victimId);s.active.knownUnitIds=[s.receipt.victimId];s.state.concealedInteriors.clear();s.state.visible.add('16,10');
   s.blood.begin(s.active,s.state,50);assert.equal(s.blood.capture(s.receipt.victimId,s.m),false);assert.equal(s.blood.pool.active,0);
  }finally{s.dispose();}
 }
});

test('all six layers use current fog for particles and Off never replays removed effects',()=>{
 const s=scenario('layer-six');try{
  s.blood.begin(s.active,s.state,0);s.blood.capture(s.receipt.victimId,s.m);assert.ok(s.blood.update(65,s.camera).liveCards>0);
  s.state.visible.clear();assert.equal(s.blood.update(65,s.camera).liveCards,0);s.state.visible.add('16,10,5');assert.ok(s.blood.update(65,s.camera).liveCards>0);
  s.blood.setMode('off');assert.equal(s.blood.pool.active,0);assert.ok(s.blood.stains.slots.every(x=>x.owner===null));
  s.blood.setMode('full');s.blood.begin(s.active,s.state,80);assert.equal(s.blood.capture(s.receipt.victimId,s.m),false);
 }finally{s.dispose();}
});

test('reduced particles and reduced motion are independent; all modes preserve the same damage and RNG',()=>{
 let result;
 for(const mode of ['full','reduced','off'])for(const reducedMotion of [false,true]){
  const s=scenario('nonfatal-head',{mode});try{
   const before=structuredClone(s.state);s.blood.begin(s.active,s.state,0,{reducedMotion});s.blood.capture(s.receipt.victimId,s.m);const stats=s.blood.update(65,s.camera);
   assert.deepEqual(s.state,before);if(result)assert.deepEqual(s.state.seed,result.seed);result=before;
   if(mode==='off'){assert.equal(stats.liveCards,0);continue;}
   assert.ok(stats.liveCards<=(reducedMotion?1:mode==='reduced'?5:18));assert.ok(stats.liveCards>0);
   if(reducedMotion)assert.ok(Array.from(s.blood.pool.slots[0].motion.buffer.launch).every(v=>v===0));
  }finally{s.dispose();}
 }
});

test('a gap correction connects the visible trace to actual skin and creates no empty-air stain',()=>{
 const s=scenario('legs'),effects=new BattleShotEffects(s.scene);try{
  s.blood.begin(s.active,s.state,0);s.blood.capture(s.receipt.victimId,s.m);const contact=s.active.bodyVisualContacts.get(s.receipt.projectileId);assert.ok(contact);assert.ok(s.blood.stains.slots[0].patches.length);
  effects.update(s.active,s.state,null);assert.equal(effects.impact.visible,false);const p=effects.trace.geometry.attributes.position,n=effects.trace.geometry.drawRange.count;assert.ok(V(p.getX(n-1),p.getY(n-1),p.getZ(n-1)).distanceTo(contact)<1e-5);
  const absent=scenario();try{for(const part of absent.m.worker.parts)part.visible=false;absent.blood.begin(absent.active,absent.state,0);absent.blood.capture(absent.receipt.victimId,absent.m);assert.equal(absent.blood.pool.active,0);assert.ok(absent.blood.stains.slots.every(x=>x.owner===null));effects.update(absent.active,absent.state,null);assert.equal(effects.impact.visible,true,'No matching painted surface keeps the generic impact feedback');}finally{absent.dispose();}
 }finally{effects.dispose();s.dispose();}
});

test('the shared spray pool never exceeds twelve emitters or 216 cards and reuses all resources',()=>{
 const s=scenario(),p=s.blood.pool,f=gunshotSprayFrame(s.receipt),geometry=p.effect.mesh.geometry,matrices=p.effect.mesh.instanceMatrix,buffer=p.buffer;
 try{
  for(let cycle=0;cycle<50;cycle++){
   for(let i=0;i<30;i++)assert.equal(p.spawn(f,cycle*1000,{seed:i}),i<BLOOD_EMITTER_LIMIT);
   const stats=p.update(cycle*1000+65,s.camera);assert.ok(stats.liveCards<=BLOOD_PARTICLE_LIMIT);assert.equal(stats.drawCalls,1);assert.equal(p.active,BLOOD_EMITTER_LIMIT);
   assert.equal(p.effect.mesh.geometry,geometry);assert.equal(p.effect.mesh.instanceMatrix,matrices);assert.equal(p.buffer,buffer);p.clear();assert.equal(p.effect.mesh.visible,false);
  }
 }finally{s.dispose();}
});

test('entry patches merge under a global two-actor limit, retain skin weights and follow changed poses',()=>{
 const s=scenario(),b=s.blood.stains,models=[];try{
  for(let i=0;i<5;i++){
   const r=structuredClone(s.receipt);r.victimId=i;const m=model(r);models.push(m);s.scene.add(m.root);poseGunshotVictim(m,r);const f=gunshotSprayFrame(r,{model:{victimId:i,parts:m.worker.parts}});
   for(let hit=0;hit<8;hit++)assert.ok(b.stamp(i,m.worker,f,i*100+hit));
  }
  assert.equal(b.slots.filter(x=>x.owner!==null).length,BLOOD_STAIN_ACTORS);assert.ok(b.slots.every(x=>x.patches.length===BLOOD_STAINS_PER_ACTOR));
  assert.ok(b.slots.every(x=>x.mesh.geometry.attributes.position.count===STAIN_VERTICES));assert.deepEqual(b.slots.map(x=>x.owner).sort(),[3,4]);
  const slot=b.slots.find(x=>x.owner===4),m=models[4],source=slot.patches[0].source,vertex=slot.patches[0].data.selected[0];
  m.posture.apply({heading:90,distance:0,blend:0,pose:{kneel:1}});m.root.updateMatrixWorld(true);m.worker.skeleton.update();for(const p of m.worker.parts)p.computeBoundingBox();b.sync();
  assert.ok(slot.mesh.getVertexPosition(0,V()).applyMatrix4(slot.mesh.matrixWorld).distanceTo(source.getVertexPosition(vertex,V()).applyMatrix4(source.matrixWorld))<1e-6);
  b.reduce();assert.equal(b.slots.filter(x=>x.owner!==null).length,1);
 }finally{s.dispose();for(const m of models)release(m);}
});

test('battle end, reset and disposal clear stains without owning a character skeleton or material',()=>{
 const s=scenario();let skeletons=0,materials=0,textures=0;const original=s.m.worker.skeleton.dispose.bind(s.m.worker.skeleton);s.m.worker.skeleton.dispose=()=>{skeletons++;original();};s.m.worker.parts[0].material.addEventListener('dispose',()=>materials++);for(const t of s.blood.textures)t.addEventListener('dispose',()=>textures++);
 try{
  s.blood.begin(s.active,s.state,0);s.blood.capture(s.receipt.victimId,s.m);s.state.phase='won';s.blood.begin(null,s.state,300,{busy:false});assert.ok(s.blood.stains.slots.every(x=>x.owner===null));
  s.blood.clear();assert.equal(s.blood.pool.active,0);assert.equal(s.blood.seen.size,0);s.blood.dispose();s.blood.dispose();assert.equal(textures,2);assert.equal(skeletons,0);assert.equal(materials,0);assert.equal(s.scene.children.length,1);
 }finally{s.dispose();}
});

test('optional asset failure and late completion after disposal release every loaded texture',async()=>{
 let ended=0,failed=0;const texture=new T.Texture();let disposed=0;texture.addEventListener('dispose',()=>disposed++);
 const blood=new BattleBlood(new T.Scene(),{loader:{loadAsync:url=>url.includes('stains')?Promise.reject(Error('test missing skin')):Promise.resolve(texture)},loading:{start(){},end(){ended++;}},onError:()=>failed++});await blood.ready;assert.equal(ended,1);assert.equal(failed,1);assert.equal(disposed,1);blood.dispose();
 let resolve;const late=new T.Texture();let retired=0;late.addEventListener('dispose',()=>retired++);const other=new T.Texture();other.addEventListener('dispose',()=>retired++);
 const fatal=new T.Texture();fatal.addEventListener('dispose',()=>retired++);
 const pending=new BattleBlood(new T.Scene(),{loader:{loadAsync:url=>url.includes('fatal-head')?Promise.resolve(fatal):url.includes('stains')?Promise.resolve(other):new Promise(r=>resolve=r)}});pending.dispose();resolve(late);await pending.ready;assert.equal(retired,3);
});

test('inspection pause requests happen once per discharge and cannot change the combat record',()=>{
 const s=scenario(),debug=new GunshotImpactDebug(s.scene,{enabled:true,document:null});debug.freezeInput={checked:true};
 try{
  const before=structuredClone(s.state);s.active.event.dischargeId='shot:1/d:0';s.blood.begin(s.active,s.state,0);s.blood.capture(s.receipt.victimId,s.m);s.blood.update(65,s.camera);debug.update(s.active,s.state,s.blood);
  assert.equal(debug.consumePause(),true);assert.equal(debug.consumePause(),false);debug.update(s.active,s.state,s.blood);assert.equal(debug.consumePause(),false);
  s.active.event.dischargeId='shot:1/d:1';debug.update(s.active,s.state,s.blood);assert.equal(debug.consumePause(),true);assert.deepEqual(s.state,before);
 }finally{debug.dispose();s.dispose();}
});

test('shotgun pellets share a bounded retained stain while every physical contact can emit its own spray',()=>{
 const s=scenario('shotgun');try{
  s.active.event.bodyImpacts=structuredClone(fixture.cases.find(c=>c.id==='shotgun').actions[0].bodyImpacts);
  s.blood.begin(s.active,s.state,0);s.blood.capture(s.receipt.victimId,s.m);assert.equal(s.blood.pool.active,6);assert.equal(s.blood.stains.slots[0].patches.length,1);
 }finally{s.dispose();}
});

test('nearby solid walls clip spray travel using cached world geometry',()=>{
 const map=blankMap(),r=structuredClone(fixture.cases[0].actions[0].bodyImpacts[0]);map.edges[edgeKey('e',15,10,0)]='wall';
 const f=gunshotSprayFrame(r),planes=bloodClipPlanes(buildWorld(map),f);assert.ok(planes.length);assert.ok(planes.some(p=>p.normal.dot(f.contact.clone().addScaledVector(f.outgoing,.72))-p.constant<0));
});

test('blood preferences normalize old saves and persist alongside existing player settings',()=>{
 assert.equal(normalizeSettings({}).blood,'full');assert.equal(normalizeSettings({blood:'bad'}).blood,'full');let storage;const previous=globalThis.localStorage;
 try{globalThis.localStorage={getItem:()=>storage,setItem:(k,v)=>storage=v};for(const blood of ['full','reduced','off']){assert.ok(saveSettings({...normalizeSettings({difficulty:'standard'}),blood}));assert.equal(readSettings().blood,blood);assert.equal(readSettings().difficulty,'standard');}}
 finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('reused stain projection buffers always use the current pose and world placement',()=>{
 const s=scenario();try{
  poseGunshotVictim(s.m,s.receipt);const f=gunshotSprayFrame(s.receipt,{model:{victimId:s.receipt.victimId,parts:s.m.worker.parts}}),options={source:f.surfaceSource,point:f.contact,normal:f.normal};
  const first=projectBloodStain(options);assert.ok(first);s.m.root.position.x+=5;s.m.root.updateMatrixWorld(true);s.m.worker.skeleton.update();
  assert.equal(projectBloodStain(options),null,'An old contact cannot paint a moved body');
  const moved=projectBloodStain({...options,point:f.contact.clone().add(V(5,0,0))});assert.deepEqual(moved.selected,first.selected);
 }finally{s.dispose();}
});
