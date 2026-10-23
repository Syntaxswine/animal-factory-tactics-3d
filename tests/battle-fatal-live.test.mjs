import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createWeaponModel,WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
import {createOffhandEquipment} from '../dist/tactics/offhand-equipment.js';
import {CharacterBatches} from '../dist/tactics/character-batches.js';
import {prepareFatalHead,ensureFatalHead,presentFatalHead} from '../dist/tactics/battle-fatal-head.js';
import {BattleRenderer} from '../dist/tactics/battle-renderer.js';
import {BattleBlood} from '../dist/tactics/battle-blood.js';
import {BattleMotion} from '../dist/tactics/battle-motion.js';
import {BattleCombat} from '../dist/tactics/battle-combat.js';
import {BattleWeaponDrops} from '../dist/tactics/battle-weapon-drops.js';
import {createCasualtyWeaponSnapshot} from '../dist/tactics/casualty-weapon-assembly.js';
import {gunshotSprayFrame,poseGunshotVictim} from '../dist/tactics/gunshot-spray-frame.js';
import {DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {resolveImpactCase} from '../tools/gunshot-impact-cases.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('../dist/tactics/fixtures/gunshot-impacts.v1.json',import.meta.url)));
test('enabling Full after an Off start prepares a late fatal atlas once, while a missing atlas keeps the ordinary model',()=>{
 const a=actor(),model=a.model,old=model.fatalMask,texture=new T.Texture();try{
  old.dispose();model.fatalMask=null;assert.equal(ensureFatalHead(model,undefined),null);
  const prepared=ensureFatalHead(model,texture);assert.ok(prepared);assert.equal(ensureFatalHead(model,texture),prepared);
  prepared.setDestroyed(true);assert.equal(prepared.destroyed,true);prepared.setDestroyed(false);assert.equal(prepared.destroyed,false);
 }finally{model.fatalMask??=old;a.dispose();texture.dispose();}
});
const receipt=name=>structuredClone(fixture.cases.find(c=>c.id===name).actions[0].bodyImpacts[0]);
function actor(species='pig-foreman',weapon='rifle'){
 const profile=profiles.find(p=>p.id===species),worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),root=new T.Group(),material=new T.MeshBasicMaterial();root.add(worker.root);
 for(const p of worker.parts)p.material=material;
 const equipment=profile.unarmed?null:createWeaponModel(weapon);if(equipment)worker.equipWeapon(equipment);
 const model={profile,worker,root,paint:{},equipment,weapon,posture:createBattlePosture(worker,profile),locomotion:createWorkerLocomotion(worker,profile),offhand:createOffhandEquipment(worker),batches:new CharacterBatches(worker,root)};
 const texture=new T.Texture();model.fatalMask=prepareFatalHead(model,texture);
 return {model,dispose(){model.batches.dispose();model.fatalMask.dispose();model.offhand.dispose();model.locomotion.dispose();equipment?.dispose();worker.dispose();texture.dispose();material.dispose();}};
}
function stateFor(unit){const state={definition:{},phase:'player',units:[unit],detected:new Set([unit.id]),visible:new Set(),concealedInteriors:new Set(),loot:[],seed:123};for(let x=unit.x-3;x<=unit.x+3;x++)for(let y=unit.y-3;y<=unit.y+3;y++)state.visible.add(unit.z?`${x},${y},${unit.z}`:`${x},${y}`);return state;}
function unitFrom(r){return {id:r.victimId,team:'guard',name:'Review guard',species:r.victim.species,x:r.victim.x,y:r.victim.y,z:r.victim.z,heading:r.victim.heading,stance:r.victim.stance,hp:r.hpBefore,maxHp:r.maxHp,weapon:'rifle',slots:['rifle'],pack:[{type:'weapon',kind:'rifle',loaded:3}]};}
function live(unit){
 const a=actor(unit.species,unit.weapon),r=Object.create(BattleRenderer.prototype),scene=new T.Scene();scene.add(a.model.root);
 Object.assign(r,{models:new Map([[unit.id,a.model]]),state:stateFor(unit),scene,motion:new BattleMotion(),combat:new BattleCombat(),traversal:{active:null,preparing:false},grenades:{prepareActor(){},pose(){return false;},afterActor(){}},fire:{pose(){return false;},remove(){}},diagnostics:[],camera:new T.PerspectiveCamera(),reducedMotion:{matches:false},presentationNow:0});
 r.blood=new BattleBlood(scene,{textures:[new T.Texture(),new T.Texture(),new T.Texture()]});r.blood.warmed=true;r.weaponDrops=new BattleWeaponDrops(scene,{onError:m=>r.diagnostics.push(m)});
 return {r,model:a.model,draw(now){r.presentationNow=now;r.motion.update([unit],now,r.reducedMotion.matches);r.actor(unit);a.model.batches.sync();r.weaponDrops.update(r.state,now);r.blood.update(now,r.camera);},dispose(){r.weaponDrops.dispose();r.blood.dispose();a.dispose();}};
}

