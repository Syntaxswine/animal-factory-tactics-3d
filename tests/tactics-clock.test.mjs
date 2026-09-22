import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,currentMap,clockLabel,advanceTime,tickWorld,spendTime,travel,downtimeReason} from '../dist/tactics/world.js';
import {blankMap} from '../dist/tactics/maps.js';
import {refresh,guards,allocateSkill} from '../dist/tactics/engine.js';

test('shared clock advances from real elapsed time, pauses without catch-up, and rolls over days',()=>{
 const w=createWorld(blankMap());assert.equal(clockLabel(w),'Day 1 · 08:00');
 tickWorld(w,4500);assert.equal(w.clock.minutes,481.5);assert.equal(clockLabel(w),'Day 1 · 08:01');
 tickWorld(w,60000,{paused:true});assert.equal(w.clock.minutes,481.5);
 tickWorld(w,1500);assert.equal(w.clock.minutes,482);
 advanceTime(w,958);assert.equal(clockLabel(w),'Day 2 · 00:00');
 const before=structuredClone(w.clock);for(const n of [-1,NaN,Infinity])advanceTime(w,n);assert.deepEqual(w.clock,before);
 currentMap(w).phase='lost';tickWorld(w,10000);assert.deepEqual(w.clock,before);
});
test('production is independent of frame size and begins only after liberation',()=>{
 const a=createWorld(blankMap()),b=createWorld(blankMap());advanceTime(a,60);for(let i=0;i<10800;i++)tickWorld(b,1000/60);
 assert.equal(a.money,100);assert.equal(b.money,100);
 const w=createWorld();advanceTime(w,45);assert.equal(w.money,0);guards(currentMap(w)).forEach(g=>g.hp=0);refresh(currentMap(w));advanceTime(w,15);assert.equal(w.money,25);
});
test('rest advances the same clock, heals living troops to their cap, refills AP and produces income',()=>{
 const w=createWorld(blankMap()),s=currentMap(w),u=s.units[0];u.hp=10;u.ap=0;s.units[1].hp=0;s.units[1].casualty='dead';
 const result=spendTime(w,'rest',4);assert.ok(result.ok);assert.equal(clockLabel(w),'Day 1 · 12:00');assert.equal(w.money,400);assert.equal(u.hp,19);assert.equal(u.ap,u.maxAp);assert.equal(s.units[1].hp,0);
 spendTime(w,'rest',48);assert.equal(u.hp,u.maxHp);assert.equal(clockLabel(w),'Day 3 · 12:00');
});
test('training grants existing progression rewards without healing or training captured troops',()=>{
 const w=createWorld(blankMap()),s=currentMap(w),u=s.units[0];u.hp=50;u.ap=1;s.units[1].hp=0;s.units[1].casualty='captured';
 assert.ok(spendTime(w,'train',4).ok);assert.equal(u.xp,100);assert.equal(u.level,2);assert.equal(u.skillPoints,3);assert.equal(u.hp,50);assert.equal(u.ap,1);assert.equal(s.units[1].xp,0);assert.equal(w.money,400);
 assert.ok(allocateSkill(s,u,'shooting'));assert.equal(u.skills.shooting,1);
 for(const troop of s.units)troop.level=10;const before=w.clock.minutes;assert.equal(spendTime(w,'train',4).ok,false);assert.equal(w.clock.minutes,before);
});
test('unsafe, queued and invalid downtime takes no time or money and grants no rewards',()=>{
 const w=createWorld(),s=currentMap(w);const before=w.clock.minutes;assert.ok(downtimeReason(w));assert.equal(spendTime(w,'rest',8).ok,false);assert.equal(w.clock.minutes,before);
 guards(s).forEach(g=>g.hp=0);refresh(s);s.queue=[{}];assert.equal(spendTime(w,'train',4).ok,false);s.queue=[];
 for(const [action,hours]of [['train',-1],['rest',100],['unknown',4],['rest',NaN]])assert.equal(spendTime(w,action,hours).ok,false);
 assert.equal(w.clock.minutes,before);assert.equal(w.money,0);assert.equal(s.units[0].xp,0);
});
test('travel advances the campaign clock exactly one hour and keeps training results',()=>{
 const w=createWorld(blankMap()),s=currentMap(w);spendTime(w,'train',4);s.units.filter(u=>u.team==='squad').forEach((u,i)=>{u.x=3+i%2;u.y=4+Math.floor(i/2);});
 assert.ok(travel(w,'yard').ok);assert.equal(clockLabel(w),'Day 1 · 13:00');assert.equal(currentMap(w).units[0].level,2);assert.equal(w.money,500);
 assert.equal(travel(w,'yard').ok,false);assert.equal(clockLabel(w),'Day 1 · 13:00');
 const fresh=createWorld(blankMap());assert.equal(clockLabel(fresh),'Day 1 · 08:00');assert.equal(fresh.money,0);
});
