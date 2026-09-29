import assert from 'node:assert/strict';import {createRequire} from 'node:module';const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto((process.env.EDITOR_URL||'http://127.0.0.1:4362/tactics/editor-3d.html')+'?editing=1');await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading);
 for(const surface of ['wood','woodsupport','woodgold']){
  await page.evaluate(async()=>{const {blankMap}=await import('./core/maps.js');const m=blankMap('Wood ramp placement');m.upper[0]['9,8']='ground-wood-planks';await editor3d.open(JSON.stringify(m));});
  await page.click('[data-group=ramps]');await page.selectOption('#ramp-placement','wall');await page.selectOption('#ramp-surface',surface);assert.equal(await page.inputValue('#ramp-placement'),'manual');assert(await page.locator('#ramp-direction').isVisible());await page.selectOption('#ramp-direction','north');await page.locator('#scene').focus();await page.keyboard.press('r');assert.equal(await page.inputValue('#ramp-direction'),'east');
  const p=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),v=new T.Vector3(6,0,8).project(editor3d.scene.camera),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};});await page.mouse.click(p.x,p.y);
  await page.waitForFunction(kind=>editor3d.document.map.props.some(p=>p.kind===kind)&&!editor3d.loading,'ramp-'+surface+'-east');
  assert.deepEqual(await page.evaluate(()=>editor3d.validate()),[]);await page.click('#undo');await page.waitForFunction(()=>!editor3d.document.map.props.length&&!editor3d.loading);await page.click('#redo');await page.waitForFunction(()=>editor3d.document.map.props.length===1&&!editor3d.loading);
  await page.evaluate(async()=>{const saved=editor3d.document.export();await editor3d.open(saved);});assert.equal(await page.evaluate(()=>editor3d.document.map.props[0].kind),'ramp-'+surface+'-east');
 }
 assert.deepEqual(errors,[]);console.log('All three wooden ramps: UI selection, automatic individual placement, rotation, click placement, undo/redo and reload passed.');
}finally{await browser.close();}
