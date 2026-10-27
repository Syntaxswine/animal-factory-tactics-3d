import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {HybridRenderer} from '../dist/tactics/hybrid-renderer.js';
import {environmentGeometries} from '../dist/tactics/environment-geometry.js';
import {DaylightRig} from '../dist/tactics/daylight-rig.js';

test('only already painted base ground is omitted; uncovered ground receives shadows and upper floors and walls still cast them',()=>{
 const floor=(x,z)=>({id:`floor:${x},1,${z}`,kind:'floor',source:{x,y:1,z},material:'ground-grass',center:[x,z*2.12-.04,1],size:[1,.08,1]});
 const boxes=[floor(1,0),floor(2,0),floor(1,1),{id:'edge:e:4:1',kind:'wall',material:'concrete',source:{edge:'e:4:1'},center:[4.5,1,1],size:[.1,2,1]}],world={boxes},before=structuredClone(world),scene=new T.Scene(),structures=new T.Group(),materials=new Map();scene.add(structures);
 const owner={environmentPaint:{setMap(){}},biomes:{rebuild:()=>true,coversGround:(x,y)=>x===1&&y===1},structures,geometries:environmentGeometries(),material(kind){if(!materials.has(kind))materials.set(kind,new T.MeshStandardMaterial());return materials.get(kind);}};
 const rig=new DaylightRig(scene,{shadowMap:{}}),camera=new T.OrthographicCamera(-20,20,20,-20,.1,1800);camera.position.set(40,60,40);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 try{
  HybridRenderer.prototype.rebuild.call(owner,world,null,5,{props:[],upper:[]});rig.update(720,camera,0,true);
  const meshes=[...owner.chunks.values()],drawn=meshes.flatMap(m=>m.userData.boxes.map(b=>b.id));assert.ok(!drawn.includes('floor:1,1,0'));assert.ok(drawn.includes('floor:2,1,0'));assert.ok(drawn.includes('floor:1,1,1'));assert.ok(drawn.includes('edge:e:4:1'));
  const base=meshes.find(m=>m.userData.boxes.some(b=>b.id==='floor:2,1,0'));assert.equal(base.castShadow,false);assert.equal(base.receiveShadow,true);
  for(const id of ['floor:1,1,1','edge:e:4:1'])assert.equal(meshes.find(m=>m.userData.boxes.some(b=>b.id===id)).castShadow,true,id);
  assert.deepEqual(world,before,'The render budget cannot edit collision or navigation geometry');
 }finally{rig.dispose();for(const m of structures.children)m.dispose();for(const g of Object.values(owner.geometries))g.dispose();for(const m of materials.values())m.dispose();}
});
