import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {dialogueFixture} from '../dist/tactics/dialogue-fixture.js';
import {createGame,refresh,move,stepMovement,pathTo,reachable,key,headingTo} from '../dist/tactics/core/engine.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {DialogueOrder,dialogueRoute} from '../dist/tactics/dialogue-order.js';
import {dialogueReadiness,TALK_RANGE} from '../dist/tactics/dialogue-rules.js';
import {invalidateMapGeometry} from '../dist/tactics/map-geometry-cache.js';

const map=await dialogueFixture(async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(url,'utf8'))}));
function fresh({far=false}={}){
 const s=createGame(1947,map,true,'easy',{social:true,awareness:true,statSystem:true});startEncounterClock(s);
 const u=s.units[0],npc=s.units.find(v=>v.character?.dialogueRef==='yard_bomb_permission');
 if(far){npc.x=30;npc.y=13;refresh(s);s.detected.add(npc.id);}
 return {s,u,npc,order:new DialogueOrder()};
}
test('conversation range is inclusive at 12, while floors and walls still matter',()=>{
 const {s,u,npc}=fresh();u.y=npc.y;u.x=npc.x+TALK_RANGE;
 assert.equal(dialogueReadiness(s,npc,u).ok,true);u.x++;assert.equal(dialogueReadiness(s,npc,u).ok,false);
 u.x--;u.z=1;assert.equal(dialogueReadiness(s,npc,u).ok,false);u.z=0;
 s.edges['e:13:12']='wall';invalidateMapGeometry(s);assert.equal(dialogueReadiness(s,npc,u).ok,false);
});
test('talk preview is pure; normal engine steps approach and stop at talking range',()=>{
 const {s,u,npc,order}=fresh({far:true}),before=captureEncounter(s),route=dialogueRoute(s,u,npc);
 assert.equal(route.ok,true);assert.ok(route.path.length>0);assert.deepEqual(captureEncounter(s).state,before.state);
 assert.equal(order.start(s,u,npc).ok,true);assert.equal(order.update(s),null);
 let result;for(let i=0;i<30&&!result;i++){stepMovement(s);result=order.update(s);}
 assert.equal(result?.ready,true);assert.equal(result.speaker,u);assert.equal(result.npc,npc);
 assert.equal(Math.hypot(u.x-npc.x,u.y-npc.y),TALK_RANGE);assert.equal(s.queue.length,0);
 assert.equal(order.pending,null);assert.equal(order.update(s),null);assert.ok(u.steps>0);
 assert.deepEqual(s.dialogue,before.state.dialogue);
});
test('already in range opens without movement, but waits for the visible walk animation',()=>{
 const {s,u,npc,order}=fresh(),at=[u.x,u.y,u.z,u.ap,u.stamina];
 assert.deepEqual(order.start(s,u,npc),{ok:true,path:[],cost:0});assert.equal(order.update(s,{busy:true}),null);
 assert.equal(order.update(s).ready,true);assert.deepEqual([u.x,u.y,u.z,u.ap,u.stamina],at);
});
test('a merc cannot swap into an approach; another move order remains intact',()=>{
 const {s,u,npc,order}=fresh({far:true});order.start(s,u,npc);
 assert.equal(order.update(s,{selectedId:s.units[1].id}).stopped,true);assert.equal(s.queue.length,0);
 order.start(s,u,npc);assert.equal(move(s,u,11,14),true);const queue=structuredClone(s.queue);
 assert.equal(order.update(s).stopped,true);assert.deepEqual(s.queue,queue);
});
test('attack, death, fright, departure and lost identification stop the approach before talking',()=>{
 for(const alter of [(s,u,n)=>s.engaged=true,(s,u,n)=>u.hp=0,(s,u,n)=>n.hp=0,(s,u,n)=>n.npcFrightened=true,(s,u,n)=>u.away=true,(s,u,n)=>s.detected.delete(n.id)]){
  const {s,u,npc,order}=fresh({far:true});assert.equal(order.start(s,u,npc).ok,true);alter(s,u,npc);
  assert.equal(order.update(s,{busy:true}).stopped,true);assert.equal(order.pending,null);assert.equal(s.queue.length,0);
 }
});
test('a blocked or interrupted route is not a teleport or an automatic conversation',()=>{
 const {s,u,npc,order}=fresh({far:true});order.start(s,u,npc);s.queue=[];
 assert.match(order.update(s).reason,/Stopped/);assert.equal(u.x,12);
 npc.x=14;npc.y=13;
 for(const k of ['e:13:13','e:14:13','s:14:12','s:14:13'])s.edges[k]='wall';
 invalidateMapGeometry(s);assert.equal(dialogueRoute(s,u,npc).ok,false);
});
test('a new/load-restored sector abandons the transient talk order without changing saved dialogue',()=>{
 const {s,u,npc,order}=fresh({far:true});order.start(s,u,npc);
 const saved=captureEncounter(s),loaded=restoreEncounter(saved);
 assert.equal(new DialogueOrder().pending,null);assert.equal(order.update(loaded).stopped,true);
 assert.deepEqual(loaded.dialogue,saved.state.dialogue);assert.deepEqual(loaded.queue,saved.state.queue);
});

test('an identified NPC across a sealed sector boundary does not trigger hundreds of exhausted path searches',()=>{
 const {s,u,npc}=fresh({far:true}),scout=s.units[1];
 scout.x=30;scout.y=14;scout.heading=headingTo(scout,npc);
 for(let y=0;y<s.definition.height;y++)s.edges['e:20:'+y]='wall';
 invalidateMapGeometry(s);refresh(s);s.detected.add(npc.id);
 for(let y=0;y<s.definition.height;y++)for(let x=0;x<s.definition.width;x++)s.seen.add(key(x,y,0));
 let searches=0,reachabilityPasses=0;
 const result=dialogueRoute(s,u,npc,{
  routeTo:(...args)=>{searches++;return pathTo(...args);},
  reachableFrom:(...args)=>{reachabilityPasses++;return reachable(...args);}
 });
 assert.equal(result.ok,false);assert.match(result.reason,/No discovered route/);
 assert.equal(searches,1);assert.equal(reachabilityPasses,1);
 assert.equal(u.x,12);assert.equal(s.queue.length,0);
});
