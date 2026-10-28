import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.BEAR_REVIEW_BASE||'http://127.0.0.1:4478',out=path.resolve(process.env.BEAR_REVIEW_OUTPUT||'artifacts/bear/integration-review'),portraitOnly=process.argv.includes('--portraits-only'),packaged=process.argv.includes('--packaged');fs.mkdirSync(out,{recursive:true});
let server,browser,page,identity,port;const errors=[],checks=[];
try{
 server=await chromium.launchServer({channel:'msedge',headless:true});port=Number(new URL(server.wsEndpoint()).port);identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`$p=Get-Process -Id ${server.process().pid}; @{pid=$p.Id;creationFileTime=$p.StartTime.ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(path.join(out,'browser-helper.json'),JSON.stringify({...identity,port,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',purpose:'Disposable bear integration and portrait review',startedAt:new Date().toISOString(),endCondition:'Review completes or fails',stopMethod:'Playwright close in finally'},null,2));
 browser=await chromium.connect(server.wsEndpoint());const context=await browser.newContext({viewport:{width:1380,height:980},deviceScaleFactor:1});page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const open=async(file,ready,params={})=>{const url=new URL((packaged?'/packaged':'')+'/tactics/'+file,base);Object.entries({animal:'bear',outfit:'normal',weapon:'rifle',view:'three',scale:'close',...params}).forEach(([k,v])=>url.searchParams.set(k,v));console.log('Opening '+file+' '+params.outfit);const before=errors.length;await page.goto(url.href);await page.waitForFunction(ready,null,{timeout:60000});assert.equal(errors.length,before,JSON.stringify(errors.slice(before)));};
 const shot=async(name,selector='canvas')=>{await page.locator(selector).first().screenshot({path:path.join(out,name+'.png')});checks.push({name,url:page.url()});console.log('Reviewed '+name);};
 if(portraitOnly){
  assert.ok(!packaged);await open('bear-worker.html',()=>window.bearStudy?.ready);
  for(const outfit of ['normal','red-hats']){
   const png=await page.evaluate(async outfit=>{await window.bearStudy.set({outfit,pose:'neutral',weapon:'hands',reference:false,grid:false});const T=await import('./vendor/three.module.js'),{renderer,scene}=window.bearStudy,camera=new T.OrthographicCamera(-.925,.925,.925,-.925,.01,30),focus=new T.Vector3(0,.84,0);camera.position.set(5.54,.84,2.30);camera.lookAt(focus);camera.updateProjectionMatrix();renderer.setPixelRatio(1);renderer.setSize(256,256,false);renderer.setViewport(0,0,256,256);renderer.setScissorTest(false);renderer.setClearColor(0,0);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},outfit);
   const file=path.resolve('dist/assets/characters/'+(outfit==='red-hats'?'red-hats/':'')+'bear-idle.png');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.from(png.split(',')[1],'base64'));checks.push({name:'portrait-'+outfit,file});
  }
 }else if(process.argv.includes('--keyframes-only')||process.argv.includes('--battle-only')){
  if(!process.argv.includes('--battle-only'))for(const outfit of ['normal','red-hats']){
   await open('painted-fire-study.html',()=>window.fireStudyReady,{outfit,focus:'target',weapon:'shotgun',scale:'full'});await page.evaluate(()=>window.fireStudy.seek(1.55));await shot('burn-'+outfit);
   await open('tank-blast-study.html',()=>window.tankStudyReady,{outfit,focus:'blast',scale:'full'});await page.evaluate(()=>window.tankStudy.seek(.55));await shot('tank-'+outfit);
  }
  await open('battle-3d.html',()=>window.battle3d?.renderer?.models.size>=4&&document.querySelector('#sector-loading')?.hidden,{study:'bear'});await page.waitForFunction(()=>{const b=window.battle3d,u=b.state.units[0],m=b.renderer.models.get(u.id);return m?.weapon===u.weapon&&m?.signature;},null,{timeout:30000});await page.screenshot({path:path.join(out,'battle.png')});const result=await page.evaluate(()=>({name:'battle-visible',models:[...window.battle3d.renderer.models].map(([id,m])=>({id,weapon:m.weapon,visible:m.equipment?.root.visible,posed:!!m.signature,contacts:m.worker.diagnostics().contacts})),diagnostics:window.battle3d.renderer.diagnostics,portraits:[...document.querySelectorAll('img[src*="bear-idle"]')].map(i=>i.complete&&i.naturalWidth>0)}));assert.deepEqual(result.diagnostics,[]);assert.ok(result.portraits.every(Boolean));checks.push(result);
 }else{
  await open('bear-animation-study.html',()=>document.querySelectorAll('#studies a').length===17);assert.equal(await page.locator('#studies a').count(),17);await page.screenshot({path:path.join(out,'index.png')});
  if(!process.argv.includes('--dialogue-only')){if(!process.argv.includes('--editor-only')){if(!process.argv.includes('--studies-only')){await open('armed-idle-study.html',()=>window.idleStudyReady);
  const weapons=await page.locator('#weapon option').evaluateAll(o=>o.map(v=>v.value));assert.equal(weapons.length,13);
  for(const outfit of ['normal','red-hats'])for(const weapon of weapons){await page.evaluate(async v=>{await window.idleStudy.set(v);window.idleStudy.seek(4.2);},{animal:'bear',outfit,weapon,mood:'guard'});const state=await page.evaluate(()=>window.idleStudyState);assert.equal(state.animal,'bear');checks.push({name:'idle-'+outfit+'-'+weapon,state});if(['rifle','hmg','rpg','flamethrower'].includes(weapon))await shot('idle-'+outfit+'-'+weapon);}}
  const jobs=[
   ['animal-motion.html',()=>window.animalMotionReady,'animalMotion',3,'walk-aim',{}],
   ['animal-casualty-review.html',()=>window.casualtyStudy?.ready,null,0,'stances',{}],
   ['crawl-study.html',()=>window.crawlStudy?.ready,'crawlStudy',1.3,'crawl',{weapon:'hmg',view:'side'}],
   ['grenade-throw-study.html',()=>window.grenadeStudyReady,'grenadeStudy',2.3,'grenade',{}],
   ['roof-mantle-study.html',()=>window.roofMantleStudy?.ready,'roofMantleStudy',.66,'roof-mantle',{weapon:'rpg'}],
   ['roof-mantle-study.html',()=>window.roofMantleStudy?.ready,'roofMantleStudy',.81,'cliff-mantle',{weapon:'hmg',surface:'cliff'}],
   ['ledge-descent-study.html',()=>window.ledgeDescentStudy?.ready,'ledgeDescentStudy',.50,'descent',{weapon:'pistol',surface:'cliff'}],
   ['ladder-journey-study.html',()=>window.ladderJourneyStudy?.ready,'ladderJourneyStudy',.58,'iron-ladder',{weapon:'flamethrower',ladder:'tower'}],
   ['ladder-journey-study.html',()=>window.ladderJourneyStudy?.ready,'ladderJourneyStudy',.72,'wood-ladder',{weapon:'grenade',ladder:'wooden'}],
   ['painted-fire-study.html',()=>window.fireStudyReady,'fireStudy',4.1,'burn',{weapon:'shotgun',focus:'target'}],
   ['tank-blast-study.html',()=>window.tankStudyReady,'tankStudy',1.6,'tank',{weapon:'flamethrower'}],
   ['fatal-head-study.html',()=>window.fatalHeadStudy?.ready,'fatalHeadStudy',1.5,'fatal',{weapon:'rpg'}],
   ['horse-chair-study.html',()=>window.horseChairReady,'horseChairStudy',2.5,'chair',{chair:'wingback',paused:''}],
   ['speaking-heads.html',()=>window.speakingHeadsReady,'speakingHeads',null,'speaking',{jaw:'6',lit:'1',scale:'portrait'}]
  ];
  for(const outfit of ['normal','red-hats'])for(const [file,ready,api,t,name,params]of jobs){await open(file,ready,{...params,outfit});if(api&&t!==null)await page.evaluate(async({api,t})=>{const s=window[api];if(s.seek)s.seek(t);else await s.set({time:t,playing:false});},{api,t});await shot(name+'-'+outfit);if(name==='speaking'){await page.evaluate(()=>window.speakingHeads.set({jaw:0,view:'side'}));await shot('speaking-closed-'+outfit);}}
  await open('battle-3d.html',()=>window.battle3d?.state?.units?.length>0,{study:'bear'});
  await page.waitForFunction(()=>document.querySelectorAll('img[src*="bear-idle"]').length>=4,null,{timeout:30000});
  await page.waitForFunction(()=>window.battle3d.renderer.models.size>=4,null,{timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#sector-loading')?.hidden,null,{timeout:60000});
  const battle=await page.evaluate(()=>({units:window.battle3d.state.units.map(u=>({id:u.id,species:u.species,weapon:u.weapon,outfit:u.outfit})),text:document.body.innerText,portraits:[...document.querySelectorAll('img[src*="bear-idle"]')].map(i=>({src:i.src,loaded:i.complete&&i.naturalWidth>0}))}));assert.ok(battle.units.every(u=>u.species==='bear'));assert.ok(battle.portraits.every(p=>p.loaded));checks.push({name:'battle-wiring',...battle});await page.screenshot({path:path.join(out,'battle.png')});}
  await open('editor-3d.html',()=>window.editor3d?.document&&!window.editor3d.loading,{study:'climbing'});
  assert.ok(await page.locator('#unit-species option[value=bear]').count());
  await page.evaluate(async()=>{const {bearRosterFixture}=await import('./bear-roster-fixture.js');await window.editor3d.open(JSON.stringify(bearRosterFixture()));});
  const edit=await page.evaluate(()=>window.editor3d.apply({tool:'guard',start:{x:28,y:24,z:0},options:{species:'bear',outfit:'red-hats',weapon:'pistol'}}));assert.ok(edit.ok,edit.error);
  const exported=await page.evaluate(()=>JSON.parse(window.editor3d.export()));assert.equal(exported.guards.length,14);assert.ok(exported.guards.every(u=>u.species==='bear'));assert.deepEqual(await page.evaluate(()=>window.editor3d.validate()),[]);
  await page.locator('#quick-save-map').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved in this browser'),null,{timeout:30000});await page.locator('#settings-button').click();await page.locator('#load-map').click();await page.waitForFunction(()=>window.editor3d?.document?.map.guards.length===14&&!window.editor3d.loading,null,{timeout:60000});await page.locator('#close-settings').click();await page.screenshot({path:path.join(out,'editor.png')});
  const popupPromise=context.waitForEvent('page');await page.locator('#quick-playtest').click();const popup=await popupPromise;popup.on('pageerror',e=>errors.push(String(e)));popup.on('console',m=>{if(m.type()==='error')errors.push(m.text());});popup.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});await popup.waitForFunction(()=>window.battle3d?.renderer?.models.size>=4&&document.querySelector('#sector-loading')?.hidden,null,{timeout:120000});const transfer=await popup.evaluate(()=>({units:window.battle3d.state.units.map(u=>({species:u.species,outfit:u.outfit,weapon:u.weapon})),models:window.battle3d.renderer.models.size,diagnostics:window.battle3d.renderer.diagnostics}));assert.ok(transfer.units.every(u=>u.species==='bear'));assert.deepEqual(transfer.diagnostics,[]);checks.push({name:'editor-save-load-playtest',...transfer});await popup.screenshot({path:path.join(out,'playtest.png')});await popup.close();}
  await open('bear-animation-study.html',()=>document.querySelectorAll('#studies a').length===17);
  await page.evaluate(async()=>{const {DialoguePortrait}=await import('./dialogue-portrait.js'),host=document.createElement('div');host.id='portrait-check';Object.assign(host.style,{width:'256px',height:'256px',background:'#87957d'});document.querySelector('main').prepend(host);window.bearPortraitCheck=new DialoguePortrait(host);});
  for(const outfit of ['normal','red-hats']){
   const result=await page.evaluate(async outfit=>{const p=window.bearPortraitCheck;await p.setCharacter({species:'bear',outfit});if(!p.model?.speech)throw Error('Bear dialogue fell back instead of loading the speaking rig');p.draw(.9,true);return {outfit,speaking:!!p.model.speech,resources:p.resources};},outfit);checks.push({name:'dialogue-'+outfit,...result});await shot('dialogue-'+outfit,'#portrait-check');
  }
  const disposal=await page.evaluate(()=>{const p=window.bearPortraitCheck;p.dispose();return p.resources;});assert.equal(disposal.renderer,0);checks.push({name:'dialogue-disposed',resources:disposal});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors,out}));await context.close();
}catch(e){await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(e),errors},null,2));throw e;}
finally{await browser?.close();await server?.close();if(identity){let exited=false;try{process.kill(identity.pid,0);}catch{exited=true;}const portReleased=!execFileSync('netstat',['-ano','-p','tcp'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/).some(l=>l.includes('LISTENING')&&new RegExp(`:${port}\\s`).test(l));fs.writeFileSync(path.join(out,'browser-stopped.json'),JSON.stringify({...identity,stoppedAt:new Date().toISOString(),exited,portReleased},null,2));assert.ok(exited&&portReleased,'Review browser exited and released its port');}}
