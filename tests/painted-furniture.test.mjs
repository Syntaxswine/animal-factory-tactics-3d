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
test('fixtures have correctly directed passive emitter anchors and no active lighting',()=>{
 const library=createFurnitureLibrary(atlas,atlas);
 for(const f of FURNITURE_FORMS){const {root}=library.build(f.id);const emitters=[];
  root.traverse(o=>{assert(!o.isLight);if(o.material)assert.equal(o.material.emissive.getHex(),0);if(o.userData.role==='future-light')emitters.push(o);});
  assert.equal(emitters.length,f.light?(f.id==='streetlight-double'?2:1):0);
  for(const a of emitters){assert.equal(a.userData.enabled,false);const direction=new THREE.Vector3(0,0,-1).applyQuaternion(a.getWorldQuaternion(new THREE.Quaternion()));const tower=['wooden-spotlight-tower','iron-searchlight-stair-tower','iron-searchlight-ladder-tower'].includes(f.id);if(f.id==='spotlight')assert(direction.z>.999);else assert(direction.y<(tower?-.15:-.999));if(tower){assert(direction.z>.9);assert.equal(a.userData.distribution,'spot');}}
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
 for(const id of ['wood-stair-tower','iron-stair-tower','wood-wrap-tower','iron-wrap-tower','wood-large-wrap-tower','iron-large-wrap-tower']){const {root}=library.build(id),meta=root.userData.stairTower,treads=[],walls=[];assert.deepEqual(meta.guardhouse,id.includes("-large-")?[5,5]:[3,3]);
  root.traverse(o=>{if(o.name==='stair-tread')treads.push(o);if(['door-wall','door-jamb','door-lintel'].includes(o.name))walls.push(o);});assert.equal(treads.length,54);
  for(let i=0;i<treads.length;i++)assert(Math.abs(treads[i].position.y+.035-(i+1)*1.06/9)<1e-8);
  if(id.includes('-large-')){const floorBox=new THREE.Box3();root.traverse(o=>{if(o.name==='guardhouse-floor')floorBox.union(new THREE.Box3().setFromObject(o));});assert(Math.abs(floorBox.max.x-floorBox.min.x-5)<.02&&Math.abs(floorBox.max.z-floorBox.min.z-5)<.02);const treadBox=new THREE.Box3().setFromObject(treads[0]);assert(Math.abs(treadBox.max.z-treadBox.min.z-.88)<.01,'perimeter stairs must retain width');}
  const overhead=[];root.traverse(o=>{if(['stair-tread','stair-landing','entry-landing','guardhouse-floor','roof-panel'].includes(o.name))overhead.push(o);});
  const clearance=new THREE.Raycaster();clearance.far=1.65;for(const tread of treads){const pos=tread.position.clone();pos.y+=.046;clearance.set(pos,new THREE.Vector3(0,1,0));assert.equal(clearance.intersectObjects(overhead,false).length,0,'stair headroom obstructed');}
  const ray=new THREE.Raycaster();ray.far=.5;for(const z of [-1.16,-.8,-.44])for(const y of [.2,.9,1.6]){if(meta.layout==='wraparound')ray.set(new THREE.Vector3(id.includes("-large-")?z*5/3:z,meta.deckHeight+y,id.includes("-large-")?-2.8:-1.8),new THREE.Vector3(0,0,1));else ray.set(new THREE.Vector3(.8,meta.deckHeight+y,z),new THREE.Vector3(-1,0,0));assert.equal(ray.intersectObjects(walls,false).length,0,'blocked guardhouse entrance');}
 }
 library.dispose();
});

test('spotlight tower preserves ladder clearance and aims beyond its railing',()=>{const library=createFurnitureLibrary(atlas,atlas);try{const {root}=library.build('wooden-spotlight-tower'),fixture=root.getObjectByName('spotlight'),emitter=root.getObjectByName('emitter-0');root.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(0,10,1.75),new THREE.Vector3(0,-1,0),0,4);assert.equal(ray.intersectObject(fixture,true).length,0);const direction=new THREE.Vector3(0,0,-1).applyQuaternion(emitter.getWorldQuaternion(new THREE.Quaternion()));ray.set(emitter.getWorldPosition(new THREE.Vector3()),direction);ray.far=4;assert.equal(ray.intersectObject(root,true).length,0,'spotlight aims into its own hardware or railing');assert(root.getObjectByName('spotlight-reflector'));assert(root.getObjectByName('spotlight-housing'));}finally{library.dispose();}});

