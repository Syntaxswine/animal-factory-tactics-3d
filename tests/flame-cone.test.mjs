import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,edgeKey,tileKey,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,previewAttack,groundTarget,attack,attackGround,WEAPONS,weaponDamage,resolveOverwatch} from '../dist/tactics/core/engine.js';
import {insideFlame,flameShape,flameVictims} from '../dist/tactics/flame-cone.js';
import {BattleCombat} from '../dist/tactics/battle-combat.js';
import {BattleFlameEffects,flamePhase} from '../dist/tactics/battle-flame-effects.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';

function setup(){
 const map=blankMap('Flame area test');map.starts=[{x:10,y:10},{x:16,y:11},{x:9,y:9},{x:8,y:8}];
 map.guards=[{x:14,y:10,species:'pig-foreman',weapon:'pistol'},{x:18,y:12,species:'cow',weapon:'pistol'},{x:14,y:13,species:'goat',weapon:'pistol'}];
 const s=createGame(42,map,true,'easy'),a=s.units[0];a.weapon='flamethrower';a.pack.push({type:'weapon',kind:'flamethrower',rounds:4,condition:100});a.slots[0]='flamethrower';a.heading=0;a.ap=30;a.accuracy=1;
 for(const u of s.units)u.hp=u.maxHp=1000;
 s.phase='player';for(let y=0;y<30;y++)for(let x=0;x<30;x++){s.seen.add(tileKey(x,y));s.visible.add(tileKey(x,y));}return {s,a,point:{x:20,y:10,z:0}};
}

test('rounded fan has a fixed range, rotates freely, and broadens away from its tip',()=>{
 const {s,a,point}=setup(),shape=flameShape(s,a,point,WEAPONS.flamethrower);
 for(const [p,inside]of [[{x:20,y:10},true],[{x:20.01,y:10},false],[{x:19,y:12},true],[{x:11,y:11},false],[{x:9,y:10},false],[a,false]])assert.equal(insideFlame(shape,p),inside);
 assert.equal(shape.rays.length,37);assert.ok(shape.rays.every(r=>r.distance<=10));assert.equal(shape.rays[18].distance,10);
 assert.equal(insideFlame(shape,{x:17,y:13}),true);assert.equal(insideFlame(shape,{x:18,y:13}),false,'Round cap narrows toward its end');
 const west=flameShape(s,a,{x:0,y:10},WEAPONS.flamethrower);assert.equal(insideFlame(west,{x:5,y:10}),true);assert.equal(insideFlame(west,point),false);
});

test('one area spray hits multiple enemies and allies with no accuracy roll or per-victim fuel charge',()=>{
 const {s,a,point}=setup(),before=s.seed,ap=a.ap,preview=previewAttack(s,a,groundTarget(point));
 assert.deepEqual(preview.affected.sort(),[1,4,5]);assert.equal(preview.cost,6);
 assert.equal(attackGround(s,a,point),true);assert.equal(a.ap,ap-6);assert.equal(a.ammo.flamethrower,3);assert.equal(s.seed,before);
 for(const id of [1,4,5]){const u=s.units[id];assert.equal(u.hp,1000-weaponDamage(WEAPONS.flamethrower,Math.hypot(a.x-u.x,a.y-u.y)));assert.equal(u.burningTurns,3);}
 for(const id of [0,2,3,6])assert.equal(s.units[id].hp,1000);
 assert.equal(s.effect.sequence.length,1);assert.ok(s.effect.flame);assert.equal(s.effect.trajectories.length,0);
});

test('full walls, closed doors and tall props stop flames while an opened doorway transmits them',()=>{
 for(const blocker of ['wall','door','crate']){
  const {s,a,point}=setup();
  if(blocker==='crate')s.props=[{kind:'crate-stack',x:12,y:10,z:0}];
  else for(let y=5;y<=15;y++)s.edges[edgeKey('e',12,y)]='wall';
  if(blocker==='door')s.edges[edgeKey('e',12,10)]='door-steel-closed';
  let p=previewAttack(s,a,groundTarget(point));assert.ok(!p.affected.includes(4),blocker);
  if(blocker==='door'){s.edges[edgeKey('e',12,10)]='doorway-concrete-open';p=previewAttack(s,a,groundTarget(point));assert.ok(p.affected.includes(4));assert.ok(p.flame.rays.some(r=>r.kind==='wall'));}
 }
});

test('low cover shields a prone victim; same-level exposed bodies can still burn',()=>{
 const {s,a,point}=setup(),b=s.units[4];s.map[10][13]='crate';b.stance='prone';
 assert.ok(!previewAttack(s,a,groundTarget(point)).affected.includes(b.id));b.stance='standing';assert.ok(previewAttack(s,a,groundTarget(point)).affected.includes(b.id));
});

