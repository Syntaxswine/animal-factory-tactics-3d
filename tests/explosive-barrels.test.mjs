import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,setTerrain,parseMap} from '../dist/tactics/core/maps.js';
import {createGame,attack,attackGround,previewAttack,WEAPONS} from '../dist/tactics/core/engine.js';
import {traceProjectile,bulletTrajectory} from '../dist/tactics/core/projectiles.js';
import {detonate} from '../dist/tactics/core/explosives.js';
import {propAt,PROPS} from '../dist/tactics/core/environment.js';
import {barrelTarget,EXPLOSIVE_BARREL,barrelIntersection} from '../dist/tactics/explosive-barrels.js';
import {barrelSight} from '../dist/tactics/barrel-targeting.js';
import {seededShots} from '../dist/tactics/helicoid-shot.js';
import {shotForecast} from '../dist/tactics/shot-planner.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blockCanvas,extractBlock,placeBlock,validateBlock} from '../dist/tactics/core/blocks.js';
import {BattleCombat} from '../dist/tactics/battle-combat.js';
import {BattleTankEffects} from '../dist/tactics/battle-tank-effects.js';

function fixture({water=false,z=0,weapon='rifle',extra=[]}={}){
 const map=blankMap('Explosive barrels');map.starts=[{x:14,y:20},{x:21,y:20},{x:25,y:20},{x:26,y:20}];map.guards=[{x:20,y:24,species:'hen',weapon:'hands'},{x:40,y:40,species:'pig-foreman',weapon:'pistol'}];
 if(z)for(let y=10;y<30;y++)for(let x=10;x<30;x++)setTerrain(map,x,y,z,'floor');
 if(water)for(let x=21;x<=25;x++)for(let y=21;y<=24;y++)setTerrain(map,x,y,0,'water');
 map.props=[{x:20,y:20,z,kind:EXPLOSIVE_BARREL},...extra];
 const s=createGame(0,map,true,'easy'),a=s.units[0];a.z=z;a.weapon=weapon;a.ammo[weapon]=WEAPONS[weapon].mag;a.accuracy=1000;a.ap=30;a.heading=0;s.phase='player';s.rules.awareness=false;startEncounterClock(s);
 for(let y=0;y<45;y++)for(let x=0;x<45;x++){const key=z?`${x},${y},${z}`:`${x},${y}`;s.visible.add(key);s.seen.add(key);}s.detected.add(4);
 return {s,a,b:barrelTarget(s.props[0])};
}
test('barrel aim uses normal probability, three AP levels, and rejects blocked/removed targets',()=>{
 const {s,a,b}=fixture();a.accuracy=65;
 const ps=['hip','aimed','full'].map(aim=>previewAttack(s,a,b,false,'torso',null,aim));
 assert.deepEqual(ps.map(p=>p.cost),[6,9,12]);assert.ok(ps.every(p=>p.ok));assert.ok(ps[2].chance>ps[0].chance);
 assert.equal(shotForecast(s,a,b,ps[0])[0].selected,ps[0].chance);assert.equal(barrelSight(s,a,b),true);
 const before=[a.ap,a.ammo.rifle];s.edges['e:17:20']='wall-brick';assert.equal(barrelSight(s,a,b),false);assert.equal(attack(s,a,b),false);assert.deepEqual([a.ap,a.ammo.rifle],before);
 s.edges={};a.heading=180;assert.equal(previewAttack(s,a,b).ok,false);a.heading=0;s.props=[];assert.match(previewAttack(s,a,b).reason,/destroyed/);
});
test('a hit shares tank lethal centre and five-tile fire, respects water, charges once and removes collision',()=>{
 for(const water of [false,true]){const {s,a,b}=fixture({water}),ap=a.ap,ammo=a.ammo.rifle;
  assert.equal(propAt(s,20,20).kind,EXPLOSIVE_BARREL);assert.ok(attack(s,a,b));
  assert.equal(s.units[1].hp,0);assert.equal(s.units[1].casualty,'dead');assert.equal(s.units[1].burnedRemains,true);
  assert.equal(s.units[2].burningTurns,3);assert.equal(s.units[3].burningTurns,undefined);assert.equal(s.units[4].burningTurns,3);
  assert.equal(s.props.length,0);assert.equal(propAt(s,20,20),undefined);assert.equal(s.fires.length,water?66:81);
  assert.ok(s.fires.every(p=>Math.hypot(p.x-20,p.y-20)<=5&&p.turns===3));assert.deepEqual([a.ap,a.ammo.rifle],[ap-6,ammo-1]);
  assert.equal(s.effect.explosions[0].kind,'barrel');assert.ok(s.effect.downed.includes(1));assert.ok(s.effect.burns.includes(2));
  assert.equal(s.fireAnimations.filter(e=>e.kind==='barrel').length,1);assert.equal(attack(s,a,b),false);
 }
});
test('the drum cylinder permits corner misses and failed rolls never strike the intended barrel',()=>{
 const {s,a,b}=fixture(),random=seededShots(41);
 assert.equal(traceProjectile(s,a,{x:14,y:20.45,h:.4},{x:1,y:0,h:0},7).kind,'range');
 assert.equal(traceProjectile(s,a,{x:14,y:20,h:1},{x:1,y:0,h:0},6.5).kind,'range');
 assert.equal(traceProjectile(s,a,{x:14,y:20,h:.4},{x:1,y:0,h:0},7).propId,b.id);
 for(let i=0;i<100;i++){const hit=bulletTrajectory(s,a,b,{accurate:false,chance:65,zone:'torso',reach:36},random);assert.notEqual(hit.propId,b.id);}
 assert.equal(barrelIntersection(b,{x:20,y:20,h:2},{x:0,y:0,h:-1}).distance,1.2);
});
test('incidental shots detonate barrels while ordinary decorative drums remain cover',()=>{
 const {s,a,b}=fixture(),guard=s.units[4];Object.assign(guard,{x:22,y:20,stance:'prone',hp:100,maxHp:100});
 const hit=bulletTrajectory(s,a,guard,{accurate:true,zone:'legs',reach:36},()=>0);assert.equal(hit.propId,b.id);
 // Seed 3 misses the exposed torso and sends the resolved ray down into the
 // drum. The engine must handle that impact even though the target is a person.
 guard.stance='standing';s.seed=3;a.accuracy=50;for(const u of s.units.slice(1,4)){u.x=30+u.id*2;u.y=35;}
 assert.ok(attack(s,a,guard));assert.equal(s.effect.trajectories[0].accurate,false);assert.equal(s.effect.trajectories[0].propId,b.id);assert.equal(s.props.length,0);assert.equal(guard.burningTurns,3);
 s.props=[{x:20,y:20,z:0,kind:'barrel-single'}];assert.equal(traceProjectile(s,a,{x:14,y:20,h:.4},{x:1,y:0,h:0},7).propId,undefined);assert.equal(PROPS['barrel-single'].explosive,undefined);
});
test('bursts and chain reactions consume ammunition once per shot and detonate each barrel once',()=>{
 for(const weapon of ['assault','shotgun']){const extra=[{kind:EXPLOSIVE_BARREL,x:24,y:20,z:0},{kind:EXPLOSIVE_BARREL,x:28,y:20,z:0}],{s,a,b}=fixture({weapon,extra}),ammo=a.ammo[weapon],cost=previewAttack(s,a,b,weapon==='assault').cost;
  assert.ok(attack(s,a,b,weapon==='assault'));assert.equal(s.props.length,0);assert.equal(s.fireAnimations.filter(e=>e.kind==='barrel').length,3);
  assert.equal(new Set(s.effect.explosions.map(e=>e.propId)).size,3);assert.equal(new Set(s.fires.map(p=>`${p.x},${p.y},${p.z}`)).size,s.fires.length);
  assert.equal(a.ammo[weapon],ammo-(weapon==='assault'?3:1));assert.equal(a.ap,30-cost);
 }
});
test('area flame and grenade attacks ignite exposed barrels, while solid walls shield them',()=>{
 for(const weapon of ['flamethrower','grenade','rpg']){const {s,a,b}=fixture({weapon});assert.ok(attackGround(s,a,b));assert.ok(s.effect.explosions.some(e=>e.kind==='barrel'),weapon);assert.equal(s.props.length,0);}
 const {s,a,b}=fixture({weapon:'flamethrower'});s.edges['e:17:20']='wall-concrete';assert.ok(attackGround(s,a,b));assert.equal(s.props.length,1);assert.equal(s.fireAnimations?.some(e=>e.kind==='barrel')||false,false);
 const q=fixture();q.s.edges['e:19:20']='wall-concrete';assert.deepEqual(detonate(q.s,{x:19,y:20,z:0,h:.4},{blast:3,damage:30}).barrels,[]);
});
test('upper-floor barrels spare characters below and create fire only on their own floor',()=>{
 const {s,a,b}=fixture({z:1}),hp=s.units.map(u=>u.hp);assert.ok(attack(s,a,b));
 assert.deepEqual(s.units.map(u=>u.hp),hp);assert.ok(s.units.every(u=>!u.burningTurns));assert.equal(s.fires.length,81);assert.ok(s.fires.every(p=>p.z===1));
 assert.equal(s.effect.explosions[0].h,3.4);
});
test('a worn tank explosion can ignite nearby barrels through the same committed event',()=>{
 const {s,a}=fixture(),guard=s.units[4];s.props=[{x:24,y:20,z:0,kind:EXPLOSIVE_BARREL}];Object.assign(guard,{x:20,y:20,species:'pig-foreman',weapon:'flamethrower',hp:500,maxHp:500,slots:['flamethrower',null],pack:[{type:'weapon',kind:'flamethrower',rounds:4}]});guard.ammo.flamethrower=4;
 assert.ok(attack(s,a,guard,false,false,'weapon'));assert.equal(guard.tanksExploded,true);assert.equal(s.props.length,0);assert.deepEqual(s.effect.explosions.map(e=>e.kind),['tank','barrel']);
 assert.equal(s.fireAnimations.filter(e=>e.kind==='barrel').length,1);assert.equal(a.ammo.rifle,4);
});
test('save/load retains intact barrels and committed blasts without replay or resurrection',()=>{
 const {s,a,b}=fixture();assert.equal(restoreEncounter(captureEncounter(s)).props[0].kind,EXPLOSIVE_BARREL);assert.ok(attack(s,a,b));
 const loaded=restoreEncounter(captureEncounter(s));assert.equal(loaded.props.length,0);assert.equal(loaded.fires.length,81);assert.equal(loaded.fireAnimations,undefined);assert.equal(loaded.effect,null);assert.equal(loaded.units[1].hp,0);
});
test('editor placement, undo/redo, portable maps and blocks preserve the new object',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap('Barrel authoring'))),command={tool:'prop',start:{x:8,y:8,z:0},options:{propKind:EXPLOSIVE_BARREL}};
 assert.ok(d.preview(command).ok);assert.equal(d.map.props.length,0);assert.ok(d.apply(command).ok);assert.ok(d.undo());assert.equal(d.map.props.length,0);assert.ok(d.redo());
 assert.equal(parseMap(d.export()).props[0].kind,EXPLOSIVE_BARREL);const block=validateBlock(d.capture(0,0)),placed=placeBlock(blankMap('Assembly'),block,1,1);assert.equal(placed.props[0].x,32);assert.equal(placed.props[0].kind,EXPLOSIVE_BARREL);
 const empty=new EditingDocument().open(JSON.stringify(extractBlock(blockCanvas('Empty'))));assert.ok(empty.apply(command).ok);assert.equal(validateBlock(JSON.parse(empty.export())).props[0].kind,EXPLOSIVE_BARREL);
});
test('presentation keeps the barrel until rifle discharge; blast/fire end without replaying damage',async()=>{
 const {s,a,b}=fixture(),r={scene:new T.Scene(),loader:{loadAsync:async()=>new T.Texture()},diagnostics:[]},c=new BattleCombat(),fx=new BattleTankEffects(r),camera=new T.PerspectiveCamera();camera.position.set(24,15,28);
 await fx.ready;const frame=now=>{c.observe(s,now);fx.observe(s,c,now,false,0);fx.draw(camera);};
 try{frame(0);assert.ok(attack(s,a,b));frame(10);const saved=structuredClone(s);
  assert.equal(c.active.rifle,true);assert.equal(fx.pendingProps().length,1);assert.equal(fx.ground.size,0);frame(390);assert.equal(fx.pendingProps().length,0);
  await Promise.resolve();frame(500);assert.equal([...fx.bursts.values()][0].effects.core.visible,true);assert.equal(fx.ground.get(0).effects.ground.length,81);
  frame(6000);assert.equal(fx.bursts.size,0);assert.equal(fx.busy,false);assert.deepEqual(s,saved);assert.deepEqual(r.diagnostics,[]);
  s.fires=[];frame(6100);assert.equal(fx.ground.size,0);
 }finally{fx.dispose();}
});
test('fog, floor changes and reduced motion retire barrel effects and held props',async()=>{
 for(const mode of ['fog','floor','reduced']){const {s,a,b}=fixture(),r={scene:new T.Scene(),loader:{loadAsync:async()=>new T.Texture()},diagnostics:[]},c=new BattleCombat(),fx=new BattleTankEffects(r);await fx.ready;
  try{c.observe(s,0);assert.ok(attack(s,a,b));c.observe(s,10);fx.observe(s,c,10,false,0);assert.equal(fx.pendingProps().length,1);if(mode==='fog')s.visible.clear();fx.observe(s,c,100,mode==='reduced',mode==='floor'?1:0);assert.equal(fx.pendingProps().length,0);assert.equal(fx.bursts.size,0);assert.equal(fx.busy,false);assert.equal(s.props.length,0);}finally{fx.dispose();}
 }
});
