import fs from 'node:fs';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),dir=new URL('../artifacts/tank-blast/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const polish=process.argv.includes('--polish'),quick=polish||process.argv.includes('--quick'),url=process.argv.find(a=>a.startsWith('http'))||'http://127.0.0.1:4473/study/tactics/tank-blast-study.html';
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],cases=[],captures=[],checks={};let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));fs.writeFileSync(new URL('browser-helper.json',dir),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'tank blast study',purpose:'Tank explosion renders and resource checks',end:'end of this command',stop:'browser.close in finally'},null,2));
 const page=await browser.newPage({viewport:{width:1100,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const start=new URL(url);start.searchParams.set('paused','');await page.goto(start.href);await page.waitForFunction(()=>window.tankStudyReady,{},{timeout:60000});
 const set=options=>page.evaluate(async options=>{await window.tankStudy.set(options);return window.tankStudyState;},options);
 async function shot(name,options,time){await set(options);await page.evaluate(t=>window.tankStudy.seek(t),time);await page.locator('#viewport').screenshot({path:fileURLToPath(new URL(name+'.png',dir))});captures.push(name);}
 if(!quick)for(const p of profiles.filter(p=>!p.unarmed))for(const outfit of ['normal','red-hats']){
  await set({animal:p.id,outfit,effects:true,focus:'blast'});
  for(const scene of ['open','water'])for(const view of ['three','rear','front','side'])for(const scale of ['full','game']){
   await set({scene,view,scale});const result=await page.evaluate(()=>{const f=window.tankStudy,frames=[];for(const t of [0,.54,.55,.65,.9,1.2,1.75,2.2,3.5,5.4,.65,0]){const d=f.seek(t),g=f.actor.worker.weapon;frames.push({time:t,destroyed:d.body.equipmentDestroyed,gear:[g.root,g.mount,g.hose].map(o=>o.visible),distance:d.body.state.distance});}return frames;});
   if(result.some(f=>f.distance!==0||f.destroyed!==(f.time>=.55)||f.gear.some(v=>v!==(f.time<.55))))errors.push('Invalid gear/motion '+p.id+' '+outfit);cases.push({animal:p.id,outfit,scene,view,scale});
  }
  await shot(p.id+'-'+outfit+'-worn',{focus:'wearer',scene:'open',view:'rear',scale:'full',effects:false},0);
  await shot(p.id+'-'+outfit+'-collapse',{focus:'wearer',view:'three',effects:false},1.75);
  console.log(p.id+' '+outfit+' checked');
 }
 await set({animal:'horse',outfit:'normal',scene:'open',scale:'full'});
 for(const view of ['three','rear'])for(const t of [0,.56,.65,.9,1.2,1.6,2.2,3.4,4.9])await shot(`horse-blast-${view}-${t}`,{focus:'blast',view,effects:true},t);
 for(const view of ['front','side'])for(const t of [0,.8,1.35,1.75])await shot(`horse-body-${view}-${t}`,{focus:'wearer',view,effects:false},t);
 if(polish){
  for(const animal of ['horse','pig-director','skunk'])for(const view of ['rear','side','three'])for(const t of [.54,.56,.65])await shot(`${animal}-rupture-${view}-${t}`,{animal,outfit:animal==='pig-director'?'red-hats':'normal',focus:'wearer',view,scale:'full',scene:'open',effects:true},t);
  for(const animal of ['horse','pig-director'])for(const view of ['front','side'])for(const t of [1.75,2.15,2.2])await shot(`${animal}-breakup-${view}-${t}`,{animal,focus:'wearer',view,effects:false},t);
  await shot('water-fire',{animal:'horse',outfit:'normal',scene:'water',focus:'blast',view:'three',scale:'full',effects:true},1.6);
  const shadow=await page.evaluate(()=>{const f=window.tankStudy;f.seek(1.75);document.getElementById('effects').checked=false;f.draw();const gl=f.renderer.getContext(),pixels=()=>{const p=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};f.actor.dissolve.value=1;f.renderer.render(f.scene,f.camera);const dissolved=pixels();f.actor.worker.root.visible=false;f.renderer.render(f.scene,f.camera);const hidden=pixels();let changed=0;for(let i=0;i<hidden.length;i++)if(hidden[i]!==dissolved[i])changed++;f.actor.worker.root.visible=true;f.seek(1.75);return {changedPixels:changed/4};});
  checks.shadow=shadow;if(shadow.changedPixels)errors.push('Fully dissolved actor retains a shadow: '+shadow.changedPixels+' changed pixels');console.log(JSON.stringify({shadow}));
  const reduced=await browser.newPage({reducedMotion:'reduce'});try{const u=new URL(url);await reduced.goto(u.href);await reduced.waitForFunction(()=>window.tankStudyReady,{},{timeout:60000});checks.reducedMotionPaused=await reduced.evaluate(()=>!window.tankStudyState.playing);if(!checks.reducedMotionPaused)errors.push('Reduced-motion startup played automatically');}finally{await reduced.close();}
  const failure=await browser.newPage();try{await failure.route('**/fixtures/tank-blast-contract.json',r=>r.fulfill({status:503,body:'Injected unavailable contract'}));await failure.goto(url);await failure.waitForFunction(()=>document.querySelector('#loading').textContent==='Study failed to load');checks.startupFailure=await failure.locator('#error').textContent();if(!checks.startupFailure.includes('Could not load'))errors.push('Startup contract failure was not reported');}finally{await failure.close();}
 }
 if(!quick){
  for(const [animal,outfit]of [['pig-director','red-hats'],['skunk','normal'],['rabbit','red-hats']])for(const t of [.56,.9,1.75])await shot(`${animal}-painted-${t}`,{animal,outfit,focus:'wearer',view:'three',scale:'full',effects:true},t);
  await shot('water-fire',{animal:'horse',outfit:'normal',scene:'water',focus:'blast',scale:'full',effects:true},1.6);
 }
 const memories=[];for(let i=0;i<(quick?2:5);i++){await set({animal:'horse',outfit:'red-hats',scene:'water'});await page.evaluate(()=>window.tankStudy.seek(.9));await set({animal:'pig-director',outfit:'red-hats',scene:'open'});await page.evaluate(()=>window.tankStudy.seek(.9));memories.push(await page.evaluate(()=>({geometries:window.tankStudyState.geometryCount,textures:window.tankStudyState.textureCount})));}
 if(memories.slice(1).some(m=>JSON.stringify(m)!==JSON.stringify(memories[0])))errors.push('Resource growth on identical reload');
 if(!quick||polish){await set({animal:'horse',outfit:'normal',view:'three',focus:'blast',scale:'full',effects:true});await page.evaluate(()=>{window.tankStudy.seek(0);const chunks=[],stream=document.querySelector('canvas').captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});window.tankCapture={chunks,stream,recorder};recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();window.tankStudy.play();});await page.waitForTimeout(5700);const video=await page.evaluate(()=>new Promise(resolve=>{const {chunks,stream,recorder}=window.tankCapture;recorder.onstop=()=>{const r=new FileReader();r.onload=()=>{stream.getTracks().forEach(t=>t.stop());resolve(r.result.split(',')[1]);};r.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};recorder.stop();}));fs.writeFileSync(new URL('tank-blast.webm',dir),Buffer.from(video,'base64'));}
 const report={quick,polish,cases,captures,memories,checks,errors};fs.writeFileSync(new URL(polish?'polish-review.json':quick?'quick-review.json':'browser-review.json',dir),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:cases.length,captures:captures.length,memories,checks,errors}));if(errors.length)process.exitCode=1;
}finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',dir),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
