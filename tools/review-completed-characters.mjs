import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const mode=process.argv.find(v=>v.startsWith('--'))?.slice(2)||'models',packaged=process.env.CHARACTER_REVIEW_PACKAGED==='1';
const base=process.env.CHARACTER_REVIEW_BASE||'http://127.0.0.1:4478',out=path.resolve(process.env.CHARACTER_REVIEW_OUTPUT||'artifacts/completed-characters/'+mode+(packaged?'-packaged':''));fs.mkdirSync(out,{recursive:true});
const species=(process.env.CHARACTER_REVIEW_ANIMALS||'bull,rabbit,dog').split(','),errors=[],checks=[];let server,browser,page,identity,port;
function record(check){checks.push(check);fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({mode,packaged,checks,errors},null,2));}
try{
 server=await chromium.launchServer({channel:'msedge',headless:true});port=Number(new URL(server.wsEndpoint()).port);
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`$p=Get-Process -Id ${server.process().pid}; @{pid=$p.Id;creationFileTime=$p.StartTime.ToFileTimeUtc().ToString();executable=$p.Path}|ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(path.join(out,'browser-helper.json'),JSON.stringify({...identity,port,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',purpose:'Disposable bull, rabbit and dog '+mode+' review',startedAt:new Date().toISOString(),endCondition:'Review completes or fails',stopMethod:'Playwright close in finally'},null,2));
 browser=await chromium.connect(server.wsEndpoint());const context=await browser.newContext({viewport:{width:1450,height:1020},deviceScaleFactor:1});page=await context.newPage();
 function observe(p){p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});}observe(page);
 async function open(animal,file,ready,params={},prefix=packaged?'/packaged':''){
  const url=new URL(prefix+'/tactics/'+file,base);Object.entries({animal,outfit:'normal',weapon:'rifle',view:'three',scale:'close',...params}).forEach(([k,v])=>url.searchParams.set(k,v));
  console.log('Review '+animal+' '+file);await page.goto(url.href);await page.waitForFunction(ready,null,{timeout:90000});assert.deepEqual(errors,[]);
 }
 async function shot(name,selector='canvas'){const image=await page.locator(selector).first().screenshot({path:path.join(out,name+'.png')});record({name,url:page.url(),sha256:createHash('sha256').update(image).digest('hex')});return image;}
 if(mode==='models')for(const animal of species){
  await open(animal,'character-fitting-study.html',()=>window.characterFitting?.ready);
  for(const mesh of ['author','10k'])for(const view of ['front','side','back','three','top','game']){
   const d=await page.evaluate(v=>window.characterFitting.set(v),{mesh,view,outfit:'pair',reference:true,pose:'neutral'});assert.equal(d.actors.length,3);record({name:animal+'-'+mesh+'-'+view,diagnostics:d});await shot(animal+'-'+mesh+'-'+view,'#viewport');
  }
  for(const pose of ['carry','walk','kneel','prone','crawl'])for(const weapon of ['rifle','hmg','rpg','flamethrower']){
   const d=await page.evaluate(v=>window.characterFitting.set(v),{mesh:'10k',pose,weapon,time:1.3,view:['prone','crawl'].includes(pose)?'side':'three',outfit:'pair',reference:false});for(const a of d.actors)for(const c of a.contacts)assert.ok(c.error<1e-6,animal+' '+pose+' '+weapon+' palm');await shot(animal+'-'+pose+'-'+weapon,'#viewport');
  }
  await page.evaluate(()=>window.characterFitting.set({pose:'carry',weapon:'rifle',outfit:'pair',reference:false,scale:'game',view:'game'}));await shot(animal+'-gameplay','#viewport');
  const before=await page.evaluate(()=>window.characterFitting.diagnostics().resources);
  for(let i=0;i<3;i++)for(const outfit of ['normal','red-hats','pair'])await page.evaluate(outfit=>window.characterFitting.set({outfit}),outfit);
  assert.deepEqual(await page.evaluate(()=>window.characterFitting.diagnostics().resources),before);record({name:animal+'-bounded-resources',resources:before});
 }
 else if(mode==='details')for(const animal of species){
  await open(animal,'character-fitting-study.html',()=>window.characterFitting?.ready);
  for(const [name,values]of [['paint',{outfit:'pair',reference:true,pose:'neutral',view:'three'}],['grey',{outfit:'pair',reference:true,grey:true,view:'back'}],['wire',{outfit:'normal',reference:false,grey:true,wire:true,view:'side'}],['coverage',{grey:false,wire:false,coverage:true,view:'three'}]]){const d=await page.evaluate(v=>window.characterFitting.set(v),values);assert.equal(d.animal,animal);await shot(animal+'-'+name,'#viewport');}
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.characterFitting.set({outfit:'normal',reference:false,scale:'close',coverage:false}));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(animal+'-phone','#viewport');await page.setViewportSize({width:1450,height:1020});
  await page.evaluate(()=>window.characterFitting.dispose());assert.ok(await page.evaluate(()=>window.characterFittingDisposed));
 }
 else if(mode==='seats')for(const animal of species)for(const outfit of ['normal','red-hats']){
  await open(animal,'horse-chair-study.html',()=>window.horseChairReady,{outfit,paused:''});
  for(const chair of ['wingback','wood','metal','desk'])for(const time of [3.8,6.25,8.5]){
   const d=await page.evaluate(v=>{window.horseChairStudy.set(v);return window.horseChairStudy.motion.diagnostics();},{chair,time,playing:false});
   assert.ok(d.feet.every(f=>Math.abs(f.minY)<.001));if(time===3.8)assert.ok(d.seatSupport);for(const h of d.hands)if(h.contact)assert.ok(Math.hypot(...h.target.map((v,i)=>v-h.palm[i]))<1e-5);
   record({name:animal+'-'+outfit+'-'+chair+'-'+time,phase:d.phase,seatSupport:d.seatSupport});if(time===3.8)await shot(animal+'-'+outfit+'-'+chair);
  }
 }
 else if(mode==='portraits')for(const animal of species){
  assert.ok(!packaged);await open(animal,'character-fitting-study.html',()=>window.characterFitting?.ready);
  for(const outfit of ['normal','red-hats']){
   const png=await page.evaluate(async outfit=>{await window.characterFitting.set({outfit,pose:'neutral',weapon:'hands',reference:false,grid:false});const T=await import('./vendor/three.module.js'),{renderer,scene}=window.characterFitting,camera=new T.OrthographicCamera(-.925,.925,.925,-.925,.01,30),focus=new T.Vector3(0,.84,0);camera.position.set(5.54,.84,2.30);camera.lookAt(focus);camera.updateProjectionMatrix();renderer.setPixelRatio(1);renderer.setSize(256,256,false);renderer.setViewport(0,0,256,256);renderer.setScissorTest(false);renderer.setClearColor(0,0);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},outfit);
   const file=path.resolve('dist/assets/characters/'+(outfit==='red-hats'?'red-hats/':'')+animal+'-idle.png');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.from(png.split(',')[1],'base64'));record({name:animal+'-'+outfit,file});
  }
 }
 else if(mode==='motion')for(const animal of species){
  await open(animal,'armed-idle-study.html',()=>window.idleStudyReady);
  const weapons=await page.locator('#weapon option').evaluateAll(o=>o.map(v=>v.value));assert.equal(weapons.length,13);
  for(const outfit of ['normal','red-hats'])for(const weapon of weapons){await page.evaluate(async v=>{await window.idleStudy.set(v);window.idleStudy.seek(4.2);},{animal,outfit,weapon,mood:'guard'});assert.equal(await page.evaluate(()=>window.idleStudyState.animal),animal);record({name:animal+'-idle-'+outfit+'-'+weapon});if(['rifle','hmg','rpg','flamethrower'].includes(weapon))await shot(animal+'-idle-'+outfit+'-'+weapon);}
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
  for(const outfit of ['normal','red-hats'])for(const [file,ready,api,t,name,params]of jobs){await open(animal,file,ready,{...params,outfit});if(api&&t!==null)await page.evaluate(async({api,t})=>{const s=window[api];if(s.seek)s.seek(t);else await s.set({time:t,playing:false});},{api,t});await shot(animal+'-'+name+'-'+outfit);}
 }
 else if(mode==='integration')for(const animal of species){
  await open(animal,'character-animation-study.html',()=>document.querySelectorAll('#studies a').length===17);await shot(animal+'-index','main');
  await open(animal,'battle-3d.html',()=>window.battle3d?.renderer?.models.size>=17&&document.querySelector('#sector-loading')?.hidden,{study:'character-roster'});
  await page.waitForFunction(()=>{const b=window.battle3d;return b.state.units.every(u=>{const m=b.renderer.models.get(u.id);return m?.weapon===u.weapon&&m.signature;});},null,{timeout:60000});
  const battle=await page.evaluate(()=>({units:window.battle3d.state.units.map(u=>({species:u.species,outfit:u.outfit,weapon:u.weapon})),diagnostics:window.battle3d.renderer.diagnostics,models:[...window.battle3d.renderer.models.values()].map(m=>({species:m.profile.id,weapon:m.weapon})),portraits:[...document.querySelectorAll('img[src*="-idle.png"]')].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0}))}));assert.ok(battle.units.every(u=>u.species===animal));assert.deepEqual(battle.diagnostics,[]);assert.ok(battle.models.every(m=>m.species===animal));assert.ok(battle.portraits.length>=4&&battle.portraits.every(p=>p.loaded&&p.src.includes(animal+'-idle.png')));record({name:animal+'-battle',...battle});await page.screenshot({path:path.join(out,animal+'-battle.png')});
  await open(animal,'editor-3d.html',()=>window.editor3d?.document&&!window.editor3d.loading,{study:'climbing'});assert.equal(await page.locator('#unit-species option[value='+animal+']').count(),1);
  await page.evaluate(async animal=>{const {characterRosterFixture}=await import('./character-roster-fixture.js');await window.editor3d.open(JSON.stringify(characterRosterFixture(animal)));},animal);
  const edit=await page.evaluate(animal=>window.editor3d.apply({tool:'guard',start:{x:28,y:24,z:0},options:{species:animal,outfit:'red-hats',weapon:'pistol'}}),animal);assert.ok(edit.ok,edit.error);assert.deepEqual(await page.evaluate(()=>window.editor3d.validate()),[]);
  await page.locator('#quick-save-map').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved in this browser'));
  await page.locator('#settings-button').click();await page.evaluate(()=>window.beforeCharacterReload=window.editor3d.document);await page.locator('#load-map').click();await page.waitForFunction(()=>window.editor3d.document!==window.beforeCharacterReload&&window.editor3d.document.map.guards.length===14&&!window.editor3d.loading,null,{timeout:90000});await page.locator('#close-settings').click();
  record({name:animal+'-reloaded',status:await page.locator('#status').textContent(),disabled:await page.locator('#playtest').isDisabled()});const popupPromise=page.waitForEvent('popup',{timeout:120000});await page.locator('#quick-playtest').click();console.log('Playtest click: '+await page.locator('#status').textContent());const popup=await popupPromise;observe(popup);await popup.waitForFunction(()=>window.battle3d?.renderer?.models.size>=18&&document.querySelector('#sector-loading')?.hidden,null,{timeout:120000});
  const transfer=await popup.evaluate(()=>({units:window.battle3d.state.units.map(u=>({species:u.species,outfit:u.outfit,weapon:u.weapon})),diagnostics:window.battle3d.renderer.diagnostics}));assert.ok(transfer.units.every(u=>u.species===animal));assert.deepEqual(transfer.diagnostics,[]);record({name:animal+'-save-load-playtest',...transfer});await popup.screenshot({path:path.join(out,animal+'-playtest.png')});await popup.close();
  await open(animal,'character-animation-study.html',()=>document.querySelector('#studies a'));
  await page.evaluate(async()=>{const {DialoguePortrait}=await import('./dialogue-portrait.js'),host=document.createElement('div');host.id='portrait-check';Object.assign(host.style,{width:'256px',height:'256px',background:'#87957d'});document.querySelector('main').prepend(host);window.portraitCheck=new DialoguePortrait(host);});
  for(const outfit of ['normal','red-hats']){const result=await page.evaluate(async({animal,outfit})=>{const p=window.portraitCheck;await p.setCharacter({species:animal,outfit});if(!p.model?.speech)throw Error('Dialogue fallback');p.draw(.9,true);return {outfit,speaking:!!p.model.speech,resources:p.resources};},{animal,outfit});record({name:animal+'-dialogue-'+outfit,...result});await shot(animal+'-dialogue-'+outfit,'#portrait-check');}
  assert.equal(await page.evaluate(()=>{window.portraitCheck.dispose();return window.portraitCheck.resources.renderer;}),0);
 }
 else if(mode==='package')for(const animal of species)for(const [name,values]of [['pair',{outfit:'pair',pose:'neutral',reference:true}],['crawl',{outfit:'pair',pose:'crawl',reference:false,time:1.3}],['rpg',{outfit:'red-hats',weapon:'rpg',pose:'carry',reference:false}],['author',{outfit:'normal',mesh:'author',view:'back',reference:false}]]){
  const hashes=[];for(const [version,prefix]of [['source',''],['packaged','/packaged']]){await open(animal,'character-fitting-study.html',()=>window.characterFitting?.ready,{},prefix);await page.evaluate(v=>window.characterFitting.set(v),values);const image=await shot(animal+'-'+name+'-'+version,'#viewport');hashes.push(createHash('sha256').update(image).digest('hex'));}assert.equal(hashes[0],hashes[1],animal+' '+name+' source/package pixels');
 }
 else throw Error('Unknown review mode '+mode);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({mode,packaged,checks:checks.length,errors,out}));await context.close();
}catch(e){await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(e),errors},null,2));throw e;}
finally{
 await browser?.close();await server?.close();
 if(identity){let exited=false;try{process.kill(identity.pid,0);}catch{exited=true;}const portReleased=!execFileSync('netstat',['-ano','-p','tcp'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/).some(l=>l.includes('LISTENING')&&new RegExp(`:${port}\\s`).test(l));fs.writeFileSync(path.join(out,'browser-stopped.json'),JSON.stringify({...identity,stoppedAt:new Date().toISOString(),exited,portReleased},null,2));assert.ok(exited&&portReleased,'Review browser exited and released its port');}
}
