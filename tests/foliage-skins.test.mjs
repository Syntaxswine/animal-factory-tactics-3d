import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {decodePNG} from '../tools/png-rgba.mjs';
import {biomeFixture} from '../dist/tactics/biome-fixture.js';
import {biomePlans} from '../dist/tactics/biome-gameplay.js';
import {screenSurface,screenComposition,SCREEN_CHUNK_SIZE} from '../dist/tactics/foliage-screen-surface.js';
import {createFoliageScreens} from '../dist/tactics/foliage-screen-scene.js';
import {createScreenMaterials,SCREEN_PANELS} from '../dist/tactics/foliage-screen-paint.js';
import {BiomeScene} from '../dist/tactics/biome-scene.js';

const map=biomeFixture(),plans=biomePlans(map);
const ellipsoidTop=(s,x,z)=>Math.max(s.base,...s.lobes.map(l=>{
 const q=1-((x-l.center[0])/l.radius[0])**2-((z-l.center[2])/l.radius[2])**2;
 return q>=0?l.center[1]+l.radius[1]*Math.sqrt(q):s.base;
}));

test('canopy grouping follows world coordinates across chunk and sector borders',()=>{
 const a={origin:[0,0],seed:173},b={origin:[240,-240],seed:173};
 for(const [x,z]of [[23.5,24],[24,24],[239.5,117],[240,117],[-.5,42]]){
  assert.deepEqual(screenComposition(a,x,z),screenComposition(b,x-240,z+240));
  const left=screenComposition(a,x-.0001,z),right=screenComposition(a,x+.0001,z);
  for(const key of ['mass','angle','tone'])assert.ok(Math.abs(left[key]-right[key])<.001,'composition must not restart at a tile or chunk boundary');
 }
 assert.notDeepEqual(screenComposition(a,24,24),screenComposition({...a,seed:174},24,24));
});

test('screen art leaves serialized maps, seeded obstacle layout and open woodland unchanged',()=>{
 const before=JSON.stringify(map),world=JSON.stringify(plans[0].obstacles);
 for(const p of plans)screenSurface(p);
 assert.equal(JSON.stringify(map),before);assert.equal(JSON.stringify(plans[0].obstacles),world);
 assert.equal(screenSurface(plans.find(p=>p.level===2)).cells.length,0);
});

test('finite crown uses the owning cell even beside a much taller neighbour',()=>{
 const p=plans.find(p=>p.family==='wetlands'&&p.level===0),s=screenSurface(p),x=160.49,z=108.51,owner=p.obstacles.screens.find(c=>c.x===160&&c.y===109&&c.z===0);
 assert.ok(owner);assert.ok(Math.abs(s.roofAt(x,z,0)-ellipsoidTop(owner,x,z))<1e-9);
 for(const c of s.cells)for(const [dx,dz]of [[0,0],[.49,.49],[-.49,.49],[.49,-.49]])assert.ok(Math.abs(s.roofAt(c.x+dx,c.y+dz,c.base)-ellipsoidTop(c,c.x+dx,c.y+dz))<1e-9);
});

test('opaque core vertices stay within occupied cells, below finite crowns and on their ground',()=>{
 for(const p of plans){
  const surface=screenSurface(p),lookup=new Map(surface.cells.map(s=>[s.x+','+s.y,s]));
  for(const g of surface.chunks)for(let i=0;i<g.position.length;i+=3){
   const [x,h,z]=g.position.slice(i,i+3);assert.ok([x,h,z].every(Number.isFinite));
   const candidates=[];for(const cx of new Set([Math.floor(x+.5),Math.ceil(x-.5)]))for(const cz of new Set([Math.floor(z+.5),Math.ceil(z-.5)])){const s=lookup.get(cx+','+cz);if(s)candidates.push(s);}
   assert.ok(candidates.some(s=>h>=s.base-1e-6&&h<=ellipsoidTop(s,x,z)+1e-6),'core escaped an occupied finite cell');
  }
 }
});

test('near and far fan geometry stays spatially chunked and distant work is reduced',()=>{
 for(const p of plans)for(const g of screenSurface(p).chunks){
  const [cx,cz]=g.key.split(',').map(Number);
  for(const [x,z]of g.cells){assert.equal(Math.floor(x/SCREEN_CHUNK_SIZE),cx);assert.equal(Math.floor(z/SCREEN_CHUNK_SIZE),cz);}
  for(const data of [g,g.fringe,g.far,g.distant]){
   assert.ok(data.index.every(i=>i>=0&&i<data.position.length/3));
   for(let i=0;i<data.position.length;i+=3){assert.ok(data.position[i]>cx*24-2&&data.position[i]<(cx+1)*24+2);assert.ok(data.position[i+2]>cz*24-2&&data.position[i+2]<(cz+1)*24+2);}
  }
  assert.ok(g.far.index.length<=g.fringe.index.length);assert.ok(g.distant.index.length<=g.far.index.length);assert.equal(g.far.index.length%6,0);
 }
});

