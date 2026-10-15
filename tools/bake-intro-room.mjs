// Bake the overseas handler for the intro's shot 02 (ambush.js): Codex's radio
// room from the 3D study (intro-radio-room.js: the game's hen with headphones,
// her desk, transceiver and desk microphone) inside the modelled room of
// room-set.js (plaster corner, map, equipment rack, swing-arm lamp, mug and
// pad), posed and lit by ambush.js (ROOM_CAMERA, ROOM_LIGHT, ROOM_MIC,
// henPoseAt: her turn toward the microphone, her lean, the wing on the desk,
// the beak with her line). Every frame is one render of the whole room, inked
// and split-toned together, so the room and the hen share one treatment.
//
// Only her head moves, so the bake stores one full-frame plate and, per frame,
// the rectangle that differs from it anywhere in the shot (found by rendering
// every frame twice: once to measure, once to keep). The rectangle's outer
// FEATHER px fade out, over pixels the plate already has, so no seam shows.
//
//   node tools/bake-intro-room.mjs [--times 6.5,7] [--study http://127.0.0.1:4496]
//
// The room lives in the 3D study on the helicopter authoring branch (see
// bake-intro-heli-lens.mjs); this checkout's intro-sprites are served from disk.
// Writes dist/tactics/intro-sprites/room-02/{plate.webp,sheet-N.webp,sequence.json}.
import {createRequire} from 'node:module';
import {writeFile,mkdir,rm,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {extname} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const args=process.argv.slice(2),opt=(k,d)=>{const i=args.indexOf('--'+k);return i<0?d:args[i+1];};
const study=opt('study','http://127.0.0.1:4496'),only=opt('times',null)&&opt('times').split(',').map(Number);
const sprites=fileURLToPath(new URL('../dist/tactics/intro-sprites/',import.meta.url)),out=sprites+'room-02/';
const FPS=20,SHEET=2048,MARGIN=16,FEATHER=12,TYPES={'.js':'text/javascript','.json':'application/json','.html':'text/html','.webp':'image/webp','.png':'image/png'};
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>console.error('page:',e.message));
await page.route('**/tactics/intro-sprites/**',async route=>{const rel=decodeURIComponent(new URL(route.request().url()).pathname.split('/tactics/intro-sprites/')[1]);
 try{await route.fulfill({body:await readFile(sprites+rel),contentType:TYPES[extname(rel)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:'missing '+rel});}});
await page.goto(study+'/tactics/intro-study.html?time=0',{waitUntil:'load'});
await page.waitForFunction(()=>window.introReady===true,null,{timeout:60000});
const setup=await page.evaluate(async({FPS,only})=>{
 const T=await import('./vendor/three.module.js'),A=await import('./intro-sprites/ambush.js'),R=await import('./intro-sprites/room-set.js'),
  {inkSprite,renderPasses}=await import('./intro-sprites/ink.js'),{splitToneCanvas,SPLIT_AIRCRAFT}=await import('./intro-sprites/grade.js');
 const shot=A.shotById('02'),{renderer,room}=window.introStudy,W=1600,H=900,L=A.ROOM_LIGHT,C=A.ROOM_CAMERA;
 // The room in a scene of our own: the study's hen, desk, set and microphone
 // (without its flat backdrop and floor), our walls and props, our light.
 const scene=new T.Scene(),hemi=new T.HemisphereLight(L.hemi[0],L.hemi[1],L.hemi[2]),key=new T.DirectionalLight(L.key[0],L.key[1]);
 key.position.set(...L.key[2]);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:20});key.shadow.bias=-.0004;key.shadow.normalBias=.02;
 scene.add(hemi,key,key.target);
 const parent=room.root.parent;scene.add(room.root);
 const hidden=['Plaster backdrop','Radio room floor'].map(n=>room.root.getObjectByName(n)).filter(Boolean);for(const o of hidden)o.visible=false;
 const atlas=room.root.getObjectByName('Radio desk').material.map,set=R.buildRoomSet(T,atlas,R.ROOM_SET);scene.add(set.root);
 R.restageMic(T,room.root,A.ROOM_MIC);const rig=R.rigBeak(T,room.hen);
 const lamp=new T.SpotLight(L.lamp[0],L.lamp[1],6,L.lamp[2],.6,1);lamp.position.set(...set.lamp.position);lamp.target.position.set(...set.lamp.target);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);lamp.shadow.bias=-.0005;scene.add(lamp,lamp.target);
 const cam=new T.PerspectiveCamera(C.fov,W/H,.05,50);cam.position.set(...C.pos);cam.lookAt(new T.Vector3(...C.target));cam.updateMatrixWorld(true);cam.updateProjectionMatrix();
 let times=[];if(only)times=only;else for(let t=shot.from-1/FPS;t<=shot.to+1/FPS+1e-9;t+=1/FPS)times.push(+t.toFixed(4));
 const px=v=>{const q=v.clone().project(cam);return [(q.x+1)/2*W,(1-q.y)/2*H];};
 const mic=room.root.getObjectByName('Microphone grille');scene.updateMatrixWorld(true);const micPx=px(new T.Vector3().setFromMatrixPosition(mic.matrixWorld));
 // One frame: pose, render, ink, split-tone, flatten onto an opaque canvas.
 function frame(t){
  R.poseHen(room.hen,rig,A.henPoseAt(t));scene.updateMatrixWorld(true);
  const size=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();
  renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.setClearColor(0x000000,0);
  const passes=renderPasses(T,renderer,scene,cam,W,H,{skinned:true}),inked=inkSprite(passes.color,passes.normal,passes.depth,{near:passes.near,far:passes.far});
  splitToneCanvas(inked.canvas,SPLIT_AIRCRAFT);
  renderer.setClearColor(clear,alpha);renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#2b2620';g.fillRect(0,0,W,H);g.drawImage(inked.canvas,-inked.pad,-inked.pad);
  return c;
 }
 const plate=frame(times[0]),P=plate.getContext('2d',{willReadFrequently:true}).getImageData(0,0,W,H).data;
 window.__room={T,renderer,scene,room,set,rig,parent,hidden,frame,plate,P,W,H,box:[W,H,-1,-1]};
 return {times,W,H,micPx,spec:{camera:C,light:L,mic:A.ROOM_MIC,pose:A.HEN_POSE,speech:A.LINE_SPEECH,set:R.ROOM_SET},split:rig.split};
},{FPS,only});
console.log('beak split',setup.split,'frames',setup.times.length);
// Pass 1: where does any frame differ from the plate?
for(const t of setup.times){
 const r=await page.evaluate(({t})=>{const B=window.__room,c=B.frame(t),D=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,B.W,B.H).data,P=B.P,W=B.W,H=B.H,b=B.box;let n=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=(y*W+x)*4;if(Math.abs(D[o]-P[o])>3||Math.abs(D[o+1]-P[o+1])>3||Math.abs(D[o+2]-P[o+2])>3){n++;if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y;}}
  return {n,box:[...b]};},{t});
 if(Math.round((t-setup.times[0])*FPS)%20===0)console.log('t',t.toFixed(2),'changed px',r.n,'box so far',r.box.join(','));
}
// Pass 2: keep each frame's rectangle, feathered at its edge.
const rect=await page.evaluate(({MARGIN,SHEET})=>{const B=window.__room,b=B.box;if(b[2]<0)return null;
 const x0=Math.max(0,b[0]-MARGIN),y0=Math.max(0,b[1]-MARGIN),x1=Math.min(B.W-1,b[2]+MARGIN),y1=Math.min(B.H-1,b[3]+MARGIN);
 const sheets=[],used=[];let c=null,x=0,y=0,row=0;const fresh=()=>{c=document.createElement('canvas');c.width=c.height=SHEET;sheets.push(c);used.push([0,0]);x=0;y=0;row=0;};
 // (sheets are trimmed to what they hold: a decoded sheet costs its whole area)
 B.packer={sheets,trimmed:()=>sheets.map((s,i)=>{const [w,h]=used[i],k=document.createElement('canvas');k.width=w;k.height=h;k.getContext('2d').drawImage(s,0,0);return k;}),
  place(img,w,h){if(!c)fresh();if(x+w>SHEET){x=0;y+=row;row=0;}if(y+h>SHEET)fresh();const at=[sheets.length-1,x,y];c.getContext('2d').drawImage(img,0,0,w,h,x,y,w,h);const u=used.at(-1);u[0]=Math.max(u[0],x+w);u[1]=Math.max(u[1],y+h);x+=w+2;row=Math.max(row,h+2);return at;}};
 B.rect=[x0,y0,x1-x0+1,y1-y0+1];B.frames=[];return B.rect;},{MARGIN,SHEET});
