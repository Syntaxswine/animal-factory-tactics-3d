import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const url=process.env.CHAIR_REVIEW_URL||'http://127.0.0.1:4476/tactics/painted-chairs-study.html',out=path.resolve(import.meta.dirname,'../artifacts/painted-chairs/check');fs.mkdirSync(out,{recursive:true});
const review=await launchSiteReview(chromium,'chair-browser-'+Date.now(),'painted-chairs'),records=[],errors=[];
try{
 const page=await review.browser.newPage({viewport:{width:1450,height:980}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url+'?reference=none');await page.waitForFunction(()=>window.paintedChairsReady);
 for(const chair of ['all','wingback','wood','metal','desk'])for(const finish of ['original','alternate'])for(const view of ['three','front','side','top','rear'])for(const scale of ['close','game']){
  const state=await page.evaluate(o=>paintedChairsStudy.set(o),{chair,finish,view,scale});records.push(state);
  assert.equal(state.forms.length,chair==='all'?4:1);assert.equal(state.seatHeight,.42);assert.ok(state.forms.every(f=>f.triangles<500));assert.ok(state.ppu>0);if(scale==='game')assert.equal(state.ppu,58);
  const visible=await page.evaluate(()=>{const s=paintedChairsStudy;return s.selected.every(c=>{c.root.updateMatrixWorld(true);return c.anchors.seat.getWorldPosition(c.root.position.clone()).project(s.camera).toArray().every(n=>Number.isFinite(n)&&Math.abs(n)<=1);});});assert.ok(visible,JSON.stringify({chair,finish,view,scale}));
 }
 const set=options=>page.evaluate(o=>paintedChairsStudy.set(o),options);
 await set({chair:'all',finish:'original',view:'three',scale:'close',reference:'horse'});await page.screenshot({path:path.join(out,'collection.png')});
 await set({reference:'pig-director',fit:true});await page.screenshot({path:path.join(out,'pig-and-fit.png')});
 await set({chair:'wingback',reference:'none',view:'side',fit:true});await page.screenshot({path:path.join(out,'shared-seat-fit.png')});
 await set({chair:'all',finish:'alternate',view:'three',fit:false});await page.screenshot({path:path.join(out,'alternate-finishes.png')});
 await set({reference:'pig-foreman'});assert.equal((await page.evaluate(()=>paintedChairState)).reference,'pig-foreman');
 await set({reference:'none',chair:'all',finish:'original',view:'three'});await set({finish:'alternate',fit:true,grey:true});await set({finish:'original',fit:false,grey:false});
 const warm=await page.evaluate(()=>paintedChairState.resources);
 for(let i=0;i<16;i++){await set({chair:i%2?'wood':'all',finish:i%2?'alternate':'original',fit:!!(i%2)});}await set({chair:'all',finish:'original',fit:false});
 const after=await page.evaluate(()=>paintedChairState.resources);assert.deepEqual(after,warm);
 await page.setViewportSize({width:390,height:844});await set({chair:'wingback',view:'three'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png')});
 await page.setViewportSize({width:1450,height:980});
 // A slow reference must never install itself after the selection is cleared.
 let release,started;const waiting=new Promise(r=>started=r),gate=new Promise(r=>release=r);
 await page.route('**/pig-director-model-paint-v1.png',async route=>{started();await gate;await route.continue();});
 await page.evaluate(()=>{window.pendingChairReference=paintedChairsStudy.set({reference:'pig-director'});});await waiting;await set({reference:'none'});release();await page.evaluate(()=>pendingChairReference);
 assert.equal(await page.evaluate(()=>paintedChairsStudy.animal),null);await page.unroute('**/pig-director-model-paint-v1.png');
 // Double teardown must release every texture at most once.
 await set({reference:'horse'});
 const teardown=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),original=T.Texture.prototype.dispose,counts={};T.Texture.prototype.dispose=function(){counts[this.uuid]=(counts[this.uuid]||0)+1;return original.call(this);};paintedChairsStudy.dispose();paintedChairsStudy.dispose();T.Texture.prototype.dispose=original;return {counts,disposed:window.paintedChairsDisposed,ready:window.paintedChairsReady};});
 assert.equal(teardown.disposed,true);assert.equal(teardown.ready,false);assert.ok(Object.values(teardown.counts).every(n=>n===1));assert.deepEqual(errors,[]);
 const result={configurations:records.length,records,warm,after,errors,teardown,slowReferenceCancelled:true,mobileOverflow:false};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({configurations:records.length,resources:after,slowReferenceCancelled:true,teardown:true,errors}));
}finally{await review.closeReview();}
