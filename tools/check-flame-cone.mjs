import {clickBattleControl} from './battle-ui-review.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {blankMap,edgeKey} from '../dist/tactics/core/maps.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const map=blankMap('Flame cone check');map.starts=[{x:10,y:10,weapon:'flamethrower'},{x:15,y:11},{x:9,y:8},{x:8,y:8}];
map.guards=[{x:17,y:10,species:'pig-foreman',weapon:'pistol'},{x:18,y:12,species:'cow',weapon:'pistol'},{x:20,y:10,species:'goat',weapon:'pistol'},{x:17,y:9,species:'sheep',weapon:'pistol'}];
for(let y=8;y<=13;y++)map.edges[edgeKey('e',19,y)]='wall-brick';
const out=new URL('../artifacts/flame-cone/',import.meta.url);fs.mkdirSync(out,{recursive:true});
// Task-owned diagnostic browser; no saved player state, always closed below.
const browser=await chromium.launch({channel:'msedge',headless:true});let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('browser-helper.json',out),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'flame targeting check',purpose:'Disposable lethal template UI regression',expiry:'End of this command',stop:'browser.close in finally'},null,2));
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/default-factory.json',route=>route.fulfill({json:map}));
 await page.goto((process.env.EDITOR_ORIGIN||'http://127.0.0.1:4364')+'/tactics/battle-3d.html');
 await page.waitForFunction(()=>window.battle3d?.state,{},{timeout:90000});
 await page.evaluate(()=>{const s=battle3d.state;s.phase='player';s.rules.awareness=false;for(const u of s.units){u.hp=u.maxHp=1000;u.ap=30;u.heading=u.team==='squad'?0:180;}for(const u of s.units.filter(u=>u.team==='guard'))s.detected.add(u.id);s.revision++;});
 await clickBattleControl(page,'#center');await page.waitForFunction(()=>battle3d.renderer.models.has(0)&&battle3d.renderer.models.has(4)&&!battle3d.renderer.busy,{},{timeout:90000});
 const ground=async(x,y)=>page.evaluate(({x,y})=>{const r=document.getElementById('battle').getBoundingClientRect(),p=battle3d.project({x,y,z:0});return {x:r.x+p.x,y:r.y+p.y};},{x,y});
 const aim=await ground(18,10),north=await ground(10,3);
 await page.click('#aim-flame');assert.equal(await page.evaluate(()=>battle3d.paused),true);
 const resources=()=>page.evaluate(()=>{const s=battle3d.state,a=s.units[0];return {ap:a.ap,ammo:a.ammo.flamethrower,seed:s.seed,x:a.x,y:a.y,time:s.clock.minutes};});
 const before=await resources();await page.mouse.move(aim.x,aim.y);assert.equal(await page.locator('#flame-fire').isDisabled(),true);
 await page.mouse.click(aim.x,aim.y);assert.equal(await page.locator('#flame-fire').isEnabled(),true,await page.locator('.flame-instruction').textContent());
 assert.equal(await page.locator('#shot-popup').isVisible(),false);assert.match(await page.locator('.flame-summary').textContent(),/6 AP · 1 fuel · 10 tiles/);
 assert.match(await page.locator('.flame-summary').textContent(),/Lethal on contact/);
 assert.match(await page.locator('.flame-targets').textContent(),/friendly fire/);assert.equal(await page.evaluate(()=>battle3d.walkingPreview.length),0);
 // Hidden characters remain vulnerable but are not exposed by target warnings.
 await page.evaluate(()=>{battle3d.state.detected.delete(7);battle3d.state.units[7].name='Hidden Test Guard';});
 await page.click('#flame-place');await page.mouse.click(aim.x,aim.y);assert.doesNotMatch(await page.locator('.flame-targets').textContent(),/Hidden Test Guard/);
 assert.deepEqual(await resources(),before);
 await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('template.png',out))});
 await page.setViewportSize({width:430,height:900});const panelBox=await page.locator('#flame-plan').boundingBox();assert.ok(panelBox.x+panelBox.width<=430);await page.locator('#flame-plan').screenshot({path:fileURLToPath(new URL('mobile-template.png',out))});await page.setViewportSize({width:1500,height:1000});await clickBattleControl(page,'#center');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#flame-plan').isVisible(),false);assert.deepEqual(await resources(),before);
 await page.click('#aim-flame');await page.locator('#squad .merc-select').nth(1).click();assert.equal(await page.locator('#flame-plan').isVisible(),false);await page.locator('#squad .merc-select').nth(0).click();assert.deepEqual(await resources(),before);
 await page.click('#pause');await page.click('#aim-flame');await page.mouse.click(aim.x,aim.y);assert.equal(await page.locator('#flame-fire').isDisabled(),true);assert.match(await page.locator('.flame-instruction').textContent(),/Resume/);await page.click('#pause');assert.equal(await page.locator('#flame-fire').isEnabled(),true);await page.keyboard.press('Escape');
 await page.click('#aim-flame');await page.mouse.click(north.x,north.y);assert.equal(await page.evaluate(()=>battle3d.flamePreview.affected.length),0);
 await page.click('#flame-place');await page.mouse.click(aim.x,aim.y);
 // Reject insufficient AP and empty fuel; resetting the preview must not fire.
 for(const kind of ['ap','fuel']){
  await page.evaluate(kind=>{const a=battle3d.state.units[0];if(kind==='ap')a.ap=5;else a.ammo.flamethrower=0;},kind);
  await page.click('#flame-place');await page.mouse.click(aim.x,aim.y);assert.equal(await page.locator('#flame-fire').isDisabled(),true);
  assert.match(await page.locator('.flame-instruction').textContent(),kind==='ap'?/Not enough AP/:/Reload required/);
  await page.evaluate(()=>{const a=battle3d.state.units[0];a.ap=30;a.ammo.flamethrower=4;});
  await page.click('#flame-place');await page.mouse.click(aim.x,aim.y);
 }
 const health=await page.evaluate(()=>battle3d.state.units.map(u=>u.hp));
 // Freeze immediately after the real button handlers, before rendering several
 // simultaneous fatal reactions can consume the entire presentation interval.
 await page.evaluate(()=>{document.getElementById('flame-fire').click();document.getElementById('pause').click();});
 const after=await resources();assert.equal(after.ap,before.ap-6);assert.equal(after.ammo,before.ammo-1);assert.equal(await page.locator('#flame-plan').isVisible(),false);
 assert.ok(await page.evaluate(()=>!!battle3d.state.effect.flame));const hit=await page.evaluate(()=>battle3d.state.units.map(u=>u.hp));
 for(const id of [1,4,5,7])assert.equal(hit[id],0,id+' should be killed');assert.equal(hit[6],health[6],'Wall shields the last guard');
 await page.evaluate(()=>{const r=battle3d.renderer;r.combat.active.start=r.presentationNow-700;r.combat.advance(r.presentationNow);});
 await page.waitForFunction(()=>battle3d.renderer.flameEffects.mesh.visible||[...battle3d.renderer.fire.sessions.values()].some(s=>s.effects?.group.visible&&s.effects.group.children.some(m=>m.visible)));
 await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('spray.png',out))});
 assert.deepEqual(errors,[]);
 await page.setViewportSize({width:430,height:900});await page.locator('#battle').screenshot({path:fileURLToPath(new URL('mobile-spray.png',out))});
 console.log('Flame template: placement, rotation, cancel, pause, safe target warnings, blockers, AP/fuel and multi-target spray pass; browser closed.');
}finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',out),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
