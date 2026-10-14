import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createBiomeObstacleMaterials} from '../dist/tactics/biome-obstacle-paint.js';
import {createBiomeGround} from '../dist/tactics/biome-foliage-paint.js';
import {createGroundComposition,bogLandAt,createBogLandField} from '../dist/tactics/biome-ground-composition.js';
import {createConnectedGroundSkin} from '../dist/tactics/biome-connected-ground.js';
function plan(){const width=96,depth=96,blockedAt=(x,z)=>Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<width&&z<depth&&x!==45&&z!==51,heightAt=(x,z)=>x<0||z<0||x>=width||z>=depth?null:z<64?0:2.12;return {width,depth,blockedAt,heightAt};}
for(const family of ['temperate','jungle','snow','dry','wetlands'])test(family+' world painting is deterministic, unique, and contains joined multi-tile features',()=>{
 const p=plan(),c=createGroundComposition(p,family,173),again=createGroundComposition(p,family,173),other=createGroundComposition(p,family,829);
 assert.deepEqual(c.features,again.features);assert.deepEqual(c.regions,again.regions);assert.notDeepEqual(c.features,other.features);assert.notDeepEqual(c.regions,other.regions);
 assert(c.stats.paintedLogs>20);assert.equal(new Set(c.features.map(f=>f.recipe.inkSeed)).size,c.features.length);
 assert(c.features.some(f=>f.length>6&&Math.floor((f.min[0]+.5)/24)!==Math.floor((f.max[0]+.5)/24)),'A long feature should cross a render block');
 for(const f of c.features){assert.equal(f.length,f.recipe.length*f.size);for(let z=Math.floor(f.min[1]+.5);z<=Math.floor(f.max[1]+.5);z++)for(let x=Math.floor(f.min[0]+.5);x<=Math.floor(f.max[0]+.5);x++){assert(p.blockedAt(x,z),'Paint bridges a path');assert.equal(p.heightAt(x,z),f.height,'Paint bridges an elevation');}}
 // Reject the old 3/8/24-tile periodic field, not simply a different atlas index.
 for(const offset of [3,8,24]){let distance=0;for(let i=0;i<30;i++){const x=8+i*1.17,z=12+i*.31,a=c.colorAt(x,z),b=c.colorAt(x+offset,z);distance+=a.reduce((n,v,k)=>n+Math.abs(v-b[k]),0);}assert(distance>80);}
 for(const region of [[0,0,24,24],[23.5,23.5,26,26],[40,40,8,8]]){const [x,z,w,d]=region;assert.deepEqual(c.query(...region),c.features.filter(f=>f.max[0]>x&&f.min[0]<x+w&&f.max[1]>z&&f.min[1]<z+d));}
});
test('each grown material bed is connected like the overmap settlement frontier',()=>{
 const c=createGroundComposition(plan(),'temperate'),seen=new Set(),cols=c.regionColumns,rows=c.regionRows;
 for(let i=0;i<c.regions.length;i++){if(seen.has(i))continue;const region=c.regions[i],queue=[i];seen.add(i);for(let j=0;j<queue.length;j++){const index=queue[j],x=index%cols,z=Math.floor(index/cols);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,n=nz*cols+nx;if(nx>=0&&nz>=0&&nx<cols&&nz<rows&&!seen.has(n)&&c.regions[n]===region){seen.add(n);queue.push(n);}}}assert.equal(queue.length,[...c.regions].filter(v=>v===region).length,'Disconnected region '+region);}
});
test('grey/headless planning allocates no textures and releases safely',()=>{
 const skin=createConnectedGroundSkin(plan(),'temperate',{canvasFactory:()=>null});assert.equal(skin.stats.textureBytes,0);assert.equal(skin.stats.canvasBytes,0);assert.equal(skin.pages.size,0);skin.update([],{},40);skin.dispose();skin.dispose();assert(skin.composition.features.length>0);
});

test('bog patches vary with the seed and join across render chunks and neighboring sectors',()=>{
 const p={width:24,depth:24,origin:[0,0]},a=createBogLandField(p),again=createBogLandField(p),b=createBogLandField({...p,origin:[24,0]}),c=createBogLandField({...p,origin:[0,24]});
 assert.deepEqual(a.data,again.data);assert.notDeepEqual(a.data,createBogLandField(p,829).data);
 assert(a.data.filter(v=>v<26).length>a.data.length*.2,'open water remains between patches');
 assert(a.data.filter(v=>v>200).length>a.data.length*.15,'the bog includes visible land');
 assert.equal(a.data.byteLength,(24*2+2)**2,'land paint adds only a small single-channel field');
 for(let z=0;z<a.depth;z++)for(let halo=0;halo<2;halo++)assert.equal(a.data[z*a.width+a.width-2+halo],b.data[z*b.width+halo]);
 for(let x=0;x<a.width;x++)for(let halo=0;halo<2;halo++)assert.equal(a.data[(a.depth-2+halo)*a.width+x],c.data[halo*c.width+x]);
 for(let z=0;z<48;z+=.31)assert(Math.abs(bogLandAt(23.5-.0001,z)-bogLandAt(23.5+.0001,z))<.002,'no render-block seam');
});

