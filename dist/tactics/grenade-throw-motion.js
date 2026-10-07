import * as T from './vendor/three.module.js';
const V=(a=[0,0,0])=>new T.Vector3(...a),Q=()=>new T.Quaternion(),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const blend=(t,a,b)=>smooth((t-a)/(b-a));
export const GRENADE_THROW={duration:4.6,release:1.9,plant:1.52,gravity:9.81,target:5};
export const GRENADE_KEYS=[{time:.30,label:'Prepare'},{time:1.13,label:'Load rear leg'},{time:1.58,label:'Plant & turn'},{time:1.90,label:'Release'},{time:2.10,label:'Follow through'},{time:3.8,label:'Recover'}];
const launchY=2.6,releasePalm=V([.42,1.42,.30]),releaseCenter=releasePalm.clone().sub(V([0,0,.016]));
const flight=(launchY+Math.sqrt(launchY**2+2*GRENADE_THROW.gravity*(releaseCenter.y-.06)))/GRENADE_THROW.gravity;
const launch=V([(GRENADE_THROW.target-releaseCenter.x)/flight,launchY,-releaseCenter.z/flight]);
// Cubic Hermite trajectories have deliberate, continuous release velocity.
// A fresh bind pose is evaluated on every seek: no accumulated integration.
function curve(keys,t){let i=1;while(i<keys.length-1&&t>keys[i].t)i++;const a=keys[i-1],b=keys[i],dt=b.t-a.t,u=clamp((t-a.t)/dt),u2=u*u,u3=u2*u;
 return V(a.p).multiplyScalar(2*u3-3*u2+1).addScaledVector(V(b.p),-2*u3+3*u2).addScaledVector(V(a.v),dt*(u3-2*u2+u)).addScaledVector(V(b.v),dt*(u3-u2));}
const key=(t,p,v=[0,0,0])=>({t,p,v});
const rightKeys=[key(0,[.24,1.09,.12]),key(.55,[.24,1.11,.12]),key(1.13,[-.23,1.31,.38]),key(1.57,[-.18,1.26,.40]),key(1.72,[-.10,1.28,.39],[1.2,.15,-.1]),key(1.9,releasePalm.toArray(),launch.toArray()),key(1.955,[.49,1.32,.28],[0,-3,-.7]),key(2.10,[.43,1.04,.04],[-1.1,-1.4,-.65]),key(2.38,[.23,.87,-.05]),key(3.10,[.21,1.02,.22]),key(4.6,[.21,1.02,.22])];
const bodySway=t=>-.18*blend(t,.28,.56)+.36*blend(t,.90,1.14)-.18*blend(t,1.52,1.85);
export const grenadePalmAt=t=>curve(rightKeys,clamp(t,0,GRENADE_THROW.duration)).add(V([0,0,bodySway(t)]));
const leftKeys=[key(0,[.24,1.10,.02]),key(.55,[.24,1.11,.02]),key(1.13,[.23,1.25,-.34]),key(1.57,[.33,1.21,-.31]),key(1.9,[.20,.98,-.32]),key(2.25,[.08,.92,-.28]),key(3.10,[.22,1.01,-.22]),key(4.6,[.22,1.01,-.22])];
const wristKeys=[key(0,[.7,0,0]),key(.55,[.7,0,0]),key(1.13,[-1,0,0]),key(1.57,[-1,0,0]),key(1.9,[1.5,0,0],[5,0,0]),key(1.98,[1.7,0,0]),key(2.45,[.5,0,0]),key(4.6,[.5,0,0])];
const handAngle=t=>curve(wristKeys,t).x;
const handRotation=t=>Q().setFromAxisAngle(V([0,0,1]),handAngle(t));
const releaseSpin=(handAngle(GRENADE_THROW.release)-handAngle(GRENADE_THROW.release-1e-5))/1e-5;
const ballRotation=age=>handRotation(GRENADE_THROW.release).multiply(Q().setFromAxisAngle(V([0,0,1]),age*releaseSpin));

