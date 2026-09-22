import {createRequire} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const url=process.env.REVIEW_URL||'http://127.0.0.1:4323/index.html',out=new URL('../artifacts/battle-3d/title/',import.meta.url);fs.mkdirSync(out,{recursive:true});
try{
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('#scene-status')?.textContent==='');
 assert.equal(await page.locator('nav .menu-item').count(),5);await page.screenshot({path:fileURLToPath(new URL('desktop.png',out))});
 for(const kind of ['campaign','saves']){await page.click(`[data-panel="${kind}"]`);assert.equal(await page.locator('#panel').evaluate(e=>e.open),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#panel').evaluate(e=>e.open),false);}
 await page.click('[data-panel="options"]');await page.selectOption('#option-difficulty','standard');await page.selectOption('#option-motion','reduced');await page.click('button:has-text("Save options")');assert.match(await page.locator('#options-status').innerText(),/saved/);await page.keyboard.press('Escape');await page.reload();await page.click('[data-panel="options"]');assert.equal(await page.inputValue('#option-difficulty'),'standard');assert.equal(await page.inputValue('#option-motion'),'reduced');await page.keyboard.press('Escape');
 await page.click('nav a:has-text("Quick Fight")');await page.waitForFunction(()=>window.battle3d?.state);const fight=await page.evaluate(()=>({difficulty:battle3d.state.difficulty,guards:battle3d.state.definition.guards.length,props:battle3d.state.props.length,reduced:battle3d.renderer.reducedMotion.matches}));assert.deepEqual(fight,{difficulty:'standard',guards:36,props:398,reduced:true});
 await page.click('header a');await page.waitForSelector('nav');await page.click('nav a:has-text("Map Editor")');await page.waitForFunction(()=>window.editor3d?.document);await page.click('header a:first-child');await page.waitForSelector('nav');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:fileURLToPath(new URL('mobile.png',out)),fullPage:true});
 await page.click('footer a');await page.waitForSelector('.cards');assert.ok(await page.locator('.card').count()>10);
 // Corrupt preferences and unavailable storage must not prevent title navigation.
 await page.goto(url);await page.evaluate(()=>localStorage.setItem('animal-factory-tactics-3d:options:v1','invalid'));await page.reload();assert.match(await page.locator('#preference-summary').innerText(),/Easy/i);
 await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('blocked');};});await page.click('[data-panel="options"]');await page.click('button:has-text("Save options")');assert.match(await page.locator('#options-status').innerText(),/could not save/);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({fight,errors}));
}finally{await browser.close();}
