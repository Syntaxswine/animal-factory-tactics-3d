import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createLedgeDescent,LEDGE_DESCENT_PHASES} from '../dist/tactics/ledge-descent.js';

const V=(...args)=>new T.Vector3(...args),Q=()=>new T.Quaternion(),profile={id:'horse'};
const load=()=>createLightHorse(JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url))));
const joint=(w,name)=>w.bones.find(b=>b.name===name).getWorldPosition(V());
const phase=(m,name)=>{const p=m.phases.find(p=>p.label===name);assert(p,'missing '+name);return p;};
const at=(m,name,u=.5)=>{const p=phase(m,name);return m.apply((p.start+(p.end-p.start)*u)/m.duration);};
function surfaces(w){
 const out=new Map();w.root.traverse(mesh=>{
  if(!mesh.isMesh)return;for(let o=mesh;o;o=o.parent)if(!o.visible)return;
  const ids=mesh.geometry.index?new Set(mesh.geometry.index.array):Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i);
  for(const i of ids)out.set(mesh.uuid+':'+i,{mesh,name:mesh.name,p:mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)});
 });return out;
}
function gap(mesh,y){
 let nearest=Infinity;const ids=mesh.geometry.index?new Set(mesh.geometry.index.array):Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i);
 for(const i of ids){const p=mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld);if(y===0||p.x>=0&&p.x<=3&&Math.abs(p.z)<=2)nearest=Math.min(nearest,Math.abs(p.y-y));}return nearest;
}
function capture(w){
 const objects=[];w.root.traverse(o=>objects.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible,children:[...o.children]}));
 return {objects,parts:w.parts.map(p=>({p,g:p.geometry,index:p.geometry.index,attributes:{...p.geometry.attributes},material:p.material,hook:p.material.onBeforeCompile,key:p.material.customProgramCacheKey}))};
}
function restored(w,s,disposed=false){
 for(const {o,p,q,s:scale,visible,children}of s.objects){assert(o.position.equals(p),'entry position '+o.name);assert(o.quaternion.equals(q),'entry rotation '+o.name);assert(o.scale.equals(scale),'entry scale '+o.name);assert.equal(o.visible,visible);if(disposed)assert.deepEqual(o.children,children,'temporary children remain');}
 for(const {p,g,index,attributes,material,hook,key}of s.parts){assert.equal(p.geometry,g);assert.equal(g.index,index);assert.deepEqual(Object.keys(g.attributes).sort(),Object.keys(attributes).sort());for(const [k,a]of Object.entries(attributes))assert.equal(g.attributes[k],a,'attribute identity '+k);assert.equal(p.material,material);assert.equal(material.onBeforeCompile,hook);assert.equal(material.customProgramCacheKey,key);}
}

