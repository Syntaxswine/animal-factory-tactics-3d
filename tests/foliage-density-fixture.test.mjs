import test from 'node:test';
import assert from 'node:assert/strict';
import {foliageDensityFixture,foliageDensityCommands,FOLIAGE_DENSITIES,FOLIAGE_DENSITY_FRAMES} from '../dist/tactics/foliage-density-fixture.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {buildFoliageObstacles} from '../dist/tactics/foliage-obstacles.js';
import {parseMap,passable,validateMap} from '../dist/tactics/core/maps.js';

for(const family of ['temperate','jungle','snow','dry','wetlands'])test(family+' large-fill density preserves existing trees and clear routes',()=>{
 let previous=new Map();
 for(const density of FOLIAGE_DENSITIES){
  const map=foliageDensityFixture(family,density),scene=buildFoliageObstacles(map),trees=new Map(scene.trees.map(t=>[`${t.x},${t.y}`,t]));
  assert.deepEqual(validateMap(map),[]);assert.deepEqual(parseMap(JSON.stringify(map)),map);
  assert.equal(Object.keys(map.foliage).length,8463);assert.ok(Object.values(map.foliage).every(c=>c[0]===density&&!c[1]));
  assert.ok(trees.size>previous.size);for(const [key,tree] of previous)assert.deepEqual(trees.get(key),tree,'a higher density must retain existing model, position and cover');
  assert.ok(new Set(scene.trees.map(t=>t.id)).size>=2);
  for(let y=72;y<=167;y++)for(const x of [118,119,120])assert.equal(passable(map,{x,y,z:0}),true,'three-tile route stays open');
  for(let y=72;y<=125;y++)assert.equal(passable(map,{x:148,y,z:0}),true,'one-tile route stays open');
  for(const p of [...map.starts,...map.exits,...Object.values(FOLIAGE_DENSITY_FRAMES).map(f=>({x:f.horse[0],y:f.horse[2],z:0}))])assert.equal(passable(map,p),true);
  previous=trees;
 }
});

test('maximum fills equal actual editor commands and survive undo, redo and reload',()=>{
 for(const growth of ['woodland','thicket']){
  const empty=foliageDensityFixture('wetlands',100,growth,{painted:false}),doc=new EditingDocument().open(JSON.stringify(empty));
  const before=doc.export(),commands=foliageDensityCommands(100,growth);
  for(const command of commands)assert.ok(doc.apply(command).ok);
  const saved=doc.export();assert.deepEqual(JSON.parse(saved).foliage,foliageDensityFixture('wetlands',100,growth).foliage);
  for(const _ of commands)assert.ok(doc.undo());assert.equal(doc.export(),before);
  for(const _ of commands)assert.ok(doc.redo());assert.equal(doc.export(),saved);
  assert.equal(new EditingDocument().open(saved).export(),saved);
 }
});

test('thicket density comparison never silently changes its fixed sight and wood cover',()=>{
 let baseline;
 for(const density of [35,100]){
  const scene=buildFoliageObstacles(foliageDensityFixture('wetlands',density,'thicket'));
  assert.equal(scene.screens.length,8463);assert.ok(scene.trees.length>0);
  const physical={trees:scene.trees,wood:scene.wood,screens:scene.screens};
  if(baseline)assert.deepEqual(physical,baseline);else baseline=physical;
 }
});
