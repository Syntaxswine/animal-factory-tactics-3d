import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {IMPACT_CASES,resolveImpactCase} from './gunshot-impact-cases.mjs';
import {BODY_IMPACT_VERSION,IMPACT_COORDINATES,FATAL_HEAD_RULE} from '../dist/tactics/gunshot-impacts.js';

const root=path.resolve(import.meta.dirname,'..');
const git=(...args)=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,...args],{cwd:root,encoding:'utf8'}).trim();
const sources=['dist/tactics/gunshot-impacts.js','dist/tactics/core/engine.js','dist/tactics/ballistic-shot.js','dist/tactics/core/projectiles.js','tools/core-gunshot-impacts-adapter.mjs','tools/gunshot-impact-cases.mjs','tools/generate-gunshot-impact-fixture.mjs'];
const sourceSha256=Object.fromEntries(sources.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n')).digest('hex')]));
const cases=IMPACT_CASES.map(([id,options])=>{
 const {state,before,impacts}=resolveImpactCase(options);
 return {id,options,seed:before.seed,shooterId:state.units[0].id,intendedTargetId:state.units[4].id,
  actions:state.effect.sequence.map(e=>({attackId:e.attackId,dischargeId:e.dischargeId,weapon:e.weapon,shotRoll:e.shotRoll,bodyImpacts:e.bodyImpacts})),
  result:{seed:state.seed,ap:state.units[0].ap,ammo:state.units[0].ammo,hp:state.units.map(u=>({id:u.id,hp:u.hp,casualty:u.casualty,fatalHead:u.fatalHead}))},impactCount:impacts.length};
});
const fixture={format:'animal-factory-body-impact-fixture',version:BODY_IMPACT_VERSION,coordinates:IMPACT_COORDINATES,
 source:{revision:git('rev-parse','HEAD'),hashFormat:'sha256-utf8-lf',sourceSha256},fatalHeadRule:FATAL_HEAD_RULE,cases};
const output=JSON.stringify(fixture,null,2)+'\n',file=path.join(root,'dist/tactics/fixtures/gunshot-impacts.v1.json');
if(process.argv.includes('--check')){
 // The producing commit cannot contain its own hash. Compare source hashes and
 // deterministic attacks while retaining the recorded base revision.
 const existing=JSON.parse(fs.readFileSync(file,'utf8'));fixture.source.revision=existing.source.revision;
 if(JSON.stringify(fixture)!==JSON.stringify(existing))throw Error('Gunshot impact fixture differs from its producing source or attacks');
 console.log(`Verified ${cases.length} real-attack fixture cases.`);
}else {fs.writeFileSync(file,output);console.log(`Generated ${cases.length} real-attack fixture cases from ${fixture.source.revision.slice(0,7)} plus recorded source hashes.`);}
