import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {BattleTraversal} from '../dist/tactics/battle-traversal.js';
import {roofAnimationFrame} from '../dist/tactics/roof-journey.js';
import {blankMap,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,move,stepMovement} from '../dist/tactics/core/engine.js';
import {toWorld} from '../dist/tactics/hybrid-world.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
function fixture(dx=1,dy=0,species='horse',weapon='rifle'){
 const m=blankMap();m.starts[0]={x:8,y:8,z:0};m.climbs=[{x:8,y:8,z:0,dx,dy}];for(const step of [1,2])for(const side of [-1,0,1])setTerrain(m,8+dx*step-dy*side,8+dy*step+dx*side,1,'floor');
 const s=createGame(1,m,true,'easy'),u=s.units[0];Object.assign(u,{species,weapon,ap:12});s.phase='player';assert.ok(move(s,u,8+dx,8+dy,1));assert.ok(stepMovement(s));return {s,u,event:s.roofTraversals[0]};
}
function model(species,weapon){const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===species),worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),root=new T.Group();root.add(worker.root);let equipment;if(!profile.unarmed){equipment=createWeaponModel(weapon);worker.equipWeapon(equipment);}worker.pose('carry');return {worker,root,profile,dispose(){equipment?.dispose();worker.dispose();}};}
for(const profile of ANIMAL_MOTION_CATALOG)test(profile.id+' live roof ascent consumes event once and restores the rig at exact landing',()=>{
 const weapon=profile.unarmed?'hands':'rifle',{s,u,event}=fixture(1,0,profile.id,weapon),m=model(profile.id,weapon),before=structuredClone(s),attrs=m.worker.parts.map(p=>p.geometry.attributes.position.array.slice()),v=new BattleTraversal(()=>{throw Error('Roof must not prepare ladders');});
 try{v.observe(s,0);assert.ok(v.busy);v.pose(m,u,0);assert.deepEqual(v.active.position,toWorld(event.from));v.pose(m,u,3500);assert.ok(v.active.position.every(Number.isFinite));v.pose(m,u,7100);assert.ok(new T.Vector3(...v.active.position).distanceTo(new T.Vector3(...toWorld(event.to)))<1e-8);v.observe(s,7101);assert.equal(v.busy,false);v.observe(s,8000);assert.equal(v.busy,false);assert.deepEqual(s,before);m.worker.parts.forEach((p,i)=>assert.deepEqual(p.geometry.attributes.position.array,attrs[i]));}finally{v.finish();m.dispose();}
});
test('roof frame keeps the lower floor origin and separate lip height in all directions',()=>{for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const {s,u,event}=fixture(dx,dy),f=roofAnimationFrame(s,event,u);assert.ok(f);assert.deepEqual(f.origin,[8+dx*.5,0,8+dy*.5]);assert.equal(f.ledgeHeight,2.12);}});
test('roof ascent uses physical cliff foothold on an upper storey',()=>{
 const {s,u}=fixture();s.props.push({kind:'cliff-ledge',x:8,y:8,z:0,cliffMask:15});setTerrain(s,8,8,1,'floor');setTerrain(s,9,8,2,'floor');setTerrain(s,10,8,2,'floor');
 const event={kind:'roof',direction:'up',from:{x:8,y:8,z:1},to:{x:9,y:8,z:2}},frame=roofAnimationFrame(s,event,u);assert.ok(frame);assert.equal(frame.origin[1],2);assert.equal(frame.ledgeHeight,2.24);assert.deepEqual(frame.fromWorld,[8,2,8]);assert.deepEqual(frame.toWorld,[9,4.24,8]);
});
test('casualty, reduced motion, weapon change and cancellation preserve committed position/AP and restore equipment',()=>{for(const cancel of [(s,u,v)=>{u.hp=0;v.observe(s,1000);},(s,u,v)=>{u.weapon='pistol';v.observe(s,1000);},(s,u,v)=>v.observe(s,1000,true),(s,u,v)=>v.clear()]){const {s,u}=fixture(),m=model('horse','rifle'),v=new BattleTraversal(),attrs=m.worker.parts.map(p=>p.geometry.attributes.skinWeight);try{v.observe(s,0);v.pose(m,u,0);v.pose(m,u,3000);cancel(s,u,v);assert.equal(v.busy,false);assert.deepEqual([u.x,u.y,u.z,u.ap],[9,8,1,6]);assert.ok(m.worker.weapon.root.visible);m.worker.parts.forEach((p,i)=>assert.equal(p.geometry.attributes.skinWeight,attrs[i]));}finally{v.finish();m.dispose();}}});
test('unsupported loads, descent, occupied landing and parapets do not start mantle',()=>{const {s,u,event}=fixture();assert.equal(roofAnimationFrame(s,{...event,direction:'down'},u),null);assert.equal(roofAnimationFrame(s,event,{...u,weapon:'pistol'}),null);const occupied=structuredClone(s);Object.assign(occupied.units[1],event.to);assert.equal(roofAnimationFrame(occupied,event,u),null);const parapet=structuredClone(s);parapet.props.push({...event.to,kind:'roof-climbable-flat-parapet'});assert.equal(roofAnimationFrame(parapet,event,u),null);});
test('roof events are transient across save/load and failed movement never records one',()=>{const {s,u}=fixture();startEncounterClock(s);const loaded=restoreEncounter(captureEncounter(s));assert.equal(loaded.roofTraversals,undefined);assert.equal(loaded.roofTraversalSequence,undefined);assert.equal(loaded.units[0].z,1);assert.equal(u.ap,6);s.phase='player';u.ap=0;assert.equal(move(s,u,8,8,0),false);assert.equal(s.roofTraversals.length,1);});
