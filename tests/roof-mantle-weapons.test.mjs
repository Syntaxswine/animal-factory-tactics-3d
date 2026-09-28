import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createRoofMantle} from '../dist/tactics/roof-mantle.js';
import {createWeaponModel,WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
import {STOW_MODES} from '../dist/tactics/equipment-stow.js';
import {poseRoofMantleCarry} from '../dist/tactics/roof-mantle-equipment.js';

// Independent equipment geometry checks: include the tank, hose, holders and
// sling, not only the weapon's named origin or diagnostic contact markers.
const mammals=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed),weapons=Object.keys(WEAPON_MODELS),V=()=>new T.Vector3();
function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
function equipmentMeshes(w){const meshes=new Set(w.weapon.parts||[]);w.root.traverse(o=>{if(o.isMesh&&o.name.startsWith('Equipment '))meshes.add(o);});return [...meshes].filter(m=>visible(m)&&m.geometry.attributes.position);}
function vertices(w){const result=new Map();for(const m of equipmentMeshes(w)){const a=m.geometry.attributes.position,ids=m.geometry.index?new Set(m.geometry.index.array):Array.from({length:a.count},(_,i)=>i);for(const i of ids)result.set(m.uuid+':'+i,{name:m.name,p:m.getVertexPosition(i,V()).applyMatrix4(m.matrixWorld)});}return result;}
function load(p){return p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));}
function fixture(profile,id,fn){const w=load(profile),gun=createWeaponModel(id);w.equipWeapon(gun);let m;try{poseRoofMantleCarry(w,profile);const entry=[];w.root.traverse(o=>entry.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible,parent:o.parent}));const attributes=w.parts.map(p=>({p,index:p.geometry.index,attributes:{...p.geometry.attributes}}));m=createRoofMantle(w,profile);fn(w,m,gun);m.dispose();for(const {o,p,q,s,visible,parent}of entry){assert(o.position.equals(p),'restored position '+o.name);assert(o.quaternion.equals(q),'restored rotation '+o.name);assert(o.scale.equals(s),'restored scale '+o.name);assert.equal(o.visible,visible,'restored visibility '+o.name);assert.equal(o.parent,parent,'restored attachment '+o.name);}for(const {p,index,attributes:attrs}of attributes){assert.equal(p.geometry.index,index,'restored body index '+p.name);assert.deepEqual(p.geometry.attributes,attrs,'restored body attributes '+p.name);}}finally{m?.dispose();gun.dispose();w.dispose();}}
function assertGrip(w,id){for(const side of w.weapon.carry.hands){const name=side===1?'grip':'support',palm=w.weapon.carry.handPoses?.[name]?.palm||[.052,-.010,0],bone=w.bones.find(b=>b.name==='hand'+side),a=w.weapon.anchors[name].getWorldPosition(V()),b=bone.localToWorld(V().fromArray(palm));assert(a.distanceTo(b)<1e-5,id+' authored '+name+' contact '+a.distanceTo(b));}}

test('weapon mantle matrix includes every authored equipment mode and every completed mammal',()=>{
 assert.equal(mammals.length,11);assert.equal(weapons.length,13);assert.deepEqual(new Set(weapons),new Set(Object.keys(STOW_MODES)));
 assert.deepEqual(new Set(weapons.map(id=>STOW_MODES[id])),new Set(['empty','sheath','holster','pouch','sling','pack']));
});

