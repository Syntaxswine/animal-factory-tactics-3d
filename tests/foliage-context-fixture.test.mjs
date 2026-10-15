import test from 'node:test';
import assert from 'node:assert/strict';
import {foliageContextFixture,FOLIAGE_CONTEXT_VIEWS} from '../dist/tactics/foliage-context-fixture.js';
import {BIOME_FAMILIES} from '../dist/tactics/biome-foliage-data.js';
import {parseMap,passable,validateMap} from '../dist/tactics/core/maps.js';
import {buildFoliageObstacles} from '../dist/tactics/foliage-obstacles.js';

for(const family of Object.keys(BIOME_FAMILIES))test(family+' review uses ordinary saveable fields, exact strip and clear horse tile',()=>{
 for(const mode of ['strip','copse']){
  const map=foliageContextFixture(family,mode),saved=JSON.stringify(map);
  assert.deepEqual(parseMap(saved),map);assert.deepEqual(validateMap(map),[]);
  assert.deepEqual(foliageContextFixture(family,mode),map);
  const [x,,y]=FOLIAGE_CONTEXT_VIEWS[mode].horse;assert.equal(passable(map,{x,y,z:0}),true);
  for(const p of [...map.starts,...map.exits])assert.equal(passable(map,p),true);
  if(mode==='strip'){
   assert.equal(Object.keys(map.foliage).length,12);
   for(let x=114;x<=125;x++){
    assert.equal(passable(map,{x,y:118,z:0}),false);
    assert.equal(passable(map,{x,y:117,z:0}),true);
    assert.equal(passable(map,{x,y:119,z:0}),true);
   }
   assert.equal(buildFoliageObstacles(map).trees.length,0,'the thin screen must not borrow a large tree to hide its silhouette');
  }else{
   const trees=buildFoliageObstacles(map).trees,models=new Set(trees.map(t=>t.id));
   assert.ok(models.size>=2,'the natural fixture must show distinct existing tree models');
   assert.ok(Object.values(map.foliage).some(v=>v[1]));assert.ok(Object.values(map.foliage).some(v=>!v[1]));
  }
  assert.equal(JSON.stringify(map),saved,'render/cover planning must not rewrite saved composition');
 }
});
