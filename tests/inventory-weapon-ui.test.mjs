import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,WEAPONS} from '../dist/tactics/core/engine.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {equipmentBlockReason} from '../dist/tactics/character-screen.js';
import {WEAPON_ICONS,weaponIcon} from '../dist/tactics/weapon-icons.js';
import {BattleRenderer} from '../dist/tactics/battle-renderer.js';

test('every weapon has a distinct, self-contained vector icon; unknown items do not invent art',()=>{
 assert.deepEqual(Object.keys(WEAPON_ICONS).sort(),Object.keys(WEAPONS).sort());
 const sources=Object.keys(WEAPONS).map(kind=>fs.readFileSync(new URL('../dist/tactics/'+weaponIcon(kind),import.meta.url),'utf8'));
 assert.equal(new Set(sources).size,sources.length);
 for(const svg of sources){assert.match(svg,/viewBox="0 0 176 64"/);assert.doesNotMatch(svg,/<(?:script|image|foreignObject)|(?:href|filter)=/);}
 assert.equal(weaponIcon('unknown'),null);
});

test('Inventory explains blocked control without treating its own inspection pause as a blocker',()=>{
 const s=createGame(1,blankMap(),true,'easy'),u=s.units[0];s.phase='player';s.queue=[];
 assert.equal(equipmentBlockReason(s,u),'');assert.match(equipmentBlockReason(s,u,{busy:true}),/Close Inventory/);
 s.queue=[{}];assert.match(equipmentBlockReason(s,u),/Stop squad movement/);s.queue=[];s.phase='enemy';assert.match(equipmentBlockReason(s,u),/your turn/);
 s.phase='player';u.hp=0;assert.match(equipmentBlockReason(s,u),/cannot change equipment/);
});

test('opening Inventory can settle pending and active cosmetic draws without changing game state or time',()=>{
 const state={units:[{id:0,weapon:'pistol'},{id:1,weapon:'rifle'}],queue:[{x:3,y:4}],clock:{minutes:500}},before=structuredClone(state);let disposed=0,posed=0;
 const models=new Map([[0,{weapon:'assault',drawRequested:true}],[1,{weapon:'rifle',draw:{dispose:()=>disposed++}}]]);
 const renderer={models,presentationNow:100,combat:{busy:false},traversal:{busy:false},fire:{busy:false},tankEffects:{busy:false},actor(u){const m=models.get(u.id);assert.equal(m.drawSkipWeapon,u.weapon);assert.equal(m.drawRequested,false);m.weapon=u.weapon;posed++;}};
 assert.equal(BattleRenderer.prototype.settleEquipmentDraws.call(renderer,state),true);
 assert.equal(disposed,1);assert.equal(posed,2);assert.equal(renderer.presentationNow,100);assert.deepEqual(state,before);
 for(const m of models.values()){assert.equal(m.draw,null);assert.equal(m.drawRequested,false);assert.equal(m.drawSkipWeapon,undefined);}
});

test('Inventory never skips combat, traversal, fire or tank blast playback to unlock a swap',()=>{
 for(const channel of ['combat','traversal','fire','tankEffects']){
  const m={drawRequested:true},renderer={models:new Map([[0,m]]),combat:{busy:false},traversal:{busy:false},fire:{busy:false},tankEffects:{busy:false},actor(){assert.fail('An active gameplay action was skipped');}};
  renderer[channel].busy=true;assert.equal(BattleRenderer.prototype.settleEquipmentDraws.call(renderer,{units:[{id:0,weapon:'pistol'}]}),false);assert.equal(m.drawRequested,true);
 }
});
