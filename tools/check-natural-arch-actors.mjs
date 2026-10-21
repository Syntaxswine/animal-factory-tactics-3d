import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {RED_HAT_FITS,fitRedHatGeometry} from '../dist/tactics/red-hat-model.js';
import {naturalArchGeometry} from '../dist/tactics/natural-rock-arches.js';
const root=fileURLToPath(new URL('../dist/tactics/',import.meta.url));
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p.file),'utf8'));
function undersideQuery(g){
 const a=g.attributes.position,bins=new Map(),step=.25,tri=[];
 for(let i=0;i<a.count;i+=3){const A=new T.Vector3().fromBufferAttribute(a,i),B=new T.Vector3().fromBufferAttribute(a,i+1),C=new T.Vector3().fromBufferAttribute(a,i+2),n=B.clone().sub(A).cross(C.clone().sub(A));if(n.y>=-1e-7)continue;const den=(B.z-C.z)*(A.x-C.x)+(C.x-B.x)*(A.z-C.z);if(Math.abs(den)<1e-10)continue;
  const id=tri.length;tri.push({A,B,C,den});for(let x=Math.floor(Math.min(A.x,B.x,C.x)/step);x<=Math.floor(Math.max(A.x,B.x,C.x)/step);x++)for(let z=Math.floor(Math.min(A.z,B.z,C.z)/step);z<=Math.floor(Math.max(A.z,B.z,C.z)/step);z++){const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(id);}
 }
 return (x,z)=>{let h=Infinity;for(const id of bins.get(Math.floor(x/step)+','+Math.floor(z/step))||[]){const {A,B,C,den}=tri[id],u=((B.z-C.z)*(x-C.x)+(C.x-B.x)*(z-C.z))/den,v=((C.z-A.z)*(x-C.x)+(A.x-C.x)*(z-C.z))/den,t=1-u-v;if(Math.min(u,v,t)<-1e-7)continue;const y=u*A.y+v*B.y+t*C.y;if(y>.1)h=Math.min(h,y);}return h;};
}
export function checkNaturalArchActors(){
 const geometries=['large','small'].map(kind=>{const g=naturalArchGeometry(kind);return {kind,g,layout:g.userData.layout,under:undersideQuery(g)};}),rows=[];
 const donorProfile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='pig-foreman'),donor=donorProfile.create(load(donorProfile)),capSource=donor.parts.find(p=>p.name.includes('service cap')).geometry;
 for(const profile of ANIMAL_MOTION_CATALOG){
  const data=load(profile);
  for(const outfit of ['normal','red-hats']){
   const worker=profile.create(data);worker.pose('neutral');worker.root.updateMatrixWorld(true);let cap;
   if(outfit==='red-hats'&&RED_HAT_FITS[profile.id]){const head=worker.bones.find(b=>b.name==='head');cap=new T.Mesh(fitRedHatGeometry(capSource,head,RED_HAT_FITS[profile.id]));head.add(cap);}
   const posture=createBattlePosture(worker,profile),loc=createWorkerLocomotion(worker,profile);let top=0,minMargin=Infinity,collisions=0,worst=null;
   for(const heading of [0,45,90,180,270]){
    const sample={heading,distance:0,blend:0,pose:{}};loc.apply(sample);posture.apply(sample,{equipment:false});posture.ground();worker.root.updateMatrixWorld(true);worker.skeleton.update();
    const points=[],v=new T.Vector3();
    for(const part of [...worker.parts,...(cap?[cap]:[])])for(let i=0;i<part.geometry.attributes.position.count;i++){part.getVertexPosition(i,v);v.applyMatrix4(part.matrixWorld);top=Math.max(top,v.y);points.push(v.clone());}
    for(const arch of geometries){const {width,opening,depth}=arch.layout;
     for(let column=0;column<opening;column++)for(const along of [-1.5,-.5,.5,1.5])for(const p of points){const x=column+.5-opening/2+p.x,z=along+p.z;if(Math.abs(z)>=depth/2-.04||Math.abs(x)>=width/2)continue;const h=arch.under(x,z),margin=h-p.y;
      if(Number.isFinite(h))minMargin=Math.min(minMargin,margin);
      // Missing overhead rock inside the opening is sky beyond an eroded lip;
      // within a support footprint it is solid. Feet on the common datum are
      // not counted as penetrating the sealed base.
      const solid=!Number.isFinite(h)?Math.abs(x)>opening/2+.001:margin<.02;
      if(p.y>.06&&solid){collisions++;worst??={arch:arch.kind,heading,column,along,point:p.toArray(),x,z,ceiling:Number.isFinite(h)?h:null};}
     }
    }
   }
   rows.push({animal:profile.id,outfit,height:top,minMargin,collisions,worst});cap?.geometry.dispose();cap?.material.dispose();loc.dispose();worker.skeleton.dispose();worker.dispose();
  }
 }
 donor.skeleton.dispose();donor.dispose();geometries.forEach(a=>a.g.dispose());return rows;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const rows=checkNaturalArchActors(),out=path.resolve('artifacts/natural-rock-arches/actor-clearance.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(rows,null,2));console.log(JSON.stringify({combinations:rows.length,tallest:Math.max(...rows.map(r=>r.height)),minMargin:Math.min(...rows.map(r=>r.minMargin)),collisions:rows.reduce((n,r)=>n+r.collisions,0),failures:rows.filter(r=>r.collisions).map(r=>({animal:r.animal,outfit:r.outfit,collisions:r.collisions,worst:r.worst})),output:out}));if(rows.some(r=>r.collisions))process.exitCode=1;
}
