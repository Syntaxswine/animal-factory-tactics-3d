import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {clickBattleControl,openBattleDrawer} from './battle-ui-review.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve(process.env.CAMPAIGN_OUTPUT||'artifacts/campaign');fs.mkdirSync(out,{recursive:true});let origin=process.env.CAMPAIGN_ORIGIN||'http://127.0.0.1:4364';
let browser,server,page,identity,serverIdentity;const errors=[];
const processIdentity=pid=>process.platform==='win32'?JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true})):{Id:pid};
try{
 if(process.env.CAMPAIGN_ROOT){
  const root=path.resolve(process.env.CAMPAIGN_ROOT),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
  server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end('Not found');}});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;serverIdentity={identity:processIdentity(process.pid),root,port:server.address().port,owner:'campaign browser regression',purpose:'Temporary packaged build server',expiry:'End of command',stop:'server.close in finally',started:new Date().toISOString()};fs.writeFileSync(path.join(out,'server-helper.json'),JSON.stringify(serverIdentity,null,2));
 }
 browser=await chromium.launch({channel:'msedge',headless:true});
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=processIdentity(pid);
 fs.writeFileSync(path.join(out,'browser-helper.json'),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',purpose:'Disposable campaign normal-controls browser regression',started:new Date().toISOString(),expiry:'End of command',stop:'browser.close in finally',port:null},null,2));
 page=await browser.newPage({viewport:{width:1450,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin+'/tactics-3d.html');await page.locator('a[href="campaign.html"]').click();await page.click('#new-campaign');await page.waitForFunction(()=>window.campaignView?.state?.groups.length===2);
 await page.screenshot({path:path.join(out,'overmap-start.png')});await page.click('#enter-sector');await page.waitForURL('**/battle-3d.html?campaign=continue');
 await page.waitForFunction(()=>window.battle3d?.state&&document.querySelector('#sector-inventory-button')&&!document.querySelector('#sector-inventory-button').disabled,null,{timeout:60000});
 await openBattleDrawer(page);assert.equal(await page.locator('#command-drawer #campaign-actions #campaign-map-button').count(),1);
 assert.equal(await page.locator('#campaign-map-button').evaluate(b=>getComputedStyle(b).pointerEvents),'auto');await page.screenshot({path:path.join(out,'campaign-drawer.png')});
 await page.click('#campaign-map-button');await page.waitForURL('**/campaign.html');await page.click('#resume-battle');await page.waitForURL('**/battle-3d.html?campaign=continue');
 await page.waitForFunction(()=>window.battle3d?.state&&!document.querySelector('#sector-inventory-button')?.disabled);
 const orders=await page.evaluate(()=>structuredClone(battle3d.state.queue));
 await clickBattleControl(page,'#sector-inventory-button');assert.deepEqual(await page.evaluate(()=>battle3d.state.queue),orders,'Campaign control must not order movement through the HUD');assert(!await page.locator('#sector-inventory').textContent().then(t=>t.includes('Medical chest')));
 const upper=page.locator('#sector-inventory section').filter({hasText:'level 2'});assert.equal(await upper.count(),1);await upper.getByRole('button',{name:'Take',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#sector-inventory').textContent.includes('checkpoint saved'));
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('.merc-card[data-unit="1"] .merc-select').click();await page.locator('.merc-card[data-unit="1"] .merc-inventory').click();await page.getByRole('button',{name:/Search container/}).click();
 await page.waitForFunction(()=>battle3d.state.loot.find(p=>p.container)?.searched===true);await page.screenshot({path:path.join(out,'searched-chest.png')});
 await page.click('#character-close');await openBattleDrawer(page);await page.click('#campaign-finish');await page.waitForURL('**/campaign.html');
 await page.locator('[data-sector="71"]').click();assert((await page.locator('#travel-members li').count())===4);await page.screenshot({path:path.join(out,'travel-order.png')});await page.click('#travel-confirm');
 await page.waitForFunction(()=>campaignView.state.groups[0].travel.route.length>0);await page.click('[data-minutes="10"]');await page.waitForFunction(()=>campaignView.state.groups[0].travel.progress===10);
 await page.reload();await page.waitForFunction(()=>window.campaignView?.state?.groups[0].travel.progress===10);await page.click('[data-minutes="60"]');await page.waitForFunction(()=>campaignView.state.groups[0].travel.progress===70);await page.click('[data-minutes="10"]');
 await page.waitForFunction(()=>campaignView.state.incidents.some(i=>i.status==='pending'));await page.locator('#incidents button').click();await page.waitForURL('**/battle-3d.html?campaign=continue');
 await page.waitForFunction(()=>window.battle3d?.state?.units.filter(u=>u.team==='guard').length===6&&battle3d.renderer.models.has(battle3d.state.units.find(u=>u.team==='guard').id),null,{timeout:60000});
 assert(await page.evaluate(()=>battle3d.paused));await page.click('#pause');
 const guard=await page.evaluate(()=>{const g=battle3d.state.units.find(u=>u.team==='guard'&&battle3d.state.detected.has(u.id)),p=battle3d.project(g),r=document.querySelector('#battle').getBoundingClientRect();return {id:g.id,x:r.left+p.x,y:r.top+p.y-28,ammo:battle3d.state.units.find(u=>u.id===0).ammo.assault};});
 await page.mouse.click(guard.x,guard.y);await page.waitForFunction(()=>document.querySelector('#shot-popup').open);await page.screenshot({path:path.join(out,'checkpoint-shot.png')});await page.click('#fire');
 await page.waitForFunction(ammo=>battle3d.state.units.find(u=>u.id===0).ammo.assault<ammo,guard.ammo);await page.waitForFunction(()=>!battle3d.renderer.busy&&!battle3d.paused,null,{timeout:60000});
 const committed=await page.evaluate(()=>({ammo:battle3d.state.units.find(u=>u.id===0).ammo.assault,hp:battle3d.state.units.filter(u=>u.team==='guard').map(u=>[u.id,u.hp]),round:battle3d.state.round}));
 await clickBattleControl(page,'#quicksave');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Quicksave saved'));await clickBattleControl(page,'#quickload');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Encounter loaded'));
 assert.deepEqual(await page.evaluate(()=>({ammo:battle3d.state.units.find(u=>u.id===0).ammo.assault,hp:battle3d.state.units.filter(u=>u.team==='guard').map(u=>[u.id,u.hp]),round:battle3d.state.round})),committed);
 await openBattleDrawer(page);await page.click('[data-retreat="70"]');await page.waitForURL('**/campaign.html');await page.waitForFunction(()=>window.campaignView?.state?.groups[0].travel.route.length===1);
 assert.equal(await page.evaluate(()=>campaignView.state.incidents[0].outcome),'retreat');await page.screenshot({path:path.join(out,'retreat.png')});
 const storage=await page.evaluate(async()=>{
  const store=await import('./campaign-store.js'),before=await store.getCampaignSave('continue'),next=structuredClone(before);next.revision++;next.data.revision++;
  await store.putCampaignSave('continue',next,{id:before.campaignId,revision:before.revision});let staleRejected=false,corruptRejected=false;
  try{await store.putCampaignSave('continue',before,{id:before.campaignId,revision:before.revision});}catch(e){staleRejected=e.message.includes('Another tab');}
  const corrupt=structuredClone(next);corrupt.data.clock.minutes=-1;await store.putCampaignSave('slot-3',corrupt);
  try{await store.loadCampaignSession('slot-3');}catch{corruptRejected=true;}
  return {staleRejected,corruptRejected,checkpointPreserved:(await store.getCampaignSave('continue')).revision===next.revision};
 });assert.deepEqual(storage,{staleRejected:true,corruptRejected:true,checkpointPreserved:true});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({checks:['title Campaign entry','new game','peaceful upper-floor inventory','normal container search','cleared sector handoff','map click travel order','mid-journey reload','actual tactical shot','campaign quicksave/quickload','boundary retreat','IndexedDB stale-write rejection','corrupt named-save rejection'],committed,storage,errors},null,2));console.log('Campaign normal-controls browser checks passed.');
}catch(e){console.error(errors);if(page){await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(await page.locator('body').innerText().catch(()=>''));}throw e;}
finally{await browser?.close();fs.writeFileSync(path.join(out,'browser-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString()}));if(server){await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'server-closed.json'),JSON.stringify({...serverIdentity,closedAt:new Date().toISOString()}));}}
