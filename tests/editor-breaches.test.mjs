import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,parseMap,canStep,passable} from '../dist/tactics/core/maps.js';
import {extractBlock,placeBlock,openBlock,validateBlock} from '../dist/tactics/core/blocks.js';
import {createGame,attackGround} from '../dist/tactics/core/engine.js';
import {wallBreachEnds} from '../dist/tactics/wall-breaches.js';
import {floorBreachMasks} from '../dist/tactics/floor-breaches.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {breachErrors,emptyBreaches} from '../dist/tactics/breach-data.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {BattleGrenades} from '../dist/tactics/battle-grenades.js';

function fixture(){const m=blankMap('Ruins');for(let x=10;x<=16;x++)m.edges[`s:${x}:9`]='wall-brick';for(let y=10;y<=16;y++)for(let x=10;x<=16;x++)m.upper[0][`${x},${y}`]='ground-wood-planks';return m;}
const doc=()=>new EditingDocument().open(JSON.stringify(fixture()));
const wall={tool:'break-wall',start:{x:12,y:9,z:0,edge:'s:12:9'},end:{x:13,y:9,z:0,edge:'s:13:9'}};
const floor={tool:'break-floor',start:{x:12,y:12,z:1},end:{x:13,y:13,z:1}};
const ok=r=>assert.ok(r.ok,r.error);

test('editor previews and commits joined wall and floor breaks in one undoable stroke',()=>{
 const d=doc(),before=d.export();ok(d.preview(wall));assert.equal(d.export(),before);ok(d.apply(wall));
 assert.equal(wallBreachEnds(d.map).size,2);assert.equal(d.map.edges['s:12:9'],undefined);assert.equal(d.inspect(12,9.49,0).data.broken,true);
 const afterWall=d.export();ok(d.apply(floor));assert.equal(Object.keys(d.map.breaches.upper[0]).length,4);assert.equal(floorBreachMasks(d.map).size,8);assert.equal(d.inspect(12,12,1).data.broken,true);
 assert.equal(d.map.structureHealth,undefined);assert.ok(d.undo());assert.equal(d.export(),afterWall);assert.ok(d.undo());assert.equal(d.export(),before);assert.ok(d.redo());assert.ok(d.redo());assert.equal(floorBreachMasks(d.map).size,8);
});

test('saved map, reopened editor and playtest retain authored ruins and their real openings',()=>{
 const d=doc();ok(d.apply(wall));ok(d.apply(floor));const map=parseMap(d.export()),reopened=new EditingDocument().open(d.export());assert.deepEqual(reopened.map.breaches,map.breaches);
 const s=createGame(7,map,true,'easy');startEncounterClock(s);assert.equal(canStep(s,{x:12,y:9,z:0},{x:12,y:10,z:0}),true);assert.equal(passable(s,{x:12,y:12,z:1}),false);
 const restored=restoreEncounter(captureEncounter(s));assert.deepEqual(restored.breaches,map.breaches);assert.deepEqual(wallBreachEnds(restored),wallBreachEnds(map));assert.deepEqual(floorBreachMasks(restored),floorBreachMasks(map));
 const visual=environmentVisuals(buildWorld(restored),restored);assert.equal(visual.filter(v=>v.breachEnds).length,2);assert.equal(visual.filter(v=>v.floorBreach).length,8);
});

test('reusable blocks shift damage coordinates, including perimeter walls, and replacement clears old ruins',()=>{
 const d=doc();ok(d.apply(wall));ok(d.apply(floor));d.editor.map.edges['e:-1:12']='wall-concrete';d.editor.map.edges['e:-1:13']='wall-concrete';d.editor.map.edges['e:-1:14']='wall-concrete';
 ok(d.apply({tool:'break-wall',start:{x:0,y:13,z:0,edge:'e:-1:13'}}));const block=d.capture(0,0);assert.deepEqual(openBlock(block).breaches,block.breaches);
 const placed=placeBlock(blankMap('Placed ruins'),block,2,3);assert.equal(placed.breaches.edges['s:60:81'],'wall-brick');assert.equal(placed.breaches.edges['e:47:85'],'wall-concrete');assert.equal(placed.breaches.upper[0]['60,84'],'ground-wood-planks');
 assert.deepEqual(extractBlock(placed,2,3).breaches,block.breaches);assert.deepEqual(breachErrors(placed),[]);
 const bdoc=new EditingDocument().open(JSON.stringify(block));assert.equal(bdoc.block,true);ok(bdoc.apply({tool:'floor',start:{x:12,y:12,z:1}}));assert.equal(JSON.parse(bdoc.export()).breaches.upper[0]['12,12'],undefined);
 const cleared=placeBlock(placed,extractBlock(blankMap('Clean block')),2,3);assert.equal(Object.keys(cleared.breaches.edges).length,0);assert.equal(Object.keys(cleared.breaches.upper[0]).length,0);
});

