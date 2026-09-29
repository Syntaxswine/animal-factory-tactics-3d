import test from 'node:test';
import assert from 'node:assert/strict';
import {weightedPose} from '../dist/tactics/weighted-window.js';
import {rollShape} from '../dist/tactics/weighted-roll.js';
import {sampleBracedWindow} from '../dist/tactics/weighted-window-braced.js';
import {jointLimitReport} from '../dist/tactics/body-joint-limits.js';
test('known backwards knee and neck tuck are flagged, not accepted as compact',()=>{
 const r=jointLimitReport(rollShape());
 assert.ok(r.warnings.some(j=>j.name==='knee -1'&&Math.abs(j.angle+150)<1e-8));
 assert.ok(r.warnings.some(j=>j.name==='neck / head flexion'&&j.angle>150));
 assert.ok(jointLimitReport(sampleBracedWindow(1.91)).warnings.some(j=>j.name==='spine flexion'));
});
test('normal flexion passes and warning survives rigid rotation',()=>{
 const angles={lumbar:80,shoulders:65,neck:65,head:55};for(const s of [-1,1])Object.assign(angles,{['knee'+s]:-50,['ankle'+s]:-120});
 const pose=weightedPose(angles),before=jointLimitReport(pose);assert.equal(before.warnings.length,0);
 // Rotate all points about Y, including the hinge axis implicit in hip width.
 for(const p of Object.values(pose.points)){const x=p[0],z=p[2];p[0]=z;p[2]=-x;}
 const after=jointLimitReport(pose);assert.equal(after.warnings.length,0);for(let i=0;i<before.joints.length;i++)assert.ok(Math.abs(before.joints[i].angle-after.joints[i].angle)<1e-9);
});
test('out of plane bending cannot silently appear as a valid zero flexion knee',()=>{
 const p=weightedPose({lumbar:90,shoulders:90,neck:90,head:90});p.points['knee-1'][2]-=.3;
 assert.ok(jointLimitReport(p).warnings.some(j=>j.name==='knee -1'&&j.planeError>.2));
});
test('sideways neck or spine does not masquerade as zero sagittal flexion',()=>{
 const p=weightedPose({lumbar:90,shoulders:90,neck:90,head:90});
 p.points.neck=p.points.shoulders.map((v,i)=>v+(i===2?.14:0));
 p.points.head=p.points.neck.map((v,i)=>v+(i===2?.14:0));
 assert.ok(jointLimitReport(p).warnings.some(j=>j.name==='neck / head flexion'&&j.planeError>.99));
 p.points.shoulders=p.points.lumbar.map((v,i)=>v+(i===2?.22:0));
 assert.ok(jointLimitReport(p).warnings.some(j=>j.name==='spine flexion'&&j.planeError>.99));
});
