import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {QUICKPLAY_PRESETS,DEFAULT_QUICKPLAY_TEAM,normalizeQuickPlayTeam,validQuickPlayTeam,quickPlayEntry,quickPlayTeamFromSearch} from '../dist/tactics/quickplay-presets.js';
import {createQuickPlayGame} from '../dist/tactics/quickplay-game.js';
import {normalizeSettings,saveSettings,readSettings} from '../dist/tactics/settings-3d.js';
import {blankMap,parseMap} from '../dist/tactics/core/maps.js';
import {createGame,WEAPONS,equip,reload,equipCost,previewAttack,attackGround,attack,refresh} from '../dist/tactics/core/engine.js';
import {accepts,receive,gridLayout,reserve,loadWeight} from '../dist/tactics/core/inventory.js';
import {characterSheet} from '../dist/tactics/character-screen.js';
import {handWeapons,dualPistols,SECOND_PISTOL} from '../dist/tactics/one-handed.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {weaponReadout} from '../dist/tactics/battle-hud-model.js';
import {transferItem} from '../dist/tactics/battle-inventory.js';
const team=['heavy','demolition','sniper','doctor'];
function fixture(ids=DEFAULT_QUICKPLAY_TEAM){const m=blankMap('Quick Fight roles');m.starts=[{x:10,y:10},{x:30,y:30},{x:35,y:35},{x:40,y:40}];const s=createQuickPlayGame(42,m,true,'easy',ids);startEncounterClock(s);return s;}
function dualFixture(){const s=fixture(),u=s.units.find(u=>u.quickPlayRole==='demolition');s.rules.awareness=false;s.phase='player';s.engaged=true;u.ap=30;assert.ok(equip(s,u,SECOND_PISTOL));assert.ok(equip(s,u,'pistol'));u.ap=30;return {s,u,point:{x:u.x+4,y:u.y,z:0}};}

test('selection requires exactly four distinct known presets and migrates older preferences',()=>{
 assert.equal(QUICKPLAY_PRESETS.length,6);assert.equal(validQuickPlayTeam(team),true);
 for(const bad of [null,[],['heavy'],[...team,'gunner'],['heavy','heavy','doctor','sniper'],['heavy','bad','doctor','sniper']]){assert.equal(validQuickPlayTeam(bad),false);assert.deepEqual(normalizeQuickPlayTeam(bad),DEFAULT_QUICKPLAY_TEAM);}
 assert.deepEqual(normalizeSettings({}).quickPlayTeam,DEFAULT_QUICKPLAY_TEAM);
 assert.deepEqual(quickPlayTeamFromSearch('?team=heavy,demolition,sniper,doctor',DEFAULT_QUICKPLAY_TEAM),team);assert.deepEqual(quickPlayTeamFromSearch('?team=heavy,heavy,sniper,doctor',team),team);
 let value;globalThis.localStorage={getItem:()=>value,setItem:(k,v)=>value=v};
 try{assert.ok(saveSettings({...normalizeSettings({difficulty:'standard'}),quickPlayTeam:team}));assert.deepEqual(readSettings().quickPlayTeam,team);assert.equal(readSettings().difficulty,'standard');}finally{delete globalThis.localStorage;}
});

test('all fifteen four-of-six combinations create equipped, distinct and independently owned specialists',()=>{
 const ids=QUICKPLAY_PRESETS.map(p=>p.id);let combinations=0;
 for(let a=0;a<3;a++)for(let b=a+1;b<4;b++)for(let c=b+1;c<5;c++)for(let d=c+1;d<6;d++){
  const chosen=[ids[a],ids[b],ids[c],ids[d]],s=createQuickPlayGame(42,blankMap(),false,'easy',chosen),units=s.units.filter(u=>u.team==='squad');
  assert.deepEqual(s.quickPlayTeam,chosen);assert.equal(new Set(units.map(u=>u.name)).size,4);
  units.forEach((u,i)=>{const p=QUICKPLAY_PRESETS.find(p=>p.id===chosen[i]);assert.equal(u.quickPlayRole,p.id);assert.equal(u.name,p.name);assert.equal(u.species,p.species);assert.deepEqual(u.stats,p.stats);assert.deepEqual(u.slots,p.weapons.slice(0,2));assert.ok(gridLayout(u).ok);assert.ok(u.pack.every(i=>i.type!=='ammo'));assert.ok(loadWeight(u)<=10+.4*u.stats.strength);for(const kind of p.weapons)assert.equal(u.ammo[kind],WEAPONS[kind].mag);});
  units[0].ammoPouch.pistol=999;assert.ok(units.slice(1).every(u=>u.ammoPouch.pistol!==999));combinations++;
 }assert.equal(combinations,15);
});

