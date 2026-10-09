import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'artifacts/battle-layout');fs.mkdirSync(out,{recursive:true});
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const owner=await chromium.launchServer({channel:'msedge',headless:true}),pid=owner.process().pid;
const identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'}));
fs.writeFileSync(path.join(out,'browser-helper.json'),JSON.stringify({identity,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',purpose:'Headless HUD interaction and layout regression review',end:'finally browser.close and launchServer.close',startedAt:new Date().toISOString()},null,2));
const browser=await chromium.connect(owner.wsEndpoint()),errors=[],badResponses=[],report={screens:[],checks:[],errors,badResponses};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badResponses.push(r.url()+' '+r.status());});
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4474/tactics/battle-3d.html');
 await page.waitForFunction(()=>window.battle3d?.state&&!battle3d.renderer.busy,{},{timeout:120000});
 await page.waitForFunction(()=>[...document.querySelectorAll('#squad img:not([hidden])')].every(i=>i.complete&&i.naturalWidth));
 await page.waitForTimeout(1000);
 const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png')});report.screens.push(name+'.png');};
 assert.equal(await page.locator('.merc-card').count(),4);assert.equal(await page.locator('.weapon-row').count(),8);
 assert.equal(await page.locator('#command-drawer').isVisible(),false);await shot('desktop');
 const beforeView=await page.evaluate(()=>({...battle3d.view}));await page.click('#drawer-toggle');assert.equal(await page.locator('#command-drawer').isVisible(),true);assert.deepEqual(await page.evaluate(()=>({...battle3d.view})),beforeView);await shot('drawer');await page.keyboard.press('Escape');assert.equal(await page.locator('#command-drawer').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'drawer-toggle');report.checks.push('drawer retains camera; Escape closes and restores focus');
 await page.locator('.merc-select').nth(1).click();await page.locator('.merc-select').nth(2).click({modifiers:['Shift']});assert.equal(await page.evaluate(()=>battle3d.selectedIds.length),2);
 await page.locator('.merc-stance').nth(1).click();assert.equal(await page.locator('#stance-menu').isVisible(),true);await shot('stances');await page.click('#stance-kneeling');assert.equal(await page.locator('#stance-menu').isVisible(),false);assert.equal(await page.evaluate(()=>battle3d.state.units.filter(u=>battle3d.selectedIds.includes(u.id)).every(u=>u.stance==='kneeling')),true);report.checks.push('portrait shift-selection and group stance controls');
 await page.waitForFunction(()=>!battle3d.renderer.busy);
 await page.locator('.merc-select').first().click();
 // The authored map opens in exploration. Exercise the explicit combat cost
 // with the real page controls after entering a controlled player turn.
 await page.evaluate(()=>{battle3d.state.phase='player';battle3d.state.engaged=true;battle3d.state.revision++;});
 await page.waitForFunction(()=>document.querySelector('.merc-swap').title.includes('2 AP'));
 const original=await page.evaluate(()=>{const s=battle3d.state,u=s.units[0];return {weapon:u.weapon,ap:u.ap,phase:s.phase};});
 await page.locator('.merc-swap').first().click();await page.waitForFunction(w=>battle3d.state.units[0].weapon!==w,original.weapon);await page.waitForFunction(()=>!battle3d.renderer.busy);
 const after=await page.evaluate(()=>{const u=battle3d.state.units[0];return {weapon:u.weapon,ap:u.ap};});assert.equal(after.ap,original.ap-2);assert.equal(await page.locator('.merc-card').first().locator('.weapon-row.held .weapon-select').getAttribute('aria-label').then(t=>t.includes('TT-33')),true);report.checks.push('quick swap charges exactly 2 AP and updates held row');
 const ap=after.ap;await page.locator('.merc-inventory').first().click();assert.equal(await page.locator('#character-screen').isVisible(),true);assert.equal(await page.evaluate(()=>battle3d.paused),true);assert.equal(await page.evaluate(()=>battle3d.state.units[0].ap),ap);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('merc-inventory')),true);report.checks.push('Inventory free to inspect; pause and focus restore');
 await page.click('#pause');assert.equal(await page.locator('.merc-swap').first().isDisabled(),true);await page.click('#pause');
 await page.locator('#battle-levels [data-level="1"]').click();assert.equal(await page.evaluate(()=>battle3d.level),1);await page.keyboard.press('1');assert.equal(await page.evaluate(()=>battle3d.level),0);report.checks.push('pause gating and level selection');
 for(const [name,width,height]of [['laptop',1280,720],['short',1024,600],['tablet',820,900],['mobile',390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(150);const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:document.querySelector('#battle').getBoundingClientRect().toJSON(),dock:document.querySelector('#squad-dock').getBoundingClientRect().toJSON()}));assert.ok(geometry.scroll<=width,name+' horizontal overflow');assert.ok(geometry.canvas.height>=150,name+' map area');assert.ok(geometry.dock.bottom<=height+1,name+' dock clipped');await shot(name);report.checks.push(name+' no document overflow');}
 await page.locator('.merc-stance').first().click();const box=await page.locator('#stance-menu').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=390);await shot('mobile-stances');await page.keyboard.press('Escape');
 await page.click('#rail-saves');assert.equal(await page.locator('dialog[open]').count(),1);await shot('mobile-save');await page.keyboard.press('Escape');report.checks.push('small-screen stance placement and save access');
 await page.click('#drawer-toggle');await page.click('#save-load');await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('#command-drawer').isVisible(),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'save-load');await page.keyboard.press('Escape');assert.equal(await page.locator('#command-drawer').isVisible(),false);report.checks.push('Escape closes topmost save modal and restores visible drawer trigger');
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);report.passed=true;console.log(JSON.stringify(report,null,2));
}finally{
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2));await browser.close();await owner.close();fs.writeFileSync(path.join(out,'browser-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:owner.process().exitCode},null,2));
}
