import {createRequire} from 'node:module';
import fs from 'node:fs';import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};watch(page);
const out='artifacts/battle-3d/lighting';fs.mkdirSync(out,{recursive:true});
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4323/tactics/editor-3d.html');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:120000});
 const map=blankMap('Lighting test');map.time={startMinutes:1260};map.props=[{kind:'streetlight',x:8,y:7,z:0},{kind:'campfire',x:13,y:11,z:0},{kind:'floor-lamp',x:15,y:5,z:0}];
 for(let y=3;y<=12;y++)map.edges['e:10:'+y]='wall';
 await page.evaluate(json=>editor3d.open(json),JSON.stringify(map));await page.waitForFunction(()=>!editor3d.loading&&editor3d.scene.lights.models.length===3);
 await page.waitForTimeout(1000);await page.screenshot({path:out+'/night.png'});
 await page.locator('#light-preview').evaluate(el=>{el.value=720;el.dispatchEvent(new Event('input'));});await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>editor3d.scene.lights.models.flatMap(m=>m.lamps).filter(l=>l.visible).length),1);
 await page.click('#light-preview-reset');const popup=page.waitForEvent('popup');await page.click('#playtest');const battle=await popup;watch(battle);
 await battle.waitForFunction(()=>window.battle3d?.renderer.lights.models.length===3,{},{timeout:120000});await battle.click('#pause');await battle.waitForTimeout(600);await battle.screenshot({path:out+'/battle.png'});
 assert.equal(await battle.evaluate(()=>battle3d.renderer.lights.models.flatMap(m=>m.lamps).filter(l=>l.visible).length),3);
 await battle.close();await page.bringToFront();
 const kinds=['campfire','cooking-fire','standing-torch','wall-torch','bedside-table-lamp','floor-lamp','gooseneck-sconce','streetlight','streetlight-double'];
 map.props=kinds.map((kind,i)=>({kind,x:6+i%3*5,y:5+Math.floor(i/3)*5,z:0}));map.edges={};
 await page.evaluate(json=>editor3d.open(json),JSON.stringify(map));await page.waitForFunction(()=>!editor3d.loading&&editor3d.scene.lights.models.length===9);
 await page.waitForTimeout(1000);await page.screenshot({path:out+'/all-fixtures.png'});
 assert.equal(await page.evaluate(()=>editor3d.scene.lights.models.flatMap(m=>m.lamps).filter(l=>l.visible).length),10);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({placedLights:3,daySchedule:true,playtest:true,errors}));
}finally{await browser.close();}
