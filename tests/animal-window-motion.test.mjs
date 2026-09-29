import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createAnimalWindowMotion} from '../dist/tactics/animal-window-motion.js';
import {sampleSneakWindow,SNEAK_PHASES,SNEAK_DURATION} from '../dist/tactics/weighted-window-supported.js';
import {HEN_WINDOW_IMPACT} from '../dist/tactics/hen-window-fit.js';
import {WINDOW_SOLIDS} from '../dist/tactics/body-collisions.js';
import {fitRedHatGeometry,RED_HAT_FITS} from '../dist/tactics/red-hat-model.js';
import {createDonkeyStrawHat} from '../dist/tactics/donkey-straw-hat.js';

// These tests verify authored geometry and honest diagnostics, not successful
// traversal. Paint appearance and temporal plausibility require browser review.
const V=()=>new T.Vector3();
const data=p=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)));
const roster=ANIMAL_MOTION_CATALOG;
const cases=roster.flatMap(profile=>['Original','Red Hat'].map(outfit=>({profile,outfit,label:profile.id+' '+outfit})));
cases.push({profile:roster.find(p=>p.id==='donkey'),outfit:'Guide',label:'donkey Guide'});
const phaseTimes=[0,8,...SNEAK_PHASES.flatMap(p=>[p.start,(p.start+p.end)/2,p.end])];
const times=[...new Set([...phaseTimes,...Array.from({length:81},(_,i)=>i/10)])].sort((a,b)=>a-b);
const ids=m=>m.geometry.index?[...new Set(m.geometry.index.array)]:Array.from({length:m.geometry.attributes.position.count},(_,i)=>i);
function visibleMeshes(w){const meshes=[];w.root.traverse(m=>{if(!m.isMesh)return;for(let p=m;p;p=p.parent)if(!p.visible)return;meshes.push(m);});return meshes;}
function fixture(c){
 const worker=c.profile.create(data(c.profile)),extras=[];
 if(c.outfit==='Guide')extras.push(createDonkeyStrawHat(worker));
 if(c.outfit==='Red Hat'&&RED_HAT_FITS[c.profile.id]){
  const donorProfile=roster.find(p=>p.id==='pig-foreman'),donor=donorProfile.create(data(donorProfile));
  try{worker.root.updateMatrixWorld(true);const head=worker.bones.find(b=>b.name==='head'),source=donor.parts.find(m=>m.name.includes('service cap'));assert(source,'missing authored cap donor');
   const geometry=fitRedHatGeometry(source.geometry,head,RED_HAT_FITS[c.profile.id]),material=new T.MeshStandardMaterial(),mesh=new T.Mesh(geometry,material);mesh.name='fitted Red Hat cap';head.add(mesh);extras.push({dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}});
  }finally{donor.dispose();}
 }
 return {worker,dispose(){for(const extra of extras)extra.dispose();worker.dispose();}};
}
function capture(w){
 const objects=[],meshes=[];w.root.traverse(o=>{objects.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible,children:[...o.children]});if(o.isMesh)meshes.push({m:o,g:o.geometry,index:o.geometry.index,indexData:o.geometry.index?.array.slice(),attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,{a,data:a.array.slice()}])),material:o.material,hooks:[o.material.onBeforeCompile,o.material.customProgramCacheKey]});});
 return {objects,meshes,bones:[...w.bones],skeleton:w.skeleton,skeletonBones:[...w.skeleton.bones]};
}
function sourcePreserved(w,s,articulated=false){
 assert.deepEqual(w.bones,s.bones,'native bone list changed');if(!articulated){assert.equal(w.skeleton,s.skeleton);assert.deepEqual(w.skeleton.bones,s.skeletonBones);}else{assert.deepEqual(w.skeleton.bones.slice(0,s.skeletonBones.length),s.skeletonBones);assert.deepEqual(w.skeleton.bones.slice(s.skeletonBones.length).map(b=>b.name),['tail fold','apron fold','tie fold']);}
 for(const {o,children}of s.objects)assert.deepEqual(articulated?o.children.filter(c=>!['tail fold','apron fold','tie fold'].includes(c.name)):o.children,children,'native hierarchy changed '+o.name);
 for(const {m,g,index,indexData,attributes,material,hooks}of s.meshes){assert.equal(m.geometry,g);assert.equal(g.index,index);if(index)assert.deepEqual(index.array,indexData);assert.deepEqual(Object.keys(g.attributes),Object.keys(attributes));for(const [key,{a,data}]of Object.entries(attributes)){if(articulated&&((key==='skinIndex'&&['upright tail fan','continuous apron','apron waist tie'].includes(m.name))||(m.name==='fitted waistcoat'&&['skinIndex','skinWeight','paintPosition','paintNormal'].includes(key)))){assert.equal(g.attributes[key].count,a.count);continue;}assert.equal(g.attributes[key],a,'attribute replaced '+m.name+' '+key);assert.deepEqual(a.array,data,'source geometry changed '+m.name+' '+key);}assert.equal(m.material,material);assert.equal(material.onBeforeCompile,hooks[0]);assert.equal(material.customProgramCacheKey,hooks[1]);}
}
function entryRestored(w,s){sourcePreserved(w,s);for(const {o,p,q,s:scale,visible}of s.objects){assert(o.position.equals(p),'position not restored '+o.name);assert(o.quaternion.equals(q),'rotation not restored '+o.name);assert(o.scale.equals(scale),'scale not restored '+o.name);assert.equal(o.visible,visible,'visibility not restored '+o.name);}}
function poseSnapshot(w){return {objects:(()=>{const out=[];w.root.traverse(o=>out.push({id:o.uuid,p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray(),visible:o.visible}));return out;})(),vertices:visibleMeshes(w).flatMap(m=>ids(m).map(i=>m.getVertexPosition(i,V()).applyMatrix4(m.matrixWorld).toArray()))};}
const solidBoxes=WINDOW_SOLIDS.map(s=>new T.Box3(new T.Vector3(...s.lo).addScalar(.001),new T.Vector3(...s.hi).addScalar(-.001)));
function meshOracle(w){
 const bounds=new T.Box3();let floorVertices=0,wallVertices=0,maxFloorDepth=0;
 for(const m of visibleMeshes(w))for(const i of ids(m)){const p=m.getVertexPosition(i,V()).applyMatrix4(m.matrixWorld);assert(p.toArray().every(Number.isFinite),'nonfinite surface '+m.name);bounds.expandByPoint(p);if(p.y<-.001){floorVertices++;maxFloorDepth=Math.max(maxFloorDepth,-p.y);}if(solidBoxes.some(box=>box.containsPoint(p)))wallVertices++;}
 return {floorVertices,wallVertices,maxFloorDepth,min:bounds.min.toArray(),max:bounds.max.toArray()};
}
function withMotion(c,run){const f=fixture(c);let m;try{m=createAnimalWindowMotion(f.worker,c.profile);run(f.worker,m);}finally{m?.dispose();f.dispose();}}

