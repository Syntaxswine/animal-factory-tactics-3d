import {createRequire} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.REVIEW_URL||'http://127.0.0.1:4432/tactics/ladder-study.html';
const out=new URL('../artifacts/ladder-review/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const animals=(process.env.REVIEW_ANIMALS||'horse,goat,bull,cow,donkey,sheep,skunk,pig-foreman,pig-director,rabbit,dog').split(',');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1400,height:1080}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const animal of animals){
  const pictures=[];
  for(const outfit of ['normal','red-hats'])for(const ladder of ['floor','tower']){
   await page.goto(`${base}?animal=${animal}&outfit=${outfit}&ladder=${ladder}&scale=close`);
   await page.waitForFunction(()=>window.ladderStudy?.ready);
   const report=await page.evaluate(()=>{
    const s=window.ladderStudy,rows=[];
    for(const direction of ['up','down'])for(const phase of s.motion.phases)for(const u of [0,.25,.5,.75,1]){
     const p=(phase.start+(phase.end-phase.start)*u)/s.motion.duration,r=s.motion.apply(direction==='up'?p:1-p,{direction});
     if(r.contacts.some(c=>c.error>1e-5))throw new Error('contact drift');
     if(s.worker.bones.some(b=>b.matrixWorld.elements.some(n=>!Number.isFinite(n))))throw new Error('nonfinite pose');
     rows.push({direction,phase:r.phase,progress:r.progress,support:r.contacts.filter(c=>c.planted).length});
    }
    return {rows,duration:s.motion.duration};
   });results.push({animal,outfit,ladder,...report});
   const poses=await page.evaluate(()=>{const m=ladderStudy.motion,p=m.phases.find(p=>p.label==='Step onto landing');return [0,.2,.5,(p.start+(p.end-p.start)*.58)/m.duration,1];});
   if(ladder==='floor')for(const view of ['three','side','front','rear']){
    await page.selectOption('#view',view);
    for(const progress of [poses[2],poses[3]]){
     const src=await page.evaluate(p=>{ladderStudy.seek(p);return document.getElementById('scene').toDataURL();},progress);
     pictures.push({src,label:`${animal} / ${outfit} / ${view} / ${progress.toFixed(3)}`});
    }
   }
   if(outfit==='normal'&&ladder==='tower'){
    for(const scale of ['close','game']){
     await page.selectOption('#scale',scale);
     for(const progress of poses){
      const src=await page.evaluate(p=>{ladderStudy.seek(p);return document.getElementById('scene').toDataURL();},progress);
      pictures.push({src,label:`${animal} / tower / ${scale} / ${progress.toFixed(3)}`});
     }
    }
   }
  }
  // Crop the centered character region, preserving native gameplay pixel size.
  const sheet=await page.evaluate(async pictures=>{
   const c=document.createElement('canvas'),w=550,h=720;c.width=w*4;c.height=h*Math.ceil(pictures.length/4);const ctx=c.getContext('2d');ctx.fillStyle='#202b26';ctx.fillRect(0,0,c.width,c.height);
   for(let i=0;i<pictures.length;i++){const p=pictures[i],im=new Image();im.src=p.src;await im.decode();const x=i%4*w,y=Math.floor(i/4)*h;ctx.drawImage(im,425,90,550,680,x,y+40,550,680);ctx.fillStyle='#f5ead1';ctx.font='16px sans-serif';ctx.fillText(p.label,x+8,y+26);}
   return {png:c.toDataURL().split(',')[1],jpeg:c.toDataURL('image/jpeg',.88).split(',')[1]};
  },pictures);
  fs.writeFileSync(new URL(`${animal}.png`,out),Buffer.from(sheet.png,'base64'));fs.writeFileSync(new URL(`${animal}.jpg`,out),Buffer.from(sheet.jpeg,'base64'));console.log(`${animal}: 4 loaded configurations; ${pictures.length} views captured`);
 }
 assert.deepEqual(errors,[]);const summary={configurations:results.length,directions:results.length*2,samples:results.reduce((n,r)=>n+r.rows.length,0),errors,results};fs.writeFileSync(new URL('report.json',out),JSON.stringify(summary,null,2));console.log(JSON.stringify({configurations:summary.configurations,directions:summary.directions,samples:summary.samples,errors}));
}finally{await browser.close();}
