import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {StaticModelBatches,StaticSubtreeMatrices} from '../dist/tactics/static-model-batches.js';
import {createFurnitureLibrary,animateFurnitureFire} from '../dist/tactics/painted-furniture.js';
import {LightingScene} from '../dist/tactics/lighting-scene.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createBattleEquipment} from '../dist/tactics/battle-renderer.js';
import {createCasualtyWeaponSnapshot} from '../dist/tactics/casualty-weapon-assembly.js';

const count=root=>{let n=0;root.traverseVisible(o=>{if(o.isMesh)n++;});return n;};
test('static terrain avoids repeated child matrix work, follows parent movement, and restores flags',()=>{
 const parent=new T.Group(),root=new T.Group(),branch=new T.Group(),leaf=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());parent.add(root);root.add(branch);branch.add(leaf);branch.position.set(2,3,4);leaf.position.set(1,2,3);
 let multiplies=0;const original=leaf.matrixWorld.multiplyMatrices;leaf.matrixWorld.multiplyMatrices=function(...args){multiplies++;return original.apply(this,args);};
 const cache=new StaticSubtreeMatrices(root);try{
  const initial=leaf.getWorldPosition(new T.Vector3());assert.deepEqual(initial.toArray(),[3,5,7]);multiplies=0;
  for(let i=0;i<5;i++){cache.sync();parent.updateMatrixWorld(true);}assert.equal(multiplies,0);
  parent.position.set(5,-2,8);parent.rotation.y=Math.PI/2;cache.sync();const expected=new T.Vector3(3,5,7).applyMatrix4(parent.matrixWorld);assert.ok(leaf.getWorldPosition(new T.Vector3()).distanceTo(expected)<1e-8);assert.ok(multiplies>0);
  leaf.visible=false;cache.sync();assert.equal(leaf.visible,false);
 }finally{cache.dispose();assert.equal(leaf.matrixAutoUpdate,true);assert.equal(leaf.matrixWorldAutoUpdate,true);leaf.geometry.dispose();leaf.material.dispose();}
});
for(const kind of ['streetlight','floor-lamp','campfire','spotlight','wooden-spotlight-tower'])test(kind+' static batching preserves every triangle, UV, normal, material and animated parent',()=>{
 const atlas=new T.Texture(),cargo=new T.Texture(),library=createFurnitureLibrary(atlas,cargo),{root}=library.build(kind),before=count(root),anchors=[];
 root.traverse(o=>{if(!o.isMesh)anchors.push(o);});const batches=new StaticModelBatches(root);let released=0;for(const g of batches.groups)g.mesh.geometry.addEventListener('dispose',()=>released++);
 try{
  assert.ok(count(root)<before*(kind==='spotlight'?1:.7),kind+' must reduce submissions');
  for(const {mesh,parts}of batches.groups){
   assert.ok(parts.every(p=>p.parent===mesh.parent&&p.material===mesh.material&&!p.visible));
   let index=0;const g=mesh.geometry,v=new T.Vector3(),n=new T.Vector3();
   for(const p of parts){const source=p.geometry,normal=new T.Matrix3().getNormalMatrix(p.matrix),length=source.index?.count??source.attributes.position.count;
    for(let i=0;i<length;i++,index++){const a=source.index?source.index.getX(i):i,b=g.index.getX(index);v.fromBufferAttribute(source.attributes.position,a).applyMatrix4(p.matrix);n.fromBufferAttribute(source.attributes.normal,a).applyMatrix3(normal).normalize();
     assert.ok(v.distanceTo(new T.Vector3().fromBufferAttribute(g.attributes.position,b))<1e-5);assert.ok(n.distanceTo(new T.Vector3().fromBufferAttribute(g.attributes.normal,b))<1e-5);
     for(const [getter]of [['getX'],['getY']])assert.equal(g.attributes.uv[getter](b),source.attributes.uv[getter](a));
    }
   }assert.equal(index,g.index.count);
  }
  for(const p of anchors)assert.ok(p===root||p.parent,'Named groups and emitter anchors survive batching');
  const flames=root.getObjectByName('flames');if(flames){const old=flames.children.map(o=>o.scale.y);animateFurnitureFire(root,.5);assert.ok(flames.children.some((o,i)=>o.scale.y!==old[i]));assert.ok(flames.children.every(o=>o.visible));}
 }finally{const total=batches.groups.length;batches.dispose();assert.equal(released,total);assert.equal(count(root),before);library.dispose();atlas.dispose();cargo.dispose();}
});

