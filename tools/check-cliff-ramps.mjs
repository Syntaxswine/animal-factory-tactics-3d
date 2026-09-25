import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.RAMP_URL||'http://127.0.0.1:4436',browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1250,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await fs.mkdir('artifacts/cliff-ramps',{recursive:true});
try{
 await page.goto(base+'/tactics/cliff-ramp-study.html');await page.waitForFunction(()=>window.rampStudy?.map);
 let count=0;
 for(const width of ['6','8','10'])for(const direction of ['east','south','west','north'])for(const surface of ['grass','sand','road','concrete'])for(const wall of ['ledge','crag']){
  await page.evaluate(({width,direction,surface,wall})=>{for(const [id,value]of Object.entries({width,direction,surface,wall}))document.getElementById(id).value=value;rampStudy.update();},{width,direction,surface,wall});count++;
 }
 for(const bank of ['dirt','grass','sand'])for(const view of ['front','side','rear'])for(const scale of ['close','gameplay']){
  await page.evaluate(({bank,view,scale})=>{for(const [id,value]of Object.entries({width:'8',direction:'east',surface:'grass',wall:'crag',bank,view,scale}))document.getElementById(id).value=value;rampStudy.update();},{bank,view,scale});
  if(bank==='dirt')await page.screenshot({path:`artifacts/cliff-ramps/crag-${view}-${scale}.png`});count++;
 }
 const map=await page.evaluate(()=>rampStudy.map);await fs.writeFile('artifacts/cliff-ramps/review-map.json',JSON.stringify(map));
 if(errors.length)throw Error(errors.join('\n'));console.log(`${count} broad-ramp configurations rendered without browser errors.`);
}finally{await browser.close();}
