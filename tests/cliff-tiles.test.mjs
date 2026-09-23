import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {shoreField} from '../dist/tactics/shore-tiles.js';
import {cliffTileGeometry,cliffLandscapeTiles,cliffCrestHeight} from '../dist/tactics/cliff-tiles.js';

function audit(g){
 const p=g.attributes.position,edges=new Map();let volume=0;
 for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j));assert(v.every(v=>v.toArray().every(Number.isFinite)));const cross=new T.Vector3().subVectors(v[1],v[0]).cross(new T.Vector3().subVectors(v[2],v[0]));assert(cross.length()>1e-10);volume+=v[0].dot(new T.Vector3().crossVectors(v[1],v[2]))/6;
  const keys=v.map(v=>v.toArray().map(n=>n.toFixed(6)).join(','));for(let j=0;j<3;j++){const a=keys[j],b=keys[(j+1)%3],key=[a,b].sort().join('|'),old=edges.get(key)||{count:0,winding:0};old.count++;old.winding+=a<b?1:-1;edges.set(key,old);}}
 assert([...edges.values()].every(e=>e.count===2&&e.winding===0),'closed outward-oriented manifold');if(p.count)assert(volume>0);assert(g.groups.length<=2);return volume;
}
test('all 16 river patterns in all three variants produce closed wall-height cliff solids',()=>{
 for(const set of ['ledge','crag'])for(let variant=0;variant<3;variant++)for(let mask=0;mask<16;mask++){
  const g=cliffTileGeometry(set,[{x:0,z:0,mask,variant}]);audit(g);if(mask){assert(g.boundingBox.min.y>=0);assert(g.boundingBox.max.y<=2);if(set==='ledge')assert.equal(g.boundingBox.max.y,2);}else assert.equal(g.attributes.position.count,0);g.dispose();
 }
});
test('assembled swaths weld across tile seams without internal walls and retain river contours',()=>{
 for(const layout of ['plateau','gorge','coast'])for(const set of ['ledge','crag']){
  const tiles=cliffLandscapeTiles(layout,1),g=cliffTileGeometry(set,tiles);audit(g);
  const mesh=new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld(true);
  // Away from the zero contour, cap presence agrees with the existing river field.
  for(const t of tiles)for(const [u,v]of [[.21,.32],[.53,.68],[.82,.19]]){
   const field=shoreField(t.mask,u,v,t.variant);if(Math.abs(field)<.18)continue;const hits=new T.Raycaster(new T.Vector3(t.x+u,3,t.z+v),new T.Vector3(0,-1,0),0,4).intersectObject(mesh);assert.equal(hits.length>0,field>0);
   if(set==='ledge'&&field>0)assert(Math.abs(hits[0].point.y-2)<1e-6);
  }
  const full=tiles.filter(t=>t.mask===15),p=g.attributes.position;
  for(const t of full){const next=full.find(q=>q.x===t.x+1&&q.z===t.z);if(!next)continue;for(let i=0;i<p.count;i+=3)if([0,1,2].every(j=>Math.abs(p.getX(i+j)-(t.x+1))<1e-6&&p.getZ(i+j)>t.z+.001&&p.getZ(i+j)<t.z+.999))assert.fail('internal wall between full land tiles');}
  mesh.material.dispose();g.dispose();
 }
});
test('all compatible edge patterns match geometry across variants; crags fall toward exposed lip',()=>{
 const edge=(g,axis)=>{const p=g.attributes.position,s=new Set();for(let i=0;i<p.count;i++)if(Math.abs((axis==='x'?p.getX(i):p.getZ(i))-1)<1e-7)s.add(`${p.getY(i).toFixed(6)},${(axis==='x'?p.getZ(i):p.getX(i)).toFixed(6)}`);return [...s].sort();};
 for(const [axis,bits,other]of [['x',[2,4],[1,8]],['z',[8,4],[1,2]]])for(const set of ['ledge','crag'])for(let a=0;a<16;a++)for(let b=0;b<16;b++)if(bits.every((bit,i)=>!!(a&bit)===!!(b&other[i])))for(let variant=0;variant<3;variant++){
  const ga=cliffTileGeometry(set,[{x:0,z:0,mask:a,variant}]),gb=cliffTileGeometry(set,[{x:axis==='x'?1:0,z:axis==='z'?1:0,mask:b,variant:(variant+1)%3}]);assert.deepEqual(edge(ga,axis),edge(gb,axis));ga.dispose();gb.dispose();
 }
 assert.equal(cliffCrestHeight('crag',0,.3,.7),.6);assert(cliffCrestHeight('crag',1,.3,.7)>1.1);assert.equal(cliffCrestHeight('crag',1,0,0),2);assert.equal(cliffCrestHeight('ledge',0,0,0),2);
 assert.throws(()=>cliffTileGeometry('ledge',[{x:0,z:0,mask:1,variant:3}]));assert.throws(()=>cliffTileGeometry('ledge',[{x:0,z:0,mask:15,variant:0},{x:1,z:0,mask:0,variant:0}]));
});
