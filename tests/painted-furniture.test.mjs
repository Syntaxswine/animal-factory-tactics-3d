import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {FURNITURE_FORMS,FURNITURE_FINISHES,createFurnitureLibrary} from '../dist/tactics/painted-furniture.js';
const atlas=new THREE.Texture();
test('furniture fits declared footprints, has finite geometry and contacts its mounting surface',()=>{
 const library=createFurnitureLibrary(atlas,atlas);
 for(const f of FURNITURE_FORMS)for(const skin of Object.keys(FURNITURE_FINISHES)){
  const {root,bounds:b}=library.build(f.id,skin),[w,d]=f.tiles;
  assert(b.min.x>=-w/2-.005&&b.max.x<=w/2+.005,f.id+' width');
  if(f.wall){assert(b.min.z>=-.03&&b.max.z<1,f.id+' wall projection');assert.equal(root.getObjectByName('mount').position.z,0);}
  else{assert(b.min.z>=-d/2-.005&&b.max.z<=d/2+.005,f.id+' depth');assert(Math.abs(b.min.y)<.005,f.id+' ground contact');}
  root.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array,...o.geometry.attributes.normal.array].every(Number.isFinite));}});
 }
 library.dispose();
});
test('fixtures have downward passive emitter anchors and no active lighting',()=>{
 const library=createFurnitureLibrary(atlas,atlas);
 for(const f of FURNITURE_FORMS){const {root}=library.build(f.id);const emitters=[];
  root.traverse(o=>{assert(!o.isLight);if(o.material)assert.equal(o.material.emissive.getHex(),0);if(o.userData.role==='future-light')emitters.push(o);});
  assert.equal(emitters.length,f.light?(f.id==='streetlight-double'?2:1):0);
  for(const a of emitters){assert.equal(a.userData.enabled,false);assert(new THREE.Vector3(0,0,-1).applyQuaternion(a.quaternion).y<-.999);}
  if(f.light)assert(root.getObjectByName('mount'));
 }
 library.dispose();
});
test('repeated collection changes retain shared resources and disposal is idempotent',()=>{
 const library=createFurnitureLibrary(atlas,atlas),cycle=()=>{for(const f of FURNITURE_FORMS)for(const skin of Object.keys(FURNITURE_FINISHES))library.build(f.id,skin);};
 cycle();const counts=library.stats();cycle();assert.deepEqual(library.stats(),counts);assert.throws(()=>library.build('missing'));assert.throws(()=>library.build('cabinet','missing'));
 library.dispose();assert.deepEqual(library.stats(),{geometries:0,materials:0,textures:0});assert.throws(()=>library.build('cabinet'));library.dispose();
});
