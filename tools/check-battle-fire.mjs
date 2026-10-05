import assert from 'node:assert/strict';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {blankMap,edgeKey} from '../dist/tactics/core/maps.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=new URL('../artifacts/live-horse-fire/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const map=blankMap('Horse fire integration');map.starts=[{x:10,y:10,weapon:'flamethrower'},{x:8,y:9},{x:8,y:8},{x:7,y:8}];
map.guards=[{x:14,y:10,species:'horse',weapon:'rifle'},{x:17,y:11,species:'horse',weapon:'assault'},{x:16,y:9,species:'horse',weapon:'pistol'},{x:20,y:10,species:'horse',weapon:'rifle'}];
for(let y=6;y<16;y++)map.edges[edgeKey('e',18,y)]='wall-brick';
const browser=await chromium.launch({channel:'msedge',headless:true});
let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('browser-helper.json',out),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'check-battle-fire caller; disposable browser',project:'AnimalFactory3D/game',purpose:'Disposable live fire browser regression',startedAt:new Date().toISOString(),expiry:'End of this test command',stop:'browser.close in finally',port:null},null,2));
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/default-factory.json',r=>r.fulfill({json:map}));
 await page.goto((process.env.EDITOR_ORIGIN||'http://127.0.0.1:4364')+'/tactics/battle-3d.html');
 await page.waitForFunction(()=>window.battle3d?.state,{},{timeout:90000});
 await page.evaluate(()=>{const s=battle3d.state;s.phase='player';s.rules.awareness=false;for(const u of s.units){u.hp=u.maxHp=1000;u.ap=30;u.heading=u.team==='squad'?0:180;}s.units[6].hp=1;for(const u of s.units.filter(u=>u.team==='guard'))s.detected.add(u.id);s.revision++;});
 await page.click('#center');await page.waitForFunction(()=>[0,4,5,6,7].every(id=>battle3d.renderer.models.has(id))&&!battle3d.renderer.busy,{},{timeout:90000});await page.evaluate(()=>battle3d.renderer.fire.ready);
 const aim=await page.evaluate(()=>{const r=document.getElementById('battle').getBoundingClientRect(),p=battle3d.project({x:18,y:10,z:0});return {x:r.x+p.x,y:r.y+p.y};});
 await page.click('#aim-flame');await page.mouse.click(aim.x,aim.y);await page.click('#flame-fire');await page.click('#pause');
 await page.mouse.move(aim.x,aim.y);await page.mouse.wheel(0,-600);await page.mouse.move(10,10);
 const paid=await page.evaluate(()=>{const s=battle3d.state;return {ap:s.units[0].ap,fuel:s.units[0].ammo.flamethrower,health:s.units.map(u=>u.hp),loot:JSON.stringify(s.loot)};});
 assert.equal(paid.ap,24);assert.equal(paid.fuel,3);assert.equal(paid.health[6],0);assert.equal(paid.health[7],1000);
 async function seek(seconds){await page.evaluate(t=>{const r=battle3d.renderer,n=r.presentationNow;if(r.combat.active)r.combat.active.start=n-t*1000;for(const e of r.fire.entries.values()){e.start=n-(t-.64)*1000;e.waiting=false;}},seconds);await page.waitForTimeout(100);}
 await seek(.85);await page.waitForFunction(()=>battle3d.renderer.fire.sessions.get(0)?.effects&&battle3d.renderer.fire.sessions.get(4)?.effects,{},{timeout:15000});
 await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('spray-and-engulf.png',out))});
 const positions=await page.evaluate(()=>{const r=battle3d.renderer;return [0,4,5,6].map(id=>{const m=r.models.get(id),p=m.worker.root.getWorldPosition(m.root.position.clone());return {id,p:p.toArray(),shown:m.worker.parts.some(p=>p.visible)};});});
 assert.ok(positions[0].p[0]>9&&positions[0].p[0]<11);assert.ok(positions[1].p[0]>13&&positions[1].p[0]<15);
 await seek(2.5);await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('fatal-ash-survivors.png',out))});
 const ash=await page.evaluate(()=>{const f=battle3d.renderer.fire,s=f.sessions.get(6);return {visible:s.effects.ash.visible,body:s.model.worker.parts.some(p=>p.visible),survivor:f.sessions.get(4).model.worker.parts.every(p=>p.visible),position:s.effects.ash.position.toArray(),diagnostics:battle3d.renderer.diagnostics};});
 assert.equal(ash.visible,true);assert.equal(ash.body,false);assert.equal(ash.survivor,true);assert.deepEqual(ash.position,[16,0,9]);assert.deepEqual(ash.diagnostics,[]);
 // Test real accepted movement; the UI cannot issue another action until the
 // bounded presentation completes. The game commits once, presentation follows.
 await page.evaluate(async()=>{const {endTurn}=await import('./core/engine.js'),s=battle3d.state;endTurn(s);battle3d.renderer.captureCombat(s);});
 const path=await page.evaluate(()=>{const r=battle3d.renderer,e=r.fire.entries.get(4);return e.event.route;});assert.ok(path.length>1);
 await page.evaluate(()=>{const r=battle3d.renderer;for(const e of r.fire.entries.values())if(e.event.kind==='panic')e.start=r.presentationNow-500;});await page.waitForTimeout(100);
 await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('panic-route.png',out))});
 assert.deepEqual(await page.evaluate(()=>battle3d.renderer.diagnostics),[]);
 // Save while the route is in flight, then confirm final coordinates and no
 // replayable animation receipts. Inventory and fire damage remain unchanged.
 const save=await page.evaluate(async()=>{const {captureEncounter,restoreEncounter}=await import('./encounter-save.js'),s=battle3d.state,b=restoreEncounter(captureEncounter(s));return {live:s.units.map(u=>[u.x,u.y,u.hp]),loaded:b.units.map(u=>[u.x,u.y,u.hp]),events:b.fireAnimations,loot:JSON.stringify(b.loot),ap:s.units[0].ap,fuel:s.units[0].ammo.flamethrower};});
 assert.deepEqual(save.live,save.loaded);assert.equal(save.events,undefined);assert.equal(save.loot,paid.loot);assert.equal(save.ap,paid.ap);assert.equal(save.fuel,paid.fuel);
 await page.evaluate(()=>{const r=battle3d.renderer;r.reducedMotion={matches:true};});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>battle3d.renderer.fire.busy),false);
 await page.evaluate(()=>window.previousFireRenderer=battle3d.renderer);await page.click('#restart');await page.waitForFunction(()=>battle3d.renderer!==previousFireRenderer&&battle3d.renderer.models.has(0)&&!battle3d.renderer.busy,{},{timeout:90000});assert.equal(await page.evaluate(()=>battle3d.renderer.fire.entries.size),0);
 assert.deepEqual(errors,[]);console.log('Live horse fire: spray, multi-target engulfment, surviving panic paths, fatal ash, wall protection, save during playback, reduced motion and restart pass.');
}finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',out),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
