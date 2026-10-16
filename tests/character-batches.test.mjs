import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {CharacterBatches,CHARACTER_PICK_LAYER} from '../dist/tactics/character-batches.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createHenFireMotion} from '../dist/tactics/painted-fire-hen.js';

function fixture(profile){
 const w=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),root=new T.Group(),material=new T.MeshStandardMaterial();root.add(w.root);
 for(const [i,p]of w.parts.entries()){p.material=material;p.castShadow=p.receiveShadow=true;p.geometry.setAttribute('paintPart',new T.Float32BufferAttribute(new Float32Array(p.geometry.attributes.position.count).fill(i+1),1));}
 const posture=createBattlePosture(w,profile),walk=createWorkerLocomotion(w,profile),batch=new CharacterBatches(w,root);
 return {w,root,material,posture,walk,batch,dispose(){batch.dispose();walk.dispose();w.dispose();material.dispose();}};
}
function compare(f){
 f.root.updateMatrixWorld(true);for(const p of f.w.parts){p.skeleton.update();p.computeBoundingBox();}
 const before=new T.Box3().setFromObject(f.w.root);f.batch.sync();f.root.updateMatrixWorld(true);
 assert.ok(f.batch.groups.size>0);assert.ok(f.batch.groups.size<f.w.parts.length);
 const sources=f.w.parts.filter(p=>p.visible&&p.layers.isEnabled(CHARACTER_PICK_LAYER));
 const expected=[];
 for(const p of sources){const g=p.geometry;for(let i=g.drawRange.start;i<Math.min(g.index.count,g.drawRange.start+g.drawRange.count);i++){const n=g.index.getX(i);expected.push([p.getVertexPosition(n,new T.Vector3()).applyMatrix4(p.matrixWorld),g.attributes.paintPart.getX(n)]);}}
 const actual=[];
 for(const {mesh}of f.batch.groups.values())if(mesh.visible){const g=mesh.geometry;assert.ok(mesh.castShadow&&mesh.receiveShadow);assert.equal(mesh.skeleton,sources[0].skeleton);for(let i=0;i<g.drawRange.count;i++){const n=g.index.getX(i),local=mesh.getVertexPosition(n,new T.Vector3());assert.ok(local.distanceTo(mesh.boundingSphere.center)<=mesh.boundingSphere.radius+1e-6,'posed vertex outside camera/shadow culling sphere');actual.push([local.applyMatrix4(mesh.matrixWorld),g.attributes.paintPart.getX(n)]);}}
 assert.equal(actual.length,expected.length);
 // Groups may separate incompatible attribute layouts; compare by painted part.
 const sort=(a,b)=>a[1]-b[1];actual.sort(sort);expected.sort(sort);
 for(let i=0;i<actual.length;i++){assert.equal(actual[i][1],expected[i][1]);assert.ok(actual[i][0].distanceTo(expected[i][0])<1e-6,`vertex ${i} differs`);}
 const after=new T.Box3().setFromObject(f.root);assert.ok(before.min.distanceTo(after.min)<1e-8&&before.max.distanceTo(after.max)<1e-8,'render copies must not inflate picking bounds');
}
for(const profile of profiles)test(profile.id+': batched triangles, paint IDs, skins and shadows match posed source meshes',()=>{
 const f=fixture(profile);try{
  for(const pose of [{},{kneel:1},{prone:1}]){f.root.position.set(0,0,0);f.root.updateMatrixWorld(true);f.walk.apply({distance:.42,blend:pose.prone?0:1,heading:123,pose});f.posture.apply({pose});f.root.position.set(17,4,-8);compare(f);}
  const groups=[...f.batch.groups.values()].map(g=>g.mesh.geometry),versions=groups.map(g=>g.attributes.position.version);f.batch.sync();assert.deepEqual([...f.batch.groups.values()].map(g=>g.mesh.geometry),groups);assert.deepEqual(groups.map(g=>g.attributes.position.version),versions,'unchanged frames do not upload vertices');
 }finally{f.dispose();}
});
test('grip swaps, mutable geometry, hidden bodies and unsupported materials retain their authored behavior',()=>{
 const f=fixture(profiles[0]),gun=createWeaponModel('hmg');try{
  f.w.equipWeapon(gun);f.w.pose('carry');compare(f);f.w.pose('neutral');compare(f);
  const p=f.w.parts[0],a=p.geometry.attributes.position;a.setY(0,a.getY(0)+.1);a.needsUpdate=true;compare(f);
  p.visible=false;compare(f);p.visible=true;
  const material=p.material;p.material=material.clone();p.material.transparent=true;f.batch.sync();assert.equal(p.layers.mask,1,'unsupported parts render normally');p.material.dispose();p.material=material;
  p.matrixAutoUpdate=false;p.matrix.makeTranslation(0,.2,0);f.batch.sync();assert.equal(p.layers.mask,1);assert.equal(p.matrix.elements[13],.2,'fallback does not overwrite a custom local transform');p.matrix.identity();p.matrixAutoUpdate=true;
  f.w.parts.forEach(p=>p.visible=false);f.batch.sync();assert.ok([...f.batch.groups.values()].every(g=>!g.mesh.visible),'ash leaves no duplicate body');
  f.w.parts.forEach(p=>p.visible=true);compare(f);
  const geometries=[...f.batch.groups.values()].map(g=>g.mesh.geometry);let disposed=0;geometries.forEach(g=>g.addEventListener('dispose',()=>disposed++));f.batch.dispose();f.batch.dispose();assert.equal(disposed,geometries.length);assert.ok(f.w.parts.every(p=>p.layers.mask===1));
 }finally{gun.dispose();f.dispose();}
});
test('temporary hen skeletons and restoration never capture or resurrect render copies',()=>{
 const f=fixture(profiles.find(p=>p.id==='hen'));let fire;
 try{
  compare(f);const original=f.w.parts[0].skeleton;
  f.walk.dispose();fire=createHenFireMotion(f.w,profiles.find(p=>p.id==='hen'));
  assert.notEqual(f.w.parts[0].skeleton,original);compare(f);fire.dispose();fire=null;compare(f);
  assert.ok(f.w.root.children.every(o=>!o.userData.characterBatch),'rig transactions contain only authored nodes');
  assert.equal(f.root.children.filter(o=>o.userData.characterBatch).length,f.batch.groups.size);
 }finally{fire?.dispose();f.dispose();}
});
test('body ray picking continues to hit original triangles after batching',()=>{
 const f=fixture(profiles[0]);try{
  f.w.pose('neutral');f.root.updateMatrixWorld(true);for(const p of f.w.parts){p.computeBoundingBox();p.computeBoundingSphere();}
  const ray=new T.Raycaster(new T.Vector3(5,1.1,0),new T.Vector3(-1,0,0)),before=ray.intersectObjects(f.w.parts);
  assert.ok(before.length);f.batch.sync();f.root.updateMatrixWorld(true);ray.layers.enable(CHARACTER_PICK_LAYER);const after=ray.intersectObject(f.root,true);
  assert.equal(after[0].object,before[0].object);assert.ok(after[0].point.distanceTo(before[0].point)<1e-8);
  f.root.visible=false;assert.ok([...f.batch.groups.values()].every(({mesh})=>mesh.parent===f.root),'hidden actor hides every submission');
 }finally{f.dispose();}
});

