import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createHorseChairMotion,HORSE_CHAIR_DURATION} from '../dist/tactics/horse-chair-motion.js';
import {createChairLibrary,CHAIR_FORMS,CHAIR_CONTACT} from '../dist/tactics/painted-chairs.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url))),V=a=>new T.Vector3(...a);
function setup(){const worker=createLightHorse(data),motion=createHorseChairMotion(worker);return {worker,motion,dispose(){motion.dispose();worker.skeleton.dispose();worker.dispose();}};}
function surface(mesh){const a=mesh.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>mesh.applyBoneTransform(i,new T.Vector3().fromBufferAttribute(a,i)).applyMatrix4(mesh.matrixWorld));}
function centerOfMass(j){
 const c=V(j.hips).multiplyScalar(.23).add(V(j.spine).lerp(V(j.head),.2).multiplyScalar(.40)).add(V(j.head).multiplyScalar(.10));
 for(const s of [-1,1]){c.add(V(j['thigh'+s]).lerp(V(j['shin'+s]),.5).multiplyScalar(.065));c.add(V(j['shin'+s]).lerp(V(j['hoof'+s]),.5).multiplyScalar(.035));c.add(V(j['upperArm'+s]).lerp(V(j['hand'+s]),.5).multiplyScalar(.035));}return c;
}
function triangleSolid(vertices,index){
 const triangles=[];for(let i=0;i<(index?.count||vertices.length);i+=3)triangles.push(new T.Triangle(...[0,1,2].map(k=>vertices[index?index.getX(i+k):i+k])));
 const box=new T.Box3().setFromPoints(vertices),dir=new T.Vector3(.317,.739,.593).normalize(),ray=new T.Ray(),hit=new T.Vector3(),near=new T.Vector3();
 return {box,triangles,measure(q){const hits=[];let distance=Infinity;ray.set(q,dir);for(const t of triangles){if(ray.intersectTriangle(t.a,t.b,t.c,false,hit))hits.push(q.distanceTo(hit));t.closestPointToPoint(q,near);distance=Math.min(distance,q.distanceTo(near));}hits.sort((a,b)=>a-b);const unique=hits.filter((d,i)=>!i||Math.abs(d-hits[i-1])>1e-6);return {inside:unique.length%2===1,distance};}};
}
function chairParts(root){
 root.updateMatrixWorld(true);const parts=[];
 root.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,vertices=Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld)),solid=triangleSolid(vertices,ix),planes=[];
  for(const t of solid.triangles){const plane=new T.Plane().setFromCoplanarPoints(t.a,t.b,t.c);if(!planes.some(q=>q.normal.distanceTo(plane.normal)<1e-5&&Math.abs(q.constant-plane.constant)<1e-5))planes.push(plane);}
  const convex=vertices.every(v=>planes.every(p=>p.distanceToPoint(v)<1e-5));
  parts.push({name:mesh.name,inside(q,tolerance=.0015){if(!solid.box.containsPoint(q))return false;if(convex)return planes.every(p=>p.distanceToPoint(q)<-tolerance);const result=solid.measure(q);return result.inside&&result.distance>tolerance;}});
 });return parts;
}

test('complete sit/rest/rise cycle preserves actual sole surfaces, limb lengths and continuous joints',()=>{
 const s=setup();try{const lengths=new Map(s.worker.bones.filter(b=>b.parent.isBone).map(b=>[b,b.position.length()]));let fixed,previous;
  for(let i=0;i<=552;i++){const t=i/60;s.motion.apply(t);const d=s.motion.diagnostics();assert.deepEqual(d.scale,[1,1,1]);assert.equal(d.unarmed,true);assert.equal(s.worker.rifle.root.visible,false);
   for(const [b,l]of lengths)assert.ok(Math.abs(b.position.length()-l)<1e-7,'stretched '+b.name);
   const soles=d.feet.flatMap(f=>f.points);fixed??=soles;for(let j=0;j<soles.length;j++){assert.ok(V(soles[j]).distanceTo(V(fixed[j]))<1e-6,'hoof slides');assert.ok(soles[j][1]>-1e-6,'sole sinks');}for(const f of d.feet)assert.ok(Math.abs(f.minY)<1e-6,'sole floats');
   if(previous)for(const name of Object.keys(d.joints))assert.ok(V(d.joints[name]).distanceTo(V(previous.joints[name]))<.025,'jump at '+t+': '+name);
   if(i%10===0)for(const mesh of s.worker.parts)assert.ok(surface(mesh).every(p=>p.y>-.002),'floor penetration '+mesh.name+' at '+t);
   for(const h of d.hands)if(h.contact)assert.ok(V(h.target).distanceTo(V(h.palm))<1e-6,'hand misses thigh');previous=d;
  }
 }finally{s.dispose();}
});

