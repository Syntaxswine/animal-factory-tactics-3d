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
// The deepest trunk, head and tail point each crossing leaves in the floor or the obstacle as it is played (the
// clearance fit's report, taken again after the balance; a tail's root counts as trunk), in cm: about a centimetre,
// except the named gaps, which may only shrink. 8 cm is right through the 16 cm wall; past that the way out is up.
// Read before the balance (to d3fec1f), the report missed the window's tails, the climb's heads 5 to 8 cm in its wall
// and the pigs 25 to 40 cm in its floor; read here, it found the pigs' bellies 8 to 16 cm through the top in the straddle.
const LEFT={'window/pig-foreman/trunk':2,'window/pig-director/trunk':3, // the belly on the sill as the body tips over
 'window/donkey/head':3,'window/rabbit/head':6, // long ears graze the lintel at the hop for ~20 ms
 'window/goat/head':4, // the horns in the floor in the roll: no turn of the head within the neck clears them
 'window/skunk/trunk':2, // the plume's root, which rides the hips, on the floor in the roll
 'window/dog/trunk':2,'wall/dog/trunk':2, // the dog's utility pouch on the sill's far edge, and on the face in the hang
 'low-wall/pig-director/trunk':2, // the waistcoat on the wall's near edge at the spring
 'wall/pig-foreman/trunk':2,'wall/pig-director/trunk':3}; // the seat resting on the 16 cm top in the straddle (15.6 and 7.9 through it before)
// The hen hops on her wings (hen-crossing.js). Her body parts stay within 4 cm of clear of the floor and the obstacle,
// except the tail fan in the last 0.3 s: spreading back to her standing pose, it reaches .54 behind her, into the wall.
test('the hen hops up and down every obstacle, ends on the next tile and is given back whole',()=>{
 for(const kind of KINDS)for(const species of ['horse','hen'])assert.equal(naturalTraversal(crossing(kind),{species}),true);
 assert.equal(naturalTraversal(crossing('ladder'),{species:'hen'}),false);
 const hen=ANIMAL_MOTION_CATALOG.find(p=>p.id==='hen'),worker=hen.create(JSON.parse(readFileSync(new URL('../dist/tactics/'+hen.file,import.meta.url),'utf8')));
 const before=worker.parts.map(p=>Float32Array.from(p.geometry.attributes.position.array)),bonesBefore=worker.bones.map(b=>b.position.toArray().concat(b.quaternion.toArray()));
 const H=.08,boxes={window:[[0,.85],[1.55,2]],'low-wall':[[0,1]],wall:[[0,2]]};
 for(const kind of KINDS){const motion=createNaturalTraversal({worker,profile:hen},crossing(kind),{species:'hen'}),pelvis=()=>worker.root.getObjectByName('pelvis').getWorldPosition(worker.root.position.clone());
  motion.apply(0);const p0=pelvis();assert.ok(Math.abs(p0.x)<.01&&Math.abs(p0.z)<.01,`${kind} starts at ${p0.toArray()}`);
  const obst=boxes[kind].map(([y0,y1])=>({min:[.5-H,y0,-.5],max:[.5+H,y1,.5]})),v=p0.clone();let worst={d:0};
  for(let t=0;t<=motion.duration;t+=.02){motion.apply(t/motion.duration);for(const part of worker.parts){if(/tail/.test(part.name)&&t>motion.duration-.3)continue;const a=part.geometry.attributes.position;
   for(let i=0;i<a.count;i+=3){v.fromBufferAttribute(a,i);part.applyBoneTransform(i,v);v.applyMatrix4(part.matrixWorld);let d=obst.some(b=>v.x>b.min[0]&&v.x<b.max[0]&&v.z>b.min[2]&&v.z<b.max[2])?0:-v.y;
    for(const b of obst)if([v.x,v.y,v.z].every((c,j)=>c>b.min[j]&&c<b.max[j]))d=Math.max(d,Math.min(v.x-b.min[0],b.max[0]-v.x,v.y-b.min[1],b.max[1]-v.y));if(d>worst.d)worst={d,t,part:part.name};}}}
  assert.ok(worst.d<=.04,`${kind}: the ${worst.part} goes ${(100*worst.d).toFixed(1)} cm in at ${worst.t?.toFixed(2)} s`);
  motion.apply(1);const p1=pelvis();assert.ok(Math.abs(p1.x-p0.x-1)<.01&&Math.abs(p1.y-p0.y)<.01&&Math.abs(p1.z)<.01,`${kind} ends at ${p1.toArray()}`);
  motion.apply(.5);motion.dispose();
  worker.parts.forEach((p,i)=>assert.deepEqual(p.geometry.attributes.position.array,before[i],`${kind}: the ${p.name} is not given back`));
  assert.deepEqual(worker.bones.map(b=>b.position.toArray().concat(b.quaternion.toArray())),bonesBefore,`${kind}: the hen's bones are not given back`);}
});
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