test('live lighting batches keep private glow materials, animated heads and disposal ownership',async()=>{
 const scene=new T.Scene(),textures=[],lights=new LightingScene(scene,{loadAsync:async()=>{const t=new T.Texture();textures.push(t);return t;}},()=>{},e=>{throw e;});await lights.ready;
 try{
  lights.update({props:[{kind:'streetlight',x:10,y:10,z:0},{kind:'spotlight',x:14,y:10,z:0,lightTargets:[{x:4,y:0,z:0},{x:0,y:4,z:0}]}]},2,1320,0,true);
  assert.equal(lights.models.length,2);for(const m of lights.models){assert.ok(m.batches.groups.length);assert.equal(new Set(m.owned).size,m.owned.length);assert.ok(m.root.getObjectByName('emitter-0'));}
  const model=lights.models[1],head=model.root.getObjectByName('spot-head')||model.root.getObjectByName('spotlight-head'),before=head.quaternion.clone();lights.update({props:lights.models.map(m=>m.prop)},2,1320,.5,true);assert.ok(!head.quaternion.equals(before));
 }finally{lights.dispose();}assert.equal(scene.children.length,0);
});

for(const kind of ['pistol','rifle','shotgun','knife'])test(kind+' live equipment batches retain exact visible triangles, anchors and casualty release',()=>{
 const source=createWeaponModel(kind),asset=createBattleEquipment(kind),triangles=root=>{const result=[];root.updateMatrixWorld(true);root.traverseVisible(m=>{if(!m.isMesh)return;const g=m.geometry,a=g.attributes;for(let i=0;i<(g.index?.count??a.position.count);i+=3){const points=[];for(let j=0;j<3;j++){const v=g.index?g.index.getX(i+j):i+j,p=new T.Vector3().fromBufferAttribute(a.position,v).applyMatrix4(m.matrixWorld),n=new T.Vector3().fromBufferAttribute(a.normal,v).applyMatrix3(new T.Matrix3().getNormalMatrix(m.matrixWorld)).normalize();points.push(...p.toArray(),...n.toArray(),a.uv?.getX(v)||0,a.uv?.getY(v)||0);}result.push({material:m.material.color.getHex(),points});}});return result;};
 const sameTriangles=()=>{const actual=triangles(asset.root);for(const expected of triangles(source.root)){const index=actual.findIndex(a=>a.material===expected.material&&a.points.every((v,i)=>Math.abs(v-expected.points[i])<1e-5));assert.ok(index>=0,"Visible triangle, normal or UV changed");actual.splice(index,1);}assert.equal(actual.length,0);};
 try{
  assert.ok(count(asset.root)<count(source.root));sameTriangles();
  for(const root of [source.root,asset.root]){root.position.set(3,5,-2);root.rotation.set(.4,.8,-.2);root.scale.setScalar(1.3);}
  sameTriangles();
  for(const [id,anchor]of Object.entries(source.anchors))assert.ok(anchor.getWorldPosition(new T.Vector3()).distanceTo(asset.anchors[id].getWorldPosition(new T.Vector3()))<1e-7);
  const before=createCasualtyWeaponSnapshot(source,{floor:0}),after=createCasualtyWeaponSnapshot(asset,{floor:0});
  try{assert.ok(before&&after);assert.equal(after.drawCalls,before.drawCalls);let a=0,b=0;before.root.traverse(o=>{if(o.isMesh)a+=o.geometry.attributes.position.count;});after.root.traverse(o=>{if(o.isMesh)b+=o.geometry.attributes.position.count;});assert.equal(a,b,'release includes every triangle exactly once');}finally{before?.dispose();after?.dispose();}
  const disposed=new Map();asset.root.traverse(o=>{if(o.isMesh&&!disposed.has(o.geometry)){disposed.set(o.geometry,0);o.geometry.addEventListener('dispose',()=>disposed.set(o.geometry,disposed.get(o.geometry)+1));}});asset.dispose();asset.dispose();assert.ok([...disposed.values()].every(n=>n===1));
 }finally{source.dispose();asset.dispose();}
});

test('object-space weapon paint and flexible fuel assemblies keep their original draws',()=>{
 for(const kind of ['assault','smg','sniper','hmg','rpg','launcher','flamethrower']){const original=createWeaponModel(kind),asset=createBattleEquipment(kind);try{assert.equal(count(asset.root),count(original.root));assert.equal(asset.root.getObjectByName('Batched static model'),undefined);}finally{asset.dispose();original.dispose();}}
});
