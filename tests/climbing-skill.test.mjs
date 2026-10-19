import {invalidateMapGeometry} from '../dist/tactics/map-geometry-cache.js';
import {train} from '../dist/tactics/core/progression.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CLIMBS,climbingPreview,rollClimb} from '../dist/tactics/climbing.js';
import {initializeStats} from '../dist/tactics/character-stats.js';
import {blankMap,neighbors,validateMap} from '../dist/tactics/core/maps.js';
import {createGame,stepMovement,movementNeighbors,navigationPath,moveGroup,commitClimb,boundedRoute} from '../dist/tactics/core/engine.js';
import {climbPreview,performClimb,traversalPreview,performTraversal} from '../dist/tactics/ladder-actions.js';
import {towerClimbPreview,climbTower} from '../dist/tactics/tower-actions.js';
import {towerEntry,towerForUnit} from '../dist/tactics/tower-geometry.js';
import {walkingRoutes,walkingWarning} from '../dist/tactics/walking-preview.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {openingContent} from '../dist/tactics/campaign-opening.js';
import {createCampaign,openCampaignSector} from '../dist/tactics/campaign-model.js';
import {captureCampaign,restoreCampaign} from '../dist/tactics/campaign-save.js';

const unit=(skill=50)=>initializeStats({name:'Test',species:'horse',team:'squad',weapon:'rifle',stance:'standing',pack:[]},{climbing:skill,strength:50,endurance:50});
// Invert the saved LCG to force each face without monkey-patching production RNG.
const seedFor=roll=>Number((BigInt(Math.floor((roll-.5)*4294967296/100))-1013904223n)*4276115653n&0xffffffffn);
function fixture(kind='ladder',skill=50,{rusty=false}={}){
 const map=blankMap('Climbing test');map.starts[0]={x:10,y:10,z:0,stats:{climbing:skill}};
 if(kind==='ladder'){map.stairs=[{x:10,y:10,z:0,kind:'ladder',rusty}];map.upper[0]['10,10']='floor';}
 if(kind==='window'||kind==='wall')map.edges['e:10:10']=kind==='window'?'window-concrete':'wall-brick';
 if(kind==='roof'){map.props=[{kind:'roof-corrugated-flat',x:11,y:10,z:1}];for(let x=11;x<13;x++)for(let y=10;y<12;y++)map.upper[0][x+','+y]='floor';}
 const s=createGame(42,map,false,'easy',{statSystem:true}),u=s.units[0];startEncounterClock(s);s.phase='player';u.ap=30;s.seen.add('10,10');s.seen.add('10,10,1');
 return {s,u,step:movementNeighbors(s,u).find(p=>p.kind===kind)};
}

