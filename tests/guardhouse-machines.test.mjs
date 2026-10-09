import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createGuardhouseMachineLibrary,guardhousePaintRect,GUARDHOUSE_PAINT_CELLS,GUARDHOUSE_MACHINE_FORMS} from '../dist/tactics/guardhouse-machines.js';
import {createFurnitureLibrary} from '../dist/tactics/painted-furniture.js';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,a+' != '+b);
function triangles(root){let count=0;root.traverse(p=>{if(p.isMesh)count+=(p.geometry.index?.count||p.geometry.attributes.position.count)/3;});return count;}

test('complete equipment fits one placement tile and stays below the native sill with very simple geometry',()=>{
 const atlas=new T.Texture(),library=createGuardhouseMachineLibrary(atlas);
 try{for(const form of GUARDHOUSE_MACHINE_FORMS)for(const screen of ['green','amber']){
  const model=library.build(form.id,{screen}),bounds=new T.Box3().setFromObject(model.root);near(bounds.min.y,0);assert.ok(bounds.max.y<=.800001);
  assert.ok(bounds.min.x>=-.500001&&bounds.max.x<=.500001&&bounds.min.z>=-.500001&&bounds.max.z<=.500001);
  near(bounds.min.z,-.40);near(bounds.max.z,.18);assert.ok(triangles(model.root)<=150);
  assert.ok(model.anchors.operator.position.z>bounds.max.z+.5);near(model.anchors.rear.position.z,bounds.min.z);assert.equal(model.root.userData.guardhouseMachine.gameplayIntegrated,false);
  model.root.traverse(p=>{if(p.isMesh){assert.ok([...p.geometry.attributes.position.array,...p.geometry.attributes.normal.array,...p.geometry.attributes.uv.array].every(Number.isFinite));assert.ok([...p.geometry.attributes.uv.array].every(n=>n>=0&&n<=1));}});
  model.dispose();
 }}finally{library.dispose();atlas.dispose();}
});
test('monitor, keyboard and phone bases touch the worktop and the handset has physical support',()=>{
 const atlas=new T.Texture(),l=createGuardhouseMachineLibrary(atlas);
 try{for(const id of ['computer','telephone']){
  const {root}=l.build(id),bounds=name=>new T.Box3().setFromObject(root.getObjectByName(name)),top=bounds('Worktop').max.y;
  for(const name of id==='computer'?['Recessed CRT monitor','Painted keyboard','Computer control pad']:['Radio control panel','Telephone base'])near(bounds(name).min.y,top);
  if(id==='telephone'){const handset=bounds('Telephone handset'),cradles=root.children.filter(p=>p.name==='Handset cradle');assert.equal(cradles.length,2);
   for(const cradle of cradles){const b=new T.Box3().setFromObject(cradle);near(b.max.y,handset.min.y);assert.ok(b.min.x<handset.max.x&&b.max.x>handset.min.x&&b.min.z<handset.max.z&&b.max.z>handset.min.z);}}
 }}finally{l.dispose();atlas.dispose();}
});
test('paint panels remain inside the authored atlas and contain no adjacent panel seams',()=>{
 for(const cell of Object.keys(GUARDHOUSE_PAINT_CELLS)){const [u,v,w,h]=guardhousePaintRect(cell);assert.ok(u>0&&v>0&&w>0&&h>0&&u+w<1&&v+h<1);}
 assert.throws(()=>guardhousePaintRect('missing'));
});
test('actual guardhouse floors, bevels and rotated shells leave positive window clearance',()=>{
 const atlas=new T.Texture(),cargo=new T.Texture(),furniture=createFurnitureLibrary(atlas,cargo),machines=createGuardhouseMachineLibrary(atlas);
 const variants=['iron-ladder-tower','wood-ladder-tower','iron-searchlight-ladder-tower','iron-rear-ladder-tower','wood-rear-ladder-tower','iron-large-ladder-tower','wood-large-ladder-tower'];
 try{for(const id of variants){
  const {root}=furniture.build(id),{deckHeight:H,coreOffsetX,guardhouse}=root.userData.stairTower;root.updateMatrixWorld(true);
  const faces=[],sills=[],floors=[];root.traverse(p=>{if(!p.isMesh)return;const b=new T.Box3().setFromObject(p);if(p.name==='guardhouse-floor')floors.push(b);if(b.min.z>guardhouse[1]*.3){if(p.name==='house-wall')faces.push(b);if(p.name==='window-sill')sills.push(b);}});
  assert.ok(faces.length&&sills.length&&floors.length,id);const floor=Math.max(...floors.map(b=>b.max.y)),sill=Math.min(...sills.map(b=>b.min.y)),wall=Math.min(...faces.map(b=>b.min.z));
  near(floor-H,.00192);
  for(const [i,kind]of ['computer','telephone'].entries()){
   const model=machines.build(kind);model.root.rotation.y=Math.PI;model.root.position.set(coreOffsetX+i-.5,floor,wall-.40-.003);
   const b=new T.Box3().setFromObject(model.root);assert.ok(sill-b.max.y>.020,id);near(wall-b.max.z,.003);near(b.min.y,floor);
   for(const obstacle of [...faces,...sills]){const intersect=b.clone().intersect(obstacle);assert.ok(intersect.isEmpty()||intersect.getSize(new T.Vector3()).length()<1e-6,id+' overlaps shell');}model.dispose();
  }
 }}finally{machines.dispose();furniture.dispose();atlas.dispose();cargo.dispose();}
});
test('screen changes and repeated model replacement use a bounded geometry cache',()=>{
 const atlas=new T.Texture(),l=createGuardhouseMachineLibrary(atlas);
 try{
  const cycle=()=>{for(const id of ['computer','telephone'])for(const screen of ['green','amber'])l.build(id,{screen}).dispose();};
  cycle();const base=l.stats();for(let i=0;i<30;i++)cycle();assert.deepEqual(l.stats(),base);assert.equal(base.models,0);assert.ok(base.geometries<20);
  l.setGrey(true);const model=l.build('computer');model.root.traverse(p=>{if(p.isMesh)assert.equal(p.material.map,null);});l.setGrey(false);model.root.traverse(p=>{if(p.isMesh)assert.equal(p.material.map,atlas);});
 }finally{l.dispose();atlas.dispose();}
});
test('library teardown owns geometry and materials once and never disposes the borrowed atlas',()=>{
 const atlas=new T.Texture(),l=createGuardhouseMachineLibrary(atlas),a=l.build('computer'),b=l.build('telephone');let texture=0,geometry=0,material=0;
 atlas.addEventListener('dispose',()=>texture++);a.root.getObjectByName('Console cabinet').geometry.addEventListener('dispose',()=>geometry++);l.material.addEventListener('dispose',()=>material++);
 a.dispose();a.dispose();assert.equal(geometry,0);assert.equal(l.stats().models,1);l.dispose();l.dispose();assert.equal(geometry,1);assert.equal(material,1);assert.equal(texture,0);assert.equal(b.root.parent,null);assert.throws(()=>l.build('computer'));atlas.dispose();
});
