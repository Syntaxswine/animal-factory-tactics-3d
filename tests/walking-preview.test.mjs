import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,move,moveGroup,stepMovement} from '../dist/tactics/core/engine.js';
import {walkingRoutes,walkingHazards,walkingWarning} from '../dist/tactics/walking-preview.js';
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

test('a safe destination still warns about intermediate fire without changing the route or gameplay',()=>{
 const {s,u,goal}=fixture(),safe=walkingRoutes(s,[u.id],u,goal)[0];
 assert.deepEqual(safe.hazards,[]);assert.equal(walkingWarning([safe]),'');
 s.fires=[{x:11,y:10,z:0,turns:3}];s.visible.add('11,10');const before=structuredClone(s);
 const route=walkingRoutes(s,[u.id],u,goal)[0];assert.deepEqual(s,before);
 assert.deepEqual(route.path,safe.path);assert.equal(route.cost,safe.cost);
 assert.deepEqual(route.hazards,[{kind:'fire',x:11,y:10,z:0}]);assert.match(walkingWarning([route]),new RegExp(u.name+' will catch fire'));
 // The warning is backed by the same tile that actually ignites the merc.
 assert.ok(move(s,u,goal.x,goal.y,0));stepMovement(s);assert.equal(u.x,11);assert.equal(u.burningTurns,3);
});
test('fire warnings respect visibility, expiry and the exact floor',()=>{
 const {s}=fixture(),path=[{x:11,y:10,z:0},{x:12,y:10,z:0},{x:13,y:10,z:1}];
 s.fires=[{x:11,y:10,z:1,turns:3},{x:12,y:10,z:0,turns:0},{x:13,y:10,z:1,turns:3}];
 for(const key of ['11,10','11,10,1','12,10','13,10,1'])s.seen.add(key);
 s.visible=new Set(['11,10','11,10,1','12,10']);assert.deepEqual(walkingHazards(s,path),[]);
 s.visible.add('13,10,1');assert.deepEqual(walkingHazards(s,path),[{kind:'fire',x:13,y:10,z:1}]);
 s.fires[2].turns=0;assert.deepEqual(walkingHazards(s,path),[]);
});
test('group warning identifies only the merc whose formation route crosses fire',()=>{
 const {s,u,goal}=fixture(),safe=walkingRoutes(s,[0,1],u,goal),other=safe.find(r=>r.id!==u.id),leader=safe.find(r=>r.id===u.id);
 const cell=other.path.find(p=>!leader.path.some(q=>p.x===q.x&&p.y===q.y&&p.z===q.z));assert.ok(cell);
 s.fires=[{...cell,turns:3}];s.visible.add(cell.x+','+cell.y);
 const before=structuredClone(s),routes=walkingRoutes(s,[0,1],u,goal);assert.deepEqual(s,before);
 assert.deepEqual(routes.find(r=>r.id===u.id).hazards,[]);assert.equal(routes.find(r=>r.id===other.id).hazards.length,1);
 assert.equal(walkingWarning(routes),'⚠ Fire on route · '+other.name+' will catch fire.');
});
test('queued movement retains the warning without hover and removes it when fire expires',()=>{
 const {s,u,goal}=fixture();s.fires=[{...goal,turns:1}];s.visible.add('12,10');move(s,u,goal.x,goal.y,0);
 assert.match(walkingWarning(walkingRoutes(s,[u.id],u,null)),/Fire on route/);stepMovement(s);
 const route=walkingRoutes(s,[u.id],u,null)[0];assert.equal(route.cost,2);assert.equal(route.hazards.length,1);
 s.fires=[];assert.equal(walkingWarning(walkingRoutes(s,[u.id],u,null)),'');assert.equal(s.queue.length,1);
});
test('hazard previews remain available outside combat and beyond the current AP budget',()=>{
 const {s,u,goal}=fixture();s.fires=[{...goal,turns:3}];s.visible.add('12,10');u.ap=1;
 for(const phase of ['player','explore']){s.phase=phase;const route=walkingRoutes(s,[u.id],u,goal)[0];assert.ok(route.cost>route.ap);assert.equal(route.hazards.length,1);assert.match(walkingWarning([route]),/Fire on route/);}
});
