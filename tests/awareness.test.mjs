import test from 'node:test';
import assert from 'node:assert/strict';
import {awarenessRate,illuminationAt,updateAwareness} from '../dist/tactics/awareness.js';
import {createGame,refresh,canSee,geometricPerceive,visibleZones,emitNoise} from '../dist/tactics/core/engine.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {startEncounterClock,tickEncounterClock} from '../dist/tactics/encounter-clock.js';
function fixture(minutes=720){const map=blankMap('Awareness');map.time={startMinutes:minutes};map.guards=[{x:30,y:4,z:0,species:'pig-foreman',weapon:'hands',heading:180,perception:70}];const s=createGame(1,map,false,'easy',{awareness:true});s.units.forEach(u=>u.heading=u.team==='squad'?0:180);startEncounterClock(s);refresh(s);return s;}
test('exposure, light, distance, movement, stance, skills and vigilance affect awareness',()=>{
 const base={distance:12,exposure:1,light:1,moving:true},rate=awarenessRate(base);
 for(const change of [{distance:40},{exposure:.25},{light:.12},{sneaking:true},{stance:'prone'},{stealth:90},{perception:10},{concealment:3},{moving:false}])assert.ok(awarenessRate({...base,...change})<rate,JSON.stringify(change));
 for(const change of [{running:true},{alert:true},{perception:90}])assert.ok(awarenessRate({...base,...change})>rate);
 assert.ok(awarenessRate({...base,light:.12,contrast:.8})>awarenessRate({...base,light:.12}));
});
test('sun illumination uses 3D occlusion and nighttime ambient floor',()=>{
 const s=fixture(),u=s.units[0];assert.equal(illuminationAt(s,u),1);
 s.upper[0][u.x+','+u.y]='floor';assert.equal(illuminationAt(s,u),.25);
 s.clock.minutes=1260;assert.equal(illuminationAt(s,u),.12);
});
test('recognition requires elapsed exposure, while refresh and queries are free',()=>{
 const s=fixture(),a=s.units[0],b=s.units[4];assert.equal(b.perception,70);assert.equal(geometricPerceive(s,a,b),2);assert.equal(canSee(s,a,b),false);
 for(let i=0;i<20;i++){refresh(s);canSee(s,a,b);}assert.equal(a.awareness[b.id].score,0);
 tickEncounterClock(s,1000);assert.ok(a.awareness[b.id].score>=25);assert.equal(canSee(s,a,b),false);
 tickEncounterClock(s,3000);assert.equal(canSee(s,a,b),true);assert.deepEqual(a.awareness[b.id].lastKnown,{x:30,y:4,z:0});
 const before=a.awareness[b.id].score;tickEncounterClock(s,60000,{paused:true});assert.equal(a.awareness[b.id].score,before);
});
test('night delays recognition and fixed exposure ticks are frame-size independent',()=>{
 const day=fixture(),night=fixture(1260),small=fixture();tickEncounterClock(day,2000);tickEncounterClock(night,2000);for(let i=0;i<8;i++)tickEncounterClock(small,250);
 assert.ok(day.units[0].awareness[4].score>night.units[0].awareness[4].score);
 assert.ok(Math.abs(day.units[0].awareness[4].score-small.units[0].awareness[4].score)<1e-8);
});
test('lost LOS leaves a fixed memory and cannot authorize shooting through a wall',()=>{
 const s=fixture(),a=s.units[0],b=s.units[4];tickEncounterClock(s,5000);assert.equal(canSee(s,a,b),true);const known={...a.awareness[b.id].lastKnown};
 for(let y=0;y<20;y++)s.edges['e:15:'+y]='wall';b.x=32;refresh(s);
 assert.equal(canSee(s,a,b),false);assert.deepEqual(a.awareness[b.id].lastKnown,known);
 tickEncounterClock(s,1000);assert.ok(a.awareness[b.id].score<100);
});
test('combat thinking is free, actions consume bounded exposure, and combat entry grants no free minute',()=>{
 const s=fixture(),a=s.units[0],b=s.units[4];s.phase='player';s.engaged=true;s.round=1;refresh(s);assert.equal(a.awareness[b.id].score,0);
 for(let i=0;i<20;i++)refresh(s);assert.equal(a.awareness[b.id].score,0);
 b.heading=170;b.ap-=2;refresh(s);assert.ok(a.awareness[b.id].score>0);const score=a.awareness[b.id].score;
 refresh(s);assert.equal(a.awareness[b.id].score,score);
 for(let i=0;i<20;i++){b.heading+=.1;b.ap=Math.max(0,b.ap-1);updateAwareness(s,{geometry:geometricPerceive,zones:visibleZones});}assert.ok(Math.abs(a.awareness[b.id].spent-60)<1e-8);
});

