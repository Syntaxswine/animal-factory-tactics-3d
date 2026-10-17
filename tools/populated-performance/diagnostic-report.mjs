// Preserve compact diagnostic evidence separately from timed runs.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),input=path.join(root,'artifacts/texture-combat-2026-10-16'),output=path.join(root,'docs/tactics/images/texture-combat-2026-10-16');
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=name=>{const bytes=fs.readFileSync(path.join(input,name+'.json'));return {rawHash:hash(bytes),data:JSON.parse(bytes)};};
const compact=value=>JSON.parse(JSON.stringify(value,(key,v)=>key==='source'&&typeof v==='string'?{sha256:hash(v),characters:v.length}:v));
fs.mkdirSync(output,{recursive:true});
const baseline=read('graphics-baseline-cold-traced'),matrix=read('graphics-rgba-matrix'),cold=read('graphics-rgba-cold'),lightCost=read('graphics-light-cost');
const {directImage,splitImage,...parity}=matrix.data.passParity;
const budgets=matrix.data.graphics.budgets.map(b=>compact(b));
for(const {program:p}of budgets){
 const count=stage=>p.samplers.filter(s=>s.stages.includes(stage)).reduce((n,s)=>n+s.size,0);
 if(!p.linked||count('fragment')>p.limits.fragment||count('vertex')>p.limits.vertex||p.samplers.some(s=>s.units.some(u=>u>=p.limits.combined)))throw Error('Shader resource limit failed');
}
if(matrix.data.errors.length||matrix.data.graphics.failures.length||matrix.data.graphics.warnings.length||matrix.data.contextLost||matrix.data.results.some(r=>r.glError)||matrix.data.restoreCounts.some(r=>r.error))throw Error('Graphics matrix failed');
if(cold.data.errors.length||cold.data.warningCount||cold.data.glErrors.length||cold.data.contextLost||cold.data.graphics.failures.length)throw Error('Cold upload failed');
if(matrix.data.alphaParity.samples?.length!==4||matrix.data.alphaParity.samples.some(s=>s.composite.cornerRGBA.some(v=>v!==0)||s.composite.centerRGBA.some((v,i)=>Math.abs(v-s.reference.centerRGBA[i])>1)))throw Error('Fractional-alpha RGBA was not preserved');
const graphics={baseline:{rawHash:baseline.rawHash,gpu:baseline.data.gpu,limits:baseline.data.textureUnitLimits,firstUploadFailure:compact(baseline.data.graphics.failures[0]),firstWarning:compact(baseline.data.graphics.warnings[0])},
 matrix:{rawHash:matrix.rawHash,alphaParity:matrix.data.alphaParity,parity,cases:matrix.data.results,reloadCycles:matrix.data.restoreCounts,errors:matrix.data.errors,contextLost:matrix.data.contextLost,failures:compact(matrix.data.graphics.failures),warnings:compact(matrix.data.graphics.warnings),budgets},
 cold:{rawHash:cold.rawHash,errors:cold.data.errors,warnings:cold.data.warningCount,glErrors:cold.data.glErrors,contextLost:cold.data.contextLost,failures:compact(cold.data.graphics.failures)},lightCost:{rawHash:lightCost.rawHash,timings:lightCost.data.lightTimings}};
fs.writeFileSync(path.join(output,'graphics.json'),JSON.stringify(graphics,null,2));
for(const [name,image]of [['painted-models',matrix.data.image],['single-pass',directImage],['split-passes',splitImage]])fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(image.split(',')[1],'base64'));
const closeups=read('graphics-closeups');
if(closeups.data.errors.length||closeups.data.contextLost||closeups.data.closeups.length!==4||closeups.data.closeups.some(c=>c.glError))throw Error('Close-up visual verification failed');
fs.writeFileSync(path.join(output,'closeups.json'),JSON.stringify({rawHash:closeups.rawHash,cases:closeups.data.closeups.map(({image,...record})=>record)},null,2));
for(const c of closeups.data.closeups)fs.writeFileSync(path.join(output,'closeup-'+c.name.replaceAll(' ','-')+'.png'),Buffer.from(c.image.split(',')[1],'base64'));
const reference=read('combat-baseline-nodes'),candidate=read('combat-rgba-counted');
if(JSON.stringify(reference.data.actionHashes)!==JSON.stringify(candidate.data.actionHashes))throw Error('Per-action save parity failed');
const select=r=>({rawHash:r.rawHash,actionHashes:r.data.actionHashes,stateHash:r.data.stateHash,fullSaveHash:r.data.fullSaveHash,profile:r.data.cpuProfile,actions:r.data.events,cacheAudits:r.data.cacheAudits,frames:r.data.rows,longFrames:r.data.longFrames});
fs.writeFileSync(path.join(output,'combat-diagnostics.json'),JSON.stringify({timingCaveat:'Diagnostic wrappers and concurrent tests may inflate these timings. Only measurements.json contains the paired performance series.',reference:select(reference),candidate:select(candidate)},null,2));
const play=read('ordinary-play'),{image,...record}=play.data;
const restored=record.resources.slice(-3),disposed=record.events.filter(e=>e.event==='disposed-renderer');
if(record.errors.length||disposed.length!==3||restored.length!==3||restored.some(r=>r.glError||r.lost||r.phase!=='player'||r.round!==2))throw Error('Ordinary play/restore verification failed');
if(!restored.every(r=>r.geometries===restored[0].geometries&&r.textures===restored[0].textures&&r.programs===restored[0].programs)||disposed.some(r=>r.memory.geometries!==0))throw Error('Restored resource counts did not stabilize');
if(!record.events.some(e=>e.event==='save-capture'&&e.id==='auto')||!record.events.some(e=>e.event==='save-capture'&&e.id==='quick'))throw Error('Automatic and manual saves were not exercised');
fs.writeFileSync(path.join(output,'ordinary-play.json'),JSON.stringify({rawHash:play.rawHash,...record},null,2));
fs.writeFileSync(path.join(output,'ordinary-play.png'),Buffer.from(image.split(',')[1],'base64'));
console.log('Wrote compact diagnostics, exact action parity and ordinary-play records.');
