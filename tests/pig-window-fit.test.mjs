import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createAnimalWindowMotion} from '../dist/tactics/animal-window-motion.js';
import {fitRedHatGeometry,RED_HAT_FITS} from '../dist/tactics/red-hat-model.js';
import {WINDOW_SOLIDS} from '../dist/tactics/body-collisions.js';
const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='pig-director');
const data=p=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)));
const boxes=WINDOW_SOLIDS.map(b=>new T.Box3(new T.Vector3(...b.lo).addScalar(.001),new T.Vector3(...b.hi).addScalar(-.001)));
function fixture(cap=false,fitting=true){
 const worker=profile.create(data(profile));let accessory;
 if(cap){const p=ANIMAL_MOTION_CATALOG.find(p=>p.id==='pig-foreman'),donor=p.create(data(p));worker.root.updateMatrixWorld(true);const head=worker.bones.find(b=>b.name==='head');accessory=new T.Mesh(fitRedHatGeometry(donor.parts.find(m=>m.name.includes('service cap')).geometry,head,RED_HAT_FITS[profile.id]),new T.MeshBasicMaterial());head.add(accessory);donor.dispose();}
 const motion=createAnimalWindowMotion(worker,profile,{fitting});
 return {worker,motion,dispose(){motion.dispose();if(accessory){accessory.removeFromParent();accessory.geometry.dispose();accessory.material.dispose();}worker.dispose();}};
}
function geometryOracle(worker){
 let hits=0,minY=Infinity;const bounds=new T.Box3(),tri=new T.Triangle(),tb=new T.Box3();
 worker.root.traverseVisible(mesh=>{if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position,points=Array.from({length:a.count},(_,i)=>mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld)),index=mesh.geometry.index?.array??Array.from({length:a.count},(_,i)=>i);
  for(const p of points){assert(p.toArray().every(Number.isFinite));minY=Math.min(minY,p.y);bounds.expandByPoint(p);}
  for(let i=0;i<index.length;i+=3){tri.set(points[index[i]],points[index[i+1]],points[index[i+2]]);tb.setFromPoints([tri.a,tri.b,tri.c]);if(boxes.some(b=>b.intersectsBox(tb)&&b.intersectsTriangle(tri)))hits++;}
 });return {hits,minY,bounds};
}
for(const cap of [false,true])test(`native director ${cap?'Red Hat':'Original'} clears all indexed triangles and lands inside the adjacent tile`,()=>{
 const f=fixture(cap);try{for(let i=0;i<=400;i++){const t=i/50;f.motion.sample(t);const o=geometryOracle(f.worker);assert.equal(o.hits,0,'frame intersection at '+t);assert(o.minY>=-.001,'floor penetration at '+t);if(i===400){assert(o.bounds.min.x>.09);assert(o.bounds.max.x<1);}}for(const t of[3.32,3.85,4.005,4.665]){f.motion.sample(t);const o=geometryOracle(f.worker);assert.equal(o.hits,0,'handoff regression at '+t);assert(o.minY>=-.001);}}finally{f.dispose();}
});
test('independent triangle oracle rejects the original penetrating retarget',()=>{
 const f=fixture(true,false);try{f.motion.sample(3.5);assert(geometryOracle(f.worker).hits>20,'negative control did not intersect the frame');}finally{f.dispose();}
});
test('native markers expose real residuals, report the tip-to-catch gap honestly and move continuously',()=>{
 const f=fixture(),w=f.worker,bones=Object.fromEntries(w.bones.map(b=>[b.name,b])),offsets=w.bones.map(b=>b.position.clone());let previous,maxSpeed=0;
 try{for(let i=0;i<=1600;i++){const d=f.motion.sample(i*.005);assert.equal(d.errors.length,4);if(!d.errors.some(e=>e.support&&e.error<.015)){assert(d.time>=3.8&&d.time<=4.4,'unexpected support gap at '+d.time);assert(d.held&&d.authoredSupport===false,'unsupported tip was certified');}
   for(const e of d.errors){const foot=e.name.startsWith('foot'),b=bones[foot?e.name.replace('foot','hoof'):e.name],actual=b.localToWorld(foot?new T.Vector3(0,-.12,0):new T.Vector3(.052,-.010,0));assert(actual.distanceTo(new T.Vector3(...e.actual))<1e-10);assert(Math.abs(actual.distanceTo(new T.Vector3(...e.target))-e.error)<1e-10);assert.equal(typeof e.support,'boolean');}
   const points=w.bones.map((b,j)=>{assert(b.position.equals(offsets[j]));assert.deepEqual(b.scale.toArray(),[1,1,1]);return b.getWorldPosition(new T.Vector3());});
   if(previous)points.forEach((p,j)=>{maxSpeed=Math.max(maxSpeed,p.distanceTo(previous[j])/.005);});previous=points;
  }assert(maxSpeed<12,'joint discontinuity: '+maxSpeed);
  const failed=f.motion.sample(4.3).errors.filter(e=>e.error>.03);assert(failed.length,'unreachable trailing-foot target residual must remain visible');for(const e of failed)assert(e.error===Math.hypot(...e.actual.map((v,i)=>v-e.target[i]))||Math.abs(e.error-Math.hypot(...e.actual.map((v,i)=>v-e.target[i])))<1e-12);
 }finally{f.dispose();}
});
test('source buffers and tail binding restore exactly, including reuse after restore',()=>{
 const f=fixture(true),w=f.worker,tail=w.parts.find(p=>p.name==='pig curly tail'),bind=tail.bindMatrix.clone(),attrs=w.parts.map(p=>Object.fromEntries(Object.entries(p.geometry.attributes).map(([k,a])=>[k,{a,values:a.array.slice()}])));
 try{const first=f.motion.sample(3.4);assert(!tail.bindMatrix.equals(bind));f.motion.sample(7.3);assert.deepEqual(f.motion.sample(3.4),first);f.motion.restore();assert(tail.bindMatrix.equals(bind));assert.deepEqual(f.motion.sample(3.4),first);f.motion.dispose();assert(tail.bindMatrix.equals(bind));w.parts.forEach((p,i)=>{for(const[k,{a,values}]of Object.entries(attrs[i])){assert.equal(p.geometry.attributes[k],a);assert.deepEqual(a.array,values);}});}finally{f.dispose();}
});
test('landing palms and soles touch the floor rather than hovering at marker height',()=>{
 const f=fixture();try{for(const[t,pattern,height]of[[5.7,/dress boot/,0],[4.5,/forearm and hand/,0]]){f.motion.sample(t);for(const mesh of f.worker.parts.filter(p=>pattern.test(p.name))){let minY=Infinity;for(let i=0;i<mesh.geometry.attributes.position.count;i++)minY=Math.min(minY,mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld).y);assert(Math.abs(minY-height)<1e-6,mesh.name+' surface gap '+(minY-height));}}}finally{f.dispose();}
});

