import * as T from './vendor/three.module.js';
import {createEquipmentStow} from './equipment-stow.js';
import {createLadderGrip} from './ladder-grip.js';
import {CLIFF_HEIGHT} from './cliff-models.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion(),ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export const CLIFF_CLIMB_PHASES=Object.freeze([['Stow weapon',.8],['Crouch to jump',.3],['Jump and grab the edge',.45],['Catch weight',.15],['Pull up',.85],['Plant leading hoof',.65],['Push over the lip',.65],['Bring trailing leg through',.5],['Stand',.75],['Ready weapon',.9]].map(([label,seconds],i,all)=>Object.freeze({label,start:all.slice(0,i).reduce((n,p)=>n+p[1],0),end:all.slice(0,i+1).reduce((n,p)=>n+p[1],0)})));

// Horse/rifle proof. Local +X enters the ledge; its face is X=0, top Y=2.
// Progress is absolute and deterministic: review scrubbing never advances state.
export function createCliffClimb(worker,profile){
 if(profile.id!=='horse'||(worker.weapon?.id||'rifle')!=='rifle')throw Error('Cliff climb currently supports the horse with rifle');
 const root=worker.root,bones=worker.bones,named=Object.fromEntries(bones.map(b=>[b.name,b]));
 const entryObjects=[];root.traverse(o=>entryObjects.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible}));
 const entryGeometry=worker.parts.map(p=>({g:p.geometry,index:p.geometry.index,attributes:Object.fromEntries(['position','skinIndex','skinWeight'].map(k=>[k,p.geometry.attributes[k]]))})),createdGrips=[];let equipment;
 function restoreEntry(){for(const {g,index,attributes}of entryGeometry){g.setIndex(index);for(const [k,a]of Object.entries(attributes))g.setAttribute(k,a);}for(const {o,p,q,s,visible}of entryObjects){o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);o.visible=visible;}root.updateMatrixWorld(true);worker.skeleton.update();}
 function checkFrame(){root.parent?.updateMatrixWorld(true);if(root.scale.distanceTo(V(1,1,1))>1e-8||(root.parent&&!root.parent.matrixWorld.elements.every((v,i)=>Math.abs(v-(i%5===0?1:0))<1e-8)))throw Error('Cliff climb requires an unscaled actor under an identity parent');}
 checkFrame();if(!['hips','spine','head',...[-1,1].flatMap(s=>['upperArm','forearm','hand','thigh','shin','hoof'].map(n=>n+s))].every(n=>named[n])||![-1,1].every(s=>worker.parts.some(p=>p.name==='forearm and hand '+s)))throw Error('Incomplete cliff climb rig');
 try{root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');root.updateMatrixWorld(true);
 const rest=new Map(bones.map(b=>[b,b.getWorldPosition(V())])),limbs=[];
 for(const side of [-1,1]){
  limbs.push({id:'hand'+side,side,a:named['upperArm'+side],b:named['forearm'+side],c:named['hand'+side],offset:V(.10,-.024,0)});
  limbs.push({id:'foot'+side,side,a:named['thigh'+side],b:named['shin'+side],c:named['hoof'+side],offset:V(0,-.12,0)});
 }
 const grips=limbs.filter(l=>l.id.startsWith('hand')).map(l=>{
  const asset=createLadderGrip(worker,l.side,rest.get(l.c).y),palm=asset.meshes[0];createdGrips.push(asset);palm.position.set(-.065,.035,0);
  // Four fingers lie over the upper stone instead of curling through a rung.
  for(let i=0;i<4;i++){const mesh=asset.meshes[i+1],z=[-.035,-.012,.012,.035][i];mesh.geometry.dispose();mesh.geometry=new T.TubeGeometry(new T.CatmullRomCurve3([V(-.080,.012,z),V(-.060,.050,z),V(-.015,.065,z),V(.035,.040,z),V(.055,.013,z),V(.075,.009,z)]),18,.010,5,false);}
  return {l,asset};
 });
 // The hoof asset includes the upper pastern: let its buried top follow the
 // shin exactly like the trouser cuff, while keeping the horn and sole rigid.
 const ankles=[-1,1].map(side=>{const mesh=worker.parts.find(p=>p.name==='exposed hoof '+side),g=mesh.geometry,indices=g.attributes.skinIndex.clone(),weights=g.attributes.skinWeight.clone(),shin=bones.indexOf(named['shin'+side]),hoof=bones.indexOf(named['hoof'+side]);
  for(let i=0;i<indices.count;i++){const w=ease((g.attributes.position.getY(i)-.17)/.10);indices.setXYZW(i,shin,hoof,0,0);weights.setXYZW(i,w,1-w,0,0);}return {g,indices,weights};});
 const stow=equipment=createEquipmentStow(worker,profile,{riflePlacement:{back:-.29,side:-.20,axis:[0,.95,.20]}});
 const duration=6,stowWeapon=worker.weapon;let disposed=false,result=null;
 const capture=()=>({bones:bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()})),gun:{p:worker.weapon.root.position.clone(),q:worker.weapon.root.quaternion.clone()}});
 worker.pose('carry');const carry=capture();worker.pose('neutral');const neutral=capture();
 const keys=[
  {p:[-.65,0,0],lean:0},
  {p:[-.65,0,0],lean:0},
  {p:[-.60,-.13,0],lean:-.16},
  {p:[-.34,.48,0],lean:0},
  {p:[-.33,.45,0],lean:0},
  {p:[-.30,1.10,.06],lean:-.25,sideLean:-.40,hipLean:-.28},
  {p:[-.22,1.10,.06],lean:-.32,sideLean:-.42,hipLean:-.38},
  {p:[.14,1.58,.065],lean:-.35,sideLean:.08,hipLean:.04},
  {p:[.365,1.65,.045],lean:-.22,sideLean:.07},
  {p:[.365,2,0],lean:0},
  {p:[.365,2,0],lean:0}
 ];
 const freeHands=keys.map(k=>{worker.pose('neutral');root.position.fromArray(k.p);named.hips.rotation.x=k.hipLean||0;named.spine.rotation.set(k.sideLean||0,0,k.lean);root.updateMatrixWorld(true);return Object.fromEntries(limbs.filter(l=>l.id.startsWith('hand')).map(l=>[l.side,l.c.localToWorld(l.offset.clone())]));});
 const foot=(x,y,side)=>V(x,y,side*.232),edge=side=>V(0,CLIFF_HEIGHT,side*.26);
 const feet=[
  [-1,1].map(s=>foot(-.685,0,s)),[-1,1].map(s=>foot(-.685,0,s)),[-1,1].map(s=>foot(-.685,0,s)),
  [-1,1].map(s=>foot(-.34,.48,s)),[-1,1].map(s=>foot(-.33,.45,s)),
  [-1,1].map(s=>foot(-.31,1.24,s)),[foot(-.24,1.42,-1),foot(.33,2,1)],
  [foot(-.17,1.83,-1),foot(.33,2,1)],[-1,1].map(s=>foot(.33,2,s)),[-1,1].map(s=>foot(.33,2,s)),[-1,1].map(s=>foot(.33,2,s))
 ];
 function worldRotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));root.updateMatrixWorld(true);}
 function solve(l,point,q,pole){
  const target=point.clone().sub(l.offset.clone().applyQuaternion(q)),start=l.a.getWorldPosition(V()),a=rest.get(l.a),b=rest.get(l.b),c=rest.get(l.c),l1=a.distanceTo(b),l2=b.distanceTo(c),axis=target.clone().sub(start),distance=axis.length(),d=T.MathUtils.clamp(distance,Math.abs(l1-l2)+1e-6,l1+l2-1e-6);axis.normalize();pole=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),mid=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along))),end=start.clone().addScaledVector(axis,d);
  const aim=(bone,child,point)=>{const origin=bone.getWorldPosition(V()),current=child.getWorldPosition(V()).sub(origin).normalize(),desired=point.clone().sub(origin).normalize();worldRotate(bone,Q().setFromUnitVectors(current,desired).multiply(bone.getWorldQuaternion(Q())));};
  aim(l.a,l.b,mid);aim(l.b,l.c,end);worldRotate(l.c,q);
  return l.c.localToWorld(l.offset.clone()).distanceTo(point);
 }
 function poseAt(t){
  const index=Math.min(9,CLIFF_CLIMB_PHASES.findIndex(p=>t<=p.end)),phase=CLIFF_CLIMB_PHASES[index],u=T.MathUtils.clamp((t-phase.start)/(phase.end-phase.start),0,1),w=ease(u),a=keys[index],b=keys[index+1];
  for(const {asset}of grips)asset.restore();stow.restore();worker.pose('neutral');for(const {g,indices,weights}of ankles){g.setAttribute('skinIndex',indices);g.setAttribute('skinWeight',weights);}root.position.fromArray(a.p).lerp(V(...b.p),w);if(index===6){root.position.x=T.MathUtils.lerp(a.p[0],b.p[0],ease((u-.30)/.70));root.position.y=T.MathUtils.lerp(a.p[1],b.p[1],ease(u/.65));}named.hips.rotation.x=T.MathUtils.lerp(a.hipLean||0,b.hipLean||0,w);named.spine.rotation.set(T.MathUtils.lerp(a.sideLean||0,b.sideLean||0,w),0,T.MathUtils.lerp(a.lean,b.lean,w));root.updateMatrixWorld(true);
  const contacts=[],handBlend=index===0?ease(u):index===9?1-ease(u):1;
  if(index===0||index===9){const weight=index===0?1-w:w;bones.forEach((bone,i)=>{bone.position.copy(neutral.bones[i].p).lerp(carry.bones[i].p,weight);bone.quaternion.copy(neutral.bones[i].q).slerp(carry.bones[i].q,weight);});root.updateMatrixWorld(true);}
  // Always stow first, then interpolate the rifle through a shoulder-side arc.
  stow.apply();const gun=worker.weapon.root;
  if(index===0||index===9){const amount=index===0?w:1-w,parked={p:gun.position.clone(),q:gun.quaternion.clone()};gun.position.copy(carry.gun.p).lerp(parked.p,amount);gun.position.y+=.24*Math.sin(Math.PI*amount);gun.position.z+=.48*Math.sin(Math.PI*amount);gun.quaternion.copy(carry.gun.q).slerp(parked.q,amount);stow.blend(amount);root.updateMatrixWorld(true);
   for(const l of limbs.filter(l=>l.id.startsWith('hand'))){const grasp=1-ease((amount-(l.side===1?.64:0))/(l.side===1?.25:.18));if(!grasp)continue;const boneQ=l.c.getWorldQuaternion(Q()),anchor=worker.weapon.anchors[l.side===1?'grip':'support'].getWorldPosition(V()),palm=V(.052,-.010,0),from=l.c.localToWorld(palm.clone());const target=from.lerp(anchor,grasp);contacts.push({id:l.id,kind:'weapon',error:solve({...l,offset:palm},target,boneQ,l.b.getWorldPosition(V()).sub(l.a.getWorldPosition(V())).lerp(V(-.3,-.3,l.side*.8),ease(amount/.15)))});}
  }
  for(const [i,l]of limbs.filter(l=>l.id.startsWith('foot')).entries()){
   const target=feet[index][i].clone().lerp(feet[index+1][i],w);if(index===2)target.y+=.09*Math.sin(Math.PI*u);if(index===5&&l.side===1){target.x=T.MathUtils.lerp(-.31,.33,ease((u-.45)/.55));target.y=T.MathUtils.lerp(1.24,2.14,ease(u/.55))-.14*ease((u-.80)/.20);target.z+=.18*Math.sin(Math.PI*u);}if(index===7&&l.side===-1){target.x=T.MathUtils.lerp(-.17,.33,ease((u-.40)/.60));target.y=T.MathUtils.lerp(1.83,2.13,ease(u/.40))-.13*ease((u-.80)/.20);target.z-=.10*Math.sin(Math.PI*u);}
   const restPole=rest.get(l.b).clone().sub(rest.get(l.a)),basePole=V(.12,.05,l.side*.7),foldPole=V(-.5,1,l.side*.6),pole=index===0||index===9?restPole:index===1?restPole.lerp(basePole,w):index===5?basePole.lerp(foldPole,w):index===8?foldPole.lerp(restPole,w):index>=6?foldPole:basePole;
   const error=solve(l,target,Q(),pole),planted=index<=1||(l.side===1&&index>=6)||index>=8;
   contacts.push({id:l.id,kind:planted?(target.y>1?'upper-ground':'floor'):'free',point:target.toArray(),planted,error});
  }
  if(index>=1&&index<=8){for(const {l,asset}of grips){
   const freeQ=l.c.getWorldQuaternion(Q()),q=Q(),free=l.c.localToWorld(l.offset.clone()),hold=edge(l.side);let target,blend=handBlend,planted=false,release=0;
   if(index===1){q.copy(freeQ);target=free.clone();target.x-=.07*w;target.y+=.06*w;}
   else if(index===2){q.setFromAxisAngle(V(0,0,1),keys[2].lean).slerp(Q(),w);const crouch=freeHands[2][l.side].clone().add(V(-.07,.06,0));target=crouch.lerp(hold,w);target.x-=.18*Math.sin(Math.PI*u);target.y+=.14*Math.sin(Math.PI*u);}
   else if(index<=5){target=hold;planted=true;}
   else if(index===6){release=ease((u-(l.side===-1?0:.05))/.38);q.slerp(freeQ,release);target=hold.clone().lerp(free,release);target.y+=.20*Math.sin(Math.PI*release);target.x-=.10*Math.sin(Math.PI*release);planted=release===0;}
   else {q.copy(freeQ);target=free;}
   const freePole=l.b.getWorldPosition(V()).sub(l.a.getWorldPosition(V())),pole=index===1?freePole.lerp(V(-.4,.1,l.side*.8),w):index===6?V(-.4,.1,l.side*.8).lerp(freePole,release):V(-.4,.1,l.side*.8);
   const error=index>=7?0:solve(l,target,q,pole);asset.update(target.clone().sub(root.position),q,blend);
   contacts.push({id:l.id,kind:planted?'edge':'free',point:target.toArray(),planted,error});
  }}else for(const {l,asset}of grips)asset.update(l.c.localToWorld(l.offset.clone()).sub(root.position),l.c.getWorldQuaternion(Q()),handBlend);
  root.updateMatrixWorld(true);worker.skeleton.update();stow.sync();
  return {phase:phase.label,index,time:t,duration,root:root.position.toArray(),contacts,equipment:(index===0||index===9)?'transition':'slung',airborne:index===2};
 }
 const api={duration,phases:CLIFF_CLIMB_PHASES,grips:grips.map(g=>g.asset),apply(progress,{origin=[0,0,0],heading=0}={}){
  if(disposed)throw Error('Cliff climb is disposed');if(!Number.isFinite(progress)||!Array.isArray(origin)||origin.length!==3||!origin.every(Number.isFinite)||!Number.isFinite(heading))throw Error('Invalid cliff climb playback');if(worker.weapon!==stowWeapon)throw Error('Equipment changed during cliff climb');checkFrame();root.rotation.set(0,0,0);result=poseAt(T.MathUtils.clamp(progress,0,1)*duration);const q=Q().setFromAxisAngle(V(0,1,0),-heading*Math.PI/180);root.quaternion.copy(q);root.position.applyQuaternion(q).add(V(...origin));root.updateMatrixWorld(true);worker.skeleton.update();result.worldRoot=root.position.toArray();result.contacts.forEach(c=>{if(c.point)c.worldPoint=V(...c.point).applyQuaternion(q).add(V(...origin)).toArray();});return result;
 },restore(){if(disposed)return;for(const {asset}of grips)asset.restore();stow.restore();root.position.set(0,0,0);restoreEntry();result=null;},diagnostics:()=>result,dispose(){if(disposed)return;this.restore();for(const {asset}of grips){asset.restore();asset.dispose();}stow.dispose();restoreEntry();disposed=true;}};
 api.restore();return api;
 }catch(error){for(const asset of createdGrips){asset.restore();asset.dispose();}equipment?.dispose();restoreEntry();throw error;}
}
