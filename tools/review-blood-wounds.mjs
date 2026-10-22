import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),out=path.resolve(process.env.BLOOD_WOUNDS_OUTPUT||'artifacts/blood-wounds/review');fs.mkdirSync(out,{recursive:true});
const errors=[],captures=[],base='http://127.0.0.1:4477';let server,browser,page,identity,port;
async function capture(name,settings){const state=await page.evaluate(v=>window.bloodWoundsStudy.set(v),settings);assert.equal(state.contacts.length,2,name+' has two authored surface contacts');assert.equal(state.stains,2,name+' has persistent patches');await page.locator('#viewport').screenshot({path:path.join(out,name+'.png')});captures.push({name,...state});}
try{
 server=await chromium.launchServer({channel:'msedge',headless:true});port=Number(new URL(server.wsEndpoint()).port);const pid=server.process().pid;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`$p=Get-Process -Id ${pid}; @{pid=$p.Id;creationFileTime=$p.StartTime.ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(path.join(out,'browser-helper.json'),JSON.stringify({...identity,port,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',purpose:'Disposable exit spray and persistent stain review',startedAt:new Date().toISOString(),endCondition:'Review completes or fails',stopMethod:'Playwright close in finally'},null,2));
 browser=await chromium.connect(server.wsEndpoint());const context=await browser.newContext({viewport:{width:1450,height:1000},deviceScaleFactor:1});page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'/tactics/blood-wounds-study.html?paused');await page.waitForFunction(()=>window.bloodWoundsStudy?.ready||document.querySelector('#error')?.textContent,null,{timeout:90000});assert.ok(await page.evaluate(()=>window.bloodWoundsStudy?.ready),JSON.stringify(errors));
 const normal={animal:'horse',outfit:'normal',effect:'pair',site:'torso',pose:'flex',view:'three',background:'grass',motion:'full',stains:true,guides:false};
 for(const time of [.035,.09,.22,.42,.7,1.9,2.7])await capture('horse-'+Math.round(time*1000),{...normal,time});
 if(process.env.BLOOD_WOUNDS_FAST!=='1'){
  for(const view of ['front','rear','side'])await capture('horse-'+view,{...normal,time:1.8,pose:'stand',view});
  for(const background of ['snow','room','red'])await capture('horse-'+background,{...normal,time:.09,background});
  for(const site of ['arm','leg'])for(const pose of ['kneel','prone'])await capture(site+'-'+pose,{...normal,site,pose,time:2});
  for(const motion of ['reduced','still'])await capture('horse-'+motion,{...normal,motion,time:.09});
  const roster=['horse','goat','bull','cow','donkey','sheep','skunk','pig-foreman','pig-director','rabbit','dog','hen'];
  for(const animal of roster)for(const outfit of ['normal','red-hats',...(animal==='donkey'?['blue-hawaiian']:[])])await capture(animal+'-'+outfit,{...normal,animal,outfit,time:1.9});
  await page.setViewportSize({width:390,height:844});await capture('phone',{...normal,time:1.8});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.setViewportSize({width:1450,height:1000});
 }
 const resources=await page.evaluate(async()=>{const s=window.bloodWoundsStudy;await s.set({animal:'horse',outfit:'normal',site:'torso',motion:'full',time:1.8});const before=s.state.resources;for(let i=0;i<50;i++){s.clear();s.restamp();await s.set({motion:i%2?'reduced':'full',time:1.8});}await s.set({motion:'full',time:1.8});return {before,after:s.state.resources};});assert.deepEqual(resources.before,resources.after,'Repeated clear/restamp and effects reset has bounded GPU resources');
 const scrub=await page.evaluate(()=>{const input=document.querySelector('#time');input.value='1.6';input.dispatchEvent(new Event('input',{bubbles:true}));return window.bloodWoundsStudy.state.time;});assert.equal(scrub,1.6);
 const cleared=await page.evaluate(()=>window.bloodWoundsStudy.clear());assert.equal(cleared.stains,0);await page.evaluate(()=>window.bloodWoundsStudy.restamp());
 if(process.env.BLOOD_WOUNDS_PACKAGED==='1'){
  await page.goto(base+'/packaged/tactics/blood-wounds-study.html?paused');await page.waitForFunction(()=>window.bloodWoundsStudy?.ready,null,{timeout:90000});await capture('packaged',{...normal,time:.09});
  const hash=file=>createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex');assert.equal(hash('horse-90.png'),hash('packaged.png'),'Source and packaged appearance match');
 }
 await page.evaluate(()=>window.bloodWoundsStudy.dispose());assert.ok(await page.evaluate(()=>window.bloodWoundsDisposed));
 // Interrupt both boot and a model replacement at real async boundaries.
 await page.addInitScript(()=>{const Original=window.ResizeObserver;window.woundObserverCalls=0;window.ResizeObserver=class extends Original{observe(...args){window.woundObserverCalls++;return super.observe(...args);}};});
 for(const phase of ['boot','replacement']){
  const pattern=phase==='boot'?'**/horse-10k-data.json':'**/cow-woman-model-paint-v1.png';let release,arrived,routeTimer;const reached=new Promise((resolve,reject)=>{arrived=()=>{clearTimeout(routeTimer);resolve();};routeTimer=setTimeout(()=>reject(Error('Delayed-load probe did not reach '+phase)),20000);}),gate=new Promise(r=>release=r);
  await page.route(pattern,async route=>{arrived();await gate;await route.continue();});
  try{
   await page.goto(base+'/tactics/blood-wounds-study.html?paused&cancelProbe='+phase,{waitUntil:'commit'});
   if(phase==='replacement'){await page.waitForFunction(()=>window.bloodWoundsStudy?.ready);await page.evaluate(()=>{window.pendingWoundSelection=window.bloodWoundsStudy.set({animal:'cow'});});}
   await reached;await page.evaluate(()=>dispatchEvent(new Event('pagehide')));release();await page.waitForFunction(()=>window.bloodWoundsDisposed,null,{timeout:90000});
   if(phase==='boot')assert.equal(await page.evaluate(()=>window.woundObserverCalls),0,'Interrupted boot installs no late observer');
   else await page.evaluate(()=>window.pendingWoundSelection);
  }finally{clearTimeout(routeTimer);release();await page.unroute(pattern);}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({captures,resources,cancelledLoads:['boot','replacement'],errors},null,2));console.log(JSON.stringify({captures:captures.length,resources,cancelledLoads:['boot','replacement'],errors,out}));await context.close();
}catch(error){await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),errors},null,2));throw error;}
finally{await browser?.close();await server?.close();if(identity){let exited=false;try{process.kill(identity.pid,0);}catch{exited=true;}const portReleased=!execFileSync('netstat',['-ano','-p','tcp'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/).some(l=>l.includes('LISTENING')&&new RegExp(`:${port}\\s`).test(l));fs.writeFileSync(path.join(out,'browser-stopped.json'),JSON.stringify({...identity,stoppedAt:new Date().toISOString(),exited,portReleased},null,2));assert.ok(exited&&portReleased,'Review browser exited and released its port');}}
