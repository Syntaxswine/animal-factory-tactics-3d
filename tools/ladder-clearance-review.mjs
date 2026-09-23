import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createLadderMotion,LADDER_PRESETS,WIDE_LADDER_EXIT,ladderRailSegments} from '../dist/tactics/ladder-motion.js';

// Posed vertices against the visible square-section fixtures. This is a
// surface-sample check, not a claim of continuous triangle collision detection.
export function inspectLadderClearance(profile,preset,samples=320){
 const d={...preset,...(profile.id.startsWith('pig')?{exitWidth:WIDE_LADDER_EXIT}:{})};
 const w=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))));
 const handHeights=Object.fromEntries([-1,1].map(side=>[side,w.bones.find(b=>b.name==='hand'+side).getWorldPosition(new T.Vector3()).y]));
 const motion=createLadderMotion(w,profile,d),half=(d.railThickness||.07)/2;
 const boxes=ladderRailSegments(d).map(({a,b})=>{
  const delta=b.clone().sub(a),center=a.clone().add(b).multiplyScalar(.5),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
  return {center,inverse:q.invert(),half:new T.Vector3(half,delta.length()/2,half)};
 });
 const stats={animal:profile.id,definition:d,samples:samples+1,deck:{count:0,maxDepth:0},rail:{count:0,maxDepth:0},rung:{count:0,maxDepth:0},maxJointSpeed:0,graspExemptions:0};
 const point=new T.Vector3(),local=new T.Vector3();let previous=null,previousTime=0;
 function hit(kind,depth,detail){if(depth<=.001)return;const row=stats[kind];row.count++;if(depth>row.maxDepth){row.maxDepth=depth;row.worst=detail;}}
 try{
  for(let frame=0;frame<=samples;frame++){
   const progress=frame/samples,r=motion.apply(progress),time=progress*motion.duration,joints=w.bones.map(b=>b.getWorldPosition(new T.Vector3()));
   if(previous)stats.maxJointSpeed=Math.max(stats.maxJointSpeed,...joints.map((p,i)=>p.distanceTo(previous[i])/(time-previousTime)));previous=joints;previousTime=time;
   for(const part of [...w.parts,...w.weapon.parts,...motion.grips.flatMap(g=>g.meshes)]){
    const a=part.geometry.attributes.position,side=part.name.endsWith(' -1')?-1:1,grip=motion.grips.find(g=>g.meshes.includes(part)),contact=r.contacts.find(c=>c.id==='hand'+(grip?grip.arm.name.endsWith(' -1')?-1:1:side));
    for(const i of new Set(part.geometry.index?.array||Array.from({length:a.count},(_,j)=>j))){
     part.getVertexPosition(i,point).applyMatrix4(part.matrixWorld);
     const detail=()=>({progress,phase:r.phase,part:part.name,vertex:i,vertices:a.count,source:[a.getX(i),a.getY(i),a.getZ(i)],point:point.toArray()});
     const deck=Math.min(point.x-d.plane,d.plane+1.52-point.x,point.y-(d.height-.12),d.height-point.y,.65-Math.abs(point.z));if(deck>.001)hit('deck',deck,detail());
     // Exempt actual fingers/palm only, within 11 cm of a planted named grip.
     // The remainder of each forearm/hand mesh, including cuffs, is tested.
     const grasp=((part.name.startsWith('forearm and hand')&&a.getY(i)<handHeights[side]+.025)||(grip&&part!==grip.meshes.at(-1)))&&contact.gripSurfaces.some(c=>Math.hypot(...c.point.map((v,k)=>v-point.getComponent(k)))<.11);
     if(grasp){stats.graspExemptions++;continue;}
     for(const box of boxes){local.copy(point).sub(box.center).applyQuaternion(box.inverse);const depth=Math.min(box.half.x-Math.abs(local.x),box.half.y-Math.abs(local.y),box.half.z-Math.abs(local.z));if(depth>.001)hit('rail',depth,detail());}
     const index=Math.round((point.y-d.firstRung)/d.spacing);
     if(index>=0&&index<d.rungs){const depth=Math.min((d.rungDepth||.07)/2-Math.abs(point.x-d.plane),(d.rungThickness||.055)/2-Math.abs(point.y-(d.firstRung+index*d.spacing)),(d.width+.05)/2-Math.abs(point.z));if(depth>.001)hit('rung',depth,detail());}
    }
   }
  }
 }finally{motion.dispose();w.dispose();}
 return stats;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const rows=[];for(const p of profiles.filter(p=>!p.unarmed&&(!process.env.REVIEW_ANIMAL||p.id===process.env.REVIEW_ANIMAL)))for(const [fixture,d]of Object.entries(LADDER_PRESETS))rows.push({fixture,...inspectLadderClearance(p,d,+(process.env.REVIEW_SAMPLES||320))});
 console.log(JSON.stringify(rows,null,2));
}
