import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {GRENADE_CHARACTERS,grenadeOutfits,grenadeSelection} from '../dist/tactics/grenade-throw-actor.js';
import {createGrenadeThrow,GRENADE_THROW} from '../dist/tactics/grenade-throw-motion.js';
import {createHenGrenadeThrow} from '../dist/tactics/hen-grenade-throw.js';
import {createGrenadeModel} from '../dist/tactics/grenade-model.js';
import {solePoints,supportAudit} from './helpers/grenade-roster-support.mjs';
import {grenadeMeshClearance,meshVerticesInside} from './helpers/grenade-mesh-clearance.mjs';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
function fixture(profile,fn){
 const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),grenade=createGrenadeModel();let motion;
 const original=worker.parts.map(p=>({si:p.geometry.attributes.skinIndex.array.slice(),sw:p.geometry.attributes.skinWeight.array.slice()})),parents=worker.bones.map(b=>b.parent);
 try{motion=profile.unarmed?createHenGrenadeThrow(worker,grenade):createGrenadeThrow(worker,grenade,{animal:profile.id});fn({worker,grenade,motion});}
 finally{motion?.dispose();for(let i=0;i<worker.parts.length;i++){assert.deepEqual(worker.parts[i].geometry.attributes.skinIndex.array,original[i].si,'skin indices restored');assert.deepEqual(worker.parts[i].geometry.attributes.skinWeight.array,original[i].sw,'skin weights restored');}worker.bones.forEach((b,i)=>assert.equal(b.parent,parents[i],'original bone parent restored'));grenade.dispose();worker.skeleton.dispose();worker.dispose();}
}
const boneState=m=>Object.values(m.bones).map(b=>[...b.position.toArray(),...b.quaternion.toArray()]);
test('roster exposes exactly the 25 authored combinations and rejects invalid selections',()=>{
 const combos=GRENADE_CHARACTERS.flatMap(p=>grenadeOutfits(p.id).map(o=>grenadeSelection(p.id,o)));assert.equal(combos.length,25);
 assert.throws(()=>grenadeSelection('camel'));assert.throws(()=>grenadeSelection('pig-director','blue-hawaiian'));
});
for(const profile of GRENADE_CHARACTERS){
 test(profile.id+': native skeleton, floor support, grip and release survive dense playback and reverse seek',()=>fixture(profile,({worker,motion})=>{
  const lengths=Object.values(motion.bones).map(b=>b.position.length()),bones=Object.entries(motion.bones);
  for(let i=0;i<=276;i++){const d=motion.at(i/60);assert.deepEqual(worker.root.scale.toArray(),[1,1,1]);assert.ok(d.ball.position.every(Number.isFinite));
   assert.ok(d.ball.groundClearance>=-1e-6&&d.ring.groundClearance>=-1e-6&&d.lever.groundClearance>=-1e-6);
   if(!d.released)assert.ok(d.gripError<1e-8);
   assert.ok([-1,1].some(s=>d.feet[s].contact!=='air'));
   for(const s of [-1,1]){const low=Math.min(...solePoints(motion,s,true).map(p=>p.y));assert.ok(low>=-1e-6,'actual skin cannot cross floor');if(d.feet[s].contact!=='air')assert.ok(Math.abs(low)<2e-5,'planted sole reaches floor');}
   bones.forEach(([name,b],j)=>{assert.ok(Math.abs(b.quaternion.length()-1)<1e-6);if(!['hips','spine','head'].includes(name))assert.ok(Math.abs(b.position.length()-lengths[j])<1e-8,'no limb stretching');});
  }
  const t=GRENADE_THROW.release,e=1e-5,a=motion.projectile(t-e),b=motion.projectile(t),c=motion.projectile(t+e);
  assert.ok(b.position.clone().sub(a.position).divideScalar(e).distanceTo(c.position.clone().sub(b.position).divideScalar(e))<.003,'no launch velocity jump');
  assert.ok(Math.abs(b.quaternion.angleTo(a.quaternion)/e-b.quaternion.angleTo(c.quaternion)/e)<.02,'no launch spin jump');
  const p=motion.projectile(2.2-e).position,q=motion.projectile(2.2).position,r=motion.projectile(2.2+e).position;
  assert.ok(Math.abs(r.add(p).addScaledVector(q,-2).divideScalar(e*e).y+9.81)<.0001,'ballistic gravity');
  motion.at(1.83);const expected=boneState(motion);for(const t of [4.6,0,2.2,.46])motion.at(t);motion.at(1.83);assert.deepEqual(boneState(motion),expected);
  assert.throws(()=>motion.at(NaN),/finite/);
  const end=motion.projectile(4.6);assert.ok(Math.abs(end.position.x-5)<.5&&Math.abs(end.position.z)<.5,'same target tile');
 }));
 test(profile.id+': reconstructed pressure remains within 1.6 cm of actual supporting soles',()=>fixture(profile,({motion})=>{
  const audit=supportAudit(motion,profile.id);assert.ok(audit.minNormal>0,'floor never pulls the character downward');
  assert.ok(audit.worst<.016,JSON.stringify(audit));
 }));
 test(profile.id+': grenade clears the posed head, garments and tail during preparation and windup',()=>fixture(profile,({worker,grenade,motion})=>assert.deepEqual(grenadeMeshClearance(worker,grenade,motion),[])));
}
test('approved horse key poses are preserved within a submillimetre solver refinement',()=>fixture(GRENADE_CHARACTERS[0],({worker,motion})=>{
 const approved=JSON.parse(fs.readFileSync(new URL('./fixtures/grenade-approved-horse.json',import.meta.url)));
 assert.equal(approved.source,'fc1573e');for(const {t,pose}of approved.frames){motion.at(t);worker.bones.forEach((b,i)=>[...b.position.toArray(),...b.quaternion.toArray()].forEach((v,j)=>assert.ok(Math.abs(v-pose[i][j])<.001,'approved pose changed at '+t)));}
}));
test('hen holds the casing and pin with visible feather surfaces, not empty hand markers',()=>fixture(GRENADE_CHARACTERS.find(p=>p.id==='hen'),({worker,grenade,motion})=>{
 const near=(point,side)=>{const mesh=worker.parts.find(p=>p.name==='layered wing '+side),a=mesh.geometry.attributes.position;let d=Infinity;for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);mesh.applyBoneTransform(i,p);d=Math.min(d,p.applyMatrix4(mesh.matrixWorld).distanceTo(point));}return d;};
 for(let t=0;t<1.92;t+=.02){const d=motion.at(t);assert.ok(near(grenade.anchors.grip.getWorldPosition(V()),1)<.025,'grenade must touch feathers at '+t);
  if(t>.24&&t<.70)assert.ok(near(new T.Vector3(...d.ring.position),-1)<.035,'pin must touch the free feather tip at '+t);
 }
}));

test('skunk throwing forearm clears the plume throughout loading and release',()=>fixture(GRENADE_CHARACTERS.find(p=>p.id==='skunk'),({worker,motion})=>{
 const arm=worker.parts.find(p=>p.name==='forearm and hand 1'),tail=worker.parts.find(p=>p.name.includes('tail'));
 assert.ok(arm&&tail,'authored arm and tail surfaces exist');
 for(let i=45;i<=97;i++){motion.at(i/50);assert.equal(meshVerticesInside(arm,tail),0,'forearm enters plume at '+i/50);}
}));
