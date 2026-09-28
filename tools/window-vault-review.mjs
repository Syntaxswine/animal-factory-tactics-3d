import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(process.env.REVIEW_ROOT||'.pages-output'),out=path.resolve('artifacts/window-vault');await fs.mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.png':'image/png','.wav':'audio/wav','.ogg':'audio/ogg'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/tactics/window-vault-study.html`);await page.waitForFunction(()=>window.windowVaultStudy?.ready);
 let configurations=0,samples=0;
 for(const view of ['three','side','rear','front'])for(const scale of ['close','gameplay']){
  await page.selectOption('#view',view);await page.selectOption('#scale',scale);
  for(let i=0;i<=80;i++){const d=await page.evaluate(i=>{const s=window.windowVaultStudy;s.seek(s.diagnostics().duration*i/80);return s.diagnostics();},i);assert.ok(d.contacts.every(c=>Number.isFinite(c.error)));assert.ok(d.contacts.filter(c=>c.planted).every(c=>c.error<.004));assert.equal(d.glass.intact,d.time<1.2);if(i===80)assert.equal(d.glass.shardsVisible,false);samples++;}
  configurations++;if(scale==='close')for(const t of [1.5,1.82,2.04,2.67,3.84]){await page.evaluate(t=>window.windowVaultStudy.seek(t),t);await page.screenshot({path:path.join(out,`${view}-${t}.png`)});}
 }
 await page.click('#reset');await page.check('#sound');await page.click('#play');await page.waitForFunction(()=>window.windowVaultStudy.diagnostics().time>=3.84);const final=await page.evaluate(()=>window.windowVaultStudy.diagnostics());assert.equal(final.audio.starts,1);assert.equal(final.audio.error,null);assert.equal(final.glass.shardsVisible,false);
 await page.click('#reset');assert.equal(await page.evaluate(()=>window.windowVaultStudy.diagnostics().glass.intact),true);assert.deepEqual(errors,[]);
 const report={configurations,samples,audio:final.audio,errors};await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();await new Promise(r=>server.close(r));}
