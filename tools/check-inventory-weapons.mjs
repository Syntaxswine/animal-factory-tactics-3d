import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {launchBattleReview} from './battle-review-browser.mjs';
import {blankMap} from '../dist/tactics/core/maps.js';
import {WEAPONS} from '../dist/tactics/core/engine.js';
import {WEAPON_ICONS} from '../dist/tactics/weapon-icons.js';
const base=process.env.REVIEW_URL||'http://127.0.0.1:4474/tactics/battle-3d.html';
const out=path.resolve(import.meta.dirname,'../artifacts/battle-layout/weapon-refresh');fs.mkdirSync(out,{recursive:true});
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const {browser,closeReview}=await launchBattleReview(chromium,'inventory-weapon-ui');
const report={checks:[],errors:[],badResponses:[]};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),map=blankMap('Inventory equipment review');
 await page.route('**/default-factory.json',route=>route.fulfill({json:map}));
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.badResponses.push(r.url());});
 await page.goto(base);await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4&&!battle3d.renderer.busy,null,{timeout:120000});
 await page.click('#pause');
 await page.evaluate(()=>{const s=battle3d.state;s.phase='player';s.engaged=true;s.rules.awareness=false;s.queue=[];for(const u of s.units)u.ap=20;s.revision++;});
 await page.locator('#aim-level').dispatchEvent('change');
 const open=async(id=0)=>{await page.locator('.merc-card[data-unit="'+id+'"] .merc-inventory').click();await page.waitForSelector('#character-screen[open]');assert.equal(await page.locator('#character-screen').evaluate(d=>d.scrollTop),0);};
 const choice=kind=>page.locator('.draw-weapon[data-weapon="'+kind+'"]');
 const state=id=>page.evaluate(id=>{const s=battle3d.state,u=s.units.find(u=>u.id===id);return {weapon:u.weapon,ap:u.ap,slots:u.slots,rounds:u.ammo[u.weapon],minutes:s.clock.minutes,queue:s.queue.length};},id);
 await open();const before=await state(0);await choice('pistol').locator('img').click();const after=await state(0);
 assert.equal(after.weapon,'pistol');assert.equal(after.ap,before.ap-2);assert.equal(after.minutes,before.minutes);assert.equal(await page.locator('#character-screen').isVisible(),false);
 await page.waitForFunction(()=>battle3d.renderer.equipmentState(0)==='drawing');
 await open();assert.equal(await page.evaluate(()=>battle3d.renderer.busy),false);assert.equal(await choice('assault').isEnabled(),true);assert.equal(await page.locator('.weapon-row.held .weapon-select').first().getAttribute('aria-label').then(v=>v.includes('TT-33')),true);
 await choice('assault').locator('img').click();assert.equal((await state(0)).ap,before.ap-4);await page.waitForFunction(()=>battle3d.renderer.equipmentState(0)==='drawing');
 report.checks.push('Clickable Inventory weapon icons swap both directions for 2 AP; rapid paused reopening settles only the draw and updates HUD');

 // Also exercise a requested draw before a rendering frame has fitted the gun.
 await open();await page.click('#character-close');await page.click('#pause');
 await page.evaluate(()=>{document.querySelector('.merc-card[data-unit="0"] .merc-swap').click();document.querySelector('.merc-card[data-unit="0"] .merc-inventory').click();});
 assert.equal(await page.locator('#character-screen').isVisible(),true);assert.equal(await page.evaluate(()=>battle3d.renderer.busy),false);assert.equal(await choice('assault').isEnabled(),true);
 const settled=await state(0);await page.waitForTimeout(100);assert.deepEqual(await state(0),settled);await page.click('#character-close');await page.click('#pause');
 report.checks.push('Same-frame HUD swap then Inventory cannot reassert a stuck draw or advance gameplay while open');

 await page.evaluate(async()=>{const {move}=await import('./core/engine.js');const s=battle3d.state,u=s.units[0];if(!move(s,u,u.x+2,u.y,u.z||0))throw Error('Movement fixture rejected');s.revision++;});
 await open();assert.match(await page.locator('.equipment-notice').textContent(),/Movement is queued/);assert.equal(await choice('assault').isDisabled(),true);
 const queued=await state(0);await page.getByRole('button',{name:'Stop squad movement',exact:true}).click();assert.equal((await state(0)).queue,0);assert.equal((await state(0)).ap,queued.ap);assert.equal(await choice('assault').isEnabled(),true);await choice('assault').locator('img').click();
 report.checks.push('Queued movement has a working stop control in Inventory; stopping is free and immediately enables equip');

 await open(1);const other=await state(1),primary=await state(0);await choice('pistol').locator('img').click();assert.equal((await state(1)).weapon,'pistol');assert.equal((await state(1)).ap,other.ap-2);assert.deepEqual(await state(0),primary);
 report.checks.push('Inventory for another squad member equips that member and leaves the selected merc unchanged');

 await open(0);await page.click('#character-close');
 await page.evaluate(()=>{const u=battle3d.state.units[0];u.ap=12;u.pack.push({type:'weapon',kind:'shotgun',rounds:6});u.ammo.shotgun=6;battle3d.state.revision++;});
 await open();assert.match(await choice('shotgun').innerText(),/3 AP/);await choice('shotgun').locator('img').click();assert.equal((await state(0)).weapon,'shotgun');assert.equal((await state(0)).ap,9);assert.equal((await state(0)).rounds,6);
 await open();await page.click('#character-close');await page.evaluate(()=>{battle3d.state.units[0].ap=1;battle3d.state.revision++;});await open();assert.equal(await choice('assault').isDisabled(),true);assert.match(await choice('assault').getAttribute('title'),/Needs 2 AP/);await page.click('#character-close');
 report.checks.push('Backpack icon equip costs 3 AP and preserves ammo; insufficient AP exposes the reason and prevents a ready swap');

 await page.evaluate(()=>{battle3d.state.phase='enemy';battle3d.state.revision++;});await open();assert.match(await page.locator('.equipment-notice').textContent(),/your turn/);assert.equal(await choice('assault').isDisabled(),true);await page.click('#character-close');
 await page.evaluate(()=>{battle3d.state.phase='player';battle3d.state.units[0].ap=12;battle3d.state.revision++;});
 report.checks.push('Enemy-turn inspection remains free without permitting equipment changes');

 for(const rounds of [8,1]){
  const fired=await page.evaluate(async rounds=>{
   const {equip,attackGround}=await import('./core/engine.js'),s=battle3d.state,u=s.units[0];u.ap=20;
   if(u.weapon!=='pistol'&&!equip(s,u,'pistol'))throw Error('Pistol equip rejected');u.ammo.pistol=rounds;
   if(!attackGround(s,u,{x:u.x+3,y:u.y,z:u.z||0}))throw Error('Pistol shot rejected');
   battle3d.renderer.captureCombat(s);
   return u.ammo.pistol;
  },rounds);
  assert.equal(fired,rounds-1);await page.click('#pause');
  await page.waitForFunction(()=>!battle3d.renderer.busy);await page.click('#pause');await open();
  const pistolCard=section=>page.locator(section+' .dossier-item').filter({has:page.locator('[data-weapon="pistol"]')});
  await pistolCard('.dossier-equipment').getByRole('button',{name:'To backpack',exact:true}).click();
  const beforeOpening=await page.evaluate(()=>JSON.stringify(battle3d.state.units[0]));await open();
  assert.match(await pistolCard('.dossier-backpack').innerText(),new RegExp('Loaded: '+(rounds-1)+'\\b'));
  assert.equal(await page.evaluate(()=>JSON.stringify(battle3d.state.units[0])),beforeOpening);
  await choice('pistol').click();assert.equal((await state(0)).rounds,rounds-1);await open();
  assert.match(await pistolCard('.dossier-equipment').innerText(),new RegExp('Loaded: '+(rounds-1)+'\\b'));
  await page.click('#character-close');
 }
 report.checks.push('After firing, Inventory shows 7 or 0 loaded rounds in the backpack and after re-equipping, without mutating inventory on inspection');

 await page.locator('#aim-level').dispatchEvent('change');await page.screenshot({path:path.join(out,'hud.png')});
 await open();await page.waitForFunction(()=>[...document.querySelectorAll('#character-screen img')].every(i=>i.complete&&i.naturalWidth));await page.screenshot({path:path.join(out,'inventory.png')});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>{const d=document.querySelector('#character-screen');return d.scrollWidth<=d.clientWidth;}),true);await page.screenshot({path:path.join(out,'inventory-mobile.png')});await page.click('#character-close');await page.screenshot({path:path.join(out,'hud-mobile.png')});
 report.checks.push('Desktop and narrow-screen HUD/Inventory load painted sprites without horizontal overflow');

 const icons=await browser.newPage({viewport:{width:1200,height:850}});
 await icons.goto(new URL('./weapon-icons.js',base).href);
 await icons.setContent('<style>body{margin:0;background:#1e3027;color:#f4e7c5;font:15px system-ui}h1{font:30px Georgia;padding:16px 26px 0}main{padding:16px 26px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}article{border:1px solid #697759;background:#304331;padding:14px}b{display:block;margin:8px 0}small{display:block;color:#becaae;margin-top:7px}.tiny{height:34px;background:#e6dbb7;border:1px solid #a69b77;padding:4px 12px;display:flex;align-items:center}</style><h1>Animal Factory — painted weapon sprites</h1><main>'+Object.keys(WEAPONS).map(kind=>'<article data-kind="'+kind+'"><div class="large"></div><b>'+WEAPONS[kind].name+'</b><div class="tiny"></div></article>').join('')+'</main>');
 await icons.evaluate(async()=>{const {createWeaponSprite}=await import('./weapon-icons.js');for(const article of document.querySelectorAll('article')){article.querySelector('.large').append(createWeaponSprite(article.dataset.kind,{height:58}));article.querySelector('.tiny').append(createWeaponSprite(article.dataset.kind));}});
 await icons.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await icons.screenshot({path:path.join(out,'weapon-icons.png')});await icons.close();
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.badResponses,[]);report.passed=true;console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2));await closeReview();}
