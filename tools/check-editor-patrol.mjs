import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {launchBattleReview} from './battle-review-browser.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve('artifacts/editor-patrol');fs.mkdirSync(out,{recursive:true});
let review,server,serverRecord,page;const errors=[];
try{
 let origin=process.env.REVIEW_ORIGIN||'http://127.0.0.1:4363';
 if(process.env.REVIEW_ROOT){
  const root=path.resolve(process.env.REVIEW_ROOT),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
  server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':(mime[path.extname(file)]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end('Not found');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  const identity=process.platform==='win32'?JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${process.pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true})):{pid:process.pid};
  serverRecord={identity,owner:'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',project:'AnimalFactory3D/game',purpose:'Packaged editor patrol regression',root,port:server.address().port,startedAt:new Date().toISOString(),expiry:'End of this command',stop:'server.close in finally'};fs.writeFileSync(path.join(out,'server-helper.json'),JSON.stringify(serverRecord,null,2));
 }
 review=await launchBattleReview(chromium,'editor-patrol');page=await review.browser.newPage({viewport:{width:1500,height:960}});
 const observe=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errors.push(r.status()+' '+r.url());});};observe(page);
 await page.goto(origin+'/tactics/editor-3d.html?editing=1');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,null,{timeout:90000});
 await page.evaluate(async()=>{
  const {blankMap}=await import('./core/maps.js'),{characterDefaults}=await import('./character-properties.js');const map=blankMap('Patrol workshop');
  map.guards=[{x:10,y:10,z:0,species:'pig-foreman',weapon:'rifle',outfit:'red-hats',character:{...characterDefaults('guards'),displayName:'Gate guard',faction:'red-hats',attitude:'neutral'}},{x:18,y:10,z:0,species:'donkey',weapon:'hands',character:{...characterDefaults('guards','npc'),displayName:'Town guide'}}];
  await editor3d.open(JSON.stringify(map));Object.assign(editor3d.view,{x:12,y:12,span:25});await editor3d.changed();
 });
 const ready=()=>page.waitForFunction(()=>!editor3d.loading);
 async function screen(x,y,height=0){return page.evaluate(async({x,y,height})=>{const T=await import('./vendor/three.module.js'),v=new T.Vector3(x,height,y).project(editor3d.scene.camera),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},{x,y,height});}
 async function clickTile(x,y,options){const p=await screen(x,y);await page.mouse.click(p.x,p.y,options);await ready();}
 async function menu(x=10,y=10){const p=await screen(x,y,.9);await page.mouse.click(p.x,p.y,{button:'right'});await page.waitForSelector('#battle-context:not([hidden])');}
 const patrol=()=>page.evaluate(()=>editor3d.document.map.guards[0].patrol||[]);
 // Right-drag is still a pan; a stationary right click picks the character body.
 const guard=await screen(10,10,.9),before=await page.evaluate(()=>({...editor3d.view}));await page.mouse.move(guard.x,guard.y);await page.mouse.down({button:'right'});await page.mouse.move(guard.x+45,guard.y+25,{steps:5});await page.mouse.up({button:'right'});
 assert.equal(await page.locator('#battle-context').isVisible(),false);assert.notEqual(await page.evaluate(()=>editor3d.view.x),before.x);
 await page.evaluate(async view=>{Object.assign(editor3d.view,view);await editor3d.changed();},before);
 await menu();assert.equal(await page.locator('#battle-context [data-action=pathing]').isEnabled(),true);await page.screenshot({path:path.join(out,'character-menu.png')});await page.click('[data-action=pathing]');
 await clickTile(14,10);await clickTile(14,15);await clickTile(10,15);assert.equal((await patrol()).length,3);assert.equal((await patrol())[0].waitSeconds,0);
 await clickTile(14,10);await clickTile(14,10);assert.equal((await patrol())[0].waitSeconds,30);assert(await page.locator('#patrol-flags').textContent().then(s=>s.includes('30')));
 // Hit the visible flag cloth itself, not just its tile.
 const flag=await screen(14,10);await page.mouse.click(flag.x+15,flag.y-29);assert.equal((await patrol())[0].waitSeconds,45);
 await page.click('#undo');await ready();assert.equal((await patrol())[0].waitSeconds,30);await page.click('#redo');await ready();assert.equal((await patrol())[0].waitSeconds,45);
 await page.getByRole('button',{name:'Reduce waypoint 1 wait by 15 seconds',exact:true}).click();assert.equal((await patrol())[0].waitSeconds,30);
 await page.getByRole('button',{name:'Remove waypoint 3',exact:true}).click();assert.equal((await patrol()).length,2);await page.click('#undo');await ready();assert.equal((await patrol()).length,3);
 await page.screenshot({path:path.join(out,'patrol-flags.png')});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#patrol-options').isVisible(),false);await clickTile(16,16);assert.equal((await patrol()).length,3);
 await menu();assert.equal(await page.locator('[data-action=talk]').getAttribute('aria-checked'),'false');await page.click('[data-action=talk]');await ready();assert.equal(await page.evaluate(()=>editor3d.document.map.guards[0].character.canTalk),true);
 await menu();assert.equal(await page.locator('[data-action=talk]').getAttribute('aria-checked'),'true');await page.click('[data-action=dialogue]');assert.equal(await page.locator('#char-extra').getAttribute('open'),'');await page.fill('#char-dialogue','gate_intro');await page.click('#char-apply');await ready();assert.equal(await page.evaluate(()=>editor3d.document.map.guards[0].character.dialogueRef),'gate_intro');
 await menu(18,10);await page.click('[data-action=talk]');await ready();assert.equal(await page.evaluate(()=>editor3d.document.map.guards[1].character.canTalk),true);assert.equal(await page.evaluate(()=>editor3d.document.map.guards[1].character.combatBehavior),'cower');
 await menu();await page.click('[data-action=pathing]');await page.click('[data-group=terrain]');assert.equal(await page.locator('#patrol-options').isVisible(),false);
 await menu();await page.click('[data-action=pathing]');await menu();await clickTile(5,12);assert.equal((await patrol()).length,3);assert.equal(await page.locator('#battle-context').isVisible(),false);
 await page.keyboard.press('Escape');await page.click('#quick-save-map');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved in this browser'));
 const snapshot=await page.evaluate(()=>editor3d.export());await page.evaluate(async json=>{await editor3d.open(json);Object.assign(editor3d.view,{x:12,y:12,span:25});await editor3d.changed();},snapshot);assert.equal((await patrol())[0].waitSeconds,30);
 // The actual editor handoff, and real-time runtime movement, use the saved route.
 const popup=page.waitForEvent('popup');await page.click('#quick-playtest');const battle=await popup;observe(battle);await battle.waitForFunction(()=>window.battle3d?.state&&!battle3d.renderer.busy,null,{timeout:90000});
 const savedPath=await battle.evaluate(()=>battle3d.state.units.find(u=>u.name==='Gate guard').patrol);assert.deepEqual(savedPath,await patrol());
 await battle.waitForFunction(()=>{const g=battle3d.state.units.find(u=>u.name==='Gate guard');return g.x!==10||g.y!==10;},null,{timeout:30000});
 await battle.close();assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({ok:true,checks:['right-click model picking','right-drag pan','waypoint clicks and flag waits','undo/redo and removal','guard/NPC talk settings','tool switching and outside-click isolation','browser save and map reload','live editor playtest patrol'],errors},null,2));console.log('Packaged editor context menu, patrol flags, talk settings, persistence and live playtest passed.');
}catch(error){if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error('Browser errors:',errors);throw error;}
finally{
 if(review)await review.closeReview();
 if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));assert.equal(server.listening,false);fs.writeFileSync(path.join(out,'server-closed.json'),JSON.stringify({...serverRecord,closedAt:new Date().toISOString(),portReleased:!server.listening},null,2));}
}
