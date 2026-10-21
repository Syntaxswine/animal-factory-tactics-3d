import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,setTerrain,terrainAt,validateMap,parseMap,neighbors,passable} from '../dist/tactics/core/maps.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {extractBlock,openBlock,placeBlock} from '../dist/tactics/core/blocks.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {canopyPresentation,canopyErrors} from '../dist/tactics/editor-canopies.js';
import {paintFoliage} from '../dist/tactics/editor-foliage-brush.js';
import {cliffSurfaceAt} from '../dist/tactics/cliff-map-geometry.js';
import {buildWorld,DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {damageStructure} from '../dist/tactics/structure-health.js';
import {settleStructureCollapse} from '../dist/tactics/structure-collapse.js';
import {mapGeometryRevision} from '../dist/tactics/map-geometry-cache.js';
import {grenadePreview} from '../dist/tactics/grenade-ballistics.js';
import {floorBreachMasks} from '../dist/tactics/floor-breaches.js';
import {biomePlans} from '../dist/tactics/biome-gameplay.js';
import {synchronizeFoliage} from '../dist/tactics/foliage-obstacles.js';
import {traceProjectile} from '../dist/tactics/core/projectiles.js';
import {biomeMixAt,createBiomeMixSampler} from '../dist/tactics/biome-map-paint.js';

function highMap(){
 const m=blankMap('High plateau test');for(let y=10;y<=18;y++)for(let x=10;x<=18;x++)setTerrain(m,x,y,4,'ground-grass');
 m.starts=[{x:10,y:10,z:4},{x:12,y:10,z:4},{x:10,y:12,z:4},{x:12,y:12,z:4}];m.exits=[{x:14,y:14,z:4}];return m;
}

test('legacy maps retain three layers; authoring high terrain expands and round-trips only as needed',()=>{
 const old=blankMap('Legacy'),snapshot=structuredClone(old);assert.deepEqual(parseMap(JSON.stringify(old)),snapshot);
 setTerrain(old,30,30,4,'void');assert.deepEqual(old,snapshot,'erasing absent upper floors does not migrate a map');
 const m=highMap();assert.equal(m.levels,5);assert.equal(m.upper.length,4);assert.deepEqual(validateMap(m),[]);assert.deepEqual(parseMap(JSON.stringify(m)),m);
 for(const n of [2,6,4.5])assert.ok(validateMap({...m,levels:n}).length);assert.ok(validateMap({...m,upper:m.upper.slice(0,3)}).length);
});

test('the selected upper layer can be inspected, edited and undone without changing floors beneath',()=>{
 const d=new EditingDocument().open(JSON.stringify(highMap())),before=d.export();assert.equal(d.inspect(14,12,4).label,'ground-grass');
 assert.ok(d.apply({tool:'texture',start:{x:14,y:12,z:4},options:{groundKind:'ground-dirt'}}).ok);assert.equal(terrainAt(d.map,14,12,4),'ground-dirt');assert.equal(terrainAt(d.map,14,12,0),'yard');assert.equal(terrainAt(d.map,14,12,3),'void');
 assert.ok(d.undo());assert.equal(d.export(),before);assert.ok(d.redo());assert.equal(terrainAt(parseMap(d.export()),14,12,4),'ground-dirt');
});

test('connectivity validation never opts mutable authored maps into live geometry caching',()=>{
 const m=highMap();assert.deepEqual(validateMap(m),[]);assert.equal(mapGeometryRevision(m),undefined);
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)delete m.upper[3][`${14+dx},${14+dy}`];
 assert.ok(validateMap(m).some(e=>e.includes('Unreachable')));assert.equal(mapGeometryRevision(m),undefined);
});

test('high-layer foliage preserves its density and collision through editor export',()=>{
 const m=highMap();paintFoliage(m,{tool:'foliage',start:{x:15,y:15,z:4},end:{x:17,y:17,z:4},options:{foliageDensity:65,foliageBlocked:true,foliageShape:'rectangle'}});
 assert.equal(Object.keys(m.foliage).length,9);assert.equal(passable(m,{x:16,y:16,z:4}),false);assert.deepEqual(parseMap(JSON.stringify(m)),m);
 const obstacles=synchronizeFoliage(m);assert.equal(obstacles.screens.filter(p=>p.z===4).length,9);assert.equal(biomePlans(m,obstacles).find(p=>p.level===4).cells.length,9);
 assert.equal(traceProjectile(m,null,{x:14,y:16,h:13.2},{x:1,y:0,h:0},4,{purpose:'sight'}).kind,'cover');
});