test('repair and clean erase deliberately clear damage styling; an ordinary erasure never creates it',()=>{
 const d=doc();ok(d.apply(wall));ok(d.apply(floor));
 ok(d.apply({...wall,tool:'wall',options:{edgeKind:'wall-brick'}}));assert.equal(Object.keys(d.map.breaches.edges).length,0);assert.equal(wallBreachEnds(d.map).size,0);
 ok(d.apply({...floor,tool:'floor'}));assert.equal(d.map.breaches,undefined);ok(d.apply({...floor,tool:'erase-tile'}));assert.equal(floorBreachMasks(d.map).size,0);
 ok(d.apply({...floor,tool:'floor'}));ok(d.apply(floor));ok(d.apply({...floor,tool:'erase-tile'}));assert.equal(d.map.breaches,undefined);assert.equal(d.map.upper[0]['12,12'],undefined);
 ok(d.apply(wall));ok(d.apply({...wall,tool:'erase-edge'}));assert.equal(d.map.breaches,undefined);assert.equal(d.map.edges['s:12:9'],undefined);
});

test('floor breaking protects occupied cells, access links, roof modules and natural cliff support',()=>{
 for(const type of ['guard','prop','ladder','roof','cliff']){
  const m=fixture();if(type==='guard')m.guards=[{x:12,y:12,z:1,species:'horse',weapon:'rifle'}];
  if(type==='prop')m.props=[{x:12,y:12,z:1,kind:'crate-wood'}];
  if(type==='ladder')m.stairs=[{x:12,y:12,z:0,kind:'ladder'}];
  if(type==='roof')m.props=[{x:12,y:12,z:1,kind:'roof-corrugated-flat'}];
  if(type==='cliff')m.props=[{x:12,y:12,z:0,kind:'cliff-ledge',cliffMask:15}];
  const d=new EditingDocument().open(JSON.stringify(m)),before=d.export(),result=d.apply({...floor,end:floor.start});assert.equal(result.ok,false,type);assert.equal(d.export(),before);
 }
 const d=doc();assert.equal(d.apply({tool:'break-floor',start:{x:12,y:12,z:0}}).ok,false);
});

test('invalid ruin references are rejected by maps, blocks and encounter loading',()=>{
 const d=doc();ok(d.apply(wall));ok(d.apply(floor));
 for(const mutate of [b=>b.upper.push({}),b=>b.edges['e:999:1']='wall',b=>b.edges['s:10:9']='wall-brick',b=>b.upper[0]['-1,1']='floor',b=>b.upper[0]['11,11']='floor',b=>b.upper[0]['12,12']='water',b=>b.edges['s:12:9']='door',b=>b.upper[0]=null]){
  const m=JSON.parse(d.export());mutate(m.breaches);assert.throws(()=>parseMap(JSON.stringify(m)),/broken/);
 }
 const b=d.capture(0,0);b.breaches.upper[0]['24,12']='floor';assert.throws(()=>validateBlock(b),/broken/);
 const s=createGame(7,JSON.parse(d.export()),true,'easy');startEncounterClock(s);const save=captureEncounter(s);save.state.breaches.upper[0]['12,12']='water';assert.throws(()=>restoreEncounter(save),/damaged/);
 const legacy=fixture();assert.deepEqual(breachErrors(legacy),[]);legacy.breaches=emptyBreaches();assert.deepEqual(breachErrors(legacy),[]);
});

test('an actual grenade collapses occupied floor and reveals the rim only when its fuse finishes',()=>{
 const m=blankMap('Occupied floor explosion');for(let y=8;y<=22;y++)for(let x=8;x<=22;x++)m.upper[0][`${x},${y}`]='ground-wood-planks';m.stairs=[{x:8,y:8,z:0,kind:'ladder'}];
 m.starts=[{x:14,y:20,z:1,weapon:'grenade',stats:{strength:50,agility:50,dexterity:100,explosives:100}},{x:15,y:14,z:1},{x:14,y:14,z:0},{x:4,y:4,z:0}];
 const s=createGame(92,m,true,'easy',{statSystem:true});startEncounterClock(s);s.phase='player';s.engaged=true;s.rules.awareness=false;s.rules.social=false;s.units[0].ap=18;const belowHp=s.units[2].hp;
 assert.ok(attackGround(s,s.units[0],{x:14,y:14,z:1}));const event=s.effect.sequence[0];assert.ok(event.structures.some(r=>r.destroyed&&r.type==='floor'));assert.ok(event.falls.some(f=>f.id===1));assert.equal(s.units[1].z,0);assert.equal(s.units[2].hp,belowHp,'the intact slab shields the lower occupant from this blast');assert.ok(floorBreachMasks(s).size>0);
 const fx=new BattleGrenades(new T.Scene()),shot={event,phase:{discharged:false}};try{assert.equal(floorBreachMasks(fx.scenery(s,{active:shot,queue:[]})).size,0);shot.phase.discharged=true;assert.deepEqual(floorBreachMasks(fx.scenery(s,{active:shot,queue:[]})),floorBreachMasks(s));}finally{fx.dispose();}
 const saved=restoreEncounter(captureEncounter(s));assert.equal(saved.units[1].z,0);assert.deepEqual(floorBreachMasks(saved),floorBreachMasks(s));
});
