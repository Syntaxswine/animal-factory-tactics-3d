import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const output=path.resolve(process.env.HEDGE_REVIEW_OUTPUT||'artifacts/painted-hedges/review');fs.mkdirSync(output,{recursive:true});
const server=await chromium.launchServer({channel:'msedge',headless:true}),pid=server.process().pid;
let browser;const errors=[],results=[];
const identity=()=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object Id,StartTime,Path | ConvertTo-Json`],{encoding:'utf8'}));
const record={identity:identity(),purpose:'Disposable hedge screenshot and interaction review',startedAt:new Date().toISOString(),port:Number(new URL(server.wsEndpoint()).port),stopMethod:'Playwright BrowserServer.close in finally',endCondition:'Screenshots and interactions complete'};
fs.writeFileSync(path.join(output,'browser-helper.json'),JSON.stringify(record,null,2));
try{
 browser=await chromium.connect(server.wsEndpoint());const page=await browser.newPage({viewport:{width:1400,height:980},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto((process.env.HEDGE_URL||'http://127.0.0.1:4476/tactics/painted-hedges-study.html'),{waitUntil:'networkidle'});await page.waitForFunction(()=>window.hedgeStudyReady,{timeout:60000});
 for(const [name,options]of [
  ['pair',{layout:'pair',view:'three',scale:'fit',reference:'standing',grid:true}],
  ['pair-front',{layout:'pair',view:'front',scale:'fit',reference:'standing',grid:false}],
  ['short-gate',{layout:'gate',kind:'short',view:'three',scale:'fit',reference:'kneeling',grid:true}],
  ['tall-gate',{layout:'gate',kind:'tall',view:'three',scale:'fit',reference:'standing',grid:false}],
  ['joins-top',{layout:'joins',kind:'tall',view:'top',scale:'fit',reference:'none',grid:true}],
  ['grey',{layout:'mixed',view:'three',scale:'fit',reference:'standing',grid:true,grey:true}],
  ['mixed',{layout:'mixed',view:'three',scale:'fit',reference:'standing',grid:false,grey:false}],
  ['game',{layout:'gate',kind:'tall',view:'rear',scale:'game',reference:'standing',grid:false}],
  ['long',{layout:'long',kind:'tall',view:'three',scale:'fit',reference:'none',grid:false}],
  ['wood',{layout:'gate',kind:'tall',view:'three',scale:'fit',reference:'standing',wood:true,grid:true}]
 ]){
  const state=await page.evaluate(o=>window.hedgeStudy.set(o),options);await page.screenshot({path:path.join(output,name+'.png')});results.push({name,state});
 }
 // Rebuilds must release geometry rather than accumulating every layout.
 await page.evaluate(()=>window.hedgeStudy.set({layout:'gate',wood:false,grey:false}));
 const before=await page.evaluate(()=>({...window.hedgeStudy.renderer.info.memory}));
 for(let i=0;i<12;i++)await page.evaluate(i=>window.hedgeStudy.set({layout:i%2?'gate':'joins'}),i);
 const after=await page.evaluate(()=>({...window.hedgeStudy.renderer.info.memory}));assert.equal(after.geometries,before.geometries);assert.equal(after.textures,before.textures);
 assert.deepEqual(errors,[]);await page.evaluate(()=>window.hedgeStudy.dispose());assert.equal(await page.evaluate(()=>window.hedgeStudyDisposed),true);
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,errors,rebuildResources:{before,after}},null,2));
 console.log(JSON.stringify({captures:results.length,errors,resources:after,output}));
}finally{
 await browser?.close();await server.close();let exited=false;try{identity();}catch{exited=true;}
 const ports=execFileSync('netstat',['-ano','-p','tcp'],{encoding:'utf8'}),portReleased=!ports.split(/\r?\n/).some(line=>line.includes('LISTENING')&&new RegExp(`:${record.port}\\s`).test(line));
 fs.writeFileSync(path.join(output,'browser-stopped.json'),JSON.stringify({pid,stoppedAt:new Date().toISOString(),exited,portReleased},null,2));
 if(!exited)throw Error('Review browser has not exited');
 if(!portReleased)throw Error('Review browser port was not released');
}
