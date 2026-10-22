import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {gunshotSprayFrame,MAX_SPRAY_CONTACT_CORRECTION} from '../dist/tactics/gunshot-spray-frame.js';
import {impactFrame} from '../dist/tactics/shot-coordinates.js';
import {DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {MAP_LEVELS} from '../dist/tactics/map-layers.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createPaintedBloodSpray} from '../dist/tactics/painted-blood-spray.js';
import {BLOOD_CELLS} from '../dist/tactics/painted-blood-spray-data.js';

const fixture=JSON.parse(fs.readFileSync(new URL('../dist/tactics/fixtures/gunshot-impacts.v1.json',import.meta.url))),receipts=fixture.cases.flatMap(c=>c.actions.flatMap(a=>a.bodyImpacts));
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function sample(zone='torso'){
 const r=structuredClone(receipts.find(r=>r.zone===zone));
 r.contact={x:-.34,y:0,h:1};r.origin={x:-5,y:0,h:1};r.incoming={x:1,y:0,h:0};
 r.victim={...r.victim,x:0,y:0,z:0,support:{kind:'layer',level:0,baseHeight:0,offset:0}};r.originSupport={...r.victim.support};return r;
}
function surface({x=0,region='torso',side=T.FrontSide}={}){
 const mesh=new T.Mesh(new T.BoxGeometry(.3,1,.3),new T.MeshBasicMaterial({side}));mesh.name='test body';mesh.position.set(x,DIMENSIONS.standing/1.8,0);mesh.userData.impactRegion=region;mesh.updateMatrixWorld(true);return mesh;
}
function release(mesh){mesh.geometry.dispose();mesh.material.dispose();}

test('the painted +X axis always points back along the final incoming segment, including vertical hits',()=>{
 for(const direction of [V(1,0,0),V(-1,0,0),V(0,0,1),V(0,0,-1),V(0,1,0),V(0,-1,0),V(.2,.8,.3).normalize()]){
  const r=sample();r.incoming={x:direction.x,y:direction.z,h:direction.y};
  const before=structuredClone(r),p=gunshotSprayFrame(r),frame=impactFrame(r);
  const axis=V(1,0,0).transformDirection(p.matrix);
  assert.ok(axis.dot(frame.incoming)<-.999999);
  assert.ok(p.outgoing.distanceTo(axis)<1e-9);assert.ok(Math.abs(p.matrix.determinant()-1)<1e-9);
  assert.ok(new T.Vector3().setFromMatrixPosition(p.matrix).distanceTo(frame.contact)<1e-9);
  assert.deepEqual(r,before);assert.equal(p.visualSeed,r.visualSeed);
 }
});

test('all real impact fixtures preserve their actual contact, local support height and seed without a model',()=>{
 for(const receipt of receipts){
  const f=gunshotSprayFrame(receipt),expected=impactFrame(receipt);
  assert.equal(f.placement,'collider-only');assert.equal(f.correction,0);assert.ok(f.contact.distanceTo(expected.contact)<1e-9);
  assert.equal(f.contact.shotLevel,receipt.victim.support.level);
  assert.equal(f.floor,receipt.victim.support.level*DIMENSIONS.floorSpacing+receipt.victim.support.offset);
 }
 for(let level=0;level<MAP_LEVELS;level++)for(const [kind,offset] of [['layer',0],['cliff',.7],['tower',5.9]]){
  const r=sample();r.victim.support={kind,level,baseHeight:level*3+offset,offset};r.contact.h=r.victim.support.baseHeight+1;
  const f=gunshotSprayFrame(r);assert.ok(Math.abs(f.contact.y-(level*DIMENSIONS.floorSpacing+offset+DIMENSIONS.standing/1.8))<1e-9);
 }
});

test('one bounded victim-only ray puts the origin on skin and does not use a surface normal as a new flight direction',()=>{
 const receipt=sample(),mesh=surface(),before=structuredClone(receipt);let queries=0;const raycast=mesh.raycast;
 mesh.raycast=function(...args){queries++;return raycast.apply(this,args);};mesh.layers.set(31);
 try{
  const p=gunshotSprayFrame(receipt,{model:{victimId:receipt.victimId,parts:[mesh]}});
  assert.equal(queries,1);assert.equal(p.placement,'skin-contact');assert.ok(Math.abs(p.contact.x+.15)<1e-6);
  assert.ok(p.correction<=MAX_SPRAY_CONTACT_CORRECTION);assert.ok(p.normal.dot(p.incoming)<0);
  assert.ok(p.outgoing.dot(p.incoming)<-.999999);assert.deepEqual(receipt,before);
  mesh.position.x=20;mesh.updateMatrixWorld(true);assert.ok(Math.abs(p.contact.x+.15)<1e-6,'Captured frame does not follow later movement');
 }finally{release(mesh);}
});

test('wrong victim, wrong region, out-of-budget correction, missing body and exit-only geometry use the collider fallback',()=>{
 const r=sample('head'),mesh=surface({region:'torso'});
 try{
  assert.equal(gunshotSprayFrame(r,{model:{victimId:'different',parts:[mesh]}}).placement,'wrong-victim');
  const model={victimId:r.victimId,parts:[mesh]};assert.equal(gunshotSprayFrame(r,{model}).placement,'no-matching-surface');
  mesh.userData.impactRegion='head';mesh.position.x=3;mesh.updateMatrixWorld(true);
  assert.equal(gunshotSprayFrame(r,{model}).placement,'no-matching-surface');
  mesh.visible=false;assert.equal(gunshotSprayFrame(r,{model}).placement,'no-body-parts');
  mesh.visible=true;mesh.material.side=T.DoubleSide;mesh.position.x=-.7;mesh.updateMatrixWorld(true);
  // Entrance is behind the bounded segment; the only face inside is an exit.
  assert.equal(gunshotSprayFrame(r,{model}).placement,'no-matching-surface');
 }finally{release(mesh);}
});

test('skin weighting restricts correction to the recorded body region on actual horse and hen rigs',()=>{
 for(const id of ['horse','hen']){
  const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id),data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))),worker=profile.create(data),posture=createBattlePosture(worker,profile);
  const eye=profile.eye||[.04,1.44,0],head=worker.bones.find(b=>b.name==='head'),headReference=head.worldToLocal(V(eye[0],eye[1],0)),locomotion=createWorkerLocomotion(worker,profile);
  try{
   for(const pose of [{},{kneel:1},{prone:1}]){
    const poseSample={heading:0,distance:0,blend:0,pose};locomotion.apply(poseSample);posture.apply(poseSample,{equipment:false});posture.ground();worker.root.updateMatrixWorld(true);worker.skeleton.update();
    for(const part of worker.parts){part.computeBoundingBox();part.computeBoundingSphere();}
    for(const zone of ['head','torso','legs']){
     const bone=worker.bones.find(b=>zone==='head'?b.name==='head':zone==='legs'?/^(shin|shank)/.test(b.name):/^(spine|breast)$/.test(b.name));
     const position=zone==='head'?head.localToWorld(headReference.clone()):bone.getWorldPosition(V()),r=sample(zone);r.contact={x:position.x-.34,y:position.z,h:position.y/(DIMENSIONS.standing/1.8)};
     const p=gunshotSprayFrame(r,{model:{victimId:r.victimId,parts:worker.parts}});
     assert.equal(p.placement,'skin-contact',`${id} ${JSON.stringify(pose)} ${zone}`);
     assert.ok(p.correction<=MAX_SPRAY_CONTACT_CORRECTION);assert.ok(Math.abs(p.contact.z-position.z)<1e-6);assert.ok(Math.abs(p.contact.y-position.y)<1e-6);
    }
   }
  }finally{locomotion.dispose();worker.dispose();}
 }
});

