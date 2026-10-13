import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {launchSiteReview} from '../../../tools/site-review-browser.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.join(import.meta.dirname,'final');fs.mkdirSync(output,{recursive:true});
const helper='connected-ground-final-review-'+Date.now(),resume=process.argv.includes('--resume'),report=resume?JSON.parse(fs.readFileSync(path.join(output,'review.json'))):{helper,date:new Date().toISOString(),errors:[],requests:[],captures:[],hashes:{}};
if(resume)report.lifecycleRerun={helper,note:'Initial reviewer harness supplied nonexistent landscape seed 2411. Viewer correctly rejected it; this scoped rerun uses published seed 1409 and completes lifecycle/mobile checks.'};
const sources=['biome-ground-composition.js','biome-connected-ground.js','biome-ground-worker.js','biome-ground-sprites.js','biome-terrain.js','biome-terrain-study.js'];
const hashes=()=>Object.fromEntries(sources.map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync('dist/tactics/'+name)).digest('hex')]));if(resume)assert.deepEqual(report.hashes,hashes(),'Source changed before scoped lifecycle rerun');else report.hashes=hashes();
const owner=await launchSiteReview(chromium,helper,'connected-ground');
try{
 const page=await owner.browser.newPage({viewport:{width:1500,height:1080},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});page.on('requestfailed',r=>report.requests.push(r.url()));
 await page.addInitScript(()=>{
  window.reviewWorkers=[];window.reviewBitmaps=[];const NativeWorker=Worker;
  window.Worker=class extends NativeWorker{constructor(...args){super(...args);const record={url:String(args[0]),terminated:0,messages:0};window.reviewWorkers.push(record);this.addEventListener('message',e=>{record.messages++;if(e.data.image)window.reviewBitmaps.push(e.data.image)});const terminate=this.terminate.bind(this);this.terminate=()=>{record.terminated++;terminate();};}};
 });
 const started=Date.now();await page.goto('http://127.0.0.1:4476/tactics/biome-terrain-study.html?biome=temperate&frame=ground&view=top&grid=1');await page.waitForFunction(()=>window.biomeTerrainReady||window.biomeTerrainDisposed,null,{timeout:120000});if(!resume)report.loadMs=Date.now()-started;assert(await page.evaluate(()=>biomeTerrainReady));
 const capture=async(name,options)=>{
  const result=await page.evaluate(async o=>{
   const start=performance.now();biomeTerrainStudy.set(o);const setMs=performance.now()-start,skin=biomeTerrainStudy.terrain.groundSkin;
   await skin.whenReady();const readyMs=performance.now()-start;biomeTerrainStudy.render();
   return{state:biomeTerrainState,setMs,readyMs,skin:skin.stats};
  },options);
  report.captures.push({name,...result});await page.screenshot({path:path.join(output,name+'.png')});
 };
 if(!resume){
 await capture('temperate-joins',{frame:'ground',view:'top',grid:true});
 for(const biome of ['temperate','jungle','snow','dry','wetlands']){
  await capture(biome+'-ground',{biome,frame:'ground',view:'top',grid:false});
  await capture(biome+'-route',{frame:'corridor',view:'three'});
 }
 await capture('temperate-landscape-b',{biome:'temperate',seed:829,frame:'ground',view:'top'});
 await capture('temperate-before',{seed:173,paint:false});
 await capture('temperate-after',{paint:true});
 await capture('temperate-overview',{frame:'overview',view:'three'});
 await capture('temperate-grey',{frame:'ground',view:'top',grey:true});
 report.crops=await page.evaluate(async()=>{
  const {paintGroundRegion,releaseGroundPaint}=await import('./biome-connected-ground.js'),{createGroundComposition}=await import('./biome-ground-composition.js'),results=[];
  for(const family of ['temperate','jungle','dry']){
   const c=createGroundComposition(biomeTerrainStudy.plan,family,173),canvases=[];
   const make=(x,z,width,depth)=>{const canvas=document.createElement('canvas');canvases.push(canvas);paintGroundRegion(c,{x,z,width,depth,pixelsPerTile:32},canvas);return canvas;};
   const joined=document.createElement('canvas');joined.width=1536;joined.height=768;const ctx=joined.getContext('2d');
   const all=make(71.5,71.5,48,24);ctx.drawImage(make(71.5,71.5,24,24),0,0);ctx.drawImage(make(95.5,71.5,24,24),768,0);
   const a=all.getContext('2d').getImageData(0,0,1536,768).data,b=ctx.getImageData(0,0,1536,768).data;let changed=0,max=0,total=0,above8=0;
   for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;if(d>8)above8++;max=Math.max(d,max);total+=d;}
   results.push({family,changedChannels:changed,maxDelta:max,meanDelta:total/a.length,channelsAbove8:above8,pixels:1536*768});canvases.forEach(c=>c.width=c.height=1);joined.width=joined.height=1;releaseGroundPaint(c);
  }return results;
 });
 report.pan=await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{createConnectedGroundSkin}=await import('./biome-connected-ground.js'),S=biomeTerrainStudy,skin=createConnectedGroundSkin(S.plan,'temperate'),chunks=S.terrain.chunks.map(c=>({x:c.x,z:c.z,index:c.index,dense:!!c.dense,inView:true,distance:0})),mats=[],moves=[];
  for(const c of chunks){const m=new T.MeshBasicMaterial();mats.push(m);skin.attach(m,c);}
  let peakPages=0;
  try{
   for(const [x,z]of [[36,36],[40,36],[60,36],[36,36],[144,144],[210,210],[84,120],[36,210],[36,210]]){
    for(const c of chunks)c.distance=Math.hypot(Math.max(c.x-.5-x,0,x-(c.x+23.5)),Math.max(c.z-.5-z,0,z-(c.z+23.5)));
    const before=skin.stats,begin=performance.now();skin.update(chunks,{x,z},40);const updateMs=performance.now()-begin;
    const ticks=[];let previous=performance.now();const timer=setInterval(()=>{const now=performance.now();ticks.push(now-previous);previous=now;},10);
    await skin.whenReady();clearInterval(timer);const readyMs=performance.now()-begin;peakPages=Math.max(peakPages,skin.pages.size);
    moves.push({x,z,updateMs,readyMs,newPages:skin.stats.generations-before.generations,maxMainThreadTickMs:Math.max(0,...ticks),stats:skin.stats});
   }
   for(const c of chunks)c.distance=Math.hypot(c.x,c.z);skin.update(chunks,{x:0,z:0},40);const wait=skin.whenReady();skin.dispose();skin.dispose();const cancelled=await wait;
   return{moves,peakPages,cancelled,final:skin.stats};
  }finally{skin.dispose();mats.forEach(m=>m.dispose());}
 });
 }
 // Force successive owning terrain lifetimes while paint is in flight.
 report.replace=await page.evaluate(async()=>{
  const skins=[];for(const seed of [173,829,1409,173]){biomeTerrainStudy.set({biome:'temperate',seed,grey:false,frame:'ground',paint:true});const skin=biomeTerrainStudy.terrain.groundSkin;skins.push({skin,ready:skin.whenReady()});}
  const ready=await Promise.all(skins.map(s=>s.ready));biomeTerrainStudy.render();return{ready,stats:skins.map(s=>s.skin.stats),activeWorkers:reviewWorkers.filter(w=>w.terminated===0).length};
 });
 await page.setViewportSize({width:390,height:844});await capture('mobile-ground',{frame:'ground',view:'top',grid:true});report.mobile=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 report.dispose=await page.evaluate(async()=>{
  const S=biomeTerrainStudy,skin=S.terrain.groundSkin,resources=[{name:'overview',t:skin.overview},...[...skin.pages.entries()].map(([id,p])=>({name:'page '+id,t:p.texture}))].map(r=>({...r,count:0}));resources.forEach(r=>r.t.addEventListener('dispose',()=>r.count++));
  const materials=S.terrain.denseMeshes.map(o=>({m:o.material,count:0}));materials.forEach(r=>r.m.addEventListener('dispose',()=>r.count++));S.dispose();S.dispose();await new Promise(r=>setTimeout(r,120));
  return{textures:resources.map(({name,count})=>({name,count})),materials:materials.length,materialNotOnce:materials.filter(m=>m.count!==1).map(m=>m.count),pages:skin.pages.size,skin:skin.stats,workers:reviewWorkers,liveBitmaps:reviewBitmaps.filter(i=>i.width!==0).length,canvasCount:document.querySelectorAll('#scene canvas').length};
 });
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);assert.equal(report.pan.peakPages,16);assert.equal(report.pan.cancelled,false);assert.equal(report.replace.activeWorkers,1);assert.deepEqual(report.replace.ready,[false,false,false,true]);assert.equal(report.dispose.liveBitmaps,0);assert(report.dispose.workers.every(w=>w.terminated===1));assert.equal(report.mobile.width,report.mobile.scroll);assert.deepEqual(report.hashes,hashes(),'Source changed during independent evidence capture');
}finally{await owner.closeReview();report.finalHashes=hashes();fs.writeFileSync(path.join(output,'review.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({helper,loadMs:report.loadMs,captures:report.captures.map(c=>({name:c.name,setMs:c.setMs,readyMs:c.readyMs,skin:c.skin})),crops:report.crops,pan:report.pan,replace:report.replace,dispose:report.dispose,errors:report.errors},null,2));
