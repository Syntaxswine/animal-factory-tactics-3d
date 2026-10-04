import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,edgeKey,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,attack,previewAttack,WEAPONS,equip,resolveOverwatch} from '../dist/tactics/core/engine.js';
import {bulletTrajectory,shotgunTrajectories,traceProjectile,muzzleHeight} from '../dist/tactics/core/projectiles.js';
import {seededShots,rollFirearmShot,failedShotRoll,rollMarginScatter} from '../dist/tactics/helicoid-shot.js';
import {shotForecast} from '../dist/tactics/shot-planner.js';
import {unitBaseHeight} from '../dist/tactics/tower-geometry.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';

function scene(){const s=blankMap(),a={id:0,x:10,y:10,z:0,hp:100,team:'squad'},b={id:1,x:20,y:10,z:0,hp:100,team:'guard'};s.map=s.terrain;s.units=[a,b];return {s,a,b};}
const missRoll={die:10,critical:'ordinary',rolledHit:false};
const accurate={accurate:true,zone:'torso',chance:65,reach:40};
function combat(){
 const map=blankMap();map.starts[0]={x:10,y:10};map.guards=[{x:20,y:10,species:'pig-foreman',weapon:'pistol'}];
 const s=createGame(42,map,true,'easy'),a=s.units[0],b=s.units[4];equip(s,a,'assault');a.accuracy=70;a.heading=0;a.ap=40;b.hp=b.maxHp=10000;s.phase='player';return {s,a,b};
}

test('live misses use the study roll-margin spread and retain zero-error probability successes',()=>{
 const {s,a,b}=scene();b.x=60;
 const input=[.7,0],p=bulletTrajectory(s,a,b,{accurate:false,chance:65,precision:50,shotRoll:missRoll,reach:90},()=>input.shift());
 assert.equal(p.trajectoryModel,'roll-margin');assert.equal(p.shotRoll.die,10);assert.equal(p.missAdjusted,false);
 assert.equal(p.angularError,rollMarginScatter({chance:65,precision:50,die:10,roll:.7}).error);
 assert.ok(p.x>b.x,'misses continue beyond the intended character');
 for(const zone of ['head','torso','legs','weapon']){
  const hit=bulletTrajectory(s,a,b,{...accurate,zone,reach:90},()=>{throw Error('Direct success must not sample scatter');});
  assert.equal(hit.unitId,b.id);assert.equal(hit.zone,zone);assert.equal(hit.angularError,0);
 }
});

test('failed rolls never hit the selected part across distance, stance and elevation',()=>{
 const {s,a,b}=scene();let incidentals=0;
 for(const stance of ['standing','kneeling','prone'])for(const range of [1,10,30])for(const z of [0,1])for(const zone of ['head','torso','legs']){
  b.stance=stance;b.x=a.x+range;b.z=z;const random=seededShots(42);
  for(let i=0;i<80;i++){
   const p=bulletTrajectory(s,a,b,{accurate:false,chance:65,zone,reach:60},random);
   assert.ok(p.unitId!==b.id||p.zone!==zone,JSON.stringify({stance,range,z,zone,p}));
   assert.ok([p.x,p.y,p.h,p.angularError,...Object.values(p.direction)].every(Number.isFinite));
   if(p.unitId===b.id)incidentals++;
  }
 }
 assert.ok(incidentals>0,'failed selected-part rolls still permit incidental body hits');
});

test('critical failures use the conditional probability distribution in forecasts',()=>{
 for(const chance of [5,50,65,95]){
  const random=seededShots(120),actual={critical:0,miss:0};
  for(let i=0;i<20000;i++){const r=rollFirearmShot(chance,random);if(!r.rolledHit){actual.miss++;if(r.die===1)actual.critical++;}}
  const misses=Array.from({length:10000},()=>failedShotRoll(chance,random));
  assert.ok(misses.every(r=>!r.rolledHit&&r.die>=1&&r.die<=19));
  assert.ok(Math.abs(misses.filter(r=>r.die===1).length/misses.length-actual.critical/actual.miss)<.025);
  if(chance===95)assert.ok(misses.every(r=>r.die===1));
 }
});

test('solid cover and allies still intercept both critical and ordinary successes',()=>{
 const {s,a,b}=scene();s.edges[edgeKey('e',12,10)]='wall';
 for(const die of [10,20])assert.equal(bulletTrajectory(s,a,b,{...accurate,shotRoll:{die,rolledHit:true}},()=>0).kind,'wall');
 s.edges={};const ally={id:2,x:11,y:10,z:0,hp:100,team:'squad'};s.units.push(ally);
 const first=bulletTrajectory(s,a,b,{...accurate,zone:'head'},()=>0);assert.equal(first.unitId,ally.id);assert.equal(first.zone,'torso');
 ally.away=true;assert.equal(bulletTrajectory(s,a,b,accurate,()=>0).unitId,b.id);
 delete ally.away;ally.casualty='quit';assert.equal(bulletTrajectory(s,a,b,accurate,()=>0).unitId,b.id);
});

test('a scattered miss can hit a bystander beyond the target and applies its actual body region',()=>{
 const {s,a,b}=scene();const sample=()=>{const rolls=[.7,0];return bulletTrajectory(s,a,b,{accurate:false,shotRoll:missRoll,chance:50,reach:30},()=>rolls.shift());};
 const miss=sample();assert.notEqual(miss.unitId,b.id);assert.ok(miss.x>b.x);
 const t=15/miss.direction.x;s.units.push({id:2,team:'squad',hp:100,x:a.x+15,y:a.y+miss.direction.y*t,z:0});
 const hit=sample();assert.equal(hit.unitId,2);assert.equal(hit.zone,'torso');
 const behind={id:3,team:'squad',hp:100,x:a.x-2,y:a.y,z:0};s.units.push(behind);assert.notEqual(sample().unitId,behind.id);
});

