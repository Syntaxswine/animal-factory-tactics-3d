import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleBracedWindow,BRACED_DURATION,BRACED_PHASES,BRACED_IMPACT,BRACED_RELEASE,BRACED_LANDING,WINDOW_OPENING} from '../dist/tactics/weighted-window-braced.js';
import {sampleWeightedRoll} from '../dist/tactics/weighted-roll.js';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
// Exact distance from a finite segment to an axis-aligned box. The squared
// distance is quadratic between crossings of the box's coordinate planes.
function segmentBoxDistance(a,b,lo,hi){
 const d=b.map((v,i)=>v-a[i]),breaks=[0,1];
 for(let i=0;i<3;i++)if(Math.abs(d[i])>1e-15)for(const bound of [lo[i],hi[i]]){const t=(bound-a[i])/d[i];if(t>0&&t<1)breaks.push(t);}
 breaks.sort((a,b)=>a-b);
 const distance2=t=>a.reduce((sum,v,i)=>{const q=v+t*d[i],gap=Math.max(lo[i]-q,0,q-hi[i]);return sum+gap*gap;},0);
 let best=Math.min(distance2(0),distance2(1));
 for(let j=1;j<breaks.length;j++){
  const left=breaks[j-1],right=breaks[j],mid=(left+right)/2;let A=0,B=0;
  for(let i=0;i<3;i++){const q=a[i]+mid*d[i],bound=q<lo[i]?lo[i]:q>hi[i]?hi[i]:null;if(bound!==null){A+=d[i]*d[i];B+=d[i]*(a[i]-bound);}}
  const t=A?Math.max(left,Math.min(right,-B/A)):mid;best=Math.min(best,distance2(left),distance2(right),distance2(t));
 }
 return Math.sqrt(best);
}
const solids=[
 {name:'lower wall / sill',lo:[-.09,0,-3],hi:[.09,.875,3]},
 {name:'upper wall / lintel',lo:[-.09,1.525,-3],hi:[.09,2,3]},
 {name:'left jamb',lo:[-.09,.875,-3],hi:[.09,1.525,-.475]},
 {name:'right jamb',lo:[-.09,.875,.475],hi:[.09,1.525,3]},
];

test('frame-clearance detector catches full segments and rounded capsule corners',()=>{
 const lower=solids[0];
 assert.equal(segmentBoxDistance([-.5,.7,0],[.5,.7,0],lower.lo,lower.hi),0,'crossing segment must collide even when both endpoints lie outside wall');
 assert(Math.abs(segmentBoxDistance([-.5,1,0],[.5,1,0],lower.lo,lower.hi)-.125)<1e-12);
 assert(Math.abs(segmentBoxDistance([.19,.975,0],[.5,.975,0],lower.lo,lower.hi)-Math.SQRT2*.1)<1e-12,'diagonal corner clearance must use Euclidean distance');
});

test('every capsule clears the unchanged frame and floor, including between its endpoints',()=>{
 assert.deepEqual(WINDOW_OPENING,{halfDepth:.09,bottom:.875,top:1.525,halfWidth:.475});let worst={gap:Infinity};
 for(let i=0;i<=1800;i++){const state=sampleBracedWindow(BRACED_DURATION*i/1800);for(const s of state.segments){const a=state.points[s.a],b=state.points[s.b];assert(Math.min(a[1],b[1])-s.radius>=-1e-8,`${s.name} enters ground at ${state.time}`);for(const solid of solids){const gap=segmentBoxDistance(a,b,solid.lo,solid.hi)-s.radius;if(gap<worst.gap)worst={gap,time:state.time,segment:s.name,solid:solid.name};}}}
 assert(worst.gap>=-.001,`solid frame penetration ${JSON.stringify(worst)}`);
});

