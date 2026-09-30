import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {blankMap} from '../dist/tactics/core/maps.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const map=blankMap('Shot planning check');map.starts[0]={x:10,y:10};map.guards=[{x:14,y:10,species:'pig-foreman',weapon:'pistol'}];
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/default-factory.json',route=>route.fulfill({json:map}));
 await page.goto((process.env.EDITOR_ORIGIN||'http://127.0.0.1:4363')+'/tactics/battle-3d.html');
 await page.waitForFunction(()=>window.battle3d?.state,{},{timeout:90000});
 await page.click('#pause');
 await page.evaluate(()=>{const s=battle3d.state,a=s.units[0],b=s.units[4];a.heading=0;a.ap=30;a.accuracy=60;a.stats.firearms=60;a.stats.dexterity=60;s.phase='player';s.detected.add(b.id);s.rules.awareness=false;s.revision++;});
 await page.click('#center');
 await page.waitForFunction(()=>battle3d.renderer.models.has(4),{},{timeout:90000});
 // Find an actual pickable point on the target rather than guessing screen scale.
 const pick=await page.evaluate(()=>{const canvas=document.getElementById('battle'),r=canvas.getBoundingClientRect(),p=battle3d.project(battle3d.state.units[4]);for(let y=p.y-65;y<p.y+15;y+=3)for(let x=p.x-25;x<p.x+25;x+=3)if(battle3d.renderer.pick(x,y,r.width,r.height)===4)return {x:r.x+x,y:r.y+y};return null;});
 assert.ok(pick,'Target should be pickable');await page.mouse.click(pick.x,pick.y);
 await page.waitForSelector('#shot-planner table');assert.equal(await page.locator('#shot-planner table button').count(),12);
 const fullLeg=page.locator('#shot-planner tr').nth(3).locator('button').nth(2);assert.equal(await fullLeg.isEnabled(),true);await fullLeg.click();
 assert.equal(await page.locator('#aim-level').inputValue(),'full');assert.match(await page.locator('#shot-planner p').textContent(),/Full aim → legs/);
 await page.check('#burst-fire');assert.match(await page.locator('#shot-planner p').textContent(),/burst order/);
 await page.evaluate(()=>{battle3d.state.units[0].pinned=true;battle3d.state.revision++;});await page.locator('#aim-level').dispatchEvent('change');
 assert.equal(await page.locator('#shot-planner tr').nth(2).locator('button').nth(2).isDisabled(),true);assert.equal(await page.locator('#shot-planner tr').nth(2).locator('button').nth(0).isEnabled(),true);
 await page.evaluate(()=>{battle3d.state.units[0].pinned=false;battle3d.state.revision++;});await page.locator('#aim-level').dispatchEvent('change');
 await page.uncheck('#burst-fire');await page.locator('#shot-planner tr').nth(2).locator('button').nth(1).click();
 fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});await page.locator('#shot-planner').screenshot({path:fileURLToPath(new URL('../artifacts/shot-planner.png',import.meta.url))});
 const before=await page.evaluate(()=>({ap:battle3d.state.units[0].ap,ammo:battle3d.state.units[0].ammo.assault}));
 await page.click('#pause');await page.click('#fire');
 const after=await page.evaluate(()=>({ap:battle3d.state.units[0].ap,ammo:battle3d.state.units[0].ammo.assault}));
 assert.equal(after.ap,before.ap-6);assert.equal(after.ammo,before.ammo-1);assert.deepEqual(errors,[]);
 console.log('Live planner: 12 choices, body-part selection, burst values, pin restrictions and aimed firing AP/ammo pass.');
}finally{await browser.close();}

