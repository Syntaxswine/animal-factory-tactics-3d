import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
const out=new URL('../artifacts/battle-3d/clock/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' @ '+m.location().url);});};watch(page);
page.on('dialog',d=>d.accept());const ready=()=>page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:120000});
async function fight(){const promise=page.waitForEvent('popup');await page.click('#playtest');const p=await promise;watch(p);await p.waitForFunction(()=>window.battle3d?.state,{},{timeout:120000});return p;}
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4323/tactics/editor-3d.html');await ready();
 const map=blankMap('Clock check');map.guards=[{x:6,y:4,z:0,species:'pig-foreman',weapon:'hands',heading:180}];
 await page.evaluate(json=>editor3d.open(json),JSON.stringify(map));await ready();await page.fill('#start-time','19:59');await page.click('#apply-start-time');await ready();
 assert.equal(await page.evaluate(()=>editor3d.document.map.time.startMinutes),1199);await page.click('#undo');await ready();assert.equal(await page.locator('#start-time').inputValue(),'08:00');await page.click('#redo');await ready();
 const combat=await fight();await combat.waitForFunction(()=>battle3d.renderer.models.size>=5,{},{timeout:60000});assert.equal(await combat.evaluate(()=>battle3d.state.phase),'player');assert.equal(await combat.evaluate(()=>battle3d.clock.minutes),1199);
 await combat.waitForTimeout(1100);assert.equal(await combat.evaluate(()=>battle3d.clock.minutes),1199);await combat.click('#end');await combat.waitForFunction(()=>battle3d.state.round===2&&battle3d.state.phase==='player',{},{timeout:30000});
 assert.equal(await combat.evaluate(()=>battle3d.clock.minutes),1200);assert.match(await combat.locator('#game-clock').innerText(),/20:00.*Night/);
 await combat.click('#pause');assert.equal(await combat.locator('#end').isDisabled(),true);await combat.waitForTimeout(1100);assert.equal(await combat.evaluate(()=>battle3d.clock.minutes),1200);await combat.screenshot({path:fileURLToPath(new URL('combat-minute.png',out))});
 await combat.click('#restart');assert.equal(await combat.evaluate(()=>battle3d.clock.minutes),1199);await combat.close();await page.bringToFront();
 const empty=blankMap('Midnight');await page.evaluate(json=>editor3d.open(json),JSON.stringify(empty));await ready();await page.fill('#start-time','23:59');await page.click('#apply-start-time');await ready();
 const exploration=await fight();assert.equal(await exploration.evaluate(async()=>{const {elapsedGameMinutes}=await import('./game-clock.js');return elapsedGameMinutes(3000);}),1);await exploration.waitForFunction(()=>battle3d.clock.minutes>=1440,{},{timeout:10000});assert.match(await exploration.locator('#game-clock').innerText(),/Day 2.*00:0/);
 await exploration.click('#pause');const frozen=await exploration.evaluate(()=>({minutes:battle3d.clock.minutes,presentation:battle3d.renderer.presentationNow}));await exploration.waitForTimeout(1200);assert.deepEqual(await exploration.evaluate(()=>({minutes:battle3d.clock.minutes,presentation:battle3d.renderer.presentationNow})),frozen);
 await exploration.click('#pause');await exploration.waitForFunction(n=>battle3d.clock.minutes>n+.5,frozen.minutes);const resumed=await exploration.evaluate(()=>battle3d.clock.minutes);assert.ok(resumed<frozen.minutes+1.2);
 // Exercise the actual visibility-change handlers, including a gap without RAF.
 await exploration.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await exploration.evaluate(()=>battle3d.clock.minutes);await exploration.waitForTimeout(1200);assert.equal(await exploration.evaluate(()=>battle3d.clock.minutes),hidden);
 await exploration.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await exploration.waitForFunction(n=>battle3d.clock.minutes>n+.2,hidden);assert.ok(await exploration.evaluate(n=>battle3d.clock.minutes<n+.8,hidden));
 await exploration.click('#pause');await exploration.screenshot({path:fileURLToPath(new URL('midnight.png',out))});assert.equal(await page.evaluate(()=>editor3d.document.map.time.startMinutes),1439);
 await exploration.setViewportSize({width:390,height:844});assert.ok(await exploration.locator('#game-clock').isVisible());
 const legacy=await browser.newPage();watch(legacy);await legacy.goto(new URL('index.html',page.url()).href);await legacy.waitForFunction(()=>document.querySelector('#campaign-clock')?.textContent.includes('Day 1'));
 await legacy.click('#help');const legacyPaused=await legacy.locator('#campaign-clock').innerText();await legacy.waitForTimeout(1200);assert.equal(await legacy.locator('#campaign-clock').innerText(),legacyPaused);await legacy.click('#manual-close');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({roundMinutes:1,combat:'19:59 → 20:00',midnight:true,paused:true,hiddenNoCatchup:true,errors}));
}finally{await browser.close();}