test('roofs, towers and cliff elevations cannot burn through into a different surface',()=>{
 const {s,a,point}=setup(),b=s.units[4];b.z=1;setTerrain(s,b.x,b.y,1,'floor');
 assert.ok(!previewAttack(s,a,groundTarget(point)).affected.includes(b.id));
 b.z=0;b.towerPost={};assert.ok(!previewAttack(s,a,groundTarget(point)).affected.includes(b.id));
 a.towerPost={};let shape=flameShape(s,a,point,WEAPONS.flamethrower);assert.ok(shape.origin.h>6);assert.ok(flameVictims(s,a,shape).includes(b));
 delete a.towerPost;delete b.towerPost;a.cliffSupport={level:0,height:1.4};b.cliffSupport={level:0,height:1.4};shape=flameShape(s,a,point,WEAPONS.flamethrower);assert.equal(shape.origin.h,2.7);assert.ok(flameVictims(s,a,shape).includes(b));
});

test('invalid or unpaid sprays change nothing, and preview never changes simulation state',()=>{
 for(const kind of ['self','fuel','ap','level','unknown','outside','queue']){
  const {s,a,point}=setup();if(kind==='self'){point.x=a.x;point.y=a.y;}if(kind==='fuel')a.ammo.flamethrower=0;if(kind==='ap')a.ap=5;if(kind==='level')point.z=1;if(kind==='unknown')s.seen.clear();if(kind==='outside')point.x=-5;if(kind==='queue')s.queue=[{id:a.id,x:11,y:10,z:0}];
  const before=structuredClone(s);previewAttack(s,a,groundTarget(point));assert.deepEqual(s,before);assert.equal(attackGround(s,a,point),false,kind);assert.deepEqual(s,before,kind);
 }
});

test('living, downed and hidden bystanders can be caught, but away, dead and quit people cannot',()=>{
 const {s,a,point}=setup(),b=s.units[4];s.detected.delete(b.id);
 assert.ok(previewAttack(s,a,groundTarget(point)).affected.includes(b.id));
 for(const flag of ['away','dead','quit','captured']){if(flag==='away')b.away={};else b.casualty=flag;assert.ok(!previewAttack(s,a,groundTarget(point)).affected.includes(b.id));delete b.away;delete b.casualty;}
 b.hp=0;b.casualty='bleeding';assert.ok(previewAttack(s,a,groundTarget(point)).affected.includes(b.id));attackGround(s,a,point);assert.equal(b.hp,0);
});

test('guards and reserved overwatch sprays use the area rules, and cannot target beyond range',()=>{
 const {s,a}=setup(),g=s.units[4];g.weapon='flamethrower';g.heading=180;g.ap=30;s.phase='enemy';
 assert.equal(attack(s,g,a,false,true),true);assert.ok(s.effect.flame);assert.equal(g.ammo.flamethrower,3);assert.ok(a.hp<1000);
 const second=setup();second.s.phase='enemy';second.a.overwatch={weapon:'flamethrower',heading:0,range:10};const ap=second.a.ap;resolveOverwatch(second.s,second.s.units[4]);assert.ok(second.s.effect.flame);assert.equal(second.a.ap,ap);assert.equal(second.a.ammo.flamethrower,3);
 const far=setup();far.s.units[4].x=22;assert.equal(previewAttack(far.s,far.a,far.s.units[4]).ok,false);
});

test('saved encounters replay a spray consistently and do not preserve transient targeting or effects',()=>{
 const {s,a,point}=setup();startEncounterClock(s);const restored=restoreEncounter(captureEncounter(s));
 assert.equal(attackGround(s,a,point),true);assert.equal(attackGround(restored,restored.units[0],point),true);
 assert.deepEqual(restored.units.map(u=>[u.hp,u.ap,u.burningTurns,u.ammo]),s.units.map(u=>[u.hp,u.ap,u.burningTurns,u.ammo]));assert.deepEqual(restored.effect,s.effect);
 assert.ok(!restoreEncounter(captureEncounter(s)).effect);
});

test('flame playback is bounded, consumes each event once, supports reduced motion and disposes meshes',()=>{
 const {s,a,point}=setup(),combat=new BattleCombat(),scene=new T.Scene(),effects=new BattleFlameEffects(scene);combat.observe(s,0);attackGround(s,a,point);const before=structuredClone(s.effect);combat.observe(s,10);combat.observe(s,20);assert.equal(combat.queue.length,0);assert.equal(combat.busy,true);
 try{combat.advance(410);effects.update(combat.active,s,{origin:new T.Vector3(a.x+.6,1.2,a.y)});assert.equal(effects.mesh.visible,true);assert.ok(effects.mesh.count<=144&&effects.mesh.count>0);assert.ok([...effects.mesh.instanceMatrix.array].every(Number.isFinite));assert.deepEqual(s.effect,before);effects.hide();combat.active.phase=flamePhase(400,true);effects.update(combat.active,s,null);assert.equal(effects.mesh.visible,false);combat.advance(1200);assert.equal(combat.busy,false);}finally{effects.dispose();}assert.equal(scene.children.length,0);
});
