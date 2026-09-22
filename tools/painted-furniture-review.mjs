import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const output=new URL('../artifacts/furniture/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.REVIEW_ORIGIN||'http://127.0.0.1:4331')+'/tactics/painted-furniture.html');await page.waitForFunction(()=>window.furnitureWorkshop?.ready);
 const shot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',output))});await shot('collection');
 const ids=await page.locator('#form option').evaluateAll(options=>options.map(o=>o.value));await page.selectOption('#mode','single');
 for(const id of ids){await page.selectOption('#form',id);await page.evaluate(()=>window.furnitureWorkshop.view(Math.PI/4,.55));await shot(id);await page.selectOption('#scale','58');await shot(id+'-gameplay');await page.selectOption('#scale','fit');}
 await page.selectOption('#form','gooseneck-sconce');await page.evaluate(()=>window.furnitureWorkshop.view(2.4,.18));await shot('sconce-underside');
 const cycles=[];for(let cycle=0;cycle<3;cycle++){
  for(const id of ids){await page.selectOption('#form',id);if(!await page.locator('#skin').isDisabled())for(const skin of ['honey','cream','sage'])await page.selectOption('#skin',skin);}
  cycles.push(await page.evaluate(()=>window.furnitureWorkshop.diagnostics()));
 }
 assert.deepEqual(cycles[1],cycles[2]);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});await page.selectOption('#mode','collection');await shot('mobile');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
 const result={forms:ids.length,cycles,errors};await writeFile(new URL('results.json',output),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
