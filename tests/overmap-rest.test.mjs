import test from 'node:test';import assert from 'node:assert/strict';
import {blank,route} from '../dist/tactics/overmap-model.js';
import {createGroups,orderGroup,splitGroup,validateGroups} from '../dist/tactics/overmap-groups.js';
import {ensureLogistics,advanceLogistics,startMilitiaTraining,validateLogistics} from '../dist/tactics/overmap-logistics.js';
import {startGroupRest,stopGroupRest} from '../dist/tactics/overmap-rest.js';
function setup(){const map=blank(),s=createGroups(map),g=s.groups[0];map.sectors[0].owner='player';ensureLogistics(s,map);g.state.members.forEach(u=>Object.assign(u,{hp:50,maxHp:100,social:{fatigue:90}}));return {map,s,g};}
test('eight hours heal 15 HP and clear all fatigue, capped at maximum, without reviving casualties',()=>{
 const {map,s,g}=setup();g.state.members[1].hp=98;g.state.members[2].hp=0;startGroupRest(s,g.id);advanceLogistics(s,map,480);
 assert.deepEqual(g.state.members.map(u=>u.hp),[65,100,0,65]);assert.ok(g.state.members.every(u=>u.social.fatigue===0));assert.equal(g.rest,undefined);assert.equal(g.state.restRequired,false);
 advanceLogistics(s,map,60);assert.equal(g.state.members[0].hp,65);
});
test('partial recovery, cancellation and save/load are independent of tick size',()=>{
 const {map,s,g}=setup();startGroupRest(s,g.id);advanceLogistics(s,map,160);assert.equal(g.state.members[0].hp,55);assert.ok(Math.abs(g.state.members[0].social.fatigue-60)<1e-8);
 const copy=JSON.parse(JSON.stringify(s));validateGroups(copy,map);validateLogistics(copy,map);advanceLogistics(s,map,320);for(let i=0;i<320;i++)advanceLogistics(copy,map,1);assert.deepEqual(copy,s);
 startGroupRest(s,g.id);advanceLogistics(s,map,80);stopGroupRest(s,g.id);assert.equal(g.state.members[0].hp,67.5);advanceLogistics(s,map,80);assert.equal(g.state.members[0].hp,67.5);
});
test('incoming attack wakes only its sleeping participants and preserves elapsed recovery',()=>{
 const {map,s,g}=setup();for(let i=0;i<5;i++)map.sectors[i].routes=[route('road','west','east')];
 const other=structuredClone(g);other.id='other';other.state.position=10;other.state.members.forEach(u=>u.id+=20);s.groups.push(other);
 const enemy=structuredClone(g);enemy.id='enemy';enemy.state.position=2;enemy.state.members.forEach(u=>{u.stats.agility=50;u.social.fatigue=0;});enemy.waitMinutes=40;
 s.logistics.raiders.push(enemy);startGroupRest(s,g.id);startGroupRest(s,other.id);
 assert.equal(advanceLogistics(s,map,480),160);assert.equal(s.logistics.pending.kind,'raiders');assert.equal(g.rest,undefined);assert.ok(other.rest);assert.equal(g.state.members[0].hp,55);
 assert.throws(()=>startGroupRest(s,g.id));assert.throws(()=>advanceLogistics(s,map,1));
});
test('rest is exclusive with travel, splitting and training; malformed saved rests reject',()=>{
 const {map,s,g}=setup();startGroupRest(s,g.id);assert.throws(()=>startGroupRest(s,g.id));assert.throws(()=>orderGroup(s,map,g.id,1));assert.throws(()=>splitGroup(s,g.id,[0]));assert.throws(()=>startMilitiaTraining(s,map,g.id));
 for(const mutate of [r=>r.startedAt=-1,r=>r.sector=1,r=>r.members[0].fatigue=101,r=>r.members.pop()]){const copy=structuredClone(s);mutate(copy.groups[0].rest);assert.throws(()=>validateGroups(copy,map));}
 stopGroupRest(s,g.id);startMilitiaTraining(s,map,g.id);assert.throws(()=>startGroupRest(s,g.id));
});
