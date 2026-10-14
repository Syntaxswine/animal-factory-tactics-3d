import {BIOME_TREE_GROUNDING} from '../dist/tactics/biome-plant-parts.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodePNG} from '../tools/png-rgba.mjs';
import {createHash} from 'node:crypto';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BIOME_FAMILIES,BIOME_PLANTS,BIOME_TEXTURES,BIOME_PAINT,BIOME_GROUNDS,MATURE_TREE_SCALE} from '../dist/tactics/biome-foliage-data.js';
import {createBiomePlantFactory,biomePlantParts} from '../dist/tactics/biome-foliage-models.js';
import {createBiomeMaterials,createBiomeGround,configureBiomeTexture,atlasRect} from '../dist/tactics/biome-foliage-paint.js';

function setup(){
 const textures=Object.fromEntries(Object.keys(BIOME_TEXTURES).map(k=>[k,configureBiomeTexture(new T.Texture())]));
 const materials=createBiomeMaterials(textures),factory=createBiomePlantFactory(materials);
 return {textures,materials,factory,dispose(){factory.dispose();Object.values(materials).forEach(m=>m.dispose());Object.values(textures).forEach(t=>t.dispose());}};
}
// Independent of Box3's approximate mesh bounds and the factory's own metadata.
function vertexBounds(root){
 root.updateMatrixWorld(true);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],v=new T.Vector3();
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);v.toArray().forEach((n,j)=>{assert(Number.isFinite(n));min[j]=Math.min(min[j],n);max[j]=Math.max(max[j],n);});}});
 return {min,max};
}
function near(a,b,message){assert(Math.abs(a-b)<1e-6,message+': '+a+' vs '+b);}

test('all five art families have two trees, two low plants and valid paint sources',()=>{
 assert.deepEqual(Object.keys(BIOME_FAMILIES),['jungle','temperate','snow','dry','wetlands']);
 const ids=[];for(const [biome,family]of Object.entries(BIOME_FAMILIES)){
  assert.equal(family.trees.length,2);assert.equal(family.low.length,2);assert(BIOME_GROUNDS[family.ground]);
  for(const id of [...family.trees,...family.low]){ids.push(id);assert.equal(BIOME_PLANTS[id].biome,biome);for(const part of biomePlantParts(id))assert(BIOME_PAINT[part.paint]);}
 }
 assert.equal(new Set(ids).size,20);assert.deepEqual(new Set(ids),new Set(Object.keys(BIOME_PLANTS)));
 for(const spec of Object.values(BIOME_PAINT))assert(BIOME_TEXTURES[spec.atlas]);
});

for(const [id,info]of Object.entries(BIOME_PLANTS))test(id+' is grounded, placeable and within the low-poly budget in every arrangement',()=>{
 const s=setup();try{for(const variant of [0,1,2]){
  const normal=s.factory.create(id,{variant}),a=vertexBounds(normal);
  assert.deepEqual(normal.position.toArray(),[0,0,0]);assert.deepEqual(normal.userData.anchor,[0,0,0]);near(a.min[1],0,id+' contact');
  for(const key of ['min','max'])for(let i=0;i<3;i++)near(normal.userData.bounds[key][i],a[key][i],id+' metadata');
  assert(normal.userData.triangles>0&&normal.userData.triangles<=(info.category==='tree'?2500:1000),id+' triangles '+normal.userData.triangles);
  const mature=s.factory.create(id,{variant,mature:true}),b=vertexBounds(mature),scale=info.category==='tree'?MATURE_TREE_SCALE:1;
  for(const key of ['min','max'])for(let i=0;i<3;i++)near(b[key][i],a[key][i]*scale,id+' growth');
  for(const plant of [normal,mature]){plant.position.set(17,6,-9);plant.rotation.y+=.72;const placed=vertexBounds(plant);near(placed.min[1],6,id+' elevated placement');}
  const grey=s.factory.create(id,{variant,grey:true});grey.traverse(o=>{if(o.isMesh)assert.equal(o.material,s.materials.grey);});
 }}finally{s.dispose();}
});

test('branch arrangements are deterministic and the public API rejects invalid inputs',()=>{
 const s=setup();try{
  for(const id of Object.keys(BIOME_PLANTS))for(const v of [0,1,2])assert.deepEqual(biomePlantParts(id,v),biomePlantParts(id,v));
  assert.notDeepEqual(biomePlantParts('jungle-canopy',0),biomePlantParts('jungle-canopy',1));
  assert.throws(()=>s.factory.create('missing'),/Unknown biome plant/);
  for(const variant of [-1,3,1.5,NaN])assert.throws(()=>s.factory.create('jungle-fern',{variant}),/variant/);
 }finally{s.dispose();}
 assert.throws(()=>s.factory.create('jungle-fern'),/disposed/);
});

