import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {lightPasses,LightRenderer} from '../dist/tactics/light-renderer.js';
import {createConnectedGroundSkin} from '../dist/tactics/biome-connected-ground.js';
const capabilities={maxTextures:16,maxVertexTextures:16,maxCombinedTextures:32};
test('light passes respect fragment and combined limits and retain every enabled light',()=>{
 for(const n of [0,1,2,3,4,5,7,8,12]){
  const lights=Array.from({length:n},()=>({castShadow:true})),passes=lightPasses(capabilities,lights);
  assert.deepEqual(passes.flat(),lights);assert(passes[0].length<=3);
  for(const [i,p]of passes.entries()){assert(12+p.length+(i===0?1:0)<=16);assert(1+12+p.length+(i===0?1:0)<=32);}
 }
 const lights=Array.from({length:4},()=>({castShadow:true}));
 assert.deepEqual(lightPasses(capabilities,lights).map(p=>p.length),[3,1]);
 assert.deepEqual(lightPasses({...capabilities,maxCombinedTextures:16},lights).map(p=>p.length),[2,2]);
 assert.deepEqual(lightPasses(capabilities,lights,{baseShadows:0}).map(p=>p.length),[4]);
 assert.deepEqual(lightPasses(capabilities,lights,{baseShadows:0,shadows:false}).map(p=>p.length),[4]);
 assert.throws(()=>lightPasses({...capabilities,maxVertexTextures:0},lights),/budget/);
});
test('additional lighting includes only local direct light and restores state, including on a failed pass',()=>{
 for(const fail of [false,true]){
  const scene=new T.Scene(),sun=new T.DirectionalLight(),ambient=new T.HemisphereLight(),lights=Array.from({length:4},()=>new T.PointLight());sun.castShadow=true;lights.forEach(l=>l.castShadow=true);scene.add(sun,ambient,...lights);
  const material=new T.MeshStandardMaterial({emissive:0x123456,emissiveIntensity:2,alphaTest:.5}),effect=new T.Mesh(new T.PlaneGeometry(),new T.MeshBasicMaterial({transparent:true})),body=new T.Mesh(new T.PlaneGeometry(),material);scene.add(body,effect);
  scene.background=new T.Color(0x222222);scene.fog=new T.Fog(0x333333,2,20);const oldFog=scene.fog,oldBackground=scene.background,previousTarget={label:'caller target'},passes=[];
  const originalCompile=effect.material.onBeforeCompile,originalKey=effect.material.customProgramCacheKey;
  const renderer={capabilities,shadowMap:{enabled:true},autoClear:true,getDrawingBufferSize:v=>v.set(320,200),getRenderTarget:()=>previousTarget,setRenderTarget(t){this.target=t;},render(s){passes.push({local:lights.filter(l=>l.visible).length,sun:sun.visible,ambient:ambient.visible,effect:effect.visible,emissive:material.emissiveIntensity,depth:material.depthFunc,blend:material.blending});if(passes.length===2){const shader={fragmentShader:'void main(){if(alpha<0.5)discard;\n#include <opaque_fragment>\n}'};effect.material.onBeforeCompile(shader,this);assert.match(shader.fragmentShader,/void localLightMaskMain/);assert.match(shader.fragmentShader,/discard/);assert.match(shader.fragmentShader,/gl_FragColor.rgb=vec3\(0.0\)/);}if(fail&&passes.length===2)throw Error('test failure');}};
  const batch=new LightRenderer();if(fail)assert.throws(()=>batch.render(renderer,scene,new T.Camera(),lights),/test failure/);else batch.render(renderer,scene,new T.Camera(),lights);
  assert.deepEqual(passes[0],{local:3,sun:true,ambient:true,effect:true,emissive:2,depth:T.LessEqualDepth,blend:T.NormalBlending});
  assert.deepEqual(passes[1],{local:1,sun:false,ambient:false,effect:true,emissive:0,depth:T.LessEqualDepth,blend:T.NormalBlending});
  assert.equal(renderer.target,previousTarget);assert.equal(renderer.autoClear,true);assert.equal(scene.fog,oldFog);assert.equal(scene.background,oldBackground);assert(lights.every(l=>l.visible));assert(sun.visible&&ambient.visible&&effect.visible);assert.equal(material.emissiveIntensity,2);assert.equal(material.transparent,false);assert.equal(material.alphaTest,.5);assert.equal(effect.material.onBeforeCompile,originalCompile);assert.equal(effect.material.customProgramCacheKey,originalKey);
  batch.dispose();body.geometry.dispose();effect.geometry.dispose();material.dispose();effect.material.dispose();
 }
});
test('worker overview releases preview storage before resizing and closes late results after disposal',async()=>{
 const previous=globalThis.Worker,workers=[];globalThis.Worker=class{constructor(){workers.push(this);}postMessage(){}terminate(){this.terminated=true;}};
 const canvasFactory=()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})});
 try{
  const skin=createConnectedGroundSkin({width:24,depth:24,blockedAt:()=>false,heightAt:()=>0},'temperate',{canvasFactory}),texture=skin.overview,preview=texture.image;
  const bitmap={width:48,height:48,close(){this.closed=true;}},events=[];texture.addEventListener('dispose',()=>events.push({image:texture.image,width:texture.image.width}));
  workers[0].onmessage({data:{type:'overview',image:bitmap}});
  assert.equal(events[0].image,preview);assert.equal(events[0].width,12);assert.equal(preview.width,1);assert.equal(skin.overview,texture);assert.equal(texture.image,bitmap);assert.equal(texture.version,2);assert.equal(await skin.whenReady(),true);
  skin.dispose();skin.dispose();assert.equal(events.length,2);assert.equal(bitmap.closed,true);assert(workers[0].terminated);
  const late={close(){this.closed=true;}};workers[0].onmessage({data:{type:'page',image:late}});assert(late.closed);assert.equal(skin.pages.size,0);
 }finally{if(previous===undefined)delete globalThis.Worker;else globalThis.Worker=previous;}
});
