import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createRoofMantle,ROOF_MANTLE_PHASES} from '../dist/tactics/roof-mantle.js';

const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),profile={id:'horse'};
const load=()=>createLightHorse(JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url))));
const phase=(m,label)=>{const p=m.phases.find(p=>p.label===label);assert(p,'Missing phase '+label);return p;};
const joint=(w,name)=>w.bones.find(b=>b.name===name).getWorldPosition(V());
function surfaces(w){
 const result=new Map();w.root.traverse(mesh=>{
  if(!mesh.isMesh)return;for(let p=mesh;p;p=p.parent)if(!p.visible)return;
  const ids=mesh.geometry.index?new Set(mesh.geometry.index.array):Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i);
  for(const i of ids)result.set(mesh.uuid+':'+i,{mesh,name:mesh.name,v:mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)});
 });return result;
}
function meshGap(mesh){
 let gap=Infinity;const a=mesh.geometry.attributes.position,ids=mesh.geometry.index?new Set(mesh.geometry.index.array):Array.from({length:a.count},(_,i)=>i);
 for(const i of ids){const p=mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld);if(p.x>=0&&p.x<=3&&Math.abs(p.z)<=2)gap=Math.min(gap,Math.abs(p.y-2));}return gap;
}
function entry(w){
 const objects=[];w.root.traverse(o=>objects.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible,children:[...o.children]}));
 return {objects,parts:w.parts.map(p=>({p,g:p.geometry,index:p.geometry.index,attributes:{...p.geometry.attributes},material:p.material,hook:p.material.onBeforeCompile,key:p.material.customProgramCacheKey}))};
}
function restored(w,s,{helpersGone=false}={}){
 for(const {o,p,q,s:scale,visible,children}of s.objects){assert(o.position.equals(p),'entry position: '+o.name);assert(o.quaternion.equals(q),'entry rotation: '+o.name);assert(o.scale.equals(scale),'entry scale: '+o.name);assert.equal(o.visible,visible,'entry visibility: '+o.name);if(helpersGone)assert.deepEqual(o.children,children,'temporary helpers retained: '+o.name);}
 for(const {p,g,index,attributes,material,hook,key}of s.parts){assert.equal(p.geometry,g);assert.equal(g.index,index);assert.deepEqual(Object.keys(g.attributes).sort(),Object.keys(attributes).sort());for(const [k,a]of Object.entries(attributes))assert.equal(g.attributes[k],a,'attribute identity '+k);assert.equal(p.material,material);assert.equal(material.onBeforeCompile,hook);assert.equal(material.customProgramCacheKey,key);}
}

test('mantle phases, exact IK reach and fixed limb lengths survive dense forward and reverse sampling',()=>{
 const w=load(),m=createRoofMantle(w,profile);try{
  assert(Object.isFrozen(ROOF_MANTLE_PHASES));assert(m.phases.every(Object.isFrozen));assert(m.duration>=6&&m.duration<=7);
  assert.equal(m.phases[0].start,0);assert.equal(m.phases.at(-1).end,m.duration);m.phases.forEach((p,i)=>{assert(p.end>p.start);if(i)assert.equal(p.start,m.phases[i-1].end);});
  for(const name of ['Press to waist','Lean forward and left','Right leg over','Lie flat','Gather legs underneath','Stand'])phase(m,name);
  const lengths=w.bones.filter(b=>b.parent.isBone).map(b=>({b,length:b.position.length()}));
  for(const direction of [1,-1]){let previous;
   for(let i=0;i<=400;i++){
    const result=m.apply(direction===1?i/400:1-i/400);
    for(const {b,length}of lengths){assert(Math.abs(b.position.length()-length)<1e-9,'local bone stretched '+b.name);assert(Math.abs(b.getWorldPosition(V()).distanceTo(b.parent.getWorldPosition(V()))-length)<1e-8,'world bone stretched '+b.name);}
    for(const c of result.contacts){assert(Number.isFinite(c.error)&&c.error<1e-5,`${result.time.toFixed(5)} ${c.id} unreachable: ${c.error}`);if(!c.planted)continue;assert(c.point&&c.worldPoint,'planted support lacks coordinates');assert(Math.abs(c.point[1]-(c.kind==='floor'?0:2))<1e-6,'planted support misses plane');const old=previous?.contacts.find(p=>p.id===c.id&&p.planted&&p.kind===c.kind);if(old)assert(V().fromArray(old.point).distanceTo(V().fromArray(c.point))<1e-8,'planted support slides: '+c.id);}
    if(result.index>0&&result.index<m.phases.length-1){assert.equal(result.equipment,'slung');assert(w.weapon.root.visible);}
    previous=result;
   }
  }
 }finally{m.dispose();w.dispose();}
});

