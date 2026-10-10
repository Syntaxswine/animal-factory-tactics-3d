import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createMammalMotion} from '../dist/tactics/animal-motion.js';
import {createHorseChairMotion} from '../dist/tactics/horse-chair-motion.js';
import {createProneMotion} from '../dist/tactics/animal-prone-motion.js';

const load=p=>p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));
const weight=(a,i,bone)=>[0,1,2,3].reduce((sum,k)=>sum+(a.skinIndex.getComponent(i,k)===bone?a.skinWeight.getComponent(i,k):0),0);
function verifyAdapter(p,create,apply){
 const worker=load(p),head=worker.bones.findIndex(b=>b.name==='head');
 const saved=worker.parts.map(mesh=>({mesh,index:mesh.geometry.attributes.skinIndex.array.slice(),weight:mesh.geometry.attributes.skinWeight.array.slice()}));
 const garment=worker.parts.filter(mesh=>/shirt|waistcoat|trousers|overalls/.test(mesh.name));
 const collars=garment.flatMap(mesh=>Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>({mesh,i,h:weight(mesh.geometry.attributes,i,head)}))).filter(v=>v.h>.001);
 assert.ok(collars.length>5,p.id+': current fitted garment found');
 let motion;
 try{
  motion=create(worker);
  for(const time of [0,1.6,3.8,6.7]){
   apply(motion,time);
   for(const {mesh,i,h}of collars){const a=mesh.geometry.attributes;assert.ok(Math.abs(weight(a,i,head)-h)<1e-6,`${p.id}: ${mesh.name} lost neck attachment at vertex ${i}, time ${time}`);
    assert.ok(Math.abs([0,1,2,3].reduce((sum,k)=>sum+a.skinWeight.getComponent(i,k),0)-1)<1e-6,'weights stay normalized');}
  }
 }finally{
  motion?.dispose();
  for(const {mesh,index,weight}of saved){assert.deepEqual(mesh.geometry.attributes.skinIndex.array,index,p.id+': restored indices');assert.deepEqual(mesh.geometry.attributes.skinWeight.array,weight,p.id+': restored weights');}
  worker.dispose();
 }
}

test('existing mammal motion adapters retain fitted collar and bib head weights throughout playback and disposal',()=>{
 for(const p of ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed))verifyAdapter(p,w=>createMammalMotion(w,p),(m,t)=>m.apply(t));
});
test('horse sitting inherits the fitted neck attachments and restores them when the study releases the rig',()=>{
 const p=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse');verifyAdapter(p,w=>createHorseChairMotion(w),(m,t)=>m.apply(t));
});
test('the horse prone study keeps the fitted collar head weights through its own hem tuck, and restores them',()=>{
 const p=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse');verifyAdapter(p,w=>createProneMotion(w,p),(m,t)=>m.apply(t));
});
