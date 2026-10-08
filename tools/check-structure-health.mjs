import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH),review=await launchSiteReview(chromium,'structure-health-'+Date.now()),out='artifacts/structure-health';
fs.mkdirSync(out,{recursive:true});const errors=[],report={};
try{
 const page=await review.browser.newPage({viewport:{width:1360,height:950}});page.on('pageerror',e=>errors.push(e.stack));
 await page.goto(process.env.STRUCTURE_REVIEW_URL||'http://127.0.0.1:4364/tactics/battle-3d.html?study=grenades',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4);
 await page.evaluate(async()=>{
  document.querySelector('#pause').click();const {blankMap}=await import('./core/maps.js'),{createGame}=await import('./core/engine.js'),{startEncounterClock}=await import('./encounter-clock.js');
  const m=blankMap('Structure durability review');m.starts=['horse','goat','pig-director','hen'].map((species,i)=>({x:12+i*2,y:18,z:0,species,weapon:'rifle'}));
  for(let y=11;y<=16;y++)for(let x=10;x<=18;x++)m.terrain[y][x]='floor';
  for(let y=12;y<=16;y++)m.edges[`e:14:${y}`]='wall-concrete';
  const next=createGame(92,m,true,'easy',{statSystem:true});startEncounterClock(next);next.phase='player';next.engaged=true;next.rules.awareness=false;next.units[0].x=12;next.units[0].y=14;next.units[0].ap=18;
  const state=battle3d.state;for(const k of Object.keys(state))delete state[k];Object.assign(state,next);battle3d.renderer.combat.clear();battle3d.renderer.motion.clear();state.revision++;
 });
 await page.locator('#center').click();await page.waitForFunction(()=>battle3d.renderer.world.boxes.some(b=>b.source?.edge==='e:14:14'));
 async function tileClick(p,button='right'){
  const q=await page.evaluate(p=>{const q=battle3d.project(p),b=document.querySelector('#battle').getBoundingClientRect();return {x:q.x+b.x,y:q.y+b.y};},p);await page.mouse.click(q.x,q.y,{button});
 }
 await tileClick({x:14,y:14,z:0});await page.locator('#battle-context').waitFor({state:'visible'});report.pristine=await page.locator('#battle-context').innerText();assert.match(report.pristine,/Wall concrete 200\/200 HP/);await page.screenshot({path:out+'/wall-hp.png'});await page.keyboard.press('Escape');
 await page.locator('#pause').click();await page.waitForFunction(()=>!battle3d.renderer.busy);await tileClick({x:16,y:14,z:0});await page.locator('[data-action="ground-shot"]').click();await page.locator('#fire').click();
 await page.waitForFunction(()=>battle3d.state.effect?.sequence?.[0]?.structures?.length>0);await page.waitForFunction(()=>!battle3d.renderer.busy);await page.locator('#pause').click();
 report.shot=await page.evaluate(()=>({wall:battle3d.state.structureHealth['edge:e:14:14'],ammo:battle3d.state.units[0].ammo.rifle,impact:battle3d.state.effect.trajectories[0].kind}));assert.ok(report.shot.wall.hp<200&&report.shot.wall.hp>0);assert.equal(report.shot.impact,'wall');
 await tileClick({x:14,y:14,z:0});assert.match(await page.locator('#battle-context').innerText(),new RegExp(report.shot.wall.hp+'/200 HP'));await page.screenshot({path:out+'/damaged-wall-hp.png'});await page.keyboard.press('Escape');
 report.floor=await page.evaluate(async()=>{
  const {damageStructure}=await import('./structure-health.js'),{detonate}=await import('./core/explosives.js'),{WEAPONS}=await import('./core/engine.js'),{settleStructureCollapse}=await import('./structure-collapse.js'),{mergeScenery}=await import('./structure-health.js'),{captureEncounter,restoreEncounter}=await import('./encounter-save.js');
  const s=battle3d.state;for(let y=11;y<=16;y++)for(let x=15;x<=18;x++)s.upper[0][`${x},${y}`]='ground-wood-planks';
  const u=s.units[1];u.x=17;u.y=13;u.z=1;u.hp=90;s.visible.add('17,13,1');s.seen.add('17,13,1');s.revision++;
  damageStructure(s,{x:17,y:13,z:1},74);
  const blast=detonate(s,{x:17,y:13,z:1,h:2.17},WEAPONS.grenade),fall=settleStructureCollapse(s,blast.structures);mergeScenery(blast.before,fall.before);
  // Use the real committed blast receipt while testing the renderer at its
  // detonation time. Victim damage is covered by the engine integration tests.
  s.effect={sequence:[{shooter:0,ax:12,ay:14,az:0,bx:17,by:13,bz:1,grenade:{release:1.92,scenery:blast.before},trajectories:[{x:17,y:13,z:1,h:2.17,fuse:4,path:[{x:17,y:13,h:2.17,t:0},{x:17,y:13,h:2.17,t:4}]}],explosions:[blast.blast],falls:fall.falls,structures:blast.structures,downed:[]}]};s.revision++;
  const restored=restoreEncounter(captureEncounter(s));return {remaining:s.upper[0]['17,13'],z:u.z,savedZ:restored.units[1].z,fallen:fall.falls.length};
 });
 assert.equal(report.floor.remaining,undefined);assert.equal(report.floor.z,0);assert.equal(report.floor.savedZ,0);assert.equal(report.floor.fallen,1);
 await page.waitForFunction(()=>battle3d.renderer.combat.active?.event.grenade);
 await page.evaluate(()=>{const r=battle3d.renderer;r.combat.active.start=r.presentationNow-7000;r.combat.advance(r.presentationNow);});
 await page.waitForFunction(()=>!battle3d.renderer.world.boxes.some(b=>b.id==='floor:17,13,1'));
 await page.screenshot({path:out+'/collapsed-floor.png'});assert.deepEqual(errors,[]);report.errors=errors;fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await review.closeReview();}
