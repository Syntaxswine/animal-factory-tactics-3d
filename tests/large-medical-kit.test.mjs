import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {medicalChest,sectorMedicalCharges} from '../dist/tactics/inventory-tools.js';
import {gridLayout,itemSpan,accepts,receive,placeItem} from '../dist/tactics/core/inventory.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {inventoryAction} from '../dist/tactics/battle-inventory.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {blank} from '../dist/tactics/overmap-model.js';
import {createGroups,validateGroups} from '../dist/tactics/overmap-groups.js';
import {advanceLogistics,ensureLogistics} from '../dist/tactics/overmap-logistics.js';
import {startFirstAid} from '../dist/tactics/overmap-first-aid.js';
import {inventoryArt} from '../dist/tactics/loot-art.js';
import {createTravel,validateTravel,restTravel,setDestination,travelUntilStop} from '../dist/tactics/overmap-travel.js';
test('travel load rejects malformed chest inventory before replacing a live session',()=>{
 const map=blank(),active=createGroups(map),before=structuredClone(active);
 for(const pack of [null,{},[{type:'tool',kind:'largeMedicalKit',count:1,charges:11}],[{type:'tool',kind:'largeMedicalKit',count:1,charges:0}],[{type:'tool',kind:'largeMedicalKit',count:2,charges:10}],[{type:'tool',kind:'largeMedicalKit',count:1}]]){
  const candidate=structuredClone(active);candidate.groups[0].state.members[0].pack=pack;
  assert.throws(()=>validateGroups(candidate,map),/Invalid saved travel session/);assert.deepEqual(active,before);
 }
 const legacy=structuredClone(active);delete legacy.groups[0].state.members[0].pack;assert.doesNotThrow(()=>validateGroups(legacy,map));
});
test('valid partially used chests survive travel and fatigue recovery unchanged',()=>{
 const map=blank(),s=createTravel(map);s.members[0].pack=[{...medicalChest(),charges:4}];validateTravel(s,map);const inventory=structuredClone(s.members[0].pack),before=s.clock.minutes;
 setDestination(s,map,1);travelUntilStop(s,map);assert.equal(s.position,1);assert.ok(s.members[0].social.fatigue>0);restTravel(s,1);assert.ok(s.clock.minutes>before+60);assert.deepEqual(s.members[0].pack,inventory);validateTravel(s,map);
});
test('chests occupy two adjacent cells and never stack',()=>{
 const u={pack:[],slots:[],ammo:{}};receive(u,{...medicalChest(),charges:3});receive(u,medicalChest());assert.equal(u.pack.length,2);assert.deepEqual(u.pack.map(i=>i.charges),[3,10]);assert.equal(gridLayout(u).occupied.size,4);assert.equal(itemSpan(u.pack[0]),2);assert.equal(placeItem(u,'0',5),false);
 u.pack=Array.from({length:17},()=>({type:'tool',kind:'lockpicks',count:1}));assert.equal(accepts(u,medicalChest()),false);assert.match(inventoryArt(medicalChest()),/large-medical-kit.svg$/);
});
test('partial charges survive giving, dropping, taking and encounter save/load',()=>{
 const m=blankMap();m.starts[0]={x:10,y:10};m.starts[1]={x:11,y:10};const s=createGame(42,m,true,'easy',{statSystem:true}),[a,b]=s.units;startEncounterClock(s);s.phase='explore';a.pack.push({...medicalChest(),charges:7});
 assert.ok(inventoryAction(s,a,{mode:'give',key:String(a.pack.length-1),target:b}));let key=String(b.pack.findIndex(i=>i.kind==='largeMedicalKit'));assert.equal(b.pack[Number(key)].charges,7);
 assert.ok(inventoryAction(s,b,{mode:'drop',key}));const pile=s.loot.find(p=>p.items.some(i=>i.kind==='largeMedicalKit'));assert.ok(inventoryAction(s,b,{mode:'take',target:pile,index:pile.items.findIndex(i=>i.kind==='largeMedicalKit')}));
 const saved=captureEncounter(s),restored=restoreEncounter(saved);assert.equal(restored.units[1].pack.find(i=>i.kind==='largeMedicalKit').charges,7);
 for(const charges of [-1,0,11,1.5]){const bad=structuredClone(saved);bad.state.units[1].pack.find(i=>i.kind==='largeMedicalKit').charges=charges;assert.throws(()=>restoreEncounter(bad));}
});
test('one chest pays for ten sector heals, persists partially used, then is exhausted',()=>{
 const map=blank(),s=createGroups(map),g=s.groups[0];ensureLogistics(s,map);g.state.members.forEach(u=>{u.pack=[];u.medkits=0;u.hp=50;u.maxHp=100;u.stats.medical=100;});g.state.members[0].pack=[medicalChest()];
 for(let n=0;n<10;n++){g.state.members.forEach(u=>u.hp=50);startFirstAid(s,g.id);assert.equal(sectorMedicalCharges(g.state.members[0]),9-n);const saved=JSON.parse(JSON.stringify(s));validateGroups(saved,map);assert.deepEqual(saved,s);advanceLogistics(s,map,480);assert.ok(g.state.members.every(u=>u.hp===100));}
 g.state.members[0].hp=50;assert.throws(()=>startFirstAid(s,g.id),/kit/);assert.deepEqual(g.state.members[0].pack,[]);
});
