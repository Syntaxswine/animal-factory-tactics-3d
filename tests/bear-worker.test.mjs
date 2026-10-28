import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createBearWorker,BEAR_PROFILE} from '../dist/tactics/bear-worker.js';
import {createWeaponModel,WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
import {surfaceComponents} from '../dist/tactics/grey-surface.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createCrawlMotion} from '../dist/tactics/crawl-motion.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createCasualtyHeadClearance} from '../dist/tactics/casualty-weapon-clearance.js';
const load=f=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+f,import.meta.url))),author=load('bear-author-data.json'),runtime=load('bear-10k-data.json'),V=()=>new T.Vector3();
function minimum(worker){let min=Infinity;for(const mesh of worker.parts)for(let i=0;i<mesh.geometry.attributes.position.count;i++)min=Math.min(min,mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld).y);return min;}
for(const data of [author,runtime]){
 test(`${data.triangles}: bear surfaces are closed, connected, outward-facing and retain rounded ears and plantigrade paws`,()=>{
  assert.ok(data.triangles<=(data===author?30000:10500));assert.equal(data.parts.length,8);
  for(const p of data.parts){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.position,3));g.setIndex(p.index);assert.equal(surfaceComponents(g),1,p.name);const edges=new Map();let volume=0;
   for(let i=0;i<p.index.length;i+=3){const a=V().fromArray(p.position,p.index[i]*3),b=V().fromArray(p.position,p.index[i+1]*3),c=V().fromArray(p.position,p.index[i+2]*3);volume+=a.dot(b.cross(c))/6;for(let k=0;k<3;k++){const u=p.index[i+k],v=p.index[i+(k+1)%3];assert.notEqual(u,v);const key=Math.min(u,v)+':'+Math.max(u,v);edges.set(key,(edges.get(key)||0)+1);}}
   for(const count of edges.values())assert.equal(count,2,p.name+' open/nonmanifold edge');assert.ok(volume>0,p.name+' inward winding');assert.ok(p.errorWorld<.005);assert.ok(p.position.every(Number.isFinite)&&p.normal.every(Number.isFinite));g.dispose();
  }
  const w=createBearWorker(data);try{const d=w.diagnostics();assert.ok(Math.abs(d.min[1])<1e-6);assert.ok(d.max[1]>1.65&&d.max[1]<1.70);const skull=w.parts[6].geometry.attributes.position;for(const side of [-1,1])assert.ok(Array.from({length:skull.count},(_,i)=>i).some(i=>skull.getY(i)>1.64&&skull.getZ(i)*side>.10),'rounded ear missing');for(const side of [-1,1]){const foot=w.parts.find(m=>m.name==='plantigrade bear foot '+side);foot.geometry.computeBoundingBox();const b=foot.geometry.boundingBox;assert.ok(b.max.x-b.min.x>.26&&b.max.z-b.min.z>.19,'bear paw lost broad sole');}
   const tail=w.parts.find(m=>m.name==='short bear tail');tail.geometry.computeBoundingBox();const box=tail.geometry.boundingBox;assert.ok(box.min.y>.87&&box.getCenter(V()).y>.91&&box.max.y<.99,'tail must sit at the upper pelvis, above the fullest rump');assert.ok(box.min.x>-.275,'tail must not extend the rump into a point');const p=tail.geometry.attributes;assert.ok(p.paintPosition.getY(0)<p.position.getY(0),'raised tail retains its original fur registration');
  }finally{w.dispose();}
 });
 test(`${data.triangles}: neutral weights match the widened rig and every weapon keeps native grip contacts`,()=>{
  const w=createBearWorker(data);try{assert.equal(w.bones.length,17);assert.equal(w.bones.find(b=>b.name==='hand1').getWorldPosition(V()).z,.410);for(const m of w.parts){const a=m.geometry.attributes;for(let i=0;i<a.position.count;i++){let sum=0;for(let k=0;k<4;k++)sum+=a.skinWeight.getComponent(i,k);assert.ok(Math.abs(sum-1)<1e-6);const p=V().fromBufferAttribute(a.position,i);assert.ok(m.applyBoneTransform(i,p.clone()).distanceTo(p)<1e-6);}}
   for(const id of Object.keys(WEAPON_MODELS)){const gun=createWeaponModel(id);try{w.equipWeapon(gun);for(const heading of [0,47,138,271]){w.pose('carry',heading);for(const c of w.diagnostics().contacts)assert.ok(c.error<1e-6,id+' palm');assert.ok(minimum(w)>=-.001,id+' body below floor');}}finally{w.equipWeapon();gun.dispose();}}
  }finally{w.dispose();}
 });
}
test('The runtime is reduced from the stored author without losing any named surface',()=>{assert.equal(runtime.sourceTriangles,author.triangles);for(let i=0;i<8;i++){assert.equal(runtime.parts[i].name,author.parts[i].name);assert.equal(runtime.parts[i].sourceTriangles,author.parts[i].triangles);assert.ok(runtime.parts[i].triangles<author.parts[i].triangles);}});
test('Bear walk and crawl preserve native limb lengths, rendered floor clearance and skull clearance for all weapons',()=>{
 for(const id of Object.keys(WEAPON_MODELS)){const w=createBearWorker(runtime),gun=createWeaponModel(id);let crawl;try{w.equipWeapon(gun);const lengths=w.bones.filter(b=>b.parent.isBone).map(b=>[b,b.position.length()]),walk=createWorkerLocomotion(w,BEAR_PROFILE);for(const distance of [0,.16,.39,.61]){walk.apply({heading:0,distance,blend:1});assert.ok(minimum(w)>=-.001,id+' walk floor');}walk.dispose();crawl=createCrawlMotion(w,BEAR_PROFILE);for(const phase of [0,.25,.5,.75]){const state=crawl.at(crawl.stride*phase);for(const [bone,length]of lengths)assert.ok(Math.abs(bone.position.length()-length)<1e-7,id+' stretched '+bone.name);assert.ok(minimum(w)>=-.001,id+' crawl floor');assert.ok((state.grip?.error||0)<1e-6);const head=createCasualtyHeadClearance(w);try{assert.ok(head.clear(gun),id+' crawl touches skull');}finally{head.dispose();}}}finally{crawl?.dispose();w.dispose();gun.dispose();}}
});
test('Species carry fitting restores borrowed HMG and RPG profiles when unequipped or disposed',()=>{
 const w=createBearWorker(runtime),hmg=createWeaponModel('hmg'),rpg=createWeaponModel('rpg'),a=hmg.carry,b=rpg.carry;try{w.equipWeapon(hmg);assert.notEqual(hmg.carry,a);w.equipWeapon(rpg);assert.equal(hmg.carry,a);assert.notEqual(rpg.carry,b);w.dispose();assert.equal(rpg.carry,b);}finally{hmg.dispose();rpg.dispose();}
});
test('Kneeling and prone fitting starts from the native carry and keeps both outfits grounded through repeated sampling',()=>{
 const w=createBearWorker(runtime),gun=createWeaponModel('rifle');try{w.equipWeapon(gun);const posture=createBattlePosture(w,BEAR_PROFILE);for(const pose of [{kneel:1},{prone:1}]){let previous;for(let i=0;i<5;i++){w.root.position.set(0,0,0);w.pose('carry');posture.apply({heading:0,distance:0,blend:0,pose});posture.ground();assert.ok(Math.abs(minimum(w)-.012)<1e-6);const transforms=w.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]);if(previous)for(let j=0;j<transforms.length;j++)for(let k=0;k<transforms[j].length;k++)assert.ok(Math.abs(transforms[j][k]-previous[j][k])<1e-12,'repeated sample changed a bone');previous=transforms;}}}finally{w.dispose();gun.dispose();}
});
