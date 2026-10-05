import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,attack,endTurn,stepEnemy,previewAttack} from '../dist/tactics/core/engine.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {BattleFire} from '../dist/tactics/battle-fire.js';
import {BattleTankEffects,visibleFireLayers,fireFloor} from '../dist/tactics/battle-tank-effects.js';
import {BattleCombat} from '../dist/tactics/battle-combat.js';
import {BattleMotion} from '../dist/tactics/battle-motion.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createTankBlastEffects,fireCellMask} from '../dist/tactics/tank-blast-effects.js';
import {toWorld} from '../dist/tactics/hybrid-world.js';
import {towerPost} from '../dist/tactics/tower-geometry.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url)));
function fixture(water=false){
 const map=blankMap('Live tank rupture');map.starts=[{x:14,y:20},{x:21,y:20},{x:25,y:20},{x:26,y:20}];map.guards=[{x:20,y:20,species:'horse',weapon:'flamethrower'},{x:20,y:24,species:'hen',weapon:'hands'}];
 if(water)for(let x=21;x<=25;x++)for(let y=21;y<=24;y++)setTerrain(map,x,y,0,'water');
 const s=createGame(0,map,true,'easy'),a=s.units[0],b=s.units[4];a.weapon='rifle';a.accuracy=1000;a.ap=30;a.heading=0;b.hp=b.maxHp=500;s.phase='player';s.rules.awareness=false;startEncounterClock(s);
 for(let y=0;y<30;y++)for(let x=0;x<30;x++){s.visible.add(`${x},${y}`);s.seen.add(`${x},${y}`);}s.detected.add(4);s.detected.add(5);
 return {s,a,b,fire(){assert.ok(attack(s,a,b,false,false,'weapon'));assert.ok(b.tanksExploded);}};
}
async function controllers(){
 const r={scene:new T.Scene(),loader:{loadAsync:async()=>new T.Texture()},diagnostics:[],motion:new BattleMotion(),traversal:{active:null},flameEffects:{update(){}}};
 r.fire=new BattleFire(r);r.tankEffects=new BattleTankEffects(r);await Promise.all([r.fire.ready,r.tankEffects.ready]);
 const worker=createLightHorse(data),equipment=createWeaponModel('flamethrower'),root=new T.Group();worker.equipWeapon(equipment);root.add(worker.root);
 const m={worker,equipment,weapon:'flamethrower',root,profile:{id:'horse'},paint:{setGripForearm(){}}},c=new BattleCombat(),camera=new T.PerspectiveCamera();camera.position.set(24,15,28);
 return {r,m,c,camera,frame(s,now,reduced=false,level=0){c.observe(s,now,reduced);r.tankEffects.observe(s,c,now,reduced,level);r.fire.observe(s,c,now,reduced,level);},dispose(){r.fire.dispose();r.tankEffects.dispose();m.equipment.dispose();worker.dispose();}};
}
test('real tank attack records exact wearer, nearby deaths, survivors, removal and water exclusions',()=>{
 for(const water of [false,true]){const {s,a,b,fire}=fixture(water),ammo=a.ammo.rifle,cost=previewAttack(s,a,b,false,'weapon').cost;fire();
  const receipt=s.fireAnimations.find(e=>e.kind==='tank'),blast=s.effect.explosions[0];
  assert.equal(receipt.unitId,b.id);assert.equal(receipt.weapon,'flamethrower');assert.equal(blast.fireSequence,receipt.sequence);assert.equal(blast.kind,'tank');
  assert.equal(b.hp,0);assert.ok(b.burnedRemains);assert.equal(b.weapon,'hands');assert.equal(b.ammo.flamethrower,0);assert.ok(!b.pack.some(p=>p.kind==='flamethrower'));assert.ok(!b.slots.includes('flamethrower'));
  assert.equal(s.units[1].hp,0);assert.equal(s.units[1].casualty,'dead');assert.ok(s.units[1].burnedRemains);assert.ok(s.units[2].hp>0);assert.equal(s.units[2].burningTurns,3);assert.equal(s.units[2].burnedRemains,undefined);
  assert.equal(a.ap,30-cost);assert.equal(a.ammo.rifle,ammo-1);assert.equal(s.fires.length,water?66:81);assert.deepEqual(receipt.fires,s.fires);
  assert.ok(s.fires.every(p=>s.map[p.y][p.x]!=='water'));assert.ok(!s.loot.some(p=>p.items?.some(i=>i.kind==='flamethrower')));
 }
});
test('save during rupture preserves deaths, ash, loot and turn-based fire without replaying receipts',()=>{
 const {s,fire}=fixture();fire();const saved=captureEncounter(s),loaded=restoreEncounter(saved);
 assert.deepEqual(loaded.fires,s.fires);assert.deepEqual(loaded.loot,s.loot);assert.equal(loaded.units[4].weapon,'hands');assert.ok(loaded.units[4].burnedRemains);assert.equal(loaded.fireAnimations,undefined);assert.equal(loaded.effect,null);
 endTurn(s);for(let n=0;n<30&&s.phase==='enemy';n++)stepEnemy(s);assert.ok(s.fires.length);assert.ok(s.fires.every(p=>p.turns===2),'wall-clock playback must not replace the three-turn duration');
});
test('real elevated detonations spare mercs underneath and never put tower fire on the ground',()=>{
 for(const level of ['roof','tower']){
  const {s,a,b,fire}=fixture(),below=s.units.slice(1,4).map(u=>u.hp);
  if(level==='roof'){for(let y=10;y<30;y++)for(let x=10;x<30;x++)setTerrain(s,x,y,1,'floor');a.z=b.z=1;}
  else{const tower={x:18,y:18,z:0,kind:'wooden-spotlight-tower'};s.props.push(tower);a.x=19;a.y=19;b.x=21;b.y=19;for(const u of [a,b])u.towerPost=towerPost(tower,u);}
  fire();assert.deepEqual(s.units.slice(1,4).map(u=>u.hp),below);assert.ok(s.units.slice(1,4).every(u=>!u.burningTurns&&!u.burnedRemains));
  assert.equal(s.fires.length,level==='tower'?0:81);assert.ok(s.fires.every(p=>p.z===1));
  assert.equal(s.fireAnimations.find(e=>e.kind==='tank').route[0].towerPost?.kind,level==='tower'?'wooden-spotlight-tower':undefined);
 }
});
test('worn pack survives until actual rifle impact, then ruptures once at the measured world origin',async()=>{
 const {s,b,fire}=fixture(),q=await controllers();try{
  q.frame(s,0);fire();q.frame(s,10);const before=structuredClone(s),receipt=s.fireAnimations.find(e=>e.kind==='tank');
  assert.equal(q.c.active.rifle,true);assert.equal(q.r.fire.entries.get(4).start,390);
  assert.ok(q.r.fire.pose(q.m,q.c.display(b),null,100,s,q.camera));q.r.tankEffects.draw(q.camera);assert.equal(q.r.tankEffects.ground.size,0,'new fire appeared before rupture');
  assert.equal(q.m.worker.weapon.root.visible,true);const origin=q.r.fire.sessions.get(4).blast.origin.clone();assert.ok(origin.distanceTo(new T.Vector3(20,1,20))<2);
  for(const now of [390,450,1000,1600,2200,5800]){q.frame(s,now);q.r.fire.pose(q.m,b,null,now,s,q.camera);q.r.tankEffects.draw(q.camera);await Promise.resolve();}
  assert.equal(q.m.worker.weapon.root.visible,false);assert.equal(q.m.worker.weapon.mount.visible,false);assert.equal(q.r.fire.sessions.get(4).motion.diagnostics().drop,null);
  assert.equal(q.r.fire.sessions.get(4).effects.ash.visible,true);assert.deepEqual(q.r.fire.sessions.get(4).effects.ash.position.toArray(),[20,0,20]);assert.equal(q.r.tankEffects.bursts.size,0);
  assert.equal(q.r.tankEffects.ground.get(0).effects.ground.length,81);assert.equal(q.r.tankEffects.busy,false);assert.equal(q.r.fire.busy,false);assert.deepEqual(s,before);assert.deepEqual(q.r.diagnostics,[]);
  q.frame(s,5900);assert.equal(q.r.tankEffects.bursts.size,0,'same event replayed');assert.equal(receipt.weapon,'flamethrower');
 }finally{q.dispose();}
});
test('fog, floor switch, reduced motion and restart retire tank effects without changing casualties',async()=>{
 for(const stop of ['fog','floor','reduced','restart']){const {s,b,fire}=fixture(),q=await controllers();try{
  q.frame(s,0);fire();q.frame(s,10);q.r.fire.pose(q.m,b,null,400,s,q.camera);q.r.tankEffects.draw(q.camera);await Promise.resolve();
  if(stop==='fog'){s.visible.clear();s.detected.clear();}const state=stop==='restart'?fixture().s:s;
  q.frame(state,600,stop==='reduced',stop==='floor'?1:0);q.r.tankEffects.draw(q.camera);await Promise.resolve();
  assert.equal(q.r.tankEffects.bursts.size,0,stop);assert.equal(q.r.tankEffects.busy,false);assert.equal(b.hp,0);assert.equal(b.ammo.flamethrower,0);
  if(stop!=='reduced')assert.equal(q.r.tankEffects.ground.size,0,stop);
 }finally{q.dispose();}}
});
test('persistent ground flames restore directly from saves, follow visible dry cells and expire',async()=>{
 const {s,fire}=fixture(true);fire();const loaded=restoreEncounter(captureEncounter(s)),q=await controllers();try{
  loaded.visible=new Set(['20,20','21,21','20,21']);q.frame(loaded,9000);q.r.tankEffects.draw(q.camera);await Promise.resolve();q.r.tankEffects.draw(q.camera);
  assert.equal(q.r.tankEffects.bursts.size,0);const fx=q.r.tankEffects.ground.get(0).effects;assert.deepEqual(fx.ground.map(m=>[m.userData.cell.x,m.userData.cell.z]),[[20,20],[20,21]]);
  loaded.fires=[];q.frame(loaded,9100);q.r.tankEffects.draw(q.camera);assert.equal(q.r.tankEffects.ground.size,0);assert.equal(fx.group.parent,null);
 }finally{q.dispose();}
});
test('queued tank shots wait for their own discharge rather than an earlier burn on the same wearer',async()=>{
 const {s,fire}=fixture(),q=await controllers();try{q.frame(s,0);fire();const event=s.effect.sequence[0];s.effect.sequence=[{...event,explosions:[],burns:[],downed:[]},event];q.frame(s,10);
  assert.equal(q.r.fire.entries.get(4).waiting,true);assert.equal([...q.r.tankEffects.bursts.values()][0].waiting,true);q.frame(s,1200);assert.equal(q.r.fire.entries.get(4).start,1580);
 }finally{q.dispose();}
});
test('upper floors, cliff shelves and tower pack origins remain at their actual support height',async()=>{
 for(const extra of [{z:1},{z:1,cliffSupport:{level:0,height:2}},{z:0,towerPost:{dx:0,dy:0,kind:'wooden-spotlight-tower'}}]){
  const {s,b,fire}=fixture(),q=await controllers();try{q.frame(s,0);fire();Object.assign(b,extra);const e=s.fireAnimations.find(e=>e.kind==='tank');Object.assign(e.route[0],extra);s.effect=null;s.visible.add(`20,20,1`);
   q.frame(s,10,false,b.z);q.r.fire.pose(q.m,b,null,20,s,q.camera);const blast=q.r.fire.sessions.get(4).blast,base=toWorld(b)[1];assert.ok(blast.origin.y>base+.5&&blast.origin.y<base+1.6);
   q.r.tankEffects.draw(q.camera);await Promise.resolve();q.r.tankEffects.draw(q.camera);assert.ok([...q.r.tankEffects.bursts.values()][0].effects.core.position.y>base);
  }finally{q.dispose();}
 }
 const s={props:[{x:5,y:5,z:0,kind:'cliff-ledge',cliffMask:15}],fires:[{x:5,y:5,z:1,turns:3}],visible:new Set(['5,5,1'])};assert.equal(fireFloor(s,s.fires[0]),2);assert.equal(visibleFireLayers(s,1).get(2).length,1);
});
test('empty masks, fog clipping, elevated fragment contact and shared texture ownership',async()=>{
 const empty=fireCellMask([]);assert.equal(empty.texture.image.width,1);assert.equal(empty.texture.image.data[3],0);empty.texture.dispose();
 const textures=[new T.Texture(),new T.Texture(),new T.Texture()],scene=new T.Scene(),camera=new T.PerspectiveCamera();let freed=0;textures.forEach(t=>t.addEventListener('dispose',()=>freed++));
 const fx=await createTankBlastEffects(scene,null,new T.Vector3(20,3.2,20),{world:true,floor:2.12,textures});try{
  fx.setVisibility([{x:20,z:20}]);const mask=fx.core.material.uniforms.tankVisibility.value;assert.equal(mask.image.data[3],255);assert.match(fx.core.material.fragmentShader,/tankClipWorld/);
  for(const age of [.1,.3,.8,1.4]){fx.update(age,{camera,contract:{fires:[],origin:{x:0,y:0}}});for(const part of fx.fragments){part.updateMatrixWorld(true);const positions=part.geometry.attributes.position;for(let i=0;i<positions.count;i++)assert.ok(new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(part.matrixWorld).y>=2.12-.001);}}
  assert.equal(fx.ground.length,0);fx.setVisibility([]);assert.equal(fx.core.material.uniforms.tankVisibility.value.image.data[3],0);
 }finally{fx.dispose();}assert.equal(freed,0);textures.forEach(t=>t.dispose());assert.equal(scene.children.length,0);
});
test('missing tank textures and pending loads can be disposed without blocking or leaking',async()=>{
 const r={scene:new T.Scene(),diagnostics:[],loader:{loadAsync:async()=>{throw Error('offline');}}},fx=new BattleTankEffects(r);await fx.ready;assert.match(r.diagnostics[0],/unavailable/);assert.equal(fx.busy,false);fx.dispose();
 let resolve;const tex=new T.Texture();let freed=0;tex.addEventListener('dispose',()=>freed++);const late=new BattleTankEffects({...r,loader:{loadAsync:()=>new Promise(r=>{resolve=r;})}});late.dispose();resolve(tex);await Promise.resolve();await Promise.resolve();resolve(tex);await Promise.resolve();await Promise.resolve();resolve(tex);await late.ready;assert.equal(freed,3);
});
