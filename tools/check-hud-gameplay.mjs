import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
import {clickBattleControl} from './battle-ui-review.mjs';
import {blankMap} from '../dist/tactics/core/maps.js';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const origin=process.env.INTEGRATION_ORIGIN||'http://127.0.0.1:4364',out='artifacts/hud-integration';
const review=await launchSiteReview(chromium,'hud-gameplay-'+Date.now()),report={checks:[],errors:[],badResponses:[]};fs.mkdirSync(out,{recursive:true});let page;
try{
 page=await review.browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.stack));page.on('response',r=>{if(r.status()>=400)report.badResponses.push(r.url());});
 await page.goto(origin+'/tactics-3d.html');await page.getByRole('link',{name:/Quick Fight/}).first().click();
 await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4&&!battle3d.renderer.busy,null,{timeout:120000});
 assert.equal(await page.locator('.merc-card').count(),4);assert.equal(await page.locator('.weapon-row').count(),8);assert.equal(await page.locator('#campaign-actions').isVisible(),false);
 assert.ok(await page.evaluate(()=>battle3d.state.definition.width===240&&battle3d.state.props.length>100));
 await page.waitForFunction(()=>[...document.querySelectorAll('#squad img')].every(i=>i.complete&&i.naturalWidth));await page.screenshot({path:out+'/packaged-quick-fight.png'});report.checks.push('Title Quick Fight opens the full factory with the approved HUD and loaded portraits/weapon artwork');

 const map=blankMap('HUD equipment integration');map.starts=[{x:10,y:10},{x:14,y:10},{x:10,y:14},{x:14,y:14}];
 await page.route('**/default-factory.json',r=>r.fulfill({json:map}));await page.goto(origin+'/tactics/battle-3d.html');
 await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4&&!battle3d.renderer.busy,null,{timeout:120000});
 await page.evaluate(()=>{const s=battle3d.state,u=s.units[0];s.phase='player';s.engaged=true;s.rules.awareness=false;s.queue=[];u.ap=18;u.pack.push({type:'weapon',kind:'shotgun',rounds:6,condition:100});u.ammo.shotgun=6;s.revision++;});
 const merc=page.locator('.merc-card[data-unit="0"]'),menu=page.locator('#battle-context');
 const snapshot=()=>page.evaluate(()=>{const s=battle3d.state,u=s.units[0];return {weapon:u.weapon,ap:u.ap,ammo:u.ammo,slots:u.slots,minutes:s.clock.minutes};});
 const settle=async()=>{await merc.locator('.merc-inventory').click();await page.locator('#character-screen[open]').waitFor();assert.equal(await page.evaluate(()=>battle3d.renderer.busy),false);};
 const closeInventory=()=>page.click('#character-close');
 async function equipmentMenu(){
  await page.waitForFunction(()=>!battle3d.renderer.busy);
  const p=await page.evaluate(()=>{const u=battle3d.state.units[0],p=battle3d.project({...u,h:1}),b=document.querySelector('#battle').getBoundingClientRect();return {x:b.x+p.x,y:b.y+p.y};});
  await page.mouse.click(p.x,p.y,{button:'right'});await menu.locator('[data-action="equipment"]').click();
 }
 await page.waitForFunction(()=>document.querySelector('.merc-swap').title.includes('2 AP'));const before=await snapshot();
 await merc.locator('.merc-swap').click();assert.equal((await snapshot()).ap,before.ap-2);
 await page.waitForFunction(()=>battle3d.renderer.equipmentState(0)==='drawing');await settle();
 const ready=page.locator('.draw-weapon[data-weapon="assault"]');assert.equal(await ready.isEnabled(),true);assert.match(await ready.innerText(),/2 AP/);
 const opened=await snapshot();assert.equal(opened.minutes,before.minutes);assert.equal(opened.ap,before.ap-2);await ready.locator('img').click();assert.equal((await snapshot()).ap,before.ap-4);
 report.checks.push('HUD ready swap and Inventory ready swap each cost 2 AP; immediate Inventory reopening settles the cosmetic draw without advancing time');
 await page.waitForFunction(()=>!battle3d.renderer.busy);await equipmentMenu();assert.match(await menu.locator('[data-action="equip-pistol"]').innerText(),/2 AP/);assert.match(await menu.locator('[data-action="equip-shotgun"]').innerText(),/3 AP/);await page.screenshot({path:out+'/equipment-context.png'});
 await menu.locator('[data-action="equip-pistol"]').click();assert.equal((await snapshot()).ap,before.ap-6);
 await equipmentMenu();await menu.locator('[data-action="equip-shotgun"]').click();assert.equal((await snapshot()).ap,before.ap-9);assert.equal((await snapshot()).ammo.shotgun,6);
 report.checks.push('Right-click equipment uses the same 2 AP ready / 3 AP backpack costs and preserves ammunition');
 await settle();await closeInventory();await page.evaluate(()=>{battle3d.state.units[0].ap=1;battle3d.state.revision++;});await page.locator('#aim-level').dispatchEvent('change');
 assert.equal(await merc.locator('.merc-swap').isDisabled(),true);const denied=await snapshot();
 await equipmentMenu();assert.equal(await menu.locator('[data-action="equip-assault"]').isDisabled(),true);assert.match(await menu.locator('[data-action="equip-assault"]').getAttribute('title'),/Needs 2 AP; 1 available/);await page.keyboard.press('Escape');
 await settle();assert.equal(await ready.isDisabled(),true);assert.match(await ready.getAttribute('title'),/Needs 2 AP/);assert.deepEqual(await snapshot(),denied);await page.screenshot({path:out+'/equipment-insufficient-ap.png'});await closeInventory();
 report.checks.push('HUD, Inventory and context menu all reject insufficient AP without changing equipment or ammunition');
 await page.evaluate(()=>{const s=battle3d.state;s.phase='won';s.engaged=false;s.units[0].ap=0;s.revision++;});await page.locator('#aim-level').dispatchEvent('change');
 assert.match(await merc.locator('.merc-swap').getAttribute('title'),/Free/);await merc.locator('.merc-swap').click();await settle();await closeInventory();
 await equipmentMenu();assert.match(await menu.locator('[data-action="equip-pistol"]').innerText(),/Free/);await menu.locator('[data-action="equip-pistol"]').click();await settle();
 const shotgun=page.locator('.draw-weapon[data-weapon="shotgun"]');assert.match(await shotgun.innerText(),/Free/);await shotgun.locator('img').click();assert.equal((await snapshot()).ap,0);await settle();await closeInventory();
 report.checks.push('All three equipment routes remain free outside combat, including backpack draws');
 const saved=await snapshot();await clickBattleControl(page,'#quicksave');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Quicksave saved'));
 await clickBattleControl(page,'#quickload');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Encounter loaded'));
 const loaded=await snapshot();assert.deepEqual({weapon:loaded.weapon,ap:loaded.ap,ammo:loaded.ammo,slots:loaded.slots},{weapon:saved.weapon,ap:saved.ap,ammo:saved.ammo,slots:saved.slots});
 report.checks.push('Quick Fight save/load retains reconciled equipment, AP and ammunition');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.badResponses,[]);report.passed=true;console.log(JSON.stringify(report));
}catch(e){report.failure=e.stack;await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e;}
finally{fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));await review.closeReview();}
