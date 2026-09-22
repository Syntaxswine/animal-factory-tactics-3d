import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as roster} from '../dist/tactics/animal-motion-catalog.js';
import {createMammalMotion} from '../dist/tactics/animal-motion.js';import {createHenMotion} from '../dist/tactics/hen-motion.js';
const v=a=>new T.Vector3(...a),data=p=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)));
function setup(p){const w=p.create(data(p)),m=p.unarmed?createHenMotion(w):createMammalMotion(w,p);return {w,m,dispose(){m.restore();m.dispose();w.dispose();}};}
function surface(mesh,predicate=()=>true){const a=mesh.geometry.attributes.position,points=[];for(let i=0;i<a.count;i++)if(predicate(a,i))points.push(mesh.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(a,i)).applyMatrix4(mesh.matrixWorld));return points;}
// Static environment models share the reduced-mesh suffix but have no character rig.
const staticModels=new Set(['canvas-truck-10k-data.json',... ['lathe','mill','press'].map(k=>'machine-'+k+'-10k-data.json')]);
 test('motion catalog includes every completed reduced character exactly once',()=>{const files=fs.readdirSync(new URL('../dist/tactics/',import.meta.url)).filter(f=>f.endsWith('-10k-data.json')&&!staticModels.has(f));assert.deepEqual(roster.map(p=>p.file).sort(),files.sort());assert.equal(new Set(roster.map(p=>p.id)).size,12);});
