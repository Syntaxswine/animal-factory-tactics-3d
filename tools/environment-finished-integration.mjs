import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import fs from 'node:fs';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),browser=await chromium.launch({headless:true,channel:'msedge'});
const map=JSON.parse(fs.readFileSync(new URL('../Factory-test.json',import.meta.url),'utf8')),results=[];
try{
 for(const [name,url]of [['legacy-game','index.html?map=custom'],['hybrid-game','index.html?map=custom&renderer=hybrid'],['legacy-editor','editor.html'],['hybrid-editor','editor.html?renderer=hybrid']]){
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});await page.addInitScript(map=>sessionStorage.setItem('red-shift-playtest',JSON.stringify(map)),map);const start=Date.now();await page.goto('http://127.0.0.1:4329/tactics/'+url,{waitUntil:'networkidle',timeout:60000});
  if(name.includes('editor')){await page.locator('#file').setInputFiles(fileURLToPath(new URL('../Factory-test.json',import.meta.url)));await page.waitForFunction(()=>hybridEditorDiagnostics().map.name==='Factory test');await page.waitForTimeout(1000);}
  await page.waitForFunction(()=>window.hybridGameDiagnostics||window.hybridEditorDiagnostics);const loadMs=Date.now()-start;
  const edits=[];
  // Measure frame gaps during real camera interaction, not an idle editor loop.
  await page.evaluate(()=>{window.activeFrameGaps=[];window.captureFrames=true;let previous=performance.now();const sample=now=>{if(!window.captureFrames)return;activeFrameGaps.push(now-previous);previous=now;requestAnimationFrame(sample);};requestAnimationFrame(sample);});
  const canvas=page.locator(name.includes('editor')?'#editor-map':'#map'),rect=await canvas.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down({button:'right'});
  for(let i=0;i<50;i++){await page.mouse.move(rect.x+rect.width/2+Math.sin(i/8)*70,rect.y+rect.height/2);await page.waitForTimeout(17);}
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.up({button:'right'});
  const active=await page.evaluate(()=>{captureFrames=false;const g=activeFrameGaps.slice(1).sort((a,b)=>a-b);return {median:g[Math.floor(g.length/2)],p95:g[Math.floor(g.length*.95)],max:g.at(-1)};});
  if(name.includes('game')){
   const d=await page.evaluate(()=>hybridGameDiagnostics()),u=d.units[d.selected],target={x:u.x+2,y:u.y+2};
   await page.mouse.click(rect.x+d.camera.x+(target.x-target.y)*28*d.camera.zoom,rect.y+d.camera.y+(target.x+target.y)*14*d.camera.zoom);
   await page.waitForFunction(target=>{const d=hybridGameDiagnostics(),u=d.units[d.selected];return u.x===target.x&&u.y===target.y;},target);
  }
  if(name.includes('editor')){
   // Real pointer edits on the imported full map, followed by UI undo/redo.
   const position=await page.evaluate(()=>{const d=hybridEditorDiagnostics(),r=document.querySelector('#editor-map').getBoundingClientRect();return {x:r.left+d.camera.x+.5*28*d.camera.zoom,y:r.top+d.camera.y+16.5*14*d.camera.zoom};});
   const before=await page.evaluate(()=>JSON.stringify(hybridEditorDiagnostics().map.edges));
   await page.locator('[data-tool="wall"]').click();await page.mouse.click(position.x,position.y);await page.waitForTimeout(250);
   const painted=await page.evaluate(()=>JSON.stringify(hybridEditorDiagnostics().map.edges));assert.notEqual(painted,before,'wall pointer painting changes map');
   for(let i=0;i<12;i++){
    const start=Date.now();await page.locator('#undo').click();await page.waitForFunction(before=>JSON.stringify(hybridEditorDiagnostics().map.edges)===before,before);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));edits.push(Date.now()-start);
    await page.locator('#redo').click();await page.waitForFunction(painted=>JSON.stringify(hybridEditorDiagnostics().map.edges)===painted,painted);
   }
   await page.locator('#undo').click();await page.waitForFunction(before=>JSON.stringify(hybridEditorDiagnostics().map.edges)===before,before);
  }
  const timing=await page.evaluate(async()=>{const gaps=[];let previous=performance.now();for(let i=0;i<35;i++)await new Promise(resolve=>requestAnimationFrame(now=>{gaps.push(now-previous);previous=now;resolve();}));gaps.shift();gaps.sort((a,b)=>a-b);return {medianFrameMs:gaps[Math.floor(gaps.length/2)],p95FrameMs:gaps[Math.floor(gaps.length*.95)],heapBytes:performance.memory?.usedJSHeapSize};});
  const session=await page.context().newCDPSession(page);await session.send('HeapProfiler.collectGarbage');timing.retainedHeapBytes=(await session.send('Runtime.getHeapUsage')).usedSize;await session.detach();
  const info=await page.evaluate(()=>window.hybridGameDiagnostics?hybridGameDiagnostics():{stats:hybridEditorDiagnostics().stats});assert.deepEqual(errors,[]);if(name.startsWith('hybrid'))assert.equal(info.stats.unsupported.length,0);
  await page.screenshot({path:fileURLToPath(new URL(`../docs/tactics/environment-finished-review/integration/${name}.png`,import.meta.url))});results.push({name,browser:browser.version(),viewport:{width:1440,height:1000},loadMs,...timing,activePanFrameMs:active,undoInteractionMs:edits,stats:info.stats});await page.close();
 }
 fs.writeFileSync(new URL('../docs/tactics/environment-finished-review/integration/browser-benchmark.json',import.meta.url),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
