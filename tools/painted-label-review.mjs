import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const out='docs/tactics/painted-label-review';fs.mkdirSync(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4329/tactics/painted-cargo.html');await page.waitForFunction(()=>window.cargoWorkshop?.ready);
 const result=await page.evaluate(async()=>{
  const {CARGO_FORMS,CARGO_SKINS,CARGO_LABELS}=await import('./painted-cargo.js'),stats=[];let count=0;
  for(let cycle=0;cycle<2;cycle++){
   for(const label of Object.keys(CARGO_LABELS)){
    document.getElementById('decal').value=label;
    for(const form of CARGO_FORMS)for(const [skin,s]of Object.entries(CARGO_SKINS))if(s.family===form.family){
     cargoWorkshop.select(form.id,skin);const model=cargoWorkshop.selection()[0],b=model.bounds,[w,d]=form.tiles;
     if(b.min.x < -w/2 || b.max.x > w/2 || b.min.z < -d/2 || b.max.z > d/2)throw Error('Footprint: '+form.id);
     let labels=0;model.root.traverse(o=>{if(o.userData.cargoLabel)labels++;});
     if(label==='none'?labels!==0:labels<model.items.length)throw Error('Missing/extra labels: '+form.id);
     count++;
    }
   }
   stats.push(cargoWorkshop.diagnostics());
  }
  return {count,stats};
 });
 assert.deepEqual(result.stats[0],result.stats[1]);
 for(const [form,skin,label]of [['crate-long','timber','shipping'],['crate-strapped','oliveWood','fragile'],['crate-square','weathered','stores'],['barrel-single','blue','hazard'],['barrel-pyramid','oxide','shipping'],['barrel-block','creamSteel','stores']]){
  await page.locator('#decal').selectOption(label);await page.evaluate(([f,s])=>cargoWorkshop.select(f,s),[form,skin]);
  await page.screenshot({path:`${out}/${form}.png`});
 }
 await page.locator('#scale').selectOption('58');await page.screenshot({path:`${out}/gameplay.png`});
 await page.setViewportSize({width:390,height:844});await page.locator('#scale').selectOption('fit');await page.screenshot({path:`${out}/mobile.png`});
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({...result,errors},null,2));console.log({count:result.count,errors,stats:result.stats});
}finally{await browser.close();}
