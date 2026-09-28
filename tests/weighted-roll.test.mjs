import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleWeightedRoll,supportContains,ROLL_DURATION,ROLL_PHASES} from '../dist/tactics/weighted-roll.js';

const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const samples=()=>Array.from({length:821},(_,i)=>sampleWeightedRoll(ROLL_DURATION*i/820));
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function hull(points){
 const p=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const half=ps=>{const h=[];for(const p of ps){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
 return [...half(p).slice(0,-1),...half([...p].reverse()).slice(0,-1)];
}
function insideHull(center,points){const h=hull(points);return h.length>=3&&h.every((a,i)=>cross(a,h[(i+1)%h.length],center)>=-1e-8);}

test('weighted mannequin retains fixed bone lengths and the same explicit masses throughout',()=>{
 const reference=sampleWeightedRoll(0),lengths=new Map(reference.segments.map(s=>[s.name,distance(reference.points[s.a],reference.points[s.b])])),masses=new Map(reference.segments.map(s=>[s.name,s.mass]));
 assert(reference.totalMass>0);assert(reference.segments.length>=20);
 for(const state of samples()){
  assert.equal(state.segments.length,reference.segments.length);
  assert.equal(state.totalMass,reference.totalMass);
  for(const s of state.segments){assert.equal(s.mass,masses.get(s.name));assert(s.mass>0&&s.radius>0);assert(Math.abs(distance(state.points[s.a],state.points[s.b])-lengths.get(s.name))<1e-9,`${s.name} stretches at ${state.time}`);}
 }
});

test('center of mass and roll-axis inertia match independent weighted segment calculations',()=>{
 for(const state of samples()){
  const mass=state.segments.reduce((n,s)=>n+s.mass,0),center=[0,0,0];
  for(const segment of state.segments)for(let axis=0;axis<3;axis++)center[axis]+=(state.points[segment.a][axis]+state.points[segment.b][axis])*segment.mass/2;
  center.forEach((n,i)=>assert(Math.abs(n/mass-state.center[i])<1e-10,`incorrect COM at ${state.time}`));
  assert(state.inertia>0&&Number.isFinite(state.inertia));
  const inertia=state.segments.reduce((sum,s)=>{const a=state.points[s.a],b=state.points[s.b],x=(a[0]+b[0])/2-state.center[0],y=(a[1]+b[1])/2-state.center[1];return sum+s.mass*(x*x+y*y+((b[0]-a[0])**2+(b[1]-a[1])**2)/12);},0);
  assert(Math.abs(state.inertia-inertia)<1e-9,`incorrect inertia about roll axis at ${state.time}`);
 }
});

test('entire segment capsules clear the floor and reported supports really touch it',()=>{
 for(const state of samples()){
  for(const segment of state.segments){const gap=Math.min(state.points[segment.a][1],state.points[segment.b][1])-segment.radius;assert(gap>=-1e-9,`${segment.name} penetrates floor by ${-gap} at ${state.time}`);}
  assert(state.contacts.length>0,`no support at ${state.time}`);
  for(const contact of state.contacts){const segment=state.segments.find(s=>s.name===contact.segment);assert(segment);const p=state.points[contact.id];assert(Math.abs(p[1]-segment.radius)<.00401,`reported support floats at ${state.time}`);assert(Math.abs(p[0]-contact.point[0])<1e-9&&Math.abs(p[2]-contact.point[2])<1e-9);assert.equal(contact.point[1],0);}
 }
});

test('the rolling support passes across the back without loading the head or neck',()=>{
 const supported=new Set();
 for(const state of samples()){
  for(const c of state.contacts){assert(!/head|neck/i.test(c.segment),`${c.segment} takes weight at ${state.time}`);if(state.time>=.4&&state.time<=1.8)supported.add(c.segment);}
 }
 assert(supported.has('chest / upper back'),'upper back never supports roll');
 assert(supported.has('pelvis / lower back'),'lower back never supports roll');
});

test('terminal kneel is stationary with one knee down and COM inside the actual support polygon',()=>{
 const final=sampleWeightedRoll(ROLL_DURATION);
 const contactIds=new Set(final.contacts.map(c=>c.id));assert(contactIds.has('knee-1'),'left knee must be planted');assert(contactIds.has('ankle1')||contactIds.has('toe1'),'opposite foot must be planted');
 for(let time=3.25;time<=ROLL_DURATION;time+=.025){const state=sampleWeightedRoll(time);assert(state.balanced);assert(insideHull([state.center[0],state.center[2]],state.contacts.map(c=>[c.point[0],c.point[2]])),`COM outside convex support at ${time}`);for(const [name,p]of Object.entries(state.points))assert(distance(p,final.points[name])<1e-9,`${name} moves during terminal hold`);}
 // Negative control: being within contact bounds is not sufficient for balance.
 assert(!insideHull([.8,.8],[[0,0],[1,0],[0,1]]));
 assert(!supportContains([.8,0,.8],[[0,0],[1,0],[0,1]].map(([x,z])=>({point:[x,0,z]}))));
});

test('knee and both feet remain planted during the final supported pelvis rise',()=>{
 const planted=['knee-1','ankle-1','toe-1','ankle1','toe1'],start=sampleWeightedRoll(2.43),end=sampleWeightedRoll(3.25);
 assert(end.points.hip[1]>start.points.hip[1]+.15,'no substantial rise tested');
 for(let t=2.43;t<3.26;t+=.005){const state=sampleWeightedRoll(t);for(const id of planted){assert(state.contacts.some(c=>c.id===id),`${id} loses support at ${t}`);assert(distance(state.points[id],start.points[id])<1e-8,`${id} slides during the pelvis rise at ${t}`);}}
});

test('authored phase boundaries are continuous and seeking does not accumulate history',()=>{
 for(const phase of ROLL_PHASES.slice(0,-1)){const a=sampleWeightedRoll(phase.end-1e-7),b=sampleWeightedRoll(phase.end+1e-7);for(const id of Object.keys(a.points))assert(distance(a.points[id],b.points[id])<.00001,`${id} pops at ${phase.end}`);}
 const times=[0,.14,.67,1.3,1.79,1.81,2.22,2.89,3.31,ROLL_DURATION],expected=times.map(sampleWeightedRoll);
 for(let i=times.length-1;i>=0;i--)assert.deepEqual(sampleWeightedRoll(times[i]),expected[i]);
 assert.deepEqual(sampleWeightedRoll(-1),sampleWeightedRoll(0));assert.deepEqual(sampleWeightedRoll(1e6),sampleWeightedRoll(ROLL_DURATION));
 for(const time of [NaN,Infinity,-Infinity])assert.throws(()=>sampleWeightedRoll(time),/finite/i);
});

test('dense temporal sweep catches pose jumps inside phases including the unfolding knee branch',()=>{
 let previous=sampleWeightedRoll(0);
 for(let i=1;i<=4100;i++){const state=sampleWeightedRoll(i/1000);for(const [id,p]of Object.entries(state.points))assert(distance(p,previous.points[id])<.007,`${id} jumps more than 7 mm within 1 ms at ${state.time}`);previous=state;}
 // The right-leg IK branch switches at p=.5. Find that event independently
 // from public gather timing and probe much closer than the dense sweep.
 let lo=1.8,hi=3.25;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(sampleWeightedRoll(mid).gather<.2)lo=mid;else hi=mid;}
 const a=sampleWeightedRoll(hi-1e-7),b=sampleWeightedRoll(hi+1e-7);
 for(const id of Object.keys(a.points))assert(distance(a.points[id],b.points[id])<.00001,`${id} snaps at the knee unfolding branch`);
});
