import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {launchGrenadeReview} from './grenade-review-browser.mjs';
const runtime=process.env.PLAYWRIGHT_PATH;if(!runtime)throw Error('Set PLAYWRIGHT_PATH to the installed Playwright package');
const {chromium}=await import(pathToFileURL(path.join(runtime,'index.mjs')).href),{browser,closeReview}=await launchGrenadeReview(chromium,'throw-study');
const out=path.resolve(import.meta.dirname,'../docs/tactics/hybrid-review/grenade-throw');fs.mkdirSync(out,{recursive:true});
const errors=[],base=process.argv[2]||'http://127.0.0.1:4476';
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/tactics/grenade-throw-study.html?paused',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.grenadeStudyReady,{timeout:90000});
 for(const view of ['three','side','front','rear']){
  await page.evaluate(view=>window.grenadeStudy.set({mode:'keys',view,scale:'close'}),view);await page.screenshot({path:path.join(out,'keyframes-'+view+'.png')});
 }
 for(const mode of ['motion','keys','asset'])for(const view of ['three','side','front','rear'])for(const scale of ['full','close','game']){
  const s=await page.evaluate(({mode,view,scale})=>{window.grenadeStudy.set({mode,view,scale});return window.grenadeStudy.seek(1.90);},{mode,view,scale});assert.equal(s.mode,mode);assert.equal(s.released,true);
 }
 for(const [name,options,t]of [['model',{mode:'asset',view:'three',scale:'close'},0],['gameplay',{mode:'motion',view:'three',scale:'game'},1.9],['release',{mode:'motion',view:'three',scale:'close'},1.9],['landing',{mode:'motion',view:'side',scale:'full',arc:true},3.4]]){
  await page.evaluate(({options,t})=>{window.grenadeStudy.set(options);window.grenadeStudy.seek(t);},{options,t});await page.screenshot({path:path.join(out,name+'.png')});
 }
 await page.evaluate(()=>window.grenadeStudy.set({mode:'motion',view:'side',scale:'close',arc:false}));
 const stats=await page.evaluate(()=>{const before=window.grenadeStudy.seek(0);for(let pass=0;pass<3;pass++)for(let i=0;i<=120;i++)window.grenadeStudy.seek(4.6*i/120);const after=window.grenadeStudy.seek(0);return {before,after};});assert.equal(stats.before.geometryCount,stats.after.geometryCount);assert.equal(stats.before.textureCount,stats.after.textureCount);
 await page.locator('#keyframes button').nth(3).click();assert.equal(await page.locator('#play').textContent(),'Play');assert.match(await page.locator('#status').textContent(),/^1.90/);
 await page.setViewportSize({width:760,height:740});await page.evaluate(()=>window.grenadeStudy.set({mode:'keys'}));await page.screenshot({path:path.join(out,'compact.png')});
 assert.deepEqual(errors,[]);const report={browserConfigurations:36,playbackSamples:363,errors,stats};fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({browserConfigurations:36,playbackSamples:363,errors}));
}finally{await closeReview();}
