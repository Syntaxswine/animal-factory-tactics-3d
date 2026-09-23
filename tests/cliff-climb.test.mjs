import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createCliffClimb,CLIFF_CLIMB_PHASES} from '../dist/tactics/cliff-climb.js';
const load=()=>createLightHorse(JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url))));
const V=()=>new T.Vector3(),profile={id:'horse'};
function visibleSurfaces(w){
 const out=new Map();w.root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;
  const ids=o.geometry.index?new Set(o.geometry.index.array):Array.from({length:o.geometry.attributes.position.count},(_,i)=>i);
  for(const i of ids)out.set(o.uuid+':'+i,{name:o.name,v:o.getVertexPosition(i,V()).applyMatrix4(o.matrixWorld)});
 });return out;
}
function snapshot(w){const objects=[];w.root.traverse(o=>objects.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible}));return {objects,geometry:w.parts.map(p=>({g:p.geometry,index:p.geometry.index,attributes:{...p.geometry.attributes}}))};}
function restored(w,s){for(const {o,p,q,s:scale,visible}of s.objects){assert(o.position.equals(p));assert(o.quaternion.equals(q));assert(o.scale.equals(scale));assert.equal(o.visible,visible);}for(const {g,index,attributes}of s.geometry){assert.equal(g.index,index);for(const [k,a]of Object.entries(attributes))assert.equal(g.attributes[k],a);}}

test('six-second cliff climb keeps hands, soles and rigid limb lengths through the support transfers',()=>{
 const w=load(),m=createCliffClimb(w,profile);try{
  assert.equal(m.duration,6);assert(Object.isFrozen(CLIFF_CLIMB_PHASES));assert(CLIFF_CLIMB_PHASES.every(Object.isFrozen));
  assert.deepEqual(m.phases.filter(p=>/Stow|Jump|Pull|Stand|Ready/.test(p.label)).map(p=>p.label),['Stow weapon','Jump and grab the edge','Pull up','Stand','Ready weapon']);
  const lengths=w.bones.filter(b=>b.parent.isBone).map(b=>({b,length:b.position.length()}));let last;
  for(let i=0;i<=360;i++){
   const r=m.apply(i/360);for(const {b,length}of lengths)assert(Math.abs(b.position.length()-length)<1e-9,'bone stretched');
   for(const c of r.contacts){assert(c.error<.00001,r.phase+' '+c.id+' unreachable');if(c.planted){assert.equal(c.point[1],c.kind==='floor'?0:2);const before=last?.contacts.find(x=>x.id===c.id&&x.planted&&x.kind===c.kind);if(before)assert(V().fromArray(c.point).distanceTo(V().fromArray(before.point))<1e-9,'support slid');}}
   if(r.time>=1.55&&r.time<=3.19)assert.equal(r.contacts.filter(c=>c.kind==='edge').length,2,'released edge before hoof plant');
   if(r.time>=3.2)assert(r.contacts.find(c=>c.id==='foot1').planted,'no upper support');
   if(r.time>.8&&r.time<5.1){assert.equal(r.equipment,'slung');assert(w.weapon.root.visible);}
   last=r;
  }
  m.apply(2.95/6);assert(new T.Vector3(0,1,0).applyQuaternion(w.bones.find(b=>b.name==='spine').getWorldQuaternion(new T.Quaternion())).z<-.6,'left lean missing during right leg swing');
 }finally{m.dispose();w.dispose();}
});

