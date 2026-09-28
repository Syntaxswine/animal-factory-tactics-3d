// Earlier sill-braced entry joined to the weighted roll. Authored supports,
// ballistic COM after release; no force, friction or self-collision solver.
import {rollShape,massProperties,sampleWeightedRoll,supportContains} from './weighted-roll.js';
import {weightedPose,blendWeightedPose,centerWeightedPose,GRAVITY,WINDOW_OPENING} from './weighted-window.js';
export {WINDOW_OPENING};
const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>{t=clamp(t);return t*t*(3-2*t);},mix=(a,b,t)=>a+(b-a)*t;
const hermite=(a,b,v,t,dt,initial=0)=>mix(a,b,ease(t))+v*dt*(t*t*t-t*t)+initial*dt*(t*t*t-2*t*t+t);
export const BRACED_IMPACT=.78,BRACED_RELEASE=1.79;
const sill=[0,.91,-.2],feet=[-.64,.06],vx=3,vy=.7;
function shift(state,x,y){for(const p of Object.values(state.points)){p[0]+=x;p[1]+=y;}return state;}
function limb(state,side,kind,target,bend){const p=state.points,arm=kind==='arm',a=p[(arm?'shoulder':'hip')+side],upper=arm?.25:.44,lower=arm?.25:.40,dx=target[0]-a[0],dy=target[1]-a[1],d=Math.hypot(dx,dy),along=(upper*upper-lower*lower+d*d)/(2*d),h=Math.sqrt(Math.max(0,upper*upper-along*along));p[(arm?'elbow':'knee')+side]=[a[0]+dx/d*along+bend*-dy/d*h,a[1]+dy/d*along+bend*dx/d*h,a[2]];p[(arm?'wrist':'ankle')+side]=[...target];}
function stand(t){const q=ease(t/.42),angles={lumbar:mix(85,70,q),shoulders:mix(85,65,q),neck:80,head:70};for(const s of [-1,1])Object.assign(angles,{['elbow'+s]:-90,['wrist'+s]:-60,['palm'+s]:0});const state=shift(weightedPose(angles),mix(-.68,-.65,q),mix(.79,.50,q));for(const s of [-1,1]){limb(state,s,'leg',[...feet,s*.12],1);state.points['toe'+s]=[feet[0]+.12,feet[1],s*.12];}return state;}
function hand(state,side,target,tilt=.04){const wrist=[target[0]-Math.sqrt(.08**2-tilt**2),target[1]+tilt,target[2]];limb(state,side,'arm',wrist,-1);state.points['palm'+side]=[...target];}
function reach(state,side,target,k){const p=state.points['palm'+side],high=Math.max(1.05,target[1]);let point;if(target[0]>-.2){const lift=ease(k/.4),over=ease((k-.4)/.4),down=ease((k-.8)/.2);point=[mix(p[0],target[0],over),mix(mix(p[1],high,lift),target[1],down),target[2]];}else point=p.map((v,i)=>mix(v,target[i],k));hand(state,side,point,mix(state.points['wrist'+side][1]-p[1],.04,k));}
const crouched=stand(.42),strike=[-.035,1.18,.2];
function prepare(t){const state=stand(t);if(t>.42){reach(state,1,strike,ease((t-.42)/(.78-.42)));if(t>.78){const end=[-.4,1.1,.2];reach(state,1,end,ease((t-.78)/.30));}if(t>.80)reach(state,-1,sill,ease((t-.80)/.28));}return state;}
const braced=prepare(1.08),tucked=shift(rollShape(0),-.40,1.015);
let terminalHip=[0,0];
function supported(t,override){let state;if(t<1.57){state=blendWeightedPose(braced,tucked,ease((t-1.08)/.49));const k=ease((t-1.08)/.49);shift(state,hermite(braced.points.hip[0],tucked.points.hip[0],1,clamp(((t-1.08)/.49-.68)/.32),.49*.32),mix(braced.points.hip[1],tucked.points.hip[1],k));}else{const k=clamp((t-1.57)/(.22));state=shift(rollShape(0),override?.[0]??hermite(-.40,-.13,terminalHip[0],k,.22,1),override?.[1]??hermite(1.015,1.015,terminalHip[1],k,.22));}hand(state,-1,sill);return state;}
const release=supported(BRACED_RELEASE),releaseMass=massProperties(release.points,release.segments),rollStart=sampleWeightedRoll(.4);
// Fixed-hand inverse kinematics changes COM response to pelvis translation.
{const e=1e-5,base=releaseMass.center,mx=massProperties(supported(BRACED_RELEASE,[-.13+e,1.015]).points,release.segments).center,my=massProperties(supported(BRACED_RELEASE,[-.13,1.015+e]).points,release.segments).center,a=(mx[0]-base[0])/e,b=(my[0]-base[0])/e,c=(mx[1]-base[1])/e,d=(my[1]-base[1])/e,det=a*d-b*c;terminalHip=[(vx*d-b*vy)/det,(a*vy-c*vx)/det];}
const flightTime=(vy+Math.sqrt(vy*vy+2*GRAVITY*(releaseMass.center[1]-rollStart.center[1])))/GRAVITY;
export const BRACED_LANDING=BRACED_RELEASE+flightTime,BRACED_DURATION=BRACED_LANDING+2.8;
export const BRACED_PHASES=[{label:'Crouch',start:0,end:.42},{label:'Break glass',start:.42,end:.78},{label:'Brace sill',start:.78,end:1.08},{label:'Push and tuck',start:1.08,end:1.57},{label:'Through opening',start:1.57,end:BRACED_RELEASE},{label:'Release and tuck',start:BRACED_RELEASE,end:BRACED_LANDING},{label:'Roll across back',start:BRACED_LANDING,end:BRACED_LANDING+.8},{label:'Gather into kneel',start:BRACED_LANDING+.8,end:BRACED_LANDING+2.25},{label:'Hold kneel',start:BRACED_LANDING+2.25,end:BRACED_DURATION}];
function inverseEase(v){let lo=0,hi=1;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(ease(m)<v)lo=m;else hi=m;}return (lo+hi)/2;}
export function sampleBracedWindow(time){if(!Number.isFinite(time))throw Error('Window time must be finite');time=Math.max(0,Math.min(BRACED_DURATION,time));let state,mode,velocity=null;
 if(time<=1.08){state=prepare(time);mode='ground preparation';}
 else if(time<=BRACED_RELEASE){state=supported(time);mode='sill support';}
 else if(time<BRACED_LANDING){const u=time-BRACED_RELEASE;state=blendWeightedPose(release,rollStart,ease((u-.18)/(flightTime-.18)));centerWeightedPose(state,[releaseMass.center[0]+vx*u,releaseMass.center[1]+vy*u-.5*GRAVITY*u*u,0]);mode='ballistic flight';velocity=[vx,vy-GRAVITY*u,0];}
 else{const u=time-BRACED_LANDING,r=u<.8?.4+1.4*inverseEase(1-Math.pow(1-u/.8,1.6)):1.8+Math.min(2.3,u-.8);state=sampleWeightedRoll(r);shift(state,releaseMass.center[0]+vx*flightTime-rollStart.center[0],0);mode=u<.8?'impact / roll':u<2.25?'gathering':'static kneel';}
 const mass=massProperties(state.points,state.segments),contacts=[];for(const s of state.segments)for(const id of [s.a,s.b])if(state.points[id][1]-s.radius<.004)contacts.push({surface:'ground',segment:s.name,id,point:[state.points[id][0],0,state.points[id][2]]});
 if(time>=1.08&&time<=BRACED_RELEASE)contacts.push({surface:'sill',segment:'hand -1',id:'palm-1',point:[...sill.slice(0,1),.875,sill[2]]});
 return {...state,...mass,contacts,time,mode,velocity,phase:BRACED_PHASES.find(p=>time<=p.end).label,balanced:supportContains(mass.center,contacts.filter(c=>c.surface==='ground')),glassTime:time<BRACED_IMPACT?-1:time-BRACED_IMPACT};
}
