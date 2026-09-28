import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('animal-factory-overmap-travel-v1')));
try{
 await page.goto((process.env.TACTICS_BASE_URL||'http://127.0.0.1:4323')+'/tactics/overmap.html');
 await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('World generated'),{},{timeout:60000});
 await page.locator('#travel-save').click();const data=await stored();assert.equal(data.state.selectedId,null);
 const destination=await page.evaluate(async saved=>{const {planRoute}=await import('./overmap-travel.js');const group=saved.state.groups[0].state;return saved.map.sectors.map((s,i)=>({s,i})).filter(({s})=>s.role==='fortress').sort((a,b)=>planRoute(saved.map,group.position,b.i,group.members).length-planRoute(saved.map,group.position,a.i,group.members).length)[0].i;},data);
 await page.locator(`[data-sector="${destination}"]`).click();assert.equal(await page.locator('#travel-confirm').isVisible(),false);
 await page.locator('#travel-groups button').first().click();await page.locator('#travel-members').locator('..').locator('summary').click();await page.locator('#travel-members input').nth(1).check();await page.locator('#travel-split').click();assert.equal(await page.locator('#travel-groups button').count(),2);
 await page.locator('#travel-groups button').first().click();await page.locator(`[data-sector="${destination}"]`).click();
 await page.locator('#travel-confirm').waitFor();assert.match(await page.locator('#travel-confirm-people').textContent(),/Yakov.*Misha.*Vera/);assert.match(await page.locator('#travel-confirm-time').textContent(),/Arrival Day/);assert.ok(await page.locator('#overmap polyline').count()>0);
 await page.locator('#travel-confirm-cancel').click();assert.equal((await stored()).state.groups[0].state.route.length,0);
 await page.locator(`[data-sector="${destination}"]`).click();await page.locator('#travel-confirm-go').click();
 await page.locator('#travel-groups button').nth(1).click();await page.locator(`[data-sector="${destination}"]`).click();assert.match(await page.locator('#travel-confirm-people').textContent(),/Anya/);assert.match(await page.locator('#travel-confirm-others').textContent(),/Group 1 is headed here/);await page.locator('#travel-sync').check();assert.match(await page.locator('#travel-confirm-sync-time').textContent(),/Shared arrival/);
 await page.screenshot({path:'artifacts/overmap-group-confirm.png'});await page.locator('#travel-confirm-go').click();
 const ordered=await stored();const etas=await page.evaluate(async s=>{const {arrival}=await import('./overmap-groups.js');return s.groups.map(g=>arrival(s,g));},ordered.state);assert.equal(etas[0],etas[1]);
 await page.locator('#travel-go').click();assert.equal((await stored()).state.clock.minutes,540);
 await page.reload();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('World generated'),{},{timeout:60000});await page.locator('#travel-load').click();assert.equal(await page.locator('#travel-groups button').count(),2);assert.equal((await page.locator('#travel-clock').textContent()).includes('09:00'),true);
 for(let i=0;i<30;i++){const current=await stored();if(current.state.groups.every(g=>g.state.position===destination&&!g.state.route.length))break;if(current.state.logistics?.pending)await page.locator('#logistics-encounter button').click();await page.locator('#travel-next').click();}const arrived=await stored();assert.ok(arrived.state.groups.every(g=>g.state.position===destination&&!g.state.route.length));assert.equal(arrived.state.clock.minutes,etas[0]);
 await page.getByRole('button',{name:'Select Group 1',exact:true}).click();assert.equal(await page.locator('#travel-groups button').first().getAttribute('aria-pressed'),'true');
 assert.deepEqual(errors,[]);console.log('Group travel browser checks passed: explicit selection, split, single-click popup, route line, cancel, coordinated arrivals, shared clock and saved orders.');
}finally{await browser.close();}