test('window retarget matrix covers all twelve species, both cap variants and the guide',()=>{
 assert.deepEqual(roster.map(p=>p.id),['horse','goat','bull','cow','donkey','sheep','skunk','pig-foreman','pig-director','rabbit','dog','hen']);assert.equal(cases.length,25);
});

for(const c of cases){
 test(c.label+': preserves native bones, authored mesh buffers, accessory dimensions and unit scale',()=>{
  const f=fixture(c),w=f.worker,original=capture(w),offsets=w.bones.map(b=>b.position.clone());let m;
  try{m=createAnimalWindowMotion(w,c.profile);assert.equal(m.duration,8);assert.equal(m.duration,SNEAK_DURATION);assert.equal(m.phases[0].start,0);assert.equal(m.phases.at(-1).end,8);
   for(const t of times){m.sample(t);assert.deepEqual(w.root.scale.toArray(),[1,1,1]);w.bones.forEach((b,i)=>{assert(b.position.equals(offsets[i]),'native offset changed '+b.name);assert.deepEqual(b.scale.toArray(),[1,1,1]);assert(b.quaternion.toArray().every(Number.isFinite));assert(Math.abs(b.quaternion.length()-1)<1e-9,'invalid rotation '+b.name);if(b.parent.isBone)assert(Math.abs(b.getWorldPosition(V()).distanceTo(b.parent.getWorldPosition(V()))-offsets[i].length())<1e-8,'bone stretched '+b.name);});}
   sourcePreserved(w,original,c.profile.id==='hen');
   if(c.profile.id==='hen'){assert.deepEqual(w.bones.map(b=>b.name),['pelvis','breast','head','wing -1','wing tip -1','shank -1','foot -1','wing 1','wing tip 1','shank 1','foot 1']);assert(!w.weapon,'hen acquired a mammal weapon rig');}
  }finally{m?.dispose();f.dispose();}
 });

 test(c.label+': exposes actual reach and mesh failures throughout every held phase',()=>withMotion(c,(w,m)=>{
  let worstReach=0,worstWall=0,worstFloor=0;const seen=new Set();
  for(const t of [...phaseTimes,...m.phases.flatMap(p=>[p.start,(p.start+p.end)/2,p.end])]){const d=m.sample(t),reference=sampleSneakWindow(t);seen.add(d.phase);assert.equal(d.species,c.profile.id);assert.equal(d.time,reference.time);assert(m.phases.some(p=>p.label===d.phase),'unknown species phase');assert.equal(d.glassTime,c.profile.id==='hen'?(t<HEN_WINDOW_IMPACT?-1:t-HEN_WINDOW_IMPACT):reference.glassTime);assert.equal(d.held,true,'diagnostics silently approved motion');assert.equal(d.unarmed,true);assert.equal(d.rigKind,c.profile.id==='hen'?'avian':'mammal');if(w.weapon)assert.equal(w.weapon.root.visible,false);
   assert(d.errors.length>=4,'missing native appendage diagnostics');for(const e of d.errors){assert(e.target.length===3&&e.actual.length===3);assert([...e.target,...e.actual,e.error].every(Number.isFinite));assert(Math.abs(e.error-Math.hypot(...e.actual.map((v,i)=>v-e.target[i])))<1e-9,'reported reach miss differs from actual target distance');worstReach=Math.max(worstReach,e.error);}
   for(const e of d.errors){const side=e.name.endsWith('-1')?-1:1,bird=c.profile.id==='hen',hand=e.name.startsWith('hand'),wing=e.name.startsWith('wing'),boneName=bird?(wing?'wing tip ':'foot ')+side:(hand?'hand':'hoof')+side,bone=w.bones.find(b=>b.name===boneName);assert(bone,'diagnostic has no native endpoint '+e.name);const offset=bird?(wing?[0,0,0]:[0,-.06,0]):hand?[.052,-.010,0]:[0,-.12,0];assert(bone.localToWorld(new T.Vector3(...offset)).distanceTo(new T.Vector3(...e.actual))<1e-8,'reported endpoint is not the posed native joint '+e.name);}
   const actual=meshOracle(w),visible=visibleMeshes(w);assert.equal(d.mesh.meshesChecked,visible.length);assert.equal(d.mesh.accessoryMeshes,visible.filter(mesh=>!w.parts.includes(mesh)).length);for(const key of ['floorVertices','wallVertices'])assert.equal(d.mesh[key],actual[key],'diagnostics omit rendered '+key);for(const key of ['maxFloorDepth'])assert(Math.abs(d.mesh[key]-actual[key])<1e-8);for(const key of ['min','max'])d.mesh[key].forEach((v,i)=>assert(Math.abs(v-actual[key][i])<1e-8,'rendered bounds differ '+key));assert.match(d.mesh.method,/not.*(triangle|self)/i,'mesh audit overstates certification');worstWall=Math.max(worstWall,d.mesh.wallVertices);worstFloor=Math.max(worstFloor,d.mesh.floorVertices);
  }
  assert.equal(seen.size,m.phases.length);assert(Number.isFinite(worstReach));assert(worstWall>=0&&worstFloor>=0); // Fitting tests require improvement rather than preserving old defects.
 }));

 test(c.label+': forward/reverse scrubbing is deterministic and invalid clocks are rejected',()=>withMotion(c,(w,m)=>{
  const samples=[0,.6,1.4,2.6,3.2,4.1,5.8,7.4,8].map(t=>({t,d:m.sample(t),pose:poseSnapshot(w)}));
  for(const s of samples.reverse()){assert.deepEqual(m.sample(s.t),s.d);assert.deepEqual(poseSnapshot(w),s.pose,'history-dependent rendered pose');}
  assert.equal(m.sample(-1).time,0);assert.equal(m.sample(9).time,8);for(const t of [NaN,Infinity,-Infinity,undefined,'3'])assert.throws(()=>m.sample(t),/finite|Invalid/i);
 }));

 test(c.label+': restore and idempotent disposal retain caller transforms, visibility and resources',()=>{
  const f=fixture(c),w=f.worker;let m;try{w.pose(c.profile.id==='hen'?'spread':'carry',37);w.root.position.set(2,.4,3);const original=capture(w);m=createAnimalWindowMotion(w,c.profile);
   for(const t of [.7,3.4,6.2,8]){m.sample(t);m.restore();entryRestored(w,original);}
   m.sample(3.4);m.dispose();m.dispose();entryRestored(w,original);assert.throws(()=>m.sample(2),/disposed/i);
  }finally{m?.dispose();f.dispose();}
 });
}

