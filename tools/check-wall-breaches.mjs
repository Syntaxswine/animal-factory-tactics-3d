import {clickBattleControl} from './battle-ui-review.mjs';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH),review=await launchSiteReview(chromium,'wall-breaches-'+Date.now()),out='artifacts/wall-breaches',base=process.env.WALL_BREACH_REVIEW_URL||'http://127.0.0.1:4476';
fs.mkdirSync(out,{recursive:true});
const report={configurations:0,shots:[],errors:[]};
try{
 const page=await review.browser.newPage({viewport:{width:1360,height:950}});page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(base+'/tactics/wall-breach-study.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.wallBreachReady,{},{timeout:90000});
 const cases=[];
 for(const material of ['brick','concrete','corrugated'])for(const axis of ['s','e'])for(const level of [0,1])for(const count of [0,1,3,5])cases.push({material,axis,level,count,layout:'straight',view:'three',scale:'game'});
 for(const layout of ['corner','separated','window'])cases.push({material:'brick',axis:'s',level:0,count:layout==='separated'?2:1,layout,view:'front',scale:'close'});
 for(const c of cases){
  const frame=await page.evaluate(c=>wallBreachStudy.set(c),c);assert.equal(frame.removed,c.count);assert.equal(frame.ends,c.layout==='separated'?4:c.count?2:0);report.configurations++;
 }
 const memory=await page.evaluate(cases=>{
  const a=wallBreachStudy;
  for(const c of cases)a.set(c);
  const before={...a.renderer.info.memory};
  for(let i=0;i<3;i++)for(const c of cases)a.set(c);
  return {before,after:{...a.renderer.info.memory}};
 },cases);assert.deepEqual(memory.after,memory.before);report.memory=memory;
 for(const material of ['brick','concrete','corrugated']){
  await page.evaluate(material=>wallBreachStudy.set({material,axis:'s',level:0,count:3,layout:'straight',view:'three',scale:'game'}),material);
  await page.screenshot({path:out+'/'+material+'-gameplay.png'});
 }
 await page.evaluate(()=>{wallBreachStudy.dispose();wallBreachStudy.dispose();});

 await page.goto(base+'/tactics/battle-3d.html?study=wall-breaches',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4,{},{timeout:90000});
 await page.evaluate(async()=>{if(!battle3d.paused)document.querySelector('#pause').click();await battle3d.renderer.grenades.ready;});
 for(const [row,material]of [[20,'brick'],[14,'concrete'],[8,'corrugated']]){
  const shot=await page.evaluate(async ({row,material})=>{
   const {attackGround}=await import('./core/engine.js'),{wallBreachEnds}=await import('./wall-breaches.js'),{canStep}=await import('./core/maps.js'),s=battle3d.state,r=battle3d.renderer,a=s.units[0];
   s.phase='player';s.rules.awareness=false;a.ap=18;a.ammo.rpg=2;a.x=20;a.y=row+5;a.z=0;s.revision++;
   for(let y=row-3;y<=row+6;y++)for(let x=12;x<=31;x++){s.seen.add(x+','+y);s.visible.add(x+','+y);}
   const before={ap:a.ap,ammo:a.ammo.rpg},accepted=attackGround(s,a,{x:20,y:row-1,z:0});r.captureCombat(s);
   // The visual branch also has a newer launcher animation. This integration
   // exercises wall destruction with either the existing instantaneous RPG
   // presentation or that animation, without importing unrelated launcher work.
   const shot=r.combat.active;if(shot){shot.start=r.presentationNow-220;r.combat.advance(r.presentationNow);}
   const removed=Object.keys(s.definition.edges).filter(k=>k.endsWith(':'+row)&&!s.edges[k]),opening=removed.map(k=>+k.split(':')[1]).sort((a,b)=>a-b);
   return {material,accepted,before,after:{ap:a.ap,ammo:a.ammo.rpg},removed,opening,structures:s.effect?.structures,ends:[...wallBreachEnds(s)].filter(([k])=>k.endsWith(':'+row)),walkable:opening.every(x=>canStep(s,{x,y:row+1,z:0},{x,y:row,z:0})),diagnostics:r.diagnostics};
  },{row,material});
  assert.ok(shot.accepted,JSON.stringify(shot));assert.equal(shot.after.ap,shot.before.ap-7);assert.equal(shot.after.ammo,shot.before.ammo-1);
  assert.ok(shot.structures.some(s=>s.destroyed&&s.hp===0));
  assert.ok(shot.removed.length>=1,JSON.stringify(shot));assert.equal(shot.ends.length,2);assert.ok(shot.walkable);
  assert.equal(shot.opening.at(-1)-shot.opening[0]+1,shot.opening.length);assert.deepEqual(shot.diagnostics,[]);
  await page.evaluate(()=>{const r=battle3d.renderer;if(r.combat.active){r.combat.active.start=r.presentationNow-801;r.combat.advance(r.presentationNow);}});
  await clickBattleControl(page,'#center');
  await page.waitForFunction(row=>[...battle3d.renderer.chunks.values()].flatMap(m=>m.userData.boxes).filter(b=>b.breachEnds&&b.source.edge.endsWith(':'+row)).length===2,row);
  await page.screenshot({path:out+'/'+material+'-live-breach.png'});report.shots.push(shot);
 }
 // X-ray derives the outline from the actual fracture geometry, retaining the
 // opening instead of introducing a rectangular phantom wall across it.
 report.xray=await page.evaluate(()=>{
  const r=battle3d.renderer,xray=r.wallXray,broken=[...r.chunks.values()].filter(m=>m.userData.boxes.some(b=>b.breachEnds));
  xray.setPointer(r.width/2,r.height/2);xray.update(r.width,r.height,battle3d.view.zoom,1,0);
  return {broken:broken.length,outlined:broken.filter(m=>xray.overlays.has(m)).length,points:broken.map(m=>xray.overlays.get(m)?.geometry.attributes.position.count),colored:broken.every(m=>m.material.vertexColors)};
 });assert.ok(report.xray.broken>=6);assert.equal(report.xray.outlined,report.xray.broken);assert.ok(report.xray.points.every(n=>n>24));assert.ok(report.xray.colored);
 // A known empty world must not reveal fractured structures in unseen cells.
 report.fog=await page.evaluate(async()=>{
  const {buildWorld}=await import('./hybrid-world.js'),s=battle3d.state,r=battle3d.renderer,before=s.difficulty;s.difficulty='normal';
  r.rebuild(buildWorld(s),new Set(),0,s);const hidden=r.chunks.size;s.difficulty=before;r.rebuild(buildWorld(s),s.seen,3,s);
  return {hidden,restored:[...r.chunks.values()].filter(m=>m.userData.boxes.some(b=>b.breachEnds)).length};
 });assert.equal(report.fog.hidden,0);assert.ok(report.fog.restored>=6);
 assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await review.closeReview();}
