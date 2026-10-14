import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve('artifacts/loading-screen/builder');fs.mkdirSync(output,{recursive:true});
const owner=await launchSiteReview(chromium,'loading-screen-'+Date.now(),'loading-screen'),report={views:[],errors:[],requests:[]};
try{
 const page=await owner.browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('requestfailed',r=>report.requests.push(r.url()));
 for(const [name,width,height] of [['desktop',1920,1080],['laptop',1366,768],['ultrawide',2560,1080],['phone',390,844],['small-phone',320,568],['landscape',844,390],['small-landscape',568,320]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:4476/tactics/loading-screen-study.html?progress=62');await page.waitForFunction(()=>window.loadingScreenStudy);await page.locator('.loading-art').evaluate(i=>i.decode());
  const state=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom};};return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,brand:rect('.loading-brand'),controls:rect('.loading-study-tools'),readout:rect('.loading-readout'),art:[document.querySelector('.loading-art').naturalWidth,document.querySelector('.loading-art').naturalHeight],progress:document.querySelector('.loading-track').getAttribute('aria-valuenow')};});
  assert.ok(state.scrollWidth<=width,name+' horizontal overflow');assert.ok(state.scrollHeight<=height,name+' vertical overflow');assert.ok(state.readout.bottom<=height,name+' loading bar leaves viewport');assert.equal(state.progress,'62');assert.ok(state.art[0]>1000);
  const titleBounds=await page.locator('h1').evaluate(h=>{const range=document.createRange();range.selectNodeContents(h);return [...range.getClientRects()].map(r=>({left:r.left,right:r.right}));});assert.ok(titleBounds.every(r=>r.left>=0&&r.right<=width),name+' title clipped');report.views.push({name,...state});await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
 }
 await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>loadingScreenStudy.screen.setProgress(null,'Receiving sector'));assert.equal(await page.locator('.loading-track').getAttribute('aria-valuenow'),null);assert.equal(await page.locator('#loading-screen').getAttribute('aria-busy'),'true');
 await page.evaluate(()=>loadingScreenStudy.screen.setProgress(136,'Received'));assert.equal(await page.locator('.loading-track').getAttribute('aria-valuenow'),'100');
 await page.evaluate(()=>loadingScreenStudy.screen.error('<connection interrupted>'));assert.equal(await page.locator('.loading-status').textContent(),'<connection interrupted>');assert.equal(await page.locator('#loading-screen').getAttribute('data-state'),'error');
 await page.evaluate(()=>loadingScreenStudy.screen.ready());assert.equal(await page.locator('.loading-track').getAttribute('aria-valuenow'),'100');assert.equal(await page.locator('#loading-screen').getAttribute('aria-busy'),'false');await page.screenshot({path:path.join(output,'ready.png')});
 await page.locator('#preview-replay').click();await page.waitForTimeout(500);assert.ok((await page.evaluate(()=>loadingScreenStudy.state)).elapsed>0);await page.locator('#preview-pause').click();const held=await page.evaluate(()=>loadingScreenStudy.state.elapsed);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>loadingScreenStudy.state.elapsed),held);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.loadingScreenStudy);assert.equal(await page.evaluate(()=>loadingScreenStudy.state.playing),false);assert.equal(await page.locator('.loading-lights .data-lamp i').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.evaluate(()=>{loadingScreenStudy.dispose();loadingScreenStudy.dispose();});const disposed=await page.evaluate(()=>loadingScreenStudy.state);assert.equal(disposed.frame,0);assert.equal(disposed.playing,false);report.lifecycle={pausedElapsed:held,reducedMotion:true,disposed};
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await owner.closeReview();}
