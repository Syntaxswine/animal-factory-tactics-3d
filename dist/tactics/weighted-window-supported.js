// Supported crawl candidate. Fixed 81 kg capsule mannequin; no force solver.
// Contacts are measured from geometry. The viewer's inverse-dynamics audit
// determines whether those contacts can supply the authored acceleration.
import {rollShape,massProperties,supportContains} from './weighted-roll.js';
import {WINDOW_OPENING} from './weighted-window.js';
export {WINDOW_OPENING};
const R=Math.PI/180,clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,u)=>a+(b-a)*u;
const ease=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,k)=>a.map(v=>v*k);
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),len=a=>Math.hypot(...a),unit=a=>mul(a,1/len(a));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const lerp=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));
const polar=(p,l,a)=>add(p,[l*Math.cos(a*R),l*Math.sin(a*R),0]);
const shape=rollShape(1),segments=shape.segments.map(s=>({...s}));
export const SUPPORTED_IMPACT=1.2,SUPPORTED_DURATION=13.3;
const publicClock=t=>t<=5?t:t<=5.6?5+(t-5)*1.6/.6:t+1;
export const SUPPORTED_PHASES=Object.freeze([
 ['Break glass',0,1.2],['Brace and load',1.2,2.6],['Belly onto sill',2.6,4],
 ['Supported crossing',4,5],['Reach interior floor',5,5.6],['Fold legs through',5.6,7],
 ['Bring knees inside',7,8.5],['Controlled compression',8.5,10],['Rise into kneel',10,11.8],['Hold kneel',11.8,12.3]
].map(([label,start,end])=>Object.freeze({label,start:publicClock(start),end:publicClock(end)})));
const OUTER=[-.09,.875,0],INNER=[.09,.875,0],PALM_Y=.91,FLOOR_HAND=.65;
function tangentHip(angle,along,corner=OUTER){return add(corner,add([-.125*Math.sin(angle*R),.125*Math.cos(angle*R),0],[-along*Math.cos(angle*R),-along*Math.sin(angle*R),0]));}
const mountHip=tangentHip(25,.25),tipHip=tangentHip(-55,0,INNER);
function body(hip,lower,chest,head){
 const points={hip:[...hip]};points.lumbar=polar(hip,.25,lower);points.shoulders=polar(points.lumbar,.22,chest);
 points.neck=polar(points.shoulders,.14,head);points.head=polar(points.neck,.14,head);
 for(const side of [-1,1]){points['hip'+side]=add(hip,[0,0,side*.12]);points['shoulder'+side]=add(points.shoulders,[0,0,side*.2]);}
 return {points,segments:segments.map(s=>({...s})),reachErrors:[]};
}
function limb(state,side,kind,target,pole){
 const p=state.points,arm=kind==='arm',a=p[(arm?'shoulder':'hip')+side],upper=arm?.25:.44,lower=arm?.25:.40;
 const delta=sub(target,a),requestedDistance=len(delta),axis=unit(delta),d=Math.max(Math.abs(upper-lower)+1e-9,Math.min(upper+lower-1e-9,requestedDistance)),along=(upper*upper-lower*lower+d*d)/(2*d);
 if(requestedDistance>upper+lower+1e-8||requestedDistance<Math.abs(upper-lower)-1e-8)state.reachErrors.push({side,kind,distance:requestedDistance,maximum:upper+lower,targetMiss:Math.abs(requestedDistance-d),requestedTarget:[...target]});
 const bend=unit(sub(pole,mul(axis,dot(pole,axis)))),h=Math.sqrt(Math.max(0,upper*upper-along*along));
 p[(arm?'elbow':'knee')+side]=add(a,add(mul(axis,along),mul(bend,h)));p[(arm?'wrist':'ankle')+side]=add(a,mul(axis,d));
}
function legAngles(state,side,thigh,shin,foot){const p=state.points;p['knee'+side]=polar(p['hip'+side],.44,thigh);p['ankle'+side]=polar(p['knee'+side],.4,shin);p['toe'+side]=polar(p['ankle'+side],.12,foot);}
function plantedLeg(state,side,turn){
 const toe=[-.68,.06,side*.12],ankle=polar(toe,.12,mix(180,90,turn));
 limb(state,side,'leg',ankle,[1,0,0]);state.points['toe'+side]=add(toe,sub(state.points['ankle'+side],ankle));
}
function hand(state,side,palm,wrist){limb(state,side,'arm',wrist,[-.75,.10,side*.60]);state.points['palm'+side]=add(palm,sub(state.points['wrist'+side],wrist));}
function sillHand(state,side,x,u=1){const palm=[x,PALM_Y,side*.30],a=mix(180,0,u);hand(state,side,palm,polar(palm,.08,a));}
function floorHand(state,side){hand(state,side,[FLOOR_HAND,.035,side*.30],[FLOOR_HAND,.115,side*.30]);}
function freeHand(state,side,u){
 const shoulder=state.points['shoulder'+side],target=add(shoulder,[.06,-.42,side*.02]);target[1]=Math.max(.115,target[1]);const wrist=lerp([FLOOR_HAND,.115,side*.30],target,u);
 hand(state,side,polar(wrist,.08,mix(-90,0,u)),wrist);
}
function preparation(t){
 const u=ease((t-1.2)/1.4),hip=lerp([-.8,.78,0],mountHip,u),s=body(hip,mix(45,25,u),mix(45,25,u),mix(45,0,u));
 for(const side of [-1,1])plantedLeg(s,side,u);
 sillHand(s,-1,-.09,0);
 if(t<=1.2){const k=ease(t/1.2),palm=lerp([-.40,.98,.30],[-.035,1.20,.30],k);hand(s,1,palm,add(palm,[-.08,0,0]));}
 else{const palm=lerp([-.035,1.20,.30],[-.09,PALM_Y,.30],u);hand(s,1,palm,add(palm,[-.08,0,0]));}
 return s;
}
const mounted=preparation(2.6),mountLeg={};
for(const side of [-1,1]){const p=mounted.points,angle=(a,b)=>Math.atan2(p[b][1]-p[a][1],p[b][0]-p[a][0])/R;mountLeg[side]=[angle('hip'+side,'knee'+side),angle('knee'+side,'ankle'+side),-90];}
function raw(t){
 if(t<=2.6)return preparation(t);
 let s;
 if(t<=4){const u=ease((t-2.6)/1.4),a=25*(1-u);s=body(tangentHip(a,.25*(1-u)),a,a,0);
  for(const side of [-1,1]){const old=mountLeg[side];legAngles(s,side,mix(old[0],-180,u),mix(old[1],-180,u),mix(-90,-180,u));sillHand(s,side,mix(-.09,.09,u),u);}return s;
 }
 if(t<=5){const u=ease(t-4);s=body([mix(-.09,0,u),1,0],0,0,0);for(const side of [-1,1]){legAngles(s,side,180,180,180);sillHand(s,side,.09);}return s;}
 if(t<=5.6){const u=clamp((t-5)/.6),theta=55*ease((u-.25)/.45),hip=u<=.25?[.09*ease(u/.25),1,0]:tangentHip(-theta,0,INNER),chest=-70*ease(u/.45);
  s=body(hip,-theta,chest,chest);
  for(const side of [-1,1]){const leg=180-3*ease((theta-52)/3);legAngles(s,side,leg,leg,leg);const k=clamp((u-(side<0?.05:.75))/(side<0?.70:.25));
   let palm=[mix(.09,FLOOR_HAND,ease(k/.65)),mix(PALM_Y,.035,ease((k-.25)/.75)),side*.30],wrist=polar(palm,.08,90*ease(k));
   // Reach toward the floor within the arm's sphere; actual floor support
   // begins only when this reachable palm arrives at the surface.
   const shoulder=s.points['shoulder'+side],delta=sub(wrist,shoulder);
   if(len(delta)>.494){const excess=len(delta)-.494,reach=.494+excess/Math.sqrt(1+(excess/.004)**2),bounded=add(shoulder,mul(unit(delta),reach));palm=add(palm,sub(bounded,wrist));wrist=bounded;}
   hand(s,side,palm,wrist);
  }return s;
 }
 if(t<=7){const u=ease((t-5.6)/1.4),hip=[mix(tipHip[0],.65,u),mix(tipHip[1],1,ease((u-.80)/.20)),0];s=body(hip,mix(-55,-80,u),-70,-70);
  for(const side of [-1,1]){legAngles(s,side,mix(177,180,u),mix(177,90,u),mix(177,0,u));floorHand(s,side);}return s;
 }
 if(t<=8.5){const u=ease((t-7)/1.5);s=body([.65+.10*Math.sin(Math.PI*u)**2,1,0],-80,-70,-70);for(const side of [-1,1]){legAngles(s,side,mix(180,270,u),mix(90,180,u),90*ease(u/.30));floorHand(s,side);}return s;}
 if(t<=10){const u=ease((t-8.5)/1.5);s=body([mix(.65,.40,u),mix(1,.48,u),0],mix(-80,-20,u),mix(-70,-10,u),mix(-70,-10,u));
  const finalThigh=Math.asin(-.405/.44)/R+360,finalShin=180+Math.asin(.015/.4)/R;
  for(const side of [-1,1]){legAngles(s,side,mix(270,finalThigh,u),mix(180,finalShin,u),mix(90,0,ease(u/.35)));floorHand(s,side);}return s;
 }
 const u=ease((t-10)/1.8),kneeX=.4+Math.sqrt(.44**2-.405**2),hipX=.4-.1*Math.sin(Math.PI*u),hipY=.075+Math.sqrt(.44**2-(kneeX-hipX)**2);
 s=body([hipX,hipY,0],mix(-20,75,u),mix(-10,75,u),mix(-10,90,u));
 // Move the pelvis back over the planted knees before the palms unload.
 for(const side of [-1,1]){legAngles(s,side,Math.atan2(.075-hipY,kneeX-hipX)/R,180+Math.asin(.015/.4)/R,0);freeHand(s,side,ease((u-.32)/.28));}return s;
}
// Closest point on a capsule axis to the finite horizontal sill surface.
function sillClosest(a,b){
 const d=sub(b,a),f=u=>{const p=add(a,mul(d,u)),q=[Math.max(-.09,Math.min(.09,p[0])),.875,Math.max(-.475,Math.min(.475,p[2]))];return {p,q,distance:len(sub(p,q)),u};};
 let lo=0,hi=1;for(let i=0;i<48;i++){const x=lo+(hi-lo)/3,y=hi-(hi-lo)/3;if(f(x).distance<f(y).distance)hi=y;else lo=x;}
 return [f(0),f(1),f((lo+hi)/2)].sort((a,b)=>a.distance-b.distance)[0];
}
export function sampleSupportedWindow(time){
 if(!Number.isFinite(time))throw Error('Window time must be finite');const publicTime=Math.max(0,Math.min(SUPPORTED_DURATION,time));time=publicTime<=5?publicTime:publicTime<=6.6?5+(publicTime-5)*.6/1.6:publicTime-1;
 const state=raw(time);
 // A modest outward fold leaves room between the thighs and chest; keep its
 // hinge axes explicit rather than hiding lateral bend in a projected angle.
 const spread=20*R*ease((time-7)/1.5)*(1-ease((time-8.8)/.7));state.kneeAxes={};
 for(const side of [-1,1]){const a=-side*spread,c=Math.cos(a),sn=Math.sin(a),hip=state.points['hip'+side];state.kneeAxes[side]=[0,-sn,c];
  for(const name of ['knee','ankle','toe']){const p=state.points[name+side],y=p[1]-hip[1],z=p[2]-hip[2];p[1]=hip[1]+y*c-z*sn;p[2]=hip[2]+y*sn+z*c;}
 }
 const armForward=ease((time-7)/1.5)*(1-ease((time-10)/1.1));
 if(armForward>0)for(const side of [-1,1]){const wrist=state.points['wrist'+side];limb(state,side,'arm',wrist,[mix(-.75,1,armForward),.1,side*.6]);}
 const mass=massProperties(state.points,state.segments),contacts=[];
 for(const segment of state.segments){
  const a=state.points[segment.a],b=state.points[segment.b];
  for(const id of [segment.a,segment.b])if(Math.abs(state.points[id][1]-segment.radius)<.001)contacts.push({surface:'ground',segment:segment.name,id,point:[state.points[id][0],0,state.points[id][2]]});
  const c=sillClosest(a,b);
  if(Math.abs(c.distance-segment.radius)<.001&&c.p[1]>=.875)contacts.push({surface:'sill',segment:segment.name,id:c.u<1e-7?segment.a:c.u>1-1e-7?segment.b:null,point:c.q,axisPoint:c.p,axisT:c.u,sliding:time>2.6&&time<7});
 }
 return {...state,...mass,contacts,time:publicTime,velocity:null,mode:time>=11.8?'static kneel':time<2.6?'ground preparation':'supported crawl candidate',phase:SUPPORTED_PHASES.find(p=>publicTime<=p.end).label,balanced:supportContains(mass.center,contacts),glassTime:publicTime<SUPPORTED_IMPACT?-1:publicTime-SUPPORTED_IMPACT};
}

// A separate timing trial: preserve the exact poses, dimensions and contacts.
// The audit samples this faster clock, so acceleration/force warnings change.
export const SNEAK_DURATION=8;
const sneakRate=SUPPORTED_DURATION/SNEAK_DURATION;
export const SNEAK_IMPACT=SUPPORTED_IMPACT/sneakRate;
export const SNEAK_PHASES=Object.freeze(SUPPORTED_PHASES.map(p=>Object.freeze({
 ...p,start:p.start/sneakRate,end:p.end/sneakRate,
})));
export function sampleSneakWindow(time){
 if(!Number.isFinite(time))throw Error('Window time must be finite');
 time=Math.max(0,Math.min(SNEAK_DURATION,time));
 const state=sampleSupportedWindow(time*sneakRate);
 return {...state,time,timing:'sneak',sourceTime:state.time,
  glassTime:time<SNEAK_IMPACT?-1:time-SNEAK_IMPACT};
}
