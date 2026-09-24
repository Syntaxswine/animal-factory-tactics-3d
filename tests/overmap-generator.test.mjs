import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld,validateGenerated,STAGES,neighbor,SETTLEMENT_ZONES} from '../dist/tactics/overmap-generator.js';
import {SketchDocument,demo,tutorialCells} from '../dist/tactics/overmap-model.js';

test('same seed and versioned inputs reproduce the actual arrangement and retry sequence',()=>{
 const trace=[],a=generateWorld(1,{},p=>trace.push(p)),b=generateWorld(1);
 assert.deepEqual(a,b);assert.equal(a.generation.attempt,2);
 const final=trace.filter(p=>p.attempt===a.generation.attempt).map(p=>p.stage);assert.deepEqual(final,STAGES);
 assert.ok(a.generation.version);assert.ok(a.generation.contentLibraryVersion);assert.equal(a.generation.seed,1);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),a);
});
test('seed range produces complete valid worlds, different geography and all tutorial rotations',()=>{
 const shapes=new Set(),rotations=new Set();
 for(const seed of [0,...Array.from({length:30},(_,i)=>i+1),4294967295]){
  const m=generateWorld(seed),report=validateGenerated(m);assert.equal(report.valid,true,`Seed ${seed}: ${report.errors.join('\n')}`);
  assert.deepEqual([report.counts.easy,report.counts.medium,report.counts.hard],[150,150,150]);
  const cities=m.sectors.filter(s=>s.role==='city');assert.equal(new Set(cities.map(s=>s.settlementId)).size,5);
  for(const [zone,rule]of Object.entries(SETTLEMENT_ZONES)){const z=report.counts.zones[zone];assert.equal(z.towns,rule.towns);assert.equal(z.villages,rule.villages);assert.equal(z.cities.length,rule.cities.length);rule.cities.forEach(([min,max],i)=>assert.ok(z.cities[i]>=min&&z.cities[i]<=max));}
  const groups=new Map();m.sectors.forEach((s,i)=>{if(s.settlementId){if(!groups.has(s.settlementId))groups.set(s.settlementId,[]);groups.get(s.settlementId).push(i);}});for(const group of groups.values()){assert.equal(new Set(group.map(i=>m.sectors[i].difficulty)).size,1);if(m.sectors[group[0]].role==='village')assert.equal(group.length,2);}
  rotations.add(m.tutorialPlacement.rotation);shapes.add(JSON.stringify(m.generation.features.map(f=>f.cells)));
  const p=m.tutorialPlacement,cells=tutorialCells(p.x,p.y,p.rotation),town=cells[4].index;
  for(const [i,s]of m.sectors.entries())if(s.settlementId==='town-1')assert.ok(i%30>0&&i%30<29&&Math.floor(i/30)>0&&Math.floor(i/30)<14);
  assert.equal(m.sectors[town].settlementId,'town-1');assert.equal(m.sectors.filter(s=>s.settlementId==='town-1').length,2);
  for(const f of m.generation.features){assert.ok(f.cells.length>=5);const boundary=[];for(const i of f.cells){const r=m.sectors[i].routes.find(r=>r.kind===f.kind);for(const e of [r.from,r.to])if(neighbor(i,e.side)===null)boundary.push(e);}assert.equal(boundary.length,2);}
 }
 assert.equal(rotations.size,4);assert.ok(shapes.size>20);
});
test('zone-controlled settlement counts and facilities survive saving and editor undo',()=>{
 const m=generateWorld(42);assert.deepEqual([m.generation.counts.villages,m.generation.counts.towns,m.generation.counts.cities],[3,4,5]);
 const d=new SketchDocument(demo()),before=structuredClone(d.map);d.replace(m);const saved=JSON.stringify(d.map);d.undo();assert.deepEqual(d.map,before);d.redo();assert.equal(JSON.stringify(d.map),saved);
 assert.equal(validateGenerated(new SketchDocument(JSON.parse(saved)).map).valid,true);
});
test('invalid or exhausted generation never changes the current document',()=>{
 const d=new SketchDocument(demo()),before=JSON.stringify(d.map);
 for(const run of [()=>generateWorld(-1),()=>generateWorld(2,{cities:1}),()=>generateWorld(2,{towns:0}),()=>generateWorld(1,{maxAttempts:1})]){assert.throws(()=>d.replace(run()));assert.equal(JSON.stringify(d.map),before);assert.equal(d.past.length,0);}
 assert.throws(()=>generateWorld(1,{maxAttempts:1}),/failed after 1 deterministic attempts/);
});
test('validation catches broken zones, edges, gates, roads and tutorial escape edits',()=>{
 const base=generateWorld(7);
 const rejected=change=>{const m=structuredClone(base);change(m);const result=validateGenerated(m);assert.equal(result.valid,false);return result.errors.join('\n');};
 assert.match(rejected(m=>m.sectors.find(s=>s.difficulty==='easy').difficulty='hard'),/150|buffer/);
 assert.match(rejected(m=>m.sectors.find(s=>s.gate==='bridge').gate='none'),/bridge count|without a gate|isolated/);
 assert.match(rejected(m=>m.sectors.find(s=>s.role==='fortress').routes=[]),/matching attachment|Roads do not connect/);
 assert.match(rejected(m=>{const s=m.sectors.find(s=>s.tutorialStep===1);s.travel.push(['north','east','south','west'].find(d=>!s.travel.includes(d)));}),/Tutorial|Travel/);
 assert.match(rejected(m=>{const f=m.generation.features[0];m.sectors[f.cells[0]].routes.find(r=>r.kind==='river').from.offset=.5;}),/Invalid properties/);
 assert.match(rejected(m=>m.sectors.find(s=>s.gate==='bridge').gateGuards=16),/guards/);
 assert.match(rejected(m=>{const city=m.sectors.find(s=>s.role==='city'),easy=m.sectors.find(s=>s.role==='countryside'&&s.difficulty==='easy');city.difficulty='easy';easy.difficulty='hard';}),/settlement crosses difficulty zones|city sizes must/);
});
