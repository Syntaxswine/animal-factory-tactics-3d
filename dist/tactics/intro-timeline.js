import * as T from './vendor/three.module.js';
import {landingSupportHeight} from './intro-ground-contact.js';
export const INTRO_DURATION=35;
export const INTRO_SHOTS=Object.freeze([
 [0,4,'Approach'],[4,9,'Overseas handler'],[9,12,'Closing in'],[12,14,'Radar contact'],[14,17,'SAM wakes'],[17,20.5,'Missile volley'],[20.5,21.5,'Hit & drop'],[21.5,24.5,'Down the cliffs'],[24.5,26,'Last-second flare'],[26,28,'Crash in the clearing'],[28,30,'Rotor strike'],[30,35,'At the cliff base']
]);
export const INTRO_EVENTS=Object.freeze({launches:[17.4,17.95],hit:20.5,contact:26,rotorStrike:28.25,settled:30,door:30.6});
export const SAM_POSITION=[10,18,-16];
export const smooth=(a,b,t)=>T.MathUtils.smoothstep(t,a,b);
const V=(a)=>new T.Vector3(...a),mix=T.MathUtils.lerp;
export function boundedTime(time){if(!Number.isFinite(time))throw Error('Non-finite intro time');return T.MathUtils.clamp(time,0,INTRO_DURATION);}
export function shotAt(time){const t=boundedTime(time);let index=INTRO_SHOTS.findIndex(s=>t>=s[0]&&t<s[1]);if(index<0)index=11;const shot=INTRO_SHOTS[index];return {index,start:shot[0],end:shot[1],name:shot[2],time:t};}
// Authored cinematic motion in native tile units; no combat/flight simulator.
// Hermite segments preserve velocity across the major descent keyframes.
const keys=[
 [0,[-30,23,3],[1.25,0,0]],[12,[-15,23,3],[1.3,0,0]],
 [20.5,[-4,22.6,3],[1.5,-.8,.1]],[22,[-1.5,19.6,3.2],[2,-4,.1]],
 [24.5,[4,3.6,3.5],[2.2,-5,0]],[26,[7,0,3.5],[2,-.9,0]],
 [27,[8.4,0,3.5],[.8,0,0]],[29,[9,0,3.5],[0,0,0]],[35,[9,0,3.5],[0,0,0]]
];
function sampleTrack(t){let i=keys.findIndex((k,j)=>j<keys.length-1&&t>=k[0]&&t<keys[j+1][0]);if(i<0)return V(keys.at(-1)[1]);const a=keys[i],b=keys[i+1],dt=b[0]-a[0],u=(t-a[0])/dt,u2=u*u,u3=u2*u;return V(a[1]).multiplyScalar(2*u3-3*u2+1).addScaledVector(V(a[2]),(u3-2*u2+u)*dt).addScaledVector(V(b[1]),-2*u3+3*u2).addScaledVector(V(b[2]),(u3-u2)*dt);}
export function aircraftState(time){
 const t=boundedTime(time),position=sampleTrack(t),fall=smooth(20.5,22.8,t),flare=smooth(24.0,25.65,t),contact=smooth(26,27,t);
 const pitch=mix(-.27*fall,.14,flare)*(1-contact),yaw=.07*Math.sin((t-20.5)*2)*fall*(1-contact),roll=.13*Math.sin((t-20.5)*3)*fall*(1-contact);
 // Approach the support surface continuously, then keep the actual lowest
 // rail vertices planted throughout compression and settling.
 if(t>=24.5){const support=landingSupportHeight(contact,roll,yaw,pitch);position.y=t>=26?support:position.y+support*smooth(24.5,25.9,t);}
 return {time:t,position,pitch,yaw,roll,compression:contact,damage:t>=20.5,rotorBreak:smooth(28.25,28.65,t),settled:t>=30,door:smooth(30.6,31.5,t)};
}
export function airframePose(time){const t=boundedTime(time),c=smooth(26,27,t),rock=smooth(27.85,28.25,t)*(1-smooth(28.25,28.8,t));return {position:V([0,-.18*c,0]),quaternion:new T.Quaternion().setFromEuler(new T.Euler(.11*c+.24*rock,0,-.035*c))};}
export function aircraftPoint(time,local){const s=aircraftState(time),f=airframePose(time),q=new T.Quaternion().setFromEuler(new T.Euler(s.roll,s.yaw,s.pitch));return V(local).applyQuaternion(f.quaternion).add(f.position).applyQuaternion(q).add(s.position);}
export function launcherState(time){const t=boundedTime(time),wake=smooth(14,17,t);return {pitch:mix(.08,.25,wake),yaw:mix(-.55,-.68,wake),wake,loaded:INTRO_EVENTS.launches.map(start=>t<start)};}
export function missileSocket(index){
 if(index!==0&&index!==1)throw Error('Unknown missile');
 const q=new T.Quaternion().setFromEuler(new T.Euler(-.25,-.68,0,'YXZ'));
 return V([index===0?-.71:.71,.70,0]).applyQuaternion(q).add(V(SAM_POSITION)).add(V([0,2,0]));
}
export function tailHitPoint(){const s=aircraftState(20.5),q=new T.Quaternion().setFromEuler(new T.Euler(s.roll,s.yaw,s.pitch));return V([-3.35,1.70,.15]).applyQuaternion(q).add(s.position);}
const launchQuaternion=new T.Quaternion().setFromEuler(new T.Euler(-.25,-.68,0,'YXZ')).multiply(new T.Quaternion().setFromAxisAngle(V([0,1,0]),-Math.PI/2));
const launchDirection=V([1,0,0]).applyQuaternion(launchQuaternion);
function flightCurve(index){const a=missileSocket(index),nose=index===0?tailHitPoint():V([-22,27.5,21]);const direction=nose.clone().sub(a).normalize(),d=nose.clone().addScaledVector(direction,-2.105);return new T.CubicBezierCurve3(a,a.clone().addScaledVector(launchDirection,7),d.clone().addScaledVector(direction,-8),d);}
const curves=[flightCurve(0),flightCurve(1)];
export function missileState(time,index=0){
 if(!Number.isFinite(time)||![0,1].includes(index))throw Error('Invalid missile sample');
 const birth=INTRO_EVENTS.launches[index],end=index===0?20.5:21.8,u=T.MathUtils.clamp((time-birth)/(end-birth),0,1),curve=curves[index];
 // An accelerating launch clears its cradle before taking the curved intercept.
 const progress=.25*u+.75*u*u;
 const direction=curve.v1.clone().sub(curve.v0).multiplyScalar((1-progress)**2).addScaledVector(curve.v2.clone().sub(curve.v1),2*(1-progress)*progress).addScaledVector(curve.v3.clone().sub(curve.v2),progress**2).normalize();
 const quaternion=new T.Quaternion().setFromUnitVectors(launchDirection,direction).multiply(launchQuaternion);
 return {birth,end,progress,position:curve.getPoint(progress),direction,quaternion,flying:time>=birth&&time<end,loaded:time<birth,hit:index===0&&time>=end};
}
export function missileTrail(time,index){const birth=INTRO_EVENTS.launches[index],end=index===0?20.5:21.8,life=2.2,step=.035,out=[];if(time<birth)return out;
 for(let n=Math.max(0,Math.floor((time-birth-life)/step));n<=Math.floor((Math.min(time,end-.001)-birth)/step);n++){const emitted=birth+n*step,age=time-emitted;if(age<0||age>=life)continue;const s=missileState(emitted,index),p=s.position.addScaledVector(s.direction,-1.47);p.y+=age*.24;out.push({id:n,age,position:p,opacity:.62*(1-age/life),size:.28+age*.72});}return out;
}
