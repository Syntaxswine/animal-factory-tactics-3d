import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {IDLE_ANIMALS,idleOutfits,idleSelection} from '../dist/tactics/armed-idle-actor.js';
import {IDLE_MOODS,IDLE_KEYS,idleState} from '../dist/tactics/armed-idle-state.js';
import {WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
import {idleFixture} from './helpers/idle-fixture.mjs';
import {weaponClearance,posedSurface} from './helpers/idle-clearance.mjs';
import {solePoints,hull,outside} from './helpers/grenade-roster-support.mjs';
const V=a=>new T.Vector3(...(a||[0,0,0]));
const pose=m=>Object.values(m.bones).flatMap(b=>[...b.position.toArray(),...b.quaternion.toArray()]);
test('650 explicit selections, including armed hens and both moods; no silent substitution',()=>{
 let count=0;for(const p of IDLE_ANIMALS)for(const o of idleOutfits(p.id))for(const w of Object.keys(WEAPON_MODELS))for(const mood of Object.keys(IDLE_MOODS)){const s=idleSelection(p.id,o,w,mood);assert.equal(s.weapon,w);assert.equal(s.outfit,o);count++;}assert.equal(count,650);
 for(const args of [['camel'],['horse','blue-hawaiian'],['hen','normal','unknown'],['dog','normal','rifle','unknown']])assert.throws(()=>idleSelection(...args));
});
test('head initiates each glance, relaxed mood takes longer, load restrains movement and offsets loop',()=>{
 const head=idleState(12*.15),body=idleState(12*.24);assert.ok(head.headYaw>.2);assert.equal(head.chestYaw,0);assert.ok(body.chestYaw>.02);
 assert.ok(idleState(12*.59).headYaw<-.2);assert.equal(IDLE_MOODS.mercenary.duration,16);
 const a=idleState(12*.40),b=idleState(16*.40,{mood:'mercenary'}),heavy=idleState(12*.40,{weapon:'hmg'});assert.ok(b.shift>a.shift&&heavy.shift<a.shift);
 assert.equal(idleState(0,{phase:.40}).shift,a.shift);assert.throws(()=>idleState(NaN));assert.throws(()=>idleState(0,{phase:Infinity}));
});
for(const profile of IDLE_ANIMALS){
 test(profile.id+': every weapon keeps planted feet, closed grips, finite native limbs and a seamless seekable loop',()=>{
  for(const id of Object.keys(WEAPON_MODELS))idleFixture(profile,id,({worker,weapon,motion})=>{
   const lengths=Object.fromEntries(Object.entries(motion.bones).map(([k,b])=>[k,b.position.length()])),baseSoles=[-1,1].map(s=>solePoints(motion,s)),initial=pose(motion);
   for(const mood of Object.keys(IDLE_MOODS)){const duration=IDLE_MOODS[mood].duration;
    for(let i=0;i<=64;i++){const state=motion.at(duration*i/64,{mood});assert.ok(state.contacts.every(c=>c.error<1e-8),id+' closed grips');assert.deepEqual(worker.root.scale.toArray(),[1,1,1]);
     for(const [k,b]of Object.entries(motion.bones)){assert.ok([...b.position.toArray(),...b.quaternion.toArray()].every(Number.isFinite));assert.ok(Math.abs(b.quaternion.length()-1)<1e-8);if(!['hips','spine','head'].includes(k))assert.ok(Math.abs(b.position.length()-lengths[k])<1e-9,'limbs never stretch');}
     for(const s of [-1,1]){const soles=solePoints(motion,s);assert.equal(soles.length,baseSoles[s===-1?0:1].length);soles.forEach((p,j)=>assert.ok(p.distanceTo(baseSoles[s===-1?0:1][j])<1e-8,id+' sole stays planted'));const low=Math.min(...solePoints(motion,s,true).map(p=>p.y));assert.ok(Math.abs(low)<1e-6,'lowest real foot surface meets floor');}
    }
    motion.at(duration*.60,{mood});const expected=pose(motion);for(const t of [duration,0,duration*.22])motion.at(t,{mood});motion.at(duration*.60,{mood});assert.deepEqual(pose(motion),expected);
    motion.at(0,{mood});const start=pose(motion);motion.at(duration,{mood});assert.deepEqual(pose(motion),start);const e=1e-4;motion.at(duration-e,{mood});const before=pose(motion);motion.at(e,{mood});const after=pose(motion);assert.ok(after.every((v,j)=>Math.abs((v-start[j])/e-(start[j]-before[j])/e)<.002),'loop velocity must join');
   }
   motion.at(0);assert.deepEqual(pose(motion),initial);assert.throws(()=>motion.at(Infinity));if(id==='hmg'&&!profile.unarmed)assert.equal(worker.root.getObjectByName('curled gripping hand')?.visible??worker.root.getObjectByName('fitted glove cuff')?.visible,true,'preserve fitted HMG grasp');
  });
 });
 test(profile.id+': bulk clears the posed head, garments and tail throughout both idle cycles',()=>{
  for(const id of Object.keys(WEAPON_MODELS))idleFixture(profile,id,({worker,weapon,motion})=>{
   for(const mood of Object.keys(IDLE_MOODS))for(let i=0;i<16;i++){motion.at(IDLE_MOODS[mood].duration*i/16,{mood});assert.deepEqual(weaponClearance(worker,weapon),[],id+' '+mood+' frame '+i);}
  });
 });
 test(profile.id+': body and equipment weight remain supported by the actual soles',()=>{
  for(const id of Object.keys(WEAPON_MODELS))idleFixture(profile,id,({motion,weapon})=>{
   // A separate, deliberately top-heavy estimate tests a range of pack weights.
   const b=motion.bones,segments=[['hips','spine',profile.id.startsWith('pig-')?.48:.33],['spine','head',.28],['head','head',.14],...[-1,1].flatMap(s=>[['upperArm'+s,'hand'+s,.05],['thigh'+s,'hoof'+s,.12]])];
   const gunLocal=weapon.root.worldToLocal(new T.Box3().setFromObject(weapon.root).getCenter(V())),packLocal=weapon.mount?.worldToLocal(new T.Box3().setFromObject(weapon.mount).getCenter(V()));
   const mass={hands:0,knife:.3,pistol:1,grenade:.6,rifle:4,assault:5,smg:6,shotgun:4,sniper:6,launcher:6,hmg:14,rpg:8,flamethrower:4}[id],bodyMass=profile.id.startsWith('pig-')?90:profile.unarmed?45:65;
   function com(t,mood){motion.at(t,{mood});const c=V();let total=0;for(const [a,z,f]of segments){const p=b[a].getWorldPosition(V()).add(b[z].getWorldPosition(V())).multiplyScalar(.5);if(a==='head')p.add(V([.05,.17,0]).applyQuaternion(b.head.getWorldQuaternion(new T.Quaternion())));c.addScaledVector(p,f*bodyMass);total+=f*bodyMass;}c.addScaledVector(weapon.root.localToWorld(gunLocal.clone()),mass);total+=mass;if(packLocal){c.addScaledVector(weapon.mount.localToWorld(packLocal.clone()),22);total+=22;}return c.divideScalar(total);}
   for(const mood of Object.keys(IDLE_MOODS))for(let i=0;i<16;i++){const t=IDLE_MOODS[mood].duration*i/16,h=.002,c=com(t,mood),acc=com(t-h,mood).add(com(t+h,mood)).addScaledVector(c,-2).divideScalar(h*h);motion.at(t,{mood});assert.ok(acc.y+9.81>9,'floor cannot pull downward');const pressure=[c.x-c.y*acc.x/(9.81+acc.y),c.z-c.y*acc.z/(9.81+acc.y)];assert.ok(outside(hull([...solePoints(motion,-1),...solePoints(motion,1)]),pressure)<-.025,id+' equipment-inclusive pressure stays inside soles');}
  });
 });
}
test('hen feather surfaces touch every held grip, including the actual upper HMG handle',()=>{
 const p=IDLE_ANIMALS.find(p=>p.id==='hen');for(const id of Object.keys(WEAPON_MODELS))idleFixture(p,id,({worker,weapon,motion})=>{
  for(const key of IDLE_KEYS){motion.at(key.u*16,{mood:'mercenary'});for(const c of motion.diagnostics().contacts){const wing=worker.parts.find(p=>p.name==='layered wing '+c.side),near=Math.min(...posedSurface(wing).points.map(p=>p.distanceTo(V(c.grip))));assert.ok(near<.037,id+' '+c.name+' visible feather contact: '+near);}
   if(id==='hmg'){const target=weapon.gripTargets.support;assert.equal(target.name,'upper handle grip');assert.ok(new T.Box3().setFromObject(target).getCenter(V()).distanceTo(weapon.anchors.support.getWorldPosition(V()))<.001);}
  }
 });
});
