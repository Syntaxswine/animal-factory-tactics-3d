import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {FURNITURE_FORMS,FURNITURE_FINISHES,createFurnitureLibrary,animateFurnitureFire} from '../dist/tactics/painted-furniture.js';
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

test('fire flicker loops continuously without drift and resets to authored transforms',()=>{
 const library=createFurnitureLibrary(atlas,atlas);
 for(const id of ['cooking-fire','campfire','standing-torch','wall-torch']){const {root}=library.build(id),fire=root.getObjectByName('flames'),snapshot=()=>fire.children.flatMap(o=>[...o.scale.toArray(),o.rotation.z,...o.material.color.toArray()]);
  const authored=snapshot();animateFurnitureFire(root,.2);animateFurnitureFire(root,null);assert.deepEqual(snapshot(),authored);const rest=snapshot();animateFurnitureFire(root,.37);const first=snapshot();assert.notDeepEqual(first,rest);animateFurnitureFire(root,4.37);snapshot().forEach((n,i)=>assert(Math.abs(n-first[i])<1e-12));
  for(let i=0;i<1000;i++)animateFurnitureFire(root,i/60);animateFurnitureFire(root,null);assert.deepEqual(snapshot(),rest);
  fire.visible=false;animateFurnitureFire(root,1);assert.deepEqual(snapshot(),rest);
 }
 library.dispose();
});

test('guard tower preserves 3x3 supports, 5x5 deck and an unobstructed ladder aperture',()=>{
 const library=createFurnitureLibrary(atlas,atlas),{root,form}=library.build('wooden-guard-tower'),data=root.userData.tower,H=data.deckHeight;
 assert.deepEqual(form.tiles,[5,5]);assert.equal(data.stories,3);assert(Math.abs(H-6.36)<1e-9);
 const posts=[],deck=[];root.traverse(o=>{if(o.name==='support-post')posts.push(o);if(['deck-plank','deck-beam','deck-joist','hatch-header'].includes(o.name))deck.push(o);});assert.equal(posts.length,4);
 const bounds=new THREE.Box3();for(const p of posts)bounds.union(new THREE.Box3().setFromObject(p));assert(bounds.min.x>=-1.5&&bounds.max.z<=1.5&&bounds.max.x-bounds.min.x>2.9);
 const band=root.getObjectByName("iron-post-band"),bandBox=new THREE.Box3().setFromObject(band),postBox=new THREE.Box3().setFromObject(posts[0]);assert(bandBox.min.x<postBox.min.x&&bandBox.max.z>postBox.max.z,"bands must stand proud of timber");
 const ray=new THREE.Raycaster();for(const x of [-.40,0,.40])for(const z of [1.35,1.75,2.15]){ray.set(new THREE.Vector3(x,H+.1,z),new THREE.Vector3(0,-1,0));ray.far=.6;assert.equal(ray.intersectObjects(deck,false).length,0,'hidden geometry across ladder aperture');}
 ray.set(new THREE.Vector3(0,H+.1,0),new THREE.Vector3(0,-1,0));assert(ray.intersectObjects(deck,false).length>0,'main deck missing');
 library.dispose();
});

test('stair guardhouses have six ascending flights and an open top entrance',()=>{
 const library=createFurnitureLibrary(atlas,atlas);
 for(const id of ['wood-stair-tower','iron-stair-tower','wood-wrap-tower','iron-wrap-tower']){const {root}=library.build(id),meta=root.userData.stairTower,treads=[],walls=[];assert.deepEqual(meta.guardhouse,[3,3]);
  root.traverse(o=>{if(o.name==='stair-tread')treads.push(o);if(['door-wall','door-jamb','door-lintel'].includes(o.name))walls.push(o);});assert.equal(treads.length,54);
  for(let i=0;i<treads.length;i++)assert(Math.abs(treads[i].position.y+.035-(i+1)*1.06/9)<1e-8);
  const overhead=[];root.traverse(o=>{if(['stair-tread','stair-landing','entry-landing','guardhouse-floor','roof-panel'].includes(o.name))overhead.push(o);});
  const clearance=new THREE.Raycaster();clearance.far=1.65;for(const tread of treads){const pos=tread.position.clone();pos.y+=.046;clearance.set(pos,new THREE.Vector3(0,1,0));assert.equal(clearance.intersectObjects(overhead,false).length,0,'stair headroom obstructed');}
  const ray=new THREE.Raycaster();ray.far=.5;for(const z of [-1.16,-.8,-.44])for(const y of [.2,.9,1.6]){if(meta.layout==='wraparound')ray.set(new THREE.Vector3(z,meta.deckHeight+y,-1.8),new THREE.Vector3(0,0,1));else ray.set(new THREE.Vector3(.8,meta.deckHeight+y,z),new THREE.Vector3(-1,0,0));assert.equal(ray.intersectObjects(walls,false).length,0,'blocked guardhouse entrance');}
 }
 library.dispose();
});
