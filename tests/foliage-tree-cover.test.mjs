import test from 'node:test';
import assert from 'node:assert/strict';
import {foliageDensityFixture} from '../dist/tactics/foliage-density-fixture.js';
import {foliageAt,foliageErrors} from '../dist/tactics/foliage-data.js';
import {buildFoliageObstacles,synchronizeFoliage} from '../dist/tactics/foliage-obstacles.js';
import {paintFoliage} from '../dist/tactics/editor-foliage-brush.js';
import {foliageStrokePreview} from '../dist/tactics/editor-foliage-preview.js';
import {treeCoverSelection} from '../dist/tactics/foliage-tree-cover.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,parseMap,passable,setTerrain} from '../dist/tactics/core/maps.js';
import {extractBlock,placeBlock,validateBlock} from '../dist/tactics/core/blocks.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
const trees=m=>buildFoliageObstacles(m,{treesOnly:true}).trees,key=t=>`${t.x},${t.y},${t.z}`;
const stroke=(mix,extra={})=>({tool:'foliage-cover',start:{x:72,y:72,z:0},end:{x:167,y:167,z:0},options:{foliageShape:'rectangle',foliageMode:'tree-cover',foliageTreeCover:mix,...extra}});

for(const family of ['temperate','jungle','snow','dry','wetlands'])test(family+' saved tree cover matches the approved populations and shared physical geometry',()=>{
 const map=foliageDensityFixture(family,65,'thicket'),before=structuredClone(map);assert.equal(Object.keys(map.foliage).length,8463);
 const baseline=trees(map);assert.equal(baseline.length,73);
 for(const [mix,count]of [['mixed-v1',201],['trees-v1',393]]){
  paintFoliage(map,stroke(mix));assert.deepEqual(foliageErrors(map),[]);assert.equal(trees(map).length,count);
  assert.deepEqual(map.terrain,before.terrain);for(const [k,v]of Object.entries(map.foliage))assert.deepEqual(v.slice(0,3),before.foliage[k]);
  const physical=synchronizeFoliage(map);assert.deepEqual(physical.trees,trees(map));for(const tree of baseline)assert.deepEqual(physical.trees.find(t=>key(t)===key(tree)),tree);
  for(const t of physical.trees)assert.ok(physical.worldBoxes.some(b=>b.id.startsWith('foliage:'+key(t)+':trunk:')&&b.blocksShot));
 }
});
test('a neighbouring mix edit does not shuffle retained candidates or break spacing',()=>{
 const map=foliageDensityFixture('jungle',65,'thicket');paintFoliage(map,stroke('trees-v1'));
 const full=trees(map);const c={...stroke('brush-v1'),end:{x:117,y:167,z:0}};paintFoliage(map,c);
 const changed=trees(map);assert.deepEqual(changed.filter(t=>t.x>117),full.filter(t=>t.x>117));
 for(const a of changed)for(const b of changed)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=2.6);
 paintFoliage(map,{...c,options:{...c.options,foliageTreeCover:'mixed-v1'}});assert.deepEqual(trees(map).filter(t=>t.x>117),full.filter(t=>t.x>117));
});
test('cached tree-only preview matches committed placement and keeps unchanged trees visible',()=>{
 const map=foliageDensityFixture('temperate',65,'thicket'),baseline=trees(map),population={trees:buildFoliageObstacles(map,{treesOnly:true,denseTreeMix:'trees'}).trees,baseline:new Set(baseline.map(key))};
 for(const mix of ['brush-v1','mixed-v1','trees-v1']){
  const c={...stroke(mix),start:{x:102,y:102,z:0},end:{x:113,y:116,z:0}},preview=foliageStrokePreview(map,c,240,baseline,population);
  assert.deepEqual(preview,foliageStrokePreview(map,c,240,baseline));
  if(mix==='brush-v1'){assert.equal(preview.cells.length,0);assert.ok(preview.trees.some(t=>t.change==='retained'));assert.equal(preview.protectedCells.length,0);}
 }
 paintFoliage(map,{...stroke('multiple'),tool:'clear-foliage'});assert.equal(map.foliage,undefined);
});
test('tree-only paint skips clear and protected tiles, keeps density and supports all outdoor levels',()=>{
 const map=blankMap();for(let z=0;z<3;z++)for(let y=10;y<30;y++)for(let x=10;x<30;x++){setTerrain(map,x,y,z,'ground-biome-jungle');(map.foliage||={})[`${x},${y},${z}`]=[35,true,'thicket-v1'];}
 map.props.push({kind:'crate-wood',x:15,y:15,z:2});const ground=structuredClone(map.terrain);
 for(let z=0;z<3;z++)paintFoliage(map,{...stroke('trees-v1'),start:{x:9,y:9,z},end:{x:29,y:29,z}});
 assert.deepEqual(foliageAt(map,15,15,2),[35,true,'thicket-v1']);assert.equal(foliageAt(map,9,9),null);assert.equal(foliageAt(map,20,20,2)[3],'trees-v1');assert.deepEqual(map.terrain,ground);
 const c={...stroke('mixed-v1'),start:{x:20,y:20,z:2},end:{x:29,y:29,z:2}},before=JSON.stringify(map),preview=foliageStrokePreview(map,c,240);assert.equal(JSON.stringify(map),before);paintFoliage(map,c);
 const next=new Map(trees(map).map(t=>[key(t),t]));for(const t of preview.trees)assert.equal(next.has(key(t)),t.change!=='removed');
});
test('undo, JSON, blocks and encounter saving preserve tree versions; malformed versions fail at load',()=>{
 const doc=new EditingDocument().open(JSON.stringify(blankMap())),c={...stroke('trees-v1',{foliageMode:'paint',foliagePreset:'thicket-v1',foliageDensity:65}),start:{x:10,y:10,z:0},end:{x:22,y:22,z:0}};
 const before=doc.export();assert.ok(doc.apply(c).ok);const saved=doc.export();assert.equal(doc.editor.undo.length,1);doc.undo();assert.equal(doc.export(),before);doc.redo();assert.equal(doc.export(),saved);
 assert.deepEqual(parseMap(saved,{allowDisconnected:true}).foliage,doc.map.foliage);
 const block=extractBlock(doc.map);validateBlock(block);const placed=placeBlock(blankMap(),block,2,3);assert.deepEqual(foliageAt(placed,58,82),[65,true,'thicket-v1','trees-v1']);
 const state=createGame(1,doc.map,false);startEncounterClock(state);const record=captureEncounter(state);assert.deepEqual(restoreEncounter(record).foliage,doc.map.foliage);
 for(const v of [[65,true,'thicket-v1','bad'],[65,false,'woodland-v1','trees-v1'],[65,true,'bog-v1','mixed-v1'],[65,true,'thicket-v1',null]]){const bad=structuredClone(doc.map);bad.foliage['10,10,0']=v;assert.throws(()=>parseMap(JSON.stringify(bad)),/tree cover/i);}
 assert.ok(doc.apply({...c,tool:'clear-foliage'}).ok);assert.equal(doc.map.foliage,undefined);
 assert.equal(treeCoverSelection([[65,true,'thicket-v1'],[65,true,'thicket-v1','mixed-v1']]),'multiple');
});
test('legacy tuples remain unchanged after loading, and new mixes leave movement and foliage screens intact',()=>{
 const map=foliageDensityFixture('wetlands',65,'thicket');for(const [k,v]of Object.entries(map.foliage))map.foliage[k]=k.startsWith('80,')?v.slice(0,2):v;
 const saved=JSON.stringify(map),loaded=parseMap(saved,{allowDisconnected:true});assert.deepEqual(loaded.foliage,map.foliage);
 const old=buildFoliageObstacles(map);paintFoliage(map,stroke('trees-v1'));const after=buildFoliageObstacles(map);assert.deepEqual(after.screens,old.screens);assert.deepEqual(after.wood,old.wood);
 assert.equal(passable(map,{x:148,y:104,z:0}),true);assert.equal(passable(map,{x:147,y:104,z:0}),false);
});

test('switching from mixed selections to open woodland ignores the hidden canopy setting',()=>{
 const map=blankMap(),command={...stroke('multiple',{foliageMode:'paint',foliagePreset:'woodland-v1',foliageDensity:35}),start:{x:10,y:10,z:0},end:{x:12,y:12,z:0}};
 paintFoliage(map,command);assert.deepEqual(foliageAt(map,11,11),[35,false,'woodland-v1']);
 assert.throws(()=>paintFoliage(map,{...command,options:{...command.options,foliagePreset:'thicket-v1'}}),/choose one tree-cover/i);
});
