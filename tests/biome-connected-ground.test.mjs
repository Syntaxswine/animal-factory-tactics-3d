import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createGroundComposition} from '../dist/tactics/biome-ground-composition.js';
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
test('invalid family or seed does not silently generate a different terrain',()=>{for(const seed of [-1,NaN,1.2,2**32])assert.throws(()=>createGroundComposition(plan(),'temperate',seed));assert.throws(()=>createGroundComposition(plan(),'unknown'));});
test('five exported sets contain 64 neighboring tiles with current source fingerprints',()=>{
 const assets=new URL('../dist/assets/environment/connected-ground/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',assets))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 for(const [file,hash]of Object.entries(manifest.sourceHashes))assert.equal(sha(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url),'utf8').replaceAll('\r\n','\n')),hash,'Re-export connected tile sets');
 assert.equal(manifest.assets.length,5);for(const a of manifest.assets){const png=fs.readFileSync(new URL(a.file,assets));assert.equal(sha(png),a.sha256);assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);assert.equal(a.tiles.length,64);for(const t of a.tiles){assert.deepEqual(t.world,[a.origin[0]+t.column,a.origin[1]+t.row]);assert.deepEqual(t.rect,[t.column*64,t.row*64,64,64]);}}
});
