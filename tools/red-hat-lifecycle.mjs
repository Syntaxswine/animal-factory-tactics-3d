import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1100}}),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4428/tactics/animal-motion.html?paused');await page.waitForFunction(()=>window.animalMotionReady);
 const ids=await page.locator('#animal option').evaluateAll(a=>a.map(o=>o.value));
 for(const id of ids){
  await page.evaluate(id=>animalMotion.loadAnimal(id),id);await page.evaluate(()=>{animalMotion.seek(6.625);animalMotion.seek(6.5);});
  const before=await page.evaluate(()=>{const r=animalMotion.renderer,c=document.createElement('canvas');c.width=r.domElement.width;c.height=r.domElement.height;const ctx=c.getContext('2d');ctx.drawImage(r.domElement,0,0);window.originalPixels=ctx.getImageData(0,0,c.width,c.height).data;return {...r.info.memory};});
  await page.locator('#outfit').selectOption('red-hats');await page.waitForFunction(()=>window.animalMotionReady);
  const hat=await page.evaluate(async()=>{
   const T=await import('./vendor/three.module.js'),a=animalMotion,cap=a.redHat?.mesh,head=a.worker.bones.find(b=>b.name==='head');let maxError=0;
   if(cap){const position=cap.geometry.attributes.position,reference=position.clone();for(const heading of [-179,0,37,179])for(const pitch of [-15,0,20])for(const time of [0,.75,4.4,5.8,6.5,6.625,8.8,11]){
    document.getElementById('heading').value=heading;document.getElementById('pitch').value=pitch;a.seek(time);
    for(let i=0;i<position.count;i++){const expected=new T.Vector3().fromBufferAttribute(reference,i).applyMatrix4(head.matrixWorld),actual=new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(cap.matrixWorld);maxError=Math.max(maxError,actual.distanceTo(expected));}
   }}
   document.getElementById('heading').value=0;document.getElementById('pitch').value=0;a.seek(6.5);
   return {attached:!cap||cap.parent===head,capTriangles:a.diagnostics().capTriangles,maxError};
  });
  assert.ok(hat.attached&&hat.maxError<1e-10);assert.equal(hat.capTriangles,id==='pig-foreman'?0:700);
  await page.locator('#outfit').selectOption('normal');await page.waitForFunction(()=>window.animalMotionReady);
  const after=await page.evaluate(()=>{const a=animalMotion,r=a.renderer,c=document.createElement('canvas');a.seek(6.5);c.width=r.domElement.width;c.height=r.domElement.height;const ctx=c.getContext('2d');ctx.drawImage(r.domElement,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let different=0;for(let i=0;i<p.length;i++)if(Math.abs(p[i]-originalPixels[i])>2)different++;return {different,...r.info.memory,cap:a.redHat!==null};});
  assert.equal(after.cap,false);assert.ok(after.different<100,id+' original outfit changed after switching');assert.ok(after.geometries<=before.geometries&&after.textures<=before.textures,id+' accessory resources leaked: '+JSON.stringify({before,after}));
  results.push({animal:id,before,hat,after});console.log(id+': rigid cap and original outfit restoration verified');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('../docs/tactics/hybrid-review/red-hat-motion/lifecycle.json',import.meta.url),JSON.stringify({browser:browser.version(),results,errors},null,2)+'\n');
}finally{await browser.close();}
