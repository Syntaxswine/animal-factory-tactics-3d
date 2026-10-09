import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,WEAPONS,attackGround,equip,stowWeapon} from '../dist/tactics/core/engine.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {characterSheet,equipmentBlockReason} from '../dist/tactics/character-screen.js';
import {WEAPON_ICONS,WEAPON_FRAMES,weaponIcon} from '../dist/tactics/weapon-icons.js';
import {BattleRenderer} from '../dist/tactics/battle-renderer.js';

test('every weapon has a distinct transparent painted PNG with a valid display frame',()=>{
 assert.deepEqual(Object.keys(WEAPON_ICONS).sort(),Object.keys(WEAPONS).sort());
 const sources=Object.keys(WEAPONS).map(kind=>{
  const png=fs.readFileSync(new URL('../dist/tactics/'+weaponIcon(kind),import.meta.url));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const size=[png.readUInt32BE(16),png.readUInt32BE(20)],{size:expected,frame:[x,y,w,h]}=WEAPON_FRAMES[kind];
  assert.deepEqual(size,expected);assert.equal(png[25],6,'PNG must retain RGBA transparency');
  assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=size[0]&&y+h<=size[1],kind+' viewport stays inside source');
  return png.toString('base64');
 });
 assert.equal(new Set(sources).size,sources.length);
 assert.equal(weaponIcon('unknown'),null);
});

test('Inventory explains blocked control without treating its own inspection pause as a blocker',()=>{
 const s=createGame(1,blankMap(),true,'easy'),u=s.units[0];s.phase='player';s.queue=[];
 assert.equal(equipmentBlockReason(s,u),'');assert.match(equipmentBlockReason(s,u,{busy:true}),/Close Inventory/);
 s.queue=[{}];assert.match(equipmentBlockReason(s,u),/Stop squad movement/);s.queue=[];s.phase='enemy';assert.match(equipmentBlockReason(s,u),/your turn/);
 s.phase='player';u.hp=0;assert.match(equipmentBlockReason(s,u),/cannot change equipment/);
});

for(const rounds of [8,1])for(const route of ['stow','replace-ready-slot'])test(`backpack ammunition shows ${rounds-1} rounds after firing and ${route}`,()=>{
 const map=blankMap('Backpack ammunition');map.starts=[{x:10,y:10},{x:30,y:30},{x:35,y:35},{x:40,y:40}];
 const s=createGame(42,map,true,'easy'),u=s.units[0];s.phase='player';s.engaged=true;s.rules.awareness=false;u.ap=20;
 assert.ok(equip(s,u,'pistol'));u.ammo.pistol=rounds;
 assert.ok(attackGround(s,u,{x:13,y:10,z:0}));assert.equal(u.ammo.pistol,rounds-1);
 if(route==='stow')assert.ok(stowWeapon(s,u,u.slots.indexOf('pistol')));
 else {u.pack.push({type:'weapon',kind:'shotgun',rounds:6});u.ammo.shotgun=6;assert.ok(equip(s,u,'shotgun',u.slots.indexOf('pistol')));}
 const before=structuredClone(u),sheet=characterSheet(u),pistol=sheet.backpack.find(e=>e.item.type==='weapon'&&e.item.kind==='pistol');
 assert.ok(pistol);assert.equal(pistol.item.rounds,rounds-1,'the backpack must show current ammunition, including zero');
 assert.deepEqual(u,before,'opening the character sheet must not update or otherwise mutate the live inventory');
 assert.ok(equip(s,u,'pistol'));assert.equal(u.ammo.pistol,rounds-1,'re-equipping must retain the same ammunition');
 assert.equal(characterSheet(u).equipment.find(i=>i.kind==='pistol').rounds,rounds-1);
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
