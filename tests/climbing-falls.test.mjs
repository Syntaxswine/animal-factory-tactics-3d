import test from 'node:test';
import assert from 'node:assert/strict';
import {fallDamage,findFallLanding,failedClimbFall,applyFallInjury} from '../dist/tactics/fall-damage.js';
import {settleStructureCollapse} from '../dist/tactics/structure-collapse.js';
import {damageStructure} from '../dist/tactics/structure-health.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,stepMovement,moveGroup,commitClimb} from '../dist/tactics/core/engine.js';
import {performClimb} from '../dist/tactics/ladder-actions.js';
import {towerEntry,towerPost,towerSlots} from '../dist/tactics/tower-geometry.js';
import {climbTower} from '../dist/tactics/tower-actions.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {toWorld} from '../dist/tactics/hybrid-world.js';
const seedFor=roll=>Number((BigInt(Math.floor((roll-.5)*4294967296/100))-1013904223n)*4276115653n&0xffffffffn);
const scene=()=>({map:Array.from({length:20},()=>Array(20).fill('yard')),upper:[{},{}],props:[],stairs:[],climbs:[],edges:{},units:[],queue:[],loot:[]});
const actor=(overrides={})=>({id:0,species:'horse',x:10,y:10,z:0,hp:150,maxHp:150,ap:18,pack:[],...overrides});

