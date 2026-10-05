import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=new URL('../artifacts/live-fire-roster/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});let identity;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('browser-helper.json',out),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'live fire roster check',purpose:'Disposable actual gameplay renderer checks',expiry:'End of this command',stop:'browser.close in finally'},null,2));
 const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[],cases=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/live-fire-roster-check.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;background:#66704e"><div id="view"></div></body></html>'}));
 await page.goto((process.env.EDITOR_ORIGIN||'http://127.0.0.1:4364')+'/tactics/live-fire-roster-check.html');
 await page.evaluate(async()=>{
  const [{BattleRenderer},{blankMap},{createGame,attackGround},{captureEncounter,restoreEncounter},{startEncounterClock},T]=await Promise.all([import('./battle-renderer.js'),import('./core/maps.js'),import('./core/engine.js'),import('./encounter-save.js'),import('./encounter-clock.js'),import('./vendor/three.module.js')]);
  window.review={async start({animal,outfit,weapon,operator='horse',operatorOutfit='normal'}){
   this.renderer?.dispose();this.ground?.geometry.dispose();this.ground?.material.dispose();
   // The legacy map schema lists nine species; exercise the full twelve-model
   // 3D renderer by changing the live appearance after a valid map loads.
   const map=blankMap('Live roster fire');map.starts=[{x:10,y:10},{x:2,y:2},{x:2,y:3},{x:3,y:2}];map.guards=[{x:14,y:10,species:'horse',weapon}];
   const s=createGame(42,map,true,'easy'),a=s.units[0],b=s.units[4];a.species=operator;a.outfit=operatorOutfit;b.species=animal;b.outfit=outfit;
   a.weapon='flamethrower';a.slots[0]='flamethrower';a.pack.push({type:'weapon',kind:'flamethrower',rounds:4,condition:100});a.ap=30;a.heading=0;b.hp=b.maxHp=1000;b.heading=90;
   s.phase='player';s.rules.awareness=false;s.detected.add(b.id);startEncounterClock(s);for(let y=0;y<30;y++)for(let x=0;x<30;x++)s.visible.add(`${x},${y}`);
   const r=this.renderer=new BattleRenderer();this.state=s;this.a=a;this.b=b;r.state=s;r.presentationLevel=r.level=0;r.reducedMotion={matches:false};
   r.renderer.setSize(1100,800);document.getElementById('view').replaceChildren(r.renderer.domElement);r.camera.left=-7;r.camera.right=7;r.camera.top=5.09;r.camera.bottom=-5.09;r.camera.near=.1;r.camera.far=100;r.camera.position.set(19,13,23);r.camera.lookAt(13,0,10);r.camera.updateProjectionMatrix();
   this.ground=new T.Mesh(new T.PlaneGeometry(45,45),new T.MeshStandardMaterial({color:0x687a43}));this.ground.rotation.x=-Math.PI/2;this.ground.position.set(15,-.012,15);r.scene.add(this.ground);
   await Promise.all([r.loadModel(a),r.loadModel(b),r.fire.ready]);this.frame(0);r.captureCombat(s);
   if(!attackGround(s,a,{x:20,y:10,z:0}))throw Error('Core rejected roster flame');this.paid={ap:a.ap,fuel:a.ammo.flamethrower,hp:b.hp};this.frame(10);
   return {models:r.models.size,painted:r.combat.active.paintedFire,...this.paid};
  },frame(now){const r=this.renderer,s=this.state;r.presentationNow=now;r.captureCombat(s);const units=[this.a,this.b].map(u=>r.fire.display(r.combat.display(u)));r.motion.update(units,now,false);for(const u of units)r.actor(u);r.renderer.render(r.scene,r.camera);},
  result(){const r=this.renderer,b=this.b,session=r.fire.sessions.get(b.id);return {diagnostics:r.diagnostics,alive:b.hp>0,visible:r.models.get(b.id).worker.parts.every(p=>p.visible),collapse:session?.motion.diagnostics().state.collapse,drop:session?.motion.diagnostics().drop,ash:session?.effects?.ash.visible,ap:this.a.ap,fuel:this.a.ammo.flamethrower};},
  save(){const s=this.state,restored=restoreEncounter(captureEncounter(s));return {same:JSON.stringify(s.units.map(u=>[u.x,u.y,u.hp]))===JSON.stringify(restored.units.map(u=>[u.x,u.y,u.hp])),events:restored.fireAnimations};},
  dispose(){this.renderer?.dispose();this.ground?.geometry.dispose();this.ground?.material.dispose();this.renderer=null;}
  };
 });
 for(const p of profiles)for(const outfit of ['normal','red-hats',...(p.id==='donkey'?['blue-hawaiian']:[])]){
  const weapon=p.unarmed||outfit==='blue-hawaiian'?'hands':p.id.startsWith('pig')?'rpg':p.id==='skunk'?'flamethrower':'rifle';
  const options={animal:p.id,outfit,weapon,operator:p.unarmed?'horse':p.id,operatorOutfit:outfit==='red-hats'?'red-hats':'normal'};
  const start=await page.evaluate(o=>review.start(o),options);assert.equal(start.models,2);assert.equal(start.painted,true);assert.equal(start.ap,24);assert.equal(start.fuel,3);assert.equal(start.hp,0,'Direct spray must kill even a 1000 HP victim');
  await page.evaluate(()=>review.frame(860));await page.waitForFunction(()=>review.renderer.fire.sessions.get(review.b.id)?.effects);
  await page.evaluate(()=>review.frame(900));const hit=await page.evaluate(()=>review.result());assert.deepEqual(hit.diagnostics,[]);assert.equal(hit.alive,false);assert.equal(hit.visible,true,'Death commits once; body remains visible during the fatal performance');assert.equal(hit.collapse,0);assert.equal(hit.drop,null);
  if(outfit==='red-hats')await page.screenshot({path:fileURLToPath(new URL(p.id+'-live-spray.png',out))});
  const save=await page.evaluate(()=>review.save());assert.equal(save.same,true);assert.equal(save.events,undefined);
  await page.evaluate(()=>review.frame(1660));
  if(p.id==='hen')await page.screenshot({path:fileURLToPath(new URL(p.id+'-'+outfit+'-live-fall.png',out))});
  await page.evaluate(()=>review.frame(6000));const ash=await page.evaluate(()=>review.result());assert.deepEqual(ash.diagnostics,[]);assert.equal(ash.ash,true);assert.equal(ash.visible,false);assert.equal(ash.alive,false);
  cases.push({options,start,hit,save,ash});console.log(p.id+' '+outfit+' lethal spray pass');
 }
 await page.evaluate(()=>review.dispose());assert.deepEqual(errors,[]);fs.writeFileSync(new URL('review.json',out),JSON.stringify({cases,errors},null,2));console.log('Live roster: '+cases.length+' appearances; authored operators, guaranteed lethal cone, one AP/fuel charge, save, fatal collapse and ash pass.');
}finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',out),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
