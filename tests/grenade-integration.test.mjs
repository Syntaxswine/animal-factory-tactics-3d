import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,attackGround,WEAPONS,refresh} from '../dist/tactics/core/engine.js';
import {explosivePreview,explosiveTrajectory,detonate} from '../dist/tactics/core/explosives.js';
import {grenadeRange,grenadeStatMultiplier,grenadeLob,grenadePreview,grenadeTrajectory,grenadeDamage,grenadeOrigin,simulateGrenade} from '../dist/tactics/grenade-ballistics.js';
import {grenadeWorld,sweepGrenade,grenadeBase,GRENADE_FLOOR} from '../dist/tactics/grenade-geometry.js';
import {BattleCombat,dischargeDelay} from '../dist/tactics/battle-combat.js';
import {BattleGrenades,grenadePhase} from '../dist/tactics/battle-grenades.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {grenadeFixture} from '../dist/tactics/grenade-fixture.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';

function scene(){const s={map:Array.from({length:40},()=>Array(40).fill('yard')),props:[],edges:{},upper:[{},{}],stairs:[],units:[],phase:'player',revision:0,seen:new Set(),visible:new Set(),detected:new Set(),log:[]};for(let y=0;y<40;y++)for(let x=0;x<40;x++)for(let z=0;z<4;z++)s.seen.add(z?`${x},${y},${z}`:`${x},${y}`);s.visible=new Set(s.seen);
 const a={id:0,x:10,y:10,z:0,team:'squad',species:'horse',weapon:'grenade',hp:110,ap:18,stats:{strength:50,agility:50,explosives:50,dexterity:50},ammo:{grenade:3}};s.units=[a];return {s,a};}
