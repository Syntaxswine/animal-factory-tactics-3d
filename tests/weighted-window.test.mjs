import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleWeightedWindow,WINDOW_DURATION,WINDOW_PHASES,WINDOW_OPENING,WINDOW_IMPACT,TAKEOFF,LANDING,GRAVITY,SPEED} from '../dist/tactics/weighted-window.js';
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

test('all finite capsules clear the unchanged window solids and ground throughout traversal',()=>{
 assert.deepEqual(WINDOW_OPENING,{halfDepth:.09,bottom:.875,top:1.525,halfWidth:.475});
 let worst={gap:Infinity};
 for(let i=0;i<=1600;i++){const state=sampleWeightedWindow(WINDOW_DURATION*i/1600);for(const s of state.segments){const a=state.points[s.a],b=state.points[s.b];assert(Math.min(a[1],b[1])-s.radius>=-1e-8,`${s.name} penetrates ground at ${state.time}`);for(const wall of solids){const gap=segmentBoxDistance(a,b,wall.lo,wall.hi)-s.radius;if(gap<worst.gap)worst={gap,time:state.time,segment:s.name,wall:wall.name};}}}
 assert(worst.gap>=-.001,`capsule enters solid window frame ${JSON.stringify(worst)}`);
});

test('the existing 81 kg mannequin retains its masses and bone lengths without scaling',()=>{
 const reference=sampleWeightedRoll(0),segments=new Map(reference.segments.map(s=>[s.name,{mass:s.mass,radius:s.radius,length:distance(reference.points[s.a],reference.points[s.b])}]));
 for(let i=0;i<=800;i++){const state=sampleWeightedWindow(WINDOW_DURATION*i/800);assert.equal(state.totalMass,81);assert.equal(state.segments.length,segments.size);for(const s of state.segments){const original=segments.get(s.name);assert.equal(s.mass,original.mass);assert.equal(s.radius,original.radius);assert(Math.abs(distance(state.points[s.a],state.points[s.b])-original.length)<1e-8,`${s.name} changes length at ${state.time}`);}}
});

test('airborne center of mass follows gravity and constant horizontal velocity independently of pose',()=>{
 const dt=.0001;let count=0;
 for(let t=TAKEOFF+.002;t<LANDING-.002;t+=.007){const a=sampleWeightedWindow(t-dt),b=sampleWeightedWindow(t),c=sampleWeightedWindow(t+dt);assert.equal(b.mode,'ballistic flight');const center=[0,0,0];for(const s of b.segments)for(let j=0;j<3;j++)center[j]+=(b.points[s.a][j]+b.points[s.b][j])*s.mass/(2*81);assert(distance(center,b.center)<1e-9);for(let j=0;j<3;j++){const acceleration=(c.center[j]-2*b.center[j]+a.center[j])/(dt*dt);assert(Math.abs(acceleration-(j===1?-GRAVITY:0))<.0001,`wrong airborne COM acceleration at ${t}`);}assert(Math.abs((c.center[0]-a.center[0])/(2*dt)-SPEED)<1e-7);assert.equal(b.contacts.length,0,`ground support during flight at ${t}`);count++;}assert(count>25);
});

test('landing carries forward travel into the roll rather than arresting momentum instantly',()=>{
 const dt=.001,a=sampleWeightedWindow(LANDING-dt),b=sampleWeightedWindow(LANDING),c=sampleWeightedWindow(LANDING+dt),incoming=(b.center[0]-a.center[0])/dt,outgoing=(c.center[0]-b.center[0])/dt;
 assert(incoming>1);assert(outgoing>incoming*.35,`horizontal speed collapses from ${incoming} to ${outgoing} at touchdown`);
});

test('the supported push builds the flight velocity before the feet leave the ground',()=>{
 const dt=.0001,a=sampleWeightedWindow(TAKEOFF-dt),b=sampleWeightedWindow(TAKEOFF),c=sampleWeightedWindow(TAKEOFF+dt),before=b.center.map((v,i)=>(v-a.center[i])/dt),after=c.center.map((v,i)=>(v-b.center[i])/dt);
 assert(distance(before,after)<.05,`velocity jumps at release: ${JSON.stringify({before,after})}`);
 assert(a.contacts.some(c=>/foot/.test(c.segment)),'push must retain a foot contact before release');
});

test('push-off feet remain fixed instead of sliding to conceal launch acceleration',()=>{
 const initial=sampleWeightedWindow(0);
 for(let i=0;i<=350;i++){const state=sampleWeightedWindow(TAKEOFF*i/350);for(const id of ['ankle-1','toe-1','ankle1','toe1'])assert(distance(initial.points[id],state.points[id])<1e-9,`${id} slides during push at ${state.time}`);}
});

test('glass breaks when a leading hand reaches the pane, never in advance of contact',()=>{
 const before=sampleWeightedWindow(WINDOW_IMPACT-1e-7),hit=sampleWeightedWindow(WINDOW_IMPACT);assert(before.glassTime<0);assert.equal(hit.glassTime,0);
 const leading=hit.segments.flatMap(s=>[s.a,s.b].map(id=>({segment:s.name,id,front:hit.points[id][0]+s.radius}))).sort((a,b)=>b.front-a.front)[0];
 assert(leading.segment.startsWith('hand '),`glass impact is led by ${leading.segment}`);assert(Math.abs(leading.front)<1e-7,'impact must occur on pane plane');
 for(const t of [WINDOW_IMPACT+.1,LANDING,WINDOW_DURATION])assert(Math.abs(sampleWeightedWindow(t).glassTime-(t-WINDOW_IMPACT))<1e-9);
});

test('contact reports are genuine, never load the head or neck, and finish in a supported kneel',()=>{
 for(let i=0;i<=800;i++){const state=sampleWeightedWindow(WINDOW_DURATION*i/800);for(const c of state.contacts){const s=state.segments.find(s=>s.name===c.segment);assert(Math.abs(state.points[c.id][1]-s.radius)<.00401);assert(!/head|neck/.test(c.segment),`${c.segment} loads the floor at ${state.time}`);}}
 const end=sampleWeightedWindow(WINDOW_DURATION);assert.equal(end.mode,'static kneel');assert(end.balanced);assert(end.contacts.some(c=>c.id==='knee-1'));assert(end.contacts.some(c=>c.id==='ankle1'));
 for(const t of [WINDOW_DURATION-.3,WINDOW_DURATION-.1]){const s=sampleWeightedWindow(t);for(const [id,p]of Object.entries(end.points))assert(distance(p,s.points[id])<1e-9,`${id} shifts in final kneel`);}
});

test('whole traversal has continuous poses, deterministic scrubbing and finite-time validation',()=>{
 for(const phase of WINDOW_PHASES.slice(0,-1)){const a=sampleWeightedWindow(phase.end-1e-7),b=sampleWeightedWindow(phase.end+1e-7);for(const id of Object.keys(a.points))assert(distance(a.points[id],b.points[id])<1e-5,`${id} pops at ${phase.label}`);}
 const times=[0,.23,TAKEOFF,.84,1.1,LANDING-.001,LANDING+.001,LANDING+.72,WINDOW_DURATION],saved=times.map(sampleWeightedWindow);for(let i=times.length-1;i>=0;i--)assert.deepEqual(sampleWeightedWindow(times[i]),saved[i]);
 assert.deepEqual(sampleWeightedWindow(-1),sampleWeightedWindow(0));assert.deepEqual(sampleWeightedWindow(100),sampleWeightedWindow(WINDOW_DURATION));for(const t of [NaN,Infinity,-Infinity])assert.throws(()=>sampleWeightedWindow(t),/finite/);
});
