import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createPaintedFireMotion} from '../dist/tactics/painted-fire-motion.js';
import {createEquipmentStow,STOW_MODES} from '../dist/tactics/equipment-stow.js';
import {makeBurnRoute,burnState,FIRE_TIME} from '../dist/tactics/painted-fire-state.js';
import {flameSheetData} from '../dist/tactics/painted-fire-effects.js';
import {BattleFire,fireSegments,firePlayback,visibleFlameShape} from '../dist/tactics/battle-fire.js';
import {BattleCombat} from '../dist/tactics/battle-combat.js';
import {BattleMotion} from '../dist/tactics/battle-motion.js';
import {firePoint,recordBurn} from '../dist/tactics/fire-events.js';
import {blankMap,edgeKey} from '../dist/tactics/core/maps.js';
import {createGame,attackGround,endTurn,movementNeighbors,WEAPONS} from '../dist/tactics/core/engine.js';
import {flameShape} from '../dist/tactics/flame-cone.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url)));
function fixture(){
 const map=blankMap('Live horse fire');map.starts=[{x:10,y:10},{x:9,y:9},{x:9,y:8},{x:8,y:8}];map.guards=[{x:14,y:10,species:'horse',weapon:'rifle'},{x:25,y:25,species:'cow',weapon:'pistol'}];
 const s=createGame(42,map,true,'easy'),a=s.units[0],b=s.units[4];a.weapon='flamethrower';a.slots[0]='flamethrower';a.pack.push({type:'weapon',kind:'flamethrower',rounds:4,condition:100});a.ap=30;a.heading=0;b.hp=b.maxHp=1000;s.phase='player';s.rules.awareness=false;s.detected.add(b.id);for(let y=0;y<30;y++)for(let x=0;x<30;x++)s.visible.add(`${x},${y}`);startEncounterClock(s);return {s,a,b};
}
function renderer(){return {scene:new T.Scene(),loader:{loadAsync:async()=>new T.Texture()},diagnostics:[],motion:new BattleMotion(),traversal:{active:null},flameEffects:{update(){}}};}
function model(weapon='rifle'){
 const worker=createLightHorse(data),equipment=createWeaponModel(weapon),root=new T.Group();worker.equipWeapon(equipment);root.add(worker.root);
 return {worker,equipment,weapon,root,profile:{id:'horse'},paint:{material:new T.MeshStandardMaterial(),setGripForearm(){}},dispose(){equipment.dispose();worker.dispose();this.paint.material.dispose();}};
}
test('core records ignition and accepted panic neighbors without another resource charge',()=>{
 const {s,a,b}=fixture();assert.ok(attackGround(s,a,{x:20,y:10,z:0}));assert.equal(a.ap,24);assert.equal(a.ammo.flamethrower,3);assert.equal(s.fireAnimations[0].kind,'ignite');assert.equal(b.burnedRemains,undefined);assert.deepEqual(s.effect.burns,[b.id]);
 // Box one side, forcing the rule to pick a legal route instead of a visual shortcut.
 for(let y=8;y<=12;y++)s.edges[edgeKey('e',b.x,y)]='wall-brick';
 const before=structuredClone(s),ap=a.ap,ammo=a.ammo.flamethrower;endTurn(s);
 const e=s.fireAnimations.find(e=>e.kind==='panic'&&e.unitId===b.id);assert.ok(e);assert.ok(e.route.length<=4);
 const probe=before.units.find(u=>u.id===b.id);for(const p of e.route.slice(1)){assert.ok(movementNeighbors(before,probe).some(n=>n.x===p.x&&n.y===p.y&&(n.z||0)===(p.z||0)));Object.assign(probe,p);}
 assert.deepEqual(e.route.at(-1),firePoint(b));assert.equal(a.ap,ap);assert.equal(a.ammo.flamethrower,ammo);
});
test('fatal fire persists ash but saves discard playback, and reject living ash',()=>{
 const {s,a,b}=fixture();b.hp=1;attackGround(s,a,{x:20,y:10,z:0});assert.equal(b.hp,0);assert.equal(b.burnedRemains,true);assert.equal(s.fireAnimations[0].kind,'ash');const loot=structuredClone(s.loot);
 const save=captureEncounter(s),restored=restoreEncounter(save);assert.equal(restored.units[4].burnedRemains,true);assert.equal(restored.fireAnimations,undefined);assert.equal(restored.fireAnimationSequence,undefined);assert.deepEqual(restored.loot,loot);
 save.state.units[4].hp=1;assert.throws(()=>restoreEncounter(save),/damaged/);delete save.state.units[4].burnedRemains;assert.doesNotThrow(()=>restoreEncounter(save));
});
test('all supported loadouts can panic with shared stowing, no survivor collapse or rifle substitution',()=>{
 const route=makeBurnRoute([0,1,2,3].map(x=>({x,y:0,z:0})));
 for(const id of Object.keys(STOW_MODES)){
  const m=model(id),motion=createPaintedFireMotion(m.worker),stow=id==='rifle'?null:createEquipmentStow(m.worker,m.profile);
  try{for(let t=.64;t<4.7;t+=.07){stow?.restore();const d=motion.burn(t,route,{terminal:false,unarmed:id!=='rifle'});stow?.apply();assert.equal(m.worker.weapon.id,id);assert.equal(d.state.collapse,0);assert.equal(d.state.dissolve,0);assert.equal(d.drop,null);assert.ok(d.feet['1'].planted||d.feet['-1'].planted);assert.ok(m.worker.parts.every(p=>p.visible));}
   if(stow){stow.restore();assert.equal(stow.state,'carried');}
   for(let t=.64;t<3.2;t+=.08){stow?.restore();motion.burn(t,makeBurnRoute([{x:0,y:0,z:0}]),{terminal:true,unarmed:id!=='rifle'});stow?.apply();}
  }finally{stow?.dispose();motion.dispose();m.dispose();}
 }
});
test('corner paths stop at the turn and never cross the diagonal shortcut',()=>{
 const event={kind:'panic',route:[{x:1,y:1,z:0},{x:2,y:1,z:0},{x:2,y:2,z:0},{x:2,y:3,z:0}]},entry={event,start:0,segments:fireSegments(event)};assert.equal(entry.segments.length,2);
 for(let now=0;now<4000;now+=13){const p=firePlayback(entry,now),q=burnState(p.time,p.route,{terminal:false}).point;assert.ok(Math.abs(q.z-1)<1e-6||Math.abs(q.x-2)<1e-6);}
 const done=firePlayback(entry,4000);assert.equal(done.done,true);assert.deepEqual(done.route.points,[{x:2,y:0,z:3}]);
});
test('elevated paths use rendered heights and refuse a changing surface instead of floating',()=>{
 const p={x:10,y:12,z:1,towerPost:{}};assert.equal(fireSegments({route:[p]})[0].points[0].y,8.48);
 assert.throws(()=>fireSegments({route:[{x:1,y:1,z:0},{x:2,y:1,z:1}]}),/same-height/);
});
test('controller consumes events once, waits for flame impact, restores equipment and leaves rules untouched',async()=>{
 const {s,a,b}=fixture(),r=renderer(),f=new BattleFire(r),c=new BattleCombat(),m=model();await f.ready;
 try{c.observe(s,0);f.observe(s,c,0,false,0);attackGround(s,a,{x:20,y:10,z:0});c.observe(s,10);f.observe(s,c,10,false,0);const before=structuredClone(s),camera=new T.PerspectiveCamera();camera.position.set(20,20,20);
  assert.equal(f.pose(m,b,null,200,s,camera),false);assert.equal(f.entries.get(b.id).start,650);
  for(const now of [700,1000,1400,2200]){c.advance(now);f.observe(s,c,now,false,0);assert.ok(f.pose(m,b,null,now,s,camera));}
  assert.equal(f.busy,false);assert.deepEqual(s,before);assert.equal(f.sessions.size,1);
  b.burningTurns=0;f.observe(s,c,2300,false,0);assert.equal(f.entries.size,0);assert.equal(f.sessions.size,0);assert.ok(m.worker.parts.every(p=>p.visible));assert.equal(m.worker.weapon.id,'rifle');assert.equal(r.diagnostics.length,0);
 }finally{f.dispose();m.dispose();}
});
test('hidden units, casualty interruption, weapon swaps, floor changes and reduced motion clean up',async()=>{
 for(const stop of ['hidden','casualty','weapon','floor','reduced']){const {s,b}=fixture(),r=renderer(),f=new BattleFire(r),c=new BattleCombat(),m=model();await f.ready;
  try{b.burningTurns=3;recordBurn(s,b,'ignite');f.observe(s,c,0,false,0);f.pose(m,b,null,400,s,new T.PerspectiveCamera());
   if(stop==='hidden')s.detected.delete(b.id);if(stop==='casualty'){b.hp=0;b.casualty='dead';}if(stop==='weapon')b.weapon='pistol';
   f.observe(s,c,2000,stop==='reduced',stop==='floor'?1:0);
   assert.equal(f.sessions.size,0,stop);assert.ok(m.worker.parts.every(p=>p.visible),stop);assert.equal(f.busy,false,stop);
  }finally{f.dispose();m.dispose();}
 }
});
test('last panic turn animates to its committed end even when burning expires in that round',async()=>{
 const {s,b}=fixture(),r=renderer(),f=new BattleFire(r),c=new BattleCombat();await f.ready;
 try{b.burningTurns=0;const from=firePoint(b);b.x++;recordBurn(s,b,'panic',[from,firePoint(b)]);f.observe(s,c,0,false,0);assert.equal(f.busy,true);assert.equal(f.display(b).x,from.x);f.observe(s,c,2000,false,0);assert.equal(f.busy,false);assert.equal(f.entries.size,0);assert.equal(f.display(b).x,b.x);}finally{f.dispose();}
});
test('fire material and weights restore on disposal, texture failures do not block combat',async()=>{
 const {s,b}=fixture(),r=renderer(),f=new BattleFire(r),c=new BattleCombat(),m=model();await f.ready;const callback=m.paint.material.onBeforeCompile,foot=m.worker.parts.find(p=>p.name==='exposed hoof 1'),weights=Array.from(foot.geometry.attributes.skinWeight.array);
 b.burningTurns=3;recordBurn(s,b,'ignite');f.observe(s,c,0,false,0);f.pose(m,b,null,400,s,new T.PerspectiveCamera());f.dispose();assert.equal(m.paint.material.onBeforeCompile,callback);assert.deepEqual(Array.from(foot.geometry.attributes.skinWeight.array),weights);m.dispose();
 const bad=renderer();bad.loader.loadAsync=async()=>{throw Error('missing atlas');};const fallback=new BattleFire(bad);await fallback.ready;assert.equal(fallback.busy,false);assert.match(bad.diagnostics[0],/fallback/);fallback.dispose();
});
test('painted world fan uses the model muzzle and clips at fog even when Easy reveals scenery',()=>{
 const {s,a}=fixture();attackGround(s,a,{x:20,y:10,z:0});s.visible=new Set([...s.visible].filter(k=>Number(k.split(',')[0])<14));
 const muzzle=new T.Vector3(10.6,1.3,10),shape=visibleFlameShape(s.effect,s,muzzle),d=flameSheetData(shape,muzzle,0,true);
 assert.ok(shape.rays.every(p=>p.x<13.51));assert.ok(shape.rays.some(p=>p.kind==='fog'));assert.deepEqual(d.position.slice(0,3),muzzle.toArray());
 assert.ok(d.position.every(Number.isFinite));assert.ok(d.position.filter((_,i)=>i%3===0).every(x=>x>=10.5&&x<13.51));
 s.visible.clear();const hidden=visibleFlameShape(s.effect,s,muzzle);assert.equal(flameSheetData(hidden,muzzle,0,true).position.length,0);
});
test('missing painted assets keep a fatal burn body visible and lootable',async()=>{
 const {s,b}=fixture(),r=renderer();r.loader.loadAsync=async()=>{throw Error('offline');};const f=new BattleFire(r),c=new BattleCombat(),m=model();await f.ready;
 try{b.hp=0;b.burnedRemains=true;f.observe(s,c,5000,false,0);assert.ok(f.pose(m,b,null,5000,s,new T.PerspectiveCamera()));assert.ok(m.worker.parts.every(p=>p.visible));assert.equal(f.busy,false);}finally{f.dispose();m.dispose();}
});
test('the three deployed painted-fire atlases retain their authored size and alpha channels',()=>{
 for(const name of ['flame-atlas-v1','smoke-atlas-v1','ash-paint-v1']){const p=fs.readFileSync(new URL('../dist/assets/effects/painted-fire/'+name+'.png',import.meta.url));assert.equal(p.subarray(1,4).toString(),'PNG');assert.equal(p.readUInt32BE(16),1254);assert.equal(p.readUInt32BE(20),1254);assert.equal(p[25],6);}
});
test('painted flame endpoints retain the shooter support height on a cliff shelf',()=>{
 const {s,a}=fixture();a.cliffSupport={level:1,height:.4};const event={shooter:a.id,flame:flameShape(s,a,{x:20,y:10,z:0},WEAPONS.flamethrower)};
 // Rendered shelf height is 2.52, not the floor inferred from raw ray height.
 const muzzle=new T.Vector3(10.6,3.7,10);for(let y=0;y<30;y++)for(let x=0;x<30;x++)s.visible.add(`${x},${y},1`);
 const shape=visibleFlameShape(event,s,muzzle),expected=2.52+(event.flame.origin.h-3.4)*1.65/1.8;
 assert.ok(shape.rays.every(p=>Math.abs(p.h-expected)<.000001));
});
