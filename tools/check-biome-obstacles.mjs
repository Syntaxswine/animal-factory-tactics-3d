import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve(import.meta.dirname,'../hybrid-review/biome-obstacles');fs.mkdirSync(output,{recursive:true});
const base=process.env.BIOME_TERRAIN_URL||'http://127.0.0.1:4476/tactics/biome-terrain-study.html';
const owner=await launchSiteReview(chromium,'region-check-'+Date.now(),'biome-obstacles');
try{
 const page=await owner.browser.newPage({viewport:{width:1500,height:1080}}),errors=[],requests=[],captures=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>requests.push(r.url()));
 await page.goto(base);await page.waitForFunction(()=>window.biomeTerrainReady||window.biomeTerrainDisposed,{timeout:60000});if(!await page.evaluate(()=>window.biomeTerrainReady))throw Error(await page.locator('#error').textContent());
 async function shot(name,options){const state=await page.evaluate(o=>biomeTerrainStudy.set(o),options);await page.screenshot({path:path.join(output,name+'.png')});captures.push({name,state});}
 for(const biome of ['jungle','temperate','snow','dry','wetlands']){await shot(biome+'-map',{biome,frame:'overview',view:'three',grey:false,blocked:false,trees:true});await shot(biome+'-route',{frame:'corridor'});}
 await shot('cliff-route',{biome:'temperate',frame:'cliff'});await shot('clearing',{frame:'clearing'});await shot('blocked-map',{frame:'overview',blocked:true,view:'top'});await shot('grey-route',{frame:'corridor',grey:true,blocked:false,view:'three'});await shot('bog-no-trees',{biome:'wetlands',frame:'corridor',grey:false,trees:false});
 const memories=[];for(let loop=0;loop<2;loop++){for(const biome of ['jungle','temperate','snow','dry','wetlands'])for(const frame of ['overview','corridor','cliff'])await page.evaluate(o=>biomeTerrainStudy.set(o),{biome,frame,grey:loop===0,trees:true});await page.evaluate(()=>biomeTerrainStudy.set({biome:'temperate',grey:false,frame:'corridor'}));memories.push(await page.evaluate(()=>biomeTerrainState.resources));}
 // A complete repeat after shader/geometry warm-up must not retain old regions.
 if(JSON.stringify(memories[0])!==JSON.stringify(memories[1]))throw Error('Resources grew between landscape sweeps: '+JSON.stringify(memories));
 await page.locator('#biome').selectOption('wetlands');await page.locator('#frame').selectOption('cliff');await page.locator('#view').selectOption('low');await page.locator('#blocked').check();await page.locator('#blocked').uncheck();await page.locator('#trees').uncheck();await page.locator('#trees').check();await page.locator('#reset').click();
 await page.setViewportSize({width:390,height:844});await shot('mobile',{biome:'temperate',frame:'overview'});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow on mobile');
 const disposal=await page.evaluate(()=>{
  const s=biomeTerrainStudy,items=new Map(),watch=(key,r)=>{if(!r||items.has(r))return;const item={key,count:0};items.set(r,item);r.addEventListener('dispose',()=>item.count++);};
  for(const [key,t]of Object.entries(s.textures))watch('texture:'+key,t);
  for(const key of ['plantMaterials','obstacleMaterials','grounds'])for(const [id,m]of Object.entries(s[key]))watch(key+':'+id,m);
  for(const key of ['plantFactory','obstacleFactory'])for(const [id,g]of Object.entries(s[key].geometries))watch(key+':'+id,g);
  s.scene.traverse(o=>{if(o.geometry)watch('scene-geometry:'+o.geometry.uuid,o.geometry);if(o.material)for(const m of [].concat(o.material))watch('scene-material:'+m.uuid,m);if(o.isInstancedMesh)watch('instance:'+o.uuid,o);if(o.isDirectionalLight){watch('shadow',o.shadow.map);watch('shadow-pass',o.shadow.mapPass);}});
  s.dispose();s.dispose();return [...items.values()];
 });
 if(disposal.some(i=>i.count!==1))throw Error('Disposal ownership mismatch: '+JSON.stringify(disposal.filter(i=>i.count!==1)));if(!await page.evaluate(()=>biomeTerrainDisposed&&!biomeTerrainReady))throw Error('Dispose state failed');await page.close();
 const failed=await owner.browser.newPage();await failed.route('**/biome-obstacles/paint-atlas-v1.png',r=>r.abort());await failed.goto(base);await failed.waitForFunction(()=>window.biomeTerrainDisposed,{timeout:60000});if(!await failed.locator('#error').textContent())throw Error('Failed texture load has no visible error');await failed.close();
 // Also exercise the local-piece viewer and the original normal view's controls.
 const patch=await owner.browser.newPage({viewport:{width:1500,height:1080}});patch.on('pageerror',e=>errors.push(e.message));await patch.goto(base.replace('biome-terrain-study','biome-foliage-study'));await patch.waitForFunction(()=>window.biomeReady||window.biomeDisposed,{timeout:60000});if(!await patch.evaluate(()=>window.biomeReady))throw Error('Patch study startup failed');if(await patch.locator('#patch-controls').isVisible()||await patch.locator('#footprint-controls').isVisible())throw Error('Obstacle controls leaked into plant view');
 await patch.evaluate(()=>biomeStudy.set({display:'barriers',biome:'all',layout:'passage',footprint:true}));await patch.screenshot({path:path.join(output,'close-piece-passages.png')});if(!await patch.locator('#patch-controls').isVisible())throw Error('Obstacle controls missing');await patch.evaluate(()=>biomeStudy.dispose());await patch.close();
 const report={errors,requests,captures,memories,disposal,failedLoadCleanup:true,controls:true,patchControls:true};fs.writeFileSync(path.join(output,'browser-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({errors,requests,captures:captures.length+1,memories,disposedResources:disposal.length,failedLoadCleanup:true}));if(errors.length||requests.length)throw Error('Browser diagnostics');
}finally{await owner.closeReview();}
