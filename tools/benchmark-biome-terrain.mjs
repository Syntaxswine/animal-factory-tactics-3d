// Measures warmed rendering, not the first shader-compilation frame. The battle
// portion injects a disposable visual load into the real battle render loop;
// it deliberately does not register terrain, change collision, or save a map.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve(process.env.BIOME_BENCHMARK_OUTPUT||'artifacts/biome-refinement/performance');fs.mkdirSync(out,{recursive:true});
const base=process.env.BIOME_TERRAIN_URL||'http://127.0.0.1:4476/tactics/biome-terrain-study.html',owner=await launchSiteReview(chromium,'performance-'+Date.now(),'biome-refinement');
const results={scope:'Warmed study and real battle render-loop visual stress test; no gameplay integration or movement/collision validation.',viewport:{width:1500,height:1080},study:[],battle:[],errors:[]};
try{
 const page=await owner.browser.newPage({viewport:results.viewport});page.on('pageerror',e=>results.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')results.errors.push(m.text());});await page.goto(base);await page.waitForFunction(()=>window.biomeTerrainReady,null,{timeout:60000});
 results.adapter=await page.evaluate(()=>{const gl=biomeTerrainStudy.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),devicePixelRatio,canvasPixelRatio:biomeTerrainStudy.renderer.getPixelRatio()};});
 for(const biome of ['temperate','jungle','snow','dry','wetlands'])for(const frame of ['overview','corridor']){
  await page.evaluate(async o=>{biomeTerrainStudy.set(o);await biomeTerrainStudy.terrain.groundSkin.whenReady();},{biome,frame,trees:true,grey:false,view:'three'});
  const result=await page.evaluate(async()=>{
   const s=biomeTerrainStudy,gl=s.renderer.getContext(),samples=[],stats=[];
   for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);const start=performance.now();s.render();gl.finish();if(i>=20){samples.push(performance.now()-start);stats.push({...s.renderer.info.render});}}
   samples.sort((a,b)=>a-b);return {biome:biomeTerrainState.biome,frame:biomeTerrainState.frame,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],samples:samples.length,triangles:Math.max(...stats.map(s=>s.triangles)),calls:Math.max(...stats.map(s=>s.calls)),stats:biomeTerrainState.stats};
  });results.study.push(result);console.log(JSON.stringify({kind:'study',...result}));
 }
 await page.evaluate(()=>biomeTerrainStudy.dispose());await page.close();
 const battle=await owner.browser.newPage({viewport:results.viewport});battle.on('pageerror',e=>results.errors.push(e.message));battle.on('console',m=>{if(m.type()==='error')results.errors.push(m.text());});await battle.goto(base.replace('biome-terrain-study.html','battle-3d.html?study=grenades'));await battle.waitForFunction(()=>window.battle3d?.renderer?.models?.size>=4,null,{timeout:90000});
 await battle.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{BIOME_TEXTURES}=await import('./biome-foliage-data.js'),{OBSTACLE_ATLAS}=await import('./biome-obstacle-data.js'),{configureBiomeTexture,createBiomeMaterials,createBiomeGround}=await import('./biome-foliage-paint.js'),{createBiomePlantFactory}=await import('./biome-foliage-models.js'),{createBiomeObstacleMaterials}=await import('./biome-obstacle-paint.js'),{tutorialFoliagePlan}=await import('./biome-terrain-plan.js'),{createBiomeTerrain}=await import('./biome-terrain.js');
  const r=battle3d.renderer,raw=r.renderer,loader=new T.TextureLoader(),textures={};for(const [key,url]of Object.entries({...BIOME_TEXTURES,obstacles:OBSTACLE_ATLAS}))textures[key]=configureBiomeTexture(await loader.loadAsync(url));
  const plantMaterials=createBiomeMaterials(textures),obstacleMaterials=createBiomeObstacleMaterials(textures.obstacles),plantFactory=createBiomePlantFactory(plantMaterials),plan=tutorialFoliagePlan(await (await fetch('./sector-library/tutorial-step-1/rough-plateau.json')).json()),grounds={},focus=new T.Vector3(battle3d.state.units[0].x,0,battle3d.state.units[0].y),sourceFocus=new T.Vector3(...plan.focus.corridor);let terrain=null,samples=[],measuring=false,last=0;
  const draw=r.draw.bind(r),render=raw.render.bind(raw);raw.info.autoReset=false;
  raw.render=function(scene,camera){terrain?.update(camera,{focus,ppu:28*Math.SQRT2*battle3d.view.zoom});return render(scene,camera);};
  r.draw=function(...args){const begin=performance.now();raw.info.reset();const result=draw(...args);raw.getContext().finish();const end=performance.now();if(measuring){samples.push({ms:end-begin,interval:last?end-last:null,triangles:raw.info.render.triangles,calls:raw.info.render.calls});}last=end;return result;};
  window.biomeBattleBenchmark={set(biome){terrain?.dispose();terrain=null;if(biome){grounds[biome]??=createBiomeGround(textures.ground,biome);terrain=createBiomeTerrain(plan,biome,{ground:grounds[biome],cliff:plantMaterials.grey,plantMaterials,obstacleMaterials,plantFactory});terrain.root.position.copy(focus).sub(sourceFocus);terrain.root.position.y+=.004;/* Keep the blended ground layer in the stress load, just above the battle floor to avoid z-fighting. */r.scene.add(terrain.root);}return true;},async measure(){measuring=false;await terrain?.groundSkin.whenReady();for(let i=0;i<35;i++)await new Promise(requestAnimationFrame);samples=[];last=0;measuring=true;while(samples.length<120)await new Promise(requestAnimationFrame);measuring=false;const ms=samples.map(s=>s.ms).sort((a,b)=>a-b),intervals=samples.map(s=>s.interval).filter(Number.isFinite).sort((a,b)=>a-b);return {samples:samples.length,medianDrawMs:ms[Math.floor(ms.length*.5)],p95DrawMs:ms[Math.floor(ms.length*.95)],medianFrameIntervalMs:intervals[Math.floor(intervals.length*.5)],p95FrameIntervalMs:intervals[Math.floor(intervals.length*.95)],triangles:Math.max(...samples.map(s=>s.triangles)),calls:Math.max(...samples.map(s=>s.calls)),visibleChunks:terrain?.stats.visibleChunks??0,diagnostics:r.diagnostics,liveActors:r.models.size,devicePixelRatio:raw.getPixelRatio(),shadows:raw.shadowMap.enabled};},dispose(){measuring=false;r.draw=draw;raw.render=render;terrain?.dispose();plantFactory.dispose();for(const set of [grounds,plantMaterials,obstacleMaterials,textures])Object.values(set).forEach(o=>o.dispose());raw.info.autoReset=true;}};
 });
 for(const biome of [null,'temperate','jungle','snow','dry','wetlands']){await battle.evaluate(b=>biomeBattleBenchmark.set(b),biome);const result=await battle.evaluate(()=>biomeBattleBenchmark.measure());results.battle.push({biome:biome||'baseline',...result});console.log(JSON.stringify({kind:'battle',biome:biome||'baseline',...result}));if(biome==='snow')await battle.screenshot({path:path.join(out,'snow-battle-stress.png')});}
 await battle.evaluate(()=>biomeBattleBenchmark.dispose());await battle.close();
 fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(results,null,2));if(results.errors.length)throw Error(results.errors.join('\n'));
}finally{await owner.closeReview();}
