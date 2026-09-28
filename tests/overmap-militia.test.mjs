import test from 'node:test';
import assert from 'node:assert/strict';
import {blank} from '../dist/tactics/overmap-model.js';
import {createGroups} from '../dist/tactics/overmap-groups.js';
import {ensureLogistics,startMilitiaTraining,advanceLogistics,cancelMilitiaTraining,validateLogistics} from '../dist/tactics/overmap-logistics.js';
import {militiaMinutes,militiaAt,militiaLoadout,trainMilitia,emptyMilitia} from '../dist/tactics/overmap-militia.js';
function setup(){const map=blank();Object.assign(map.sectors[20],{role:'town',owner:'player'});const s=createGroups(map);s.groups[0].state.position=20;ensureLogistics(s,map);return {map,s,g:s.groups[0]};}
test('leadership anchors and intermediate durations',()=>{
 assert.equal(militiaMinutes(1),5760);assert.equal(militiaMinutes(50),4320);assert.equal(militiaMinutes(100),2880);assert.equal(militiaMinutes(75),3600);
 for(let n=2;n<=100;n++)assert.ok(militiaMinutes(n)<militiaMinutes(n-1));
});
test('six completed batches produce the exact progression and mixed weapon loadouts',()=>{
 let r=emptyMilitia();
 const expected=[[4,0,0],[8,0,0],[4,4,0],[0,8,0],[0,4,4],[0,0,8]];
 for(let i=0;i<6;i++){r=trainMilitia(r);assert.deepEqual([r.basic,r.medium,r.high],expected[i]);assert.equal(r.rounds,i+1);}
 assert.deepEqual(militiaLoadout(r).map(u=>u.weapon),['sniper','hmg','sniper','hmg','sniper','hmg','sniper','hmg']);
 assert.deepEqual(militiaLoadout({basic:2,medium:2,high:0}).map(u=>u.weapon),['pistol','rifle','smg','assault']);
 assert.throws(()=>trainMilitia(r),/six/);
});
test('partial batches fill vacancies before upgrading existing troops once',()=>{
 assert.deepEqual(trainMilitia({basic:0,medium:6,high:0,rounds:4}),{basic:2,medium:4,high:2,rounds:5});
 assert.deepEqual(trainMilitia({basic:1,medium:6,high:0,rounds:3}),{basic:1,medium:5,high:2,rounds:4});
 assert.deepEqual(trainMilitia({basic:0,medium:0,high:6,rounds:4}),{basic:2,medium:0,high:6,rounds:5});
 assert.throws(()=>trainMilitia({basic:0,medium:0,high:6,rounds:6}),/six/);
});
test('best leader is chosen across groups physically in sector, snapshot survives save',()=>{
 const {s,map,g}=setup();g.state.members.forEach(m=>m.stats.leadership=1);
 const other=structuredClone(g);other.id='other';other.state.members=[{id:99,stats:{leadership:100,agility:50},social:{fatigue:0}}];s.groups.push(other);
 startMilitiaTraining(s,map,g.id);assert.equal(g.training.leadership,100);assert.equal(g.training.endsAt-s.clock.minutes,2880);
 other.state.position=21;const saved=structuredClone(s);validateLogistics(saved,map);assert.equal(saved.groups[0].training.leadership,100);
 cancelMilitiaTraining(s,g.id);startMilitiaTraining(s,map,g.id);assert.equal(g.training.leadership,1);
 cancelMilitiaTraining(s,g.id);other.state.position=20;other.state.progress=1;startMilitiaTraining(s,map,g.id);assert.equal(g.training.leadership,1);
});
test('settlement sectors share roster, budget and six-batch limit; cancellation does not spend a round',()=>{
 const {s,map,g}=setup();map.sectors[20].settlementId='city-test';Object.assign(map.sectors[21],{role:'city',owner:'player',settlementId:'city-test'});
 const other=structuredClone(g);other.id='other';other.state.position=21;s.groups.push(other);
 startMilitiaTraining(s,map,g.id);assert.throws(()=>startMilitiaTraining(s,map,other.id),/already/);assert.equal(s.logistics.money,4500);
 cancelMilitiaTraining(s,g.id);assert.equal(militiaAt(s,map,20).rounds,0);
 for(let n=1;n<=6;n++){startMilitiaTraining(s,map,g.id);advanceLogistics(s,map,g.training.endsAt-s.clock.minutes);assert.equal(militiaAt(s,map,21).rounds,n);}
 assert.equal(s.logistics.money,1500);assert.deepEqual(militiaAt(s,map,21),{basic:0,medium:0,high:8,rounds:6});
 assert.throws(()=>startMilitiaTraining(s,map,other.id),/six/);assert.equal(s.logistics.money,1500);
 const saved=JSON.parse(JSON.stringify(s));validateLogistics(saved,map);assert.deepEqual(saved.logistics.militia,s.logistics.militia);
});
test('legacy counts migrate without loss and invalid rosters are rejected',()=>{
 const {s,map}=setup();s.logistics.militia[20]=8;validateLogistics(s,map);assert.deepEqual(militiaAt(s,map,20),{basic:8,medium:0,high:0,rounds:2});
 for(const invalid of [12,{basic:9,medium:0,high:0,rounds:1},{basic:0,medium:-1,high:1,rounds:1},{basic:0,medium:0,high:8,rounds:7}]){const saved=structuredClone(s);saved.logistics.militia[20]=invalid;assert.throws(()=>validateLogistics(saved,map));}
});