for(const p of profiles)test(p.id+': merged live batches contain the masked triangles and restore the original geometry',()=>{
 const a=actor(p.id);try{
  const m=a.model,original=m.worker.parts.map(p=>p.geometry),state={id:4,hp:0,casualty:'dead',fatalHead:{version:1,impactId:'shot:1/d:0/p:0/body:4'}};
  m.worker.pose('neutral');m.root.updateMatrixWorld(true);for(const part of m.worker.parts){part.skeleton.update();part.computeBoundingBox();}
  m.batches.sync();const before=[...m.batches.groups.values()].reduce((n,g)=>n+g.mesh.geometry.drawRange.count,0);
  presentFatalHead(m,state,'full',()=>m.root);for(const part of m.worker.parts)part.computeBoundingBox();m.batches.sync();
  assert.equal(m.fatalMask.destroyed,true);const source=m.worker.parts.reduce((n,p)=>n+(p.geometry.index?.count??p.geometry.attributes.position.count),0),submitted=[...m.batches.groups.values()].reduce((n,g)=>n+g.mesh.geometry.drawRange.count,0);assert.equal(submitted,source);assert.ok(submitted<before);
  for(const g of m.batches.groups.values())assert.ok(Array.from(g.mesh.geometry.attributes.position.array).every(Number.isFinite));
  presentFatalHead(m,state,'off',()=>m.root);m.batches.sync();assert.deepEqual(m.worker.parts.map(p=>p.geometry),original);assert.equal([...m.batches.groups.values()].reduce((n,g)=>n+g.mesh.geometry.drawRange.count,0),before);
 }finally{a.dispose();}
});

test('live casualty playback hides the held gun, shows one independent release, and preserves all simulation data',()=>{
 const rcp=receipt('fatal-head'),unit=unitFrom(rcp),f=live(unit);try{
  f.draw(0);const matrix=f.model.equipment.root.matrixWorld.clone();unit.hp=0;unit.casualty='dead';unit.fatalHead={version:1,impactId:rcp.id};const before=structuredClone(f.r.state);
  f.draw(10);assert.equal(f.model.fatalMask.destroyed,true);assert.equal(f.model.equipment.root.visible,false);assert.equal(f.r.weaponDrops.actors.size,1);const drop=f.r.weaponDrops.actors.get(unit.id).entries[0].visual;
  const oldPosition=drop.root.position.clone();f.model.root.position.x+=20;assert.ok(drop.root.position.distanceTo(oldPosition)<1e-10);assert.equal(drop.root.parent,f.r.scene);assert.ok(matrix.elements.every(Number.isFinite));
  f.draw(10);assert.equal(f.r.weaponDrops.actors.size,1);assert.deepEqual(f.r.state,before);f.draw(2000);assert.equal(f.r.weaponDrops.actors.size,0);assert.equal(f.model.equipment.root.visible,false);assert.deepEqual(f.r.state,before);assert.deepEqual(f.r.diagnostics,[]);
 }finally{f.dispose();}
});

test('saved fatal markers restore the selected appearance without a historical burst or weapon fall',()=>{
 const rcp=receipt('fatal-head'),unit=unitFrom(rcp);unit.hp=0;unit.casualty='dead';unit.fatalHead={version:1,impactId:rcp.id};const f=live(unit);try{
  const before=structuredClone(f.r.state);for(const mode of ['full','reduced','off','full']){f.r.blood.setMode(mode);f.draw(0);assert.equal(f.model.fatalMask.destroyed,mode==='full');assert.equal(f.model.equipment.root.visible,false);assert.equal(f.r.blood.pool.active+f.r.blood.fatalPool.active,0);assert.equal(f.r.weaponDrops.actors.size,0);assert.deepEqual(f.r.state,before);}
  delete unit.fatalHead;f.draw(0);assert.equal(f.model.fatalMask.destroyed,false,'An ordinary lethal casualty never qualifies by appearance');
 }finally{f.dispose();}
});

