import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.REVIEW_URL||'http://127.0.0.1:4447',dir='artifacts/ledge-descent-viewer';
fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1150}}),errors=[];let samples=0;
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 for(const surface of ['roof','cliff'])for(const outfit of ['normal','red-hats']){
  await page.goto(`${base}/tactics/ledge-descent-study.html?surface=${surface}&outfit=${outfit}`);
  await page.waitForFunction(()=>window.ledgeDescentStudy?.ready);
  assert.equal(await page.locator('#animal option').count(),1);assert.equal(await page.locator('#weapon option').count(),1);
  const phases=await page.evaluate(()=>ledgeDescentStudy.motion.phases);
  assert(phases.length>3);assert.equal(await page.locator('#phases button').count(),phases.length);
  for(const view of ['three','side','front','rear'])for(const scale of ['full','close','game']){
   await page.locator('#view').selectOption(view);await page.locator('#scale').selectOption(scale);
   for(const p of [0,.2,.4,.6,.8,1,.6,.2]){
    const result=await page.evaluate(p=>{ledgeDescentStudy.seek(p);return ledgeDescentStudy.result;},p);
    assert(result.root.every(Number.isFinite));assert(result.phase);assert(result.contacts.every(c=>Number.isFinite(c.error)&&c.error<1e-5),'unreachable contact: '+JSON.stringify(result));samples++;
   }
  }
  await page.locator('#view').selectOption('side');await page.locator('#scale').selectOption('full');
  await page.locator('#contacts').check();await page.locator('#grey').check();
  await page.locator('#phases button').nth(2).click();await page.screenshot({path:`${dir}/${surface}-${outfit}-grey.png`});
  await page.locator('#grey').uncheck();await page.locator('#contacts').uncheck();
  const png=await page.evaluate(()=>{
   const a=ledgeDescentStudy,sheet=document.createElement('canvas');sheet.width=2100;sheet.height=1275;
   const ctx=sheet.getContext('2d'),ps=[0,.23,.36,.49,.61,.72,.82,.91,1];
   ps.forEach((p,i)=>{a.seek(p);const x=i%3*700,y=Math.floor(i/3)*425;
    ctx.drawImage(a.renderer.domElement,x,y,700,425);ctx.fillStyle='white';ctx.font='17px sans-serif';
    ctx.fillText(`${(p*a.motion.duration).toFixed(2)}s · ${a.result.phase}`,x+12,y+25);
   });return sheet.toDataURL('image/png').split(',')[1];
  });fs.writeFileSync(`${dir}/${surface}-${outfit}-sequence.png`,Buffer.from(png,'base64'));
  await page.evaluate(()=>ledgeDescentStudy.seek(0));await page.locator('#play').click();
  await page.waitForFunction(()=>document.getElementById('progress').value==='1'&&document.getElementById('play').textContent==='Play');
  const other=surface==='roof'?'cliff':'roof';await page.locator('#surface').selectOption(other);
  assert.equal(await page.evaluate(()=>ledgeDescentStudy.surface),other);
  assert.equal(new URL(page.url()).searchParams.get('surface'),other);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${dir}/checks.json`,JSON.stringify({samples,browser:browser.version(),errors},null,2));
 console.log(JSON.stringify({samples,errors,evidence:dir}));
}finally{await browser.close();}
