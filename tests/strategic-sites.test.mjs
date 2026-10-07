import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {STRATEGIC_SITES,SITE_SLAB_HEIGHT,createStrategicSiteLibrary} from '../dist/tactics/strategic-sites.js';
const within=(n,target,tolerance=1e-5)=>assert(Math.abs(n-target)<tolerance,n+' is not near '+target);
const fixture=fn=>{const atlas=new THREE.Texture(),library=createStrategicSiteLibrary(atlas);try{fn(library,atlas);}finally{library.dispose();atlas.dispose();}};
const each=fn=>fixture(l=>{for(const s of STRATEGIC_SITES)for(const state of ['intact','destroyed'])fn(l.build(s.id,{state}));});
test('all six complete sites fit an 8 x 8 tile footprint, including rotated rubble',()=>each(({root})=>{
 for(let q=0;q<4;q++){
  root.rotation.y=q*Math.PI/2;root.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(root,true);
  within(b.min.y,0);within(b.min.x,-4);within(b.max.x,4);within(b.min.z,-4);within(b.max.z,4);
  root.traverse(o=>{if(o.isMesh){
   const p=o.geometry.attributes.position;
   for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert(Math.abs(v.x)<=4.00001&&Math.abs(v.z)<=4.00001&&v.y>=-.00001,root.name+' leaks outside its footprint');}
  }});
 }
}));
test('loose mast, reflector and launcher debris each contacts the slab without sinking',()=>each(({root,state})=>{
 if(state!=='destroyed')return;
 const contacts=root.children.filter(g=>g.userData.groundContact);assert(contacts.length>=3,root.name+' needs independently grounded debris');
 for(const g of contacts){
  const b=new THREE.Box3().setFromObject(g,true);within(b.min.y,SITE_SLAB_HEIGHT);
  let near=0;g.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){
   const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
   if(v.y<SITE_SLAB_HEIGHT+.012)near++;
   assert(v.y>=SITE_SLAB_HEIGHT-.00001,g.name+' below slab');
  }}});assert(near>=3,g.name+' must make physical contact, not hover');
 }
}));
test('destroyed sites preserve foundation locations and use a materially lower silhouette',()=>fixture(l=>{
 for(const site of STRATEGIC_SITES){
  const a=l.build(site.id),b=l.build(site.id,{state:'destroyed'});
  const name=site.id==='sam'?'launcher-foundation':'tower-foundations';
  const left=new THREE.Box3().setFromObject(a.root.getObjectByName(name),true),right=new THREE.Box3().setFromObject(b.root.getObjectByName(name),true);
  for(const axis of ['x','z']){within(left.min[axis],right.min[axis]);within(left.max[axis],right.max[axis]);}
  assert(b.bounds.max.y<a.bounds.max.y*.7,site.id+' still has an intact silhouette');
  assert(b.bounds.max.y>1,site.id+' lost recognizable structure');
 }
}));
test('materials use valid atlas regions and all geometry has finite UVs and normals',()=>each(({root})=>{
 let painted=0,triangles=0,meshes=0;
 root.traverse(o=>{
  assert(!o.isLight,'Presentation props must not create gameplay lights');
  if(!o.isMesh)return;meshes++;triangles+=o.geometry.attributes.position.count/3;
  for(const key of ['position','normal','uv'])assert([...o.geometry.attributes[key].array].every(Number.isFinite),root.name+' invalid '+key);
  for(const n of o.geometry.attributes.uv.array)assert(n>=-.0001&&n<=1.0001,'UV escapes its assigned material');
  const t=o.material.map;
  if(t){painted++;assert(t.offset.x>=0&&t.offset.y>=0&&t.offset.x+t.repeat.x<=1&&t.offset.y+t.repeat.y<=1);assert.equal(t.colorSpace,THREE.SRGBColorSpace);}
 });
 assert(painted>meshes*.65,'Painted surfaces should carry the detail');
 assert(triangles<16000,'Unexpected geometry expansion');assert(meshes<45,'Unbatched prop draw calls');
}));
test('site clones keep independent transforms and bounded shared resources',()=>fixture(l=>{
 const a=l.build('radio'),b=l.build('radio'),counts=l.stats();
 a.root.position.set(7,2,4);a.root.children[0].visible=false;
 assert.deepEqual(b.root.position.toArray(),[0,0,0]);assert.equal(b.root.children[0].visible,true);
 const ga=[],gb=[];a.root.traverse(o=>{if(o.geometry)ga.push(o.geometry);});b.root.traverse(o=>{if(o.geometry)gb.push(o.geometry);});assert.equal(ga[0],gb[0]);
 for(let n=0;n<20;n++)for(const site of STRATEGIC_SITES)for(const state of ['intact','destroyed'])l.build(site.id,{state});
 assert.deepEqual(l.stats(),counts);
}));
test('disposal releases each shared resource once without disposing caller atlas',()=>fixture((l,atlas)=>{
 const resources=new Set();let atlasDisposed=0;atlas.addEventListener('dispose',()=>atlasDisposed++);
 for(const site of STRATEGIC_SITES)for(const state of ['intact','destroyed'])l.build(site.id,{state}).root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material){resources.add(o.material);if(o.material.map)resources.add(o.material.map);}});
 const disposed=new Map();for(const r of resources)r.addEventListener('dispose',()=>disposed.set(r,(disposed.get(r)||0)+1));
 l.dispose();l.dispose();assert.equal(atlasDisposed,0);
 for(const r of resources)assert.equal(disposed.get(r),1,'Resource missed or double-disposed');
 assert.deepEqual(l.stats(),{geometries:0,materials:0,textures:0,templates:0,disposed:true});
 assert.throws(()=>l.build('radio'),/disposed/);
}));
test('invalid asset requests fail explicitly',()=>fixture(l=>{
 assert.throws(()=>l.build('missing'),/Unknown/);assert.throws(()=>l.build('sam',{state:'broken'}),/Unknown/);
 assert.throws(()=>createStrategicSiteLibrary(null),/atlas/);
}));
test('intact radar reflector clears the maintenance deck',()=>fixture(l=>{
 const {root}=l.build('radar'),deck=root.getObjectByName('maintenance-platform'),dish=root.getObjectByName('radar-reflector');
 const surface=new THREE.Raycaster(new THREE.Vector3(.3,4.8,-.25),new THREE.Vector3(0,-1,0),0,2).intersectObject(deck,true);
 assert(surface.length>0,'Maintenance deck missing');
 const bottom=new THREE.Box3().setFromObject(dish,true).min.y;
 assert(bottom>surface[0].point.y+.12,'Reflector rim penetrates platform');
 // Check the raised side rails as well as the deck surface. A global bounding
 // box cannot distinguish the clear center opening from a rail intersection.
 const b=new THREE.Box3().setFromObject(deck,true);
 for(let x=b.min.x;x<=b.max.x;x+=.025)for(let z=b.min.z;z<=b.max.z;z+=.05){
  const r=new THREE.Raycaster(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0),0,10);
  const a=r.intersectObject(deck,true),d=r.intersectObject(dish,true);
  if(a.length&&d.length)assert(d.at(-1).point.y-a[0].point.y>.05,'Reflector intersects a platform rail');
 }
}));
test('asset manifest reflects actual geometry and references existing authored files',()=>fixture(l=>{
 const url=new URL('../dist/assets/environment/strategic-sites/manifest.json',import.meta.url),manifest=JSON.parse(fs.readFileSync(url));
 assert.equal(manifest.assets.length,6);assert.equal(manifest.status,'integrated-gameplay-assets');
 assert(fs.existsSync(new URL(manifest.atlas,url)));assert(fs.existsSync(new URL(manifest.library,url)));
 for(const entry of manifest.assets){
  const a=l.build(entry.siteId,{state:entry.state});let triangles=0,meshes=0;
  a.root.traverse(o=>{if(o.isMesh){triangles+=o.geometry.attributes.position.count/3;meshes++;}});
  assert.equal(entry.triangles,triangles);assert.equal(entry.drawCalls,meshes);within(entry.height,a.bounds.max.y,.001);
  assert.deepEqual(entry.tiles,[8,8]);assert(fs.existsSync(new URL(entry.reference,url)));
 }
}));
