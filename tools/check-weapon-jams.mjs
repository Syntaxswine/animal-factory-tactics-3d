import {launchBattleReview} from './battle-review-browser.mjs';
import {clickBattleControl} from './battle-ui-review.mjs';
import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {browser,closeReview}=await launchBattleReview(chromium,'check-weapon-jams'),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto((process.env.TACTICS_BASE_URL||'http://127.0.0.1:4362')+'/tactics/battle-3d.html');await page.waitForFunction(()=>window.battle3d?.state&&!battle3d.renderer.busy,null,{timeout:60000});
 const before=await page.evaluate(()=>{const s=battle3d.state,u=s.units.find(u=>u.id===s.selected);s.phase='player';s.engaged=true;s.queue=[];u.ap=3;const item=u.pack.find(i=>i.type==='weapon'&&i.kind===u.weapon);item.condition=9;item.jammed=true;return u.ammo[u.weapon];});
 await page.locator('#aim-level').dispatchEvent('change');assert.match(await page.locator('#reload').textContent(),/Clear jam/);await clickBattleControl(page,'#reload');
 const result=await page.evaluate(()=>{const s=battle3d.state,u=s.units.find(u=>u.id===s.selected);return {ap:u.ap,ammo:u.ammo[u.weapon],jammed:!!u.pack.find(i=>i.type==='weapon'&&i.kind===u.weapon).jammed};});assert.deepEqual(result,{ap:0,ammo:before,jammed:false});assert.equal(await page.locator('#reload').textContent(),'Reload');assert.deepEqual(errors,[]);console.log('Gameplay clear-jam button passed: 3 AP, no ammo consumed, jam removed.');
}finally{await closeReview();}
