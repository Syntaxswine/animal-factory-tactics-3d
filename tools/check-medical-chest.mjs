import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto((process.env.TACTICS_BASE_URL||'http://127.0.0.1:4361')+'/tactics/overmap.html');
 await page.evaluate(async()=>{
  const [{createGame},{blankMap},{createCharacterScreen}]=await Promise.all([import('./core/engine.js'),import('./core/maps.js'),import('./character-screen.js')]);
  const css=document.createElement('link');css.rel='stylesheet';css.href='./character-screen.css';document.head.append(css);
  const s=createGame(42,blankMap(),true,'easy',{statSystem:true});const vera=s.units.find(u=>u.name==='Vera');createCharacterScreen({getState:()=>s}).show(vera.id);
 });
 const card=page.locator('.dossier-backpack .dossier-item').filter({hasText:'Large medical chest'});await card.waitFor();assert.match(await card.textContent(),/10\/10 sector treatments/);assert.equal(await card.evaluate(e=>e.style.gridColumn),'span 2');
 await card.locator('img').evaluate(img=>img.decode());await card.screenshot({path:'artifacts/large-medical-chest.png'});assert.deepEqual(errors,[]);console.log('Medical chest browser check passed: starter inventory, two cells, charges, deployed chest artwork.');
}finally{await browser.close();}
