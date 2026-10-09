import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';

// Build first with npm run build:tactics-3d. This serves only the packaged files;
// each browser check owns and closes its browser, and this command closes HTTP.
const root=path.resolve('.pages-output'),out=path.resolve('artifacts/hud-integration');
fs.mkdirSync(out,{recursive:true});
if(!fs.existsSync(path.join(root,'tactics/battle-3d.html')))throw Error('Run npm run build:tactics-3d first.');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404).end('Not found');}
});
const allChecks=['check-hud-gameplay','check-battle-hud','check-inventory-weapons','check-campaign','check-battle-context','check-grenade-gameplay','check-editor-breaches','check-explosive-barrels'];
const from=process.argv.find(a=>a.startsWith('--from='))?.slice(7);
if(from&&!allChecks.includes(from))throw Error('Unknown check: '+from);
const checks=allChecks.slice(from?allChecks.indexOf(from):0),reportFile='packaged-report'+(from?'-'+from:'')+'.json';
let helper;const report={root,selected:checks,checks:[],started:new Date().toISOString()};
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin='http://127.0.0.1:'+server.address().port;
 const identity=process.platform==='win32'?JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(process.pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true})):{Id:process.pid};
 helper={identity,owner:process.env.CODEX_THREAD_ID||'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',purpose:'Packaged HUD and campaign integration regression',root,port:server.address().port,started:new Date().toISOString(),expiry:'End of command',stop:'server.close in finally'};
 fs.writeFileSync(path.join(out,'server-helper.json'),JSON.stringify(helper,null,2));
 Object.assign(process.env,{INTEGRATION_ORIGIN:origin,REVIEW_URL:origin+'/tactics/battle-3d.html',CAMPAIGN_ORIGIN:origin,CAMPAIGN_OUTPUT:path.join(out,'campaign'),CONTEXT_REVIEW_URL:origin+'/tactics/battle-3d.html?study=grenades',GRENADE_REVIEW_URL:origin+'/tactics/battle-3d.html?study=grenades',BREACH_REVIEW_URL:origin,EDITOR_ORIGIN:origin});
 delete process.env.CAMPAIGN_ROOT;
 for(const name of checks){console.log('Packaged check: '+name);await import('./'+name+'.mjs');report.checks.push(name);}
 report.passed=true;console.log('All selected packaged HUD and gameplay checks passed.');
}catch(error){report.failure=error.stack;throw error;}
finally{
 await new Promise(resolve=>server.close(resolve));
 fs.writeFileSync(path.join(out,'server-closed.json'),JSON.stringify({...helper,closedAt:new Date().toISOString()},null,2));
 fs.writeFileSync(path.join(out,reportFile),JSON.stringify(report,null,2));
}
