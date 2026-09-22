import {createRequire} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
const out=new URL('../artifacts/battle-3d/library/',import.meta.url);fs.mkdirSync(out,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
const ready=()=>page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:120000});
const status=pattern=>page.waitForFunction(pattern=>new RegExp(pattern).test(document.querySelector('#status').textContent),pattern);
async function cell(x,y){const p=await page.evaluate(async([x,y])=>{const T=await import('./vendor/three.module.js'),c=document.querySelector('#scene'),p=new T.Vector3(x,editor3d.scene.options.level*2.12,y).project(editor3d.scene.camera),b=c.getBoundingClientRect();return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2};},[x,y]);await page.mouse.click(p.x,p.y);await ready();}
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4323/tactics/editor-3d.html');await ready();await page.click('#new-map');await ready();
 const map=await page.evaluate(()=>editor3d.export());
 await page.selectOption('#workspace','block');await ready();assert.equal(await page.evaluate(()=>editor3d.document.size),24);
 await page.selectOption('#edit-tool','prop');await page.selectOption('#prop-kind','workbench-metal');await cell(10,8);
 await page.selectOption('#edit-tool','guard');await page.selectOption('#unit-species','goat');await page.selectOption('#unit-outfit','red-hats');await cell(8,8);
 assert.ok(await page.evaluate(()=>editor3d.scene.models.find(m=>m.unit.species==='goat')?.cap?.mesh.visible));
 assert.match(await page.evaluate(()=>editor3d.scene.models[0].paint.material.customProgramCacheKey()),/red-hat/);
 await page.locator('summary').filter({hasText:'Block connections'}).click();await page.click('#apply-connections');await status('Connections assigned');
 await page.fill('#design-name','Faction block');await page.click('#save-map');await status('Saved in this browser');
 const block=await page.evaluate(()=>editor3d.export()),blockId=await page.locator('#saved-designs').inputValue();assert.equal(JSON.parse(block).guards[0].outfit,'red-hats');
 await page.selectOption('#workspace','map');await ready();assert.equal(await page.evaluate(()=>editor3d.export()),map);
 await page.click('#place-block');await status('Block placed');await ready();assert.equal(await page.evaluate(()=>editor3d.document.map.guards[0].outfit),'red-hats');
 await page.click('#undo');await ready();assert.equal(await page.evaluate(()=>editor3d.export()),map);await page.click('#redo');await ready();
 await page.click('#capture-block');await status('Sector saved');assert.equal(await page.locator('#saved-designs option').count(),2);
 // The saved block and its history survive changing workspaces.
 await page.selectOption('#workspace','block');await ready();assert.equal(await page.evaluate(()=>editor3d.export()),block);
 await page.selectOption('#workspace','map');await ready();await page.fill('#design-name','Faction playtest');await page.click('#rename-map');await ready();
 await page.evaluate(()=>{editor3d.view.x=7;editor3d.view.y=7;editor3d.view.span=12;});await page.click('#zoom-in');await page.screenshot({path:fileURLToPath(new URL('faction-editor.png',out))});
 const popup=page.waitForEvent('popup');await page.click('#playtest');const fight=await popup;fight.on('pageerror',e=>errors.push(e.message));
 await fight.waitForFunction(()=>window.battle3d?.state,{},{timeout:60000});
 // The guard is on open ground near the squad and must render through normal LOS.
 await fight.waitForFunction(()=>[...battle3d.renderer.models.values()].some(m=>m.cap),{},{timeout:60000});
 const outfit=await fight.evaluate(()=>{const g=battle3d.state.units.find(u=>u.outfit==='red-hats'),m=battle3d.renderer.models.get(g.id);return {outfit:g.outfit,cap:!!m.cap,paint:m.paint.material.customProgramCacheKey().includes('red-hat')};});assert.deepEqual(outfit,{outfit:'red-hats',cap:true,paint:true});
 await fight.close();await page.bringToFront();
 await page.selectOption('#saved-designs',blockId);await page.click('#load-map');await page.waitForFunction(()=>editor3d.document.block);await ready();assert.equal(await page.evaluate(()=>editor3d.export()),block);
 // Change outfits repeatedly and verify geometry/texture counts settle.
 const memory=[];for(let i=0;i<3;i++){await page.selectOption('#edit-tool','guard');await page.selectOption('#unit-outfit','normal');await cell(8,8);assert.equal(await page.evaluate(()=>!!editor3d.scene.models[0].cap),false);await page.selectOption('#unit-outfit','red-hats');await cell(8,8);memory.push(await page.evaluate(()=>({...editor3d.scene.renderer.info.memory})));}
 assert.deepEqual(memory[2],memory[1]);
 for(const species of ['hen','pig-director','pig-foreman']){
  await page.selectOption('#unit-species',species);await cell(8,8);
  const model=await page.evaluate(()=>{const m=editor3d.scene.models[0];return {cap:!!m.cap,attached:!m.cap||m.cap.mesh.parent===m.worker.bones.find(b=>b.name==='head'),paint:m.paint.material.customProgramCacheKey()};});
  assert.equal(model.cap,species!=='pig-foreman');assert.ok(model.attached);if(species!=='pig-foreman')assert.match(model.paint,/tailored-red-hat/);
  await page.evaluate(()=>{editor3d.view.x=8;editor3d.view.y=8;editor3d.view.span=6;});await page.click('#zoom-in');await page.screenshot({path:fileURLToPath(new URL(species+'.png',out))});
  await page.selectOption('#floor','1');assert.ok(await page.evaluate(()=>{const m=editor3d.scene.models[0];return m.root.visible&&(!m.cap||m.cap.mesh.material!==m.capMaterial);}));await page.selectOption('#floor','0');
 }
 // Empty connected blocks can fill all 100 sectors without exceeding guard limits.
 await page.click('#new-block');await ready();await page.click('#apply-connections');await status('Connections assigned');await page.fill('#design-name','Empty generator block');await page.click('#save-map');await status('Saved in this browser');
 await page.selectOption('#workspace','map');await ready();const previous=await page.evaluate(()=>editor3d.export());
 await page.locator('summary').filter({hasText:'Generate a map'}).click();await page.click('#generate-connected');await status('Generated 100 matching');await ready();assert.equal(await page.evaluate(()=>Object.keys(editor3d.document.map.blockConnections).length),100);
 await page.click('#undo');await ready();assert.equal(await page.evaluate(()=>editor3d.export()),previous);
 await page.locator('summary').filter({hasText:'Feature plan'}).click();await page.click('#seed-plan');await status('Feature plan updated');const planned=await page.evaluate(()=>editor3d.export());await page.click('#generate-connected');await status('Missing blocks');assert.equal(await page.evaluate(()=>editor3d.export()),planned);
 await page.click('#generate-map');await status('Map generated');await ready();assert.equal(await page.evaluate(()=>editor3d.document.map.name),'Generated 7');
 assert.deepEqual(await page.evaluate(()=>editor3d.scene.diagnostics),[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({outfit,memory,errors}));
}finally{await browser.close();}
