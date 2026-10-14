// Bake the overseas handler for the intro's shot 02 (ambush.js): Codex's radio
// room from the 3D study (intro-radio-room.js: the game's hen with headphones,
// her desk, transceiver, dials and desk microphone, her head's idle sway),
// photographed through the shot's camera without the study's flat backdrop and
// floor, which the player replaces with a painted room. Inked and split-toned
// like the aircraft.
//
//   node tools/bake-intro-room.mjs [--times 6.5] [--study http://127.0.0.1:4496]
//
// The room lives in the 3D study on the helicopter authoring branch (see
// bake-intro-heli-lens.mjs); this checkout's intro-sprites are served from disk.
// Writes dist/tactics/intro-sprites/room-02/{sheet-N.webp,sequence.json}.
import {createRequire} from 'node:module';
import {writeFile,mkdir,rm,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {extname} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const args=process.argv.slice(2),opt=(k,d)=>{const i=args.indexOf('--'+k);return i<0?d:args[i+1];};
const study=opt('study','http://127.0.0.1:4496'),only=opt('times',null)&&opt('times').split(',').map(Number);
const sprites=fileURLToPath(new URL('../dist/tactics/intro-sprites/',import.meta.url)),out=sprites+'room-02/';
const FPS=10,SHEET=2048,TYPES={'.js':'text/javascript','.json':'application/json','.html':'text/html','.webp':'image/webp','.png':'image/png'};
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>console.error('page:',e.message));
await page.route('**/tactics/intro-sprites/**',async route=>{const rel=decodeURIComponent(new URL(route.request().url()).pathname.split('/tactics/intro-sprites/')[1]);
 try{await route.fulfill({body:await readFile(sprites+rel),contentType:TYPES[extname(rel)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:'missing '+rel});}});
await page.goto(study+'/tactics/intro-study.html?time=0',{waitUntil:'load'});
await page.waitForFunction(()=>window.introReady===true,null,{timeout:60000});
const setup=await page.evaluate(async({SHEET,FPS,only})=>{
 const T=await import('./vendor/three.module.js'),{shotById,ROOM_CAMERA}=await import('./intro-sprites/ambush.js'),
  {inkSprite,renderPasses}=await import('./intro-sprites/ink.js'),{splitToneCanvas,SPLIT_AIRCRAFT}=await import('./intro-sprites/grade.js');
 const shot=shotById('02'),{renderer,room}=window.introStudy,W=1600,H=900;
 // Render the room alone in a scene of our own, under the bake's neutral light.
 const scene=new T.Scene(),hemi=new T.HemisphereLight(0xf4f6f0,0x6f7464,1.9),sun=new T.DirectionalLight(0xfffaf0,2.2);sun.position.set(...ROOM_CAMERA.key);scene.add(hemi,sun);
 const parent=room.root.parent;scene.add(room.root);
 const hide=['Plaster backdrop','Radio room floor'].map(n=>room.root.getObjectByName(n)).filter(Boolean);for(const o of hide)o.visible=false;
 const cam=new T.PerspectiveCamera(ROOM_CAMERA.fov,W/H,.05,50);cam.position.set(...ROOM_CAMERA.pos);cam.lookAt(new T.Vector3(...ROOM_CAMERA.target));cam.updateMatrixWorld(true);cam.updateProjectionMatrix();
 const packer=()=>{const sheets=[];let c=null,x=0,y=0,row=0;const fresh=()=>{c=document.createElement('canvas');c.width=c.height=SHEET;sheets.push(c);x=0;y=0;row=0;};
  return {sheets,place(img,w,h){if(!c)fresh();if(x+w>SHEET){x=0;y+=row;row=0;}if(y+h>SHEET)fresh();const at=[sheets.length-1,x,y];c.getContext('2d').drawImage(img,0,0,w,h,x,y,w,h);x+=w+2;row=Math.max(row,h+2);return at;}};};
 let times=[];if(only)times=only;else for(let t=shot.from-1/FPS;t<=shot.to+1/FPS+1e-9;t+=1/FPS)times.push(+t.toFixed(4));
 const px=v=>{const q=v.clone().project(cam);return [(q.x+1)/2*W,(1-q.y)/2*H];};
 const mic=room.root.getObjectByName('Microphone grille'),micPx=mic?px(new T.Vector3().setFromMatrixPosition(mic.matrixWorld)):null;
 window.__room={T,renderer,scene,room,cam,W,H,parent,inkSprite,renderPasses,splitToneCanvas,SPLIT_AIRCRAFT,sprites:packer(),frames:[]};
 return {times,W,H,micPx};
},{SHEET,FPS,only});
for(const t of setup.times){
 const r=await page.evaluate(({t})=>{
  const B=window.__room,{T,renderer,scene,room,cam,W,H}=B;room.update(t);scene.updateMatrixWorld(true);
  const size=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();
  renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.setClearColor(0x000000,0);
  const passes=B.renderPasses(T,renderer,scene,cam,W,H),inked=B.inkSprite(passes.color,passes.normal,passes.depth,{near:passes.near,far:passes.far});
  B.splitToneCanvas(inked.canvas,B.SPLIT_AIRCRAFT);
  renderer.setClearColor(clear,alpha);renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);
  const src=inked.canvas,SW=src.width,SH=src.height,dd=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,SW,SH).data;
  let x0=SW,y0=SH,x1=-1,y1=-1;for(let y=0;y<SH;y++)for(let x=0;x<SW;x++)if(dd[(y*SW+x)*4+3]>2){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  const f0={t};
  if(x1>=0){x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(SW-1,x1+1);y1=Math.min(SH-1,y1+1);const w=x1-x0+1,h=y1-y0+1,c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(src,x0,y0,w,h,0,0,w,h);
   f0.sprite=[...B.sprites.place(c,w,h),w,h];f0.pos=[x0-inked.pad,y0-inked.pad];}
  B.frames.push(f0);return {w:f0.sprite?.[3],h:f0.sprite?.[4],pos:f0.pos};
 },{t});
 if(only||Math.round((t-setup.times[0])*FPS)%10===0)console.log('t',t.toFixed(2),'crop',r.w+'x'+r.h,'at',r.pos);
}
const result=await page.evaluate(()=>{const B=window.__room;B.parent?.add(B.room.root);return {frames:B.frames,sheets:B.sprites.sheets.map(c=>c.toDataURL('image/webp',.9).split(',')[1])};});
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
let bytes=0;for(const [i,b]of result.sheets.entries()){const buf=Buffer.from(b,'base64');bytes+=buf.length;await writeFile(out+`sheet-${i}.webp`,buf);}
await writeFile(out+'sequence.json',JSON.stringify({version:1,shot:'02',fps:only?null:FPS,times:only||undefined,from:setup.times[0],to:setup.times.at(-1),size:[setup.W,setup.H],micPx:setup.micPx,
 note:'sprite = [sheet, x, y, w, h]; pos = top-left in frame pixels (1600 x 900); micPx = the desk microphone grille in frame pixels',
 sheets:result.sheets.map((_,i)=>`sheet-${i}.webp`),frames:result.frames})+'\n');
console.log('frames',result.frames.length,'sheets',result.sheets.length,'bytes',bytes);
await browser.close();
