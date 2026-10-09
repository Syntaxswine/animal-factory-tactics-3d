import {launchBattleReview} from './battle-review-browser.mjs';
import {clickBattleControl,openBattleDrawer} from './battle-ui-review.mjs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),{browser,closeReview}=await launchBattleReview(chromium,'check-battle-keyboard-camera'),page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const view=()=>page.evaluate(()=>({...battle3d.view}));
try{
 if(process.env.REVIEW_URL)await page.goto(process.env.REVIEW_URL);else {await page.goto((process.env.TACTICS_BASE_URL||'http://127.0.0.1:4323')+(process.env.TACTICS_BASE_URL?'/index.html':'/tactics-3d.html'));await page.locator('a.menu-item.primary').click();}await page.waitForFunction(()=>window.battle3d?.state&&!battle3d.renderer.busy);
 const hint=async()=>assert((await page.locator('#hint').textContent()).includes('WASD / arrows'));
 await hint();await clickBattleControl(page,'#center');await hint();await clickBattleControl(page,'#overview');await hint();await page.locator('#battle').click({position:{x:300,y:250}});await hint();await clickBattleControl(page,'#center');await hint();
 for(const [key,dx,dy] of [['w',0,40],['ArrowUp',0,40],['s',0,-40],['ArrowDown',0,-40],['a',40,0],['ArrowLeft',40,0],['d',-40,0],['ArrowRight',-40,0],['W',0,40]]){const before=await view();await page.keyboard.press(key);assert.deepEqual(await view(),{...before,x:before.x+dx,y:before.y+dy});}
 const before=await view();await page.keyboard.press('Control+a');assert.deepEqual(await view(),before);
 await openBattleDrawer(page);await page.focus('#floor');await page.keyboard.press('w');assert.deepEqual(await view(),before);
 await clickBattleControl(page,'#save-load');await page.keyboard.press('ArrowLeft');assert.deepEqual(await view(),before);
 await page.reload();await page.waitForFunction(()=>window.battle3d?.state&&!battle3d.renderer.busy);
 await page.click('#pause');const paused=await view(),units=await page.evaluate(()=>battle3d.state.units.map(u=>[u.id,u.x,u.y,u.ap]));await page.keyboard.press('d');assert.equal((await view()).x,paused.x-40);assert.deepEqual(await page.evaluate(()=>battle3d.state.units.map(u=>[u.id,u.x,u.y,u.ap])),units);
 await clickBattleControl(page,'#character');const character=await view();await page.keyboard.press('ArrowUp');assert.deepEqual(await view(),character);
 assert.deepEqual(errors,[]);console.log('WASD/arrows pan gameplay camera; modifiers, dropdowns and panels are protected; paused camera movement leaves units unchanged.');
}finally{await closeReview();}
