import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH),review=await launchSiteReview(chromium,'battle-context'),out='artifacts/battle-context';fs.mkdirSync(out,{recursive:true});
const errors=[];
try{
 const page=await review.browser.newPage({viewport:{width:1360,height:950}});page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(process.env.CONTEXT_REVIEW_URL||'http://127.0.0.1:4364/tactics/battle-3d.html?study=grenades',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4);
 async function clickAt(point,button='right'){const q=await page.evaluate(p=>{const q=battle3d.project(p),b=document.querySelector('#battle').getBoundingClientRect();return {x:q.x+b.x,y:q.y+b.y};},point);await page.mouse.click(q.x,q.y,{button});}
 const menu=page.locator('#battle-context');
 await clickAt({x:20,y:18,z:0});await menu.waitFor({state:'visible'});assert.match(await menu.textContent(),/Column 21.*Row 19.*Level 1/s);assert.ok(await page.evaluate(()=>battle3d.paused));await page.screenshot({path:out+'/ground-menu.png'});
 await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>battle3d.state.queue.length),0);
 // Merc submenus are real actions, and a right click itself spends nothing.
 const ap=await page.evaluate(()=>battle3d.state.units[0].ap);await clickAt({x:20,y:24,h:1,z:0});await menu.waitFor({state:'visible'});assert.match(await menu.textContent(),/Yakov/);assert.equal(await page.evaluate(()=>battle3d.state.units[0].ap),ap);await page.screenshot({path:out+'/merc-menu.png'});
 await menu.locator('[data-action="stance"]').click();await menu.locator('[data-action="stance-kneeling"]').click();assert.equal(await page.evaluate(()=>battle3d.state.units[0].stance),'kneeling');await page.locator('#stance-standing').click();
 // Choosing a grenade tile hands off to the existing lob planner.
 await clickAt({x:20,y:18,z:0});await menu.locator('[data-action="ground-shot"]').click();assert.equal(await page.locator('#grenade-plan').isVisible(),true);await page.locator('#grenade-cancel').click();
 // Equip the already-carried pistol through the submenu and fire at terrain.
 await clickAt({x:20,y:24,h:1,z:0});await menu.locator('[data-action="equipment"]').click();await menu.locator('[data-action="equip-pistol"]').click();await page.waitForFunction(()=>!battle3d.renderer.busy);
 await clickAt({x:20,y:18,z:0});await menu.locator('[data-action="ground-shot"]').click();assert.equal(await page.locator('#shot-popup').isVisible(),true);assert.equal(await page.locator('.ground-shot-graphic').count(),1);await page.screenshot({path:out+'/ground-shot.png'});
 const ammo=await page.evaluate(()=>battle3d.state.units[0].ammo.pistol);await page.locator('#fire').click();assert.equal(await page.evaluate(()=>battle3d.state.units[0].ammo.pistol),ammo-1);await page.waitForFunction(()=>!battle3d.renderer.busy);
 // Spawn review-only visible supplies; the game still performs every movement
 // and inventory check. The test never calls the menu callbacks directly.
 await page.evaluate(()=>{const s=battle3d.state,u=s.units[0];s.engaged=false;s.phase='won';u.ap=18;u.stamina=u.maxStamina;s.loot.push({x:20,y:20,z:0,items:[{type:'ammo',kind:'pistol',count:4}]});s.visible.add('20,20');s.revision++;});
 await clickAt({x:20,y:20,z:0});assert.equal(await menu.locator('[data-action="pickup-0"]').count(),1);await menu.locator('[data-action="pickup-0"]').click();
 await page.locator('#character-screen').waitFor({state:'visible',timeout:20000});assert.ok(await page.evaluate(()=>Math.abs(battle3d.state.units[0].y-20)<=1));assert.equal(await page.locator('[data-focused-loot]').count(),1);await page.screenshot({path:out+'/pickup-inventory.png'});await page.locator('#character-close').click();
 // Interaction layers stay authoritative under camera rotation.
 await page.locator('#battle-levels [data-level="1"]').click();await page.keyboard.press('e');await clickAt({x:29,y:20,z:1});await menu.waitFor({state:'visible'});assert.match(await menu.textContent(),/Column 30.*Row 21.*Level 2/s);await page.keyboard.press('Escape');
 // Outside left click dismisses the popup without issuing an accidental move.
 await page.locator('#battle-levels [data-level="0"]').click();await clickAt({x:20,y:18,z:0});await clickAt({x:20,y:19,z:0},'left');assert.equal(await menu.isVisible(),false);assert.equal(await page.evaluate(()=>battle3d.state.queue.length),0);
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({passed:true,errors},null,2));console.log('Context menu, merc actions, ground shooting, pickup approach, layers and dismissal passed.');
}finally{await review.closeReview();}