const target={x:18,y:10,z:0,ground:true},weapon=WEAPONS.grenade;
test('height anchors and weighted Strength/Agility have exact neutral and capped endpoints',()=>{
 for(const [stat,mult]of [[1,.7],[50,1],[100,1.3]]){const a={stats:{strength:stat,agility:stat}};assert.ok(Math.abs(grenadeStatMultiplier(a)-mult)<1e-10);for(const [i,base]of [10,15,19,22].entries())assert.ok(Math.abs(grenadeRange(a,i)-base*mult)<1e-10);}
 assert.equal(grenadeRange({},.5),12.5);assert.equal(grenadeRange({},1.5),17);assert.ok(grenadeRange({},-1)<10);assert.equal(grenadeRange({},8),22);
 assert.ok(grenadeStatMultiplier({stats:{strength:100,agility:1}})>1);assert.ok(grenadeStatMultiplier({stats:{strength:1,agility:100}})<1);
});
test('preview enforces resources and range, rewards Dexterity, and never consumes randomness',()=>{
 const {s,a}=scene(),before=structuredClone(s),p=explosivePreview(s,a,target,weapon);assert.ok(p.ok);assert.equal(p.blastRadius,5);assert.deepEqual(s,before);assert.deepEqual(explosivePreview(s,a,target,weapon),p);
 assert.ok(grenadePreview(s,{...a,stats:{...a.stats,dexterity:100}},target,weapon).chance>p.chance);
 for(const [unit,t,reason]of [[{...a,ap:4},target,'AP'],[{...a,ammo:{grenade:0}},target,'Reload'],[a,{...target,x:21},'range'],[a,{...target,x:NaN},'Outside']])assert.match(grenadePreview(s,unit,t,weapon).reason,new RegExp(reason,'i'));
});
test('ballistic lob lands at the aim point before bouncing and the fuse includes every contact',()=>{
 const {s,a}=scene(),shot=grenadeTrajectory(s,a,target,weapon,{chance:100},()=>0);assert.equal(shot.accurate,true);assert.equal(shot.fuse,4);assert.equal(shot.path.at(-1).t,4);assert.ok(shot.collisions.length>=2);assert.ok(Math.hypot(shot.collisions[0].x-18,shot.collisions[0].y-10)<.01);assert.ok(shot.path.every(p=>p.h>=.0449));assert.ok(shot.path.every((p,i)=>!i||p.t>=shot.path[i-1].t));
 const midair=simulateGrenade(s,{x:10,y:10,h:10},{x:2,y:0,h:5},{fuse:.1});assert.ok(midair.h>10);assert.equal(midair.collisions.length,0);assert.equal(midair.path.at(-1).t,.1);
});
test('miss offsets are rolled against the intended point before obstructions, once only',()=>{
 const {s,a}=scene(),rolls=()=>{let n=0;const values=[.99,.25];return {fn:()=>{assert.ok(n<values.length);return values[n++];},count:()=>n};},r=rolls(),open=grenadeTrajectory(s,a,target,weapon,{chance:60},r.fn);
 for(let y=7;y<=13;y++)for(let z=0;z<3;z++)s.edges[`e:12:${y}${z?':'+z:''}`]='wall-concrete';
 const q=rolls(),wall=grenadeTrajectory(s,a,target,weapon,{chance:60},q.fn);assert.deepEqual(wall.offset,open.offset);assert.deepEqual(wall.aim,open.aim);assert.equal(r.count(),2);assert.equal(q.count(),2);assert.ok(wall.collisions.some(p=>p.kind==='wall'));assert.notEqual(wall.x,open.x);
 const p=grenadePreview(s,a,target,weapon);assert.ok(p.ok,'blocked lobs remain legal');assert.ok(p.blocked);assert.ok(p.trajectory.collisions[0].x<target.x);
});
test('swept grenade volume hits thin walls and floors, passes a doorway, and rebounds sideways',()=>{
 const {s}=scene();s.edges['e:12:10']='wall-concrete';let w=grenadeWorld(s);
 const hit=sweepGrenade(w,{x:10,y:10,h:1},{x:16,y:10,h:1});assert.ok(hit);assert.ok(hit.x<12.5);assert.equal(hit.normal.x,-1);
 s.edges['e:12:10']='door';w=grenadeWorld(s);assert.equal(sweepGrenade(w,{x:10,y:10,h:1},{x:16,y:10,h:1}),null);
 s.edges['e:12:10']='wall-concrete';const bank=simulateGrenade(s,{x:11,y:9.7,h:1},{x:5,y:2,h:0},{ignoreUnit:0});assert.ok(bank.collisions.some(p=>p.kind==='wall'));assert.ok(bank.x<12.5);assert.ok(bank.y>10);
});
test('ceiling collisions and roof ledge drops use the visible floor heights',()=>{
 const {s,a}=scene();for(let x=9;x<=19;x++)for(let y=9;y<=11;y++)s.upper[0][`${x},${y}`]='floor';
 const p=grenadePreview(s,a,target,weapon);assert.ok(p.blocked);assert.equal(p.trajectory.collisions[0].kind,'floor');assert.ok(p.trajectory.collisions[0].h<GRENADE_FLOOR);
 const drop=simulateGrenade(s,{x:19.49,y:10,h:GRENADE_FLOOR+.045},{x:8,y:0,h:.5},{ignoreUnit:0});assert.ok(drop.x>20);assert.ok(drop.h<.1);assert.ok(drop.collisions.some(q=>q.h<.1));
});
test('fragmentation falls steeply, shields behind walls/floors, and never starts a fire',()=>{
 const {s,a}=scene();a.x=15;a.hp=500;s.units.push({...a,id:1,x:19.8},{...a,id:2,x:15,z:1},{...a,id:3,x:18});s.upper[0]['15,10']='floor';s.edges['e:17:10']='wall-concrete';
 const blast=detonate(s,{x:15,y:10,h:.05,z:0,grenade:true},weapon);assert.ok(blast.hits.find(h=>h.unit.id===0).damage>=100);assert.ok(!blast.hits.some(h=>h.unit.id===2));assert.ok(!blast.hits.some(h=>h.unit.id===3));assert.equal(blast.blast.kind,'grenade');assert.equal(blast.blast.radius,5);assert.equal(a.burningTurns,undefined);
 assert.equal(grenadeDamage(4.5),7);assert.equal(grenadeDamage(5),6);assert.equal(grenadeDamage(5.01),0);assert.ok(grenadeDamage(1.5)>grenadeDamage(2.5));
});
test('tower platforms and fractional cliff supports use native model height for range and release',()=>{
 const {s,a}=scene();a.towerPost={kind:'wooden-spotlight-tower',dx:0,dy:0};assert.equal(grenadeBase(a),6.36);assert.equal(grenadePreview(s,a,target,weapon).maxRange,22);assert.ok(grenadeOrigin(a,target).h>7.8);
 delete a.towerPost;a.cliffSupport={level:1,height:1};assert.equal(grenadeBase(a),3.12);assert.ok(grenadePreview(s,a,target,weapon).maxRange>15);
});
test('live grenade attacks spend AP/ammo once and round-trip deterministic outcomes through saves',()=>{
 const m=blankMap('Grenade rules');m.starts=[{x:10,y:10,weapon:'grenade',species:'horse'},{x:4,y:4},{x:4,y:6},{x:4,y:8}];m.guards=[{x:18,y:10,z:0,species:'pig-foreman',weapon:'hands'}];const s=createGame(72,m,true,'easy',{statSystem:true}),a=s.units[0];startEncounterClock(s);a.ap=18;s.phase='player';s.rules.awareness=false;s.seen.add('18,10');const saved=captureEncounter(s),restored=restoreEncounter(saved),before=a.ammo.grenade;
 assert.equal(attackGround(s,a,target),true);assert.equal(a.ap,13);assert.equal(a.ammo.grenade,before-1);assert.ok(s.effect.sequence[0].grenade);assert.equal(s.effect.trajectories[0].kind,'grenade');assert.ok(!s.units.some(u=>u.burningTurns));
 restored.phase='player';restored.rules.awareness=false;restored.units[0].ap=18;restored.seen.add('18,10');assert.equal(attackGround(restored,restored.units[0],target),true);assert.deepEqual(restored.effect.trajectories,s.effect.trajectories);
 const after=restoreEncounter(captureEncounter(s));assert.equal(after.effect,null);assert.equal(after.units[0].ammo.grenade,a.ammo.grenade);assert.equal(after.units[0].ap,a.ap);
});
test('combat playback holds casualties and chained explosions until the grenade fuse ends',()=>{
 const {s,a}=scene(),b={...a,id:1,team:'guard',x:18,hp:50},p=new BattleCombat();s.units.push(b);s.detected.add(1);p.observe(s,0);const shot=grenadeTrajectory(s,a,target,weapon,{chance:100},()=>0),event={shooter:0,target:1,ax:10,ay:10,az:0,bx:18,by:10,grenade:{shooter:structuredClone(a),release:1.92,recovery:4.6},trajectories:[shot],explosions:[{kind:'grenade'}],downed:[1]};b.hp=0;s.effect={sequence:[event]};p.observe(s,10);assert.equal(p.active.event.grenade.release,1.92);assert.equal(dischargeDelay(p.active),5920);p.advance(2010);assert.ok(p.active.phase.released);assert.ok(!p.active.phase.discharged);assert.equal(p.display(b).hp,50);p.advance(5930);assert.equal(p.display(b).hp,0);p.advance(6750);assert.equal(p.busy,false);
});
for(const profile of ANIMAL_MOTION_CATALOG)test(profile.id+': prepared live throw releases at the physics origin and restores equipment/rig on cancellation',()=>{
 const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),scene3d=new T.Scene(),root=new T.Group();root.add(worker.root);scene3d.add(root);const posture=createBattlePosture(worker,profile),locomotion=createWorkerLocomotion(worker,profile),model={worker,root,profile,posture,locomotion},fx=new BattleGrenades(scene3d),{s,a}=scene();a.species=profile.id;
 const parents=worker.bones.map(b=>b.parent?.name),initial=worker.parts.map(p=>[...p.geometry.attributes.skinWeight.array]);
 try{for(const heading of [0,90,180,270]){const dest={x:a.x+7*Math.cos(heading*Math.PI/180),y:a.y+7*Math.sin(heading*Math.PI/180),z:0},trajectory=grenadeTrajectory(s,a,dest,weapon,{chance:100},()=>0),event={shooter:0,ax:a.x,ay:a.y,az:0,bx:dest.x,by:dest.y,grenade:{release:1.92,shooter:{...a}},trajectories:[trajectory]},shot={event,shooter:{...a},reduced:false};shot.phase=grenadePhase(shot,1920);
   for(const time of [0,500,1200,1900,1920]){shot.phase=grenadePhase(shot,time);assert.equal(fx.pose(model,a,shot,time),true);}
   const actual=model.equipment.anchors.release.getWorldPosition(new T.Vector3()),expected=grenadeOrigin(a,dest);assert.ok(actual.distanceTo(new T.Vector3(expected.x,expected.h,expected.y))<.0001,profile.id+' release must match the real hand');
   fx.update(shot,s);assert.equal(fx.projectile.root.visible,true);
   const interrupted=heading===0?null:heading===180?{...shot,reduced:true}:heading===270?{...shot,phase:grenadePhase(shot,4600)}:shot;
   assert.equal(fx.pose(model,heading===90?{...a,hp:0}:a,interrupted,4600),false);assert.equal(fx.session,null);
   model.locomotion.apply({x:a.x,y:a.y,z:0,heading,distance:0,blend:0,pose:{}});worker.bones.forEach((b,i)=>assert.equal(b.parent?.name,parents[i],b.name));for(const [i,p]of worker.parts.entries())assert.ok(p.geometry.attributes.skinWeight.array.every((v,j)=>v===initial[i][j]),profile.id+' weights restored: '+p.name);
  }}finally{fx.dispose();model.locomotion.dispose();model.equipment?.dispose();worker.skeleton.dispose();worker.dispose();}
});
test('destructible scenery stays intact in presentation until the fuse completes',()=>{
 const {s}=scene();s.edges['e:12:10']='wall-concrete';s.units=[];const impact={x:12,y:10,h:.4,z:0,grenade:true},result=detonate(s,impact,weapon);assert.equal(s.edges['e:12:10'],undefined);
 const fx=new BattleGrenades(new T.Scene()),shot={event:{grenade:{scenery:result.before},sites:result.sites},phase:{discharged:false}},combat={active:shot,queue:[]};
 try{assert.equal(fx.scenery(s,combat).edges['e:12:10'],'wall-concrete');assert.equal(s.edges['e:12:10'],undefined);shot.phase.discharged=true;assert.equal(fx.scenery(s,combat).edges['e:12:10'],undefined);}finally{fx.dispose();}
});
test('the review map loads through ordinary gameplay validation',()=>{assert.doesNotThrow(()=>createGame(1,grenadeFixture(),true,'easy',{statSystem:true}));});

test('unseen people cannot change the preview, but still physically intercept a thrown grenade',()=>{
 const {s,a}=scene(),before=grenadePreview(s,a,target,weapon);
 s.units.push({...a,id:1,team:'guard',x:14,y:10,z:1});
 assert.deepEqual(grenadePreview(s,a,target,weapon),before);
 const actual=grenadeTrajectory(s,a,target,weapon,{chance:100},()=>0);
 assert.ok(actual.collisions.some(c=>c.kind==='unit'));
 s.detected.add(1);assert.ok(grenadePreview(s,a,target,weapon).trajectory.collisions.some(c=>c.kind==='unit'));
});
