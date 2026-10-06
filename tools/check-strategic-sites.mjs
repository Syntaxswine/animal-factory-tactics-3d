import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const dependency=process.env.PLAYWRIGHT_PATH;
if(!dependency)throw Error('Set PLAYWRIGHT_PATH to an installed Playwright package');
const {chromium}=await import(pathToFileURL(path.join(dependency,'index.mjs')));
const out=path.resolve(import.meta.dirname,'../artifacts/strategic-sites');
fs.mkdirSync(out,{recursive:true});
const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4475';
const review=await launchSiteReview(chromium,'render-check');
const errors=[],checks=[];
try{
 const page=await review.browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin+'/tactics/strategic-sites-study.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.sitesStudy?.ready);
 for(const site of ['radio','radar','sam']){
  await page.evaluate(id=>window.sitesStudy.select(id,'pair'),site);
  await page.screenshot({path:path.join(out,site+'-pair.png')});
  for(const mode of ['intact','destroyed']){
   await page.evaluate(([id,state])=>window.sitesStudy.select(id,state),[site,mode]);
   for(const view of ['three','side','rear','top']){
    await page.evaluate(v=>window.sitesStudy.view(v),view);
    const d=await page.evaluate(()=>window.sitesStudy.diagnostics());assert.equal(d.assets.length,1);assert.equal(d.site,site);assert.equal(d.mode,mode);
    for(const worker of d.workers)assert(Math.abs((worker.min[0]+worker.max[0])/2-worker.root[0])<.5,'Skinned scale reference lost its root transform');
    await page.screenshot({path:path.join(out,site+'-'+mode+'-'+view+'.png')});checks.push({site,mode,view,triangles:d.assets[0].triangles});
   }
  }
  await page.evaluate(()=>window.sitesStudy.view('three'));
 }
 // The exact same foundation must land on the same screen pixels after damage,
 // including after the user orbits and zooms. Test the real controls and API.
 const anchorPixels=()=>{
  const s=window.sitesStudy,d=s.diagnostics(),V=s.camera.position.constructor;
  const points=[[-4,.24,-4],[4,.24,4],...d.assets[0].foundations.map(f=>f.min)];
  return {ppu:d.ppu,focus:d.focus,zoom:d.zoom,azimuth:d.azimuth,elevation:d.elevation,pixels:points.map(p=>new V(...p).project(s.camera).toArray())};
 };
 for(const site of ['radio','radar','sam'])for(const scale of ['fit','58','95'])for(const frame of ['site','ground']){
  await page.evaluate(id=>window.sitesStudy.select(id,'intact'),site);await page.selectOption('#scale',scale);await page.selectOption('#view','three');await page.selectOption('#frame',frame);
  const stage=await page.locator('canvas').boundingBox();
  await page.mouse.move(stage.x+stage.width*.60,stage.y+stage.height*.35);await page.mouse.down();await page.mouse.move(stage.x+stage.width*.60+38,stage.y+stage.height*.35+12);await page.mouse.up();await page.mouse.wheel(0,-115);
  await page.waitForTimeout(80);
  const before=await page.evaluate(anchorPixels);await page.click('#damage');
  assert.equal((await page.evaluate(()=>window.sitesStudy.diagnostics())).mode,'destroyed');
  assert.deepEqual(await page.evaluate(anchorPixels),before,site+' foundations move on damage at '+scale);
  await page.evaluate(id=>window.sitesStudy.select(id,'intact'),site);assert.deepEqual(await page.evaluate(anchorPixels),before,'API state swap resets view');
 }
 await page.selectOption('#scale','fit');await page.selectOption('#frame','site');await page.check('#passage');await page.check('#foundations');
 for(const site of ['radio','radar','sam'])for(const profile of ['horse','wide']){
  await page.evaluate(id=>window.sitesStudy.select(id,'pair'),site);await page.selectOption('#profile',profile);await page.selectOption('#view','top');
  const d=await page.evaluate(()=>window.sitesStudy.diagnostics());assert.equal(d.clearance.length,2);
  const shown=await page.evaluate(()=>{const m=window.sitesStudy.scene.getObjectByName('standing-clearance-cells'),p=m.instanceMatrix.array,c=m.instanceColor.array;return {count:m.count,positions:Array.from({length:m.count},(_,i)=>[p[i*16+12],p[i*16+13],p[i*16+14]]),colors:Array.from({length:m.count},(_,i)=>[c[i*3],c[i*3+1],c[i*3+2]])};});
  assert.equal(shown.count,128);
  d.clearance.forEach((map,i)=>map.cells.forEach((c,j)=>{
   const p=shown.positions[i*64+j],color=shown.colors[i*64+j];assert(Math.abs(p[0]-((i-.5)*10.2+c.center[0]))<.0001);assert(Math.abs(p[1]-map.surfaceHeight-.010)<.0001);assert(Math.abs(p[2]-c.center[1])<.0001);
   assert(c.reachable?color[1]>color[0]:color[0]>color[1],'Overlay color contradicts mask');
  }));
  const options=await page.locator('#tile option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(v=>v!=='outside'));
  const expected=d.clearance[0].cells.filter(c=>c.reachable&&d.clearance[1].cells.find(t=>t.x===c.x&&t.z===c.z).reachable).map(c=>[c.x,c.z].join(','));assert.deepEqual(options,expected);
  const target=expected.at(-1).split(',').map(Number);await page.selectOption('#tile',target.join(','));
  const placed=await page.evaluate(()=>window.sitesStudy.diagnostics());assert.deepEqual(placed.placementCell,target);
  placed.workers.forEach((w,i)=>{assert.deepEqual(w.scale,[1,1,1]);assert(Math.abs(w.root[0]-((i-.5)*10.2+target[0]-3.5))<.00001);assert.equal(w.root[1],.24);assert.equal(w.root[2],target[1]-3.5);assert(Math.abs(w.max[1]-w.min[1]-1.65)<.005);});
  await page.screenshot({path:path.join(out,site+'-passage-'+profile+'.png')});
 }
 // A blocked tile cannot silently teleport the reference into equipment.
 const priorPlacement=await page.evaluate(()=>window.sitesStudy.diagnostics().placementCell);
 assert.equal(await page.evaluate(()=>window.sitesStudy.placeHorse([3,3])),false);assert.deepEqual(await page.evaluate(()=>window.sitesStudy.diagnostics().placementCell),priorPlacement);
 // Exercise pointer placement, not only a diagnostic API.
 await page.evaluate(()=>window.sitesStudy.select('radio','intact'));await page.selectOption('#profile','horse');await page.selectOption('#view','top');
 const point=await page.evaluate(()=>{const s=window.sitesStudy,V=s.camera.position.constructor,p=new V(-2.5,.24,3.5).project(s.camera),r=s.renderer.domElement.getBoundingClientRect();return [r.x+(p.x+1)*r.width/2,r.y+(1-p.y)*r.height/2];});
 await page.mouse.click(...point);assert.deepEqual(await page.evaluate(()=>window.sitesStudy.diagnostics().placementCell),[1,7]);
 await page.selectOption('#view','front');await page.selectOption('#frame','ground');await page.selectOption('#scale','95');await page.uncheck('#passage');await page.screenshot({path:path.join(out,'radio-door-scale.png')});
 const framedPlayer=await page.evaluate(()=>{const s=window.sitesStudy,d=s.diagnostics(),V=s.camera.position.constructor,w=d.workers[0];return [new V(...w.min).project(s.camera).y,new V(...w.max).project(s.camera).y];});assert(framedPlayer.every(y=>Math.abs(y)<1),'Ground framing must show the entire scale reference');
 await page.selectOption('#scale','fit');await page.selectOption('#frame','site');await page.selectOption('#view','three');await page.uncheck('#foundations');
 // Exercise actual controls at game scale and ensure resource ownership is bounded.
 const stable=await page.evaluate(()=>window.sitesStudy.diagnostics().gpu);
 for(let i=0;i<12;i++)await page.evaluate(i=>window.sitesStudy.select(['radio','radar','sam'][i%3],i%2?'pair':'destroyed'),i);
 const after=await page.evaluate(()=>window.sitesStudy.diagnostics().gpu);assert.deepEqual(after,stable,'Repeated switches must reuse GPU resources');
 const workers=await page.evaluate(()=>window.sitesStudy.diagnostics().workers);
 assert.equal(workers.length,2);assert(workers[1].min[0]-workers[0].max[0]>9,'Comparison horses must occupy separate sites');
 for(const id of ['radio','radar','sam']){
  await page.selectOption('#site',id);await page.selectOption('#mode','pair');await page.selectOption('#scale','58');
  assert.equal((await page.evaluate(()=>window.sitesStudy.diagnostics())).ppu,58);
  await page.screenshot({path:path.join(out,id+'-gameplay.png')});
 }
 await page.check('#grey');await page.screenshot({path:path.join(out,'sam-grey.png')});
 await page.check('#wire');await page.check('#grid');await page.uncheck('#horse');await page.screenshot({path:path.join(out,'sam-wire.png')});
 await page.uncheck('#grey');await page.uncheck('#wire');await page.uncheck('#grid');await page.check('#horse');
 await page.selectOption('#scale','fit');await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(out,'mobile.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal page overflow');
 assert.equal(await page.locator('.measure:visible').count(),0,'Hide vertical labels at tiny fit scales');
 await page.evaluate(()=>window.sitesStudy.dispose());assert.equal((await page.evaluate(()=>window.sitesStudy.diagnostics())).disposed,true);
 assert.deepEqual(errors,[],'Browser errors');
 fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({passed:true,checks,lockedCameraComparisons:18,passageProfileComparisons:6,nativePlayerPlacement:true,errors,gpu:after},null,2));
 console.log('Strategic sites: '+checks.length+' model/view combinations, 18 locked-camera damage swaps, six passage/profile maps, native player placement, controls and lifecycle passed');
}finally{await review.closeReview();}
