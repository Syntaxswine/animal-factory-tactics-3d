import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=fileURLToPath(new URL('../artifacts/shot-model-comparison/',import.meta.url));fs.mkdirSync(out,{recursive:true});
// Task-owned, short-lived browser: close it on success AND failed assertions.
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
 await page.goto((process.env.EDITOR_ORIGIN||'http://127.0.0.1:4364')+'/tactics/helicoid-shot-study.html');
 await page.waitForFunction(()=>document.querySelector('#model-critical [data-stat="any"]')?.textContent.includes('%'));
 const any=id=>page.locator('#model-'+id+' [data-stat="any"]').textContent();
 const stat=(id,name)=>page.locator('#model-'+id+' [data-stat="'+name+'"]').textContent();
 const first=await any('critical');assert.equal(await page.locator('.model').count(),3);
 const rolled=await stat('critical','rolled');
 assert.match(await page.locator('#geometry-readout').textContent(),/Final hit chance 65%/);
 for(const id of ['angular','critical','margin']){assert.equal(await stat(id,'rolled'),rolled);assert.equal(await stat(id,'selected'),rolled);}
 await page.screenshot({path:out+'desktop.png',fullPage:true});
 await page.click('[data-scenario="close"]');
 await page.waitForFunction(()=>document.querySelector('#distance-value').textContent==='1 m');
 for(const id of ['angular','critical','margin']){assert.equal(await stat(id,'selected'),rolled);assert.ok(parseFloat(await any(id))<100);}
 // UI changes to distance and precision must not secretly change the hit roll.
 await page.locator('#precision').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.waitForFunction(()=>document.querySelector('#precision-value').textContent==='1%');
 await page.locator('#distance').evaluate(el=>{el.value='100';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.waitForFunction(()=>document.querySelector('#distance-value').textContent==='100 m');
 for(const id of ['angular','critical','margin']){assert.equal(await stat(id,'rolled'),rolled);assert.equal(await stat(id,'selected'),rolled);}
 await page.click('#find-failure');assert.match(await page.locator('#shot-outcomes').textContent(),/Natural 1 · critical failure/);assert.equal(await page.locator('.shot-result strong').allTextContents().then(a=>a.every(v=>v==='Hit roll: MISS')),true);
 await page.click('#find-success');assert.match(await page.locator('#shot-outcomes').textContent(),/Natural 20 · critical success/);assert.match(await page.locator('#detail').textContent(),/helicoid is not used/);
 await page.selectOption('#cover','waist');
 await page.waitForFunction(()=>document.querySelector('#shot-outcomes').textContent.includes('cover'));
 await page.click('[data-scenario="smoke"]');
 await page.waitForFunction(()=>parseFloat(document.querySelector('#model-critical [data-stat="grazes"]').textContent)>0);
 const smoked=await any('critical'),damage=await page.locator('#model-critical [data-stat="damage"]').textContent();
 await page.check('#smoke-bypass');
 await page.waitForFunction(()=>document.querySelector('#model-critical [data-stat="grazes"]').textContent==='0.0%');
 assert.equal(await any('critical'),smoked);assert.ok(parseFloat(await page.locator('#model-critical [data-stat="damage"]').textContent())>parseFloat(damage));
 await page.click('#reset');await page.waitForFunction(first=>document.querySelector('#distance').value==='20'&&document.querySelector('#model-critical [data-stat="any"]').textContent===first,first);assert.equal(await any('critical'),first);
 await page.selectOption('#aim-level','full');await page.waitForFunction(()=>document.querySelector('#geometry-readout').textContent.includes('8 AP'));assert.ok(parseFloat(await any('critical'))>parseFloat(first));
 await page.click('[data-model="margin"]');assert.equal(await page.locator('[data-model="margin"]').getAttribute('aria-pressed'),'true');
 await page.fill('#seed','-1');await page.waitForFunction(()=>document.querySelector('#input-error').textContent.length>0);
 await page.click('#reset');await page.waitForFunction(()=>!document.querySelector('#input-error').textContent);
 await page.click('#reroll');await page.waitForFunction(()=>document.querySelector('#batch-info').textContent!=='1,000 shots / model · seed 42');
 await page.click('#reset');await page.waitForFunction(()=>document.querySelector('#batch-info').textContent.endsWith('seed 42'));
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no narrow-screen horizontal overflow');
 await page.screenshot({path:out+'mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('Browser passed: shared hit probability, distance/precision independence, reproducible reset, point-blank misses, critical inspection, cover, smoke bypass, aim/AP, pattern selection, seed validation, desktop and mobile.');
}finally{await browser.close();}
