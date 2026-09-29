import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPigDirector} from '../dist/tactics/pig-director.js';
import {createPigWindowMotion} from '../dist/tactics/pig-window-motion.js';
import {sampleSneakWindow} from '../dist/tactics/weighted-window-supported.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/pig-director-10k-data.json',import.meta.url)));
function rig(){const worker=createPigDirector(data);return {worker,motion:createPigWindowMotion(worker)};}
test('director retarget preserves native mesh, bone offsets and scale through all phases',()=>{
 const {worker,motion}=rig(),positions=worker.bones.map(b=>b.position.toArray()),geometry=worker.parts.map(m=>Array.from(m.geometry.attributes.position.array));
 try{for(let t=0;t<=8;t+=.08){const d=motion.sample(t);assert.equal(d.time,sampleSneakWindow(t).time);assert.ok(motion.phases.some(p=>p.label===d.phase));assert.equal(d.glassTime,sampleSneakWindow(t).glassTime);
  worker.bones.forEach((b,i)=>{assert.deepEqual(b.position.toArray(),positions[i]);assert.deepEqual(b.scale.toArray(),[1,1,1]);assert.ok(b.quaternion.toArray().every(Number.isFinite));assert.ok(Math.abs(b.quaternion.length()-1)<1e-9);});assert.deepEqual(worker.root.scale.toArray(),[1,1,1]);assert.equal(worker.weapon.root.visible,false);
 }worker.parts.forEach((m,i)=>assert.deepEqual(Array.from(m.geometry.attributes.position.array),geometry[i]));}finally{worker.dispose();}
});
test('native marker residuals and mesh diagnostics remain finite without scaling',()=>{
 const {worker,motion}=rig();try{let maxError=0,maxWall=0,maxFloor=0;for(let t=0;t<=8;t+=.05){const d=motion.sample(t);assert.equal(d.held,true);assert.equal(d.unarmed,true);for(const e of d.errors){assert.ok(Number.isFinite(e.error));assert.ok(Math.abs(e.error-Math.hypot(...e.actual.map((v,i)=>v-e.target[i])))<1e-9);maxError=Math.max(maxError,e.error);}maxWall=Math.max(maxWall,d.mesh.wallVertices);maxFloor=Math.max(maxFloor,d.mesh.floorVertices);}assert.ok(Number.isFinite(maxError));assert.ok(maxWall>=0);assert.ok(maxFloor>=0);}finally{worker.dispose();}
});
test('scrubbing restores deterministic poses and rejects invalid input',()=>{
 const {worker,motion}=rig();try{const a=motion.sample(3.2);motion.sample(7.4);assert.deepEqual(motion.sample(3.2),a);assert.equal(motion.sample(-1).time,0);assert.equal(motion.sample(9).time,8);assert.throws(()=>motion.sample(NaN));assert.throws(()=>motion.sample(Infinity));}finally{worker.dispose();}
});
test('disposing the experiment restores caller transforms, visibility and mesh buffers',()=>{
 const worker=createPigDirector(data);worker.pose('carry',37);worker.root.position.set(2,0,3);
 const capture=()=>{const a=[];worker.root.traverse(o=>a.push({p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray(),visible:o.visible}));return a;},before=capture();
 const attrs=worker.parts.map(m=>({index:m.geometry.index,position:m.geometry.attributes.position}));
 const motion=createPigWindowMotion(worker);motion.sample(3.4);motion.dispose();assert.deepEqual(capture(),before);worker.parts.forEach((m,i)=>{assert.equal(m.geometry.index,attrs[i].index);assert.equal(m.geometry.attributes.position,attrs[i].position);});motion.dispose();assert.throws(()=>motion.sample(2),/disposed/);worker.dispose();
});
