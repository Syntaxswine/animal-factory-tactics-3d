import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BIOME_FAMILIES,BIOME_PLANTS} from '../dist/tactics/biome-foliage-data.js';
import {BIOME_TREE_MIXES,biomeTreeModels,selectBiomeTree} from '../dist/tactics/biome-tree-mix.js';
import {biomePlantParts} from '../dist/tactics/biome-plant-parts.js';
import {BiomeScene} from '../dist/tactics/biome-scene.js';
import {biomeTreeMixFixture} from '../dist/tactics/biome-fixture.js';
import {buildFoliageObstacles} from '../dist/tactics/foliage-obstacles.js';
import {parseMap,passable} from '../dist/tactics/core/maps.js';

test('mixes reuse different authored meshes without changing the canonical species registry',()=>{
 assert.equal(Object.keys(BIOME_PLANTS).length,20);
 for(const [family,mix]of Object.entries(BIOME_TREE_MIXES)){
  const ids=biomeTreeModels(family);assert.ok(ids.length>=3);
  assert.equal(new Set(ids.map(id=>JSON.stringify(biomePlantParts(id,0)))).size,ids.length,'genuine different shapes, not yaw-only variants');
  for(const id of ids){assert.equal(BIOME_PLANTS[id].category,'tree');assert.ok(Number.isInteger(mix[id])&&mix[id]>0);}
  for(const id of BIOME_FAMILIES[family].trees){assert.ok(ids.includes(id));assert.equal(BIOME_PLANTS[id].biome,family,'guest reuse must not replace canonical ownership');}
  assert.ok(ids.includes('temperate-broadleaf')||ids.includes('temperate-pine'),'each habitat includes an original model');
 }
});

test('weighted model choices are stable, varied and seed-dependent',()=>{
 for(const family of Object.keys(BIOME_FAMILIES)){
  const choices=[],different=[];for(let y=-24;y<24;y+=3)for(let x=-24;x<24;x+=3){
   const choice=selectBiomeTree(family,x,y,173);assert.deepEqual(selectBiomeTree(family,x,y,173),choice);
   assert.ok([0,1,2].includes(choice.variant));choices.push(choice);different.push(selectBiomeTree(family,x,y,181));
  }
  assert.deepEqual([...new Set(choices.map(c=>c.id))].sort(),biomeTreeModels(family).sort());assert.notDeepEqual(choices,different);
 }
 assert.throws(()=>selectBiomeTree('missing',0,0),/Unknown tree biome/);
});

for(const family of Object.keys(BIOME_FAMILIES))test(family+' mixes real models in open/dense woods with matching visible trunks and cover',async()=>{
 const map=biomeTreeMixFixture(family),saved=JSON.stringify(map),rules=buildFoliageObstacles(map),scene=new T.Scene(),biomes=new BiomeScene(scene,{loadAsync:async()=>new T.Texture()});
 assert.deepEqual(parseMap(saved),map);assert.deepEqual(buildFoliageObstacles(JSON.parse(saved)).trees,rules.trees);
 const ids=new Set(rules.trees.map(t=>t.id));assert.deepEqual([...ids].sort(),biomeTreeModels(family).sort());
 biomes.load();await biomes.loading;
 try{
  biomes.rebuild(map,null,2,{editor:true});
  const rendered=[...biomes.openTrees.map(t=>[t.x,t.y,t.id]),...biomes.terrains.flatMap(t=>t.trees.map(p=>[p.x,p.z,p.id]))];
  assert.deepEqual(rendered.sort(),rules.trees.map(t=>[t.x,t.y,t.id]).sort());
  const identity=biomes.terrains[0].root;biomes.rebuild(map,null,2,{editor:true});assert.equal(biomes.terrains[0].root,identity);
  for(const t of rules.trees){
   const root=biomes.factory.create(t.id,{variant:t.variant,mature:t.dense});root.position.set(t.x,t.base,t.y);root.updateMatrixWorld(true);
   const actual=new T.Box3().setFromObject(root,true);assert.ok(Math.abs(actual.min.y-t.base)<1e-6);
   const radius=t.dense?3.5:2.5;assert.ok(actual.min.x>=t.x-radius&&actual.max.x<=t.x+radius&&actual.min.z>=t.y-radius&&actual.max.z<=t.y+radius,'fits reserved crown space');
   assert.equal(passable(map,{x:t.x,y:t.y,z:t.z}),false);
   for(const [i,p]of biomePlantParts(t.id,t.variant).entries())if(p.paint==='bark'&&p.shape!=='biome-buttress'&&p.size[0]>=.07){
    const cover=rules.worldBoxes.find(b=>b.id===`foliage:${t.x},${t.y},${t.z}:trunk:${i}`);assert.ok(cover);
    const center=root.children[i].getWorldPosition(new T.Vector3()).toArray(),mid=cover.beam.a.map((v,j)=>(v+cover.beam.b[j])/2);
    assert.ok(center.every((v,j)=>Math.abs(v-mid[j])<1e-6),'physical cover follows the selected rendered branch');
    assert.ok(Math.abs(cover.beam.radius-p.size[0]*t.scale/2)<1e-9);
   }
  }
  for(let y=112;y<144;y++)for(const x of [119,120])assert.equal(passable(map,{x,y,z:0}),true,'walking route stays open');
  assert.equal(JSON.stringify(map),saved,'selection must not rewrite map data');
 }finally{biomes.dispose();}
});
