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
import {descentAnimationFrame} from '../dist/tactics/ledge-descent-journey.js';
function model(species,weapon){const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===species),worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),root=new T.Group();root.add(worker.root);let equipment;if(!profile.unarmed){equipment=createWeaponModel(weapon);worker.equipWeapon(equipment);}worker.pose('carry');return {worker,root,profile,dispose(){equipment?.dispose();worker.dispose();}};}

function fixture(kind='roof',species='horse',weapon='rifle',dx=1,dy=0){
 const m=blankMap();m.starts[0]={x:8,y:8,z:0};m.climbs=[{x:8,y:8,z:0,dx,dy,...(kind==='cliff'?{kind}: {})}];
 for(const step of [1,2])for(const side of [-1,0,1]){const x=8+dx*step-dy*side,y=8+dy*step+dx*side;setTerrain(m,x,y,1,'floor');if(kind==='cliff')m.props.push({kind:'cliff-ledge',x,y,z:0});}
 const s=createGame(1,m,true,'easy'),u=s.units[0];Object.assign(u,{species,weapon,ap:18});s.phase='player';assert.ok(move(s,u,8+dx,8+dy,1));assert.ok(stepMovement(s));u.ap=18;s.phase='player';
 assert.ok(move(s,u,8,8,0));assert.ok(stepMovement(s));const key=kind==='roof'?'roofTraversals':'cliffTraversals',event=s[key].at(-1);assert.equal(event.direction,'down');s[key]=[event];return {s,u,event};
}
for(const kind of ['roof','cliff'])for(const profile of ANIMAL_MOTION_CATALOG)test(kind+' descent: '+profile.id,()=>{
 const weapon=profile.unarmed?'hands':'rifle',{s,u,event}=fixture(kind,profile.id,weapon),m=model(profile.id,weapon),v=new BattleTraversal(),before=structuredClone(s);
 try{v.observe(s,0);assert.ok(v.busy);v.pose(m,u,0);assert.deepEqual(v.active.position,descentAnimationFrame(s,event,u).fromWorld);for(const t of [500,1500,2500,3500]){v.pose(m,u,t);assert.ok(v.active.position.every(Number.isFinite));}v.pose(m,u,4630);assert.ok(new T.Vector3(...v.active.position).distanceTo(new T.Vector3(...toWorld(u)))<1e-8);v.observe(s,4631);assert.equal(v.busy,false);v.observe(s,5000);assert.equal(v.busy,false);assert.deepEqual(s,before);}finally{v.finish();m.dispose();}
});
test('cardinal headings, unsupported equipment and obstructed landing',()=>{for(const kind of ['roof','cliff'])for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const {s,u,event}=fixture(kind,'horse','rifle',dx,dy);assert.ok(descentAnimationFrame(s,event,u));assert.equal(descentAnimationFrame(s,event,{...u,weapon:'pistol'}),null);Object.assign(s.units[1],event.to);assert.equal(descentAnimationFrame(s,event,u),null);}});
test('interruptions restore equipment and retain committed descent and AP',()=>{for(const kind of ['roof','cliff'])for(const cancel of [(s,u,v)=>{u.hp=0;v.observe(s,2000);},(s,u,v)=>{u.weapon='pistol';v.observe(s,2000);},(s,u,v)=>v.observe(s,2000,true),(s,u,v)=>v.clear()]){const {s,u}=fixture(kind),m=model('horse','rifle'),v=new BattleTraversal(),weights=m.worker.parts.map(p=>p.geometry.attributes.skinWeight);try{v.observe(s,0);v.pose(m,u,0);v.pose(m,u,2000);cancel(s,u,v);assert.equal(v.busy,false);assert.deepEqual([u.x,u.y,u.z,u.ap],[8,8,0,kind==='roof'?12:10]);assert.ok(m.worker.weapon.root.visible);m.worker.parts.forEach((p,i)=>assert.equal(p.geometry.attributes.skinWeight,weights[i]));}finally{v.finish();m.dispose();}}});
