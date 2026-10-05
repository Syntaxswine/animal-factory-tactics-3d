import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createPaintedFireMotion} from '../dist/tactics/painted-fire-motion.js';import {makeBurnRoute,burnState,fireState,panicFeet,FIRE_TIME} from '../dist/tactics/painted-fire-state.js';import {flameSheetData} from '../dist/tactics/painted-fire-effects.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url))),fixture=JSON.parse(fs.readFileSync(new URL('../dist/tactics/fixtures/painted-fire-contract.json',import.meta.url))),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const route=(steps=3,y=0,heading=0)=>makeBurnRoute(Array.from({length:steps+1},(_,i)=>({x:4+i*Math.cos(heading),y,z:i*Math.sin(heading)})));
function setup(id='rifle'){const worker=createLightHorse(data),weapon=createWeaponModel(id);worker.equipWeapon(weapon);return {worker,weapon,motion:createPaintedFireMotion(worker),dispose(){weapon.dispose();worker.dispose();}};}
function surface(worker,filter){let min=Infinity;const v=V();for(const part of worker.parts){const a=part.geometry.attributes;for(let i=0;i<a.position.count;i++)if(filter(part,a,i)){part.getVertexPosition(i,v).applyMatrix4(part.matrixWorld);min=Math.min(min,v.y);}}return min;}
test('routes retain actual legal-length steps and cannot exceed three or cross levels',()=>{
 assert.equal(route().length,3);assert.equal(route(1).length,1);assert.equal(route(0).length,0);
 for(const points of [[],[0,1,2,3,4].map(x=>({x,z:0})),[{x:0,z:0},{x:3,z:0}],[{x:0,z:0},{x:1,z:0,y:1}]])assert.throws(()=>makeBurnRoute(points));
});
test('terminal endpoint stays on the last supplied tile for full, shortened and blocked paths',()=>{
 for(const steps of [0,1,3]){const r=route(steps);for(let t=0;t<5.5;t+=.013){const s=burnState(t,r);assert.ok(s.distance>=0&&s.distance<=r.length);if(s.ash>0){assert.deepEqual(s.point,{...r.points.at(-1),heading:0});assert.equal(s.distance,r.length);}}assert.equal(burnState(5.4,r).bodyVisible,false);}
});
test('cutoff leaves a moving tail instead of deleting the whole burst',()=>{
 assert.equal(fireState(.2).emitting,false);assert.equal(fireState(.7).emitting,true);assert.equal(fireState(1.1).emitting,false);assert.ok(fireState(1.1).head>1&&fireState(1.1).tail>0&&fireState(1.1).tail<1);assert.ok(fireState(1.6).tail>1);
});
test('blocked route keeps both soles planted, with no phantom stepping',()=>{const r=route(0);for(let t=0;t<4;t+=.02){const f=panicFeet(burnState(t,r),r);for(const side of [-1,1])assert.deepEqual(f[side],{x:-.035,y:0,z:side*.232,planted:true,worldDistance:-.035});}});
test('flame cover outlasts complete body dissolution and then settles independently',()=>{
 for(const steps of [0,1,3]){const r=route(steps),end=FIRE_TIME.hit+burnState(0,r).runEnd+1.18;for(let t=end-.5;t<end;t+=.013){const s=burnState(t,r);assert.equal(s.engulf,1);assert.ok(s.bodyVisible);}const tail=burnState(end+.1,r);assert.equal(tail.bodyVisible,false);assert.ok(tail.engulf>0&&tail.engulf<1);assert.equal(burnState(end+.41,r).engulf,0);}
});
test('cuff follows shin while sole stays rigid, and disposal restores the original skin weights',()=>{
 const w=createLightHorse(data),foot=w.parts.find(p=>p.name==='exposed hoof -1'),index=Array.from(foot.geometry.attributes.skinIndex.array),weight=Array.from(foot.geometry.attributes.skinWeight.array),m=createPaintedFireMotion(w),a=foot.geometry.attributes,shin=w.bones.findIndex(b=>b.name==='shin-1');
 try{let upper=0;for(let i=0;i<a.position.count;i++){if(a.position.getY(i)>.20){assert.equal(a.skinIndex.getY(i),shin);assert.equal(a.skinWeight.getY(i),1);upper++;}if(a.position.getY(i)<.10)assert.equal(a.skinWeight.getX(i),1);}assert.ok(upper>0);m.dispose();assert.deepEqual(Array.from(a.skinIndex.array),index);assert.deepEqual(Array.from(a.skinWeight.array),weight);}finally{w.dispose();}
});
test('bracing preserves actual sole contact and both weapon grips through reverse seeks',()=>{
 const a=setup('flamethrower');try{let reference;for(const t of [0,.1,.3,.7,1.1,1.7,.9,0]){const d=a.motion.fire(t);assert.ok(d.gripError<1e-8);const p=[-1,1].map(s=>d.feet[s].ankle);if(!reference)reference=p;else p.forEach((p,i)=>assert.ok(V(...p).distanceTo(V(...reference[i]))<1e-8));assert.ok(Math.abs(surface(a.worker,p=>p.name.includes('hoof')))<1e-6);}}finally{a.dispose();}
});
test('projector holds its emission origin until the entire emitted tail has departed',()=>{const a=setup('flamethrower');try{const origin=a.motion.fire(FIRE_TIME.ignite).muzzle;for(let t=FIRE_TIME.ignite;t<FIRE_TIME.cutoff+FIRE_TIME.travel;t+=.013)assert.ok(V(...origin).distanceTo(V(...a.motion.fire(t).muzzle))<1e-8);}finally{a.dispose();}});
test('complete burn playback has reachable joints, grounded plant surfaces and unchanged bone lengths',()=>{
 const a=setup();try{const sizes=a.worker.bones.map(b=>b.position.length()),r=route();let previous;
  for(let i=0;i<=540;i++){const d=a.motion.burn(i/100,r);assert.ok(d.gripError<1e-8);for(const s of [-1,1]){const f=d.feet[s];if(f.planted){const y=surface(a.worker,p=>p.name==='exposed hoof '+s);assert.ok(Math.abs(y)<1e-6,`sole ${s} at ${i/100}: ${y}`);if(previous?.feet[s].planted)assert.ok(V(...f.ankle).distanceTo(V(...previous.feet[s].ankle))<1e-7);}}
   for(let n=0;n<sizes.length;n++)if(a.worker.bones[n].name!=='hips')assert.ok(Math.abs(sizes[n]-a.worker.bones[n].position.length())<1e-12);previous=d;
  }
 }finally{a.dispose();}
});
test('startle keeps elbow bend and avoids the former full-extension snap',()=>{
 const a=setup();try{const r=route(),b=a.motion.bones,reach=b['forearm-1'].position.length()+b['hand-1'].position.length();let previous;
  for(let i=0;i<=60;i++){a.motion.burn(FIRE_TIME.hit+.08+i*.005,r);const shoulder=b['upperArm-1'].getWorldPosition(V()),wrist=b['hand-1'].getWorldPosition(V()),rotation=b['forearm-1'].getWorldQuaternion(new T.Quaternion());
   assert.ok(shoulder.distanceTo(wrist)<reach-.02,'free arm lost its elbow bend margin');
   if(previous)assert.ok(previous.angleTo(rotation)<.20,'forearm snapped between adjacent 5 ms samples');previous=rotation;
  }
 }finally{a.dispose();}
});
test('uneven panic steps keep contact on short and diagonal routes in either playback direction',()=>{
 const a=setup();try{for(const steps of [0,1,2,3])for(const heading of [0,Math.PI/4]){const r=route(steps,0,heading),samples=Array.from({length:109},(_,i)=>i*.05);let previous;
  for(const time of [...samples,...samples.reverse()]){const d=a.motion.burn(time,r);assert.ok(d.gripError<1e-8);assert.ok([-1,1].some(s=>d.feet[s].planted),'no supporting hoof');
   for(const side of [-1,1]){const f=d.feet[side];if(f.planted){assert.ok(Math.abs(surface(a.worker,p=>p.name==='exposed hoof '+side))<1e-6);if(previous?.feet[side].planted&&Math.abs(f.worldDistance-previous.feet[side].worldDistance)<1e-10)assert.ok(V(...f.ankle).distanceTo(V(...previous.feet[side].ankle))<1e-7);}}previous=d;
  }
 }}finally{a.dispose();}
});
test('turning paths are explicitly refused until world-space corner footholds are fitted',()=>{const a=setup();try{assert.throws(()=>a.motion.burn(1.5,makeBurnRoute([{x:0,z:0},{x:1,z:0},{x:1,z:1}])),/straight/);}finally{a.dispose();}});
test('collapse reaches the actual left-hand surface before dissolution',()=>{
 const a=setup();try{const r=route(),d=a.motion.burn(FIRE_TIME.hit+burnState(0,r).runEnd+.62,r),names=['hand-1','fingers-1'].map(n=>a.worker.bones.findIndex(b=>b.name===n));
  assert.equal(d.state.dissolve,0);const y=surface(a.worker,(p,x,i)=>{let w=0;for(let j=0;j<4;j++)if(names.includes(x.skinIndex.getComponent(i,j)))w+=x.skinWeight.getComponent(i,j);return w>.8;});assert.ok(y>=-.003&&y<.004,`palm surface ${y}`);assert.ok(surface(a.worker,()=>true)>-.005);
 }finally{a.dispose();}
});
test('released rifle accelerates downwards and comes to rest above the floor',()=>{
 const a=setup();try{const r=route(),release=FIRE_TIME.hit+burnState(0,r).runEnd+.31,ys=[];
  for(const dt of [.05,.07,.09]){const d=a.motion.burn(release+dt,r);assert.equal(d.drop.landed,false);ys.push(d.drop.height);assert.equal(d.hands.length,0);}
  assert.ok(Math.abs((ys[2]-2*ys[1]+ys[0])/.02**2+9.81)<1e-7);
  const end=a.motion.burn(5.4,r);assert.equal(end.drop.landed,true);a.weapon.root.updateMatrixWorld(true);let min=Infinity;const v=V();a.weapon.root.traverse(o=>{const p=o.geometry?.attributes.position;if(!p)return;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);min=Math.min(min,v.y);}});assert.ok(Math.abs(min-.006)<1e-6);
 }finally{a.dispose();}
});
test('seeking after ash restores visibility and gives the same pose as a fresh evaluation',()=>{
 const a=setup(),b=setup(),flamer=setup('flamethrower');try{a.motion.burn(5.4,route());const x=a.motion.burn(1.4,route()),y=b.motion.burn(1.4,route());assert.deepEqual(x,y);a.motion.burn(5.4,route());assert.throws(()=>a.motion.fire(.4),/flamethrower/);a.motion.restore();assert.ok(a.worker.parts.every(p=>p.visible));flamer.motion.burn(5.4,route());flamer.motion.fire(.4);assert.ok(flamer.worker.parts.every(p=>p.visible));}finally{a.dispose();b.dispose();flamer.dispose();}
});
test('fan begins at the actual muzzle and obeys the recorded full wall stop',()=>{
 for(const shape of [fixture.open,fixture.wall,fixture.doorway])for(const layer of [-1.6,0,1.6]){const muzzle=V(.55,.98,0),d=flameSheetData(shape,muzzle,layer);assert.ok(d.position.every(Number.isFinite));assert.deepEqual(d.position.slice(0,3),muzzle.toArray());assert.ok(d.index.every(i=>i<d.position.length/3));if(shape===fixture.wall)for(let i=0;i<d.position.length;i+=3)assert.ok(d.position[i]<=2.50001);}
});
test('ray discontinuities do not get decorative bridge triangles through the doorway wall',()=>{
 const d=flameSheetData(fixture.doorway,V(.55,.98,0));assert.ok(d.index.length<flameSheetData(fixture.open,V(.55,.98,0)).index.length);
 for(let i=0;i<d.index.length;i+=3){const points=d.index.slice(i,i+3).map(n=>V(...d.position.slice(n*3,n*3+3)));for(let j=0;j<=10;j++)for(let k=0;k<=10-j;k++){const p=points[0].clone().multiplyScalar(j/10).addScaledVector(points[1],k/10).addScaledVector(points[2],1-(j+k)/10);if(p.x>2.50001)assert.ok(Math.abs(p.z)<(p.x/2.5)*.53,'Triangle entered the wall shadow');}}
});
