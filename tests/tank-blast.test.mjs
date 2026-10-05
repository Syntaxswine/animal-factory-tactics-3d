import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';import {createPaintedFireMotion} from '../dist/tactics/painted-fire-motion.js';
import {createTankBlastMotion,TANK_TIME,tankCentre} from '../dist/tactics/tank-blast-motion.js';
import {createTankBlastEffects,localFireCells} from '../dist/tactics/tank-blast-effects.js';
import {createPaintedFireEffects} from '../dist/tactics/painted-fire-effects.js';
const V=(...a)=>new T.Vector3(...a),contract=JSON.parse(fs.readFileSync(new URL('../dist/tactics/fixtures/tank-blast-contract.json',import.meta.url)));
function setup(p){const worker=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),weapon=createWeaponModel('flamethrower');worker.equipWeapon(weapon);const motion=createPaintedFireMotion(worker,p),actor={worker,motion,dissolve:{value:0}},blast=createTankBlastMotion(actor);return {...actor,blast,dispose(){blast.restore();motion.dispose();weapon.dispose();worker.dispose();}};}
function minimum(parts){const v=V();let y=Infinity;for(const p of parts){const a=p.geometry.attributes.position;for(let i=0;i<a.count;i++){p.getVertexPosition(i,v).applyMatrix4(p.matrixWorld);y=Math.min(y,v.y);}}return y;}
for(const p of profiles.filter(p=>!p.unarmed))test(p.id+': worn origin, destroyed equipment, grounded collapse and replay',()=>{
 const a=setup(p);try{
  const origin=a.blast.origin.clone();let previous;
  for(let i=0;i<=270;i++){
   const time=i*.02,d=a.blast.apply(time);assert.equal(d.body.state.distance,0);assert.equal(d.body.drop,null,'explosion left intact loot');
   assert.ok(a.worker.root.position.length()<1e-7,'wearer translated to another tile');
   for(const object of [a.worker.weapon.root,a.worker.weapon.mount,a.worker.weapon.hose])assert.equal(object.visible,time<TANK_TIME.burst);
   if(time<TANK_TIME.burst){assert.ok(tankCentre(a.worker).distanceTo(origin)<1e-7);assert.ok(d.body.gripError<1e-7);}
   else assert.equal(d.body.hands.length,0,'hands claim destroyed weapon contacts');
   for(const side of [-1,1]){const f=d.body.feet[side];assert.ok(f.planted);if(previous)assert.ok(V(...f.ankle).distanceTo(V(...previous.feet[side].ankle))<1e-7,'foot slid');}
   previous=d.body;
  }
  a.blast.apply(1.75);assert.ok(minimum(a.worker.parts)>-.005,'body below ground');
  const first=a.blast.apply(.82);a.blast.apply(5.4);assert.deepEqual(a.blast.apply(.82),first);
  a.blast.restore();assert.ok(a.worker.parts.every(p=>p.visible));for(const o of [a.worker.weapon.root,a.worker.weapon.mount,a.worker.weapon.hose])assert.ok(o.visible,'restore failed');
 }finally{a.dispose();}
});
test('rupture releases palms and fingers without an instantaneous joint change',()=>{
 for(const p of profiles.filter(p=>!p.unarmed)){const a=setup(p);try{
  const pose=t=>{a.blast.apply(t);return a.worker.bones.map(b=>({p:b.getWorldPosition(V()),q:b.getWorldQuaternion(new T.Quaternion())}));},before=pose(TANK_TIME.burst-.000001),after=pose(TANK_TIME.burst+.000001);
  before.forEach((b,i)=>{assert.ok(b.p.distanceTo(after[i].p)<.0001,p.id+' joint jump');assert.ok(b.q.angleTo(after[i].q)<.001,p.id+' joint snap '+a.worker.bones[i].name);});
 }finally{a.dispose();}}
});
test('ground fire uses supplied cells and excludes captured water; event removes the weapon',()=>{
 assert.equal(contract.open.wearer.hp,0);assert.equal(contract.open.wearer.weapon,'hands');assert.equal(contract.open.wearer.ammo,0);
 assert.equal(localFireCells(contract.open).length,81);assert.equal(localFireCells(contract.water).length,66);
 for(const p of contract.water.excluded)assert.ok(!localFireCells(contract.water).some(c=>c.x===p.x-contract.water.origin.x&&c.z===p.y-contract.water.origin.y));
});
test('burst effects replay deterministically, fragments stay above floor and no persistent tank remains',async()=>{
 const scene=new T.Scene(),loader={loadAsync:async()=>new T.Texture()},fx=await createTankBlastEffects(scene,loader,V(-.2,1,0)),camera=new T.PerspectiveCamera();camera.position.set(3,5,8);
 try{
  for(let age=-.1;age<5;age+=.025){fx.update(age,{camera,contract:contract.open,groundOpacity:1});for(const m of fx.fragments)if(m.visible){m.updateMatrixWorld(true);assert.ok(minimum([m])>=-.001,'fragment cut into floor');}}
  const sample=age=>{fx.update(age,{camera,contract:contract.open,groundOpacity:.8});return fx.group.children.map(m=>({p:m.position.toArray(),visible:m.visible}));};
  const initial=sample(.47);sample(4.7);assert.deepEqual(sample(.47),initial);fx.update(5.4,{camera,contract:contract.open,groundOpacity:0});assert.ok(fx.fragments.every(m=>!m.visible));
 }finally{fx.dispose();}assert.ok(!scene.children.includes(fx.group));
});
test('fire mask contains precisely the supplied dry cells and is replaced without retaining textures',async()=>{
 const fx=await createTankBlastEffects(new T.Scene(),{loadAsync:async()=>new T.Texture()},V(-.2,1,0)),camera=new T.PerspectiveCamera();camera.position.set(3,5,8);
 try{
  fx.update(.8,{camera,contract:contract.open});const previous=fx.groundMask;let freed=false;previous.addEventListener('dispose',()=>{freed=true;});fx.update(.8,{camera,contract:contract.water});assert.ok(freed);
  const mask=fx.groundMask,{data,width,height}=mask.image,bounds=fx.ground[0].material.uniforms.groundBounds.value,cells=localFireCells(contract.water);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){const expected=cells.some(p=>p.x===bounds.x+.5+i&&p.z===bounds.y+.5+j);assert.equal(data[(j*width+i)*4+3],expected?255:0);}
 }finally{fx.dispose();}
});
test('burst and body-effect texture failures dispose earlier loads',async()=>{
 for(const make of [loader=>createTankBlastEffects(new T.Scene(),loader,V(0,1,0)),loader=>createPaintedFireEffects(new T.Scene(),loader,null)]){
  const texture=new T.Texture();let count=0,disposed=false;texture.addEventListener('dispose',()=>{disposed=true;});
  await assert.rejects(make({async loadAsync(){if(count++)throw Error('Injected second texture failure');return texture;}}),/Injected/);assert.ok(disposed);
 }
});
