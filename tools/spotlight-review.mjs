import {createRequire} from 'node:module';
import fs from 'node:fs';import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const out='artifacts/battle-3d/spotlight';fs.mkdirSync(out,{recursive:true});
try{
 await page.goto('http://127.0.0.1:4323/tactics/editor-3d.html');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:120000});
 const map=blankMap('Spotlight test');map.time={startMinutes:1260};map.props=[{kind:'spotlight',x:7,y:7,z:0,lightMode:'on'}];
 await page.evaluate(json=>editor3d.open(json),JSON.stringify(map));await page.waitForFunction(()=>!editor3d.loading&&editor3d.scene.lights.models.length===1);
 await page.evaluate(()=>{editor3d.view.x=10;editor3d.view.y=9;editor3d.view.span=24;editor3d.scene.changed();});await page.waitForTimeout(500);
 async function clickTile(x,y){const p=await page.evaluate(async({x,y})=>{const T=await import('./vendor/three.module.js'),v=new T.Vector3(x,0,y).project(editor3d.scene.camera),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},{x,y});await page.mouse.click(p.x,p.y);}
 await page.selectOption('#pick-mode','prop');await clickTile(7,7);assert.equal(await page.evaluate(()=>editor3d.selection?.data.kind),'spotlight');
 await page.click('#aim-spotlight');await clickTile(7,14);await page.click('#finish-spotlight');await page.waitForFunction(()=>!editor3d.loading&&editor3d.document.map.props[0].lightTargets?.length===1);
 await clickTile(7,7);await page.click('#aim-spotlight');await clickTile(14,7);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>editor3d.document.map.props[0].lightTargets.length),1);
 await clickTile(7,7);await page.click('#aim-spotlight');for(const [x,y]of [[7,14],[14,14],[14,7]])await clickTile(x,y);
 await page.waitForFunction(()=>!editor3d.loading&&editor3d.document.map.props[0].lightTargets?.length===3);
 const before=await page.evaluate(()=>editor3d.scene.lights.models[0].lamps[0].target.position.toArray());await page.waitForTimeout(1000);const after=await page.evaluate(()=>editor3d.scene.lights.models[0].lamps[0].target.position.toArray());assert.notDeepEqual(before,after);
 await page.screenshot({path:out+'/sweep.png'});
 const popup=page.waitForEvent('popup');await page.click('#playtest');const battle=await popup;
 battle.on('pageerror',e=>errors.push(e.message));battle.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await battle.waitForFunction(()=>window.battle3d?.renderer.lights.models.some(m=>m.prop.kind==='spotlight'),{},{timeout:120000});await battle.click('#pause');await battle.waitForTimeout(200);
 const paused=await battle.evaluate(()=>battle3d.renderer.lights.models[0].lamps[0].target.position.toArray());await battle.waitForTimeout(600);
 assert.deepEqual(await battle.evaluate(()=>battle3d.renderer.lights.models[0].lamps[0].target.position.toArray()),paused);
 await battle.screenshot({path:out+'/playtest.png'});await battle.close();await page.bringToFront();

 // More than four spots exercises batched shadow shaders alongside point lights.
 map.props=Array.from({length:5},(_,i)=>({kind:'spotlight',x:5+i*2,y:6,z:0,lightMode:'on',lightTargets:[{x:0,y:8,z:0}]}));map.props.push({kind:'floor-lamp',x:15,y:6,z:0,lightMode:'on'});
 await page.evaluate(json=>editor3d.open(json),JSON.stringify(map));await page.waitForFunction(()=>!editor3d.loading&&editor3d.scene.lights.models.length===6);await page.waitForTimeout(800);
 await page.screenshot({path:out+'/mixed.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({picking:true,cancel:true,sweep:true,mixedShadows:true,pausedPlaytest:true,errors}));
}finally{await browser.close();}