test('feet trail outside and swim during belly-over-sill, then stop for the plants',()=>{
 const f=fixture();let swaps=0,previousSign=0,maxSeparation=0;
 try{
  for(let i=0;i<=90;i++){
   const d=f.motion.sample(2+i*.01),feet=d.errors.filter(e=>e.name.startsWith('foot'));
   assert(feet.every(e=>!e.support&&e.constraint==='free'),'flutter misreported as a plant');
   if(d.time<=2.6){for(const e of feet){const side=e.name.endsWith('-1')?-1:1,hip=f.worker.bones.find(b=>b.name==='thigh'+side).getWorldPosition(new T.Vector3());assert(e.actual[0]<hip.x-.6,'foot tucked under the belly instead of trailing');assert(e.actual[0]<-.4,'kick is not outside the window');}}
   const delta=feet[0].actual[1]-feet[1].actual[1];
   maxSeparation=Math.max(maxSeparation,Math.abs(delta));
   if(Math.abs(delta)>.01){const sign=Math.sign(delta);if(previousSign&&sign!==previousSign)swaps++;previousSign=sign;}
  }
  assert(swaps>=3,'feet do not visibly alternate');
  assert(maxSeparation>.04&&maxSeparation<.15,'kick should be readable but compact');
  for(const t of[5.7,7,7.5,8]){const feet=f.motion.sample(t).errors.filter(e=>e.name.startsWith('foot'));assert(feet.every(e=>e.support));assert(Math.abs(feet[0].actual[1]-feet[1].actual[1])<1e-8,'flutter continued into landing');}
 }finally{f.dispose();}
});