test('rendered body, gloves, cuffs, rifle and sling clear the roof and ground',()=>{
 const w=load(),m=createRoofMantle(w,profile);try{
  for(let i=0;i<=320;i++){
   const result=m.apply(i/320);
   for(const {v,name}of surfaces(w).values()){
    assert(v.y>=-.001,`${name} below ground at ${result.time}`);
    if(v.x>0&&v.x<3&&v.y>0&&v.y<2&&Math.abs(v.z)<2){const depth=Math.min(v.x,3-v.x,v.y,2-v.y,2-Math.abs(v.z));assert(depth<.004,`${name} penetrates roof ${depth}m at ${result.time}`);}
   }
   for(const c of result.contacts.filter(c=>c.planted&&c.id.startsWith('hand'))){const grip=m.grips[c.id==='hand-1'?0:1];for(const finger of grip.meshes.slice(1,5))assert(meshGap(finger)<.003,`supporting finger misses roof at ${result.time}`);}
  }
 }finally{m.dispose();w.dispose();}
});

test('visible indexed surfaces and joint rotations remain continuous at every phase boundary',()=>{
 const w=load(),m=createRoofMantle(w,profile);try{
  for(const p of m.phases.slice(0,-1)){
   m.apply((p.end-1e-6)/m.duration);const a=surfaces(w),bones=w.bones.map(b=>({p:b.getWorldPosition(V()),q:b.getWorldQuaternion(Q())}));
   m.apply((p.end+1e-6)/m.duration);const b=surfaces(w);
   for(const [key,{v,name}]of a)if(b.has(key))assert(v.distanceTo(b.get(key).v)<.0001,`${name} pops at ${p.label}`);
   w.bones.forEach((bone,i)=>{assert(bone.getWorldPosition(V()).distanceTo(bones[i].p)<.0001,`joint position pops at ${p.label}: ${bone.name}`);assert(bone.getWorldQuaternion(Q()).angleTo(bones[i].q)<.001,`joint roll pops at ${p.label}: ${bone.name}`);});
  }
 }finally{m.dispose();w.dispose();}
});

test('the prone pause is genuinely flat and gathering retains physical support rather than floating into a squat',()=>{
 const w=load(),m=createRoofMantle(w,profile);try{
  const flat=phase(m,'Lie flat');assert(flat.end-flat.start>=.2,'no readable flat pause');let first;
  for(const t of [flat.start+.01,(flat.start+flat.end)/2,flat.end-.01]){
   m.apply(t/m.duration);const hips=joint(w,'hips'),shoulders=joint(w,'upperArm-1').add(joint(w,'upperArm1')).multiplyScalar(.5),axis=shoulders.clone().sub(hips).normalize();
   assert(Math.abs(axis.y)<.25,'flat pose still upright');assert(meshGap(w.parts[1])<.04,'overalls float above the roof in flat pause');
   const current=surfaces(w);if(first)for(const [key,{v}]of first)if(current.has(key))assert(v.distanceTo(current.get(key).v)<1e-6,'flat pause drifts');first=current;
  }
  const gather=phase(m,'Gather legs underneath'),stand=phase(m,'Stand');
  for(let i=0;i<=100;i++){
   const t=gather.start+(stand.end-gather.start)*i/100,r=m.apply(t/m.duration),holds=r.contacts.filter(c=>c.planted&&c.kind!=='floor');
   assert(holds.length>0,'no declared upper support during gather/stand at '+t);
   let actualSupport=false;
   for(const c of holds){if(c.id.startsWith('hand'))actualSupport ||= m.grips[c.id==='hand-1'?0:1].meshes.slice(1,5).some(mesh=>meshGap(mesh)<.004);else if(c.id.startsWith('foot'))actualSupport ||= meshGap(w.parts.find(p=>p.name==='exposed hoof '+(c.id==='foot-1'?-1:1)))<.015;}
   assert(actualSupport,'declared support has no actual contact at '+t);
  }
 }finally{m.dispose();w.dispose();}
});

