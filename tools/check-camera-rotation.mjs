import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const review=await launchSiteReview(chromium,'camera-rotation'),origin=process.env.REVIEW_URL||'http://127.0.0.1:4364';
const out=path.resolve(import.meta.dirname,'../artifacts/camera-rotation');fs.mkdirSync(out,{recursive:true});
let page;const errors=[],checks=[];
const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} differs from ${b}`);
try{
 page=await review.browser.newPage({viewport:{width:1500,height:1050},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('dialog',dialog=>dialog.accept());
 await page.goto(origin+'/tactics/editor-3d.html?editing=1&study=strategic-sites');
 await page.waitForFunction(()=>window.editor3d&&!editor3d.loading&&editor3d.scene.sites.items.size===3);
 await page.locator('#scene').focus();await frame();
 const documentBefore=await page.evaluate(()=>editor3d.export());
 for(const [key,preset]of [['q','3'],['e','0'],['e','1'],['e','2'],['e','3'],['e','0']]){
  const before=await page.evaluate(()=>({...editor3d.view}));await page.keyboard.press(key);await frame();
  const after=await page.evaluate(()=>{const e=editor3d,c=document.getElementById('scene');return {view:{...e.view},select:document.getElementById('camera').value,hit:e.scene.pick(c.clientWidth/2,c.clientHeight/2,c.clientWidth,c.clientHeight)};});
  assert.equal(after.view.preset,preset);assert.equal(after.select,preset);assert.equal(after.view.span,before.span);close(after.hit.x,before.x);close(after.hit.y,before.y);
 }
 await page.keyboard.down('q');await page.keyboard.down('q');await page.keyboard.up('q');assert.equal(await page.evaluate(()=>editor3d.view.preset),'3');
 await page.keyboard.press('e');await page.keyboard.press('Control+e');assert.equal(await page.evaluate(()=>editor3d.view.preset),'0');
 await page.locator('#settings-button').click();await page.locator('#close-settings').focus();await page.keyboard.press('q');assert.equal(await page.evaluate(()=>editor3d.view.preset),'0');
 await page.selectOption('#camera','top');await page.locator('#close-settings').click();await page.locator('#scene').focus();await page.keyboard.press('e');await frame();
 assert.equal(await page.evaluate(()=>editor3d.view.topTurn),1);assert.equal(await page.evaluate(()=>editor3d.view.preset),'top');
 await page.locator('#quick-home').click();await page.locator('[data-group="terrain"]').click();await page.locator('#tile-search').focus();await page.keyboard.type('qe');assert.equal(await page.inputValue('#tile-search'),'qe');assert.equal(await page.evaluate(()=>editor3d.view.preset),'0');
 assert.equal(await page.evaluate(()=>editor3d.export()),documentBefore);
 await page.locator('#tile-search').fill('');await page.locator('[data-group="inspect"]').click();
 await page.evaluate(()=>{Object.assign(editor3d.view,{x:33,y:33,span:40});document.getElementById('camera').dispatchEvent(new Event('change'));});await page.locator('#scene').focus();await page.keyboard.press('e');await frame();
 await page.screenshot({path:path.join(out,'editor-quarter-turn.png')});checks.push('Editor Q/E, four angles, top-down, held-key debounce, settings and text-field protection; map unchanged.');

 await page.goto(origin+'/tactics/battle-3d.html?study=strategic-sites');
 await page.waitForFunction(()=>window.battle3d?.renderer.sites.items.size===3&&!battle3d.renderer.busy);
 await page.locator('#pause').click();await page.locator('#squad button').nth(1).click();await frame();
 const stateBefore=await page.evaluate(()=>JSON.stringify({units:battle3d.state.units,props:battle3d.state.props,queue:battle3d.state.queue}));
 for(const [key,turn]of [['q',3],['e',0],['e',1],['e',2],['e',3],['e',0]]){
  const before=await page.evaluate(async()=>{const {battleFloorPoint}=await import('./isometric-camera.js'),c=document.getElementById('battle');return {point:battleFloorPoint(battle3d.view,c.clientWidth/2,c.clientHeight/2,battle3d.level),zoom:battle3d.view.zoom};});
  await page.keyboard.press(key);await frame();
  const after=await page.evaluate(point=>({turn:battle3d.view.turn,zoom:battle3d.view.zoom,screen:battle3d.project(point),width:document.getElementById('battle').clientWidth,height:document.getElementById('battle').clientHeight}),before.point);
  assert.equal(after.turn,turn);assert.equal(after.zoom,before.zoom);close(after.screen.x,after.width/2);close(after.screen.y,after.height/2);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify({units:battle3d.state.units,props:battle3d.state.props,queue:battle3d.state.queue})),stateBefore);
 await page.keyboard.down('e');await page.keyboard.down('e');await page.keyboard.up('e');assert.equal(await page.evaluate(()=>battle3d.view.turn),1);
 const protectedView=await page.evaluate(()=>({...battle3d.view}));await page.keyboard.press('Control+q');assert.deepEqual(await page.evaluate(()=>({...battle3d.view})),protectedView);
 await page.locator('#floor').focus();await page.keyboard.press('q');assert.deepEqual(await page.evaluate(()=>({...battle3d.view})),protectedView);
 await page.locator('#save-load').click();await page.keyboard.press('e');assert.deepEqual(await page.evaluate(()=>({...battle3d.view})),protectedView);await page.keyboard.press('Escape');
 await page.locator('#character').click();await page.keyboard.press('q');assert.deepEqual(await page.evaluate(()=>({...battle3d.view})),protectedView);await page.locator('#character-close').click();
 for(const [key,dx,dy]of [['w',0,40],['ArrowDown',0,-40],['a',40,0],['ArrowRight',-40,0]]){const b=await page.evaluate(()=>({...battle3d.view}));await page.keyboard.press(key);assert.deepEqual(await page.evaluate(()=>({...battle3d.view})),{...b,x:b.x+dx,y:b.y+dy});}
 checks.push('Game Q/E preserves focus, zoom, AP and unit positions; pan directions, modifiers and dialogs stay correct.');
 await page.locator('#pause').click();
 // Real mouse movement orders from points projected by Three.js, not the new inverse.
 for(let i=0;i<4;i++){
  await page.locator('#center').click();await frame();
  const goal=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),b=battle3d,u=b.state.units.find(u=>u.id===b.state.selected),c=document.getElementById('battle'),r=c.getBoundingClientRect(),target={x:u.x,y:u.y+1,z:0},p=new T.Vector3(target.x,0,target.y).project(b.renderer.camera);return {...target,sx:r.left+(p.x+1)*r.width/2,sy:r.top+(1-p.y)*r.height/2};});
  await page.mouse.move(goal.sx,goal.sy);
  await page.waitForFunction(goal=>battle3d.walkingPreview.some(r=>r.path.at(-1)?.x===goal.x&&r.path.at(-1)?.y===goal.y),goal);
  await page.mouse.click(goal.sx,goal.sy);
  await page.waitForFunction(goal=>{const b=battle3d,u=b.state.units.find(u=>u.id===b.state.selected);return u.x===goal.x&&u.y===goal.y&&!b.state.queue.length&&!b.renderer.busy;},goal);
  await page.keyboard.press('e');await frame();
 }
 checks.push('Footprint previews and clicked movement destinations match the renderer in all four orientations.');
 await page.locator('#squad button').nth(0).click();await page.locator('#aim-flame').click();await frame();
 const flame=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),b=battle3d,u=b.state.units[0],c=document.getElementById('battle'),r=c.getBoundingClientRect(),p=new T.Vector3(u.x,u.cliffSupport?.height||0,u.y-4).project(b.renderer.camera);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
 await page.mouse.click(flame.x,flame.y);const flameBefore=await page.evaluate(()=>JSON.stringify(battle3d.flamePreview));await page.keyboard.press('q');await frame();assert.equal(await page.evaluate(()=>JSON.stringify(battle3d.flamePreview)),flameBefore);await page.locator('#flame-cancel').click();
 checks.push('Rotating with a placed flame template preserves its world target and outcome.');
 await page.locator('#pause').click();await page.locator('#overview').click();await page.keyboard.press('e');await page.locator('#center').click();await frame();
 await page.screenshot({path:path.join(out,'game-quarter-turn.png')});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({checks,errors},null,2));console.log(checks.join('\n'));
}catch(error){if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await review.closeReview();}
