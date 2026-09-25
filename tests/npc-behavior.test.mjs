import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,refresh,attack,previewAttack,alarm,stepInvestigation,stepEnemy,resolveOverwatch,coverAgainst,setState} from '../dist/tactics/core/engine.js';
import {characterDefaults,hostileToPlayer,characterTalkStatus} from '../dist/tactics/character-properties.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
const fixture=(behavior='fight',faction='player',attitude='hostile')=>{const m=blankMap('NPC reactions');m.starts[0]={x:10,y:10};m.guards=[{x:13,y:10,species:'donkey',weapon:'pistol',character:{...characterDefaults('guards','npc'),combatBehavior:behavior,faction,attitude}}];const s=createGame(42,m,true,'easy',{statSystem:true});startEncounterClock(s);return s;};
test('player faction overrides hostile starting attitude; neutral outsiders also stay peaceful',()=>{for(const [f,a] of [['player','hostile'],['unaffiliated','neutral'],['red-hats','friendly']]){const s=fixture('fight',f,a),g=s.units[4];assert.equal(hostileToPlayer(s,g),false);alarm(s,s.units[0],30);refresh(s);assert.equal(g.alert,false);assert.notEqual(s.phase,'player');assert.equal(previewAttack(s,g,s.units[0]).ok,false);s.phase='enemy';s.enemyIndex=4;g.alert=true;const hp=s.units[0].hp;stepEnemy(s);assert.equal(s.units[0].hp,hp);}});
test('a valid player attack provokes even a same-faction NPC and survives saving',()=>{const s=fixture(),g=s.units[4],p=s.units[0];p.heading=0;assert.equal(attack(s,p,g),true);assert.equal(hostileToPlayer(s,g),true);assert.equal(g.character.attitude,'hostile');const loaded=restoreEncounter(captureEncounter(s));assert.equal(hostileToPlayer(loaded,loaded.units[4]),true);});
test('cowering and fleeing NPCs react to gunfire without becoming hostile or returning fire',()=>{for(const behavior of ['cower','flee']){const s=fixture(behavior),g=s.units[4],p=s.units[0],before={x:g.x,y:g.y};alarm(s,p,30);assert.equal(hostileToPlayer(s,g),false);s.phase='explore';stepInvestigation(s);assert.equal(g.civilianFlee,true);assert.ok(Math.hypot(g.x-p.x,g.y-p.y)>Math.hypot(before.x-p.x,before.y-p.y));assert.equal(previewAttack(s,g,p).ok,false);}});
test('attacked noncombatants stay noncombatants and overwatch does not shoot them',()=>{for(const behavior of ['cower','flee']){const s=fixture(behavior),g=s.units[4],p=s.units[0];p.heading=0;assert.equal(attack(s,p,g),true);assert.equal(hostileToPlayer(s,g),true);assert.equal(previewAttack(s,g,p).ok,false);s.phase='enemy';p.overwatch={weapon:p.weapon,heading:p.heading,range:30};const hp=g.hp;resolveOverwatch(s,g);assert.equal(g.hp,hp);s.enemyIndex=4;const ammo=g.ammo.pistol;stepEnemy(s);assert.equal(g.ammo.pistol,ammo);}});

test('cowerers move to reachable cover before kneeling, then flee at ten tiles',()=>{
 const s=fixture('cower'),g=s.units[4],p=s.units[0];g.x=30;g.y=10;g.lastAt='30,10,0';s.map[12][29]='crate';alarm(s,p,40);s.phase='explore';
 const start={x:g.x,y:g.y};for(let i=0;i<20&&g.stance!=='kneeling';i++)stepInvestigation(s);
 assert.notDeepEqual({x:g.x,y:g.y},start);assert.equal(g.stance,'kneeling');assert.ok(coverAgainst(s,p,g));assert.ok(!g.civilianFlee);
 p.x=g.x-10;p.y=g.y;const d=Math.hypot(g.x-p.x,g.y-p.y);stepInvestigation(s);assert.equal(g.civilianFlee,true);assert.ok(Math.hypot(g.x-p.x,g.y-p.y)>d);
});
test('a successful distant hit switches a cowerer to fleeing and survives save/load',()=>{
 const s=fixture('cower'),g=s.units[4],p=s.units[0];g.x=22;g.y=10;g.hp=g.maxHp=1000;p.accuracy=100;p.heading=0;p.ap=p.maxAp=100;
 for(let n=0;n<6&&g.hp===1000;n++){s.phase='player';p.ap=100;attack(s,p,g);}
 assert.ok(g.hp<1000);assert.equal(g.civilianFlee,true);const loaded=restoreEncounter(captureEncounter(s));assert.equal(loaded.units[4].civilianFlee,true);
 const before=Math.hypot(g.x-p.x,g.y-p.y);s.phase='explore';stepInvestigation(s);assert.ok(Math.hypot(g.x-p.x,g.y-p.y)>before);assert.equal(previewAttack(s,g,p).ok,false);
});

test('guard suspicion does not panic civilians; alerts block talk until quiet standdown',()=>{
 const s=fixture('cower','unaffiliated','neutral'),g=s.units[4];g.x=30;g.character.canTalk=true;g.character.dialogueRef='welcome';
 setState(s,g,'suspicious',{x:10,y:10,z:0});assert.ok(!g.npcFrightened);assert.equal(characterTalkStatus(s,g).ok,true);
 setState(s,g,'alert',{x:10,y:10,z:0});assert.equal(g.npcFrightened,true);assert.match(characterTalkStatus(s,g).reason,/frightened/);
 const ticks=g.npcFearTicks;refresh(s);refresh(s);assert.equal(g.npcFearTicks,ticks);
 s.phase='player';for(let n=0;n<30;n++)stepInvestigation(s);assert.equal(g.npcFearTicks,ticks);assert.equal(characterTalkStatus(s,g).ok,false);
 s.phase='explore';s.engaged=false;for(let n=0;n<30;n++)stepInvestigation(s);assert.equal(g.npcFrightened,false);assert.equal(characterTalkStatus(s,g).ok,true);
});
