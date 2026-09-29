import * as T from './vendor/three.module.js';
import {sampleSneakWindow,SNEAK_DURATION,SNEAK_PHASES} from './weighted-window-supported.js';
import {WINDOW_SOLIDS} from './body-collisions.js';
import {createHenWindowFit} from './hen-window-fit.js';
import {createPigWindowFit} from './pig-window-fit.js';
const V=(a=[0,0,0])=>new T.Vector3(...a),Q=()=>new T.Quaternion();

// A fixed-length retargeting experiment, not species dynamics or a collision solver.
// Targets that cannot be reached stay visible in the diagnostics; no bone scaling.
export function createAnimalWindowMotion(worker,profile,{fitting=true}={}){
 if(!profile?.id)throw Error('Animal window motion requires a species profile');
 const {root,bones}=worker,n=Object.fromEntries(bones.map(b=>[b.name,b]));
 const avian=profile.id==='hen';
 if(avian){n.hips=n.pelvis;n.spine=n.breast;}
 const required=avian?['hips','spine','head',...[-1,1].flatMap(s=>['wing '+s,'wing tip '+s,'shank '+s,'foot '+s])]:['hips','spine','head',...[-1,1].flatMap(s=>['upperArm'+s,'forearm'+s,'hand'+s,'thigh'+s,'shin'+s,'hoof'+s])];
 for(const name of required)if(!n[name])throw Error('Missing native bone: '+name);
 const saved=[];root.traverse(o=>saved.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible}));
 const savedObjects=new Set(saved.map(s=>s.o)),originalSkeleton=worker.skeleton,partSkeletons=worker.parts.map(m=>({m,skeleton:m.skeleton}));
 const savedGeometry=worker.parts.map(m=>({g:m.geometry,index:m.geometry.index,attributes:{...m.geometry.attributes}}));let disposed=false;
 root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');root.updateMatrixWorld(true);
 const rest=new Map(bones.map(b=>[b,b.getWorldPosition(V())])),neutral=bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));
 let fitter=null;
 try{fitter=fitting?(avian?createHenWindowFit(worker):profile.id==='pig-director'?createPigWindowFit(worker):null):null;}catch(error){restore();throw error;}
 const limbs=avian?[]:[-1,1].flatMap(s=>[
  {name:'hand'+s,s,a:n['upperArm'+s],b:n['forearm'+s],c:n['hand'+s],offset:V([.052,-.010,0]),type:'hand'},
  {name:'foot'+s,s,a:n['thigh'+s],b:n['shin'+s],c:n['hoof'+s],offset:V([0,-.12,0]),type:'foot'}
 ]);
 const vertexCache=new WeakMap();
 let result;
 function rotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));root.updateMatrixWorld(true);}
 function align(b,child,direction){const from=child.getWorldPosition(V()).sub(b.getWorldPosition(V())).normalize();rotate(b,Q().setFromUnitVectors(from,direction.clone().normalize()).multiply(b.getWorldQuaternion(Q())));}
 function solve(l,target,q,pole){
  const start=l.a.getWorldPosition(V()),endTarget=target.clone().sub(l.offset.clone().applyQuaternion(q)),delta=endTarget.clone().sub(start),raw=delta.length();
  const l1=rest.get(l.a).distanceTo(rest.get(l.b)),l2=rest.get(l.b).distanceTo(rest.get(l.c)),d=T.MathUtils.clamp(raw,Math.abs(l1-l2)+1e-6,l1+l2-1e-6),axis=raw>1e-8?delta.divideScalar(raw):V([0,-1,0]);
  pole.addScaledVector(axis,-pole.dot(axis));if(pole.lengthSq()<1e-10){pole=V([1,0,0]).addScaledVector(axis,-axis.x);if(pole.lengthSq()<1e-10)pole=V([0,0,1]).addScaledVector(axis,-axis.z);}pole.normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),mid=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along))),end=start.clone().addScaledVector(axis,d);
  align(l.a,l.b,mid.sub(start));align(l.b,l.c,end.sub(l.b.getWorldPosition(V())));rotate(l.c,q);
  const actual=l.c.localToWorld(l.offset.clone());return {name:l.name,error:actual.distanceTo(target),target:target.toArray(),actual:actual.toArray()};
 }
 function inspectMesh(){
  const p=V(),bounds=new T.Box3();let floorVertices=0,wallVertices=0,maxFloorDepth=0,meshesChecked=0,accessoryMeshes=0;
  // Traverse visible meshes, including head-attached guide hats. Hidden equipment
  // and hidden grip helpers are excluded by traverseVisible, not by part names.
  root.traverseVisible(m=>{if(!m.isMesh||!m.geometry.attributes.position)return;meshesChecked++;if(!worker.parts.includes(m))accessoryMeshes++;
   let entry=vertexCache.get(m);if(!entry||entry.index!==m.geometry.index||entry.position!==m.geometry.attributes.position){entry={index:m.geometry.index,position:m.geometry.attributes.position,ids:[...new Set(m.geometry.index?.array||Array.from({length:m.geometry.attributes.position.count},(_,i)=>i))]};vertexCache.set(m,entry);}
   for(const i of entry.ids){p.fromBufferAttribute(m.geometry.attributes.position,i);if(m.isSkinnedMesh)m.applyBoneTransform(i,p);p.applyMatrix4(m.matrixWorld);bounds.expandByPoint(p);
   if(p.y<-.001){floorVertices++;maxFloorDepth=Math.max(maxFloorDepth,-p.y);}
   if(WINDOW_SOLIDS.some(b=>p.x>b.lo[0]+.001&&p.x<b.hi[0]-.001&&p.y>b.lo[1]+.001&&p.y<b.hi[1]-.001&&p.z>b.lo[2]+.001&&p.z<b.hi[2]-.001))wallVertices++;
  }});
  return {floorVertices,wallVertices,maxFloorDepth,meshesChecked,accessoryMeshes,min:bounds.min.toArray(),max:bounds.max.toArray(),method:'Visible deformed mesh/accessory vertices inside wall/ground; not triangle intersection or self-collision certification.'};
 }
 function sample(t){
  if(disposed)throw Error('Animal window motion disposed');
  if(!Number.isFinite(t))throw Error('Invalid animal window time');const state=sampleSneakWindow(T.MathUtils.clamp(t,0,SNEAK_DURATION)),p=state.points;
  if(fitter){const fit=fitter.apply(state.time);if(worker.weapon)worker.weapon.root.visible=false;root.updateMatrixWorld(true);worker.skeleton.update();result={species:profile.id,rigKind:avian?'avian':'mammal',time:state.time,phase:fit.phase||state.phase,glassTime:fit.glassTime??state.glassTime,errors:fit.errors,mesh:inspectMesh(),reference:state,held:true,unarmed:true,fitting:'species-specific',authoredSupport:fit.supported??false,supportNote:fit.supportNote||'Species contact and force support remain unverified.'};return result;}
  bones.forEach((b,i)=>{b.position.copy(neutral[i].p);b.quaternion.copy(neutral[i].q);});root.position.copy(V(p.hip).sub(rest.get(n.hips)));root.quaternion.identity();if(worker.weapon)worker.weapon.root.visible=false;
  root.updateMatrixWorld(true);align(n.hips,n.spine,V(p.lumbar).sub(V(p.hip)));align(n.spine,n.head,V(p.shoulders).sub(V(p.lumbar)));
  rotate(n.head,Q().setFromUnitVectors(V([0,1,0]),V(p.head).sub(V(p.neck)).normalize()));
  const errors=limbs.map(l=>{
   const s=l.s,hand=l.type==='hand',direction=hand?V(p['palm'+s]).sub(V(p['wrist'+s])):V(p['toe'+s]).sub(V(p['ankle'+s]));
   const q=Q().setFromUnitVectors(V([1,0,0]),direction.normalize());
   const target=V(hand?p['palm'+s]:p['ankle'+s]);
   // Mannequin feet are capsule axes; their lower surface is 0.06 below.
   if(!hand)target.add(V([0,-.06,0]).applyQuaternion(q));
   const pole=V(p[(hand?'elbow':'knee')+s]).sub(l.a.getWorldPosition(V()));return solve(l,target,q,pole);
  });
  if(avian)for(const s of [-1,1]){
   // The bird rig has wing/tip and shank/foot chains, without mammal elbows or
   // knees. Rotate those existing joints only; expose their shorter reach.
   const wing=n['wing '+s],tip=n['wing tip '+s],shank=n['shank '+s],foot=n['foot '+s];
   const target=V(p['palm'+s]);align(wing,tip,target.clone().sub(wing.getWorldPosition(V())));
   rotate(tip,Q().setFromUnitVectors(V([0,-1,0]),V(p['palm'+s]).sub(V(p['wrist'+s])).normalize()));
   align(shank,foot,V(p['ankle'+s]).sub(V(p['knee'+s])));
   const q=Q().setFromUnitVectors(V([1,0,0]),V(p['toe'+s]).sub(V(p['ankle'+s])).normalize());rotate(foot,q);
   for(const [name,bone,offset,goal]of [['wing'+s,tip,V(),target],['foot'+s,foot,V([0,-.06,0]),V(p['ankle'+s]).add(V([0,-.06,0]).applyQuaternion(q))]]){
    const actual=bone.localToWorld(offset);errors.push({name,error:actual.distanceTo(goal),target:goal.toArray(),actual:actual.toArray()});
   }
  }
  root.updateMatrixWorld(true);worker.skeleton.update();result={species:profile.id,rigKind:avian?'avian':'mammal',time:state.time,phase:state.phase,glassTime:state.glassTime,errors,mesh:inspectMesh(),reference:state,held:true,unarmed:true};return result;
 }
 function restore(){fitter?.restore?.();for(const {o,p,q,s,visible}of saved){for(const child of [...o.children])if(!savedObjects.has(child))o.remove(child);o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);o.visible=visible;}for(const {g,index,attributes}of savedGeometry){g.setIndex(index);for(const [name,a]of Object.entries(attributes))g.setAttribute(name,a);}worker.skeleton=originalSkeleton;for(const {m,skeleton}of partSkeletons)m.skeleton=skeleton;root.updateMatrixWorld(true);worker.skeleton.update();}
 return {duration:SNEAK_DURATION,phases:fitter?.phases||SNEAK_PHASES,sample,diagnostics:()=>result,restore,dispose(){if(disposed)return;restore();fitter?.dispose?.();disposed=true;}};
}