export function createGrenadeThrow(worker,grenade){
 if(grenade.id!=='grenade')throw Error('Grenade throw needs the grenade prop');
 const root=worker.root,bones=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
 worker.equipWeapon(grenade);root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');
 const rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())])),palm=V([.052,-.010,0]),savedFeet=[];
 for(const side of [-1,1]){const foot=worker.parts.find(p=>/hoof/.test(p.name)&&p.name.endsWith(' '+side)),a=foot.geometry.attributes;
  savedFeet.push({foot,index:a.skinIndex.clone(),weight:a.skinWeight.clone()});
  for(let i=0;i<a.position.count;i++){const u=blend(a.position.getY(i),.10,.20);a.skinIndex.setXYZW(i,worker.bones.indexOf(bones['hoof'+side]),worker.bones.indexOf(bones['shin'+side]),0,0);a.skinWeight.setXYZW(i,1-u,u,0,0);}a.skinIndex.needsUpdate=a.skinWeight.needsUpdate=true;
 }
 const vertices=[];grenade.root.position.set(0,0,0);grenade.root.quaternion.identity();grenade.root.updateMatrixWorld(true);
 for(const m of grenade.parts){m.updateMatrix();const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)vertices.push(V().fromBufferAttribute(a,i).applyMatrix4(m.matrix));}
 const bottom=q=>Math.min(...vertices.map(p=>p.clone().applyQuaternion(q).y));
 const G=GRENADE_THROW.gravity;
 function ballistic(p,v,age){return p.clone().addScaledVector(v,age).add(V([0,-.5*G*age*age,0]));}
 function groundTime(p,v,rotation){let lo=.02,hi=2;for(let i=0;i<36;i++){const t=(lo+hi)/2;if(ballistic(p,v,t).y+bottom(rotation(t))>0)lo=t;else hi=t;}return (lo+hi)/2;}
 const first=groundTime(releaseCenter,launch,ballRotation),hit=ballistic(releaseCenter,launch,first),hitQ=ballRotation(first),rebound=V([launch.x*.17,-(launch.y-G*first)*.19,launch.z*.17]);
 const reboundQ=t=>hitQ.clone().multiply(Q().setFromAxisAngle(V([0,0,1]),t*releaseSpin*.35));
 const second=groundTime(hit,rebound,reboundQ),settled=ballistic(hit,rebound,second),settledQ=reboundQ(second);
 let time=0,state,disposed=false;
 function rotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));root.updateMatrixWorld(true);}
 function solve(a,b,c,target,pole){const ra=rest.get(a),rb=rest.get(b),rc=rest.get(c),start=a.getWorldPosition(V()),l1=ra.distanceTo(rb),l2=rb.distanceTo(rc),axis=target.clone().sub(start),d=axis.length();
  if(d>l1+l2+1e-6||d<Math.abs(l1-l2)+1e-7)throw Error('Throw pose unreachable: '+a.name+' at '+time.toFixed(3)+' ('+d.toFixed(4)+' / '+(l1+l2).toFixed(4)+')');
  axis.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize(),mid=start.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
  rotate(a,Q().setFromUnitVectors(rb.clone().sub(ra).normalize(),mid.clone().sub(start).normalize()));rotate(b,Q().setFromUnitVectors(rc.clone().sub(rb).normalize(),target.clone().sub(mid).normalize()));
 }
 function hand(side,target,q){solve(bones['upperArm'+side],bones['forearm'+side],bones['hand'+side],target.clone().sub(palm.clone().applyQuaternion(q)),V([-.18,side===1?(-.22+.95*blend(time,.6,1.05)*(1-blend(time,1.93,2.15))):-.22,side]));rotate(bones['hand'+side],q);bones['fingers'+side].rotation.z=side===1?-.85+.78*blend(time,1.88,1.94):-.3;}
 function projectile(t){const age=t-GRENADE_THROW.release;if(age<0)return {position:grenadePalmAt(t).sub(V([0,0,.016]).applyQuaternion(handRotation(t))),quaternion:handRotation(t),phase:'held'};
  if(age<=first)return {position:ballistic(releaseCenter,launch,age),quaternion:ballRotation(age),phase:'flight'};
  if(age<=first+second){const u=age-first;return {position:ballistic(hit,rebound,u),quaternion:reboundQ(u),phase:'bounce'};}
  const ageOnGround=clamp(age-first-second,0,.18),slide=ageOnGround-.5*ageOnGround**2/.18,p=settled.clone().addScaledVector(V([rebound.x,0,rebound.z]),slide);p.y=-bottom(settledQ);
  return {position:p,quaternion:settledQ.clone(),phase:'rest'};
 }
 function foot(side){const original=rest.get(bones['hoof'+side]),rear=side===1,u=blend(time,rear?.58:1.14,rear?.90:1.52),x=T.MathUtils.lerp(original.x,rear?-.20:.28,u),lift=.095*Math.sin(Math.PI*u);
  return V([x,original.y+lift,original.z]);}
 return {worker,grenade,bones,launch:launch.clone(),releaseCenter:releaseCenter.clone(),impacts:[GRENADE_THROW.release+first,GRENADE_THROW.release+first+second],projectile,
  at(t){if(!Number.isFinite(t))throw Error('Throw time must be finite');time=clamp(t,0,GRENADE_THROW.duration);root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');
   const load=blend(time,.58,1.15),transfer=blend(time,1.48,1.98),recover=blend(time,2.28,3.15);
   bones.hips.position.y-=.090*load+.012*transfer-.020*recover+.065*blend(time,.20,.38)*(1-blend(time,1.60,1.88));bones.hips.position.x+=-.08*load+.16*blend(time,1.30,1.72)-.02*recover;bones.hips.position.z=bodySway(time);
   bones.hips.rotation.y=-.12*load+.19*transfer-.04*recover;
   bones.spine.rotation.set(0,-.30*load+.51*transfer-.16*recover,.05*load-.22*transfer+.12*recover);
   bones.head.rotation.set(0,.25*load-.26*transfer,.03*transfer);root.updateMatrixWorld(true);
   const feet={};for(const side of [-1,1]){feet[side]=foot(side);solve(bones['thigh'+side],bones['shin'+side],bones['hoof'+side],feet[side],V([1,0,0]));rotate(bones['hoof'+side],Q());}
   hand(1,grenadePalmAt(time),handRotation(time));hand(-1,curve(leftKeys,time).add(V([0,0,bodySway(time)])),Q().setFromAxisAngle(V([0,0,1]),.5));
   const ball=projectile(time);grenade.root.visible=true;grenade.root.position.copy(ball.position);grenade.root.quaternion.copy(ball.quaternion);root.updateMatrixWorld(true);worker.skeleton.update();
   const actual=bones.hand1.localToWorld(palm.clone()),grip=grenade.anchors.grip.getWorldPosition(V()),released=time>=GRENADE_THROW.release;
   state={time,phase:time<.58?'Prepare':time<1.14?'Load rear leg':time<1.52?'Step':time<1.9?'Plant & turn':time<2.38?'Release & follow through':'Recover',released,ball:{phase:ball.phase,position:ball.position.toArray(),quaternion:ball.quaternion.toArray(),groundClearance:ball.position.y+bottom(ball.quaternion)},palm:actual.toArray(),gripError:released?null:actual.distanceTo(grip),feet:Object.fromEntries(Object.entries(feet).map(([s,p])=>[s,{target:p.toArray(),ankle:bones['hoof'+s].getWorldPosition(V()).toArray(),planted:Math.abs(p.y-rest.get(bones['hoof'+s]).y)<1e-8}])),hips:bones.hips.getWorldPosition(V()).toArray(),chest:bones.spine.getWorldPosition(V()).toArray()};return state;
  },
  diagnostics(){return state;},
  dispose(){if(disposed)return;disposed=true;worker.pose('neutral');for(const s of savedFeet){s.foot.geometry.attributes.skinIndex.copy(s.index);s.foot.geometry.attributes.skinWeight.copy(s.weight);s.foot.geometry.attributes.skinIndex.needsUpdate=s.foot.geometry.attributes.skinWeight.needsUpdate=true;}}
 };
}
