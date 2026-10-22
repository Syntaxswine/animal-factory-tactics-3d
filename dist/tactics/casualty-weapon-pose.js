import * as T from './vendor/three.module.js';
import {createRifleFiring} from './rifle-firing.js';
import {solveLimb} from './idle-rig-math.js';
import {createCasualtyHeadClearance} from './casualty-weapon-clearance.js';
// The ordinary low carry puts the HMG bipod underground. Reuse the existing
// supported prone aiming pose for this study's held endpoint, then blend into
// the ordinary casualty. Cache the solved endpoint, not the falling pose.
export function createCasualtyWeaponPose(worker,profile,posture,locomotion){
 const gun=worker.weapon,needsFit=gun&&gun.id!=='rifle'&&gun.id!=='hands',firing=needsFit&&gun.anchors.stock?createRifleFiring(worker,profile,posture):null,named=Object.fromEntries(worker.bones.map(b=>[b.name,b]));let held;
 function snapshot(object){return {object,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()};}
 function fitWeapon(sample){
  // Retain each authored palm/grip orientation while moving the prop in front
  // of the prone shoulders. Native two-bone IK rejects any stretched solution.
  if(firing){const result=firing.apply({aim:1,target:new T.Vector3(6,.48,0),sample:{...sample,pose:{prone:1}}});if(!result.supported)throw Error('No supported prone hold for '+profile.id+' / '+gun.id);}else locomotion.apply({...sample,pose:{}});
  const inverse=gun.root.getWorldQuaternion(new T.Quaternion()).invert(),hands=gun.carry.hands.map(side=>{const hand=named['hand'+side],name=side===1?'grip':'support';return {side,name,palm:hand.worldToLocal(gun.anchors[name].getWorldPosition(new T.Vector3())),relative:inverse.clone().multiply(hand.getWorldQuaternion(new T.Quaternion()))};});
  if(!firing)posture.apply({...sample,pose:{prone:1}});worker.root.updateMatrixWorld(true);worker.skeleton.update();const base=worker.bones.map(snapshot),headRow=base.find(r=>r.object===named.head),headQ=headRow.quaternion.clone(),shoulders=named.upperArm1.getWorldPosition(new T.Vector3()).add(named['upperArm-1'].getWorldPosition(new T.Vector3())).multiplyScalar(.5),orientation=worker.root.getWorldQuaternion(new T.Quaternion());let clearance,reachable=0,floorFits=0;
  const floorClear=()=>{let minimum=Infinity;gun.root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)minimum=Math.min(minimum,new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).y);});return minimum>=-.001;};
  try{for(const turn of [0,.35,.65]){for(const r of base){r.object.position.copy(r.position);r.object.quaternion.copy(r.quaternion);r.object.scale.copy(r.scale);}named.head.quaternion.copy(headQ);worker.root.updateMatrixWorld(true);if(turn)named.head.quaternion.premultiply(named.head.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),turn)).multiply(named.head.parent.getWorldQuaternion(new T.Quaternion())));headRow.quaternion.copy(named.head.quaternion);worker.root.updateMatrixWorld(true);worker.skeleton.update();clearance?.dispose();clearance=createCasualtyHeadClearance(worker);if(turn===0&&firing&&floorClear()&&clearance.clear(gun))return;
   for(const side of [.22,.28,.34,.16,.40,.10])for(const forward of [.08,.04,0,.12,.16,-.04,.20,.24])for(const rise of [.04,0,-.08,-.16,-.24,.09,.14])for(const yaw of [0,-.3,.3,-.6,.6,.9,1.2,-.9,-1.2])for(const roll of gun.id==='hmg'?[-Math.PI/2,0]:[0]){for(const r of base){r.object.position.copy(r.position);r.object.quaternion.copy(r.quaternion);r.object.scale.copy(r.scale);}worker.root.updateMatrixWorld(true);const point=new T.Vector3(forward,rise,side).applyQuaternion(orientation).add(shoulders);gun.root.position.copy(worker.root.worldToLocal(point));gun.root.quaternion.copy(orientation).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw)).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),roll)).premultiply(worker.root.getWorldQuaternion(new T.Quaternion()).invert());worker.root.updateMatrixWorld(true);
    try{for(const h of hands){const rotation=gun.root.getWorldQuaternion(new T.Quaternion()).multiply(h.relative),target=gun.anchors[h.name].getWorldPosition(new T.Vector3()).sub(h.palm.clone().applyQuaternion(rotation));solveLimb(named['upperArm'+h.side],named['forearm'+h.side],named['hand'+h.side],target,rotation,new T.Vector3(-.12,-1,h.side*.55));}worker.root.updateMatrixWorld(true);worker.skeleton.update();reachable++;if(floorClear()){floorFits++;if(clearance.clear(gun))return;}}catch(error){if(!/outside native reach/.test(error.message))throw error;}
   }}throw Error('No head-clear supported prone hold for '+profile.id+' / '+gun.id+' (reachable '+reachable+', above floor '+floorFits+')');
  }finally{clearance?.dispose();}
 }
 return {apply(sample,{proneStart=false}={}){
  locomotion.apply(sample);
  if(!needsFit||!proneStart){posture.apply(sample);return;}
  // Reset casualty-authored tail vertices as well as the bones on every replay.
  posture.apply({...sample,pose:{prone:1}});
  if(!held){fitWeapon(sample);held=[worker.root,...worker.bones,gun.root].map(snapshot);}
  for(const {object,position,quaternion,scale}of held){object.position.copy(position);object.quaternion.copy(quaternion);object.scale.copy(scale);}worker.weapon.root.visible=true;worker.root.updateMatrixWorld(true);worker.skeleton.update();
  for(const glove of worker.gripHands||[])if(glove.visible)for(const cuff of glove.children)cuff.update?.();
  const down=sample.pose?.down||0;if(down>0)posture.apply({...sample,pose:{down,dead:sample.pose.dead||0}});
 }};
}
