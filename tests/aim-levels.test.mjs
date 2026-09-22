import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,previewAttack,attack,WEAPONS,equip} from '../dist/tactics/core/engine.js';
import {shotAim} from '../dist/tactics/aim-levels.js';
function fixture(){const map=blankMap();map.starts[0]={x:10,y:10};map.guards=[{x:14,y:10,species:'pig-foreman',weapon:'pistol'}];const s=createGame(42,map,true,'easy'),a=s.units[0],b=s.units[4];equip(s,a,'pistol');a.accuracy=50;a.heading=0;a.ap=30;s.phase='player';return {s,a,b};}
test('three aim levels preview and charge increasing AP for the same shot',()=>{
 const chances=[];
 for(const [level,multiplier]of [['hip',1],['aimed',1.5],['full',2]]){
  const {s,a,b}=fixture(),p=previewAttack(s,a,b,false,'torso',null,level);assert.ok(p.ok,p.reason);assert.equal(p.cost,Math.ceil(WEAPONS.pistol.cost*multiplier));chances.push(p.chance);
  const before=a.ap,ammo=a.ammo.pistol;assert.equal(attack(s,a,b,false,false,'torso',false,level),true);assert.equal(a.ap,before-p.cost);assert.equal(a.ammo.pistol,ammo-1);
 }
 assert.equal(chances[1]-chances[0],10);assert.equal(chances[2]-chances[0],20);
});
test('insufficient AP rejects full aim without spending ammunition or AP; hip remains available',()=>{
 const {s,a,b}=fixture();a.ap=WEAPONS.pistol.cost;const ammo=a.ammo.pistol;
 assert.equal(previewAttack(s,a,b,false,'torso',null,'full').reason,'Not enough AP');assert.equal(attack(s,a,b,false,false,'torso',false,'full'),false);assert.equal(a.ap,WEAPONS.pistol.cost);assert.equal(a.ammo.pistol,ammo);assert.equal(previewAttack(s,a,b).ok,true);
});
test('aim respects accuracy cap, burst costs and weapons without precision aim',()=>{
 const {s,a,b}=fixture();a.accuracy=100;assert.equal(previewAttack(s,a,b,false,'torso',null,'full').chance,95);
 assert.equal(shotAim(WEAPONS.assault,'full',true).cost,2*(WEAPONS.assault.cost+2));
 for(const key of ['hands','grenade','flamethrower'])assert.deepEqual(shotAim(WEAPONS[key],'full'),shotAim(WEAPONS[key],'hip'));
 assert.equal(attack(s,a,b,false,false,'torso',false,'invalid'),false);
});
