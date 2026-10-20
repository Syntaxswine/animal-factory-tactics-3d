import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,move,moveGroup,stepMovement,setState,refresh,combatCosts,movementNeighbors} from '../dist/tactics/core/engine.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';

const seedFor=roll=>Number((BigInt(Math.floor((roll-.5)*4294967296/100))-1013904223n)*4276115653n&0xffffffffn);
function fixture(ap,{kind=null,rusty=false}={}){
 const map=blankMap('Alerted movement');
 map.starts=[10,12,14,16].map(y=>({x:10,y,z:0,stats:{climbing:100}}));
 map.guards=[{x:100,y:100,z:0,weapon:'rifle',species:'horse',heading:180}];
 if(kind)for(const start of map.starts){
  map.stairs.push({x:start.x,y:start.y,z:0,kind,...kind==='ladder'?{rusty}:{}});
  map.upper[0][`${start.x},${start.y}`]='floor';
 }
 const state=createGame(42,map,false,'easy',{statSystem:true,awareness:true});
 startEncounterClock(state);
 const units=state.units.filter(u=>u.team==='squad'),guard=state.units.find(u=>u.team==='guard');
 setState(state,guard,'alert',{x:10,y:10,z:0},{quiet:true});refresh(state);
 assert.equal(state.phase,'explore');assert.equal(combatCosts(state),true);
 for(const u of units)u.ap=ap;
 return {state,units};
}
function order(state,units,group,goal){
 return group?moveGroup(state,units.map(u=>u.id),units[0],goal.x,goal.y,goal.z):move(state,units[0],goal.x,goal.y,goal.z);
}
for(const group of [false,true])for(const ap of [10,0])test(`${group?'group':'solo'} walking stays free during an alert with ${ap} AP`,()=>{
 const {state,units}=fixture(ap),moving=group?units:[units[0]],targets=moving.map(u=>({u,x:u.x+1,y:u.y}));
 assert.ok(order(state,units,group,{x:11,y:10,z:0}));assert.ok(stepMovement(state));assert.equal(state.phase,'explore');
 for(const {u,x,y}of targets){assert.deepEqual([u.x,u.y],[x,y]);assert.equal(u.ap,ap);}
});
for(const group of [false,true])test(`${group?'group':'solo'} walking still costs AP in turn mode`,()=>{
 const {state,units}=fixture(10);state.phase='player';state.engaged=true;
 assert.ok(order(state,units,group,{x:11,y:10,z:0}));assert.ok(stepMovement(state));
 for(const u of group?units:[units[0]])assert.equal(u.ap,8);
});
for(const group of [false,true])for(const ap of [10,0])test(`${group?'group':'solo'} ladder still charges and checks AP during an alert with ${ap} AP`,()=>{
 const {state,units}=fixture(ap,{kind:'ladder'}),moving=group?units:[units[0]];
 const costs=moving.map(u=>movementNeighbors(state,u).find(p=>p.kind==='ladder').cost);
 assert.ok(order(state,units,group,{x:10,y:10,z:1}));
 assert.equal(stepMovement(state),ap>0);
 for(const [i,u]of moving.entries()){assert.equal(u.z,ap>0?1:0);assert.equal(u.ap,ap>0?ap-costs[i]:0);}
});
test('a failed alerted climb spends the same attempt cost once and a lack of AP consumes no roll',()=>{
 for(const ap of [10,0]){
  const {state,units:[u]}=fixture(ap,{kind:'ladder',rusty:true}),cost=movementNeighbors(state,u).find(p=>p.kind==='ladder').cost;
  state.climbSeed=seedFor(100);const before=state.climbSeed;
  assert.ok(order(state,[u],false,{x:10,y:10,z:1}));assert.equal(stepMovement(state),ap>0);
  assert.equal(u.ap,ap>0?ap-cost:0);assert.equal(u.z,0);
  assert.equal(state.climbSeed===before,ap===0);
 }
});
test('ordinary stairs stay usable without AP during an alert',()=>{
 const {state,units:[u]}=fixture(0,{kind:'stairs'});
 assert.ok(order(state,[u],false,{x:10,y:10,z:1}));assert.ok(stepMovement(state));assert.equal(u.z,1);assert.equal(u.ap,0);
});
