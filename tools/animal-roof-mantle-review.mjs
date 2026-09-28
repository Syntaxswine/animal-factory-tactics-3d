import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.REVIEW_URL||'http://127.0.0.1:4439',dir='artifacts/animal-roof-mantle';
// Repeat the complete matrix and normal-speed playback on each selected surface.
// SURFACES=roof,cliff; omitted SURFACES keeps the original roof-only run.
const surfaces=[...new Set((process.env.SURFACES||'roof').split(',').map(s=>s.trim()))];
assert(surfaces.length&&surfaces.every(s=>['roof','cliff'].includes(s)),'SURFACES must contain roof and/or cliff');
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1150}}),errors=[],checks=[];let samples=0,configurations=0;const bySurface=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 const animals=ANIMAL_MOTION_CATALOG.filter(p=>!process.env.ANIMALS||process.env.ANIMALS.split(',').includes(p.id));
 for(const surface of surfaces){
 const startSamples=samples,startConfigurations=configurations,startChecks=checks.length;
 await page.goto(base+'/tactics/roof-mantle-study.html?surface='+surface);await page.waitForFunction(s=>window.roofMantleStudy?.ready&&roofMantleStudy.surface===s,surface);
 for(const {id:animal}of animals){
  await page.locator('#animal').selectOption(animal);await page.waitForFunction(id=>roofMantleStudy.ready&&roofMantleStudy.profile.id===id,animal);
  for(const outfit of ['normal','red-hats',...(animal==='donkey'?['blue-hawaiian']:[])]){
   await page.locator('#outfit').selectOption(outfit);await page.waitForFunction(()=>roofMantleStudy.ready);
   for(const view of ['three','side','front','rear'])for(const scale of ['full','close','game'])for(const grey of [false,true]){
    await page.locator('#view').selectOption(view);await page.locator('#scale').selectOption(scale);await page.locator('#grey').setChecked(grey);configurations++;
    for(const t of [0,.4,1.1,2.2,2.7,3.35,3.65,4.15,4.65,5.3,6.25]){
     const r=await page.evaluate(t=>{roofMantleStudy.seek(t/roofMantleStudy.motion.duration);return roofMantleStudy.result;},t);
     assert(r.contacts.every(c=>Number.isFinite(c.error)&&c.error<1e-6),JSON.stringify({surface,animal,outfit,view,scale,grey,t,contacts:r.contacts}));samples++;
    }
   }
   await page.locator('#grey').uncheck();await page.locator('#scale').selectOption('close');
   for(const view of ['rear','side']){
    await page.locator('#view').selectOption(view);
    const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1500;c.height=850;const ctx=c.getContext('2d');for(const [i,t]of [2.2,3.35,3.65,4.15,4.65,5.6].entries()){roofMantleStudy.seek(t/roofMantleStudy.motion.duration);const x=(i%3)*500,y=Math.floor(i/3)*425;ctx.drawImage(roofMantleStudy.renderer.domElement,250,130,1050,720,x,y,500,425);ctx.fillStyle='white';ctx.font='20px sans-serif';ctx.fillText(t+' s',x+12,y+25);}return c.toDataURL().split(',')[1];});
    fs.writeFileSync(`${dir}/${animal}-${outfit}-${view}-${surface}.png`,Buffer.from(png,'base64'));
   }
   // Check real attachment geometry as well as markers: hats, ears and tails
   // can differ across outfits despite an identical underlying skeleton.
   const geometry=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js');let maxDepth=0,part='',time=0;for(let i=0;i<=80;i++){roofMantleStudy.seek(i/80);const w=roofMantleStudy.worker;w.root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;for(const j of new Set(o.geometry.index?.array||Array.from({length:o.geometry.attributes.position.count},(_,k)=>k))){const v=o.getVertexPosition(j,new T.Vector3()).applyMatrix4(o.matrixWorld),d=Math.min(v.x,3-v.x,2-v.y,2-Math.abs(v.z));if(v.y>=0&&d>maxDepth){maxDepth=d;part=o.name;time=roofMantleStudy.result.time;}}});}return {maxDepth,part,time};});
   checks.push({surface,animal,outfit,...geometry});assert(geometry.maxDepth<.004,JSON.stringify(checks.at(-1)));
  }
  await page.locator('#outfit').selectOption('normal');await page.waitForFunction(()=>roofMantleStudy.ready);await page.locator('#view').selectOption('three');await page.locator('#scale').selectOption('full');await page.evaluate(()=>roofMantleStudy.seek(0));
  await page.locator('#play').click();await page.waitForFunction(()=>roofMantleStudy.result.time>=roofMantleStudy.motion.duration&&document.getElementById('play').textContent==='Play');
  console.log(animal+' '+surface+' passed');
 }
 bySurface.push({surface,configurations:configurations-startConfigurations,samples:samples-startSamples,outfitSweeps:checks.length-startChecks,playbacks:animals.length});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(dir+'/checks'+(process.env.ANIMALS?'-'+animals.map(p=>p.id).join('-'):'')+'-surfaces-'+surfaces.join('-')+'.json',JSON.stringify({browser:browser.version(),surfaces,bySurface,configurations,samples,checks,errors},null,2)+'\n');console.log(`${samples} samples in ${configurations} configurations; ${checks.length} outfit surface sweeps; no browser errors.`);
}finally{await browser.close();}
