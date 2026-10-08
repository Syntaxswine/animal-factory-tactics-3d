import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH),review=await launchSiteReview(chromium,'grenade-blast-'+Date.now()),out='artifacts/grenade-blast';
fs.mkdirSync(out,{recursive:true});
const report={configurations:0,errors:[],clips:[],scenes:[]};
try{
 const page=await review.browser.newPage({viewport:{width:1360,height:950}});page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(process.env.GRENADE_BLAST_REVIEW_URL||'http://127.0.0.1:4476/tactics/grenade-blast-study.html?paused',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.grenadeBlastReady,{},{timeout:90000});
 for(const scene of ['open','wall','roof','ceiling','overhang','cliff','tower','fog'])for(const view of ['three','top','side'])for(const scale of ['fit','game'])for(const reduced of [false,true]){
  const frames=await page.evaluate(o=>{const a=grenadeBlastStudy;a.set(o);return (o.reduced?[.01,.12,.19]:[-.05,.06,.22,.42,.65,.81]).map(t=>a.seek(t));},{scene,view,scale,reduced});
  assert.equal(frames.at(-1).visible,false);assert.ok(frames.slice(1,-1).every(f=>f.visible&&f.radius===5));report.configurations++;
  if(view==='three'&&scale==='fit'&&!reduced){await page.evaluate(()=>grenadeBlastStudy.seek(.22));await page.screenshot({path:out+'/'+scene+'-burst.png'});report.scenes.push(scene);}
 }
 // Compare real shader pixels with the same scene rendered without the effect.
 // Top-down keeps screen pixels aligned with the horizontal fog/radius envelope.
 for(const scene of ['open','fog','wall']){
  const pixels=await page.evaluate(async scene=>{
   const T=await import('./vendor/three.module.js'),a=grenadeBlastStudy;a.set({scene,view:'top',scale:'fit',reduced:false,guide:false});a.seek(.3);
   const gl=a.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,before=new Uint8Array(w*h*4),after=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,after);
   a.fx.dust.visible=false;a.renderer.render(a.scene,a.camera);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,before);
   const at=(x,y)=>{const v=new T.Vector3(x/w*2-1,y/h*2-1,-1).unproject(a.camera),d=new T.Vector3(0,0,-1).applyQuaternion(a.camera.quaternion);return v.addScaledVector(d,-v.y/d.y);},corner=at(.5,.5),dx=at(1.5,.5).sub(corner),dy=at(.5,1.5).sub(corner);
   let changed=0,outer=0,beyond=0,hidden=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,d=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);if(d<8)continue;changed++;const px=corner.x+x*dx.x+y*dy.x,pz=corner.z+x*dx.z+y*dy.z,r=Math.hypot(px-8,pz-8);if(r>4.2)outer++;if(r>5.15)beyond++;if(scene==='fog'&&px>8.6||scene==='wall'&&px>9.6)hidden++;}
   a.draw();return {scene,changed,outer,beyond,hidden};
  },scene);assert.ok(pixels.changed>1000,JSON.stringify(pixels));assert.equal(pixels.beyond,0,JSON.stringify(pixels));assert.equal(pixels.hidden,0,JSON.stringify(pixels));if(scene==='open')assert.ok(pixels.outer>100,JSON.stringify(pixels));report.clips.push(pixels);
 }
 for(const scene of ['ceiling','overhang']){const ceiling=await page.evaluate(scene=>{
  const a=grenadeBlastStudy;a.set({scene,view:'side',scale:'fit',reduced:false,guide:false});a.seek(.12);
  a.camera.position.set(8,2.12,18);a.camera.lookAt(8,2.12,8);a.camera.updateMatrixWorld(true);a.fx.update(a.fixture.shot,a.fixture.state,a.camera);a.renderer.render(a.scene,a.camera);
  const gl=a.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,before=new Uint8Array(w*h*4),after=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,after);
  a.fx.dust.visible=false;a.renderer.render(a.scene,a.camera);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,before);
  let changed=0,above=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,d=Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]);if(d<8)continue;changed++;const height=2.12+((y+.5)/h*2-1)*a.camera.top,worldX=8+((x+.5)/w*2-1)*a.camera.right;if(height>2.02&&(scene==='ceiling'||worldX>4.55))above++;}
  a.fx.dust.visible=true;a.renderer.render(a.scene,a.camera);return {changed,above,ceiling:a.fx.field.ceiling};
 },scene);assert.ok(ceiling.changed>1000,JSON.stringify(ceiling));assert.equal(ceiling.above,0,JSON.stringify(ceiling));report[scene]=ceiling;await page.screenshot({path:out+'/'+scene+'-side.png'});}
 await page.evaluate(()=>{grenadeBlastStudy.set({scene:'open',view:'three',scale:'game',guide:false});grenadeBlastStudy.seek(.22);});await page.screenshot({path:out+'/gameplay-size.png'});
 const memory=await page.evaluate(()=>{const a=grenadeBlastStudy,base={...a.renderer.info.memory};for(let i=0;i<12;i++){a.set({scene:'wall'});a.seek(.3);a.set({scene:'open'});a.seek(.3);}return {base,after:{...a.renderer.info.memory}};});assert.deepEqual(memory.after,memory.base);report.memory=memory;
 await page.evaluate(()=>{grenadeBlastStudy.dispose();grenadeBlastStudy.dispose();});assert.deepEqual(report.errors,[]);
 fs.writeFileSync(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await review.closeReview();}
