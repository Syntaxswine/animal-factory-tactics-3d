import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,move,moveGroup,stepMovement} from '../dist/tactics/core/engine.js';
import {walkingRoutes} from '../dist/tactics/walking-preview.js';
function fixture(){const m=blankMap();m.guards=[];m.starts[0]={x:10,y:10};m.starts[1]={x:10,y:12};const s=createGame(1,m,true,'easy');s.phase='player';s.engaged=true;for(const u of s.units)u.ap=30;return {s,u:s.units[0],goal:{x:12,y:10,z:0}};}
test('walking preview agrees with charged AP for pace, stance and injury without mutating state',()=>{
 for(const [change,cost] of [[{},4],[{running:true},2],[{sneaking:true},6],[{stance:'kneeling'},8],[{legWound:true,hp:40},8]]){
  const {s,u,goal}=fixture();Object.assign(u,change);const before=structuredClone(s),routes=walkingRoutes(s,[u.id],u,goal);assert.deepEqual(s,before);assert.equal(routes[0].cost,cost);assert.equal(routes[0].path.length,2);assert.ok(move(s,u,goal.x,goal.y,0));while(s.queue.length)stepMovement(s);assert.equal(u.ap,30-cost);
 }
});
test('queued footprints remain without hovering and shrink as movement commits',()=>{
 const {s,u,goal}=fixture();move(s,u,goal.x,goal.y,0);assert.equal(walkingRoutes(s,[u.id],u,null)[0].cost,4);stepMovement(s);assert.equal(walkingRoutes(s,[u.id],u,null)[0].cost,2);s.queue=[];assert.deepEqual(walkingRoutes(s,[u.id],u,null),[]);
});
test('unaffordable route still displays total cost; unreachable destinations do not draw a route',()=>{
 const {s,u,goal}=fixture();u.ap=1;const route=walkingRoutes(s,[u.id],u,goal)[0];assert.equal(route.cost,4);assert.ok(route.cost>route.ap);s.map[10][12]='wall';s.seen.add('12,10');assert.deepEqual(walkingRoutes(s,[u.id],u,goal),[]);
});
test('formation previews share group order destinations and preserve logs, AP and overwatch',()=>{
 const {s,u,goal}=fixture();u.overwatch={heading:0};const before=structuredClone(s),routes=walkingRoutes(s,[0,1],u,goal);assert.deepEqual(s,before);assert.equal(routes.length,2);assert.ok(moveGroup(s,[0,1],u,goal.x,goal.y,0));for(const r of routes){const order=s.queue[0].group.find(o=>o.id===r.id),end=r.path.at(-1);assert.deepEqual({x:end.x,y:end.y,z:end.z},order.goal);}
});
