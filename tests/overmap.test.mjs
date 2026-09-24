import test from 'node:test';
import assert from 'node:assert/strict';
import {anchor,route,blank,demo,validate,warnings,SketchDocument,WIDTH,HEIGHT} from '../dist/tactics/overmap-model.js';
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
