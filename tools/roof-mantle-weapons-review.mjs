import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {WEAPON_MODELS} from '../dist/tactics/weapon-models.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.REVIEW_URL||'http://127.0.0.1:4439',dir='artifacts/roof-mantle-weapons';
// Repeat the complete matrix and normal-speed playback on each selected surface.
// SURFACES=roof,cliff; omitted SURFACES keeps the original roof-only run.
const surfaces=[...new Set((process.env.SURFACES||'roof').split(',').map(s=>s.trim()))];
assert(surfaces.length&&surfaces.every(s=>['roof','cliff'].includes(s)),'SURFACES must contain roof and/or cliff');
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1150}}),errors=[],checks=[],bySurface=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const animals=ANIMAL_MOTION_CATALOG.filter(p=>!process.env.ANIMALS||process.env.ANIMALS.split(',').includes(p.id));
 for(const surface of surfaces){
 const startChecks=checks.length;let playbacks=0;
 await page.goto(base+'/tactics/roof-mantle-study.html?surface='+surface);await page.waitForFunction(s=>window.roofMantleStudy?.ready&&roofMantleStudy.surface===s,surface);
 for(const profile of animals){
  await page.locator('#animal').selectOption(profile.id);await page.waitForFunction(id=>roofMantleStudy.ready&&roofMantleStudy.profile.id===id,profile.id);
  for(const outfit of ['normal','red-hats',...(profile.id==='donkey'?['blue-hawaiian']:[])]){
   await page.locator('#outfit').selectOption(outfit);await page.waitForFunction(()=>roofMantleStudy.ready);
   const ids=profile.unarmed||outfit==='blue-hawaiian'?['hands']:Object.keys(WEAPON_MODELS).filter(id=>!process.env.WEAPONS||process.env.WEAPONS.split(',').includes(id));
   for(const weapon of ids){
    if(!await page.locator('#weapon').isDisabled())await page.locator('#weapon').selectOption(weapon);
    await page.waitForFunction(id=>roofMantleStudy.ready&&(roofMantleStudy.worker.weapon?.id|| (roofMantleStudy.profile.unarmed?'hands':'rifle'))===id,weapon);
    let samples=0;
    for(const [view,scale]of [['three','full'],['side','close'],['rear','close'],['three','game']]){
     await page.locator('#view').selectOption(view);await page.locator('#scale').selectOption(scale);
     for(const t of [0,.28,.48,1.2,2.7,3.6,4.15,4.65,5.9,6.25]){
      const r=await page.evaluate(t=>{roofMantleStudy.seek(t/roofMantleStudy.motion.duration);return roofMantleStudy.result;},t);
      assert(r.contacts.every(c=>Number.isFinite(c.error)&&c.error<1e-6),JSON.stringify({surface,animal:profile.id,outfit,weapon,view,scale,t,contacts:r.contacts}));samples++;
     }
    }
    checks.push({surface,animal:profile.id,outfit,weapon,samples});
   }
  }
  console.log(profile.id+' '+surface+' weapon/outfit browser matrix passed');
 }
 // Carry can change visually even when all attachment markers remain exact.
 // Record full-speed playback of each equipment mode on the original horse.
 await page.locator('#animal').selectOption('horse');await page.waitForFunction(()=>roofMantleStudy.ready&&roofMantleStudy.profile.id==='horse');
 await page.locator('#outfit').selectOption('normal');await page.waitForFunction(()=>roofMantleStudy.ready);
 await page.locator('#scale').selectOption('full');await page.locator('#view').selectOption('three');
 for(const weapon of Object.keys(WEAPON_MODELS).filter(id=>!process.env.WEAPONS||process.env.WEAPONS.split(',').includes(id))){
  await page.locator('#weapon').selectOption(weapon);await page.waitForFunction(()=>roofMantleStudy.ready);
  await page.evaluate(()=>roofMantleStudy.seek(0));await page.locator('#play').click();
  await page.waitForFunction(()=>roofMantleStudy.result.time>=roofMantleStudy.motion.duration&&document.getElementById('play').textContent==='Play');playbacks++;
 }
 bySurface.push({surface,combinations:checks.length-startChecks,samples:checks.slice(startChecks).reduce((n,c)=>n+c.samples,0),playbacks});
 }
 assert.deepEqual(errors,[]);
 const report={surfaces,bySurface,combinations:checks.length,samples:checks.reduce((n,c)=>n+c.samples,0),errors,checks};
 fs.writeFileSync(dir+'/browser'+(process.env.ANIMALS?'-'+process.env.ANIMALS:'')+(process.env.WEAPONS?'-'+process.env.WEAPONS.split(',').join('-'):'')+'-surfaces-'+surfaces.join('-')+'.json',JSON.stringify(report,null,2)+'\n');
 console.log(`${report.combinations} animal/outfit/equipment combinations, ${report.samples} rendered samples; no browser errors.`);
}finally{await browser.close();}
