import assert from 'node:assert/strict';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),out=new URL('../artifacts/tank-blast-integration/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const origin=process.env.EDITOR_ORIGIN||'http://127.0.0.1:4364',browser=await chromium.launch({channel:'msedge',headless:true});let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('browser-helper.json',out),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',project:'AnimalFactory3D/game',purpose:'Disposable live tank-explosion renderer checks',start:new Date().toISOString(),port:null,expiry:'End of this command',stop:'browser.close in finally'},null,2));
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[],cases=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/live-tank-check.html',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#66704e"><div id="view"></div></body></html>'}));
 await page.goto(origin+'/tactics/live-tank-check.html');
 await page.evaluate(async()=>{
  const [{BattleRenderer},{blankMap,setTerrain},{createGame,attack},{captureEncounter,restoreEncounter},{startEncounterClock},{personVisible},{toWorld},T]=await Promise.all([import('./battle-renderer.js'),import('./core/maps.js'),import('./core/engine.js'),import('./encounter-save.js'),import('./encounter-clock.js'),import('./battle-visibility.js'),import('./hybrid-world.js'),import('./vendor/three.module.js')]);
  window.review={async start({animal='horse',outfit='normal',water=false,elevation='ground'}={}){
   this.dispose();const map=blankMap('Live tank rupture');map.starts=[{x:14,y:20},{x:21,y:20},{x:25,y:20},{x:26,y:20}];map.guards=[{x:20,y:20,species:'horse',weapon:'flamethrower'},{x:20,y:24,species:'hen',weapon:'hands'}];
   if(water)for(let x=21;x<=25;x++)for(let y=21;y<=24;y++)setTerrain(map,x,y,0,'water');
   const s=createGame(0,map,true,'easy'),a=s.units[0],b=s.units[4];b.species=animal;b.outfit=outfit;a.weapon='rifle';a.accuracy=1000;a.ap=30;a.heading=0;b.hp=b.maxHp=500;b.heading=180;s.phase='player';s.rules.awareness=false;startEncounterClock(s);
   const r=this.renderer=new BattleRenderer();this.state=s;this.level=elevation==='roof'||elevation==='cliff'?1:0;r.state=s;r.presentationLevel=r.level=this.level;r.reducedMotion={matches:false};
   if(this.level){for(let y=10;y<30;y++)for(let x=10;x<30;x++)setTerrain(s,x,y,1,'floor');for(const u of s.units)u.z=1;}
   if(elevation==='cliff'){for(let y=10;y<30;y++)for(let x=10;x<30;x++)s.props.push({x,y,z:0,kind:'cliff-ledge',cliffMask:15});for(const u of s.units)u.cliffSupport={level:0,height:2};}
   // The real attack already committed below; the tower case checks only the
   // event's world transform, without inventing a ladder or combat rule.
   for(let y=0;y<30;y++)for(let x=0;x<30;x++){const k=this.level?`${x},${y},1`:`${x},${y}`;s.visible.add(k);s.seen.add(k);}s.detected.add(4);s.detected.add(5);
   r.renderer.setSize(1200,900);document.getElementById('view').replaceChildren(r.renderer.domElement);r.camera.left=-8;r.camera.right=8;r.camera.top=6;r.camera.bottom=-6;r.camera.near=.1;r.camera.far=100;r.camera.position.set(30,16,32);r.camera.lookAt(20,this.level?2:0,20);r.camera.updateProjectionMatrix();
   const ground=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshStandardMaterial({color:0x687a43}));ground.rotation.x=-Math.PI/2;ground.position.set(20,(elevation==='cliff'?2:this.level*2.12)-.012,20);r.scene.add(ground);this.scenery=[ground];
   if(water)for(let x=21;x<=25;x++)for(let y=21;y<=24;y++){const m=new T.Mesh(new T.PlaneGeometry(.99,.99),new T.MeshStandardMaterial({color:0x416b80}));m.rotation.x=-Math.PI/2;m.position.set(x,.003,y);r.scene.add(m);this.scenery.push(m);}
   await Promise.all([...s.units.map(u=>r.loadModel(u)),r.fire.ready,r.tankEffects.ready]);this.frame(0);this.before={ap:a.ap,ammo:a.ammo.rifle};
   if(!attack(s,a,b,false,false,'weapon')||!b.tanksExploded)throw Error('Core did not produce a tank explosion');
   if(elevation==='tower'){b.towerPost={dx:0,dy:0,kind:'wooden-spotlight-tower'};const e=s.fireAnimations.find(e=>e.kind==='tank');e.route[0].towerPost={...b.towerPost};s.fires=[];r.camera.lookAt(20,6.36,20);r.camera.updateProjectionMatrix();}
   this.committed=JSON.stringify([s.units,s.loot,s.fires,a.ap,a.ammo]);this.frame(10);return {hp:b.hp,weapon:b.weapon,fireCount:s.fires.length};
  },frame(now){const r=this.renderer,s=this.state;r.presentationNow=now;r.state=s;r.captureCombat(s);const units=s.units.filter(u=>personVisible(s,u)&&(u.z||0)===this.level).map(u=>r.fire.display(r.combat.display(u)));r.motion.update(units,now,!!r.reducedMotion.matches);for(const m of r.models.values())m.root.visible=false;for(const u of units){const root=r.actor(u);if(root)root.visible=true;}r.prune();r.renderer.render(r.scene,r.camera);},
  snapshot(){const r=this.renderer,s=this.state,m=r.models.get(4),f=r.fire.sessions.get(4),b=[...r.tankEffects.bursts.values()][0],grounds=[...r.tankEffects.ground.values()].flatMap(e=>e.effects?.ground||[]);return {diagnostics:r.diagnostics,equipment:[m.worker.weapon.root,m.worker.weapon.mount,m.worker.weapon.hose].filter(Boolean).map(o=>o.visible),body:m.worker.parts.some(p=>p.visible),ash:f?.effects?.ash.visible,drop:f?.motion.diagnostics().drop,burst:b?.effects?.core.visible,origin:b?.origin.toArray(),base:toWorld(s.units[4])[1],ground:grounds.filter(m=>m.visible).map(m=>[m.userData.cell.x,m.userData.cell.y,m.userData.cell.z]),same:JSON.stringify([s.units,s.loot,s.fires,s.units[0].ap,s.units[0].ammo])===this.committed,geometries:r.renderer.info.memory.geometries,textures:r.renderer.info.memory.textures};},
  load(){this.state=restoreEncounter(captureEncounter(this.state));this.committed=JSON.stringify([this.state.units,this.state.loot,this.state.fires,this.state.units[0].ap,this.state.units[0].ammo]);this.frame(8000);return this.state.fireAnimations;},
  dispose(){this.renderer?.dispose();for(const m of this.scenery||[]){m.geometry.dispose();m.material.dispose();}this.scenery=[];this.renderer=null;}
  };
 });
 const samples=process.argv.includes('--quick')?profiles.filter(p=>p.id==='horse'):profiles.filter(p=>!p.unarmed);
 for(const p of samples)for(const outfit of ['normal','red-hats']){
  const start=await page.evaluate(o=>review.start(o),{animal:p.id,outfit});assert.equal(start.hp,0);assert.equal(start.weapon,'hands');assert.equal(start.fireCount,81);
  await page.evaluate(()=>review.frame(200));const worn=await page.evaluate(()=>review.snapshot());assert.ok(worn.equipment.every(Boolean));assert.equal(worn.ground.length,0);
  await page.waitForFunction(()=>{review.frame(520);return [...review.renderer.tankEffects.bursts.values()][0]?.effects&&review.renderer.fire.sessions.get(4)?.effects;},{},{timeout:20000});await page.evaluate(()=>review.frame(580));
  const burst=await page.evaluate(()=>review.snapshot());assert.equal(burst.burst,true);assert.ok(burst.equipment.every(v=>!v));assert.ok(burst.origin[0]>18&&burst.origin[0]<22);assert.equal(burst.ground.length,81);assert.equal(burst.drop,null);assert.deepEqual(burst.diagnostics,[]);
  if(['horse','pig-director','skunk'].includes(p.id)&&outfit==='red-hats')await page.screenshot({path:fileURLToPath(new URL(p.id+'-rupture.png',out))});
  await page.evaluate(()=>review.frame(1600));const collapse=await page.evaluate(()=>review.snapshot());assert.equal(collapse.same,true);assert.equal(collapse.drop,null);
  await page.evaluate(()=>review.frame(6000));const ended=await page.evaluate(()=>review.snapshot());assert.equal(ended.body,false);assert.equal(ended.ash,true);assert.equal(ended.ground.length,81);assert.equal(ended.same,true);assert.deepEqual(ended.diagnostics,[]);
  assert.equal(await page.evaluate(()=>review.load()),undefined);await page.waitForFunction(()=>{review.frame(8500);return review.renderer.fire.sessions.get(4)?.effects&&review.renderer.tankEffects.ground.get(0)?.effects;});await page.evaluate(()=>review.frame(8600));assert.equal((await page.evaluate(()=>review.snapshot())).ash,true);
  cases.push({animal:p.id,outfit,passed:true});console.log(p.id+' '+outfit+' live tank passed');
 }
 for(const options of [{water:true},{elevation:'roof'},{elevation:'cliff'},{elevation:'tower'}]){
  await page.evaluate(o=>review.start(o),options);await page.waitForFunction(()=>{review.frame(650);return [...review.renderer.tankEffects.bursts.values()][0]?.effects;});await page.evaluate(()=>review.frame(750));const got=await page.evaluate(()=>review.snapshot());
  assert.deepEqual(got.diagnostics,[]);assert.ok(got.origin[1]>got.base+.5);assert.equal(got.ground.length,options.water?66:options.elevation==='tower'?0:81);assert.ok(got.ground.every(p=>p[1]===got.base));
  await page.screenshot({path:fileURLToPath(new URL((options.elevation||'water')+'-burst.png',out))});cases.push({...options,passed:true});
 }
 await page.evaluate(()=>review.start());await page.waitForFunction(()=>{review.frame(650);return [...review.renderer.tankEffects.bursts.values()][0]?.effects;});
 await page.evaluate(()=>{review.state.visible.clear();review.state.detected.clear();review.frame(800);});assert.equal(await page.evaluate(()=>review.renderer.tankEffects.bursts.size+review.renderer.tankEffects.ground.size),0);
 await page.evaluate(()=>review.start());await page.evaluate(()=>{review.renderer.reducedMotion={matches:true};review.frame(650);});assert.equal(await page.evaluate(()=>review.renderer.tankEffects.bursts.size),0);
 await page.evaluate(()=>review.dispose());assert.deepEqual(errors,[]);fs.writeFileSync(new URL('browser-review.json',out),JSON.stringify({cases,errors},null,2));console.log('Live tank explosions, persistence, elevations, fog and reduced motion passed: '+cases.length+' configurations.');
}finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',out),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
