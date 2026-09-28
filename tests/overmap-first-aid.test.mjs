import test from 'node:test';import assert from 'node:assert/strict';
import {blank,route} from '../dist/tactics/overmap-model.js';
import {createGroups,validateGroups,orderGroup,splitGroup} from '../dist/tactics/overmap-groups.js';
import {ensureLogistics,advanceLogistics,startMilitiaTraining} from '../dist/tactics/overmap-logistics.js';
import {startGroupRest} from '../dist/tactics/overmap-rest.js';
import {firstAidMinutes,startFirstAid,stopFirstAid} from '../dist/tactics/overmap-first-aid.js';
function setup(){const map=blank(),s=createGroups(map),g=s.groups[0];map.sectors[0].owner='player';ensureLogistics(s,map);g.state.members.forEach(u=>Object.assign(u,{hp:40,maxHp:100,medkits:1,pack:[],stats:{...u.stats,medical:50}}));return {map,s,g};}
test('medical anchors and intermediate times',()=>{assert.equal(firstAidMinutes(1),2880);assert.equal(firstAidMinutes(50),1440);assert.equal(firstAidMinutes(100),480);assert.equal(firstAidMinutes(75),960);for(let n=2;n<=100;n++)assert.ok(firstAidMinutes(n)<firstAidMinutes(n-1));});
test('best eligible medic consumes one kit and fully heals all stationary groups in sector',()=>{
 const {map,s,g}=setup();g.state.members[1].stats.medical=100;const other=structuredClone(g);other.id='other';other.state.members.forEach(u=>u.id+=20);s.groups.push(other);other.state.members[0].hp=0;other.state.members[1].hp=99;
 startFirstAid(s,g.id);assert.equal(g.firstAid.doctorId,g.state.members[1].id);assert.equal(g.state.members[1].medkits,0);advanceLogistics(s,map,240);assert.equal(g.state.members[0].hp,70);assert.equal(other.state.members[1].hp,99.5);advanceLogistics(s,map,240);
 assert.equal(g.firstAid,undefined);assert.ok(g.state.members.every(u=>u.hp===100));assert.deepEqual(other.state.members.map(u=>u.hp),[0,100,100,100]);
});
test('no kit, full health and overlapping assignments do not consume supplies',()=>{
 const {s,g,map}=setup();g.state.members.forEach(u=>u.medkits=0);assert.throws(()=>startFirstAid(s,g.id),/kit/);g.state.members[0].medkits=1;g.state.members.forEach(u=>u.hp=100);assert.throws(()=>startFirstAid(s,g.id),/No wounded/);assert.equal(g.state.members[0].medkits,1);
 g.state.members[0].hp=40;startFirstAid(s,g.id);assert.throws(()=>startFirstAid(s,g.id));assert.throws(()=>startGroupRest(s,g.id));assert.throws(()=>startMilitiaTraining(s,map,g.id));assert.throws(()=>orderGroup(s,map,g.id,1));assert.throws(()=>splitGroup(s,g.id,[0]));
});
test('interruption keeps earned healing; save/load and tick sizes agree',()=>{
 const {s,g,map}=setup();startFirstAid(s,g.id);advanceLogistics(s,map,240);assert.equal(g.state.members[0].hp,50);const copy=JSON.parse(JSON.stringify(s));validateGroups(copy,map);advanceLogistics(s,map,240);for(let i=0;i<240;i++)advanceLogistics(copy,map,1);assert.deepEqual(copy,s);stopFirstAid(s,g.id);const hp=g.state.members[0].hp;advanceLogistics(s,map,100);assert.equal(g.state.members[0].hp,hp);
 const bad=structuredClone(copy);bad.groups[0].firstAid.duration=1;assert.throws(()=>validateGroups(bad,map));
});
test('attack ends treatment at the contact minute',()=>{
 const {s,g,map}=setup();for(let i=0;i<3;i++)map.sectors[i].routes=[route('road','west','east')];const enemy=structuredClone(g);enemy.id='raider';enemy.state.position=2;enemy.state.members.forEach(u=>u.stats.agility=50);s.logistics.raiders.push(enemy);
 startFirstAid(s,g.id);assert.equal(advanceLogistics(s,map,1440),120);assert.equal(g.firstAid,undefined);assert.equal(g.state.members[0].hp,45);assert.equal(s.logistics.pending.kind,'raiders');
});
test('patients who depart stop receiving care; sleep never overwrites healing',()=>{
 const {s,g,map}=setup();g.state.members[0].stats.medical=100;const other=structuredClone(g);other.id='other';other.state.members.forEach(u=>u.id+=20);s.groups.push(other);startGroupRest(s,other.id);startFirstAid(s,g.id);advanceLogistics(s,map,120);assert.equal(other.state.members[0].hp,55);other.state.position=1;delete other.rest;advanceLogistics(s,map,120);assert.equal(other.state.members[0].hp,55);other.state.position=0;advanceLogistics(s,map,240);assert.equal(other.state.members[0].hp,55);assert.equal(g.state.members[0].hp,100);
});
