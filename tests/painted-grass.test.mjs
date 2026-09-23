import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createPaintedGrass,PAINTED_GRASS} from '../dist/tactics/painted-grass.js';
import {createCliffTiles,cliffLandscapeTiles} from '../dist/tactics/cliff-tiles.js';
import {createCliffEdgeRocks} from '../dist/tactics/cliff-edge-rocks.js';

test('saved meadow set includes four full-sized tiles, atlas and reusable material',()=>{
 const root=new URL('../dist/assets/environment/grass-cliff-meadow/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('tiles.json',root)));
 assert.equal(manifest.id,PAINTED_GRASS.id);assert.equal(manifest.tiles.length,4);assert.equal(manifest.tileWorldSize,2);
 for(const file of [...manifest.tiles,manifest.atlas.file]){const png=fs.readFileSync(new URL(file,root));assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(png.readUInt32BE(16),file==='atlas.png'?1024:512);assert.equal(png.readUInt32BE(20),file==='atlas.png'?1024:512);}
 for(const variant of [-1,0,1,2,3]){const m=createPaintedGrass({variant});assert(m.isMeshStandardMaterial);m.dispose();}assert.throws(()=>createPaintedGrass({variant:4}));
});

test('actual decorative rock bottom vertices stay supported on cap or open ground after transformation',()=>{
 const counts={ledge:0,crag:0};
 for(const set of ['ledge','crag'])for(const layout of ['plateau','gorge','coast']){
  const c=createCliffTiles(set,cliffLandscapeTiles(layout,1)),original=c.mesh.geometry.attributes.position.array.slice();c.root.position.set(3,0,-2);c.root.rotation.y=.7;c.root.updateMatrixWorld(true);
  const decoration=createCliffEdgeRocks(c.mesh,set);c.root.add(decoration.root);c.root.updateMatrixWorld(true);counts[set]+=decoration.rocks.count;assert(decoration.rocks.count>0);
  const p=decoration.rocks.geometry.attributes.position,m=new T.Matrix4(),ray=new T.Raycaster();
  for(let instance=0;instance<decoration.rocks.count;instance++){
   decoration.rocks.getMatrixAt(instance,m);m.premultiply(decoration.rocks.matrixWorld);
   for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i))<1e-8){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(m);ray.set(new T.Vector3(v.x,3,v.z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(c.mesh,false)[0],h=hit?.point.y||0,gap=v.y-h;assert(gap<=.01501&&gap>=-.06001,`${set}/${layout} unsupported bottom ${gap}`);}
  }
  assert.deepEqual(c.mesh.geometry.attributes.position.array,original);decoration.dispose();decoration.dispose();c.dispose();
 }
 assert(counts.crag>counts.ledge,'impassable rims have denser rocks');
});