test('descent is an outward-facing one-hand hop, release, absorption and ready sequence',()=>{
 const w=load(),m=createLedgeDescent(w,profile);try{
  assert(Object.isFrozen(LEDGE_DESCENT_PHASES));assert(m.phases.every(Object.isFrozen));
  assert.deepEqual(m.phases.map(p=>p.label),['Stow weapon','Crouch at edge','Plant left hand','Hop off holding edge','Lower on left hand','Release and drop','Absorb landing','Stand','Ready weapon']);
  assert.equal(m.phases[0].start,0);assert.equal(m.phases.at(-1).end,m.duration);m.phases.forEach((p,i)=>{assert(p.end>p.start);if(i)assert.equal(p.start,m.phases[i-1].end);});
  at(m,'Stow weapon',0);const standing=joint(w,'hips').y;
  at(m,'Crouch at edge',1);assert(joint(w,'hips').y<standing-.4,'crouch does not lower pelvis');
  for(const name of ['Hop off holding edge','Lower on left hand'])for(const u of [.001,.25,.5,.75,1]){
   const r=at(m,name,u),left=r.contacts.find(c=>c.id==='hand-1'),right=r.contacts.find(c=>c.id==='hand1');assert(left.planted&&left.kind==='roof','left hand must retain edge');assert(!right.planted,'right hand unexpectedly supports descent');
   assert(V(...left.point).distanceTo(V(.015,2,.26))<1e-8,'edge grip slides');
   for(const finger of m.grips[0].meshes.slice(1,5))assert(gap(finger,2)<.003,'declared hold lacks rendered finger contact');
  }
  const hop=at(m,'Hop off holding edge',.5);assert(hop.contacts.filter(c=>c.id.startsWith('foot')).every(c=>c.point[1]>2.1),'hooves never hop clear of top');
  const release=at(m,'Release and drop',.5);assert(release.contacts.every(c=>!c.planted),'release still attached to ledge');
  at(m,'Absorb landing',0);const land=joint(w,'hips').y;at(m,'Absorb landing',1);assert(joint(w,'hips').y<land-.15,'landing has no absorption');
  for(const name of ['Absorb landing','Stand','Ready weapon'])for(const u of [.001,.5,1]){const r=at(m,name,u);assert(r.contacts.filter(c=>c.id.startsWith('foot')).every(c=>c.planted&&c.kind==='floor'),'landing feet must remain planted');}
  for(const t of [0,.2,.4,.6,.8,1]){m.apply(t);const head=w.bones.find(b=>b.name==='head');assert(V(1,0,0).applyQuaternion(head.getWorldQuaternion(Q())).x<-.45,'actor turns inward');}
  m.apply(0);const first=surfaces(w),startRoot=w.root.position.clone();m.apply(1);const last=surfaces(w),delta=w.root.position.clone().sub(startRoot);assert.equal(first.size,last.size);for(const [k,{p,name}]of first)assert(p.clone().add(delta).distanceTo(last.get(k).p)<1e-6,'ready pose differs from entry carry '+name);
 }finally{m.dispose();w.dispose();}
});

test('descent solves reachable fixed-length limbs with stationary planted supports in both playback directions',()=>{
 const w=load(),m=createLedgeDescent(w,profile);try{
  const lengths=w.bones.filter(b=>b.parent.isBone).map(b=>({b,length:b.position.length()}));
  for(const direction of [1,-1]){let previous;for(let i=0;i<=400;i++){
   const r=m.apply(direction===1?i/400:1-i/400);
   for(const {b,length}of lengths){assert(Math.abs(b.position.length()-length)<1e-9,'local bone stretched '+b.name);assert(Math.abs(joint(w,b.name).distanceTo(b.parent.getWorldPosition(V()))-length)<1e-8,'world bone stretched '+b.name);}
   for(const c of r.contacts){assert(Number.isFinite(c.error)&&c.error<1e-5,`${r.time.toFixed(5)} ${c.id} unreachable ${c.error}`);if(!c.planted)continue;assert(c.point&&c.worldPoint);assert(Math.abs(c.point[1]-(c.kind==='floor'?0:2))<1e-8);const old=previous?.contacts.find(p=>p.id===c.id&&p.planted&&p.kind===c.kind);if(old)assert(V(...old.point).distanceTo(V(...c.point))<1e-8,'planted support slides '+c.id);}
   if(r.index>0&&r.index<8){assert.equal(r.equipment,'slung');assert(w.weapon.root.visible);}
   previous=r;
  }}
 }finally{m.dispose();w.dispose();}
});

test('actual indexed body, glove, hoof, rifle and sling vertices clear the ledge and floor',()=>{
 const w=load(),m=createLedgeDescent(w,profile);try{
  for(let i=0;i<=320;i++){
   const r=m.apply(i/320);
   for(const {p,name}of surfaces(w).values()){
    assert([p.x,p.y,p.z].every(Number.isFinite),'non-finite surface '+name);assert(p.y>=-.001,`${name} below floor at ${r.time}`);
    if(p.x>0&&p.x<3&&p.y>0&&p.y<2&&Math.abs(p.z)<2){const depth=Math.min(p.x,3-p.x,p.y,2-p.y,2-Math.abs(p.z));assert(depth<.004,`${name} penetrates ledge ${depth}m at ${r.time}`);}
   }
   for(const c of r.contacts.filter(c=>c.planted&&c.id.startsWith('foot'))){const hoof=w.parts.find(p=>p.name==='exposed hoof '+(c.id==='foot-1'?-1:1));assert(gap(hoof,c.kind==='roof'?2:0)<.015,'declared sole contact floats '+r.time);}
  }
 }finally{m.dispose();w.dispose();}
});

