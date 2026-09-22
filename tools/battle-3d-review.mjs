import {createRequire} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:820}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const output=new URL('../artifacts/battle-3d/',import.meta.url);fs.mkdirSync(output,{recursive:true});
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4318/tactics/battle-3d.html');
 await page.waitForFunction(()=>window.battle3d?.renderer.models.size>=4,{},{timeout:60000});
 await page.waitForFunction(()=>window.battle3d.renderer.paintedEnvironment.count===261);
 await page.waitForFunction(()=>window.battle3d.picks.length>=4);
 const rosterAssets=await page.evaluate(async()=>{
  const r=battle3d.renderer;
  await Promise.all(battle3d.state.units.filter(u=>!r.models.has(u.id)&&!r.pending.has(u.id)).map(u=>r.loadModel(u)));
  for(const u of battle3d.state.units)r.actor(u);
  return {models:r.models.size,units:battle3d.state.units.length,diagnostics:r.diagnostics};
 });
 assert.equal(rosterAssets.models,40);assert.deepEqual(rosterAssets.diagnostics,[]);
 const initial=await page.evaluate(()=>({phase:battle3d.state.phase,detected:[...battle3d.state.detected],picks:battle3d.picks.map(p=>p.id),diagnostics:battle3d.renderer.diagnostics,models:battle3d.renderer.models.size,guards:battle3d.state.definition.guards.length,props:battle3d.state.props.length,edges:Object.keys(battle3d.state.edges).length,paintedCargo:battle3d.renderer.paintedEnvironment.count,oldCrates:battle3d.renderer.structures.children.flatMap(m=>m.userData.boxes).filter(b=>b.kind==='cover'&&b.material==='crate-wood').length}));
 assert.deepEqual(initial.diagnostics,[]);
 assert.equal(initial.guards,36);assert.equal(initial.props,398);assert.equal(initial.edges,1576);assert.equal(initial.oldCrates,0);
 for(const id of initial.picks)assert.ok(id<4||initial.detected.includes(id),'Unseen enemy leaked');
 await page.screenshot({path:fileURLToPath(new URL('easy-desktop.png',output))});
 const canvas=await page.locator('#battle').boundingBox();
 await page.click('#overview');await page.screenshot({path:fileURLToPath(new URL('authored-overview.png',output))});
 const factory=await page.evaluate(()=>battle3d.project({x:79,y:132,z:0}));
 await page.mouse.click(canvas.x+factory.x,canvas.y+factory.y);await page.screenshot({path:fileURLToPath(new URL('painted-factory.png',output))});
 await page.click('#center');
 const destination=await page.evaluate(()=>battle3d.project({x:4,y:4,z:0}));
 await page.mouse.click(canvas.x+destination.x,canvas.y+destination.y);
 await page.waitForFunction(()=>battle3d.state.units[0].x===4&&battle3d.state.units[0].y===4,{},{timeout:10000});
 const afterMove=await page.evaluate(()=>({x:battle3d.state.units[0].x,y:battle3d.state.units[0].y}));
 // Controlled nearby combat fixture: exercise the UI with an unobstructed target.
 await page.evaluate(async()=>{const {refresh}=await import('./core/engine.js');const s=battle3d.state,g=s.units.find(u=>u.team==='guard');g.x=7;g.y=4;g.z=0;refresh(s);});
 await page.waitForFunction(()=>battle3d.picks.some(p=>p.id===4));
 const shot=await page.evaluate(async()=>{
  const {previewAttack}=await import('./core/engine.js'),s=battle3d.state,u=s.units[0],canvas=document.getElementById('battle');
  for(const p of battle3d.picks){const target=s.units.find(v=>v.id===p.id);if(!s.detected.has(p.id)||!previewAttack(s,u,target).ok)continue;
   for(const dy of [30,40,50,20]){const x=p.px,y=p.py-dy*battle3d.view.zoom;if(x>0&&x<canvas.clientWidth&&y>0&&y<canvas.clientHeight&&battle3d.renderer.pick(x,y,canvas.clientWidth,canvas.clientHeight)===p.id)return {id:p.id,x,y,ammo:u.ammo[u.weapon]};}
  }return null;
 });
 assert.ok(shot,'Expected a selectable legal target in the factory fixture');
 await page.mouse.click(canvas.x+shot.x,canvas.y+shot.y);await page.click('#fire');
 assert.equal(await page.evaluate(()=>battle3d.state.units[0].ammo[battle3d.state.units[0].weapon]),shot.ammo-1);
 await page.click('#end');await page.waitForFunction(()=>battle3d.state.phase!=='enemy',{},{timeout:60000});
 // Inspect both difficulties and repeated renderer teardown while loads may be pending.
 await page.selectOption('#difficulty','standard');await page.click('#restart');
 await page.waitForFunction(()=>battle3d.state.difficulty==='standard'&&battle3d.renderer.models.size>=4);
 await page.screenshot({path:fileURLToPath(new URL('standard-desktop.png',output))});
 await page.selectOption('#difficulty','easy');await page.click('#restart');await page.click('#restart');
 await page.waitForFunction(()=>battle3d.renderer.models.size>=4);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:fileURLToPath(new URL('easy-mobile.png',output))});
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('results.json',output),JSON.stringify({initial,afterMove,shot,errors},null,2));
 console.log(JSON.stringify({initial,afterMove,shot,errors}));
}catch(error){console.log(await page.evaluate(()=>({message:document.getElementById('message')?.textContent,models:window.battle3d?.renderer.models.size,diagnostics:window.battle3d?.renderer.diagnostics})),errors);throw error;}finally{await browser.close();}