if(!rect)throw Error('No frame differs from the plate: nothing moves');
for(const t of setup.times){
 await page.evaluate(({t,FEATHER})=>{const B=window.__room,[x0,y0,w,h]=B.rect,c=B.frame(t),k=document.createElement('canvas');k.width=w;k.height=h;const g=k.getContext('2d',{willReadFrequently:true});g.drawImage(c,x0,y0,w,h,0,0,w,h);
  const img=g.getImageData(0,0,w,h),d=img.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const e=Math.min(x,y,w-1-x,h-1-y);if(e<FEATHER)d[(y*w+x)*4+3]=Math.round(255*(e+.5)/FEATHER);}
  g.putImageData(img,0,0);B.frames.push({t,sprite:[...B.packer.place(k,w,h),w,h]});},{t,FEATHER});
}
const result=await page.evaluate(()=>{const B=window.__room;
 // Put the study's room back as it was found.
 for(const o of B.hidden)o.visible=true;B.set.dispose();B.rig.dispose();B.parent?.add(B.room.root);
 return {frames:B.frames,plate:B.plate.toDataURL('image/webp',.92).split(',')[1],sheets:B.packer.trimmed().map(c=>c.toDataURL('image/webp',.92).split(',')[1])};});
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
let bytes=0;const save=async(name,b)=>{const buf=Buffer.from(b,'base64');bytes+=buf.length;await writeFile(out+name,buf);};
await save('plate.webp',result.plate);for(const [i,b]of result.sheets.entries())await save(`sheet-${i}.webp`,b);
await writeFile(out+'sequence.json',JSON.stringify({version:2,shot:'02',fps:only?null:FPS,times:only||undefined,from:setup.times[0],to:setup.times.at(-1),size:[setup.W,setup.H],
 plate:'plate.webp',rect,feather:FEATHER,micPx:setup.micPx,spec:setup.spec,
 note:'the plate is the whole frame at `from`; each frame is the plate with its sprite (sheet, x, y, w, h) drawn at rect[0], rect[1]; the sprite\'s outer `feather` px fade to the plate',
 sheets:result.sheets.map((_,i)=>`sheet-${i}.webp`),frames:result.frames})+'\n');
console.log('rect',rect.join(','),'frames',result.frames.length,'sheets',result.sheets.length,'bytes',bytes);
await browser.close();
