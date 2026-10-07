import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const {chromium}=await import(pathToFileURL(path.join(process.env.PLAYWRIGHT_PATH,'index.mjs')));
const out=path.resolve(import.meta.dirname,'../artifacts/strategic-sites/scorch');fs.mkdirSync(out,{recursive:true});
const review=await launchSiteReview(chromium,'scorch-check'),errors=[],records=[],origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4475';
try{
 const page=await review.browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 async function difference(a,b){return page.evaluate(async data=>{
  const arrays=[];for(const bytes of data){const image=new Image();image.src='data:image/png;base64,'+bytes;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);arrays.push(ctx.getImageData(0,0,c.width,c.height).data);}
  let changed=0,max=0;for(let i=0;i<arrays[0].length;i++){const delta=Math.abs(arrays[0][i]-arrays[1][i]);if(delta)changed++;max=Math.max(max,delta);}return {changed,max};
 },[a.toString('base64'),b.toString('base64')]);}
 // Compare the new decal exactly without unrelated scene shadows or MSAA
 // edges. Keep whole-canvas image differences as contextual diagnostics.
 async function scorchRaster(){return page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),s=window.siteDestructionStudy,r=s.renderer,size=128,oldColor=new T.Color();r.getClearColor(oldColor);const oldAlpha=r.getClearAlpha(),time=s.diagnostics().time;
  const target=new T.WebGLRenderTarget(size,size),camera=new T.OrthographicCamera(-4.5,4.5,4.5,-4.5,.1,20);camera.position.set(0,10,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);
  const pixels=new Uint8Array(size*size*4);try{r.setClearColor(0,0);r.setRenderTarget(target);r.setViewport(0,0,size,size);r.setScissorTest(false);r.render(s.scorch.root,camera);r.readRenderTargetPixels(target,0,0,size,size,pixels);}finally{r.setRenderTarget(null);r.setClearColor(oldColor,oldAlpha);target.dispose();s.at(time);}return [...pixels];
 });}
 await page.goto(origin+'/tactics/strategic-sites-study.html?mode=pair&frame=ground&view=three&ruler=0');await page.waitForFunction(()=>window.sitesStudy?.ready,null,{timeout:120000});
 for(const site of ['radio','radar','sam']){
  await page.evaluate(id=>window.sitesStudy.select(id),site);let d=await page.evaluate(()=>window.sitesStudy.diagnostics());assert.deepEqual(d.scorch.map(s=>s.amount),[0,1]);
  for(const view of ['three','top','side']){await page.evaluate(v=>window.sitesStudy.view(v),view);await page.screenshot({path:path.join(out,site+'-pair-'+view+'.png')});}
  await page.evaluate(id=>{window.sitesStudy.select(id,'intact');window.sitesStudy.view('top');},site);
  const clean=await page.locator('canvas').screenshot();await page.uncheck('#scorch');const cleanToggle=await difference(clean,await page.locator('canvas').screenshot());console.log(site+' intact toggle '+JSON.stringify(cleanToggle));assert(cleanToggle.max<=1,'Intact site changed when toggling scorch: '+JSON.stringify(cleanToggle));records.push({site,cleanToggle});
  await page.evaluate(id=>window.sitesStudy.select(id,'destroyed'),site);const bare=await page.locator('canvas').screenshot();await page.check('#scorch');assert(!bare.equals(await page.locator('canvas').screenshot()),'Destroyed ground has no visible burn marks');
  const clip=await page.evaluate(async()=>{
   const T=await import('./vendor/three.module.js'),s=window.sitesStudy,fx=s.scorches[0],r=s.renderer,root=fx.root,old=root.position.clone(),oldQ=root.quaternion.clone(),size=192;
   const target=new T.WebGLRenderTarget(size,size),camera=new T.OrthographicCamera(-6,6,6,-6,.1,40),clear=new T.Color();r.getClearColor(clear);const alpha=r.getClearAlpha();
   root.position.set(9,2,-6);root.rotation.y=.73;camera.position.set(9,20,-6);camera.up.set(0,0,-1);camera.lookAt(9,2,-6);camera.updateMatrixWorld(true);root.updateMatrixWorld(true);
   let visible=0,spill=0;try{
    r.setClearColor(0,0);r.setRenderTarget(target);r.setViewport(0,0,size,size);r.setScissorTest(false);r.render(root,camera);const pixels=new Uint8Array(size*size*4);r.readRenderTargetPixels(target,0,0,size,size,pixels);
    const inv=root.matrixWorld.clone().invert();for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(pixels[(y*size+x)*4+3]<4)continue;visible++;const p=new T.Vector3((x+.5)/size*2-1,(y+.5)/size*2-1,0).unproject(camera);p.y=2.243;p.applyMatrix4(inv);if(Math.abs(p.x)>4.01||Math.abs(p.z)>4.01)spill++;}
   }finally{root.position.copy(old);root.quaternion.copy(oldQ);r.setRenderTarget(null);r.setClearColor(clear,alpha);target.dispose();s.view('top');}return {visible,spill};
  });assert(clip.visible>500);assert.equal(clip.spill,0,'Soot escapes rotated/transformed slab');records.push({site,clip});
 }
 await page.goto(origin+'/tactics/strategic-destruction-study.html?effects=1&mode=motion&view=three');await page.waitForFunction(()=>window.siteDestructionStudy?.ready,null,{timeout:120000});
 for(const site of ['radio','radar','sam']){
  await page.evaluate(id=>{window.siteDestructionStudy.select(id);window.siteDestructionStudy.view('three');},site);
  for(const time of [0,.6,1.2,2.4,7.6]){await page.evaluate(t=>window.siteDestructionStudy.at(t),time);const d=await page.evaluate(()=>window.siteDestructionStudy.diagnostics());assert.equal(d.scorch.visible,time>.5);if(time===7.6){assert.equal(d.scorch.amount,1);assert.equal(d.effects.smoke,0);}records.push({site,time,scorch:d.scorch});await page.screenshot({path:path.join(out,site+'-motion-'+time+'.png')});}
  const paintBefore=await scorchRaster(),after=await page.locator('canvas').screenshot();assert(paintBefore.filter((n,i)=>i%4===3&&n>4).length>500,'Isolated scorch capture is blank');await page.evaluate(()=>{window.siteDestructionStudy.at(0);window.siteDestructionStudy.at(7.6);});const reversed=await page.locator('canvas').screenshot();fs.writeFileSync(path.join(out,site+'-reverse-before.png'),after);fs.writeFileSync(path.join(out,site+'-reverse-after.png'),reversed);const diff=await difference(after,reversed);records.push({site,reverse:diff});console.log(site+' reverse '+JSON.stringify(diff));assert.deepEqual(await scorchRaster(),paintBefore,'Scorch changes on reverse seek');records.push({site,exactScorchReset:true});
  await page.uncheck('#effects');assert.equal((await page.evaluate(()=>window.siteDestructionStudy.diagnostics())).scorch.amount,1,'Smoke toggle clears persistent scorch');
  for(const view of ['three','top']){await page.evaluate(v=>window.siteDestructionStudy.view(v),view);await page.screenshot({path:path.join(out,site+'-wreck-'+view+'.png')});}await page.check('#effects');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({errors,records},null,2));console.log('Scorched sites: all three static/animated views, stable reset, persistent aftermath and transformed slab clipping pass.');
}finally{await review.closeReview();}
