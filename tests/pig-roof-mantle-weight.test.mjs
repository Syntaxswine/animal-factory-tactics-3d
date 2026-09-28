import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createRoofMantle} from '../dist/tactics/roof-mantle.js';

const V=()=>new T.Vector3();
function setup(id,run){
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id),worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))));
 let motion;try{motion=createRoofMantle(worker,profile);run(worker,motion);}finally{motion?.dispose();worker.dispose();}
}
function region(worker,part,low,high){
 const mesh=worker.parts[part],indices=[];
 for(const i of new Set(mesh.geometry.index.array)){
  const p=V().fromBufferAttribute(mesh.geometry.attributes.position,i);
  // Authored front belly/low hip only: exclude sleeves, cuffs, braces and
  // boot soles, any of which could accidentally satisfy a nearest-point test.
  if(p.x>.15&&Math.abs(p.z)<.22&&p.y>low&&p.y<high)indices.push(i);
 }
 assert(indices.length>20,'Missing authored belly/hip region');return {mesh,indices};
}
function distances({mesh,indices}){
 return indices.map(i=>mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)).filter(v=>v.x>0&&v.x<3&&Math.abs(v.z)<2).map(v=>v.y-2).sort((a,b)=>a-b);
}
function elbows(worker){
 const joint=name=>worker.bones.find(b=>b.name===name).getWorldPosition(V());
 return [-1,1].map(side=>joint('upperArm'+side).sub(joint('forearm'+side)).angleTo(joint('hand'+side).sub(joint('forearm'+side)))*180/Math.PI);
}

for(const id of ['pig-foreman','pig-director']){
 test(id+': anatomical left weight shift is established before the right leg swings',()=>setup(id,(worker,motion)=>{
  const lead=motion.phases.find(p=>p.label==='Right leg over'),joint=name=>worker.bones.find(b=>b.name===name).getWorldPosition(V());
  // Measure posed joints in roof space, not authored Euler values: combined
  // forward bend and hip rotation can cancel a nominal "left lean".
  for(const t of [lead.start-.001,lead.start+.04,(lead.start*3+lead.end)/4]){
   const result=motion.apply(t/motion.duration),left=joint('upperArm-1'),right=joint('upperArm1'),hips=joint('hips'),center=left.clone().add(right).multiplyScalar(.5);
   assert((right.y-left.y)/left.distanceTo(right)>Math.sin(15*Math.PI/180),'left shoulder does not visibly drop before leg swing at '+t);
   assert(center.z-hips.z<-.05,'upper body has not shifted anatomically left at '+t);
   if(t<lead.start){const foot=result.contacts.find(c=>c.id==='foot1');assert(foot.point[1]<1.8&&foot.point[0]<0,'lead foot already climbed before left weight shift');}
  }
 }));

 test(id+': the upper chest is over the lip before the right leg starts swinging onto the roof',()=>setup(id,(worker,motion)=>{
  const lead=motion.phases.find(p=>p.label==='Right leg over'),mesh=worker.parts[0],chest=[];
  for(const i of new Set(mesh.geometry.index.array)){
   const p=V().fromBufferAttribute(mesh.geometry.attributes.position,i);
   if(p.x>.10&&Math.abs(p.z)<.20&&p.y>1.09&&p.y<1.27)chest.push(i);
  }
  assert(chest.length>20,'Missing authored upper chest');
  motion.apply((lead.start-.001)/motion.duration);
  const points=chest.map(i=>mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)),center=points.reduce((sum,p)=>sum.add(p),V()).multiplyScalar(1/points.length);
  assert(center.x>.025,`upper chest remains ${-center.x} outside lip when leg lift starts`);
  assert(center.y>2.025,'upper chest has not cleared roof height before leg swing');
 }));

 test(id+': belly and low hips genuinely settle onto the roof throughout the pause',()=>setup(id,(worker,motion)=>{
  const belly=region(worker,0,.79,1.03),hips=region(worker,1,.70,.89),flat=motion.phases.find(p=>p.label==='Lie flat');
  for(let i=0;i<=12;i++){
   const time=T.MathUtils.lerp(flat.start+.001,flat.end-.001,i/12);motion.apply(time/motion.duration);
   for(const [name,surface]of [['belly',belly],['hips',hips]]){
    const gaps=distances(surface);assert(gaps.length>20,name+' is still outside the roof');
    assert(gaps[0]>=-.004,name+' penetrates roof at '+time);
    assert(gaps[0]<.025,`${name} floats ${gaps[0]} above roof at ${time}`);
    assert(gaps.filter(g=>g<.04).length>=3,name+' only has a single accidental near-contact vertex');
   }
  }
 }));

 test(id+': the settled sprawl visibly unloads one arm instead of retaining a symmetric push-up',()=>setup(id,(worker,motion)=>{
  const flat=motion.phases.find(p=>p.label==='Lie flat');
  for(const t of [flat.start+.01,(flat.start+flat.end)/2,flat.end-.01]){
   const result=motion.apply(t/motion.duration),angles=elbows(worker);
   assert(Math.min(...angles)<110,'neither elbow softens below a push-up brace');
   assert(Math.abs(angles[0]-angles[1])>12,'both arms retain the same load-bearing silhouette');
   assert(result.contacts.filter(c=>c.id.startsWith('hand')).every(c=>c.error<1e-6),'unloading stretches an arm');
  }
 }));
}
