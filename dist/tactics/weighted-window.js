// Authored joint motion with ballistic flight and geometric contacts.
// Impact forces, friction, joint limits and self-collision are not solved.
import {rollShape,massProperties,sampleWeightedRoll,supportContains} from './weighted-roll.js';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,t)=>a+(b-a)*t,rad=x=>x*Math.PI/180;
export const WINDOW_OPENING=Object.freeze({halfDepth:.09,bottom:.875,top:1.525,halfWidth:.475});
export const TAKEOFF=.7,GRAVITY=9.81,SPEED=6;
function polar(p,len,angle){return [p[0]+len*Math.cos(angle),p[1]+len*Math.sin(angle),p[2]];}
function setAngle(state,id,parent,angle){const old=state.points[id],p=state.points[parent],s=state.segments.find(s=>s.a===parent&&s.b===id);state.points[id]=polar(p,s.length,rad(angle));state.points[id][2]=old[2];}
function pose(angles){const state=rollShape(0);for(const s of state.segments){if(s.name.includes('bridge')){const z=state.points[s.b][2];state.points[s.b]=[...state.points[s.a]];state.points[s.b][2]=z;}else setAngle(state,s.b,s.a,angles[s.b]??0);}return state;}
const diveAngles={lumbar:0,shoulders:0,neck:10,head:0};for(const side of [-1,1])Object.assign(diveAngles,{['elbow'+side]:-5,['wrist'+side]:-5,['palm'+side]:0,['knee'+side]:180,['ankle'+side]:190,['toe'+side]:180});
const dive=pose(diveAngles);
let pushVelocity=[0,0];
const hermite=(a,b,v,t,d)=>{const k=clamp(t);return a+(b-a)*(3*k*k-2*k*k*k)+v*d*(k*k*k-k*k);};
function launchShape(t,override=null){
 const crouch=ease(t/.42),push=ease((t-.42)/(.7-.42)),hipY=override?.[1]??(t<=.42?mix(.70,.47,crouch):hermite(.47,.70,pushVelocity[1],(t-.42)/.28,.28)),hipX=override?.[0]??(t<=.42?mix(-.12,-.38,crouch):hermite(-.38,.25,pushVelocity[0],(t-.42)/.28,.28)),lean=mix(mix(77,45,crouch),55,push),angles={lumbar:lean,shoulders:lean,neck:80,head:80};
 for(const side of [-1,1])Object.assign(angles,{['elbow'+side]:mix(-75,30,push),['wrist'+side]:mix(-25,20,push),['palm'+side]:0});
 const state=pose(angles);for(const p of Object.values(state.points)){p[0]+=hipX;p[1]+=hipY;}
 for(const side of [-1,1]){const hip=state.points['hip'+side],ankle=[0,.06,side*.12],dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],d=Math.hypot(dx,dy),along=(.44**2-.4**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,.44**2-along**2));state.points['knee'+side]=[hip[0]+dx/d*along-dy/d*h,hip[1]+dy/d*along+dx/d*h,side*.12];state.points['ankle'+side]=ankle;state.points['toe'+side]=[.12,.06,side*.12];}
 return state;
}
// Interpolate segment angles, never positions: all bones keep their lengths.
function blend(a,b,t){const state=rollShape(0);for(const s of state.segments){const parent=state.points[s.a],z=a.points[s.b][2];if(s.name.includes('bridge')){state.points[s.b]=[...parent];state.points[s.b][2]=z;continue;}const pa=a.points[s.a],qa=a.points[s.b],pb=b.points[s.a],qb=b.points[s.b],aa=Math.atan2(qa[1]-pa[1],qa[0]-pa[0]);let ab=Math.atan2(qb[1]-pb[1],qb[0]-pb[0]);while(ab-aa>Math.PI)ab-=2*Math.PI;while(ab-aa< -Math.PI)ab+=2*Math.PI;state.points[s.b]=polar(parent,s.length,mix(aa,ab,t));state.points[s.b][2]=z;}return state;}
function translate(state,target){const mass=massProperties(state.points,state.segments),offset=target.map((v,i)=>v-mass.center[i]);for(const p of Object.values(state.points))for(let i=0;i<3;i++)p[i]+=offset[i];return state;}
const launch=launchShape(TAKEOFF),launchMass=massProperties(launch.points,launch.segments),rollStart=sampleWeightedRoll(.4);
export const INITIAL_VY=Math.sqrt(2*GRAVITY*(1.32-launchMass.center[1]));
// Match takeoff velocity during the planted-foot push, rather than launching
// from an eased-to-zero pose. Solve the local COM Jacobian for pelvis speed.
{const base=launchMass.center,eps=1e-5,mx=massProperties(launchShape(TAKEOFF,[.25+eps,.70]).points,launch.segments).center,my=massProperties(launchShape(TAKEOFF,[.25,.70+eps]).points,launch.segments).center,a=(mx[0]-base[0])/eps,b=(my[0]-base[0])/eps,c=(mx[1]-base[1])/eps,d=(my[1]-base[1])/eps,det=a*d-b*c;pushVelocity=[(SPEED*d-b*INITIAL_VY)/det,(a*INITIAL_VY-c*SPEED)/det];}
export const START_X=-SPEED*INITIAL_VY/GRAVITY;
export const FLIGHT_TIME=(INITIAL_VY+Math.sqrt(INITIAL_VY**2+2*GRAVITY*(launchMass.center[1]-rollStart.center[1])))/GRAVITY;
export const LANDING=TAKEOFF+FLIGHT_TIME;
function flight(u){const state=u<.18?blend(launch,dive,ease(u/.18)):blend(dive,rollStart,ease((u-.52)/(FLIGHT_TIME-.52)));return translate(state,[START_X+SPEED*u,launchMass.center[1]+INITIAL_VY*u-.5*GRAVITY*u*u,0]);}
// Break the pane when the leading hand envelope first reaches it.
export const WINDOW_IMPACT=(()=>{let lo=0,hi=.3;for(let i=0;i<50;i++){const mid=(lo+hi)/2,state=flight(mid),front=Math.max(...state.segments.flatMap(s=>[state.points[s.a][0]+s.radius,state.points[s.b][0]+s.radius]));if(front>=0)hi=mid;else lo=mid;}return TAKEOFF+(lo+hi)/2;})();
function inverseEase(value){let lo=0,hi=1;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(ease(mid)<value)lo=mid;else hi=mid;}return (lo+hi)/2;}
export const WINDOW_DURATION=LANDING+2.8;
export const WINDOW_PHASES=Object.freeze([{label:'Load the jump',start:0,end:.42},{label:'Push off',start:.42,end:TAKEOFF},{label:'Clear the window',start:TAKEOFF,end:TAKEOFF+.52},{label:'Tuck for landing',start:TAKEOFF+.52,end:LANDING},{label:'Roll across back',start:LANDING,end:LANDING+.8},{label:'Gather into kneel',start:LANDING+.8,end:LANDING+2.25},{label:'Hold kneel',start:LANDING+2.25,end:WINDOW_DURATION}]);
export function sampleWeightedWindow(time){
 if(!Number.isFinite(time))throw Error('Window time must be finite');time=Math.max(0,Math.min(WINDOW_DURATION,time));let state,mode,velocity=null;
 if(time<=TAKEOFF){state=launchShape(time);const m=massProperties(state.points,state.segments);translate(state,[START_X+m.center[0]-launchMass.center[0],m.center[1],0]);mode='supported push';}
 else if(time<LANDING){const u=time-TAKEOFF;state=flight(u);mode='ballistic flight';velocity=[SPEED,INITIAL_VY-GRAVITY*u,0];}
 else {const u=time-LANDING; // Fast initial roll, easing into the existing gather.
 const r=u<.8?.4+1.4*inverseEase(1-Math.pow(1-u/.8,1.6)) :1.8+Math.min(2.3,u-.8);
 state=sampleWeightedRoll(r);const offset=START_X+SPEED*FLIGHT_TIME-rollStart.center[0];for(const p of Object.values(state.points))p[0]+=offset;mode=u<.8?'impact / roll':u<2.25?'gathering':'static kneel';}
 const mass=massProperties(state.points,state.segments),contacts=[];for(const s of state.segments)for(const id of [s.a,s.b])if(state.points[id][1]-s.radius<.004)contacts.push({segment:s.name,id,point:[state.points[id][0],0,state.points[id][2]]});
 return {...state,...mass,contacts,time,phase:WINDOW_PHASES.find(p=>time<=p.end).label,mode,velocity,balanced:supportContains(mass.center,contacts),glassTime:time<WINDOW_IMPACT?-1:time-WINDOW_IMPACT};
}
