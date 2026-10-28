import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BEAR_PROFILE} from '../dist/tactics/bear-worker.js';
import {createMammalMotion} from '../dist/tactics/animal-motion.js';
// Offline eye/sight fitting. Only head rotation is fitted; body dimensions,
// physical weapon anchors, bones and the authored eye landmark stay fixed.
const profile={...BEAR_PROFILE},worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),motion=createMammalMotion(worker,profile);
function measure(){
 const errors=[];
 for(const pitch of [-15,0,20]){
  motion.apply(6.6,{pitch});const gun=worker.rifle,head=worker.bones.find(b=>b.name==='head'),eye=new T.Vector3(...profile.eye).applyMatrix4(worker.skeleton.boneInverses[worker.bones.indexOf(head)]).applyMatrix4(head.matrixWorld),sight=new T.Vector3(.48,.045,0).applyMatrix4(gun.root.matrixWorld),axis=new T.Vector3(1,0,0).transformDirection(gun.barrel.matrixWorld),off=eye.sub(sight);
  errors.push(off.addScaledVector(axis,-off.dot(axis)).length());
 }
 return errors;
}
try{
 const keys=['headPitch','headYaw','headPitchSlope'],steps=[.1,5,.2];let score=measure().reduce((a,v)=>a+v*v,0);
 for(let pass=0;pass<80;pass++){
  let improved=false;
  for(let i=0;i<3;i++){
   const key=keys[i],old=profile[key];let best=old;
   for(const side of [-1,1]){profile[key]=old+side*steps[i];const next=measure().reduce((a,v)=>a+v*v,0);if(next<score){best=profile[key];score=next;improved=true;}}
   profile[key]=best;
  }
  if(!improved)for(let i=0;i<3;i++)steps[i]*=.65;
  if(steps[0]<1e-5)break;
 }
 console.log(JSON.stringify({fit:Object.fromEntries(keys.map(k=>[k,+profile[k].toFixed(6)])),errors:measure(),max:Math.max(...measure())}));
}finally{motion.dispose();worker.dispose();}
