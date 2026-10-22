import * as T from './vendor/three.module.js';
import {impactFrame} from './shot-coordinates.js';
import {DIMENSIONS} from './hybrid-world.js';

// Render-world units (tiles). Correction is cosmetic and stays on the resolved
// incoming ray; it cannot change the victim, body region or combat result.
export const MAX_SPRAY_CONTACT_CORRECTION=.4;
const UP=new T.Vector3(0,1,0),SIDE=new T.Vector3(0,0,1);

function boneRegion(name){
 if(/^head$/i.test(name))return 'head';
 if(/^(thigh|shin|hoof|shank|foot)/i.test(name))return 'legs';
 if(/^(upperArm|forearm|hand|fingers|wing)/i.test(name))return 'arms';
 return 'torso';
}
function faceRegion(hit,a,b,c){
 const mesh=hit.object,g=mesh.geometry,indices=g.attributes.skinIndex,weights=g.attributes.skinWeight;
 // Explicit regions are useful for a rigid authored replacement, never for
 // arbitrary scene meshes. The caller still supplies this victim's parts only.
 if(!mesh.isSkinnedMesh||!indices||!weights)return mesh.userData.impactRegion||null;
 const local=mesh.worldToLocal(hit.point.clone()),bary=T.Triangle.getBarycoord(local,a,b,c,new T.Vector3());
 if(!bary)return null;
 const totals={head:0,torso:0,arms:0,legs:0};
 for(const [vertex,factor] of [[hit.face.a,bary.x],[hit.face.b,bary.y],[hit.face.c,bary.z]])for(let k=0;k<4;k++){
  const bone=mesh.skeleton.bones[indices.getComponent(vertex,k)];
  totals[boneRegion(bone?.name||'')]+=Math.max(0,factor)*weights.getComponent(vertex,k);
 }
 return Object.keys(totals).reduce((best,region)=>totals[region]>totals[best]?region:best,'torso');
}
function matchesRegion(resolved,surface){
 // The tactical torso includes arms. A weapon-region *body injury* may spray
 // from an arm/torso; held weapons and their attachments are never queried.
 return resolved==='head'?surface==='head':resolved==='legs'?surface==='legs':surface==='torso'||surface==='arms';
}
function surfaceContact(receipt,frame,model){
 if(!model)return {reason:'collider-only'};
 if(model.victimId!==receipt.victimId)return {reason:'wrong-victim'};
 const parts=(model.parts||[]).filter(p=>p.visible&&p.isMesh&&!p.userData.characterBatch);
 if(!parts.length)return {reason:'no-body-parts'};
 const ray=new T.Raycaster(frame.contact.clone().addScaledVector(frame.incoming,-MAX_SPRAY_CONTACT_CORRECTION),frame.incoming,0,2*MAX_SPRAY_CONTACT_CORRECTION);
 ray.layers.enableAll(); // Original skinned parts may be on the pick-only layer.
 for(const part of parts)part.updateWorldMatrix(true,false);
 const hits=ray.intersectObjects(parts,false),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(const hit of hits){
  if(!hit.face)continue;
  const mesh=hit.object;mesh.getVertexPosition(hit.face.a,a);mesh.getVertexPosition(hit.face.b,b);mesh.getVertexPosition(hit.face.c,c);
  if(!matchesRegion(receipt.zone,faceRegion(hit,a,b,c)))continue;
  const normal=new T.Triangle(a.clone().applyMatrix4(mesh.matrixWorld),b.clone().applyMatrix4(mesh.matrixWorld),c.clone().applyMatrix4(mesh.matrixWorld)).getNormal(new T.Vector3());
  // Ignore an exit/back face, even when the material is double-sided.
  if(normal.dot(frame.incoming)>=-1e-6)continue;
  const correction=hit.point.distanceTo(frame.contact);
  if(correction>MAX_SPRAY_CONTACT_CORRECTION+1e-6)continue;
  return {contact:hit.point,normal,correction,part:mesh.name,reason:'skin-contact'};
 }
 return {reason:'no-matching-surface'};
}

// Call once at the discharge, after posing the victim at its captured impact
// pose and updating its bounds. Retain the result for the effect's lifetime.
// No camera, random source, scene traversal or simulation query is involved.
export function gunshotSprayFrame(receipt,{model}={}){
 const frame=impactFrame(receipt),surface=surfaceContact(receipt,frame,model),contact=(surface.contact||frame.contact).clone();
 contact.shotLevel=frame.contact.shotLevel;
 const outgoing=frame.incoming.clone().negate(); // Entrance spray, not an exit jet.
 const referenceUp=Math.abs(outgoing.dot(UP))>.999?SIDE:UP;
 const up=referenceUp.clone().addScaledVector(outgoing,-referenceUp.dot(outgoing)).normalize();
 const across=new T.Vector3().crossVectors(outgoing,up).normalize();
 const matrix=new T.Matrix4().makeBasis(outgoing,up,across).setPosition(contact);
 const correction=surface.correction||0;
 return {matrix,contact,colliderContact:frame.contact,origin:frame.origin,incoming:frame.incoming,outgoing,
  normal:surface.normal||null,correction,correctionAlongRay:contact.clone().sub(frame.contact).dot(frame.incoming),
  surfacePart:surface.part||null,placement:surface.reason,visualSeed:receipt.visualSeed,
  floor:receipt.victim.support.level*DIMENSIONS.floorSpacing+receipt.victim.support.offset};
}
