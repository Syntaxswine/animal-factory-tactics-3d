import * as T from './vendor/three.module.js';
const centers=new WeakMap(),roll=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);
const beltModes={knife:'sheath',pistol:'holster',grenade:'pouch'};
// Equipment adaptations belong to the mantle study, not the shared weapon
// assets. The RPG keeps its authored shoulder axis and full dimensions.
export function roofMantleApproachOffset(worker){
 // Its forward-pointing warhead needs room before it is slung. Keep the feet
 // planted at this farther starting mark through stow and the crouch.
 const gun=worker.weapon;if(gun?.id==='rpg')return .32;if(gun?.id!=='hmg')return 0;
 const carry=worker.getCarry?.();if(!carry?.stockFitted)return 0;
 // Measure rendered HMG vertices in the carry, independently of the current
 // pose or world placement. Its deployed bipod can reach beyond the muzzle.
 // The authored root starts .65 m from the face; reserve a 6 mm equipment gap.
 gun.root.updateWorldMatrix(true,true);
 const inverse=gun.root.matrixWorld.clone().invert(),quaternion=new T.Quaternion().setFromUnitVectors(new T.Vector3(1,0,0),new T.Vector3().fromArray(carry.axis).normalize());
 const carried=new T.Matrix4().compose(new T.Vector3().fromArray(carry.position),quaternion,gun.root.scale),point=new T.Vector3();let forward=-Infinity;
 gun.root.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry.attributes.position)return;
  // Neutral posing hides the weapon root; only authored part visibility counts.
  for(let object=mesh;object!==gun.root;object=object.parent)if(!object.visible)return;
  const matrix=carried.clone().multiply(inverse).multiply(mesh.matrixWorld),position=mesh.geometry.attributes.position,index=mesh.geometry.index;
  const ids=index?new Set(index.array):Array.from({length:position.count},(_,i)=>i);
  for(const i of ids)forward=Math.max(forward,mesh.getVertexPosition(i,point).applyMatrix4(matrix).x);
 });
 return Math.max(0,forward-.65+.006);
}

export function positionRoofMantleEquipment(worker,profile){
 const gun=worker.weapon;if(gun.id!=='hmg'&&!beltModes[gun.id])return;
 const root=worker.root,spine=worker.bones.find(b=>b.name==='spine');root.updateMatrixWorld(true);
 if(beltModes[gun.id]){
  // Preserve the shared neutral belt position, but let it follow the pelvis
  // instead of the independently bending chest. Bind matrices make this
  // deterministic even when the first requested frame is halfway through.
  const hips=worker.bones.find(b=>b.name==='hips'),hipIndex=worker.bones.indexOf(hips),spineIndex=worker.bones.indexOf(spine);
  const neutralRelation=worker.skeleton.boneInverses[hipIndex].clone().multiply(worker.skeleton.boneInverses[spineIndex].clone().invert());
  const delta=hips.matrixWorld.clone().multiply(neutralRelation).multiply(spine.matrixWorld.clone().invert());
  const localDelta=root.matrixWorld.clone().invert().multiply(delta).multiply(root.matrixWorld),rotation=new T.Quaternion().setFromRotationMatrix(localDelta);
  for(const object of [gun.root,root.getObjectByName('Equipment '+beltModes[gun.id])].filter(Boolean)){
   object.position.applyMatrix4(localDelta);object.quaternion.premultiply(rotation);
  }
  root.updateMatrixWorld(true);return;
 }
 let center=centers.get(gun);
 if(!center){
  const bounds=new T.Box3(),inverse=gun.root.matrixWorld.clone().invert();
  gun.root.traverse(mesh=>{if(!mesh.isMesh)return;mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld)));});
  center=bounds.getCenter(new T.Vector3());centers.set(gun,center);
 }
 // Turn the deployed bipod sideways and the ammunition belt outward. This
 // lets the receiver lie against the back instead of suspending the entire
 // weapon at the full bipod clearance distance. No weapon part is resized.
 const heldCenter=center.clone().applyQuaternion(gun.root.quaternion).add(gun.root.position);
 gun.root.quaternion.multiply(roll);
 gun.root.position.copy(heldCenter).sub(center.clone().applyQuaternion(gun.root.quaternion));
 const inward=profile.id.startsWith('pig')?.28:.31;
 gun.root.position.add(new T.Vector3(inward,0,0).applyQuaternion(spine.getWorldQuaternion(new T.Quaternion())));
 root.updateMatrixWorld(true);
}

export function poseRoofMantleCarry(worker,profile){
 const gun=worker.weapon,original=gun.carry;
 // Both pigs have shorter reach: draw the shoulder-fired tube inward without
 // changing the tube, anchor positions, hand count or carry orientation.
 if(gun.id!=='rpg'||!profile.id.startsWith('pig'))return worker.pose('carry');
 gun.carry={...original,position:[.18,1.245,.125]};
 try{worker.pose('carry');}finally{gun.carry=original;}
}