test('chest loads forward before hip extension, one palm supports the push, and trailing leg follows',()=>{
 const w=load(),m=createCliffClimb(w,profile),bone=n=>w.bones.find(b=>b.name===n),position=n=>bone(n).getWorldPosition(V()),shoulders=()=>position('upperArm-1').add(position('upperArm1')).multiplyScalar(.5);
 try{
  m.apply(0);const planes=[-1,1].map(side=>({side,n:position('shin'+side).sub(position('thigh'+side)).cross(position('hoof'+side).sub(position('shin'+side))).normalize()}));
  m.apply(3.2/6);const startHip=position('hips'),startShoulders=shoulders();let rose=false,lastSupport=3.2;
  for(let i=0;i<=115;i++){const t=3.2+i*.01,r=m.apply(t/6),hips=position('hips'),chest=shoulders(),hands=r.contacts.filter(c=>c.id.startsWith('hand')&&c.planted);
   if(!rose&&hips.y>startHip.y+.05){assert(chest.x>startShoulders.x+.18,'hips lift before the chest advances');rose=true;}
   if(t<=3.75)assert(hands.length>=1,'unsupported early push');
   if(hands.length)lastSupport=t;
   for(const contact of hands){const grip=m.grips[contact.id==='hand-1'?0:1];for(const finger of grip.meshes.slice(1,5)){let gap=Infinity;for(const j of new Set(finger.geometry.index.array)){const p=finger.getVertexPosition(j,V()).applyMatrix4(finger.matrixWorld);if(p.x>0)gap=Math.min(gap,Math.abs(p.y-2));}assert(gap<.003,'supporting fingers float above the cap');}}
   if(!hands.length&&t<3.85){assert(hips.x>=0,'last palm released with hips outside');assert(chest.x>.25,'last palm released before torso reaches planted hoof');}
   const trail=r.contacts.find(c=>c.id==='foot-1');if(t<=3.49)assert(Math.abs(trail.point[1]-1.24)<1e-8,'trailing leg lifts before forward loading');if(trail.point[0]>=0)assert(t>lastSupport&&lastSupport>=3.75,'trailing leg crosses before supported transfer');
   for(const {side,n}of planes){const upper=n.clone().applyQuaternion(bone('thigh'+side).getWorldQuaternion(new T.Quaternion())),lower=n.clone().applyQuaternion(bone('shin'+side).getWorldQuaternion(new T.Quaternion()));assert(upper.dot(lower)>1-1e-8,'opposing knee roll twists the trouser surface');}
  }
  assert(rose);assert(lastSupport>=3.75);
 }finally{m.dispose();w.dispose();}
});

test('all rendered surfaces clear the cliff and floor, fingertips meet the ledge, and phase boundaries are continuous',()=>{
 const w=load(),m=createCliffClimb(w,profile);try{
  for(let i=0;i<=240;i++){const r=m.apply(i/240),surface=visibleSurfaces(w);for(const {v,name}of surface.values()){assert(v.y>-.001,name+' below floor');if(v.y>=0&&Math.abs(v.z)<2)assert(Math.min(v.x,2-v.y)<.004,name+' penetrates cliff at '+r.time);}
   if(r.time>=1.55&&r.time<=3.19)for(const grip of m.grips)for(const finger of grip.meshes.slice(1,5)){let distance=Infinity;for(const j of new Set(finger.geometry.index.array)){const v=finger.getVertexPosition(j,V()).applyMatrix4(finger.matrixWorld);if(v.x>0)distance=Math.min(distance,Math.abs(v.y-2));}assert(distance<.003,'finger floats above ledge');}
  }
  for(const phase of m.phases.slice(0,-1)){m.apply((phase.end-1e-6)/6);const a=visibleSurfaces(w);m.apply((phase.end+1e-6)/6);const b=visibleSurfaces(w);for(const [key,{v,name}]of a)if(b.has(key))assert(v.distanceTo(b.get(key).v)<.0001,name+' pops at '+phase.label);}
 }finally{m.dispose();w.dispose();}
});

test('scrubbing is deterministic and world-frame placement preserves contact points',()=>{
 const w=load();w.pose('carry');const carry=w.bones.map(b=>({p:b.getWorldPosition(V()),q:b.getWorldQuaternion(new T.Quaternion())})),m=createCliffClimb(w,profile);try{
  for(const t of [0,1]){m.apply(t);w.bones.forEach((b,i)=>{assert(b.getWorldPosition(V()).sub(w.root.position).distanceTo(carry[i].p)<1e-8,'carry endpoint position changes');assert(b.getWorldQuaternion(new T.Quaternion()).angleTo(carry[i].q)<1e-7,'carry endpoint rotation changes');});}
  const samples=[.05,.2,.4,.49,.6,.72,.9,1].map(t=>{m.apply(t);return {t,points:w.bones.map(b=>b.getWorldPosition(V()))};});
  for(const {t,points}of samples.reverse()){m.apply(t);w.bones.forEach((b,i)=>assert(b.getWorldPosition(V()).distanceTo(points[i])<1e-9));}
  const local=m.apply(.49),origin=[5,3,-7],heading=73,q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-heading*Math.PI/180),world=m.apply(.49,{origin,heading});
  local.contacts.forEach((c,i)=>{if(c.point)assert(V().fromArray(c.point).applyQuaternion(q).add(V().fromArray(origin)).distanceTo(V().fromArray(world.contacts[i].worldPoint))<1e-9);});
  for(const args of [[NaN],[.5,{origin:[0,NaN,0]}],[.5,{heading:Infinity}]])assert.throws(()=>m.apply(...args),/Invalid/);
 }finally{m.dispose();w.dispose();}
});

