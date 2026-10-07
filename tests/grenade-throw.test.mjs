import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createGrenadeModel} from '../dist/tactics/grenade-model.js';
import {createGrenadeThrow,GRENADE_THROW} from '../dist/tactics/grenade-throw-motion.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url))),V=a=>new T.Vector3(...(a||[0,0,0]));
function fixture(fn){const worker=createLightHorse(data),grenade=createGrenadeModel(),motion=createGrenadeThrow(worker,grenade);try{fn({worker,grenade,motion});}finally{motion.dispose();grenade.dispose();worker.skeleton.dispose();worker.dispose();}}

test('throw retains native scale, limb lengths and legal IK over the complete motion',()=>fixture(({worker,motion})=>{
 const length=worker.bones.map(b=>b.position.length());
 for(let frame=0;frame<=552;frame++){const d=motion.at(frame/120);assert.ok(d.ball.position.every(Number.isFinite));assert.deepEqual(worker.root.scale.toArray(),[1,1,1]);
  for(let i=0;i<worker.bones.length;i++){const b=worker.bones[i];assert.ok(Math.abs(b.quaternion.length()-1)<1e-7);if(!['hips','spine','head'].includes(b.name))assert.ok(Math.abs(b.position.length()-length[i])<1e-8,b.name);}
 }
}));
test('grenade stays in the actual palm until release, then inherits position, velocity and spin',()=>fixture(({motion})=>{
 for(let i=0;i<190;i++)assert.ok(motion.at(i/100).gripError<1e-8);
 const t=GRENADE_THROW.release,e=1e-5,a=motion.projectile(t-e),b=motion.projectile(t),c=motion.projectile(t+e);
 assert.ok(a.position.distanceTo(b.position)<.0001);
 const before=b.position.clone().sub(a.position).divideScalar(e),after=c.position.clone().sub(b.position).divideScalar(e);assert.ok(before.distanceTo(after)<.002,'release velocity must not jump');
 const spinBefore=b.quaternion.angleTo(a.quaternion)/e,spinAfter=b.quaternion.angleTo(c.quaternion)/e;assert.ok(spinBefore>1,'wrist imparts visible tumble');assert.ok(Math.abs(spinBefore-spinAfter)<.01,'spin cannot appear after release');
}));
test('airborne projectile follows gravity, loses energy at contact and rests on the target tile',()=>fixture(({motion})=>{
 const t=2.2,e=.001,a=motion.projectile(t-e).position,b=motion.projectile(t).position,c=motion.projectile(t+e).position,acc=c.clone().add(a).addScaledVector(b,-2).divideScalar(e*e);
 assert.ok(Math.abs(acc.y+GRENADE_THROW.gravity)<1e-5);assert.ok(Math.abs(acc.x)<1e-5&&Math.abs(acc.z)<1e-5);
 for(const impact of motion.impacts){const before=motion.projectile(impact-e).position,at=motion.projectile(impact).position,after=motion.projectile(impact+e).position;assert.ok(at.distanceTo(before)<.012&&at.distanceTo(after)<.012,'no impact teleport');const vin=at.clone().sub(before).divideScalar(e),vout=after.clone().sub(at).divideScalar(e);assert.ok(vout.length()<vin.length()*.9,'bounce/ground friction dissipate energy');}
 for(let t=1.9;t<=4.6;t+=.01)assert.ok(motion.at(t).ball.groundClearance>=-.00001,'solid grenade cannot pass through floor');
 const end=motion.projectile(4.1),still=motion.projectile(4.6);assert.ok(end.position.distanceTo(still.position)<1e-10);assert.ok(Math.abs(end.position.x-GRENADE_THROW.target)<.5&&Math.abs(end.position.z)<.5);assert.ok(end.quaternion.angleTo(still.quaternion)<1e-7);
}));
test('each lifted hoof is preceded by weight shift toward the planted leg',()=>fixture(({motion})=>{
 for(let frame=0;frame<=190;frame++){const d=motion.at(frame/100),feet=d.feet;for(const side of [1,-1])if(feet[side].target[1]>.18){const support=feet[-side];assert.equal(support.planted,true);assert.ok(Math.abs(d.hips[2]-support.target[2])<.075,'pelvis must shift toward support before the other hoof lifts');}}
}));
test('front foot lands before the throw and both planted hooves remain fixed through follow-through',()=>fixture(({motion})=>{
 const planted=motion.at(GRENADE_THROW.plant).feet;for(let t=1.53;t<=2.45;t+=.01){const d=motion.at(t);for(const side of [1,-1]){assert.equal(d.feet[side].planted,true);assert.ok(V(d.feet[side].ankle).distanceTo(V(planted[side].ankle))<1e-8);}}
}));
test('actual skinned hoof soles stay on or above the floor and match planted contacts',()=>fixture(({worker,motion})=>{
 for(let frame=0;frame<=138;frame++){const d=motion.at(frame/30);for(const side of [-1,1]){const foot=worker.parts.find(p=>p.name.includes('hoof')&&p.name.endsWith(' '+side)),a=foot.geometry.attributes.position;let low=Infinity;
   for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);foot.applyBoneTransform(i,p);low=Math.min(low,p.applyMatrix4(foot.matrixWorld).y);}
   assert.ok(low>=-1e-7);if(d.feet[side].planted)assert.ok(Math.abs(low)<1e-7);
  }}
}));
test('reverse scrubbing, restart and clamped end frames are deterministic; invalid time is rejected',()=>fixture(({worker,motion})=>{
 const capture=t=>{const d=motion.at(t);return {d,bones:worker.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()])};},expected=capture(1.82);for(const t of [4.6,0,2.95,.42,2.1])motion.at(t);assert.deepEqual(capture(1.82),expected);assert.deepEqual(capture(-5),capture(0));assert.deepEqual(capture(99),capture(4.6));assert.throws(()=>motion.at(NaN),/finite/);assert.throws(()=>motion.at(Infinity),/finite/);
}));
test('grenade remains a small separately disposable prop with grip/release semantics',()=>fixture(({grenade})=>{
 assert.ok(grenade.triangles<1000);const box=new T.Box3().setFromObject(grenade.root),size=box.getSize(V());assert.ok(size.y<.13&&size.x<.1&&size.z<.1);assert.ok(grenade.anchors.grip&&grenade.anchors.release);assert.equal(grenade.anchors.muzzle,undefined);assert.ok(grenade.parts.some(p=>p.name==='curved safety lever'));let events=0;grenade.parts[0].geometry.addEventListener('dispose',()=>events++);grenade.dispose();grenade.dispose();assert.equal(events,1);
}));
