import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createRifleFiring} from '../dist/tactics/rifle-firing.js';
import {createArmedIdle} from '../dist/tactics/armed-idle-motion.js';

const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function inside(p,poly){
 let positive=false,negative=false;
 for(let i=0;i<poly.length;i++){const c=cross(poly[i],poly[(i+1)%poly.length],p);positive||=c>1e-12;negative||=c< -1e-12;}
 return !(positive&&negative);
}
function pointSegment(p,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
 const t=length?T.MathUtils.clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length,0,1):0;
 return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);
}
function segmentDistance(a,b,c,d){
 if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;
 return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}
function projectedCuffClearance(cuff,weapon){
 // Project entire cuff triangles onto the bar's YZ cross-section. Separation
 // from the actual faceted polygon proves clearance from its whole extrusion;
 // this is deliberately conservative outside the two ends of the handle.
 const handle=weapon.gripTargets.support,center=weapon.anchors.support.position;
 const polygon=[],seen=new Set();
 for(let i=0;i<handle.geometry.attributes.position.count;i++){
  const v=weapon.root.worldToLocal(new T.Vector3().fromBufferAttribute(handle.geometry.attributes.position,i).applyMatrix4(handle.matrixWorld));
  if(Math.hypot(v.y-center.y,v.z-center.z)<.006)continue;
  const key=v.y.toFixed(8)+':'+v.z.toFixed(8);if(!seen.has(key)){seen.add(key);polygon.push([v.y,v.z]);}
 }
 polygon.sort((a,b)=>Math.atan2(a[1]-center.z,a[0]-center.y)-Math.atan2(b[1]-center.z,b[0]-center.y));
 const pos=cuff.geometry.attributes.position,ix=cuff.geometry.index,points=[];
 for(let i=0;i<pos.count;i++){const v=weapon.root.worldToLocal(new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(cuff.matrixWorld));points.push([v.y,v.z]);}
 let distance=Infinity;
 for(let i=0;i<ix.count;i+=3){const tri=[points[ix.getX(i)],points[ix.getX(i+1)],points[ix.getX(i+2)]];
  if(tri.some(v=>inside(v,polygon))||polygon.some(v=>inside(v,tri)))return 0;
  for(let j=0;j<3;j++)for(let k=0;k<polygon.length;k++)distance=Math.min(distance,segmentDistance(tri[j],tri[(j+1)%3],polygon[k],polygon[(k+1)%polygon.length]));
 }
 return distance;
}

for(const profile of ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed&&!p.id.startsWith('pig-'))){
 test(`${profile.id} HMG cuff follows its real forearm and clears the bar through idle and level raising`,()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))),worker=profile.create(data),weapon=createWeaponModel('hmg');
  worker.equipWeapon(weapon);
  let idle;
  try{
   const cuff=worker.root.getObjectByName('fitted glove cuff');
   function check(label){
    worker.root.updateMatrixWorld(true);worker.skeleton.update();
    const before=Array.from(cuff.geometry.attributes.position.array);cuff.update();
    assert.ok(before.every((v,i)=>Math.abs(v-cuff.geometry.attributes.position.array[i])<1e-7),label+' cuff is stale');
    const distance=projectedCuffClearance(cuff,weapon);
    assert.ok(distance>.002,`${label} cuff/handle clearance ${(distance*1000).toFixed(3)} mm`);
   }
   worker.pose('carry');check('carry');
   idle=createArmedIdle(worker,profile,{weapon});
   for(const mood of ['guard','mercenary'])for(let i=0;i<32;i++){idle.at(i/32*(mood==='guard'?12:16),{mood});check(mood+' '+i);}
   idle.dispose();idle=null;
   const firing=createRifleFiring(worker,profile);
   const supportElbow=worker.bones.find(b=>b.name==='forearm-1');let previousElbow=null;
   for(let i=0;i<=64;i++){
    const aim=i/64,result=firing.apply({aim,target:new T.Vector3(8,1.4,0),sample:{pose:{},heading:0}});
    assert.ok(result.supported,'level raise unsupported at '+aim);check('aim '+aim);
    const elbow=supportElbow.getWorldPosition(new T.Vector3());
    if(previousElbow)assert.ok(elbow.distanceTo(previousElbow)<.035,'support elbow flips during raise at '+aim);
    previousElbow=elbow;
   }
  }finally{idle?.dispose();worker.equipWeapon();weapon.dispose();worker.skeleton.dispose();worker.dispose();}
 });
}
