import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {WEAPONS,createGame,attackGround} from '../dist/tactics/core/engine.js';
import {detonate,explosiveTrajectory} from '../dist/tactics/core/explosives.js';
import {grenadeFixture} from '../dist/tactics/grenade-fixture.js';
import {grenadeBlastFixture} from '../dist/tactics/grenade-blast-fixture.js';
import {grenadeBlastField,resolvedLaunchedBlast,blastPointVisible,blastReach} from '../dist/tactics/grenade-blast-field.js';
import {BattleCombat,burnStart} from '../dist/tactics/battle-combat.js';
import {BattleGrenades} from '../dist/tactics/battle-grenades.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
const eventFor=(trajectory,blast,shooter=0)=>({shooter,ax:2,ay:8,az:0,bx:8,by:8,trajectories:[trajectory],explosions:[blast],downed:[]});
for(const [weapon,kind,radius,cost] of [['launcher','launcher',3,6],['rpg','rocket',4,7]])test(weapon+': committed attack uses the shared painted blast at its authoritative impact and radius',()=>{
 const map=grenadeFixture(true);map.starts[0].weapon=weapon;const s=createGame(72,map,true,'easy',{statSystem:true}),a=s.units[0],p=new BattleCombat(),scene=new T.Scene(),fx=new BattleGrenades(scene);startEncounterClock(s);s.phase='player';s.rules.awareness=false;a.ap=18;s.seen.add('20,17');p.observe(s,0);const ammo=a.ammo[weapon];
 assert.equal(attackGround(s,a,{x:20,y:17,z:0}),true);assert.equal(a.ammo[weapon],ammo-1);assert.equal(a.ap,18-cost);p.observe(s,10);assert.ok(p.active?.launched);assert.equal(p.active.rifle,false);assert.equal(p.active.event.explosions[0].kind,kind);
 const saved=structuredClone(s.effect);try{p.advance(230);fx.update(p.active,s,new T.Camera());assert.equal(fx.field.radius,radius);assert.equal(fx.field.origin.x,p.active.event.trajectories[0].x);assert.ok(fx.field.rays.filter(r=>r>radius*.99).length>90,'tile seams cannot shrink an open-ground detonation');assert.equal(fx.projectile.root.visible,false);assert.equal(fx.dust.visible,true);assert.equal(p.active.phase.duration,800);p.advance(811);fx.update(p.active,s);assert.equal(fx.dust.visible,false);assert.equal(p.busy,false);assert.deepEqual(s.effect,saved);}finally{fx.dispose();}
});
test('each launched blast retains its surviving cover even if a later reply removes it',()=>{
 const {state:s}=grenadeBlastFixture('wall'),impact={x:8,y:8,h:.05,z:0,kind:'floor'},blast=detonate(s,impact,{...WEAPONS.rpg,damage:0}).blast,shot={event:eventFor(impact,blast)};assert.ok(Object.keys(blast.cover.edges).length);s.edges={};s.props=[];
 const field=grenadeBlastField(s,shot,resolvedLaunchedBlast(shot,s));assert.ok(blastReach(field,12,8)<1.51);assert.equal(blastReach(field,4,8),4);
 const breached=detonate(grenadeBlastFixture('wall').state,impact,WEAPONS.rpg).blast;assert.equal(breached.cover.edges['e:9:8'],undefined,'this blast can show its own actual breach');
});
test('real cliff trajectories keep native top/side heights and top-only visibility',()=>{
 for(const weapon of ['launcher','rpg']){
  const {state:s}=grenadeBlastFixture('cliff'),a={id:0,x:2,y:8,z:0,stance:'standing'},target={x:8,y:8,z:1,cliffSupport:{level:0,height:2},ground:true},trajectory=explosiveTrajectory(s,a,target,WEAPONS[weapon],{chance:100},()=>0),blast=detonate(s,trajectory,{...WEAPONS[weapon],damage:0}).blast,shot={event:eventFor(trajectory,blast)},origin=resolvedLaunchedBlast(shot,s),field=grenadeBlastField(s,shot,origin);
  assert.ok(Math.abs(origin.h-trajectory.h)<.002,weapon+' native height');
  assert.ok(field.ceiling-field.floor>1,'surface contact leaves room for the flash');assert.ok(Math.max(...field.rays)>2.9,'outward dust remains drawable');
  if(weapon==='rpg'){assert.ok(blastReach(field,origin.x-1,origin.y)>3.9);assert.ok(blastReach(field,origin.x+1,origin.y)<.02,'solid cliff side still blocks inward dust');}
  if(weapon==='launcher'){assert.ok(Math.abs(origin.h-2)<.002);assert.equal(field.level,1);s.visible=new Set(['8,8,1']);assert.ok(blastPointVisible(field,s,8,8));}
 }
});
test('real native ramp and tower impacts preserve their metre heights at both map levels',()=>{
 for(const z of [0,1])for(const kind of ['ramp-concrete-east','wooden-spotlight-tower'])for(const weapon of ['launcher','rpg']){
  const {state:s}=grenadeBlastFixture();s.props=[{kind,x:6,y:6,z}];const tower=kind.includes('tower'),y=tower?7:6,height=tower?6.36:1.5,a={id:0,x:2,y,z,stance:'standing',...(tower?{towerPost:{}}:{})},target={x:8,y,z,ground:true,cliffSupport:{level:z,height}},trajectory=explosiveTrajectory(s,a,target,WEAPONS[weapon],{chance:100},()=>0),blast=detonate(s,trajectory,{...WEAPONS[weapon],damage:0}).blast,shot={event:eventFor(trajectory,blast)},origin=resolvedLaunchedBlast(shot,s);
  assert.equal(trajectory.kind,'cover');assert.ok(Math.abs(origin.h-(trajectory.h+z*(2.12-3)))<.002,weapon+' '+kind+' native height z'+z);
  const field=grenadeBlastField(s,shot,origin);assert.ok(field.ceiling-field.floor>1);assert.ok(Math.max(...field.rays)>2.9,'surface contact permits outward dust');
  if(!tower){assert.ok(blastReach(field,origin.x-1,origin.y)>2.9);assert.ok(blastReach(field,origin.x+1,origin.y)<.02,'ramp still clips its solid side');}
 }
});
test('ordinary roof impacts convert the three-unit tactical frame exactly once',()=>{
 const {state:s}=grenadeBlastFixture('roof'),impact={x:8,y:8,h:3,z:1,kind:'floor'},blast=detonate(s,impact,{...WEAPONS.rpg,damage:0}).blast,shot={event:eventFor(impact,blast)};
 assert.equal(resolvedLaunchedBlast(shot,s).h,2.12);assert.equal(blast.h,3);assert.equal(grenadeBlastField(s,shot,resolvedLaunchedBlast(shot,s)).level,1);
});