test('actual fatal receipts emit once, share the global 216-card budget, honor fog and keep reduced motion independent',()=>{
 for(const mode of ['full','reduced','off'])for(const still of [false,true]){
  const rcp=receipt('fatal-head'),unit=unitFrom(rcp),f=live(unit),blood=f.r.blood;try{
   blood.setMode(mode);const active={event:{bodyImpacts:[rcp]},phase:{discharged:false},knownUnitIds:[unit.id]},before=structuredClone(f.r.state);
   blood.begin(active,f.r.state,0,{reducedMotion:still});assert.equal(blood.capture(unit.id,f.model),false);
   active.phase.discharged=true;blood.begin(active,f.r.state,1,{reducedMotion:still});blood.capture(unit.id,f.model);const stats=blood.update(66,f.r.camera);
   assert.equal(blood.fatalPool.active,mode==='full'?1:0);assert.equal(blood.pool.active,mode==='reduced'?1:0);assert.ok(stats.liveCards<=(mode==='off'?0:still?1:mode==='full'?48:5));if(mode!=='off')assert.ok(stats.liveCards>0);
   const frozen=Array.from((mode==='full'?blood.fatalPool:blood.pool).effect.mesh.instanceMatrix.array);blood.update(66,f.r.camera);assert.deepEqual(Array.from((mode==='full'?blood.fatalPool:blood.pool).effect.mesh.instanceMatrix.array),frozen);
   blood.setMode('off');blood.setMode('full');blood.begin(active,f.r.state,80);assert.equal(blood.capture(unit.id,f.model),false);assert.deepEqual(f.r.state,before);
  }finally{f.dispose();}
 }
 const rcp=receipt('fatal-head'),unit=unitFrom(rcp),f=live(unit),blood=f.r.blood;try{
  for(let i=0;i<12;i++){const r=structuredClone(rcp);r.id+=':'+i;const active={event:{bodyImpacts:[r]},phase:{discharged:true},knownUnitIds:[unit.id]};blood.begin(active,f.r.state,0);blood.capture(unit.id,f.model);}
  assert.ok(blood.pool.active*18+blood.fatalPool.active*48<=216);assert.ok(blood.pool.active+blood.fatalPool.active<=12);
  f.r.state.visible.clear();assert.equal(blood.update(65,f.r.camera).liveCards,0);blood.update(1000,f.r.camera);assert.equal(blood.fatalPool.active,0);
 }finally{f.dispose();}
});

test('head-local merged stains are removed while body paint and original source resources survive the mask',()=>{
 const head=receipt('nonfatal-head'),body=receipt('torso'),unit=unitFrom(head),f=live(unit),blood=f.r.blood;for(const key of ['id','attackId','dischargeId','projectileId'])head[key]=head[key].replace('shot:1','shot:2');try{
  for(const r of [body,head]){const active={event:{bodyImpacts:[r]},phase:{discharged:true},knownUnitIds:[unit.id]};blood.begin(active,f.r.state,0);blood.capture(unit.id,f.model);}
  assert.equal(blood.stains.slots[0].patches.length,2);const bodyPatch=blood.stains.slots[0].patches.find(p=>p.region==='torso');unit.hp=0;unit.casualty='dead';unit.fatalHead={version:1,impactId:head.id};f.draw(10);
  const slot=blood.stains.slots.find(s=>s.owner===unit.id);assert.ok(slot);assert.deepEqual(slot.patches,[bodyPatch]);assert.ok(slot.mesh.geometry.drawRange.count>0);assert.ok(Array.from(slot.mesh.geometry.attributes.position.array).every(Number.isFinite));
 }finally{f.dispose();}
});

test('matching discharge, including first-observed fatalities, controls when the saved death becomes visible',()=>{
 const c=resolveImpactCase({weapon:'rifle',zone:'head',hp:20,maxHp:45,fatal:true}),state=c.state,victim=c.target,r=c.impacts[0];state.visible.add('16,10');state.detected.add(victim.id);
 const combat=new BattleCombat(),before=structuredClone(state);combat.observe(state,0);assert.equal(combat.display(victim).hp,r.hpBefore);assert.equal(combat.display(victim).fatalHead,undefined);combat.advance(380);assert.deepEqual(combat.display(victim).fatalHead,victim.fatalHead);assert.deepEqual(state,before);
});

