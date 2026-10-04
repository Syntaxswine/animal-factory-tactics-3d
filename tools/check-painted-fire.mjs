import fs from 'node:fs';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const dir=new URL('../artifacts/painted-fire/',import.meta.url);fs.mkdirSync(dir,{recursive:true});const studyURL=process.argv[2]||'http://127.0.0.1:4473/study/tactics/painted-fire-study.html';const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));fs.writeFileSync(new URL('review-browser-helper.json',dir),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'check-painted-fire caller; disposable browser',purpose:'Video and configurations',end:'review completion',stop:'browser.close in finally'},null,2));
 const ctx=await browser.newContext({viewport:{width:1280,height:900}}),page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(studyURL+'?paused=');await page.waitForFunction(()=>window.fireStudyReady);
 let configurations=0;
 for(const view of ['three','side','front','rear'])for(const scale of ['full','game'])for(const scene of ['open','wall','doorway'])for(const steps of ['3','1','0']){
  await page.evaluate(opts=>{window.fireStudy.set(opts);for(const t of [0,.35,.7,1.2,2,3.2,4.5,2.4,0])window.fireStudy.seek(t);}, {view,scale,scene,steps});configurations++;
 }
 for(const [name,opts,t]of [['spray-three',{focus:'both',view:'three',scale:'full',scene:'open',steps:'3',effects:true},.8],['spray-side',{view:'side'},.8],['spray-rear',{view:'rear'},.8],['cutoff',{view:'three'},1.35],['head-to-hoof',{focus:'target',view:'three'},1.65],['plant-hand',{effects:false,view:'three'},3.4],['ash-final',{effects:true},4.5],['wall-clipped',{focus:'both',scene:'wall'},.8],['door-clipped',{scene:'doorway'},.8]]){
  await page.evaluate(({opts,t})=>{window.fireStudy.set(opts);window.fireStudy.seek(t);},{opts,t});await page.locator('#viewport').screenshot({path:fileURLToPath(new URL(name+'.png',dir))});
 }
 for(const view of ['front','rear'])for(const t of [3.4,3.55,3.7,3.85]){await page.evaluate(({view,t})=>{window.fireStudy.set({focus:'target',scale:'close',scene:'open',effects:true,view});window.fireStudy.seek(t);},{view,t});await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('dissolve-'+view+'-'+t+'.png',dir))});}
 await page.evaluate(()=>{window.fireStudy.set({view:'front',effects:false});window.fireStudy.seek(3.4);});await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('support-front.png',dir))});
 const observations=[];
 await page.evaluate(()=>{const chunks=[],stream=document.querySelector('canvas').captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});recorder.ondataavailable=e=>chunks.push(e.data);window.__fireRecording={chunks,stream,recorder};recorder.start();});
 for(const [name,opts]of [['motion',{focus:'target',view:'side',effects:false,scene:'open',steps:'3',scale:'full'}],['painted',{focus:'both',view:'three',effects:true}],['gameplay',{focus:'target',scale:'game'}]]){
  await page.evaluate(opts=>{window.fireStudy.set(opts);window.fireStudy.seek(0);window.fireStudy.play();},opts);

  for(let i=0;i<34;i++){await page.waitForTimeout(160);const d=await page.evaluate(()=>window.fireStudyState);observations.push({clip:name,time:d.time,distance:d.target.state.distance,phase:d.target.state.phase});if(i%2===0)await page.locator('#viewport').screenshot({path:fileURLToPath(new URL(name+'-'+String(i).padStart(2,'0')+'.png',dir))});}
 }
 const initial=await page.evaluate(()=>({geometry:window.fireStudyState.geometryCount,texture:window.fireStudyState.textureCount}));
 await page.evaluate(()=>{for(let i=0;i<200;i++)window.fireStudy.seek(i%54/10);});const final=await page.evaluate(()=>({geometry:window.fireStudyState.geometryCount,texture:window.fireStudyState.textureCount}));
 if(initial.geometry!==final.geometry||initial.texture!==final.texture)errors.push('Resource count changed during seeks');
 const video=await page.evaluate(()=>new Promise(resolve=>{const {recorder,chunks,stream}=window.__fireRecording;recorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>{stream.getTracks().forEach(t=>t.stop());resolve(reader.result.split(',')[1]);};reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};recorder.stop();}));fs.writeFileSync(new URL('painted-fire-review.webm',dir),Buffer.from(video,'base64'));await ctx.close();
 const reduced=await browser.newContext({reducedMotion:'reduce'}),rp=await reduced.newPage();await rp.goto(studyURL);await rp.waitForFunction(()=>window.fireStudyReady);if(await rp.evaluate(()=>window.fireStudyState.playing))errors.push('Reduced motion autoplays');await reduced.close();
 fs.writeFileSync(new URL('browser-review.json',dir),JSON.stringify({configurations,errors,observations,initial,final},null,2));console.log(JSON.stringify({configurations,errors,initial,final}));if(errors.length)process.exitCode=1;
}finally{await browser.close();fs.writeFileSync(new URL('review-browser-closed.json',dir),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
