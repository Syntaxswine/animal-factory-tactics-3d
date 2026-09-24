import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,terrainAt,roofNeighbors,neighbors,edgeKey,validateMap,parseMap,addStairs} from '../dist/tactics/core/maps.js';
import {createGame,movementNeighbors,move,stepMovement,navigationPath} from '../dist/tactics/core/engine.js';

function map(){const m=blankMap();m.starts[0]={x:8,y:8,z:0};m.props.push({kind:'cliff-ledge',x:9,y:8,z:0});return m;}
const top={x:9,y:8,z:1},bottom={x:8,y:8,z:0};
const has=(routes,p)=>routes.some(q=>q.x===p.x&&q.y===p.y&&q.z===p.z);
test('a flat cliff tile alone supplies a cap and four bidirectional edges after save/load',()=>{
 const m=parseMap(JSON.stringify(map()));assert.deepEqual(validateMap(m),[]);assert.equal(m.climbs.length,0);assert.equal(terrainAt(m,9,8,1),'floor');
 const down=roofNeighbors(m,top);assert.equal(down.length,4);
 for(const q of down){assert.equal(q.cost,8);assert.ok(has(roofNeighbors(m,q),top));}
});
test('crags and partial contours cannot supply flat caps or tagged climb routes',()=>{
 for(const extra of [{kind:'cliff-crag'},{cliffMask:3}]){const m=map();Object.assign(m.props[0],extra);assert.equal(terrainAt(m,9,8,1),'void');assert.equal(roofNeighbors(m,bottom).length,0);m.upper[0]['9,8']='floor';m.climbs=[{...bottom,dx:1,dy:0,kind:'cliff'}];assert.ok(validateMap(m).length);}
});
test('blocked landings, headroom and either edge remove the route in both directions',()=>{
 for(const change of [m=>m.props.push({kind:'crate-wood',...top}),m=>m.props.push({kind:'crate-wood',...bottom}),m=>m.upper[0]['8,8']='floor',m=>m.edges[edgeKey('e',8,8,0)]='wall',m=>m.edges[edgeKey('e',8,8,1)]='wall']){
  const m=map();change(m);assert.equal(has(roofNeighbors(m,bottom),top),false);assert.equal(has(roofNeighbors(m,top),bottom),false);
 }
});
test('automatic routes work through exploration knowledge and destination movement without manual links',()=>{
 const s=createGame(1,map(),true,'easy'),u=s.units[0];s.phase='explore';assert.ok(navigationPath(s,u,9,8,1));assert.ok(move(s,u,9,8,1));assert.ok(stepMovement(s));assert.equal(u.z,1);assert.ok(move(s,u,8,8,0));assert.ok(stepMovement(s));assert.equal(u.z,0);
});
test('cliffs and ladders reject other occupants at either end but allow the climber',()=>{
 for(const ladder of [false,true])for(const descending of [false,true])for(const occupiedSource of [false,true]){
  const m=ladder?blankMap():map();if(ladder){m.starts[0]={...bottom};addStairs(m,8,8,0,'ladder');}
  const upper=ladder?{x:8,y:8,z:1}:top,s=createGame(1,m,true,'easy'),u=s.units[0],from=descending?upper:bottom,to=descending?bottom:upper;
  Object.assign(u,from);assert.ok(has(movementNeighbors(s,u),to));Object.assign(s.units[1],occupiedSource?from:to);assert.equal(has(movementNeighbors(s,u),to),false);
 }
});
test('a newly occupied destination cancels queued climbs without AP or position changes',()=>{
 for(const ladder of [false,true]){const m=ladder?blankMap():map();if(ladder){m.starts[0]={...bottom};addStairs(m,8,8,0,'ladder');}
  const to=ladder?{x:8,y:8,z:1}:top,s=createGame(1,m,true,'easy'),u=s.units[0];s.phase='player';u.ap=20;assert.ok(move(s,u,to.x,to.y,to.z));Object.assign(s.units[1],to);assert.equal(stepMovement(s),false);assert.equal(u.z,0);assert.equal(u.ap,20);
 }
});
test('ladder static clearance checks its source as well as its destination',()=>{
 for(const blocked of [bottom,{x:8,y:8,z:1}]){const m=blankMap();addStairs(m,8,8,0,'ladder');m.props=[...m.props,{kind:'crate-wood',...blocked}];assert.equal(has(neighbors(m,bottom),{x:8,y:8,z:1}),false);assert.equal(has(neighbors(m,{x:8,y:8,z:1}),bottom),false);}
});
