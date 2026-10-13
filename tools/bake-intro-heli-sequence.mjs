// Bake the helicopter's frames for the animated intro proof from the intro rig.
//
//   node tools/bake-intro-heli-sequence.mjs [baseUrl]
//
// The 3D study supplies everything the airframe does (damaged tail, skid
// compression, rotor strike and fragment, door and bench); trajectory.js
// supplies the art-directed pitch. Each frame is photographed through the game
// camera on a transparent background, cropped, and packed into WebP atlas
// sheets with a matching ground-shadow sheet. Writes
// dist/tactics/intro-sprites/heli-seq/{sheet-N.webp,shadow-N.webp,sequence.json}.
// Needs a server on dist/ (default http://127.0.0.1:4496).
import {createRequire} from 'node:module';
import {writeFile,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const base=process.argv[2]||'http://127.0.0.1:4496';
const out=fileURLToPath(new URL('../dist/tactics/intro-sprites/heli-seq/',import.meta.url));
const W_TILE=52,PPU=W_TILE/Math.SQRT2,FPS=20,FROM=20.2,TO=31.8,SHEET=2048;
const times=[];for(let i=0;FROM+i/FPS<=TO+1e-9;i++)times.push(+(FROM+i/FPS).toFixed(4));
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>console.error('page:',e.message));
await page.goto(base+'/tactics/intro-study.html?time=0',{waitUntil:'load'});
await page.waitForFunction(()=>window.introReady===true,null,{timeout:60000});
await page.evaluate(async({PPU,SHEET})=>{
 const T=await import('./vendor/three.module.js'),{aircraftState}=await import('./intro-timeline.js'),{landingSupportHeight}=await import('./intro-ground-contact.js'),{artPitch}=await import('./intro-sprites/trajectory.js');
 const {renderer,scene,helicopter}=window.introStudy,root=helicopter.root,rotor=helicopter.rotor;
 const W=900,H=640,el=Math.PI/6,cam=new T.OrthographicCamera(-W/2/PPU,W/2/PPU,H/2/PPU,-H/2/PPU,.1,400);
 const target=new T.Vector3(0,1.2,0);cam.position.copy(target).addScaledVector(new T.Vector3(Math.cos(el)/Math.SQRT2,Math.sin(el),Math.cos(el)/Math.SQRT2),150);cam.up.set(-Math.sin(el)/Math.SQRT2,Math.cos(el),-Math.sin(el)/Math.SQRT2);cam.lookAt(target);cam.updateMatrixWorld(true);
 const px=v=>{const q=v.clone().project(cam);return [(q.x+1)/2*W,(1-q.y)/2*H];};
 const sun=new T.Vector3(12,35,20).normalize(),flat=new T.Matrix4().set(1,-sun.x/sun.y,0,0, 0,0,0,0, 0,-sun.z/sun.y,1,0, 0,0,0,1),black=new T.MeshBasicMaterial({color:0x000000,side:T.DoubleSide});
 const grab=document.createElement('canvas');grab.width=W;grab.height=H;const gctx=grab.getContext('2d',{willReadFrequently:true});
 const packer=()=>{const sheets=[];let c=null,x=0,y=0,row=0;const fresh=()=>{c=document.createElement('canvas');c.width=c.height=SHEET;sheets.push(c);x=0;y=0;row=0;};
  return {sheets,place(img,w,h){if(!c)fresh();if(x+w>SHEET){x=0;y+=row;row=0;}if(y+h>SHEET)fresh();const at=[sheets.length-1,x,y];c.getContext('2d').drawImage(img,0,0,w,h,x,y,w,h);x+=w+2;row=Math.max(row,h+2);return at;}};};
 window.__bake={T,aircraftState,landingSupportHeight,artPitch,renderer,scene,root,rotor,helicopter,cam,px,flat,black,grab,gctx,W,H,sprites:packer(),shadows:packer(),frames:[]};
},{PPU,SHEET});
for(const t of times){
 const r=await page.evaluate(({t})=>{
  const B=window.__bake,{T,root,rotor,helicopter,scene,renderer,cam,px,W,H,gctx,grab}=B;
  helicopter.update(t);
  const s=B.aircraftState(t),pitch=B.artPitch(t),roll=s.roll,yaw=s.yaw,support=B.landingSupportHeight(s.compression,roll,yaw,pitch);
  root.position.set(0,support,0);root.rotation.set(roll,yaw,pitch);root.updateMatrixWorld(true);
  const hidden=[];const hide=o=>{if(o&&o.visible){o.visible=false;hidden.push(o);}};
  for(const o of scene.children)if(o!==root&&!o.isLight)hide(o);
  root.traverse(o=>{if(o.geometry?.type==='RingGeometry')hide(o);});hide(helicopter.marks);
  // Fast blades are a painted disc in 2D; the real (slowing, then broken) blades from 27.3 s.
  const disc=t<27.3;if(disc)for(const c of rotor.children)if(c.name!=='Rotor hub')hide(c);
  rotor.updateMatrixWorld(true);
  const lights=[];scene.traverse(o=>{if(o.isLight){lights.push([o,o.color.clone(),o.intensity,o.groundColor?.clone()]);if(o.isHemisphereLight){o.color.set(0xf4f6f0);o.groundColor.set(0x6f7464);o.intensity=1.9;}else if(o.isDirectionalLight){o.color.set(0xfffaf0);o.intensity=2.2;}}});
  const bg=scene.background,fog=scene.fog;scene.background=null;scene.fog=null;
  const size=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();
  renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.setClearColor(0x000000,0);
  const crop=()=>{gctx.clearRect(0,0,W,H);gctx.drawImage(renderer.domElement,0,0);const d=gctx.getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>2){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
   if(x1<0)return null;x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(W-1,x1+1);y1=Math.min(H-1,y1+1);const w=x1-x0+1,h=y1-y0+1,c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(grab,x0,y0,w,h,0,0,w,h);return {c,x0,y0,w,h};};
  renderer.render(scene,cam);const body=crop();
  // Shadow: the visible airframe flattened onto the ground along the study's sun.
  const proxy=new T.Group();root.traverse(o=>{if(o.isMesh&&o.userData?.paint!=='soil'){for(let p=o;p;p=p.parent)if(!p.visible)return;const m=new T.Mesh(o.geometry,B.black);m.matrixAutoUpdate=false;m.matrix.copy(B.flat).multiply(o.matrixWorld);proxy.add(m);}});
  root.visible=false;scene.add(proxy);proxy.updateMatrixWorld(true);renderer.render(scene,cam);const shadow=crop();scene.remove(proxy);root.visible=true;
  for(const [o,c,i,g]of lights){o.color.copy(c);o.intensity=i;if(g)o.groundColor.copy(g);}
  scene.background=bg;scene.fog=fog;for(const o of hidden)o.visible=true;renderer.setClearColor(clear,alpha);renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);
  // Anchor = the model origin on the ground plane (the 2D path puts it at x, y, h).
  const a=px(new T.Vector3(0,0,0)),rel=v=>[+(v.x).toFixed(4),+(v.z).toFixed(4),+(v.y).toFixed(4)]; // world -> tile (x, y, h)
  const q=new T.Quaternion();root.getWorldQuaternion(q);
  const tail=new T.Vector3(-3.35,1.70,.15).applyQuaternion(q).add(root.position),engine=new T.Vector3(-1.25,2.95,0).applyQuaternion(q).add(root.position);
  const hub=new T.Vector3().setFromMatrixPosition(rotor.matrixWorld),rq=new T.Quaternion();rotor.getWorldQuaternion(rq);
  const hubPx=px(hub),u=px(new T.Vector3(1,0,0).applyQuaternion(rq).multiplyScalar(4.78).add(hub)),v=px(new T.Vector3(0,0,1).applyQuaternion(rq).multiplyScalar(4.78).add(hub));
  const tip=root.getObjectByName('Main rotor tip -1'),tipW=tip?new T.Vector3().setFromMatrixPosition(tip.matrixWorld):null;
  const f={t,pitch:+pitch.toFixed(4),roll:+roll.toFixed(4),yaw:+yaw.toFixed(4),support:+support.toFixed(4),compression:+s.compression.toFixed(4),door:+s.door.toFixed(4),disc,tail:rel(tail),engine:rel(engine)};
  if(body){f.sprite=[...B.sprites.place(body.c,body.w,body.h),body.w,body.h];f.anchor=[+(a[0]-body.x0).toFixed(2),+(a[1]-body.y0).toFixed(2)];
   if(disc)f.rotorDisc={hub:[+(hubPx[0]-a[0]).toFixed(2),+(hubPx[1]-a[1]).toFixed(2)],u:[+(u[0]-hubPx[0]).toFixed(2),+(u[1]-hubPx[1]).toFixed(2)],v:[+(v[0]-hubPx[0]).toFixed(2),+(v[1]-hubPx[1]).toFixed(2)]};}
  if(shadow){f.shadow=[...B.shadows.place(shadow.c,shadow.w,shadow.h),shadow.w,shadow.h];f.shadowAnchor=[+(a[0]-shadow.x0).toFixed(2),+(a[1]-shadow.y0).toFixed(2)];}
  if(tipW)f.bladeTip=rel(tipW);
  B.frames.push(f);return {w:body?.w,h:body?.h,sheets:B.sprites.sheets.length};
 },{t});
 if(Math.round((t-FROM)*FPS)%20===0)console.log('t',t.toFixed(2),'crop',r.w+'x'+r.h,'sheets',r.sheets);
}
const result=await page.evaluate(()=>{const B=window.__bake,enc=c=>c.toDataURL('image/webp',.9).split(',')[1];return {frames:B.frames,sprites:B.sprites.sheets.map(enc),shadows:B.shadows.sheets.map(c=>c.toDataURL('image/webp',.8).split(',')[1])};});
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
let bytes=0;
for(const [i,b]of result.sprites.entries()){const buf=Buffer.from(b,'base64');bytes+=buf.length;await writeFile(out+`sheet-${i}.webp`,buf);}
for(const [i,b]of result.shadows.entries()){const buf=Buffer.from(b,'base64');bytes+=buf.length;await writeFile(out+`shadow-${i}.webp`,buf);}
const manifest={version:1,fps:FPS,from:FROM,to:TO,tileWidth:W_TILE,ppu:PPU,sheetSize:SHEET,camera:{azimuth:Math.PI/4,elevation:Math.PI/6},
 note:'sprite = [sheet, x, y, w, h]; anchor = model origin (ground under the skid rails) within the crop; tail/engine/bladeTip = world offsets from that origin as tile [x, y, h]; rotorDisc in sprite px relative to the anchor (hub) and hub (u, v)',
 sheets:result.sprites.map((_,i)=>`sheet-${i}.webp`),shadowSheets:result.shadows.map((_,i)=>`shadow-${i}.webp`),frames:result.frames};
await writeFile(out+'sequence.json',JSON.stringify(manifest)+'\n');
console.log('frames',result.frames.length,'sprite sheets',result.sprites.length,'shadow sheets',result.shadows.length,'bytes',bytes);
await browser.close();
