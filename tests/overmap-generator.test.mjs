import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorld,validateGenerated,STAGES,neighbor,SETTLEMENT_ZONES,boundaryOrientation,BOUNDARY_POSITION_WEIGHTS,settlementSpacingErrors} from '../dist/tactics/overmap-generator.js';
import {SketchDocument,demo,tutorialCells,blank,route} from '../dist/tactics/overmap-model.js';

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
  assert.deepEqual(settlementSpacingErrors(m),[]);
  const forts=m.sectors.flatMap((s,i)=>s.role==='fortress'?[i]:[]);for(let a=0;a<forts.length;a++)for(let b=a+1;b<forts.length;b++)assert.ok(Math.max(Math.abs(forts[a]%30-forts[b]%30),Math.abs(Math.floor(forts[a]/30)-Math.floor(forts[b]/30)))>=4);
  const fortress=m.sectors.findIndex(s=>s.role==='fortress'&&s.difficulty==='easy');for(const [i,s]of m.sectors.entries())if(s.settlementId==='town-1')assert.ok(Math.max(Math.abs(i%30-fortress%30),Math.abs(Math.floor(i/30)-Math.floor(fortress/30)))>=4);
  for(const s of m.sectors){const ends=new Set(s.routes.filter(r=>r.kind==='road').flatMap(r=>[r.from.side,r.to.side]).filter(side=>side!=='center'));if(ends.size===1)assert.ok(['city','town','village','fortress'].includes(s.role));}
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

test('boundary selection combines edge length with half weight for east/west positions',()=>{
 assert.deepEqual(BOUNDARY_POSITION_WEIGHTS,{north:1,south:1,east:.5,west:.5});
 assert.equal(boundaryOrientation(()=>.799999),true);assert.equal(boundaryOrientation(()=>.8),false);
 // Equal-sized edges still retain the per-position 2:1 preference.
 assert.equal(boundaryOrientation(()=>.66,20,20),true);assert.equal(boundaryOrientation(()=>.67,20,20),false);
 const choices=Array.from({length:1000},(_,i)=>boundaryOrientation(()=>(i+.5)/1000));assert.equal(choices.filter(Boolean).length,800);
});
test('finished worlds include north/south and east/west river and cliff exits',()=>{
 const edges={river:new Set(),cliff:new Set()};
 for(let seed=0;seed<50;seed++){const m=generateWorld(seed);for(const s of m.sectors)for(const r of s.routes)if(edges[r.kind])for(const p of [r.from,r.to]){const i=m.sectors.indexOf(s);if(neighbor(i,p.side)===null)edges[r.kind].add(p.side);}}
 for(const set of Object.values(edges))assert.deepEqual([...set].sort(),['east','north','south','west']);
});

test('settlement spacing permits own sectors but rejects other settlements at edges or corners',()=>{
 const m=blank(),put=(x,y,role,id)=>Object.assign(m.sectors[y*30+x],{role,settlementId:id});
 put(5,5,'city','city-a');put(6,5,'city','city-a');assert.deepEqual(settlementSpacingErrors(m),[]);
 put(7,5,'town','town-a');assert.match(settlementSpacingErrors(m).join(' '),/one-sector gap/);
 m.sectors[5*30+7]=blank().sectors[0];put(7,6,'city','city-b');assert.match(settlementSpacingErrors(m).join(' '),/diagonally/);
 m.sectors[6*30+7]=blank().sectors[0];put(8,5,'village','village-a');assert.deepEqual(settlementSpacingErrors(m),[]);
 put(7,5,'fortress',undefined);assert.deepEqual(settlementSpacingErrors(m),[]);
});
test('whole-world validation reports a newly placed settlement breaking the gap',()=>{
 const m=generateWorld(7),i=m.sectors.findIndex(s=>s.role==='city'),j=['north','east','south','west'].map(d=>neighbor(i,d)).find(j=>j!==null&&m.sectors[j].role==='countryside');
 assert.notEqual(j,undefined);Object.assign(m.sectors[j],{role:'village',settlementId:'new-village'});
 assert.match(validateGenerated(m).errors.join(' '),/one-sector gap/);
});

test('validator rejects a fortress too near the starting town and detached crossing-style stubs',()=>{
 const base=generateWorld(7),m=structuredClone(base),town=m.sectors.findIndex(s=>s.settlementId==='town-1'),fort=m.sectors.findIndex(s=>s.role==='fortress'&&s.difficulty==='easy');
 const close=m.sectors.findIndex((s,i)=>s.role==='countryside'&&s.difficulty==='easy'&&Math.max(Math.abs(i%30-town%30),Math.abs(Math.floor(i/30)-Math.floor(town/30)))<4);
 assert.ok(close>=0);[m.sectors[fort],m.sectors[close]]=[m.sectors[close],m.sectors[fort]];
 assert.match(validateGenerated(m).errors.join(' '),/at least four sectors/);
 const roads=structuredClone(base),clean=i=>i!==null&&!roads.sectors[i].routes.length&&roads.sectors[i].role==='countryside';
 const a=roads.sectors.findIndex((s,i)=>clean(i)&&clean(neighbor(i,'east'))&&['north','south','west'].every(d=>clean(neighbor(i,d)))&&['north','south','east'].every(d=>clean(neighbor(neighbor(i,'east'),d))));
 assert.ok(a>=0);const b=neighbor(a,'east');roads.sectors[a].routes=[route('road','east','center')];roads.sectors[b].routes=[route('road','west','center')];
 const errors=validateGenerated(roads).errors.join(' ');assert.match(errors,/Orphaned roads/);assert.match(errors,/Road dead ends/);
});

test('validation rejects fortresses placed within four sectors of each other',()=>{
 const m=generateWorld(7),forts=m.sectors.flatMap((s,i)=>s.role==='fortress'?[i]:[]),first=forts[0],second=forts[1];
 const close=['north','east','south','west'].map(side=>neighbor(first,side)).find(i=>i!==null&&m.sectors[i].role==='countryside');assert.notEqual(close,undefined);
 [m.sectors[second],m.sectors[close]]=[m.sectors[close],m.sectors[second]];
 assert.match(validateGenerated(m).errors.join(' '),/Every pair of fortresses must be at least four sectors apart/);
});
