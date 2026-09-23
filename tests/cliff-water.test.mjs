import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createCliff} from '../dist/tactics/cliff-models.js';
import {createCliffTiles,cliffLandscapeTiles} from '../dist/tactics/cliff-tiles.js';
import {cliffWaterBoundary,cliffWaterDistance,createCliffWater,CLIFF_WATER_LEVEL} from '../dist/tactics/cliff-water.js';

test('water variant keeps the exact dry solid and wall-height datum for every family',()=>{
 for(const set of ['ledge','crag','mixed'])for(const layout of ['plateau','gorge','coast']){
  const tiles=cliffLandscapeTiles(layout).map(t=>({...t,...(set==='mixed'?{set:t.x<0?'ledge':'crag'}:{})})),dry=createCliffTiles(set,tiles),wet=createCliffTiles(set,tiles,{water:true});
  assert.deepEqual(wet.mesh.geometry.attributes.position.array,dry.mesh.geometry.attributes.position.array);assert.deepEqual(wet.mesh.geometry.userData.traversal,dry.mesh.geometry.userData.traversal);assert.equal(wet.mesh.geometry.boundingBox.max.y,2);assert.equal(CLIFF_WATER_LEVEL,0);assert.notEqual(wet.original[0].customProgramCacheKey(),dry.original[0].customProgramCacheKey());
  const shore=cliffWaterBoundary(wet.mesh);assert.equal(shore.length,wet.mesh.geometry.userData.boundarySegments);dry.dispose();wet.dispose();
 }
});

test('water contact follows original pieces and transformed roots, never internal tile seams',()=>{
 for(const set of ['ledge','crag'])for(const shape of ['straight','corner','end']){
  const c=createCliff(set,shape,1,{water:true}),local=cliffWaterBoundary(c.mesh);assert(local.length>4);c.root.position.set(3,0,-2);c.root.rotation.y=.7;c.root.updateMatrixWorld(true);const transformed=cliffWaterBoundary(c.mesh);assert.equal(transformed.length,local.length);
  for(let i=0;i<local.length;i++)for(const end of ['a','b']){const expected=new T.Vector3(local[i][end][0],0,local[i][end][1]).applyMatrix4(c.root.matrixWorld);assert(Math.abs(expected.x-transformed[i][end][0])<1e-6&&Math.abs(expected.z-transformed[i][end][1])<1e-6);}c.dispose();
 }
 const c=createCliffTiles('ledge',[{x:0,z:0,mask:15,variant:0},{x:1,z:0,mask:15,variant:1}]),edges=cliffWaterBoundary(c.mesh);
 assert(edges.every(({a,b})=>!(a[0]===1&&b[0]===1&&a[1]>0&&b[1]<1)),'no internal seam');
 const degree=new Map();for(const e of edges)for(const p of [e.a,e.b]){const key=p.join(',');degree.set(key,(degree.get(key)||0)+1);}assert([...degree.values()].every(n=>n===2),'closed contact contour');c.dispose();
});

test('water distance raster matches actual segment distances and remains local to contact',()=>{
 const edges=[{a:[-1,-1],b:[1,-1]},{a:[1,-1],b:[1,1]},{a:[1,1],b:[-1,1]},{a:[-1,1],b:[-1,-1]}],field=cliffWaterDistance(edges,{size:6,resolution:128});
 for(let z=0;z<128;z+=3)for(let x=0;x<128;x+=3){const px=(x+.5)*6/128-3,pz=(z+.5)*6/128-3;let exact=Infinity;for(const {a,b}of edges){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((px-a[0])*dx+(pz-a[1])*dz)/(dx*dx+dz*dz)));exact=Math.min(exact,Math.hypot(px-a[0]-t*dx,pz-a[1]-t*dz));}assert(Math.abs(field.data[z*128+x]/255-Math.min(1,exact/field.reach))<=1/255);}
 assert(cliffWaterDistance([],{resolution:16}).data.every(v=>v===255));assert.throws(()=>cliffWaterDistance([],{resolution:0}));assert.throws(()=>cliffWaterDistance([{a:[NaN,0],b:[0,1]}]));
});

test('water animation loops exactly and disposes its own GPU resources once',()=>{
 const source=new T.Texture(),water=createCliffWater(source,{resolution:32}),disposed={geometry:0,material:0,distance:0,source:0};for(const [key,resource]of Object.entries({geometry:water.mesh.geometry,material:water.mesh.material,distance:water.uniforms.waterDistance.value,source}))resource.addEventListener('dispose',()=>disposed[key]++);
 water.update(1.2);const phase=water.uniforms.waterPhase.value;water.update(7.2);assert(Math.abs(phase-water.uniforms.waterPhase.value)<1e-12);water.update(-4.8);assert(Math.abs(phase-water.uniforms.waterPhase.value)<1e-12);assert.throws(()=>water.update(NaN));water.dispose();water.dispose();assert.deepEqual(disposed,{geometry:1,material:1,distance:1,source:0});source.dispose();
});
