import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve(import.meta.dirname,'../artifacts/foliage-skins',process.argv[2]||'composition'),origin=process.env.REVIEW_URL||'http://127.0.0.1:4476';fs.mkdirSync(out,{recursive:true});
const list=(name,fallback)=>(process.env[name]||fallback).split(','),families=list('REVIEW_FAMILIES','jungle,temperate,dry,wetlands,snow'),mixes=list('REVIEW_MIXES','current,mixed,trees'),frames=list('REVIEW_FRAMES','clearing'),angles=list('REVIEW_ANGLES','reverse'),grids=list('REVIEW_GRIDS','0'),layers=list('REVIEW_LAYERS','both');
const files=['foliage-composition-fixture.js','foliage-density-fixture.js','foliage-skins-review.js','foliage-skins-review.html','foliage-obstacles.js','biome-gameplay.js','biome-scene.js'],sourceHashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(new URL('../dist/tactics/'+f,import.meta.url))).digest('hex')]));
const report={sourceHashes,errors:[],views:[]},server=await chromium.launchServer({channel:'msedge',headless:true});let browser,identity;
try{
 const pid=server.process().pid;identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'}));
 fs.writeFileSync(path.join(out,'helper.json'),JSON.stringify({identity,port:Number(new URL(server.wsEndpoint()).port),owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',task:'foliage-composition',purpose:'Bounded tree/brush composition and layer-isolation captures',startedAt:new Date().toISOString(),end:'Finally closes browser and launch server'},null,2));
 browser=await chromium.connect(server.wsEndpoint());const page=await browser.newPage({viewport:{width:1180,height:1100}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))report.errors.push(r.status()+' '+r.url());});
 for(const family of families)for(const frame of frames)for(const angle of angles)for(const grid of grids)for(const mix of mixes){
  const query=new URLSearchParams({view:'composition',family,frame,angle,grid,mix});
  await page.goto(origin+'/tactics/foliage-skins-review.html?'+query);
  await page.waitForFunction(()=>window.foliageReview,null,{timeout:120000});
  for(const layer of layers){
   if(await page.locator('#layers').inputValue()!==layer){await page.locator('#layers').selectOption(layer);await page.waitForFunction(value=>window.foliageReview?.result.layers===value,layer,{timeout:120000});}
   const result=await page.evaluate(()=>foliageReview.result),tag=[family,frame,angle,'grid'+grid,mix,layer].join('-');
   assert.equal(result.family,family);assert.equal(result.mix,mix);assert.equal(result.layers,layer);assert.equal(result.previewOnly,true);assert.deepEqual(result.horse.scale,[1,1,1]);
   for(const paint of result.stats.paint){assert.equal(paint.pendingPages,0);assert.equal(paint.error,null);assert.equal(paint.overviewReady,true);}
   const physical=await page.evaluate(async()=>{
    const r=foliageReview,{synchronizeFoliage}=await import('./foliage-obstacles.js'),physical=r.previewObstacles.trees.map(t=>[t.x,t.y,t.id].join(':')).sort(),art=r.biomes.terrains.flatMap(t=>t.trees).map(t=>[t.x,t.z,t.id].join(':')).sort();
    return {physical,art,ordinary:synchronizeFoliage(r.map).trees.length,brushVisible:r.biomes.terrains.some(t=>t.screens?.root.visible),visibleTreeBatches:r.biomes.terrains.reduce((n,t)=>n+t.chunks.filter(c=>c.near.visible||c.far.visible).length,0)};
   });
   assert.deepEqual(physical.physical,physical.art);assert.equal(physical.ordinary,73);assert.equal(physical.brushVisible,layer!=='trees');
   if(layer==='brush')assert.equal(physical.visibleTreeBatches,0);else assert.ok(physical.visibleTreeBatches>0);
   assert.equal(await page.locator('#layer-note').isVisible(),layer!=='both');
   assert.match(await page.locator('#context-note').innerText(),/not saved editor settings/);
   assert.match(await page.locator('#editor-link').innerText(),/Original fill/);
   await page.locator('#scene').screenshot({path:path.join(out,tag+'.jpg'),type:'jpeg',quality:90});
   report.views.push({...result,tag,ordinaryTrees:physical.ordinary,physicalTrees:physical.physical.length});
   fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({tag,trees:result.trees,triangles:result.triangles,drawCalls:result.drawCalls}));
  }
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{
 try{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 finally{try{await browser?.close();}finally{await server.close();fs.writeFileSync(path.join(out,'helper-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:server.process().exitCode},null,2));}}
}
