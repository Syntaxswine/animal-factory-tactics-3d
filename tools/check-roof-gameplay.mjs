import {blankMap,setTerrain,edgeKey} from '../dist/tactics/core/maps.js';
import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const m=blankMap();m.name='Roof mantle gameplay check';m.starts[0]={x:8,y:8,z:0};for(let x=9;x<=10;x++)for(let y=8;y<=9;y++)setTerrain(m,x,y,1,'floor');m.props.push({x:9,y:8,z:1,kind:'roof-climbable-corrugated-flat'});m.edges[edgeKey('e',8,8,0)]='wall';m.edges[edgeKey('e',8,9,0)]='wall';
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1450,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route('**/default-factory.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(m)}));
 await page.goto((process.env.TACTICS_BASE_URL||'http://127.0.0.1:4323')+'/tactics/battle-3d.html');await page.waitForFunction(()=>window.battle3d?.renderer.models.has(0),null,{timeout:60000});
 await page.evaluate(()=>{battle3d.state.units[0].weapon='rifle';});await page.waitForFunction(()=>battle3d.renderer.models.get(0)?.weapon==='rifle'&&!battle3d.renderer.busy);
 assert.match(await page.locator('#climb-tower').textContent(),/Climb roof/);await page.locator('#climb-tower').click();
 await page.waitForFunction(()=>battle3d.renderer.traversal.active?.motion,null,{timeout:15000});
 const committed=await page.evaluate(()=>({ap:battle3d.state.units[0].ap,event:battle3d.state.roofTraversals[0],clock:battle3d.clock.minutes}));assert.equal(committed.event.kind,'roof');
 await page.waitForFunction(()=>{const a=battle3d.renderer.traversal.active;return a?.motion&&battle3d.renderer.presentationNow-a.start>3900;});await page.screenshot({path:'artifacts/roof-gameplay-mantle.png'});
 await page.waitForFunction(()=>!battle3d.renderer.traversal.busy,null,{timeout:15000});
 const end=await page.evaluate(()=>({ap:battle3d.state.units[0].ap,position:[battle3d.state.units[0].x,battle3d.state.units[0].y,battle3d.state.units[0].z],diagnostics:battle3d.renderer.diagnostics}));assert.equal(end.ap,committed.ap);assert.deepEqual(end.position,[9,8,1]);assert.deepEqual(end.diagnostics,[]);assert.deepEqual(errors,[]);console.log('Live Climb roof button animates, restores, and lands without an extra AP charge.');
}catch(error){console.log(await page.evaluate(()=>({units:battle3d.state.units.map(u=>({id:u.id,species:u.species,weapon:u.weapon,x:u.x,y:u.y,z:u.z})),events:battle3d.state.roofTraversals,active:battle3d.renderer.traversal.active?.event,diagnostics:battle3d.renderer.diagnostics,queue:battle3d.state.queue})));throw error;}finally{await browser.close();}