test('sound causes investigation without visual identification or ballistic RNG changes',()=>{
 const s=fixture(),a=s.units[0],b=s.units[4],seed=s.seed;
 emitNoise(s,a,50);assert.ok(['suspicious','searching'].includes(b.state));assert.ok(b.lastHeard);
 assert.equal(canSee(s,b,a),false);assert.equal(b.awareness[a.id].score,0);assert.equal(s.seed,seed);
});
test('peripheral evidence stays a glimpse and close exposed contact is identified',()=>{
 const s=fixture(),a=s.units[0],b=s.units[4];
 s.awarenessSeconds=120;updateAwareness(s,{geometry:()=>1,zones:()=>['head','torso','legs']});assert.equal(a.awareness[b.id].score,99);
 b.x=a.x+1;b.y=a.y;s.awarenessSeconds=0;updateAwareness(s,{geometry:geometricPerceive,zones:visibleZones});assert.equal(canSee(s,a,b),true);
});

test('spotlights instantly identify sneaking camouflaged targets without range, skill or exposure delays',()=>{
 const s=fixture(1260),target=s.units[0],observer=s.units[4];observer.x=60;observer.perception=0;target.sneaking=true;target.stealth=100;target.stance='prone';
 for(let x=4;x<30;x++)s.map[4][x]='woodland';
 s.props=[{kind:'spotlight',x:7,y:4,z:0,lightMode:'on',lightTargets:[{x:-4,y:0,z:0}]}];
 assert.equal(geometricPerceive(s,observer,target),0);assert.equal(canSee(s,observer,target),true);
 updateAwareness(s,{geometry:geometricPerceive,zones:visibleZones});assert.equal(observer.awareness[target.id].score,100);assert.equal(observer.awareness[target.id].spotlit,true);assert.deepEqual(observer.awareness[target.id].lastKnown,{x:3,y:4,z:0});
 // Every visible portion is sufficient, even if cover leaves only the head.
 observer.awareness={};updateAwareness(s,{geometry:()=>0,zones:()=>['head']});assert.equal(observer.awareness[target.id].score,100);
 observer.awareness={};updateAwareness(s,{geometry:()=>0,zones:()=>['weapon']});assert.equal(observer.awareness[target.id].score,0);
 s.rules.awareness=false;assert.equal(canSee(s,observer,target),false);
});

test('spotlight reveal respects observer cone, observer walls, beam walls, schedules and sweeping away',()=>{
 const s=fixture(1260),target=s.units[0],observer=s.units[4];target.sneaking=true;target.stealth=100;
 const lamp={kind:'spotlight',x:7,y:4,z:0,lightMode:'on',lightTargets:[{x:-4,y:0,z:0},{x:4,y:0,z:0}]};s.props=[lamp];
 assert.equal(canSee(s,observer,target),true);observer.heading=0;assert.equal(canSee(s,observer,target),false);observer.heading=180;
 s.edges['e:15:4']='wall';assert.equal(canSee(s,observer,target),false);delete s.edges['e:15:4'];
 lamp.x=3;lamp.y=9;lamp.lightTargets=[{x:0,y:-5,z:0}];s.edges['s:3:6']='wall';assert.ok(visibleZones(s,observer,target).length);assert.equal(canSee(s,observer,target),false);delete s.edges['s:3:6'];assert.equal(canSee(s,observer,target),true);
 lamp.lightMode='off';assert.equal(canSee(s,observer,target),false);lamp.lightMode='auto';s.clock.minutes=720;assert.equal(canSee(s,observer,target),false);
 s.clock.minutes=1260;lamp.x=7;lamp.y=4;lamp.lightTargets=[{x:-4,y:0,z:0},{x:4,y:0,z:0}];assert.equal(canSee(s,observer,target),true);s.clock.minutes+=1;assert.equal(canSee(s,observer,target),false);
});

test('dim spotlight bands force identification but ordinary lamp brightness does not',()=>{
 const s=fixture(1260),target=s.units[0],observer=s.units[4];target.sneaking=true;target.stealth=100;
 const lamp={kind:'spotlight',x:25,y:8,z:0,lightMode:'on',lightTargets:[{x:-22,y:-4,z:0}]};s.props=[lamp];assert.ok(illuminationAt(s,target)<.2);assert.equal(canSee(s,observer,target),true);
 lamp.kind='floor-lamp';lamp.x=3;lamp.y=5;assert.equal(illuminationAt(s,target),1);assert.equal(canSee(s,observer,target),false);
});
