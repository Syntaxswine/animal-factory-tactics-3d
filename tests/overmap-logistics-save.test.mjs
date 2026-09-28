import test from 'node:test';
import assert from 'node:assert/strict';
import {blank,route} from '../dist/tactics/overmap-model.js';
import {createGroups,validateGroups} from '../dist/tactics/overmap-groups.js';
import {ensureLogistics,advanceLogistics,validateLogistics,resolveLogisticsEncounter} from '../dist/tactics/overmap-logistics.js';
function fixture(){
 const map=blank();for(let i=0;i<8;i++)map.sectors[i].routes=[route('road','west','east')];
 Object.assign(map.sectors[1],{facilities:['factory'],owner:'red-hats'});
 Object.assign(map.sectors[4],{role:'fortress',owner:'red-hats'});
 const state=createGroups(map);state.groups[0].state.position=20;ensureLogistics(state,map);advanceLogistics(state,map,10);
 const raider=structuredClone(state.logistics.convoys[0]);raider.id='raiders-2';delete raider.fort;state.logistics.raiders.push(raider);state.logistics.nextId=3;
 return {map,state};
}
function load(saved){const copy=JSON.parse(JSON.stringify(saved));validateGroups(copy.state,copy.map);validateLogistics(copy.state,copy.map);return copy.state;}
for(const kind of ['convoys','raiders'])for(const [label,mutate] of [
 ['missing movement state',g=>delete g.state],['null movement state',g=>g.state=null],
 ['disconnected route',g=>g.state.route[0].to=449],['invalid progress',g=>g.state.progress=-1],
 ['progress beyond crossing',g=>g.state.progress=999],['clock mismatch',g=>g.state.clock.minutes++],
 ['missing members',g=>g.state.members=[]],['invalid wait',g=>g.waitMinutes=-1],
 ['missing ID',g=>delete g.id]
])test(`loading rejects ${kind}: ${label}`,()=>{const f=fixture();mutate(f.state.logistics[kind][0]);assert.throws(()=>load(f));});
for(const [label,mutate] of [
 ['duplicate enemy IDs',l=>l.raiders[0].id=l.convoys[0].id],
 ['player/enemy ID collision',(l,s)=>l.raiders[0].id=s.groups[0].id],
 ['unknown convoy fortress',l=>l.convoys[0].fort=449],
 ['null enemy entry',l=>l.raiders[0]=null]
])test(`loading rejects ${label}`,()=>{const f=fixture();mutate(f.state.logistics,f.state);assert.throws(()=>load(f));});
function pendingFixture(kind='convoy'){const f=fixture(),l=f.state.logistics;l.pending={kind,sector:1,groupIds:['group-1'],enemyId:l.convoys[0].id,militia:0,militiaRoster:[]};if(kind==='raiders')l.pending.enemyId=l.raiders[0].id;if(kind==='fortress'){l.pending.sector=4;delete l.pending.enemyId;}return f;}
for(const [label,mutate] of [
 ['unknown kind',p=>p.kind='invalid'],['missing sector',p=>p.sector=999],
 ['no participants',p=>p.groupIds=[]],['unknown participant',p=>p.groupIds=['missing']],
 ['duplicate participant',p=>p.groupIds=['group-1','group-1']],
 ['missing enemy',p=>p.enemyId='missing'],['wrong enemy kind',p=>p.enemyId='raiders-2']
])test(`loading rejects encounter: ${label}`,()=>{const f=pendingFixture();mutate(f.state.logistics.pending);assert.throws(()=>load(f));});
test('loading rejects fortress handoff without an enemy fortress',()=>{const f=pendingFixture('fortress');f.state.logistics.forts[0].owner='player';assert.throws(()=>load(f));});
test('valid partial travel round trips and continues identically',()=>{const f=fixture(),restored=load(f);assert.deepEqual(restored,f.state);advanceLogistics(restored,f.map,20);advanceLogistics(f.state,f.map,20);assert.deepEqual(restored,f.state);});
for(const kind of ['convoy','raiders','fortress'])test(`valid ${kind} handoff remains paused after reload and resolves`,()=>{const f=pendingFixture(kind),restored=load(f);assert.throws(()=>advanceLogistics(restored,f.map,1),/pending encounter/);resolveLogisticsEncounter(restored,'player-victory');assert.equal(restored.logistics.pending,null);});
test('a rejected candidate does not replace the active session',()=>{const f=fixture(),active=structuredClone(f.state),bad=structuredClone(f);bad.state.logistics.raiders[0].state=null;let current=active;assert.throws(()=>{current=load(bad);});assert.deepEqual(current,f.state);});

test('same-sector contact ignores fractional positions inside that sector',()=>{
 const f=fixture(),enemy=f.state.logistics.convoys[0],g=f.state.groups[0];
 g.state.position=enemy.state.position;g.state.route=structuredClone(enemy.state.route);g.state.progress=1;
 assert.notEqual(g.state.progress,enemy.state.progress);
 assert.equal(advanceLogistics(f.state,f.map,1),0);assert.equal(f.state.logistics.pending.kind,'convoy');
});
test('a recruitment deadline already reached on arrival supplies an enemy squad',()=>{
 const f=fixture(),l=f.state.logistics;f.state.groups[0].state.position=4;l.convoys=[];l.raiders=[];
 l.forts[0].readyAt=f.state.clock.minutes;
 assert.equal(advanceLogistics(f.state,f.map,1),0);assert.equal(l.raiders.length,1);
 assert.equal(l.raiders[0].state.position,4);assert.equal(l.pending.kind,'raiders');
});
