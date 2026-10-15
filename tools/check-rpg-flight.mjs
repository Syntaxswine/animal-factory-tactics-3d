import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH),review=await launchSiteReview(chromium,'rpg-flight-'+Date.now(),'rpg-flight'),out='artifacts/rpg-flight';
const url=process.env.RPG_FLIGHT_REVIEW_URL||'http://127.0.0.1:4476/tactics/rpg-flight-study.html?paused';
fs.mkdirSync(out,{recursive:true});
const report={configurations:0,errors:[],captures:[],playback:[]};
try{
 const page=await review.browser.newPage({viewport:{width:1360,height:950}});
 page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.rpgFlightReady,{},{timeout:90000});
 for(const range of [8,16,28])for(const view of ['three','side','top'])for(const scale of ['fit','game'])for(const reduced of [false,true]){
  const frames=await page.evaluate(o=>{const a=rpgFlightStudy;a.set(o);const d=a.flight.duration;return [-.1,0,d*.5,d-1e-6,d,d+.1,d+.6,d+.85].map(t=>a.seek(t));},{range,view,scale,reduced});
  assert.equal(frames[0].projectile,false);assert.equal(frames[0].blast,false);assert.equal(frames[2].projectile,!reduced);assert.equal(frames[3].blast,false);assert.equal(frames[4].projectile,false);assert.equal(frames[4].blast,true);assert.equal(frames[5].blast,true);assert.equal(frames.at(-1).blast,false);assert.equal(frames.at(-1).smoke,0);
  if(reduced)assert.ok(frames.every(f=>!f.projectile&&!f.smoke));else assert.ok(frames[5].smoke>0);
  assert.ok(frames.every(f=>[...f.position,...f.origin,...f.impact,f.blastAge].every(Number.isFinite)));report.configurations++;
  if(scale==='fit'){
   const inside=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),a=rpgFlightStudy,{impact}=a.flight,r=4;const points=[];for(const x of [-r,r])for(const y of [0,impact.y+r])for(const z of [-r,r])points.push(new T.Vector3(impact.x+x,y,impact.z+z).project(a.camera));return points.every(p=>Math.abs(p.x)<1&&Math.abs(p.y)<1);});assert.equal(inside,true,'Whole-flight camera crops the blast');
  }
 }
 // Rewinds must restore the loaded warhead, then remove it on release.
 report.rewind=await page.evaluate(()=>{const a=rpgFlightStudy;a.set({range:16,view:'three',scale:'fit',reduced:false});a.seek(.6);a.seek(.25);const before={...rpgFlightState};a.seek(1);a.seek(-.1);const loaded=a.scene.getObjectByName('shaped RPG warhead').visible;a.seek(.25);return {before,after:{...rpgFlightState},loaded,released:!a.scene.getObjectByName('shaped RPG warhead').visible};});
 assert.deepEqual(report.rewind.after,report.rewind.before);assert.equal(report.rewind.loaded,true);assert.equal(report.rewind.released,true);
 const toggle=await page.evaluate(()=>{const a=rpgFlightStudy;a.set({smoke:false});a.seek(.25);const off=rpgFlightState.smoke;a.set({smoke:true});return {off,on:rpgFlightState.smoke};});assert.equal(toggle.off,0);assert.ok(toggle.on>0);report.smokeToggle=toggle;
 for(const view of ['three','side','top']){
  await page.evaluate(view=>rpgFlightStudy.set({view}),view);
  for(const [name,t]of [['launch',.025],['flight',.25],['dust',.78]]){await page.evaluate(t=>rpgFlightStudy.seek(t),t);const file=view+'-'+name+'.png';await page.screenshot({path:out+'/'+file});report.captures.push(file);}
 }
 await page.evaluate(()=>rpgFlightStudy.set({view:'three',scale:'game',range:8}));await page.evaluate(()=>rpgFlightStudy.seek(.12));await page.screenshot({path:out+'/gameplay-flight.png'});
 // Full speed and quarter speed use elapsed seconds, not frame count. Include
 // a deliberately missed frame so a busy renderer cannot slow the flight.
 for(const speed of [1,.25]){
  await page.evaluate(speed=>{rpgFlightStudy.set({range:28,view:'three',scale:'fit',speed,reduced:false});rpgFlightStudy.seek(0);document.getElementById('play').click();},speed);
  const elapsed=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);const begin=performance.now(),t0=rpgFlightState.time;while(performance.now()-begin<120){};await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return {wall:(performance.now()-begin)/1000,animation:rpgFlightState.time-t0};});
  assert.ok(Math.abs(elapsed.animation-elapsed.wall*speed)<.075,JSON.stringify({speed,...elapsed}));report.playback.push({speed,...elapsed});await page.evaluate(()=>document.getElementById('play').click());
 }
 const reduced=await review.browser.newPage({viewport:{width:900,height:700},reducedMotion:'reduce'});
 try{await reduced.goto(url);await reduced.waitForFunction(()=>window.rpgFlightReady);const before=await reduced.evaluate(()=>({...rpgFlightState}));await reduced.waitForTimeout(300);const after=await reduced.evaluate(()=>({...rpgFlightState}));assert.equal(before.reduced,true);assert.equal(before.blast,true);assert.equal(before.projectile,false);assert.equal(after.time,before.time);assert.equal(await reduced.locator('#play').isDisabled(),true);report.reducedMotion=true;}finally{await reduced.close();}
 report.memory=await page.evaluate(()=>{const a=rpgFlightStudy;a.set({range:16,speed:1,reduced:false});a.seek(.6);const before={...a.renderer.info.memory};for(let i=0;i<12;i++){a.set({range:28});a.seek(1);a.set({range:16});a.seek(.6);}return {before,after:{...a.renderer.info.memory}};});assert.deepEqual(report.memory.after,report.memory.before);
 // Texture failure and cancellation while paint is loading must both release
 // late resources; neither may install a running study after page teardown.
 for(const mode of ['failure','cancel']){
  const p=await review.browser.newPage();let blocked=false;
  await p.route(mode==='failure'?'**/smoke-atlas-v1.png':'**/horse-worker-model-paint-v1.png',async route=>{blocked=true;if(mode==='failure')await route.abort();else{await p.evaluate(()=>dispatchEvent(new Event('pagehide')));await route.continue();}});
  try{
   await p.goto(url);await p.waitForFunction(()=>window.rpgFlightDisposed,{},{timeout:90000});assert.equal(blocked,true,'The intended asset load was intercepted');
   assert.equal(await p.evaluate(()=>!!window.rpgFlightReady),false);if(mode==='failure')assert.ok(await p.locator('#error').textContent());report[mode+'Cleanup']=true;
  }finally{await p.close();}
 }
 await page.evaluate(()=>{rpgFlightStudy.dispose();rpgFlightStudy.dispose();});assert.equal(await page.evaluate(()=>window.rpgFlightDisposed),true);assert.deepEqual(report.errors,[]);
 fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await review.closeReview();}
