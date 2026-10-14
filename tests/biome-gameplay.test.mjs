import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {biomePlans,biomeFamilyAt,biomeEnabled,BIOME_TERRAIN} from '../dist/tactics/biome-gameplay.js';
import {BiomeScene,mixedBiomeFill} from '../dist/tactics/biome-scene.js';
import {biomeMixAt,createMapGroundPaint} from '../dist/tactics/biome-map-paint.js';
import {BIOME_FAMILIES} from '../dist/tactics/biome-foliage-data.js';
import {generateEnvironments,localEnvironmentProfile} from '../dist/tactics/environment-regions.js';
import {blank} from '../dist/tactics/overmap-model.js';
import {blankMap,parseMap,passable} from '../dist/tactics/core/maps.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {extractBlock,placeBlock} from '../dist/tactics/core/blocks.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {tilePreview} from '../dist/tactics/editor-tool-previews.js';
import fs from 'node:fs';

function small(size=24){return {terrain:Array.from({length:size},()=>Array(size).fill('ground-grass')),upper:[{},{}],props:[],foliage:{}};}
function cover(map,z=0){const size=map.terrain.length;for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++)if(x!==12)map.foliage[`${x},${y},${z}`]=[100,x<12];return map;}

test('new biome grounds remain walkable; brush, undo, blocks and encounter saves retain their density and passability',()=>{
 const map=blankMap();for(const [i,kind]of Object.keys(BIOME_TERRAIN).entries())map.terrain[10][10+i]=kind;
 const d=new EditingDocument().open(JSON.stringify(map));
 for(const x of [10,11])assert.ok(d.apply({tool:'foliage-cover',start:{x,y:10,z:0},end:{x,y:10,z:0},options:{foliageShape:'square',foliageSize:1,foliageDensity:35,foliageBlocked:x===10}}).ok);
 assert.equal(passable(d.map,{x:10,y:10}),false);assert.equal(passable(d.map,{x:11,y:10}),true);
 const after=d.export();d.undo();d.redo();assert.equal(d.export(),after);assert.deepEqual(parseMap(after),d.map);
 const block=extractBlock(d.map,0,0),destination=placeBlock(blankMap(),block,1,1);assert.equal(destination.terrain[34][34],d.map.terrain[10][10]);assert.deepEqual(destination.foliage['34,34,0'],[35,true]);assert.deepEqual(destination.foliage['35,34,0'],[35,false]);
 const state=createGame(4,d.map,false);startEncounterClock(state);const restored=restoreEncounter(captureEncounter(state));assert.deepEqual(restored.foliage,d.map.foliage);assert.deepEqual(restored.map,d.map.terrain);
 for(const kind of Object.keys(BIOME_TERRAIN))assert.ok(fs.existsSync(new URL('../dist/tactics/'+tilePreview(kind),import.meta.url)));
});
test('legacy terrain, old trees, and manual ground overrides resolve to the correct family without editing the map',()=>{
 const map=small();map.terrain[2][2]='woodland';map.terrain[2][3]='woodland-dense';map.terrain[3][2]='ground-dirt';map.props.push({kind:'tree-pine-large',x:4,y:4,z:0});
 assert.ok(biomeEnabled(map));assert.equal(biomeFamilyAt(map,2,3),'dry');const before=structuredClone(map),plans=biomePlans(map);
 assert.deepEqual(map,before);assert.ok(plans.some(p=>p.blockedAt(3,2)));assert.ok(plans.some(p=>p.passableCells().some(c=>c.x===2&&c.y===2)));
 const field=generateEnvironments(blank(),10);map.environment=localEnvironmentProfile(field,20);map.terrain[2][2]='ground-biome-snow';assert.equal(biomeFamilyAt(map,2,2),'snow');
 map.upper[0]['7,7']='ground-grass';map.props.push({kind:'cliff-ledge',x:7,y:7,z:0,cliffSand:1});assert.equal(biomeFamilyAt(map,7,7,1),'dry');assert.deepEqual(biomeMixAt(map,7,7,1),[{family:'dry',weight:1}]);assert.equal(biomeFamilyAt(map,2,3),'dry');
});
test('the saved mask protects roads, water, objects, absent upper floors and actual ledge heights',()=>{
 const map=cover(small());map.terrain[4][4]='water';map.terrain[4][5]='ground-asphalt';map.props.push({kind:'crate-wood',x:6,y:4,z:0});
 map.upper[0]['5,5']='ground-biome-jungle';map.upper[1]['6,6']='ground-biome-snow';map.props.push({kind:'cliff-ledge',x:5,y:5,z:0,cliffMask:15});map.foliage['5,5,1']=[80,true];map.foliage['6,6,2']=[40,false];
 const plans=biomePlans(map),ground=plans.find(p=>p.level===0),upper=plans.find(p=>p.level===1),top=plans.find(p=>p.level===2);
 for(const [x,y]of [[4,4],[5,4],[6,4],[5,5]])assert.equal(ground.heightAt(x,y),null);
 assert.equal(upper.family,'jungle');assert.equal(upper.heightAt(5,5),2);assert.equal(upper.heightAt(6,5),null);assert.deepEqual(upper.cells,[[5,5]]);
 assert.equal(top.family,'snow');assert.equal(top.passableCells().length,1);assert.equal(ground.blockedAt(12,8),false);
});
test('neighboring sectors share exact ground weights at their common edge, including the texture halo',()=>{
 const field=generateEnvironments(blank(),42),a=small(240),b=small(240);a.environment=localEnvironmentProfile(field,100);b.environment=localEnvironmentProfile(field,101);
 for(const y of [0,10.3,120.7,239])assert.deepEqual(biomeMixAt(a,239.5,y),biomeMixAt(b,-.5,y));
});
test('mixed family surfaces share heights and normals at a boundary',()=>{
 const map=cover(small(32));for(let y=0;y<32;y++)for(let x=0;x<32;x++)map.terrain[y][x]=x<16?'ground-biome-snow':'ground-biome-temperate';
 const plans=biomePlans(map),a=mixedBiomeFill(plans[0],map),b=mixedBiomeFill(plans[1],map);
 for(const y of [4,10,20]){assert.equal(a.height(15.5,y),b.height(15.5,y));assert.deepEqual(a.normal(15.5,y),b.normal(15.5,y));assert.deepEqual(a.color(15.5,y),b.color(15.5,y));}
});
for(const family of Object.keys(BIOME_FAMILIES))test(`${family} uses the same saved mask for its terrain and plants, keeps paths clear, and disposes`,async()=>{
 const map=cover(small());map.terrain=map.terrain.map(row=>row.map(()=>Object.keys(BIOME_TERRAIN).find(k=>BIOME_TERRAIN[k]===family)));
 const scene=new T.Scene(),errors=[],biomes=new BiomeScene(scene,{loadAsync:async()=>new T.Texture()},()=>{},e=>errors.push(e));
 try{assert.equal(biomes.rebuild(map,null,2),false);await biomes.loading;assert.equal(biomes.rebuild(map,null,2),true);assert.equal(errors.length,0);assert.equal(biomes.terrains.length,1);
  const t=biomes.terrains[0];assert.equal(t.stats.blockedCells,242);assert.ok(biomes.instances.length);for(const tree of t.trees)assert.ok(tree.bounds.max[0]<11.5,'Canopy must not cross the clear column');
  const groups=biomes.terrains.map(t=>t.root);biomes.rebuild(map,null,2);assert.deepEqual(biomes.terrains.map(t=>t.root),groups,'unchanged maps reuse their geometry');
  const seen=new Set(['5,5']);biomes.rebuild({...map,concealedInteriors:new Set(['5,5'])},seen,0);const visibility=biomes.layers.get(0).texture;assert.equal(visibility.image.data[5*24+5],0);
  biomes.rebuild(map,seen,0);assert.equal(visibility.image.data[5*24+5],255);assert.equal(visibility.image.data[5*24+6],0);
  for(const material of biomes.layerMaterials.values()){const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};biomes.decorate(material,0,24);material.onBeforeCompile(shader);assert.equal((shader.vertexShader.match(/varying vec2 vBiomeVisibility;/g)||[]).length,1);}
  const texture=biomes.layers.get(0).texture;let released=0;texture.addEventListener('dispose',()=>released++);biomes.dispose();biomes.dispose();assert.equal(released,1);assert.equal(scene.children.length,0);
 }finally{biomes.dispose();}
});
test('ground clones keep shared uniforms out of serialized user data and separate GLSL preprocessor lines',()=>{
 const paint=createMapGroundPaint(small(),0,new T.Texture());try{const clone=paint.ground.clone(),shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};assert.deepEqual(clone.userData,{});paint.ground.onBeforeCompile(shader);assert.doesNotMatch(shader.fragmentShader,/}#define/);assert.ok(shader.uniforms.biomeWeightsA);clone.dispose();}finally{paint.dispose();}
});
test('explicit large trees keep their scale and rotation while hidden plant batches cannot cast revealing shadows',async()=>{
 const map=small(),scene=new T.Scene(),b=new BiomeScene(scene,{loadAsync:async()=>new T.Texture()});map.props=[{kind:'tree-broadleaf-large',x:5,y:5,z:0}];b.load();await b.loading;
 try{b.rebuild(map,null,2);const bounds=()=>b.instances.reduce((box,m)=>box.union(m.boundingBox),new T.Box3()),initial=bounds().getSize(new T.Vector3());
  map.props[0].rotated=true;b.rebuild(map,null,2);const rotated=bounds().getSize(new T.Vector3());assert.ok(Math.abs(initial.x-rotated.z)<1e-5);assert.ok(Math.abs(initial.z-rotated.x)<1e-5);assert.equal(initial.y,rotated.y);
  map.props[0].kind='tree-broadleaf';b.rebuild(map,null,2);assert.ok(Math.abs(initial.y/bounds().getSize(new T.Vector3()).y-1.8)<1e-5);
  b.rebuild(map,new Set(['5,5']),2);const camera=new T.OrthographicCamera(-12,12,12,-12,.1,100);camera.position.set(15,20,15);camera.lookAt(5,0,5);camera.updateProjectionMatrix();b.update(camera,new T.Vector3(5,0,5),40);assert.ok(b.instances.every(m=>!m.castShadow&&m.userData.noShadow));
 }finally{b.dispose();}
});
test('disposing an in-flight asset load releases late textures and does not resurrect a scene',async()=>{
 const scene=new T.Scene(),resolvers=[],textures=[];let ready=0;const biomes=new BiomeScene(scene,{loadAsync:()=>new Promise(r=>resolvers.push(r))},()=>ready++);biomes.load();biomes.dispose();let disposed=0;
 for(const r of resolvers){const t=new T.Texture();t.addEventListener('dispose',()=>disposed++);textures.push(t);r(t);}await biomes.loading;assert.equal(disposed,textures.length);assert.equal(ready,0);assert.equal(scene.children.length,0);
});