test('inchworm gathers shorten hip-to-shoulder span against a braced shoulder before extending',()=>{
 const f=fixture(),w=f.worker,hips=w.bones.find(b=>b.name==='hips'),shoulder=w.bones.find(b=>b.name==='upperArm1');
 function pose(t){f.motion.sample(t);const h=hips.getWorldPosition(new T.Vector3()),s=shoulder.getWorldPosition(new T.Vector3());return{hip:h,shoulder:s,span:s.x-h.x};}
 try{
  for(const[start,gather,drive]of[[2,2.18,2.52],[2.52,2.7,3.2]]){
   const a=pose(start),g=pose(gather),p=pose(drive);
   assert(a.span-g.span>.03,'gather is only a whole-body translation');
   assert(p.span-g.span>.03,'torso does not lengthen into the push');
   assert(g.shoulder.distanceTo(a.shoulder)<.001,'braced shoulder slides during gathering');
   assert(g.hip.x>a.hip.x+.03&&g.hip.y>a.hip.y+.08,'pelvis does not gather forward and arch');
   assert(p.shoulder.x>g.shoulder.x+.07,'shoulders do not lead the drive');
  }
  assert.deepEqual(w.root.scale.toArray(),[1,1,1]);
  for(const t of[2,2.18,2.27,2.4,2.52,2.7,2.82,2.87,3.2]){f.motion.sample(t-1e-5);const before=w.bones.map(b=>b.getWorldPosition(new T.Vector3()));f.motion.sample(t+1e-5);w.bones.forEach((b,i)=>assert(b.getWorldPosition(new T.Vector3()).distanceTo(before[i])<.001,'effort boundary pops'));}
 }finally{f.dispose();}
});

test('seesaw tips the chest before drawing the trailing feet through and gathering on the floor',()=>{
 const f=fixture(),w=f.worker;
 function pose(t){const d=f.motion.sample(t),point=name=>w.bones.find(b=>b.name===name).getWorldPosition(new T.Vector3());return{d,hip:point('hips'),shoulder:point('upperArm1'),foot:d.errors.find(e=>e.name==='foot1').actual};}
 try{
  const start=pose(3.2),tipped=pose(3.8);
  assert(tipped.shoulder.y<start.shoulder.y-.10,'chest does not fall around the sill');
  assert(tipped.hip.y>start.hip.y,'rear mass does not rise as front tips');
  for(const t of[3.2,3.5,3.8,4,4.3]){const p=pose(t);assert(p.foot[0]<p.hip.x-.5,'feet tuck under a sill-bound belly');assert(p.foot[0]<0,'feet cross before tip');assert(!p.d.errors.find(e=>e.name==='foot1').support,'invented foot plant');}
  const catchPose=pose(4.5);assert(catchPose.d.errors.filter(e=>e.name.startsWith('hand')).every(e=>e.support&&e.error<.001),'palms do not catch');
  const follow=pose(4.8);assert(follow.foot[0]>.09,'feet have not cleared the inner lip');assert(follow.foot[1]>.875,'feet lower through the sill');
  const landed=pose(5.7);assert(landed.foot[1]<.001);assert(landed.hip.y<catchPose.hip.y,'hips stay suspended after feet drop');
 }finally{f.dispose();}
});
