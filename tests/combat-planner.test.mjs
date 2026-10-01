import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,previewAttack,attack,equip,movementCost,endTurn,move,stepMovement,headingTo,WEAPONS} from '../dist/tactics/core/engine.js';
import {nearbyCliffClimbs} from '../dist/tactics/cliff-actions.js';
import {towerClimbPreview,climbTower} from '../dist/tactics/tower-actions.js';
import {towerEntry} from '../dist/tactics/tower-geometry.js';
import {shotAim} from '../dist/tactics/aim-levels.js';
import {shotForecast,shotBlockers} from '../dist/tactics/shot-planner.js';
import {incomingFire,woundLeg,turnAP,recoverAim,legImpaired} from '../dist/tactics/combat-state.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
function fixture(){const map=blankMap();map.starts[0]={x:10,y:10};map.guards=[{x:14,y:10,species:'pig-foreman',weapon:'pistol'}];const s=createGame(42,map,true,'easy'),a=s.units[0],b=s.units[4];equip(s,a,'assault');a.accuracy=70;a.heading=0;a.ap=30;s.phase='player';return {s,a,b};}
test('AP multipliers include the burst surcharge exactly once for every firearm',()=>{
 for(const w of Object.values(WEAPONS).filter(w=>w.mag&&!w.blast&&!w.incendiary))for(const burst of [false,true]){const hip=shotAim(w,'hip',burst).cost;assert.equal(shotAim(w,'aimed',burst).cost,Math.ceil(hip*1.5));assert.equal(shotAim(w,'full',burst).cost,hip*2);}
});
test('burst execution uses the forecast recoil progression, with one AP charge',()=>{
 const {s,a,b}=fixture();b.hp=b.maxHp=10000;const p=previewAttack(s,a,b,true,'torso',null,'full'),ap=a.ap,ammo=a.ammo.assault;
 assert.ok(p.ok,p.reason);assert.ok(attack(s,a,b,true,false,'torso',false,'full'));assert.equal(a.ap,ap-p.cost);assert.equal(a.ammo.assault,ammo-p.rounds);assert.deepEqual(s.effect.sequence.map(e=>e.shotChance),p.shotChances);assert.ok(p.shotChances.every((v,i,arr)=>!i||v<arr[i-1]));
});
test('forecast is deterministic and cannot mutate encounter RNG or state',()=>{
 const {s,a,b}=fixture(),p=previewAttack(s,a,b,true,'torso',null,'full'),before=structuredClone(s),forecast=shotForecast(s,a,b,p);
 assert.deepEqual(shotForecast(s,a,b,p),forecast);assert.deepEqual(s,before);assert.equal(forecast.length,p.rounds);for(const r of forecast){assert.ok(r.any>=r.selected);assert.ok(r.any<=100&&r.selected>=0);}
});
test('solid cover prevents the forecast reporting a hit through a wall',()=>{
 const {s,a,b}=fixture(),p=previewAttack(s,a,b,false,'torso',null,'full');s.map[10][12]='wall';const result=shotForecast(s,a,b,p);assert.equal(result,null);assert.equal(previewAttack(s,a,b).ok,false);
});
test('injury and fatigue still reduce fully aimed accuracy',()=>{
 const {s,a,b}=fixture();const rested=previewAttack(s,a,b,false,'torso',null,'full').chance;a.hp=Math.floor(a.maxHp/2);a.stamina=0;assert.ok(previewAttack(s,a,b,false,'torso',null,'full').chance<rested);
});
test('leg wounds double movement, remove three AP once and recover at full health',()=>{
 const {a}=fixture(),base=movementCost(a);a.hp--;woundLeg(a);assert.equal(a.ap,27);assert.equal(movementCost(a),base*2);assert.equal(turnAP(a),a.maxAp-3);woundLeg(a);assert.equal(a.ap,27);a.hp=a.maxHp;assert.equal(movementCost(a),base);recoverAim(a,()=>0);assert.equal(a.legWound,undefined);
});
test('a damaging leg shot applies a nonstacking movement injury in gameplay',()=>{
 const {s,a,b}=fixture();a.accuracy=100;b.hp=b.maxHp=10000;s.seed=1;assert.ok(attack(s,a,b,false,false,'legs',false,'full'));assert.equal(legImpaired(b),true);
});
test('injured cliff preview, execution and traversal record agree on 16 AP',()=>{
 const map=blankMap();setTerrain(map,4,4,1,'floor');map.climbs=[{x:3,y:4,z:0,dx:1,dy:0,kind:'cliff'}];const s=createGame(1,map,true,'easy'),u=s.units[0];s.phase='player';u.hp--;woundLeg(u);u.ap=15;
 assert.equal(nearbyCliffClimbs(s,u)[0].cost,16);assert.equal(nearbyCliffClimbs(s,u)[0].ok,false);assert.equal(move(s,u,4,4,1),false);u.ap=16;assert.ok(move(s,u,4,4,1));assert.ok(stepMovement(s));assert.equal(u.ap,0);assert.equal(s.cliffTraversals[0].cost,16);
});
test('injured tower preview and execution agree on doubled climbing AP',()=>{
 const map=blankMap(),tower={kind:'iron-searchlight-ladder-tower',x:10,y:10,z:0};map.props=[tower];map.starts[0]=towerEntry(tower);const s=createGame(1,map,true,'easy'),u=s.units[0];s.phase='player';u.hp--;woundLeg(u);u.ap=11;assert.equal(towerClimbPreview(s,u).cost,12);assert.equal(climbTower(s,u),false);u.ap=12;assert.ok(climbTower(s,u));assert.equal(u.ap,0);assert.equal(s.towerTraversal.apCost,12);
});
test('five distinct threatening enemies trigger one personal leadership test per round',()=>{
 const {s,a}=fixture();a.stats={leadership:50};let rolls=0;const fail=()=>{rolls++;return .99;};
 for(let i=0;i<10;i++)incomingFire(s,a,{id:40,team:'guard'},true,fail);assert.equal(rolls,0);
 for(let id=41;id<44;id++)incomingFire(s,a,{id,team:'guard'},true,fail);assert.equal(rolls,0);
 assert.equal(incomingFire(s,a,{id:44,team:'guard'},false,fail),false);assert.equal(rolls,0);
 assert.equal(incomingFire(s,a,{id:44,team:'guard'},true,fail),true);assert.equal(a.pinned,true);incomingFire(s,a,{id:45,team:'guard'},true,fail);assert.equal(rolls,1);
 s.round++;incomingFire(s,a,{id:46,team:'guard'},true,fail);assert.equal(a.suppression.attackers.length,1);
 recoverAim(a,()=>.1);assert.equal(a.pinned,false);
});
test('pinned units can hip fire but cannot pay for aimed shots, and leadership 100 passes',()=>{
 const {s,a,b}=fixture();a.pinned=true;assert.equal(previewAttack(s,a,b).ok,true);for(const level of ['aimed','full']){const before=structuredClone(a);assert.match(previewAttack(s,a,b,false,'torso',null,level).reason,/Pinned/);assert.equal(attack(s,a,b,false,false,'torso',false,level),false);assert.deepEqual(a,before);}a.stats={leadership:100};recoverAim(a,()=>.999);assert.equal(a.pinned,false);
});
test('guard turn refresh respects injury AP cap and attempts pin recovery',()=>{
 const {s,b}=fixture();b.hp--;woundLeg(b);b.pinned=true;b.stats={leadership:100};assert.ok(endTurn(s));assert.equal(b.ap,b.maxAp-3);assert.equal(b.pinned,false);
});
test('live guard bursts only register one attacker; five different guards can pin',()=>{
 const map=blankMap();map.starts[0]={x:10,y:10};map.guards=[[14,10],[14,11],[14,9],[13,12],[13,8]].map(([x,y])=>({x,y,species:'pig-foreman',weapon:'assault'}));
 const s=createGame(42,map,true,'easy'),a=s.units[0];s.phase='enemy';a.hp=a.maxHp=10000;a.stats={leadership:1};
 for(const g of s.units.filter(u=>u.team==='guard')){g.heading=headingTo(g,a);g.ap=30;assert.ok(attack(s,g,a,true,true),previewAttack(s,g,a,true).reason);}
 assert.equal(a.suppression.attackers.length,5);assert.equal(a.suppression.tested,true);assert.equal(a.pinned,true);
});
test('save loading validates and preserves optional combat fields; older saves load',()=>{
 const {s,a,b}=fixture();startEncounterClock(s);assert.ok(restoreEncounter(captureEncounter(s)));a.hp--;woundLeg(a);a.pinned=true;incomingFire(s,a,b,true,()=>.9);const record=captureEncounter(s),loaded=restoreEncounter(record);assert.deepEqual(loaded.units[0],a);
 for(const change of [u=>u.pinned=1,u=>u.legWound='yes',u=>u.suppression.attackers.push(999),u=>u.suppression.attackers.push(b.id),u=>u.suppression.round=-1]){const bad=structuredClone(record);change(bad.state.units[0]);assert.throws(()=>restoreEncounter(bad));}
});


