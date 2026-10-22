import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createBloodSprayMotion} from '../dist/tactics/painted-blood-spray-motion.js';
import {createBloodExitMotion,createPaintedBloodExit} from '../dist/tactics/painted-blood-exit.js';
import {createBloodStain,createBloodStainLayer} from '../dist/tactics/painted-blood-stain.js';
const V=(...a)=>new T.Vector3(...a),base=new URL('../dist/tactics/',import.meta.url);
function actor(id){const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id),worker=profile.create(JSON.parse(fs.readFileSync(new URL(profile.file,base),'utf8'))),posture=createBattlePosture(worker,profile);worker.pose('neutral');posture.apply({pose:{}},{equipment:false});posture.ground();worker.root.updateMatrixWorld(true);worker.skeleton.update();return {worker,profile,posture};}
function contact(worker,sign=1,y=1.09,z=.045){const ray=new T.Raycaster(V(sign*3,y,z),V(-sign,0,0),0,6);ray.layers.enableAll();const hit=ray.intersectObjects(worker.parts,false)[0];assert.ok(hit,'Authored ray intersects body');const normal=new T.Triangle(...['a','b','c'].map(k=>hit.object.getVertexPosition(hit.face[k],V()).applyMatrix4(hit.object.matrixWorld))).getNormal(V());return {source:hit.object,point:hit.point,normal};}
function release(a){a.worker.dispose();a.worker.skeleton.dispose();}
test('Exit spray is a fuller forward effect with seeded bounded travel and no implicit entrance dependency',()=>{
 const m=createBloodExitMotion({seed:9}),other=createBloodExitMotion({seed:9});assert.equal(m.buffer.count,32);assert.ok(m.buffer.count>createBloodSprayMotion().buffer.count);assert.deepEqual(m.particles,other.particles);
 const sample=m.sample(.2),saved=Array.from(sample.launch);assert.ok(sample.launch[6]>0);assert.ok(sample.fall[2]<0);m.sample(.4);assert.equal(m.sample(.2),sample);assert.deepEqual(Array.from(sample.launch),saved);
 for(const t of [-1,0,.06,.25,.6,1e8]){const b=m.sample(t);assert.ok(Array.from(b.launch).every(v=>Number.isFinite(v)&&Math.abs(v)<1.8));if(t<0||t>=.6)assert.ok(Array.from(b.alpha).every(v=>v===0));}assert.throws(()=>m.sample(NaN),/Finite/);
 const reduced=createBloodExitMotion({reduced:true});assert.equal(reduced.buffer.count,8);const still=reduced.sample(.08,{still:true});assert.equal(Array.from(still.alpha).filter(a=>a>0).length,1);assert.ok(Array.from(still.launch).every(v=>v===0));assert.ok(Array.from(still.fall).every(v=>v===0));
});
test('Exit renderer keeps world-down gravity and world paths when the camera turns',()=>{
 const texture=new T.Texture(),effect=createPaintedBloodExit(texture),camera=new T.OrthographicCamera(-1,1,1,-1,.1,20),frame=new T.Matrix4().makeRotationZ(Math.PI/2);frame.setPosition(2,3,4);effect.setFrame(frame);const matrix=new T.Matrix4(),points=[];
 for(const z of [5,-5]){camera.position.set(0,1,z);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);effect.update(.2,camera);effect.mesh.getMatrixAt(2,matrix);points.push(V().setFromMatrixPosition(matrix));}
 assert.ok(points[0].distanceTo(points[1])<1e-6);const b=effect.motion.buffer,expected=V().fromArray(b.launch,6).applyMatrix4(frame);expected.y+=b.fall[2];assert.ok(points[0].distanceTo(expected)<1e-5);effect.dispose();texture.dispose();
});
test('A stain uses original triangle weights and remains on the moving horse through stance and root changes',()=>{
 const a=actor('horse'),texture=new T.Texture(),c=contact(a.worker),sourceGeometry=c.source.geometry,original=new Float32Array(sourceGeometry.attributes.position.array),material=c.source.material,stain=createBloodStain(texture,c);assert.ok(stain);assert.equal(stain.mesh.parent,c.source);assert.equal(stain.mesh.skeleton,c.source.skeleton);
 for(const pose of [{kneel:1},{prone:1},{}]){
  a.worker.pose('neutral');a.posture.apply({pose},{equipment:false});a.posture.ground();a.worker.root.position.add(V(2,1,-3));a.worker.root.rotation.y=.8;a.worker.root.scale.set(1.2,.9,1.1);a.worker.root.updateMatrixWorld(true);a.worker.skeleton.update();
  for(let i=0;i<stain.sourceVertices.length;i++){const p=stain.mesh.getVertexPosition(i,V()).applyMatrix4(stain.mesh.matrixWorld),q=c.source.getVertexPosition(stain.sourceVertices[i],V()).applyMatrix4(c.source.matrixWorld);assert.ok(p.distanceTo(q)<1e-6,'Stain vertex follows its exact original body vertex');}
  a.worker.root.scale.setScalar(1);
 }
 assert.deepEqual(sourceGeometry.attributes.position.array,original);assert.equal(c.source.material,material);stain.dispose();texture.dispose();release(a);
});
test('Entry and exit patches are local, preserve ownership and clear without disposing shared skins or skeletons',()=>{
 const a=actor('horse'),texture=new T.Texture(),entry=contact(a.worker),exit=contact(a.worker,-1),layer=createBloodStainLayer(texture,{parts:a.worker.parts,maxStains:2});let textures=0,skeletons=0;texture.addEventListener('dispose',()=>textures++);const originalDispose=a.worker.skeleton.dispose.bind(a.worker.skeleton);a.worker.skeleton.dispose=()=>{skeletons++;originalDispose();};
 const first=layer.stamp({...entry,kind:'entry'}),second=layer.stamp({...exit,kind:'exit',width:.26,height:.31});assert.ok(first&&second);assert.ok(first.triangles<entry.source.geometry.index.count/3,'No full-body second skin');assert.equal(first.mesh.material.depthWrite,false);assert.equal(first.mesh.castShadow,false);
 assert.throws(()=>layer.stamp({...entry,source:new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial())}),/not owned/);
 let removed=0;first.mesh.geometry.addEventListener('dispose',()=>removed++);layer.stamp(entry);assert.equal(removed,1);assert.equal(layer.stains.length,2);layer.dispose();layer.dispose();assert.equal(layer.stains.length,0);assert.equal(textures,0);assert.equal(skeletons,0);texture.dispose();release(a);
});
test('Persistent stains follow the native skeletal models across the complete twelve-animal roster',()=>{
 const texture=new T.Texture();
 for(const profile of ANIMAL_MOTION_CATALOG){const a=actor(profile.id),c=contact(a.worker,1,profile.id==='hen'?1.02:1.09),stain=createBloodStain(texture,c);assert.ok(stain,profile.id);const bone=a.worker.bones.find(b=>b.name==='spine'||b.name==='breast');bone.rotation.z+=.2;a.worker.root.rotation.y=.5;a.worker.root.updateMatrixWorld(true);a.worker.skeleton.update();for(let i=0;i<stain.sourceVertices.length;i++){const p=stain.mesh.getVertexPosition(i,V()).applyMatrix4(stain.mesh.matrixWorld),q=c.source.getVertexPosition(stain.sourceVertices[i],V()).applyMatrix4(c.source.matrixWorld);assert.ok(p.distanceTo(q)<1e-6,profile.id);}stain.dispose();release(a);}texture.dispose();
});
test('A stain excludes an overlapping rear face and a deeper forward-facing surface',()=>{
 const positions=[-.1,-.1,0,.1,-.1,0,0,.1,0, -.1,-.1,-.01,0,.1,-.01,.1,-.1,-.01, -.1,-.1,-.12,.1,-.1,-.12,0,.1,-.12],geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const material=new T.MeshBasicMaterial(),source=new T.Mesh(geometry,material),scene=new T.Scene(),texture=new T.Texture();scene.add(source);scene.updateMatrixWorld(true);
 const stain=createBloodStain(texture,{source,point:V(),normal:V(0,0,1),width:.3,height:.3,depth:.03});assert.ok(stain);assert.equal(stain.triangles,1);assert.deepEqual(stain.sourceVertices,[0,1,2],'Only the shallow front triangle receives the entry paint');
 stain.dispose();texture.dispose();geometry.dispose();material.dispose();
});
test('Invalid or distant stains create no geometry and the new painted atlases match recorded provenance',()=>{
 const a=actor('horse'),texture=new T.Texture(),c=contact(a.worker);assert.throws(()=>createBloodStain(texture,{...c,width:Infinity}),/Invalid/);assert.throws(()=>createBloodStain(texture,{...c,normal:V()}),/required/);assert.equal(createBloodStain(texture,{...c,point:V(100,100,100)}),null);texture.dispose();release(a);
 for(const folder of ['painted-blood-exit','painted-blood-stains']){const dir=new URL('../dist/assets/effects/'+folder+'/',import.meta.url),m=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));for(const asset of [m.source,m.runtime]){const data=fs.readFileSync(new URL(asset.file,dir));assert.equal(data[25],6);assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256);}assert.equal(m.runtime.width,512);assert.equal(fs.readFileSync(new URL('generation-prompt.txt',dir),'utf8'),m.generation.prompt);}
});
