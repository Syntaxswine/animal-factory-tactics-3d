import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createPaintedFireMotion} from '../dist/tactics/painted-fire-motion.js';
import {makeBurnRoute,burnState,FIRE_TIME} from '../dist/tactics/painted-fire-state.js';
import {createPaintedFireEffects,FIRE_ASSETS} from '../dist/tactics/painted-fire-effects.js';

const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='hen');
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)));
const V=(...args)=>new T.Vector3(...args);
function route(steps=3,heading=0,y=0){
 return makeBurnRoute(Array.from({length:steps+1},(_,i)=>({x:4+i*Math.cos(heading),y,z:-2+i*Math.sin(heading)})));
}
function collapseStart(r){return FIRE_TIME.hit+burnState(0,r).runEnd;}
function sampleMesh(part){
 const p=part.geometry.attributes.position,v=V(),points=[];
 const indices=part.geometry.index?new Set(part.geometry.index.array):Array.from({length:p.count},(_,i)=>i);
 for(const i of indices){part.getVertexPosition(i,v).applyMatrix4(part.matrixWorld);points.push(v.clone());}
 return points;
}
const minY=parts=>Math.min(...parts.flatMap(p=>sampleMesh(p).map(v=>v.y)));
function pose(w){return w.parts[0].skeleton.bones.map(b=>({p:b.getWorldPosition(V()),q:b.getWorldQuaternion(new T.Quaternion())}));}
function withHen(run){
 const worker=profile.create(data),motion=createPaintedFireMotion(worker,profile);
 try{run(worker,motion);}finally{motion.dispose();worker.dispose();}
}

test('hen transfers from fixed soles to real toe/wing skin on short, rotated and raised routes',()=>withHen((w,m)=>{
 for(const steps of [0,1,3])for(const heading of [0,Math.PI/2,-Math.PI/4]){
  const r=route(steps,heading,1.7),start=collapseStart(r);let sawToe=false,sawWing=false,previous;
  for(let i=0;i<=65;i++){
   const d=m.burn(start+i*.01,r),floor=d.state.point.y,y=minY(w.parts);
   assert.ok(y>=floor-.003&&y<floor+.008,`skin floats or clips at ${i}: ${y-floor}`);
   const planted=[-1,1].filter(side=>d.feet[side].planted);
   if(planted.length){
    assert.ok(i<=15,'feet must release as the body rolls');
    for(const side of planted)if(previous?.feet[side].planted)assert.ok(V(...d.feet[side].ankle).distanceTo(V(...previous.feet[side].ankle))<1e-7,'planted ankle slid');
   }else{
    assert.ok(['toe edge','wing'].includes(d.support?.kind),'clothing cannot masquerade as support');
    const mesh=w.parts.find(p=>p.name===d.support.part),point=V(...d.support.point);
    assert.ok(Math.abs(point.y-floor)<1e-7);
    assert.ok(sampleMesh(mesh).some(v=>v.distanceTo(point)<1e-7),'diagnostic contact is not an actual surface vertex');
    sawToe ||= d.support.kind==='toe edge';sawWing ||= d.support.kind==='wing';
   }
   previous=d;
  }
  assert.ok(sawToe&&sawWing,'the fall must progress from rolling toes onto a wing');
 }
}));

test('hen is lying on a folded wing before breakup, not crouching or propped on her apron',()=>withHen((w,m)=>{
 for(const steps of [0,1,3]){
  const r=route(steps),d=m.burn(collapseStart(r)+.62,r),up=V(0,1,0).applyQuaternion(m.bones.pelvis.getWorldQuaternion(new T.Quaternion()));
  assert.ok(Math.abs(up.y)<.3,'torso is still upright');
  assert.equal(d.support.kind,'wing');
  assert.ok(Math.abs(minY(w.parts.filter(p=>p.name==='layered wing 1')))<1e-7);
  const bodyFloor=minY(w.parts.filter(p=>p.name==='feathered body'));
  assert.ok(bodyFloor>=0&&bodyFloor<.09,'flank must rest just above the folded feathers');
  assert.ok(minY(w.parts.filter(p=>p.name==='continuous apron'))>0,'apron must not carry the weight');
  assert.ok(m.bones.head.getWorldPosition(V()).y<.75,'head remains too high for a settled fall');
  assert.ok([-1,1].every(side=>!d.feet[side].planted&&d.feet[side].ankle[1]>.08));
  assert.equal(d.state.dissolve,0,'side contact must precede disappearance');
  assert.ok(w.root.position.distanceTo(V(r.points.at(-1).x,0,r.points.at(-1).z))<1e-7,'route root moved off its destination');
  const settled=pose(w);m.burn(collapseStart(r)+.67,r);const later=pose(w);
  for(let i=0;i<settled.length;i++)assert.ok(settled[i].p.distanceTo(later[i].p)<1e-7,'settled body keeps drifting');
 }
}));

test('hen buckle, toe release, wing catch and settle remain continuous',()=>withHen((w,m)=>{
 const r=route(),start=collapseStart(r);
 for(const offset of [0,.15,.25,.43,.58,.62,.68]){
  m.burn(start+offset-.000001,r);const before=pose(w);
  m.burn(start+offset+.000001,r);const after=pose(w);
  for(let i=0;i<before.length;i++){
   assert.ok(before[i].p.distanceTo(after[i].p)<.0001,`joint jumped at ${offset}`);
   assert.ok(before[i].q.angleTo(after[i].q)<.001,`joint snapped at ${offset}`);
  }
 }
 let previous;
 for(let i=0;i<=130;i++){
  m.burn(start+i*.005,r);const next=pose(w);
  if(previous)for(let j=0;j<next.length;j++)assert.ok(previous[j].p.distanceTo(next[j].p)<.04,'isolated positional jump during fall');
  previous=next;
 }
}));

