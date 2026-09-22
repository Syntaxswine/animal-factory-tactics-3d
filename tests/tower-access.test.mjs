import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWERS,towerCenter,towerEntry,towerSlots,towerPost,towerForUnit,towerBlocksSegment,unitBaseHeight} from '../dist/tactics/tower-geometry.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,validateMap} from '../dist/tactics/core/maps.js';
import {createGame,canSee,visibleZones,movementNeighbors,pathTo,refresh,boundedRoute} from '../dist/tactics/core/engine.js';
import {traceProjectile,bulletTrajectory} from '../dist/tactics/core/projectiles.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {climbTower,towerClimbPreview} from '../dist/tactics/tower-actions.js';
const kinds=Object.keys(TOWERS);
function fixture(kind,rotated=false){const map=blankMap('Tower access');map.time={startMinutes:1260};const p={kind,x:10,y:10,z:0,rotated,lightMode:'on',lightTargets:[{x:2,y:22,z:0}]};map.props=[p];return {map,p};}
function world(p,x,h,y){const c=towerCenter(p);return {x:c.x+(p.rotated?-y:x),y:c.y+(p.rotated?x:y),h:h+c.z*3};}
test('guardhouse windows and doors pass rays; posts, sills, floors and roofs stop them in both rotations',()=>{
 for(const kind of kinds.filter(k=>k.startsWith('iron')))for(const rotated of [false,true]){
  const p={kind,x:10,y:10,z:1,rotated};
  for(const [x,h,blocked]of [[-.25,7.7,false],[-.95,7.7,true],[-.25,7,true],[-.25,8.27,true]])assert.equal(towerBlocksSegment(p,world(p,x,h,3),world(p,x,h,0)),blocked,kind);
  assert.equal(towerBlocksSegment(p,world(p,2,7.4,-.8),world(p,-.4,7.4,-.8)),false);
  assert.equal(towerBlocksSegment(p,world(p,-1.2,9.5,0),world(p,-1.2,7.6,0)),true);
 }
});
test('editor lookout placement validates, survives save/block moves and rejects stale posts',()=>{
 for(const kind of kinds){const {map,p}=fixture(kind),d=new EditingDocument().open(JSON.stringify(map));d.addLookout(d.inspect(10,10,0,{mode:'prop'}),{weapon:'rifle'});assert.deepEqual(d.validate(),[]);let saved=JSON.parse(d.export());assert.ok(towerForUnit(saved,saved.guards[0]));d.undo();assert.equal(d.map.guards.length,0);d.redo();assert.equal(d.map.guards.length,1);
  const block=d.capture(0,0),other=new EditingDocument().open(JSON.stringify(blankMap()));other.place(block,1,1);assert.ok(towerForUnit(other.map,other.map.guards[0]));saved.props=[];assert.ok(validateMap(saved).length);
 }
});
test('mercs climb and descend at real entry cells; AP, occupied exits and fixed positions are enforced',()=>{
 for(const kind of kinds)for(const rotated of [false,true]){const {map,p}=fixture(kind,rotated);map.starts[0]=towerEntry(p);assert.deepEqual(validateMap(map),[]);const s=createGame(1,map,false,'easy',{awareness:true});startEncounterClock(s);const u=s.units[0],start={x:u.x,y:u.y,z:u.z},time=s.clock.minutes;
  assert.equal(towerClimbPreview(s,u).ok,true);assert.equal(climbTower(s,u),true);assert.equal(unitBaseHeight(u),6.36);assert.equal(s.towerTraversal.direction,'up');assert.ok(s.towerTraversal.to.towerPost);assert.equal(s.towerTraversal.from.towerPost,undefined);assert.equal(s.towerTraversal.id,1);assert.equal(s.clock.minutes,time+.5);assert.ok(towerForUnit(s,u));assert.deepEqual(movementNeighbors(s,u),[]);assert.equal(pathTo(s,u,3,4),null);assert.equal(boundedRoute(s,u,new Set(['3,4,0']),100),null);
  s.phase='player';u.ap=5;assert.equal(climbTower(s,u),false);u.ap=12;Object.assign(s.units[1],start);assert.equal(climbTower(s,u),false);s.units[1].x=2;s.units[1].y=6;assert.equal(climbTower(s,u),true);assert.equal(u.ap,6);assert.equal(s.towerTraversal.direction,'down');assert.equal(s.towerTraversal.id,2);assert.equal(s.towerTraversal.apCost,6);assert.ok(s.towerTraversal.from.towerPost);assert.equal(u.towerPost,undefined);assert.deepEqual({x:u.x,y:u.y,z:u.z},start);
 }
});
test('lookouts ignore facing for lit targets and shoot from the elevated window without seeing through solid walls',()=>{
 for(const kind of kinds){const {map,p}=fixture(kind),slot=towerSlots(p).find(q=>q.y>=12);map.guards=[{...slot,towerPost:towerPost(p,slot),species:'pig-foreman',weapon:'rifle',heading:270}];map.starts[0]={x:12,y:32,z:0};assert.deepEqual(validateMap(map),[]);const s=createGame(1,map,false,'easy',{awareness:true});startEncounterClock(s);const guard=s.units[4],merc=s.units[0];merc.sneaking=true;merc.stealth=100;refresh(s);
  assert.ok(towerForUnit(s,guard));assert.equal(canSee(s,guard,merc),true,kind);assert.ok(visibleZones(s,guard,merc).includes('torso'),kind);const trajectory=bulletTrajectory(s,guard,merc,{accurate:true,zone:'torso',reach:70},()=>.5);assert.ok(trajectory.origin.h>7);assert.equal(trajectory.unitId,merc.id,kind);
  for(let x=0;x<30;x++)s.edges['s:'+x+':29']='wall';assert.equal(canSee(s,guard,merc),false,kind);
 }
});

import {shotPoint} from '../dist/tactics/battle-shot-effects.js';
import {DIMENSIONS,toWorld} from '../dist/tactics/hybrid-world.js';
test('tower impacts and actor presentation share the elevated base',()=>{
 const {map,p}=fixture('iron-searchlight-stair-tower'),slot=towerSlots(p)[0],u={...slot,id:1,towerPost:towerPost(p,slot)};
 assert.equal(toWorld(u)[1],6.36);const point=shotPoint({x:u.x,y:u.y,h:7.36,unitId:1},{...map,units:[u]});assert.ok(Math.abs(point.y-(6.36+DIMENSIONS.standing/1.8))<1e-8);
});