test('accepted benchmarks, forgiving minimum and double-skill reliability are exact',()=>{
 for(const [kind,skill,chance]of [['ladder',2,38],['ladder',3,68],['ladder',5,100],['window',10,15],['window',20,60],['window',30,80],['window',40,99],['roof',20,15],['roof',40,60],['roof',60,80],['roof',80,99],['wall',45,15],['wall',90,60],['wall',100,64]])assert.equal(climbingPreview(unit(skill),{kind},false).chance,chance,kind+' '+skill);
 for(const kind of ['window','roof','wall'])assert.ok(climbingPreview(unit(1),{kind}).chance>0,'low skills retain a difficult attempt');
 assert.equal(CLIMBS.ladder.required,2.5);
});
test('Climbing 1 is blocked, 2 is exploration-only, 3 can attempt combat ladders',()=>{
 for(const rusty of [false,true])for(const combat of [false,true])assert.equal(climbingPreview(unit(1),{kind:'ladder',rusty},combat).ok,false);
 assert.equal(climbingPreview(unit(2),{kind:'ladder'},false).ok,true);assert.equal(climbingPreview(unit(2),{kind:'ladder'},true).ok,false);
 for(const phase of ['player','enemy','explore','won']){const s={phase,engaged:true,climbSeed:1};assert.equal(rollClimb(s,unit(2),{kind:'ladder'}).blocked,true);assert.equal(s.climbSeed,1);}
 assert.equal(rollClimb({phase:'explore',alerted:new Set([9])},unit(2),{kind:'ladder'}).blocked,true);
 assert.equal(climbingPreview(unit(3),{kind:'ladder'},true).ok,true);
});
test('all 100 faces match the displayed odds, with normal ladders exempt from critical failures',()=>{
 for(const [kind,skill,rusty]of [['ladder',5,false],['ladder',5,true],['ladder',3,false],['window',20,false],['window',40,false],['roof',80,false],['wall',100,false]]){
  const u=unit(skill),route={kind,rusty};let wins=0,criticals=0;
  for(let face=1;face<=100;face++){const s={phase:'player',seed:7,climbSeed:seedFor(face)},r=rollClimb(s,u,route);wins+=r.success?1:0;criticals+=r.criticalFailure?1:0;if(kind==='window')assert.equal(!!r.fall,false);if(kind==='ladder'&&skill===5&&!rusty)assert.equal(s.climbSeed,seedFor(face));else assert.equal(r.roll,face);}
  assert.equal(wins,climbingPreview(u,route,true).chance);assert.equal(criticals,kind==='ladder'&&!rusty?0:1);
 }
});
test('exhaustion, injuries and excessive load reduce reliability; skill improves AP and experts can run',()=>{
 const u=unit(50),route={kind:'roof'},base=climbingPreview(u,route);
 u.stamina=10;assert.ok(climbingPreview(u,route).chance<base.chance);u.stamina=u.maxStamina;u.hp=10;assert.ok(climbingPreview(u,route).chance<base.chance);u.hp=u.maxHp;
 u.pack=[{type:'weapon',kind:'hmg'},...Array.from({length:10},()=>({type:'weapon',kind:'rpg'}))];assert.ok(climbingPreview(u,route).chance<base.chance);
 for(const [kind,start,end]of [['ladder',6,2],['window',4,2],['roof',8,4],['wall',12,8],['cliff',8,8]]){
  assert.equal(climbingPreview(unit(Math.ceil(CLIMBS[kind].required)),{kind}).cost,start);assert.equal(climbingPreview(unit(100),{kind}).cost,end);
 }
 const expert=unit(100);expert.running=true;assert.equal(climbingPreview(expert,{kind:'ladder'}).cost,1);assert.equal(climbingPreview(expert,{kind:'ladder'}).running,true);
});
test('previews and pathfinding consume no rolls; walking and button prices match the committed ladder',()=>{
 const {s,u}=fixture('ladder',100);u.running=true;const before=structuredClone(s),goal={x:10,y:10,z:1};
 for(let i=0;i<3;i++){assert.equal(climbPreview(s,u).cost,1);assert.equal(navigationPath(s,u,goal.x,goal.y,goal.z)[0].cost,1);const routes=walkingRoutes(s,[u.id],u,goal);assert.match(walkingWarning(routes),/100% success/);}
 assert.deepEqual(s,before);assert.ok(performClimb(s,u));assert.equal(u.ap,30);assert.ok(stepMovement(s));assert.equal(u.z,1);assert.equal(u.ap,29);assert.equal(s.climbSeed,undefined);assert.equal(s.simpleTraversal.kind,'ladder');assert.equal(s.simpleTraversal.running,true);
 s.phase='player';assert.ok(performClimb(s,u));stepMovement(s);assert.equal(u.z,0);assert.equal(u.ap,28);
});
test('ladder restrictions hold both in previews and when a queued exploration attempt enters combat',()=>{
 const {s,u}=fixture('ladder',2);assert.equal(climbPreview(s,u).ok,false);s.phase='explore';assert.equal(climbPreview(s,u).ok,true);assert.ok(performClimb(s,u));const ap=u.ap;s.phase='player';assert.equal(stepMovement(s),false);assert.equal(u.z,0);assert.equal(u.ap,ap);assert.equal(s.climbSeed,undefined);
 u.stats.climbing=1;s.phase='explore';assert.equal(climbPreview(s,u).ok,false);assert.equal(performClimb(s,u),false);
});
test('a changed or occupied landing cancels before spending AP, stamina or randomness',()=>{
 for(const change of ['remove','occupy','kneel']){const {s,u}=fixture('ladder',5);assert.ok(performClimb(s,u));const ap=u.ap,stamina=u.stamina;
  if(change==='remove')delete s.upper[0]['10,10'];if(change==='occupy')Object.assign(s.units[1],{x:10,y:10,z:1});if(change==='kneel')u.stance='kneeling';
  assert.equal(stepMovement(s),false);assert.equal(u.z,0);assert.equal(u.ap,ap);assert.equal(u.stamina,stamina);assert.equal(s.climbSeed,undefined);
 }
});
test('a narrow failure spends the attempt once and stays put; every window failure is harmless',()=>{
 for(const [kind,skill,roll]of [['roof',40,61],['window',20,100],['window',1,100]]){const {s,u,step}=fixture(kind,skill);s.climbSeed=seedFor(roll);const hp=u.hp,ap=u.ap,pos=[u.x,u.y,u.z];assert.ok(performTraversal(s,u,step));assert.ok(stepMovement(s));assert.equal(s.lastClimb.roll,roll);assert.equal(u.hp,hp);assert.deepEqual([u.x,u.y,u.z],pos);assert.equal(u.ap,ap-step.cost);assert.equal(s.queue.length,0);assert.equal(s.simpleTraversal,undefined);assert.equal(s.roofTraversals,undefined);}
});
test('a severe roof failure causes a weighted fall without endurance armour and never places on the roof',()=>{
 const {s,u,step}=fixture('roof',40);s.climbSeed=seedFor(100);const hp=u.hp,ap=u.ap;u.damageResistance=1000;
 assert.ok(performTraversal(s,u,step));assert.ok(stepMovement(s));assert.equal(u.z,0);assert.ok(u.hp<hp);assert.equal(hp-u.hp,s.simpleTraversal.damage);assert.equal(u.ap,ap-step.cost);assert.equal(s.lastClimb.criticalFailure,true);assert.equal(s.simpleTraversal.height,.5);assert.equal(s.roofTraversals,undefined);
});
test('windows and exposed walls have routes; closed doors, parapets and building ceilings stay blocked',()=>{
 const {s,u}=fixture('wall',100);assert.ok(movementNeighbors(s,u).some(p=>p.kind==='wall'));s.upper[0]['10,10']='floor';assert.ok(!movementNeighbors(s,u).some(p=>p.kind==='wall'));
 delete s.upper[0]['10,10'];s.edges['e:10:10']='door-steel-closed';assert.ok(!neighbors(s,u).some(p=>['wall','window'].includes(p.kind)));
 s.edges['e:10:10']='window-concrete';assert.ok(movementNeighbors(s,u).some(p=>p.kind==='window'));s.map[10][11]='water';assert.ok(!neighbors(s,u).some(p=>p.kind==='window'));
 const roof=fixture('roof',80);roof.s.props[0].kind='roof-flat-parapet';invalidateMapGeometry(roof.s);assert.ok(!movementNeighbors(roof.s,roof.u).some(p=>p.kind==='roof'));
});
test('guard routes use the same Climbing AP and eligibility as player routes',()=>{
 const {s,u}=fixture('ladder',2);const goal=new Set(['10,10,1']);assert.equal(boundedRoute(s,u,goal,500),null);u.stats.climbing=100;
 const path=boundedRoute(s,u,goal,500);assert.ok(path);assert.equal(path[0].kind,'ladder');assert.equal(path[0].cost,2);
});

