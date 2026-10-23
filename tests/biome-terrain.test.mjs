// Shape and culling regressions for large blocked regions, including artificial
// one-cell corridors which a broad cluster or simplified mesh must not bridge.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createBiomeTerrain} from '../dist/tactics/biome-terrain.js';
import {createTerrainFill} from '../dist/tactics/biome-terrain-fill.js';
import {createBiomeMaterials} from '../dist/tactics/biome-foliage-paint.js';
import {createBiomeObstacleMaterials} from '../dist/tactics/biome-obstacle-paint.js';
import {createBiomePlantFactory} from '../dist/tactics/biome-foliage-models.js';
function fixture(){const width=72,depth=72,blockedAt=(x,z)=>Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<width&&z<depth&&x!==29&&z!==35&&!(x>42&&x<49&&z>40&&z<60),heightAt=(x,z)=>x<0||z<0||x>=width||z>=depth?null:z>=48?2.12:0,cells=[];for(let z=0;z<depth;z++)for(let x=0;x<width;x++)if(blockedAt(x,z))cells.push([x,z]);return {width,depth,cells,blockedAt,heightAt};}
function setup(family){const textures=Object.fromEntries(['original','foliage','ground','obstacles'].map(k=>[k,new T.Texture()])),plantMaterials=createBiomeMaterials(textures),obstacleMaterials=createBiomeObstacleMaterials(textures.obstacles),plantFactory=createBiomePlantFactory(plantMaterials),plan=fixture(),terrain=createBiomeTerrain(plan,family,{ground:plantMaterials.grey,cliff:plantMaterials.grey,plantMaterials,obstacleMaterials,plantFactory});return {plan,terrain,dispose(){terrain.dispose();plantFactory.dispose();for(const m of [...Object.values(plantMaterials),...Object.values(obstacleMaterials),...Object.values(textures)])m.dispose();}};}
function occupiedAt(p,v){return [.49999,.50001].some(dx=>[.49999,.50001].some(dz=>p.blockedAt(Math.floor(v.x+dx),Math.floor(v.z+dz))));}
for(const family of ['temperate','jungle','snow','dry','wetlands'])test(family+' meshes cannot bridge a one-cell route or concave clearing',()=>{
 const s=setup(family);try{
  const v=[new T.Vector3(),new T.Vector3(),new T.Vector3()],sample=new T.Vector3(),instance=new T.Matrix4(),matrix=new T.Matrix4();s.terrain.root.updateMatrixWorld(true);
  s.terrain.root.traverse(o=>{if(!o.isMesh||['Saved tutorial terrain','Two plateau tiers'].includes(o.name))return;const pos=o.geometry.attributes.position,indices=o.geometry.index;for(let j=0;j<(o.isInstancedMesh?o.count:1);j++){if(o.isInstancedMesh){o.getMatrixAt(j,instance);matrix.multiplyMatrices(o.matrixWorld,instance);}else matrix.copy(o.matrixWorld);for(let k=0;k<(indices?.count??pos.count);k+=3){for(let n=0;n<3;n++)v[n].fromBufferAttribute(pos,indices?indices.getX(k+n):k+n).applyMatrix4(matrix);for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){sample.set(0,0,0);for(let n=0;n<3;n++)sample.addScaledVector(v[n],weights[n]);assert(occupiedAt(s.plan,sample),'Triangle spans a clear route: '+o.name+' '+sample.toArray());}}}});
 }finally{s.dispose();}
});
test('chunk joins retain matching top positions, normals and paint at X/Z 24 and 48',()=>{
 const s=setup('snow');try{const seams=new Map();for(const m of s.terrain.denseMeshes){const {position:p,normal:n,color:c}=m.geometry.attributes;for(let i=0;i<p.count;i++){if(n.getY(i)<.1)continue;const x=p.getX(i),z=p.getZ(i);if(![23.5,47.5].some(v=>Math.abs(x-v)<1e-5||Math.abs(z-v)<1e-5))continue;const key=[x,p.getY(i),z].map(v=>v.toFixed(5)).join(','),values=[n.getX(i),n.getY(i),n.getZ(i),c.getX(i),c.getY(i),c.getZ(i)];if(seams.has(key)){const prior=seams.get(key);values.forEach((v,k)=>assert(Math.abs(v-prior[k])<1e-5,'Chunk seam differs at '+key));}else seams.set(key,values);}}assert(seams.size>200);}finally{s.dispose();}
});
test('snow drifts have broad coherent heights and no per-cell crown geometry',()=>{
 const p=fixture(),f=createTerrainFill(p,'snow'),coarse=[],near=[];for(let z=4;z<24;z++)for(let x=4;x<24;x++){coarse.push(Math.abs(f.height(x,z)-f.height(x+6,z)));near.push(Math.abs(f.height(x,z)-f.height(x+.1,z)));}const mean=a=>a.reduce((n,v)=>n+v,0)/a.length;assert(mean(coarse)>mean(near)*12);assert(mean(near)<.02);const s=setup('snow');try{assert.equal(s.terrain.stats.clusters,0);assert.equal(s.terrain.stats.logs,0);assert(s.terrain.groundSkin.composition.stats.paintedLogs>20);for(const c of s.terrain.chunks){assert(c.bounds.max.x-c.bounds.min.x<40);assert(c.bounds.max.z-c.bounds.min.z<40);}}finally{s.dispose();}
});
for(const family of ['temperate','jungle','snow','dry','wetlands'])test(family+' shadow proxies reduce submitted detail while preserving color geometry, tree placement, fog and cutaways',()=>{
 const s=setup(family);try{
  const {terrain}=s,focus=new T.Vector3(28,0,34),camera=new T.OrthographicCamera(-20,20,15,-15,.1,1000);camera.position.copy(focus).add(new T.Vector3(200,300,200));camera.lookAt(focus);camera.updateProjectionMatrix();
  const authored=JSON.stringify(terrain.trees),colorGeometry=terrain.chunks.flatMap(c=>c.meshes.filter(m=>!m.userData.shadowProxy).map(m=>m.geometry.attributes.position.array));
  const count=()=>{let n=0;terrain.root.traverseVisible(m=>{if(m.castShadow&&m.isMesh)n+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*(m.count||1);});return n;};
  terrain.update(camera,{focus,ppu:40,shadowDetail:'full'});const full=count();terrain.update(camera,{focus,ppu:40,shadowDetail:'proxy'});assert.ok(count()<full*.45,family+' shadow geometry must have a meaningful budget');
  assert.equal(JSON.stringify(terrain.trees),authored);assert.deepEqual(terrain.chunks.flatMap(c=>c.meshes.filter(m=>!m.userData.shadowProxy).map(m=>m.geometry.attributes.position.array)),colorGeometry);
  const shadows=terrain.treeInstances.filter(m=>m.userData.shadowProxy);assert.ok(shadows.length);assert.ok(shadows.every(m=>m.material.colorWrite===false&&m.material.depthWrite===false));
  for(const c of terrain.chunks)c.shadowKnown=false;terrain.update(camera,{focus,ppu:40});assert.equal(count(),0,'Unknown crowns cannot reveal hidden ground through shadows');
  terrain.update(camera,{focus,ppu:40,trees:false});assert.ok(shadows.every(m=>!m.parent.visible));
 }finally{s.dispose();}
});