test('fall damage scales with height and total mass, with bounded animal/load extremes',()=>{
 const u=actor({pack:[{type:'weapon',kind:'hmg'},{type:'weapon',kind:'rifle'},{type:'weapon',kind:'rifle'}]});
 assert.equal(fallDamage(u,0),0);assert.equal(fallDamage(u,1),20);assert.equal(fallDamage(u,2),50);assert.equal(fallDamage(u,3),90);
 assert.equal(fallDamage(actor({species:'hen'}),1),15);assert.equal(fallDamage(actor({species:'pig-director',pack:Array.from({length:100},()=>({type:'weapon',kind:'hmg'}))}),1),30);
 assert.ok(fallDamage(u,.5)<fallDamage(u,1));
});
test('falls stop on the first supporting floor and avoid both living and incapacitated occupants',()=>{
 const s=scene(),u=actor({z:2});s.units=[u,actor({id:1,z:1,hp:0,casualty:'stable'})];s.upper[0]['10,10']='floor';s.upper[0]['11,10']='floor';
 assert.deepEqual(findFallLanding(s,u,u,2),{x:11,y:10,z:1});s.edges['e:10:10:1']='wall';assert.equal(findFallLanding(s,u,u,2),null,'never skip an occupied floor and tunnel into the ground');
 delete s.edges['e:10:10:1'];assert.equal(findFallLanding(s,u,u,2,new Set(['11,10,1'])),null);
 s.units[1].away=true;assert.deepEqual(findFallLanding(s,u,u,2),{x:10,y:10,z:1});
});
test('one- and two-story floor collapse uses actual height, shared damage and leg injury',()=>{
 for(const landing of [0,1]){const s=scene(),u=actor({z:2,pack:[{type:'weapon',kind:'hmg'},{type:'weapon',kind:'rifle'},{type:'weapon',kind:'rifle'}]});s.units=[u];s.upper[1]['10,10']='floor';if(landing)s.upper[0]['10,10']='floor';
  const r=settleStructureCollapse(s,[damageStructure(s,{x:10,y:10,z:2},100)]);assert.equal(u.z,landing);assert.equal(r.falls[0].height,2-landing);assert.equal(u.hp,landing?130:100);assert.equal(u.legWound,true);assert.equal(u.ap,15);assert.equal(u.running,false);
 }
});
test('a severe descent ends on a real lower floor, incurs injury and clears the remaining orders',()=>{
 const s=scene(),u=actor({z:1,running:true,overwatch:{},route:[]});s.upper[0]['10,10']='floor';s.units=[u];s.queue=[{id:0}];
 const event=failedClimbFall(s,u,{kind:'roof',x:9,y:10,z:0});assert.deepEqual([u.x,u.y,u.z],[9,10,0]);assert.equal(event.height,1);assert.equal(event.damage,18);assert.equal(u.hp,132);assert.equal(s.queue.length,0);assert.equal(u.overwatch,null);assert.equal(u.running,false);
});
test('rusty tower failure retains the elevated start for presentation and falls three stories',()=>{
 const map=blankMap('Rusty tower'),tower={kind:'iron-searchlight-ladder-tower',x:10,y:10,z:0,rusty:true};map.props=[tower];map.starts[0]={...towerEntry(tower),stats:{climbing:100}};
 const s=createGame(42,map,false,'easy',{statSystem:true}),u=s.units[0],slot=towerSlots(tower)[0];Object.assign(u,slot);u.towerPost=towerPost(tower,slot);s.phase='player';u.ap=30;s.climbSeed=seedFor(100);const hp=u.hp;
 assert.ok(climbTower(s,u));assert.equal(s.lastClimb.roll,100);assert.equal(s.lastClimb.criticalFailure,true);assert.equal(s.simpleTraversal.height,3);assert.equal(toWorld(s.simpleTraversal.from)[1],6.36);assert.equal(u.towerPost,undefined);assert.deepEqual([u.x,u.y,u.z],[towerEntry(tower).x,towerEntry(tower).y,0]);assert.equal(hp-u.hp,s.simpleTraversal.damage);assert.equal(s.towerTraversal,undefined);
});
test('a fatal ladder fall uses the casualty/save flow and never replays a climb after loading',()=>{
 const m=blankMap('Dangerous descent');m.stairs=[{x:10,y:10,z:0,kind:'ladder',rusty:true}];m.upper[0]['10,10']='floor';m.starts[0]={x:10,y:10,z:1,stats:{climbing:100}};
 const s=createGame(42,m,false,'easy',{statSystem:true}),u=s.units[0];startEncounterClock(s);s.phase='player';u.ap=30;u.hp=1;s.climbSeed=seedFor(100);
 assert.ok(performClimb(s,u));assert.ok(stepMovement(s));assert.equal(u.hp,0);assert.equal(u.casualty,'stable');assert.equal(u.z,0);assert.equal(u.ap,0);assert.equal(s.queue.length,0);
 const copy=restoreEncounter(captureEncounter(s));assert.equal(copy.units[0].hp,0);assert.equal(copy.units[0].z,0);assert.equal(copy.simpleTraversal,undefined);assert.equal(copy.simpleTraversals,undefined);assert.equal(copy.climbSeed,s.climbSeed);
});
test('a group keeps separate committed ladder events and rolls; one failure stops further members',()=>{
 const m=blankMap('Group climbs');for(let i=0;i<2;i++){m.starts[i]={x:10+i,y:10,z:0,stats:{climbing:5}};m.stairs.push({x:10+i,y:10,z:0,kind:'ladder',rusty:i===1});m.upper[0][`${10+i},10`]='floor';}
 const s=createGame(42,m,false,'easy',{statSystem:true});s.phase='player';s.engaged=true;const [a,b]=s.units;a.ap=b.ap=30;for(const p of ['10,10','11,10','10,10,1','11,10,1'])s.seen.add(p);
 s.queue=[{group:[{id:a.id,goal:{x:10,y:10,z:1}},{id:b.id,goal:{x:11,y:10,z:1}}]}];s.climbSeed=seedFor(100);
 assert.ok(stepMovement(s));assert.equal(a.z,1);assert.equal(a.ap,24);assert.equal(b.z,0);assert.equal(b.ap,24);assert.equal(s.queue.length,0);assert.deepEqual(s.simpleTraversals.map(e=>[e.unitId,e.kind]),[[a.id,'ladder'],[b.id,'fall']]);assert.equal(s.lastClimb.roll,100);
});
