import {createRequire} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=new URL('../artifacts/battle-movement-modes/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1280,height:940}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4331/tactics/battle-3d.html');
 const ready=()=>page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4);
 await ready();
 for(const mode of ['run','sneak','walk']){
  await page.click('#restart');await ready();if(mode!=='walk')await page.click('#move-'+mode);
  const text=await page.locator('#movement-info').textContent();assert.match(text,new RegExp('^'+({run:1,sneak:3,walk:2}[mode])+' AP per straight tile'));
  if(mode==='sneak')assert.match(text,/stealth 40/);
  const box=await page.locator('#battle').boundingBox(),p=await page.evaluate(()=>battle3d.project({x:4,y:4,z:0}));
  const sampling=page.evaluate(()=>new Promise(resolve=>{const rows=[],start=performance.now();function frame(){const b=battle3d,u=b.state.units[0],p=b.renderer.displayUnit(u);rows.push({t:performance.now()-start,x:p.x,logical:u.x,stealth:u.stealth});if(performance.now()-start>2100)resolve(rows);else requestAnimationFrame(frame);}frame();}));
  await page.mouse.click(box.x+p.x,box.y+p.y);
  await page.waitForFunction(()=>{const b=battle3d,x=b.renderer.displayUnit(b.state.units[0]).x;return x>3.15&&x<3.8;});
  await page.screenshot({path:fileURLToPath(new URL(mode+'.png',out))});
  const rows=await sampling,first=rows.find(r=>r.x>3&&r.x<4),last=rows.find(r=>r.x===4),elapsed=last.t-first.t,expected={run:250,walk:500,sneak:1000}[mode];
  assert.ok(elapsed>expected-100&&elapsed<expected+100,mode+' interpolation duration '+elapsed);assert.ok(rows.every(r=>r.stealth===20&&Number.isInteger(r.logical)));results.push({mode,elapsed,expected,errors:[]});
 }
 await page.click('#restart');await ready();for(let i=1;i<4;i++)await page.locator('#squad button').nth(i).click({modifiers:['Shift']});
 for(const mode of ['sneak','run','walk']){await page.click('#move-'+mode);assert.equal(await page.locator('#move-'+mode).getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>battle3d.selectedIds.length),4);assert.ok(await page.evaluate(mode=>battle3d.state.units.filter(u=>u.team==='squad').every(u=>mode==='sneak'?u.sneaking&&!u.running:mode==='run'?u.running&&!u.sneaking:!u.running&&!u.sneaking),mode));}
 // Group cadence is governed by moving members, not whichever merc is primary.
 await page.click('#restart');await ready();await page.click('#move-run');await page.locator('#squad button').nth(1).click();await page.click('#move-sneak');await page.locator('#squad button').nth(0).click({modifiers:['Shift']});
 const box=await page.locator('#battle').boundingBox(),p=await page.evaluate(()=>battle3d.project({x:5,y:4,z:0}));
 const samples=page.evaluate(()=>new Promise(resolve=>{const rows=[],start=performance.now();function frame(){rows.push({t:performance.now()-start,units:battle3d.state.units.slice(0,2).map(u=>({id:u.id,logical:u.x,x:battle3d.renderer.displayUnit(u).x,steps:u.steps}))});if(performance.now()-start>3100)resolve(rows);else requestAnimationFrame(frame);}frame();}));
 await page.mouse.click(box.x+p.x,box.y+p.y);const rows=await samples;
 const steps=rows.filter((r,i)=>i&&r.units[1].steps>rows[i-1].units[1].steps);assert.ok(steps.length>=2);assert.ok(steps[1].t-steps[0].t>=950,'slow group member cut off by next core step');
 assert.ok(rows.some(r=>r.units[0].x===r.units[0].logical&&r.units[1].x!==r.units[1].logical),'fast member should settle while slow member finishes');
 await page.emulateMedia({reducedMotion:'reduce'});await page.click('#restart');await ready();await page.click('#move-sneak');
 const rp=await page.evaluate(()=>battle3d.project({x:4,y:4,z:0}));await page.mouse.click(box.x+rp.x,box.y+rp.y);await page.waitForFunction(()=>battle3d.state.units[0].x===4);assert.equal(await page.evaluate(()=>battle3d.renderer.displayUnit(battle3d.state.units[0]).x),4);
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('results.json',out),JSON.stringify({results,mixedGroupInterval:steps[1].t-steps[0].t,groupControls:true,reducedMotion:true,errors},null,2));console.log(JSON.stringify({results,mixedGroupInterval:steps[1].t-steps[0].t,errors}));
}finally{await browser.close();}
