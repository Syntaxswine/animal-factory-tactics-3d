import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

// Uses an isolated browser profile. No existing game saves or user settings change.
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve(process.env.DIALOGUE_REVIEW_OUTPUT||'artifacts/painted-dialogue/review');
const base=process.env.DIALOGUE_REVIEW_URL||'http://127.0.0.1:4476';
fs.mkdirSync(out,{recursive:true});
const server=await chromium.launchServer({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const pid=server.process().pid,port=Number(new URL(server.wsEndpoint()).port);
const identity=()=>process.platform==='win32'
 ?JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`$p=Get-Process -Id ${pid} -ErrorAction Stop; @{pid=$p.Id;creationFileTime=$p.StartTime.ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json`],{encoding:'utf8',windowsHide:true}))
 :{pid};
const record={...identity(),owner:process.env.TASK_OWNER||'painted-dialogue-terminal',purpose:'Disposable dialogue material and interaction review',port,startedAt:new Date().toISOString(),endCondition:'Review complete or failure',stopMethod:'Playwright BrowserServer.close() in finally'};
fs.writeFileSync(path.join(out,'browser-helper.json'),JSON.stringify(record,null,2));
let browser,reviewPage;
const checks=[],errors=[];
async function openDialogue(page,route=''){
 await page.goto(`${base}${route}/tactics/battle-3d.html?study=dialogue`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.battle3d?.dialogue||document.querySelector('.loading-screen[data-state="error"]'),null,{timeout:120000});
 assert.ok(await page.evaluate(()=>!!window.battle3d?.dialogue),'Game fixture loaded: '+JSON.stringify(errors));
 // The inspection hook exists before prepareView completes; wait for the same
 // loading barrier a player must pass before starting the conversation.
 await page.waitForFunction(()=>document.querySelector('#sector-loading')?.open===false,null,{timeout:120000});
 const result=await page.evaluate(()=>{
  const b=window.battle3d,npc=b.state.units.find(u=>u.character?.dialogueRef==='yard_bomb_permission');
  const speaker=b.state.units.find(u=>u.name==='Yakov')||b.state.units.find(u=>u.team==='squad');
  b.dialogue.show(npc,speaker);
  return b.dialogue.session.refresh().ready;
 });
 assert.equal(result.ok,true,JSON.stringify(result));
 await page.waitForFunction(()=>window.battle3d.dialogue.presentationResources.portrait?.preparationMs?.ready>=0,null,{timeout:60000});
 await page.locator('.dialogue-merc-face img').evaluate(img=>img.decode());
 await page.waitForFunction(()=>!document.querySelector('.dialogue-playback small')?.textContent.includes('Preparing voice'),null,{timeout:60000});
}
async function capture(page,name){
 const layout=await page.evaluate(()=>{
  const d=document.querySelector('.battle-dialogue'),r=d.getBoundingClientRect();
  const text=document.querySelector('.dialogue-speech').textContent;
  return {width:r.width,height:r.height,x:r.x,y:r.y,scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,viewport:[innerWidth,innerHeight],text};
 });
 assert.ok(layout.width<=layout.viewport[0]&&layout.x>=0,name+' fits viewport');
 assert.ok(layout.scrollWidth<=layout.clientWidth+1,name+' has no horizontal scroll');
 assert.ok(layout.text.length>10,name+' has live dialogue');
 if(name.startsWith('zoom-200'))assert.deepEqual(layout.viewport,[640,360],'200%-equivalent CSS viewport stays fixed');
 await page.screenshot({path:path.join(out,name+'.png')});
 checks.push({name,layout});
}
try{
 browser=await chromium.connect(server.wsEndpoint());
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('animal-factory-tactics-3d:options:v1',JSON.stringify({dialogueVolume:0,dialogueTextAnimation:false})));
 const page=await context.newPage();reviewPage=page;
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>errors.push(`${r.failure()?.errorText} ${r.url()}`));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await openDialogue(page);
 await capture(page,'desktop-opening');
 const startMinute=await page.evaluate(()=>window.battle3d.state.clock.minutes);
 const options=page.locator('.dialogue-choice button');
 const inquiry=options.filter({hasText:'What do you know'});
 if(await inquiry.count())await inquiry.click();else await options.first().click();
 await page.waitForFunction(()=>!window.battle3d.dialogue.busy&&document.querySelector('.dialogue-message-merc[data-state="sent"]'),null,{timeout:30000});
 await capture(page,'desktop-conversation');
 assert.equal(await page.evaluate(()=>window.battle3d.state.clock.minutes),startMinute,'dialogue keeps game clock paused');
 await page.getByRole('button',{name:'Replay',exact:true}).click();
 await page.getByText('Conversation options',{exact:true}).click();
 await page.locator('.dialogue-preferences').scrollIntoViewIfNeeded();
 await capture(page,'desktop-options');
 await page.getByText('Conversation options',{exact:true}).click();
 await page.keyboard.press('Tab');
 const focused=await page.evaluate(()=>({inside:document.querySelector('.battle-dialogue').contains(document.activeElement),outline:getComputedStyle(document.activeElement).outlineStyle}));
 assert.equal(focused.inside,true,'Tab remains in modal');assert.notEqual(focused.outline,'none','keyboard focus visible');
 await page.setViewportSize({width:390,height:844});
 await page.locator('.dialogue-header').scrollIntoViewIfNeeded();
 await capture(page,'narrow-conversation');
 await page.setViewportSize({width:320,height:640});
 await page.locator('.dialogue-header').scrollIntoViewIfNeeded();
 await capture(page,'small-conversation');
 // Same CSS viewport as a 1280×720 display at 200% browser zoom.
 await page.setViewportSize({width:640,height:360});
 await page.locator('.dialogue-header').scrollIntoViewIfNeeded();
 await capture(page,'zoom-200-top');
 const zoomReply=page.locator('.dialogue-choice button').first();
 await zoomReply.scrollIntoViewIfNeeded();
 assert.ok(await zoomReply.evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'reply remains reachable at 200%-equivalent zoom');
 await capture(page,'zoom-200-controls');
 await page.getByRole('button',{name:'Leave',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.battle3d.dialogue.open),false,'Leave closes dialogue');
 assert.equal(await page.evaluate(()=>window.battle3d.dialogue.presentationResources.portrait),null,'portrait released');
 await page.setViewportSize({width:1280,height:900});
 await openDialogue(page,process.env.REVIEW_PACKAGED==='1'?'/packaged':'');
 await capture(page,'packaged-or-tall');
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>window.battle3d.dialogue.open),false,'Escape closes dialogue');
 // Return 200 empty images: verifies flat-color fallbacks without hiding unrelated network errors.
 await page.route('**/assets/ui/dialogue-terminal/*.webp',r=>r.fulfill({status:200,contentType:'image/webp',body:Buffer.alloc(0)}));
 await openDialogue(page);
 await capture(page,'texture-fallback');
 await page.getByRole('button',{name:'Leave',exact:true}).click();
 await context.close();
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,focus:focused},null,2));
 console.log(JSON.stringify({captures:checks.length,errors,output:out}));
}catch(error){
 const body=await reviewPage?.locator('body').innerText().catch(()=>null);
 await reviewPage?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
 fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),errors,body},null,2));
 console.error(JSON.stringify({errors,body:body?.slice(0,1200)}));throw error;
}finally{
 await browser?.close();await server.close();
 let exited=false;try{process.kill(pid,0);}catch{exited=true;}
 const portReleased=process.platform!=='win32'||!execFileSync('netstat',['-ano','-p','tcp'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/).some(l=>l.includes('LISTENING')&&new RegExp(`:${port}\\s`).test(l));
 fs.writeFileSync(path.join(out,'browser-stopped.json'),JSON.stringify({pid,creationFileTime:record.creationFileTime,stoppedAt:new Date().toISOString(),exited,portReleased},null,2));
 assert.ok(exited,'Review browser exited');assert.ok(portReleased,'Review port released');
}