test('the real Quick Fight map uses the four defaults, while ordinary campaign/editor constructors retain their cast',()=>{
 const m=parseMap(fs.readFileSync(new URL('../dist/tactics/default-factory.json',import.meta.url),'utf8')),before=structuredClone(m),s=createQuickPlayGame(1947,m,false);
 assert.deepEqual(s.units.filter(u=>u.team==='squad').map(u=>u.weapon),['flamethrower','hmg','pistol','assault']);assert.deepEqual(m,before);
 const old=createGame(1947,m,false,'easy',{statSystem:true});assert.deepEqual(old.units.filter(u=>u.team==='squad').map(u=>u.weapon),['assault','rifle','pistol','knife']);assert.ok(!old.quickPlayTeam);
 for(const q of ['?campaign=continue','?study=grenades','?editorPlaytest=abc','?load=old'])assert.equal(quickPlayEntry(q),false,q);
 assert.equal(quickPlayEntry(''),true);assert.equal(quickPlayEntry('?load=new',s),true);
});

test('doctor starts with real medical supplies and high Medical; demolition has six grenades total',()=>{
 const s=fixture(team),doctor=s.units.find(u=>u.quickPlayRole==='doctor'),demo=s.units.find(u=>u.quickPlayRole==='demolition');
 assert.equal(doctor.medkits,3);assert.equal(doctor.stats.medical,95);const chest=doctor.pack.find(i=>i.kind==='largeMedicalKit');assert.equal(chest.charges,10);assert.equal(gridLayout(doctor).entries.find(e=>e.item===chest).span,2);
 assert.equal(demo.ammo.grenade+reserve(demo,'grenade',s),6);assert.ok(demo.pack.some(i=>i.kind==='smg'));
 for(const p of QUICKPLAY_PRESETS)assert.ok(fs.existsSync(new URL('../dist/assets/characters/'+p.species+'-idle.png',import.meta.url)),p.species+' portrait');
});

test('pistol and grenade are simultaneously in hand; selecting either is free but drawing the SMG costs AP',()=>{
 const s=fixture(),u=s.units.find(u=>u.quickPlayRole==='demolition');s.phase='player';s.engaged=true;u.ap=10;
 assert.deepEqual(handWeapons(u),['pistol','grenade']);assert.ok(characterSheet(u).equipment.every(i=>i.held));assert.equal(equipCost(s,u,'grenade'),0);assert.ok(equip(s,u,'grenade'));assert.equal(u.ap,10);assert.ok(equip(s,u,'pistol'));assert.equal(u.ap,10);
 assert.equal(weaponReadout(s,u,'grenade').cost,0);assert.equal(equipCost(s,u,'smg'),3);assert.ok(equip(s,u,'smg'));assert.equal(u.ap,7);assert.deepEqual(handWeapons(u),['smg']);
});

test('a second pistol pickup preserves both magazines and conditions; a third is rejected atomically',()=>{
 const s=fixture(),u=s.units.find(u=>u.quickPlayRole==='rifleman');u.ammo.pistol=2;const item={type:'weapon',kind:'pistol',rounds:5,condition:47},before=structuredClone(item);
 assert.ok(accepts(u,item));receive(u,item);assert.deepEqual(item,before);assert.equal(u.ammo.pistol,2);assert.equal(u.ammo[SECOND_PISTOL],5);assert.equal(u.pack.find(i=>i.kind===SECOND_PISTOL).condition,47);
 const owned=structuredClone(u);assert.equal(accepts(u,item),false);assert.deepEqual(u,owned);
});

test('dual fire previews and resolves exactly one round per pistol at 1.5x AP, retaining ordinary single fire',()=>{
 const {s,u,point}=dualFixture();assert.ok(dualPistols(u));const target={...point,id:'ground',team:'terrain',name:'Terrain',hp:1,ground:true,weapon:'hands'};
 const single=previewAttack(s,u,target),dual=previewAttack(s,u,target,true);assert.ok(dual.ok,dual.reason);assert.equal(single.cost,4);assert.equal(dual.cost,6);assert.equal(dual.rounds,2);assert.equal(dual.chance,single.chance-15);
 assert.equal(previewAttack(s,u,target,true,'torso',null,'aimed').cost,9);assert.equal(previewAttack(s,u,target,true,'torso',null,'full').cost,12);
 const a=u.ammo.pistol,b=u.ammo[SECOND_PISTOL];assert.ok(attackGround(s,u,point,true));assert.equal(u.ap,24);assert.equal(u.ammo.pistol,a-1);assert.equal(u.ammo[SECOND_PISTOL],b-1);assert.deepEqual(s.effect.sequence.map(e=>e.weapon),['pistol',SECOND_PISTOL]);
 assert.ok(attackGround(s,u,point,false));assert.equal(u.ap,20);assert.equal(u.ammo.pistol,a-2);assert.equal(u.ammo[SECOND_PISTOL],b-1);
});

test('missing offhand ammo, a jam, inadequate AP and queued movement reject dual fire without consuming anything',()=>{
 for(const reason of ['empty','jam','ap','moving']){const {s,u,point}=dualFixture();if(reason==='empty')u.ammo[SECOND_PISTOL]=0;if(reason==='jam')u.pack.find(i=>i.kind===SECOND_PISTOL).jammed=true;if(reason==='ap')u.ap=5;if(reason==='moving')s.queue=[{id:u.id,x:u.x+1,y:u.y}];const before=structuredClone(s);assert.equal(attackGround(s,u,point,true),false,reason);assert.deepEqual(s,before,reason);}
});

