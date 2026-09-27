import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createRoofMantle} from '../dist/tactics/roof-mantle.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';

// These are actual authored smaller meshes. Painted outfits, added Red Hat
// caps and the donkey guide require the separate browser/visual review matrix.
const mammals=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed);
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
const load=p=>p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));
const phase=(m,name)=>{const p=m.phases.find(p=>p.label===name);assert(p,'Missing '+name);return p;};
const joint=(w,name)=>w.bones.find(b=>b.name===name).getWorldPosition(V());
const ids=mesh=>mesh.geometry.index?new Set(mesh.geometry.index.array):Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i);
function surfaces(w){
 const result=new Map();w.root.traverse(mesh=>{
  if(!mesh.isMesh)return;for(let p=mesh;p;p=p.parent)if(!p.visible)return;
  for(const i of ids(mesh))result.set(mesh.uuid+':'+i,{name:mesh.name,v:mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)});
 });return result;
}
function roofGap(mesh){
 let gap=Infinity;for(const i of ids(mesh)){const p=mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld);if(p.x>=0&&p.x<=3&&Math.abs(p.z)<=2)gap=Math.min(gap,Math.abs(p.y-2));}return gap;
}
function foot(w,side){const p=w.parts.find(p=>/(hoof|boot|foot)/i.test(p.name)&&p.name.endsWith(' '+side));assert(p,'Missing authored foot '+side);return p;}
function entry(w){
 const objects=[];w.root.traverse(o=>objects.push({o,p:o.position.clone(),q:o.quaternion.clone(),scale:o.scale.clone(),visible:o.visible,children:[...o.children]}));
 const parts=w.parts.map(p=>({p,g:p.geometry,index:p.geometry.index,indexData:p.geometry.index?.array.slice(),attributes:Object.fromEntries(Object.entries(p.geometry.attributes).map(([k,a])=>[k,{a,data:a.array.slice()}])),material:p.material,hook:p.material.onBeforeCompile,key:p.material.customProgramCacheKey}));
 return {objects,parts};
}
function assertEntry(w,s,final=false){
 for(const {o,p,q,scale,visible,children}of s.objects){assert(o.position.equals(p),'entry position '+o.name);assert(o.quaternion.equals(q),'entry rotation '+o.name);assert(o.scale.equals(scale),'entry scale '+o.name);assert.equal(o.visible,visible);if(final)assert.deepEqual(o.children,children,'retained helpers '+o.name);}
 for(const {p,g,index,indexData,attributes,material,hook,key}of s.parts){assert.equal(p.geometry,g);assert.equal(g.index,index);if(index)assert.deepEqual(index.array,indexData,'source indices changed');assert.deepEqual(Object.keys(g.attributes).sort(),Object.keys(attributes).sort());for(const [k,{a,data}]of Object.entries(attributes)){assert.equal(g.attributes[k],a,'attribute identity '+k);assert.deepEqual(a.array,data,'source attribute modified '+k);}assert.equal(p.material,material);assert.equal(material.onBeforeCompile,hook);assert.equal(material.customProgramCacheKey,key);}
}
function withMotion(profile,run){const w=load(profile);let m;try{m=createRoofMantle(w,profile);run(w,m);}finally{m?.dispose();w.dispose();}}

test('roof mantle mammal matrix covers all eleven completed species without treating hen as a mammal',()=>{
 assert.deepEqual(mammals.map(p=>p.id),['horse','goat','bull','cow','donkey','sheep','skunk','pig-foreman','pig-director','rabbit','dog']);
});

test('donkey guide climbs unarmed without creating a rifle grasp or exposing a sling',()=>{
 const profile=mammals.find(p=>p.id==='donkey'),w=load(profile),hands=createWeaponModel('hands');w.equipWeapon(hands);w.pose('carry');const original=entry(w);let m;
 try{m=createRoofMantle(w,profile);assert.equal(m.phases[0].label,'Prepare to climb');assert.equal(m.phases.at(-1).label,'Settle stance');
  for(let i=0;i<=160;i++){const r=m.apply(i/160);assert.equal(r.equipment,'empty');assert(r.contacts.every(c=>c.kind!=='weapon'&&c.error<1e-6));assert.equal(w.root.getObjectByName('Equipment shoulder sling').visible,false);}
  m.dispose();assertEntry(w,original,true);
 }finally{m?.dispose();hands.dispose();w.dispose();}
});

