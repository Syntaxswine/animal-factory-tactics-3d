import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createStrategicDestructionEffects} from '../dist/tactics/strategic-destruction-effects.js';
const ids=['radio','radar','sam'],textures=()=>[new T.Texture(),new T.Texture(),new T.Texture()];
function fixture(fn){const tx=textures(),camera=new T.OrthographicCamera();camera.position.set(9,8,10);camera.lookAt(0,2,0);try{for(const id of ids){const f=createStrategicDestructionEffects(tx,id);try{fn(f,camera);}finally{f.dispose();}}}finally{tx.forEach(t=>t.dispose());}}
test('explosions precede thick smoke and clear completely for the final wreck',()=>fixture((f,c)=>{
 for(const time of [0,7.6]){const d=f.apply(time,c);assert.equal(d.bursts+d.smoke+d.flames+d.embers,0);assert(d.lights.every(n=>n<.00001));}
 const blast=f.apply(.9,c);assert(blast.bursts>15);const smoke=f.apply(2.4,c);assert.equal(smoke.smoke,30);assert.equal(smoke.bursts,0);
}));
test('effects toggle disables all cards and flash lighting without changing time',()=>fixture((f,c)=>{f.apply(.55,c);const off=f.apply(.55,c,{visible:false});assert.equal(off.time,.55);assert.equal(off.bursts+off.smoke+off.flames+off.embers,0);assert(off.lights.every(n=>n===0));assert.equal(f.root.visible,false);assert(f.apply(.55,c).bursts>0);}));
test('smoke and bursts replay deterministically after backwards scrubbing',()=>fixture((f,c)=>{
 const snapshot=()=>{const a=[];f.root.traverse(o=>{if(o.isMesh)a.push([o.visible,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.material.uniforms.opacity.value]);});return a;};
 for(const t of [.6,1.1,2.4,4.3]){f.apply(t,c);const a=snapshot();f.apply(7.6,c);f.apply(0,c);f.apply(t,c);assert.deepEqual(snapshot(),a);}
}));
test('effects dispose owned geometry/materials once and never consume shared textures',()=>{const tx=textures();let atlasDisposed=0;tx.forEach(t=>t.addEventListener('dispose',()=>atlasDisposed++));const f=createStrategicDestructionEffects(tx,'radio'),owned=new Set(),counts=new Map();f.root.traverse(o=>{if(o.isMesh){owned.add(o.geometry);owned.add(o.material);}});for(const r of owned)r.addEventListener('dispose',()=>counts.set(r,(counts.get(r)||0)+1));f.dispose();f.dispose();assert.equal(counts.size,owned.size);assert([...counts.values()].every(n=>n===1));assert.equal(atlasDisposed,0);tx.forEach(t=>t.dispose());});
