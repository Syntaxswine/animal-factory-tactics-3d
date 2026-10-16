import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,openDoorBetween,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,endTurn,stepEnemy} from '../dist/tactics/core/engine.js';
import {terrainVisibility} from '../dist/tactics/core/visibility.js';
import {synchronizeFoliage,invalidateFoliage} from '../dist/tactics/foliage-obstacles.js';
import {invalidateMapGeometry} from '../dist/tactics/map-geometry-cache.js';
import {damageStructure} from '../dist/tactics/structure-health.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';

function fixture(){
 const map=blankMap('Visibility cache regression');map.starts=[{x:14,y:12},{x:14,y:14},{x:14,y:16},{x:14,y:18}];map.foliage={};
 for(let y=5;y<25;y++)for(let x=5;x<11;x++)map.foliage[`${x},${y},0`]=[65,true,'thicket-v1','trees-v1'];
 map.edges['e:15:12']='door-wood-closed';
 return createGame(1947,map,false,'standard',{statSystem:true});
}
const observers=s=>[s.units[0]];
function agrees(s){const reference=structuredClone(s);assert.deepEqual(terrainVisibility(s,observers(s)),terrainVisibility(reference,observers(reference)));assert.deepEqual(synchronizeFoliage(s),synchronizeFoliage(reference));}
test('live sight and foliage reuse geometry across actor changes without scanning terrain',()=>{
 const s=fixture();let scans=0;Object.defineProperty(s.map,'toJSON',{value(){scans++;return this.map(r=>[...r]);},configurable:true});
 terrainVisibility(s,observers(s));const first=synchronizeFoliage(s),warm=scans;assert.ok(warm>0);
 for(let i=0;i<5;i++){s.units[0].heading+=20;s.units[0].hp--;s.revision++;terrainVisibility(s,observers(s));assert.equal(synchronizeFoliage(s),first);}
 assert.equal(scans,warm);s.units[0].x++;terrainVisibility(s,observers(s));assert.equal(scans,warm);agrees(s);
});
test('doors, destruction, props, upper floors and explicit foliage edits refresh both simulation caches',()=>{
 const s=fixture(),original=terrainVisibility(s,observers(s));assert.ok(!original.has('17,12'));
 assert.ok(openDoorBetween(s,{x:15,y:12},{x:16,y:12}));assert.ok(terrainVisibility(s,observers(s)).has('17,12'));agrees(s);
 s.edges['e:15:12']='wall-concrete';invalidateMapGeometry(s);assert.ok(!terrainVisibility(s,observers(s)).has('17,12'));
 damageStructure(s,{edge:'e:15:12'},200);assert.ok(terrainVisibility(s,observers(s)).has('17,12'));agrees(s);
 s.props.push({kind:'crate-wood',x:15,y:12,z:0});agrees(s);setTerrain(s,15,12,1,'floor');agrees(s);
 s.props=[];setTerrain(s,15,12,1,'void');s.foliage['15,12,0']=[100,true,'thicket-v1'];invalidateFoliage(s);assert.ok(!terrainVisibility(s,observers(s)).has('17,12'));agrees(s);
 delete s.foliage['15,12,0'];invalidateFoliage(s);agrees(s);
});

test('painted prop views and live refresh share foliage until real occupancy changes',()=>{
 const s=fixture();s.props.push({kind:'crate-wood',x:8,y:12,z:0});
 const first=synchronizeFoliage(s),view={...s,coverOccupiedProps:s.props,props:[]};
 for(let i=0;i<3;i++){assert.equal(synchronizeFoliage(view),first);assert.equal(synchronizeFoliage(s),first);}
 s.props.push({kind:'crate-wood',x:8,y:14,z:0});const added=synchronizeFoliage(view);
 assert.notEqual(added,first);assert.equal(synchronizeFoliage(s),added);agrees(s);
 s.props.pop();invalidateMapGeometry(s);const removed=synchronizeFoliage(s);
 assert.notEqual(removed,added);assert.equal(synchronizeFoliage(view),removed);agrees(s);
});
test('untracked maps still detect in-place edits and restored encounters build independent caches',()=>{
 const s=fixture(),mutable=structuredClone(s);terrainVisibility(mutable,observers(mutable));synchronizeFoliage(mutable);
 mutable.edges['e:15:12']='door-wood-open';assert.ok(terrainVisibility(mutable,observers(mutable)).has('17,12'));agrees(mutable);
 const before=synchronizeFoliage(mutable);mutable.foliage['16,12,0']=[100,true,'thicket-v1'];assert.notEqual(synchronizeFoliage(mutable),before);agrees(mutable);
 startEncounterClock(s);const restored=restoreEncounter(captureEncounter(s,0));assert.deepEqual(captureEncounter(restored,0),captureEncounter(s,0));agrees(restored);
});
test('a complete enemy turn has identical actions and save data with live caching or content checks',()=>{
 const map=blankMap('Complete enemy turn');map.starts=[{x:18,y:18},{x:18,y:20},{x:16,y:18},{x:16,y:20}];
 map.guards=[{x:24,y:18,weapon:'pistol',heading:180},{x:24,y:20,weapon:'pistol',heading:180},{x:24,y:22,weapon:'rifle',heading:180}].map(p=>({...p,species:'horse',patrol:[]}));
 const s=createGame(1947,map,true,'easy',{statSystem:true});startEncounterClock(s);const reference=structuredClone(s);
 assert.equal(s.phase,'player');assert.equal(endTurn(s),endTurn(reference));let steps=0;
 while(s.phase==='enemy'&&steps++<250){assert.equal(stepEnemy(s),stepEnemy(reference));assert.deepEqual(s.units,reference.units);assert.equal(s.seed,reference.seed);assert.deepEqual(s.detected,reference.detected);}
 assert.ok(steps>10&&steps<250);assert.equal(s.phase,'player');assert.deepEqual(captureEncounter(s,0),captureEncounter(reference,0));
});
