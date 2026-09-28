// Contact-constrained motion study, not a ragdoll or a force-driven simulation.
// Lengths stay fixed; segment masses determine the actual center of mass.
const rad=d=>d*Math.PI/180,lerp=(a,b,t)=>a+(b-a)*t,ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const ROLL_PHASES=Object.freeze([{label:'Brace and tuck',start:0,end:.4},{label:'Roll across back',start:.4,end:1.8},{label:'Gather legs',start:1.8,end:2.4},{label:'Settle into kneel',start:2.4,end:3.25},{label:'Hold kneel',start:3.25,end:4.1}]);
export const ROLL_DURATION=4.1;
const add=(p,length,angle,z=p[2])=>[p[0]+length*Math.cos(angle),p[1]+length*Math.sin(angle),z];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function kneeAngles(){const hip=[0,.48,0],knee=[Math.sqrt(.44**2-.405**2),.075,0],ankle=[knee[0]-Math.sqrt(.4**2-.015**2),.06,0];return [Math.atan2(knee[1]-hip[1],knee[0]-hip[0]),Math.atan2(ankle[1]-knee[1],ankle[0]-knee[0])];}
function rightLeg(){const target=[.43,-.42],d=Math.hypot(...target),along=(.44**2-.4**2+d*d)/(2*d),h=Math.sqrt(.44**2-along**2),axis=target.map(v=>v/d),knee=[axis[0]*along-axis[1]*h,axis[1]*along+axis[0]*h];return [Math.atan2(knee[1],knee[0]),Math.atan2(target[1]-knee[1],target[0]-knee[0])];}
export function rollShape(gather=0){
 const k=ease(gather),points={hip:[0,0,0]},segments=[];
 function segment(name,a,b,mass,radius){segments.push({name,a,b,mass,radius,length:distance(points[a],points[b])});}
 function joint(name,parent,length,from,to){points[name]=add(points[parent],length,lerp(rad(from),rad(to),k));}
 joint('lumbar','hip',.25,66,75);segment('pelvis / lower back','hip','lumbar',14,.125);
 joint('shoulders','lumbar',.22,24,75);segment('chest / upper back','lumbar','shoulders',24,.12);
 joint('neck','shoulders',.14,-70,90);segment('neck','shoulders','neck',2,.06);
 joint('head','neck',.14,-130,90);segment('head','neck','head',6,.095);
 for(const side of [-1,1]){
  const s=String(side),hip='hip'+s,shoulder='shoulder'+s;points[hip]=[0,0,side*.12];points[shoulder]=[...points.shoulders];points[shoulder][2]=side*.20;
  segment('pelvis bridge '+s,'hip',hip,1,.06);segment('shoulder bridge '+s,'shoulders',shoulder,1,.055);
  joint('elbow'+s,shoulder,.25,-45,-85);points['elbow'+s]=add(points[shoulder],.25,lerp(rad(-45),rad(-85),k)+rad(30)*Math.sin(Math.PI*k));segment('upper arm '+s,shoulder,'elbow'+s,2.5,.055);
  joint('wrist'+s,'elbow'+s,.25,-150,-30);segment('forearm '+s,'elbow'+s,'wrist'+s,1.5,.045);
  joint('palm'+s,'wrist'+s,.08,-180,-10);segment('hand '+s,'wrist'+s,'palm'+s,.5,.035);
  const angles=side<0?kneeAngles():rightLeg();
  points['knee'+s]=add(points[hip],.44,lerp(rad(10),angles[0],k));segment('thigh '+s,hip,'knee'+s,7,.075);
  // Interpolate the back-folded shin along its short angular route.
  let shin=angles[1];while(shin<rad(160)-Math.PI)shin+=2*Math.PI;
  points['ankle'+s]=add(points['knee'+s],.4,lerp(rad(160),shin,k));segment('shin '+s,'knee'+s,'ankle'+s,3,.05);
  joint('toe'+s,'ankle'+s,.12,0,0);segment('foot '+s,'ankle'+s,'toe'+s,1,.06);
 }
 return {points,segments};
}
// Plant the rear knee and both feet before lifting the pelvis. The lower leg
// and foot contacts remain fixed through the rise instead of sliding into place.
function gatherShape(g){
 const state=rollShape(g),{points}=state,p=ease(g/.4),rise=ease((g-.4)/.6);
 const kneeX=lerp(.44*Math.cos(rad(10)),Math.sqrt(.44**2-.405**2),p),kneeY=lerp(.125+.44*Math.sin(rad(10)),.075,p),hipY=lerp(.125,.48,rise),hipX=kneeX-Math.sqrt(.44**2-(hipY-kneeY)**2);
 for(const q of Object.values(points)){q[0]+=hipX;q[1]+=hipY;}
 const leftKnee=[kneeX,kneeY,-.12],leftShin=lerp(rad(160),Math.PI+Math.asin(.015/.4),p),leftAnkle=add(leftKnee,.4,leftShin);
 points['knee-1']=leftKnee;points['ankle-1']=leftAnkle;points['toe-1']=add(leftAnkle,.12,0);
 const initialAnkle=[.44*Math.cos(rad(10))+.4*Math.cos(rad(160)),.44*Math.sin(rad(10))+.4*Math.sin(rad(160))],hip=points.hip1;
 let ankle;
 if(p<1){const first=p<=.5,t=ease(first?p*2:(p-.5)*2),finish=[.43-hip[0],.06-hip[1]],d=first?lerp(Math.hypot(...initialAnkle),.84,t):lerp(.84,Math.hypot(...finish),t),a=first?lerp(Math.atan2(initialAnkle[1],initialAnkle[0]),rad(20),t):lerp(rad(20),Math.atan2(finish[1],finish[0]),t);ankle=add(hip,d,a);}
 else ankle=[.43,.06,.12];
 const dx=ankle[0]-hip[0],dy=ankle[1]-hip[1],d=Math.hypot(dx,dy),along=(.44**2-.4**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,.44**2-along**2)),bend=p<=.5?1:-1;
 points.knee1=[hip[0]+dx/d*along+bend*dy/d*h,hip[1]+dy/d*along-bend*dx/d*h,.12];points.ankle1=ankle;points.toe1=add(ankle,.12,0);

 return state;
}
export function massProperties(points,segments){const totalMass=segments.reduce((n,s)=>n+s.mass,0),center=[0,0,0];for(const s of segments)for(let i=0;i<3;i++)center[i]+=(points[s.a][i]+points[s.b][i])*s.mass/(2*totalMass);let inertia=0;for(const s of segments){const a=points[s.a],b=points[s.b],mid=a.map((v,i)=>(v+b[i])/2);inertia+=s.mass*((mid[0]-center[0])**2+(mid[1]-center[1])**2+((b[0]-a[0])**2+(b[1]-a[1])**2)/12);}return {totalMass,center,inertia};}
function grounded(angle,gather){const {points,segments}=gather>0?gatherShape(gather):rollShape(0),c=Math.cos(angle),s=Math.sin(angle);for(const p of Object.values(points)){const x=p[0],y=p[1];p[0]=x*c-y*s;p[1]=x*s+y*c;}
 const lift=Math.max(...segments.flatMap(s=>[s.radius-points[s.a][1],s.radius-points[s.b][1]]));for(const p of Object.values(points))p[1]+=lift;
 const mass=massProperties(points,segments),contacts=[];for(const segment of segments)for(const id of [segment.a,segment.b])if(points[id][1]-segment.radius<.004)contacts.push({segment:segment.name,id,point:[points[id][0],0,points[id][2]]});return {points,segments,...mass,contacts};}
