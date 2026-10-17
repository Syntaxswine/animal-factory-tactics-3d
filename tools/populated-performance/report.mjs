// Compact, reproducible evidence. Raw JSON remains in the private artifact folder.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),input=path.join(root,'artifacts/texture-combat-2026-10-16'),output=path.join(root,'docs/tactics/images/texture-combat-2026-10-16');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const stats=values=>{const a=values.toSorted((a,b)=>a-b);return {n:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1),total:a.reduce((a,b)=>a+b,0),over50:a.filter(n=>n>50).length,over200:a.filter(n=>n>200).length};};
const runs=[],groups=[];
for(const tag of ['gfx','base','corrected'])for(const size of ['normal','large']){
 const ordered=['a1','b1','b2','a2','a3','b3'].map(suffix=>{
  const label=`${tag}-${size}-${suffix}`,file=path.join(input,label+'.json'),bytes=fs.readFileSync(file),r=JSON.parse(bytes);
  if(r.errors.length||r.ticks!==53||!r.fullTurnComplete||r.hiddenFrames||!r.saveValid)throw Error('Incomplete or invalid run: '+label);
  const version=suffix[0]==='a'?(tag==='corrected'?'graphics-rgba':'baseline'):(tag==='gfx'?'graphics-rgba':'combat-rgba');
  if(r.postPresentationStateHash!==r.stateHash)throw Error('Presentation changed authoritative state: '+label);
  if(version!=='baseline'&&(r.warningCount||r.glErrors.length||r.contextLost))throw Error('Candidate graphics failure: '+label);
  const record={label,rawHash:digest(bytes),build:r.manifest.builds[suffix[0]==='a'?(tag==='corrected'?'graphics-rgba':'baseline'):(tag==='gfx'?'graphics-rgba':'combat-rgba')].hash,
   resolution:r.resolution,viewport:r.displayViewport,dpr:r.dpr,browser:r.browser,gpu:r.gpu,limits:r.textureUnitLimits,fixtureHash:r.fixtureHash,seed:r.initialSeed,startedAt:r.measurementStartedAt,endedAt:r.measurementEndedAt,
   simulation:stats(r.events.map(e=>e.ms)),first40:stats(r.events.slice(0,40).map(e=>e.ms)),frameCpu:stats(r.rows.map(e=>e.cpu)),raf:r.summary.raf,draws:r.summary.calls,
   firstShot:r.events.find(e=>e.tick===6),lastFrameAt:r.rows.at(-1).t+r.rows.at(-1).cpu,memory:r.memory,glErrors:r.glErrors,warnings:r.warningCount,
   saveHash:r.fullSaveHash,stateHash:r.stateHash,sourceHashes:r.sourceHashes,actions:r.events.map(({tick,action,input,ms})=>({tick,action,input,ms}))};
  runs.push(record);return record;
 });
 const a=ordered.filter(r=>r.label.split('-').at(-1)[0]==='a'),b=ordered.filter(r=>r.label.split('-').at(-1)[0]==='b');
 if(!ordered.every(r=>r.saveHash===ordered[0].saveHash))throw Error('Complete-save parity failed: '+tag+' '+size);
 const median=(side,key)=>stats(side.map(r=>r.simulation[key])).median;
 groups.push({tag,size,order:ordered.map(r=>r.label),pairs:[1,2,3].map(i=>{const reference=ordered.find(r=>r.label.endsWith('a'+i)),candidate=ordered.find(r=>r.label.endsWith('b'+i));return {reference:reference.label,candidate:candidate.label,p95Reduction:1-candidate.simulation.p95/reference.simulation.p95,totalReduction:1-candidate.simulation.total/reference.simulation.total};}),
  reference:{median:median(a,'median'),p95:median(a,'p95'),p99:median(a,'p99'),total:median(a,'total'),worst:Math.max(...a.map(r=>r.simulation.max)),frameCpu:stats(a.map(r=>r.frameCpu.median)).median},
  candidate:{median:median(b,'median'),p95:median(b,'p95'),p99:median(b,'p99'),total:median(b,'total'),worst:Math.max(...b.map(r=>r.simulation.max)),frameCpu:stats(b.map(r=>r.frameCpu.median)).median},
  p95Reduction:1-median(b,'p95')/median(a,'p95'),allSavesEqual:ordered.every(r=>r.saveHash===ordered[0].saveHash)});
}
fs.mkdirSync(output,{recursive:true});
const builds=Object.fromEntries(['baseline','graphics-rgba','combat-rgba'].map(label=>{const r=JSON.parse(fs.readFileSync(path.join(input,'builds',label,'manifest.json')));return [label,{commit:r.commit,hash:r.hash,files:r.files}];}));
fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify({builds,groups,runs},null,2));
for(const [name,label]of [['baseline','gfx-normal-a1'],['graphics','gfx-normal-b1'],['combat','base-normal-b1']]){const r=JSON.parse(fs.readFileSync(path.join(input,label+'.json')));fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(r.image.split(',')[1],'base64'));}
console.log(JSON.stringify(groups,null,2));
