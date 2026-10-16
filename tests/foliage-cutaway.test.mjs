import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {FoliageCutaway,foliageRevealAt} from '../dist/tactics/foliage-cutaway.js';
import {battleFoliageTargets,knownFoliageGround} from '../dist/tactics/battle-foliage-focus.js';
test('aperture is feathered, camera-depth aware and confined to the focus floor',()=>{
 const f={position:[0,0,0],level:1,radius:2},eye=[0,0,1];assert.equal(foliageRevealAt([0,0,3],f,eye,1),1);assert.equal(foliageRevealAt([0,0,-3],f,eye,1),0);assert.equal(foliageRevealAt([0,0,3],f,eye,0),0);assert.equal(foliageRevealAt([2,0,3],f,eye,1),0);assert.ok(foliageRevealAt([1.5,0,3],f,eye,1)>0&&foliageRevealAt([1.5,0,3],f,eye,1)<1);
});
test('only selected friendly display positions and known route tiles create apertures',()=>{
 const s={seen:new Set(['1,1','3,3','4,4']),concealedInteriors:new Set(['4,4'])},units=[{id:1,team:'squad',hp:100,x:1.25,y:1.5,z:0},{id:2,team:'guard',hp:100,x:2,y:2,z:0},{id:3,team:'squad',hp:100,x:1,y:1,z:1}],before=structuredClone(s);
 const targets=battleFoliageTargets(s,units,new Set([1,2,3]),{x:9,y:9,z:0},[{id:1,path:[{x:3,y:3},{x:4,y:4},{x:8,y:8}]}],0);
 assert.equal(targets[0].position[0],1.25);assert.ok(!targets.some(t=>t.id==='merc:2'||t.id==='merc:3'||t.id==='hover'));assert.equal(targets.length,2);assert.equal(knownFoliageGround(s,{x:4,y:4}),false);assert.deepEqual(s,before);
});
test('colour, depth and point-light shadows share bounded uniforms; fades release and materials dispose',()=>{
 const cut=new FoliageCutaway(),camera=new T.OrthographicCamera();camera.position.set(0,10,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const material=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),cut.decorate(material,0));cut.attachShadow(mesh,0);
 const targets=[{id:'unit',position:[0,0,0],level:0,radius:1.4}];for(let i=1;i<25;i++)cut.update(camera,targets,i*16);
 assert.equal(cut.uniforms.foliageFocusCount.value,1);const compiled=[];
 for(const m of [mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial]){const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};m.onBeforeCompile(shader,{});assert.equal(shader.uniforms.foliageFocus,cut.uniforms.foliageFocus);assert.match(shader.fragmentShader,/foliageReveal/);compiled.push(shader);}
 for(let i=25;i<50;i++)cut.update(camera,[],i*16);assert.equal(cut.uniforms.foliageFocusCount.value,0);cut.dispose();assert.equal(cut.depthMaterials.size,0);mesh.geometry.dispose();material.dispose();
});
