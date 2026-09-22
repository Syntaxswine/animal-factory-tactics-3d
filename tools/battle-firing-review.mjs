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
 await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4);
 await page.locator('#squad button').nth(1).click();
 await page.evaluate(async()=>{const {refresh}=await import('./core/engine.js'),s=battle3d.state,g=s.units[4];g.x=7;g.y=6;g.hp=g.maxHp=200;refresh(s);});
 await page.waitForFunction(()=>battle3d.picks.some(p=>p.id===4));
 const box=await page.locator('#battle').boundingBox(),point=await page.evaluate(()=>{const b=battle3d,c=document.getElementById('battle'),p=b.picks.find(p=>p.id===4);for(const h of [30,40,20,50]){const y=p.py-h*b.view.zoom;if(b.renderer.pick(p.px,y,c.clientWidth,c.clientHeight)===4)return {x:p.px,y};}throw Error('Cannot pick test target');});
 await page.mouse.click(box.x+point.x,box.y+point.y);
 const before=await page.evaluate(()=>({ammo:battle3d.state.units[1].ammo.rifle,ap:battle3d.state.units[1].ap}));
 const samplesPromise=page.evaluate(()=>new Promise(resolve=>{const rows=[],start=performance.now();function sample(){const r=battle3d.renderer,a=r.combat.active,m=r.models.get(1),fx=r.shotEffects;rows.push({busy:r.busy,aim:a?.phase.aim||0,recoil:a?.phase.recoil||0,flash:fx.flash.visible,trace:fx.trace.visible,impact:fx.impact.visible,flashError:fx.flash.visible&&m.firing?fx.flash.position.distanceTo(m.firing.muzzle().origin):0,traceOrigin:fx.trace.visible?Array.from(fx.trace.geometry.attributes.position.array).slice(0,3):null,frozen:a?.traceOrigin?.toArray()});if(performance.now()-start>1900)resolve(rows);else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));
 await page.click('#fire');
 const resolved=await page.evaluate(()=>JSON.stringify(battle3d.state,(_,v)=>v instanceof Set?[...v].sort():v));
 await page.waitForFunction(()=>battle3d.renderer.shotEffects.flash.visible);
 await page.screenshot({path:fileURLToPath(new URL('rifle-discharge.png',out))});
 const samples=await samplesPromise;
 assert.ok(samples.some(s=>s.aim>0&&s.aim<1));assert.ok(samples.some(s=>s.flash));assert.ok(samples.some(s=>s.trace));assert.ok(samples.some(s=>s.recoil>.5));assert.equal(samples.at(-1).busy,false);
 for(const s of samples){assert.ok(s.flashError<1e-7);if(s.trace)assert.ok(Math.hypot(...s.traceOrigin.map((n,i)=>n-s.frozen[i]))<1e-5);}
 assert.equal(await page.evaluate(()=>JSON.stringify(battle3d.state,(_,v)=>v instanceof Set?[...v].sort():v)),resolved,'Playback changed the simulation');
 assert.equal(await page.evaluate(()=>battle3d.state.units[1].ammo.rifle),before.ammo-1);
 await page.emulateMedia({reducedMotion:'reduce'});await page.click('#fire');
 const reduced=await page.evaluate(()=>({flash:battle3d.renderer.combat.active.phase.flash,recoil:battle3d.renderer.combat.active.phase.recoil}));assert.deepEqual(reduced,{flash:false,recoil:0});
 await page.waitForFunction(()=>!battle3d.renderer.busy);assert.deepEqual(errors,[]);
 const result={frames:samples.length,flashFrames:samples.filter(s=>s.flash).length,traceFrames:samples.filter(s=>s.trace).length,reduced,errors};fs.writeFileSync(new URL('firing-results.json',out),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
