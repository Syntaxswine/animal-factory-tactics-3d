import {createRequire} from 'node:module';
import fs from 'node:fs';import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};watch(page);
const out='artifacts/battle-3d/tower-lighting';fs.mkdirSync(out,{recursive:true});
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4323/tactics/editor-3d.html');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:120000});
 const map=blankMap('Tower searchlights');map.time={startMinutes:1260};map.props=['wooden-spotlight-tower','iron-searchlight-stair-tower','iron-searchlight-ladder-tower'].map((kind,i)=>({kind,x:5+i*10,y:6,z:0,lightMode:'on'}));
 await page.evaluate(json=>editor3d.open(json),JSON.stringify(map));await page.waitForFunction(()=>!editor3d.loading&&editor3d.scene.lights.models.length===3);
 await page.evaluate(()=>{editor3d.view.x=18;editor3d.view.y=16;editor3d.view.span=46;editor3d.scene.changed();});await page.waitForTimeout(600);
 async function clickTile(x,y){const p=await page.evaluate(async({x,y})=>{const T=await import('./vendor/three.module.js'),v=new T.Vector3(x,0,y).project(editor3d.scene.camera),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};},{x,y});await page.mouse.click(p.x,p.y);}
 await page.selectOption('#pick-mode','prop');
 for(let i=0;i<3;i++){await clickTile(5+i*10,6);assert.equal(await page.evaluate(()=>editor3d.selection?.data.kind),map.props[i].kind);await page.click('#aim-spotlight');await clickTile(5+i*10,24);await clickTile(11+i*10,24);await page.click('#finish-spotlight');await page.waitForFunction(i=>!editor3d.loading&&editor3d.document.map.props[i].lightTargets?.length===2,i);}
 await page.waitForTimeout(700);await page.screenshot({path:out+'/night.png'});
 const aligned=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js');return editor3d.scene.lights.models.every(m=>{m.root.updateMatrixWorld(true);return m.root.getObjectByName('emitter-0').getWorldPosition(new T.Vector3()).distanceTo(m.lamps[0].position)<1e-7;});});assert.ok(aligned);
 const popup=page.waitForEvent('popup');await page.click('#playtest');const battle=await popup;watch(battle);await battle.waitForFunction(()=>window.battle3d?.renderer.lights.models.length===3,{},{timeout:120000});await battle.click('#pause');await battle.waitForTimeout(300);await battle.screenshot({path:out+'/battle.png'});assert.ok(await battle.evaluate(()=>battle3d.renderer.lights.models.every(m=>m.lamps[0].isSpotLight)));
 await battle.close();assert.deepEqual(errors,[]);console.log(JSON.stringify({towers:3,aimPicking:true,anchorAlignment:true,playtest:true,errors}));
}finally{await browser.close();}