test('all bone lengths, body radii and segment masses match the original 81 kg mannequin',()=>{
 const ref=sampleWeightedRoll(0),map=new Map(ref.segments.map(s=>[s.name,{mass:s.mass,radius:s.radius,length:distance(ref.points[s.a],ref.points[s.b])}]));
 for(let i=0;i<=1000;i++){const state=sampleBracedWindow(BRACED_DURATION*i/1000);assert.equal(state.totalMass,81);assert.equal(state.segments.length,map.size);for(const s of state.segments){const old=map.get(s.name);assert.equal(s.mass,old.mass);assert.equal(s.radius,old.radius);assert(Math.abs(distance(state.points[s.a],state.points[s.b])-old.length)<1e-7,`${s.name} stretches at ${state.time}`);}}
});

test('left hand is fixed against sill during the complete supported lift and crossing',()=>{
 const start=BRACED_PHASES.find(p=>p.label==='Push and tuck').start,initial=sampleBracedWindow(start),palm=initial.points['palm-1'];let maxHipRise=0;
 for(let i=0;i<=200;i++){const time=start+(BRACED_RELEASE-start)*i/200,state=sampleBracedWindow(time),support=state.contacts.find(c=>c.surface==='sill'&&c.id==='palm-1');assert(support,`missing sill support at ${time}`);assert(distance(state.points['palm-1'],palm)<1e-8,`left hand slides at ${time}`);assert(Math.abs(state.points['palm-1'][1]-.035-support.point[1])<1e-8);assert(Math.abs(support.point[0])<=.09&&Math.abs(support.point[2])<=.475);maxHipRise=Math.max(maxHipRise,state.points.hip[1]-initial.points.hip[1]);}
 assert(maxHipRise>.25,'no substantial braced body lift covered');assert(!sampleBracedWindow(BRACED_RELEASE+.001).contacts.some(c=>c.surface==='sill'),'hand still claims sill after release');
});

test('free flight has independently calculated ballistic COM and no fictitious contacts',()=>{
 const dt=.0001;
 for(let t=BRACED_RELEASE+.002;t<BRACED_LANDING-.002;t+=.006){const a=sampleBracedWindow(t-dt),b=sampleBracedWindow(t),c=sampleBracedWindow(t+dt);assert.equal(b.mode,'ballistic flight');assert.equal(b.contacts.length,0,`unsupported phase has contact at ${t}`);const center=[0,0,0];for(const s of b.segments)for(let i=0;i<3;i++)center[i]+=(b.points[s.a][i]+b.points[s.b][i])*s.mass/(2*81);assert(distance(center,b.center)<1e-9);for(let i=0;i<3;i++){const acceleration=(c.center[i]-2*b.center[i]+a.center[i])/(dt*dt);assert(Math.abs(acceleration-(i===1?-9.81:0))<.0001,`nonballistic COM at ${t}`);}}
});

test('release preserves velocity and landing retains forward momentum into the roll',()=>{
 const dt=.0001,a=sampleBracedWindow(BRACED_RELEASE-dt),b=sampleBracedWindow(BRACED_RELEASE),c=sampleBracedWindow(BRACED_RELEASE+dt),before=b.center.map((v,i)=>(v-a.center[i])/dt),after=c.center.map((v,i)=>(v-b.center[i])/dt);assert(distance(before,after)<.05,`release speed jumps ${JSON.stringify({before,after})}`);
 const d=sampleBracedWindow(BRACED_LANDING-dt),e=sampleBracedWindow(BRACED_LANDING),f=sampleBracedWindow(BRACED_LANDING+dt),incoming=(e.center[0]-d.center[0])/dt,outgoing=(f.center[0]-e.center[0])/dt;assert(incoming>1&&outgoing>incoming*.35,`motion stops at landing ${incoming} -> ${outgoing}`);
});