test('each pistol reloads independently from the same finite squad pistol supply',()=>{
 const {s,u}=dualFixture();for(const v of s.units)v.ammoPouch={};u.ammoPouch={pistol:5};u.ammo.pistol=0;u.ammo[SECOND_PISTOL]=1;assert.ok(equip(s,u,SECOND_PISTOL));assert.ok(reload(s,u));assert.equal(u.ammo[SECOND_PISTOL],6);assert.equal(u.ammo.pistol,0);assert.equal(reserve(u,'pistol',s),0);assert.ok(equip(s,u,'pistol'));assert.equal(reload(s,u),false);
});

test('dual shots at a living opponent use the same preview and spend one round from each gun',()=>{
 const m=blankMap('Dual target');m.starts=[{x:10,y:10},{x:30,y:30},{x:35,y:35},{x:40,y:40}];m.guards=[{x:39,y:35,species:'pig-foreman',weapon:'pistol'}];
 const s=createQuickPlayGame(42,m,false),u=s.units[2],b=s.units[4];s.rules.awareness=false;u.heading=0;refresh(s);s.phase='player';s.engaged=true;u.ap=30;assert.ok(equip(s,u,SECOND_PISTOL));assert.ok(equip(s,u,'pistol'));b.hp=b.maxHp=1000;u.ap=30;
 const before=structuredClone(s),p=previewAttack(s,u,b,true);assert.ok(p.ok,p.reason);assert.equal(p.cost,6);assert.deepEqual(s,before);
 assert.ok(attack(s,u,b,true));assert.equal(u.ap,24);assert.equal(u.ammo.pistol,7);assert.equal(u.ammo[SECOND_PISTOL],7);assert.equal(s.effect.sequence.length,2);
});

test('an offhand jam after the first shot preserves its ammunition and keeps the paid attempt cost',()=>{
 const {s,u,point}=dualFixture();const second=u.pack.find(i=>i.kind===SECOND_PISTOL);second.condition=9;s.jamSeed=2000;
 assert.ok(attackGround(s,u,point,true));assert.equal(u.ap,24);assert.equal(u.ammo.pistol,7);assert.equal(u.ammo[SECOND_PISTOL],8);assert.equal(second.jammed,true);assert.equal(s.effect.sequence.length,1);
});

test('giving, dropping and recovering the second pistol conserve its own magazine and condition',()=>{
 const {s,u}=dualFixture(),v=s.units.find(v=>v.quickPlayRole==='rifleman');v.x=u.x+1;v.y=u.y;u.ammo[SECOND_PISTOL]=5;u.pack.find(i=>i.kind===SECOND_PISTOL).condition=42;
 const loaded=()=>s.units.reduce((n,v)=>n+v.pack.filter(i=>i.type==='weapon'&&['pistol',SECOND_PISTOL].includes(i.kind)).reduce((n,i)=>n+v.ammo[i.kind],0),0)+s.loot.reduce((n,p)=>n+p.items.filter(i=>i.type==='weapon'&&['pistol',SECOND_PISTOL].includes(i.kind)).reduce((n,i)=>n+i.rounds,0),0),total=loaded();
 assert.ok(transferItem(s,u,{mode:'give',key:String(u.pack.findIndex(i=>i.kind===SECOND_PISTOL)),target:v}));assert.equal(v.ammo[SECOND_PISTOL],5);assert.equal(v.pack.find(i=>i.kind===SECOND_PISTOL).condition,42);assert.equal(loaded(),total);
 assert.ok(transferItem(s,v,{mode:'drop',key:String(v.pack.findIndex(i=>i.kind===SECOND_PISTOL))}));const pile=s.loot.find(p=>p.items.some(i=>i.kind===SECOND_PISTOL));assert.equal(loaded(),total);
 assert.ok(transferItem(s,u,{mode:'take',target:pile,index:pile.items.findIndex(i=>i.kind===SECOND_PISTOL)}));assert.equal(u.ammo[SECOND_PISTOL],5);assert.equal(u.pack.find(i=>i.kind===SECOND_PISTOL).condition,42);assert.equal(loaded(),total);
});

test('save/load retains selection, spent supplies, each pistol and injuries without reapplying presets',()=>{
 const {s,u}=dualFixture();u.hp-=17;u.ammo.pistol=2;u.ammo[SECOND_PISTOL]=5;u.ammoPouch.pistol=7;u.pack.find(i=>i.kind===SECOND_PISTOL).condition=42;
 const restored=restoreEncounter(captureEncounter(s)),v=restored.units.find(v=>v.id===u.id);assert.deepEqual(restored.quickPlayTeam,s.quickPlayTeam);assert.equal(v.hp,u.hp);assert.equal(v.ammo.pistol,2);assert.equal(v.ammo[SECOND_PISTOL],5);assert.equal(v.ammoPouch.pistol,7);assert.equal(v.pack.find(i=>i.kind===SECOND_PISTOL).condition,42);assert.ok(dualPistols(v));
 const again=restoreEncounter(captureEncounter(restored));assert.deepEqual(again.units,restored.units);
});