test('the painted root stays at contact and droplets keep their world trajectories as the camera turns',()=>{
 const r=sample(),f=gunshotSprayFrame(r),texture=new T.Texture(),effect=createPaintedBloodSpray(texture,{seed:f.visualSeed}),matrix=new T.Matrix4();effect.setFrame(f.matrix);
 try{
  let first;
  for(const eye of [V(-4,2,2),V(4,2,2),V(0,4,-3)]){
   const camera=new T.PerspectiveCamera();camera.position.copy(eye);camera.lookAt(f.contact);camera.updateMatrixWorld(true);effect.update(.06,camera);
   effect.mesh.getMatrixAt(0,matrix);const cell=BLOOD_CELLS[0],root=V(cell.pivot[0]-.5,cell.pivot[1]-.5,0).applyMatrix4(matrix);
   assert.ok(root.distanceTo(f.contact)<1e-6,'Painted contact pivot must not drift with billboard orientation');
   effect.mesh.getMatrixAt(2,matrix);const droplet=V().setFromMatrixPosition(matrix),b=effect.motion.buffer,expected=V().fromArray(b.launch,6).applyMatrix4(f.matrix);expected.y+=b.fall[2];
   assert.ok(droplet.distanceTo(expected)<1e-6);if(first)assert.ok(droplet.distanceTo(first)<1e-6);first=droplet;
  }
 }finally{effect.dispose();texture.dispose();}
});

test('real fixture contacts correct to their own posed bodies or explicitly retain the collider at anatomical gaps',()=>{
 const fallbacks=[],before=structuredClone(fixture);let anchored=0;
 for(const c of fixture.cases)for(const receipt of c.actions.flatMap(a=>a.bodyImpacts)){
  const p=ANIMAL_MOTION_CATALOG.find(p=>p.id===receipt.victim.species),worker=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),posture=createBattlePosture(worker,p),locomotion=createWorkerLocomotion(worker,p);
  try{
   const sample={heading:receipt.victim.heading,distance:0,blend:0,pose:receipt.victim.stance==='kneeling'?{kneel:1}:receipt.victim.stance==='prone'?{prone:1}:{}};
   locomotion.apply(sample);posture.apply(sample,{equipment:false});if(Object.keys(sample.pose).length)posture.ground();
   worker.root.position.add(V(receipt.victim.x,receipt.victim.support.level*DIMENSIONS.floorSpacing+receipt.victim.support.offset,receipt.victim.y));worker.root.updateMatrixWorld(true);worker.skeleton.update();
   for(const part of worker.parts){part.computeBoundingBox();part.computeBoundingSphere();}
   const f=gunshotSprayFrame(receipt,{model:{victimId:receipt.victimId,parts:worker.parts}});
   if(f.placement==='skin-contact'){anchored++;assert.ok(f.correction<=MAX_SPRAY_CONTACT_CORRECTION);}
   else {fallbacks.push([c.id,receipt.projectileId]);assert.equal(f.placement,'no-matching-surface');assert.ok(f.contact.distanceTo(impactFrame(receipt).contact)<1e-9);}
  }finally{locomotion.dispose();worker.skeleton.dispose();worker.dispose();}
 }
 assert.equal(anchored,17);assert.deepEqual(fallbacks,[['legs','shot:1/d:0/p:0'],['incidental-victim','shot:1/d:0/p:0'],['shotgun','shot:1/d:0/p:5']]);assert.deepEqual(fixture,before);
});