test('shadow frustums cull distant copies and custom fire depth materials stay attached',()=>{
 const f=fixture(profiles[0]),depth=new T.MeshDepthMaterial();try{
  f.w.pose('neutral');compare(f);const camera=new T.PerspectiveCamera(60,1,.1,20);camera.position.set(5,2,0);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  assert.ok([...f.batch.groups.values()].some(({mesh})=>frustum.intersectsObject(mesh)));
  f.root.position.set(100,0,0);compare(f);assert.ok([...f.batch.groups.values()].every(({mesh})=>!frustum.intersectsObject(mesh)));
  f.w.parts.forEach(p=>p.customDepthMaterial=depth);f.batch.sync();assert.ok([...f.batch.groups.values()].every(({mesh})=>mesh.customDepthMaterial===depth));
 }finally{f.dispose();depth.dispose();}
});

test('repeated material transitions release retired geometry without owning the rig',()=>{
 const f=fixture(profiles[0]),alternate=f.material.clone(),created=new Set(),released=new Set();let skeletonDisposals=0;
 const skeleton=f.w.skeleton,dispose=skeleton.dispose;skeleton.dispose=()=>{skeletonDisposals++;};
 try{
  f.w.pose('neutral');
  for(let i=0;i<30;i++){
   f.w.parts.forEach(p=>{p.material=i%2?alternate:f.material;});f.batch.sync();
   for(const {mesh}of f.batch.groups.values())if(!created.has(mesh.geometry)){created.add(mesh.geometry);mesh.geometry.addEventListener('dispose',()=>{assert.ok(!released.has(mesh.geometry));released.add(mesh.geometry);});}
   assert.equal(created.size-released.size,f.batch.groups.size);
   assert.equal(f.root.children.filter(o=>o.userData.characterBatch).length,f.batch.groups.size);
  }
  f.batch.dispose();assert.equal(created.size,released.size);assert.equal(skeletonDisposals,0);
 }finally{skeleton.dispose=dispose;f.dispose();alternate.dispose();}
});
