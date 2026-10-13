// Bake the helicopter's frames for the intro's close-up of the drop past the
// cliff: the same intro rig and art-directed pitch as bake-intro-heli-sequence,
// photographed through the close-up's perspective camera (closeup.js) at the
// full plate size, so each frame lands on the painted plate where the aircraft
// really is. Inked and split-toned like every other aircraft frame.
//
//   node tools/bake-intro-heli-closeup.mjs [baseUrl]
//
// Writes dist/tactics/intro-sprites/heli-closeup/{sheet-N.webp,sequence.json}.
// Needs a server on dist/ (default http://127.0.0.1:4496).
import {createRequire} from 'node:module';
import {writeFile,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const base=process.argv[2]||'http://127.0.0.1:4496';
const out=fileURLToPath(new URL('../dist/tactics/intro-sprites/heli-closeup/',import.meta.url));
const FPS=20,SHEET=2048;
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>console.error('page:',e.message));
await page.goto(base+'/tactics/intro-study.html?time=0',{waitUntil:'load'});
await page.waitForFunction(()=>window.introReady===true,null,{timeout:60000});
const setup=await page.evaluate(async({SHEET,FPS})=>{
 const T=await import('./vendor/three.module.js'),{aircraftState}=await import('./intro-timeline.js'),{landingSupportHeight}=await import('./intro-ground-contact.js'),
  {artPitch,heliPath,CLOSEUP}=await import('./intro-sprites/trajectory.js'),{closeupView,CLOSEUP_CAMERA}=await import('./intro-sprites/closeup.js'),
  {inkSprite,renderPasses}=await import('./intro-sprites/ink.js'),{splitToneCanvas,SPLIT_AIRCRAFT}=await import('./intro-sprites/grade.js');
 const {renderer,scene,helicopter}=window.introStudy,root=helicopter.root,rotor=helicopter.rotor,V=closeupView();
 // The close-up lens in three.js terms: (X, Y, Z) = (x, h, y); vertical field
 // of view from the painter's focal length, so both project identically.
 const cam=new T.PerspectiveCamera(2*Math.atan(V.H/2/V.focal)*180/Math.PI,V.W/V.H,.3,500);
 const packer=()=>{const sheets=[];let c=null,x=0,y=0,row=0;const fresh=()=>{c=document.createElement('canvas');c.width=c.height=SHEET;sheets.push(c);x=0;y=0;row=0;};
  return {sheets,place(img,w,h){if(!c)fresh();if(x+w>SHEET){x=0;y+=row;row=0;}if(y+h>SHEET)fresh();const at=[sheets.length-1,x,y];c.getContext('2d').drawImage(img,0,0,w,h,x,y,w,h);x+=w+2;row=Math.max(row,h+2);return at;}};};
 const times=[];for(let t=CLOSEUP.start-1/FPS;t<=CLOSEUP.end+1/FPS+1e-9;t+=1/FPS)times.push(+t.toFixed(4));
 window.__cu={T,aircraftState,landingSupportHeight,artPitch,heliPath,inkSprite,renderPasses,splitToneCanvas,SPLIT_AIRCRAFT,renderer,scene,root,rotor,helicopter,V,cam,sprites:packer(),frames:[]};
 return {times,W:V.W,H:V.H,camera:CLOSEUP_CAMERA};
},{SHEET,FPS});
for(const t of setup.times){
 const r=await page.evaluate(({t})=>{
  const B=window.__cu,{T,root,rotor,helicopter,scene,renderer,cam,V}=B;
  helicopter.update(t);
  const s=B.aircraftState(t),pitch=B.artPitch(t),roll=s.roll,yaw=s.yaw,support=B.landingSupportHeight(s.compression,roll,yaw,pitch);
  root.position.set(0,support,0);root.rotation.set(roll,yaw,pitch);root.updateMatrixWorld(true);
  const hidden=[];const hide=o=>{if(o&&o.visible){o.visible=false;hidden.push(o);}};
  for(const o of scene.children)if(o!==root&&!o.isLight)hide(o);
  root.traverse(o=>{if(o.geometry?.type==='RingGeometry')hide(o);});hide(helicopter.marks);
  // In flight the blades are the player's painted disc.
  for(const c of rotor.children)if(c.name!=='Rotor hub')hide(c);
  rotor.updateMatrixWorld(true);
  const lights=[];scene.traverse(o=>{if(o.isLight){lights.push([o,o.color.clone(),o.intensity,o.groundColor?.clone()]);if(o.isHemisphereLight){o.color.set(0xf4f6f0);o.groundColor.set(0x6f7464);o.intensity=1.9;}else if(o.isDirectionalLight){o.color.set(0xfffaf0);o.intensity=2.2;}}});
  const bg=scene.background,fog=scene.fog;scene.background=null;scene.fog=null;
  const size=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();
  renderer.setPixelRatio(1);renderer.setSize(V.W,V.H,false);renderer.setClearColor(0x000000,0);
  // The scene's origin is the path point (rail level), so the camera sits at
  // the close-up camera's position relative to it, looking along f.
  const p=B.heliPath(t),C=V.C,f=V.f;
  cam.position.set(C[0]-p.x,C[2]-p.h,C[1]-p.y);cam.up.set(0,1,0);cam.lookAt(cam.position.x+f[0],cam.position.y+f[2],cam.position.z+f[1]);cam.updateMatrixWorld(true);cam.updateProjectionMatrix();
  const passes=B.renderPasses(T,renderer,scene,cam,V.W,V.H),inked=B.inkSprite(passes.color,passes.normal,passes.depth,{near:passes.near,far:passes.far});
  B.splitToneCanvas(inked.canvas,B.SPLIT_AIRCRAFT);
  const src=inked.canvas,SW=src.width,SH=src.height,cg=src.getContext('2d',{willReadFrequently:true}),dd=cg.getImageData(0,0,SW,SH).data;
  let x0=SW,y0=SH,x1=-1,y1=-1;for(let y=0;y<SH;y++)for(let x=0;x<SW;x++)if(dd[(y*SW+x)*4+3]>2){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  const px=v=>{const q=v.clone().project(cam);return [(q.x+1)/2*V.W,(1-q.y)/2*V.H];};
  const hub=new T.Vector3().setFromMatrixPosition(rotor.matrixWorld),rq=new T.Quaternion();rotor.getWorldQuaternion(rq);
  const hubPx=px(hub),u=px(new T.Vector3(1,0,0).applyQuaternion(rq).multiplyScalar(4.78).add(hub)),v=px(new T.Vector3(0,0,1).applyQuaternion(rq).multiplyScalar(4.78).add(hub));
  for(const [o,c,i,g]of lights){o.color.copy(c);o.intensity=i;if(g)o.groundColor.copy(g);}
  scene.background=bg;scene.fog=fog;for(const o of hidden)o.visible=true;renderer.setClearColor(clear,alpha);renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);
  const f0={t,depth:+(-V.cam3(p.x,p.y,p.h+1.2)[2]).toFixed(3),rotorDisc:{hub:hubPx.map(n=>+n.toFixed(2)),u:[+(u[0]-hubPx[0]).toFixed(2),+(u[1]-hubPx[1]).toFixed(2)],v:[+(v[0]-hubPx[0]).toFixed(2),+(v[1]-hubPx[1]).toFixed(2)]}};
  if(x1>=0){x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(SW-1,x1+1);y1=Math.min(SH-1,y1+1);const w=x1-x0+1,h=y1-y0+1,c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(src,x0,y0,w,h,0,0,w,h);
   // The inked canvas is padded by inked.pad: shift back to plate pixels.
   f0.sprite=[...B.sprites.place(c,w,h),w,h];f0.pos=[x0-inked.pad,y0-inked.pad];}
  B.frames.push(f0);return {w:f0.sprite?.[3],h:f0.sprite?.[4],pos:f0.pos};
 },{t});
 if(Math.round((t-setup.times[0])*FPS)%10===0)console.log('t',t.toFixed(2),'crop',r.w+'x'+r.h,'at',r.pos);
}
const result=await page.evaluate(()=>{const B=window.__cu;return {frames:B.frames,sheets:B.sprites.sheets.map(c=>c.toDataURL('image/webp',.9).split(',')[1])};});
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
let bytes=0;for(const [i,b]of result.sheets.entries()){const buf=Buffer.from(b,'base64');bytes+=buf.length;await writeFile(out+`sheet-${i}.webp`,buf);}
await writeFile(out+'sequence.json',JSON.stringify({version:1,fps:FPS,from:setup.times[0],to:setup.times.at(-1),plate:[setup.W,setup.H],camera:setup.camera,
 note:'sprite = [sheet, x, y, w, h]; pos = top-left in close-up plate pixels; rotorDisc.hub in plate pixels, u/v in pixels from the hub; depth = -camera z of the cabin (larger = nearer)',
 sheets:result.sheets.map((_,i)=>`sheet-${i}.webp`),frames:result.frames})+'\n');
console.log('frames',result.frames.length,'sheets',result.sheets.length,'bytes',bytes);
await browser.close();