test('tower and cliff supports determine launch and impact heights; floors remain solid',()=>{
 const {s,a,b}=scene();a.towerPost={kind:'wooden-spotlight-tower'};b.towerPost={kind:'wooden-spotlight-tower'};
 const tower=bulletTrajectory(s,a,b,accurate,()=>0);assert.equal(tower.origin.h,unitBaseHeight(a)+muzzleHeight(a));assert.equal(tower.unitId,b.id);assert.ok(tower.h>6.36);
 delete a.towerPost;delete b.towerPost;a.cliffSupport={level:0,height:1.4};b.cliffSupport={level:0,height:1.4};
 const cliff=bulletTrajectory(s,a,b,accurate,()=>0);assert.equal(cliff.origin.h,2.7);assert.equal(cliff.unitId,b.id);
 delete a.cliffSupport;delete b.cliffSupport;setTerrain(s,12,10,1,'floor');
 const slab=traceProjectile(s,a,{x:12,y:10,h:4},{x:0,y:0,h:-1},3);assert.equal(slab.kind,'floor');assert.equal(slab.h,3);
});

test('one shotgun shell has one roll, a centered success and physical spread for its other pellets',()=>{
 const {s,a,b}=scene(),roll={die:20,critical:'success',rolledHit:true},opts={...accurate,shotRoll:roll,pellets:6};
 const pellets=shotgunTrajectories(s,a,b,opts,seededShots(42));assert.equal(pellets.length,6);assert.equal(pellets[0].unitId,b.id);assert.equal(pellets[0].zone,'torso');
 assert.ok(pellets.every(p=>p.shotRoll.die===20&&p.pellet));assert.ok(new Set(pellets.map(p=>p.angularError)).size>1);
 for(const chance of [5,65,95]){
  const random=seededShots(42);
  for(let i=0;i<100;i++)for(const p of shotgunTrajectories(s,a,b,{...opts,accurate:false,chance,shotRoll:failedShotRoll(chance,random)},random))assert.ok(p.unitId!==b.id||p.zone!=='torso');
 }
 s.edges[edgeKey('e',12,10)]='wall';assert.ok(shotgunTrajectories(s,a,b,opts,seededShots(42)).every(p=>p.kind==='wall'));
});

test('forecasts agree with live sampling and leave encounter randomness untouched',()=>{
 for(const kind of ['assault','shotgun']){
  const {s,a,b}=combat();a.weapon=kind;a.ammo[kind]=20;const p=previewAttack(s,a,b,false,'torso'),before=structuredClone(s);
  const forecast=shotForecast(s,a,b,p,{samples:2048})[0],w=WEAPONS[kind],random=seededShots(971);let any=0,selected=0;
  for(let i=0;i<4000;i++){
   const shotRoll=rollFirearmShot(p.chance,random),options={accurate:shotRoll.rolledHit,shotRoll,chance:p.chance,zone:p.zone,reach:w.range*1.5,pellets:w.pellets};
   const paths=w.pellets?shotgunTrajectories(s,a,b,options,random):[bulletTrajectory(s,a,b,options,random)];
   if(paths.some(p=>p.unitId===b.id))any++;if(paths.some(p=>p.unitId===b.id&&p.zone==='torso'))selected++;
  }
  assert.ok(Math.abs(forecast.any-any/40)<2,`${kind} any: ${forecast.any} vs ${any/40}`);
  assert.ok(Math.abs(forecast.selected-selected/40)<2,`${kind} selected: ${forecast.selected} vs ${selected/40}`);
  assert.deepEqual(s,before);
 }
});

test('live bursts expose one probability result per round and charge AP/ammo once',()=>{
 const {s,a,b}=combat(),p=previewAttack(s,a,b,true,'torso',null,'full'),before={ap:a.ap,ammo:a.ammo.assault};
 assert.ok(attack(s,a,b,true,false,'torso',false,'full'));
 assert.equal(a.ap,before.ap-p.cost);assert.equal(a.ammo.assault,before.ammo-p.rounds);
 assert.deepEqual(s.effect.sequence.map(e=>e.shotChance),p.shotChances);
 for(const e of s.effect.sequence){assert.ok(e.shotRoll.die>=1&&e.shotRoll.die<=20);assert.deepEqual(e.trajectories[0].shotRoll,e.shotRoll);assert.equal(e.trajectories[0].accurate,e.shotRoll.rolledHit);assert.equal(e.trajectories[0].trajectoryModel,'roll-margin');}
});

test('saving before a shot preserves every roll, trajectory and damage outcome on reload',()=>{
 const {s,a,b}=combat();startEncounterClock(s);const loaded=restoreEncounter(captureEncounter(s));
 assert.ok(attack(s,a,b,true));assert.ok(attack(loaded,loaded.units[0],loaded.units[4],true));
 assert.equal(loaded.seed,s.seed);assert.deepEqual(loaded.effect,s.effect);assert.deepEqual(loaded.units.map(u=>u.hp),s.units.map(u=>u.hp));
});

test('guard fire and overwatch use roll-margin shots without changing their action rules',()=>{
 const {s,a,b}=combat();b.heading=180;b.ap=30;s.phase='enemy';assert.ok(attack(s,b,a,false,true));assert.equal(s.effect.sequence[0].trajectories[0].trajectoryModel,'roll-margin');
 a.overwatch={weapon:a.weapon,heading:a.heading};const ap=a.ap;resolveOverwatch(s,b);
 assert.equal(s.effect.sequence[0].shooter,a.id);assert.equal(s.effect.sequence[0].trajectories[0].trajectoryModel,'roll-margin');assert.equal(a.ap,ap);
});
