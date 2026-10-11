import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.env.HELICOPTER_REVIEW_URL||'http://127.0.0.1:4476/tactics/utility-helicopter-study.html',out=path.resolve(import.meta.dirname,'../artifacts/utility-helicopter/check');fs.mkdirSync(out,{recursive:true});
const review=await launchSiteReview(chromium,'helicopter-browser-'+Date.now(),'utility-helicopter'),records=[],errors=[];
try{
 const page=await review.browser.newPage({viewport:{width:1540,height:1080}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);await page.waitForFunction(()=>window.helicopterReady);const set=o=>page.evaluate(o=>helicopterStudy.set(o),o);
 for(const mode of ['pair','intact','crashed'])for(const view of ['three','side','front','rear','top'])for(const scale of ['fit','game'])for(const grey of [false,true]){
  const state=await set({mode,view,scale,grey});records.push(state);assert.ok(state.models.every(m=>m.triangles<3000));assert.deepEqual(state.references.truckScale,[1,1,1]);assert.deepEqual(state.references.horseScale,[1,1,1]);if(scale==='game')assert.equal(state.ppu,58);
  if(scale==='fit')assert.ok(await page.evaluate(()=>{const {aircraft,truck,horse,camera}=helicopterStudy;return [...aircraft.map(a=>a.root),truck.root,horse.root].filter(o=>o.visible).every(o=>{let okay=true;o.traverse(p=>{if(!p.isMesh)return;const a=p.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=p.position.clone().fromBufferAttribute(a,i).applyMatrix4(p.matrixWorld).project(camera);if(Math.abs(v.x)>.99||Math.abs(v.y)>.99)okay=false;}});return okay;});}),mode+' '+view+' clipped');
 }
 await page.locator('#mode').selectOption('crashed');await page.locator('#view').selectOption('side');await page.locator('#grey').uncheck();await page.locator('#truck').uncheck();await page.locator('#horse').uncheck();assert.equal((await page.evaluate(()=>helicopterState)).mode,'crashed');assert.equal((await page.evaluate(()=>helicopterState)).view,'side');
 await set({mode:'pair',view:'three',scale:'fit',grey:false,truck:true,horse:true});const warm=await page.evaluate(()=>helicopterState.resources);
 for(let i=0;i<20;i++)await set({mode:i%2?'crashed':'intact',grey:!!(i%2),view:i%2?'rear':'front'});await set({mode:'pair',view:'three',grey:false});const after=await page.evaluate(()=>helicopterState.resources);assert.deepEqual(after,warm);
 await page.setViewportSize({width:390,height:844});await set({mode:'intact',view:'three',scale:'fit'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png')});
 const disposed=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),original=T.Texture.prototype.dispose,counts={};T.Texture.prototype.dispose=function(){counts[this.uuid]=(counts[this.uuid]||0)+1;return original.call(this);};helicopterStudy.dispose();helicopterStudy.dispose();T.Texture.prototype.dispose=original;return {ready:helicopterReady,disposed:helicopterDisposed,counts};});assert.equal(disposed.ready,false);assert.equal(disposed.disposed,true);assert.ok(Object.values(disposed.counts).every(n=>n===1));assert.deepEqual(errors,[]);
 // A missing atlas must fail visibly and cleanly, instead of leaving an
 // apparently healthy viewer with blank model materials.
 const failed=await review.browser.newPage();await failed.route('**/paint-atlas-v1.png',r=>r.abort());await failed.goto(url);await failed.waitForFunction(()=>window.helicopterDisposed);assert.match(await failed.locator('#error').innerText(),/failed to load/);await failed.close();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({configurations:records.length,errors,warm,after,disposed,mobileOverflow:false,missingAtlasHandled:true},null,2));console.log(JSON.stringify({configurations:records.length,errors,resources:after,disposal:true,missingAtlasHandled:true,mobileOverflow:false}));
}finally{await review.closeReview();}