// Integrate rolling distance from instantaneous COM height (no arbitrary root
// sliding). This is an authored rolling constraint, not a dynamics claim.
const angles=1024,travel=[0];for(let i=1;i<=angles;i++){const a=-Math.PI/2-1.5*Math.PI*(i-.5)/angles;travel.push(travel.at(-1)+grounded(a,0).center[1]*1.5*Math.PI/angles);}
function arcDistance(t){const v=Math.max(0,Math.min(1,t))*angles,i=Math.min(angles-1,Math.floor(v));return lerp(travel[i],travel[i+1],v-i);}
export function supportContains(center,contacts,tolerance=.025){
 const points=contacts.map(c=>[c.point[0],c.point[2]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),unique=points.filter((p,i)=>!i||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]);
 if(!unique.length)return false;const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=rows=>{const out=[];for(const p of rows){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;},lower=half(unique),upper=half([...unique].reverse()),hull=[...lower.slice(0,-1),...upper.slice(0,-1)],q=[center[0],center[2]];
 if(unique.length===1)return Math.hypot(q[0]-unique[0][0],q[1]-unique[0][1])<=tolerance;
 if(hull.length>=3&&hull.every((a,i)=>cross(a,hull[(i+1)%hull.length],q)>=0))return true;
 return hull.some((a,i)=>{const b=hull[(i+1)%hull.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(q[0]-a[0]-t*dx,q[1]-a[1]-t*dy)<=tolerance;});
}
export function sampleWeightedRoll(time){
 if(!Number.isFinite(time))throw Error('Roll time must be finite');time=Math.max(0,Math.min(ROLL_DURATION,time));
 const roll=ease((time-.4)/1.4),gather=ease((time-1.8)/1.45),angle=-Math.PI/2-1.5*Math.PI*roll,state=grounded(angle,gather),distance=arcDistance(roll),base=grounded(-Math.PI/2,0).center[0];
 // Horizontal root follows the computed mass center during rolling. During
// gathering the pelvis stays over the final rolling contact, then holds still.
 const x=distance+base-(gather?grounded(-2*Math.PI,0).center[0]:state.center[0]);for(const p of Object.values(state.points))p[0]+=x;state.center[0]+=x;for(const c of state.contacts)c.point[0]+=x;
 const inside=supportContains(state.center,state.contacts);
 return {...state,time,angle,roll,gather,phase:ROLL_PHASES.find(p=>time<=p.end).label,balanced:!!inside,mode:time<1.8?'dynamic roll':time<3.25?'gathering':'static kneel'};
}
