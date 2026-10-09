import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH),review=await launchSiteReview(chromium,'floor-breaches-'+Date.now()),out='artifacts/floor-breaches',base=process.env.FLOOR_BREACH_REVIEW_URL||'http://127.0.0.1:4476';
fs.mkdirSync(out,{recursive:true});const report={configurations:0,errors:[]};
try{
 const page=await review.browser.newPage({viewport:{width:1400,height:950}});page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(base+'/tactics/floor-breach-study.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.floorBreachReady,{},{timeout:90000});
 const cases=[];
 for(const material of ['concrete','wood','asphalt'])for(const level of [1,2])for(const layout of ['block','strip','elbow','separated','island','edge'])for(const view of ['three','below'])cases.push({material,level,layout,view,size:layout==='separated'?2:3,scale:'game'});
 for(const c of cases){
  const result=await page.evaluate(async o=>{
   const a=floorBreachStudy,frame=a.set(o),{passable}=await import('./core/maps.js'),f=a.fixture;
   return {...frame,workerSupported:passable(f.state,f.worker),missingGeometry:[...a.chunks.values()].flatMap(m=>m.userData.boxes).filter(b=>b.kind==='floor'&&f.removed.some(p=>p.x===b.source.x&&p.y===b.source.y&&p.z===b.source.z)).length};
  },c);
  assert.ok(result.removed>0&&result.edges>0);assert.equal(result.missingGeometry,0);assert.ok(result.workerSupported);report.configurations++;
  if(c.level===1&&['block','island'].includes(c.layout))await page.screenshot({path:out+'/'+c.material+'-'+c.layout+'-'+c.view+'.png'});
 }
 await page.evaluate(()=>floorBreachStudy.set({material:'concrete',level:1,layout:'block',size:1,view:'top',scale:'game'}));
 await page.locator('#widen').click();assert.equal(await page.evaluate(()=>floorBreachState.removed),4);
 await page.locator('#restore').click();assert.equal(await page.evaluate(()=>floorBreachState.shapes.length),0);
 report.memory=await page.evaluate(cases=>{
  const a=floorBreachStudy;for(const c of cases)a.set(c);
  const before={...a.renderer.info.memory};for(let i=0;i<2;i++)for(const c of cases)a.set(c);
  return {before,after:{...a.renderer.info.memory}};
 },cases);assert.deepEqual(report.memory.after,report.memory.before);
 await page.evaluate(()=>{floorBreachStudy.dispose();floorBreachStudy.dispose();});

 // Feed genuine removed upper tiles into the live encounter presentation.
 // No blast or structural-collapse rule is invented by this review fixture.
 await page.goto(base+'/tactics/battle-3d.html?study=wall-breaches',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4,{},{timeout:90000});
 await page.evaluate(async()=>{
  if(!battle3d.paused)document.querySelector('#pause').click();
  const s=battle3d.state,{floorBreachFixture}=await import('./floor-breach-fixture.js'),f=floorBreachFixture({material:'wood',size:2}),shift=layer=>Object.fromEntries(Object.entries(layer).map(([k,v])=>{const [x,y]=k.split(',').map(Number);return [x+12+','+(y+12),v];}));
  s.upper=f.state.upper.map(shift);s.definition.upper=f.state.definition.upper.map(shift);s.edges={};s.definition.edges={};s.revision++;
  Object.assign(s.units[0],{x:17,y:23,z:1});for(let y=12;y<29;y++)for(let x=12;x<29;x++){s.seen.add(x+','+y+',1');s.visible.add(x+','+y+',1');}
 });
 await page.locator('#floor').selectOption('1');await page.locator('#center').click();
 await page.waitForFunction(()=>[...battle3d.renderer.chunks.values()].flatMap(m=>m.userData.boxes).filter(b=>b.floorBreach).length===8);
 report.live=await page.evaluate(()=>{
  const r=battle3d.renderer,broken=[...r.chunks.values()].filter(m=>m.userData.boxes.some(b=>b.floorBreach));
  return {tiles:broken.flatMap(m=>m.userData.boxes).length,xrayMaterials:broken.every(m=>r.wallXray.materials.get(r.material('breach-wood-planks'))?.get(0)===m.material),vertexColors:broken.every(m=>m.material.vertexColors),diagnostics:r.diagnostics};
 });assert.equal(report.live.tiles,8);assert.ok(report.live.xrayMaterials&&report.live.vertexColors);assert.deepEqual(report.live.diagnostics,[]);
 await page.screenshot({path:out+'/live-upper-floor.png'});
 // Same surviving floor data, but a replacement original layout: authored
 // holes must restore straight edges without relying on a geometry change.
 await page.evaluate(()=>{window.originalFloorDefinition=battle3d.state.definition.upper;battle3d.state.definition.upper=structuredClone(battle3d.state.upper);});
 await page.waitForFunction(()=>![...battle3d.renderer.chunks.values()].some(m=>m.userData.boxes.some(b=>b.floorBreach)));
 await page.evaluate(()=>{battle3d.state.definition.upper=window.originalFloorDefinition;delete window.originalFloorDefinition;});
 await page.waitForFunction(()=>[...battle3d.renderer.chunks.values()].flatMap(m=>m.userData.boxes).filter(b=>b.floorBreach).length===8);
 report.definitionReplacement=true;
 report.paint=await page.evaluate(()=>{
  const r=battle3d.renderer;return ['grass','cover-grass','road-diagonal-grass-ne','road-diagonal-concrete-sw-border'].map(kind=>{const m=r.material('breach-'+kind);return {kind,atlas:m.map===r.foliageTexture,colors:m.vertexColors,shader:m.customProgramCacheKey()};});
 });assert.ok(report.paint.every(p=>p.atlas&&p.colors&&p.shader==='painted-foliage-v2-'+p.kind));
 report.fog=await page.evaluate(async()=>{
  const r=battle3d.renderer,s=battle3d.state,{buildWorld}=await import('./hybrid-world.js'),difficulty=s.difficulty;s.difficulty='normal';r.rebuild(buildWorld(s),new Set(),1,s);
  const hidden=r.chunks.size;s.difficulty=difficulty;r.rebuild(buildWorld(s),s.seen,3,s);
  return {hidden,restored:[...r.chunks.values()].flatMap(m=>m.userData.boxes).filter(b=>b.floorBreach).length};
 });assert.equal(report.fog.hidden,0);assert.equal(report.fog.restored,8);
 assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await review.closeReview();}
