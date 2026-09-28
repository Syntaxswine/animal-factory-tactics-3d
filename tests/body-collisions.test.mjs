import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {segmentDistance,segmentBoxDistance,collisionReport,envelopeSegments} from '../dist/tactics/body-collisions.js';
import {sampleBracedWindow} from '../dist/tactics/weighted-window-braced.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const profiles=JSON.parse(fs.readFileSync(new URL('../dist/tactics/body-envelope-profiles.json',import.meta.url))).profiles;
test('segment distance handles interior crossing, skew, parallel, endpoints and degenerate axes',()=>{
 close(segmentDistance([-1,0,0],[1,0,0],[0,-1,0],[0,1,0]).distance,0);
 close(segmentDistance([-1,0,0],[1,0,0],[0,-1,3],[0,1,3]).distance,3);
 close(segmentDistance([0,0,0],[2,0,0],[1,2,0],[3,2,0]).distance,2);
 close(segmentDistance([0,0,0],[1,0,0],[2,1,0],[2,2,0]).distance,Math.sqrt(2));
 close(segmentDistance([0,0,0],[0,0,0],[-1,2,0],[1,2,0]).distance,2);
 close(segmentDistance([0,0,0],[0,0,0],[0,3,4],[0,3,4]).distance,5);
});
test('box distance detects crossing with both endpoints outside and exact edge/corner gaps',()=>{
 close(segmentBoxDistance([-2,0,0],[2,0,0],[-1,-1,-1],[1,1,1]),0);
 close(segmentBoxDistance([-2,2,2],[2,2,2],[-1,-1,-1],[1,1,1]),Math.sqrt(2));
 close(segmentBoxDistance([3,3,3],[4,4,4],[-1,-1,-1],[1,1,1]),Math.sqrt(12));
 close(segmentBoxDistance([2,0,0],[2,0,0],[-1,-1,-1],[1,1,1]),1);
});
const fixture=(gap)=>({points:{a:[0,2,0],b:[1,2,0],c:[0,2+.2+gap,0],d:[1,2+.2+gap,0]},segments:[{name:'head',a:'a',b:'b',radius:.1},{name:'chest / upper back',a:'c',b:'d',radius:.1}]});
test('full radii sum, tolerance and near contacts distinguish touching from overlap',()=>{
 assert.equal(collisionReport(fixture(0),null,{solids:[]}).overlaps.length,0);
 assert.equal(collisionReport(fixture(0),null,{solids:[]}).near.length,1);
 assert.equal(collisionReport(fixture(-.0009),null,{solids:[]}).overlaps.length,0);
 close(collisionReport(fixture(-.01),null,{solids:[]}).overlaps[0].penetration,.01);
 assert.equal(collisionReport(fixture(.021),null,{solids:[]}).hits.length,0);
});
test('connected joints excluded but neck does not mask head/chest or head/pelvis',()=>{
 const state=sampleBracedWindow(1.8),report=collisionReport(state);
 assert.ok(report.overlaps.some(h=>h.a==='pelvis / lower back'&&h.b==='head'&&h.penetration>.17));
 assert.ok(report.overlaps.some(h=>h.a==='chest / upper back'&&h.b==='head'&&h.penetration>.2));
 assert.ok(!report.hits.some(h=>h.kind==='self'&&((h.a==='neck'&&h.b==='head')||(h.a==='chest / upper back'&&h.b==='upper arm -1'))));
 assert.ok(!report.hits.some(h=>h.a.includes('bridge')||h.b.includes('bridge')));
});
test('window and floor test the full segment envelope, even with no self pairs',()=>{
 const state={points:{a:[-.5,1.7,0],b:[.5,1.7,0]},segments:[{name:'head',a:'a',b:'b',radius:.1}]};
 assert.ok(collisionReport(state).overlaps.some(h=>h.b==='upper wall'));
 state.points={a:[2,.05,0],b:[3,.05,0]};close(collisionReport(state).overlaps.find(h=>h.kind==='ground').penetration,.05);
});
test('profile radii replace geometry without changing authored pose/mass; invalid profiles reject',()=>{
 const state=sampleBracedWindow(1.8),before=JSON.stringify(state),r=collisionReport(state,profiles.horse);
 assert.equal(JSON.stringify(state),before);
 for(const s of r.segments)if(s.category){assert.equal(s.radius,profiles.horse.radii[s.category]);assert.equal(s.diameter,2*s.radius);}
 assert.ok(r.overlaps.length>collisionReport(state).overlaps.length);
 assert.throws(()=>envelopeSegments(state,profiles.hen),/Unsupported/);
 assert.throws(()=>envelopeSegments(state,{supported:true,radii:{}}),/Invalid/);
});
test('measurements have current source hashes, finite nonzero radii and auditable witnesses',()=>{
 assert.equal(Object.values(profiles).filter(p=>p.supported).length,11);
 for(const p of Object.values(profiles)){
  const raw=fs.readFileSync(new URL('../dist/tactics/'+p.source.file,import.meta.url));assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),p.source.sha256);
  if(!p.supported)continue;
  for(const [key,r]of Object.entries(p.radii)){assert.ok(r>0&&Number.isFinite(r));close(p.diameters[key],r*2);const m=p.measurements[key];assert.ok(m.vertices>0);const [a,b]=m.axisPairs[m.witness.axisIndex];const measured=segmentDistance(m.witness.position,m.witness.position,a,b).distance;assert.ok(Math.abs(measured-r)<.000005);}
 }
});
test('dense diagnostics are deterministic and finite across whole clip and every profile',()=>{
 for(const profile of [null,...Object.values(profiles).filter(p=>p.supported)])for(let t=0;t<5.27;t+=.05){const s=sampleBracedWindow(t),r=collisionReport(s,profile);assert.ok(r.hits.every(h=>Number.isFinite(h.gap)));if(t===0)assert.deepEqual(collisionReport(s,profile),r);}
});
