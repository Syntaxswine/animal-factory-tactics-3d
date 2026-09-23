import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4425/tactics/battle-3d.html');await page.waitForFunction(()=>window.battle3d?.state,{},{timeout:120000});
 await page.evaluate(async()=>{const {blankMap}=await import('./core/maps.js'),{createGame,equip}=await import('./core/engine.js');const map=blankMap();map.starts[0]={x:10,y:10};map.guards=[{x:14,y:10,species:'pig-foreman',weapon:'pistol'}];const s=createGame(42,map,true,'easy'),a=s.units[0];equip(s,a,'pistol');a.accuracy=50;a.heading=0;a.ap=30;s.phase='player';Object.assign(battle3d.state,s);battle3d.renderer.pick=()=>4;});
 await page.locator('#battle').click({position:{x:100,y:100}});
 for(const [value,cost]of [['hip',4],['aimed',6],['full',8]]){await page.selectOption('#aim-level',value);assert.match(await page.locator('#target').innerText(),new RegExp(cost+' AP'));}
 await page.click('#fire');assert.equal(await page.evaluate(()=>battle3d.state.units[0].ap),22);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({aimLevels:3,fullAimCharged:8,errors}));
}finally{await browser.close();}
