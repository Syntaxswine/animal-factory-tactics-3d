import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4323/tactics/overmap.html');
 const complete=()=>page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('World generated'));
 await complete();assert.match(await page.locator('#generation-report').innerText(),/Strategic checks pass/);
 const snapshot=()=>page.locator('#overmap').innerHTML();const first=await snapshot();
 await page.locator('#world-seed').fill('42');await page.locator('#generate-world').click();await complete();const second=await snapshot();assert.notEqual(first,second);
 await page.locator('#generate-world').click();await complete();assert.equal(await snapshot(),second);
 await page.locator('#save').click();await page.locator('#blank').click();await page.locator('#load').click();assert.match(await page.locator('#generation-report').innerText(),/Seed 42/);
 assert.ok(await page.locator('#world-towns').evaluate(el=>el.readOnly));await page.locator('#world-seed').fill('-1');await page.locator('#generate-world').click();await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Seed must'));assert.match(await page.locator('#generation-report').innerText(),/Seed 42/);await page.locator('#world-seed').fill('42');
 await page.locator('#randomize-world').click();await complete();assert.doesNotMatch(await page.locator('#generation-report').innerText(),/Seed 42 ·/);await page.locator('#undo').click();assert.match(await page.locator('#generation-report').innerText(),/Seed 42/);
 // Cancel immediately in the same browser event turn, before the worker responds.
 const beforeCancel=await snapshot();await page.evaluate(()=>{document.getElementById('generate-world').click();document.getElementById('cancel-generation').click();});assert.equal(await snapshot(),beforeCancel);
 await page.locator('#validate-world').click();assert.match(await page.locator('#generation-checks').innerText(),/checks pass/);
 await fs.mkdir('artifacts/overmap',{recursive:true});await page.screenshot({path:'artifacts/overmap/generated-world.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);console.log('Seeded world browser checks passed: initial generation, different/same seeds, save/load, rejected settings, randomize, undo, cancel and mobile layout.');
}finally{await browser.close();}
