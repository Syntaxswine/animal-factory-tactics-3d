import {createRequire} from 'node:module';import assert from 'node:assert/strict';import fs from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(180000);
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4323/tactics/battle-3d.html');await page.waitForFunction(()=>window.battle3d?.renderer.models.has(0),null,{timeout:120000});await page.click('#pause');
 fs.mkdirSync('artifacts/ladder-gameplay',{recursive:true});let seq=100;const results=[];
 for(const species of ['horse','pig-foreman','pig-director','hen'])for(const kind of ['iron-searchlight-ladder-tower','wooden-spotlight-tower']){
  const id=seq++;
  await page.evaluate(async({species,kind,id})=>{
   const {blankMap}=await import('./core/maps.js'),{createGame}=await import('./core/engine.js'),{towerEntry}=await import('./tower-geometry.js'),{startEncounterClock}=await import('./encounter-clock.js');
   const m=blankMap();m.props=[{kind,x:10,y:10,z:0}];m.starts[0]=towerEntry(m.props[0]);const s=createGame(42,m,false,'easy',{awareness:true,statSystem:true,rosterSeed:1947}),u=s.units[0];s.units=[u];u.id=id;u.species=species;u.weapon=species==='hen'?'hands':'rifle';u.slots[0]=u.weapon;s.selected=id;startEncounterClock(s);const r=battle3d.renderer;r.traversal.clear();r.motion.clear();Object.assign(battle3d.state,s);window.frameTicks=0;window.tickTimer=setInterval(()=>window.frameTicks++,16);
  },{species,kind,id});
  await page.click('#center');await page.click('#pause');await page.click('#climb-tower');
  await page.waitForFunction(()=>battle3d.renderer.traversal.active?.motion||battle3d.renderer.diagnostics.length,null,{timeout:180000});
  const diag=await page.evaluate(()=>battle3d.renderer.diagnostics);assert.deepEqual(diag,[],species+' '+kind);
  await page.click('#pause');
  const result=await page.evaluate(()=>{clearInterval(window.tickTimer);const r=battle3d.renderer,a=r.traversal.active,u=battle3d.state.units[0];return {ticks:window.frameTicks,unarmed:!!a.motion.apply(0).unarmed,ap:u.ap,stamina:u.stamina,time:battle3d.state.clock.minutes};});assert.equal(result.unarmed,species==='hen');assert.ok(result.ticks>0);
  for(const direction of ['up','down']){
   if(direction==='down'){
    await page.evaluate(async()=>{const {climbTower}=await import('./tower-actions.js'),r=battle3d.renderer,s=battle3d.state;if(!climbTower(s,s.units[0]))throw Error('Cannot descend');r.captureCombat(s);r.actor(s.units[0]);});
    await page.waitForFunction(()=>battle3d.renderer.traversal.active?.motion,null,{timeout:180000});
   }
   const snapshot=await page.evaluate(()=>JSON.stringify(battle3d.state.units[0]));
   await page.evaluate(()=>{const r=battle3d.renderer,a=r.traversal.active,p=a.motion.phases.find(p=>p.label==='Climb');a.start=r.presentationNow-(p.start+p.end)*500;r.actor(battle3d.state.units[0]);battle3d.view.zoom=2;});await page.click('#center');
   await page.screenshot({path:`artifacts/ladder-gameplay/${species}-${kind}-${direction}.png`});
   await page.evaluate(()=>{const r=battle3d.renderer,a=r.traversal.active,u=battle3d.state.units[0];a.start=r.presentationNow-a.motion.duration*1000-1;r.actor(u);window.endPoint=a.motion.diagnostics().worldRoot;r.captureCombat(battle3d.state);r.actor(u);});
   assert.equal(await page.evaluate(()=>battle3d.renderer.traversal.busy),false);assert.equal(await page.evaluate(()=>JSON.stringify(battle3d.state.units[0])),snapshot);
   assert.deepEqual(await page.evaluate(()=>battle3d.renderer.diagnostics),[]);
  }
  results.push({species,kind,...result});console.log(JSON.stringify(results.at(-1)));
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({cases:results.length,errors}));
}finally{await browser.close();}
