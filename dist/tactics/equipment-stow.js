import * as T from './vendor/three.module.js';
export const STOW_MODES={hands:'empty',knife:'sheath',pistol:'holster',grenade:'pouch',rifle:'sling',assault:'sling',smg:'sling',shotgun:'sling',sniper:'sling',hmg:'sling',launcher:'sling',rpg:'sling',flamethrower:'pack'};
export const supportsStow=id=>Object.hasOwn(STOW_MODES,id);
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
// Shared equipment presentation, independent of locomotion and tactical inventory.
// Apply after the body pose. Restore before the next carry/weapon pose.
export function createEquipmentStow(worker,profile){
 const gun=worker.weapon,id=gun?.id||'rifle',mode=STOW_MODES[id];if(!supportsStow(id))throw Error('No stowed placement for '+id);
 const root=worker.root,spine=worker.bones.find(b=>b.name==='spine');if(!spine)throw Error('Stowed equipment needs a spine bone');
 const material=new T.MeshStandardMaterial({color:0x513a25,roughness:.95,side:T.DoubleSide}),geometry=new T.BufferGeometry(),sling=new T.Mesh(geometry,material);sling.name='Equipment shoulder sling';root.add(sling);sling.visible=false;
 const back=profile.id.startsWith('pig')?-.40:profile.id==='skunk'?-.22:-.29,z=profile.id==='skunk'?.53:-.15,front=profile.id.startsWith('pig')?.33:.19;
 const points=new T.CatmullRomCurve3([V(back,-.23,z),V(-.18,.17,-.18),V(.025,.22,-.17),V(front,.10,-.13),V(front,-.18,.14),V(back,-.23,z)]).getPoints(32),positions=new Float32Array(points.length*6),indices=[];
 for(let i=0;i<points.length-1;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setIndex(indices);
 let holder=null;if(['holster','sheath','pouch','pack'].includes(mode)){holder=new T.Mesh(new T.BoxGeometry(mode==='pack'?.15:mode==='pouch'?.09:.075,mode==='pack'?.06:mode==='sheath'?.19:mode==='pouch'?.10:.14,mode==='pack'?.22:.065),material);holder.name='Equipment '+mode;root.add(holder);holder.visible=false;}
 root.updateMatrixWorld(true);const bounds=new T.Box3(),inverse=gun.root.matrixWorld.clone().invert();gun.root.traverse(p=>{if(!p.isMesh)return;p.geometry.computeBoundingBox();bounds.union(p.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(p.matrixWorld)));});const center=bounds.isEmpty()?V():bounds.getCenter(V());
 let state='carried',disposed=false,saved;
 const save=()=>[gun.root,gun.mount,gun.hose].filter(Boolean).map(o=>({o,visible:o.visible,p:o.position.clone(),q:o.quaternion.clone(),scale:o.scale.clone()}));saved=save();
 function restore(){for(const {o,visible,p,q,scale}of saved){o.visible=visible;o.position.copy(p);o.quaternion.copy(q);o.scale.copy(scale);}sling.visible=false;if(holder)holder.visible=false;state='carried';root.updateMatrixWorld(true);gun.updateHose?.(root);}
 function apply(){if(disposed)throw Error('Equipment stow is disposed');if(worker.weapon!==gun)throw Error('Equipment changed during stow');if(state!=='stowed'){saved=save();state='stowed';}root.updateMatrixWorld(true);const parentQ=root.getWorldQuaternion(new T.Quaternion()).invert(),spineQ=spine.getWorldQuaternion(new T.Quaternion()).premultiply(parentQ),position=V(),axis=V(0,.9,profile.id==='skunk'?-.12:.42).normalize();
  if(mode==='empty'){gun.root.visible=false;sling.visible=false;return;}
  let anchor=center;
  if(id==='rifle'){position.set(back,-.23,z);anchor=gun.anchors.stock.position;}
  else if(['holster','sheath','pouch'].includes(mode)){position.set(-.10,-.40,profile.id==='skunk'?-.40:.35);axis.set(0,-1,0);}
  else if(mode==='pack'){position.set(-.38,-.10,profile.id==='skunk'?-.32:.25);axis.set(0,1,.10);}
  else {const depth=bounds.isEmpty()?0:Math.max(0,-bounds.min.y);position.set(back-.12-depth,-.12,profile.id==='skunk'?.53:-.15);axis.set(0,1,profile.id==='skunk'?-.10:.12);}
  const origin=root.worldToLocal(spine.localToWorld(position.clone()));gun.root.visible=true;gun.root.quaternion.setFromUnitVectors(V(1,0,0),axis.normalize()).premultiply(spineQ);gun.root.position.copy(origin).sub(anchor.clone().applyQuaternion(gun.root.quaternion));
  if(holder){holder.visible=true;holder.position.copy(mode==='pack'?root.worldToLocal(spine.localToWorld(position.clone().add(V(.045,0,profile.id==='skunk'?.08:-.08)))):origin);holder.quaternion.copy(spineQ);}
  if(gun.mount)gun.mount.visible=true;if(gun.hose){gun.hose.visible=true;gun.updateHose?.(root);}
  sling.visible=mode==='sling';if(sling.visible){points[0].copy(position);points[points.length-1].copy(position);for(let i=0;i<points.length;i++){const across=V(1,0,0).cross(points[Math.min(i+1,32)].clone().sub(points[Math.max(0,i-1)])).normalize().multiplyScalar(.017);for(const side of [-1,1]){const p=root.worldToLocal(spine.localToWorld(points[i].clone().addScaledVector(across,side)));geometry.attributes.position.setXYZ(i*2+(side===1?1:0),p.x,p.y,p.z);}}geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();}
  root.updateMatrixWorld(true);
 }
 return {id,mode,get state(){return state;},apply,restore,dispose(){if(disposed)return;restore();disposed=true;sling.removeFromParent();holder?.removeFromParent();geometry.dispose();holder?.geometry.dispose();material.dispose();}};
}
