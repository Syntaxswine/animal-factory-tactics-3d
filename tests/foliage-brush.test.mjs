import test from 'node:test';
import assert from 'node:assert/strict';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,setTerrain,passable,validateMap} from '../dist/tactics/core/maps.js';
import {extractBlock,placeBlock,validateBlock} from '../dist/tactics/core/blocks.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {terrainVisibility} from '../dist/tactics/core/visibility.js';
import {woodlandDepth} from '../dist/tactics/core/woodland.js';
import {foliageAt,foliageErrors} from '../dist/tactics/foliage-data.js';
import {coverUndergrowth} from '../dist/tactics/foliage-models.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {materialKind} from '../dist/tactics/hybrid-materials.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
const open=map=>new EditingDocument().open(JSON.stringify(map));
const stroke=(options={},start={x:10,y:10,z:0},end=start,path)=>({tool:'foliage-cover',start,end,path,options:{foliageShape:'square',foliageSize:1,foliageDensity:65,foliageBlocked:false,...options}});
const parts=map=>environmentVisuals(buildWorld(map),map).filter(p=>p.kind==='foliage-cover');

test('wide freehand brush interpolates a bent stroke, previews without mutation and undoes as one edit',()=>{
 const d=open(blankMap()),before=d.export(),start={x:40,y:40,z:0},end={x:100,y:100,z:0},c=stroke({foliageSize:17},start,end,[start,{x:100,y:40,z:0},end]);
 const preview=d.preview(c);assert.ok(preview.ok,preview.error);assert.equal(d.export(),before);assert.ok(preview.cells.length>2200);
 assert.ok(d.apply(c).ok);assert.equal(d.editor.undo.length,1);for(const p of [[40,40],[70,40],[100,70],[100,100]])assert.deepEqual(foliageAt(d.map,...p),[65,false]);
 assert.equal(foliageAt(d.map,70,70),null,'bent paths must not become a bounding rectangle');assert.equal(foliageAt(d.map,70,49),null);
 const after=d.export();d.undo();assert.equal(d.export(),before);d.redo();assert.equal(d.export(),after);
});
test('round brush clips to map edges and paints thousands of cells without filling empty upper layers',()=>{
 const d=open(blankMap());assert.ok(d.apply(stroke({foliageShape:'round',foliageSize:63},{x:0,y:0,z:0})).ok);
 assert.ok(foliageAt(d.map,20,20));assert.equal(foliageAt(d.map,31,31),null);assert.deepEqual(foliageErrors(d.map),[]);
 assert.equal(d.apply(stroke({foliageShape:'round',foliageSize:63},{x:80,y:80,z:2})).ok,false);
 assert.ok(d.apply(stroke({foliageShape:'rectangle'},{x:100,y:100,z:0},{x:199,y:199,z:0})).ok);
 assert.ok(Object.keys(d.map.foliage).length>10000);assert.equal(open(JSON.parse(d.export())).export(),d.export());
});
test('density and movement are independent, with monotonic stable visual sampling and density-scaled concealment',()=>{
 const d=open(blankMap()),start={x:10,y:10,z:0},end={x:23,y:23,z:0};
 assert.ok(d.apply(stroke({foliageShape:'rectangle',foliageDensity:20,foliageBlocked:true},start,end)).ok);
 const sparse=parts(d.map);assert.ok(sparse.length>40&&sparse.length<120);assert.equal(passable(d.map,start),false);
 assert.equal(passable({...d.map,knowledge:new Set()},start),true,'unexplored foliage must not leak into path previews');
 assert.equal(passable({...d.map,knowledge:new Set(['10,10'])},start),false);
 const depth=woodlandDepth(d.map,start,{x:20,y:10,z:0});assert.ok(Math.abs(depth-2)<1e-9);
 assert.ok(d.apply(stroke({foliageShape:'rectangle',foliageDensity:20,foliageBlocked:false},start,end)).ok);
 assert.equal(passable(d.map,start),true);assert.deepEqual(parts(d.map),sparse,'movement flag must not alter the plants');
 assert.ok(d.apply(stroke({foliageShape:'rectangle',foliageDensity:100,foliageBlocked:false},start,end)).ok);
 const full=parts(d.map);assert.equal(full.length,14*14*2);assert.ok(sparse.every(p=>full.some(q=>JSON.stringify(q)===JSON.stringify(p))));
 assert.equal(woodlandDepth(d.map,start,{x:20,y:10,z:0}),10);assert.equal(passable(d.map,start),true);
});
test('plant habitats follow ground textures and sandy cliff caps while clearing restores the original surface',()=>{
 const map=blankMap();setTerrain(map,11,10,0,'ground-dirt');setTerrain(map,12,10,0,'ground-gravel');
 setTerrain(map,13,10,1,'ground-grass');map.props.push({kind:'cliff-ledge',x:13,y:10,z:0,cliffSand:1,cliffMask:15});
 const d=open(map);for(const p of [{x:10,y:10,z:0},{x:11,y:10,z:0},{x:12,y:10,z:0},{x:13,y:10,z:1}])assert.ok(d.apply(stroke({foliageDensity:100},p)).ok);
 assert.deepEqual(d.map.terrain,map.terrain);assert.deepEqual(d.map.upper,map.upper);
 const visuals=parts(d.map);assert.ok(visuals.filter(p=>p.source.x===10).every(p=>['foliage','leaf-light','leaf-olive'].includes(p.material)));
 for(const x of [11,12,13])assert.ok(visuals.filter(p=>p.source.x===x).every(p=>['leaf-dry','leaf-sage','leaf-olive'].includes(p.material)&&p.size[1]<.75&&materialKind(p)===p.material));
 assert.ok(d.apply({tool:'texture',start:{x:11,y:10,z:0},options:{groundKind:'ground-grass'}}).ok);
 assert.ok(parts(d.map).filter(p=>p.source.x===11).every(p=>['foliage','leaf-light','leaf-olive'].includes(p.material)));
 const c=stroke({foliageShape:'rectangle'},{x:10,y:10,z:0},{x:12,y:10,z:0});assert.ok(d.apply({...c,tool:'clear-foliage'}).ok);
 assert.equal(d.map.terrain[10][10],'yard');assert.equal(d.map.terrain[10][12],'ground-gravel');assert.equal(foliageAt(d.map,12,10),null);assert.ok(foliageAt(d.map,13,10,1));
});
test('ordinary ground painting and lowering terrain remove unsupported foliage without orphaned save data',()=>{
 const d=open(blankMap());assert.ok(d.apply(stroke()).ok);assert.ok(d.apply({tool:'water',start:{x:10,y:10,z:0}}).ok);assert.equal(d.map.foliage,undefined);
 const c={tool:'land',start:{x:40,y:40,z:0},options:{landSize:9,landShape:'square',landHeight:1,groundKind:'ground-grass'}};
 assert.ok(d.apply(c).ok);assert.ok(d.apply(stroke({}, {x:40,y:40,z:1})).ok);assert.ok(d.apply({...c,options:{...c.options,landHeight:0}}).ok);
 assert.equal(d.map.foliage,undefined);assert.deepEqual(validateMap(d.map,{connectivity:false}),[]);
});
test('blocks relocate and replace overlays, and malformed density, coordinates or terrain fail loading',()=>{
 const map=blankMap();setTerrain(map,10,10,2,'ground-gravel');const d=open(map);assert.ok(d.apply(stroke({foliageDensity:35,foliageBlocked:true},{x:10,y:10,z:2})).ok);
 const block=extractBlock(d.map);validateBlock(block);const copy=placeBlock(blankMap(),block,2,3);assert.deepEqual(foliageAt(copy,58,82,2),[35,true]);assert.equal(foliageAt(copy,10,10,2),null);
 const replaced=placeBlock(copy,extractBlock(blankMap()),2,3);assert.equal(replaced.foliage,undefined);
 for(const foliage of [{'10,10,2':[101,false]},{'10,10,2':[20,1]},{'10,10,3':[50,true]},{'10,11,2':[60,false]},{'010,10,2':[50,true]}]){
  assert.throws(()=>open({...d.map,foliage}),/foliage/i);assert.throws(()=>validateBlock({...block,foliage}),/foliage/i);
 }
});
test('clearing and undoing a block stroke remove its previous exported foliage metadata',()=>{
 const d=open(extractBlock(blankMap())),before=d.export();assert.ok(d.apply(stroke()).ok);
 const painted=d.export();assert.ok(d.undo());assert.equal(d.export(),before);assert.equal(foliageAt(d.map,10,10),null);
 assert.ok(d.redo());assert.equal(d.export(),painted);assert.ok(d.apply({...stroke(),tool:'clear-foliage'}).ok);
 assert.equal(d.export(),before);assert.ok(d.undo());assert.equal(d.export(),painted);
});
test('encounter save/load retains independent controls and rejects malformed live overlay data',()=>{
 const d=open(blankMap());assert.ok(d.apply(stroke({foliageDensity:30,foliageBlocked:true})).ok);const s=createGame(1,d.map,false);startEncounterClock(s);
 const record=captureEncounter(s),loaded=restoreEncounter(record);assert.deepEqual(foliageAt(loaded,10,10),[30,true]);assert.equal(passable(loaded,{x:10,y:10,z:0}),false);
 record.state.foliage['10,10,0']=[0,true];assert.throws(()=>restoreEncounter(record),/damaged/);
});
test('visibility cache includes foliage edits while legacy woodland preserves concealment and movement',()=>{
 const s=createGame(1,blankMap(),false),observer={...s.units[0],x:10,y:10,heading:0,cone:360};
 const before=terrainVisibility(s,[observer]);assert.ok(before.has('30,10'));
 s.foliage={};for(let x=11;x<=29;x++)for(let y=9;y<=11;y++)s.foliage[`${x},${y},0`]=[100,false];
 const after=terrainVisibility(s,[observer]);assert.equal(after.has('30,10'),false);
 const old=blankMap();old.terrain[10][10]='woodland';old.terrain[10][11]='woodland-dense';assert.deepEqual(foliageAt(old,10,10),[100,false]);assert.deepEqual(foliageAt(old,11,10),[100,true]);
 assert.equal(passable(old,{x:10,y:10}),true);assert.equal(passable(old,{x:11,y:10}),false);
 const d=open(old);assert.ok(d.apply(stroke({foliageDensity:40,foliageBlocked:false},{x:11,y:10,z:0})).ok);assert.equal(passable(d.map,{x:11,y:10}),true);
});