test('deep flex keeps the upper pastern attached to the shin and the horn and sole rigid',()=>{
 const w=load(),m=createCliffClimb(w,profile);try{
  for(const t of [0,2.7,2.9,3.2,3.6,4.1,6]){m.apply(t/6);for(const side of [-1,1]){
   const hoof=w.parts.find(p=>p.name==='exposed hoof '+side),position=hoof.geometry.attributes.position;
   for(let i=0;i<position.count;i++){const y=position.getY(i);if(y>.17&&y<.27)continue;
    const bone=w.bones.findIndex(b=>b.name===(y>=.27?'shin':'hoof')+side),expected=V().fromBufferAttribute(position,i).applyMatrix4(w.skeleton.boneInverses[bone]).applyMatrix4(w.bones[bone].matrixWorld),actual=hoof.getVertexPosition(i,V()).applyMatrix4(hoof.matrixWorld);
    assert(actual.distanceTo(expected)<1e-6,(y>=.27?'upper pastern separates from cuff':'rigid horn/sole deforms')+' at '+t);
   }
  }}
 }finally{m.dispose();w.dispose();}
});

test('both legs swing right while the leading knee clears the rim and the trailing leg stays lower',()=>{
 const w=load(),m=createCliffClimb(w,profile),joint=name=>w.bones.find(b=>b.name===name).getWorldPosition(V());try{
  m.apply(2.9/6);const knee=joint('shin1'),ankle=joint('hoof1'),trailingKnee=joint('shin-1'),trailingAnkle=joint('hoof-1');
  assert(knee.y>2.1&&knee.y>ankle.y,'right knee must lead the hoof over the rim');
  assert(ankle.z>.5&&knee.z>joint('thigh1').z,'leading leg remains tucked under torso');
  assert(trailingKnee.y<2&&trailingAnkle.y<1.5&&trailingAnkle.x<0&&trailingAnkle.z>.12&&trailingKnee.z>joint('thigh-1').z+.12,'trailing leg must swing right below the leading leg');
  const plant=m.apply(3.21/6).contacts.find(c=>c.id==='foot1').worldPoint;
  assert(plant[0]>.15&&plant[2]>.45,'right landing is not clear of the torso');
  for(const t of [3.5,3.85,4.35,5.1,6]){const r=m.apply(t/6);assert(V().fromArray(r.contacts.find(c=>c.id==='foot1').worldPoint).distanceTo(V().fromArray(plant))<1e-9,'wide plant slides during transfer');}
 }finally{m.dispose();w.dispose();}
});

test('constructor, cancellation and disposal preserve exact entry transforms and geometry including a tilted actor',()=>{
 const w=load();w.parts[0].geometry.setAttribute('paintPart',new T.Float32BufferAttribute(new Float32Array(w.parts[0].geometry.attributes.position.count).fill(1),1));const material=w.parts[0].material,hook=material.onBeforeCompile,key=material.customProgramCacheKey;w.pose('carry');w.root.position.set(7,2,-4);w.root.rotation.set(.2,.6,-.1);const s=snapshot(w),children=w.root.children.length;
 const m=createCliffClimb(w,profile);try{restored(w,s);m.apply(.49);assert.notEqual(material.onBeforeCompile,hook);m.restore();restored(w,s);assert.equal(material.onBeforeCompile,hook);assert.equal(material.customProgramCacheKey,key);m.apply(.49);m.dispose();m.dispose();restored(w,s);assert.equal(material.onBeforeCompile,hook);assert.equal(material.customProgramCacheKey,key);assert.equal(w.root.children.length,children);assert.throws(()=>m.apply(0),/disposed/);}finally{m.dispose();w.dispose();}
});

test('unsupported rigs and constructor failures leave no temporary geometry or helpers',()=>{
 const w=load(),s=snapshot(w),children=w.root.children.length;try{
  assert.throws(()=>createCliffClimb(w,{id:'hen'}),/supports/);restored(w,s);
  const pose=w.pose;let calls=0;w.pose=(...args)=>{if(++calls===2)throw Error('Injected carry failure after helpers');return pose(...args);};
  assert.throws(()=>createCliffClimb(w,profile),/Injected/);w.pose=pose;restored(w,s);assert.equal(w.root.children.length,children);
  const m=createCliffClimb(w,profile);m.apply(.5);m.dispose();restored(w,s);
 }finally{w.dispose();}
});