test('near and distant fans share exact occupancy/height mask, including open corridor and raised level',()=>{
 const textures=[new T.Texture(),new T.Texture()],materials=createScreenMaterials(...textures),bark=new T.MeshStandardMaterial(),scene=new BiomeScene(new T.Scene(),{});
 try{for(const plan of plans.filter(p=>screenSurface(p).cells.length)){
  const screens=createFoliageScreens(plan,{plantMaterials:{bark},screenMaterials:materials,decorate:m=>scene.material(m,plan.level,plan.width)}),meshes=[];
  screens.root.traverse(o=>{if(o.isMesh&&o.material.name.startsWith('thicket-fringe:'))meshes.push(o);});
  assert.ok(meshes.length>0);const material=meshes[0].material;
  const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  assert.ok(shader.uniforms.biomeVisibility,'fog survives chained paint and finite clipping');
  const data=shader.uniforms.fringeEnvelope.value.image.data;
  assert.equal(screens.root.userData.ownedTextureBytes,data.byteLength);
  const expected=new Map(plan.obstacles.screens.filter(s=>s.z===plan.level).map(s=>[s.y*plan.width+s.x,s]));
  for(let i=0;i<plan.width*plan.depth;i++){const s=expected.get(i);assert.equal(data[i*4+3],s?1:0);if(s){assert.ok(Math.abs(data[i*4]-s.base)<1e-6);assert.ok(Math.abs(data[i*4+1]-s.height)<1e-6);}}
  if(plan.level===0)for(let z=96;z<110;z++)assert.equal(data[(z*plan.width+107)*4+3],0,'narrow passage has no fringe');
  assert.match(shader.fragmentShader,/if\(vFringeWorld\.y>top\+\.04\)discard/);
  assert.match(shader.fragmentShader,/clamp\(vMapUv,0\.,1\.\)/);assert.match(shader.fragmentShader,/textureLod\(map,fringeUV,fringeLOD\)/);
  screens.update(32);const near=meshes.filter(m=>m.visible);screens.update(10);const far=meshes.filter(m=>m.visible);
  assert.ok(near.length&&far.length);assert.ok(near.every(m=>!far.includes(m)));assert.ok(far.reduce((n,m)=>n+m.geometry.index.count,0)<near.reduce((n,m)=>n+m.geometry.index.count,0));
  screens.update(8);const distant=meshes.filter(m=>m.visible);assert.ok(distant.length);assert.ok(distant.every(m=>!near.includes(m)&&!far.includes(m)));assert.ok(distant.reduce((n,m)=>n+m.geometry.index.count,0)<far.reduce((n,m)=>n+m.geometry.index.count,0));
  screens.dispose();
 }}finally{scene.dispose();for(const m of Object.values(materials))m.dispose();bark.dispose();textures.forEach(t=>t.dispose());}
});

test('screen disposal releases owned geometry, finite mask and clone without destroying shared paint',()=>{
 const textures=[new T.Texture(),new T.Texture()],materials=createScreenMaterials(...textures),bark=new T.MeshStandardMaterial(),p=plans.find(p=>p.family==='wetlands'&&p.level===0);
 const screens=createFoliageScreens(p,{plantMaterials:{bark},screenMaterials:materials}),geometries=new Set(),clones=new Set();let sharedDisposed=0;
 for(const m of Object.values(materials))m.addEventListener('dispose',()=>sharedDisposed++);
 screens.root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);if(!Object.values(materials).includes(o.material)&&o.material!==bark)clones.add(o.material);}});
 let disposed=0;for(const g of geometries)g.addEventListener('dispose',()=>disposed++);
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};[...clones][0].onBeforeCompile(shader);let maskDisposed=0;shader.uniforms.fringeEnvelope.value.addEventListener('dispose',()=>maskDisposed++);
 screens.dispose();assert.equal(disposed,geometries.size);assert.equal(maskDisposed,1);assert.equal(sharedDisposed,0);
 for(const m of Object.values(materials))m.dispose();bark.dispose();textures.forEach(t=>t.dispose());
});

test('dedicated paint atlases have all six panels and real cutout alpha',()=>{
 const root=new URL('../dist/assets/environment/foliage-screens/',import.meta.url);
 for(const name of ['screen-atlas-v1.png','fringe-atlas-v1.png']){
  const png=decodePNG(fs.readFileSync(new URL(name,root)));assert.equal(png.width/3,png.height/2);assert.equal(png.width,1536);
  if(name.startsWith('fringe'))for(const panel of Object.values(SCREEN_PANELS)){
   const [col,row]=panel;let clear=0,solid=0;for(let y=row*512;y<(row+1)*512;y++)for(let x=col*512;x<(col+1)*512;x++){const a=png.pixels[(y*png.width+x)*4+3];if(a<10)clear++;if(a>127)solid++;}
   assert.ok(clear>10000&&solid>10000,'each panel must contain paint and real transparency');
  }
 }
 for(const name of ['PROMPT.json','FRINGE-PROMPT.json'])assert.ok(JSON.stringify(JSON.parse(fs.readFileSync(new URL(name,root)))).length>300);
});
