import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {launchSiteReview} from '../../../tools/site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=import.meta.dirname,root=path.resolve(out,'../../..'),results={time:new Date().toISOString(),errors:[],requests:[],captures:[],hashes:{}};
for(const name of ['biome-terrain.js','biome-terrain-plan.js','biome-terrain-study.js','biome-terrain-study.html','biome-obstacles.js','biome-obstacle-data.js','biome-obstacle-paint.js'])results.hashes[name]=createHash('sha256').update(fs.readFileSync(path.join(root,'dist/tactics',name))).digest('hex');
const name='independent-terrain-'+Date.now(),owner=await launchSiteReview(chromium,name,'biome-obstacles-review');results.helperName=name;
try{
 const page=await owner.browser.newPage({viewport:{width:1560,height:1080}});page.on('pageerror',e=>results.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')results.errors.push(m.text());});page.on('requestfailed',r=>results.requests.push(r.url()));
 const start=performance.now();await page.goto('http://127.0.0.1:4476/tactics/biome-terrain-study.html');await page.waitForFunction(()=>window.biomeTerrainReady||window.biomeTerrainDisposed,null,{timeout:60000});assert.ok(await page.evaluate(()=>biomeTerrainReady));results.loadMs=performance.now()-start;
 async function shot(name,options){const start=performance.now(),state=await page.evaluate(o=>biomeTerrainStudy.set(o),options);await page.screenshot({path:path.join(out,name+'.png')});results.captures.push({name,ms:performance.now()-start,state});console.log(name+' '+state.render.triangles+' triangles '+state.render.calls+' calls');}
 for(const biome of ['temperate','jungle','snow','dry','wetlands']){
  await shot(biome+'-map',{biome,frame:'overview',view:'three',trees:true,grey:false,blocked:false});
  await shot(biome+'-top',{view:'top'});
  await shot(biome+'-corridor',{frame:'corridor',view:'three'});
 }
 await shot('bog-low',{biome:'wetlands',frame:'cliff',view:'low'});
 await shot('bog-mask',{frame:'corridor',view:'top',trees:false,blocked:true});
 await shot('temperate-cliff',{biome:'temperate',frame:'cliff',view:'three',trees:true,blocked:false});
 await shot('jungle-clearing',{biome:'jungle',frame:'clearing',view:'three'});
 await shot('jungle-grey',{grey:true,frame:'corridor',view:'low'});
 await shot('temperate-mask',{biome:'temperate',frame:'overview',view:'top',grey:false,blocked:true,trees:false});
 results.plan=await page.evaluate(()=>{
  const s=biomeTerrainStudy,p=s.plan,counts={},heightCounts={},components=[],seen=new Uint8Array(p.blocked.length);let lowLevelCells=0;
  for(const h of p.heights)heightCounts[h]=(heightCounts[h]||0)+1;
  for(let z=0;z<p.depth;z++)for(let x=0;x<p.width;x++){const n=z*p.width+x;if(p.blocked[n]||seen[n])continue;let queue=[n],i=0;seen[n]=1;while(i<queue.length){const at=queue[i++],cx=at%p.width,cz=Math.floor(at/p.width);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=cx+dx,zz=cz+dz,nn=zz*p.width+xx;if(xx<0||zz<0||xx>=p.width||zz>=p.depth||seen[nn]||p.blocked[nn])continue;seen[nn]=1;queue.push(nn);}}components.push({size:queue.length,start:[x,z]});}
  components.sort((a,b)=>b.size-a.size);const focus=Object.fromEntries(Object.entries(p.focus).map(([k,a])=>[k,{position:a,blocked:p.blockedAt(a[0],a[2]),height:p.heightAt(a[0],a[2])}]));return {heightCounts,blocked:p.cells.length,clear:p.width*p.depth-p.cells.length,clearComponentsIgnoringHeight:components,focus,source:p.source};
 });
 results.resources=await page.evaluate(()=>{const states=[];for(let loop=0;loop<2;loop++){for(const biome of ['temperate','jungle','snow','dry','wetlands']){biomeTerrainStudy.set({biome,frame:'cliff',view:'three',blocked:false,trees:true});biomeTerrainStudy.set({frame:'corridor'});biomeTerrainStudy.set({frame:'clearing'});}biomeTerrainStudy.set({biome:'temperate',frame:'overview'});states.push({...biomeTerrainState.resources,live:biomeTerrainStudy.obstacleFactory.liveCount});}return states;});assert.deepEqual(results.resources[0],results.resources[1]);
 await page.locator('#frame').selectOption('corridor');await page.locator('#blocked').check();await page.locator('#blocked').uncheck();await page.locator('#trees').uncheck();await page.locator('#trees').check();
 const box=await page.locator('#scene canvas').boundingBox();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.58,{steps:5});await page.mouse.up();await page.screenshot({path:path.join(out,'orbit.png')});await page.locator('#reset').click();
 await page.setViewportSize({width:390,height:844});await shot('mobile-map',{frame:'overview',view:'three'});results.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(results.mobileOverflow,false);
 results.disposal=await page.evaluate(()=>{
  const s=biomeTerrainStudy,tracked=new Map();function watch(o,label){if(!o||tracked.has(o.uuid))return;const entry={label,count:0};tracked.set(o.uuid,entry);o.addEventListener('dispose',()=>entry.count++);}
  for(const [key,texture]of Object.entries(s.textures))watch(texture,'input:'+key);for(const [key,g]of Object.entries(s.plantFactory.geometries))watch(g,'plantFactory:'+key);for(const [key,g]of Object.entries(s.obstacleFactory.geometries))watch(g,'obstacleFactory:'+key);
  for(const collection of [s.plantMaterials,s.obstacleMaterials,s.grounds])for(const [key,m]of Object.entries(collection))watch(m,'material:'+key);
  s.scene.traverse(o=>{if(o.isMesh){watch(o.geometry,'geometry:'+o.name);for(const m of Array.isArray(o.material)?o.material:[o.material])watch(m,'sceneMaterial:'+m.name);if(o.isInstancedMesh)watch(o,'instance:'+o.name);}if(o.isLineSegments){watch(o.geometry,'lineGeometry');watch(o.material,'lineMaterial');}if(o.isDirectionalLight)watch(o.shadow.map,'sunShadow');});
  s.dispose();s.dispose();return {tracked:[...tracked.values()],live:s.obstacleFactory.liveCount,ready:biomeTerrainReady,disposed:biomeTerrainDisposed,canvases:document.querySelectorAll('#scene canvas').length};
 });for(const r of results.disposal.tracked)assert.equal(r.count,1,r.label+' dispose count');assert.equal(results.disposal.live,0);assert.equal(results.disposal.canvases,0);
 assert.deepEqual(results.errors,[]);assert.deepEqual(results.requests,[]);await page.close();
}finally{await owner.closeReview();fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify({captures:results.captures.length,errors:results.errors,loadMs:results.loadMs,resources:results.resources,disposed:results.disposal.tracked.length,plan:results.plan,helper:name}));
