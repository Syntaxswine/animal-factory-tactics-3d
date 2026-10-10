import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {blankMap,validateMap} from '../dist/tactics/core/maps.js';
import {launchBattleReview} from './battle-review-browser.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const origin=process.env.REVIEW_URL||'http://127.0.0.1:4363';
const out=path.resolve(import.meta.dirname,'../artifacts/movement-danger');fs.mkdirSync(out,{recursive:true});
const map=blankMap('Movement danger review');map.starts=[{x:20,y:20},{x:20,y:24},{x:17,y:24},{x:17,y:21}];
assert.deepEqual(validateMap(map),[]);
const report={checks:[],errors:[]},review=await launchBattleReview(chromium,'walking-danger');let page;
try{
 page=await review.browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/default-factory.json',r=>r.fulfill({json:map}));
 await page.goto(origin+'/tactics/battle-3d.html');
 await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4&&!battle3d.renderer.busy,null,{timeout:60000});
 await page.click('#pause');
 await page.evaluate(()=>{
  const s=battle3d.state;s.phase='player';s.engaged=true;s.rules.awareness=false;s.fires=[{x:23,y:20,z:0,turns:3}];
  for(const u of s.units)u.ap=30;
 for(let y=15;y<=30;y++)for(let x=15;x<=30;x++){s.visible.add(x+','+y);s.seen.add(x+','+y);}s.revision++;
 });
 await page.click('#pause');await page.click('#pause');
 const goal=await page.evaluate(()=>{const c=document.getElementById('battle').getBoundingClientRect(),p=battle3d.project({x:27,y:20,z:0});return {x:c.left+p.x,y:c.top+p.y};});
 const before=await page.evaluate(()=>JSON.stringify({units:battle3d.state.units,queue:battle3d.state.queue,clock:battle3d.state.clock}));
 await page.mouse.move(goal.x,goal.y);await page.locator('#movement-warning').waitFor({state:'visible'});
 assert.match(await page.locator('#movement-warning').innerText(),/Fire on route.*Yakov will catch fire/);
 assert.deepEqual(await page.evaluate(()=>battle3d.walkingPreview[0].hazards),[{kind:'fire',x:23,y:20,z:0}]);
 assert.equal(await page.evaluate(()=>battle3d.walkingPreview[0].cost),14);
 assert.equal(await page.evaluate(()=>JSON.stringify({units:battle3d.state.units,queue:battle3d.state.queue,clock:battle3d.state.clock})),before);
 await page.waitForFunction(()=>battle3d.renderer.tankEffects.ground.get(0)?.effects,null,{timeout:30000});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:path.join(out,'fire-on-route.png')});
 report.checks.push('Hover warns before moving, paints the intermediate fire tile, preserves AP cost, and does not mutate gameplay.');

 await page.evaluate(()=>{battle3d.state.visible.delete('23,20');battle3d.state.revision++;});
 await page.locator('#movement-warning').waitFor({state:'hidden'});
 await page.evaluate(()=>{battle3d.state.visible.add('23,20');battle3d.state.revision++;});
 await page.locator('#movement-warning').waitFor({state:'visible'});
 // No revision bump: a changed fire list must still invalidate the preview.
 await page.evaluate(()=>battle3d.state.fires[0].turns=0);await page.locator('#movement-warning').waitFor({state:'hidden'});
 await page.evaluate(()=>{battle3d.state.fires[0].turns=3;battle3d.state.fires[0].z=1;});await page.waitForFunction(()=>battle3d.walkingPreview[0]?.hazards.length===0);
 await page.evaluate(()=>battle3d.state.fires[0].z=0);await page.locator('#movement-warning').waitFor({state:'visible'});
 report.checks.push('Hidden, expired, and other-floor fire does not leak into the warning; live fire changes update a stationary hover.');

 await page.evaluate(async()=>{const {move}=await import('./core/engine.js');move(battle3d.state,battle3d.state.units[0],27,20,0);});
 await page.mouse.move(20,20);await page.waitForFunction(()=>battle3d.walkingPreview[0]?.hazards.length===1);
 assert.equal(await page.locator('#movement-warning').isVisible(),true);
 await page.evaluate(()=>battle3d.state.queue=[]);await page.locator('#movement-warning').waitFor({state:'hidden'});
 await page.evaluate(()=>{battle3d.state.phase='explore';battle3d.state.engaged=false;battle3d.state.revision++;});
 await page.mouse.move(goal.x,goal.y);await page.locator('#movement-warning').waitFor({state:'visible'});
 await page.screenshot({path:path.join(out,'exploration-fire.png')});
 report.checks.push('The warning persists for queued routes without hover, clears on cancellation, and works outside combat.');

 await page.evaluate(()=>{const s=battle3d.state;s.phase='player';s.engaged=true;s.loot.push({x:27,y:20,z:0,searched:true,items:[{type:'ammo',kind:'rifle',count:5}]});s.revision++;});
 await page.click('#pause');await page.mouse.click(goal.x,goal.y,{button:'right'});
 const moveAction=page.locator('[data-action="move"]'),pickup=page.locator('[data-action="pickup-0"]');
 assert.match(await moveAction.innerText(),/Fire on route/);assert.match(await pickup.innerText(),/Fire on route/);
 await page.screenshot({path:path.join(out,'context-fire-warning.png')});
 // A deliberate risky order remains allowed. Pausing immediately keeps the
 // disposable fixture at the beginning of its walk, before reaching the fire.
 await moveAction.click();await page.click('#pause');
 assert.ok(await page.evaluate(()=>battle3d.state.queue.length>0));
 report.checks.push('Right-click Move and pickup warn about their routes, while a deliberate move remains available.');

 await page.evaluate(()=>battle3d.state.queue=[]);
 await page.setViewportSize({width:700,height:800});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const smallGoal=await page.evaluate(()=>{const c=document.getElementById('battle').getBoundingClientRect(),p=battle3d.project({x:24,y:20,z:0});return {x:c.left+p.x,y:c.top+p.y};});
 await page.mouse.move(smallGoal.x,smallGoal.y);await page.locator('#movement-warning').waitFor({state:'visible'});
 const box=await page.locator('#movement-warning').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=700&&box.y>=0);
 assert.equal(await page.locator('#movement-warning').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
 await page.screenshot({path:path.join(out,'compact-fire-warning.png')});
 report.checks.push('Compact layout retains a readable warning without intercepting movement clicks.');
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2));console.log(report.checks.join('\n'));
}catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({...report,error:error.message},null,2));if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await review.closeReview();}
