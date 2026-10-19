import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {naturalTraversal,createNaturalTraversal} from '../dist/tactics/natural-traversal.js';
// The natural crossings (docs/tactics/NATURAL-TRAVERSAL.md) on every mammal, built the way the battle builds a model.
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>p.id!=='hen'),KINDS=['window','low-wall','wall'];
const model=p=>{const worker=p.create(JSON.parse(readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url),'utf8')));return {worker,profile:p,posture:createBattlePosture(worker,p),locomotion:createWorkerLocomotion(worker,p)};};
const crossing=kind=>({id:1,unitId:1,kind,from:{x:0,y:0,z:0},to:{x:1,y:0,z:0}});
// The deepest trunk, head and tail point the clearance fit leaves in the floor or the obstacle, in cm: about a
// centimetre, except the named gaps, which may only shrink. 8 cm is right through the 16 cm wall.
const LEFT={'window/pig-foreman/trunk':3,'window/pig-director/trunk':3,
 'window/donkey/head':9,'window/rabbit/head':6,'window/dog/head':3, // long ears graze the lintel at the hop for ~20 ms
 'wall/pig-foreman/trunk':8,'wall/pig-director/trunk':8, // a pig's belly keeps it off the face: it needs its own hang
 'wall/dog/trunk':8}; // the dog's utility belt as its legs go over the top
test('the hen has no traversal skeleton and keeps the simple traversal',()=>{
 for(const kind of KINDS){assert.equal(naturalTraversal(crossing(kind),{species:'horse'}),true);assert.equal(naturalTraversal(crossing(kind),{species:'hen'}),false);}
 assert.equal(naturalTraversal(crossing('ladder'),{species:'horse'}),false);
 const hen=ANIMAL_MOTION_CATALOG.find(p=>p.id==='hen');assert.throws(()=>createNaturalTraversal(model(hen),crossing('window'),{species:'hen'}),/No natural traversal/);});
for(const p of MAMMALS)test(`${p.id}: every crossing starts in its own stance, ends on the next tile's centre, clears the obstacle and gives the tail back`,()=>{
 const m=model(p),tails=m.worker.parts.filter(x=>/tail/.test(x.name)).map(x=>[x,Float32Array.from(x.geometry.attributes.position.array)]);
 for(const kind of KINDS){
  const motion=createNaturalTraversal(m,crossing(kind),{species:p.id}),bones=Object.fromEntries(m.worker.bones.map(b=>[b.name,b]));
  const at=progress=>{motion.apply(progress);return n=>bones[n].getWorldPosition(bones[n].position.clone()).toArray();};
  const pose0=at(0),hips=pose0('hips');assert.ok(Math.abs(hips[0])<.01&&Math.abs(hips[2])<.01,`${kind} starts at x ${hips[0]}, z ${hips[2]}`);
  const rest={hips:pose0('hips'),feet:[-1,1].map(s=>pose0('hoof'+s))},pose1=at(1);
  for(const [a,b]of [[pose1('hips'),rest.hips],...[-1,1].map((s,i)=>[pose1('hoof'+s),rest.feet[i]])])
   assert.ok(Math.abs(a[0]-b[0]-1)<.01&&Math.abs(a[1]-b[1])<.01&&Math.abs(a[2]-b[2])<.01,`${kind} ends at ${a.map(x=>x.toFixed(3))}, not its stance moved one tile (${b.map(x=>x.toFixed(3))})`);
  for(const part of ['trunk','head','tail']){const left=100*motion.fit[part].depth,limit=LEFT[`${kind}/${p.id}/${part}`]??1;
   assert.ok(left<=limit,`${kind}: the ${part} is left ${left.toFixed(1)} cm in at ${motion.fit[part].t.toFixed(2)} s (allowed ${limit})`);}
  // Cut short where the tail is bent (as a casualty ends a crossing), the tail still comes back exactly.
  motion.apply(.6);motion.dispose();for(const [part,base]of tails)assert.deepEqual(part.geometry.attributes.position.array,base,`${kind}: the ${part.name} is not given back`);}
});
