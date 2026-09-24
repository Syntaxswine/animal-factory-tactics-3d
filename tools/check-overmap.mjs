import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1150}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4323/tactics/overmap.html');await page.locator('.sector-cell').last().waitFor();
 assert.equal(await page.locator('.sector-cell').count(),450);
 await page.getByLabel('river 1 to offset',{exact:true}).selectOption(String(1/3));
 assert.ok((await page.locator('#warnings').innerText()).includes('no matching attachment'));
 await page.locator('#undo').click();assert.equal(await page.getByLabel('river 1 to offset',{exact:true}).inputValue(),String(2/3));
 await page.locator('#sector-name').fill('River watch');await page.locator('#sector-name').press('Tab');
 await page.locator('#role').selectOption('fortress');await page.locator('#factory').check();
 await page.locator('#save').click();await page.locator('#blank').click();await page.locator('#load').click();
 await page.locator('[data-sector="217"]').click();assert.equal(await page.locator('#sector-name').inputValue(),'River watch');assert.ok(await page.locator('#factory').isChecked());
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;
 await fs.mkdir('artifacts/overmap',{recursive:true});const file='artifacts/overmap/roundtrip.json';await download.saveAs(file);
 await page.locator('#blank').click();await page.locator('#import').setInputFiles(file);await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Sketch imported'));
 await page.locator('[data-sector="217"]').click();assert.equal(await page.locator('#sector-name').inputValue(),'River watch');
 // Invalid imports preserve the current map.
 await page.locator('#import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"kind":"wrong"}')});
 await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Import failed'));assert.equal(await page.locator('#sector-name').inputValue(),'River watch');
 await page.locator('#demo').click();
 assert.ok((await page.locator('#tutorial-summary').innerText()).includes('5 / 5'));await page.locator('#find-start').click();assert.equal(await page.locator('#tutorial-step').inputValue(),'1');assert.equal(await page.locator('#sector-name').inputValue(),'Tutorial start');await page.locator('#tutorial-step').selectOption('2');await page.locator('#undo').click();assert.equal(await page.locator('#tutorial-step').inputValue(),'1');await page.locator('[data-sector="217"]').click();
 await page.locator('.tutorial-placement summary').click();await page.locator('#tutorial-x').fill('15');await page.locator('#tutorial-y').fill('8');await page.locator('#tutorial-rotation').selectOption('90');await page.locator('#place-tutorial').click();assert.equal(await page.locator('#tutorial-step').inputValue(),'1');await page.locator('#undo').click();await page.locator('#tutorial-x').fill('1');await page.locator('#tutorial-y').fill('1');await page.locator('#place-tutorial').click();assert.ok((await page.locator('#status').innerText()).includes('town must not'));await page.locator('#demo').click();await page.locator('.tutorial-placement summary').click();
 const svgDownload=page.waitForEvent('download');await page.locator('#export-svg').click();const exported=await svgDownload;await exported.saveAs('artifacts/overmap/map.svg');
 const svgText=await fs.readFile('artifacts/overmap/map.svg','utf8');assert.ok(svgText.includes('<style>'));assert.ok(svgText.includes('river-center'));
 assert.equal(await page.evaluate(text=>new DOMParser().parseFromString(text,'image/svg+xml').querySelectorAll('parsererror').length,svgText),0);
 await page.locator('#zoom').selectOption('2');assert.equal(await page.locator('#overmap').evaluate(el=>el.style.width),'200%');await page.locator('#zoom').selectOption('1');
 await page.screenshot({path:'artifacts/overmap/workshop.png',fullPage:true});
 await page.locator('#detail').screenshot({path:'artifacts/overmap/attachments.png'});
 await page.locator('[data-sector="217"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#sector-title').textContent(),'09 / 08');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/overmap/mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 assert.deepEqual(errors,[]);console.log('Overmap browser checks passed: paths, warnings, undo, persistence, export/import, keyboard and mobile layout.');
}finally{await browser.close();}