test('visible static accessories attached before construction contribute their real wall and ground failures',()=>{
 const c=cases.find(c=>c.label==='donkey Original'),f=fixture(c),w=f.worker,head=w.bones.find(b=>b.name==='head'),probes=[];let m;
 try{
  m=createAnimalWindowMotion(w,c.profile);const time=3.2,baseline=m.sample(time).mesh,centers=[[0,.4,0],[.8,-.25,0]].map(p=>head.worldToLocal(new T.Vector3(...p)));m.dispose();
  for(const [i,p]of centers.entries()){const g=new T.BoxGeometry(.02,.02,.02),material=new T.MeshBasicMaterial(),mesh=new T.Mesh(g,material);mesh.name=i?'diagnostic ground accessory':'diagnostic wall accessory';mesh.position.copy(p);head.add(mesh);probes.push(mesh);}
  m=createAnimalWindowMotion(w,c.profile);const d=m.sample(time),count=ids(probes[0]).length;assert.equal(d.mesh.wallVertices,baseline.wallVertices+count,'static wall accessory was skipped');assert.equal(d.mesh.floorVertices,baseline.floorVertices+count,'static ground accessory was skipped');
  probes[0].visible=false;probes[1].visible=false;const hidden=m.sample(time);assert.equal(hidden.mesh.wallVertices,baseline.wallVertices,'hidden accessory counted');assert.equal(hidden.mesh.floorVertices,baseline.floorVertices,'hidden accessory counted');
 }finally{m?.dispose();for(const mesh of probes){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}f.dispose();}
});
