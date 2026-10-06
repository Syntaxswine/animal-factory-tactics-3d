import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {blankMap,stampRoom,setTerrain} from '../dist/tactics/core/maps.js';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=new URL('../artifacts/xray-levels/',import.meta.url),origin=process.env.REVIEW_URL||'http://127.0.0.1:4364';
fs.mkdirSync(out,{recursive:true});
const map=blankMap('Three-story X-ray and undiscovered interiors');
map.starts=[{x:9,y:12},{x:6,y:12},{x:6,y:13},{x:6,y:14}];map.guards=[];
for(let z=0;z<3;z++){
 stampRoom(map,10,10,6,6,z);
 for(const key of Object.keys(map.edges))map.edges[key]='wall-brick';
 for(let x=19;x<22;x++)for(let y=11;y<14;y++)setTerrain(map,x,y,z,'floor');
}
map.canopies=[];for(let x=10;x<16;x+=2)for(let y=10;y<16;y+=2)map.canopies.push({x,y,z:3,kind:'roof-corrugated-flat'});
map.props=[{x:12,y:12,z:1,kind:'barrel-explosive'}];
const browser=await chromium.launch({channel:'msedge',headless:true});let identity,page;const errors=[];
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('browser-helper.json',out),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',project:'AnimalFactory3D/game',purpose:'Disposable selected-level X-ray pixel and fog regression',start:new Date().toISOString(),port:null,expiry:'End of this command',stop:'browser.close in finally'},null,2));
 page=await browser.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:2});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/default-factory.json',r=>r.fulfill({json:map}));await page.goto(origin+'/tactics/battle-3d.html');
 await page.waitForFunction(()=>window.battle3d?.state,null,{timeout:60000});await page.click('#pause');
 await page.waitForFunction(()=>battle3d.renderer.models.size===4&&battle3d.renderer.paintedEnvironment.library&&battle3d.renderer.lights.library,null,{timeout:60000});
 await page.evaluate(()=>{
  const s=battle3d.state;s.difficulty='easy';s.seen.clear();s.visible.clear();
  for(let x=10;x<16;x++)for(let y=10;y<16;y++)s.seen.add(`${x},${y}`);
  for(let x=19;x<22;x++)for(let y=11;y<14;y++)for(let z=0;z<3;z++)s.seen.add(z?`${x},${y},${z}`:`${x},${y}`);
  battle3d.renderer.world=null;battle3d.renderer.reducedMotion={matches:true};
 });
 const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const point=async(x,y,h)=>page.evaluate(async({x,y,h})=>{
  const T=await import('./vendor/three.module.js'),c=document.querySelector('#battle'),r=c.getBoundingClientRect(),p=new T.Vector3(x,h,y).project(battle3d.renderer.camera);
  return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
 },{x,y,h});
 const pixels=p=>page.evaluate(({x,y})=>{
  const c=battle3d.renderer.renderer.domElement,r=document.querySelector('#battle').getBoundingClientRect(),canvas=document.createElement('canvas');
  canvas.width=c.width;canvas.height=c.height;const ctx=canvas.getContext('2d');ctx.drawImage(c,0,0);
  return [...ctx.getImageData(Math.round((x-r.left)*c.width/r.width)-2,Math.round((y-r.top)*c.height/r.height)-2,5,5).data];
 },p);
 const hover=async p=>{await page.mouse.move(p.x,p.y);await frame();};
 const clear=async()=>{await page.mouse.move(10,10);await frame();};
 const changed=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0);
 await frame();const knowledge=await page.evaluate(()=>({seen:[...battle3d.state.seen],visible:[...battle3d.state.visible],hidden:[...battle3d.renderer.interiorFog.hidden]})),samples=[];
 for(const selected of [0,1,2]){
  await page.click(`#battle-levels [data-level="${selected}"]`);await frame();
  assert.equal(await page.evaluate(()=>battle3d.renderer.wallXray.uniforms.xraySelectedLevel.value),selected);
  for(const wall of [0,1,2]){
   await clear();const p=await point(15.58,13,wall*2.12+1),before=await pixels(p);await hover(p);const after=await pixels(p),delta=changed(before,after);
   samples.push({selected,wall,delta});if(wall<selected)assert.equal(delta,0,`Level ${selected+1} must not X-ray wall ${wall+1}`);else assert(delta>20,`Wall ${wall+1} must open at level ${selected+1}: ${delta}`);
  }
  // Keep the sample off the wireframe's projected wall-corner line.
  const interior=await point(12.17,11.83,selected*2.12+.02);await hover(interior);const patch=await pixels(interior),black=patch.every((v,i)=>i%4===3?v===255:v===0);
  assert.equal(black,selected>0,selected===0?'Discovered ground floor must show through upper roofs, slabs and fog':'Undiscovered selected room must stay black');
  await page.screenshot({path:fileURLToPath(new URL(`selected-level-${selected+1}.png`,out))});
 }
 // Selecting the platform itself must keep its floor; selecting below it opens it.
 for(const selected of [1,2]){
  await page.click(`#battle-levels [data-level="${selected}"]`);await clear();const p=await point(20,12,2*2.12),before=await pixels(p);await hover(p);
  const delta=changed(before,await pixels(p));if(selected===2)assert.equal(delta,0,'Selected floor must not become a hole');else assert(delta>20,'Overhead floor must cut away');
 }
 assert.deepEqual(await page.evaluate(()=>({seen:[...battle3d.state.seen],visible:[...battle3d.state.visible],hidden:[...battle3d.renderer.interiorFog.hidden]})),knowledge);
 assert.equal(await page.evaluate(()=>battle3d.renderer.paintedEnvironment.count),0,'X-ray must not expose the undiscovered upper barrel');
 const memory=await page.evaluate(()=>({...battle3d.renderer.renderer.info.memory}));
 for(let i=0;i<12;i++){await page.click(`#battle-levels [data-level="${i%3}"]`);await frame();}
 assert.deepEqual(await page.evaluate(()=>({...battle3d.renderer.renderer.info.memory})),memory,'Level switching must reuse materials and geometry');
 await clear();assert.equal(await page.evaluate(()=>battle3d.renderer.wallXray.uniforms.xrayActive.value),false);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(new URL('review.json',out),JSON.stringify({samples,memory,checks:['lower walls stay solid','selected and higher walls open','upper slabs, roofs and fog open','selected floor retained','selected unexplored rooms stay black','hidden contents and exploration unchanged','real level buttons','no GPU growth','pointer exit restores surfaces'],errors},null,2));
 console.log('Selected-level X-ray, roof/floor cutaway, interior fog and render resource checks pass.');
}catch(e){if(page)await page.screenshot({path:fileURLToPath(new URL('failure.png',out))}).catch(()=>{});throw e;}
finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',out),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
