import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {foliageDensityFixture,foliageDensityCommands} from '../dist/tactics/foliage-density-fixture.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve(import.meta.dirname,'../artifacts/foliage-skins',process.argv[2]||'density-editor'),origin=process.env.REVIEW_URL||'http://127.0.0.1:4476';fs.mkdirSync(out,{recursive:true});
const server=await chromium.launchServer({channel:'msedge',headless:true});let browser,identity;
const report={method:'Headless Edge, 1500×1000. Ordinary UI drag for the whole rectangle; controller brush commands clear the routes. Live standard-fog battle, four squad models, no gl.finish. RAF is not a guarantee of sustained combat FPS.',checks:[],errors:[]};
try{
const pid=server.process().pid;identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'}));
fs.writeFileSync(path.join(out,'helper.json'),JSON.stringify({identity,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',task:'foliage-density',purpose:'Actual rectangle drag, history, save/reload, packaged Playtest and bounded live redraw samples',startedAt:new Date().toISOString(),end:'Finally closes browser and launch server'},null,2));

 browser=await chromium.connect(server.wsEndpoint());
 for(const prefix of (process.env.REVIEW_PREFIXES||'source,packaged').split(','))for(const [family,growth,density] of [['temperate','woodland',100],['wetlands','thicket',100],...(prefix==='source'?[['wetlands','woodland',65],['wetlands','woodland',100]]:[])]){
  const tag=[prefix,family,growth,density].join('-'),url=origin+(prefix==='packaged'?'/packaged':'');
  if(process.env.REVIEW_ONLY&&process.env.REVIEW_ONLY!==tag)continue;
  const context=await browser.newContext({viewport:{width:1500,height:1000}}),page=await context.newPage();
  const watch=p=>{p.on('pageerror',e=>report.errors.push(tag+': '+e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(tag+': '+m.text());});p.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))report.errors.push(tag+': '+r.status()+' '+r.url());});};watch(page);
  await page.goto(url+'/tactics/editor-3d.html?editing=1&study=foliage-density&family='+family+'&density='+density+'&growth='+growth);
  await page.waitForFunction(()=>window.editor3d&&!editor3d.loading&&editor3d.scene.biomes.ready,null,{timeout:120000});
  const expected=foliageDensityFixture(family,density,growth);
  assert.deepEqual(JSON.parse(await page.evaluate(()=>editor3d.export())).foliage,expected.foliage,'study link must open the same density map');
  await page.evaluate(async map=>{const {saveSettings}=await import('./settings-3d.js');saveSettings({difficulty:'standard',motion:'full'});await editor3d.open(JSON.stringify(map));Object.assign(editor3d.view,{x:119.5,y:119.5,span:160});await editor3d.changed();},foliageDensityFixture(family,density,growth,{painted:false}));
  await page.click('[data-group="foliage"]');await page.selectOption('#foliage-shape','rectangle');await page.selectOption('#foliage-preset',growth==='thicket'?'thicket-v1':'woodland-v1');
  await page.locator('#foliage-density').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},density);
  const points=await page.evaluate(async()=>{
   await new Promise(requestAnimationFrame);const canvas=document.getElementById('scene'),r=canvas.getBoundingClientRect();
   editor3d.scene.draw(editor3d.view,r.width,r.height);
   return [[72,72],[167,167]].map(([x,y])=>{const p=editor3d.scene.projectTile({x,y,z:0},r.width,r.height);return {x:r.left+p.x,y:r.top+p.y};});
  });
  for(const p of points){assert.ok(p.x>0&&p.x<1500);assert.ok(p.y>0&&p.y<1000);}
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:5});await page.mouse.up();
  await page.waitForFunction(()=>!editor3d.loading&&Object.keys(editor3d.document.map.foliage||{}).length>9000,null,{timeout:120000});
  const full=await page.evaluate(()=>editor3d.export());
  assert.equal(Object.keys(JSON.parse(full).foliage).length,growth==='thicket'?9212:9216);
  assert.ok(Object.values(JSON.parse(full).foliage).every(v=>v[0]===density&&v[1]===(growth==='thicket')));
  await page.locator('#undo').click();await page.waitForFunction(()=>!editor3d.loading&&!Object.keys(editor3d.document.map.foliage||{}).length,null,{timeout:120000});
  await page.locator('#redo').click();await page.waitForFunction(()=>!editor3d.loading&&Object.keys(editor3d.document.map.foliage||{}).length>9000,null,{timeout:120000});assert.equal(await page.evaluate(()=>editor3d.export()),full);
  await page.evaluate(async commands=>{for(const command of commands){const r=await editor3d.apply(command);if(!r.ok)throw Error(r.error);}Object.assign(editor3d.view,{x:120,y:124,span:40});await editor3d.changed();},foliageDensityCommands(density,growth).slice(1));
  const saved=await page.evaluate(()=>editor3d.export());assert.deepEqual(JSON.parse(saved).foliage,expected.foliage);assert.deepEqual(await page.evaluate(()=>editor3d.validate()),[]);assert.deepEqual(await page.evaluate(()=>editor3d.scene.diagnostics),[]);
  await page.click('#quick-save-map');await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Saved in this browser'));
  await page.click('#settings-button');await page.click('#load-map');await page.waitForFunction(()=>!editor3d.loading,null,{timeout:120000});await page.click('#close-settings');assert.equal(await page.evaluate(()=>editor3d.export()),saved);
  await page.locator('#scene').screenshot({path:path.join(out,tag+'-editor.jpg'),type:'jpeg',quality:88});
  const popup=page.waitForEvent('popup',{timeout:60000});await page.click('#quick-playtest',{timeout:60000});const battle=await popup;watch(battle);
  await battle.waitForFunction(()=>window.battle3d?.renderer.models.size>=4&&!battle3d.renderer.busy&&battle3d.renderer.biomes.ready&&document.getElementById('sector-loading')?.hidden&&battle3d.renderer.biomes.stats().paint.every(p=>p.pendingPages===0&&!p.error&&p.overviewReady),null,{timeout:120000});await page.close();await battle.bringToFront();
  assert.deepEqual(await battle.evaluate(()=>battle3d.state.foliage),expected.foliage);
  const result=await battle.evaluate(async()=>{
   const r=battle3d.renderer,info=r.renderer.info,draw=r.draw,oldReset=info.autoReset,samples=[];info.autoReset=false;
   r.draw=function(...args){info.reset();const at=performance.now(),result=draw.apply(this,args);samples.push({cpu:performance.now()-at,calls:info.render.calls,triangles:info.render.triangles});return result;};
   try{
    const intervals=[];let last;
    for(let i=0;i<120;i++){const t=await new Promise(requestAnimationFrame);if(i>29)intervals.push(t-last);last=t;}
    const usable=samples.slice(30),stats=a=>{a.sort((a,b)=>a-b);return {median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]};};
    return {samples:usable.length,drawCpuMs:stats(usable.map(v=>v.cpu)),rafIntervalMs:stats(intervals),drawCalls:stats(usable.map(v=>v.calls)),submittedTriangles:stats(usable.map(v=>v.triangles)),units:r.models.size,trees:r.biomes.stats().trees,diagnostics:r.diagnostics,difficulty:battle3d.state.difficulty,seenCells:battle3d.state.seen.size,view:{...battle3d.view}};
   }finally{r.draw=draw;info.autoReset=oldReset;}
  });
  await battle.screenshot({path:path.join(out,tag+'-battle.jpg'),type:'jpeg',quality:88});
  report.checks.push({tag,family,density,growth,uiRectangle:true,undoRedo:true,saveReload:true,ordinaryPlaytest:true,...result});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.checks.at(-1)));
  assert.ok(result.samples>=80);assert.equal(result.units,4);assert.equal(result.difficulty,'standard');assert.deepEqual(result.diagnostics,[]);
  await context.close();
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
}catch(error){report.failure=error.stack;throw error;}
finally{
 try{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 finally{try{await browser?.close();}finally{await server.close();fs.writeFileSync(path.join(out,'helper-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:server.process().exitCode},null,2));}}
}
