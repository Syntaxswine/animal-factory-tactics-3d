import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=new URL('../artifacts/battle-3d/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1280,height:820}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4318/tactics/battle-3d.html');
 await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4&&battle3d.renderer.paintedEnvironment.count===261);
 async function walk(reduced){
  const box=await page.locator('#battle').boundingBox(),point=await page.evaluate(()=>battle3d.project({x:4,y:4,z:0}));
  const observation=page.evaluate(()=>new Promise(resolve=>{const samples=[],start=performance.now();function sample(){const b=battle3d,u=b.state.units[0],s=b.renderer.displayUnit(u),model=b.renderer.models.get(0);samples.push({x:s.x,logicalX:u.x,blend:s.blend,knee:model.worker.bones.find(b=>b.name==='shin1').quaternion.toArray(),weapon:model.worker.weapon.id});if(performance.now()-start>2200)resolve(samples);else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));
  await page.mouse.click(box.x+point.x,box.y+point.y);
  if(!reduced){await page.waitForFunction(()=>{const b=battle3d,s=b.renderer.displayUnit(b.state.units[0]);return s.x>3.15&&s.x<3.85;});await page.screenshot({path:fileURLToPath(new URL('walking-midstep.png',out))});}
  const samples=await observation;
  assert.ok(samples.every(s=>Number.isInteger(s.logicalX)),'Rendering changed grid coordinates');assert.equal(samples.at(-1).logicalX,4);assert.equal(samples.at(-1).x,4);assert.equal(samples.at(-1).blend,0);assert.ok(samples.every(s=>s.weapon==='assault'));
  if(reduced)assert.ok(samples.every(s=>Number.isInteger(s.x)&&s.blend===0));
  else {assert.ok(samples.filter(s=>s.x>3&&s.x<4).length>=4,'Missing intermediate movement frames');assert.ok(new Set(samples.map(s=>s.knee.join(','))).size>4,'Leg pose did not animate');}
  return {frames:samples.length,intermediate:samples.filter(s=>s.x>3&&s.x<4).length,settled:samples.at(-1)};
 }
 const walking=await walk(false);await page.emulateMedia({reducedMotion:'reduce'});await page.click('#restart');await page.waitForFunction(()=>battle3d.renderer.models.size>=4);const reduced=await walk(true);
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('motion-results.json',out),JSON.stringify({walking,reduced,errors},null,2));console.log(JSON.stringify({walking,reduced,errors}));
}finally{await browser.close();}
