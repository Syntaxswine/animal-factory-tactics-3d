import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {blankMap,setTerrain} from '../dist/tactics/core/maps.js';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=new URL('../artifacts/level-interaction/',import.meta.url),origin=process.env.EDITOR_ORIGIN||'http://127.0.0.1:4364';
fs.mkdirSync(out,{recursive:true});
const map=blankMap('All levels / selected interaction layer');
map.starts=[{x:14,y:20},{x:14,y:19,z:1},{x:14,y:18,z:2},{x:12,y:23}];map.guards=[];
for(let z=1;z<=2;z++)for(let y=18;y<=23;y++)for(let x=14;x<=22;x++)setTerrain(map,x,y,z,'floor');
map.stairs=[{x:16,y:20,z:0},{x:16,y:20,z:1}];map.canopies=[{x:20,y:19,z:3,kind:'roof-corrugated-flat'}];
const browser=await chromium.launch({channel:'msedge',headless:true});let identity,page;
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('browser-helper.json',out),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',project:'AnimalFactory3D/game',purpose:'Disposable editor and gameplay level interaction regression',start:new Date().toISOString(),port:null,expiry:'End of this command',stop:'browser.close in finally'},null,2));
 page=await browser.newPage({viewport:{width:1500,height:1040}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
 await page.goto(origin+'/tactics/editor-3d.html?editing=1');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,null,{timeout:60000});
 await page.evaluate(async map=>{await editor3d.open(JSON.stringify(map));Object.assign(editor3d.view,{x:18,y:20,span:22});await editor3d.changed();},map);
 const editorGeometry=()=>page.evaluate(()=>{const s=editor3d.scene,m=new Float32Array(16),heights=[];for(const mesh of s.scenery.children)for(let i=0;i<mesh.count;i++){m.set(mesh.instanceMatrix.array.slice(i*16,i*16+16));heights.push(m[13]);}return {max:Math.max(...heights),instances:heights.length,models:s.models.filter(m=>m.root.visible).length,level:s.options.level,all:s.options.showAllLevels};});
 const initial=await editorGeometry();assert(initial.all&&initial.max>6&&initial.models===4);
 for(const level of [1,2,0]){await page.click(`[data-level="${level}"]`);const next=await editorGeometry();assert.equal(next.instances,initial.instances);assert.equal(next.max,initial.max);assert.equal(next.models,4);assert.equal(next.level,level);}
 await page.click('#settings-button');await page.uncheck('#show-all-levels');const cutaway=await editorGeometry();assert(cutaway.max<2.12,JSON.stringify(cutaway));assert.equal(cutaway.models,2);
 await page.check('#show-all-levels');await page.click('#close-settings');assert.equal((await editorGeometry()).instances,initial.instances);
 const editorPoint=async(x,y,z)=>page.evaluate(async({x,y,z})=>{const T=await import('./vendor/three.module.js'),r=document.querySelector('#scene').getBoundingClientRect(),p=new T.Vector3(x,z*2.12,y).project(editor3d.scene.camera);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},{x,y,z});
 for(const level of [0,1,2]){await page.click(`[data-level="${level}"]`);await page.evaluate(()=>new Promise(requestAnimationFrame));const p=await editorPoint(18,21,level);await page.mouse.click(p.x,p.y);assert.equal(await page.evaluate(()=>editor3d.selection?.z),level);}
 await page.screenshot({path:fileURLToPath(new URL('editor-all-levels.png',out))});

 map.guards=[{x:150,y:150,species:'horse',weapon:'rifle'}];
 await page.route('**/default-factory.json',r=>r.fulfill({json:map}));await page.goto(origin+'/tactics/battle-3d.html');await page.waitForFunction(()=>window.battle3d?.state,null,{timeout:60000});
 await page.click('#pause');await page.evaluate(()=>battle3d.renderer.reducedMotion={matches:true});await page.click('#center');
 await page.waitForFunction(()=>[0,1,2,3].every(id=>battle3d.renderer.actors.get(id)?.visible),null,{timeout:60000});
 const battleGeometry=()=>page.evaluate(()=>({levels:[...new Set([...battle3d.renderer.chunks.values()].flatMap(m=>m.userData.boxes.map(b=>b.source.z??0)))].sort(),actors:[...battle3d.renderer.actors].filter(([,m])=>m.visible).map(([id])=>id).sort(),level:battle3d.level}));
 const first=await battleGeometry();assert.deepEqual(first.levels,[0,1,2,3]);assert.deepEqual(first.actors,[0,1,2,3]);
 const reset=()=>page.evaluate(async()=>{const {createGame}=await import('./core/engine.js'),{startEncounterClock}=await import('./encounter-clock.js'),fresh=createGame(0,battle3d.state.definition,true,'easy',{social:true,awareness:true,statSystem:true,rosterSeed:1947});fresh.phase='explore';startEncounterClock(fresh);Object.assign(battle3d.state,fresh);battle3d.state.revision++;});
 const battlePoint=async(x,y,z)=>page.evaluate(({x,y,z})=>{const p=battle3d.project({x,y,z}),r=document.querySelector('#battle').getBoundingClientRect();return {x:r.left+p.x,y:r.top+p.y};},{x,y,z});
 const orders=[];
 for(const level of [0,1]){
  await reset();await page.click(`#battle-levels [data-level="${level}"]`);await page.evaluate(()=>new Promise(requestAnimationFrame));
  const p=await battlePoint(19,21,level);await page.mouse.move(p.x,p.y);await page.waitForFunction(z=>battle3d.walkingPreview[0]?.path.at(-1)?.z===z,level);
  const path=await page.evaluate(()=>battle3d.walkingPreview[0].path);assert.equal(path.at(-1).z,level);if(level===0)assert(path.every(p=>(p.z||0)===0),'ground route must not climb to a visible upper floor');
  await page.click('#pause');await page.mouse.click(p.x,p.y);await page.click('#pause');
  const order=await page.evaluate(()=>({queue:battle3d.state.queue,unit:battle3d.state.units[0]}));orders.push(order.queue);assert(Number.isFinite(order.unit.stamina),'real movement must retain valid stamina');
  const end=order.queue.at(-1)?.goal||order.queue.at(-1)||order.unit;assert.deepEqual([end.x,end.y,end.z||0],[19,21,level]);
  const drawn=await battleGeometry();assert.deepEqual(drawn.levels,first.levels);assert.deepEqual(drawn.actors,first.actors);
  assert.equal(await page.getAttribute(`#battle-levels [data-level="${level}"]`,'aria-pressed'),'true');
 }
 await page.click('#battle-levels [data-level="0"]');await page.screenshot({path:fileURLToPath(new URL('battle-all-levels.png',out))});
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('review.json',out),JSON.stringify({initial,cutaway,first,orders,checks:['all four scenery levels visible','all known character levels visible','optional editor cutaway','editor active-plane selection','ground movement stays on ground beneath visible floors','explicit upper-floor order via stairs','level buttons stay in sync'],errors},null,2));
 console.log('Editor and gameplay show all scenery levels; selections and real movement orders use the chosen layer.');
}catch(e){if(page)await page.screenshot({path:fileURLToPath(new URL('failure.png',out))}).catch(()=>{});throw e;}
finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',out),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
