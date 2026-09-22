import {createRequire} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import os from 'node:os';
import {blankMap,generateRiverMap} from '../dist/tactics/core/maps.js';
import {extractBlock} from '../dist/tactics/core/blocks.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const output=new URL('../artifacts/battle-3d/editor/',import.meta.url);fs.mkdirSync(output,{recursive:true});
const ready=()=>page.waitForFunction(()=>window.editor3d&&!editor3d.loading&&editor3d.scene.models.length===editor3d.document.units.length,{},{timeout:120000});
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4322/tactics/editor-3d.html');await ready();
 const initial=await page.evaluate(()=>({units:editor3d.scene.models.length,props:editor3d.document.map.props.length,diagnostics:editor3d.scene.diagnostics,load:editor3d.scene.loadMs}));assert.equal(initial.units,40);assert.equal(initial.props,398);assert.deepEqual(initial.diagnostics,[]);
 const performanceReview=await page.evaluate(async()=>{const times=[],canvas=document.querySelector('#scene'),view={...editor3d.view},gl=editor3d.scene.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');let previous=performance.now();for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);const now=performance.now();times.push(now-previous);previous=now;editor3d.scene.draw({...view,x:view.x+i*.03},canvas.clientWidth,canvas.clientHeight);}editor3d.scene.draw(view,canvas.clientWidth,canvas.clientHeight);times.sort((a,b)=>a-b);return {medianFrameMs:times[15],p95FrameMs:times[28],sceneryMs:editor3d.scene.rebuildMs,heapBytes:performance.memory?.usedJSHeapSize,gpu:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'unavailable'};});
 await page.screenshot({path:fileURLToPath(new URL('factory-starts.png',output))});
 // Camera keys work before clicking the canvas, after toolbar use and in every
 // camera preset, but never steal text entry or browser shortcuts.
 for(const preset of ['0','1','2','3','top']){
  await page.selectOption('#camera',preset);await page.locator('#zoom-in').focus();await page.waitForTimeout(50);
  for(const [letter,arrow]of [['w','ArrowUp'],['a','ArrowLeft'],['s','ArrowDown'],['D','ArrowRight']]){
   const before=await page.evaluate(()=>({...editor3d.view}));await page.keyboard.press(letter);const after=await page.evaluate(()=>({...editor3d.view}));
   assert.ok(Math.hypot(after.x-before.x,after.y-before.y)>.1,'WASD must move from toolbar focus');
   await page.keyboard.press(arrow);const next=await page.evaluate(()=>({...editor3d.view}));assert.ok(Math.abs((next.x-after.x)-(after.x-before.x))<1e-6);assert.ok(Math.abs((next.y-after.y)-(after.y-before.y))<1e-6);
  }
 }
 for(const selector of ['#sector-x','#camera']){await page.locator(selector).focus();const before=await page.evaluate(()=>[editor3d.view.x,editor3d.view.y,editor3d.view.span]);await page.keyboard.press('w');await page.keyboard.press('ArrowLeft');assert.deepEqual(await page.evaluate(()=>[editor3d.view.x,editor3d.view.y,editor3d.view.span]),before);}
 await page.locator('#zoom-in').focus();const beforeShortcut=await page.evaluate(()=>({...editor3d.view}));await page.keyboard.press('Control+ArrowLeft');assert.deepEqual(await page.evaluate(()=>({...editor3d.view})),beforeShortcut);
 await page.click('#home');
 await page.fill('#sector-x','4');await page.fill('#sector-y','6');await page.click('#sector');await page.screenshot({path:fileURLToPath(new URL('factory-room.png',output))});
 const raw=blankMap('Upper floor inspection');raw.upper[0]['12,12']='floor';raw.upper[0]['13,12']='floor';raw.stairs=[{x:12,y:12,z:0,kind:'ladder'}];raw.edges={'e:13:12:1':'window-brick'};raw.props=[{x:16,y:12,z:0,kind:'roof-flat-parapet'}];raw.guards=[{x:13,y:12,z:1,species:'hen',weapon:'rifle',heading:90,outfit:'red-hats'}];raw.extension={roundTrip:'preserve'};
 await page.locator('#import').setInputFiles({name:'floors.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(raw))});await ready();
 assert.deepEqual(JSON.parse(await page.evaluate(()=>editor3d.export())),raw);
 await page.selectOption('#floor','1');await page.fill('#sector-x','1');await page.fill('#sector-y','1');await page.click('#sector');
 for(const preset of ['0','1','2','3','top']){
  await page.selectOption('#camera',preset);await page.waitForTimeout(80);
  const p=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),canvas=document.querySelector('#scene'),point=new T.Vector3(13,2.12,12).project(editor3d.scene.camera);return {x:(point.x+1)*canvas.clientWidth/2,y:(1-point.y)*canvas.clientHeight/2};});
  const box=await page.locator('#scene').boundingBox();await page.mouse.click(box.x+p.x,box.y+p.y);assert.equal(await page.evaluate(()=>editor3d.selection?.data.species),'hen');
 }
 assert.doesNotMatch(await page.locator('#visual-note').innerText(),/normal painted outfit/);assert.ok(await page.evaluate(()=>{const m=editor3d.scene.models.find(m=>m.unit.species==='hen');return m.root.visible&&m.cap?.mesh.parent===m.worker.bones.find(b=>b.name==='head')&&m.paint.material.customProgramCacheKey().includes('tailored-red-hat');}));assert.match(await page.locator('#visual-note').innerText(),/no armed pose/);
 await page.screenshot({path:fileURLToPath(new URL('upper-floor.png',output))});
 await page.selectOption('#floor','2');await page.selectOption('#pick-mode','tile');const box=await page.locator('#scene').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);assert.equal(await page.evaluate(()=>editor3d.selection?.label),'Empty floor cell');
 const river=generateRiverMap(42,'River / bridges',0),block=extractBlock(river,0,0),resources=[];
 for(let i=0;i<4;i++){
  for(const map of [river,block]){await page.evaluate(text=>editor3d.open(text),JSON.stringify(map));await ready();assert.deepEqual(JSON.parse(await page.evaluate(()=>editor3d.export())),map);}
  await page.waitForTimeout(100);resources.push(await page.evaluate(()=>({...editor3d.scene.renderer.info.memory})));
 }
 assert.ok(resources.at(-1).geometries<=resources[1].geometries+2);assert.ok(resources.at(-1).textures<=resources[1].textures+2);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:fileURLToPath(new URL('mobile-block.png',output))});
 assert.deepEqual(errors,[]);const result={environment:{browser:browser.version(),os:os.platform(),cpu:os.cpus()[0].model,viewport:'1440×1000'},initial,performanceReview,resources,errors};fs.writeFileSync(new URL('results.json',output),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){console.log(await page.locator('#status').innerText(),errors);throw e;}finally{await browser.close();}
