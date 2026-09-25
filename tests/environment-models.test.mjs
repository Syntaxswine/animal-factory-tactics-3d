import {isRampTerrain} from '../dist/tactics/cliff-ramp-surfaces.js';
import {cliffTileGeometry} from '../dist/tactics/cliff-tiles.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PROPS,EDGES,GROUNDS} from '../dist/tactics/environment.js';
import {buildWorld,traceWorld} from '../dist/tactics/hybrid-world.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {environmentGeometries} from '../dist/tactics/environment-geometry.js';
import * as THREE from '../dist/tactics/vendor/three.module.js';
const mapFor=(kind,rotated=false,z=0)=>({terrain:[['yard']],upper:z?[{'0,0':'floor','0,1':'floor','1,0':'floor','1,1':'floor'}]:[],props:[{x:0,y:0,z,kind,rotated}],edges:{},stairs:[]});
test('complete model catalog renders finite geometry without mutating collision or map data',()=>{
 const geometries=environmentGeometries();
 try{for(const kind of Object.keys(PROPS))for(const rotated of [false,true]){
  const map=mapFor(kind,rotated,kind.startsWith('roof-')?1:0),world=buildWorld(map),before=JSON.stringify(world.boxes),saved=JSON.stringify(map),hit=traceWorld(world,[-3,.4,0],[3,.4,0]);
  const parts=environmentVisuals(world,map);
  if(isRampTerrain({kind})){
   const g=cliffTileGeometry('mixed',[],{ramps:map.props});assert(g.attributes.position.count>0,kind);for(const name of ['position','normal'])assert([...g.attributes[name].array].every(Number.isFinite),kind);g.dispose();
   assert(!parts.some(p=>p.source.prop?.endsWith(':'+kind)),'joined terrain must not also render a box');
  }else assert(parts.some(p=>p.source.prop?.endsWith(':'+kind)),kind);
  for(const p of parts){assert(p.center.every(Number.isFinite)&&p.size.every(n=>Number.isFinite(n)&&n>0),p.id);assert(geometries[p.shape||'box'],p.id);}
  assert.equal(JSON.stringify(world.boxes),before);assert.equal(JSON.stringify(map),saved);assert.deepEqual(traceWorld(world,[-3,.4,0],[3,.4,0]),hit);
 }}finally{for(const g of Object.values(geometries))g.dispose();}
});
test('rectangular props rotate their complete model around the saved footprint and preserve upper elevation',()=>{
 for(const kind of ['table-wood','hospital-bed','lab-bench']){
  const a=mapFor(kind,false,1),b=mapFor(kind,true,1),parts=m=>environmentVisuals(buildWorld(m),m).filter(p=>p.kind==='prop'),normal=parts(a),rotated=parts(b),rule=PROPS[kind];
  assert.equal(normal.length,rotated.length);
  for(let i=0;i<normal.length;i++){const p=normal[i],q=rotated[i],x=p.center[0]-(rule.w-1)/2,z=p.center[2]-(rule.h-1)/2;assert(Math.abs(q.center[0]-((rule.h-1)/2-z))<1e-10);assert(Math.abs(q.center[2]-((rule.w-1)/2+x))<1e-10);assert.equal(q.center[1],p.center[1]);assert.equal(q.yaw,-Math.PI/2);}
 }
});
test('model primitives have finite triangle surfaces and unit extents, including a continuous roof slope',()=>{
 const geometries=environmentGeometries();try{for(const [name,g]of Object.entries(geometries)){g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3());for(const n of size)assert(Math.abs(n-1)<1e-5,name);for(const attribute of [g.attributes.position,g.attributes.normal])assert([...attribute.array].every(Number.isFinite),name);assert((g.index?.count||g.attributes.position.count)>0);}}
 finally{for(const g of Object.values(geometries))g.dispose();}
});
test('all boundary and ground types retain support and windows retain their opening',()=>{
 for(const kind of Object.keys(EDGES)){const map={terrain:[['yard']],edges:{'s:0:0':kind},props:[]},world=buildWorld(map);assert.equal(world.diagnostics.length,0);const parts=environmentVisuals(world,map);assert(parts.length>0);if(EDGES[kind].window){assert.equal(traceWorld(world,[0,1.1,0],[0,1.1,1]),null);assert(parts.filter(p=>p.kind==='wall').every(p=>p.center[1]+p.size[1]/2<=.85+1e-10||p.center[1]-p.size[1]/2>=1.55-1e-10));}}
 for(const kind of ['water','yard','floor','bridge','woodland',...GROUNDS])assert.equal(buildWorld({terrain:[[kind]]}).diagnostics.length,0);
});
