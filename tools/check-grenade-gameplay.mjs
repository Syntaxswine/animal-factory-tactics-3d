import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH),review=await launchSiteReview(chromium,'grenade-gameplay-'+Date.now()),out='artifacts/grenade-integration';
fs.mkdirSync(out,{recursive:true});
const report={throws:[],errors:[]};
try{
 const page=await review.browser.newPage({viewport:{width:1360,height:950}});page.on('pageerror',e=>report.errors.push(e.stack));
 await page.goto(process.env.GRENADE_REVIEW_URL||'http://127.0.0.1:4364/tactics/battle-3d.html?study=grenades',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4);
 async function aim(point){const q=await page.evaluate(p=>{const q=battle3d.project(p),b=document.querySelector('#battle').getBoundingClientRect();return {x:q.x+b.x,y:q.y+b.y};},point);await page.mouse.move(q.x,q.y);await page.mouse.click(q.x,q.y);}
 await page.locator('#aim-grenade').click();await aim({x:20,y:17,z:0});
 assert.ok(await page.evaluate(()=>battle3d.grenadePreview?.ok));
 const ammo=await page.evaluate(()=>battle3d.state.units[0].ammo.grenade);
 await page.screenshot({path:out+'/planned-lob.png'});await page.locator('#grenade-cancel').click();assert.equal(await page.evaluate(()=>battle3d.state.units[0].ammo.grenade),ammo);
 for(let id=0;id<4;id++){
  await page.locator('#squad button').nth(id).click();await page.locator('#center').click();
  const before=await page.evaluate(id=>{const s=battle3d.state,a=s.units[id];s.phase='player';a.ap=18;return {ap:a.ap,ammo:a.ammo.grenade,species:a.species,x:a.x,y:a.y};},id);
  await page.locator('#aim-grenade').click();await aim({x:before.x,y:before.y-7,z:0});
  await page.locator('#grenade-throw').click();
  await page.waitForFunction(()=>battle3d.renderer.combat.active?.event.grenade);
  await page.waitForFunction(()=>battle3d.renderer.combat.active?.phase.time>1.2);
  await page.locator('#pause').click();
  const thrower=await page.evaluate(id=>{const b=battle3d,r=b.renderer,s=r.combat.active;return {species:b.state.units[id].species,active:!!r.grenades.session,phase:s?.phase,ammo:b.state.units[id].ammo.grenade,ap:b.state.units[id].ap,diagnostics:r.diagnostics};},id);
  assert.ok(thrower.active,thrower.species+' uses the authored throw');assert.equal(thrower.ammo,before.ammo-1);assert.equal(thrower.ap,before.ap-5);assert.deepEqual(thrower.diagnostics,[]);
  await page.screenshot({path:out+'/'+before.species+'-throw.png'});await page.locator('#pause').click();
  await page.waitForFunction(()=>battle3d.renderer.combat.active?.phase.released&&!battle3d.renderer.combat.active?.phase.discharged);
  const flight=await page.evaluate(()=>({visible:battle3d.renderer.grenades.projectile.root.visible,position:battle3d.renderer.grenades.projectile.root.position.toArray()}));assert.ok(flight.visible);
  // Freeze and scrub the real committed event to its peak. This avoids a
  // sub-second screenshot race on machines running other WebGL reviews.
  await page.evaluate(()=>{document.querySelector('#pause').click();const r=battle3d.renderer,s=r.combat.active;s.start=r.presentationNow-(s.event.grenade.release+s.event.trajectories[0].fuse+.22)*1000;r.combat.advance(r.presentationNow);r.grenades.update(s,battle3d.state,r.camera);});
  await page.waitForFunction(()=>battle3d.renderer.grenades.dust.visible);
  const blast=await page.evaluate(()=>{const fx=battle3d.renderer.grenades;return {visible:fx.dust.visible,radius:fx.field?.radius,painted:fx.blast.core.material.uniforms.textured.value,origin:fx.field?.origin,age:battle3d.renderer.combat.active?.phase.blastAge};});
  assert.ok(blast.visible,JSON.stringify(blast));assert.equal(blast.radius,5);assert.equal(blast.painted,1);
  await page.screenshot({path:out+'/'+before.species+'-blast.png'});await page.locator('#pause').click();
  await page.waitForFunction(()=>!battle3d.renderer.busy,{},{timeout:20000});
  assert.equal(await page.evaluate(()=>battle3d.renderer.grenades.session),null);assert.equal(await page.evaluate(()=>battle3d.renderer.grenades.dust.visible),false);report.throws.push({...thrower,flight,blast});
 }
 // Blocked aim remains confirmable under a roof; changing the interaction
 // layer while targeting doesn't move the thrower or spend AP.
 await page.locator('#squad button').first().click();
 await page.evaluate(()=>{const a=battle3d.state.units[0];a.x=29;a.y=20;a.ap=18;battle3d.state.revision++;battle3d.state.seen.add('35,20');});await page.locator('#center').click();await page.locator('#aim-grenade').click();await aim({x:35,y:20,z:0});
 const blocked=await page.evaluate(()=>({reason:battle3d.grenadePreview.reason,ok:battle3d.grenadePreview.ok,blocked:battle3d.grenadePreview.blocked,kind:battle3d.grenadePreview.trajectory.collisions[0]?.kind}));assert.ok(blocked.ok&&blocked.blocked,JSON.stringify(blocked));assert.equal(await page.locator('#grenade-throw').isEnabled(),true);
 await page.screenshot({path:out+'/blocked-lob.png'});await page.locator('#grenade-cancel').click();
 assert.deepEqual(report.errors,[]);report.blocked=blocked;fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({throws:report.throws.map(t=>t.species),blocked,errors:report.errors}));
}finally{await review.closeReview();}
