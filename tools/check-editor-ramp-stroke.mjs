import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4323/tactics/editor-3d.html?editing=1');
 await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading);
 await page.evaluate(async()=>{await editor3d.apply({tool:'cliff',start:{x:10,y:7,z:0},end:{x:10,y:11,z:0}});});
 await page.click('[data-group=ramps]');
 assert.equal(await page.inputValue('#ramp-placement'),'wall');
 await page.selectOption('#ramp-surface','road');
 const [start,end]=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),r=document.querySelector('#scene').getBoundingClientRect();return [8,10].map(y=>{const v=new T.Vector3(10.5,1,y).project(editor3d.scene.camera);return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};});});
 await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();
 await page.waitForFunction(()=>editor3d.document.map.props.filter(p=>p.kind==='ramp-road-west').length===3);
 await page.waitForFunction(()=>!editor3d.loading);
 assert.equal(await page.evaluate(()=>editor3d.document.map.upper[0]['10,9']),'floor');
 await page.click('#undo');await page.waitForFunction(()=>!editor3d.document.map.props.some(p=>p.kind.startsWith('ramp-'))&&!editor3d.loading);
 await page.click('#redo');await page.waitForFunction(()=>editor3d.document.map.props.filter(p=>p.kind==='ramp-road-west').length===3&&!editor3d.loading);
 fs.mkdirSync('artifacts/ramp-stroke',{recursive:true});await page.screenshot({path:'artifacts/ramp-stroke/editor.png'});
 assert.deepEqual(errors,[]);console.log('Real cliff-wall drag, three-wide ramp, automatic landings, undo and redo passed.');
}finally{await browser.close();}
