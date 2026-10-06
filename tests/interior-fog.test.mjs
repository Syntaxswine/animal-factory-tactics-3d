import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,stampRoom,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,refresh} from '../dist/tactics/core/engine.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {interiorCells,concealedInteriorCells,knownInteriorRooms} from '../dist/tactics/interior-fog.js';
import {InteriorFogScene} from '../dist/tactics/interior-fog-scene.js';
import {WallXray} from '../dist/tactics/wall-xray.js';
import {terrainKnown} from '../dist/tactics/battle-visibility.js';

function fixture(){
 const map=blankMap('Interior fog');map.starts=[{x:5,y:11},{x:2,y:2},{x:2,y:3},{x:2,y:4}];map.guards=[];
 stampRoom(map,10,8,7,6);for(const edge of Object.keys(map.edges))map.edges[edge]='wall-brick';map.edges['e:9:11']='door-wood-closed';
 const state=createGame(1947,map,true,'easy',{statSystem:true});for(const u of state.units.slice(1))u.away=true;
 state.units[0].heading=0;state.seen.clear();refresh(state);startEncounterClock(state);
 return {map,state,cells:interiorCells(state)};
}

test('rooms follow walls and door/window boundaries, not floor colors, props, fences or open platforms',()=>{
 const {map}=fixture();stampRoom(map,22,8,3,4,1);map.edges['e:21:10:1']='window-concrete';
 for(let y=8;y<14;y++)for(let x=10;x<17;x++)setTerrain(map,x,y,0,'ground-wood-planks');
 setTerrain(map,12,10,0,'crate');map.props.push({x:13,y:10,z:0,kind:'crate-stack'});
 stampRoom(map,30,8,3,3);for(const edge of Object.keys(map.edges))if(Number(edge.split(':')[1])>=29)map.edges[edge]='fence-chainlink';
 for(let y=30;y<35;y++)for(let x=30;x<35;x++){setTerrain(map,x,y,0,'floor');setTerrain(map,x,y,2,'floor');}
 const cells=interiorCells(map);assert.equal(cells.filter(p=>p.z===0).length,42);assert.equal(cells.filter(p=>p.z===1).length,12);assert.equal(cells.filter(p=>p.z===2).length,0);
 assert(cells.some(p=>p.key==='12,10'),'terrain crates remain inside the room');assert.equal(new Set(cells.map(p=>p.room)).size,2);
});

test('a closed door conceals the room on Easy; an actual doorway sightline reveals only the visible portion',()=>{
 const {state,cells}=fixture(),before=structuredClone(state);
 assert.equal(concealedInteriorCells(cells,state).length,42);assert.deepEqual(state,before,'classification must not change exploration or detection');
 const fog=new InteriorFogScene(new T.Scene()),world={};
 try{
  fog.update(state,world);assert.equal(fog.meshes.get(0).count,42);assert.equal(fog.material.color.getHex(),0);assert.equal(fog.meshes.get(0).castShadow,false);assert.equal(fog.meshes.get(0).userData.noShadow,true);
  assert.equal(terrainKnown({...state,concealedInteriors:fog.hidden},'12,11'),false);assert.equal(terrainKnown({...state,concealedInteriors:fog.hidden},'239,239'),true);
  state.edges['e:9:11']='doorway-concrete-open';refresh(state);fog.update(state,{});
  assert(state.visible.has('12,11'));assert(!fog.hidden.has('12,11'));assert(fog.hidden.size<42&&fog.hidden.size>0,'unseen corners must stay concealed');
  state.edges['e:9:11']='door-wood-closed';refresh(state);assert(!state.visible.has('12,11'));fog.update(state,{});assert(!fog.hidden.has('12,11'),'explored scenery stays revealed after the door closes');
 }finally{fog.dispose();}
});

test('windows use the existing aperture and LOS checks; a distant open door does not reveal a room by itself',()=>{
 const {state,cells}=fixture();state.edges['e:9:11']='window-brick';refresh(state);
 assert(state.visible.has('12,11'));assert(!concealedInteriorCells(cells,state).some(p=>p.key==='12,11'));
 state.units[0].x=150;state.units[0].y=150;state.edges['e:9:11']='doorway-concrete-open';state.seen.clear();refresh(state);
 assert.equal(concealedInteriorCells(cells,state).length,42);
 state.units[0].x=12;state.units[0].y=11;state.edges['e:9:11']='door-wood-closed';refresh(state);
 assert(state.visible.has('12,11'),'being inside also reveals the interior');
});

test('rooms on different floors reveal separately and exploration survives save/load without new save fields',()=>{
 const {state}=fixture();stampRoom(state.definition,10,8,7,6,1);state.upper=structuredClone(state.definition.upper);Object.assign(state.edges,Object.fromEntries(Object.keys(state.definition.edges).filter(k=>k.endsWith(':1')).map(k=>[k,'wall-brick'])));
 state.edges['e:9:11']='window-concrete';refresh(state);const cells=interiorCells(state),before=concealedInteriorCells(cells,state).map(p=>p.key);
 assert(!before.includes('12,11'));assert(before.includes('12,11,1'));
 const restored=restoreEncounter(captureEncounter(state));assert.deepEqual(concealedInteriorCells(interiorCells(restored),restored).map(p=>p.key),before);
});

test('Standard does not show black room shapes in unexplored areas; discovering the outside reveals their dark interiors',()=>{
 const {state,cells}=fixture();state.difficulty='standard';state.seen=new Set();state.visible=new Set();
 const fog=new InteriorFogScene(new T.Scene()),world={};
 try{
  fog.update(state,world);assert.equal(fog.meshes.size,0);assert.equal(fog.hidden.size,42);assert.equal(knownInteriorRooms(cells,state).size,0);
  state.seen.add('9,11');fog.update(state,world);assert.equal(fog.meshes.get(0).count,42);assert.equal(fog.hidden.size,42);
  for(const p of cells)state.seen.add(p.key);fog.update(state,world);assert.equal(fog.meshes.size,0);assert.equal(fog.hidden.size,0);
 }finally{fog.dispose();}
});

test('X-ray removes only overhead fog masks; selected and lower unexplored rooms remain black',()=>{
 const {map}=fixture();stampRoom(map,10,8,7,6,1);stampRoom(map,10,8,7,6,2);
 const state={...map,difficulty:'easy',seen:new Set(['12,11']),visible:new Set()},before=structuredClone(state);
 const xray=new WallXray(),fog=new InteriorFogScene(new T.Scene(),xray);
 try{
  fog.update(state,{});assert.deepEqual([...fog.meshes.keys()],[0,1,2]);
  assert.equal(fog.meshes.get(0).material,fog.material,'ground mask always stays black');
  for(const z of [1,2]){
   const shader={uniforms:{},fragmentShader:'#include <clipping_planes_fragment>'};fog.meshes.get(z).material.onBeforeCompile(shader);
   assert.equal(shader.uniforms.xrayThroughLevel.value,z-1);
  }
  xray.setPointer(10,10);for(const level of [2,0,1,2])xray.update(100,100,1,1,level);
  assert(!fog.hidden.has('12,11'));assert(fog.hidden.has('12,11,1'));assert(fog.hidden.has('12,11,2'));
  assert.deepEqual(state,before,'X-ray cannot explore rooms or change LOS');
  fog.update({...state,seen:new Set(interiorCells(state).map(p=>p.key))},{});assert.equal(fog.meshes.size,0);
 }finally{fog.dispose();xray.dispose();}
});
