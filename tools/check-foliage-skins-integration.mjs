import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve(import.meta.dirname,'../artifacts/foliage-skins/integration'),origin=process.env.REVIEW_URL||'http://127.0.0.1:4476';fs.mkdirSync(out,{recursive:true});
const server=await chromium.launchServer({channel:'msedge',headless:true});let browser;
const pid=server.process().pid,identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'}));
fs.writeFileSync(path.join(out,'helper.json'),JSON.stringify({identity,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',task:'foliage-skins',purpose:'Source and packaged editor-to-playtest validation',startedAt:new Date().toISOString(),end:'Finally closes browser and launch server'},null,2));
const report={checks:[],errors:[]};
try{
 browser=await chromium.connect(server.wsEndpoint());
 for(const prefix of ['', '/packaged']){
  const context=await browser.newContext({viewport:{width:1500,height:1000}}),page=await context.newPage(),tag=prefix?'packaged':'source';
  const watch=p=>{p.on('pageerror',e=>report.errors.push(tag+': '+e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))report.errors.push(tag+': '+r.status()+' '+r.url());});};watch(page);
  await page.goto(origin+prefix+'/tactics/editor-3d.html?editing=1&study=biomes');
  await page.waitForFunction(()=>window.editor3d&&!editor3d.loading&&editor3d.scene.biomes.ready,null,{timeout:120000});
  const saved=await page.evaluate(()=>editor3d.export());assert.ok(JSON.parse(saved).foliage);
  await page.evaluate(async json=>{await editor3d.open(json);Object.assign(editor3d.view,{x:123,y:112,span:43});await editor3d.changed();},saved);
  await page.waitForFunction(()=>!editor3d.loading&&editor3d.scene.biomes.ready);
  assert.equal(await page.evaluate(()=>editor3d.export()),saved);assert.deepEqual(await page.evaluate(()=>editor3d.validate()),[]);
  assert.deepEqual(await page.evaluate(()=>editor3d.scene.diagnostics),[]);
  await page.click('#quick-save-map');await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Saved in this browser'));
  await page.click('#settings-button');await page.click('#load-map');await page.waitForFunction(()=>!editor3d.loading);await page.click('#close-settings');
  assert.equal(await page.evaluate(()=>editor3d.export()),saved);
  await page.locator('#scene').screenshot({path:path.join(out,tag+'-editor.jpg'),type:'jpeg',quality:90});
  const [battle]=await Promise.all([page.waitForEvent('popup',{timeout:60000}),page.click('#quick-playtest',{timeout:60000})]);watch(battle);
  await battle.waitForFunction(()=>window.battle3d?.renderer.models.size>=4&&!battle3d.renderer.busy&&battle3d.renderer.biomes.ready,null,{timeout:120000});
  if(!await battle.evaluate(()=>battle3d.paused))await battle.click('#pause');
  const result=await battle.evaluate(()=>{
   const r=battle3d.renderer,s=battle3d.state,diagnostics=r.diagnostics,stats=r.biomes.stats();
   const materials=new Set();r.biomes.root.traverse(o=>{if(o.isMesh&&o.material.name.startsWith('thicket'))materials.add(o.material.name);});
   return {foliage:s.foliage,diagnostics,stats,materials:[...materials],units:r.models.size};
  });
  assert.deepEqual(result.foliage,JSON.parse(saved).foliage);assert.deepEqual(result.diagnostics,[]);assert.ok(result.materials.some(n=>n==='thicket-fringe:wetlands'));assert.equal(result.stats.regions,7);
  await battle.screenshot({path:path.join(out,tag+'-battle.jpg'),type:'jpeg',quality:90});
  report.checks.push({tag,roundTrip:true,ordinaryPlaytest:true,units:result.units,regions:result.stats.regions,materials:result.materials});console.log(JSON.stringify(report.checks.at(-1)));
  // Real battle redraw samples with its ordinary fog and camera. This is
  // presentation timing, not a synthetic scene or a claim about display FPS.
  const timings=await battle.evaluate(async()=>{const samples=[];for(let i=0;i<90;i++){const at=performance.now();await new Promise(requestAnimationFrame);if(i>20)samples.push(performance.now()-at);}samples.sort((a,b)=>a-b);return {rafMedianMs:samples[Math.floor(samples.length*.5)],rafP95Ms:samples[Math.floor(samples.length*.95)]};});
  Object.assign(report.checks.at(-1),timings);
  await context.close();
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 try{await browser?.close();}finally{await server.close();fs.writeFileSync(path.join(out,'helper-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:server.process().exitCode},null,2));}
}
