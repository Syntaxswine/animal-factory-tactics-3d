import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {launchSiteReview} from '../../../tools/site-review-browser.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=import.meta.dirname;
const files=['biome-ground-sprite-layout.js','biome-ground-sprites.js','biome-terrain.js','biome-terrain-study.js'];
const report={date:new Date().toISOString(),hashes:Object.fromEntries(files.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync('dist/tactics/'+n)).digest('hex')])),errors:[],requests:[],captures:[],controls:{}};
const helper='independent-ground-sprites-'+Date.now();report.helper=helper;
const owner=await launchSiteReview(chromium,helper,'biome-ground-sprites');
try {
 const page=await owner.browser.newPage({viewport:{width:1500,height:1080},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
 page.on('requestfailed',r=>report.requests.push({url:r.url(),error:r.failure()?.errorText}));
 await page.goto('http://127.0.0.1:4476/tactics/biome-terrain-study.html?frame=ground&biome=temperate');
 await page.waitForFunction(()=>window.biomeTerrainReady||window.biomeTerrainDisposed,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>biomeTerrainReady),true);
 const capture=async(name,options)=>{const state=await page.evaluate(o=>biomeTerrainStudy.set(o),options);await page.screenshot({path:path.join(output,name+'.png')});report.captures.push({name,state});};
 for(const biome of ['temperate','jungle','snow','dry','wetlands']){
  await capture(biome+'-ground',{biome,frame:'ground',view:'three',paint:true,seed:173,grey:false});
  await capture(biome+'-top',{view:'top'});
 }
 await capture('temperate-low',{biome:'temperate',view:'low'});
 await capture('temperate-route',{frame:'corridor',view:'three'});
 await capture('snow-route',{biome:'snow'});
 await capture('wetlands-route',{biome:'wetlands'});
 await capture('wetlands-map',{frame:'overview'});
 await capture('temperate-before',{biome:'temperate',frame:'ground',view:'top',paint:false});
 await capture('temperate-after',{paint:true});
 await capture('temperate-pattern-b',{seed:829});
 await capture('temperate-pattern-c',{seed:1409});
 report.controls = await page.evaluate(async()=>{
  const S=biomeTerrainStudy;
  const checksum=()=>{const data=S.terrain.groundSkin.canvas.getContext('2d').getImageData(0,0,2048,1024).data;let h=2166136261;for(const n of data)h=Math.imul(h^n,16777619);return h>>>0};
  S.set({biome:'temperate',seed:173,paint:true});const a=checksum(),geo=S.terrain.stats.storedTriangles,focus=biomeTerrainState.focus;
  S.set({paint:false});const disabled={geometries:S.terrain.stats.storedTriangles,focus:biomeTerrainState.focus};
  S.set({seed:829});const b=checksum();S.set({seed:173,paint:true});const restored=checksum();
  const groundSkin=S.terrain.groundSkin;
  return {a,b,restored,geometrySame:geo===disabled.geometries,focusSame:JSON.stringify(focus)===JSON.stringify(disabled.focus),textureKinds:groundSkin.textures.map(t=>({name:t.name,width:t.image.width,height:t.image.height})),stats:groundSkin.stats};
 });
 assert.equal(report.controls.a,report.controls.restored);assert.notEqual(report.controls.a,report.controls.b);assert(report.controls.geometrySame&&report.controls.focusSame);
 report.memories=[];
 for(let sweep=0;sweep<2;sweep++){
  for(const biome of ['temperate','jungle','snow','dry','wetlands'])await page.evaluate(b=>biomeTerrainStudy.set({biome:b,frame:'corridor',seed:173,paint:true,view:'three'}),biome);
  report.memories.push(await page.evaluate(()=>({...biomeTerrainStudy.renderer.info.memory})));
 }
 await page.setViewportSize({width:390,height:844});await capture('mobile-ground',{biome:'temperate',frame:'ground',view:'three'});
 report.mobile=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth}));
 report.disposal=await page.evaluate(()=>{
  const S=biomeTerrainStudy,resources=S.terrain.groundSkin.textures.map(t=>({name:t.name,count:0,t}));
  for(const r of resources)r.t.addEventListener('dispose',()=>r.count++);
  const canvas=S.terrain.groundSkin.canvas;S.dispose();S.dispose();
  return {textures:resources.map(({name,count})=>({name,count})),atlasAfter:[canvas.width,canvas.height],canvasRemaining:document.querySelectorAll('#scene canvas').length,disposed:window.biomeTerrainDisposed};
 });
 assert(report.disposal.textures.every(t=>t.count===1));assert.deepEqual(report.disposal.atlasAfter,[1,1]);assert.equal(report.disposal.canvasRemaining,0);assert.deepEqual(report.errors,[]);
} finally {
 await owner.closeReview();fs.writeFileSync(path.join(output,'review.json'),JSON.stringify(report,null,2));
}
console.log(JSON.stringify({output,helper,captures:report.captures.length,controls:report.controls,memories:report.memories,disposal:report.disposal,errors:report.errors,requests:report.requests}));