for(const profile of mammals)for(const id of weapons){
 test(`${profile.id}/${id}: complete equipment surfaces clear roof and floor; authored contacts and source ownership survive`,()=>fixture(profile,id,(w,m,gun)=>{
  const rigid=gun.parts.filter(p=>p!==gun.hose).map(p=>({p,g:p.geometry,position:p.geometry.attributes.position.array.slice(),index:p.geometry.index?.array.slice(),scale:p.scale.clone()}));
  const lengths=w.bones.filter(b=>b.parent.isBone).map(b=>[b,b.position.length()]);
  for(let i=0;i<=160;i++){
   const r=m.apply(i/160);
   for(const c of r.contacts)assert(c.error<1e-5,`${profile.id}/${id} ${r.time} ${c.id} reach ${c.error}`);
   for(const [bone,length]of lengths)assert(Math.abs(bone.position.length()-length)<1e-9,'bone length changed '+bone.name);
   for(const {p,name}of vertices(w).values()){
    assert(p.toArray().every(Number.isFinite),'nonfinite '+name);assert(p.y>=-.001,`${profile.id}/${id} ${name} floor depth ${-p.y} at ${r.time}`);
    if(p.x>0&&p.x<3&&p.y>0&&p.y<2&&Math.abs(p.z)<2){const depth=Math.min(p.x,3-p.x,p.y,2-p.y,2-Math.abs(p.z));assert(depth<.004,`${profile.id}/${id} ${name} roof depth ${depth} at ${r.time}`);}
   }
   if(id==='hands')assert(!r.contacts.some(c=>c.kind==='weapon'));
   if(i===0||i===160)assertGrip(w,profile.id+'/'+id);
   if(r.index>0&&r.index<11&&id!=='hands')assert(gun.root.visible,'stowed equipment vanishes');
  }
  // Check exact boundaries, including long weapons and the flexible hose.
  for(const phase of m.phases.slice(0,-1)){
   m.apply((phase.end-1e-6)/m.duration);const a=vertices(w);m.apply((phase.end+1e-6)/m.duration);const b=vertices(w);
   for(const [key,{p,name}]of a)if(b.has(key))assert(p.distanceTo(b.get(key).p)<.0002,`${profile.id}/${id} ${name} pops at ${phase.label}`);
  }
  const snapshots=[0,.04,.1,.25,.45,.6,.72,.87,.95,1].map(t=>{m.apply(t);return {t,points:vertices(w)};});
  for(const {t,points}of snapshots.reverse()){m.apply(t);const current=vertices(w);assert.equal(current.size,points.size);for(const [key,{p,name}]of points)assert(p.distanceTo(current.get(key).p)<1e-8,'history changes '+name);}
  // Skunk carries the receiver beside the body to clear its tail, so a rear
  // cross-section is inapplicable there; its tail/side gap is visually reviewed.
  if(id==='hmg'&&profile.id!=='skunk')for(const t of [.65,2.7,4,4.65]){
   // A conservative rear-body section catches the observed receiver burial
   // after moving the HMG inward. Roof clearance alone cannot catch this.
   m.apply(t/m.duration);const inv=w.bones.find(b=>b.name==='spine').matrixWorld.clone().invert(),receiver=[];
   for(const mesh of gun.parts.filter(p=>/receiver/.test(p.name)))for(let i=0;i<mesh.geometry.attributes.position.count;i++)receiver.push(mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv));
   const box=new T.Box3().setFromPoints(receiver),section=[];
   for(const mesh of w.parts.filter(p=>!/tail/.test(p.name)))for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);if(p.y>box.min.y&&p.y<box.max.y&&p.z>box.min.z&&p.z<box.max.z)section.push(p.x);}
   assert(section.length,'missing body cross-section');assert(Math.min(...section)-box.max.x>.005,`${profile.id} HMG receiver buried at ${t}: margin ${Math.min(...section)-box.max.x}`);
  }
  if(['knife','pistol','grenade'].includes(id)){
   let reference;for(const t of [.65,2.7,4,4.65]){
    m.apply(t/m.duration);const hipInverse=w.bones.find(b=>b.name==='hips').matrixWorld.clone().invert(),objects=[gun.root,w.root.getObjectByName('Equipment '+STOW_MODES[id])];assert(objects[1],'missing belt holder');
    const transforms=objects.map(o=>hipInverse.clone().multiply(o.matrixWorld));if(reference)transforms.forEach((matrix,i)=>matrix.elements.forEach((v,j)=>assert(Math.abs(v-reference[i].elements[j])<1e-8,`${profile.id}/${id} belt attachment leaves hips at ${t}`)));else reference=transforms;
   }
  }
  m.restore();poseRoofMantleCarry(w,profile);assertGrip(w,profile.id+'/'+id+' restored');m.dispose();
  for(const {p,g,position,index,scale}of rigid){assert.equal(p.geometry,g);assert.deepEqual(g.attributes.position.array,position,'rigid weapon vertices modified '+p.name);assert.deepEqual(g.index?.array,index,'rigid weapon topology modified '+p.name);assert(p.scale.equals(scale),'weapon scaled '+p.name);}
  assert(!w.root.getObjectByName('Equipment shoulder sling'),'sling helper leaked after disposal');
 }));
}
