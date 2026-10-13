import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BIOME_TEXTURES} from '../dist/tactics/biome-foliage-data.js';
import {createBiomeMaterials} from '../dist/tactics/biome-foliage-paint.js';
import {createBiomePlantFactory} from '../dist/tactics/biome-foliage-models.js';
import {BIOME_OBSTACLES,OBSTACLE_LAYOUTS,obstacleCells,obstacleEdges} from '../dist/tactics/biome-obstacle-data.js';
import {createBiomeObstacleMaterials} from '../dist/tactics/biome-obstacle-paint.js';
import {biomeObstacleParts,createBiomeObstacleFactory} from '../dist/tactics/biome-obstacles.js';
import {tutorialFoliagePlan} from '../dist/tactics/biome-terrain-plan.js';
import {createBiomeTerrain,terrainCellOutline} from '../dist/tactics/biome-terrain.js';
import {DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {meanLinearRGB} from '../dist/tactics/biome-atlas-lod.js';

const source=fs.readFileSync(new URL('../dist/tactics/sector-library/tutorial-step-1/rough-plateau.json',import.meta.url),'utf8'),map=JSON.parse(source);
function setup(){
 const textures=Object.fromEntries([...Object.keys(BIOME_TEXTURES),'obstacles'].map(k=>[k,new T.Texture()])),plantMaterials=createBiomeMaterials(textures),obstacleMaterials=createBiomeObstacleMaterials(textures.obstacles),plantFactory=createBiomePlantFactory(plantMaterials),obstacleFactory=createBiomeObstacleFactory({...plantMaterials,...obstacleMaterials});
 return {textures,plantMaterials,obstacleMaterials,plantFactory,obstacleFactory,dispose(){obstacleFactory.dispose();plantFactory.dispose();for(const c of [plantMaterials,obstacleMaterials,textures])Object.values(c).forEach(o=>o.dispose());}};
}
function vertices(root,visit){root.updateMatrixWorld(true);const world=new T.Matrix4(),matrix=new T.Matrix4(),v=new T.Vector3();root.traverse(o=>{if(!o.isMesh)return;for(let n=0;n<(o.isInstancedMesh?o.count:1);n++){if(o.isInstancedMesh){o.getMatrixAt(n,matrix);world.multiplyMatrices(o.matrixWorld,matrix);}else world.copy(o.matrixWorld);for(let i=0;i<o.geometry.attributes.position.count;i++)visit(v.fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(world),o);}});}

test('large study preserves the saved plateau and declares its foliage-mask provenance',()=>{
 const before=JSON.stringify(map),p=tutorialFoliagePlan(map);assert.equal(JSON.stringify(map),before);assert.equal(p.width*p.depth,57600);assert.equal(p.cells.length,p.blocked.reduce((a,b)=>a+b,0));assert(p.cells.length>30000);assert.equal(p.source.props,642);assert.match(p.source.foliage,/Screenshot-inspired/);
 for(let z=0;z<p.depth;z++)for(let x=0;x<p.width;x++){
  let expected=0;for(let level=0;level<map.upper.length;level++)if(map.upper[level][x+','+z]&&map.upper[level][x+','+z]!=='void')expected=(level+1)*DIMENSIONS.floorSpacing;
  assert(Math.abs(p.heightAt(x,z)-expected)<1e-6);assert.equal(p.blockedAt(x,z),!!p.blocked[z*p.width+x]);
 }
 for(const [x,h,z]of Object.values(p.focus))for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){assert(!p.blockedAt(x+dx,z+dz));assert.equal(p.heightAt(x+dx,z+dz),h);}
 assert.equal(p.blockedAt(-1,50),false);assert.equal(p.heightAt(240,50),null);assert.throws(()=>tutorialFoliagePlan({width:5}),/240/);
});
test('cropped close detail uses full-region adjacency and never invents internal bog banks',()=>{
 const occupied=(x,z)=>x>=0&&x<10&&z>=0&&z<10,cells=[[4,4],[5,4],[4,5],[5,5]];
 assert(obstacleEdges(cells).some(e=>e.mask));assert(obstacleEdges(cells,{occupied}).every(e=>e.mask===0&&e.exposed.length===0));
 const middle=biomeObstacleParts('wetlands',cells,0,{occupied});assert(middle.parts.every(p=>p.shape==='surface-0'));
 const edge=biomeObstacleParts('wetlands',[[0,4],[0,5]],0,{occupied});assert(edge.edges.every(e=>e.exposed.join(',')==='west'));assert(edge.parts.some(p=>p.paint==='peat'));
 assert.throws(()=>obstacleEdges(cells,{occupied:true}),/function/);
});
test('saved starts and exit have clear rooms connected to the surrounding study routes',()=>{
 const p=tutorialFoliagePlan(map);assert.equal(p.reservedMarkers.length,5);assert.equal(p.source.sealedPinholes,3);
 for(const marker of p.reservedMarkers){const h=p.heightAt(marker.x,marker.z);for(const [x,z]of marker.corridor)for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){assert(!p.blockedAt(x+dx,z+dz));assert.equal(p.heightAt(x+dx,z+dz),h);}}
 for(const [x,z]of [[118,143],[117,144],[116,145]])assert(p.blockedAt(x,z));
 const open=new Set(),queue=[[30,30]];open.add('30,30');for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const u=x+dx,v=z+dz,key=u+','+v;if(p.heightAt(u,v)===p.heightAt(30,30)&&!p.blockedAt(u,v)&&!open.has(key)){open.add(key);queue.push([u,v]);}}}
 assert(open.size>1000);for(const m of p.reservedMarkers)assert(open.has(m.x+','+m.z));
});
test('distant atlas average is computed in linear light and ignores transparent RGB',()=>{
 assert.deepEqual(meanLinearRGB(new Uint8Array([0,0,0,255,255,255,255,255])),[.5,.5,.5]);
 assert.deepEqual(meanLinearRGB(new Uint8Array([255,0,0,0,0,255,0,255])),[0,1,0]);
 assert.deepEqual(meanLinearRGB(new Uint8Array([255,255,255,0])),[0,0,0]);
});
test('detail-only regions fade without replacing the ground and vary the main fallen logs',()=>{
 const cells=OBSTACLE_LAYOUTS.patch,empty=biomeObstacleParts('snow',cells,0,{detailOnly:true,density:()=>0});assert.equal(empty.parts.length,0);
 const detail=biomeObstacleParts('snow',cells,0,{detailOnly:true,density:()=>1});assert(detail.parts.every(p=>p.shape!=='crown'&&!p.shape.startsWith('surface')));
 const axes=new Set(detail.parts.filter(p=>p.paint==='brokenWood'&&p.width>.1).map(p=>Math.atan2(p.b[2]-p.a[2],p.b[0]-p.a[0]).toFixed(2)));assert(axes.size>=8,'Dominant logs repeat the same direction');
 const s=setup();try{const root=s.obstacleFactory.create('snow',{cells,detailOnly:true,density:()=>0});assert.deepEqual(root.userData.bounds,{min:[0,0,0],max:[0,0,0]});assert.equal(root.userData.triangles,0);}finally{s.dispose();}
});
test('neighbor masks join a large region without seams at chunk boundaries',()=>{
 const p=tutorialFoliagePlan(map);for(const [x,z]of p.cells.filter((_,i)=>i%31===0)){
  const h=p.heightAt(x,z),one=obstacleEdges([[x,z]],{occupied:(u,v)=>p.blockedAt(u,v)&&p.heightAt(u,v)===h})[0],outline=terrainCellOutline(p,x,z);
  assert.equal(outline.outside.filter(Boolean).length,one.exposed.length);
  for(const [u,v]of outline.points){assert(u>=x-.5&&u<=x+.5&&v>=z-.5&&v<=z+.5);}
 }
});
test('patch input validation is explicit about the close-detail limit',()=>{
 assert.throws(()=>obstacleCells([]),/1–256/);assert.throws(()=>obstacleCells(Array.from({length:257},(_,i)=>[i,0])),/1–256/);
 for(const c of [[[0,0],[0,0]],[[.5,0]],[[Infinity,0]],[[10001,0]]])assert.throws(()=>obstacleCells(c));
 assert.throws(()=>biomeObstacleParts('unknown'),/Unknown/);assert.throws(()=>biomeObstacleParts('jungle',[[0,0]],3),/variant/);
});
for(const family of Object.keys(BIOME_OBSTACLES))test(family+' close patches remain contained, deterministic and bounded in cost',()=>{
 const s=setup();try{for(const variant of [0,1,2])for(const cells of Object.values(OBSTACLE_LAYOUTS)){
  const root=s.obstacleFactory.create(family,{cells,variant}),metadata=root.userData,set=new Set(cells.map(c=>c.join(',')));assert.equal(metadata.traversal.gameplayIntegrated,false);assert.deepEqual(metadata.cells,obstacleCells(cells));assert.deepEqual(biomeObstacleParts(family,cells,variant),biomeObstacleParts(family,cells,variant));
  const b=new T.Box3();vertices(root,v=>{assert(v.toArray().every(Number.isFinite));assert(v.y>=-.000001);assert([.49999,.50001].some(dx=>[.49999,.50001].some(dz=>set.has(Math.floor(v.x+dx)+','+Math.floor(v.z+dz)))),'vertex extends outside blocked cells: '+v.toArray());b.expandByPoint(v);});
  for(const key of ['min','max'])for(let i=0;i<3;i++)assert(Math.abs(metadata.bounds[key][i]-b[key].toArray()[i])<1e-6);
  assert(metadata.triangles<=cells.length*(family==='wetlands'?850:650));s.obstacleFactory.release(root);assert.equal(s.obstacleFactory.liveCount,0);
 }}finally{s.dispose();}
});
for(const family of Object.keys(BIOME_OBSTACLES))test(family+' whole terrain retains all clear cells, stable elevations and bounded geometry',()=>{
 const s=setup(),p=tutorialFoliagePlan(map),terrain=createBiomeTerrain(p,family,{ground:s.plantMaterials.grey,cliff:s.plantMaterials.grey,...s});
 try{
  assert.equal(terrain.stats.blockedCells,p.cells.length);assert(terrain.stats.batches<12);assert(terrain.stats.baseTriangles<300000);
  for(const tree of terrain.trees){const {min,max}=tree.bounds;for(let z=Math.floor(min[2]+.5);z<=Math.floor(max[2]+.5);z++)for(let x=Math.floor(min[0]+.5);x<=Math.floor(max[0]+.5);x++){assert(p.blockedAt(x,z),'Canopy obscures a clear tile');assert.equal(p.heightAt(x,z),tree.y,'Canopy bridges an elevation change');}}
  let triangles=0;terrain.root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});assert(triangles<4000000,'Whole-map geometry budget: '+triangles);
  vertices(terrain.dense,v=>{assert(v.toArray().every(Number.isFinite));const xs=[Math.floor(v.x+.4999),Math.floor(v.x+.5001)],zs=[Math.floor(v.z+.4999),Math.floor(v.z+.5001)];assert(xs.some(x=>zs.some(z=>p.blockedAt(x,z))),'Blocked fill crossed a clear cell');});
  const owned=new Map(),borrowed=new Map();terrain.root.traverse(o=>{if(o.geometry&&!owned.has(o.geometry)){owned.set(o.geometry,0);o.geometry.addEventListener('dispose',()=>owned.set(o.geometry,owned.get(o.geometry)+1));}if(o.isInstancedMesh){owned.set(o,0);o.addEventListener('dispose',()=>owned.set(o,owned.get(o)+1));}});for(const r of [...Object.values(s.plantFactory.geometries),...Object.values(s.plantMaterials),...Object.values(s.obstacleMaterials)]){borrowed.set(r,0);r.addEventListener('dispose',()=>borrowed.set(r,borrowed.get(r)+1));}
  terrain.dispose();terrain.dispose();for(const [r,n]of owned)assert.equal(n,borrowed.has(r)?0:1);for(const n of borrowed.values())assert.equal(n,0);
 }finally{terrain.dispose();s.dispose();}
});
test('detail disposal releases instances exactly once and never owns caller paint',()=>{
 const s=setup(),root=s.obstacleFactory.create('jungle'),counts=new Map();for(const o of [...root.children,...Object.values(s.obstacleFactory.geometries),...Object.values(s.obstacleMaterials),...Object.values(s.textures)]){counts.set(o,0);o.addEventListener('dispose',()=>counts.set(o,counts.get(o)+1));}
 s.obstacleFactory.release(root);s.obstacleFactory.release(root);s.obstacleFactory.dispose();s.obstacleFactory.dispose();for(const o of [...root.children,...Object.values(s.obstacleFactory.geometries)])assert.equal(counts.get(o),1);for(const o of [...Object.values(s.obstacleMaterials),...Object.values(s.textures)])assert.equal(counts.get(o),0);assert.throws(()=>s.obstacleFactory.create('jungle'),/disposed/);s.dispose();
});
