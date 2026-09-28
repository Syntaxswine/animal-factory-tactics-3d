import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(process.env.REVIEW_ROOT||'.pages-output'),out=path.resolve('artifacts/weighted-window');await fs.mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.png':'image/png','.wav':'audio/wav','.ogg':'audio/ogg'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/tactics/weighted-window-study.html`);await page.waitForFunction(()=>window.weightedWindowStudy);
 let configurations=0,samples=0;
 for(const entry of ['braced','dive'])for(const view of ['side','three','front'])for(const envelope of [true,false]){
  await page.selectOption('#entry',entry);await page.selectOption('#view',view);await page.locator('#envelope').setChecked(envelope);
  const duration=await page.evaluate(()=>window.weightedWindowStudy.diagnostics().duration);
  for(let i=0;i<=100;i++){const d=await page.evaluate(t=>window.weightedWindowStudy.seek(t),duration*i/100);assert.ok(d.center.every(Number.isFinite));if(d.mode==='static kneel')assert.equal(d.balanced,true);samples++;}
  configurations++;if(envelope)for(const t of entry==='braced'?[0,.78,1.08,1.4,1.8,2.02,2.3,2.55,3,4.9]:[0,.65,.9,1.1,1.35,1.46,1.7,2.4,3.9]){await page.evaluate(t=>window.weightedWindowStudy.seek(t),t);await page.screenshot({path:path.join(out,`${entry}-${view}-${t}.png`)});}
 }
 for(const entry of ['braced','dive']){await page.selectOption('#entry',entry);await page.selectOption('#view','three');await page.check('#envelope');await page.click('#reset');await page.click('#play');await page.waitForFunction(()=>{const s=window.weightedWindowStudy.diagnostics();return s.time>=s.duration;});assert.equal(await page.evaluate(()=>window.weightedWindowStudy.diagnostics().balanced),true);assert.equal(await page.evaluate(()=>window.weightedWindowStudy.diagnostics().glass.cleared),true);await page.click('#reset');assert.equal(await page.evaluate(()=>window.weightedWindowStudy.diagnostics().time),0);}
 assert.deepEqual(errors,[]);
 const report={configurations,samples,errors};await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();await new Promise(r=>server.close(r));}
