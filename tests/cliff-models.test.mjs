import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {CLIFF_HEIGHT,CLIFF_SHAPES,CLIFF_SETS,cliffGeometry,cliffLayout,createCliff} from '../dist/tactics/cliff-models.js';
import {DIMENSIONS} from '../dist/tactics/hybrid-world.js';

test('both cliff sets reach wall height, remain closed solids, and reject invalid inputs',()=>{
 assert.equal(CLIFF_HEIGHT,DIMENSIONS.wall);
 for(const set of CLIFF_SETS)for(const shape of Object.keys(CLIFF_SHAPES))for(const seed of [1,2,19]){
  const g=cliffGeometry(set,shape,seed),p=g.attributes.position;assert.equal(g.boundingBox.min.y,0);assert.equal(g.boundingBox.max.y,CLIFF_HEIGHT);assert([...p.array,...g.attributes.normal.array].every(Number.isFinite));assert(g.groups.length<=2);
  const edges=new Map(),key=v=>v.map(n=>n.toFixed(5)).join(',');let volume=0;
  for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);assert(new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a)).length()>1e-7);volume+=a.dot(new T.Vector3().crossVectors(b,c))/6;
   const vs=[a,b,c].map(v=>key(v.toArray()));for(let k=0;k<3;k++){const pair=[vs[k],vs[(k+1)%3]].sort().join('|');edges.set(pair,(edges.get(pair)||0)+1);}}
  assert(volume>1);assert([...edges.values()].every(n=>n===2),`${set}/${shape}/${seed} nonmanifold surface`);g.dispose();
 }
 assert.throws(()=>cliffGeometry('unknown'));assert.throws(()=>cliffGeometry('ledge','unknown'));assert.throws(()=>cliffGeometry('ledge','end',NaN));
});

test('only ledges have a usable planar landing; crags never expose a flat top triangle',()=>{
 for(const shape of Object.keys(CLIFF_SHAPES))for(const set of CLIFF_SETS){
  const c=createCliff(set,shape),{layout,mesh}=c;mesh.updateMatrixWorld(true);
  if(set==='ledge'){
   assert(layout.climbable);assert(layout.walkable.length);
   for(const [x,y,z]of [...layout.walkable,layout.climb.landing])for(const dx of [-.28,0,.28])for(const dz of [-.28,0,.28]){
    const hits=new T.Raycaster(new T.Vector3(x+dx,3,z+dz),new T.Vector3(0,-1,0),0,4).intersectObject(mesh);assert(hits.length);assert(Math.abs(hits[0].point.y-y)<1e-6);assert(hits[0].face.normal.y>.999);
   }
  }else{
   assert(!layout.climbable);assert.equal(layout.climb,null);assert.deepEqual(layout.walkable,[]);const p=mesh.geometry.attributes.position;
   for(let i=0;i<p.count;i+=3){const a=p.getY(i),b=p.getY(i+1),d=p.getY(i+2);if(Math.min(a,b,d)>.8)assert(Math.max(a,b,d)-Math.min(a,b,d)>1e-5);}
  }
  c.dispose();c.dispose();
 }
});

test('straight sections share exact joining profiles across different seeds',()=>{
 for(const set of CLIFF_SETS){const a=cliffGeometry(set,'straight',1),b=cliffGeometry(set,'straight',19);
  const profile=(g,x)=>{const p=g.attributes.position,out=new Set();for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-x)<1e-6)out.add([p.getY(i),p.getZ(i)].map(n=>n.toFixed(5)).join(','));return [...out].sort();};
  assert.deepEqual(profile(a,2),profile(b,-2));a.dispose();b.dispose();
 }
});
