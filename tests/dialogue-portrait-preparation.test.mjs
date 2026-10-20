import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {withSpeakingHead,rigSpeakingHead,speakingHeadFile} from '../dist/tactics/speaking-head.js';
import {preparePortraitRig} from '../dist/tactics/dialogue-rig-preparation.js';
import {createModelPaint,prepareModelPaintProjection} from '../dist/tactics/horse-model-paint.js';
const json=async file=>JSON.parse(await fs.readFile(new URL('../dist/tactics/'+file,import.meta.url),'utf8'));
function release(r){r.skeleton.dispose();r.dispose();}
for(const id of ['horse','donkey','sheep','goat'])test(id+': transferred portrait geometry matches the original fitted rig and has independent bones',async()=>{
 const p=ANIMAL_MOTION_CATALOG.find(p=>p.id===id),data=await json(p.file),head=await json(speakingHeadFile(id)),parts=preparePortraitRig(p,data,head),original=p.create(withSpeakingHead(data,head)),portrait=p.create({...data,preparedParts:parts});
 let speech;
 try{
  assert.equal(portrait.parts.length,original.parts.length);
  original.parts.forEach((part,i)=>{const other=portrait.parts[i];assert.deepEqual(other.geometry.index.array,part.geometry.index.array);for(const [key,attr]of Object.entries(part.geometry.attributes))assert.deepEqual(other.geometry.attributes[key].array,attr.array,id+'/'+part.name+'/'+key);});
  const before=original.skeleton.bones.map(b=>b.matrixWorld.toArray());speech=rigSpeakingHead(portrait,head);speech.setJaw(.15);portrait.root.updateMatrixWorld(true);assert.deepEqual(original.skeleton.bones.map(b=>b.matrixWorld.toArray()),before);assert.notEqual(portrait.skeleton,original.skeleton);
 }finally{speech?.dispose();release(portrait);release(original);}
});
function renderer(){let target=null;const views=[],targets=new Set(),disposed=new Set();return {views,targets,disposed,outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.ACESFilmicToneMapping,capabilities:{getMaxAnisotropy:()=>1},compileAsync:async()=>{},getRenderTarget:()=>target,getClearColor:c=>c,getClearAlpha:()=>1,getViewport:v=>v,getScissor:v=>v,getScissorTest:()=>false,getPixelRatio:()=>1,setClearColor(){},setScissorTest(){},clear(){},setViewport(){},setScissor(){},render(scene,camera){views.push({camera:camera.position.toArray(),parts:scene.children.map(m=>[m.geometry.attributes.position.count,m.material.uniforms.partId.value])});},setRenderTarget(t){target=t;if(t&&!targets.has(t)){targets.add(t);t.addEventListener('dispose',()=>disposed.add(t));}}};}
test('asynchronous portrait projection keeps the four game paint views and releases its target on abort',async()=>{
 const p=ANIMAL_MOTION_CATALOG[0],worker=p.create(await json(p.file)),a=renderer(),b=renderer(),texture=new THREE.Texture({width:2,height:2});texture.userData.paintValidity=new Uint8Array(4).fill(255);
 let direct,prepared;
 try{direct=createModelPaint(a,worker,texture);const target=await prepareModelPaintProjection(b,worker);prepared=createModelPaint(b,worker,texture,{preparedProjection:target});assert.deepEqual(b.views,a.views);assert.equal(b.outputColorSpace,THREE.SRGBColorSpace);assert.equal(b.toneMapping,THREE.ACESFilmicToneMapping);prepared.dispose();assert.ok(b.disposed.has(target));
 const c=renderer(),abort=new AbortController();c.compileAsync=async()=>abort.abort();await assert.rejects(prepareModelPaintProjection(c,worker,undefined,abort.signal),/cancelled/);assert.equal(c.views.length,0);assert.equal(c.outputColorSpace,THREE.SRGBColorSpace);
 }finally{direct?.dispose();texture.dispose();release(worker);}
});
