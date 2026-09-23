import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {shoreField} from '../dist/tactics/shore-tiles.js';
import {cliffTileGeometry,cliffLandscapeTiles,cliffCrestHeight} from '../dist/tactics/cliff-tiles.js';
import {addCliffRimAttribute} from '../dist/tactics/cliff-rim.js';

test('soil rim marks exposed contours and never outlines a welded internal tile join',()=>{
 const g=cliffTileGeometry('ledge',[{x:0,z:0,mask:15,variant:0},{x:1,z:0,mask:15,variant:1}]),p=g.attributes.position,mask=g.attributes.cliffRim;let seamSamples=0,outerSamples=0;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);assert(Number.isFinite(mask.getX(i))&&mask.getX(i)>=0);if(y!==2)continue;
  if(x===1&&z>=.25&&z<=.75){assert(mask.getX(i)>=.25);seamSamples++;}
  if(x===0||x===2||z===0||z===1){assert(mask.getX(i)<1e-6);outerSamples++;}}
 assert(seamSamples&&outerSamples);g.dispose();
 const sample=cliffTileGeometry('ledge',cliffLandscapeTiles('plateau')),positions=sample.attributes.position.array.slice(),normals=sample.attributes.normal.array.slice();addCliffRimAttribute(sample,sample.userData.rim);assert.deepEqual(sample.attributes.position.array,positions);assert.deepEqual(sample.attributes.normal.array,normals);sample.dispose();
});

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

test('mixed ledge/crag joins weld at wall height in both axes across every compatible river pattern',()=>{
 for(const [dx,dz,bits,other]of [[1,0,[2,4],[1,8]],[0,1,[8,4],[1,2]]])for(let a=0;a<16;a++)for(let b=0;b<16;b++)if(bits.every((bit,i)=>!!(a&bit)===!!(b&other[i])))for(let variant=0;variant<3;variant++){
  const tiles=[{x:0,z:0,mask:a,variant,set:'ledge'},{x:dx,z:dz,mask:b,variant:(variant+1)%3,set:'crag'}],g=cliffTileGeometry('mixed',tiles);audit(g);
  const p=g.attributes.position,cap=g.groups.find(g=>g.materialIndex===1),samples=new Map();
  if(cap)for(let i=cap.start;i<cap.start+cap.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),key=`${x.toFixed(6)},${z.toFixed(6)}`,sample=[y,g.attributes.sandBlend.getX(i)];
   if(samples.has(key))assert.deepEqual(sample,samples.get(key),'welded position has one height and one paint weight');samples.set(key,sample);
   if(Math.abs((dx?x:z)-1)<1e-6)assert.equal(y,2,'both sides of ledge/crag join meet at wall height');
  }
  assert.deepEqual(g.userData.traversal.map(t=>t.climbable),tiles.filter(t=>t.mask).map(t=>t.set==='ledge'));assert(g.userData.traversal.every(t=>t.mask>0));g.dispose();
 }
});

test('mixed swaths preserve ledge support, crag relief and paint-independent geometry',()=>{
 for(const layout of ['plateau','gorge','coast']){
  const tiles=cliffLandscapeTiles(layout).map(t=>({...t,set:t.x<0?'ledge':'crag'}));
  const g=cliffTileGeometry('mixed',tiles),grass=cliffTileGeometry('mixed',tiles.map(t=>({...t,sand:0}))),sand=cliffTileGeometry('mixed',tiles.map(t=>({...t,sand:1})));audit(g);
  for(const painted of [grass,sand]){assert.deepEqual(painted.attributes.position.array,g.attributes.position.array);assert.deepEqual(painted.attributes.normal.array,g.attributes.normal.array);assert.deepEqual(painted.userData.rim,g.userData.rim);assert.deepEqual(painted.userData.traversal,g.userData.traversal);}
  const cap=g.groups.find(g=>g.materialIndex===1),p=g.attributes.position;let sloped=0,flat=0,blended=0;
  for(let i=cap.start;i<cap.start+cap.count;i++){
   assert.equal(grass.attributes.sandBlend.getX(i),0);assert.equal(sand.attributes.sandBlend.getX(i),1);
   if(p.getX(i)<=0){assert.equal(p.getY(i),2);flat++;}else if(p.getY(i)<1.8)sloped++;
   const m=g.attributes.sandBlend.getX(i);assert(m>=0&&m<=1);if(m>0&&m<1)blended++;
  }
  assert(flat&&sloped&&blended);for(const mesh of [g,grass,sand])mesh.dispose();
 }
 const isolated=[];for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)isolated.push({x,z,mask:15,variant:0,set:x===0&&z===0?'crag':'ledge'});
 const g=cliffTileGeometry('mixed',isolated),mesh=new T.Mesh(g,new T.MeshBasicMaterial());mesh.updateMatrixWorld();const ray=new T.Raycaster(new T.Vector3(.5,3,.5),new T.Vector3(0,-1,0));assert(ray.intersectObject(mesh)[0].point.y<1.9,'an isolated crag must not turn into a flat landing');audit(g);g.dispose();mesh.material.dispose();
 assert.throws(()=>cliffTileGeometry('mixed',[{x:0,z:0,mask:15,variant:0}]));assert.throws(()=>cliffTileGeometry('ledge',[{x:0,z:0,mask:15,variant:0,sand:2}]));
});
