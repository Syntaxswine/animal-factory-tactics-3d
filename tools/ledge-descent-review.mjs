import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.REVIEW_URL||'http://127.0.0.1:4447',dir='artifacts/ledge-descent-viewer';
const requested=process.env.ANIMALS?.split(',').map(s=>s.trim()).filter(Boolean);
assert(!requested||requested.length&&requested.every(id=>ANIMAL_MOTION_CATALOG.some(p=>p.id===id)),'ANIMALS must contain catalog IDs');
const animals=ANIMAL_MOTION_CATALOG.filter(p=>!requested||requested.includes(p.id));
const surfaces=(process.env.SURFACES||'roof,cliff').split(',').map(s=>s.trim());
assert(surfaces.length&&surfaces.every(s=>['roof','cliff'].includes(s)),'SURFACES must contain roof and/or cliff');
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
const errors=[],checks=[],clips=[];let samples=0,configurations=0,failure=null;
const report=`${dir}/checks${requested?'-'+animals.map(p=>p.id).join('-'):''}-${surfaces.join('-')}.json`;
try{
 const page=await browser.newPage({viewport:{width:1400,height:1150}});
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto(`${base}/tactics/ledge-descent-study.html`);
 await page.waitForFunction(()=>window.ledgeDescentStudy?.ready);
 assert.equal(await page.locator('#animal option').count(),ANIMAL_MOTION_CATALOG.length);
 assert.deepEqual(await page.locator('#weapon option').evaluateAll(options=>options.map(o=>o.value)),['rifle','hands']);
 for(const surface of surfaces)for(const {id:animal,unarmed} of animals){
  await page.locator('#surface').selectOption(surface);
  await page.locator('#animal').selectOption(animal);
  await page.waitForFunction(id=>ledgeDescentStudy.ready&&ledgeDescentStudy.profile.id===id,animal);
  assert.equal(await page.locator('#outfit option[value="blue-hawaiian"]').evaluate(option=>option.disabled),animal!=='donkey');
  for(const outfit of ['normal','red-hats',...(animal==='donkey'?['blue-hawaiian']:[])]){
   await page.locator('#outfit').selectOption(outfit);
   await page.waitForFunction(o=>ledgeDescentStudy.ready&&ledgeDescentStudy.outfit===o,outfit);
   const weapon=unarmed||outfit==='blue-hawaiian'?'hands':'rifle',name=`${animal}-${outfit}-${surface}`;
   assert.equal(await page.locator('#weapon').inputValue(),weapon);assert(await page.locator('#weapon').isDisabled());
   for(const [id,value]of Object.entries({surface,animal,outfit,weapon}))assert.equal(new URL(page.url()).searchParams.get(id),value);
   const phases=await page.evaluate(()=>ledgeDescentStudy.motion.phases);
   assert(phases.length>3);assert.equal(await page.locator('#phases button').count(),phases.length);
   for(const view of ['three','side','front','rear'])for(const scale of ['full','close','game'])for(const grey of [false,true]){
    await page.locator('#view').selectOption(view);await page.locator('#scale').selectOption(scale);
    await page.locator('#grey').setChecked(grey);await page.locator('#contacts').setChecked(grey);configurations++;
    const snapshots=new Map();
    for(const p of [0,.2,.4,.6,.8,1,.6,.2]){
     const result=await page.evaluate(p=>{ledgeDescentStudy.seek(p);return ledgeDescentStudy.result;},p);
     assert(result.root.every(Number.isFinite));assert(result.phase);
     assert(result.contacts.every(c=>Number.isFinite(c.error)&&c.error<1e-5),'unreachable contact: '+JSON.stringify({name,p,result}));
     if(snapshots.has(p))assert.deepEqual(result,snapshots.get(p),'non-deterministic reverse scrub '+name);else snapshots.set(p,result);samples++;
    }
   }
   for(const [i,phase]of phases.entries()){
    await page.locator('#phases button').nth(i).click();
    const time=await page.evaluate(()=>ledgeDescentStudy.result.time);
    assert(Math.abs(time-(phase.start+phase.end)/2)<1e-8,'phase button did not seek to midpoint');
   }
   await page.locator('#view').selectOption('side');await page.locator('#scale').selectOption('full');
   await page.locator('#phases button').nth(2).click();await page.screenshot({path:`${dir}/${name}-grey.png`});
   await page.locator('#grey').uncheck();await page.locator('#contacts').uncheck();
   const png=await page.evaluate(()=>{
    const a=ledgeDescentStudy,sheet=document.createElement('canvas');sheet.width=2100;sheet.height=1275;
    const ctx=sheet.getContext('2d'),ps=[0,.23,.36,.49,.61,.72,.82,.91,1];
    ps.forEach((p,i)=>{a.seek(p);const x=i%3*700,y=Math.floor(i/3)*425;
     ctx.drawImage(a.renderer.domElement,x,y,700,425);ctx.fillStyle='white';ctx.font='17px sans-serif';
     ctx.fillText(`${a.profile.label} · ${(p*a.motion.duration).toFixed(2)}s · ${a.result.phase}`,x+12,y+25);
    });return sheet.toDataURL('image/png').split(',')[1];
   });fs.writeFileSync(`${dir}/${name}-sequence.png`,Buffer.from(png,'base64'));
   await page.locator('#view').selectOption('three');
   // Record the actual wall-clock playback, with no timeline seeking during capture.
   const clip=await page.evaluate(async()=>{
    const a=ledgeDescentStudy;a.seek(0);
    const stream=a.renderer.domElement.captureStream(30),chunks=[];
    const mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
    const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4000000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    const done=new Promise(resolve=>recorder.onstop=resolve);
    recorder.start();const start=performance.now();document.getElementById('play').click();
    await new Promise((resolve,reject)=>{
     function tick(){
      if(performance.now()-start>15000){reject(Error('Playback timeout'));return;}
      if(a.result.time>=a.motion.duration&&document.getElementById('play').textContent==='Play')resolve();else requestAnimationFrame(tick);
     }requestAnimationFrame(tick);
    });
    const elapsedMs=performance.now()-start;recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());
    const blob=new Blob(chunks,{type:mimeType});
    const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
    return {data,elapsedMs,duration:a.motion.duration,mimeType};
   });
   assert(clip.elapsedMs>=clip.duration*1000-100,'playback ran faster than normal speed');
   assert(clip.data.length>1000,'empty playback recording');
   fs.writeFileSync(`${dir}/${name}-normal-speed.webm`,Buffer.from(clip.data,'base64'));
   clips.push({animal,outfit,surface,elapsedMs:clip.elapsedMs,duration:clip.duration,file:`${name}-normal-speed.webm`});
   checks.push({animal,outfit,surface,weapon,phases:phases.length});console.log(name+' passed');
  }
 }
 // Exercise URL constraints directly, including unsupported guide outfit on another animal.
 for(const [query,expected]of [
  ['animal=hen&outfit=red-hats&weapon=rifle',{animal:'hen',outfit:'red-hats',weapon:'hands'}],
  ['animal=donkey&outfit=blue-hawaiian&weapon=rifle',{animal:'donkey',outfit:'blue-hawaiian',weapon:'hands'}],
  ['animal=horse&outfit=blue-hawaiian&weapon=hands',{animal:'horse',outfit:'normal',weapon:'rifle'}]
 ]){
  await page.goto(`${base}/tactics/ledge-descent-study.html?${query}`);await page.waitForFunction(()=>ledgeDescentStudy.ready);
  for(const [id,value]of Object.entries(expected))assert.equal(await page.locator('#'+id).inputValue(),value);
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({samples,configurations,playbacks:clips.length,errors,evidence:dir}));
}catch(error){failure=error.stack;throw error;}
finally{
 fs.writeFileSync(report,JSON.stringify({browser:browser.version(),animals:animals.map(p=>p.id),surfaces,samples,configurations,checks,clips,errors,failure},null,2)+'\n');
 await browser.close();
}
