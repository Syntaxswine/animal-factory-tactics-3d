import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {blankMap} from '../dist/tactics/core/maps.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};watch(page);
const out='artifacts/battle-3d/awareness';fs.mkdirSync(out,{recursive:true});
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4323/tactics/editor-3d.html');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:120000});
 const map=blankMap('Awareness test');map.time={startMinutes:720};map.guards=[{x:10,y:4,z:0,species:'pig-foreman',weapon:'rifle',heading:180}];
 await page.evaluate(json=>editor3d.open(json),JSON.stringify(map));await page.waitForFunction(()=>!editor3d.loading);
 const popup=page.waitForEvent('popup');await page.click('#playtest');const battle=await popup;watch(battle);
 await battle.waitForFunction(()=>window.battle3d?.state,{},{timeout:120000});assert.equal(await battle.evaluate(()=>battle3d.state.rules.awareness),true);
 await battle.waitForFunction(()=>battle3d.state.phase==='player',{},{timeout:30000});
 await battle.click('#pause');const snapshot=await battle.evaluate(()=>JSON.stringify(battle3d.state.units.map(u=>u.awareness)));
 await battle.waitForTimeout(1200);assert.equal(await battle.evaluate(()=>JSON.stringify(battle3d.state.units.map(u=>u.awareness))),snapshot);
 assert.match(await battle.locator('#light-exposure').innerText(),/Light on.*Perception/);
 await battle.waitForFunction(()=>battle3d.renderer.models.size>=4,{},{timeout:120000});
 await battle.screenshot({path:out+'/identified.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({awarenessEnabled:true,contact:true,pauseStable:true,errors}));
}finally{await browser.close();}
