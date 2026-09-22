import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
const out='artifacts/battle-3d/daylight';fs.mkdirSync(out,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4323/tactics/editor-3d.html?editing=1');
 await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:120000});
 const original=await page.evaluate(()=>editor3d.export());
 for(const [name,minutes] of [['dawn',330],['morning',480],['noon',720],['dusk',1140],['night',1260]]){
  await page.locator('#light-preview').evaluate((el,m)=>{el.value=m;el.dispatchEvent(new Event('input',{bubbles:true}));},minutes);
  await page.waitForTimeout(600);await page.screenshot({path:`${out}/${name}.png`});
  assert.equal(await page.evaluate(()=>editor3d.scene.daylight.minutes),minutes);
 }
 assert.equal(await page.evaluate(()=>editor3d.export()),original);
 await page.click('#light-preview-reset');assert.equal(await page.evaluate(()=>editor3d.scene.previewMinutes),null);
 await page.fill('#start-time','21:00');await page.click('#apply-start-time');await page.waitForFunction(()=>!editor3d.loading);
 const popup=page.waitForEvent('popup');await page.click('#playtest');const battle=await popup;
 battle.on('pageerror',e=>errors.push(e.message));battle.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await battle.waitForFunction(()=>window.battle3d?.renderer.models.size>=4,{},{timeout:120000});
 await battle.click('#pause');await battle.waitForTimeout(500);
 assert.equal(await battle.evaluate(()=>battle3d.renderer.daylight.sun.visible),false);
 const before=await battle.evaluate(()=>battle3d.renderer.daylight.shown);await battle.waitForTimeout(600);
 assert.equal(await battle.evaluate(()=>battle3d.renderer.daylight.shown),before);
 await battle.screenshot({path:out+'/battle-night.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({previewTimes:5,blueprintUnchanged:true,errors}));
}finally{await browser.close();}
