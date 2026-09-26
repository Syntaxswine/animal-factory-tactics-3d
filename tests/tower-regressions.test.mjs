import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createFurnitureLibrary} from '../dist/tactics/painted-furniture.js';
import {towerCenter,towerBlocksSegment,unitBaseHeight} from '../dist/tactics/tower-geometry.js';
import {sampledEmitters} from '../dist/tactics/light-sources.js';
import {illuminationAt,spotlightReveals} from '../dist/tactics/awareness.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame,WEAPONS} from '../dist/tactics/core/engine.js';
import {explosivePreview,explosiveTrajectory,detonate} from '../dist/tactics/core/explosives.js';
import {muzzleHeight,targetHeight} from '../dist/tactics/core/projectiles.js';
function world(p,x,h,y){const c=towerCenter(p);return {x:c.x+(p.rotated?-y:x),y:c.y+(p.rotated?x:y),h:h+c.z*3};}

test('visible perimeter rails shadow every prone body region and prevent spotlight identification',()=>{
 const library=createFurnitureLibrary(new T.Texture(),new T.Texture());
 try{for(const rotated of [false,true]){
  // The north-edge mount casts the middle rail's shadow near -5.4; -7 lies in the gap.
  const p={kind:'wooden-spotlight-tower',x:20,y:20,z:0,rotated,lightMode:'on'},q=world(p,-1.35,0,-5.40);
  p.lightTargets=[{x:q.x-p.x,y:q.y-p.y,z:0}];
  const map=blankMap();map.props=[p];map.time={startMinutes:1260};const s=createGame(1,map,false,'easy',{awareness:true});
  const target=s.units[0];Object.assign(target,{x:q.x,y:q.y,stance:'prone',sneaking:true});
  const observer={...s.units[1],x:q.x-2,y:q.y,heading:0};
  const root=library.build(p.kind).root,c=towerCenter(p);root.position.set(c.x,0,c.y);root.rotation.y=rotated?-Math.PI/2:0;
  const source=sampledEmitters(p,1260)[0];root.getObjectByName('spotlight-head').lookAt(new T.Vector3(source.aim.x,source.aim.h,source.aim.y));root.updateMatrixWorld(true);
  for(const zone of ['head','torso','legs']){
   const end={x:q.x,y:q.y,h:targetHeight(target,zone)},origin=new T.Vector3(source.x,source.h,source.y),dest=new T.Vector3(end.x,end.h,end.y),ray=new T.Raycaster(origin,dest.clone().sub(origin).normalize(),.05,origin.distanceTo(dest));
   const hits=ray.intersectObject(root,true);assert.equal(hits[0]?.object.name,'perimeter-rail',zone);
   assert.equal(towerBlocksSegment(p,source,end),true);assert.equal(illuminationAt(s,target,zone),.12);
  }
  assert.equal(spotlightReveals(s,observer,target,()=>['head','torso','legs']),false);
  const clear=world(p,-1.35,0,-7);Object.assign(target,{x:clear.x,y:clear.y});Object.assign(observer,{x:clear.x-2,y:clear.y});
  assert.ok(illuminationAt(s,target)>.12);assert.equal(spotlightReveals(s,observer,target,()=>['torso']),true);
  // A gap between rails stays open instead of treating the whole railing as a wall.
  assert.equal(towerBlocksSegment(p,world(p,-1.35,7.06,2),world(p,-1.35,7.06,3)),false);
 }}finally{library.dispose();}
});

