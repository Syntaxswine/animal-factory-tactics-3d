import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve(process.env.GROUND_SPRITE_REVIEW_OUTPUT||'artifacts/biome-ground-sprites');fs.mkdirSync(output,{recursive:true});
const owner=await launchSiteReview(chromium,'ground-paint-'+Date.now(),'biome-ground-sprites'),errors=[],captures=[],checks={};
try{
 const page=await owner.browser.newPage({viewport:{width:1480,height:1040},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.BIOME_TERRAIN_URL||'http://127.0.0.1:4476/tactics/biome-terrain-study.html?frame=ground');await page.waitForFunction(()=>window.biomeTerrainReady||window.biomeTerrainDisposed,{timeout:60000});if(!await page.evaluate(()=>biomeTerrainReady))throw Error(await page.locator('#error').textContent());
 for(const biome of ['temperate','jungle','snow','dry','wetlands']){
  const state=await page.evaluate(biome=>biomeTerrainStudy.set({biome,frame:'ground',view:'three',paint:true,seed:173}),biome);
  await page.screenshot({path:path.join(output,biome+'-ground.png')});captures.push({name:biome+'-ground',state});
  const atlas=await page.evaluate(()=>biomeTerrainStudy.terrain.groundSkin.canvas.toDataURL());fs.writeFileSync(path.join(output,biome+'-sprites.png'),Buffer.from(atlas.split(',')[1],'base64'));
 }
 for(const [name,options]of [['temperate-top',{biome:'temperate',view:'top'}],['temperate-before',{paint:false}],['temperate-corridor',{frame:'corridor',view:'three',paint:true}],['snow-corridor',{biome:'snow'}],['wetland-corridor',{biome:'wetlands'}]]){
  const state=await page.evaluate(o=>biomeTerrainStudy.set(o),options);await page.screenshot({path:path.join(output,name+'.png')});captures.push({name,state});
 }
 checks.paint=await page.evaluate(async()=>{
  const s=biomeTerrainStudy,hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
  s.set({biome:'temperate',frame:'ground',view:'top',paint:true,seed:173});const a=await hash(s.terrain.groundSkin.canvas.toDataURL()),count=biomeTerrainState.render.triangles,focus=biomeTerrainState.focus.slice();
  s.render();const on=await hash(s.renderer.domElement.toDataURL());s.set({paint:false});s.render();const off=await hash(s.renderer.domElement.toDataURL());if(on===off||count!==biomeTerrainState.render.triangles)throw Error('Paint toggle must change pixels without changing triangles');
  s.set({seed:829,paint:true});const b=await hash(s.terrain.groundSkin.canvas.toDataURL());s.set({seed:173});const restored=await hash(s.terrain.groundSkin.canvas.toDataURL());if(a===b||a!==restored)throw Error('Seeded paint replay failed');
  s.set({grey:true});if(JSON.stringify(focus)!==JSON.stringify(biomeTerrainState.focus))throw Error('Grey forms moved the ground inspection camera');s.set({grey:false});
  const canvas=s.terrain.groundSkin.canvas,rgba=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let gutterPixels=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(x%256<8||x%256>=248||y%256<8||y%256>=248){gutterPixels++;if(rgba[(y*canvas.width+x)*4+3])throw Error('Paint touches an atlas gutter');}
  const counters=s.terrain.groundSkin.textures.map(t=>{const record={name:t.name,count:0};t.addEventListener('dispose',()=>record.count++);return record;});s.set({seed:829});if(counters.some(c=>c.count!==1))throw Error('Replaced sprite textures were not disposed exactly once');
  const memory=[];for(let loop=0;loop<2;loop++){for(const seed of [173,829,1409])s.set({seed});s.set({seed:173});memory.push({...s.renderer.info.memory});}if(JSON.stringify(memory[0])!==JSON.stringify(memory[1]))throw Error('Resources grew on seed replay');
  if(s.renderer.getContext().getError())throw Error('Unexpected WebGL error');return {deterministic:true,paintChangesPixels:true,addedTriangles:0,gutterPixels,disposal:counters,memory,paintBytes:s.terrain.groundSkin.stats.textureBytes};
 });
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>biomeTerrainStudy.set({frame:'corridor',view:'three'}));await page.screenshot({path:path.join(output,'mobile.png')});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile horizontal overflow');checks.mobile=true;
 fs.writeFileSync(path.join(output,'review.json'),JSON.stringify({captures,checks,errors},null,2));if(errors.length)throw Error(errors.join('\n'));
 await page.evaluate(()=>biomeTerrainStudy.dispose());await page.close();console.log(JSON.stringify({captures:captures.length,output,errors}));
}finally{await owner.closeReview();}
