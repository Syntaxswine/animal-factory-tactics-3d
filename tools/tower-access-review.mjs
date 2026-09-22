import {createRequire} from 'node:module';
import fs from 'node:fs';import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
import {towerEntry} from '../dist/tactics/tower-geometry.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};watch(page);
const out='artifacts/battle-3d/tower-access';fs.mkdirSync(out,{recursive:true});
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4323/tactics/editor-3d.html');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:120000});
 const map=blankMap('Tower lookouts and climbing');map.time={startMinutes:1260};map.props=[{kind:'iron-searchlight-ladder-tower',x:10,y:10,z:0,lightMode:'on',lightTargets:[{x:2,y:22,z:0}]}];map.starts[0]=towerEntry(map.props[0]);
 await page.evaluate(json=>editor3d.open(json),JSON.stringify(map));await page.waitForFunction(()=>!editor3d.loading);
 await page.evaluate(()=>{editor3d.view.x=13;editor3d.view.y=14;editor3d.view.span=28;editor3d.scene.changed();});await page.waitForTimeout(300);
 await page.selectOption('#pick-mode','prop');const point=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),v=new T.Vector3(10,0,10).project(editor3d.scene.camera),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};});await page.mouse.click(point.x,point.y);await page.selectOption('#unit-weapon','hands');await page.click('#add-lookout');await page.waitForFunction(()=>!editor3d.loading&&editor3d.document.map.guards.length===1);
 assert.ok(await page.evaluate(()=>editor3d.document.map.guards[0].towerPost));await page.screenshot({path:out+'/editor.png'});
 const popup=page.waitForEvent('popup');await page.click('#playtest');const battle=await popup;watch(battle);await battle.waitForFunction(()=>window.battle3d?.state&&!battle3d.renderer.busy,{},{timeout:120000});
 await battle.locator('#climb-tower').click();await battle.waitForFunction(()=>!!battle3d.state.units[0].towerPost);await battle.waitForTimeout(500);await battle.click('#pause');await battle.screenshot({path:out+'/atop.png'});
 assert.ok(await battle.evaluate(()=>battle3d.renderer.models.get(0)?.root.position.y>6));
 await battle.click('#pause');await battle.locator('#climb-tower').click();await battle.waitForFunction(()=>!battle3d.state.units[0].towerPost);await battle.waitForTimeout(250);assert.ok(await battle.evaluate(()=>battle3d.renderer.models.get(0)?.root.position.y<.01));
 assert.deepEqual(errors,[]);await battle.close();console.log(JSON.stringify({lookoutPlacement:true,climb:true,descend:true,elevatedModel:true,errors}));
}finally{await browser.close();}
