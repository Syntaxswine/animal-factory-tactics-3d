import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createCliffMantle,createCliffMantleSurface,CLIFF_MANTLE_TILES} from '../dist/tactics/cliff-mantle.js';
import {checkModuleClosure} from '../tools/check-module-closure.mjs';

test('natural cliff mantle surface keeps the actual cliff kit at the same two-unit lip and landing as the roof',()=>{
 const surface=createCliffMantleSurface();try{
  assert.equal(surface.mesh.geometry.userData.set,'ledge');
  assert.equal(surface.mesh.geometry.userData.height,2);
  assert.equal(surface.mesh.geometry.userData.climbable,true);
  assert.equal(CLIFF_MANTLE_TILES.length,12);
  const bounds=new T.Box3().setFromObject(surface.root);
  assert.deepEqual(bounds.min.toArray(),[0,0,-2]);assert.deepEqual(bounds.max.toArray(),[3,2,2]);
  surface.root.updateMatrixWorld(true);
  for(const x of [.0001,.2,.7,1.5,2.99])for(const z of [-1.99,-.5,0,.5,1.99]){
   const hits=new T.Raycaster(new T.Vector3(x,3,z),new T.Vector3(0,-1,0)).intersectObject(surface.root,true);
   assert(hits.length,'missing landing');assert(Math.abs(hits[0].point.y-2)<1e-9,'landing height');
  }
  assert.equal(new T.Raycaster(new T.Vector3(-.01,3,0),new T.Vector3(0,-1,0)).intersectObject(surface.root,true).length,0);
 }finally{surface.dispose();}
});

for(const profile of ANIMAL_MOTION_CATALOG)test(profile.id+': cliff adapter uses the same wall-height contact plane through the complete mantle',()=>{
 const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))));
 const surface=createCliffMantleSurface(),motion=createCliffMantle(worker,profile);let upperContacts=0;
 try{
  surface.root.updateMatrixWorld(true);assert(motion.duration>=6&&motion.duration<=7);
  for(let i=0;i<=100;i++){
   const d=motion.apply(i/100);assert(d.root.every(Number.isFinite));
   for(const c of d.contacts){
    if(!c.planted||!c.point||c.point[1]<1.9)continue;
    const [x,y,z]=c.point;assert(Math.abs(y-2)<1e-6,'contact plane');
    // Lip contacts can sit exactly on x=0; cast a submillimetre inside the cap.
    const hits=new T.Raycaster(new T.Vector3(Math.max(.0001,x),3,z),new T.Vector3(0,-1,0)).intersectObject(surface.root,true);
    assert(hits.length,'support outside cliff landing '+JSON.stringify(c));
    assert(Math.abs(hits[0].point.y-y)<1e-6,'surface/contact mismatch');upperContacts++;
   }
  }
  assert(upperContacts>10,'no sustained top support');assert.equal(!!motion.apply(.5).unarmed,!!profile.unarmed);
 }finally{motion.dispose();surface.dispose();worker.dispose();}
});

test('cliff study adapter and literal imports are included in the published module graph',()=>{
 const script=fs.readFileSync(new URL('../tools/build-tactics-3d.mjs',import.meta.url),'utf8');
 assert(script.includes("'cliff-mantle.js'"),'adapter omitted from packaging');
 assert(checkModuleClosure(new URL('../dist/',import.meta.url),['tactics/roof-mantle-study.js'])>10);
});
