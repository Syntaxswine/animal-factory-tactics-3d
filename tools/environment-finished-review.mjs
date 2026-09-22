import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'}),out=new URL('../docs/tactics/environment-finished-review/',import.meta.url);
fs.mkdirSync(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4329/tactics/environment-gallery.html');
 await page.waitForFunction(()=>window.environmentWorkshop?.ready);
 const result=await page.evaluate(async()=>{
  const workshop=window.environmentWorkshop,stats=[],entries=workshop.entries.map(e=>({...e}));let count=0;
  const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  for(let cycle=0;cycle<3;cycle++){
   for(const scale of ['58','110']){
    document.querySelector('#scale').value=scale;
    for(const entry of entries){workshop.select(entry.kind);await frame();const s=workshop.hybrid.stats();if(s.unsupported.length||s.diagnostics.length)throw Error(entry.kind+': '+JSON.stringify(s));count++;}
   }
   stats.push(workshop.diagnostics());
  }
  return {count,entries,stats};
 });
 assert.equal(result.entries.length,76);assert.deepEqual(result.stats[1],result.stats[2]);
 const capture=async name=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:fileURLToPath(new URL(name+'.png',out))});};
 for(const scale of ['58','110']){
  await page.locator('#scale').selectOption(scale);
  for(const kind of ['tree-broadleaf','tree-pine','bush','hospital-bed','workbench-vise','wall-brick','window-concrete','fence-chainlink','ground-dirt','ground-grass','ground-tiles','water','roof-corrugated-sloped','stairs','gun-rifle']){
   await page.evaluate(kind=>environmentWorkshop.select(kind),kind);await capture(kind+'-'+scale);
  }
 }
 await page.locator('#scale').selectOption('fit');
 for(const composition of ['yard','clinic']){await page.evaluate(s=>environmentWorkshop.scene(s),composition);await capture(composition);await page.evaluate(()=>environmentWorkshop.view(Math.PI+.7,.48));await capture(composition+'-rear');await page.evaluate(()=>environmentWorkshop.view(.7,.48));}
 await page.locator('#family').selectOption('Woodland');assert.equal(await page.locator('#asset option').count(),4);await page.locator('#next').click();await page.locator('#previous').click();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>environmentWorkshop.select('tree-broadleaf'));await capture('mobile');
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('results.json',out),JSON.stringify({errors,...result},null,2));console.log(JSON.stringify({count:result.count,errors,retained:result.stats[2]},null,2));
}finally{await browser.close();}
