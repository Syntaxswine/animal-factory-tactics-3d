import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleSupportedWindow,sampleSneakWindow,SUPPORTED_DURATION,SUPPORTED_PHASES,SUPPORTED_IMPACT,SNEAK_DURATION,SNEAK_PHASES,SNEAK_IMPACT} from '../dist/tactics/weighted-window-supported.js';
import {createMotionForceAudit} from '../dist/tactics/motion-force-audit.js';
const rate=SUPPORTED_DURATION/SNEAK_DURATION,close=(a,b,eps=1e-6)=>assert.ok(Math.abs(a-b)<eps,`${a} vs ${b}`);
test('eight-second trial preserves every pose, mass and contact at matched times',()=>{
 assert.equal(SNEAK_DURATION,8);assert.equal(SUPPORTED_DURATION,13.3);
 for(let i=0;i<=400;i++){const t=8*i/400,fast=sampleSneakWindow(t),slow=sampleSupportedWindow(t*rate);assert.deepEqual(fast.points,slow.points);assert.deepEqual(fast.contacts,slow.contacts);assert.deepEqual(fast.segments,slow.segments);assert.equal(fast.phase,slow.phase);assert.equal(fast.time,t);assert.equal(fast.totalMass,81);}
 const finish=sampleSneakWindow(8);assert.equal(finish.mode,'static kneel');assert.equal(finish.balanced,true);
});
test('phase boundaries and glass elapsed time use the faster public clock',()=>{
 close(SNEAK_IMPACT*rate,SUPPORTED_IMPACT);
 for(let i=0;i<SNEAK_PHASES.length;i++){const p=SNEAK_PHASES[i],q=SUPPORTED_PHASES[i];close(p.start*rate,q.start);close(p.end*rate,q.end);assert.equal(sampleSneakWindow((p.start+p.end)/2).phase,p.label);}
 assert.equal(sampleSneakWindow(SNEAK_IMPACT-.001).glassTime,-1);close(sampleSneakWindow(SNEAK_IMPACT).glassTime,0);close(sampleSneakWindow(SNEAK_IMPACT+.2).glassTime,.2);
 close(sampleSupportedWindow(7).glassTime,7-SUPPORTED_IMPACT);
 close(sampleSneakWindow(8).glassTime,8-SNEAK_IMPACT);
});
test('force audit uses retimed derivatives rather than a slow-motion cached result',()=>{
 const slow=createMotionForceAudit(sampleSupportedWindow,{duration:SUPPORTED_DURATION,derivativeStep:.0002});
 const fast=createMotionForceAudit(sampleSneakWindow,{duration:SNEAK_DURATION,derivativeStep:.0002/rate});
 for(const sourceTime of [.7,3.3,5.8,7.4,9.8]){const a=slow.at(sourceTime),b=fast.at(sourceTime/rate);for(let j=0;j<3;j++){close(b.velocity[j],a.velocity[j]*rate,1e-6);close(b.acceleration[j],a.acceleration[j]*rate*rate,1e-4);}assert.ok(b.residualForce.every(Number.isFinite));}
 assert.ok(fast.precompute().samples.some(s=>s.warning),'timing change must not hide the existing physical hold');
});
test('sneak seek is deterministic, clamps endpoints and rejects nonfinite time',()=>{
 const saved=sampleSneakWindow(4.2);sampleSneakWindow(7);assert.deepEqual(sampleSneakWindow(4.2),saved);
 assert.deepEqual(sampleSneakWindow(-1),sampleSneakWindow(0));assert.deepEqual(sampleSneakWindow(99),sampleSneakWindow(8));
 for(const t of [NaN,Infinity,-Infinity])assert.throws(()=>sampleSneakWindow(t),/finite/);
});
