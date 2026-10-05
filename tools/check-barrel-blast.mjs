import assert from 'node:assert/strict';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),out=new URL('../artifacts/barrel-blast-integration/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const origin=process.env.EDITOR_ORIGIN||'http://127.0.0.1:4364',browser=await chromium.launch({channel:'msedge',headless:true});let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('browser-helper.json',out),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',project:'AnimalFactory3D/game',purpose:'Disposable barrel study and elevated live breakup checks',start:new Date().toISOString(),port:null,expiry:'End of this command',stop:'browser.close in finally'},null,2));
 const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[],cases=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin+'/tactics/barrel-blast-study.html?paused=1');await page.waitForFunction(()=>window.barrelStudyReady,{},{timeout:60000});
 for(const skin of ['oxide','blue','ochre','creamSteel'])for(const orientation of ['upright','sideways'])for(const scene of ['open','water']){
  await page.selectOption('#skin',skin);await page.selectOption('#orientation',orientation);await page.selectOption('#scene',scene);
  const result=await page.evaluate(()=>{const a=barrelStudy.seek(.54),b=barrelStudy.seek(.7),c=barrelStudy.seek(4),d=barrelStudy.seek(0);return {a,b,c,d};});
  assert.equal(result.a.intactVisible,true);assert.equal(result.b.visibleFragments,8);assert.equal(result.b.surroundings.transientFragments,0);assert.equal(result.b.surroundings.fireCells,scene==='open'?81:66);assert.equal(result.c.visibleFragments,0);assert.equal(result.d.intactVisible,true);cases.push({skin,orientation,scene});
 }
 await page.selectOption('#skin','oxide');await page.selectOption('#orientation','upright');await page.selectOption('#scene','open');await page.selectOption('#focus','barrel');await page.selectOption('#scale','close');await page.uncheck('#effects');await page.evaluate(()=>barrelStudy.seek(.8));
 await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('approved-barrel-breakup.png',out))});
 const memory=await page.evaluate(()=>({g:barrelStudyState.geometryCount,t:barrelStudyState.textureCount}));
 for(let i=0;i<3;i++){await page.selectOption('#skin','blue');await page.selectOption('#orientation','sideways');await page.selectOption('#skin','oxide');await page.selectOption('#orientation','upright');}
 assert.deepEqual(await page.evaluate(()=>({g:barrelStudyState.geometryCount,t:barrelStudyState.textureCount})),memory);await page.evaluate(()=>barrelStudy.dispose());
 // Use the live controller and accepted engine event at actual roof/cliff height.
 await page.route('**/live-barrel-review.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0"><main id="view"></main></body></html>'}));await page.goto(origin+'/tactics/live-barrel-review.html');
 await page.evaluate(async()=>{
  const [T,{BattleRenderer},{blankMap,setTerrain},{createGame,attack},{barrelTarget}]=await Promise.all([import('./vendor/three.module.js'),import('./battle-renderer.js'),import('./core/maps.js'),import('./core/engine.js'),import('./explosive-barrels.js')]);
  window.review={async start(cliff){
   this.dispose();const map=blankMap('Elevated barrel check');map.starts=[{x:14,y:20,z:0},{x:14,y:21,z:0},{x:14,y:22,z:0},{x:14,y:23,z:0}];map.guards=[];map.props=[{kind:'barrel-explosive',x:20,y:20,z:0,rotated:true}];
   const s=this.state=createGame(0,map,true,'easy'),a=s.units[0];for(let y=12;y<28;y++)for(let x=12;x<28;x++)setTerrain(s,x,y,1,'floor');s.units.forEach(u=>u.z=1);s.props[0].z=1;if(cliff)for(let y=18;y<23;y++)for(let x=18;x<23;x++)s.props.push({kind:'cliff-ledge',x,y,z:0,cliffMask:15});a.weapon='rifle';a.accuracy=1000;a.ap=30;a.heading=0;s.phase='player';s.rules.awareness=false;for(let y=12;y<28;y++)for(let x=12;x<28;x++){s.visible.add(`${x},${y},1`);s.seen.add(`${x},${y},1`);}
   const r=this.renderer=new BattleRenderer();r.level=r.presentationLevel=1;r.state=s;r.reducedMotion={matches:false};await Promise.all([r.paintedEnvironment.ready,r.tankEffects.ready]);r.renderer.setSize(1200,850);document.querySelector('#view').replaceChildren(r.renderer.domElement);
   const h=cliff?2:2.12;r.camera.left=-2;r.camera.right=2;r.camera.top=1.4167;r.camera.bottom=-1.4167;r.camera.near=.01;r.camera.far=100;r.camera.position.set(23,h+3,24);r.camera.lookAt(20,h+.5,20);r.camera.updateProjectionMatrix();
   this.floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:0x72815b}));this.floor.rotation.x=-Math.PI/2;this.floor.position.set(20,h-.01,20);r.scene.add(this.floor);r.scene.add(new T.HemisphereLight(0xfff0cf,0x576c5b,2.5));
   this.frame(0);if(!attack(s,a,barrelTarget(s.props[0])))throw Error('Barrel attack rejected');this.frame(10);this.frame(390);await Promise.resolve();this.frame(650);this.before=JSON.stringify([s.props,s.units,s.fires]);return h;
  },frame(now){const r=this.renderer;r.combat.observe(this.state,now);r.tankEffects.observe(this.state,r.combat,now,false,1);r.tankEffects.draw(r.camera);for(const b of r.tankEffects.bursts.values())if(b.effects)b.effects.group.visible=false;for(const e of r.tankEffects.ground.values())if(e.effects)e.effects.group.visible=false;r.renderer.render(r.scene,r.camera);},
  dispose(){this.renderer?.dispose();this.floor?.geometry.dispose();this.floor?.material.dispose();this.renderer=null;}};
 });
 for(const cliff of [false,true]){
  const height=await page.evaluate(cliff=>review.start(cliff),cliff);
  const state=await page.evaluate(()=>{const b=[...review.renderer.tankEffects.bursts.values()][0];return {height:b.motion.root.position.y,fragments:b.motion.fragments.filter(f=>f.root.visible).length,small:b.effects.fragments.length,skin:b.motion.skin,label:b.motion.label};});
  assert.deepEqual(state,{height,fragments:8,small:0,skin:'explosiveRed',label:'flammable'});await page.screenshot({path:fileURLToPath(new URL(cliff?'live-cliff-breakup.png':'live-roof-breakup.png',out))});
  await page.evaluate(()=>{review.state.visible.clear();review.frame(700);});assert.equal(await page.evaluate(()=>review.renderer.tankEffects.bursts.size),0);assert.equal(await page.evaluate(()=>JSON.stringify([review.state.props,review.state.units,review.state.fires])===review.before),true);await page.evaluate(()=>review.dispose());
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('browser-review.json',out),JSON.stringify({studyCases:cases,liveCases:['roof','cliff','fog retirement'],memory,errors},null,2));console.log('16 barrel study configurations, reverse playback/resource stability and live roof/cliff/fog checks pass.');
}finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',out),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
