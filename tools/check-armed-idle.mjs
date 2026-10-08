import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {launchGrenadeReview} from './grenade-review-browser.mjs';
import {IDLE_ANIMALS,idleOutfits} from '../dist/tactics/armed-idle-actor.js';
import {WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
const runtime=process.env.PLAYWRIGHT_PATH;if(!runtime)throw Error('Set PLAYWRIGHT_PATH to the installed Playwright package');
const {chromium}=await import(pathToFileURL(path.join(runtime,'index.mjs')).href),{browser,closeReview}=await launchGrenadeReview(chromium,'armed-idle');
const rifleOnly=process.argv.includes('--rifle'),weapons=rifleOnly?['rifle']:Object.keys(WEAPON_MODELS);
const out=path.resolve('artifacts/idle-study/'+(rifleOnly?'rifle-browser':'browser'));fs.mkdirSync(out,{recursive:true});
const packaged=process.argv.includes('--packaged'),base=packaged?'http://idle-study.test/af3d':process.argv.slice(2).find(a=>!a.startsWith('--'))||'http://127.0.0.1:4476',errors=[],report=[];
try{
 const page=await browser.newPage({viewport:{width:1200,height:930},deviceScaleFactor:1});
 if(packaged)await page.route('http://idle-study.test/af3d/**',async route=>{
  const file=path.resolve('.pages-output',decodeURIComponent(new URL(route.request().url()).pathname.slice('/af3d/'.length))),root=path.resolve('.pages-output')+path.sep;
  if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'Missing packaged file'});
  const type={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(file)]||'application/octet-stream';
  await route.fulfill({status:200,contentType:type,body:fs.readFileSync(file)});
 });
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/tactics/armed-idle-study.html?paused',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.idleStudyReady,null,{timeout:90000});
 for(const profile of IDLE_ANIMALS)for(const outfit of idleOutfits(profile.id))for(const weapon of weapons){
  const rows=await page.evaluate(async options=>{await idleStudy.set({...options,mode:'motion',view:'three',scale:'close'});const rows=[];
   for(const mood of ['guard','mercenary']){idleStudy.set({mood});let maxGrip=0;for(let i=0;i<=12;i++){const s=idleStudy.seek((mood==='guard'?12:16)*i/12);maxGrip=Math.max(maxGrip,...s.contacts.map(c=>c.error),0);if(!s.com.every(Number.isFinite))throw Error('Nonfinite COM');}
    const s=idleStudy.seek((mood==='guard'?12:16)*.6);rows.push({animal:s.animal,outfit:s.outfit,weapon:s.weapon,mood:s.mood,maxGrip,geometries:s.geometryCount,textures:s.textureCount});}
   return rows;},{animal:profile.id,outfit,weapon});
  for(const row of rows){assert.equal(row.animal,profile.id);assert.equal(row.weapon,weapon);assert.equal(row.outfit,outfit);assert.ok(row.maxGrip<1e-7);report.push(row);}
  if(outfit==='normal'){
   await page.screenshot({path:path.join(out,profile.id+'-'+weapon+'.png')});
   if(['rifle','hmg','flamethrower'].includes(weapon)){await page.evaluate(()=>idleStudy.set({mode:'keys'}));await page.screenshot({path:path.join(out,profile.id+'-'+weapon+'-keys.png')});}
  }
  if(weapon==='rifle'){await page.evaluate(()=>{idleStudy.set({mode:'motion',scale:'game'});idleStudy.seek(9.6);});await page.screenshot({path:path.join(out,profile.id+'-'+outfit+'-game.png')});}
  if(weapon===weapons.at(-1))console.log(profile.id,outfit,'loaded');
 }
 const memory=await page.evaluate(async()=>{
  await idleStudy.set({animal:'horse',outfit:'normal',weapon:'rifle',mode:'motion',scale:'close'});const a=idleStudy.seek(0);
  await Promise.all([idleStudy.set({animal:'bull',weapon:'hmg'}),idleStudy.set({animal:'hen',weapon:'flamethrower'}),idleStudy.set({animal:'horse',weapon:'rifle'})]);const b=idleStudy.seek(0);
  for(let n=0;n<3;n++){await idleStudy.set({animal:'hen',weapon:'flamethrower'});for(let i=0;i<32;i++)idleStudy.seek(i/2);await idleStudy.set({animal:'horse',weapon:'rifle'});}
  const c=idleStudy.seek(0);return {before:[a.geometryCount,a.textureCount],after:[b.geometryCount,b.textureCount],repeated:[c.geometryCount,c.textureCount],animal:c.animal};
 });
 assert.equal(memory.animal,'horse');assert.deepEqual(memory.after,memory.before);assert.deepEqual(memory.repeated,memory.before);
 await page.evaluate(()=>idleStudy.set({mode:'sketch'}));assert.equal(await page.locator('#sketch').evaluate(img=>img.complete&&img.naturalWidth>1000),true);await page.screenshot({path:path.join(out,'sketch-mode.png')});
 await page.locator('#keyframes button').nth(1).click();assert.equal(await page.locator('#play').textContent(),'Play');assert.match(await page.locator('#status').textContent(),/^3.20/);
 await page.locator('#play').click();const t0=await page.evaluate(()=>idleStudyState.time);await page.waitForTimeout(250);const t1=await page.evaluate(()=>idleStudyState.time);assert.ok(t1>t0);await page.locator('#play').click();
 for(const view of ['front','side','rear','three'])for(const scale of ['close','game']){await page.evaluate(o=>idleStudy.set(o),{view,scale});assert.equal(await page.evaluate(()=>idleStudyState.view),view);}
 await page.setViewportSize({width:760,height:800});await page.evaluate(()=>idleStudy.set({mode:'keys'}));assert.equal(await page.locator('#labels span').count(),6);await page.screenshot({path:path.join(out,'compact-keys.png')});
 assert.deepEqual(errors,[]);const result={source:base,combinations:report.length,playbackSamples:report.length*13,errors,memory,report};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({combinations:report.length,playbackSamples:result.playbackSamples,memory,errors}));
}finally{await closeReview();}
