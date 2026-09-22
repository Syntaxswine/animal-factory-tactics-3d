import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {createDogWorker} from '../dist/tactics/dog-guard.js';
import {surfaceComponents} from '../dist/tactics/grey-surface.js';
const load=file=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url)));
const author=load('dog-guard-author-data.json'),reduced=load('dog-guard-10k-data.json');
function geometry(p){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.position,3));g.setIndex(p.index);return g;}
for(const data of [author,reduced]){
 test(`${data.triangles}: closed connected surfaces, scale and species landmarks survive reduction`,()=>{
  assert.ok(data.triangles<=(data===author?30000:10500));assert.equal(data.parts.length,17);
  for(const p of data.parts){const g=geometry(p);assert.equal(surfaceComponents(g),1,p.name);const edges=new Map();for(let i=0;i<p.index.length;i+=3)for(let j=0;j<3;j++){const a=p.index[i+j],b=p.index[i+(j+1)%3];assert.notEqual(a,b);const key=Math.min(a,b)+':'+Math.max(a,b);edges.set(key,(edges.get(key)||0)+1);}for(const n of edges.values())assert.equal(n,2,p.name);assert.ok(p.errorWorld<.005);let volume=0;for(let i=0;i<p.index.length;i+=3){const a=new THREE.Vector3().fromArray(p.position,p.index[i]*3),b=new THREE.Vector3().fromArray(p.position,p.index[i+1]*3),c=new THREE.Vector3().fromArray(p.position,p.index[i+2]*3);volume+=a.dot(b.cross(c))/6;}assert.ok(volume>0,p.name+' outward winding');g.dispose();}
  const h=createDogWorker(data);try{const d=h.diagnostics();assert.ok(Math.abs(d.min[1])<1e-6);assert.ok(Math.abs(d.max[1]-1.696)<.002);
   const skull=h.parts[6].geometry.attributes.position;let ears=[0,0];for(let i=0;i<skull.count;i++){if(skull.getY(i)>1.64&&Math.abs(skull.getZ(i))>.07)ears[skull.getZ(i)<0?0:1]++;}assert.ok(ears.every(n=>n>12),'both upright dog ears survive');
   const skullMesh=h.parts[6];skullMesh.geometry.computeBoundingBox();assert.ok(skullMesh.geometry.boundingBox.max.x>.21,'tapered canine muzzle');
   const tail=h.parts[7];tail.geometry.computeBoundingBox();const box=tail.geometry.boundingBox;assert.ok(box.min.y<.38&&box.max.y>.87,'relaxed plume from pelvis to knee height');assert.ok(box.max.x<-.14&&box.min.x<-.4);
   for(const m of h.parts.filter(p=>/tail|utility/.test(p.name))){const si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;for(let i=0;i<si.count;i++){assert.equal(si.getX(i),0);assert.equal(sw.getX(i),1);}}
   for(const side of [-1,1]){const foot=h.parts.find(p=>p.name==='furry dog foot '+side);foot.geometry.computeBoundingBox();const b=foot.geometry.boundingBox;assert.ok(b.max.x>.15&&b.max.x<.17&&b.min.x<-.10,'compact canine paw');assert.ok(b.max.z-b.min.z>.17,'broad paw');}
   const jacket=h.parts[0],pa=jacket.geometry.attributes.position,si=jacket.geometry.attributes.skinIndex,sw=jacket.geometry.attributes.skinWeight;for(let i=0;i<pa.count;i++)if(pa.getY(i)<.90||(pa.getY(i)<.96&&Math.abs(pa.getZ(i))<=.25))for(let j=0;j<4;j++)if(sw.array[i*4+j]>0)assert.ok(si.array[i*4+j]<2,'jacket hem must not follow arms');

  }finally{h.dispose();}
 });
 test(`${data.triangles}: normalized rig, fixed feet, independent rifle grips and neutral restoration`,()=>{const h=createDogWorker(data);try{assert.equal(h.bones.length,17);for(const m of h.parts){const a=m.geometry.attributes;for(let i=0;i<a.position.count;i++){let sum=0;for(let k=0;k<4;k++){const w=a.skinWeight.array[i*4+k];assert.ok(w>=0&&w<=1);sum+=w;}assert.ok(Math.abs(sum-1)<1e-6);const p=new THREE.Vector3().fromBufferAttribute(a.position,i);assert.ok(m.applyBoneTransform(i,p.clone()).distanceTo(p)<1e-6);}}
   for(const heading of [0,37,90,173,225,315]){h.pose('carry',heading);const d=h.diagnostics();assert.ok(Math.abs(d.min[1])<1e-6);assert.equal(d.contacts.length,2);for(const c of d.contacts){assert.ok(c.error<1e-6);const m=h.parts.find(p=>p.name==='forearm and hand '+c.side),a=m.geometry.attributes.position,grip=new THREE.Vector3(...c.grip);let distance=Infinity;for(let i=0;i<a.count;i++)if(a.getY(i)<.77){const p=new THREE.Vector3().fromBufferAttribute(a,i);m.applyBoneTransform(i,p);p.applyMatrix4(m.matrixWorld);distance=Math.min(distance,p.distanceTo(grip));}assert.ok(distance<.016,'actual hand surface near independent rifle grip');}}
   h.pose('neutral');assert.equal(h.rifle.root.visible,false);for(const m of h.parts){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const original=new THREE.Vector3().fromBufferAttribute(p,i);assert.ok(m.applyBoneTransform(i,original.clone()).distanceTo(original)<1e-6);}}
  }finally{h.dispose();}
 });
}
test('10k variant is reduced from the stored 30k author, preserving every garment and head component',()=>{assert.equal(reduced.sourceTriangles,author.triangles);assert.ok(reduced.triangles/author.triangles<.35);for(let i=0;i<author.parts.length;i++){assert.equal(reduced.parts[i].name,author.parts[i].name);assert.equal(reduced.parts[i].sourceTriangles,author.parts[i].triangles);}});
