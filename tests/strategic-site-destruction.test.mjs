import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createStrategicSiteLibrary} from '../dist/tactics/strategic-sites.js';
import {createSiteDestruction,SITE_DESTRUCTION_DURATION} from '../dist/tactics/strategic-site-destruction.js';
const ids=['radio','radar','sam'],V=()=>new T.Vector3();
function fixture(fn){const atlas=new T.Texture(),library=createStrategicSiteLibrary(atlas);try{for(const id of ids){const a=createSiteDestruction(library,id);try{fn(a,library,id);}finally{a.dispose();}}}finally{library.dispose();atlas.dispose();}}
function visibleGeometry(root){const points=[],triangles=[];root.updateMatrixWorld(true);root.traverseVisible(m=>{if(!m.isMesh||m.material.opacity===0)return;const p=m.geometry.attributes.position,ix=m.geometry.index,verts=[];for(let i=0;i<(ix?.count??p.count);i++)verts.push(V().fromBufferAttribute(p,ix?ix.getX(i):i).applyMatrix4(m.matrixWorld));points.push(...verts);for(let i=0;i<verts.length;i+=3)triangles.push(new T.Triangle(...verts.slice(i,i+3)));});return {points,bounds:new T.Box3().setFromPoints(points),area:triangles.reduce((s,t)=>s+t.getArea(),0)};}
function signature(root){root.updateMatrixWorld(true);const result=[];root.traverseVisible(m=>{if(m.isMesh)result.push([m.material.name,Array.from(m.geometry.attributes.position.array),m.matrixWorld.toArray()]);});return result;}
test('zero and last frame are the exact approved endpoint assets',()=>fixture((a,l,id)=>{
 a.apply(0);assert.deepEqual(signature(a.root),signature(l.build(id).root));
 a.apply(SITE_DESTRUCTION_DURATION);assert.deepEqual(signature(a.root),signature(l.build(id,{state:'destroyed'}).root));
}));
test('the articulated first frame reconstructs the source surface without a pop',()=>fixture((a,l,id)=>{
 const expected=visibleGeometry(l.build(id).root);a.apply(.001);const actual=visibleGeometry(a.root);
 for(const key of ['min','max'])for(const k of ['x','y','z'])assert(Math.abs(expected.bounds[key][k]-actual.bounds[key][k])<.0001,id+' '+key+k+' initial bounds differ');
 assert(Math.abs(expected.area-actual.area)<.015,id+' source area differs: '+expected.area+' vs '+actual.area);
}));
test('scrubbing out of order and resetting never changes a sampled pose',()=>fixture(a=>{
 for(const time of [.55,.93,1.4,2,3.8]){a.apply(time);const pose=signature(a.root),d=a.diagnostics();a.apply(7.6);a.apply(.1);a.apply(time);assert.deepEqual(signature(a.root),pose);assert.deepEqual(a.diagnostics(),d);}
}));
test('source-derived shards land before fading and never tunnel below the slab',()=>fixture(a=>{
 for(let t=0;t<=6;t+=.07){a.apply(t);for(const c of a.clouds)for(const p of c.pieces){
  assert(p.opacity===1||p.grounded,c.name+' vanished in flight');if(t<c.birth||!p.g.visible)continue;
  const b=new T.Box3().setFromObject(p.g,true);assert(b.min.y>=.23999,c.name+' penetrates ground at '+t);
  if(p.grounded)assert(Math.abs(b.min.y-.24)<.00001,c.name+' floating landed fragment');
 }}
 assert(a.clouds.every(c=>c.pieces.every(p=>p.opacity===0)),'Unfinished transient debris');
}));
test('heavy grounded pieces contact the slab and remain still after settling',()=>fixture(a=>{
 for(let t=.5;t<3.5;t+=.05){a.apply(t);for(const p of a.tracks){if(!p.ground||!p.holder.visible||p.phase==='supported')continue;
  const b=visibleGeometry(p.holder).bounds;assert(b.min.y>=.23998,p.name+' penetrates floor at '+t+': '+b.min.y);
 }}
 a.apply(4.2);const settled=signature(a.rig);a.apply(6.8);assert.deepEqual(signature(a.rig),settled,'Heavy wreck keeps moving after settlement');
}));
test('permanent foundations stay anchored during the collapse',()=>fixture((a,l,id)=>{
 const ref=l.build(id).root.userData.foundations;
 for(const time of [0,.7,1.3,2.1,5,7.6]){a.apply(time);const g=visibleGeometry(a.root);for(const f of ref){
  // Every approved concrete foundation corner still has a surface vertex at
  // its original height/location; material darkening cannot move the slab.
  for(const p of f.outline){assert(g.points.some(v=>Math.abs(v.x-p[0])<.00001&&Math.abs(v.z-p[1])<.00001&&v.y>=f.min[1]-.00001&&v.y<=f.max[1]+.00001),id+' foundation moved at '+time);}
 }}
}));
test('major surviving pieces remain opaque through deformation and impact',()=>fixture(a=>{
 for(let time=.4;time<2.5;time+=.047){a.apply(time);for(const track of a.tracks)track.holder.traverseVisible(m=>{if(m.isMesh)assert.equal(m.material.opacity,1,track.name+' dissolves during impact');});}
}));
test('animation disposal is idempotent and retains caller textures and library geometry',()=>{
 const atlas=new T.Texture(),l=createStrategicSiteLibrary(atlas);let disposed=0;atlas.addEventListener('dispose',()=>disposed++);
 const a=createSiteDestruction(l,'radio'),resources=new Set();a.rig.traverse(m=>{if(m.isMesh){resources.add(m.geometry);resources.add(m.material);}});const counts=new Map();for(const r of resources)r.addEventListener('dispose',()=>counts.set(r,(counts.get(r)||0)+1));
 a.dispose();a.dispose();assert.equal(counts.size,resources.size);assert([...counts.values()].every(n=>n===1));assert.equal(disposed,0);assert(l.build('radio').root);l.dispose();assert.equal(disposed,0);atlas.dispose();
});
test('invalid site/time and use after disposal fail clearly',()=>{const atlas=new T.Texture(),l=createStrategicSiteLibrary(atlas);try{assert.throws(()=>createSiteDestruction(l,'nope'),RangeError);const a=createSiteDestruction(l,'sam');assert.throws(()=>a.apply(NaN),TypeError);assert.equal(a.apply(-5).time,0);assert.equal(a.apply(500).time,7.6);a.dispose();assert.throws(()=>a.apply(1),/disposed/);}finally{l.dispose();atlas.dispose();}});
