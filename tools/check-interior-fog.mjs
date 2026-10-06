import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {blankMap,stampRoom} from '../dist/tactics/core/maps.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const out=new URL('../artifacts/interior-fog/',import.meta.url),origin=process.env.EDITOR_ORIGIN||'http://127.0.0.1:4364';fs.mkdirSync(out,{recursive:true});
const map=blankMap('Unexplored room');map.starts=[{x:9,y:11},{x:2,y:2},{x:2,y:3},{x:2,y:4}];map.guards=[{x:15,y:12,species:'horse',weapon:'rifle'}];
stampRoom(map,10,8,7,6);for(const edge of Object.keys(map.edges))map.edges[edge]='wall-brick';map.edges['e:9:11']='door-wood-closed';
map.props=[{x:12,y:11,z:0,kind:'barrel-explosive'},{x:14,y:11,z:0,kind:'floor-lamp',lightMode:'on'},{x:12,y:9,z:0,kind:'hospital-bed'}];
const browser=await chromium.launch({channel:'msedge',headless:true});let identity,page;const errors=[];
try{
 const cdp=await browser.newBrowserCDPSession(),info=await cdp.send('SystemInfo.getProcessInfo'),pid=info.processInfo.find(p=>p.type==='browser').id;
 identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${Number(pid)} | Select-Object Id,Path,@{n='CreationFileTime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8',windowsHide:true}));
 fs.writeFileSync(new URL('browser-helper.json',out),JSON.stringify({identity,owner:process.env.CODEX_THREAD_ID||'01a0c679-1b4c-7322-a1a3-64e8f6a9247a',project:'AnimalFactory3D/game',purpose:'Disposable interior fog visual and door/window gameplay check',start:new Date().toISOString(),port:null,expiry:'End of this command',stop:'browser.close in finally'},null,2));
 page=await browser.newPage({viewport:{width:1400,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/default-factory.json',r=>r.fulfill({json:map}));await page.goto(origin+'/tactics/battle-3d.html');await page.waitForFunction(()=>window.battle3d?.state,null,{timeout:60000});await page.click('#pause');
 await page.waitForFunction(()=>battle3d.renderer.interiorFog.hidden.size===42&&battle3d.renderer.models.has(0)&&battle3d.renderer.lights.library&&battle3d.renderer.paintedEnvironment.library,null,{timeout:60000});
 await page.evaluate(()=>{battle3d.renderer.reducedMotion={matches:true};window.closedState=structuredClone(battle3d.state);});
 const snapshot=()=>page.evaluate(()=>{const r=battle3d.renderer;return {hidden:r.interiorFog.hidden.size,barrels:r.paintedEnvironment.count,lamps:r.lights.models.length,bed:[...r.chunks.values()].some(m=>m.userData.boxes.some(b=>b.source.prop?.includes('hospital-bed'))),guard:!!r.actors.get(4)?.visible};});
 const closed=await snapshot();assert.deepEqual(closed,{hidden:42,barrels:0,lamps:0,bed:false,guard:false});
 const point=async(x,y,h)=>page.evaluate(async({x,y,h})=>{const T=await import('./vendor/three.module.js'),r=document.querySelector('#battle').getBoundingClientRect(),p=new T.Vector3(x,h,y).project(battle3d.renderer.camera);return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},{x,y,h});
 const center=await point(13,11,1.96);
 const pixel=()=>page.evaluate(({x,y})=>{const canvas=document.querySelector('#battle'),r=canvas.getBoundingClientRect(),sx=canvas.width/r.width,sy=canvas.height/r.height;return [...canvas.getContext('2d').getImageData(Math.round((x-r.left)*sx),Math.round((y-r.top)*sy),1,1).data];},center);
 assert.deepEqual(await pixel(),[0,0,0,255]);await page.screenshot({path:fileURLToPath(new URL('closed-room.png',out))});
 await page.mouse.move(center.x,center.y);await page.waitForFunction(()=>battle3d.renderer.wallXray.uniforms.xrayActive.value);assert.deepEqual(await pixel(),[0,0,0,255]);assert.deepEqual(await snapshot(),closed);
 await page.screenshot({path:fileURLToPath(new URL('wall-xray-stays-black.png',out))});
 await page.evaluate(async()=>{const {refresh}=await import('./core/engine.js');battle3d.state.edges['e:9:11']='window-brick';refresh(battle3d.state);});
 await page.waitForFunction(()=>!battle3d.renderer.interiorFog.hidden.has('12,11')&&battle3d.renderer.paintedEnvironment.count===1&&battle3d.renderer.lights.models.length===1);
 const windowSeen=await snapshot();assert(windowSeen.hidden<42);await page.mouse.move(10,10);await page.screenshot({path:fileURLToPath(new URL('window-reveals-interior.png',out))});
 await page.evaluate(async()=>{const {refresh}=await import('./core/engine.js');battle3d.state.edges['e:9:11']='door-wood-closed';refresh(battle3d.state);});
 await page.waitForFunction(()=>battle3d.renderer.world.boxes.some(b=>b.id.includes(':door')));assert.equal(await page.evaluate(()=>battle3d.renderer.interiorFog.hidden.has('12,11')),false);
 await page.click('#quicksave');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Quicksave saved'));await page.click('#quickload');await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Encounter loaded'));
 await page.waitForFunction(()=>battle3d.renderer.paintedEnvironment.count===1);assert.equal(await page.evaluate(()=>battle3d.renderer.interiorFog.hidden.has('12,11')),false);
 // Start unexplored again, then use the actual door-click movement path.
 if(!(await page.evaluate(()=>battle3d.paused)))await page.click('#pause');
 await page.evaluate(()=>{Object.assign(battle3d.state,structuredClone(closedState));battle3d.renderer.world=null;battle3d.renderer.reducedMotion={matches:true};});
 await page.waitForFunction(()=>battle3d.renderer.interiorFog.hidden.size===42);
 const door=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),r=battle3d.renderer,c=document.querySelector('#battle'),b=c.getBoundingClientRect();for(let h=.3;h<1.6;h+=.1)for(let y=10.65;y<11.4;y+=.1){const p=new T.Vector3(9.5,h,y).project(r.camera),x=(p.x+1)*c.clientWidth/2,sy=(1-p.y)*c.clientHeight/2;if(r.pickDoor(x,sy,c.clientWidth,c.clientHeight,0)==='e:9:11'&&r.pick(x,sy,c.clientWidth,c.clientHeight,0)===null)return {x:b.left+x,y:b.top+sy};}return null;});assert(door);
 await page.click('#pause');await page.mouse.click(door.x,door.y);await page.waitForFunction(()=>battle3d.state.edges['e:9:11']==='doorway-concrete-open'&&battle3d.state.units[0].x===10);await page.click('#pause');
 await page.waitForFunction(()=>battle3d.renderer.interiorFog.hidden.size<42);await page.mouse.move(10,10);await page.screenshot({path:fileURLToPath(new URL('door-reveals-interior.png',out))});
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('review.json',out),JSON.stringify({closed,windowSeen,doorSeen:await snapshot(),checks:['black interior pixels','hidden furniture, lamps, barrel and guard','wall X-ray cannot reveal interior','window LOS reveals scenery','discovery persists after closing and save/load','actual door-click entry reveals room'],errors},null,2));console.log('Interior fog, black pixels, hidden contents, window sight, real door entry and save/load passed.');
}catch(e){if(page){await page.screenshot({path:fileURLToPath(new URL('failure.png',out))}).catch(()=>{});console.error(await page.locator('#message').textContent().catch(()=>''));}throw e;}
finally{await browser.close();fs.writeFileSync(new URL('browser-closed.json',out),JSON.stringify({identity,closedAt:new Date().toISOString()}));}
