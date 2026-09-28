import test from 'node:test';import assert from 'node:assert/strict';
import {rollLoot,createGame,attack} from '../dist/tactics/core/engine.js';
import {EQUIPMENT_DROP_RATES,equipmentDropRate,initializeWeaponCondition,damageHeldWeapon} from '../dist/tactics/loot-policy.js';
import {militiaLoadout} from '../dist/tactics/overmap-militia.js';
import {deathDropArt} from '../dist/tactics/loot-art.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
const armed=()=>({weapon:'rifle',ammo:{rifle:3},pack:[{type:'weapon',kind:'rifle',rounds:5},{type:'ammo',kind:'rifle',count:20}],hp:0});
test('player-trained militia of every tier carry a permanent no-drop marker',()=>{
 for(const record of militiaLoadout({basic:2,medium:2,high:2})){
  const u={...armed(),...record};for(const difficulty of ['easy','standard','hard']){const s={difficulty,seed:42};assert.equal(equipmentDropRate(s,u),0);assert.deepEqual(rollLoot(s,u),[]);assert.equal(s.lootSeed,undefined);assert.deepEqual(deathDropArt(u),[]);}
 }
});
test('enemy per-item drop rates follow difficulty using the separate deterministic loot stream',()=>{
 for(const [difficulty,rate]of Object.entries(EQUIPMENT_DROP_RATES)){
  const s={difficulty,seed:42},u=armed();u.pack=u.pack.slice(0,1);let dropped=0;for(let i=0;i<10000;i++)dropped+=rollLoot(s,u).length;assert.ok(Math.abs(dropped/10000-rate)<.02,`${difficulty}: ${dropped}`);assert.equal(s.seed,42);
 }
 const a={difficulty:'standard',seed:91},b=structuredClone(a);for(let i=0;i<50;i++)assert.deepEqual(rollLoot(a,armed()),rollLoot(b,armed()));assert.deepEqual(a,b);
});
test('save/load preserves militia exclusion and enemy loot RNG without rerolling',()=>{
 const s=createGame(42,blankMap(),true,'easy',{statSystem:true});startEncounterClock(s);s.units[0].playerTrainedMilitia=true;rollLoot(s,armed());const saved=captureEncounter(s),copy=restoreEncounter(saved);assert.deepEqual(rollLoot(copy,copy.units[0]),[]);assert.deepEqual(rollLoot(copy,armed()),rollLoot(s,armed()));
});
test('difficulty sets starting enemy condition, weapon impacts only lower the held weapon',()=>{
 for(const [difficulty,condition]of [['easy',100],['standard',75],['hard',50]]){
  const s={difficulty,seed:42},u={...armed(),team:'guard'};initializeWeaponCondition(s,u);assert.equal(u.pack[0].condition,condition);
  damageHeldWeapon(s,u,'torso',20);assert.equal(u.pack[0].condition,condition);damageHeldWeapon(s,u,'weapon',20);assert.equal(u.pack[0].condition,condition-20);
  damageHeldWeapon(s,u,'weapon',200);assert.equal(u.pack[0].condition,0);
 }
});
test('a lethal weapon-zone hit damages condition before the corpse drop is created',()=>{
 let checked=false;
 for(let seed=1;seed<=20&&!checked;seed++){
  const map=blankMap();map.starts[0]={x:10,y:10};map.guards=[{x:14,y:10,species:'pig-foreman',weapon:'pistol'}];
  const s=createGame(seed,map,true,'easy'),a=s.units[0],b=s.units[4];a.heading=0;a.accuracy=100;a.ap=100;b.hp=1;s.phase='player';
  assert.ok(attack(s,a,b,false,false,'weapon',false,'full'));
  const dropped=s.loot.find(p=>p.body===b.id)?.items.find(i=>i.type==='weapon');
  if(dropped&&s.effect.trajectories.some(t=>t.zone==='weapon')){assert.ok(dropped.condition<100);checked=true;}
 }
 assert.ok(checked,'Expected a confirmed lethal weapon hit with a dropped weapon');
});
test('weapon condition survives save/load and invalid percentages reject',()=>{
 const s=createGame(42,blankMap(),true,'standard',{statSystem:true});startEncounterClock(s);s.units[0].pack[0].condition=37;
 const saved=captureEncounter(s);assert.equal(restoreEncounter(saved).units[0].pack[0].condition,37);
 for(const condition of [-1,101,2.5]){const bad=structuredClone(saved);bad.state.units[0].pack[0].condition=condition;assert.throws(()=>restoreEncounter(bad));}
});
