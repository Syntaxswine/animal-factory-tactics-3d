import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {launchBattleReview} from './battle-review-browser.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve('artifacts/battle-defeat');fs.mkdirSync(out,{recursive:true});
let review,server,serverRecord;const errors=[];
try{
 let origin=process.env.REVIEW_ORIGIN||'http://127.0.0.1:4363';
 if(process.env.REVIEW_ROOT){
  const root=path.resolve(process.env.REVIEW_ROOT),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
  server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':(mime[path.extname(file)]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end('Not found');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  const identity=process.platform==='win32'?JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${process.pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true})):{pid:process.pid};
  serverRecord={identity,owner:'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',project:'AnimalFactory3D/game',purpose:'Packaged defeat/hiring regression',root,port:server.address().port,startedAt:new Date().toISOString(),expiry:'End of this command',stop:'server.close in finally'};fs.writeFileSync(path.join(out,'server-helper.json'),JSON.stringify(serverRecord,null,2));
 }
 review=await launchBattleReview(chromium,'battle-defeat');const page=await review.browser.newPage({viewport:{width:1450,height:960}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errors.push(r.status()+' '+r.url());});
 const ready=()=>page.waitForFunction(()=>window.battle3d?.state&&!battle3d.renderer.busy,null,{timeout:90000});
 const kill=()=>page.evaluate(async()=>{const {refresh}=await import('./core/engine.js'),s=battle3d.state;for(const u of s.units.filter(u=>u.team==='squad')){u.hp=0;u.casualty='dead';u.ap=0;}refresh(s);s.revision++;});
 await page.goto(origin+'/tactics/battle-3d.html');await ready();
 // A single death stays in battle, and an unconscious comrade is not stamped.
 await page.evaluate(async()=>{const {refresh}=await import('./core/engine.js'),s=battle3d.state;s.units[0].hp=0;s.units[0].casualty='dead';s.units[1].hp=0;s.units[1].casualty='stable';refresh(s);});
 await page.waitForFunction(()=>document.querySelectorAll('.portrait-window .deceased-stamp:not([hidden])').length===1);
 assert.equal(await page.locator('.portrait-window.deceased').count(),1);await page.waitForTimeout(6000);assert.equal(await page.locator('#defeat-notice').isVisible(),false);
 await page.locator('.merc-card[data-unit="0"] .merc-inventory').click();assert.equal(await page.locator('.dossier-identity .deceased-stamp').textContent(),'Deceased');await page.screenshot({path:path.join(out,'deceased-dossier.png')});await page.click('#character-close');
 await kill();await page.waitForFunction(()=>document.querySelector('#defeat-notice').open);assert.equal(await page.locator('#defeat-title').textContent(),'Your squad has died');assert.equal(await page.locator('.portrait-window.deceased').count(),4);await page.screenshot({path:path.join(out,'quick-fight-defeat.png')});await page.waitForURL('**/tactics-3d.html',{timeout:30000});
 // Campaign defeat is seeded through the actual saved-campaign entry point.
 await page.goto(origin+'/tactics/campaign.html');await page.click('#new-campaign');await page.waitForFunction(()=>window.campaignView?.state?.groups.length>0);await page.click('#enter-sector');await ready();
 const before=await page.evaluate(()=>({time:battle3d.clock.minutes,ids:battle3d.state.units.filter(u=>u.team==='squad').map(u=>u.campaignId)}));
 await kill();await page.waitForURL('**/campaign.html?defeat=1',{timeout:30000});await page.waitForFunction(()=>window.campaignView?.state&&!campaignView.state.active);
 assert.equal(await page.locator('#fallen-mercs .deceased-stamp').count(),4);assert.equal(await page.locator('.time-paused').textContent(),'Time paused');assert.equal(await page.evaluate(()=>campaignView.state.clock.minutes),before.time);
 await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>campaignView.state.clock.minutes),before.time);await page.screenshot({path:path.join(out,'campaign-after-defeat.png')});
 await page.click('#hire-open');await page.waitForFunction(()=>[...document.querySelectorAll('#hire-candidates img')].every(i=>i.complete&&i.naturalWidth));await page.screenshot({path:path.join(out,'replacement-contracts.png')});
 await page.locator('#hire-candidates .recruit-card button:not(:disabled)').first().click();await page.waitForFunction(()=>document.querySelector('#hire-message').textContent.includes('hired and arrival saved'));
 const hired=await page.evaluate(()=>({money:campaignView.state.money,ids:campaignView.state.groups.filter(g=>g.faction==='player').flatMap(g=>g.memberIds)}));assert.equal(hired.ids.length,1);assert(!before.ids.includes(hired.ids[0]));assert(hired.money<20000);
 await page.click('#hire-close');await page.reload();await page.waitForFunction(()=>window.campaignView?.state?.selectedGroup);assert.equal(await page.evaluate(()=>campaignView.state.money),hired.money);assert.equal(await page.locator('#fallen-mercs .deceased-stamp').count(),4);
 await page.click('#enter-sector');await ready();assert.equal(await page.locator('.merc-card').count(),1);assert.equal(await page.locator('.portrait-window.deceased').count(),0);
 // A stale writer simulates a real failed CAS checkpoint, not a mocked UI flag.
 await page.evaluate(async()=>{const store=await import('./campaign-store.js'),record=await store.getCampaignSave('continue');record.revision+=100;record.data.revision=record.revision;await store.putCampaignSave('continue',record);});
 await kill();await page.waitForFunction(()=>document.querySelector('#defeat-notice').textContent.includes('Could not save the defeat'),null,{timeout:30000});assert(page.url().includes('battle-3d.html'));assert.equal(await page.locator('#defeat-notice button').first().isEnabled(),true);await page.screenshot({path:path.join(out,'failed-checkpoint.png')});
 await page.locator('#defeat-notice').getByRole('button',{name:'Save / Load',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.save-screen')?.open);await page.locator('.save-screen').getByRole('button',{name:/Close/}).click();await page.waitForFunction(()=>document.querySelector('#defeat-notice').open);
 await page.locator('#defeat-notice').getByRole('button',{name:'Save / Load',exact:true}).click();await page.getByRole('button',{name:'Load Campaign checkpoint',exact:true}).click();await page.waitForFunction(()=>window.battle3d?.state?.units.some(u=>u.team==='squad'&&u.hp>0));assert.equal(await page.locator('#defeat-notice').isVisible(),false);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,checks:['single death remains in battle','unconscious portrait not deceased','dossier stamp','Quick Fight timed return','campaign defeat persisted and paused','replacement hire and save/reload','new squad playable','failed checkpoint stays in battle'],errors},null,2));console.log('Packaged defeat, portraits, hiring, persistence and failed-checkpoint browser checks passed.');
}finally{
 if(review)await review.closeReview();
 if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));assert.equal(server.listening,false);fs.writeFileSync(path.join(out,'server-closed.json'),JSON.stringify({...serverRecord,closedAt:new Date().toISOString(),portReleased:!server.listening},null,2));}
}
