import test from 'node:test';
import assert from 'node:assert/strict';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,validateMap,addStairs,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,stepInvestigation,setState,refresh} from '../dist/tactics/core/engine.js';
import {validateBlock} from '../dist/tactics/core/blocks.js';
import {clickPatrolPoint,patrolError,patrolDestination} from '../dist/tactics/character-patrol.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
const point=(x,y=10,waitSeconds=0,z=0)=>({x,y,z,waitSeconds});
function fixture(tool='guard'){
 const d=new EditingDocument().open(JSON.stringify(blankMap('Patrol test')));
 assert.equal(d.apply({tool,start:{x:10,y:10,z:0},options:{species:'donkey',weapon:'hands'}}).ok,true);
 const id=d.map.guards[0].character.id;d.updateCharacter(id,{character:{faction:'civilians',attitude:'neutral'}});return {d,id};
}
function encounter(d){const s=createGame(6,d.map,false,'easy');startEncounterClock(s);return {s,g:s.units.find(u=>u.team==='guard')};}

test('repeated waypoint clicks add 15 seconds; edits undo/redo and survive map roundtrip',()=>{
 const {d,id}=fixture();let points=clickPatrolPoint([],point(12));assert.equal(points[0].waitSeconds,0);d.setPatrol(id,points);
 points=clickPatrolPoint(points,point(12));d.setPatrol(id,points);points=clickPatrolPoint(points,point(12));d.setPatrol(id,points);
 assert.equal(d.character(id).p.patrol[0].waitSeconds,30);d.undo();assert.equal(d.character(id).p.patrol[0].waitSeconds,15);d.redo();
 d.updateCharacter(id,{character:{canTalk:true,dialogueRef:'guard_intro'}});const loaded=new EditingDocument().open(d.export());assert.deepEqual(loaded.character(id).p.patrol,[point(12,10,30)]);assert.equal(loaded.character(id).p.character.canTalk,true);
 d.setPatrol(id,[]);assert.equal(d.character(id).p.patrol,undefined);d.undo();assert.deepEqual(d.character(id).p.patrol,[point(12,10,30)]);
});
test('duplication and reusable blocks translate waypoints without sharing identities or arrays',()=>{
 const {d,id}=fixture();d.setPatrol(id,[point(12,11,15),point(15,13,30)]);
 const copy=d.duplicateCharacter(id,{x:30,y:30,z:0});assert.deepEqual(d.character(copy).p.patrol,[point(32,31,15),point(35,33,30)]);
 const block=d.capture(0,0);d.place(block,2,2);const g=d.map.guards.find(p=>p.x===58&&p.y===58);assert.notEqual(g.character.id,id);assert.deepEqual(g.patrol,[point(60,59,15),point(63,61,30)]);
 const reopened=new EditingDocument().open(JSON.stringify(d.capture(2,2)));assert.deepEqual(reopened.map.guards[0].patrol,[point(12,11,15),point(15,13,30)]);
 reopened.setPatrol(g.character.id,[point(13,11)]);assert.equal(g.patrol[0].waitSeconds,15);
});
test('invalid or obstructed waypoints reject atomically, block paths cannot escape their block',()=>{
 const {d,id}=fixture(),before=d.export();
 for(const points of [[point(-1)],[point(240)],[point(10,10,1)],[point(10,10,0,3)],[point(12),point(12)],[{...point(12),waitSeconds:NaN}]])assert.throws(()=>d.setPatrol(id,points),/Patrol|patrol|Duplicate/);
 assert.equal(d.export(),before);assert.equal(patrolError(undefined),'');
 const map=structuredClone(d.map);map.terrain[10][15]='water';d.replace(map);assert.throws(()=>d.setPatrol(id,[point(15)]),/walkable/);
 d.setPatrol(id,[point(30)]);assert.throws(()=>validateBlock(d.capture(0,0)),/inside/);
});
test('playtest validation reports a waypoint inside a sealed roofed room, but draft editing remains possible',()=>{
 const {d,id}=fixture(),map=structuredClone(d.map);Object.assign(map.edges,{'e:19:20':'wall','e:20:20':'wall','s:20:19':'wall','s:20:20':'wall'});map.upper[0]['20,20']='floor';d.replace(map);d.setPatrol(id,[point(20,20)]);
 assert.deepEqual(validateMap(d.map,{connectivity:false}),[]);assert(validateMap(d.map).some(e=>e.includes('patrol waypoint at 20,20')));
});
test('guards walk between flags, wait on the game clock and loop without charging squad AP',()=>{
 const {d,id}=fixture();d.setPatrol(id,[point(12,10,15),point(10)]);const {s,g}=encounter(d),ap=s.units[0].ap;
 assert.equal(stepInvestigation(s),true);assert.equal(g.x,11);stepInvestigation(s);assert.equal(g.x,12);assert.equal(g.patrolWaitUntil,480.25);
 for(let n=0;n<20;n++)stepInvestigation(s);assert.equal(g.x,12);s.clock.minutes+=.24;stepInvestigation(s);assert.equal(g.x,12);
 s.clock.minutes+=.01;stepInvestigation(s);assert.equal(g.x,11);stepInvestigation(s);assert.equal(g.x,10);stepInvestigation(s);assert.equal(g.x,11);assert.equal(s.units[0].ap,ap);
});
test('calm NPCs patrol, combat and fear take precedence, and dead guards stay still',()=>{
 const {d,id}=fixture('npc');d.setPatrol(id,[point(12),point(10)]);const {s,g}=encounter(d);
 stepInvestigation(s);assert.equal(g.x,11);s.phase='player';assert.equal(stepInvestigation(s),false);assert.equal(g.x,11);
 s.phase='explore';g.npcFrightened=true;g.npcFearTicks=999;g.state='cowering';stepInvestigation(s);assert.equal(g.x,11);
 g.npcFrightened=false;g.state='rest';stepInvestigation(s);assert.equal(g.x,12);g.hp=0;stepInvestigation(s);assert.equal(g.x,12);
});
test('patrol walks around obstacles and uses stairs for authored upper-level waypoints',()=>{
 const {d,id}=fixture(),map=structuredClone(d.map);map.terrain[10][11]='water';addStairs(map,12,10,0);setTerrain(map,13,10,1,'floor');d.replace(map);d.setPatrol(id,[point(13,10,15,1)]);const {s,g}=encounter(d);
 for(let n=0;n<15;n++){stepInvestigation(s);assert(!(g.x===11&&g.y===10&&g.z===0));}
 assert.deepEqual({x:g.x,y:g.y,z:g.z},{x:13,y:10,z:1});assert.equal(g.patrolWaitUntil,480.25);
});
test('hostile guards interrupt a patrol for an investigation instead of marching past the alarm',()=>{
 const {d,id}=fixture();d.updateCharacter(id,{character:{faction:'red-hats',attitude:'hostile'}});d.setPatrol(id,[point(14),point(10)]);const {s,g}=encounter(d);
 stepInvestigation(s);const x=g.x;setState(s,g,'suspicious',{x:10,y:15,z:0});stepInvestigation(s);assert(g.y>10);assert(g.x<=x);assert.equal(g.patrolIndex,0);
});
test('encounter save/load preserves patrol progress and rejects corrupt wait/cursor data',()=>{
 const {d,id}=fixture();d.setPatrol(id,[point(11,10,30),point(10)]);const {s,g}=encounter(d);stepInvestigation(s);s.clock.minutes+=.25;
 const record=captureEncounter(s),loaded=restoreEncounter(record),copy=loaded.units.find(u=>u.team==='guard');assert.deepEqual(copy.patrol,g.patrol);assert.equal(copy.patrolWaitUntil,480.5);stepInvestigation(loaded);assert.equal(copy.x,11);loaded.clock.minutes+=.25;stepInvestigation(loaded);assert.equal(copy.x,10);
 for(const patch of [{patrolIndex:9},{patrolWaitUntil:Infinity},{patrol:[point(300)]}]){const bad=structuredClone(record);Object.assign(bad.state.units.find(u=>u.team==='guard'),patch);assert.throws(()=>restoreEncounter(bad),/damaged/);}
});
test('a single waypoint settles at its flag; legacy guards have no invented patrol',()=>{
 const {d}=fixture();const {s,g}=encounter(d);assert.equal(g.patrol,undefined);stepInvestigation(s);assert.equal(g.x,10);
 g.patrol=[point(10,10,15)];assert.equal(patrolDestination(s,g),null);s.clock.minutes+=10;assert.equal(patrolDestination(s,g),null);assert.equal(g.patrolIndex,0);
});
