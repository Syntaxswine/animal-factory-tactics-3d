import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {CARGO_SKINS,createCargoLibrary,DRUM_HEIGHT,DRUM_RADIUS} from '../dist/tactics/painted-cargo.js';
import {createBarrelBlastMotion,BARREL_TIME,barrelBlastState} from '../dist/tactics/barrel-blast-motion.js';
import {createPaintedBlastEffects,localFireCells} from '../dist/tactics/painted-blast-effects.js';
import {createTankBlastEffects} from '../dist/tactics/tank-blast-effects.js';
const contract=JSON.parse(fs.readFileSync(new URL('../dist/tactics/fixtures/tank-blast-contract.json',import.meta.url)));
const V=(...a)=>new T.Vector3(...a),skins=Object.entries(CARGO_SKINS).filter(([,s])=>s.family==='barrel').map(([id])=>id);
function minY(root){root.updateMatrixWorld(true);let y=Infinity;const p=V();root.traverse(m=>{if(m.isMesh){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)y=Math.min(y,p.fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld).y);}});return y;}
function triangleCount(root){let count=0;root.traverse(m=>{if(m.isMesh)count+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;});return count;}
for(const skin of skins)for(const orientation of ['upright','sideways'])test(`${skin} ${orientation}: exact cargo shell, source-centred rupture, grounded debris and reverse playback`,()=>{
 const atlas=new T.Texture(),library=createCargoLibrary(atlas,atlas),motion=createBarrelBlastMotion(library,{skin,orientation});
 const original=[];motion.intact.traverse(m=>{if(m.isMesh)original.push([m.geometry,m.geometry.attributes.position.array.slice(),m.material,m.material.opacity]);});
 try{
  assert.equal(motion.fragments.length,8);assert.equal(motion.origin.y,(orientation==='upright'?DRUM_HEIGHT/2:DRUM_RADIUS)+.003);
  assert.equal(motion.fragments.reduce((n,f)=>n+triangleCount(f.root),0),triangleCount(motion.intact),'rupture dropped or duplicated parts of the original drum');
  const initial=motion.apply(BARREL_TIME.burst-.000001);assert.equal(initial.intactVisible,true);assert.equal(initial.visibleFragments,0);
  const burst=motion.apply(BARREL_TIME.burst);assert.equal(burst.intactVisible,false);assert.equal(burst.visibleFragments,8);
  for(let time=.55;time<3.5;time+=.027){motion.apply(time);for(const f of motion.fragments)if(f.root.visible){assert.ok(minY(f.root)>=-.00001,'shell crossed the floor');assert.ok(f.root.matrixWorld.elements.every(Number.isFinite));}}
  const sample=time=>{motion.apply(time);return motion.fragments.map(f=>({p:f.root.position.toArray(),q:f.root.quaternion.toArray(),visible:f.root.visible}));};
  const expected=sample(.84);sample(5.4);assert.deepEqual(sample(.84),expected);assert.equal(motion.apply(5.4).visibleFragments,0);
  const restored=motion.apply(0);assert.ok(restored.intactVisible);assert.equal(restored.visibleFragments,0);assert.ok(minY(motion.intact)>=-.00001);
  for(const [geometry,positions,material,opacity]of original){assert.deepEqual(geometry.attributes.position.array,positions);assert.equal(material.opacity,opacity);}
 }finally{motion.dispose();library.dispose();atlas.dispose();}
});

test('fragments leave the actual drum continuously, settle and release only owned resources',()=>{
 const atlas=new T.Texture(),library=createCargoLibrary(atlas,atlas),motion=createBarrelBlastMotion(library),released=[];let atlasDisposed=false;
 atlas.addEventListener('dispose',()=>atlasDisposed=true);
 const borrowed=library.stats();let borrowedGeometryDisposed=false;motion.model.root.traverse(m=>m.geometry?.addEventListener('dispose',()=>borrowedGeometryDisposed=true));
 for(const f of motion.fragments)for(const m of f.root.children)for(const resource of [m.geometry,m.material,m.customDepthMaterial])resource.addEventListener('dispose',()=>released.push(resource.uuid));
 const source=motion.fragments.map(f=>f.center.clone());motion.apply(.550001);motion.fragments.forEach((f,i)=>assert.ok(f.root.position.distanceTo(source[i])<.00001));
 for(const f of motion.fragments){motion.apply(.55+f.flight+.30);assert.ok(Math.abs(minY(f.root)-.003)<1e-6);}
 motion.dispose();const count=released.length;motion.dispose();assert.equal(released.length,count);assert.ok(count>0);assert.equal(new Set(released).size,count);
 assert.equal(atlasDisposed,false);assert.equal(borrowedGeometryDisposed,false);assert.deepEqual(library.stats(),borrowed);assert.ok(library.build('barrel-single','oxide'));
 library.dispose();atlas.dispose();
});

test('barrel uses the tank blast and dry-cell footprint with its own shell instead of tiny tank fragments',async()=>{
 const loader={loadAsync:async()=>new T.Texture()},scene=new T.Scene(),origin=V(0,.4,0),camera=new T.PerspectiveCamera();camera.position.set(3,5,8);
 const tank=await createTankBlastEffects(scene,loader,origin),barrel=await createPaintedBlastEffects(scene,loader,origin,{fragmentCount:0});
 try{
  assert.equal(tank.fragments.length,8);assert.equal(barrel.fragments.length,0);
  for(const entry of [contract.open,contract.water])for(const age of [-.1,.05,.35,.9,2,4]){
   const before=structuredClone(entry);tank.update(age,{camera,contract:entry});const d=barrel.update(age,{camera,contract:entry});
   assert.equal(d.fireCells,entry===contract.open?81:66);assert.deepEqual(entry,before);
   for(const name of ['core','lobes','smoke','ground']){const a=[tank[name]].flat(),b=[barrel[name]].flat();assert.equal(a.length,b.length);a.forEach((m,i)=>{assert.deepEqual(m.position.toArray(),b[i].position.toArray());assert.deepEqual(m.scale.toArray(),b[i].scale.toArray());assert.equal(m.visible,b[i].visible);});}
  }
  for(const p of contract.water.excluded)assert.ok(!localFireCells(contract.water).some(c=>c.x===p.x-contract.water.origin.x&&c.z===p.y-contract.water.origin.y));
 }finally{tank.dispose();barrel.dispose();}assert.equal(scene.children.length,0);
});

test('barrel timing is safe for invalid input and selectors reject unknown orientations',()=>{
 assert.equal(barrelBlastState(NaN).active,false);assert.equal(barrelBlastState(-1).time,0);
 const atlas=new T.Texture(),library=createCargoLibrary(atlas,atlas);try{assert.throws(()=>createBarrelBlastMotion(library,{orientation:'vertical-stack'}),/orientation/);}finally{library.dispose();atlas.dispose();}
});