test('actual clothed seat rests on the cushion and mass moves onto the planted feet before seat release',()=>{
 const s=setup();try{let firstRelease;
  for(let i=0;i<=184;i++){const t=i/20;s.motion.apply(t);const d=s.motion.diagnostics(),com=centerOfMass(d.joints),feet=d.feet.flatMap(f=>f.points),front=Math.max(...feet.map(p=>p[2])),rear=Math.min(...feet.map(p=>p[2]));
   assert.ok(Math.abs(com.x)<.1);assert.ok(com.z<=front+.01,'mass beyond toes');if(!d.seatSupport)assert.ok(com.z>=rear-.01,'unsupported mass behind heels at '+t);
   assert.ok(d.cloth.maxCompression<.075,'seat compresses the garment excessively');assert.ok(d.cloth.maxCorrection<.11,'seat-nose fold moves beyond the loose trouser volume');
   if(t>=3.4&&t<=5.4){assert.ok(d.seatSupport);const points=d.cloth.contacts;assert.ok(points.length>30);assert.ok(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]))>.28,'seat contact too narrow');assert.ok(Math.min(...points.map(p=>p[2]))<.13,'perched only on front rim');for(const p of points)assert.ok(Math.abs(p[1]-CHAIR_CONTACT.seatHeight-.003)<1e-5);}
   if(t>5.4&&!d.seatSupport&&!firstRelease){firstRelease={t,d,com};assert.ok(com.z>=rear+.02,'hips lifted before mass reached soles');}
  }
  assert.ok(firstRelease.t>6.2&&firstRelease.t<7);s.motion.apply(5.4);const resting=s.motion.diagnostics();s.motion.apply(6.2);const leaning=s.motion.diagnostics();assert.ok(leaning.joints.head[2]>resting.joints.head[2]+.20,'no forward chest transfer');assert.ok(Math.abs(leaning.joints.hips[1]-resting.joints.hips[1])<.001,'hips rose before forward lean');
 }finally{s.dispose();}
});

test('the visible elbow hinge folds toward the back of the torso through lowering and rising',()=>{
 const s=setup();try{for(const heading of [0,Math.PI/2,-.63])for(let i=0;i<=92;i++){
  s.motion.apply(i/10,{heading});const d=s.motion.diagnostics(),spine=s.worker.bones.find(b=>b.name==='spine'),forward=new T.Vector3(1,0,0).applyQuaternion(spine.getWorldQuaternion(new T.Quaternion()));
  // Measure hinge direction independently of how straight the arm is during
  // release; a nearly extended elbow still has to fold behind the torso.
  for(const side of [-1,1]){const shoulder=V(d.joints['upperArm'+side]),elbow=V(d.joints['forearm'+side]),hand=V(d.joints['hand'+side]),axis=hand.sub(shoulder).normalize(),offset=elbow.sub(shoulder),hingeForward=forward.clone().addScaledVector(axis,-forward.dot(axis)).normalize();offset.addScaledVector(axis,-offset.dot(axis));assert.ok(offset.normalize().dot(hingeForward)<-.40,'elbow bends forward at '+i/10+' side '+side);}
 }}finally{s.dispose();}
});

test('one unchanged horse clip clears the solid parts of all four native chairs',()=>{
 const s=setup(),atlas=new T.Texture(),lib=createChairLibrary(atlas),chairs=CHAIR_FORMS.map(f=>lib.build(f.id)),parts=chairs.map(c=>({id:c.form.id,parts:chairParts(c.root)}));
 try{for(const c of parts)assert.ok(c.parts.find(p=>p.name==='Shared seat').inside(new T.Vector3(0,CHAIR_CONTACT.seatHeight-.035,0)),'invalid collision probe');
  for(let i=0;i<=46;i++){const t=i*.2;s.motion.apply(t);for(const mesh of s.worker.parts){const pts=surface(mesh),ix=mesh.geometry.index;
   // Include triangle interiors; vertex-only checks can miss the cushion edge.
   for(let j=0;j<ix.count;j+=3){const a=pts[ix.getX(j)],b=pts[ix.getX(j+1)],c=pts[ix.getX(j+2)];pts.push(a.clone().add(b).add(c).divideScalar(3));}
   for(const c of parts)for(const part of c.parts)for(const p of pts)if(part.inside(p))assert.fail(c.id+' '+part.name+' intersects '+mesh.name+' at '+t+' '+p.toArray());
  }}
 }finally{chairs.forEach(c=>c.dispose());lib.dispose();atlas.dispose();s.dispose();}
});

