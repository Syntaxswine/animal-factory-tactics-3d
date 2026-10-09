import {clickBattleControl} from './battle-ui-review.mjs';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH),review=await launchSiteReview(chromium,'editor-breaches-'+Date.now()),base=process.env.BREACH_REVIEW_URL||'http://127.0.0.1:4364',out='artifacts/editor-breaches',report={errors:[]};
fs.mkdirSync(out,{recursive:true});
try{
 const page=await review.browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 if(!process.argv.includes('--battle-only')){
 await page.goto(base+'/tactics/editor-3d.html?editing=1',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.editor3d&&!editor3d.loading);
 await page.evaluate(async()=>{const {blankMap}=await import('./core/maps.js'),m=blankMap('Broken structures editor review');for(let x=10;x<=18;x++)m.edges[`s:${x}:9`]='wall-brick';for(let y=10;y<=18;y++)for(let x=10;x<=18;x++)m.upper[0][`${x},${y}`]='ground-wood-planks';await editor3d.open(JSON.stringify(m));Object.assign(editor3d.view,{x:14,y:13,span:18});await editor3d.changed();});
 async function point(p){return page.evaluate(async p=>{const {Vector3}=await import('./vendor/three.module.js'),s=editor3d.scene,c=document.querySelector('#scene'),b=c.getBoundingClientRect();s.draw(editor3d.view,b.width,b.height);const q=new Vector3(p.x,(p.z||0)*2.12,p.y).project(s.camera);return {x:b.x+(q.x+1)*b.width/2,y:b.y+(1-q.y)*b.height/2};},p);}
 async function drag(a,b){const p=await point(a),q=await point(b);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:8});await page.mouse.up();}
 await page.locator('[data-group="walls"]').click();await page.locator('#tool-mode').selectOption('break-wall');await drag({x:12,y:9.49,z:0},{x:13,y:9.49,z:0});
 await page.waitForFunction(()=>Object.keys(editor3d.document.map.breaches?.edges||{}).length===2);await page.evaluate(async()=>{editor3d.view.preset='2';await editor3d.changed();});await page.screenshot({path:out+'/editor-broken-wall.png'});await page.evaluate(async()=>{editor3d.view.preset='0';await editor3d.changed();});
 await page.locator('[data-level="1"]').click();await page.locator('[data-group="terrain"]').click();await page.locator('#tool-mode').selectOption('break-floor');await page.locator('#stroke-mode').selectOption('rectangle');await drag({x:12,y:12,z:1},{x:13,y:13,z:1});
 await page.waitForFunction(()=>Object.keys(editor3d.document.map.breaches?.upper[0]||{}).length===4);
 report.editor=await page.evaluate(()=>({breaches:editor3d.document.map.breaches,help:document.querySelector('#tool-description').textContent,brokenGeometries:Object.keys(editor3d.scene.geometry).filter(k=>k.startsWith('floor-breach-')).length,diagnostics:editor3d.scene.diagnostics}));assert.ok(report.editor.brokenGeometries>0);assert.deepEqual(report.editor.diagnostics,[]);await page.screenshot({path:out+'/editor-broken-floor.png'});
 await page.locator('#undo').click();await page.waitForFunction(()=>Object.keys(editor3d.document.map.breaches?.upper[0]||{}).length===0);await page.locator('#redo').click();await page.waitForFunction(()=>Object.keys(editor3d.document.map.breaches?.upper[0]||{}).length===4);
 await page.locator('#quick-save-map').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Saved in this browser'));
 const saved=await page.evaluate(()=>editor3d.export());await page.evaluate(async()=>{const {blankMap}=await import('./core/maps.js');await editor3d.open(JSON.stringify(blankMap('Temporary blank')));});
 await page.locator('#settings-button').click();await page.locator('#load-map').click();await page.waitForFunction(()=>Object.keys(editor3d.document.map.breaches?.upper[0]||{}).length===4);await page.locator('#close-settings').click();
 assert.deepEqual(JSON.parse(await page.evaluate(()=>editor3d.export())).breaches,JSON.parse(saved).breaches);
 await page.evaluate(text=>editor3d.open(text),saved);report.saveReload=true;
 }

 await page.goto(base+'/tactics/battle-3d.html?study=grenades',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4);
 await page.evaluate(async()=>{
  if(!battle3d.paused)document.querySelector('#pause').click();const {blankMap}=await import('./core/maps.js'),{createGame}=await import('./core/engine.js'),{startEncounterClock}=await import('./encounter-clock.js');
  const m=blankMap('Occupied floor demolition');for(let y=8;y<=22;y++)for(let x=8;x<=22;x++)m.upper[0][`${x},${y}`]='ground-wood-planks';m.stairs=[{x:8,y:8,z:0,kind:'ladder'}];
  m.starts=[{x:14,y:20,z:1,weapon:'grenade',stats:{strength:50,agility:50,dexterity:100,explosives:100}},{x:15,y:14,z:1},{x:14,y:14,z:0},{x:4,y:4,z:0}];
  const next=createGame(92,m,true,'easy',{statSystem:true});startEncounterClock(next);next.phase='player';next.engaged=true;next.rules.awareness=false;next.rules.social=false;next.units[0].ap=18;
  const s=battle3d.state;for(const k of Object.keys(s))delete s[k];Object.assign(s,next);battle3d.renderer.combat.clear();battle3d.renderer.motion.clear();s.revision++;
 });
 await clickBattleControl(page,'#center');await page.waitForFunction(()=>battle3d.renderer.world.boxes.some(b=>b.id==='floor:14,14,1'));
 report.collapse=await page.evaluate(async()=>{
  const {attackGround}=await import('./core/engine.js'),{floorBreachMasks}=await import('./floor-breaches.js'),s=battle3d.state,r=battle3d.renderer,hp=s.units[2].hp,ammo=s.units[0].ammo.grenade;
  const accepted=attackGround(s,s.units[0],{x:14,y:14,z:1});r.captureCombat(s);const active=r.combat.active;
  return {accepted,falls:s.effect.sequence[0].falls,belowHp:hp,belowAfter:s.units[2].hp,ammoSpent:ammo-s.units[0].ammo.grenade,ap:s.units[0].ap,rims:floorBreachMasks(s).size,beforeFuse:floorBreachMasks(r.grenades.scenery(s,r.combat)).size,active:!!active?.event.grenade};
 });
 assert.ok(report.collapse.accepted&&report.collapse.active);assert.ok(report.collapse.falls.some(f=>f.id===1&&f.to.z===0));assert.equal(report.collapse.belowAfter,report.collapse.belowHp);assert.equal(report.collapse.ammoSpent,1);assert.equal(report.collapse.ap,13);assert.equal(report.collapse.beforeFuse,0);assert.ok(report.collapse.rims>0);
 await page.evaluate(()=>{const r=battle3d.renderer,s=r.combat.active;s.start=r.presentationNow-(s.event.grenade.release+s.event.trajectories[0].fuse+.22)*1000;r.combat.advance(r.presentationNow);});
 await page.waitForFunction(()=>[...battle3d.renderer.chunks.values()].some(m=>m.userData.boxes.some(b=>b.floorBreach)));
 await page.screenshot({path:out+'/live-floor-blast.png'});
 // The paused encounter may queue a reaction shot after the grenade; finish each
 // real presentation in order instead of waiting for the paused clock to advance.
 report.finished=await page.evaluate(()=>{const r=battle3d.renderer,c=r.combat;let advanced=0;while(c.active&&advanced<20){c.active.start=r.presentationNow-20000;c.advance(r.presentationNow);advanced++;}return {advanced,active:!!c.active,queued:c.queue.length};});assert.equal(report.finished.active,false);assert.equal(report.finished.queued,0);
 await page.screenshot({path:out+'/live-floor-collapse.png'});
 assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){fs.writeFileSync(out+'/browser-report.json',JSON.stringify({...report,failure:error.stack},null,2));throw error;}finally{await review.closeReview();}
