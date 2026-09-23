import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createLadderJourney} from '../dist/tactics/ladder-journey.js';
import {ladderFrame} from '../dist/tactics/battle-traversal.js';
import {towerEntry,towerSlots,towerPost,WOODEN_LADDER} from '../dist/tactics/tower-geometry.js';
import {buildWoodenGuardTower} from '../dist/tactics/wooden-guard-tower.js';
import {toWorld} from '../dist/tactics/hybrid-world.js';
const V=a=>new T.Vector3(...a),load=p=>p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));
function event(rotated=false,slot=0,direction='up',z=0){const tower={kind:'wooden-spotlight-tower',x:10,y:10,z,rotated},bottom=towerEntry(tower),top=towerSlots(tower)[slot];top.towerPost=towerPost(tower,top);return {id:1,unitId:0,access:'ladder',tower,direction,from:direction==='up'?bottom:top,to:direction==='up'?top:bottom};}
test('wooden ladder is visibly repositioned and flared without changing the approved hatch, footprint or cross-section',()=>{
 const root=new T.Group(),material=new T.MeshBasicMaterial(),box=(parent,mat,p,s)=>{const m=new T.Mesh(new T.BoxGeometry(...s),mat);m.position.fromArray(p);parent.add(m);return m;};
 buildWoodenGuardTower(root,{box,wood:()=>material,iron:material});root.updateMatrixWorld(true);
 try{
  assert.deepEqual(root.userData.tower.opening,{min:[-.5,1.25],max:[.5,2.25]});assert.deepEqual(root.userData.tower.platformTiles,[5,5]);assert.equal(root.userData.tower.deckHeight,6.36);
  const stiles=root.children.filter(m=>m.name==='ladder-stile');assert.equal(stiles.length,6);
  for(const m of stiles){assert.equal(m.geometry.parameters.width,.085);assert.ok(Math.abs(m.geometry.parameters.depth*m.scale.z-.10)<1e-12);assert.equal(m.position.z,WOODEN_LADDER.z);}
  const upper=stiles.filter(m=>m.position.y>6.71);assert.equal(upper.length,2);assert.ok(Math.abs(upper[1].position.x-upper[0].position.x-.94)<1e-12);
  const rung=root.children.find(m=>m.name==='ladder-rung');assert.equal(rung.geometry.parameters.width,.76);
  // The ladder remains outside the existing support ties; no support is removed.
  const ties=root.children.filter(m=>m.name==='frame-tie');assert.equal(ties.length,12);for(const m of ties){const b=new T.Box3().setFromObject(m);if(Math.abs(m.position.x)<.01)assert.ok(b.max.z<WOODEN_LADDER.z-.05);}
 }finally{root.traverse(m=>m.geometry?.dispose());material.dispose();}
});
for(const p of profiles.filter(p=>!p.unarmed&&(!process.env.REVIEW_ANIMAL||process.env.REVIEW_ANIMAL===p.id)))test(p.id+': wooden hatch preserves fixed limbs, supported transfers and actor ownership',()=>{
 const w=load(p),e=event(),saved=w.parts.map(p=>Object.fromEntries(['position','normal','paintPosition','paintNormal','skinIndex','skinWeight'].map(n=>[n,p.geometry.attributes[n]?.array.slice()]))),m=createLadderJourney(w,p,e,ladderFrame(e.tower),37),lengths=w.bones.map(b=>b.position.length());
 try{
  assert.equal(m.climb.duration,6);assert.equal(m.definition.hatch.half,.5);
  const rows=[];for(const phase of m.climb.phases)for(let i=0;i<=8;i++){
   const progress=(phase.start+(phase.end-phase.start)*i/8)/6,r=m.climb.apply(progress);rows.push({progress,points:w.bones.map(b=>b.getWorldPosition(new T.Vector3()))});
   w.bones.forEach((b,i)=>assert.ok(Math.abs(b.position.length()-lengths[i])<1e-8,'bone length changed'));
   for(const c of r.contacts)assert.ok(c.error<1e-5,'unreachable '+c.id+' in '+phase.label);
   if(r.contacts.filter(c=>c.kind==='floor'||c.kind==='landing').length<2)assert.ok(r.contacts.filter(c=>c.planted).length>=3,'three-point support lost');
   if(phase.label==='Lean through hatch')assert.ok(r.contacts.every(c=>c.planted),'forward transfer must retain all four contacts');
  }
  if(p.id==='horse')for(const phase of m.climb.phases.filter(p=>/Lift.*upper|Brace forward/.test(p.label))){let previous,maxSpeed=0,lastPoseTime=-Infinity;for(let i=0;i<=160;i++){const time=phase.start+(phase.end-phase.start)*i/160,r=m.climb.apply(time/6),bone=w.bones.find(b=>b.name===phase.id),point=bone.getWorldPosition(new T.Vector3());assert.ok(r.poseTime>=lastPoseTime,'retime reversed source trajectory');lastPoseTime=r.poseTime;if(previous)maxSpeed=Math.max(maxSpeed,point.distanceTo(previous)/(phase.end-phase.start)*160);previous=point;}assert.ok(maxSpeed<8,'hatch hand transfer snaps: '+maxSpeed+' m/s');}
  for(const row of rows.filter((_,i)=>i%9===4).reverse()){m.climb.apply(1-row.progress,{direction:'down'});w.bones.forEach((b,i)=>assert.ok(b.getWorldPosition(new T.Vector3()).distanceTo(row.points[i])<1e-7,'reverse/scrub changed geometry'));}
  for(const t of [0,1]){m.apply(t);assert.ok(w.root.position.distanceTo(V(toWorld(t?e.to:e.from)))<1e-8,'wrong committed tile');}
 }finally{m.dispose();m.dispose();w.parts.forEach((p,i)=>{for(const [name,array]of Object.entries(saved[i]))if(array)assert.deepEqual(p.geometry.attributes[name].array,array,'failed restoration '+p.name+'/'+name);});w.dispose();}
});
test('wooden hatch routes reach all posts in both orientations and both directions',()=>{
 const p=profiles[0],w=load(p);try{for(const rotated of [false,true])for(let slot=0;slot<4;slot++)for(const direction of ['up','down']){const e=event(rotated,slot,direction,1),m=createLadderJourney(w,p,e,ladderFrame(e.tower),273);try{for(const t of [0,1]){m.apply(t);assert.ok(w.root.position.distanceTo(V(toWorld(t?e.to:e.from)))<1e-8);}for(let i=0;i<=120;i++)for(const c of m.apply(i/120).contacts)if(c.kind!=='weapon')assert.ok(c.error<1e-5);}finally{m.dispose();}}}finally{w.dispose();}
});
