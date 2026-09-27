import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.REVIEW_URL||'http://127.0.0.1:4439',dir='artifacts/roof-mantle';
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1150}}),errors=[];let samples=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(base+'/tactics/roof-mantle-study.html');await page.waitForFunction(()=>window.roofMantleStudy?.ready);
 for(const outfit of ['normal','red-hats']){
  await page.locator('#outfit').selectOption(outfit);await page.waitForFunction(()=>roofMantleStudy.ready);
  for(const view of ['three','side','front','rear'])for(const scale of ['full','close','game'])for(const grey of [false,true]){
   await page.locator('#view').selectOption(view);await page.locator('#scale').selectOption(scale);await page.locator('#grey').setChecked(grey);
   for(const t of [0,.4,1.1,2.2,2.7,3.35,3.65,4.15,4.625,5.3,6.25]){
    const r=await page.evaluate(t=>{roofMantleStudy.seek(t/roofMantleStudy.motion.duration);return roofMantleStudy.result;},t);
    assert(r.contacts.every(c=>c.error<1e-6),JSON.stringify({outfit,view,scale,grey,t,contacts:r.contacts}));samples++;
   }
  }
 }
 await page.locator('#outfit').selectOption('normal');await page.waitForFunction(()=>roofMantleStudy.ready);await page.locator('#grey').uncheck();
 // Fixed cameras make the weight transfer and the height of the roof legible.
 for(const [name,view,scale]of [['rear','rear','full'],['side','side','full'],['gameplay','three','game']]){
  await page.locator('#view').selectOption(view);await page.locator('#scale').selectOption(scale);
  const png=await page.evaluate(()=>{const times=[1.4,2.2,2.7,3.35,4.15,4.95],sheet=document.createElement('canvas');sheet.width=1400;sheet.height=850;const ctx=sheet.getContext('2d');for(const [i,t]of times.entries()){roofMantleStudy.seek(t/roofMantleStudy.motion.duration);const x=(i%3)*1400/3,y=Math.floor(i/3)*425;ctx.drawImage(roofMantleStudy.renderer.domElement,x,y,1400/3,425);ctx.fillStyle='white';ctx.font='18px sans-serif';ctx.fillText(t.toFixed(2)+' s',x+15,y+25);}return sheet.toDataURL('image/png').split(',')[1];});
  fs.writeFileSync(dir+'/'+name+'-sequence.png',Buffer.from(png,'base64'));
  await page.evaluate(()=>{roofMantleStudy.seek(0);const chunks=[],stream=roofMantleStudy.renderer.domElement.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:2200000});window.mantleRecording={chunks,stream,recorder};recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();});
  await page.locator('#play').click();await page.waitForFunction(()=>roofMantleStudy.result.time>=roofMantleStudy.motion.duration&&document.getElementById('play').textContent==='Play');
  const video=await page.evaluate(()=>new Promise(resolve=>{const {chunks,stream,recorder}=mantleRecording;recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};recorder.stop();}));fs.writeFileSync(dir+'/'+name+'.webm',Buffer.from(video,'base64'));
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/checks.json',JSON.stringify({browser:browser.version(),configurations:48,samples,errors},null,2)+'\n');console.log(`${samples} samples in 48 configurations; three recorded sequences; no browser errors.`);
}finally{await browser.close();}
