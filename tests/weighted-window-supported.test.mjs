import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleSupportedWindow as sample,SUPPORTED_DURATION as duration,SUPPORTED_PHASES as phases,WINDOW_OPENING} from '../dist/tactics/weighted-window-supported.js';
import {sampleWeightedRoll} from '../dist/tactics/weighted-roll.js';
import {jointLimitReport} from '../dist/tactics/body-joint-limits.js';
import {collisionReport,segmentDistance} from '../dist/tactics/body-collisions.js';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
function segmentBoxDistance(a,b,lo,hi){
 const d=b.map((v,i)=>v-a[i]),breaks=[0,1];for(let i=0;i<3;i++)if(Math.abs(d[i])>1e-15)for(const bound of [lo[i],hi[i]]){const t=(bound-a[i])/d[i];if(t>0&&t<1)breaks.push(t);}breaks.sort((a,b)=>a-b);
 const distance2=t=>a.reduce((sum,v,i)=>{const q=v+t*d[i],gap=Math.max(lo[i]-q,0,q-hi[i]);return sum+gap*gap;},0);let best=Math.min(distance2(0),distance2(1));
 for(let j=1;j<breaks.length;j++){const left=breaks[j-1],right=breaks[j],mid=(left+right)/2;let A=0,B=0;for(let i=0;i<3;i++){const q=a[i]+mid*d[i],bound=q<lo[i]?lo[i]:q>hi[i]?hi[i]:null;if(bound!==null){A+=d[i]*d[i];B+=d[i]*(a[i]-bound);}}const t=A?Math.max(left,Math.min(right,-B/A)):mid;best=Math.min(best,distance2(left),distance2(right),distance2(t));}return Math.sqrt(best);
}
const solids=[{name:'sill',lo:[-.09,0,-3],hi:[.09,.875,3]},{name:'lintel',lo:[-.09,1.525,-3],hi:[.09,2,3]},{name:'left jamb',lo:[-.09,.875,-3],hi:[.09,1.525,-.475]},{name:'right jamb',lo:[-.09,.875,.475],hi:[.09,1.525,3]}];
test('supported sampler keeps the original 81 kg capsule rig and opening',()=>{
 assert.deepEqual(WINDOW_OPENING,{halfDepth:.09,bottom:.875,top:1.525,halfWidth:.475});const reference=sampleWeightedRoll(0);
 let worst={error:0};for(let i=0;i<=Math.ceil(duration*100);i++){const s=sample(i/100);assert.equal(s.totalMass,81);for(const b of s.segments){const ref=reference.segments.find(r=>r.name===b.name);assert.equal(b.mass,ref.mass);assert.equal(b.radius,ref.radius);const error=Math.abs(distance(s.points[b.a],s.points[b.b])-ref.length);if(error>worst.error)worst={error,time:s.time,segment:b.name,reachErrors:s.reachErrors};}}
 assert(worst.error<1e-7,JSON.stringify(worst));
});
test('supported candidate clears full frame capsules and floor',()=>{
 let worst={gap:Infinity};for(let i=0;i<=Math.ceil(duration*100);i++){const s=sample(i/100);for(const b of s.segments){const a=s.points[b.a],c=s.points[b.b],floor=Math.min(a[1],c[1])-b.radius;if(floor<worst.gap)worst={gap:floor,time:s.time,segment:b.name,solid:'floor'};for(const solid of solids){const gap=segmentBoxDistance(a,c,solid.lo,solid.hi)-b.radius;if(gap<worst.gap)worst={gap,time:s.time,segment:b.name,solid:solid.name};}}}assert(worst.gap>=-1e-6,JSON.stringify(worst));
});
test('knees, spine and neck remain inside explicit mannequin limits',()=>{
 let first;for(let i=0;i<=Math.ceil(duration*100);i++){const s=sample(i/100),warnings=jointLimitReport(s).warnings;if(warnings.length){first={time:s.time,warnings};break;}}assert(!first,JSON.stringify(first));
});
test('phase boundaries preserve positions and arbitrary sampling is deterministic',()=>{
 for(const phase of phases.slice(0,-1)){const a=sample(phase.end-1e-7),b=sample(phase.end+1e-7);for(const id of Object.keys(a.points))assert(distance(a.points[id],b.points[id])<1e-5,`${id} jumps at ${phase.label}`);}
 const times=[0,1.2,2.6,4,5.3,6.3,8,9.4,11,duration],saved=times.map(sample);for(let i=times.length-1;i>=0;i--)assert.deepEqual(sample(times[i]),saved[i]);for(const t of [NaN,Infinity,-Infinity])assert.throws(()=>sample(t),/finite/);
});
test('the final supported kneel fits wholly inside the adjacent tile',()=>{
 const s=sample(duration);assert.equal(s.mode,'static kneel');assert(s.balanced);for(const b of s.segments)for(const id of [b.a,b.b]){const p=s.points[id];assert(p[0]-b.radius>=0&&p[0]+b.radius<=1,`${b.name} x=${p[0]}`);assert(Math.abs(p[2])+b.radius<=.5,`${b.name} width`);}assert.deepEqual(sample(duration-.3).points,s.points);
});
test('reported sill and floor contacts touch the named capsule and actual surface',()=>{
 let trunkSamples=0,palmSamples=0;
 for(let i=0;i<=Math.ceil(duration*100);i++){
  const s=sample(i/100);assert(s.contacts.length,`no actual support at ${s.time}`);
  for(const c of s.contacts){const b=s.segments.find(b=>b.name===c.segment);assert(b);const gap=segmentDistance(s.points[b.a],s.points[b.b],c.point,c.point).distance-b.radius;assert(Math.abs(gap)<.00101,JSON.stringify({time:s.time,contact:c,gap}));
   if(c.surface==='sill'){assert.equal(c.point[1],.875);assert(Math.abs(c.point[0])<=.09&&Math.abs(c.point[2])<=.475);if(/pelvis|chest|thigh/.test(c.segment))trunkSamples++;}
   else{assert.equal(c.surface,'ground');assert.equal(c.point[1],0);if(c.segment.startsWith('hand'))palmSamples++;}
  }
 }
 assert(trunkSamples>100,'crossing must geometrically touch the sill');assert(palmSamples>100,'interior palms must actually reach the floor');
});
test('candidate avoids new deep self intersection beyond the unchanged head/chest envelope baseline',()=>{
 // A .14 m neck separating .12/.095 m chest/head capsules has a .075 m
 // structural overlap even when straight. It remains a visible diagnostic;
 // this test does not label that inherited approximation anatomically valid.
 let worst={penetration:0};for(let i=0;i<=Math.ceil(duration*100);i++){const s=sample(i/100);for(const h of collisionReport(s).overlaps){if(h.kind!=='self'||h.a==='chest / upper back'&&h.b==='head')continue;if(h.penetration>worst.penetration)worst={...h,time:s.time};}}assert(worst.penetration<=.02,JSON.stringify(worst));
});

test('sequential palm handoff keeps one declared palm until the other reaches the floor',()=>{
 for(let t=5;t<=6.6;t+=.005){const s=sample(t);assert.ok(s.contacts.some(c=>c.segment.startsWith('hand ')),`both palms unsupported at ${t}`);}
});
