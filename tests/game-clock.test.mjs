import test from 'node:test';
import assert from 'node:assert/strict';
import {createClock,advanceClock,elapsedGameMinutes,formatClock,timeOfDay,FrameClock,mapStartMinutes,observeRoundTime} from '../dist/tactics/game-clock.js';
import {createGame,endTurn,stepEnemy,refresh,settleGuards,ROUND_MINUTES} from '../dist/tactics/core/engine.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {startEncounterClock,tickEncounterClock,settleEncounterRounds} from '../dist/tactics/encounter-clock.js';
import * as legacy from '../dist/tactics/world.js';
import * as core from '../dist/tactics/core/world.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';

const combatMap=()=>{const m=blankMap('Clock test');m.time={startMinutes:1199};m.guards=[{x:6,y:4,z:0,species:'pig-foreman',weapon:'hands',heading:180}];return m;};
test('one shared minute clock rolls through dusk, night, midnight and day independently of frame size',()=>{
 const a=createClock(1079),b=createClock(1079);advanceClock(a,elapsedGameMinutes(3000));for(let i=0;i<60;i++)advanceClock(b,elapsedGameMinutes(3000/60));assert.equal(formatClock(a),formatClock(b));assert.equal(timeOfDay(a).phase,'dusk');
 advanceClock(a,120);assert.equal(timeOfDay(a).phase,'night');advanceClock(a,240);assert.equal(formatClock(a),'Day 2 · 00:00');advanceClock(a,360);assert.equal(timeOfDay(a).phase,'day');
 for(const n of [-1,NaN,Infinity])assert.equal(advanceClock(a,n),0);assert.throws(()=>createClock(-1));assert.equal(mapStartMinutes({}),480);assert.throws(()=>mapStartMinutes({time:{startMinutes:1440}}));
});
test('wall-clock suspension and explicit pauses never catch up or create negative time',()=>{
 const f=new FrameClock();assert.equal(f.sample(100),0);assert.equal(f.sample(1600),1500);assert.equal(f.sample(4000,{paused:true}),0);assert.equal(f.sample(9000),0);assert.equal(f.sample(9500),500);
 f.reset();assert.equal(f.sample(100000),0);assert.equal(f.sample(100100),100);assert.equal(f.sample(50),0);assert.equal(f.sample(NaN),0);assert.equal(f.sample(1000),0);
 assert.equal(f.sample(2000,{mode:'combat'}),0);assert.equal(f.sample(6000,{mode:'combat'}),4000);assert.equal(f.sample(7000,{mode:'exploration'}),0);assert.equal(f.sample(7500,{mode:'exploration'}),500);
});
test('a full 3D round is exactly one minute; thinking, animations and repeated observations charge nothing',()=>{
 const s=createGame(1,combatMap(),true,'easy');startEncounterClock(s);assert.equal(s.phase,'player');assert.equal(s.clock.minutes,1199);
 tickEncounterClock(s,120000);assert.equal(s.clock.minutes,1199);assert.ok(endTurn(s));settleEncounterRounds(s);assert.equal(s.clock.minutes,1199);
 for(let i=0;i<80&&s.phase==='enemy';i++){stepEnemy(s);settleEncounterRounds(s);tickEncounterClock(s,500);}
 assert.equal(s.phase,'player');assert.equal(s.round,2);assert.equal(s.clock.minutes,1200);assert.equal(timeOfDay(s.clock).phase,'night');for(let i=0;i<10;i++)settleEncounterRounds(s);assert.equal(s.clock.minutes,1200);
 s.units.filter(u=>u.team==='guard').forEach(g=>g.hp=0);refresh(s);assert.equal(settleEncounterRounds(s),1);assert.equal(settleEncounterRounds(s),0);tickEncounterClock(s,3000);assert.equal(s.clock.minutes,1202);
 tickEncounterClock(s,5000,{paused:true});assert.equal(s.clock.minutes,1202);
});
test('contact entry costs nothing and mid-round defeat charges once, with no subsequent live time',()=>{
 const clock=createClock(),s={phase:'explore',round:0};assert.equal(observeRoundTime(clock,s),0);s.phase='player';s.round++;assert.equal(observeRoundTime(clock,s),0);s.phase='enemy';assert.equal(observeRoundTime(clock,s),0);s.phase='lost';assert.equal(observeRoundTime(clock,s),1);assert.equal(observeRoundTime(clock,s),0);
 const game=createGame(1,combatMap());startEncounterClock(game);game.phase='lost';assert.equal(tickEncounterClock(game,60000),1);assert.equal(tickEncounterClock(game,60000),0);
});
for(const [name,api] of [['existing campaign',legacy],['pinned campaign with clock adapter',core]])test(name+' shares exploration, combat, pause and income accounting',()=>{
 const w=api.createWorld(blankMap()),s=api.currentMap(w);api.tickWorld(w,3000);assert.equal(w.clock.minutes,481);s.phase='player';s.round=1;api.settleWorldClock(w);api.tickWorld(w,60000);assert.equal(w.clock.minutes,481);s.phase='enemy';api.settleWorldClock(w);s.phase='player';s.round=2;api.settleWorldClock(w);assert.equal(w.clock.minutes,482);api.tickWorld(w,1000,{paused:true});assert.equal(w.clock.minutes,482);s.phase='won';api.settleWorldClock(w);assert.equal(w.clock.minutes,483);api.advanceTime(w,60);assert.equal(w.clock.minutes,543);assert.ok(w.money>=100);
});
test('off-map round effects settle using one minute, without multiplying elapsed morale time',()=>{
 assert.equal(ROUND_MINUTES,1);const s=createGame(1,combatMap());const g=s.units.find(u=>u.team==='guard');g.burningTurns=3;s.fires=[{turns:2}];settleGuards(s,2);assert.equal(g.burningTurns,1);assert.equal(s.fires.length,0);
});
test('editor start time survives export, reload and playtest without storing a running clock in the map',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap())),before=d.export();d.startTime(1199);assert.equal(mapStartMinutes(JSON.parse(d.export())),1199);assert.equal(d.map.clock,undefined);const s=createGame(1,JSON.parse(d.export()));startEncounterClock(s);tickEncounterClock(s,3000);assert.equal(s.clock.minutes,1200);assert.equal(d.map.time.startMinutes,1199);d.undo();assert.equal(d.export(),before);d.redo();assert.equal(mapStartMinutes(new EditingDocument().open(d.export()).map),1199);
});

// Check the calibration against gameplay rules, not just duplicated timing constants.
test('exploration matches a baseline walking round and shares actual movement duration',async()=>{
 const {BASE}=await import('../dist/tactics/core/progression.js');
 const {movementCost}=await import('../dist/tactics/core/engine.js');
 const {movementDuration}=await import('../dist/tactics/battle-motion.js');
 const {REFERENCE_ROUND_AP,REFERENCE_WALK_AP}=await import('../dist/tactics/movement-timing.js');
 const walker={stance:'standing'};
 assert.equal(REFERENCE_ROUND_AP,BASE.ap);assert.equal(REFERENCE_WALK_AP,movementCost(walker));
 for(const unit of [walker,{...walker,running:true}]){
  const tiles=BASE.ap/movementCost(unit);
  assert.equal(elapsedGameMinutes(tiles*movementDuration(unit)),ROUND_MINUTES);
 }
 assert.equal(elapsedGameMinutes(3000),1);
 assert.equal(elapsedGameMinutes(1000)*60,20);
});