test('carry endpoints, arbitrary world placement and visible surface scrubbing are deterministic',()=>{
 const w=load();w.pose('carry');const carry=w.bones.map(b=>({p:b.getWorldPosition(V()),q:b.getWorldQuaternion(Q())})),m=createRoofMantle(w,profile);try{
  for(const t of [0,1]){m.apply(t);w.bones.forEach((b,i)=>{assert(b.getWorldPosition(V()).sub(w.root.position).distanceTo(carry[i].p)<1e-8,'carry endpoint position '+b.name);assert(b.getWorldQuaternion(Q()).angleTo(carry[i].q)<1e-7,'carry endpoint rotation '+b.name);});}
  const samples=[0,.14,.31,.47,.58,.68,.74,.83,.96,1].map(t=>{m.apply(t);return {t,points:surfaces(w)};});
  for(const {t,points}of samples.reverse()){m.apply(t);const current=surfaces(w);assert.equal(current.size,points.size);for(const [key,{v,name}]of points)assert(v.distanceTo(current.get(key).v)<1e-8,'history changes '+name);}
  for(const t of [.2,.5,.73,.88]){
   const local=m.apply(t),points=surfaces(w),origin=[5,3,-7],heading=73,q=Q().setFromAxisAngle(new T.Vector3(0,1,0),-heading*Math.PI/180),world=m.apply(t,{origin,heading}),current=surfaces(w);
   // Authored float32 weights can sum a few ulps from one; translating seven
   // world units introduces sub-micrometre error without a pose difference.
   for(const [key,{v,name}]of points)assert(v.clone().applyQuaternion(q).add(V().fromArray(origin)).distanceTo(current.get(key).v)<1e-6,'world placement changes '+name);
   local.contacts.forEach((c,i)=>{if(c.point)assert(V().fromArray(c.point).applyQuaternion(q).add(V().fromArray(origin)).distanceTo(V().fromArray(world.contacts[i].worldPoint))<1e-8);});
  }
  for(const args of [[NaN],[Infinity],[.5,{origin:[0,NaN,0]}],[.5,{origin:[0,0]}],[.5,{heading:Infinity}]])assert.throws(()=>m.apply(...args),/Invalid/);
 }finally{m.dispose();w.dispose();}
});

test('constructor, cancellation and disposal restore exact entry transforms, attributes and material hooks',()=>{
 const w=load();w.parts[0].geometry.setAttribute('paintPart',new T.Float32BufferAttribute(new Float32Array(w.parts[0].geometry.attributes.position.count).fill(1),1));w.pose('carry');w.root.position.set(7,2,-4);w.root.rotation.set(.2,.6,-.1);const original=entry(w),m=createRoofMantle(w,profile);
 try{restored(w,original);for(const t of [.3,.58,.75,1]){m.apply(t);m.restore();restored(w,original);}m.apply(.6);m.dispose();m.dispose();restored(w,original,{helpersGone:true});assert.throws(()=>m.apply(0),/disposed/);}finally{m.dispose();w.dispose();}
});

test('unsupported setup, changed equipment and injected constructor failures cannot leave partial ownership',()=>{
 const w=load(),original=entry(w);try{
  assert.throws(()=>createRoofMantle(w,{id:'hen'}),/supports/);restored(w,original,{helpersGone:true});
  w.root.scale.setScalar(2);assert.throws(()=>createRoofMantle(w,profile),/unscaled/);w.root.scale.setScalar(1);restored(w,original,{helpersGone:true});
  const parent=new T.Group();parent.position.x=3;parent.add(w.root);assert.throws(()=>createRoofMantle(w,profile),/identity/);parent.remove(w.root);restored(w,original,{helpersGone:true});
  const pose=w.pose;let calls=0;w.pose=(...args)=>{if(++calls===2)throw Error('Injected mantle failure after helpers');return pose(...args);};assert.throws(()=>createRoofMantle(w,profile),/Injected/);w.pose=pose;restored(w,original,{helpersGone:true});
  const m=createRoofMantle(w,profile),weapon=w.weapon;try{w.equipWeapon({...weapon,root:new T.Group()});assert.throws(()=>m.apply(.5),/Equipment changed/);}finally{w.equipWeapon(weapon);m.dispose();}restored(w,original,{helpersGone:true});
 }finally{w.dispose();}
});