test('hen reversal after ash reproduces running and side-resting poses exactly',()=>withHen((w,m)=>{
 for(const r of [route(),route(1,Math.PI/2,2)])for(const t of [1.1,collapseStart(r)+.3,collapseStart(r)+.62]){
  const expected=m.burn(t,r),expectedPose=pose(w);m.burn(5.4,r);
  assert.ok(w.parts.every(p=>!p.visible));
  assert.deepEqual(m.burn(t,r),expected);assert.ok(w.parts.every(p=>p.visible));
  const replay=pose(w);for(let i=0;i<replay.length;i++)assert.ok(replay[i].p.distanceTo(expectedPose[i].p)<1e-7);
 }
}));

test('hen restore/disposal removes the fall transform and restores the original skin rig',()=>{
 const w=profile.create(data),original=w.skeleton,parents=w.bones.map(b=>b.parent),positions=w.bones.map(b=>b.position.clone()),rig={p:w.rig.position.clone(),q:w.rig.quaternion.clone()};
 const skin=w.parts.map(p=>({indices:Array.from(p.geometry.attributes.skinIndex.array),weights:Array.from(p.geometry.attributes.skinWeight.array)}));
 const m=createPaintedFireMotion(w,profile);let disposed=false;
 try{
  m.burn(5.4,route());m.restore();
  assert.ok(w.rig.position.distanceTo(rig.p)<1e-10);assert.ok(w.rig.quaternion.angleTo(rig.q)<1e-10);assert.ok(w.parts.every(p=>p.visible));
  m.burn(3.18,route());m.dispose();disposed=true;
  w.bones.forEach((b,i)=>{assert.equal(b.parent,parents[i]);assert.ok(b.position.distanceTo(positions[i])<1e-10);});
  assert.ok(w.rig.position.distanceTo(rig.p)<1e-10);assert.ok(w.rig.quaternion.angleTo(rig.q)<1e-10);
  w.parts.forEach((p,i)=>{assert.equal(p.skeleton,original);assert.deepEqual(Array.from(p.geometry.attributes.skinIndex.array),skin[i].indices);assert.deepEqual(Array.from(p.geometry.attributes.skinWeight.array),skin[i].weights);});
 }finally{if(!disposed)m.dispose();w.dispose();}
});

test('hen historical ground anchors match the real pelvis without changing its current pose',()=>withHen((w,m)=>{
 for(const r of [route(0),route(1,Math.PI/2,1.7),route(3,-Math.PI/4)]){
  for(let t=0;t<=5.4;t+=.037){
   const d=m.burn(t,r),expected=d.groundPoint;m.burn(5.4,r);const held=pose(w);
   const historical=m.groundPoint(t,r);assert.ok(V(historical.x,historical.y,historical.z).distanceTo(V(expected.x,expected.y,expected.z))<1e-7,'historical emitter diverges from live pose');
   const after=pose(w);for(let i=0;i<held.length;i++)assert.ok(held[i].p.distanceTo(after[i].p)<1e-10,'anchor sampling changed the live skeleton');
  }
 }
}));

test('hen ash and late smoke follow the fallen body and replay without residue drift',async()=>{
 const w=profile.create(data),m=createPaintedFireMotion(w,profile),textures=new Map(),loader={async loadAsync(url){const t=new T.Texture();textures.set(url,t);return t;}},scene=new T.Scene();let fx;
 try{
  fx=await createPaintedFireEffects(scene,loader,w);
  const r=route(),shape=JSON.parse(fs.readFileSync(new URL('../dist/tactics/fixtures/painted-fire-contract.json',import.meta.url))).open,camera=new T.PerspectiveCamera();camera.position.set(7,3,5);
  const options={shape,muzzle:V(.55,.98,0),camera,route:r,groundPoint:m.groundPoint};
  const settled=m.burn(3.18,r).groundPoint;
  const update=t=>{m.burn(t,r);fx.update(t,options);return fx.group.children.filter(o=>o.visible).map(o=>o.position.toArray());};
  const first=update(3.4);update(5.4);assert.deepEqual(update(3.4),first,'effect history depends on seek direction');
  assert.ok(fx.ash.position.distanceTo(V(settled.x,settled.y,settled.z))<1e-7,'ash remains at the old foot position');
  const smoke=fx.group.children.filter(o=>o.material?.uniforms?.map?.value===textures.get(FIRE_ASSETS.smoke));
  let late=0;for(let i=0;i<smoke.length;i++){
   const birth=FIRE_TIME.hit+i*.16,age=3.4-birth;if(birth<collapseStart(r)+.3||!smoke[i].visible)continue;
   const p=m.groundPoint(birth,r);assert.ok(Math.abs(smoke[i].position.z-p.z-.1*Math.sin(i*1.7)*age)<1e-7,'late smoke rises beside the body');late++;
  }
  assert.ok(late>=2,'missing late-collapse smoke samples');
  assert.deepEqual(m.diagnostics().state.point,{...r.points.at(-1),heading:0},'visual offset changed logical destination');
 }finally{fx?.dispose();m.dispose();w.dispose();}
});
