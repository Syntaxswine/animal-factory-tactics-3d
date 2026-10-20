import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,move,moveGroup,navigationPath,pathTo,stepMovement,key} from '../dist/tactics/core/engine.js';
import {invalidateMapGeometry} from '../dist/tactics/map-geometry-cache.js';
import {walkingRoutes,walkingWarning} from '../dist/tactics/walking-preview.js';

function fixture(){
 const m=blankMap();m.starts[0]={x:10,y:10,z:0};m.starts[1]={x:10,y:12,z:0};
 const s=createGame(1947,m,true,'easy'),u=s.units[0];
 // A small sealed yard in a real 240x240 sector keeps each boundary case fast.
 for(let n=0;n<24;n++){s.edges['e:23:'+n]='wall';s.edges['s:'+n+':23']='wall';}
 for(let y=0;y<24;y++)for(let x=0;x<24;x++)s.seen.add(key(x,y));
 invalidateMapGeometry(s);return {s,u};
}
function barrier(s,{opening=null}={}){
 for(let y=0;y<24;y++)if(y!==opening)s.edges['e:15:'+y]='wall';
 invalidateMapGeometry(s);
}
function finish(s){for(let i=0;i<80&&s.queue.length;i++)stepMovement(s);assert.equal(s.queue.length,0);}

test('a blocked ground order walks to the near side, then stops without repeatedly chasing the original target',()=>{
 const {s,u}=fixture();barrier(s);
 assert.equal(navigationPath(s,u,20,10),null,'strict interaction/AI queries remain exact');
 const before=structuredClone(s),preview=walkingRoutes(s,[u.id],u,{x:20,y:10,z:0})[0];
 assert.deepEqual(s,before);assert.equal(preview.partial,true);
 assert.deepEqual([preview.path.at(-1).x,preview.path.at(-1).y],[15,10]);
 assert.match(walkingWarning([preview]),/Route blocked/);
 assert.equal(move(s,u,20,10),true);assert.deepEqual(s.queue[0].goal,{x:15,y:10,z:0});
 finish(s);assert.deepEqual([u.x,u.y,u.z],[15,10,0]);
 assert.equal(move(s,u,20,10),false,'already at the barrier: do not wander sideways');
 assert.equal(s.queue.length,0);assert.equal(stepMovement(s),false);
});

test('a usable detour takes priority over stopping at the first wall',()=>{
 const {s,u}=fixture();barrier(s,{opening:8});
 const exact=navigationPath(s,u,20,10);
 assert.ok(exact?.some(p=>p.x===16&&p.y===8));
 assert.deepEqual(navigationPath(s,u,20,10,0,{partial:true}),exact);
 assert.equal(move(s,u,20,10),true);finish(s);
 assert.deepEqual([u.x,u.y],[20,10]);
});

test('a solid destination or an occupied destination stops the merc beside it',()=>{
 for(const occupied of [false,true]){
  const {s,u}=fixture();
  if(occupied)Object.assign(s.units[1],{x:14,y:10});
  else{s.map[10][14]='wall';invalidateMapGeometry(s);}
  assert.equal(pathTo(s,u,14,10),null);
  assert.equal(move(s,u,14,10),true);finish(s);
  assert.deepEqual([u.x,u.y],[13,10]);
  assert.equal(move(s,u,14,10),false);
 }
});

test('a boundary discovered after departure shortens the same order to a reachable stop',()=>{
 const {s,u}=fixture();assert.equal(move(s,u,20,10),true);
 const goal=s.queue[0].goal;
 stepMovement(s);barrier(s);finish(s);
 assert.deepEqual([u.x,u.y],[15,10]);
 assert.deepEqual(goal,{x:15,y:10,z:0},'the order retains its identity when replanning');
});

test('hidden obstacles do not change a preview before they are discovered',()=>{
 const {s,u}=fixture();s.seen.clear();s.map[10][12]='wall';invalidateMapGeometry(s);
 const route=navigationPath(s,u,14,10,0,{partial:true});
 assert.ok(route.some(p=>p.x===12&&p.y===10),'planning must not reveal hidden geometry');
 s.seen.add('12,10');
 assert.ok(navigationPath(s,u,14,10,0,{partial:true}).every(p=>p.x!==12||p.y!==10));
});

test('partial movement still pays AP, and interruption does not resume itself',()=>{
 const {s,u}=fixture();barrier(s);s.phase='player';s.engaged=true;u.ap=4;
 assert.equal(move(s,u,20,10),true);finish(s);
 assert.deepEqual([u.x,u.y,u.ap],[12,10,0]);
 u.ap=12;assert.equal(stepMovement(s),false);assert.equal(u.x,12);
 assert.equal(move(s,u,20,10),true);s.queue=[];assert.equal(stepMovement(s),false);assert.equal(u.x,12);
});

test('an unreachable upper floor never teleports the merc; a real ladder still completes the route',()=>{
 const {s,u}=fixture();u.stance='kneeling';s.upper[0]['20,10']='floor';s.seen.add('20,10,1');invalidateMapGeometry(s);
 assert.equal(move(s,u,20,10,1),true);finish(s);
 assert.deepEqual([u.x,u.y,u.z],[20,10,0]);
 u.stance='standing';s.stairs.push({x:20,y:10,z:0,kind:'ladder'});invalidateMapGeometry(s);
 assert.equal(move(s,u,20,10,1),true);finish(s);
 assert.deepEqual([u.x,u.y,u.z],[20,10,1]);
});

test('a group approaches a sealed boundary using distinct reachable destinations',()=>{
 const {s,u}=fixture();barrier(s);
 assert.equal(moveGroup(s,[0,1],u,20,10),true);
 const goals=s.queue[0].group.map(o=>o.goal);
 assert.equal(new Set(goals.map(p=>key(p.x,p.y,p.z))).size,2);
 assert.ok(goals.every(p=>p.x===15));
 finish(s);
 assert.deepEqual(s.units.slice(0,2).map(p=>[p.x,p.y]),[[15,10],[15,12]]);
});

test('invalid map coordinates and a merc boxed in on all sides produce no movement',()=>{
 const {s,u}=fixture();
 for(const k of ['e:9:10','e:10:10','s:10:9','s:10:10'])s.edges[k]='wall';
 invalidateMapGeometry(s);
 assert.equal(move(s,u,20,10),false);assert.equal(move(s,u,-1,10),false);
 assert.equal(move(s,u,NaN,10),false);assert.equal(move(s,u,20,10,3),false);
 assert.deepEqual([u.x,u.y],[10,10]);assert.equal(s.queue.length,0);
});

test('four mercs in a file do not choose the same fallback tile or overlap during the approach',()=>{
 const {s,u}=fixture();s.units.forEach((p,i)=>Object.assign(p,{x:10+i,y:10}));
 barrier(s);assert.equal(moveGroup(s,[0,1,2,3],u,20,10),true);
 assert.equal(new Set(s.queue[0].group.map(o=>key(o.goal.x,o.goal.y,o.goal.z))).size,4);
 for(let i=0;i<80&&s.queue.length;i++){stepMovement(s);assert.equal(new Set(s.units.map(p=>key(p.x,p.y,p.z))).size,4);}
 assert.equal(s.queue.length,0);assert.ok(s.units.every(p=>p.x<=15));
 assert.ok(s.units.every((p,i)=>p.x>10+i),'each merc makes progress');
});
