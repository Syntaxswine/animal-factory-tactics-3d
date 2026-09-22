import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
// Standing rifle presentation, using the reviewed shoulder/grip landmarks.
export function createRifleFiring(worker,profile){
 worker.root.position.set(0,0,0);worker.root.rotation.set(0,0,0);worker.pose('neutral');
 const named=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
 const rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())]));
 function rotation(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));worker.root.updateMatrixWorld(true);}
 function raw(aim,recoil,heading,pitch){
  const gun=worker.weapon,root=worker.root;root.position.set(0,0,0);root.rotation.set(0,0,0);worker.pose('carry',0);
  named.spine.rotation.x=.16*aim;named.spine.rotation.z=-.02*recoil;
  named.head.rotation.z=(pitch*(profile.headPitchSlope??1.5)+(profile.headPitch??-.9))*aim;
  named.head.rotation.y=((profile.headYaw??25)*Math.PI/180+.4*pitch)*aim;root.updateMatrixWorld(true);
  const spineQ=named.spine.getWorldQuaternion(new T.Quaternion()),spineOrigin=named.spine.getWorldPosition(V());
  const carryPosition=new T.Vector3(...gun.carry.position).sub(rest.get(named.spine)).applyQuaternion(spineQ).add(spineOrigin);
  const carryQ=new T.Quaternion().setFromUnitVectors(V(1,0,0),new T.Vector3(...gun.carry.axis).normalize());
  const yaw=-(profile.bodyYaw??35)*Math.PI/180,axis=V(Math.cos(yaw)*Math.cos(pitch),Math.sin(pitch),Math.sin(yaw)*Math.cos(pitch));
  const aimQ=new T.Quaternion().setFromUnitVectors(V(1,0,0),axis);
  const stock=named.upperArm1.getWorldPosition(V()).add(new T.Vector3(...(profile.stockOffset||[-.045,.070,-.035])).applyQuaternion(spineQ));
  gun.root.quaternion.copy(spineQ.clone().multiply(carryQ)).slerp(aimQ,aim);
  gun.root.position.copy(carryPosition).lerp(stock.sub(gun.anchors.stock.position.clone().applyQuaternion(aimQ)),aim).addScaledVector(axis,-.038*recoil);
  root.updateMatrixWorld(true);
  const handQ=new T.Quaternion().setFromUnitVectors(V(0,-1,0),V(1,0,0).applyQuaternion(gun.root.quaternion));
  for(const side of [-1,1]){
   const a=named['upperArm'+side],b=named['forearm'+side],c=named['hand'+side],anchor=side===1?'grip':'support';
   const target=gun.anchors[anchor].getWorldPosition(V()).sub(V(.052,-.010,0).applyQuaternion(handQ)),start=a.getWorldPosition(V());
   const ra=rest.get(a),rb=rest.get(b),rc=rest.get(c),la=ra.distanceTo(rb),lb=rb.distanceTo(rc),axis=target.clone().sub(start),d=axis.length();
   if(d>la+lb+1e-6||d<Math.abs(la-lb)-1e-6)throw Error(profile.id+' rifle grip outside arm reach');
   axis.normalize();const along=(la*la-lb*lb+d*d)/(2*d),pole=V(-.12,-1,side*.55);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
   const mid=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,la*la-along*along)));
   rotation(a,new T.Quaternion().setFromUnitVectors(rb.clone().sub(ra).normalize(),mid.clone().sub(start).normalize()));
   rotation(b,new T.Quaternion().setFromUnitVectors(rc.clone().sub(rb).normalize(),target.clone().sub(mid).normalize()));rotation(c,handQ);named['fingers'+side].rotation.z=-.9;
  }
  root.rotation.y=-heading+yaw*aim;root.updateMatrixWorld(true);worker.skeleton.update();
 }
 function muzzle(){const gun=worker.weapon;return {origin:gun.anchors.muzzle.getWorldPosition(V()),direction:V(1,0,0).transformDirection(gun.barrel.matrixWorld)};}
 return {apply({aim,recoil=0,target}){
  let heading=Math.atan2(target.z,target.x),pitch=Math.atan2(target.y-1.3,Math.hypot(target.x,target.z));
  for(let i=0;i<(aim>=.999?4:1);i++){
   raw(aim,recoil,heading,pitch);const delta=target.clone().sub(muzzle().origin);heading=Math.atan2(delta.z,delta.x);pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));
  }
  return muzzle();
 },muzzle};
}
