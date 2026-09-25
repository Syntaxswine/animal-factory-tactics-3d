import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.RAMP_URL||'http://127.0.0.1:4436';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1500,height:1080}}),page=await context.newPage(),errors=[];
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('dialog',d=>d.accept());};watch(page);
try{
 await fs.mkdir('artifacts',{recursive:true});await page.goto(base+'/tactics/editor-3d.html');await page.waitForFunction(()=>window.editor3d&&!editor3d.loading,{},{timeout:60000});
 await page.evaluate(async()=>{const {blankMap}=await import('./core/maps.js');const m=blankMap('Ramp UI proof');m.guards=[];m.props=[];m.edges={};m.stairs=[];m.climbs=[];
  for(let x=24;x<=30;x++)for(let y=21;y<=34;y++){m.props.push({x,y,z:0,kind:y<24||y>=32?'cliff-crag':'cliff-ledge',cliffMask:15,cliffSand:0});m.upper[0][x+','+y]='floor';}
  await editor3d.open(JSON.stringify(m));editor3d.view.x=26;editor3d.view.y=27;editor3d.view.span=25;document.getElementById('camera').dispatchEvent(new Event('change'));
 });
 await page.selectOption('#edit-tool','ramp-cut');await page.selectOption('#ramp-width','8');await page.selectOption('#ramp-direction','east');await page.selectOption('#ramp-surface','grass');
 await page.waitForTimeout(300);
 const xy=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),p=new T.Vector3(24,0,24).project(editor3d.scene.camera),b=document.getElementById('scene').getBoundingClientRect();return {x:b.left+(p.x+1)*b.width/2,y:b.top+(1-p.y)*b.height/2};});
 await page.mouse.move(xy.x,xy.y);await page.waitForTimeout(300);console.log('Preview:',await page.locator('#status').textContent());await page.screenshot({path:'artifacts/editor-preview.png'});
 await page.mouse.click(xy.x,xy.y);await page.waitForFunction(()=>!editor3d.loading&&editor3d.document.map.props.filter(p=>p.kind.startsWith('ramp-')).length===8,{},{timeout:60000});
 const placed=await page.evaluate(()=>editor3d.export());await page.click('#undo');await page.waitForFunction(()=>!editor3d.loading&&!editor3d.document.map.props.some(p=>p.kind.startsWith('ramp-')));await page.click('#redo');await page.waitForFunction(()=>!editor3d.loading&&editor3d.document.map.props.filter(p=>p.kind.startsWith('ramp-')).length===8);
 if(await page.evaluate(()=>editor3d.export())!==placed)throw Error('Redo changed the map');
 await page.click('#save-map');await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Saved'));
 await page.reload();await page.waitForFunction(()=>window.editor3d&&!editor3d.loading,{},{timeout:60000});
 const options=await page.locator('#saved-designs option').evaluateAll(es=>es.map(e=>({value:e.value,text:e.textContent}))),saved=options.find(e=>e.text.includes('Ramp UI proof'));if(!saved)throw Error('Saved map missing');await page.selectOption('#saved-designs',saved.value);await page.click('#load-map');await page.waitForFunction(()=>!editor3d.loading&&editor3d.document.map.name==='Ramp UI proof');
 if(await page.evaluate(()=>editor3d.export())!==placed)throw Error('Reload changed the map');
 await page.evaluate(()=>{editor3d.view.x=26;editor3d.view.y=27;editor3d.view.span=25;document.getElementById('camera').dispatchEvent(new Event('change'));});await page.waitForTimeout(200);await page.screenshot({path:'artifacts/editor-reloaded.png'});
 const popupPromise=context.waitForEvent('page',{timeout:15000});await page.click('#playtest');const battle=await popupPromise;watch(battle);await battle.waitForLoadState();await battle.waitForFunction(()=>window.battle3d?.state,{},{timeout:60000});
 const check=await battle.evaluate(async()=>{const {move,stepMovement,refresh}=await import('./core/engine.js'),{rampInfo}=await import('./cliff-ramps.js');const s=battle3d.state,r=rampInfo(s.props.find(p=>p.kind==='ramp-grass-east')),u=s.units.find(u=>u.team==='squad');Object.assign(u,r.entry);refresh(s);const up=move(s,u,r.exit.x,r.exit.y,r.exit.z);while(s.queue.length)stepMovement(s);const top={x:u.x,y:u.y,z:u.z};return {up,top,expected:r.exit,ramps:s.props.filter(p=>p.kind.startsWith('ramp-')).length};});
 if(!check.up||check.top.z!==check.expected.z||check.ramps!==8)throw Error(JSON.stringify(check));await battle.screenshot({path:'artifacts/editor-playtest.png'});
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: pointer preview and placement; undo/redo; IndexedDB save, reload and load; real editor playtest launch and uphill walking.',JSON.stringify(check));
 await fs.writeFile('artifacts/editor-proof.json',JSON.stringify({check,errors},null,2));
}finally{await browser.close();}
