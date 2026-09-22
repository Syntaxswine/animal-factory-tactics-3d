import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const dir=new URL('../docs/tactics/hybrid-review/prone-proof/',import.meta.url);
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'}),results=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1400,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
 await page.goto('http://127.0.0.1:4428/tactics/horse-prone.html?paused');await page.waitForFunction(()=>window.animalMotionReady);
 for(const outfit of ['normal','red-hats']){
  await page.locator('#outfit').selectOption(outfit);await page.waitForFunction(()=>window.animalMotionReady);
  const checks=[];
  for(const close of [false,true]){
   await page.locator('#close').setChecked(close);
   const batch=await page.evaluate(()=>{const out=[];for(const heading of [-179,-43,0,23,137,180])for(const pitch of [-15,0,20])for(const time of [0,.7,1.4,2.1,2.7,3.6,4.6,5.5,6.2,6.21,6.225,6.4,7.5,8.1,9.2,10.3,11.7,12]){
    document.getElementById('heading').value=heading;document.getElementById('pitch').value=pitch;animalMotion.seek(time);const d=animalMotion.diagnostics(),cap=animalMotion.redHat?.mesh;let capMin=Infinity;
    if(cap){const a=cap.geometry.attributes.position,v=cap.position.clone();for(let i=0;i<a.count;i++)capMin=Math.min(capMin,cap.localToWorld(v.fromBufferAttribute(a,i)).y);}
    out.push({heading,pitch,time,outfit:d.outfit,ppu:d.pixelsPerUnit,capTriangles:d.capTriangles,capAttached:!cap||cap.parent===animalMotion.worker.bones.find(b=>b.name==='head'),capMin:cap?capMin:null,gripError:Math.max(...d.contacts.map(c=>c.error)),flashError:Math.hypot(...d.flashPosition.map((v,i)=>v-d.muzzle.origin[i])),traceError:Math.hypot(...d.traceOrigin.map((v,i)=>v-d.shot.origin[i]))});
   }return out;});
   for(const d of batch){assert.equal(d.outfit,outfit);assert(Math.abs(d.ppu-(close?300:58))<1e-9);assert.equal(d.capTriangles,outfit==='normal'?0:700);assert(d.capAttached);assert(d.capMin===null||d.capMin>=0);assert(d.gripError<1e-7);assert(d.flashError<1e-8);assert(d.traceError<1e-6);}checks.push(...batch);
  }
  await page.evaluate(()=>{document.getElementById('heading').value=0;document.getElementById('pitch').value=0;});
  for(const [view,close]of [['front',true],['side',true],['back',true],['three',true],['game',false]]){
   await page.locator('#view').selectOption(view);await page.locator('#close').setChecked(close);
   const png=await page.evaluate(({outfit,close})=>{const w=close?780:250,h=close?650:330,times=[1.4,2.7,3.6,5.5,6.225,9.2],c=document.createElement('canvas');c.width=w*3;c.height=(h+28)*2;const ctx=c.getContext('2d');ctx.fillStyle='#353a32';ctx.fillRect(0,0,c.width,c.height);for(const [i,t]of times.entries()){animalMotion.seek(t);const source=animalMotion.renderer.domElement,x=i%3*w,y=Math.floor(i/3)*(h+28);ctx.drawImage(source,(source.width-w)/2,0,w,h,x,y+28,w,h);ctx.fillStyle='white';ctx.font='16px sans-serif';ctx.fillText(outfit+' · '+t+' s',x+8,y+21);}return c.toDataURL('image/png').split(',')[1];},{outfit,close});
   fs.writeFileSync(new URL(outfit+'-'+view+'.png',dir),Buffer.from(png,'base64'));
  }
  if(!process.argv.includes('--no-video')){await page.locator('#view').selectOption('game');for(const close of [false,true]){
   await page.locator('#close').setChecked(close);await page.evaluate(()=>{animalMotion.seek(0);const chunks=[],stream=animalMotion.renderer.domElement.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:2000000});window.recording={chunks,stream,recorder};recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();});
   await page.locator('#replay').click();await page.waitForFunction(()=>!animalMotion.diagnostics().playing&&animalMotion.diagnostics().time===12,{},{timeout:30000});
   const bytes=await page.evaluate(()=>new Promise(resolve=>{const {chunks,stream,recorder}=recording;recorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob(chunks,{type:'video/webm'}));};recorder.stop();}));fs.writeFileSync(new URL(outfit+'-'+(close?'close':'native')+'.webm',dir),Buffer.from(bytes,'base64'));
  }}
  results.push({outfit,checks});console.log(outfit+': '+checks.length+' poses passed; five sheets captured');
 }
 // Repeated outfit replacement must release its GPU resources after warm-up.
 const resources=[];for(let i=0;i<8;i++){await page.locator('#outfit').selectOption(i%2?'normal':'red-hats');await page.waitForFunction(()=>animalMotionReady);resources.push(await page.evaluate(()=>({...animalMotion.renderer.info.memory})));}
 for(const parity of [0,1])assert.deepEqual(resources[parity+2],resources[parity+6],'retained GPU resources grow after replacement');
 // Shared viewer changes must leave the approved twelve-animal study usable.
 await page.goto('http://127.0.0.1:4428/tactics/animal-motion.html?paused');await page.waitForFunction(()=>animalMotionReady);assert.equal(await page.locator('#animal option').count(),12);
 const legacy=await page.evaluate(async()=>{const out=[];for(const id of Array.from(document.querySelectorAll('#animal option'),o=>o.value)){await animalMotion.loadAnimal(id);for(const t of [0,4.4,6.61,11]){animalMotion.seek(t);const d=animalMotion.diagnostics();out.push({id,t,time:d.time,unarmed:!!d.unarmed,flash:d.flashVisible});}}return out;});
 for(const d of legacy){assert.equal(d.time,d.t);if(d.id==='hen')assert(d.unarmed&&!d.flash);}
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('browser-checks.json',dir),JSON.stringify({capturedAt:new Date().toISOString(),browser:browser.version(),errors,results,resources,legacy},null,2)+'\n');
 console.log('Both outfits, resource replacement and all twelve legacy viewers passed.');
}finally{await browser.close();}

