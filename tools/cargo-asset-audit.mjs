import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {CARGO_SKINS,CARGO_LABELS,createCargoLibrary} from '../dist/tactics/painted-cargo.js';
import {PAINTED_PROP_FORMS,cargoFinish} from '../dist/tactics/battle-environment.js';
import {EXPLOSIVE_BARREL} from '../dist/tactics/explosive-barrels.js';

// Record real label drawing commands in Node. Browser checks additionally render
// the resulting CanvasTexture; this audit needs no optional native canvas package.
export function withCargoCanvas(run){
 const previous=globalThis.document,commands=[];
 const context=Object.fromEntries(['beginPath','moveTo','lineTo','closePath','fill','fillRect','strokeRect','fillText','save','translate','rotate','restore','bezierCurveTo','quadraticCurveTo','stroke','arc'].map(name=>[name,(...args)=>commands.push([name,...args])]));
 globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return {getContext:kind=>{assert.equal(kind,'2d');return context;}};}};
 try{return run(commands);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
export function auditExplosiveBarrel(){
 const form=PAINTED_PROP_FORMS[EXPLOSIVE_BARREL],finish=cargoFinish({kind:EXPLOSIVE_BARREL,form});
 assert.equal(form,'barrel-single');assert.equal(finish.skin,'explosiveRed');assert.equal(finish.label,'flammable');
 assert.equal(CARGO_SKINS[finish.skin].family,'barrel');assert.equal(CARGO_SKINS[finish.skin].atlas,'cargo');assert.ok(CARGO_LABELS[finish.label]);
 const original=new T.Texture(),cargo=new T.Texture(),library=createCargoLibrary(original,cargo);
 try{withCargoCanvas(commands=>{
  const model=library.build(form,finish.skin,finish.label),labels=[],paint=[];
  model.root.traverse(mesh=>{if(!mesh.isMesh)return;
   assert.ok(mesh.geometry.attributes.position.count);assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));
   if(mesh.userData.cargoLabel)labels.push(mesh);
   if(mesh.material.customProgramCacheKey()==='cargo-flammable-red')paint.push(mesh);
  });
  assert.equal(labels.length,2);assert.ok(labels.every(m=>m.material.map.isCanvasTexture&&m.material.map.image.width===512&&m.material.map.image.height===384));
  assert.ok(commands.some(c=>c[0]==='fillText'&&c[1]==='FLAMMABLE'));assert.ok(commands.some(c=>c[0]==='bezierCurveTo'));
  assert.ok(paint.length);for(const mesh of paint){assert.equal(mesh.material.map.source,cargo.source);const shader={fragmentShader:'#include <map_fragment>'};mesh.material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/vec3\(\.85,\.085,\.04\)/);}
 });}finally{library.dispose();original.dispose();cargo.dispose();}
}
