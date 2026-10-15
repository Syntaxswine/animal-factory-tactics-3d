import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {foliageBattleFixture} from './foliage-battle-fixture.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'artifacts/foliage-skins',process.argv[2]||'battle-benchmark'),origin=process.env.REVIEW_URL||'http://127.0.0.1:4476';fs.mkdirSync(out,{recursive:true});
const files=['foliage-screen-surface.js','foliage-screen-scene.js','foliage-screen-paint.js','biome-scene.js'],ref=process.env.REVIEW_BASELINE_REF||'50cf262';
const bodies={baseline:{},current:{}};
for(const file of files){
 bodies.baseline[file]=execFileSync('git',['-c','safe.directory='+root,'show',`${ref}:dist/tactics/${file}`],{cwd:root,encoding:'utf8'});
 bodies.current[file]=fs.readFileSync(path.join(root,'dist/tactics',file),'utf8');
}
const hashes=Object.fromEntries(Object.entries(bodies).map(([tag,modules])=>[tag,Object.fromEntries(Object.entries(modules).map(([file,body])=>[file,createHash('sha256').update(body).digest('hex')]))]));
const server=await chromium.launchServer({channel:'msedge',headless:true});let browser;
const pid=server.process().pid,identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'}));
fs.writeFileSync(path.join(out,'helper.json'),JSON.stringify({identity,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',task:'foliage-skins',purpose:'Sequential real battle benchmark of generated wooded sector',startedAt:new Date().toISOString(),end:'Finally closes browser and launch server'},null,2));
const report={baselineRef:ref,sourceHashes:hashes,fixture:'Generated flat 240×240 map using tutorial study foliage regions; not the authored tutorial map.',method:'Ordinary editor save/reload and Playtest; four squad models; standard difficulty fog and unchanged camera. Freeze the three screen art modules plus BiomeScene per run. Measured draw CPU and RAF intervals in headless Edge; not guaranteed display FPS or sustained combat performance. No gl.finish.',checks:[],errors:[]};
try{
 browser=await chromium.connect(server.wsEndpoint());
 for(const family of (process.env.REVIEW_FAMILIES||'temperate,snow').split(',')){
  const map=foliageBattleFixture(family),saved=JSON.stringify(map);fs.writeFileSync(path.join(out,'generated-'+family+'.json'),saved);
  for(const tag of ['baseline','current']){
   const context=await browser.newContext({viewport:{width:1500,height:1000}}),page=await context.newPage(),label=family+'-'+tag;
   for(const file of files)await context.route('**/tactics/'+file,route=>route.fulfill({status:200,contentType:'text/javascript',body:bodies[tag][file]}));
   const watch=p=>{p.on('pageerror',e=>report.errors.push(label+': '+e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))report.errors.push(label+': '+r.status()+' '+r.url());});};watch(page);
   const loadStarted=Date.now();await page.goto(origin+'/tactics/editor-3d.html?editing=1');
   await page.waitForFunction(()=>window.editor3d&&!editor3d.loading,null,{timeout:120000});
   await page.evaluate(async()=>{const {saveSettings}=await import('./settings-3d.js');saveSettings({difficulty:'standard',motion:'full'});});
   await page.evaluate(async json=>{await editor3d.open(json);Object.assign(editor3d.view,{x:101,y:95,span:32});await editor3d.changed();},saved);
   await page.waitForFunction(()=>!editor3d.loading&&editor3d.scene.biomes.ready,null,{timeout:240000});
   assert.deepEqual(await page.evaluate(()=>editor3d.validate()),[]);assert.ok(isDeepStrictEqual(JSON.parse(await page.evaluate(()=>editor3d.export())),map),'Editor import/export changed the benchmark map');
   await page.click('#quick-save-map');await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Saved in this browser'));
   await page.click('#settings-button');await page.click('#load-map');await page.waitForFunction(()=>!editor3d.loading,null,{timeout:240000});await page.click('#close-settings');
   assert.ok(isDeepStrictEqual(JSON.parse(await page.evaluate(()=>editor3d.export())),map),'Save/reload changed the benchmark map');
   console.log(label+': ordinary editor save/reload passed; opening Playtest');
   const popup=page.waitForEvent('popup',{timeout:30000});await page.click('#quick-playtest',{timeout:120000});
   const playtestStatus=await page.locator('#status').textContent();
   const battle=await popup.catch(error=>{throw Error(playtestStatus+'; '+error.message);});watch(battle);
   await battle.waitForFunction(()=>window.battle3d?.renderer.models.size>=4&&!battle3d.renderer.busy&&battle3d.renderer.biomes.ready,null,{timeout:240000});
   // Close the editor only after the ordinary popup has loaded its saved map,
   // so its background scene cannot consume GPU work during the measurement.
   await page.close();await battle.bringToFront();
   assert.deepEqual(await battle.evaluate(()=>battle3d.renderer.diagnostics),[]);
   assert.equal(await battle.evaluate(()=>battle3d.state.difficulty),'standard');
   const loadMs=Date.now()-loadStarted;
   const result=await battle.evaluate(async()=>{
    const r=battle3d.renderer,info=r.renderer.info,draw=r.draw,oldReset=info.autoReset,samples=[];info.autoReset=false;
    r.draw=function(...args){info.reset();const at=performance.now(),out=draw.apply(this,args);samples.push({cpuMs:performance.now()-at,calls:info.render.calls,triangles:info.render.triangles});return out;};
    try{
     const intervals=[];let last;
     for(let i=0;i<150;i++){const t=await new Promise(requestAnimationFrame);if(i>29)intervals.push(t-last);last=t;}
     const usable=samples.slice(30),stats=values=>{const a=[...values].sort((a,b)=>a-b);return {min:a[0],median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
     return {samples:usable.length,drawCpuMs:stats(usable.map(v=>v.cpuMs)),rafIntervalMs:stats(intervals),drawCalls:stats(usable.map(v=>v.calls)),submittedTriangles:stats(usable.map(v=>v.triangles)),units:r.models.size,stats:r.biomes.stats(),diagnostics:r.diagnostics,view:{...battle3d.view},difficulty:battle3d.state.difficulty,seenCells:battle3d.state.seen.size,paused:battle3d.paused,webgl:{renderer:r.renderer.getContext().getParameter(r.renderer.getContext().RENDERER)},textureCount:info.memory.textures};
    }finally{r.draw=draw;info.autoReset=oldReset;}
   });
   assert.ok(result.samples>=100);assert.equal(result.units,4);assert.deepEqual(result.diagnostics,[]);
   await battle.screenshot({path:path.join(out,label+'.jpg'),type:'jpeg',quality:90});
   const entry={family,tag,loadMs,roundTrip:true,ordinaryPlaytest:true,savedFoliageCells:Object.keys(map.foliage).length,blockedFoliageCells:Object.values(map.foliage).filter(v=>v[1]).length,...result};report.checks.push(entry);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(entry));
   await context.close();
  }
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
}catch(error){report.failure=error.stack;throw error;}
finally{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 try{await browser?.close();}finally{await server.close();fs.writeFileSync(path.join(out,'helper-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:server.process().exitCode},null,2));}
}