test('real upward floor hits burst beneath the slab and use the room below for visibility',()=>{
 for(const weapon of ['launcher','rpg']){
  const {state:s}=grenadeBlastFixture('ceiling'),a={id:0,x:3,y:8,z:0,stance:'standing'},target={x:8,y:8,z:weapon==='rpg'?1:0,ground:true},trajectory=explosiveTrajectory(s,a,target,WEAPONS[weapon],{chance:100},()=>0),blast=detonate(s,trajectory,{...WEAPONS[weapon],damage:0}).blast,shot={event:eventFor(trajectory,blast)},origin=resolvedLaunchedBlast(shot,s),field=grenadeBlastField(s,shot,origin);
  assert.equal(trajectory.kind,'floor');assert.equal(trajectory.h,3);assert.equal(blast.presentation.normal.h,-1);assert.equal(origin.h,2);assert.equal(field.level,0);assert.equal(field.ceiling,2);assert.ok(Math.max(...field.rays)>2.9);
  s.visible=new Set([`${Math.round(origin.x)},${Math.round(origin.y)}`]);assert.ok(blastPointVisible(field,s,origin.x,origin.y),'a ground-floor observer sees the impact');
 }
});
test('hidden launchers show only visible impact fragments and chain bursts bind to their own queued event',()=>{
 const {state:s}=grenadeBlastFixture('fog'),a={id:0,x:2,y:8,team:'guard',weapon:'rpg',hp:100};s.units=[a];s.detected=new Set();s.visible=new Set(['8,8']);const p=new BattleCombat();p.observe(s,0);
 const impact={x:8,y:8,h:.05,z:0,kind:'floor'},blast=detonate(s,impact,{...WEAPONS.rpg,damage:0}).blast,first=eventFor(impact,blast),second=eventFor(impact,structuredClone(blast));first.explosions.unshift({kind:'tank',fireSequence:1});second.explosions.push({kind:'barrel',fireSequence:2});s.effect={sequence:[first,second]};p.observe(s,10);assert.ok(p.active?.launched);assert.equal(p.queue.length,1);assert.equal(burnStart({kind:'tank',sequence:1},p,10),10);assert.equal(burnStart({kind:'barrel',sequence:2},p,10),null);
 const fx=new BattleGrenades(new T.Scene());try{p.advance(230);fx.update(p.active,s);assert.equal(fx.field.origin.x,8);assert.equal(fx.field.radius,4);assert.equal(fx.blast.visibilityMask.image.data.filter((v,i)=>i%4===3&&v===255).length,1);p.advance(811);assert.equal(burnStart({kind:'barrel',sequence:2},p,811),811);p.observe(s,821,true);assert.equal(p.active.phase.duration,180);p.advance(1000);fx.update(p.active,s);assert.equal(fx.dust.visible,false);}finally{fx.dispose();}
});
