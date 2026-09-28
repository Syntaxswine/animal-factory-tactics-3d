import * as T from './vendor/three.module.js';
import {createLadderGrip} from './ladder-grip.js';
import {createEquipmentStow} from './equipment-stow.js';
const V=(...a)=>new T.Vector3(...a),Q=()=>new T.Quaternion(),ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const hermite=(a,b,va,vb,t,dt)=>(2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*va*dt+(-2*t**3+3*t*t)*b+(t**3-t*t)*vb*dt;
export const WINDOW_VAULT_PHASES=[['Stow',.65],['Crouch',.4],['Break glass',.22],['Brace sill',.25],['Push and tuck',.3],['Through opening',.35],['Release and drop',.4],['Absorb landing',.22],['Stand',.4],['Ready',.65]].map(([label,seconds],i,a)=>({label,start:a.slice(0,i).reduce((s,p)=>s+p[1],0),end:a.slice(0,i+1).reduce((s,p)=>s+p[1],0)}));
export const WINDOW_VAULT_IMPACT=1.2;
// Horse proof. Travel +X, wall centered X=0, sill Y=.85, aperture Z=±.475.
export function createWindowVault(worker){
 const root=worker.root,n=Object.fromEntries(worker.bones.map(b=>[b.name,b])),bones=worker.bones;
 const saved=[];root.traverse(o=>saved.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible}));
 root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');root.updateMatrixWorld(true);
 const rest=new Map(bones.map(b=>[b,b.getWorldPosition(V())])),hipY=rest.get(n.hips).y,limbs=[];
 for(const s of [-1,1]){limbs.push({id:'hand'+s,s,a:n['upperArm'+s],b:n['forearm'+s],c:n['hand'+s],offset:V(.052,-.010,0)});limbs.push({id:'foot'+s,s,a:n['thigh'+s],b:n['shin'+s],c:n['hoof'+s],offset:V(0,-.12,0)});}
 const capture=()=>bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));
 const neutral=capture();worker.pose('carry');const carry=capture(),carryGun={p:worker.weapon.root.position.clone(),q:worker.weapon.root.quaternion.clone()};
 const stow=createEquipmentStow(worker,{id:'horse'},{slingWaist:.05,riflePlacement:{back:-.22,side:-.16,axis:[0,1,0]}});
 const grip=createLadderGrip(worker,-1,rest.get(n['hand-1']).y);
 const phases=WINDOW_VAULT_PHASES,duration=phases.at(-1).end;
 // Each key sets the pelvis and feet independently, so contact survives the tuck.
 const keys=[
  {hip:[-.50,.8,0],feet:[[-.535,0,-.232],[-.535,0,.232]]},
  {hip:[-.50,.8,0],feet:[[-.535,0,-.232],[-.535,0,.232]]},
  {hip:[-.40,.62,0],bend:-.32,feet:[[-.535,0,-.232],[-.535,0,.232]]},
  {hip:[-.40,.62,0],bend:-.32,feet:[[-.535,0,-.232],[-.535,0,.232]]},
  {hip:[-.40,.62,0],bend:-.32,feet:[[-.535,0,-.232],[-.535,0,.232]]},
  {hip:[-.30,1.14,0],bend:-1.5,feet:[[-.58,1.02,-.18],[-.58,1.02,.18]]},
  {hip:[.64,1.09,0],bend:-1.5,feet:[[.34,.97,-.18],[.34,.97,.18]]},
  {hip:[1.17,.67,0],bend:-.25,feet:[[1.135,0,-.232],[1.135,0,.232]]},
  {hip:[1.17,.55,0],bend:-.42,feet:[[1.135,0,-.232],[1.135,0,.232]]},
  {hip:[1.17,.8,0],feet:[[1.135,0,-.232],[1.135,0,.232]]},
  {hip:[1.17,.8,0],feet:[[1.135,0,-.232],[1.135,0,.232]]}
 ];
 let disposed=false,result;
 function worldRotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));root.updateMatrixWorld(true);}
 function solve(l,point,q,pole){
  const target=point.clone().sub(l.offset.clone().applyQuaternion(q)),start=l.a.getWorldPosition(V()),a=rest.get(l.a),b=rest.get(l.b),c=rest.get(l.c),l1=a.distanceTo(b),l2=b.distanceTo(c),axis=target.clone().sub(start),d=T.MathUtils.clamp(axis.length(),Math.abs(l1-l2)+1e-6,l1+l2-1e-6);axis.normalize();pole=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),mid=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along))),end=start.clone().addScaledVector(axis,d);
  for(const [bone,child,to]of [[l.a,l.b,mid],[l.b,l.c,end]]){const origin=bone.getWorldPosition(V()),from=child.getWorldPosition(V()).sub(origin).normalize();worldRotate(bone,Q().setFromUnitVectors(from,to.clone().sub(origin).normalize()).multiply(bone.getWorldQuaternion(Q())));}worldRotate(l.c,q);return l.c.localToWorld(l.offset.clone()).distanceTo(point);
 }
 function apply(time){if(disposed)throw Error('Window vault disposed');if(!Number.isFinite(time))throw Error('Invalid vault time');time=T.MathUtils.clamp(time,0,duration);
  const i=phases.findIndex(p=>time<=p.end),phase=phases[i],u=(time-phase.start)/(phase.end-phase.start),w=ease(u),a=keys[i],b=keys[i+1],hip=V(...a.hip).lerp(V(...b.hip),w),bend=T.MathUtils.lerp(a.bend||0,b.bend||0,w);
  if(i===5||i===6){const dt=phase.end-phase.start;hip.x=hermite(a.hip[0],b.hip[0],i===5?0:2.2,i===5?2.2:0,u,dt);hip.y=hermite(a.hip[1],b.hip[1],i===5?0:-.36,i===5?-.36:-.7,u,dt);}
  grip.restore();stow.restore();worker.pose('neutral');root.rotation.set(0,0,0);root.position.set(hip.x,hip.y-hipY,hip.z);n.hips.rotation.z=bend;n.head.rotation.z=-bend*.12;
  const transition=i===0||i===9,stowAmount=i===0?w:i===9?1-w:1;
  if(transition)bones.forEach((bone,j)=>{bone.position.copy(neutral[j].p).lerp(carry[j].p,1-stowAmount);bone.quaternion.copy(neutral[j].q).slerp(carry[j].q,1-stowAmount);});
  root.updateMatrixWorld(true);stow.apply();const gun=worker.weapon.root;gun.position.add(V(0,-.22,0).applyQuaternion(n.spine.getWorldQuaternion(Q())));
  if(transition){const parked=gun.position.clone(),q=gun.quaternion.clone();gun.position.copy(carryGun.p).lerp(parked,stowAmount);gun.position.y+=.20*Math.sin(Math.PI*stowAmount);gun.position.z-=.35*Math.sin(Math.PI*stowAmount);gun.quaternion.copy(carryGun.q).slerp(q,stowAmount);stow.blend(stowAmount);}
  const contacts=[];
  for(const l of limbs.filter(l=>l.id.startsWith('foot'))){const k=l.s===-1?0:1,target=V(...a.feet[k]).lerp(V(...b.feet[k]),w),tuck=i===4?w:i===5?1:i===6?1-w:0,footQ=Q().setFromAxisAngle(V(0,0,1),-.55*tuck),pole=V(.8,0,0).lerp(V(0,.8,0),tuck);if(i===5||i===6){const dt=phase.end-phase.start;target.x=hermite(a.feet[k][0],b.feet[k][0],i===5?0:2.2,i===5?2.2:0,u,dt);target.y=hermite(a.feet[k][1],b.feet[k][1],i===5?0:-.36,i===5?-.36:-3,u,dt);}const error=solve(l,target,footQ,pole);contacts.push({id:l.id,point:target.toArray(),error,planted:i<=3||i>=7});}
  for(const l of limbs.filter(l=>l.id.startsWith('hand'))){let target=l.c.localToWorld(l.offset.clone()),q=l.c.getWorldQuaternion(Q()),planted=false;
   const brace=V(.015,.937,-.27),smash=V(-.01,1.18,.16);
   if(l.s===1&&i===2)target.lerp(smash,ease(u/.7));
   if(l.s===1&&i===3){target.copy(smash).lerp(V(-.3,1.08,.26),w);q.slerp(Q(),w);}
   if(l.s===-1&&i===3){const lift=ease(u/.45),over=ease((u-.4)/.6);target.y=T.MathUtils.lerp(target.y,1.04,lift);target.lerp(brace,over);q.slerp(Q(),w);}
   if(l.s===-1&&(i===4||i===5&&u<.15)){target.copy(brace);q.identity();planted=true;}
   if(i===4&&l.s===1||i===5||i===6){const tuck=V(hip.x+.25,hip.y+.07,l.s*.25);if(!planted){target=i===4?V(-.3,1.08,.26).lerp(tuck,w):tuck;q=Q();if(l.s===-1&&i===5){const release=ease((u-.15)/.3);target=brace.clone().lerp(tuck,release);q.identity();}if(i===6){target.lerp(l.c.localToWorld(l.offset.clone()),w);q.slerp(l.c.getWorldQuaternion(Q()),w);}}}
   if(transition){const grasp=1-ease(stowAmount/.7),anchor=worker.weapon.anchors[l.s===1?'grip':'support'].getWorldPosition(V());target.lerp(anchor,grasp);}
   const gripAmount=l.s===-1?(i===3?w:i===4?1:i===5?1-ease((u-.15)/.3):0):0;
   const offset=l.offset.clone().lerp(V(.10,-.024,0),gripAmount);
   const error=solve({...l,offset},target,q,l.s===-1?V(-.2,1,.4):V(-.3,.65,.04));if(l.s===-1)grip.update(target.clone().sub(root.position),q,gripAmount);contacts.push({id:l.id,point:target.toArray(),error,planted});
  }
  root.updateMatrixWorld(true);worker.skeleton.update();stow.sync();result={time,phase:phase.label,index:i,contacts,glassTime:time<WINDOW_VAULT_IMPACT?-1:time-WINDOW_VAULT_IMPACT,equipment:transition?'transition':'slung'};return result;
 }
 function restore(){grip.restore();stow.restore();for(const {o,p,q,s,visible}of saved){o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);o.visible=visible;}root.updateMatrixWorld(true);worker.skeleton.update();}
 restore();
 return {duration,phases,apply,diagnostics:()=>result,restore,dispose(){if(disposed)return;grip.dispose();stow.dispose();restore();disposed=true;}};
}
