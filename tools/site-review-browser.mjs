import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Short-lived review browsers are owned by the calling script and always closed
// in its finally block. Preserve exact process identity and the close receipt.
export async function launchSiteReview(chromium,name){
 const out=path.resolve(import.meta.dirname,'../artifacts/strategic-sites/helpers');
 fs.mkdirSync(out,{recursive:true});
 const owner=await chromium.launchServer({channel:'msedge',headless:true});
 let browser,identity;
 try{
  const pid=owner.process().pid;
  identity=process.platform==='win32'?JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'})):{pid};
  fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({identity,task:'strategic-sites',purpose:name+' browser regression',startedAt:new Date().toISOString(),end:'Calling script finally closes browser and server'},null,2));
  browser=await chromium.connect(owner.wsEndpoint());
 }catch(error){await owner.close();throw error;}
 return {browser,closeReview:async()=>{
  try{await browser.close();}finally{await owner.close();fs.writeFileSync(path.join(out,name+'-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:owner.process().exitCode},null,2));}
 }};
}
