// Run as a report by default; --strict fails if any sampled gate remains held.
// This is deliberately independent of the UI's faster 40 ms preview scan.
import fs from 'node:fs/promises';
import {createMotionForceAudit} from '../dist/tactics/motion-force-audit.js';
import {collisionReport} from '../dist/tactics/body-collisions.js';
import {jointLimitReport} from '../dist/tactics/body-joint-limits.js';
const entry=process.argv.find(a=>a.startsWith('--entry='))?.split('=')[1]||'braced';
let sampler,duration,phases;
if(entry==='braced'){const m=await import('../dist/tactics/weighted-window-braced.js');sampler=m.sampleBracedWindow;duration=m.BRACED_DURATION;phases=m.BRACED_PHASES;}
else if(entry==='dive'){const m=await import('../dist/tactics/weighted-window.js');sampler=m.sampleWeightedWindow;duration=m.WINDOW_DURATION;phases=m.WINDOW_PHASES;}
else if(entry==='sneak'){const m=await import('../dist/tactics/weighted-window-supported.js');sampler=m.sampleSneakWindow;duration=m.SNEAK_DURATION;phases=m.SNEAK_PHASES;}
else if(entry==='supported'){const m=await import('../dist/tactics/weighted-window-supported.js');sampler=m.sampleSupportedWindow;duration=m.SUPPORTED_DURATION;phases=m.SUPPORTED_PHASES;}
else throw Error('Unknown entry: '+entry);
const step=.005,audit=createMotionForceAudit(sampler,{duration,step,events:phases.map(p=>p.end)}),force=audit.precompute();
let jointWarnings=0,overlapWarnings=0,worldWarnings=0,peakSpeed={value:0,time:0,joint:''},worstOverlap={penetration:0},last=null;
const failures=[];
for(let i=0;i<=Math.ceil(duration/step);i++){
 const t=Math.min(duration,i*step),s=sampler(t),j=jointLimitReport(s),c=collisionReport(s);
 jointWarnings+=Number(j.warnings.length>0);overlapWarnings+=Number(c.overlaps.some(h=>h.kind==='self'&&h.penetration>.02));worldWarnings+=Number(c.overlaps.some(h=>h.kind!=='self'));
 for(const h of c.overlaps)if(h.penetration>worstOverlap.penetration)worstOverlap={...h,time:t};
 if(last&&t>last.time)for(const [name,p]of Object.entries(s.points)){const speed=Math.hypot(...p.map((v,k)=>v-last.points[name][k]))/(t-last.time);if(speed>peakSpeed.value)peakSpeed={value:speed,time:t,joint:name};}
 if(j.warnings.length||c.overlaps.some(h=>h.penetration>.02))failures.push({time:t,joints:j.warnings.map(j=>j.name),worstOverlap:c.overlaps[0]||null});
 last={...s,time:t};
}
const held=force.samples.some(s=>s.warning)||jointWarnings>0||overlapWarnings>0||worldWarnings>0||peakSpeed.value>8;
const report={entry,step,duration,status:held?'HELD':'NO SAMPLED WARNINGS — independent visual and impact review still required',peakForce:force.peakForce,peakTorque:force.peakTorque,forceWarningFraction:force.warningFraction,jointWarningSamples:jointWarnings,selfOverlapSamples:overlapWarnings,worldOverlapSamples:worldWarnings,peakSpeed,worstOverlap,limits:audit.metadata,limitations:['Original mannequin mass and thickness only; not animal/equipment fit.','Impact impulses are not certified; discontinuity peaks are not exempt.','Nonadjacent proxy overlaps above 0.02 tile remain a hold even when they reflect coarse baseline capsules.','Adjacent foldbacks need the joint checks; many anatomical joints remain unmodelled.'],failures};
const out=new URL('../artifacts/weighted-motion-gate/',import.meta.url);await fs.mkdir(out,{recursive:true});await fs.writeFile(new URL(entry+'.json',out),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({entry,status:report.status,forceWarningFraction:force.warningFraction,peakForceBW:force.peakForce.forceRatio,peakTorqueNm:force.peakTorque.torqueMagnitude,jointWarningSamples:jointWarnings,selfOverlapSamples:overlapWarnings,worldOverlapSamples:worldWarnings,peakSpeed},null,2));
if(held&&process.argv.includes('--strict'))process.exitCode=1;
