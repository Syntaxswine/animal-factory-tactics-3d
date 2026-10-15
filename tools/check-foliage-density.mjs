import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve(import.meta.dirname,'../artifacts/foliage-skins',process.argv[2]||'density'),origin=process.env.REVIEW_URL||'http://127.0.0.1:4476';fs.mkdirSync(out,{recursive:true});
const list=(name,fallback)=>(process.env[name]||fallback).split(','),families=list('REVIEW_FAMILIES','temperate,jungle,dry,wetlands,snow'),densities=list('REVIEW_DENSITIES','35,65,85,100'),frames=list('REVIEW_FRAMES','overview,clearing'),growths=list('REVIEW_GROWTHS','woodland'),angles=list('REVIEW_ANGLES','normal'),grids=list('REVIEW_GRIDS','0');
const files=['foliage-density-fixture.js','foliage-skins-review.js','foliage-data.js','foliage-obstacles.js','biome-scene.js','foliage-screen-surface.js'],sourceHashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(new URL('../dist/tactics/'+f,import.meta.url))).digest('hex')]));
const report={sourceHashes,errors:[],views:[]},server=await chromium.launchServer({channel:'msedge',headless:true});let browser,identity;
try{
const pid=server.process().pid;identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'}));
fs.writeFileSync(path.join(out,'helper.json'),JSON.stringify({identity,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',task:'foliage-density',purpose:'Bounded large-area density captures',startedAt:new Date().toISOString(),end:'Finally closes browser and launch server'},null,2));
 browser=await chromium.connect(server.wsEndpoint());const page=await browser.newPage({viewport:{width:1120,height:1100}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))report.errors.push(r.status()+' '+r.url());});
 for(const growth of growths)for(const family of families)for(const frame of frames)for(const angle of angles)for(const grid of grids)for(const density of densities){
  const query=new URLSearchParams({view:'density',family,density,growth,frame,angle,grid}),tag=[growth,family,frame,angle,'grid'+grid,density].join('-');
  await page.goto(origin+'/tactics/foliage-skins-review.html?'+query);
  await page.waitForFunction(()=>window.foliageReview,null,{timeout:120000});
  const result=await page.evaluate(()=>foliageReview.result);
  assert.equal(result.family,family);assert.equal(result.density,Number(density));assert.equal(result.growth,growth);assert.equal(result.frame,frame);assert.deepEqual(result.horse.scale,[1,1,1]);
  for(const paint of result.stats.paint){assert.equal(paint.pendingPages,0);assert.equal(paint.error,null);assert.equal(paint.overviewReady,true);}
  const counts=await page.evaluate(async()=>{const {buildFoliageObstacles}=await import('./foliage-obstacles.js');const physical=buildFoliageObstacles(foliageReview.map).trees;return {physical:physical.length,visible:foliageReview.biomes.stats().trees};});
  assert.equal(counts.physical,counts.visible,'rendered and physical tree counts must agree');assert.ok(result.trees>0);
  await page.locator('canvas').screenshot({path:path.join(out,tag+'.jpg'),type:'jpeg',quality:88});report.views.push({...result,tag,physicalTrees:counts.physical});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({tag,trees:result.trees,triangles:result.triangles,drawCalls:result.drawCalls}));
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{
 try{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 finally{try{await browser?.close();}finally{await server.close();fs.writeFileSync(path.join(out,'helper-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:server.process().exitCode},null,2));}}
}
