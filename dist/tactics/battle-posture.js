import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
// Articulate the existing painted skeleton; no changes to collision or core state.
export function createBattlePosture(worker,profile){
 const root=worker.root,named=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
 root.position.set(0,0,0);root.rotation.set(0,0,0);worker.pose('neutral');root.updateMatrixWorld(true);
 const rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())]));
 const hips=named.hips||named.pelvis,spine=named.spine||named.breast;
 function rotation(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));root.updateMatrixWorld(true);}
 function leg(side,target){
  const a=named['thigh'+side],b=named['shin'+side],c=named['hoof'+side];
  const ra=rest.get(a),rb=rest.get(b),rc=rest.get(c),start=a.getWorldPosition(V()),la=ra.distanceTo(rb),lb=rb.distanceTo(rc);
  const axis=target.clone().sub(start),d=T.MathUtils.clamp(axis.length(),Math.abs(la-lb)+.0001,la+lb-.0001);axis.normalize();
  const along=(la*la-lb*lb+d*d)/(2*d),pole=V(1,0,0).addScaledVector(axis,-axis.x).normalize();
  const mid=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,la*la-along*along)));
  rotation(a,new T.Quaternion().setFromUnitVectors(rb.clone().sub(ra).normalize(),mid.clone().sub(start).normalize()));
  rotation(b,new T.Quaternion().setFromUnitVectors(rc.clone().sub(rb).normalize(),start.clone().addScaledVector(axis,d).sub(mid).normalize()));
  rotation(c,new T.Quaternion());
 }
 return {apply(sample,{equipment=true}={}){
  const {kneel=0,prone=0,down=0,stable=0,dead=0}=sample.pose||{};
  if(kneel+prone+down<.00001)return;
  const heading=root.rotation.y;root.rotation.y=0;root.position.set(0,0,0);root.updateMatrixWorld(true);
  const before=spine.matrixWorld.clone(),low=Math.min(1,prone+down),cycle=(sample.distance||0)*Math.PI*5,walk=(sample.blend||0)*(1-down);
  hips.position.y-=(profile.unarmed?0:(profile.kneelDrop||.36))*kneel;
  hips.position.y+=(.27-rest.get(hips).y)*low;
  hips.rotation.z=-Math.PI/2*low;
  hips.rotation.x=(.25+.8*stable-1.1*dead)*down;
  spine.rotation.z+=.15*prone+.22*(1-dead)*down;
  named.head.rotation.z+=1.35*prone+.2*down;
  if(profile.unarmed){
   spine.rotation.z-=.3*kneel;named.head.rotation.z+=.15*kneel;
   for(const side of [-1,1]){named['shank '+side].rotation.z+=.35*low;named['wing '+side].rotation.x+=side*(.16*prone+.3*down);}
  }else{
   root.updateMatrixWorld(true);
   for(const side of [-1,1]){
    const foot=rest.get(named['hoof'+side]);
    if(kneel>0&&low<.001)leg(side,V(foot.x+(side===1?.26:-.28)*kneel+.07*Math.sin(cycle+side)*walk,.12+.025*Math.max(0,Math.sin(cycle+side))*walk,foot.z));
    if(low>0){named['thigh'+side].rotation.z+=(-.16+.10*Math.sin(cycle+side)*walk)*low+.22*down;named['thigh'+side].rotation.x+=side*(.18*prone+.12*down);named['shin'+side].rotation.z+=(.28+.17*Math.sin(cycle+side)*walk)*prone+(.5+side*.16)*down;named['hoof'+side].rotation.z+=.8*low;}
   }
  }
  root.updateMatrixWorld(true);
  if(equipment&&worker.weapon){
   // Transform carry equipment with the torso, keeping both authored grips.
   const delta=spine.matrixWorld.clone().multiply(before.invert());
   worker.weapon.root.applyMatrix4(delta);worker.weapon.updateHose?.(root);
   worker.weapon.root.visible=down<.5;
   if(worker.weapon.mount)worker.weapon.mount.visible=down<.5;
   if(worker.weapon.hose)worker.weapon.hose.visible=down<.5;
  }
  if(down>0&&!profile.unarmed)for(const side of [-1,1]){named['upperArm'+side].rotation.z+=(-.45+side*.2)*down;named['forearm'+side].rotation.z+=.8*down;}
  root.rotation.y=heading;root.updateMatrixWorld(true);worker.skeleton.update();
 },ground(){
  // Ground the actual skinned surface, including non-human heads/tails/feet.
  // Called only when a pose changes; stationary actors keep their cached pose.
  let min=Infinity;const v=V();
  for(const part of worker.parts){const p=part.geometry.attributes.position;for(let i=0;i<p.count;i++){part.getVertexPosition(i,v);v.applyMatrix4(part.matrixWorld);min=Math.min(min,v.y);}}
  root.position.y+=.012-min;root.updateMatrixWorld(true);worker.skeleton.update();
 }};
}
