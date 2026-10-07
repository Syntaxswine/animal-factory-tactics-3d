import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),out=path.resolve(import.meta.dirname,'../artifacts/strategic-sites');
const origin=process.env.REVIEW_URL||'http://127.0.0.1:4364',review=await launchSiteReview(chromium,'gameplay-integration');
let page;const errors=[],checks=[];
try{
 page=await review.browser.newPage({viewport:{width:1500,height:1050},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
 await page.goto(origin+'/tactics/editor-3d.html?editing=1&study=strategic-sites');
 await page.waitForFunction(()=>window.editor3d?.scene.sites.items.size===3&&!editor3d.loading,null,{timeout:60000});
 await page.click('[data-group=objects]');await page.selectOption('#prop-kind','site-radar');await page.check('#site-sabotage');
 assert.equal(await page.locator('#prop-kind option[value^="site-"]').count(),6);assert(await page.locator('#site-options').isVisible());
 const point=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),r=document.querySelector('#scene').getBoundingClientRect(),p=new T.Vector3(41,0,39).project(editor3d.scene.camera);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
 await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>editor3d.document.map.props.length===4&&!editor3d.loading);assert.equal(await page.evaluate(()=>editor3d.document.map.props[3].sabotage),true);
 await page.click('#undo');await page.waitForFunction(()=>editor3d.scene.sites.items.size===3);await page.click('#redo');await page.waitForFunction(()=>editor3d.scene.sites.items.size===4);
 await page.click('[data-group=inspect]');await page.evaluate(()=>editor3d.select(editor3d.inspect(41,39,0,{mode:'prop'})));await page.uncheck('#site-sabotage');await page.click('#apply-site-sabotage');await page.waitForFunction(()=>!editor3d.loading&&editor3d.document.map.props[3].sabotage===false);
 await page.click('#use-selected');assert.equal(await page.inputValue('#prop-kind'),'site-radar');await page.click('#quick-save-map');await page.waitForFunction(()=>!editor3d.document.changed);checks.push('mouse placement, six palette variants, undo/redo, copy settings, optional sabotage and editor save');
 await page.mouse.move(5,5);await page.screenshot({path:path.join(out,'editor-integrated.png')});
 await page.goto(origin+'/tactics/battle-3d.html?study=strategic-sites');
 await page.waitForFunction(()=>window.battle3d?.renderer.sites.items.size===3&&battle3d.renderer.models.size===4,null,{timeout:60000});await page.click('#pause');
 await page.evaluate(()=>{battle3d.renderer.reducedMotion={matches:true};});
 await page.click('#pause');const sabotage=page.getByRole('button',{name:/Sabotage Radio tower/});await sabotage.waitFor({timeout:30000});assert.equal(await sabotage.isEnabled(),true);await page.screenshot({path:path.join(out,'game-intact.png')});
 await sabotage.click();await page.waitForFunction(()=>battle3d.state.props[0].kind==='site-radio-destroyed'&&battle3d.renderer.sites.items.get('site:24,24,0').root.userData.state==='destroyed');
 assert.equal(await page.getByRole('button',{name:/Sabotage Radio tower/}).count(),0);checks.push('live sabotage button commits and model becomes a wreck');
 await page.click('#quicksave');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('saved'));await page.click('#quickload');await page.waitForFunction(()=>battle3d.state.props[0].kind==='site-radio-destroyed'&&battle3d.renderer.sites.items.size===3);
 checks.push('encounter save/load keeps the wreck');await page.screenshot({path:path.join(out,'game-radio-wreck.png')});
 // Exercise a real target click and the existing weapon/AP confirmation UI.
 await page.evaluate(async()=>{const {refresh,WEAPONS}=await import('./core/engine.js'),s=battle3d.state,u=s.units[0];Object.assign(u,{x:34,y:29,heading:0,weapon:'rpg',ap:30});u.ammo.rpg=WEAPONS.rpg.mag;s.seed=0;s.phase='player';s.rules.awareness=false;s.queue=[];s.revision++;refresh(s);battle3d.renderer.reducedMotion={matches:true};battle3d.renderer.world=null;document.querySelector('#center').click();});
 await page.waitForFunction(()=>battle3d.renderer.models.get(0)?.weapon==='rpg'&&!battle3d.renderer.busy);if(await page.evaluate(()=>battle3d.paused))await page.click('#pause');
 const click=await page.evaluate(()=>{const r=document.querySelector('#battle').getBoundingClientRect(),p=battle3d.project({x:38,y:29,z:0,h:1});return {x:r.left+p.x,y:r.top+p.y};});
 await page.mouse.move(click.x,click.y);await page.mouse.click(click.x,click.y);await page.waitForFunction(()=>document.querySelector('#shot-popup').open);assert.match(await page.locator('#shot-title').textContent(),/Radar/);assert.match(await page.locator('.shot-detail').textContent(),/explosion destroys/);
 await page.click('#fire');await page.waitForFunction(()=>battle3d.state.props[1].kind==='site-radar-destroyed',null,{timeout:30000});checks.push('scenery click, rocket preview, Fire button and live wreck replacement');
 await page.screenshot({path:path.join(out,'game-two-wrecks.png')});assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'integration-review.json'),JSON.stringify({checks,errors},null,2));console.log(checks.join('\n'));
}catch(error){if(page){await page.screenshot({path:path.join(out,'integration-failure.png')}).catch(()=>{});console.error('Page errors: '+JSON.stringify(errors));console.error(await page.evaluate(()=>window.battle3d?JSON.stringify({props:battle3d.state.props,log:battle3d.state.log.slice(0,6),effect:battle3d.state.effect,phase:battle3d.state.phase}):'editor'));console.error(await page.locator('#status,#message').allTextContents().catch(()=>[]));}throw error;}
finally{await review.closeReview();}