test('phase boundaries and random scrubbing preserve continuous deterministic poses',()=>{
 for(const phase of BRACED_PHASES.slice(0,-1)){const a=sampleBracedWindow(phase.end-1e-7),b=sampleBracedWindow(phase.end+1e-7);for(const id of Object.keys(a.points))assert(distance(a.points[id],b.points[id])<1e-5,`${id} pops at ${phase.label}`);}
 const times=[0,.2,.55,.78,1.08,1.3,1.8,BRACED_RELEASE,BRACED_LANDING,BRACED_DURATION],saved=times.map(sampleBracedWindow);for(let i=times.length-1;i>=0;i--)assert.deepEqual(sampleBracedWindow(times[i]),saved[i]);assert.deepEqual(sampleBracedWindow(-1),sampleBracedWindow(0));assert.deepEqual(sampleBracedWindow(100),sampleBracedWindow(BRACED_DURATION));for(const t of [NaN,Infinity,-Infinity])assert.throws(()=>sampleBracedWindow(t),/finite/);
});

test('floor contacts are genuine, never load the head or neck, and finish in a stationary supported kneel',()=>{
 for(let i=0;i<=1000;i++){const state=sampleBracedWindow(BRACED_DURATION*i/1000);for(const c of state.contacts.filter(c=>c.surface==='ground')){const s=state.segments.find(s=>s.name===c.segment);assert(Math.abs(state.points[c.id][1]-s.radius)<.00401);assert(!/head|neck/.test(c.segment),`${c.segment} loads floor at ${state.time}`);}}
 const end=sampleBracedWindow(BRACED_DURATION);assert.equal(end.mode,'static kneel');assert(end.balanced);assert(end.contacts.some(c=>c.id==='knee-1'));for(const t of [BRACED_DURATION-.3,BRACED_DURATION-.1]){const s=sampleBracedWindow(t);for(const [id,p]of Object.entries(end.points))assert(distance(p,s.points[id])<1e-9);}
});

test('the right hand reaches the glass when the break event fires',()=>{
 const before=sampleBracedWindow(BRACED_IMPACT-1e-7),hit=sampleBracedWindow(BRACED_IMPACT);assert(before.glassTime<0);assert.equal(hit.glassTime,0);const hand=hit.segments.find(s=>s.name==='hand 1'),tip=hit.points.palm1;
 assert(Math.abs(tip[0]+hand.radius)<1e-8);assert(tip[1]>.875&&tip[1]<1.525&&Math.abs(tip[2])<.475);
 for(const t of [BRACED_IMPACT+.1,BRACED_RELEASE,BRACED_DURATION])assert(Math.abs(sampleBracedWindow(t).glassTime-(t-BRACED_IMPACT))<1e-9);
});

test('dense temporal sampling catches internal reach or IK-branch snaps',()=>{
 let previous=sampleBracedWindow(0);
 for(let i=1;i<=Math.ceil(BRACED_DURATION*1000);i++){const state=sampleBracedWindow(i/1000);for(const [id,p]of Object.entries(state.points))assert(distance(p,previous.points[id])<.02,`${id} jumps more than 2 cm within 1 ms at ${state.time}`);previous=state;}
 for(const t of [.42,.80]){const a=sampleBracedWindow(t-1e-7),b=sampleBracedWindow(t+1e-7);for(const [id,p]of Object.entries(a.points))assert(distance(p,b.points[id])<1e-5,`${id} changes branch at ${t}`);}
});

test('weight travels toward the sill during the lift and keeps moving into the crossing',()=>{
 const phase=BRACED_PHASES.find(p=>p.label==='Push and tuck'),start=sampleBracedWindow(phase.start),end=sampleBracedWindow(phase.end),dt=.0001;
 assert(end.center[0]-start.center[0]>.20,'lift remains almost vertical outside sill');
 const before=sampleBracedWindow(phase.end-dt),after=sampleBracedWindow(phase.end+dt),incoming=(end.center[0]-before.center[0])/dt,outgoing=(after.center[0]-end.center[0])/dt;
 assert(incoming>.5&&outgoing>.5,`forward weight transfer pauses at tuck/crossing boundary: ${incoming} -> ${outgoing}`);
 assert(Math.abs(incoming-outgoing)<.05,'crossing begins with a horizontal speed jump');
});
