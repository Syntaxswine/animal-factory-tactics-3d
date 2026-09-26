import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
const base=process.env.TACTICS_BASE_URL||'http://127.0.0.1:4323';
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/tactics/editor-3d.html?editing=1');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading);
 await page.evaluate(async()=>{await editor3d.apply({tool:'texture',start:{x:10,y:10,z:0},options:{groundKind:'ground-concrete'}});});
 const json=await page.evaluate(()=>editor3d.export());assert.equal(JSON.parse(json).terrain[10][10],'ground-concrete');
 await page.click('#quick-save-map');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved in this browser'));
 await page.evaluate(async json=>editor3d.open(json),json);await page.waitForFunction(()=>!editor3d.loading);
 assert.equal(await page.evaluate(()=>editor3d.document.map.terrain[10][10]),'ground-concrete');
 const popupReady=page.waitForEvent('popup');await page.click('#quick-playtest');const child=await popupReady;child.on('pageerror',e=>errors.push(e.message));
 await child.waitForFunction(()=>window.battle3d?.state&&!battle3d.renderer.busy,{},{timeout:60000});
 assert.equal(await child.evaluate(()=>battle3d.state.definition.terrain[10][10]),'ground-concrete');
 assert(await child.locator('#return-editor').isVisible());assert.deepEqual(errors,[]);
 console.log('Packaged editor saves, exports/reopens and launches its authored map in live playtest.');
}finally{await browser.close();}
