import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createLadderJourney,ladderWalkRoute} from '../dist/tactics/ladder-journey.js';
import {BattleTraversal,ladderFrame} from '../dist/tactics/battle-traversal.js';
import {towerEntry,towerSlots,towerPost} from '../dist/tactics/tower-geometry.js';
import {toWorld} from '../dist/tactics/hybrid-world.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
const V=a=>new T.Vector3(...a),load=p=>p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));
function event(rotated=false,slot=0,direction='up',z=0){const tower={kind:'iron-searchlight-ladder-tower',x:10,y:10,z,rotated},bottom=towerEntry(tower),top=towerSlots(tower)[slot];top.towerPost=towerPost(tower,top);return {id:1,unitId:0,access:'ladder',tower,direction,from:direction==='up'?bottom:top,to:direction==='up'?top:bottom};}
function surfaces(w){return w.parts.map(p=>({indices:new Set(p.geometry.index.array),points:Array.from({length:p.geometry.attributes.position.count},(_,i)=>p.getVertexPosition(i,new T.Vector3()).applyMatrix4(p.matrixWorld))}));}
const supported=profiles.filter(p=>!p.unarmed&&!p.id.startsWith('pig'));
for(const p of supported)test(p.id+': journey keeps fixed contacts, indexed surfaces, reversible poses and exact endpoints',()=>{
 const w=load(p),e=event(),saved=w.parts.map(p=>({index:p.geometry.index.array.slice(),position:p.geometry.attributes.position.array.slice(),weights:p.geometry.attributes.skinWeight.array.slice()})),m=createLadderJourney(w,p,e,ladderFrame(e.tower),37);
 try{
  assert.equal(m.phases[2].end-m.phases[2].start,6);
  for(const progress of [0,1]){m.apply(progress);assert.ok(w.root.position.distanceTo(V(toWorld(progress?e.to:e.from)))<1e-8);assert.ok(w.root.quaternion.angleTo(new T.Quaternion().setFromAxisAngle(V([0,1,0]),-37*Math.PI/180))<1e-7);}
  for(const phase of m.phases.slice(0,-1)){m.apply((phase.end-1e-6)/m.duration);const a=surfaces(w),gun=w.weapon.root.getWorldPosition(new T.Vector3());m.apply((phase.end+1e-6)/m.duration);const b=surfaces(w);assert.ok(gun.distanceTo(w.weapon.root.getWorldPosition(new T.Vector3()))<.00002);a.forEach((part,n)=>{for(const i of part.indices)if(b[n].indices.has(i))assert.ok(part.points[i].distanceTo(b[n].points[i])<.00002,p.id+' surface popped at '+phase.label);});}
  let last=null;for(let i=0;i<=600;i++){const r=m.apply(i/600);for(const c of r.contacts){if(c.kind!=='weapon')assert.ok(c.error<1e-5,p.id+' contact unreachable '+r.phase+' '+c.error);if(c.kind==='weapon'&&c.grasp>.9999)assert.ok(c.error<.002,'rifle grip missed');}
   if(last&&last.phase===r.phase&&['Approach','Walk to destination'].includes(r.phase))for(const c of r.contacts){const before=last.contacts.find(b=>b.id===c.id);assert.ok(V(c.worldPoint).distanceTo(V(before.worldPoint))<m.duration/600*8+.001,'ground step jumped '+JSON.stringify({i,previous:last.contacts,current:r.contacts,phase:r.phase,duration:m.duration}));if(c.planted&&before.planted)assert.ok(V(c.worldPoint).distanceTo(V(before.worldPoint))<1e-7,'plant slid');}last=r;
  }
  const samples=[.1,.17,.5,.7,.85].map(t=>{m.apply(t);return {t,points:w.bones.map(b=>b.getWorldPosition(new T.Vector3()))};});for(const sample of samples.reverse()){m.apply(sample.t);w.bones.forEach((b,i)=>assert.ok(b.getWorldPosition(new T.Vector3()).distanceTo(sample.points[i])<1e-8,'scrub depends on prior frame'));}
  assert.throws(()=>m.apply(NaN),/Invalid/);
 }finally{m.dispose();m.dispose();assert.throws(()=>m.apply(0),/disposed/);w.parts.forEach((p,i)=>{assert.deepEqual(p.geometry.index.array,saved[i].index);assert.deepEqual(p.geometry.attributes.position.array,saved[i].position);assert.deepEqual(p.geometry.attributes.skinWeight.array,saved[i].weights);});w.dispose();}
});
test('both tower rotations, all four assigned posts and reverse traversal reach the committed world positions',()=>{const p=supported[0],w=load(p);try{for(const rotated of [false,true])for(let slot=0;slot<4;slot++)for(const direction of ['up','down'])for(const z of [0,1]){const e=event(rotated,slot,direction,z),m=createLadderJourney(w,p,e,ladderFrame(e.tower),273);try{for(const t of [0,1]){m.apply(t);assert.ok(w.root.position.distanceTo(V(toWorld(t?e.to:e.from)))<1e-8);}for(let i=0;i<=120;i++){const d=m.apply(i/120);assert.ok(d.worldRoot.every(Number.isFinite));for(const c of d.contacts.filter(c=>c.kind==='floor'))assert.ok(c.error<1e-5);}}finally{m.dispose();}}}finally{w.dispose();}});
test('presentation stays busy for its full journey and cancellation restores actor without changing simulation',()=>{const p=supported[0],worker=load(p),root=new T.Group();root.add(worker.root);const e=event(),unit={id:0,team:'squad',species:'horse',weapon:'rifle',hp:100,heading:37,ap:6,...e.to},state={units:[unit],towerTraversal:e,clock:{minutes:100}},saved=structuredClone(state),model={worker,root,profile:p,signature:'old',placement:'old'},v=new BattleTraversal();try{v.observe(state,0);assert.equal(v.pose(model,unit,0),true);const seconds=v.active.motion.duration;v.observe(state,6000);assert.ok(v.busy);v.pose(model,unit,6000);v.observe(state,seconds*1000-1);assert.ok(v.busy);v.pose(model,unit,seconds*1000-1);v.observe(state,seconds*1000);assert.equal(v.busy,false);assert.equal(model.signature,null);assert.deepEqual(state,saved);assert.equal(worker.root.getObjectByName('Rifle shoulder sling'),undefined);
 state.towerTraversal={...e,id:2};v.observe(state,20000);v.pose(model,unit,20000);v.pose(model,unit,21000);v.observe(state,21000,true);assert.equal(v.busy,false);assert.equal(worker.root.getObjectByName('Rifle shoulder sling'),undefined);
 }finally{v.clear();worker.dispose();}});
