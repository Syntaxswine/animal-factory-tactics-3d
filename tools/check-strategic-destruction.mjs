import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const {chromium}=await import(pathToFileURL(path.join(process.env.PLAYWRIGHT_PATH,'index.mjs')));
const out=path.resolve(import.meta.dirname,'../artifacts/strategic-sites/destruction');fs.mkdirSync(out,{recursive:true});
const review=await launchSiteReview(chromium,'destruction-check'),errors=[],records=[];
try{
 const page=await review.browser.newPage({viewport:{width:1500,height:1150},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto((process.env.SITE_ORIGIN||'http://127.0.0.1:4475')+'/tactics/strategic-destruction-study.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.siteDestructionStudy?.ready,{},{timeout:120000});
 for(const site of ['radio','radar','sam']){
  await page.evaluate(id=>window.siteDestructionStudy.select(id),site);
  for(const view of ['three','side','top']){
   await page.evaluate(v=>{window.siteDestructionStudy.view(v);window.siteDestructionStudy.board();},view);
   await page.screenshot({path:path.join(out,site+'-board-'+view+'.png')});
  }
  await page.evaluate(()=>window.siteDestructionStudy.view('three'));
  for(const t of [0,.65,.9,1.2,1.55,1.9,2.3,3.9,7.6]){
   const d=await page.evaluate(t=>window.siteDestructionStudy.at(t),t);assert(d.fragments.every(c=>c.landedBeforeFade));records.push(d);
   await page.screenshot({path:path.join(out,site+'-'+t.toFixed(2)+'.png')});
  }
  const a=await page.evaluate(()=>window.siteDestructionStudy.at(1.23));await page.evaluate(()=>window.siteDestructionStudy.at(6));const b=await page.evaluate(()=>window.siteDestructionStudy.at(1.23));assert.deepEqual(a,b,'Reverse scrub is not deterministic');
  // Render each major component in isolation immediately either side of the
  // settled-topology handoff. A position/opacity test misses missing surfaces.
  const silhouettes=await page.evaluate(async()=>{
   const T=await import('./vendor/three.module.js'),s=window.siteDestructionStudy,results=[],size=256;
   const target=new T.WebGLRenderTarget(size,size),material=new T.MeshBasicMaterial({color:0x000000,side:T.DoubleSide});
   const camera=new T.OrthographicCamera(),oldBackground=s.scene.background,oldOverride=s.scene.overrideMaterial;
   const visibility=new Map();s.scene.traverse(o=>visibility.set(o,o.visible));
   try{
    s.scene.background=new T.Color(0xffffff);s.scene.overrideMaterial=material;
    for(const p of s.diagnostics().parts.filter(p=>!p.name.startsWith('Persistent'))){
     s.at(p.impact+.16);const rig=s.scene.getObjectByName('collapse'),part=rig.getObjectByName(p.name),bounds=new T.Box3().setFromObject(part,true),center=bounds.getCenter(new T.Vector3()),extent=Math.max(...bounds.getSize(new T.Vector3()).toArray())*1.1;
     const root=rig.parent;camera.left=camera.bottom=-extent/2;camera.right=camera.top=extent/2;camera.near=.1;camera.far=100;camera.position.copy(center).add(new T.Vector3(1.3,.8,1.5).normalize().multiplyScalar(20));camera.lookAt(center);camera.updateProjectionMatrix();
     const samples=[];
     for(const epsilon of [-.000001,.000001]){
      s.at(p.impact+.16+epsilon);for(const child of s.scene.children)child.visible=child===root;for(const child of rig.children)child.visible=child===part;
      s.renderer.setScissorTest(false);s.renderer.setRenderTarget(target);s.renderer.setViewport(0,0,size,size);s.renderer.render(s.scene,camera);
      const pixels=new Uint8Array(size*size*4);s.renderer.readRenderTargetPixels(target,0,0,size,size,pixels);samples.push(pixels);s.renderer.setRenderTarget(null);
     }
     let changed=0;for(let i=0;i<samples[0].length;i+=4)if((samples[0][i]<128)!==(samples[1][i]<128))changed++;
     results.push({part:p.name,changedPixels:changed});
    }
   }finally{for(const [o,v]of visibility)o.visible=v;s.scene.background=oldBackground;s.scene.overrideMaterial=oldOverride;s.renderer.setRenderTarget(null);target.dispose();material.dispose();s.at(0);}
   return results;
  });
  for(const s of silhouettes)assert(s.changedPixels<=12,site+' '+s.part+' final shape pops: '+s.changedPixels+' pixels');records.push({site,silhouettes});
  await page.check('#effects');
  for(const view of ['three','side','top']){
   await page.evaluate(v=>window.siteDestructionStudy.view(v),view);
   for(const time of [0,.65,1.2,2.4,4,7.6]){
    await page.evaluate(t=>window.siteDestructionStudy.at(t),time);const d=await page.evaluate(()=>window.siteDestructionStudy.diagnostics());
    if(time===0||time===7.6)assert.equal(d.effects.bursts+d.effects.smoke+d.effects.flames+d.effects.embers,0,'Effects obscure endpoint');
    if(time===2.4)assert(d.effects.smoke>=24,'Missing thick smoke');
    records.push({site,view,time,effects:d.effects});await page.screenshot({path:path.join(out,site+'-effects-'+view+'-'+time.toFixed(2)+'.png')});
   }
  }
  await page.evaluate(()=>{window.siteDestructionStudy.view('three');window.siteDestructionStudy.board();});await page.screenshot({path:path.join(out,site+'-effects-board.png')});
  await page.uncheck('#effects');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({errors,records},null,2));
 console.log('All three sites pass exposed/effects views,12 isolated geometry handoffs, endpoint visibility and reverse scrub; no browser errors.');
}finally{await review.closeReview();}
