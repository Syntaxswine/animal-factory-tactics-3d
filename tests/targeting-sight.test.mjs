import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,canSee,canAimAt,previewAttack,attack,headingTo,WEAPONS} from '../dist/tactics/core/engine.js';
import {characterDefaults} from '../dist/tactics/character-properties.js';
import {shotForecast} from '../dist/tactics/shot-planner.js';
import {barrelTarget,EXPLOSIVE_BARREL} from '../dist/tactics/explosive-barrels.js';
import {barrelSight} from '../dist/tactics/barrel-targeting.js';

function fixture(){
 const map=blankMap('Free-turn targeting');
 map.time={startMinutes:720};
 map.starts=[{x:10,y:10},{x:14,y:13},{x:11,y:14},{x:12,y:14}];
 map.guards=[{x:14,y:10,species:'donkey',weapon:'hands',character:{...characterDefaults('guards','npc'),displayName:'Tour guide',canTalk:true}}];
 const s=createGame(42,map,true,'easy',{awareness:true}),a=s.units[0],b=s.units[4];
 for(const u of s.units){u.awareness={};u.heading=headingTo(u,b);}
 a.heading=180;a.ap=30;s.phase='player';
 return {s,a,b};
}

test('a horse can aim behind itself at a guide the squad sees without changing detection or state',()=>{
 const {s,a,b}=fixture(),before=structuredClone(s);
 assert.equal(canSee(s,a,b),false);
 assert.equal(canSee(s,s.units[1],b),true);
 for(const aim of ['hip','aimed','full']){
  assert.equal(canAimAt(s,a,b),true);
  const p=previewAttack(s,a,b,false,'torso',null,aim);
  assert.ok(p.ok,p.reason);assert.ok(shotForecast(s,a,b,p)[0].any>0);
 }
 assert.equal(canSee(s,a,b),false,'aim queries must not swivel detection');
 assert.deepEqual(s,before,'no heading, AP, clock, awareness, phase or RNG changes');
});

test('firing turns to the known target and charges only the selected shot cost',()=>{
 const {s,a,b}=fixture(),ap=a.ap,ammo=a.ammo[a.weapon],p=previewAttack(s,a,b,false,'torso',null,'full');
 b.hp=b.maxHp=10000;
 assert.ok(attack(s,a,b,false,false,'torso',false,'full'));
 assert.equal(a.heading,headingTo(a,b));assert.equal(a.ap,ap-p.cost);
 assert.equal(a.ammo[a.weapon],ammo-1);assert.equal(s.effect.sequence.length,1);
});

test('potential aim never discovers an unseen character or trusts a stale detected entry',()=>{
 const {s,a,b}=fixture();
 for(const u of s.units.filter(u=>u.team==='squad'))u.heading=(headingTo(u,b)+180)%360;
 s.detected.add(b.id);s.phase='explore';const before=structuredClone(s);
 assert.equal(canAimAt(s,a,b),false);
 assert.equal(previewAttack(s,a,b).reason,'Target not visible');
 assert.equal(shotForecast(s,a,b,previewAttack(s,a,b)),null);
 assert.equal(attack(s,a,b),false);assert.deepEqual(s,before);
});

test('free turning still rejects walls and closed doors even when an ally sees around them',()=>{
 const {s,a,b}=fixture();
 for(const obstruction of ['wall','door-wood-closed','door-steel-closed']){
  s.edges['e:11:10']=obstruction;
  assert.equal(canSee(s,s.units[1],b),true);
  assert.equal(canAimAt(s,a,b),false,obstruction);
  const p=previewAttack(s,a,b),before=structuredClone(s);
  assert.equal(p.reason,'Line of fire blocked');assert.equal(shotForecast(s,a,b,p),null);
  assert.equal(attack(s,a,b),false);assert.deepEqual(s,before);
 }
 s.edges['e:11:10']='doorway-concrete-open';assert.equal(canAimAt(s,a,b),true);
});

test('turning toward a window exposes the head without allowing a shot through its sill',()=>{
 const {s,a,b}=fixture();s.edges['e:13:10']='window-concrete';
 assert.equal(canAimAt(s,a,b),true);
 assert.ok(previewAttack(s,a,b,false,'head').ok);
 assert.equal(previewAttack(s,a,b,false,'legs').reason,'Legs hidden by cover');
 const before=structuredClone(s);assert.equal(attack(s,a,b,false,false,'legs'),false);assert.deepEqual(s,before);
});

test('free-turn aim does not identify a concealed target just because an ally recognized it',()=>{
 const {s,a,b}=fixture();b.sneaking=true;
 s.units[1].awareness[b.id]={score:100};
 assert.equal(canSee(s,s.units[1],b),true);
 assert.equal(canAimAt(s,a,b),false);
 assert.equal(previewAttack(s,a,b).reason,'Selected merc has not identified this target');
 a.awareness[b.id]={score:100};assert.equal(canAimAt(s,a,b),true);
});

test('guard detection and reserved overwatch never gain an automatic rear-facing shot',()=>{
 const {s,a,b}=fixture();b.heading=headingTo(b,a)+180;
 b.character.attitude='hostile';b.character.combatBehavior='fight';
 assert.equal(canSee(s,b,a),false);assert.equal(canAimAt(s,b,a),false);
 a.overwatch={weapon:a.weapon,heading:a.heading};s.phase='enemy';
 const before=structuredClone(s);
 assert.equal(attack(s,a,b,false,false,'torso',true),false);assert.deepEqual(s,before);
});

test('a free turn does not bypass AP checks and unaffordable shots still show estimates',()=>{
 const {s,a,b}=fixture();a.ap=0;const before=structuredClone(s),p=previewAttack(s,a,b);
 assert.equal(canAimAt(s,a,b),true);assert.equal(p.reason,'Not enough AP');
 assert.ok(shotForecast(s,a,b,p)[0].any>0);
 assert.equal(attack(s,a,b),false);assert.deepEqual(s,before);
});

test('direct flame targeting permits the same free turn to a known character',()=>{
 const {s,a,b}=fixture();a.weapon='flamethrower';a.ammo[a.weapon]=WEAPONS[a.weapon].mag;
 assert.equal(canSee(s,a,b),false);assert.ok(previewAttack(s,a,b).ok);
});

test('revealed barrels permit free-turn aim while hidden barrels and guard blind spots remain blocked',()=>{
 const {s,a}=fixture();s.props=[{x:14,y:10,z:0,kind:EXPLOSIVE_BARREL}];s.units.splice(4);
 const b=barrelTarget(s.props[0]);
 assert.equal(barrelSight(s,a,b),true);assert.ok(previewAttack(s,a,b).ok);
 s.difficulty='standard';s.seen.clear();assert.equal(barrelSight(s,a,b),false);
 s.seen.add('14,10');assert.equal(barrelSight(s,a,b),true);
 assert.equal(barrelSight(s,{...a,team:'guard'},b),false);
 s.edges['e:11:10']='wall';assert.equal(barrelSight(s,a,b),false);
});
