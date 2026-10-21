import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=path.resolve(process.env.ARCH_REVIEW_OUTPUT||'artifacts/natural-rock-arches/review'),base=process.env.ARCH_REVIEW_URL||'http://127.0.0.1:4476';fs.mkdirSync(out,{recursive:true});
const server=await chromium.launchServer({channel:'msedge',headless:true}),pid=server.process().pid,port=Number(new URL(server.wsEndpoint()).port);
const identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`$p=Get-Process -Id ${pid}; @{pid=$p.Id;creationFileTime=$p.StartTime.ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
const record={...identity,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',purpose:'Disposable natural arch browser/visual review',port,startedAt:new Date().toISOString(),endCondition:'Review completes or fails',stopMethod:'Playwright close in finally'};fs.writeFileSync(path.join(out,'browser-helper.json'),JSON.stringify(record,null,2));
let browser,page;const errors=[],captures=[],lifecycle=[];
async function capture(name,settings,shadow){
 let state=await page.evaluate(v=>window.naturalArchStudy.set(v),settings);
 if(shadow)state=await page.evaluate(async v=>{const study=window.naturalArchStudy,T=await import('./vendor/three.module.js');window.archDiagnosticMaterials=[];for(const a of study.arches){a.mesh.receiveShadow=v.receiveShadow!==false;if(v.shadowSide!==undefined){a.mesh.material.shadowSide=v.shadowSide;a.mesh.material.needsUpdate=true;}if(v.material){const material=v.material==='lit-white'?new T.MeshStandardMaterial({color:0xaaaaaa,roughness:1}):new T.MeshBasicMaterial({color:0xffffff,map:v.material==='unlit-texture'?a.mesh.material.map:null});a.mesh.material=material;window.archDiagnosticMaterials.push(material);}}study.scene.traverse(o=>{if(o.isDirectionalLight){if(v.normalBias!==undefined)o.shadow.normalBias=v.normalBias;if(v.bias!==undefined)o.shadow.bias=v.bias;}});study.renderer.render(study.scene,study.camera);return study.state;},shadow);
 assert.ok(state.minClearance>=1.90,'Passage tile centres retain standing clearance');
 assert.equal(await page.evaluate(()=>window.naturalArchStudy.actors.length),settings.arch==='pair'?4:2);
 for(const layout of state.layouts){
  assert.equal(layout.topLevel+1,layout.kind==='large'?4:2,'Ground counts as layer one');
  if(['front','game','side'].includes(settings.view)&&settings.guides)assert.equal(await page.getByText('Layer '+(layout.topLevel+1)+' · top',{exact:true}).isVisible(),true,'The ruler labels the correct top layer');
 }
 await page.screenshot({path:path.join(out,name+'.png')});await page.locator('#viewport').screenshot({path:path.join(out,name+'-scene.png')});captures.push({name,...state,...(shadow?{shadow}:{})});
 if(shadow)await page.evaluate(()=>window.archDiagnosticMaterials.forEach(m=>m.dispose()));
}
async function checkLateResources(context,failCharacter=false){
 const probe=await context.newPage();let release,requested;
 const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>requested=resolve);
 await probe.route('**/natural-rock-arches/paint-atlas-v1.webp',async route=>{requested();await gate;await route.continue();});
 if(failCharacter)await probe.route('**/donkey-10k-data.json',route=>route.fulfill({status:503,body:'Deliberate character-load failure'}));
 const navigation=probe.goto(base+'/tactics/natural-arches-study.html');
 try{
  await started;
  const actorPaint=await probe.evaluate(async()=>{
   const T=await import('./vendor/three.module.js'),{ANIMAL_MOTION_CATALOG}=await import('./animal-motion-catalog.js'),original=T.Texture.prototype.dispose;
   window.archDisposedTextures=[];T.Texture.prototype.dispose=function(){window.archDisposedTextures.push(this.image?.currentSrc||this.image?.src||'');return original.call(this);};
   return new URL(ANIMAL_MOTION_CATALOG.find(p=>p.id==='donkey').paint,location.href).href;
  });
  if(!failCharacter)await probe.evaluate(()=>dispatchEvent(new Event('pagehide')));
  release();await navigation;
  await probe.waitForFunction(({failCharacter,actorPaint})=>window.naturalArchStudyDisposed&&window.archDisposedTextures.some(src=>failCharacter?src===actorPaint:src.includes('/natural-rock-arches/paint-atlas-v1.webp')),{failCharacter,actorPaint});
  assert.equal(await probe.evaluate(()=>!!window.naturalArchStudy),false,'Failed or disposed initialization cannot publish a new live study');
  lifecycle.push({case:failCharacter?'Texture released after paired mesh failure':'Late atlas released after disposal',passed:true});
 }finally{release();await navigation.catch(()=>{});await probe.close();}
}
try{
 browser=await chromium.connect(server.wsEndpoint());const context=await browser.newContext({viewport:{width:1500,height:1050},deviceScaleFactor:1,reducedMotion:'reduce'});page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'/tactics/natural-arches-study.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.naturalArchStudy?.ready||document.querySelector('#error')?.textContent,null,{timeout:90000});assert.ok(await page.evaluate(()=>window.naturalArchStudy?.ready),'Study ready: '+JSON.stringify(errors));
 if(process.env.ARCH_REVIEW_SHADOW==='1'){
  const settings={arch:'large',view:'front',scale:'fit',detail:'runtime',grid:true,guides:false,road:false};
  for(const [name,shadow]of [['reference',{}],['no-receive',{receiveShadow:false}],['zero-normal-bias',{normalBias:0}],['depth-bias',{normalBias:0,bias:-.00015}],['unlit-texture',{receiveShadow:false,material:'unlit-texture'}],['unlit-white',{receiveShadow:false,material:'unlit-white'}],['lit-white',{receiveShadow:false,material:'lit-white'}],['front-casters',{shadowSide:0,normalBias:.035,bias:0}],['double-casters',{shadowSide:2,normalBias:.035,bias:0}],['mid-bias',{shadowSide:0,normalBias:.035,bias:-.0008}],['large-bias',{shadowSide:0,normalBias:.035,bias:-.0015}]])await capture('shadow-'+name,settings,shadow);
 }else{
 for(const arch of ['large','small'])for(const view of (process.env.ARCH_REVIEW_FAST==='1'?['game','front']:['front','side','top','game','rear','under']))await capture(arch+'-'+view,{arch,view,scale:'fit',detail:'runtime',grid:true,guides:true,road:true,banks:false,grey:false,wire:false});
 await capture('matching-pair',{arch:'pair',view:'game',scale:'fit',grid:true,guides:false,road:false,banks:false});
 if(process.env.ARCH_REVIEW_FAST!=='1'){
  await capture('large-road-gameplay',{arch:'large',view:'game',scale:'game',grid:true,guides:true,road:true});
  await capture('large-connections',{arch:'large',view:'side',scale:'fit',grid:true,guides:true,road:false,banks:true});
  await capture('large-grey',{arch:'large',view:'game',scale:'fit',grid:true,guides:false,banks:false,grey:true});
  await capture('large-author',{arch:'large',view:'game',scale:'fit',detail:'author',grey:false});
  await capture('small-runtime-clean',{arch:'small',view:'game',scale:'fit',detail:'runtime',road:false,grid:false,guides:false});
  await page.setViewportSize({width:390,height:844});await capture('small-phone',{arch:'small',view:'game',scale:'fit',detail:'runtime',grid:true,guides:false});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Phone has no horizontal overflow');
  await page.setViewportSize({width:1500,height:1050});
 }
 if(process.env.ARCH_REVIEW_PACKAGED==='1'){
  await page.goto(base+'/packaged/tactics/natural-arches-study.html');await page.waitForFunction(()=>window.naturalArchStudy?.ready,null,{timeout:90000});await capture('packaged-large',{arch:'large',view:'game',scale:'fit',grid:true,guides:true});
 }
 }
 await page.evaluate(()=>window.naturalArchStudy.dispose());assert.equal(await page.evaluate(()=>window.naturalArchStudyDisposed),true);
 await checkLateResources(context);await checkLateResources(context,true);
 await context.close();assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({captures,lifecycle,errors},null,2));console.log(JSON.stringify({captures:captures.length,lifecycle,errors,out}));
}catch(error){await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),errors},null,2));throw error;}
finally{
 await browser?.close();await server.close();let exited=false;try{process.kill(pid,0);}catch{exited=true;}
 const portReleased=!execFileSync('netstat',['-ano','-p','tcp'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/).some(l=>l.includes('LISTENING')&&new RegExp(`:${port}\\s`).test(l));fs.writeFileSync(path.join(out,'browser-stopped.json'),JSON.stringify({...identity,stoppedAt:new Date().toISOString(),exited,portReleased},null,2));assert.ok(exited&&portReleased,'Disposable browser exited and released its port');
}
