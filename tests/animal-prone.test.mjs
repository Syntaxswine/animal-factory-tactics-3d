import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createProneMotion,PRONE_SHOT_TIME,PRONE_DURATION} from '../dist/tactics/animal-prone-motion.js';
const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse'),V=a=>new T.Vector3(...a);
function setup(){const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),motion=createProneMotion(worker,profile);return {worker,motion,dispose(){motion.restore();motion.dispose();worker.dispose();}};}
function surface(mesh,predicate=()=>true){const a=mesh.geometry.attributes.position,out=[];for(let i=0;i<a.count;i++)if(predicate(a,i)){const p=new T.Vector3().fromBufferAttribute(a,i);if(mesh.isSkinnedMesh)mesh.applyBoneTransform(i,p);out.push(p.applyMatrix4(mesh.matrixWorld));}return out;}
test('horse prone transitions keep actual surfaces above ground without stretching bones or snapping joints',()=>{
 const {worker:w,motion:m,dispose}=setup();try{
  const lengths=new Map(m.skeleton.bones.filter(b=>b.parent.isBone).map(b=>[b,b.position.length()]));
  for(const pitch of [-15,0,20]){let previous;for(let i=0;i<=600;i++){
   const t=i/50;m.apply(t,{pitch});const d=m.diagnostics();
   for(const [b,len]of lengths)assert(Math.abs(b.position.length()-len)<1e-7,'stretched '+b.name);
   for(const mesh of [...w.parts,...w.rifle.parts])for(const p of surface(mesh))assert(p.y>=-.002,`${mesh.name} through floor @ ${t}/${pitch}: ${p.y}`);
   if(previous)for(const side of [-1,1])for(const joint of Object.keys(d.joints[side]))assert(V(d.joints[side][joint]).distanceTo(V(previous.joints[side][joint]))<(d.recoil||previous.recoil? .055:.035),'joint snap '+joint+' @'+t);
   for(const contact of d.contacts){assert(contact.error<1e-7);if(i%10===0){const hand=w.parts.find(p=>p.name==='forearm and hand '+contact.side),points=surface(hand,(a,j)=>a.getY(j)<.79);assert(Math.min(...points.map(p=>p.distanceTo(V(contact.grip))))<.022,'skin misses actual grip');}}
   const pants=w.parts.find(p=>p.name.includes('overalls'));
   if(t>=1.4&&t<=10.3){const knee=surface(pants,(a,j)=>a.getZ(j)<0&&Math.abs(a.getY(j)-.475)<.085);assert(Math.min(...knee.map(p=>p.y))<.015,'supporting knee floats during descent/rise @'+t);}
   if(d.down===1){for(const side of [-1,1]){const foot=w.parts.find(p=>p.name==='exposed hoof '+side);assert(Math.min(...surface(foot).map(p=>p.y))<.003,'prone hoof floats');const knee=surface(pants,(a,j)=>a.getZ(j)*side>0&&Math.abs(a.getY(j)-.475)<.085);assert(Math.min(...knee.map(p=>p.y))<.015,'prone knee unsupported');}}
   previous=d;
  }}
 }finally{dispose();}
});
test('prone discharge uses the physical bore across arbitrary headings and elevation, with prompt recoil and a sighted eye',()=>{
 const {worker:w,motion:m,dispose}=setup();try{for(const heading of [-179,-43.7,0,22.5,137.2,180])for(const pitch of [-15,-7,0,11,20]){
  m.apply(PRONE_SHOT_TIME,{heading,pitch});const d=m.diagnostics(),axis=V(d.shot.direction),angle=pitch*Math.PI/180,h=heading*Math.PI/180;
  assert(axis.distanceTo(new T.Vector3(Math.cos(h)*Math.cos(angle),Math.sin(angle),Math.sin(h)*Math.cos(angle)))<1e-7);
  assert(w.rifle.parts.find(p=>p.name==='muzzle opening').getWorldPosition(new T.Vector3()).distanceTo(V(d.shot.origin))<.0002);
  const eye=V(profile.eye).applyMatrix4(w.skeleton.boneInverses[2]).applyMatrix4(w.bones[2].matrixWorld),sight=new T.Vector3(.48,.045,0).applyMatrix4(w.rifle.root.matrixWorld),off=eye.sub(sight);assert(off.addScaledVector(axis,-off.dot(axis)).length()<.012,'eye misses sight line');
  m.apply(PRONE_SHOT_TIME+.01,{heading,pitch});const early=m.diagnostics();assert(early.flash&&V(early.muzzle.origin).distanceTo(V(d.muzzle.origin))>.008);
  m.apply(PRONE_SHOT_TIME+.025,{heading,pitch});let last=V(m.diagnostics().muzzle.origin).distanceTo(V(d.muzzle.origin));
  for(const delta of [.06,.12,.2,.3,.4,.55]){m.apply(PRONE_SHOT_TIME+delta,{heading,pitch});const current=V(m.diagnostics().muzzle.origin).distanceTo(V(d.muzzle.origin));assert(current<=last+1e-7,'recovery reverses');last=current;}assert(last<1e-7);
 }}finally{dispose();}
});
test('prone scrubbing, interruption and disposal restore the approved rig and neutral surfaces',()=>{
 const w=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),original=w.parts.map(p=>({p,si:Array.from(p.geometry.attributes.skinIndex.array),sw:Array.from(p.geometry.attributes.skinWeight.array)})),m=createProneMotion(w,profile);
 try{const times=[0,.7,1.4,2.3,3.6,4.8,6.2,6.225,7.4,8.1,9.2,10.3,PRONE_DURATION],expected=times.map(t=>{m.apply(t,{heading:37,pitch:11});return JSON.stringify(m.diagnostics());});for(let i=times.length-1;i>=0;i--){m.apply(times[i],{heading:37,pitch:11});assert.equal(JSON.stringify(m.diagnostics()),expected[i]);}
  m.restore();for(const mesh of w.parts){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i);assert(mesh.applyBoneTransform(i,p.clone()).distanceTo(p)<1e-6);}}
  m.dispose();for(const {p,si,sw}of original){assert.deepEqual(Array.from(p.geometry.attributes.skinIndex.array),si);assert.deepEqual(Array.from(p.geometry.attributes.skinWeight.array),sw);}
 }finally{w.dispose();}
});