test('LOD is exclusive, uses orthographic scale, and follows a translated region',()=>{
 const s=setup('temperate');try{const {terrain}=s,focus=new T.Vector3(28,0,34),camera=new T.OrthographicCamera(-12,12,9,-9,.1,1000);terrain.root.position.set(200,0,-300);focus.add(terrain.root.position);camera.position.copy(focus).add(new T.Vector3(200,300,200));camera.lookAt(focus);camera.updateProjectionMatrix();terrain.update(camera,{focus,ppu:40});assert(terrain.stats.visibleChunks<9);assert(terrain.stats.detailedChunks>0);for(const c of terrain.chunks)assert.notEqual(c.near.visible,c.far.visible);terrain.update(camera,{focus,ppu:2});assert.equal(terrain.stats.detailedChunks,0);assert.equal(terrain.stats.shadowChunks,0);terrain.update(camera,{focus,ppu:40,trees:false});assert(terrain.treeInstances.every(m=>!m.parent.visible));}finally{s.dispose();}
});

test('normal overview retains authored tree crowns; only tiny projected trees use proxies',()=>{
 const s=setup('temperate');try{
  const {terrain}=s,focus=new T.Vector3(28,0,34),camera=new T.OrthographicCamera(-34,34,23,-23,.1,1000);
  camera.position.copy(focus).add(new T.Vector3(200,300,200));camera.lookAt(focus);camera.updateProjectionMatrix();
  const before=JSON.stringify(terrain.trees);
  // Test first load, not a near view's retained hysteresis state.
  terrain.update(camera,{focus,ppu:14});const visible=terrain.chunks.filter(c=>c.inView&&c.treeHeight);
  assert.ok(visible.length);for(const c of visible){assert.equal(c.near.visible,true);assert.equal(c.far.visible,false);}
  terrain.update(camera,{focus,ppu:2});for(const c of terrain.chunks){assert.equal(c.near.visible,false);assert.equal(c.far.visible,true);}
  assert.equal(JSON.stringify(terrain.trees),before,'LOD never moves or scales trees');
 }finally{s.dispose();}
});
