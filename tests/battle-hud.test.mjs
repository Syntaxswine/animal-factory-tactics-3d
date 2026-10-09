import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,equip,equipCost,reload} from '../dist/tactics/core/engine.js';
import {factoryMap,SPECIES} from '../dist/tactics/core/maps.js';
import {readyWeapons,resource,squadReadout,weaponReadout,hudPortrait} from '../dist/tactics/battle-hud-model.js';
const fixture=()=>{const s=createGame(1947,factoryMap(),true,'easy');s.phase='player';s.rules.awareness=false;s.queue=[];const u=s.units[0];u.ap=12;return {s,u};};
test('every playable species and outfit resolves to an existing portrait including both pigs and the guide',()=>{
 for(const species of SPECIES)for(const outfit of ['normal','red-hats',...(species==='donkey'?['blue-hawaiian']:[])])assert.ok(fs.existsSync(new URL('../dist/tactics/'+hudPortrait({species,outfit}),import.meta.url)),species+' '+outfit);
});
test('ready swaps charge two AP in either direction, and readouts follow the held weapon',()=>{
 const {s,u}=fixture(),first=u.weapon,next=u.slots.find(k=>k!==first);assert.equal(equipCost(s,u,next),2);
 assert.equal(equip(s,u,next),true);assert.equal(u.ap,10);assert.deepEqual(readyWeapons(u),[next,first]);
 assert.equal(equip(s,u,first),true);assert.equal(u.ap,8);assert.equal(equip(s,u,first),false);assert.equal(u.ap,8);
});
test('not enough AP, queued movement, unconscious and enemy turns cannot swap',()=>{
 for(const condition of ['ap','queue','dead','enemy']){const {s,u}=fixture(),next=u.slots[1];if(condition==='ap')u.ap=1;if(condition==='queue')s.queue=[{}];if(condition==='dead')u.hp=0;if(condition==='enemy')s.phase='enemy';const before=structuredClone(u);
 assert.equal(weaponReadout(s,u,next).canEquip,false,condition);assert.equal(equip(s,u,next),false,condition);assert.deepEqual(u,before);}
});
test('backpack draw remains three AP; exploration and holstering are free but do not bypass combat draw costs',()=>{
 const {s,u}=fixture();u.pack.push({type:'weapon',kind:'shotgun',rounds:6});u.ammo.shotgun=6;assert.equal(equipCost(s,u,'shotgun'),3);assert.equal(equip(s,u,'shotgun'),true);assert.equal(u.ap,9);
 assert.equal(equip(s,u,'hands'),true);assert.equal(u.ap,9);assert.equal(equip(s,u,'shotgun'),true);assert.equal(u.ap,7);
 s.phase='explore';s.engaged=false;s.alerted.clear();s.rules.awareness=true;assert.equal(equipCost(s,u,u.slots[0]),0);assert.equal(equip(s,u,u.slots[0]),true);assert.equal(u.ap,7);
});
test('reload buttons require a held weapon, reserve ammunition and AP, with jam clearing kept available',()=>{
 const {s,u}=fixture();u.ammo[u.weapon]=0;u.pack.push({type:'ammo',kind:u.weapon,count:100});assert.equal(weaponReadout(s,u,u.weapon).canReload,true);assert.equal(weaponReadout(s,u,u.slots[1]).canReload,false);
 assert.equal(reload(s,u),true);assert.equal(u.ap,9);assert.equal(weaponReadout(s,u,u.weapon).canReload,false);
 u.pack.find(i=>i.kind===u.weapon&&i.type==='weapon').jammed=true;assert.equal(weaponReadout(s,u,u.weapon).canReload,true);assert.equal(weaponReadout(s,u,u.weapon).reloadLabel,'Clear jam');assert.equal(reload(s,u),true);assert.equal(u.ap,6);
 assert.equal(weaponReadout(s,u,u.slots[1],{blocked:true}).canEquip,false);
});
test('ammo counters distinguish loaded rounds, grenades and fuel without counting reserves as loaded',()=>{
 const {s,u}=fixture();for(const [kind,label]of [['rifle','rounds'],['grenade','grenades'],['flamethrower','bursts']]){u.ammo[kind]=2;u.pack.push({type:'ammo',kind,count:9});const read=weaponReadout(s,u,kind);assert.equal(read.amount,2);assert.equal(read.unit,label);assert.ok(read.reserve>=9);}
 assert.equal(weaponReadout(s,u,'knife').amount,null);assert.equal(weaponReadout(s,u,'hands').amount,null);
});
test('empty and utility slots stay manageable without offering invalid swaps',()=>{
 const {s,u}=fixture();u.slots=[u.weapon,null];assert.deepEqual(readyWeapons(u),[u.weapon,null]);const blank=weaponReadout(s,u,null);assert.equal(blank.canEquip,false);assert.equal(blank.amount,null);
 u.slots[1]='wireCutters';const tool=weaponReadout(s,u,'wireCutters');assert.equal(tool.canEquip,false);assert.equal(tool.amount,null);assert.equal(tool.name,'Wire cutters');
});
test('resources stay finite and casualty cards retain an honest status',()=>{
 assert.deepEqual(resource(-5,100),{value:0,max:100,percent:0});assert.deepEqual(resource(120,100),{value:100,max:100,percent:100});assert.ok(Number.isFinite(resource(undefined,undefined).percent));
 const {s,u}=fixture();u.hp=0;u.casualty='bleeding';u.bleedTurns=2;const v=squadReadout(s,u);assert.equal(v.hp.value,0);assert.equal(v.status,'Bleeding · 2 turns');assert.ok(v.weapons.every(w=>!w.canEquip&&!w.canReload));
});
