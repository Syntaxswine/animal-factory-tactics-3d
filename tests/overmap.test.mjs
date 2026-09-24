import test from 'node:test';
import assert from 'node:assert/strict';
import {anchor,route,blank,demo,validate,warnings,SketchDocument,WIDTH,HEIGHT,plateauRim,placeTutorial,tutorialCells,randomizeTutorial} from '../dist/tactics/overmap-model.js';
import {point,curve,crossing} from '../dist/tactics/overmap-symbols.js';

test('north one-third to south two-thirds bends east with exact boundary anchors',()=>{
 const r=route('river','north','south',1/3,2/3);
 assert.ok(Math.abs(point(r,0)[0]-100/3)<1e-10);assert.equal(point(r,0)[1],0);assert.ok(Math.abs(point(r,1)[0]-200/3)<1e-10);assert.equal(point(r,1)[1],100);
 assert.ok(point(r,.75)[0]>point(r,.25)[0]);
 const [a,b,c,d]=curve(r);assert.equal(a[0],b[0]);assert.equal(c[0],d[0]);
});
test('opposing boundaries share the same unmirrored offset',()=>{
 for(const offset of [1/3,.5,2/3]){
  assert.equal(anchor({side:'north',offset})[0],anchor({side:'south',offset})[0]);
  assert.equal(anchor({side:'west',offset})[1],anchor({side:'east',offset})[1]);
 }
 const m=blank(),i=31;m.sectors[i].routes=[route('river','north','south',1/3,2/3)];m.sectors[i+WIDTH].routes=[route('river','north','south',2/3,1/3)];
 assert.ok(!warnings(m,i).some(w=>w.includes('south')));
 m.sectors[i+WIDTH].routes[0].from.offset=1/3;
 assert.ok(warnings(m,i).some(w=>w.includes('south ⅔')));
});
test('bridge position follows real path intersection rather than sector center',()=>{
 const a=route('road','west','east'),b=route('river','north','south',1/3,1/3),hit=crossing(a,b);
 assert.ok(Math.abs(hit.x-100/3)<1e-7);assert.ok(Math.abs(hit.y-50)<1e-7);assert.ok(Math.abs(hit.angle)<1e-9);
 assert.equal(crossing(route('river','north','south',1/3,1/3),route('cliff','north','south',2/3,2/3)),null);
});
test('sketch persistence and history retain all properties and routes',()=>{
 const d=new SketchDocument(blank()),initial=structuredClone(d.map);
 d.edit(41,s=>Object.assign(s,{name:'North gate',role:'fortress',owner:'red-hats',terrain:'mountains',gate:'passage',facilities:['workshop'],routes:[route('cliff','west','east'),route('road','north','south')],travel:['north','south']}));
 const saved=JSON.stringify(d.map);assert.deepEqual(validate(JSON.parse(saved)),d.map);
 d.undo();assert.deepEqual(d.map,initial);d.redo();assert.equal(JSON.stringify(d.map),saved);
 d.replace(demo());d.undo();assert.equal(JSON.stringify(d.map),saved);
});
test('invalid imports are atomic and cannot alter undo history',()=>{
 const d=new SketchDocument(),before=JSON.stringify(d.map);
 for(const mutate of [m=>m.width=10,m=>m.sectors.pop(),m=>m.sectors[0].routes=[route('road','north','south',1/3)],m=>m.sectors[0].routes=[route('river','north','north')],m=>m.sectors[0].routes=[route('river','north','south',NaN)],m=>m.sectors[0].owner='<script>',m=>m.sectors[0].travel=['north','north']]){
  const bad=structuredClone(d.map);mutate(bad);assert.throws(()=>d.replace(bad));assert.equal(JSON.stringify(d.map),before);assert.equal(d.past.length,0);
 }
});
test('river continuity never grants travel permissions',()=>{
 const m=blank();m.sectors[31].routes=[route('river','north','south')];m.sectors[61].routes=[route('river','north','south')];
 assert.deepEqual(m.sectors[31].travel,[]);m.sectors[31].travel=['south'];assert.ok(warnings(m,31).some(w=>w.includes('Travel at south')));
 m.sectors[61].travel=['north'];assert.ok(!warnings(m,31).some(w=>w.includes('Travel')));
});
test('example uses correct dimensions and connected river at every seam',()=>{
 const m=validate(demo());assert.equal(m.sectors.length,450);assert.equal(WIDTH,30);assert.equal(HEIGHT,15);
 for(let y=0;y<HEIGHT;y++)assert.ok(!warnings(m,y*WIDTH+7).some(w=>w.startsWith('river')));
 const r=m.sectors[7*WIDTH+7].routes.find(r=>r.kind==='river');assert.equal(r.from.offset,1/3);assert.equal(r.to.offset,2/3);
});

