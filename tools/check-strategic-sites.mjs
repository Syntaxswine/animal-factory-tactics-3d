import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const dependency=process.env.PLAYWRIGHT_PATH;
if(!dependency)throw Error('Set PLAYWRIGHT_PATH to an installed Playwright package');
const {chromium}=await import(pathToFileURL(path.join(dependency,'index.mjs')));
const out=path.resolve(import.meta.dirname,'../artifacts/strategic-sites');
fs.mkdirSync(out,{recursive:true});
const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4475';
const review=await launchSiteReview(chromium,'render-check');
const errors=[],checks=[];
try{
 const page=await review.browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin+'/tactics/strategic-sites-study.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.sitesStudy?.ready);
 for(const site of ['radio','radar','sam']){
  await page.evaluate(id=>window.sitesStudy.select(id,'pair'),site);
  await page.screenshot({path:path.join(out,site+'-pair.png')});
  for(const mode of ['intact','destroyed']){
   await page.evaluate(([id,state])=>window.sitesStudy.select(id,state),[site,mode]);
   for(const view of ['three','side','rear','top']){
    await page.evaluate(v=>window.sitesStudy.view(v),view);
    const d=await page.evaluate(()=>window.sitesStudy.diagnostics());assert.equal(d.assets.length,1);assert.equal(d.site,site);assert.equal(d.mode,mode);
    for(const worker of d.workers)assert(Math.abs((worker.min[0]+worker.max[0])/2-worker.root[0])<.5,'Skinned scale reference lost its root transform');
    await page.screenshot({path:path.join(out,site+'-'+mode+'-'+view+'.png')});checks.push({site,mode,view,triangles:d.assets[0].triangles});
   }
  }
  await page.evaluate(()=>window.sitesStudy.view('three'));
 }
 // Exercise actual controls at game scale and ensure resource ownership is bounded.
 const stable=await page.evaluate(()=>window.sitesStudy.diagnostics().gpu);
 for(let i=0;i<12;i++)await page.evaluate(i=>window.sitesStudy.select(['radio','radar','sam'][i%3],i%2?'pair':'destroyed'),i);
 const after=await page.evaluate(()=>window.sitesStudy.diagnostics().gpu);assert.deepEqual(after,stable,'Repeated switches must reuse GPU resources');
 const workers=await page.evaluate(()=>window.sitesStudy.diagnostics().workers);
 assert.equal(workers.length,2);assert(workers[1].min[0]-workers[0].max[0]>9,'Comparison horses must occupy separate sites');
 for(const id of ['radio','radar','sam']){
  await page.selectOption('#site',id);await page.selectOption('#mode','pair');await page.selectOption('#scale','58');
  assert.equal((await page.evaluate(()=>window.sitesStudy.diagnostics())).ppu,58);
  await page.screenshot({path:path.join(out,id+'-gameplay.png')});
 }
 await page.check('#grey');await page.screenshot({path:path.join(out,'sam-grey.png')});
 await page.check('#wire');await page.check('#grid');await page.uncheck('#horse');await page.screenshot({path:path.join(out,'sam-wire.png')});
 await page.uncheck('#grey');await page.uncheck('#wire');await page.uncheck('#grid');await page.check('#horse');
 await page.selectOption('#scale','fit');await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(out,'mobile.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal page overflow');
 await page.evaluate(()=>window.sitesStudy.dispose());assert.equal((await page.evaluate(()=>window.sitesStudy.diagnostics())).disposed,true);
 assert.deepEqual(errors,[],'Browser errors');
 fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({passed:true,checks,errors,gpu:after},null,2));
 console.log('Strategic sites: '+checks.length+' model/view combinations, game-scale views, controls and lifecycle passed');
}finally{await review.closeReview();}
