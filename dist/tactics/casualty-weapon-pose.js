import * as T from './vendor/three.module.js';
import {createRifleFiring} from './rifle-firing.js';
// The ordinary low carry puts the HMG bipod underground. Reuse the existing
// supported prone aiming pose for this study's held endpoint, then blend into
// the ordinary casualty. Cache the solved endpoint, not the falling pose.
export function createCasualtyWeaponPose(worker,profile,posture,locomotion){
 const firing=worker.weapon?.id==='hmg'?createRifleFiring(worker,profile,posture):null;let held;
 function snapshot(object){return {object,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()};}
 return {apply(sample,{proneStart=false}={}){
  locomotion.apply(sample);
  if(!firing||!proneStart){posture.apply(sample);return;}
  // Reset casualty-authored tail vertices as well as the bones on every replay.
  posture.apply({...sample,pose:{prone:1}});
  if(!held){const result=firing.apply({aim:1,target:new T.Vector3(6,.48,0),sample:{...sample,pose:{prone:1}}});if(!result.supported)throw Error('No supported prone HMG hold for '+profile.id);held=[worker.root,...worker.bones,worker.weapon.root].map(snapshot);}
  for(const {object,position,quaternion,scale}of held){object.position.copy(position);object.quaternion.copy(quaternion);object.scale.copy(scale);}worker.weapon.root.visible=true;worker.root.updateMatrixWorld(true);worker.skeleton.update();
  for(const glove of worker.gripHands||[])if(glove.visible)for(const cuff of glove.children)cuff.update?.();
  const down=sample.pose?.down||0;if(down>0)posture.apply({...sample,pose:{down,dead:sample.pose.dead||0}});
 }};
}