test('example river combines straight stretches and bends while keeping attachments aligned',()=>{
 const rivers=demo().sectors.flatMap(s=>s.routes.filter(r=>r.kind==='river'));
 assert.ok(rivers.filter(r=>r.from.offset===r.to.offset).length>=5);
 assert.ok(rivers.some(r=>r.from.offset<r.to.offset));assert.ok(rivers.some(r=>r.from.offset>r.to.offset));
});
test('tutorial includes the town and preserves TOO / XXO / XSO',()=>{
 const m=demo(),cells=tutorialCells(2,3,0);
 assert.deepEqual(cells.map(c=>[c.x-2,c.y-3]),[[1,2],[0,2],[1,1],[0,1],[0,0]]);
 assert.equal(m.sectors.filter(s=>s.role==='tutorial').length,4);assert.equal(m.sectors[cells[0].index].tutorialStep,1);
 assert.equal(m.sectors[cells[4].index].role,'town');assert.equal(m.sectors[cells[4].index].terrain,'plain');
 assert.equal(cells.slice(0,4).flatMap(c=>plateauRim(m,c.index)).filter(r=>r.opening).length,1);
 for(const c of cells){assert.equal(m.sectors[c.index].difficulty,'easy');assert.deepEqual(warnings(m,c.index),[]);}
});
test('all rotations can be placed wherever occupied cells fit and the town is interior',()=>{
 for(const rotation of [0,90,180,270])for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  let cells;try{cells=tutorialCells(x,y,rotation);}catch{continue;}
  const m=placeTutorial(blank(),x,y,rotation),town=cells[4];assert.ok(town.x>0&&town.x<WIDTH-1&&town.y>0&&town.y<HEIGHT-1);
  assert.equal(cells.length,5);assert.equal(m.sectors[cells[0].index].tutorialStep,1);
 }
 assert.throws(()=>placeTutorial(blank(),0,0,0),/town/);
 assert.doesNotThrow(()=>placeTutorial(blank(),1,HEIGHT-3,0));
});
test('moving and rotating restores underlying sectors, retains edits, and is undoable and portable',()=>{
 const original=blank();original.sectors[3*WIDTH+2].name='Original terrain';const d=new SketchDocument(placeTutorial(original,2,3));
 d.edit(tutorialCells(2,3)[0].index,s=>{s.name='Landing';s.routes=[route('river','north','south',1/3,2/3)];});
 const before=JSON.stringify(d.map);d.replace(placeTutorial(d.map,15,8,90));
 assert.equal(d.map.sectors[3*WIDTH+2].name,'Original terrain');const start=tutorialCells(15,8,90)[0].index;
 assert.equal(d.map.sectors[start].name,'Landing');assert.equal(d.map.sectors[start].routes[0].from.side,'east');
 const copy=validate(JSON.parse(JSON.stringify(d.map)));assert.deepEqual(placeTutorial(copy,2,3,0).sectors,d.past.at(-1).sectors);
 d.undo();assert.equal(JSON.stringify(d.map),before);d.redo();assert.equal(d.map.tutorialPlacement.rotation,90);
 const saved=JSON.stringify(d.map);assert.throws(()=>d.replace(placeTutorial(d.map,0,0)));assert.equal(JSON.stringify(d.map),saved);
});

test('re-randomize changes position and rotation, preserves edits and supports undo',()=>{
 const d=new SketchDocument(demo());d.edit(tutorialCells(2,3)[0].index,s=>s.name='My start');
 for(const value of [0,.25,.5,.75,.999999]){
  const before=structuredClone(d.map),p=before.tutorialPlacement;d.replace(randomizeTutorial(d.map,()=>value));const next=d.map.tutorialPlacement;
  assert.notEqual(next.rotation,p.rotation);assert.ok(next.x!==p.x||next.y!==p.y);
  const cells=tutorialCells(next.x,next.y,next.rotation);assert.equal(d.map.sectors[cells[0].index].name,'My start');
  d.undo();assert.deepEqual(d.map,before);d.redo();
 }
 assert.doesNotThrow(()=>randomizeTutorial(blank(),()=>0));
});
