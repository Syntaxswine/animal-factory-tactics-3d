import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto((process.env.TACTICS_BASE_URL||'http://127.0.0.1:4323')+'/tactics/overmap.html');
 await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('World generated'),{},{timeout:60000});
 await page.locator('#travel-save').click();
 const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('animal-factory-overmap-travel-v1')));
 const destination=await page.evaluate(async saved=>{const {planRoute}=await import('./overmap-travel.js');return saved.map.sectors.map((s,i)=>({s,i})).filter(({s})=>s.role==='fortress').sort((a,b)=>planRoute(saved.map,saved.state.position,b.i,saved.state.members).length-planRoute(saved.map,saved.state.position,a.i,saved.state.members).length)[0].i;},data);
 await page.locator(`[data-sector="${destination}"]`).click();await page.locator('#travel-plan').click();
 assert.match(await page.locator('#travel-preview').textContent(),/Arrival Day/);
 await page.locator('#travel-go').click();assert.match(await page.locator('#travel-note').textContent(),/rest is required/);assert.equal(await page.locator('#travel-go').isDisabled(),true);
 const stopped=await page.evaluate(()=>JSON.parse(localStorage.getItem('animal-factory-overmap-travel-v1')).state);
 assert.equal(Math.max(...stopped.members.map(u=>u.social.fatigue)),80);
 await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('World generated'),{},{timeout:60000});await page.locator('#travel-load').click();
 assert.equal(await page.locator('#travel-go').isDisabled(),true);assert.equal(await page.locator('#travel-clock').textContent(),`Day ${Math.floor(stopped.clock.minutes/1440)+1} · ${String(Math.floor(stopped.clock.minutes%1440/60)).padStart(2,'0')}:${String(Math.floor(stopped.clock.minutes%60)).padStart(2,'0')}`);
 await page.locator('#travel-rest').click();assert.equal(await page.locator('#travel-go').isDisabled(),false);assert.match(await page.locator('#travel-members').textContent(),/Fatigue 60\/100/);
 await page.locator('#travel-go').click();
 await page.locator('#travel-clock').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/overmap-travel.png'});
 await page.locator('#travel-reset').click();assert.match(await page.locator('#travel-clock').textContent(),/08:00/);
 await page.locator('#travel-members').locator('..').locator('summary').click();await page.getByLabel('Misha agility').fill('100');await page.getByLabel('Misha agility').press('Tab');assert.match(await page.locator('#travel-pace').textContent(),/Vera/);
 assert.deepEqual(errors,[]);console.log('Overmap travel browser checks passed: route, fatigue stop, saved partial journey, reload, rest, resume and pace changes.');
}finally{await browser.close();}
