// CPU surface-generation comparison, separate from GPU submission or display FPS.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {biomeFixture} from '../dist/tactics/biome-fixture.js';
import {biomePlans} from '../dist/tactics/biome-gameplay.js';
import {screenSurface} from '../dist/tactics/foliage-screen-surface.js';

const project=path.resolve(import.meta.dirname,'..'),ref=process.argv[2]||'59707c7';
const source=execFileSync('git',['-c','safe.directory='+project,'show',`${ref}:dist/tactics/foliage-screen-surface.js`],{cwd:project,encoding:'utf8'}).replace("'./biome-ground-composition.js'",JSON.stringify(pathToFileURL(path.join(project,'dist/tactics/biome-ground-composition.js')).href));
const baseline=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')),plans=biomePlans(biomeFixture());
const run=fn=>{const at=performance.now();for(const plan of plans)fn(plan);return performance.now()-at;},before=[],after=[];
for(let i=0;i<3;i++){run(baseline.screenSurface);run(screenSurface);}
for(let i=0;i<7;i++){before.push(run(baseline.screenSurface));after.push(run(screenSurface));}
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const report={baselineRef:ref,cells:plans.reduce((n,p)=>n+p.obstacles.screens.filter(s=>s.family===p.family&&s.z===p.level).length,0),baselineMs:before,currentMs:after,baselineMedianMs:median(before),currentMedianMs:median(after),note:'Warm CPU screenSurface generation for the seven-region fixture. Not display FPS or a full-sector battle benchmark.'};
const out=path.join(project,'artifacts/foliage-skins');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'canopy-build-cost.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
