import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {decodePNG} from '../tools/png-rgba.mjs';
import {biomeFixture} from '../dist/tactics/biome-fixture.js';
import {biomePlans} from '../dist/tactics/biome-gameplay.js';
import {screenSurface,screenComposition,screenClumpAt,SCREEN_CHUNK_SIZE} from '../dist/tactics/foliage-screen-surface.js';
import {createFoliageScreens} from '../dist/tactics/foliage-screen-scene.js';
import {createScreenMaterials,SCREEN_PANELS} from '../dist/tactics/foliage-screen-paint.js';
import {BiomeScene,biomeVisibilitySummary} from '../dist/tactics/biome-scene.js';

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
 const groups=new Map();for(let z=0;z<24;z++)for(let x=0;x<24;x++){const c=screenClumpAt(x,z,173);groups.set(c.key,(groups.get(c.key)||0)+1);assert.ok(Math.hypot(c.x-x,c.z-z)<5);}
 assert.ok(new Set(groups.values()).size>=5,'clump footprints must not repeat a uniform square');
 assert.notDeepEqual(screenClumpAt(24,24,173),screenClumpAt(24,24,174));
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

test('rooted cores use finite vertices and snow drifts taper to their true ground edge',()=>{
 for(const p of plans){
  const surface=screenSurface(p),lookup=new Map(surface.cells.map(s=>[s.x+','+s.y,s]));
  for(const g of surface.chunks)for(let i=0;i<g.position.length;i+=3){
   const [x,h,z]=g.position.slice(i,i+3);assert.ok([x,h,z].every(Number.isFinite));
   const candidates=[];for(const cx of new Set([Math.floor(x+.5),Math.ceil(x-.5)]))for(const cz of new Set([Math.floor(z+.5),Math.ceil(z-.5)])){const s=lookup.get(cx+','+cz);if(s)candidates.push(s);}
   // Rooted shrubs overlap cells and are clipped by the same shader as fans.
   // Snow's continuous drifts still keep their authored vertices in bounds.
   if(p.family==='snow')assert.ok(candidates.some(s=>h>=s.base-1e-6&&h<=ellipsoidTop(s,x,z)+1e-6),'snow escaped an occupied finite cell');
   else if(candidates.length)assert.ok(candidates.some(s=>h>=s.base-1e-6),'rooted core fell below the ground');
  }
 }
 const snow=plans.find(p=>p.family==='snow'&&p.level===0),surface=screenSurface(snow);
 for(const g of surface.chunks)assert.ok(Math.max(...g.position.filter((_,i)=>i%3===1))<1.6,'snow drift must not become a raised wall');
});

test('near and far fan geometry stays spatially chunked and distant work is reduced',()=>{
 for(const p of plans)for(const g of screenSurface(p).chunks){
  const [cx,cz]=g.key.split(',').map(Number);
  for(const [x,z]of g.cells){assert.equal(Math.floor(x/SCREEN_CHUNK_SIZE),cx);assert.equal(Math.floor(z/SCREEN_CHUNK_SIZE),cz);}
  for(const data of [g,g.fringe,g.far,g.distant]){
   assert.ok(data.index.every(i=>i>=0&&i<data.position.length/3));
   // Jittered 3-tile growing sites can share a plant across a chunk boundary,
   // with a bounded 9-cell halo. No batch may span the full sector.
   for(let i=0;i<data.position.length;i+=3){assert.ok(data.position[i]>cx*24-9&&data.position[i]<(cx+1)*24+9);assert.ok(data.position[i+2]>cz*24-9&&data.position[i+2]<(cz+1)*24+9);}
  }
  assert.ok(g.far.index.length<=g.fringe.index.length);assert.ok(g.distant.index.length<=g.far.index.length);assert.equal(g.far.index.length%6,0);
 }
});

