import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {WallXray,xrayWall,xrayRadius,pickWallDoor} from '../dist/tactics/wall-xray.js';
import {wallXrayFixture} from '../dist/tactics/wall-xray-fixture.js';
import {createGame,move,stepMovement} from '../dist/tactics/core/engine.js';
import {personVisible} from '../dist/tactics/battle-visibility.js';
import {visibleLoot} from '../dist/tactics/battle-inventory.js';

function chunk(){const mesh=new T.InstancedMesh(new T.BoxGeometry(1,2,.12),new T.MeshStandardMaterial(),2);mesh.setMatrixAt(0,new T.Matrix4().makeTranslation(0,1,0));mesh.setMatrixAt(1,new T.Matrix4().makeTranslation(3,1,0));mesh.computeBoundingSphere();mesh.userData.boxes=[{id:'edge:s:0:0:door',kind:'wall',source:{edge:'s:0:0'}},{id:'edge:s:3:0:1:door',kind:'wall',source:{edge:'s:3:0:1'}}];return mesh;}
test('cursor radius tracks zoom and drawing-buffer scale, leaving disables the effect',()=>{
 const x=new WallXray();try{x.setPointer(30,40);x.update(200,100,1,2);assert.deepEqual(x.uniforms.xrayCenter.value.toArray(),[60,120]);assert.equal(x.uniforms.xrayRadius.value,xrayRadius(1)*2);assert.equal(x.uniforms.xrayActive.value,true);x.update(200,100,2,1);assert.equal(x.uniforms.xrayRadius.value,xrayRadius(1)*2);for(const p of [[-1,20],[201,20],[20,101],[null,null],[NaN,10]]){x.setPointer(...p);x.update(200,100,1);assert.equal(x.uniforms.xrayActive.value,false);}}finally{x.dispose();}
});
test('only wall surfaces use clones; source paint and texture ownership stay intact',()=>{
 const x=new WallXray(),texture=new T.Texture(),source=new T.MeshStandardMaterial({map:texture});let disposed=false;texture.addEventListener('dispose',()=>disposed=true);source.onBeforeCompile=s=>s.fragmentShader+='\n// authored paint';
 try{const m=x.material(source);assert.notEqual(m,source);assert.equal(m.map,texture);assert.equal(m,x.material(source));const shader={uniforms:{},fragmentShader:'#include <clipping_planes_fragment>'};m.onBeforeCompile(shader);assert.match(shader.fragmentShader,/authored paint/);assert.match(shader.fragmentShader,/discard/);assert.equal(shader.uniforms.xrayActive,x.uniforms.xrayActive);for(const kind of ['floor','roof','cover','prop','fence'])assert.equal(xrayWall({kind}),false);assert.equal(xrayWall({kind:'wall'}),true);}finally{x.dispose();assert.equal(disposed,false);source.dispose();texture.dispose();}
});
test('wire batches preserve original ray selection and release resources on rebuild',()=>{
 const x=new WallXray(),mesh=chunk(),chunks=new Map([['wall',mesh]]);let disposed=0;
 try{x.sync(chunks);const wire=x.overlays.get(mesh);wire.geometry.addEventListener('dispose',()=>disposed++);assert.equal(wire.geometry.instanceCount,2);assert.deepEqual(wire.geometry.getAttribute('wallMatrix').array,mesh.instanceMatrix.array);assert.equal(wire.geometry.getAttribute('position').count,24);for(let i=0;i<50;i++)x.sync(chunks);assert.equal(x.overlays.size,1);const ray=new T.Raycaster(new T.Vector3(0,1,3),new T.Vector3(0,0,-1));assert.equal(pickWallDoor(ray,chunks,0),'s:0:0');x.setPointer(10,10);x.update(100,100,1);assert.equal(pickWallDoor(ray,chunks,0),'s:0:0');assert.equal(pickWallDoor(ray,chunks,1),null);x.sync(new Map());assert.equal(disposed,1);assert.equal(mesh.children.length,0);assert.equal(x.overlays.size,0);}finally{x.dispose();mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}
});
test('X-ray does not change detection, hidden loot, wall blocking or automatic door movement',()=>{
 const state=createGame(1947,wallXrayFixture(),true,'standard'),before=structuredClone(state),x=new WallXray();
 try{for(let i=0;i<100;i++){x.setPointer(i,i);x.update(800,600,1+i/100);}assert.deepEqual(state,before);assert.equal(personVisible(state,{id:99,team:'guard',hp:45}),false);assert.equal(visibleLoot(state,{x:239,y:239,z:0,items:[{}]}),false);
  const control=structuredClone(state);for(const s of [state,control]){assert.equal(move(s,s.units[0],9,6,0),true);while(s.queue.length)stepMovement(s);assert.equal(s.edges['e:8:6'],'doorway-concrete-open');}assert.deepEqual(state,control);
 }finally{x.dispose();}
});