test('actual gloves stay outside the trousers while settling, resting and releasing their thigh support',()=>{
 const s=setup();try{const trousers=s.worker.parts.find(p=>p.name.includes('overalls'));
  for(let t=1.6;t<7.51;t+=.2){s.motion.apply(t);const solid=triangleSolid(surface(trousers),trousers.geometry.index),d=s.motion.diagnostics();
   for(const side of [-1,1]){const hand=s.worker.parts.find(p=>p.name==='forearm and hand '+side),bind=hand.geometry.attributes.paintPosition,points=surface(hand);let gap=Infinity;
    for(let i=0;i<points.length;i++){if(bind.getY(i)>.79)continue;const q=points[i];if(!solid.box.clone().expandByScalar(.10).containsPoint(q))continue;const result=solid.measure(q);if(result.inside)assert.ok(result.distance<.0025,'glove sinks into thigh at '+t+' side '+side+' depth '+result.distance);else gap=Math.min(gap,result.distance);}
    if(d.hands.find(h=>h.side===side).contact)assert.ok(gap<.014,'visible glove floats above thigh');
   }
  }
 }finally{s.dispose();}
});

test('whole forearms clear the waist, not just the glove contact patches',()=>{
 const s=setup();try{const trousers=s.worker.parts.find(p=>p.name.includes('overalls'));
  for(let i=0;i<=62;i++){const t=i*HORSE_CHAIR_DURATION/62;s.motion.apply(t);const solid=triangleSolid(surface(trousers),trousers.geometry.index);
   for(const side of [-1,1]){const arm=s.worker.parts.find(p=>p.name==='forearm and hand '+side),bind=arm.geometry.attributes.paintPosition,points=surface(arm);
    for(let j=0;j<points.length;j++){if(bind.getY(j)>.93||!solid.box.containsPoint(points[j]))continue;const result=solid.measure(points[j]);assert.ok(!result.inside||result.distance<.0025,'forearm sinks into waist at '+t+' side '+side+' depth '+result.distance);}
   }
  }
 }finally{s.dispose();}
});

test('trouser folds settle continuously through seat-height contact and release',()=>{
 const s=setup();try{const trousers=s.worker.parts.find(p=>p.name.includes('overalls'));let previous;
  for(let i=0;i<=1104;i++){const t=i/120;s.motion.apply(t);const points=surface(trousers);if(previous)for(let j=0;j<points.length;j++)assert.ok(points[j].distanceTo(previous[j])<.005,'cloth jumps at '+t+' vertex '+j);previous=points;}
  // Previously a calf vertex snapped forward a centimetre at this crossing.
  const t=2.62539538796;s.motion.apply(t-.000001);const before=surface(trousers);s.motion.apply(t+.000001);const after=surface(trousers);for(let i=0;i<before.length;i++)assert.ok(before[i].distanceTo(after[i])<.00001,'discontinuous seat-rim fold');
 }finally{s.dispose();}
});

test('scrubbing, placement, loops and teardown preserve original rig and all mesh buffers',()=>{
 const w=createLightHorse(data),original=w.parts.map(mesh=>({mesh,position:mesh.geometry.attributes.position.array.slice(),normal:mesh.geometry.attributes.normal.array.slice(),si:mesh.geometry.attributes.skinIndex.array.slice(),sw:mesh.geometry.attributes.skinWeight.array.slice()})),m=createHorseChairMotion(w);
 try{const times=[0,.2,.7,1.6,2.5,3.8,5.9,6.2,6.65,7.25,8.5,9.2],expected=times.map(t=>{m.apply(t);return JSON.stringify(m.diagnostics());});for(let i=times.length-1;i>=0;i--){m.apply(times[i]);assert.equal(JSON.stringify(m.diagnostics()),expected[i]);}
  m.apply(3.8);const plain=m.diagnostics();for(const heading of [Math.PI/2,-.63,Math.PI]){const position=[3,2,-4],matrix=new T.Matrix4().makeRotationY(heading).setPosition(...position);m.apply(3.8,{heading,position});const moved=m.diagnostics();for(const name of Object.keys(plain.joints))assert.ok(V(plain.joints[name]).applyMatrix4(matrix).distanceTo(V(moved.joints[name]))<1e-6);for(const h of moved.hands)assert.ok(V(h.target).distanceTo(V(h.palm))<1e-6);assert.equal(moved.seatSupport,true);}
  m.apply(0);const start=JSON.stringify(m.diagnostics().joints);m.apply(HORSE_CHAIR_DURATION);assert.equal(JSON.stringify(m.diagnostics().joints),start);
  assert.throws(()=>m.apply(NaN),/finite/);m.restore();for(const s of original){assert.deepEqual(s.mesh.geometry.attributes.position.array,s.position);assert.deepEqual(s.mesh.geometry.attributes.normal.array,s.normal);}m.dispose();m.dispose();for(const s of original){assert.deepEqual(s.mesh.geometry.attributes.skinIndex.array,s.si);assert.deepEqual(s.mesh.geometry.attributes.skinWeight.array,s.sw);assert.equal(s.mesh.skeleton,w.skeleton);}assert.throws(()=>m.apply(0),/disposed/);
 }finally{m.dispose();w.skeleton.dispose();w.dispose();}
});
