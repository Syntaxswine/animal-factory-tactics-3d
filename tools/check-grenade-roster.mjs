import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {launchGrenadeReview} from './grenade-review-browser.mjs';
import {GRENADE_CHARACTERS,grenadeOutfits} from '../dist/tactics/grenade-throw-actor.js';
const runtime=process.env.PLAYWRIGHT_PATH;if(!runtime)throw Error('Set PLAYWRIGHT_PATH');
const {chromium}=await import(pathToFileURL(path.join(runtime,'index.mjs')).href);
const {browser,closeReview}=await launchGrenadeReview(chromium,'grenade-roster');
const out=path.resolve('artifacts/grenade-throw/roster');fs.mkdirSync(out,{recursive:true});
const packaged=process.argv.includes('--packaged'),args=process.argv.slice(2).filter(a=>!a.startsWith('--'));
const errors=[],report=[],base=packaged?'http://grenade-study.test/af3d':args[0]||'http://127.0.0.1:4476';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 if(packaged)await page.route('http://grenade-study.test/af3d/**',async route=>{
  const file=path.resolve('.pages-output',decodeURIComponent(new URL(route.request().url()).pathname.slice('/af3d/'.length)));
  const root=path.resolve('.pages-output')+path.sep;
  if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'Missing packaged file'});
  const type={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream';
  await route.fulfill({status:200,contentType:type,body:fs.readFileSync(file)});
 });
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/tactics/grenade-throw-study.html?paused',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.grenadeStudyReady,null,{timeout:90000});
 for(const {id} of GRENADE_CHARACTERS)for(const outfit of grenadeOutfits(id)){
  const state=await page.evaluate(async({id,outfit})=>{await window.grenadeStudy.set({animal:id,outfit,mode:'motion',view:'three',scale:'close'});let maxGrip=0;
   for(let i=0;i<=138;i++){const d=window.grenadeStudy.seek(i/30);if(!d.ball.position.every(Number.isFinite))throw Error('Nonfinite projectile');maxGrip=Math.max(maxGrip,d.gripError||0);}
   const d=window.grenadeStudy.seek(.46);return {animal:d.animal,outfit:d.outfit,maxGrip,geometries:d.geometryCount,textures:d.textureCount};},{id,outfit});
  assert.equal(state.animal,id);assert.equal(state.outfit,outfit);assert.ok(state.maxGrip<1e-7);report.push(state);
  await page.evaluate(()=>window.grenadeStudy.set({mode:'keys',view:'three'}));await page.screenshot({path:path.join(out,id+'-'+outfit+'-keys.png')});
  if(outfit==='normal'&&['hen','pig-foreman','pig-director','skunk','rabbit','bull'].includes(id))for(const view of ['side','rear','front']){
   await page.evaluate(view=>window.grenadeStudy.set({view}),view);await page.screenshot({path:path.join(out,id+'-'+view+'-keys.png')});
  }
  await page.evaluate(()=>{window.grenadeStudy.set({mode:'motion',view:'three',scale:'game'});window.grenadeStudy.seek(1.92);});await page.screenshot({path:path.join(out,id+'-'+outfit+'-game.png')});
  console.log(id,outfit,'passed');
 }
 const memory=await page.evaluate(async()=>{await window.grenadeStudy.set({animal:'horse',outfit:'normal',mode:'motion',scale:'close'});const before=window.grenadeStudy.seek(0);
  await Promise.all([window.grenadeStudy.set({animal:'bull'}),window.grenadeStudy.set({animal:'hen'}),window.grenadeStudy.set({animal:'horse'})]);
  const after=window.grenadeStudy.seek(0);return {before:[before.geometryCount,before.textureCount],after:[after.geometryCount,after.textureCount],animal:after.animal};});
 assert.equal(memory.animal,'horse');assert.deepEqual(memory.before,memory.after);
 await page.setViewportSize({width:760,height:800});await page.evaluate(()=>window.grenadeStudy.set({mode:'keys'}));await page.screenshot({path:path.join(out,'compact.png')});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({source:packaged?'packaged .pages-output under /af3d/':base,combinations:report.length,samples:report.length*139,report,memory,errors},null,2));
 console.log(JSON.stringify({combinations:report.length,samples:report.length*139,memory,errors}));
}finally{await closeReview();}
