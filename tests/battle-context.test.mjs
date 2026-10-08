import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,groundTarget,previewAttack,attackGround,move,stepMovement,WEAPONS} from '../dist/tactics/core/engine.js';
import {bulletTrajectory} from '../dist/tactics/core/projectiles.js';
import {inspectBattleTile} from '../dist/tactics/battle-context-menu.js';
import {PickupOrder,pickupRoute} from '../dist/tactics/pickup-order.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';

function fixture(){const m=blankMap('Context actions');m.starts=[{x:10,y:10,weapon:'rifle'},{x:4,y:4},{x:4,y:6},{x:4,y:8}];m.guards=[];const s=createGame(92,m,true,'easy',{statSystem:true}),u=s.units[0];s.phase='player';s.engaged=true;u.ap=18;startEncounterClock(s);const pile={x:14,y:10,z:0,items:[{type:'ammo',kind:'rifle',count:3}]};s.loot=[pile];s.visible.add('14,10');return {s,u,pile};}
test('tile headings use one-based coordinates and do not reveal unknown props or unseen loot',()=>{
 const {s,pile}=fixture();s.props.push({kind:'crate-wood',x:14,y:10});let p=inspectBattleTile(s,pile);assert.match(p.location,/Column 15.*Row 11.*Level 1/);assert.deepEqual(p.loot,[pile]);assert.deepEqual(p.objects,['Crate wood']);
 s.visible.delete('14,10');assert.equal(inspectBattleTile(s,pile).loot.length,0);s.seen.delete('14,10');p=inspectBattleTile(s,pile);assert.equal(p.title,'Unexplored tile');assert.deepEqual(p.objects,[]);assert.equal(inspectBattleTile(s,{x:-1,y:0}),null);
});
test('pickup approaches a reachable adjacent tile using ordinary movement charges and never takes items itself',()=>{
 const {s,u,pile}=fixture(),order=new PickupOrder(),before=structuredClone(pile.items),ap=u.ap,route=order.start(s,u,pile);assert.ok(route.ok);assert.equal(u.ap,ap);let result,n=0;
 while(order.pending&&n++<10){s.phase='player';stepMovement(s);result=order.update(s);}assert.ok(result?.ready);assert.equal(result.pile,pile);assert.equal(u.ap,ap-route.cost);assert.deepEqual(pile.items,before);assert.equal(s.queue.length,0);assert.ok(Math.abs(u.x-pile.x)+Math.abs(u.y-pile.y)<=1);
});
test('nearby pickup opens without movement but waits for presentation to settle',()=>{
 const {s,u,pile}=fixture(),order=new PickupOrder();u.x=13;assert.equal(order.start(s,u,pile).cost,0);assert.equal(order.update(s,{busy:true}),null);assert.ok(order.update(s).ready);assert.equal(u.ap,18);
});
test('pickup respects walls, unavailable tower height and unseen piles',()=>{
 const {s,u,pile}=fixture();for(const key of ['e:13:10','e:14:10','s:14:9','s:14:10'])s.edges[key]='wall-concrete';s.props.push({kind:'crate-wood',x:14,y:10});assert.equal(pickupRoute(s,u,pile).ok,false);
 s.props=[];s.edges={};pile.towerPost={};assert.equal(pickupRoute(s,u,pile).ok,false);delete pile.towerPost;s.visible.clear();assert.equal(pickupRoute(s,u,pile).ok,false);
});
test('cancellation, casualties, lost visibility and replacement orders do not open stale inventories',()=>{
 for(const stop of ['cancel','dead','hidden','new-order','select']){const {s,u,pile}=fixture(),order=new PickupOrder();assert.ok(order.start(s,u,pile).ok);
  if(stop==='cancel')order.cancel();if(stop==='dead')u.hp=0;if(stop==='hidden')s.visible.clear();if(stop==='new-order')assert.ok(move(s,u,9,10));
  const result=order.update(s,{selectedId:stop==='select'?1:u.id});assert.ok(!result?.ready);assert.equal(order.pending,null);assert.equal(s.queue.length>0,stop==='new-order');
 }
});
test('running out of AP stops pickup without free movement or an inventory popup',()=>{
 const {s,u,pile}=fixture(),order=new PickupOrder();u.ap=2;assert.ok(order.start(s,u,pile).ok);stepMovement(s);s.phase='player';stepMovement(s);const p=order.update(s);assert.ok(p.stopped);assert.equal(u.ap,0);assert.equal(u.x,11);
});
test('terrain fire has three aim costs, spends ordinary resources once and round-trips its outcome',()=>{
 const {s,u}=fixture(),p=groundTarget({x:17,y:10,z:0});for(const [aim,mult]of [['hip',1],['aimed',1.5],['full',2]]){const v=previewAttack(s,u,p,false,'torso',null,aim);assert.ok(v.ok,v.reason);assert.equal(v.cost,Math.ceil(WEAPONS.rifle.cost*mult));}
 const before=captureEncounter(s),ammo=u.ammo.rifle,ap=u.ap;assert.ok(attackGround(s,u,p));assert.equal(u.ammo.rifle,ammo-1);assert.equal(u.ap,ap-WEAPONS.rifle.cost);assert.ok(s.effect.trajectories.length);
 const restored=restoreEncounter(before);restored.phase='player';assert.ok(attackGround(restored,restored.units[0],p));assert.deepEqual(restored.effect.trajectories,s.effect.trajectories);
});
test('a ground shot strikes real people or walls instead of treating the tile as a fictional body',()=>{
 const {s,u}=fixture(),target=groundTarget({x:18,y:10,z:0}),other={...s.units[1],id:20,x:15,y:10,hp:100,team:'guard'};s.units.push(other);
 let hit=bulletTrajectory(s,u,target,{accurate:true,zone:'torso',reach:20},()=>0);assert.equal(hit.unitId,20);assert.equal(hit.zone,'legs');
 s.edges['e:12:10']='wall-concrete';hit=bulletTrajectory(s,u,target,{accurate:true,zone:'torso',reach:20},()=>0);assert.equal(hit.kind,'wall');assert.equal(hit.unitId,undefined);assert.ok(previewAttack(s,u,target).ok,'shooting at a blocked tile remains legal');
});
test('ground previews cannot expose hidden people or bypass ammo, AP, jam and discovery checks',()=>{
 const {s,u}=fixture(),p=groundTarget({x:18,y:10,z:0}),before=previewAttack(s,u,p);s.units.push({...s.units[1],id:20,x:14,y:10,team:'guard'});assert.deepEqual(previewAttack(s,u,p),before);
 s.detected.add(20);assert.equal(previewAttack(s,u,p).obstruction.kind,'unit');u.ap=0;assert.match(previewAttack(s,u,p).reason,/AP/);u.ap=18;u.ammo.rifle=0;assert.match(previewAttack(s,u,p).reason,/Reload/);u.ammo.rifle=1;u.pack.find(i=>i.kind==='rifle').jammed=true;assert.match(previewAttack(s,u,p).reason,/jam/i);s.seen.delete('18,10');assert.match(previewAttack(s,u,p).reason,/discovered/);
});