test('invalid routes fail before modifying actor and phase metadata is isolated',()=>{const p=supported[0],w=load(p),e=event();w.root.position.set(4,2,3);const original=w.root.position.clone(),children=w.root.children.length;try{assert.throws(()=>createLadderJourney(w,p,{...e,direction:'sideways'},ladderFrame(e.tower)),/Invalid/);assert.equal(w.root.children.length,children);assert.ok(w.root.position.equals(original));const m=createLadderJourney(w,p,e,ladderFrame(e.tower));m.phases[2].end=NaN;assert.ok(m.apply(.5).worldRoot.every(Number.isFinite));m.dispose();assert.ok(w.root.position.equals(original));assert.equal(w.root.children.length,children);}finally{w.dispose();}});

for(const id of ['skunk','dog'])test(id+': upper tail pose matches ordinary standing, restores normals and never changes paint coordinates',()=>{
 const p=profiles.find(p=>p.id===id),w=load(p),posture=createBattlePosture(w,p),tails=w.parts.filter(p=>p.name.includes('tail'));
 const snapshot=()=>tails.map(part=>Object.fromEntries(Object.entries(part.geometry.attributes).filter(([name])=>/position|normal|paint|tail/i.test(name)).map(([name,a])=>[name,a.array.slice()]))),original=snapshot();
 try{for(const direction of ['up','down']){
  const e=event(true,3,direction),m=createLadderJourney(w,p,e,ladderFrame(e.tower),273),upper=direction==='up'?1:0;
  m.apply(upper);const arrived=snapshot(),world=tails.map(part=>Array.from({length:part.geometry.attributes.position.count},(_,i)=>part.getVertexPosition(i,new T.Vector3()).applyMatrix4(part.matrixWorld)));
  posture.apply({pose:{},towerPost:towerPost(e.tower,towerSlots(e.tower)[3])});w.root.updateMatrixWorld(true);w.skeleton.update();
  assert.deepEqual(snapshot(),arrived,'ordinary tower pose changes tail attributes');
  tails.forEach((part,n)=>world[n].forEach((point,i)=>assert.ok(point.distanceTo(part.getVertexPosition(i,new T.Vector3()).applyMatrix4(part.matrixWorld))<1e-8,'tail surface jumps after arrival')));
  const phase=m.phases.find(p=>p.label==='Climb'),t=(phase.start+phase.end)/2/m.duration;m.apply(t);const climbing=snapshot();m.apply(upper);m.apply(t);assert.deepEqual(snapshot(),climbing,'tail depends on scrub history');
  m.apply(upper);m.dispose();assert.deepEqual(snapshot(),original,'disposal must restore geometry and paint exactly');
  posture.apply({pose:{},towerPost:towerPost(e.tower,towerSlots(e.tower)[3])});const tucked=snapshot();assert.notDeepEqual(tucked[0].position,original[0].position);
  for(let i=0;i<tails.length;i++)for(const name of Object.keys(original[i]).filter(n=>n!=='position'&&n!=='normal'))assert.deepEqual(tucked[i][name],original[i][name],'paint coordinates changed');
  for(const stance of ['kneel','prone']){w.pose('carry');posture.apply({pose:{[stance]:.00002},towerPost:towerPost(e.tower,towerSlots(e.tower)[3])});const partial=snapshot();for(let i=0;i<tails.length;i++)for(let j=0;j<partial[i].position.length;j++)assert.ok(Math.abs(partial[i].position[j]-tucked[i].position[j])<.0001,'tail snaps when stance starts');}
  for(const stance of ['kneel','prone']){
   const sample=t=>{w.pose('carry');posture.apply({pose:{[stance]:t},towerPost:towerPost(e.tower,towerSlots(e.tower)[3])});return snapshot();};
   const expected=[.25,.5,.75].map(t=>({t,geometry:sample(t)}));
   for(const item of expected.reverse()){assert.deepEqual(sample(item.t),item.geometry,'tail depends on stance history');assert.deepEqual(sample(item.t),item.geometry,'repeated stance accumulates deformation');}
  }
  posture.apply({pose:{}});assert.deepEqual(snapshot(),original,'standing on ground retains tower tuck');
 }}finally{w.dispose();}
});