for(const p of roster){
 test(p.id+': dense motion preserves bone lengths, planted soles, hand surfaces and floor clearance',()=>{const {w,m,dispose}=setup(p);try{
  const lengths=new Map(m.skeleton.bones.filter(b=>b.parent.isBone).map(b=>[b,b.position.length()])),feet=[-1,1].map(s=>w.parts.find(m=>/hoof|boot|foot|toes/.test(m.name)&&m.name.endsWith(' '+s)));let previous;
  for(let i=0;i<=550;i++){const t=i/50;m.apply(t);const d=m.diagnostics();
   for(const [b,length]of lengths)assert.ok(Math.abs(b.position.length()-length)<1e-7,'bone stretched '+b.name);
   const soles=feet.map((mesh,index)=>{const side=index===0?-1:1,points=surface(mesh,(a,j)=>a.getY(j)<.07),min=Math.min(...points.map(v=>v.y));assert.ok(min>=-1e-6,'sole through floor');if(d.feet[side].planted){assert.ok(min<.00003,'planted sole floats');if(previous?.d.feet[side].planted)for(let j=0;j<points.length;j++)assert.ok(points[j].distanceTo(previous.soles[index][j])<1e-7,'planted sole slides');}return points;});
   assert.ok(Object.values(d.feet).some(f=>f.planted),'no supporting foot');
   for(const contact of d.contacts){assert.ok(contact.error<1e-7,'grip anchor detached');if(i%5===0){const mesh=w.parts.find(m=>m.name==='forearm and hand '+contact.side),wrist=w.bones.find(b=>b.name==='hand'+contact.side),rest=new T.Vector3().setFromMatrixPosition(w.skeleton.boneInverses[w.bones.indexOf(wrist)].clone().invert()),hand=surface(mesh,(a,j)=>a.getY(j)<rest.y+.05);assert.ok(Math.min(...hand.map(q=>q.distanceTo(v(contact.grip))))<.018,'hand surface misses grip');}}
   if(previous)for(const side of [-1,1])for(const key of Object.keys(d.joints[side]))assert.ok(v(d.joints[side][key]).distanceTo(v(previous.d.joints[side][key]))<.07,'joint discontinuity');
   if(i%5===0)for(const mesh of w.parts)assert.ok(Math.min(...surface(mesh).map(q=>q.y))>-.002,'surface through floor: '+mesh.name+' @'+t);
   previous={d,soles};
  }
 }finally{dispose();}});
 test(p.id+': heading, elevation and discharge remain physical; hen reports unarmed coverage',()=>{const {w,m,dispose}=setup(p);try{
  for(const heading of [-179,-43.7,0,22.5,137.2,180])for(const pitch of [-15,0,20]){
   for(const t of [0,1.25,4.4,5.5,6.6,6.61,6.625,6.86,8.8,11])m.apply(t,{heading,pitch});
   m.apply(6.6,{heading,pitch});const d=m.diagnostics();if(p.unarmed){assert.equal(d.unarmed,true);assert.equal(d.flash,false);assert.equal(d.shot,undefined);assert.equal(w.rifle,undefined);continue;}
   const muzzle=w.rifle.parts.find(m=>m.name==='muzzle opening').getWorldPosition(new T.Vector3());assert.ok(muzzle.distanceTo(v(d.shot.origin))<.0002);
   const h=heading*Math.PI/180,a=pitch*Math.PI/180;assert.ok(v(d.shot.direction).distanceTo(new T.Vector3(Math.cos(h)*Math.cos(a),Math.sin(a),Math.sin(h)*Math.cos(a)))<1e-7);
   const eye=v(p.eye).applyMatrix4(w.skeleton.boneInverses[2]).applyMatrix4(w.bones[2].matrixWorld),sight=new T.Vector3(.48,.045,0).applyMatrix4(w.rifle.root.matrixWorld),off=eye.sub(sight),axis=v(d.shot.direction);assert.ok(off.addScaledVector(axis,-off.dot(axis)).length()<.025,'authored eye landmark misses sight line');
   m.apply(6.61,{heading,pitch});const early=m.diagnostics();assert.ok(early.flash&&v(early.muzzle.origin).distanceTo(v(d.muzzle.origin))>.008,'kick not visible during flash');
   m.apply(6.625,{heading,pitch});const peak=m.diagnostics(),kick=v(peak.muzzle.origin).distanceTo(v(d.muzzle.origin));let last=kick;
   for(const dt of [.06,.12,.2,.3,.4,.55]){m.apply(6.6+dt,{heading,pitch});const distance=v(m.diagnostics().muzzle.origin).distanceTo(v(d.muzzle.origin));assert.ok(distance<=last+1e-7,'recoil recovery reverses');if(dt===.2)assert.ok(distance>kick*.65,'recovery too fast');last=distance;}
   assert.ok(last<1e-7,'recoil never returns to shoulder');
  }
 }finally{dispose();}});
 test(p.id+': scrubbing and teardown preserve approved neutral shape and original rig',()=>{
  const w=p.create(data(p)),original=w.parts.map(mesh=>({mesh,si:Array.from(mesh.geometry.attributes.skinIndex.array),sw:Array.from(mesh.geometry.attributes.skinWeight.array)})),boneRest=w.bones.map(b=>({b,parent:b.parent,position:b.position.clone()}));
  const m=p.unarmed?createHenMotion(w):createMammalMotion(w,p);try{
   const times=[0,.25,.75,2.8,4.4,6.6,6.625,7.15,8.8,11],expected=times.map(t=>{m.apply(t,{heading:37,pitch:12});return JSON.stringify(m.diagnostics());});for(let i=times.length-1;i>=0;i--){m.apply(times[i],{heading:37,pitch:12});assert.equal(JSON.stringify(m.diagnostics()),expected[i]);}
   m.restore();for(const mesh of w.parts){const a=mesh.geometry.attributes.position,weights=mesh.geometry.attributes.skinWeight;for(let i=0;i<a.count;i++){const q=new T.Vector3().fromBufferAttribute(a,i);assert.ok(mesh.applyBoneTransform(i,q.clone()).distanceTo(q)<1e-6,'neutral shape changed');assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-6);}}
   m.dispose();for(const {mesh,si,sw}of original){assert.deepEqual(Array.from(mesh.geometry.attributes.skinIndex.array),si);assert.deepEqual(Array.from(mesh.geometry.attributes.skinWeight.array),sw);}for(const {b,parent,position}of boneRest){assert.equal(b.parent,parent);assert.ok(b.position.distanceTo(position)<1e-7,'original rig hierarchy not restored');}
  }finally{w.dispose();}
 });
}
