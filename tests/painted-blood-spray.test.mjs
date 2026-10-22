import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BLOOD_CELLS} from '../dist/tactics/painted-blood-spray-data.js';
import {createBloodSprayMotion} from '../dist/tactics/painted-blood-spray-motion.js';
import {createPaintedBloodSpray} from '../dist/tactics/painted-blood-spray.js';
test('Seeded motion is reproducible while scrubbing and reuses its buffers',()=>{
 const a=createBloodSprayMotion({seed:81}),b=createBloodSprayMotion({seed:81}),c=createBloodSprayMotion({seed:82}),buffer=a.sample(.17),first=Array.from(buffer.launch);
 a.sample(.37);assert.equal(a.sample(.17),buffer);assert.deepEqual(Array.from(buffer.launch),first);assert.deepEqual(a.particles,b.particles);assert.notDeepEqual(a.particles,c.particles);
});
test('The bounded ordinary spray separates, falls and fully retires within .48 seconds',()=>{
 const m=createBloodSprayMotion();let peak=0;
 for(const time of [-2,0,.02,.06,.12,.23,.35,.48,1e7]){const b=m.sample(time);peak=Math.max(peak,Array.from(b.alpha).filter(a=>a>.015).length);assert.ok(Array.from(b.launch).every(Number.isFinite));assert.ok(Array.from(b.launch).every(v=>Math.abs(v)<.8));if(time<0||time>=.48)assert.ok(Array.from(b.alpha).every(a=>a===0));}
 assert.equal(peak,18);const b=m.sample(.18);assert.ok(b.launch[6]>0);assert.ok(b.fall[2]<0);assert.throws(()=>m.sample(NaN),/Finite/);
});
test('Reduced and still modes remain brief and stationary when requested',()=>{
 const m=createBloodSprayMotion({reduced:true});assert.equal(m.buffer.count,5);const b=m.sample(.06,{still:true});assert.equal(Array.from(b.alpha).filter(a=>a>0).length,1);assert.ok(Array.from(b.launch).every(v=>v===0));assert.ok(Array.from(b.fall).every(v=>v===0));assert.ok(Array.from(m.sample(.2,{still:true}).alpha).every(v=>v===0));
});
test('A supplied emission transform never rotates gravity away from world down',()=>{
 const texture=new T.Texture(),e=createPaintedBloodSpray(texture),camera=new T.OrthographicCamera(-1,1,1,-1,.1,20);camera.position.z=5;camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 const frame=new T.Matrix4().makeRotationZ(Math.PI/2);frame.setPosition(3,4,5);e.setFrame(frame);e.update(.18,camera);const matrix=new T.Matrix4();e.mesh.getMatrixAt(2,matrix);const actual=new T.Vector3().setFromMatrixPosition(matrix),b=e.motion.buffer,expected=new T.Vector3().fromArray(b.launch,6).applyMatrix4(frame);expected.y+=b.fall[2];assert.ok(actual.distanceTo(expected)<1e-5);
 const halfY=(Math.abs(matrix.elements[1])+Math.abs(matrix.elements[5]))*.5;e.update(.18,camera,{floor:actual.y-halfY+1e-4});assert.equal(e.mesh.geometry.attributes.sprayAlpha.getX(2),0,'Whole rotated card respects a supplied floor');
 assert.equal(e.mesh.material.depthTest,true);assert.equal(e.mesh.material.depthWrite,false);assert.equal(e.mesh.castShadow,false);e.dispose();texture.dispose();
});
test('The emitter owns its geometry and material, leaves the shared texture to its caller',()=>{
 const texture=new T.Texture(),e=createPaintedBloodSpray(texture);let t=0,g=0,m=0;texture.addEventListener('dispose',()=>t++);e.mesh.geometry.addEventListener('dispose',()=>g++);e.mesh.material.addEventListener('dispose',()=>m++);e.dispose();e.dispose();assert.equal(g,1);assert.equal(m,1);assert.equal(t,0);texture.dispose();
});
test('The painted runtime atlas preserves alpha, bounded cells and its recorded source hashes',()=>{
 const dir=new URL('../dist/assets/effects/painted-blood/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
 for(const asset of [manifest.source,manifest.runtime]){const data=fs.readFileSync(new URL(asset.file,dir));assert.equal(data[25],6);assert.equal(data.readUInt32BE(16),asset.width);assert.equal(data.readUInt32BE(20),asset.height);assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256);}
 assert.equal(manifest.runtime.width,512);assert.equal(BLOOD_CELLS.length,4);for(const cell of BLOOD_CELLS){const [x,y,w,h]=cell.uv;assert.ok(x>=0&&y>=0&&x+w<=1&&y+h<=1);assert.ok(cell.pivot.every(v=>v>=0&&v<=1));}
});
test('The optional flipbook has one fixed contact pivot and explicit sub-second frame timings',()=>{
 const dir=new URL('../dist/assets/effects/painted-blood/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8')),f=manifest.flipbook;assert.ok(f);assert.equal(f.times.length,f.columns*f.rows);assert.equal(f.times[0],0);assert.equal(f.times.at(-1),.48);assert.ok(f.times.every((t,i)=>i===0||t>f.times[i-1]));assert.ok(f.pivotPixels.every(v=>v>0&&v<f.frameSize));
 const bytes=fs.readFileSync(new URL(f.file,dir));assert.equal(bytes[25],6);assert.equal(bytes.readUInt32BE(16),f.width);assert.equal(bytes.readUInt32BE(20),f.height);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);
});