test('phase boundaries keep actual visible surfaces and joint rotations continuous',()=>{
 const w=load(),m=createLedgeDescent(w,profile);try{
  for(const phase of m.phases.slice(0,-1)){
   m.apply((phase.end-1e-6)/m.duration);const a=surfaces(w),bones=w.bones.map(b=>({p:b.getWorldPosition(V()),q:b.getWorldQuaternion(Q())}));
   m.apply((phase.end+1e-6)/m.duration);const b=surfaces(w);
   for(const [k,{p,name}]of a)if(b.has(k))assert(p.distanceTo(b.get(k).p)<.0001,`${name} pops at ${phase.label}`);
   w.bones.forEach((bone,i)=>{assert(bone.getWorldPosition(V()).distanceTo(bones[i].p)<.0001,`joint pops at ${phase.label}: ${bone.name}`);assert(bone.getWorldQuaternion(Q()).angleTo(bones[i].q)<.001,`joint roll pops at ${phase.label}: ${bone.name}`);});
  }
 }finally{m.dispose();w.dispose();}
});

test('scrubbing is history independent and placement rigidly transforms every rendered surface and contact',()=>{
 const w=load(),m=createLedgeDescent(w,profile);try{
  const snapshots=[0,.1,.28,.39,.47,.56,.64,.71,.82,.93,1].map(t=>{m.apply(t);return {t,points:surfaces(w)};});
  for(const {t,points}of snapshots.reverse()){m.apply(t);const current=surfaces(w);assert.equal(current.size,points.size);for(const [k,{p,name}]of points)assert(p.distanceTo(current.get(k).p)<1e-8,'history changes '+name);}
  for(const t of [.1,.3,.48,.6,.76,.92]){const local=m.apply(t),points=surfaces(w),origin=[5,3,-7],heading=73,q=Q().setFromAxisAngle(V(0,1,0),-heading*Math.PI/180),world=m.apply(t,{origin,heading}),current=surfaces(w);for(const [k,{p,name}]of points)assert(p.clone().applyQuaternion(q).add(V(...origin)).distanceTo(current.get(k).p)<1e-6,'placement distorts '+name);local.contacts.forEach((c,i)=>{if(c.point)assert(V(...c.point).applyQuaternion(q).add(V(...origin)).distanceTo(V(...world.contacts[i].worldPoint))<1e-8);});}
  for(const args of [[NaN],[Infinity],[.5,{origin:[0,NaN,0]}],[.5,{origin:[0,0]}],[.5,{heading:Infinity}]])assert.throws(()=>m.apply(...args),/Invalid/);
 }finally{m.dispose();w.dispose();}
});

test('construction, cancellation, failure and disposal preserve exact source geometry and material hooks',()=>{
 const w=load();w.parts[0].geometry.setAttribute('paintPart',new T.Float32BufferAttribute(new Float32Array(w.parts[0].geometry.attributes.position.count).fill(1),1));w.pose('carry');w.root.position.set(7,2,-4);w.root.rotation.set(.2,.6,-.1);const original=capture(w);let m;
 try{
  assert.throws(()=>createLedgeDescent(w,{id:'hen'}),/supports/);restored(w,original,true);
  w.root.scale.setScalar(2);assert.throws(()=>createLedgeDescent(w,profile),/unscaled/);w.root.scale.setScalar(1);restored(w,original,true);
  const pose=w.pose;let calls=0;w.pose=(...args)=>{if(++calls===2)throw Error('Injected descent failure after helpers');return pose(...args);};assert.throws(()=>createLedgeDescent(w,profile),/Injected/);w.pose=pose;restored(w,original,true);
  m=createLedgeDescent(w,profile);restored(w,original);for(const t of [.2,.5,.7,1]){m.apply(t);m.restore();restored(w,original);}
  m.apply(.6);m.dispose();m.dispose();restored(w,original,true);assert.throws(()=>m.apply(0),/disposed/);
 }finally{m?.dispose();w.dispose();}
});
