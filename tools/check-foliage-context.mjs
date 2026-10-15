import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve(import.meta.dirname,'../artifacts/foliage-skins',process.argv[2]||'context'),origin=process.env.REVIEW_URL||'http://127.0.0.1:4476';fs.mkdirSync(out,{recursive:true});
const list=(name,fallback)=>(process.env[name]||fallback).split(','),families=list('REVIEW_FAMILIES','temperate,jungle,dry,wetlands,snow'),modes=list('REVIEW_MODES','strip,copse'),angles=list('REVIEW_ANGLES','normal,reverse,high'),grids=list('REVIEW_GRIDS','0,1');
const sourceFiles=['foliage-screen-surface.js','foliage-screen-scene.js','foliage-screen-paint.js','biome-scene.js'],sourceBodies=Object.fromEntries(sourceFiles.map(file=>[file,fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url),'utf8')]));
const report={sourceHashes:Object.fromEntries(Object.entries(sourceBodies).map(([file,body])=>[file,createHash('sha256').update(body).digest('hex')])),errors:[],views:[]};
const server=await chromium.launchServer({channel:'msedge',headless:true});let browser;
const pid=server.process().pid,identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'}));
fs.writeFileSync(path.join(out,'helper.json'),JSON.stringify({identity,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',task:'foliage-skins',purpose:'Native horse and natural foliage context checks',startedAt:new Date().toISOString(),end:'Finally closes browser and launch server'},null,2));
try{
 browser=await chromium.connect(server.wsEndpoint());const page=await browser.newPage({viewport:{width:1040,height:980}});
 for(const [file,body]of Object.entries(sourceBodies))await page.route('**/tactics/'+file,route=>route.fulfill({status:200,contentType:'text/javascript',body}));
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))report.errors.push(r.status()+' '+r.url());});
 for(const mode of modes)for(const family of families)for(const angle of angles)for(const grid of grids){
  const tag=[mode,family,angle,'grid'+grid].join('-');
  await page.goto(origin+`/tactics/foliage-skins-review.html?view=${mode}&family=${family}&angle=${angle}&grid=${grid}`);
  await page.waitForFunction(()=>window.foliageReview,null,{timeout:120000});
  const result=await page.evaluate(()=>foliageReview.result);assert.equal(result.family,family);assert.equal(result.mode,mode);assert.deepEqual(result.horse.scale,[1,1,1]);assert.equal(result.horse.nativeSize,true);
  await page.locator('canvas').screenshot({path:path.join(out,tag+'.jpg'),type:'jpeg',quality:90});report.views.push(result);console.log(JSON.stringify({tag,triangles:result.triangles,drawCalls:result.drawCalls}));
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 try{await browser?.close();}finally{await server.close();fs.writeFileSync(path.join(out,'helper-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:server.process().exitCode},null,2));}
}
