import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4428/tactics/animal-motion.html?paused&animal=hen');
 await page.waitForFunction(()=>window.animalMotionReady);
 await page.locator('#close').check();
 const results=[];
 for(const view of ['front','side','back']){
  await page.locator('#view').selectOption(view);
  results.push(...await page.evaluate(async view=>{
   const T=await import('./vendor/three.module.js'),{worker,renderer,scene,camera}=animalMotion;
   // Default MeshBasicMaterial retains Three's real GPU skinning path. Color
   // only the uppermost closed scaly ends, with all occluding feathers intact.
   const cap=new T.MeshBasicMaterial({color:0x000000,toneMapped:false});
   cap.onBeforeCompile=s=>{
    s.vertexShader='varying float capHeight;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncapHeight=position.y;');
    s.fragmentShader='varying float capHeight;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=capHeight>.31?vec3(1.,0.,1.):vec3(0.);');
   };
   const black=new T.MeshBasicMaterial({color:0x000000,toneMapped:false});
   const saved=worker.parts.map(mesh=>({mesh,material:mesh.material,visible:mesh.visible}));
   for(const {mesh}of saved)mesh.material=mesh.name.includes('toes')?cap:black;
   const target=new T.WebGLRenderTarget(1100,650),pixels=new Uint8Array(1100*650*4),out=[];
   const old=renderer.getRenderTarget();
   try{
    for(const [time,positiveControl]of [...[.25,.75,2.75,4.4,6.5,8.8,11].map(t=>[t,false]),[6.5,true]]){
     animalMotion.seek(time);for(const {mesh}of saved){mesh.material=mesh.name.includes('toes')?cap:black;if(positiveControl&&!mesh.name.includes('toes'))mesh.visible=false;}renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,1100,650,pixels);
     let exposed=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>240&&pixels[i+1]<10&&pixels[i+2]>240)exposed++;
     out.push({view,time,positiveControl,exposedCapPixels:exposed});for(const {mesh,visible}of saved)mesh.visible=visible;renderer.setRenderTarget(old);
    }
   }finally{renderer.setRenderTarget(old);for(const {mesh,material,visible}of saved){mesh.material=material;mesh.visible=visible;}cap.dispose();black.dispose();target.dispose();animalMotion.render();}
   return out;
  },view));
 }
 console.log(JSON.stringify(results));
 assert.deepEqual(errors,[]);for(const r of results){if(r.positiveControl)assert.ok(r.exposedCapPixels>10,'Probe failed to reveal unobscured caps: '+JSON.stringify(r));else assert.equal(r.exposedCapPixels,0,JSON.stringify(r));}
 const path=new URL('../docs/tactics/hybrid-review/animal-motion/hen-rendered-caps.json',import.meta.url);
 fs.writeFileSync(path,JSON.stringify({browser:browser.version(),capturedAt:new Date().toISOString(),errors,results},null,2)+'\n');
 console.log('21 rendered hen poses: no exposed upper-leg caps; three positive controls detect them.');
}finally{await browser.close();}
