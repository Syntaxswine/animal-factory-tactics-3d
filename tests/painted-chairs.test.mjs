import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {CHAIR_FORMS,CHAIR_CONTACT as C,createChairLibrary,chairPaintRect} from '../dist/tactics/painted-chairs.js';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,a+' != '+b);
const bounds=o=>new T.Box3().setFromObject(o);
const each=fn=>{const t=new T.Texture(),lib=createChairLibrary(t);try{for(const f of CHAIR_FORMS)for(const finish of f.finishes){const c=lib.build(f.id,{finish});fn(c,lib);c.dispose();}}finally{lib.dispose();t.dispose();}};

test('all eight chair finishes share exact seat, foot, pelvis and approach contacts without rescaling',()=>each(c=>{
 const b=bounds(c.root.getObjectByName('Shared seat'));near(b.max.y,C.seatHeight);near(b.min.x,-.42);near(b.max.x,.42);near(b.min.z,-.32);near(b.max.z,.30);
 assert.deepEqual(c.anchors.seat.position.toArray(),C.seatCenter);assert.deepEqual(c.anchors.pelvis.position.toArray(),C.pelvis);assert.deepEqual(c.anchors.approach.position.toArray(),C.approach);assert.deepEqual(c.anchors.leftFoot.position.toArray(),C.feet[0]);assert.deepEqual(c.anchors.rightFoot.position.toArray(),C.feet[1]);assert.deepEqual(c.root.scale.toArray(),[1,1,1]);
 c.root.rotation.y=Math.PI/2;c.root.position.set(3,2,-1);c.root.updateMatrixWorld(true);const world=c.anchors.seat.getWorldPosition(new T.Vector3());near(world.y,2+C.seatHeight);near(world.x,3+C.seatCenter[2]);near(world.z,-1);
}));

test('low-poly chair meshes stand on the floor and fit within one tile with valid UVs',()=>each(c=>{
 const b=bounds(c.root);near(b.min.y,0);assert.ok(b.min.x>=-.500001&&b.max.x<=.500001&&b.min.z>=-.500001&&b.max.z<=.500001,JSON.stringify({id:c.form.id,b}));let triangles=0;
 c.root.traverse(p=>{if(p.isMesh){triangles+=(p.geometry.index?.count||p.geometry.attributes.position.count)/3;for(const a of ['position','normal','uv'])assert.ok([...p.geometry.attributes[a].array].every(Number.isFinite));assert.ok([...p.geometry.attributes.uv.array].every(v=>v>=0&&v<=1));}});assert.ok(triangles<500,c.form.id+' '+triangles);
}));

test('shared seated torso, forward rise, tail outlet and both heel channels remain unobstructed',()=>each(c=>{
 const spaces=[
  ['torso',[-.40,.481,-.30],[.40,1.30,.34]],
  ['forward rise',[-.37,.52,.32],[.37,1.35,.70]],
  ['tail outlet',[-.31,.49,-.51],[.31,.73,-.28]],
  ...[-1,1].map(side=>['heel '+side,[side*.23-.075,.012,.20],[side*.23+.075,.14,.58]])
 ];
 for(const [name,min,max]of spaces){const space=new T.Box3(new T.Vector3(...min),new T.Vector3(...max));c.root.traverse(p=>{if(!p.isMesh)return;const overlap=bounds(p).intersect(space);if(overlap.isEmpty())return;const size=overlap.getSize(new T.Vector3());assert.ok(Math.min(size.x,size.y,size.z)<1e-6,c.form.id+' '+p.name+' obstructs '+name+' '+size.toArray());});}
}));

test('all four seats have real upward-facing support beneath the pelvis rather than marker-only agreement',()=>each(c=>{
 c.root.updateMatrixWorld(true);for(const x of [-.3,0,.3])for(const z of [-.22,0,.22]){const ray=new T.Raycaster(new T.Vector3(x,.70,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(c.root.getObjectByName('Shared seat'))[0];assert.ok(hit);near(hit.point.y,.48);assert.ok(hit.face.normal.z>.99);}
}));

test('library reuses its resources, preserves future grey instances and leaves the input atlas to its owner',()=>{
 const t=new T.Texture(),l=createChairLibrary(t);let td=0,md=0;t.addEventListener('dispose',()=>td++);l.material.addEventListener('dispose',()=>md++);
 const cycle=()=>{for(const f of CHAIR_FORMS)for(const finish of f.finishes)l.build(f.id,{finish}).dispose();};cycle();const warm=l.stats();for(let i=0;i<20;i++)cycle();assert.deepEqual(l.stats(),warm);assert.equal(warm.models,0);
 l.setGrey(true);const c=l.build('wingback');c.root.traverse(p=>{if(p.isMesh)assert.equal(p.material.map,null);});l.setGrey(false);c.root.traverse(p=>{if(p.isMesh)assert.equal(p.material.map,t);});c.dispose();l.dispose();l.dispose();assert.equal(td,0);assert.equal(md,1);assert.throws(()=>l.build('wood'));assert.throws(()=>chairPaintRect('missing'));t.dispose();
});
