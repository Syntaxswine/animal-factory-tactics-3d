import test from 'node:test';
import assert from 'node:assert/strict';
import {daylightAt} from '../dist/tactics/daylight.js';
import {timeOfDay} from '../dist/tactics/game-clock.js';
import {DaylightRig} from '../dist/tactics/daylight-rig.js';
import * as T from '../dist/tactics/vendor/three.module.js';
test('sun rises east, passes overhead and sets west with continuous dawn and dusk',()=>{
 assert.ok(daylightAt(360).direction[0]>0);assert.ok(daylightAt(1080).direction[0]<0);
 assert.ok(daylightAt(720).direction[1]>.95);
 assert.ok(Math.abs(daylightAt(720).direction[0])<1e-10);
 assert.equal(daylightAt(300).strength,0);assert.equal(daylightAt(360).strength,1);
 assert.equal(daylightAt(1080).strength,1);assert.equal(daylightAt(1200).strength,0);
 assert.equal(daylightAt(330).strength,.5);assert.equal(daylightAt(1140).strength,.5);
 for(const m of [0,300,360,1080,1200,1440])assert.ok(Math.abs(daylightAt(m-.001).strength-daylightAt(m+.001).strength)<.001);
 assert.deepEqual(daylightAt(480),daylightAt(1920));assert.equal(timeOfDay({minutes:330}).phase,'dawn');
});
test('world-fixed lighting excludes markers, pauses smoothing and releases shadows',()=>{
 const scene=new T.Scene(),rig=new DaylightRig(scene,{shadowMap:{}}),camera=new T.OrthographicCamera(-20,20,20,-20,.1,1800);
 camera.position.set(40,60,40);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const geometry=new T.BoxGeometry(),solid=new T.Mesh(geometry,new T.MeshStandardMaterial()),marker=new T.Mesh(geometry,new T.MeshBasicMaterial());scene.add(solid,marker);
 rig.update(600,camera,0,true);const direction=rig.sun.position.clone().sub(rig.sun.target.position).normalize();
 camera.position.set(-40,60,-40);camera.lookAt(0,0,0);camera.updateMatrixWorld();rig.update(600,camera,0);
 assert.ok(direction.distanceTo(rig.sun.position.clone().sub(rig.sun.target.position).normalize())<1e-10);
 assert.ok(solid.castShadow&&solid.receiveShadow);assert.equal(marker.castShadow,false);
 rig.update(601,camera,0);assert.equal(rig.shown,600);rig.update(601,camera,180);assert.ok(rig.shown>600&&rig.shown<601);
 rig.update(0,camera,180,true);assert.equal(rig.sun.visible,false);assert.ok(rig.ambient.intensity>0);
 rig.dispose();assert.equal(scene.children.filter(o=>o.isLight).length,0);geometry.dispose();solid.material.dispose();marker.material.dispose();
});
