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
 const ground=await page.evaluate(()=>{const r=document.getElementById('battle').getBoundingClientRect(),p=battle3d.project({x:12,y:12,z:0});return {x:r.x+p.x,y:r.y+p.y};});
 await page.mouse.move(ground.x,ground.y);await page.waitForFunction(()=>battle3d.walkingPreview[0]?.path.at(-1)?.x===12&&battle3d.walkingPreview[0]?.path.at(-1)?.y===12);
 assert.ok(await page.evaluate(()=>battle3d.walkingPreview[0].cost>0));
 fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});await page.locator('#battle').screenshot({path:fileURLToPath(new URL('../artifacts/walking-preview.png',import.meta.url))});
 assert.ok(pick,'Target should be pickable');await page.mouse.move(pick.x,pick.y);
 await page.waitForFunction(()=>document.getElementById('battle').dataset.targetCursor==='red');
 assert.match(await page.locator('#battle').evaluate(e=>getComputedStyle(e).cursor),/data:image/);
 // Ordinary daylight targets identify immediately under the current visibility
 // rules. Use a sneaking target for this deliberately unidentified cursor case.
 await page.evaluate(()=>{const s=battle3d.state;s.rules.awareness=true;s.units[0].awareness={};s.units[4].sneaking=true;});
 await page.waitForFunction(()=>document.getElementById('battle').dataset.targetCursor==='grey');
 await page.evaluate(()=>battle3d.state.detected.delete(4));
 await page.waitForFunction(()=>!document.getElementById('battle').dataset.targetCursor);
 await page.evaluate(()=>{battle3d.state.rules.awareness=false;battle3d.state.units[4].sneaking=false;battle3d.state.detected.add(4);});
 await page.waitForFunction(()=>document.getElementById('battle').dataset.targetCursor==='red');
 await page.mouse.move(10,10);await page.waitForFunction(()=>!document.getElementById('battle').dataset.targetCursor);
 await page.mouse.click(pick.x,pick.y);
 await page.waitForSelector('#shot-popup[open]');assert.equal(await page.locator('.body-target').count(),4);assert.equal(await page.locator('.shot-aims button').count(),3);
 await page.locator('svg [data-zone=legs]').click({position:{x:8,y:45}});await page.click('[data-aim="full"]');
 assert.equal(await page.locator('#aim-level').inputValue(),'full');assert.match(await page.locator('.shot-detail').textContent(),/Full aim → legs/);
 await page.check('#burst-fire');assert.match(await page.locator('.shot-detail').textContent(),/burst order/);
 await page.evaluate(()=>{battle3d.state.units[0].ap=0;battle3d.state.revision++;});await page.locator('#aim-level').dispatchEvent('change');
 assert.match(await page.locator('.shot-blockers').textContent(),/0 AP/);assert.match(await page.locator('.target-head').textContent(),/%/);assert.equal(await page.locator('#fire').isDisabled(),true);
 await page.evaluate(()=>{battle3d.state.units[0].ap=30;battle3d.state.revision++;});await page.locator('#aim-level').dispatchEvent('change');
 await page.evaluate(()=>{battle3d.state.units[0].pinned=true;battle3d.state.revision++;});await page.locator('#aim-level').dispatchEvent('change');
 assert.equal(await page.locator('[data-aim=full]').isDisabled(),true);assert.equal(await page.locator('[data-aim=hip]').isEnabled(),true);
 await page.evaluate(()=>{battle3d.state.units[0].pinned=false;battle3d.state.revision++;});await page.locator('#aim-level').dispatchEvent('change');
 await page.uncheck('#burst-fire');await page.click('[data-choice=torso]');await page.click('[data-aim=aimed]');
 fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});await page.locator('#shot-popup').screenshot({path:fileURLToPath(new URL('../artifacts/shot-planner.png',import.meta.url))});
 const before=await page.evaluate(()=>({ap:battle3d.state.units[0].ap,ammo:battle3d.state.units[0].ammo.assault}));
 await page.keyboard.press('Escape');assert.equal(await page.locator('#shot-popup').isVisible(),false);
 assert.equal(await page.evaluate(()=>battle3d.state.units[0].ap),before.ap);
 await page.click('#pause');await page.mouse.click(pick.x,pick.y);assert.equal(await page.evaluate(()=>battle3d.paused),true);
 await page.locator('#shot-popup').screenshot({path:fileURLToPath(new URL('../artifacts/shot-planner.png',import.meta.url))});
 await page.click('#fire');assert.equal(await page.locator('#shot-popup').isVisible(),false);
 const after=await page.evaluate(()=>({ap:battle3d.state.units[0].ap,ammo:battle3d.state.units[0].ammo.assault}));
 assert.equal(after.ap,before.ap-6);assert.equal(after.ammo,before.ammo-1);assert.deepEqual(errors,[]);
 const shot=await page.evaluate(()=>battle3d.state.effect.sequence[0]);assert.ok(shot.shotRoll.die>=1&&shot.shotRoll.die<=20);assert.equal(shot.trajectories[0].trajectoryModel,'roll-margin');assert.equal(shot.trajectories[0].accurate,shot.shotRoll.rolledHit);
 // Hold playback at discharge to inspect the actual AK-47 muzzle and tracer.
 await page.evaluate(()=>{const r=battle3d.renderer,s=battle3d.state;r.captureCombat(s);if(r.combat.active){r.combat.active.start=r.presentationNow-20;r.combat.advance(r.presentationNow);}});
 await page.waitForFunction(()=>battle3d.renderer.shotEffects.trace.visible,{},{timeout:10000});
 await page.locator('#battle').screenshot({path:fileURLToPath(new URL('../artifacts/roll-margin-live-shot.png',import.meta.url))});
 console.log('Guard cursors: red, grey, hidden and pointer exit pass. Graphical popup: target click, body selection, aim controls, burst values, pin restrictions, Escape cancellation, planning pause and firing AP/ammo pass.');
 console.log('Live roll-margin shot result and non-rifle muzzle/tracer playback pass.');
}finally{await browser.close();}