test('iron tower searchlight mounts ahead of the wall and clears its outgoing beam',()=>{const library=createFurnitureLibrary(atlas,atlas);try{const {root}=library.build('iron-searchlight-stair-tower');root.updateMatrixWorld(true);assert.equal(root.userData.stairTower.layout,'switchback');assert(root.getObjectByName('searchlight-wall-plate'));const f=root.getObjectByName('spotlight');let nearest=Infinity;f.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)nearest=Math.min(nearest,new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).z);}});assert(nearest>1.55,'housing embedded in wall');const e=root.getObjectByName('emitter-0'),direction=new THREE.Vector3(0,0,-1).applyQuaternion(e.getWorldQuaternion(new THREE.Quaternion())),ray=new THREE.Raycaster(e.getWorldPosition(new THREE.Vector3()),direction,0,5);assert.equal(ray.intersectObject(root,true).length,0);assert(direction.y<-.3&&direction.z>.9);let treads=0;root.traverse(o=>{if(o.name==='stair-tread')treads++;});assert.equal(treads,54);}finally{library.dispose();}});

test('all seven stair towers have ladder variants with clear climbs and door approaches',()=>{const library=createFurnitureLibrary(atlas,atlas),variants=FURNITURE_FORMS.filter(f=>f.source);assert.equal(variants.length,7);assert.equal(new Set(variants.map(f=>f.source)).size,7);try{for(const f of variants){const {root}=library.build(f.id),meta=root.userData.stairTower,H=meta.deckHeight,large=f.id.includes('-large-'),rear=meta.entrySide==='-Z',edge=large?2.5:1.5,doorZ=large?-.8*5/3:-.8,outer=edge+.94,rungs=[],stiles=[];assert.equal(meta.access,'ladder');assert.equal(meta.flights,0);root.traverse(o=>{assert(!['stair-tread','stair-landing','stair-handrail'].includes(o.name));if(o.name==='ladder-rung')rungs.push(o);if(o.name==='ladder-stile')stiles.push(o);});assert.equal(stiles.length,f.id==='iron-searchlight-ladder-tower'?6:2);assert.equal(rungs.length,22);assert(Math.abs(Math.max(...stiles.map(m=>new THREE.Box3().setFromObject(m).max.y))-(H+.93))<.01);if(f.id==='iron-searchlight-ladder-tower'){assert.equal(meta.exitWidth,.94);assert.ok(Math.abs(meta.door.z[1]-meta.door.z[0]-1.155)<1e-10);assert.equal(meta.door.height,1.90);const upper=stiles.filter(m=>m.position.y>H+.35);assert.equal(upper.length,2);assert.ok(Math.abs(Math.abs(upper[1].position.z-upper[0].position.z)-.94)<1e-10);}const point=(x,y,z)=>rear?new THREE.Vector3(z,y,-x):new THREE.Vector3(x+meta.coreOffsetX,y,z);const ray=new THREE.Raycaster(point(outer+.16,.06,doorZ),new THREE.Vector3(0,1,0),0,H+1.7);assert.equal(ray.intersectObject(root,true).length,0,'outside climb blocked '+f.id);ray.set(point(edge+.50,H+.1,doorZ),new THREE.Vector3(0,1,0));ray.far=1.65;assert.equal(ray.intersectObject(root,true).length,0,'landing headroom '+f.id);ray.set(point(edge+.4,H+.8,doorZ),rear?new THREE.Vector3(0,0,1):new THREE.Vector3(-1,0,0));ray.far=.7;assert.equal(ray.intersectObject(root,true).length,0,'door approach blocked '+f.id);assert.equal(!!root.getObjectByName('emitter-0'),!!f.light);}}finally{library.dispose();}});