test('near and distant fans share exact occupancy/height mask, including open corridor and raised level',()=>{
 const textures=[new T.Texture(),new T.Texture()],materials=createScreenMaterials(...textures),bark=new T.MeshStandardMaterial(),scene=new BiomeScene(new T.Scene(),{});
 try{for(const plan of plans.filter(p=>screenSurface(p).cells.length)){
  const screens=createFoliageScreens(plan,{plantMaterials:{bark},screenMaterials:materials,decorate:m=>scene.material(m,plan.level,plan.width)}),meshes=[];
  screens.root.traverse(o=>{if(o.isMesh&&o.material.name==='thicket-fringe:'+plan.family)meshes.push(o);});
  assert.ok(meshes.length>0);const material=meshes[0].material;
  const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  assert.ok(shader.uniforms.biomeVisibility,'fog survives chained paint and finite clipping');
  const data=shader.uniforms.fringeEnvelope.value.image.data;
  assert.equal(screens.root.userData.ownedTextureBytes,data.byteLength);
  const expected=new Map(plan.obstacles.screens.filter(s=>s.z===plan.level).map(s=>[s.y*plan.width+s.x,s]));
  for(let i=0;i<plan.width*plan.depth;i++){const s=expected.get(i);assert.equal(data[i*4+3],s?1:0);if(s){assert.ok(Math.abs(data[i*4]-s.base)<1e-6);assert.ok(Math.abs(data[i*4+1]-s.height)<1e-6);}}
  if(plan.level===0)for(let z=96;z<110;z++)assert.equal(data[(z*plan.width+107)*4+3],0,'narrow passage has no fringe');
  assert.match(shader.fragmentShader,/if\(vFringeWorld\.y>top\+\.04\)discard/);
  assert.match(shader.fragmentShader,/if\(vFringeWorld\.y<envelope\.r-\.04\)discard/);
  // Every visual leaf/root surface shares the same mask, including opaque
  // shrub cores; clipping only the alpha fans would leak into clear routes.
  screens.root.traverse(o=>{if(!o.isMesh||!o.material.name.startsWith('thicket'))return;const compiled={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};o.material.onBeforeCompile(compiled);assert.equal(compiled.uniforms.fringeEnvelope.value,shader.uniforms.fringeEnvelope.value);assert.ok(compiled.uniforms.biomeVisibility);assert.match(compiled.fragmentShader,/if\(envelope\.a<\.5\)discard/);});
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
 let disposed=0,materialsDisposed=0;for(const g of geometries)g.addEventListener('dispose',()=>disposed++);for(const m of clones)m.addEventListener('dispose',()=>materialsDisposed++);
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};[...clones][0].onBeforeCompile(shader);let maskDisposed=0;shader.uniforms.fringeEnvelope.value.addEventListener('dispose',()=>maskDisposed++);
 screens.dispose();assert.equal(disposed,geometries.size);assert.equal(materialsDisposed,clones.size);assert.equal(maskDisposed,1);assert.equal(sharedDisposed,0);
 for(const m of Object.values(materials))m.dispose();bark.dispose();textures.forEach(t=>t.dispose());
});

test('wood detail preserves every beam transform and hidden chunks return when revealed',()=>{
 const textures=[new T.Texture(),new T.Texture()],materials=createScreenMaterials(...textures),bark=new T.MeshStandardMaterial(),p=plans.find(p=>p.family==='temperate'&&p.level===0),screens=createFoliageScreens(p,{plantMaterials:{bark},screenMaterials:materials});
 try{
  const near=screens.root.children.filter(m=>m.name==='Solid cover boughs'),far=screens.root.children.filter(m=>m.name==='Distant cover boughs'),stems=screens.root.children.filter(m=>m.name==='Rooted fine branch supports');
  assert.equal(near.reduce((n,m)=>n+m.count,0),p.obstacles.wood.filter(w=>w.family===p.family&&w.source.z===p.level).length);
  assert.equal(near.length,far.length);for(let i=0;i<near.length;i++){assert.equal(near[i].count,far[i].count);assert.deepEqual(near[i].instanceMatrix.array,far[i].instanceMatrix.array);assert.ok(far[i].geometry.index.count<near[i].geometry.index.count/3);}
  screens.update(32,new T.Vector3(0,0,0));assert.ok(near.every(m=>!m.visible));assert.ok(far.every(m=>m.visible));assert.ok(stems.every(m=>!m.visible));
  screens.setVisibility(()=>false);screens.update(32);assert.ok(screens.root.children.every(m=>!m.visible));
  screens.setVisibility(()=>true);screens.update(32);assert.ok(near.every(m=>m.visible));assert.ok(far.every(m=>!m.visible));assert.ok(stems.every(m=>m.visible));
  screens.update(8);assert.ok(far.every(m=>m.visible));assert.ok(stems.every(m=>!m.visible));
 }finally{screens.dispose();for(const m of Object.values(materials))m.dispose();bark.dispose();textures.forEach(t=>t.dispose());}
});

test('fog chunk summary agrees with the fragment mask and conservative tile bounds',()=>{
 const size=8,data=Uint8Array.from({length:size*size},(_,i)=>i%7===0?255:0),summary=biomeVisibilitySummary(data,size);
 for(let x=-2;x<10;x+=.5)for(let z=-2;z<10;z+=.5){
  const bounds=new T.Box3(new T.Vector3(x,0,z),new T.Vector3(x+1.25,3,z+.75));
  const expected=pad=>{const values=[];for(let y=Math.max(0,Math.floor(bounds.min.z-pad));y<=Math.min(size-1,Math.ceil(bounds.max.z+pad));y++)for(let u=Math.max(0,Math.floor(bounds.min.x-pad));u<=Math.min(size-1,Math.ceil(bounds.max.x+pad));u++)values.push(!!data[y*size+u]);return values;};
  assert.equal(summary.any(bounds),expected(.5).some(Boolean));assert.equal(summary.all(bounds),expected(0).every(Boolean));
 }
});

test('snow taper is independent of cell iteration order, including concave shoulders',()=>{
 const m={terrain:Array.from({length:10},()=>Array(10).fill('ground-biome-snow')),upper:[{},{}],props:[],foliage:{}};
 for(let z=2;z<7;z++)for(let x=2;x<7;x++)if(!(z<4&&x>4))m.foliage[`${x},${z},0`]=[1,true,'thicket-v1'];
 const p=biomePlans(m)[0],summarize=plan=>{const points=new Map();for(const g of screenSurface(plan).chunks)for(let i=0;i<g.position.length;i+=3){const key=[g.position[i],g.position[i+2]].map(n=>n.toFixed(7)).join(',');if(!points.has(key))points.set(key,new Set());points.get(key).add(g.position[i+1].toFixed(7));}return [...points].sort().map(([key,values])=>[key,[...values].sort()]);};
 assert.deepEqual(summarize(p),summarize({...p,obstacles:{...p.obstacles,screens:[...p.obstacles.screens].reverse()}}));
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
