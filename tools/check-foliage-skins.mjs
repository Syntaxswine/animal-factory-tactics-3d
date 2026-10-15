import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const project=path.resolve(import.meta.dirname,'..'),label=process.argv[2]||'after',out=path.join(project,'artifacts/foliage-skins',label),origin=process.env.REVIEW_URL||'http://127.0.0.1:4476';fs.mkdirSync(out,{recursive:true});
const server=await chromium.launchServer({channel:'msedge',headless:true});let browser;
const pid=server.process().pid,identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'}));
fs.writeFileSync(path.join(out,'helper.json'),JSON.stringify({identity,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',task:'foliage-skins',purpose:'Short-lived visual comparison',startedAt:new Date().toISOString(),end:'Finally closes browser and launch server'},null,2));
const report={errors:[],views:[]};
try{
 browser=await chromium.connect(server.wsEndpoint());const page=await browser.newPage({viewport:{width:1040,height:920}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))report.errors.push(m.text());});
 const views=process.env.REVIEW_VIEWS?process.env.REVIEW_VIEWS.split(','):['mixed','dense','dense:reverse','dense:high','temperate','jungle','snow','dry','open','path','path:high:grid'];
 for(const view of views){const [selection,angle='normal',grid]=view.split(':'),family=selection.startsWith('trees-')?selection.slice(6):null,mode=family?'trees':selection;await page.goto(`${origin}/tactics/foliage-skins-review.html?view=${mode}&angle=${angle}&grid=${grid?1:0}${family?'&family='+family:''}${process.env.REVIEW_SCALE?'&scale='+process.env.REVIEW_SCALE:''}`);await page.waitForFunction(()=>window.foliageReview,null,{timeout:120000});await page.locator('canvas').screenshot({path:path.join(out,view.replaceAll(':','-')+'.jpg'),type:'jpeg',quality:90});const metrics=await page.evaluate(()=>foliageReview.result);report.views.push(metrics);console.log(JSON.stringify(metrics));}
 if(report.errors.length)throw Error(report.errors.join('\n'));
}finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));try{await browser?.close();}finally{await server.close();fs.writeFileSync(path.join(out,'helper-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:server.process().exitCode},null,2));}}
