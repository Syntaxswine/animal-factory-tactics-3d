import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../dist/tactics/vendor/three.module.js';
import {truckPaintCameras,FRAME} from '../dist/tactics/canvas-truck-paint.js';
test('six truck paint cameras share centered orthographic registration with distinct axes',()=>{
 const cameras=truckPaintCameras(),center=new T.Vector3(...FRAME.center);assert.equal(cameras.length,6);
 const axes=new Set();for(const c of cameras){const p=center.clone().project(c);assert.ok(Math.abs(p.x)<1e-9&&Math.abs(p.y)<1e-9);assert.equal(c.right-c.left,FRAME.size);const dir=c.position.clone().sub(center).normalize();axes.add(dir.toArray().join(','));assert.ok(Math.abs(c.position.distanceTo(center)-FRAME.distance)<1e-9);}
 assert.equal(axes.size,6);
 // Top and underside preserve nose-right atlas layout; projecting +X goes right.
 for(const i of [4,5])assert.ok(center.clone().add(new T.Vector3(1,0,0)).project(cameras[i]).x>0);
});