for(const profile of mammals){
 test(profile.id+': fixed lengths, exact reach and genuine gather support across forward/reverse playback',()=>withMotion(profile,(w,m)=>{
  const lengths=w.bones.filter(b=>b.parent.isBone).map(b=>({b,length:b.position.length()})),gather=phase(m,'Gather legs underneath'),stand=phase(m,'Stand');
  assert(m.duration>=6&&m.duration<=7);assert(Object.isFrozen(m.phases));assert(m.phases.every(Object.isFrozen));
  for(const direction of [1,-1]){let previous;
   for(let i=0;i<=400;i++){
    const r=m.apply(direction===1?i/400:1-i/400);
    for(const {b,length}of lengths){assert(Math.abs(b.position.length()-length)<1e-9,'bone length '+b.name);assert(Math.abs(b.getWorldPosition(V()).distanceTo(b.parent.getWorldPosition(V()))-length)<1e-8,'world segment length '+b.name);}
    for(const c of r.contacts){assert(Number.isFinite(c.error)&&c.error<1e-5,`${profile.id} ${r.time} ${c.id} reach ${c.error}`);if(!c.planted)continue;assert(c.point&&c.worldPoint,'support coordinates missing');assert(Math.abs(c.point[1]-(c.kind==='floor'?0:2))<1e-6,'support misses plane');const old=previous?.contacts.find(p=>p.id===c.id&&p.planted&&p.kind===c.kind);if(old)assert(V().fromArray(old.point).distanceTo(V().fromArray(c.point))<1e-8,'planted support slides '+c.id);}
    if(r.time>=gather.start&&r.time<=stand.end){
     const holds=r.contacts.filter(c=>c.planted&&c.kind!=='floor');assert(holds.length,'unsupported gather/stand at '+r.time);let actual=false;
     for(const c of holds){if(c.id.startsWith('hand'))actual ||= m.grips[c.id==='hand-1'?0:1].meshes.slice(1,5).some(mesh=>roofGap(mesh)<.004);else if(c.id.startsWith('foot'))actual ||= roofGap(foot(w,c.id==='foot-1'?-1:1))<.015;}
     assert(actual,'declared support does not touch the roof at '+r.time);
    }
    if(r.index>0&&r.index<m.phases.length-1){assert.equal(r.equipment,'slung');assert(w.weapon.root.visible);}
    previous=r;
   }
  }
  const flat=phase(m,'Lie flat');assert(flat.end-flat.start>=.2);let initial;
  for(const t of [flat.start+.01,(flat.start+flat.end)/2,flat.end-.01]){
   m.apply(t/m.duration);const shoulder=joint(w,'upperArm-1').add(joint(w,'upperArm1')).multiplyScalar(.5),axis=shoulder.sub(joint(w,'hips')).normalize();assert(Math.abs(axis.y)<.25,'not a flat prone pause');
   assert(Math.min(roofGap(w.parts[0]),roofGap(w.parts[1]))<.04,'body floats in prone pause');
   const current=surfaces(w);if(initial)for(const [key,{v}]of initial)if(current.has(key))assert(v.distanceTo(current.get(key).v)<1e-6,'pause drifts');initial=current;
  }
 }));

 test(profile.id+': every visible body/accessory/glove/rifle surface clears the real roof volume',()=>withMotion(profile,(w,m)=>{
  for(let i=0;i<=320;i++){
   const r=m.apply(i/320);
   for(const {v,name}of surfaces(w).values()){
    assert(v.y>=-.001,`${profile.id} ${name} below ground at ${r.time}`);
    if(v.x>0&&v.x<3&&v.y>0&&v.y<2&&Math.abs(v.z)<2){const depth=Math.min(v.x,3-v.x,v.y,2-v.y,2-Math.abs(v.z));assert(depth<.004,`${profile.id} ${name} roof depth ${depth} at ${r.time}`);}
   }
   for(const c of r.contacts.filter(c=>c.planted&&c.id.startsWith('hand')))for(const finger of m.grips[c.id==='hand-1'?0:1].meshes.slice(1,5))assert(roofGap(finger)<.003,'supporting fingers float '+r.time);
  }
 }));

 test(profile.id+': all phase boundaries and source/carry endpoints remain continuous and reversible',()=>withMotion(profile,(w,m)=>{
  for(const p of m.phases.slice(0,-1)){
   m.apply((p.end-1e-6)/m.duration);const a=surfaces(w),bones=w.bones.map(b=>({p:b.getWorldPosition(V()),q:b.getWorldQuaternion(Q())}));m.apply((p.end+1e-6)/m.duration);const b=surfaces(w);
   for(const [key,{v,name}]of a)if(b.has(key))assert(v.distanceTo(b.get(key).v)<.0001,`${name} pops at ${p.label}`);
   w.bones.forEach((bone,i)=>{assert(bone.getWorldPosition(V()).distanceTo(bones[i].p)<.0001,'joint position pop '+p.label+' '+bone.name);assert(bone.getWorldQuaternion(Q()).angleTo(bones[i].q)<.001,'joint roll pop '+p.label+' '+bone.name);});
  }
  const samples=[0,.17,.35,.51,.62,.74,.86,1].map(t=>{m.apply(t);return {t,points:surfaces(w)};});
  for(const {t,points}of samples.reverse()){m.apply(t);const current=surfaces(w);assert.equal(current.size,points.size);for(const [key,{v,name}]of points)assert(v.distanceTo(current.get(key).v)<1e-8,'history changes '+name);}
  m.restore();w.pose('carry');w.root.updateMatrixWorld(true);const carry=w.bones.map(b=>({p:b.getWorldPosition(V()).sub(w.root.position),q:b.getWorldQuaternion(Q())}));
  for(const progress of [0,1]){m.apply(progress);w.bones.forEach((b,i)=>{assert(b.getWorldPosition(V()).sub(w.root.position).distanceTo(carry[i].p)<1e-8,'carry endpoint position '+b.name);assert(b.getWorldQuaternion(Q()).angleTo(carry[i].q)<1e-7,'carry endpoint rotation '+b.name);});}
  for(const t of [.3,.6,.8]){
   const r=m.apply(t),a=surfaces(w),origin=[5,3,-7],q=Q().setFromAxisAngle(new T.Vector3(0,1,0),-73*Math.PI/180),world=m.apply(t,{origin,heading:73}),b=surfaces(w);
   // Float32 skin-weight sums introduce sub-micrometre translated error.
   for(const [key,{v,name}]of a)assert(v.clone().applyQuaternion(q).add(V().fromArray(origin)).distanceTo(b.get(key).v)<1e-6,'world placement changes '+name);
   r.contacts.forEach((c,i)=>{if(c.point)assert(V().fromArray(c.point).applyQuaternion(q).add(V().fromArray(origin)).distanceTo(V().fromArray(world.contacts[i].worldPoint))<1e-8);});
  }
 }));

 test(profile.id+': cancellation, replay, disposal and failed construction preserve source ownership',()=>{
  const w=load(profile);let m;try{
   w.parts[0].geometry.setAttribute('paintPart',new T.Float32BufferAttribute(new Float32Array(w.parts[0].geometry.attributes.position.count).fill(1),1));w.pose('carry');w.root.position.set(7,2,-4);w.root.rotation.set(.2,.6,-.1);const s=entry(w);
   m=createRoofMantle(w,profile);assertEntry(w,s);
   for(const t of [.25,.58,.78,1]){m.apply(t);m.restore();assertEntry(w,s);}
   for(const args of [[NaN],[Infinity],[.4,{origin:[0,NaN,0]}],[.4,{heading:Infinity}]])assert.throws(()=>m.apply(...args),/Invalid/);
   m.dispose();m.dispose();assertEntry(w,s,true);assert.throws(()=>m.apply(0),/disposed/);m=null;
   const pose=w.pose;let calls=0;w.pose=(...args)=>{if(++calls===2)throw Error('Injected roster mantle failure');return pose(...args);};try{assert.throws(()=>createRoofMantle(w,profile),/Injected roster mantle failure/);}finally{w.pose=pose;}assertEntry(w,s,true);
  }finally{m?.dispose();w.dispose();}
 });
}
