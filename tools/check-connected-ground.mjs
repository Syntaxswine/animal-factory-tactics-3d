import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'artifacts/connected-ground/builder'),assets=path.join(root,'dist/assets/environment/connected-ground');fs.mkdirSync(output,{recursive:true});fs.mkdirSync(assets,{recursive:true});
const errors=[],report={biomes:[],pixelJoins:[],lifecycle:null},sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest={version:1,seed:173,tilesAcross:8,tilesDown:8,pixelsPerTile:64,usage:'These 64 neighboring tiles form one world composition. Keep their coordinates; do not shuffle or repeat this sheet. Generate other coordinates with paintGroundRegion.',assets:[]};
const owner=await launchSiteReview(chromium,'connected-ground-'+Date.now(),'connected-ground');
try{
 const page=await owner.browser.newPage({viewport:{width:1500,height:1080}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.BIOME_TERRAIN_URL||'http://127.0.0.1:4476/tactics/biome-terrain-study.html?biome=temperate&frame=ground&view=top&grid=1');await page.waitForFunction(()=>window.biomeTerrainReady,null,{timeout:120000});
 for(const family of ['temperate','jungle','snow','dry','wetlands']){
  const state=await page.evaluate(async family=>{biomeTerrainStudy.set({biome:family,frame:'ground',view:'top',grid:true,paint:true,seed:173});await biomeTerrainStudy.terrain.groundSkin.whenReady();biomeTerrainStudy.render();return biomeTerrainState;},family);report.biomes.push(state);await page.screenshot({path:path.join(output,family+'-joins.png')});
  const result=await page.evaluate(async()=>{
   const {paintGroundRegion}=await import('./biome-connected-ground.js'),c=biomeTerrainStudy.terrain.groundSkin.composition,[fx,,fz]=biomeTerrainState.focus,x=Math.floor(fx)-4.5,z=Math.floor(fz)-4.5;
   const whole=document.createElement('canvas');paintGroundRegion(c,{x,z,width:8,depth:8,pixelsPerTile:64},whole);
   const joined=document.createElement('canvas');joined.width=joined.height=512;const ctx=joined.getContext('2d'),tile=document.createElement('canvas');
   for(let dz=0;dz<8;dz++)for(let dx=0;dx<8;dx++){paintGroundRegion(c,{x:x+dx,z:z+dz,width:1,depth:1,pixelsPerTile:64},tile);ctx.drawImage(tile,dx*64,dz*64);}
   const a=whole.getContext('2d').getImageData(0,0,512,512).data,b=ctx.getImageData(0,0,512,512).data;let changed=0,max=0,total=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;max=Math.max(d,max);total+=d;}
   const result={origin:[x,z],png:whole.toDataURL(),changedChannels:changed,maxDifference:max,meanDifference:total/a.length};whole.width=joined.width=tile.width=1;return result;
  });
  const bytes=Buffer.from(result.png.split(',')[1],'base64'),file=family+'-joined-tiles.png';fs.writeFileSync(path.join(assets,file),bytes);delete result.png;report.pixelJoins.push({family,...result});
  assert(result.meanDifference<.15,'Visible seam in independently painted tiles: '+JSON.stringify(result));
  manifest.assets.push({family,file,sha256:sha(bytes),origin:result.origin,tiles:Array.from({length:64},(_,i)=>({column:i%8,row:Math.floor(i/8),world:[result.origin[0]+i%8,result.origin[1]+Math.floor(i/8)],rect:[i%8*64,Math.floor(i/8)*64,64,64]}))});
  await page.evaluate(async()=>{biomeTerrainStudy.set({frame:'corridor',view:'three',grid:false});await biomeTerrainStudy.terrain.groundSkin.whenReady();biomeTerrainStudy.render();});await page.screenshot({path:path.join(output,family+'-corridor.png')});
 }
 report.lifecycle=await page.evaluate(async()=>{
  const s=biomeTerrainStudy,T=await import('./vendor/three.module.js'),{createConnectedGroundSkin}=await import('./biome-connected-ground.js');
  const skin=createConnectedGroundSkin(s.plan,'temperate'),chunks=s.terrain.chunks.map(c=>({x:c.x,z:c.z,index:c.index,dense:true,inView:true,distance:0})),materials=[],events=[],tracked=new Set(),images=[];
  for(const c of chunks){const m=new T.MeshBasicMaterial();materials.push(m);skin.attach(m,c);}
  const remember=()=>{for(const t of [skin.overview,...[...skin.pages.values()].map(p=>p.texture)])if(!tracked.has(t)){tracked.add(t);t.addEventListener('dispose',()=>events.push(t.uuid));images.push(t.image);}};
  async function move(x,z,ppu=40){for(const c of chunks)c.distance=Math.hypot(Math.max(c.x-.5-x,0,x-(c.x+23.5)),Math.max(c.z-.5-z,0,z-(c.z+23.5)));const start=performance.now();skin.update(chunks,{x,z},ppu);const updateMs=performance.now()-start;await skin.whenReady();remember();return updateMs;}
  await move(36,36);const before=skin.stats;await move(36,36);const warm=skin.stats;
  await move(60,36);const stepped=skin.stats;await move(36,36);const revisited=skin.stats;let changed=0,peakBytes=0;const pan=[];
  for(const [x,z]of [[144,144],[210,210],[84,120],[36,210]]){pan.push(await move(x,z));changed=Math.max(changed,skin.pages.size);peakBytes=Math.max(peakBytes,skin.stats.textureBytes);}
  const peak=skin.stats;await move(36,210,1);const after=skin.stats;
  // Cancel an in-flight page, resolve pending waiters, terminate its worker and
  // close all retained bitmaps exactly once. No delayed result may repopulate it.
  for(const c of chunks)c.distance=Math.hypot(c.x,c.z);skin.update(chunks,{x:0,z:0},40);const cancelled=skin.whenReady();skin.dispose();skin.dispose();const cancelResult=await cancelled,disposed=skin.stats;
  const liveBitmaps=images.filter(i=>typeof i.close==='function'&&i.width!==0).length;materials.forEach(m=>m.dispose());
  return {before,warm,stepped,revisited,peak,after,disposed,cancelResult,liveBitmaps,panUpdateMs:pan,maxPages:changed,peakBytes,duplicateDispose:events.length-new Set(events).size,events:events.length};
 });
 assert.equal(report.lifecycle.before.generations,report.lifecycle.warm.generations,'Warm redraw repainted pages');assert.equal(report.lifecycle.stepped.generations,report.lifecycle.revisited.generations,'A nearby revisit missed the cache');assert.equal(report.lifecycle.maxPages,16);assert.equal(report.lifecycle.after.activePages,0);assert.equal(report.lifecycle.disposed.textureBytes,0);assert.equal(report.lifecycle.disposed.residentPages,0);assert.equal(report.lifecycle.disposed.workerTerminated,true);assert.equal(report.lifecycle.liveBitmaps,0);assert.equal(report.lifecycle.cancelResult,false);assert.equal(report.lifecycle.duplicateDispose,0);
 await page.evaluate(()=>biomeTerrainStudy.set({biome:'temperate',frame:'ground',grid:true}));await page.setViewportSize({width:430,height:900});await page.screenshot({path:path.join(output,'mobile.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.evaluate(()=>biomeTerrainStudy.dispose());await page.close();assert.deepEqual(errors,[]);report.errors=errors;
 const sources=['biome-ground-composition.js','biome-connected-ground.js','biome-ground-worker.js','biome-ground-sprites.js'];manifest.sourceHashes=Object.fromEntries(sources.map(file=>[file,sha(fs.readFileSync(path.join(root,'dist/tactics',file),'utf8').replaceAll('\r\n','\n'))]));fs.writeFileSync(path.join(assets,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({biomes:report.biomes.length,pixelJoins:report.pixelJoins,lifecycle:report.lifecycle,errors},null,2));
}finally{await owner.closeReview();}