test('one terrain rebuild reuses integer biome samples with exact interpolation and fresh edit results',()=>{
 const m=highMap();let reads=0;m.props=Array.from({length:1284},(_,i)=>({x:i%240,y:100,z:3,get kind(){reads++;return 'cliff-ledge';}}));
 const sampler=createBiomeMixSampler(m,4),expected=biomeMixAt(m,14.25,14.75,4);assert.deepEqual(sampler(14.25,14.75),expected);const warm=reads;
 for(let i=0;i<100;i++)sampler(14+i/101,14+(100-i)/101);assert.equal(reads,warm,'painting within the same four cells never rescans the cliff list');
 for(const [x,y]of [[14.4,14.7],[10,10],[18.8,18.6],[-.25,-.75]])assert.deepEqual(sampler(x,y),biomeMixAt(m,x,y,4));
 m.upper[3]['14,14']='ground-dirt';assert.deepEqual(createBiomeMixSampler(m,4)(14,14),[{family:'dry',weight:1}]);
 m.upper[3]['14,14']='ground-grass';m.props.push({x:14,y:14,z:3,kind:'cliff-ledge',cliffSand:.8});assert.deepEqual(createBiomeMixSampler(m,4)(14,14),biomeMixAt(m,14,14,4));
});

test('high plateau paths stay on their floor and do not step up unmarked stacked cliffs',()=>{
 const m=highMap();for(let z=0;z<4;z++){setTerrain(m,15,15,z,'ground-dirt');m.props.push({kind:'cliff-ledge',x:15,y:15,z,cliffMask:15});}
 assert.deepEqual(validateMap(m),[]);assert.ok(neighbors(m,{x:13,y:13,z:4}).some(q=>q.x===14&&q.y===13&&q.z===4));
 for(let z=0;z<4;z++)assert.equal(passable(m,{x:15,y:15,z}),false);
 assert.ok(neighbors(m,{x:14,y:15,z:0}).every(q=>q.z===0));assert.ok(cliffSurfaceAt(m.props,15,15,3));
 const box=buildWorld(m).boxes.find(b=>b.id==='floor:12,12,4');assert.ok(box);assert.equal(box.center[1],4*DIMENSIONS.floorSpacing-DIMENSIONS.slab/2);
});

test('reusable blocks preserve upper terrain and barriers through extraction and placement',()=>{
 const m=highMap();m.edges['e:16:16:4']='wall-brick';const block=extractBlock(m);assert.equal(block.levels,5);assert.equal(block.upper.length,4);
 const opened=openBlock(block);assert.equal(terrainAt(opened,14,14,4),'ground-grass');assert.equal(opened.edges['e:16:16:4'],'wall-brick');
 const placed=placeBlock(blankMap('Assembly'),block,2,2);assert.equal(terrainAt(placed,62,62,4),'ground-grass');assert.equal(placed.edges['e:64:64:4'],'wall-brick');assert.deepEqual(validateMap(placed),[]);
 const empty=extractBlock(m,1,1);assert.equal(openBlock(empty).levels,5,'an empty high block retains its declared layer capacity');
});

test('the high plateau is visible to its mercs and survives encounter save/load',()=>{
 const s=createGame(42,highMap(),true,'easy',{statSystem:true,awareness:true,social:true});startEncounterClock(s);
 assert.ok(s.units.every(u=>u.z===4));assert.ok(s.visible.has('11,10,4'));const loaded=restoreEncounter(captureEncounter(s,123));
 assert.equal(loaded.upper.length,4);assert.ok(loaded.units.every(u=>u.z===4));assert.deepEqual(captureEncounter(loaded,123),captureEncounter(s,123));
});

test('decorative roofs retain their authored height and do not invent walkable floors',()=>{
 const m=blankMap('Roofs');m.canopies=[{x:30,y:30,z:3,kind:'roof-corrugated-flat'},{x:40,y:40,z:4,kind:'roof-corrugated-flat'}];assert.deepEqual(canopyErrors(m),[]);assert.deepEqual(validateMap(m),[]);
 const presented=canopyPresentation(m);assert.equal(presented.upper[2]['30,30'],'floor');assert.equal(presented.upper[3]['40,40'],'floor');assert.equal(terrainAt(m,30,30,3),'void');assert.equal(terrainAt(m,40,40,4),'void');
 const d=new EditingDocument().open(JSON.stringify(m));assert.equal(d.inspect(30,30,3).type,'prop');assert.ok(d.rotate(d.inspect(30,30,3)).ok);assert.equal(d.map.canopies[0].rotated,true);
});

test('destroying a structural floor on layer five leaves a hole and drops its occupant',()=>{
 const m=highMap();setTerrain(m,10,10,4,'ground-concrete');setTerrain(m,11,10,4,'ground-concrete');const s=createGame(42,m,true,'easy',{statSystem:true}),u=s.units[0];
 u.weapon='grenade';u.ammo.grenade=1;s.seen.add('14,10,4');const preview=grenadePreview(s,u,{x:14,y:10,z:4},{cost:6});assert.equal(preview.reason,'');assert.equal(preview.trajectory.z,4);
 const receipt=damageStructure(s,{x:10,y:10,z:4},200);assert.ok(receipt?.destroyed);assert.equal(terrainAt(s,10,10,4),'void');
 assert.ok(floorBreachMasks(s).has('11,10,4'));
 const fall=settleStructureCollapse(s,[receipt]);assert.equal(fall.falls.length,1);assert.equal(fall.falls[0].height,4);assert.equal(u.z,0);
});
