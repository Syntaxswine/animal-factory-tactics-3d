import fs from 'node:fs';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';import {WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),dir=new URL('../artifacts/painted-fire/roster/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const quick=process.argv.includes('--quick'),url=process.argv.find(a=>a.startsWith('http'))||'http://127.0.0.1:4364/tactics/painted-fire-study.html';
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],cases=[],captures=[];let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));fs.writeFileSync(new URL('browser-helper.json',dir),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'fire roster review',purpose:'Roster renders and resource checks',end:'end of this command',stop:'browser.close in finally'},null,2));
 const page=await browser.newPage({viewport:{width:1100,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const start=new URL(url);start.searchParams.set('paused','');await page.goto(start.href);await page.waitForFunction(()=>window.fireStudyReady,{},{timeout:60000});
 async function set(options){return page.evaluate(async options=>{await window.fireStudy.set(options);return window.fireStudyState;},options);}
 async function screenshot(name,opts,t){await set(opts);await page.evaluate(t=>window.fireStudy.seek(t),t);await page.locator('#viewport').screenshot({path:fileURLToPath(new URL(name+'.png',dir))});captures.push(name);}
 if(!quick){for(const p of profiles)for(const outfit of ['normal','red-hats',...(p.id==='donkey'?['blue-hawaiian']:[])]){
  for(const weapon of p.unarmed||outfit==='blue-hawaiian'?['hands']:Object.keys(WEAPON_MODELS)){
   const options={animal:p.id,outfit,weapon,focus:'target',effects:true,view:'three',scale:'full'};await set(options);
   const result=await page.evaluate(()=>{const f=window.fireStudy,frames=[];for(const t of [0,.7,1.3,1.94,2.9,3.3,3.6,3.9,5.4,1.3]){const d=f.seek(t);frames.push({time:t,grip:d.target.gripError,visible:f.actors[1].worker.parts.some(p=>p.visible),cards:d.effects.activeCards});}return {selection:window.fireStudyState.selection,frames};});
   if(result.selection.animal!==p.id||result.selection.outfit!==outfit||result.selection.weapon!==weapon||result.frames.some(f=>f.grip>1e-7)||result.frames.find(f=>f.time===5.4).visible)errors.push('Invalid target '+JSON.stringify(options));cases.push({role:'target',...result});
  }
  await screenshot(p.id+'-'+outfit,{animal:p.id,outfit,weapon:p.unarmed||outfit==='blue-hawaiian'?'hands':'rifle',effects:false},1.3);
  console.log(p.id+' '+outfit+' checked');
 }
 for(const p of profiles.filter(p=>!p.unarmed))for(const outfit of ['normal','red-hats']){await set({operator:p.id,operatorOutfit:outfit,focus:'shooter'});const result=await page.evaluate(()=>{const samples=[0,.4,.7,1.2,1.58,2.1,.7].map(t=>window.fireStudy.seek(t).shooter);return {selection:window.fireStudyState.selection,maxGrip:Math.max(...samples.map(s=>s.gripError)),contacts:samples.map(s=>s.hands.length)};});if(result.maxGrip>1e-7||result.contacts.some(n=>n!==2))errors.push('Operator '+p.id+' '+outfit);cases.push({role:'operator',...result});}
 }
 await set({operator:'horse',operatorOutfit:'normal',animal:'horse',outfit:'normal',weapon:'rifle',focus:'both',scale:'full',scene:'open',steps:'3'});
 for(const view of ['three','side','front'])await screenshot('spray-'+view,{view,effects:true},.80);
 for(const [animal,outfit,weapon]of [['pig-director','red-hats','hmg'],['pig-foreman','normal','rpg'],['skunk','normal','flamethrower'],['donkey','blue-hawaiian','hands'],['hen','red-hats','hands'],['rabbit','red-hats','rifle']]){
  for(const view of ['three','side'])for(const t of [1.3,2.9,3.18,3.61,3.9,5.4])await screenshot(`${animal}-${weapon}-${view}-${t}`,{animal,outfit,weapon,focus:'target',view,scale:'full',effects:t===3.9||t===5.4},t);
 }
 for(const [animal,outfit]of [['skunk','red-hats'],['donkey','blue-hawaiian'],['rabbit','red-hats'],['hen','red-hats'],['pig-director','normal'],['pig-foreman','normal']])for(const view of ['side','rear'])await screenshot(`engulf-${animal}-${view}`,{animal,outfit,weapon:animal==='hen'||outfit==='blue-hawaiian'?'hands':'rifle',focus:'target',view,effects:true},1.82);
 for(const operator of ['pig-foreman','pig-director','skunk'])for(const view of ['side','rear','three'])await screenshot(`operator-${operator}-${view}`,{operator,operatorOutfit:'red-hats',focus:'shooter',view,effects:false},.8);
 // Recreate whole assets, including fitted caps and the hen's replacement rig.
 const memories=[];for(let i=0;i<6;i++){await set({animal:'hen',outfit:'red-hats',weapon:'hands'});await page.evaluate(()=>window.fireStudy.seek(1.3));await set({animal:'skunk',outfit:'red-hats',weapon:'flamethrower'});await page.evaluate(()=>window.fireStudy.seek(1.3));memories.push(await page.evaluate(()=>({geometry:window.fireStudyState.geometryCount,texture:window.fireStudyState.textureCount})));}
 if(memories.slice(1).some(m=>m.geometry!==memories[0].geometry||m.texture!==memories[0].texture))errors.push('Variant switching leaked GPU resources');
 const report={quick,cases,captures,memories,errors};fs.writeFileSync(new URL(quick?'quick-review.json':'browser-review.json',dir),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:cases.length,captures:captures.length,memories,errors}));if(errors.length)process.exitCode=1;
}finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',dir),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