test('unaffordable shots retain estimates without allowing execution or changing resources',()=>{
 const {s,a,b}=fixture();a.ap=0;const before=structuredClone(s),p=previewAttack(s,a,b,false,'torso',null,'full');assert.equal(p.reason,'Not enough AP');assert.ok(shotForecast(s,a,b,p)[0].any>0);assert.match(shotBlockers(s,a,b,p).join(' '),/0 AP.*needs 8 AP/);assert.equal(attack(s,a,b,false,false,'torso',false,'full'),false);assert.deepEqual(s,before);
});
test('personal identification and AP blockers are both explained without bypassing sight',()=>{
 const {s,a,b}=fixture(),friend=s.units[1];s.rules.awareness=true;b.sneaking=true;a.ap=0;a.awareness={[b.id]:{score:0}};Object.assign(friend,{x:10,y:11,heading:0,awareness:{[b.id]:{score:100}}});const p=previewAttack(s,a,b,false,'torso',null,'hip');assert.equal(p.reason,'Selected merc has not identified this target');assert.equal(shotForecast(s,a,b,p),null);const reasons=shotBlockers(s,a,b,p).join(' ');assert.match(reasons,/0 AP/);assert.match(reasons,/not personally identified/);assert.doesNotMatch(reasons,/face the target/);
});