function combat(){const s=createGame(1,blankMap(),false,'easy'),a=s.units[0];s.units=[a];s.props=[];Object.assign(a,{x:10,y:10,team:'guard',accuracy:100,ap:30});return {s,a};}
test('grenades, launchers and rockets launch from tower height and aim at elevated occupants',()=>{
 for(const weapon of ['grenade','launcher','rpg'])for(const z of [0,1]){
  const {s,a}=combat();Object.assign(a,{z,weapon,towerPost:{},ammo:{[weapon]:5}});const w=WEAPONS[weapon],target={x:18,y:10,z,towerPost:{},ground:false};
  const trajectory=explosiveTrajectory(s,a,target,w,{chance:100},()=>0);
  assert.equal(trajectory.origin.h,unitBaseHeight(a)+muzzleHeight(a));
  const near=trajectory.path.reduce((best,p)=>Math.abs(p.x-target.x)<Math.abs(best.x-target.x)?p:best);
  if(w.arc)assert.ok(Math.abs(near.h-(unitBaseHeight(target)+.08))<.25);
  else {const end=trajectory.path.at(-1);assert.ok(Math.abs((end.h-trajectory.origin.h)/(end.x-a.x)-(unitBaseHeight(target)+1-trajectory.origin.h)/8)<1e-8);}
 }
});
test('throw range uses actual tower elevation for both uphill and downhill throws',()=>{
 const {s,a}=combat();Object.assign(a,{weapon:'grenade',ammo:{grenade:5},towerPost:{}});const target={x:24,y:10,z:0};
 assert.equal(explosivePreview(s,a,target,WEAPONS.grenade).ok,true);assert.equal(explosivePreview(s,a,target,WEAPONS.grenade).range,16.36);
 delete a.towerPost;target.x=15;target.towerPost={};assert.equal(explosivePreview(s,a,target,WEAPONS.grenade).reason,'Out of range');delete target.towerPost;assert.equal(explosivePreview(s,a,target,WEAPONS.grenade).ok,true);
});
test('blast distance and metadata preserve physical height, separating lookouts from people below',()=>{
 for(const z of [0,1])for(const elevated of [false,true]){
  const {s,a}=combat();a.z=z;const lookout={...a,id:99,towerPost:{}};s.units=[a,lookout];
  const impact={x:a.x,y:a.y,z,h:z*3+.8+(elevated?6.36:0)},result=detonate(s,impact,WEAPONS.grenade);
  assert.deepEqual(result.hits.map(h=>h.unit.id),[elevated?99:a.id]);assert.equal(result.hits[0].damage,WEAPONS.grenade.damage);assert.equal(result.blast.h,impact.h);
 }
});

import {attack,equip} from '../dist/tactics/core/engine.js';
test('an elevated fuel-pack explosion hits adjacent lookouts without burning the ground below',()=>{
 let checked=false;
 for(let seed=0;seed<100&&!checked;seed++){
  const map=blankMap();map.starts=[{x:14,y:20},{x:21,y:20},{x:25,y:20},{x:26,y:20}];map.guards=[{x:20,y:20,species:'pig-foreman',weapon:'flamethrower'}];
  const s=createGame(seed,map,false,'easy'),a=s.units[0],b=s.units[4];equip(s,a,'pistol');a.accuracy=1000;a.towerPost={};b.towerPost={};b.hp=b.maxHp=500;
  const neighbor={...s.units[1],id:90,towerPost:{}};s.units.push(neighbor);const groundHp=s.units[1].hp;
  assert.equal(attack(s,a,b,false,false,'weapon'),true);
  if(!b.tanksExploded)continue;
  checked=true;assert.equal(neighbor.casualty,'dead');assert.equal(s.units[1].hp,groundHp);assert.equal(s.units[1].burningTurns,undefined);assert.equal(s.units[2].burningTurns,undefined);assert.equal(s.fires.length,0);
 }
 assert.ok(checked,'deterministic seeds exercise the fuel-pack detonation');
});

test('widened iron doorway preserves the same clear opening in visible art and tactical blockers',()=>{
 const library=createFurnitureLibrary(new T.Texture(),new T.Texture());try{for(const rotated of [false,true]){
 const p={kind:'iron-searchlight-ladder-tower',x:10,y:10,z:0,rotated},root=library.build(p.kind).root,c=towerCenter(p);root.position.set(c.x,0,c.y);root.rotation.y=rotated?-Math.PI/2:0;root.updateMatrixWorld(true);
 for(const [offset,height,blocked]of [[-.55,1,false],[.55,1,false],[-.60,1,true],[.60,1,true],[0,1.89,false],[0,1.91,true]]){const a=world(p,1,6.36+height,-.8+offset),b=world(p,0,6.36+height,-.8+offset),origin=new T.Vector3(a.x,a.h,a.y),end=new T.Vector3(b.x,b.h,b.y),ray=new T.Raycaster(origin,end.clone().sub(origin).normalize(),0,1);assert.equal(ray.intersectObject(root,true).length>0,blocked,'visible doorway');assert.equal(towerBlocksSegment(p,a,b),blocked,'tactical doorway');}
 }}finally{library.dispose();}
});
