import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const sharp=createRequire(import.meta.url)(process.env.SHARP_PATH||'sharp'),root=path.resolve(import.meta.dirname,'..');
const dir=path.join(root,'docs/tactics/review-images/completed-characters'),base=path.join(root,'artifacts/completed-characters');fs.mkdirSync(dir,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const runs={};for(const mode of ['models','portraits','motion','integration','details','seats','package','integration-packaged-bull','integration-packaged-rabbit','integration-packaged-dog']){
 const folder=path.join(base,mode),r=json(path.join(folder,'checks.json')),helper=json(path.join(folder,'browser-helper.json')),stopped=json(path.join(folder,'browser-stopped.json'));
 assert.deepEqual(r.errors,[]);assert.ok(stopped.exited&&stopped.portReleased);assert.equal(helper.pid,stopped.pid);assert.equal(helper.creationFileTime,stopped.creationFileTime);
 runs[mode]={records:r.checks.length,screenshots:r.checks.filter(c=>c.sha256).length,errors:r.errors,disposableBrowserStopped:true};
}
const regression=json(path.join(base,'regression-result.json'));assert.equal(regression.exitCode,0);
const parseTests=file=>{const text=fs.readFileSync(path.join(base,file),'utf8'),read=key=>Number(text.match(new RegExp('(?:#|ℹ) '+key+' (\\d+)'))?.[1]);const count={tests:read('tests'),pass:read('pass'),fail:read('fail'),todo:read('todo')};assert.ok(count.tests>0&&count.pass===count.tests&&count.fail===0);return count;};
const tests={regression:{...parseTests('regression.txt'),files:regression.files,seconds:regression.elapsedSeconds},focusedPhysics:parseTests('physics-final.txt'),additional:parseTests('additional-checks.txt'),rosterCasesRechecked:parseTests('roster-recheck.txt')};
const previous='4f5f53917990ec03b2f14c65f067e4b99ec8fcaa',sources={};
for(const file of ['bull-author-data.json','bull-10k-data.json','rabbit-author-data.json','rabbit-10k-data.json','dog-guard-author-data.json','dog-guard-10k-data.json'].map(f=>'dist/tactics/'+f).concat(['bull-worker-model-paint-v2.png','rabbit-woman-model-paint-v1.png','dog-woman-model-paint-v1.png'].map(f=>'dist/assets/characters/lowpoly-proof/'+f))){
 const bytes=fs.readFileSync(path.join(root,file)),before=execFileSync('git',['show',previous+':'+file],{cwd:root,maxBuffer:32*1024*1024,windowsHide:true}),canonical=file.endsWith('.json')?Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')):bytes;
 assert.ok(canonical.equals(before),'Accepted source changed: '+file);sources[file]={sha256:hash(bytes),unchangedFrom:previous,comparison:file.endsWith('.json')?'exact after Git line-ending normalization':'byte exact'};
}
const portraits={};for(const species of ['bull','rabbit','dog'])for(const prefix of ['','red-hats/']){const file='dist/assets/characters/'+prefix+species+'-idle.png',bytes=fs.readFileSync(path.join(root,file)),meta=await sharp(bytes).metadata();assert.equal(meta.width,256);assert.equal(meta.height,256);assert.ok(meta.hasAlpha);portraits[file]={sha256:hash(bytes),width:256,height:256,alpha:true};}
// A contact sheet composes the actual reviewed renderer output. It is not a new
// skin or an illustration standing in for the models being delivered.
const width=1800,cell=600,rowHeight=350,header=100,labels=['Bull','Rabbit','Dog'],species=['bull','rabbit','dog'],rows=[
 ['Both outfits · horse scale reference',s=>'details/'+s+'-paint.png'],
 ['Armed idle · heavy equipment',s=>'motion/'+s+'-idle-red-hats-hmg.png'],
 ['Crawl · native feet and carried equipment',s=>'package/'+s+'-crawl-source.png'],
 ['Supported mantle · roof',s=>'motion/'+s+'-roof-mantle-red-hats.png'],
 ['Seated · shared wingback contacts',s=>'seats/'+s+'-normal-wingback.png']
],composite=[];
const svg=(w,h,text,size=24)=>Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#202d26"/><text x="18" y="${h*.65}" fill="#f4e4b8" font-family="sans-serif" font-size="${size}">${text}</text></svg>`);
composite.push({input:svg(width,60,'Bull, rabbit and dog — outfits, equipment and animation fitting',32),left:0,top:0});
labels.forEach((label,i)=>composite.push({input:svg(cell,40,label),left:i*cell,top:60}));
for(let r=0;r<rows.length;r++){
 const [label,get]=rows[r],top=header+r*rowHeight;composite.push({input:svg(width,36,label,20),left:0,top});
 for(let i=0;i<species.length;i++){const input=await sharp(path.join(base,get(species[i]))).resize(cell,rowHeight-36,{fit:'contain',background:'#29372d'}).toBuffer();composite.push({input,left:i*cell,top:top+36});}
}
await sharp({create:{width,height:header+rows.length*rowHeight,channels:3,background:'#202d26'}}).composite(composite).jpeg({quality:88}).toFile(path.join(dir,'delivery.jpg'));
const comparisons={};for(const animal of species)for(const name of ['pair','crawl','rpg','author']){const a=fs.readFileSync(path.join(base,'package',animal+'-'+name+'-source.png')),b=fs.readFileSync(path.join(base,'package',animal+'-'+name+'-packaged.png'));assert.ok(a.equals(b));comparisons[animal+'/'+name]={exactPixels:true,sha256:hash(a)};}
const result={date:'2026-10-28',branch:'work/bear-character',baseline:previous,scope:'Existing accepted native sculpts and paintings completed for production, both outfits and 13 equipment choices',tests,totalPassing:tests.regression.pass+tests.focusedPhysics.pass+tests.additional.pass,browser:runs,sourcePackage:comparisons,unchangedSources:sources,portraits,retries:['The source editor reload check initially raced the asynchronous map replacement; the harness now waits for the replacement document.','One combined packaged review had an Edge target crash during editor reload. Each packaged species was then reviewed independently in a fresh browser, including save/reload/Playtest and both speaking portraits. No application or asset errors were reported in those completed runs. The crash does not establish its cause or full-sector performance.'],limitations:['Relevant regression suites were run; this is not a new complete repository test run.','Chair motion remains an unarmed study.','The older weighted-window experiments are absent from this checkout.','Architect approval and canonical integration remain separate.'],helper:{previewPort:4478,retained:true,expiresAt:'2026-10-29T04:32:40.6175348Z',deadlineExtended:false}};
fs.writeFileSync(path.join(dir,'validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({totalPassing:result.totalPassing,browser:runs,comparisons:Object.keys(comparisons).length,dir}));