test('an impact on an already stabilized casualty cannot stand its body up for blood placement',()=>{
 const r=receipt('nonfatal-head'),a=actor(r.victim.species);try{poseGunshotVictim(a.model,r);const source=a.model.worker.parts.find(p=>p.name===a.model.fatalMask.primaryName),standing=source.boundingBox.max.y;r.hpBefore=0;r.casualtyBefore='stable';poseGunshotVictim(a.model,r);assert.ok(source.boundingBox.max.y<standing-.5);assert.ok(source.boundingBox.max.y<1,'The head is on the fallen body, not at standing height');}finally{a.dispose();}
});

test('every weapon assembly preserves its displayed vertices, batches material draws and lands before fading on raised floors',()=>{
 for(const id of Object.keys(WEAPON_MODELS).filter(id=>id!=='hands')){
  const gun=createWeaponModel(id),host=new T.Group();host.add(gun.root);if(gun.mount)host.add(gun.mount);if(gun.hose){host.add(gun.hose);gun.updateHose(host);}host.position.set(9,5*DIMENSIONS.floorSpacing+1.5,7);host.rotation.y=.7;host.updateMatrixWorld(true);
  let visual;try{visual=createCasualtyWeaponSnapshot(gun,{floor:5*DIMENSIONS.floorSpacing});assert.ok(visual,id);assert.ok(visual.drawCalls<=9,id);const release=visual.update(0),sourceBounds=new T.Box3(),proxyBounds=new T.Box3().setFromObject(visual.root,true);for(const root of visual.sourceRoots)sourceBounds.union(new T.Box3().setFromObject(root,true));assert.ok(sourceBounds.min.distanceTo(proxyBounds.min)<2e-6,id+' release lower surface');assert.ok(sourceBounds.max.distanceTo(proxyBounds.max)<2e-6,id+' release upper surface');assert.equal(release.opacity,1);assert.ok(release.minimumY>=5*DIMENSIONS.floorSpacing);for(const t of [release.flight,release.fadeStart,(release.duration+release.fadeStart)/2]){const s=visual.update(t);assert.ok(Math.abs(s.minimumY-s.floor)<1e-6,id);if(t<=release.fadeStart)assert.equal(s.opacity,1);}assert.equal(visual.update(release.duration).visible,false);assert.equal(gun.root.visible,true,'Cosmetic preparation cannot change the source');}
  finally{visual?.dispose();gun.dispose();}
 }
});

test('live standing, kneeling and prone horse loadouts release every equipped assembly without a floor correction',()=>{
 for(const weapon of Object.keys(WEAPON_MODELS).filter(id=>id!=='hands')){
  const unit={...unitFrom(receipt('fatal-head')),species:'horse',weapon,slots:[weapon],pack:[{type:'weapon',kind:weapon}]},f=live(unit);f.r.reducedMotion.matches=true;
  try{for(const [i,stance]of ['standing','kneeling','prone'].entries()){unit.hp=100;unit.stance=stance;unit.casualty=undefined;f.draw(i*3000);unit.hp=0;unit.casualty='dead';f.draw(i*3000+1);assert.equal(f.r.weaponDrops.actors.size,1,weapon+' '+stance+': '+f.r.diagnostics.join('; '));f.r.weaponDrops.clear();}}
  finally{f.dispose();}
 }
});

test('pickup, discovery, reset and the two-casualty budget cannot leave duplicate weapons or replay old drops',()=>{
 const rcp=receipt('fatal-head'),unit=unitFrom(rcp),f=live(unit);try{
  f.draw(0);const item=unit.pack[0];unit.hp=0;unit.casualty='dead';unit.pack=[];const pile={body:unit.id,items:[item]};f.r.state.loot.push(pile);f.draw(1);assert.equal(f.r.weaponDrops.actors.size,1);
  pile.items.splice(0,1);f.r.state.units.push({...unit,id:99,team:'squad',hp:100,pack:[item]});f.r.weaponDrops.update(f.r.state,2);assert.equal(f.r.weaponDrops.actors.size,0);assert.equal(f.r.state.units[1].pack.filter(i=>i===item).length,1);
  f.r.state.visible.clear();f.r.weaponDrops.update(f.r.state,3);f.r.state.visible.add(`${unit.x},${unit.y}`);f.draw(4);assert.equal(f.r.weaponDrops.actors.size,0);f.r.weaponDrops.clear();f.draw(5);assert.equal(f.r.weaponDrops.actors.size,0);
 }finally{f.dispose();}
});