test('AI routes reject climbs it cannot pay for in a full turn',()=>{
 const {s,u}=fixture('ladder',3);u.maxAp=5;
 assert.equal(boundedRoute(s,u,new Set(['10,10,1']),500),null);
 s.phase='explore';s.engaged=false;s.alerted=new Set();
 assert.ok(boundedRoute(s,u,new Set(['10,10,1']),500));
});

test('a guard failing its own climb does not cancel unrelated player orders',()=>{
 const {s,u,step}=fixture('roof',40);u.id=99;u.team='guard';s.queue=[{id:0,x:4,y:4,z:0}];
 for(const face of [70,100]){s.climbSeed=seedFor(face);const orders=structuredClone(s.queue);assert.equal(commitClimb(s,u,step,{guard:true}),false);assert.deepEqual(s.queue,orders);}
});
test('a tower checks once, charges three stories, and expert running preserves the existing journey',()=>{
 const map=blankMap('Tower'),tower={kind:'iron-searchlight-ladder-tower',x:10,y:10,z:0};map.props=[tower];map.starts[0]={...towerEntry(tower),stats:{climbing:100}};const s=createGame(42,map,false,'easy',{statSystem:true}),u=s.units[0];s.phase='player';u.ap=18;u.running=true;
 assert.equal(towerClimbPreview(s,u).cost,3);assert.ok(climbTower(s,u));assert.equal(u.ap,15);assert.ok(towerForUnit(s,u));assert.equal(s.towerTraversal.speed,2);assert.equal(s.climbSeed,undefined);
 s.phase='player';assert.ok(climbTower(s,u));assert.equal(u.ap,12);assert.equal(u.towerPost,undefined);
});
test('Climbing is trainable and survives saves; legacy saves gain it without recovering resources',()=>{
 const {s,u}=fixture('ladder',4);u.skillPoints=1;assert.ok(train(u,'climbing'));assert.equal(u.stats.climbing,5);s.climbSeed=987654;u.hp=23;u.ap=2;u.stamina=19;
 const save=captureEncounter(s),restored=restoreEncounter(save);assert.equal(restored.units[0].stats.climbing,5);assert.equal(restored.climbSeed,987654);
 const old=structuredClone(save);for(const p of old.state.units){delete p.stats.climbing;p.statVersion=1;}const migrated=restoreEncounter(old).units[0];assert.equal(migrated.stats.climbing,50);assert.deepEqual([migrated.hp,migrated.ap,migrated.stamina],[23,2,19]);
 for(const value of [0,101,2.5,NaN,undefined]){const bad=structuredClone(save);bad.state.units[0].stats.climbing=value;assert.throws(()=>restoreEncounter(bad),/damaged/);}
});
test('rusty ladder and authored skill persist through editor history, export and reusable blocks',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap('Author')));assert.ok(d.apply({tool:'ladder-rusty',start:{x:10,y:10,z:0},options:{}}).ok);assert.equal(d.map.stairs[0].rusty,true);const id=d.map.starts[0].character.id;assert.ok(d.updateCharacter(id,{stats:{climbing:2}}));assert.equal(d.map.starts[0].stats.climbing,2);d.undo();assert.equal(d.map.starts[0].stats,undefined);d.redo();assert.equal(d.map.starts[0].stats.climbing,2);
 const saved=d.export(),restored=new EditingDocument().open(saved);assert.equal(restored.map.stairs[0].rusty,true);assert.equal(restored.map.starts[0].stats.climbing,2);
 const block=d.capture(0,0),other=new EditingDocument().open(JSON.stringify(blankMap('Other')));other.place(block,1,1);assert.equal(other.map.stairs[0].rusty,true);
 assert.ok(d.apply({tool:'ladder',start:{x:10,y:10,z:0},options:{}}).ok);assert.equal(d.map.stairs[0].rusty,undefined);d.undo();assert.equal(d.map.stairs[0].rusty,true);
 const bad=JSON.parse(saved);bad.starts[0].stats.climbing=2.5;assert.ok(validateMap(bad,{connectivity:false}).some(e=>e.includes('Climbing')));
});

test('campaign migration preserves character identity, injuries and the climbing random stream',()=>{
 const c=createCampaign(openingContent(),{id:'climbing-migration'}),s=openCampaignSector(c,70),u=s.units.find(p=>p.team==='squad');
 u.stats.climbing=2;u.hp=23;u.ap=2;u.stamina=19;s.climbSeed=123456;
 const save=captureCampaign(c),restored=restoreCampaign(save),id=u.campaignId;
 assert.equal(restored.characters[id].unit.stats.climbing,2);assert.equal(restored.sectors[70].state.climbSeed,123456);
 const old=structuredClone(save);for(const r of Object.values(old.data.characters)){delete r.unit.stats.climbing;r.unit.statVersion=1;}
 const migrated=restoreCampaign(old),person=migrated.characters[id].unit;
 assert.equal(person.stats.climbing,50);assert.deepEqual([person.hp,person.ap,person.stamina],[23,2,19]);assert.equal(migrated.sectors[70].state.units.find(p=>p.campaignId===id),person);
 const bad=structuredClone(save);bad.data.characters[id].unit.stats.climbing=101;assert.throws(()=>restoreCampaign(bad),/damaged/);
});
