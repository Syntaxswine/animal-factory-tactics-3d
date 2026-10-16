import test from 'node:test';
import assert from 'node:assert/strict';
import {foliageCompositionFixture} from '../dist/tactics/foliage-composition-fixture.js';
import {buildFoliageObstacles,synchronizeFoliage,traceFoliage} from '../dist/tactics/foliage-obstacles.js';
import {biomePlans} from '../dist/tactics/biome-gameplay.js';
import {foliageAt} from '../dist/tactics/foliage-data.js';
import {validateMap} from '../dist/tactics/core/maps.js';

const treeKey=t=>`${t.x},${t.y},${t.z}`;
for(const family of ['jungle','temperate','dry','wetlands','snow'])test(family+' composition adds nested trees without moving the undergrowth or routes',()=>{
 const baseline=foliageCompositionFixture(family,'current');
 assert.equal(baseline.obstacles.trees.length,73);assert.deepEqual(validateMap(baseline.map),[]);
 let previous=baseline.obstacles.trees;
 for(const mix of ['mixed','trees']){
  const {map,obstacles}=foliageCompositionFixture(family,mix),trees=new Map(obstacles.trees.map(t=>[treeKey(t),t]));
  assert.deepEqual(map,baseline.map,'preview must not write new settings into the saved map');
  assert.deepEqual(obstacles.screens,baseline.obstacles.screens);assert.deepEqual(obstacles.wood,baseline.obstacles.wood);
  assert.ok(trees.size>previous.length);assert.equal(trees.size,obstacles.trees.length);
  for(const tree of previous)assert.deepEqual(trees.get(treeKey(tree)),tree,'existing model, variant and location must stay fixed');
  const old=new Set(baseline.obstacles.trees.map(treeKey));
  for(const tree of obstacles.trees)if(!old.has(treeKey(tree))){
   for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)assert.equal(foliageAt(map,tree.x+dx,tree.y+dy,tree.z)?.[1],true,'tree clearance must stay inside blocked tiles');
   for(const other of obstacles.trees)if(other!==tree)assert.ok(Math.hypot(other.x-tree.x,other.y-tree.y)>=2.6,'new trunks must not land atop another tree');
   assert.ok(obstacles.worldBoxes.some(b=>b.id.startsWith(`foliage:${tree.x},${tree.y},${tree.z}:trunk:`)&&b.blocksShot&&b.blocksSight),'every added tree needs matching solid wood');
  }
  assert.deepEqual(biomePlans(map,obstacles).flatMap(p=>p.trees),obstacles.trees,'art must consume the private physical tree set');
  previous=obstacles.trees;
 }
});

test('preview selection is deterministic, leaves ordinary caches alone, and supplies traceable tree cover',()=>{
 const {map,obstacles}=foliageCompositionFixture('jungle','trees'),ordinary=synchronizeFoliage(map),before=structuredClone(map);
 assert.deepEqual(buildFoliageObstacles(map,{denseTreeMix:'trees'}).trees,obstacles.trees);
 assert.deepEqual(buildFoliageObstacles(map).trees,ordinary.trees);
 biomePlans(map,obstacles);
 assert.equal(synchronizeFoliage(map),ordinary);assert.equal(ordinary.trees.length,73);assert.deepEqual(map,before);
 const old=new Set(ordinary.trees.map(treeKey)),tree=obstacles.trees.find(t=>!old.has(treeKey(t))),beam=obstacles.worldBoxes.find(b=>b.id.startsWith(`foliage:${tree.x},${tree.y},${tree.z}:trunk:`));
 const mid=beam.beam.a.map((v,i)=>(v+beam.beam.b[i])/2),hit=traceFoliage(obstacles,mid.map((v,i)=>v-(i===0?.3:0)),mid.map((v,i)=>v+(i===0?.3:0)),'shot','world');
 assert.ok(hit?.box.blocksShot);
});

test('extra trees respect newly placed objects, start positions and missing headroom',()=>{
 const {map,obstacles}=foliageCompositionFixture('jungle','trees'),old=new Set(buildFoliageObstacles(map).trees.map(treeKey)),extras=obstacles.trees.filter(t=>!old.has(treeKey(t)));
 const [prop,start,ceiling]=extras.filter((t,i,a)=>!a.slice(0,i).some(c=>Math.hypot(c.x-t.x,c.y-t.y)<9)).slice(0,3);
 assert.ok(ceiling);map.props.push({kind:'crate-wood',x:prop.x,y:prop.y,z:0});map.starts.push({x:start.x,y:start.y,z:0});map.upper[0][`${ceiling.x},${ceiling.y}`]='floor-concrete';
 const trees=buildFoliageObstacles(map,{denseTreeMix:'trees'}).trees;
 for(const blocked of [prop,start,ceiling])assert.ok(!trees.some(t=>treeKey(t)===treeKey(blocked)));
});

test('unknown preview mixes are rejected',()=>{
 assert.throws(()=>foliageCompositionFixture('jungle','bogus'),/composition/);
 assert.throws(()=>buildFoliageObstacles({}, {denseTreeMix:'bogus'}),/tree mix/);
});