test('a plant factory releases shared geometries exactly once and leaves caller-owned paint alive',()=>{
 const s=setup(),counts=new Map(),watch=r=>{counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));};
 const geos=[...new Set(Object.values(s.factory.geometries))],paint=[...Object.values(s.materials),...Object.values(s.textures)];[...geos,...paint].forEach(watch);
 s.factory.create('jungle-palm');s.factory.create('jungle-palm',{mature:true});s.factory.dispose();s.factory.dispose();
 for(const g of geos)assert.equal(counts.get(g),1);for(const p of paint)assert.equal(counts.get(p),0);
 s.dispose();for(const p of paint)assert.equal(counts.get(p),1);
});

test('atlas sampling stays within its panel and supports every ground family/variant',()=>{
 const s=setup();try{
  for(const panel of [...Object.values(BIOME_PAINT).map(p=>p.panel),...Object.values(BIOME_GROUNDS)]){
   const [x,y,w,h]=panel,r=atlasRect(panel);assert(r.origin[0]>x/w&&r.origin[0]+r.size[0]<(x+1)/w);assert(r.origin[1]>1-(y+1)/h&&r.origin[1]+r.size[1]<1-y/h);
  }
  for(const family of Object.keys(BIOME_GROUNDS))for(const variant of [-1,0,1,2,3]){const m=createBiomeGround(s.textures.ground,family,{variant});assert.equal(m.map,s.textures.ground);assert.equal(m.userData.variant,variant);m.dispose();}
  assert.throws(()=>createBiomeGround(s.textures.ground,'missing'),/Unknown ground/);assert.throws(()=>createBiomeGround(s.textures.ground,'snow',{variant:4}),/Invalid ground/);
 }finally{s.dispose();}
});

test('all 24 exported ground textures match any neighboring variant at the documented resolution',()=>{
 const base=new URL('../dist/assets/environment/biome-foliage/ground-tiles/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('tiles.json',base)));
 assert.deepEqual(Object.keys(manifest.families),Object.keys(BIOME_GROUNDS));
 for(const [kind,files]of Object.entries(manifest.families)){
  assert.equal(files.length,4);const hashes=[],images=[];
  for(const file of files){const png=fs.readFileSync(new URL(file,base)),decoded=decodePNG(png);assert.equal(decoded.width,manifest.pixels);assert.equal(decoded.height,manifest.pixels);hashes.push(png.toString('base64'));images.push(decoded);}
  assert.equal(new Set(hashes).size,4,kind+' needs four visibly different patterns');
  let maximum=0;for(const a of images)for(const b of images)for(let i=0;i<manifest.pixels;i++)for(let c=0;c<4;c++){
   const n=manifest.pixels;maximum=Math.max(maximum,Math.abs(a.pixels[(i*n)*4+c]-b.pixels[(i*n+n-1)*4+c]),Math.abs(a.pixels[i*4+c]-b.pixels[((n-1)*n+i)*4+c]));
  }
  assert.equal(maximum,manifest.maximumBorderChannelErrors[kind]);assert(maximum<=2,kind+' visible texture seam');
 }
});

test('the integration manifest matches current source and every plant appearance',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../dist/assets/environment/biome-foliage/manifest.json',import.meta.url)));
 for(const [file,hash]of Object.entries(manifest.sources))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex'),hash,file+' changed; regenerate the manifest');
 const s=setup();try{for(const [id,p]of Object.entries(manifest.plants)){
  assert.equal(p.appearances.length,BIOME_PLANTS[id].category==='tree'?6:3);
  for(const appearance of p.appearances)assert.deepEqual(s.factory.create(id,appearance).userData,appearance);
 }}finally{s.dispose();}
});

test('headless trunk grounding stays aligned with the actual generated tree vertices',()=>{
 const kit=setup();try{for(const [id,offsets]of Object.entries(BIOME_TREE_GROUNDING))for(let variant=0;variant<3;variant++){
  const p=biomePlantParts(id,variant)[0],tree=kit.factory.create(id,{variant}),before=p.position?.[1]??(p.a[1]+p.b[1])/2;
  assert.ok(Math.abs(tree.children[0].position.y-before-offsets[variant])<1e-10,id+'/'+variant);
 }}finally{kit.dispose();}
});
