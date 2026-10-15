import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {launchSiteReview} from '../../../tools/site-review-browser.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const helper='independent-ground-projection-'+Date.now(),owner=await launchSiteReview(chromium,helper,'biome-ground-sprites'),report={helper,errors:[]};
try{
 const page=await owner.browser.newPage({viewport:{width:1500,height:1080}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
 await page.goto('http://127.0.0.1:4476/tactics/biome-terrain-study.html?frame=ground');
 await page.waitForFunction(()=>window.biomeTerrainReady,null,{timeout:60000});
 report.projection=await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{createGroundSpriteSkin}=await import('./biome-ground-sprites.js');
  const plan={width:64,depth:64,blockedAt:(x,z)=>x>=0&&z>=0&&x<64&&z<64&&x!==29&&z!==35,heightAt:(x,z)=>x<0||z<0||x>=64||z>=64?null:z>=48?2.12:0};
  const renderer=new T.WebGLRenderer({antialias:false}),target=new T.WebGLRenderTarget(1024,1024,{depthBuffer:false});renderer.setSize(1024,1024);renderer.outputColorSpace=T.SRGBColorSpace;
  const camera=new T.OrthographicCamera(-32,32,32,-32,.1,100),scene=new T.Scene(),root=new T.Group();scene.add(root);camera.up.set(0,0,-1);camera.position.set(31.5,50,31.5);camera.lookAt(31.5,0,31.5);
  const result=[],owned=[];
  const render=()=>{renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(1024*1024*4);renderer.readRenderTargetPixels(target,0,0,1024,1024,pixels);return pixels};
  const difference=(a,b)=>{let changed=0,max=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]){changed++;max=Math.max(max,Math.abs(a[i]-b[i]));}return{changedChannels:changed,maxChannelDelta:max}};
  const make=(x,z,w,d,material)=>{const g=new T.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);g.translate(x+w/2-.5,0,z+d/2-.5);owned.push(g);const m=new T.Mesh(g,material);root.add(m);return m;};
  try{
   for(const family of ['temperate','jungle','snow','dry','wetlands']){
    const skin=createGroundSpriteSkin(plan,family),material=new T.MeshBasicMaterial({color:0x788069});skin.attach(material);
    const counts=skin.textures.map(t=>({name:t.name,count:0}));skin.textures.forEach((t,i)=>t.addEventListener('dispose',()=>counts[i].count++));
    try{
     const mono=make(0,0,64,64,material);skin.setEnabled(false);const before=render();skin.setEnabled(true);const after=render();let paintedPixels=0,clearChanged=0;
     for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){const i=(y*1024+x)*4;if(after[i]===before[i]&&after[i+1]===before[i+1]&&after[i+2]===before[i+2])continue;paintedPixels++;const tx=Math.floor(x/16),tz=63-Math.floor(y/16);if(!plan.blockedAt(tx,tz))clearChanged++;}
     mono.visible=false;const splits=[];for(let z=0;z<64;z+=24)for(let x=0;x<64;x+=24)splits.push(make(x,z,Math.min(24,64-x),Math.min(24,64-z),material));
     const split=render();root.position.set(11,3,-17);camera.position.add(root.position);camera.lookAt(new T.Vector3(31.5,0,31.5).add(root.position));const moved=render();
     root.position.set(0,0,0);camera.position.set(31.5,50,31.5);camera.lookAt(31.5,0,31.5);root.clear();
     skin.dispose();skin.dispose();result.push({family,paintedPixels,clearChanged,seam:difference(after,split),translated:difference(split,moved),disposed:counts});
    }finally{skin.dispose();material.dispose();}
   }
  }finally{owned.forEach(g=>g.dispose());target.dispose();renderer.dispose();}
  return result;
 });
 for(const r of report.projection){assert(r.paintedPixels>1000);assert.equal(r.clearChanged,0);assert.equal(r.seam.changedChannels,0);assert(r.translated.maxChannelDelta<=1);assert(r.disposed.every(t=>t.count===1))}
 report.timing=await page.evaluate(()=>{
  const S=biomeTerrainStudy,result=[];
  for(const biome of ['temperate','snow','wetlands']){
   S.set({biome,frame:'ground',view:'three',paint:true});
   for(const enabled of [false,true]){
    S.set({paint:enabled});for(let i=0;i<6;i++){S.render();S.renderer.getContext().finish();}
    const samples=[];for(let i=0;i<20;i++){const start=performance.now();S.render();S.renderer.getContext().finish();samples.push(performance.now()-start)}samples.sort((a,b)=>a-b);
    result.push({biome,paint:enabled,medianMs:samples[10],p95Ms:samples[19],triangles:S.renderer.info.render.triangles});
   }
  }
  return result;
 });
 await page.evaluate(()=>biomeTerrainStudy.dispose());assert.deepEqual(report.errors,[]);
}finally{await owner.closeReview();fs.writeFileSync(path.join(import.meta.dirname,'projection.json'),JSON.stringify(report,null,2))}
console.log(JSON.stringify(report));
