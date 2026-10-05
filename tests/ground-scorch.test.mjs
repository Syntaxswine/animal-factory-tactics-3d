import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {scorchCells,createGroundScorch} from '../dist/tactics/ground-scorch.js';
import {localFireCells,createTankBlastEffects} from '../dist/tactics/tank-blast-effects.js';
const contract=JSON.parse(fs.readFileSync(new URL('../dist/tactics/fixtures/tank-blast-contract.json',import.meta.url))),loader={loadAsync:async()=>new T.Texture()},V=(...p)=>new T.Vector3(...p);

test('burned tiles deduplicate without conflating floors or accepting invalid coordinates',()=>{
 assert.deepEqual(scorchCells([{x:2,z:3,y:3},{x:2,z:3},{x:2,z:3}]),[{x:2,y:0,z:3},{x:2,y:3,z:3}]);
 for(const input of [null,[null],[{x:.5,z:0}],[{x:0,z:Infinity}],[{x:0,z:0,y:NaN}]])assert.throws(()=>scorchCells(input));
});
test('repeated and reordered footprints preserve batches, stable variation and tile heights',async()=>{
 const fx=await createGroundScorch(new T.Scene(),loader),cells=localFireCells(contract.open);
 try{fx.setCells(cells);const [b]=fx.batches,matrices=Array.from(b.mesh.instanceMatrix.array),styles=Array.from(b.mesh.geometry.attributes.scorchStyle.array);assert.equal(fx.count,81);assert.equal(fx.batches.length,1);assert.equal(new Set(styles.filter((_,i)=>i%2===0)).size,4);
  fx.setCells([...cells].reverse().concat(cells));assert.equal(fx.batches[0].mesh,b.mesh);assert.deepEqual(Array.from(b.mesh.instanceMatrix.array),matrices);
  for(let i=0;i<b.tiles.length;i++){const m=new T.Matrix4();b.mesh.getMatrixAt(i,m);const p=V().setFromMatrixPosition(m);assert.ok(Math.abs(p.y-.003)<1e-7);assert.equal(p.x,b.tiles[i].x);assert.equal(p.z,b.tiles[i].z);}
  fx.setAmount(0);assert.equal(fx.group.visible,false);fx.setAmount(1);assert.equal(fx.group.visible,true);assert.deepEqual(Array.from(b.mesh.geometry.attributes.scorchStyle.array),styles);
 }finally{fx.dispose();}
});
test('dry-cell masks retain exact water holes and separate elevated floors',async()=>{
 const fx=await createGroundScorch(new T.Scene(),loader),cells=localFireCells(contract.water);try{
  fx.setCells([...cells,{x:1,z:1,y:3}]);assert.equal(fx.batches.length,2);assert.equal(fx.count,67);
  for(const b of fx.batches){const {data,width,height}=b.mask.image,bounds=b.mesh.material.uniforms.bounds.value;for(let z=0;z<height;z++)for(let x=0;x<width;x++)assert.equal(data[(z*width+x)*4+3],b.tiles.some(p=>p.x===bounds.x+.5+x&&p.z===bounds.y+.5+z)?255:0);}
  const elevated=fx.batches.find(b=>b.y===3),m=new T.Matrix4();elevated.mesh.getMatrixAt(0,m);assert.ok(Math.abs(V().setFromMatrixPosition(m).y-3.003)<1e-6);
 }finally{fx.dispose();}
});
test('invalid replacement preserves existing marks; clearing frees masks and instance buffers',async()=>{
 const fx=await createGroundScorch(new T.Scene(),loader);fx.setCells([{x:0,z:0}]);const b=fx.batches[0],freed=new Set();for(const [key,item]of Object.entries({mesh:b.mesh,geometry:b.mesh.geometry,material:b.mesh.material,mask:b.mask}))item.addEventListener('dispose',()=>freed.add(key));
 try{assert.throws(()=>fx.setCells([{x:0,z:0},{x:10000,z:0}]),/partition/);assert.equal(fx.batches[0],b);assert.equal(fx.count,1);assert.equal(freed.size,0);fx.setCells([]);assert.equal(fx.count,0);assert.equal(fx.group.visible,false);assert.equal(freed.size,4);}finally{fx.dispose();}
});
test('scorch persists after fire is gone and restores through reverse seeking',async()=>{
 const fx=await createTankBlastEffects(new T.Scene(),loader,V(0,1,0)),camera=new T.PerspectiveCamera();camera.position.set(3,5,8);try{
  const update=age=>fx.update(age,{camera,contract:contract.water,groundOpacity:0});assert.equal(update(-.1).scorchedCells,0);assert.equal(fx.scorch.group.visible,false);
  const end=update(10);assert.equal(end.scorchedCells,66);assert.equal(end.visibleFireCells,0);assert.equal(end.scorchAmount,1);const mesh=fx.scorch.batches[0].mesh;update(-.1);assert.equal(fx.scorch.group.visible,false);assert.deepEqual(update(10),end);assert.equal(fx.scorch.batches[0].mesh,mesh);
 }finally{fx.dispose();}
});
test('an empty supplied burn area makes no marks or invalid mask',async()=>{
 const fx=await createTankBlastEffects(new T.Scene(),loader,V(0,1,0)),camera=new T.PerspectiveCamera();try{const d=fx.update(10,{camera,contract:{...contract.open,fires:[]},groundOpacity:0});assert.equal(d.fireCells,0);assert.equal(d.scorchedCells,0);assert.equal(fx.groundMask,null);assert.equal(fx.scorch.group.visible,false);}finally{fx.dispose();}
});
test('failed scorch texture releases the earlier burst textures and creates no scene objects',async()=>{
 const scene=new T.Scene(),textures=[],freed=new Set();await assert.rejects(createTankBlastEffects(scene,{async loadAsync(){if(textures.length===3)throw Error('Injected scorch failure');const t=new T.Texture();t.addEventListener('dispose',()=>freed.add(t));textures.push(t);return t;}},V(0,1,0)),/Injected/);assert.equal(freed.size,3);assert.equal(scene.children.length,0);
});
test('owned decal texture disposes once, with no scene attachment retained',async()=>{
 const scene=new T.Scene(),texture=new T.Texture();let disposed=0;texture.addEventListener('dispose',()=>disposed++);const fx=await createGroundScorch(scene,{loadAsync:async()=>texture});fx.setCells([{x:0,z:0}]);fx.dispose();fx.dispose();assert.equal(disposed,1);assert.equal(scene.children.length,0);assert.throws(()=>fx.setCells([]),/disposed/);
});
