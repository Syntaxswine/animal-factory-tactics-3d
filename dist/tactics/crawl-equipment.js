import * as T from './vendor/three.module.js';
import {poseRoofMantleCarry} from './roof-mantle-equipment.js';
import {createFireEquipment} from './painted-fire-equipment.js';
import {crawlWeaponProfile} from './crawl-state.js';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();

// Each occupied hand gets its own native grip and clearance fit. Assets remain
// caller-owned. Offhand support uses the same forearm crawl, not a firing pose.
export function createCrawlEquipment(worker,profile,{asset=worker.weapon,side=1}={}){
 const gun=asset,primary=worker.weapon,carry=crawlWeaponProfile(gun.id),armed=gun.id!=='hands';
 const parent=gun.root.parent,oldGeometry=gun.hose?.geometry,oldUpdate=gun.updateHose;
 const saved=[gun.root,gun.mount,gun.hose].filter(Boolean).map(o=>({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible,frustumCulled:o.frustumCulled}));
 const fire=gun.mount?createFireEquipment(worker,profile):null;
 if(gun.hose)gun.updateHose=()=>{};
 const baseQ=Q().setFromEuler(new T.Euler(0,carry.yaw,carry.pitch)).multiply(Q().setFromAxisAngle(new T.Vector3(1,0,0),carry.roll));
 const mirror=q=>side===1?q:new T.Quaternion(-q.x,-q.y,q.z,q.w),gunQ=mirror(baseQ.clone());
 let palm=V(),handQ=Q().setFromUnitVectors(new T.Vector3(0,-1,0),new T.Vector3(1,0,0)),grip=V(),wristHeight=.06;
 if(armed){
  // Capture the prop's authored contact, then reflect the pose for the left
  // hand. The prop itself is turned, never mirrored or scaled.
  if(gun!==primary)worker.equipWeapon(gun);
  try{
   poseRoofMantleCarry(worker,profile);
   const hand=worker.bones.find(b=>b.name==='hand1');
   palm=hand.worldToLocal(gun.anchors.grip.getWorldPosition(V()));
   handQ=mirror(baseQ.clone().multiply(Q().setFromAxisAngle(new T.Vector3(1,0,0),carry.twist)).multiply(gun.root.getWorldQuaternion(Q()).invert()).multiply(hand.getWorldQuaternion(Q())));
   if(side===-1)palm.z=-palm.z;
   grip=gun.root.worldToLocal(gun.anchors.grip.getWorldPosition(V()));
   let minimum=Infinity;gun.root.updateWorldMatrix(true,true);
   const inverse=gun.root.matrixWorld.clone().invert();
   gun.root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,matrix=inverse.clone().multiply(m.matrixWorld);for(let i=0;i<p.count;i++)minimum=Math.min(minimum,V().fromBufferAttribute(p,i).applyMatrix4(matrix).sub(grip).applyQuaternion(gunQ).y);});
   wristHeight=Math.max(.06,.018-minimum-palm.clone().applyQuaternion(handQ).y);
  }finally{if(gun!==primary)worker.equipWeapon(primary);}
 }
 if(gun!==primary)worker.root.add(gun.root);
 const segments=18,sides=6,positions=new Float32Array((segments+1)*sides*3),normals=new Float32Array(positions.length),indices=[];
 let hoseGeometry,disposed=false;
 if(gun.hose){
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;indices.push(a,b,a+sides,b,b+sides,a+sides);}
  hoseGeometry=new T.BufferGeometry();hoseGeometry.setAttribute('position',new T.BufferAttribute(positions,3));hoseGeometry.setAttribute('normal',new T.BufferAttribute(normals,3));hoseGeometry.setIndex(indices);
  gun.hose.geometry=hoseGeometry;gun.hose.frustumCulled=false;
 }
 return {
  armed,carry,handQ,palm,wristHeight,
  place(hand){
   // The native posture's matrix decomposition can introduce tiny scale drift.
   // Reapply the authored scale rather than accumulating that across scrubs.
   gun.root.scale.copy(saved[0].s);
   if(!armed){gun.root.position.copy(saved[0].p);gun.root.quaternion.copy(saved[0].q);gun.root.visible=false;return;}
   fire?.reset();worker.root.updateMatrixWorld(true);
   const point=hand.getWorldPosition(V()).add(palm.clone().applyQuaternion(handQ)).sub(grip.clone().applyQuaternion(gunQ));
   gun.root.position.copy(worker.root.worldToLocal(point));gun.root.quaternion.copy(worker.root.getWorldQuaternion(Q()).invert().multiply(gunQ));gun.root.visible=true;worker.root.updateMatrixWorld(true);
  },
  sync(){
   if(!gun.hose)return;
   gun.mount.visible=gun.hose.visible=true;worker.root.updateMatrixWorld(true);
   const a=worker.root.worldToLocal(gun.anchors.hoseOut.getWorldPosition(V())),b=worker.root.worldToLocal(gun.anchors.hoseIn.getWorldPosition(V()));
   const curve=new T.CatmullRomCurve3([a,a.clone().add(new T.Vector3(-.05,-.12,.07)),b.clone().add(new T.Vector3(-.08,-.12,.08)),b]),point=V(),tangent=V(),side=V(),normal=V(),up=V(),ring=V();
   for(let i=0;i<=segments;i++){
    curve.getPoint(i/segments,point);curve.getTangent(i/segments,tangent);up.set(0,Math.abs(tangent.y)>.95?0:1,Math.abs(tangent.y)>.95?1:0);side.crossVectors(tangent,up).normalize();normal.crossVectors(tangent,side).normalize();
    for(let j=0;j<sides;j++){const angle=j/sides*Math.PI*2;ring.copy(side).multiplyScalar(Math.cos(angle)).addScaledVector(normal,Math.sin(angle));const k=(i*sides+j)*3;positions[k]=point.x+ring.x*.011;positions[k+1]=Math.max(.006,point.y+ring.y*.011);positions[k+2]=point.z+ring.z*.011;normals[k]=ring.x;normals[k+1]=ring.y;normals[k+2]=ring.z;}
   }
   hoseGeometry.attributes.position.needsUpdate=hoseGeometry.attributes.normal.needsUpdate=true;
  },
  contact(hand){if(!armed)return null;const a=hand.localToWorld(palm.clone()),b=gun.anchors.grip.getWorldPosition(V());return {palm:a.toArray(),grip:b.toArray(),error:a.distanceTo(b)};},
  dispose(){
   if(disposed)return;disposed=true;
   if(hoseGeometry){gun.hose.geometry=oldGeometry;gun.updateHose=oldUpdate;hoseGeometry.dispose();}
   fire?.restore();
   if(gun.root.parent!==parent){gun.root.removeFromParent();parent?.add(gun.root);}
   for(const {o,p,q,s,visible,frustumCulled}of saved){o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);o.visible=visible;o.frustumCulled=frustumCulled;}
  }
 };
}
