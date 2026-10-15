import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base=process.env.HORSE_CHAIR_REVIEW_URL||'http://127.0.0.1:4476/tactics/horse-chair-study.html',out=path.resolve(import.meta.dirname,'../artifacts/painted-chairs/horse-motion');fs.mkdirSync(out,{recursive:true});
const review=await launchSiteReview(chromium,'horse-chair-browser-'+Date.now(),'painted-chairs'),errors=[],records=[];
try{
 const page=await review.browser.newPage({viewport:{width:1280,height:960}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'?paused');await page.waitForFunction(()=>window.horseChairReady);const set=o=>page.evaluate(o=>horseChairStudy.set(o),o);
 for(const chair of ['wingback','wood','metal','desk'])for(const finish of ['original','alternate'])for(const view of ['three','side','front','rear','top'])for(const scale of ['close','game']){
  const d=await set({chair,finish,view,scale,time:3.8,playing:false});assert.equal(d.chair,chair);assert.equal(d.seatSupport,true);if(scale==='game')assert.equal(d.ppu,58);records.push({chair,finish,view,scale,resources:d.resources});
  assert.ok(await page.evaluate(()=>{const s=horseChairStudy;return s.worker.bones.every(b=>{const p=b.getWorldPosition(b.position.clone()).project(s.camera);return Math.abs(p.x)<.98&&Math.abs(p.y)<.98;});}),'character cropped');
 }
 const keyframes=[0,.7,1.6,2.7,3.8,5.8,6.2,6.7,7.2,8.5];
 for(const chair of ['wingback','wood','metal','desk'])for(const view of ['three','side']){
  for(const time of keyframes){await set({chair,finish:'original',view,scale:'close',time,grey:false});if(chair==='wingback'||time===3.8)await page.screenshot({path:path.join(out,chair+'-'+view+'-'+time+'.png')});}
  await set({chair,view,time:3.8,scale:'game'});await page.screenshot({path:path.join(out,chair+'-'+view+'-game.png')});
 }
 // A steady paused frame, exact backwards scrubbing, loop and real controls.
 const expected=await set({chair:'wingback',view:'three',scale:'close',time:3.8,playing:false});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>horseChairState.time),3.8);
 await set({time:7.4});const restored=await set({time:3.8});assert.deepEqual(restored.joints,expected.joints);await page.getByRole('button',{name:'Weight forward',exact:true}).click();assert.equal(await page.evaluate(()=>horseChairState.time),6.2);
 await page.getByRole('button',{name:'Restart',exact:true}).click();await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>horseChairState.time>0&&horseChairState.playing));await page.getByRole('button',{name:'Pause',exact:true}).click();
 await set({time:9.15,playing:true});await page.waitForTimeout(350);assert.ok(await page.evaluate(()=>horseChairState.time<.8));await set({playing:false,time:3.8});
 // Warm all variants before measuring repeated model replacement.
 for(const chair of ['wingback','wood','metal','desk'])for(const grey of [false,true])await set({chair,grey});await set({chair:'wingback',grey:false});const warm=await page.evaluate(()=>horseChairState.resources);
 for(let i=0;i<16;i++)await set({chair:['wood','metal','desk','wingback'][i%4],finish:i%2?'original':'alternate',grey:!!(i%2)});await set({chair:'wingback',grey:false});const after=await page.evaluate(()=>horseChairState.resources);assert.deepEqual(after,warm);
 await page.setViewportSize({width:390,height:844});await set({chair:'wingback',view:'three',scale:'close'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png')});await page.setViewportSize({width:1280,height:960});
 // Record the live canvas at normal playback speed, not a pose slideshow.
 for(const view of ['three','side']){
  await set({chair:'wood',finish:'original',view,scale:'close',time:0,playing:false});
  await page.evaluate(()=>{const chunks=[],stream=horseChairStudy.renderer.domElement.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});window.chairCapture={chunks,stream,recorder};recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();horseChairStudy.set({time:0,playing:true});});
  await page.waitForTimeout(9350);
  const video=await page.evaluate(()=>new Promise(resolve=>{const {chunks,stream,recorder}=chairCapture;recorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>{stream.getTracks().forEach(t=>t.stop());resolve(reader.result.split(',')[1]);};reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};recorder.stop();horseChairStudy.set({playing:false});}));fs.writeFileSync(path.join(out,'horse-sit-stand-'+view+'.webm'),Buffer.from(video,'base64'));
 }
 const teardown=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),original=T.Texture.prototype.dispose,counts={};T.Texture.prototype.dispose=function(){counts[this.uuid]=(counts[this.uuid]||0)+1;return original.call(this);};horseChairStudy.dispose();horseChairStudy.dispose();T.Texture.prototype.dispose=original;return {counts,disposed:horseChairDisposed,ready:horseChairReady};});assert.equal(teardown.disposed,true);assert.equal(teardown.ready,false);assert.ok(Object.values(teardown.counts).every(n=>n===1));
 assert.deepEqual(errors,[]);const report={configurations:records.length,keyframeConfigurations:4*2*keyframes.length,records,warm,after,errors,teardown,backwardsScrub:true,loop:true,mobileOverflow:false};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({configurations:records.length,keyframes:report.keyframeConfigurations,resources:after,errors,teardown:true,videos:2}));
}finally{await review.closeReview();}
