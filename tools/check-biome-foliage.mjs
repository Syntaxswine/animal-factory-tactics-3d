import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve(import.meta.dirname,'../hybrid-review/biome-foliage');fs.mkdirSync(output,{recursive:true});
const owner=await launchSiteReview(chromium,'biome-review-'+Date.now(),'biome-foliage');
const base=process.env.BIOME_REVIEW_URL||'http://127.0.0.1:4476/tactics/biome-foliage-study.html';
try{
 const page=await owner.browser.newPage({viewport:{width:1500,height:1080}}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>requests.push(r.url()));
 await page.goto(base);await page.waitForFunction(()=>window.biomeReady||window.biomeDisposed,{timeout:60000});if(!await page.evaluate(()=>window.biomeReady))throw Error(await page.locator('#error').textContent());
 const captures=[];async function shot(name,options){const state=await page.evaluate(o=>biomeStudy.set(o),options);await page.screenshot({path:path.join(output,name+'.png')});captures.push({name,state});}
 await shot('all-families',{biome:'all'});
 for(const biome of ['jungle','temperate','snow','dry','wetlands'])await shot(biome,{biome,scale:'125'});
 await shot('mature',{biome:'jungle',growth:'mature'});await shot('grey-families',{biome:'all',growth:'normal',grey:true});
 await shot('ground-patterns',{display:'ground',biome:'all',grey:false,view:'top',grid:true});
 // Exercise the actual controls as well as the review API.
 await page.locator('#display').selectOption('plants');await page.locator('#biome').selectOption('wetlands');await page.locator('#variant').selectOption('2');await page.locator('#view').selectOption('front');await page.locator('#grey').check();await page.locator('#grey').uncheck();
 const sweep=await page.evaluate(()=>{const s=biomeStudy,states=[];for(let loop=0;loop<2;loop++){for(const growth of ['normal','mature'])for(const variant of [0,1,2])for(const grey of [false,true])s.set({biome:'all',display:'plants',growth,variant,grey});for(const biome of ['jungle','temperate','snow','dry','wetlands'])s.set({biome,display:'ground'});s.set({biome:'all',display:'plants',growth:'normal',variant:0,grey:false});states.push({...biomeState.resources});}return states;});
 if(JSON.stringify(sweep[0])!==JSON.stringify(sweep[1]))throw Error('Resources grew after warm-up: '+JSON.stringify(sweep));
 await page.setViewportSize({width:390,height:844});await shot('mobile',{biome:'snow',display:'plants',view:'three',scale:'fit',grid:false});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile horizontal overflow');
 const disposal=await page.evaluate(()=>{
  const s=biomeStudy,counts={},watch=(key,resource)=>{if(!resource)return;counts[key]=0;resource.addEventListener('dispose',()=>counts[key]++);};
  for(const [key,t]of Object.entries(s.textures))watch('texture:'+key,t);
  for(const [key,m]of Object.entries(s.materials))watch('material:'+key,m);
  for(const [key,m]of Object.entries(s.groundMaterials))watch('ground:'+key,m);
  for(const [key,g]of Object.entries(s.factory.geometries))watch('geometry:'+key,g);
  const sun=s.scene.children.find(o=>o.isDirectionalLight);watch('shadow',sun.shadow.map);watch('shadowPass',sun.shadow.mapPass);
  s.dispose();s.dispose();return counts;
 });
 if(!await page.evaluate(()=>biomeDisposed&&!biomeReady))throw Error('Dispose failed');
 if(!disposal.shadow||Object.values(disposal).some(n=>n!==1))throw Error('Resources were not released exactly once: '+JSON.stringify(disposal));await page.close();
 const failed=await owner.browser.newPage();await failed.route('**/biome-foliage/foliage-atlas-v1.png',r=>r.abort());await failed.goto(base);await failed.waitForFunction(()=>window.biomeDisposed,{timeout:60000});if(!await failed.locator('#error').textContent())throw Error('Missing texture did not report failure');await failed.close();
 const report={errors,requests,captures,sweep,disposal,controls:true,failedLoadCleanup:true,disposed:true};fs.writeFileSync(path.join(output,'browser-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({errors,failedRequests:requests.length,captures:captures.length,sweep,disposedResources:Object.keys(disposal).length,controls:true,failedLoadCleanup:true}));if(errors.length||requests.length)throw Error('Browser diagnostics');
}finally{await owner.closeReview();}
