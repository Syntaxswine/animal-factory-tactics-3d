import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createSAMMissile,SAM_MISSILE} from '../dist/tactics/sam-missile.js';
import {createIntroLauncher} from '../dist/tactics/intro-launcher.js';
import {createIntroHelicopter} from '../dist/tactics/intro-helicopter.js';
import {aircraftState,aircraftPoint,missileState,missileTrail,missileSocket,tailHitPoint,shotAt,INTRO_SHOTS} from '../dist/tactics/intro-timeline.js';
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const withModel=(factory,fn)=>{const t=new T.Texture(),m=factory(t);try{fn(m,t);}finally{m.dispose();t.dispose();}};

test('missile has two continuous, solid perpendicular fin plates through its central cylinder',()=>withModel(createSAMMissile,m=>{
 assert.equal(m.fins.length,2);m.root.updateMatrixWorld(true);const normals=m.fins.map(p=>new T.Vector3(0,0,1).transformDirection(p.matrixWorld));near(normals[0].dot(normals[1]),0);
 for(const fin of m.fins){const b=fin.geometry.boundingBox;near(b.min.y,-.54);near(b.max.y,.54);near(b.max.z-b.min.z,.035);assert.ok(b.min.x<-.9&&b.max.x>-.9);
  // The face is present at the centerline, not just outside the tube.
  const origin=fin.localToWorld(new T.Vector3(-.9,0,2)),dir=new T.Vector3(0,0,-1).transformDirection(fin.matrixWorld),hits=new T.Raycaster(origin,dir).intersectObject(fin);assert.ok(hits.length&&hits[0].distance<2.1);
 }
 assert.ok(m.diagnostics().triangles<650);
 for(const p of [...m.shell.children,...m.fins])for(const attr of ['position','normal','uv'])assert.ok([...p.geometry.attributes[attr].array].every(Number.isFinite));
}));
test('body reveal and rolling preserve the 90-degree joint and borrowed texture ownership',()=>withModel(createSAMMissile,(m,t)=>{
 let disposed=0;t.addEventListener('dispose',()=>disposed++);const geo=m.fins.map(f=>f.geometry);for(let i=0;i<4;i++){m.setSection(true);assert.equal(m.shell.visible,false);m.root.rotation.x=i*Math.PI/4;m.setGrey(true);m.setGrey(false);m.setSection(false);}assert.deepEqual(m.fins.map(f=>f.geometry),geo);assert.ok(m.fins.every(f=>f.material.map===t));m.dispose();m.dispose();assert.equal(disposed,0);
}));
test('loaded missiles match launch sockets and launch one at a time without teleportation',()=>withModel(createIntroLauncher,m=>{
 m.update(17.399);for(let i=0;i<2;i++){const p=m.missiles[i].root.getWorldPosition(new T.Vector3()),s=missileState(i?17.95:17.4,i),q=m.missiles[i].root.getWorldQuaternion(new T.Quaternion());near(p.distanceTo(missileSocket(i)),0);near(p.distanceTo(s.position),0);near(Math.abs(q.dot(s.quaternion)),1);}
 m.update(17.5);assert.deepEqual(m.missiles.map(v=>v.root.visible),[false,true]);m.update(18);assert.deepEqual(m.missiles.map(v=>v.root.visible),[false,false]);m.update(15);assert.ok(m.missiles.every(v=>v.root.visible));
}));
test('fin tips clear the rails while mounted at native scale',()=>withModel(createIntroLauncher,m=>{
 m.update(17);for(const missile of m.missiles){const v=new T.Vector3();for(const fin of missile.fins){const a=fin.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i);fin.localToWorld(v);m.pitch.worldToLocal(v);assert.ok(v.y>.12,`Fin contacts rail at ${v.y}`);}}}
}));
test('first missile nose reaches the tail, and the second follows a distinct miss path',()=>{
 const s=missileState(20.5,0);near(s.position.clone().addScaledVector(s.direction,SAM_MISSILE.nose).distanceTo(tailHitPoint()),0);assert.equal(s.flying,false);assert.equal(s.hit,true);assert.equal(missileState(20.5,1).flying,true);assert.ok(missileState(21.8,1).position.distanceTo(tailHitPoint())>10);
});
test('shots have continuous time coverage; all samples and trails are deterministic through rewinds',()=>{
 for(let i=0;i<INTRO_SHOTS.length-1;i++)assert.equal(INTRO_SHOTS[i][1],INTRO_SHOTS[i+1][0]);
 for(let t=0;t<=35;t+=.037){const s=aircraftState(t);assert.ok(s.position.toArray().every(Number.isFinite));assert.ok(s.position.y>=0);assert.ok(shotAt(t).index>=0);for(let i=0;i<2;i++){assert.ok(missileTrail(t,i).length<=66);assert.ok(missileState(t,i).position.toArray().every(Number.isFinite));}}
 const a=JSON.stringify(missileTrail(19.5,0));missileTrail(30,0);assert.equal(JSON.stringify(missileTrail(19.5,0)),a);assert.throws(()=>aircraftState(NaN));assert.throws(()=>missileState(Infinity));
});
test('airframe stays rigid and the rotor slows monotonically before impact',()=>withModel(createIntroHelicopter,m=>{
 let last=-Infinity;for(let t=25;t<=28.1;t+=.01){m.update(t);assert.ok(m.rotor.rotation.y>=last-1e-8);last=m.rotor.rotation.y;assert.deepEqual(m.airframe.scale.toArray(),[1,1,1]);}
 m.update(35);assert.equal(m.intact.root.visible,true);assert.equal(m.wreck.root.parent,null);assert.ok(m.door.position.x<-1.5);m.update(0);assert.equal(m.intact.root.visible,true);near(m.door.position.x,0);
 m.setGrey(true);m.setGrey(false);m.root.traverse(o=>{if(o.name==='SAM puncture interior')assert.ok(o.material.map);});
}));
test('skids stay above the ground while the rigid cabin settles onto buckled supports',()=>withModel(createIntroHelicopter,m=>{
 for(let t=24;t<=35;t+=.023){m.update(t);const low=new T.Box3().setFromObject(m.gear,true).min.y;assert.ok(low>=-.00001,'Skids penetrate ground at '+t);if(t>=26)near(low,.002);assert.deepEqual(m.airframe.scale.toArray(),[1,1,1]);}
 m.update(25.9999);const before=new T.Box3().setFromObject(m.gear,true).min.y;m.update(26);assert.ok(Math.abs(before-new T.Box3().setFromObject(m.gear,true).min.y)<.001);
 m.update(29);near(new T.Box3().setFromObject(m.gear,true).min.y,.002);
}));
test('door and complete bench clear the near-side opening after the crash',()=>withModel(createIntroHelicopter,m=>{
 m.update(35);const meshes=[];m.root.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});
 for(const x of [-1.05,-.8,-.4])for(const y of [1.05,1.4,1.65]){const origin=m.airframe.localToWorld(new T.Vector3(x,y,2)),direction=new T.Vector3(0,0,-1).transformDirection(m.airframe.matrixWorld);assert.equal(new T.Raycaster(origin,direction,0,1.5).intersectObjects(meshes,false).length,0);}
 m.update(0);near(m.door.position.x,0);near(m.root.getObjectByName('Bench stowed against rear bulkhead').rotation.y,0);
}));
test('rotor fragment separates continuously, settles on the ground, and rewinds back onto the rotor',()=>withModel(createIntroHelicopter,m=>{
 const center=()=>m.fragment.getWorldPosition(new T.Vector3());m.update(0);const original=center();m.update(28.2499);const before=center();m.update(28.25);assert.ok(before.distanceTo(center())<.002);near(new T.Box3().setFromObject(m.fragment,true).min.y,.004);
 for(let t=28.25;t<=35;t+=.037){m.update(t);assert.ok(new T.Box3().setFromObject(m.fragment,true).min.y>=.00399);}
 m.update(35);const settled=center();m.update(0);near(center().distanceTo(original),0);m.update(35);near(center().distanceTo(settled),0);
}));
test('smoke emission uses the same full airframe transform as the visible damaged tail',()=>withModel(createIntroHelicopter,m=>{
 for(const t of [20.5,22,23,24,26.4,28.2,31]){m.update(t);const point=m.airframe.localToWorld(new T.Vector3(-3.35,1.70,.3));near(point.distanceTo(aircraftPoint(t,[-3.35,1.70,.3])),0);}
}));
