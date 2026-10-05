import fs from 'node:fs';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),directory=new URL('../artifacts/ground-scorch/',import.meta.url);fs.mkdirSync(directory,{recursive:true});
const url=process.argv.find(a=>a.startsWith('http'))||'http://127.0.0.1:4473/study/tactics/tank-blast-study.html?paused=&revision=scorch';
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],cases=[],captures=[],checks={};let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));fs.writeFileSync(new URL('helper.json',directory),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'ground scorch study',purpose:'Ground scorch visual, mask and resource checks',end:'After captures; browser.close in finally'},null,2));
 const page=await browser.newPage({viewport:{width:1100,height:900}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(url);await page.waitForFunction(()=>window.tankStudyReady,{},{timeout:60000});
 for(const terrain of ['plain','grass','sand','concrete'])for(const scene of ['open','water'])for(const view of ['three','rear','front','side'])for(const scale of ['full','game']){
  const options={terrain,scene,view,scale,focus:'blast',scorch:true,effects:true};const frames=await page.evaluate(async options=>{const f=window.tankStudy;await f.set(options);return [0,2.15,3,4.5,5.4,0,5.4].map(t=>{const d=f.seek(t);return {time:t,...d.surroundings,visible:f.effects.scorch.group.visible};});},options);
  if(frames.some(s=>s.time===0&&(s.visible||s.scorchedCells!==0)||s.time===5.4&&(!s.visible||s.scorchedCells!==(scene==='water'?66:81)||s.visibleFireCells!==0)))errors.push('Unexpected mark state '+JSON.stringify(options));cases.push(options);
  if(view==='three'&&scale==='full'){const name=terrain+'-'+scene;await page.locator('#viewport').screenshot({path:fileURLToPath(new URL(name+'.png',directory))});captures.push(name);}
 }
 await page.evaluate(async()=>{const f=window.tankStudy;await f.set({terrain:'grass',scene:'water',view:'three',scale:'full',focus:'blast',scorch:true});f.seek(5.4);});
 checks.rasterMask=await page.evaluate(async()=>{
  const f=window.tankStudy,{renderer:r,camera:c,scene}=f,gl=r.getContext(),fx=f.effects.scorch,cells=fx.batches.flatMap(b=>b.tiles),allowed=new Set(cells.map(p=>p.x+','+p.z));
  c.position.set(0,20,0);c.up.set(0,0,-1);c.lookAt(0,0,0);Object.assign(c,{left:-6,right:6,top:6,bottom:-6});c.updateProjectionMatrix();
  const read=()=>{r.render(scene,c);const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,a=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,a);return {w,h,a};};
  fx.group.visible=true;const on=read();fx.group.visible=false;const off=read();let changed=0,outside=0;
  for(let y=0;y<on.h;y++)for(let x=0;x<on.w;x++){const i=(y*on.w+x)*4;if(Math.max(...[0,1,2].map(k=>Math.abs(on.a[i+k]-off.a[i+k])))>1){changed++;const wx=-6+(x+.5)/on.w*12,wz=6-(y+.5)/on.h*12;if(!allowed.has(Math.floor(wx+.5)+','+Math.floor(wz+.5)))outside++;}}
  c.up.set(0,1,0);fx.group.visible=true;f.draw();return {changedPixels:changed,outsideBurnedCells:outside};
 });
 if(checks.rasterMask.changedPixels<1000||checks.rasterMask.outsideBurnedCells!==0)errors.push('Raster mask failed '+JSON.stringify(checks.rasterMask));
 checks.memories=[];for(let i=0;i<5;i++){await page.evaluate(async()=>{const f=window.tankStudy;await f.set({scene:'open'});f.seek(5.4);await f.set({scene:'water'});f.seek(5.4);});checks.memories.push(await page.evaluate(()=>({geometries:window.tankStudyState.geometryCount,textures:window.tankStudyState.textureCount})));}
 if(checks.memories.some(v=>JSON.stringify(v)!==JSON.stringify(checks.memories[0])))errors.push('GPU resource growth');
 const report={cases,captures,checks,errors};fs.writeFileSync(new URL('review.json',directory),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:cases.length,captures:captures.length,checks,errors}));if(errors.length)process.exitCode=1;
}finally{await browser.close();fs.writeFileSync(new URL('closed.json',directory),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
