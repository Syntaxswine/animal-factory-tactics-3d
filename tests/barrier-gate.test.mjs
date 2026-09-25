import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createFurnitureLibrary} from '../dist/tactics/painted-furniture.js';
import {BARRIER_GATE,setBarrierGateOpen} from '../dist/tactics/barrier-gate.js';
const atlas=new T.Texture(),point=(root,name)=>root.getObjectByName(name).getWorldPosition(new T.Vector3());
test('the entire lifting sweep fits 1×3 tiles and leaves its pivot and pedestal planted',()=>{
 const library=createFurnitureLibrary(atlas,atlas),{root,form}=library.build('barrier-gate');
 try{
  assert.deepEqual(form.tiles,[1,3]);assert.equal(root.getObjectByName('receiver-post'),undefined);const pivot=point(root,'barrier-arm'),post=point(root,'drive-pedestal');
  let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});assert.ok(triangles<10000);
  for(let i=0;i<=180;i++){
   setBarrierGateOpen(root,i/180);const bounds=new T.Box3().setFromObject(root);assert.ok(bounds.min.x>=-.5&&bounds.max.x<=.5&&bounds.min.z>=-1.5&&bounds.max.z<=1.5);assert.ok(Math.abs(bounds.min.y)<.005);
   assert.ok(point(root,'barrier-arm').distanceTo(pivot)<1e-9);assert.ok(point(root,'drive-pedestal').distanceTo(post)<1e-9);
   for(const name of ['boom','counterweight','counterweight-link'])for(const fixed of ['drive-pedestal','pedestal-cap','service-door','service-latch']){
    const part=root.getObjectByName(name),box=new T.Box3().setFromObject(root.getObjectByName(fixed)),a=part.geometry.attributes.position;
    box.expandByScalar(-.001);for(let j=0;j<a.count;j++)assert.equal(box.containsPoint(new T.Vector3().fromBufferAttribute(a,j).applyMatrix4(part.matrixWorld)),false,`${name} hits ${fixed} at ${i}`);
   }
  }
 }finally{library.dispose();}
});
test('closed boom covers the lane, open boom clears the horse-height passage and reverses exactly',()=>{
 const library=createFurnitureLibrary(atlas,atlas),{root}=library.build('barrier-gate');
 try{
  const ray=new T.Raycaster(),meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const crossing=(y,z)=>{ray.set(new T.Vector3(-1,y,z),new T.Vector3(1,0,0));ray.far=2;return ray.intersectObjects(meshes,false);};
  for(const z of [-.8,-.4,0,.4,.8,1.1])assert.ok(crossing(1.07,z).some(h=>h.object.name==='boom'));
  const capture=()=>{const p=root.getObjectByName('boom');return [...p.matrixWorld.elements];},closed=capture();
  setBarrierGateOpen(root,1);for(const z of [-.7,0,.7])for(const y of [.1,1.07,1.8,2.1])assert.equal(crossing(y,z).length,0);
  setBarrierGateOpen(root,.37);const intermediate=capture();setBarrierGateOpen(root,.91);setBarrierGateOpen(root,.37);assert.deepEqual(capture(),intermediate);setBarrierGateOpen(root,0);assert.deepEqual(capture(),closed);
  for(const invalid of [-1,2,NaN,Infinity])assert.throws(()=>setBarrierGateOpen(root,invalid));assert.deepEqual(capture(),closed);
 }finally{library.dispose();}
});
test('gate instances share resources but their opening poses remain independent',()=>{
 const library=createFurnitureLibrary(atlas,atlas),a=library.build('barrier-gate'),b=library.build('barrier-gate','honey',{openness:1}),stats=library.stats();
 assert.ok(a.root.getObjectByName('barrier-arm').rotation.x===0);assert.equal(b.root.getObjectByName('barrier-arm').rotation.x,-BARRIER_GATE.openAngle);
 for(let i=0;i<200;i++){setBarrierGateOpen(a.root,(i%100)/100);library.build('barrier-gate');}assert.deepEqual(library.stats(),stats);assert.equal(b.root.userData.barrierGate.openness,1);
 library.dispose();library.dispose();assert.deepEqual(library.stats(),{geometries:0,materials:0,textures:0});
});
