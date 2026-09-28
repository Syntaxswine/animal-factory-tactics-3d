import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(process.env.REVIEW_ROOT||'.pages-output'),out=path.resolve('artifacts/window-shatter');await fs.mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.png':'image/png','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/tactics/window-shatter-study.html`);await page.waitForFunction(()=>window.windowShatterStudy?.diagnostics().audio.ready>=2);
 let configurations=0,samples=0;
 for(const kind of ['all','window-brick','window-concrete','window-corrugated'])for(const view of ['three','front','rear','side'])for(const scale of ['close','gameplay'])for(const direction of ['1','-1']){
  for(const [id,value]of Object.entries({kind,view,scale,direction}))await page.selectOption('#'+id,value);
  for(const t of [-1,0,.08,.3,.65,1.2,2.2]){const d=await page.evaluate(t=>window.windowShatterStudy.sample(t),t);assert.equal(d.windows.length,kind==='all'?3:1);for(const w of d.windows){assert.equal(w.shards,70);assert.equal(w.intact,t<0);assert.ok(w.minY>=0);if(t===2.2){assert.ok(w.settled);assert.ok(w.maxY<.01);}}samples++;}
  configurations++;
  if(kind==='all'&&view==='three'&&direction==='1')for(const [label,t]of [['intact',-1],['falling',.3],['ground',2.2]]){await page.evaluate(t=>window.windowShatterStudy.sample(t),t);await page.screenshot({path:path.join(out,`${scale}-${label}.png`)});}
 }
 await page.selectOption('#kind','all');const baseline=await page.evaluate(()=>window.windowShatterStudy.diagnostics().render.geometries);
 for(let i=0;i<20;i++){await page.selectOption('#kind','window-brick');await page.selectOption('#kind','all');}
 assert.equal(await page.evaluate(()=>window.windowShatterStudy.diagnostics().render.geometries),baseline);
 await page.click('#smash');await page.waitForFunction(()=>document.querySelector('#audio-status').textContent.startsWith('CC0'));
 await page.waitForFunction(()=>window.windowShatterStudy.diagnostics().time>.15);await page.click('#pause');assert.equal(await page.evaluate(()=>window.windowShatterStudy.diagnostics().playing),false);
 await page.click('#reset');assert.ok((await page.evaluate(()=>window.windowShatterStudy.diagnostics())).windows.every(w=>w.intact));
 await page.uncheck('#sound');await page.click('#smash');await page.waitForFunction(()=>window.windowShatterStudy.diagnostics().time>=2.2);assert.ok((await page.evaluate(()=>window.windowShatterStudy.diagnostics())).windows.every(w=>w.settled));
 const audio=await page.evaluate(async()=>{const c=new AudioContext(),buffer=await c.decodeAudioData(await (await fetch('../assets/audio/glass-breaking-cc0.wav')).arrayBuffer());let peak=0;for(const v of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(v));const result={duration:buffer.duration,channels:buffer.numberOfChannels,peak};await c.close();return result;});assert.ok(audio.duration>1&&audio.peak>.1);
 assert.deepEqual(errors,[]);const report={configurations,samples,resourceCycles:20,audio,errors};await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();await new Promise(r=>server.close(r));}
