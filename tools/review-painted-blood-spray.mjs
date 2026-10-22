import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),sharp=require(process.env.SHARP_PATH||'sharp'),out=path.resolve(process.env.BLOOD_REVIEW_OUTPUT||'artifacts/painted-blood/review'),base='http://127.0.0.1:4477';fs.mkdirSync(out,{recursive:true});
let server,browser,page,identity,port;const errors=[],captures=[];
async function capture(name,settings){const state=await page.evaluate(v=>window.bloodSprayStudy.set(v),settings);assert.ok(state.capacity<=18);await page.locator('#viewport').screenshot({path:path.join(out,name+'.png')});captures.push({name,...state});}
try{
 server=await chromium.launchServer({channel:'msedge',headless:true});const pid=server.process().pid;port=Number(new URL(server.wsEndpoint()).port);identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`$p=Get-Process -Id ${pid}; @{pid=$p.Id;creationFileTime=$p.StartTime.ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(path.join(out,'browser-helper.json'),JSON.stringify({...identity,port,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',purpose:'Disposable painted blood spray browser review and sprite bake',startedAt:new Date().toISOString(),endCondition:'Review/export completes or fails',stopMethod:'Playwright close in finally'},null,2));
 browser=await chromium.connect(server.wsEndpoint());const context=await browser.newContext({viewport:{width:1450,height:1000},deviceScaleFactor:1});page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'/tactics/painted-blood-spray-study.html?paused');await page.waitForFunction(()=>window.bloodSprayStudy?.ready||document.querySelector('#error')?.textContent,null,{timeout:90000});assert.ok(await page.evaluate(()=>window.bloodSprayStudy?.ready),JSON.stringify(errors));
 const standard={reference:'horse',background:'grass',view:'front',motion:'full',strength:1,axis:false};
 for(const t of (process.env.BLOOD_REVIEW_FAST==='1'?[.06,.23]:[.02,.06,.12,.23,.35,.48]))await capture('horse-grass-'+Math.round(t*1000),{...standard,time:t});
 if(process.env.BLOOD_REVIEW_FAST!=='1'){
  for(const background of ['snow','room','red'])for(const time of [.06,.23])await capture('horse-'+background+'-'+Math.round(time*1000),{...standard,background,time});
  for(const time of [.06,.23])await capture('hen-grass-'+Math.round(time*1000),{...standard,reference:'hen',time});
  for(const view of ['three','rear'])await capture('horse-'+view,{...standard,view,time:.09});
  for(const motion of ['reduced','still'])await capture('horse-'+motion,{...standard,motion,time:.06});
 }
 await capture('isolated',{...standard,reference:'none',time:.09,axis:true});
 const scrub=await page.evaluate(()=>{const e=document.querySelector('#time');e.value='.27';e.dispatchEvent(new Event('input',{bubbles:true}));return window.bloodSprayStudy.state.time;});assert.equal(scrub,.27,'Manual scrubbing retains the requested time');
 const resources=await page.evaluate(()=>{const s=window.bloodSprayStudy;s.set({reference:'horse',background:'grass',motion:'full',time:.12});const before=s.state.resources;for(let i=0;i<50;i++)s.set({strength:i%2?1.2:.7,motion:i%3?'full':'reduced',time:.12});s.set({strength:1,motion:'full',time:.12});return {before,after:s.state.resources};});assert.deepEqual(resources.after,resources.before,'Fifty reset/variant cycles retain bounded GPU resources');
 if(process.env.BLOOD_REVIEW_FAST!=='1'){
  await page.setViewportSize({width:390,height:844});await capture('phone',{...standard,time:.06});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.setViewportSize({width:1450,height:1000});
 }
 let flipbook;
 if(process.env.BLOOD_REVIEW_BAKE==='1'){
  const times=[0,.016,.033,.055,.083,.12,.17,.23,.29,.34,.38,.48];fs.mkdirSync(path.join(out,'frames'),{recursive:true});
  await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),{createPaintedBloodSpray}=await import('./painted-blood-spray.js'),study=window.bloodSprayStudy,scene=new T.Scene(),effect=createPaintedBloodSpray(study.effect().mesh.material.uniforms.map.value,{seed:231021}),camera=new T.OrthographicCamera(-.18,1.12,.35,-.95,.01,20);scene.add(effect.mesh);camera.position.z=5;camera.lookAt(0,0,0);camera.updateMatrixWorld(true);window.bloodBake={scene,effect,camera};study.renderer.setPixelRatio(1);study.renderer.setSize(256,256,false);study.renderer.setScissorTest(false);});
  const packed=[];
  try{for(let i=0;i<times.length;i++){
   const images=await page.evaluate(t=>{const {scene,effect,camera}=window.bloodBake,r=window.bloodSprayStudy.renderer;effect.update(t,camera);r.setClearColor(0x000000,0);r.render(scene,camera);const transparent=r.domElement.toDataURL('image/png');r.setClearColor(0xcbd0c1,1);r.render(scene,camera);return {transparent,preview:r.domElement.toDataURL('image/png')};},times[i]);
   const transparent=Buffer.from(images.transparent.split(',')[1],'base64'),tile=await sharp(transparent).resize(128,128).png().toBuffer(),raw=await sharp(tile).ensureAlpha().raw().toBuffer();let occupied=0;
   for(let y=0;y<128;y++)for(let x=0;x<128;x++){const a=raw[(y*128+x)*4+3];if(a)occupied++;if(x<2||y<2||x>125||y>125)assert.equal(a,0,'No blood is cut at the sprite-frame border');}
   assert.equal(occupied===0,i===0||i===times.length-1,'Only onset and final frames are empty');
   packed.push({input:tile,left:(i%4)*128,top:Math.floor(i/4)*128});fs.writeFileSync(path.join(out,'frames',String(i).padStart(2,'0')+'.png'),Buffer.from(images.preview.split(',')[1],'base64'));
  }}finally{await page.evaluate(()=>{window.bloodBake.effect.dispose();delete window.bloodBake;window.bloodSprayStudy.frame();});}
  const file='spray-flipbook-v1.png',assetDir=path.resolve('dist/assets/effects/painted-blood');await sharp({create:{width:512,height:384,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(packed).png().toFile(path.join(assetDir,file));
  flipbook={file,width:512,height:384,columns:4,rows:3,frameSize:128,times,duration:.48,interpolation:'Cross-fade neighboring frames using the recorded nonuniform times; first and last frames are transparent.',pivotPixels:[128*.18/1.3,128*.35/1.3],pivotConvention:'Pixels from top-left; same source/contact in every frame',quadWorldSize:[1.3,1.3],authoringBounds:{left:-.18,right:1.12,bottom:-.95,top:.35},sha256:createHash('sha256').update(fs.readFileSync(path.join(assetDir,file))).digest('hex'),bytes:fs.statSync(path.join(assetDir,file)).size,decodedBytesWithMipmaps:512*384*4*4/3};
  Object.assign(flipbook,{frameOrder:'row-major from top-left',loop:false,orientationLimit:'Flat bake includes downward fall in its authoring plane. Arbitrary pitched orientation rotates that fall; use the component motion for world-down gravity.'});
  const manifestFile=path.join(assetDir,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));manifest.flipbook=flipbook;fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 }
 if(process.env.BLOOD_REVIEW_PACKAGED==='1'){
  await page.goto(base+'/packaged/tactics/painted-blood-spray-study.html?paused');await page.waitForFunction(()=>window.bloodSprayStudy?.ready,null,{timeout:90000});await capture('packaged',{...standard,time:.06});assert.equal(createHash('sha256').update(fs.readFileSync(path.join(out,'horse-grass-60.png'))).digest('hex'),createHash('sha256').update(fs.readFileSync(path.join(out,'packaged.png'))).digest('hex'),'Source and packaged appearance match');
 }
 await page.evaluate(()=>window.bloodSprayStudy.dispose());assert.equal(await page.evaluate(()=>window.bloodSprayStudyDisposed),true);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({captures,resources,flipbook,errors},null,2));console.log(JSON.stringify({captures:captures.length,resources,flipbook,errors,out}));await context.close();
}catch(error){await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),errors},null,2));throw error;}
finally{await browser?.close();await server?.close();if(identity){let exited=false;try{process.kill(identity.pid,0);}catch{exited=true;}const portReleased=!execFileSync('netstat',['-ano','-p','tcp'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/).some(l=>l.includes('LISTENING')&&new RegExp(`:${port}\\s`).test(l));fs.writeFileSync(path.join(out,'browser-stopped.json'),JSON.stringify({...identity,stoppedAt:new Date().toISOString(),exited,portReleased},null,2));assert.ok(exited&&portReleased,'Review browser exited and released its port');}}