test('dual sidearms release as two visual proxies under the two-actor cap, with no changes to item ownership',()=>{
 const scene=new T.Scene(),drops=new BattleWeaponDrops(scene),actors=[],units=[],state={definition:{},units,loot:[],visible:new Set(),detected:new Set()};
 try{
  for(let i=0;i<3;i++){const a=actor('horse','pistol'),u={...unitFrom(receipt('torso')),id:i,x:10+i,y:10,hp:100,weapon:'pistol',slots:['pistol','pistol-offhand'],pack:[{type:'weapon',kind:'pistol'},{type:'weapon',kind:'pistol-offhand'}]};actors.push(a);units.push(u);state.visible.add(`${u.x},10`);state.detected.add(i);a.model.worker.pose('carry');a.model.root.position.set(u.x,0,10);a.model.root.updateMatrixWorld(true);a.model.offhand.sync(u,{primary:a.model.equipment});drops.beforeActor(u,a.model,state,0);}
  for(let i=0;i<3;i++){units[i].hp=0;drops.beforeActor(units[i],actors[i].model,state,1);drops.afterActor(units[i],actors[i].model);assert.ok(drops.actors.size<=2);assert.equal(actors[i].model.equipment.root.visible,false);assert.equal(actors[i].model.offhand.gun.root.visible,false);}
  assert.equal(drops.actors.size,2);assert.equal([...drops.actors.values()].flatMap(a=>a.entries).length,4);assert.ok([...drops.actors.values()].every(a=>a.entries.reduce((n,e)=>n+e.visual.drawCalls,0)<=18));assert.equal(units.reduce((n,u)=>n+u.pack.length,0),6);
 }finally{drops.dispose();for(const a of actors)a.dispose();}
});

test('native heavy-weapon prone releases stay above the actual floor throughout the armed roster',()=>{
 for(const p of profiles.filter(p=>!p.unarmed))for(const weapon of ['hmg','rpg','flamethrower']){
  const unit={...unitFrom(receipt('torso')),species:p.id,weapon,stance:'prone',slots:[weapon],pack:[{type:'weapon',kind:weapon}]},f=live(unit);f.r.reducedMotion.matches=true;
  try{f.draw(0);unit.hp=0;unit.casualty='dead';f.draw(1);assert.equal(f.r.weaponDrops.actors.size,1,p.id+' '+weapon+': '+f.r.diagnostics.join('; '));}
  finally{f.dispose();}
 }
});

test('assembly disposal owns only its copied geometry/materials and live ash visibility is not reset by an inactive mask',()=>{
 const gun=createWeaponModel('flamethrower'),root=new T.Group();root.add(gun.root,gun.mount,gun.hose);gun.root.position.y=1;gun.mount.position.y=1;gun.updateHose(root);root.updateMatrixWorld(true);const visual=createCasualtyWeaponSnapshot(gun,{floor:0}),source=gun.parts[0],geometry=source.geometry,material=source.material;let sourceDisposed=0,privateDisposed=0;geometry.addEventListener('dispose',()=>sourceDisposed++);material.addEventListener('dispose',()=>sourceDisposed++);visual.root.traverse(m=>{if(m.isMesh)m.geometry.addEventListener('dispose',()=>privateDisposed++);});const privateCount=visual.drawCalls;visual.dispose();visual.dispose();assert.equal(sourceDisposed,0);assert.equal(privateDisposed,privateCount);gun.dispose();
 const a=actor();try{const head=a.model.worker.bones.find(b=>b.name==='head'),cap=new T.Mesh(new T.BoxGeometry(.1,.1,.1),a.model.worker.parts[0].material);head.add(cap);presentFatalHead(a.model,{id:1,hp:0,burnedRemains:true},'full',()=>{cap.visible=false;return a.model.root;});assert.equal(cap.visible,false);cap.geometry.dispose();cap.removeFromParent();}finally{a.dispose();}
});