test('connected wetland paint preserves the water atlas inside the bog but not on walkable ground',()=>{
 const previousWorker=globalThis.Worker,atlas=new T.Texture(),materials=createBiomeObstacleMaterials(atlas),ground=createBiomeGround(atlas,'wetlands');
 // Only the material assembly is under test; defer asynchronous canvas baking.
 globalThis.Worker=class{postMessage(){}terminate(){}};
 const canvasFactory=()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})});
 const compile=m=>{const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);return shader;};
 const preserveWater='groundColor=mix(groundColor,bogSurface,mix(1.,edgeWash,groundEdgeEnabled));';
 try{
  for(const edgeBlend of [true,false]){
   const skin=createConnectedGroundSkin(plan(),'wetlands',{canvasFactory,underlay:ground,edgeBlend});
   const water=materials.bogWater.clone(),path=ground.clone();water.onBeforeCompile=materials.bogWater.onBeforeCompile;path.onBeforeCompile=ground.onBeforeCompile;
   try{
    skin.attach(water,{index:0});skin.attach(path,{index:0},{layer:'path'});
    const wet=compile(water),dry=compile(path);
    assert.match(wet.fragmentShader,/diffuseColor.rgb\*=obstaclePaint/,'the actual bog atlas is sampled before edge blending');
    assert.ok(wet.fragmentShader.includes(preserveWater),'fully opaque forest-floor paint must not replace the water interior');
    assert.ok(wet.fragmentShader.includes('vec3 bogSurface=mix(diffuseColor.rgb,groundColor,bogLandAmount);'),'the mask selects water and peat instead of replacing the entire bog');
    assert.equal(wet.uniforms.bogLand.value,skin.bogMap);
    assert.equal(dry.uniforms.bogLand,undefined,'passable ground never samples the bog land mask');
    let released=0;skin.bogMap.addEventListener('dispose',()=>released++);skin.dispose();skin.dispose();assert.equal(released,1);assert.equal(skin.stats.bogBytes,0);
    assert.equal(wet.uniforms.groundEdgeEnabled.value,edgeBlend?1:0);
    assert.equal(water.roughness,materials.bogWater.roughness);
    assert.ok(!dry.fragmentShader.includes(preserveWater),'walkable wetland grass stays dry');
    assert.ok(wet.uniforms.groundEdge.value===dry.uniforms.groundEdge.value,'water and ground use the same bank boundary');
   }finally{water.dispose();path.dispose();skin.dispose();}
  }
  const skin=createConnectedGroundSkin(plan(),'wetlands',{canvasFactory}),water=materials.bogWater.clone();water.onBeforeCompile=materials.bogWater.onBeforeCompile;
  try{skin.attach(water,{index:0});assert.ok(compile(water).fragmentShader.includes('groundColor=bogSurface;'),'water and land survive without an underlay too');}finally{skin.dispose();water.dispose();}
  const forest=createConnectedGroundSkin(plan(),'temperate',{canvasFactory,underlay:ground}),brush=materials.bramble.clone();brush.onBeforeCompile=materials.bramble.onBeforeCompile;
  try{forest.attach(brush,{index:0});assert.ok(!compile(brush).fragmentShader.includes(preserveWater),'forest connected paint remains enabled');}finally{forest.dispose();brush.dispose();}
 }finally{if(previousWorker===undefined)delete globalThis.Worker;else globalThis.Worker=previousWorker;ground.dispose();Object.values(materials).forEach(m=>m.dispose());atlas.dispose();}
});
test('invalid family or seed does not silently generate a different terrain',()=>{for(const seed of [-1,NaN,1.2,2**32])assert.throws(()=>createGroundComposition(plan(),'temperate',seed));assert.throws(()=>createGroundComposition(plan(),'unknown'));});
test('five exported sets contain 64 neighboring tiles with current source fingerprints',()=>{
 const assets=new URL('../dist/assets/environment/connected-ground/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',assets))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 for(const [file,hash]of Object.entries(manifest.sourceHashes))assert.equal(sha(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url),'utf8').replaceAll('\r\n','\n')),hash,'Re-export connected tile sets');
 assert.equal(manifest.assets.length,5);for(const a of manifest.assets){const png=fs.readFileSync(new URL(a.file,assets));assert.equal(sha(png),a.sha256);assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);assert.equal(a.tiles.length,64);for(const t of a.tiles){assert.deepEqual(t.world,[a.origin[0]+t.column,a.origin[1]+t.row]);assert.deepEqual(t.rect,[t.column*64,t.row*64,64,64]);}}
});
