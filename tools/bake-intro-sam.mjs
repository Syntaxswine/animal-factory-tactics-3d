// Bake the SAM launcher's frames for the intro's cutaway (ambush.js shots 05
// and 06): Codex's launcher from the 3D study (intro-launcher.js: the approved
// site slab and cabinets, the turntable, the elevation cradle and the two
// missiles), turned by the study's timeline but raised and fired as ambush.js
// SAM_LAUNCH directs (the storyboard's steep launch), photographed through the
// shot's lens at the full plate size. Inked and split-toned like the aircraft.
// Also records each missile's flight in sector tiles, so the player can lay the
// painted exhaust along it.
//
//   node tools/bake-intro-sam.mjs --shot 05|06 [--times 16.2] [--study http://127.0.0.1:4496]
//
// The launcher lives in the 3D study on the helicopter authoring branch (see
// bake-intro-heli-lens.mjs); this checkout's intro-sprites are served from disk.
// Writes dist/tactics/intro-sprites/sam-<shot>/{sheet-N.webp,sequence.json}.
import {createRequire} from 'node:module';
import {writeFile,mkdir,rm,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {extname} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/Local Storage/AI/wasteland-crystals/node_modules/playwright-core');
const args=process.argv.slice(2),opt=(k,d)=>{const i=args.indexOf('--'+k);return i<0?d:args[i+1];};
const study=opt('study','http://127.0.0.1:4496'),only=opt('times',null)&&opt('times').split(',').map(Number),shotId=opt('shot',null);
if(!['05','06'].includes(shotId)){console.error('pass --shot 05 or --shot 06');process.exit(1);}
const sprites=fileURLToPath(new URL('../dist/tactics/intro-sprites/',import.meta.url)),out=sprites+`sam-${shotId}/`;
const FPS=20,SHEET=2048,TYPES={'.js':'text/javascript','.json':'application/json','.html':'text/html','.webp':'image/webp','.png':'image/png'};
const browser=await chromium.launch({channel:'msedge',args:['--use-angle=d3d11']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('pageerror',e=>console.error('page:',e.message));
await page.route('**/tactics/intro-sprites/**',async route=>{const rel=decodeURIComponent(new URL(route.request().url()).pathname.split('/tactics/intro-sprites/')[1]);
 try{await route.fulfill({body:await readFile(sprites+rel),contentType:TYPES[extname(rel)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:'missing '+rel});}});
await page.goto(study+'/tactics/intro-study.html?time=0',{waitUntil:'load'});
await page.waitForFunction(()=>window.introReady===true,null,{timeout:60000});
const setup=await page.evaluate(async({SHEET,FPS,only,shotId})=>{
 const T=await import('./vendor/three.module.js'),TL=await import('./intro-timeline.js'),
  {shotById}=await import('./intro-sprites/ambush.js'),{SAM_SITE}=await import('./intro-sprites/sam-sector.js'),{closeupView}=await import('./intro-sprites/closeup.js'),
  {inkSprite,renderPasses}=await import('./intro-sprites/ink.js'),{splitToneCanvas,SPLIT_AIRCRAFT}=await import('./intro-sprites/grade.js');
 const shot=shotById(shotId),V=closeupView(shot.camera);
 const {renderer,samScene,launcher,projectiles}=window.introStudy;
 // Sector tiles <-> study units: the launcher's slab centre sits on SAM_SITE.
 const P=TL.SAM_POSITION,toSector=v=>[v.x-P[0]+SAM_SITE.x,v.z-P[2]+SAM_SITE.y,v.y];
 const cam=new T.PerspectiveCamera(2*Math.atan(V.H/2/V.focal)*180/Math.PI,V.W/V.H,.1,900);
 const C=V.C,f=V.f;cam.position.set(C[0]-SAM_SITE.x+P[0],C[2],C[1]-SAM_SITE.y+P[2]);cam.up.set(0,1,0);cam.lookAt(cam.position.x+f[0],cam.position.y+f[2],cam.position.z+f[1]);cam.updateMatrixWorld(true);cam.updateProjectionMatrix();
 for(const m of projectiles)if(m.root.parent!==samScene)samScene.add(m.root);
 // The cradle's pitch over the wake, and its piston re-aimed for it (the same
 // construction as intro-launcher.js update, for this pitch).
 const {SAM_LAUNCH:L}=await import('./intro-sprites/ambush.js'),pitchAt=t=>L.rest+(L.raised-L.rest)*TL.smooth(L.wake[0],L.wake[1],t);
 const piston=launcher.root.getObjectByName('Elevation piston'),sleeve=launcher.root.getObjectByName('Actuator sleeve');
 const pose=t=>{launcher.update(t);const pg=launcher.pitch;pg.rotation.x=-pitchAt(t);
  const a=new T.Vector3(0,.94,.80),b=new T.Vector3(0,-.13,1.3).applyEuler(pg.rotation).add(pg.position),v=b.clone().sub(a),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize());
  piston.position.copy(a).addScaledVector(v,.5);piston.scale.y=v.length();piston.quaternion.copy(q);sleeve.position.copy(a).addScaledVector(v,.3);sleeve.scale.y=v.length()*.6;sleeve.quaternion.copy(q);launcher.root.updateMatrixWorld(true);};
 // Each flight starts where its missile sat on the rail at launch, along the
 // rail; speed v0 + accel*tau (capped), the direction easing toward the same
 // heading at the cruise climb; integrated every 5 ms.
 const flights=L.launches.map((b,i)=>{pose(b-1e-4);const m=launcher.missiles[i].root,p0=new T.Vector3(),q0=new T.Quaternion();m.updateMatrixWorld(true);m.matrixWorld.decompose(p0,q0,new T.Vector3());
  const d0=new T.Vector3(0,0,1).applyQuaternion(launcher.pitch.getWorldQuaternion(new T.Quaternion())).normalize(),flat=new T.Vector3(d0.x,0,d0.z).normalize(),dc=flat.clone().multiplyScalar(Math.cos(L.cruise)).setY(Math.sin(L.cruise));
  const dt=.005,pts=[];let p=p0.clone();for(let tau=0;tau<=L.flight+1e-9;tau+=dt){const d=d0.clone().lerp(dc,TL.smooth(L.turn[0],L.turn[1],tau)).normalize();pts.push({tau,p:p.clone(),d});p.addScaledVector(d,Math.min(L.vmax,L.v0+L.accel*tau)*dt);}
  return {b,q0,d0,pts};});
 const flightAt=(F,tau)=>F.pts[Math.max(0,Math.min(F.pts.length-1,Math.round(tau/.005)))];
 const tracks=flights.map(F=>{const pts=[];for(let tau=0;tau<=L.flight+1e-9;tau+=.02){const s=flightAt(F,tau);pts.push([+(F.b+tau).toFixed(3),...toSector(s.p).map(v=>+v.toFixed(3)),...[s.d.x,s.d.z,s.d.y].map(v=>+v.toFixed(4))]);}return {birth:F.b,points:pts};});
 const packer=()=>{const sheets=[];let c=null,x=0,y=0,row=0;const fresh=()=>{c=document.createElement('canvas');c.width=c.height=SHEET;sheets.push(c);x=0;y=0;row=0;};
  return {sheets,place(img,w,h){if(!c)fresh();if(x+w>SHEET){x=0;y+=row;row=0;}if(y+h>SHEET)fresh();const at=[sheets.length-1,x,y];c.getContext('2d').drawImage(img,0,0,w,h,x,y,w,h);x+=w+2;row=Math.max(row,h+2);return at;}};};
 let times=[];if(only)times=only;else for(let t=shot.from-1/FPS;t<=shot.to+1/FPS+1e-9;t+=1/FPS)times.push(+t.toFixed(4));
 window.__sam={T,TL,renderer,samScene,launcher,projectiles,cam,V,pose,flights,flightAt,L,pitchAt,inkSprite,renderPasses,splitToneCanvas,SPLIT_AIRCRAFT,sprites:packer(),frames:[]};
 return {times,W:V.W,H:V.H,camera:shot.camera,tracks};
},{SHEET,FPS,only,shotId});
for(const t of setup.times){
 const r=await page.evaluate(({t})=>{
  const B=window.__sam,{T,TL,renderer,samScene,launcher,projectiles,cam,V}=B;
  B.pose(t);
  for(let i=0;i<2;i++){const F=B.flights[i],tau=t-F.b,m=projectiles[i];m.root.visible=tau>=0&&tau<=B.L.flight;if(!m.root.visible)continue;
   const s=B.flightAt(F,tau);m.root.position.copy(s.p);m.root.quaternion.copy(new T.Quaternion().setFromUnitVectors(F.d0,s.d).multiply(F.q0));}
  // Only the launcher and the missiles: the study's own SAM terrain and trees
  // are replaced by the painted plate.
  const hidden=[];const keep=new Set([launcher.root,...projectiles.map(m=>m.root)]);
  for(const o of samScene.children)if(!keep.has(o)&&!o.isLight&&o.visible){o.visible=false;hidden.push(o);}
  const lights=[];samScene.traverse(o=>{if(o.isLight){lights.push([o,o.color.clone(),o.intensity,o.groundColor?.clone()]);if(o.isHemisphereLight){o.color.set(0xf4f6f0);o.groundColor.set(0x6f7464);o.intensity=1.9;}else if(o.isDirectionalLight){o.color.set(0xfffaf0);o.intensity=2.2;}}});
  const bg=samScene.background,fog=samScene.fog;samScene.background=null;samScene.fog=null;
  const size=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();
  renderer.setPixelRatio(1);renderer.setSize(V.W,V.H,false);renderer.setClearColor(0x000000,0);
  const passes=B.renderPasses(T,renderer,samScene,cam,V.W,V.H),inked=B.inkSprite(passes.color,passes.normal,passes.depth,{near:passes.near,far:passes.far});
  B.splitToneCanvas(inked.canvas,B.SPLIT_AIRCRAFT);
  for(const [o,c,i,g]of lights){o.color.copy(c);o.intensity=i;if(g)o.groundColor.copy(g);}
  samScene.background=bg;samScene.fog=fog;for(const o of hidden)o.visible=true;renderer.setClearColor(clear,alpha);renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);
  const src=inked.canvas,SW=src.width,SH=src.height,dd=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,SW,SH).data;
  let x0=SW,y0=SH,x1=-1,y1=-1;for(let y=0;y<SH;y++)for(let x=0;x<SW;x++)if(dd[(y*SW+x)*4+3]>2){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  const f0={t,state:(({yaw,wake,loaded})=>({pitch:+B.pitchAt(t).toFixed(4),yaw:+yaw.toFixed(4),wake:+wake.toFixed(4),loaded}))(TL.launcherState(t))};
  if(x1>=0){x0=Math.max(0,x0-1);y0=Math.max(0,y0-1);x1=Math.min(SW-1,x1+1);y1=Math.min(SH-1,y1+1);const w=x1-x0+1,h=y1-y0+1,c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(src,x0,y0,w,h,0,0,w,h);
   f0.sprite=[...B.sprites.place(c,w,h),w,h];f0.pos=[x0-inked.pad,y0-inked.pad];}
  B.frames.push(f0);return {w:f0.sprite?.[3],h:f0.sprite?.[4],pos:f0.pos};
 },{t});
 if(only||Math.round((t-setup.times[0])*FPS)%10===0)console.log('t',t.toFixed(2),'crop',r.w+'x'+r.h,'at',r.pos);
}
const result=await page.evaluate(()=>{const B=window.__sam;return {frames:B.frames,sheets:B.sprites.sheets.map(c=>c.toDataURL('image/webp',.9).split(',')[1])};});
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
let bytes=0;for(const [i,b]of result.sheets.entries()){const buf=Buffer.from(b,'base64');bytes+=buf.length;await writeFile(out+`sheet-${i}.webp`,buf);}
await writeFile(out+'sequence.json',JSON.stringify({version:1,shot:shotId,fps:only?null:FPS,times:only||undefined,from:setup.times[0],to:setup.times.at(-1),plate:[setup.W,setup.H],camera:setup.camera,
 note:'sprite = [sheet, x, y, w, h]; pos = top-left in the SAM plate pixels; tracks: per missile [t, x, y, h, dx, dy, dh] in sector tiles from its launch',
 sheets:result.sheets.map((_,i)=>`sheet-${i}.webp`),frames:result.frames,tracks:setup.tracks})+'\n');
console.log('frames',result.frames.length,'sheets',result.sheets.length,'bytes',bytes);
await browser.close();
