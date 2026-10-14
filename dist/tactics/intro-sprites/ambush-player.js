// The player for the intro's first part (ambush.js SHOTS, 0 to 20.2 s), built
// like proof.js: every frame is a pure function of time t. Perspective shots
// composite their painted plate and their baked frames: the aircraft with its
// painted rotor disc (01, 03), or the launcher with the launch's painted smoke,
// flames and flashes (05, 06). Shots not painted yet say so.
import {SHOTS,shotAt,lensPath,shotSpec,shotSector,shotKeepClear,plateName,HANDLER_LINE} from './ambush.js';
import {SAM_SITE} from './sam-sector.js';
import {closeupView,paintCloseupPlate} from './closeup.js';
import {rotorDisc,puff,puffSprite} from './effects.js';
import {finishFrame} from './plate.js';
import {loadGroundTextures,rng,fbm} from './crash-sector.js';
import {loadFloraSprites} from './painted-trees.js';
import {smooth} from './trajectory.js';
export const WIDTH=1600,HEIGHT=900;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('Missing '+src));i.src=src;});
const json=async p=>{const r=await fetch(p);if(!r.ok)throw Error('Missing '+p);return r.json();};
const bitmap=async src=>createImageBitmap(await load(src));

export async function loadAmbushAssets(){
 const lens={},plates=new Map(),frames=new Map();let painter=null,crash=null;
 const smoke=await load('../../assets/effects/painted-fire/smoke-atlas-v1.png');
 for(const s of SHOTS){if(!s.camera)continue;
  const name=plateName(s);
  if(!plates.has(name)){const spec=shotSpec(s);let plate=null,source='painted live';
   try{const meta=await json(`plate/${name}.json`);if(JSON.stringify(meta.spec)===JSON.stringify(spec)){plate=await bitmap(`plate/${name}.webp`);source=`plate/${name}.webp`;}else source='painted live (the stored plate is stale)';}catch{}
   if(!plate){painter??=await Promise.all([loadGroundTextures(),loadFloraSprites()]);
    crash??=await Promise.all([json('../sector-library/tutorial-step-1/rough-plateau.json'),json('crash-sector-woodland.json')]).then(([map,woodland])=>({map,woodland}));
    plate=paintCloseupPlate({sector:shotSector(s,crash),textures:painter[0],flora:painter[1]},closeupView(s.camera),{keepClear:shotKeepClear(s)}).canvas;}
   plates.set(name,{plate,source});}
  if(!frames.has(s.frames)){const seq=await json(`${s.frames}/sequence.json`);frames.set(s.frames,{seq,sheets:await Promise.all(seq.sheets.map(f=>bitmap(`${s.frames}/${f}`)))});}
  lens[s.id]={shot:s,view:closeupView(s.camera),...plates.get(name),...frames.get(s.frames),kind:s.frames.startsWith('heli')?'heli':'sam'};}
 // 02: the baked hen at her desk, composited over the painted room.
 const r=SHOTS.find(s=>s.id==='02'),seq=await json(`${r.frames}/sequence.json`);
 const room={shot:r,seq,sheets:await Promise.all(seq.sheets.map(f=>bitmap(`${r.frames}/${f}`)))};
 return {lens,smoke,room};
}

// A slow push-in and a follow pan that takes up a third of the subject's
// offset from the plate's centre, clamped inside the plate's margin.
export function lensWindow(shot,t,subjectPx){
 const [W,H]=shot.camera.plate,[ww,wh]=shot.camera.window,zoom=1+.04*smooth(shot.from,shot.to,t);
 const mx=(W-ww/zoom)/2,my=(H-wh/zoom)/2,want=subjectPx?[(subjectPx[0]-W/2)*.33,(subjectPx[1]-H/2)*.33]:[0,0];
 return {zoom,cx:W/2+clamp(want[0],-mx,mx),cy:H/2+clamp(want[1],-my,my)};
}

// A baked sequence's frame at t: by frame rate, or the nearest baked time when
// only keyframes were baked.
function frameAt(seq,t){
 if(seq.fps)return seq.frames[Math.max(0,Math.min(seq.frames.length-1,Math.round((t-seq.from)*seq.fps)))];
 let best=seq.frames[0];for(const f of seq.frames)if(Math.abs(f.t-t)<Math.abs(best.t-t))best=f;return best;
}

// --- the launch: painted smoke, flames and flashes along the baked tracks -------
// Track points: [t, x, y, h, dx, dy, dh] in sector tiles, every 0.02 s from launch.
function trackAt(track,t){const P=track.points,u=clamp((t-P[0][0])/.02,0,P.length-1.001),i=Math.floor(u),f=u-i,a=P[i],b=P[i+1];
 return {pos:[1,2,3].map(k=>a[k]+(b[k]-a[k])*f),dir:[4,5,6].map(k=>a[k]+(b[k]-a[k])*f)};}
const TAIL=1.47; // the study's trail starts this far behind the missile's centre
const TRAIL_STEP=.5; // tiles of flight between trail puffs
function launchItems(t,tracks,V){
 const items=[];
 for(const [i,tr] of tracks.entries()){if(t<tr.birth)continue;
  const R=rng(911+i*37),last=tr.points.at(-1)[0];
  // The exhaust trail: a puff every TRAIL_STEP tiles of flight (by distance,
  // so it stays continuous however fast the missile goes), rising and spreading.
  const P=tr.points,life=2.6;let carry=0;
  for(let k=1;k<P.length&&P[k-1][0]<=t;k++){const a=P[k-1],b=P[k],seg=Math.hypot(b[1]-a[1],b[2]-a[2],b[3]-a[3]);
   for(let u=carry;u<seg;u+=TRAIL_STEP){const f=u/seg,te=a[0]+(b[0]-a[0])*f,jx=(R()-.5)*.5,jy=(R()-.5)*.5,cell=Math.floor(R()*4);if(te>t)break;const age=t-te;if(age>=life)continue;
    const p=[1,2,3].map(c=>a[c]+(b[c]-a[c])*f),d=[4,5,6].map(c=>a[c]+(b[c]-a[c])*f),q=[p[0]-d[0]*TAIL+jx*age,p[1]-d[1]*TAIL+jy*age,p[2]-d[2]*TAIL+.3*age];
    items.push({kind:'puff',p:q,size:.55+age*1.1,alpha:.62*Math.pow(1-age/life,1.3)*Math.min(1,age/.04),cell,tint:'atop:rgba(246,244,238,.8)'});}
   carry=(carry-seg)%TRAIL_STEP;if(carry<0)carry+=TRAIL_STEP;}
  // The launch cloud: blast smoke shoved out low around the rails, slowing.
  const C=trackAt(tr,tr.birth),o=[C.pos[0]-C.dir[0]*2.4,C.pos[1]-C.dir[1]*2.4,Math.max(.4,C.pos[2]-C.dir[2]*2.4-1.2)];
  // (its own random stream: the trail's puff count grows with t, so sharing one
  // would reshuffle the cloud every frame)
  const RC=rng(977+i*41);
  for(let k=0;k<22;k++){const ang=RC()*Math.PI*2,sp=1.4+RC()*2.4,life=3.2+RC()*1.2,cell=Math.floor(RC()*4),lift=.2*RC(),age=t-tr.birth-k*.012;if(age<0||age>=life)continue;
   const d=sp*(1-Math.exp(-1.7*age))/1.7,p=[o[0]+Math.cos(ang)*d,o[1]+Math.sin(ang)*d,o[2]+.35*age+lift];
   items.push({kind:'puff',p,size:1+2.9*Math.sqrt(age/life),alpha:.55*Math.pow(1-age/life,1.2)*Math.min(1,age/.06),cell,tint:'atop:rgba(226,222,212,.72)'});}
  // The motor: a flame behind the tail while it burns, a flash at ignition.
  const now=trackAt(tr,Math.min(t,last)),noz=[0,1,2].map(k=>now.pos[k]-now.dir[k]*(TAIL+.3));
  if(t<=last)items.push({kind:'flame',p:noz,back:[0,1,2].map(k=>noz[k]-now.dir[k]*1.7),flicker:.8+.2*Math.sin(t*61+i)});
  const age=t-tr.birth;if(age<.38)items.push({kind:'flash',p:noz,age,seed:41+i});}
 for(const it of items){it.depth=V.depth(...it.p);it.px=V.project(...it.p);it.scale=V.scaleAt(...it.p);}
 return items.filter(it=>it.px);
}
// Ignition: a soft blast of light at the nozzle (the impact flash's star of
// sparks belongs to the hit, not to a motor lighting).
function ignition(ctx,[x,y],{radius,age}){
 const life=.32,u=clamp(age/life,0,1);if(u>=1)return;const a=1-u,r=radius*(.7+1.1*Math.sqrt(u));
 ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,`rgba(255,250,228,${.95*a})`);g.addColorStop(.35,`rgba(255,212,130,${.7*a})`);g.addColorStop(1,'rgba(255,140,50,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawLaunchItem(ctx,smoke,it){
 if(it.kind==='puff')puff(ctx,smoke,{x:it.px[0],y:it.px[1],size:it.size*it.scale,cell:it.cell,tint:it.tint,alpha:it.alpha});
 else if(it.kind==='flash')ignition(ctx,it.px,{radius:1.6*it.scale,age:it.age});
 else{const [x,y]=it.px,r=.32*it.scale*it.flicker;ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(x,y,0,x,y,r*1.6);g.addColorStop(0,'rgba(255,244,210,.9)');g.addColorStop(.35,'rgba(255,190,96,.6)');g.addColorStop(1,'rgba(255,120,36,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*1.6,0,Math.PI*2);ctx.fill();
  const b=it.backPx;if(b){ctx.lineCap='round';for(const [w,c]of [[r*1.4,'rgba(255,170,70,.45)'],[r*.8,'rgba(255,236,190,.8)']]){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(b[0],b[1]);ctx.stroke();}}
  ctx.restore();}
}

// --- 04: the radar insert --------------------------------------------------------
// Code-drawn, as the study's was (intro-radar.js), in the sprites' language: a
// worn olive console, a green scope whose sweep meets the new contact at
// RADAR.contact s, an AIR CONTACT tag, amber lamps and three knobs, inked.
export const RADAR=Object.freeze({from:12,to:14,contact:12.55,bearing:-.55,range:.62,rate:1.6});
const SCOPE={x:560,y:450,r:330},INK_RGB='34,30,22';
let consoleCache=null;
function consoleFace(){
 if(consoleCache)return consoleCache;
 // Painted metal at half size (soft is fine for paint): olive, mottled, worn
 // at the edges, scratched; then upscaled once.
 const w=800,h=450,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),img=g.createImageData(w,h),d=img.data;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=fbm(x*.018,y*.018,71,4),m=fbm(x*.09,y*.09,73,2),edge=Math.min(x,y,w-1-x,h-1-y)/w;
  const wear=smooth(.5,.72,fbm(x*.03+9,y*.03,75,3))*(1-smooth(0,.05,edge)),o=(y*w+x)*4;
  let r=62+n*28+m*10,gg=70+n*28+m*9,b=46+n*18+m*6;r+=(128-r)*wear*.5;gg+=(116-gg)*wear*.5;b+=(86-b)*wear*.5;
  d[o]=r;d[o+1]=gg;d[o+2]=b;d[o+3]=255;}
 g.putImageData(img,0,0);
 const R=rng(77);g.strokeStyle='rgba(176,170,140,.18)';g.lineWidth=.6;
 for(let i=0;i<90;i++){const x=R()*w,y=R()*h,a=(R()-.5)*1.2,l=4+R()*26;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
 const big=document.createElement('canvas');big.width=WIDTH;big.height=HEIGHT;const bg=big.getContext('2d');bg.imageSmoothingQuality='high';bg.drawImage(c,0,0,WIDTH,HEIGHT);
 return consoleCache=big;
}
function renderRadarInsert(ctx,t){
 const {x:cx,y:cy,r}=SCOPE,sweep=RADAR.bearing+RADAR.rate*(t-RADAR.contact),seen=t>=RADAR.contact;
 ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(consoleFace(),0,0);
 // The scope's bezel: a dark rubber ring in a bolted, rounded frame.
 ctx.fillStyle='rgba(28,30,24,.92)';ctx.beginPath();ctx.roundRect(cx-r-58,cy-r-58,2*r+116,2*r+116,46);ctx.fill();
 ctx.fillStyle='#10140f';ctx.beginPath();ctx.arc(cx,cy,r+16,0,Math.PI*2);ctx.fill();
 for(const [bx,by] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.fillStyle='#5b5a48';ctx.beginPath();ctx.arc(cx+bx*(r+30),cy+by*(r+30),9,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgb(${INK_RGB})`;ctx.lineWidth=2;ctx.stroke();}
 // The tube: dark green glass with a vignette.
 const glass=ctx.createRadialGradient(cx-r*.25,cy-r*.3,r*.1,cx,cy,r);glass.addColorStop(0,'#1d3a24');glass.addColorStop(.75,'#11251a');glass.addColorStop(1,'#08120c');
 ctx.fillStyle=glass;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
 // Range rings and the cross.
 ctx.strokeStyle='rgba(98,190,110,.42)';ctx.lineWidth=2;for(const k of [.25,.5,.75,1]){ctx.beginPath();ctx.arc(cx,cy,r*k*.96,0,Math.PI*2);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();
 // The sweep: bright at its leading edge, fading behind it over 70 degrees.
 ctx.globalCompositeOperation='lighter';
 const cone=ctx.createConicGradient(sweep-1.22,cx,cy);cone.addColorStop(0,'rgba(80,220,100,0)');cone.addColorStop(.155,'rgba(90,235,110,.30)');cone.addColorStop(.1945,'rgba(150,255,160,.62)');cone.addColorStop(.195,'rgba(80,220,100,0)');cone.addColorStop(1,'rgba(80,220,100,0)');
 ctx.fillStyle=cone;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,sweep-1.22,sweep+.005);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(190,255,190,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(sweep)*r,cy+Math.sin(sweep)*r);ctx.stroke();
 // Ground clutter: faint returns the sweep refreshes, for a working scope.
 const R=rng(5);for(let i=0;i<46;i++){const a=R()*Math.PI*2,d=(.08+R()*.85)*r,since=((sweep-a)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)/RADAR.rate,glow=Math.exp(-since*1.2)*.5+.06;
  ctx.fillStyle=`rgba(110,230,120,${glow*(.4+R()*.6)})`;ctx.beginPath();ctx.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,1.5+R()*2.5,0,Math.PI*2);ctx.fill();}
 // The contact: lit the instant the sweep reaches it, then an afterglow.
 const bx=cx+Math.cos(RADAR.bearing)*r*RADAR.range,by=cy+Math.sin(RADAR.bearing)*r*RADAR.range;
 if(seen){const since=t-RADAR.contact,glow=.45+.55*Math.exp(-since*1.4),rad=10+14*Math.exp(-since*3);
  const bg=ctx.createRadialGradient(bx,by,0,bx,by,rad*2.4);bg.addColorStop(0,`rgba(230,255,225,${glow})`);bg.addColorStop(.3,`rgba(140,255,150,${.8*glow})`);bg.addColorStop(1,'rgba(80,220,100,0)');
  ctx.fillStyle=bg;ctx.beginPath();ctx.arc(bx,by,rad*2.4,0,Math.PI*2);ctx.fill();
  // Its heading: a short trail behind it.
  ctx.strokeStyle=`rgba(150,255,160,${.5*glow})`;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx-34,by+12);ctx.stroke();}
 ctx.globalCompositeOperation='source-over';
 // Glass: a cool highlight and faint scanlines.
 const hl=ctx.createLinearGradient(cx-r,cy-r,cx,cy);hl.addColorStop(0,'rgba(220,255,230,.10)');hl.addColorStop(1,'rgba(220,255,230,0)');ctx.fillStyle=hl;ctx.fillRect(cx-r,cy-r,2*r,2*r);
 ctx.fillStyle='rgba(0,0,0,.10)';for(let y=cy-r;y<cy+r;y+=4)ctx.fillRect(cx-r,y,2*r,1.5);
 ctx.restore();
 ctx.strokeStyle=`rgb(${INK_RGB})`;ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
 // The AIR CONTACT tag: a green box upper left of the tube, flickering on.
 if(seen){const since=t-RADAR.contact,on=since>.12||Math.floor(since*40)%2===0;
  if(on){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(120,240,130,.85)';ctx.lineWidth=3;ctx.strokeRect(cx-r+40,cy-r+60,250,58);
   ctx.fillStyle='rgba(150,255,160,.95)';ctx.font='bold 34px "Courier New", monospace';ctx.fillText('AIR CONTACT',cx-r+56,cy-r+101);ctx.restore();}}
 // The panel: amber lamps (the lowest lights with the contact) and three knobs.
 const px=1070;
 ctx.fillStyle='rgba(30,32,26,.85)';ctx.beginPath();ctx.roundRect(px-40,90,250,730,24);ctx.fill();
 for(const [i,lit] of [[0,true],[1,false],[2,seen]].map(([i,l])=>[i,l])){const ly=160+i*112;
  ctx.fillStyle='#2a2a22';ctx.beginPath();ctx.roundRect(px+26,ly-36,118,72,10);ctx.fill();
  const lg=ctx.createRadialGradient(px+85,ly,4,px+85,ly,40);if(lit){lg.addColorStop(0,'#fff1c0');lg.addColorStop(.45,'#f0a43a');lg.addColorStop(1,'#7a4a16');}else{lg.addColorStop(0,'#6e5a36');lg.addColorStop(1,'#3a3022');}
  ctx.fillStyle=lg;ctx.beginPath();ctx.roundRect(px+34,ly-28,102,56,8);ctx.fill();ctx.strokeStyle=`rgb(${INK_RGB})`;ctx.lineWidth=3;ctx.stroke();
  if(lit){ctx.save();ctx.globalCompositeOperation='lighter';const halo=ctx.createRadialGradient(px+85,ly,10,px+85,ly,90);halo.addColorStop(0,'rgba(255,170,60,.35)');halo.addColorStop(1,'rgba(255,170,60,0)');ctx.fillStyle=halo;ctx.fillRect(px-10,ly-90,190,180);ctx.restore();}}
 for(const [i,label] of ['RANGE','GAIN','FOCUS'].entries()){const ky=520+i*104,turn=[.6,-.4,1.1][i];
  ctx.fillStyle='#1b1c17';ctx.beginPath();ctx.arc(px+85,ky,34,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgb(${INK_RGB})`;ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle='#c9c4a8';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(px+85,ky);ctx.lineTo(px+85+Math.cos(turn-Math.PI/2)*26,ky+Math.sin(turn-Math.PI/2)*26);ctx.stroke();
  ctx.fillStyle='rgba(214,208,182,.85)';ctx.font='20px Georgia, serif';ctx.textAlign='center';ctx.fillText(label,px+85,ky+56);ctx.textAlign='start';}
 ctx.strokeStyle=`rgb(${INK_RGB})`;ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(px-40,90,250,730,24);ctx.stroke();ctx.beginPath();ctx.roundRect(cx-r-58,cy-r-58,2*r+116,2*r+116,46);ctx.stroke();
 finishFrame(ctx,WIDTH,HEIGHT);
 return {t,shot:'04',sweep,contact:seen};
}

// --- 02: the overseas radio room -------------------------------------------------
// The baked hen at her desk (bake-intro-room.mjs) over a painted room: lamp-lit
// plaster, a pinned map behind her, radio stacks on a shelf, a green desk lamp,
// conduit; a location card and her line as a subtitle.
let roomCache=null;
function roomBackdrop(){
 if(roomCache)return roomCache;
 const w=800,h=450,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),img=g.createImageData(w,h),d=img.data;
 // Plaster: warm where the lamp (upper right) reaches, cool and dark in the corners.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=fbm(x*.02,y*.02,81,4),m=fbm(x*.11,y*.11,83,2),lamp=Math.exp(-(((x-690)/330)**2+((y-40)/260)**2)),corner=smooth(.35,1,Math.hypot((x-400)/400,(y-225)/260));
  const k=.62+.38*lamp-.28*corner,o=(y*w+x)*4;d[o]=(150+n*40+m*12)*k+40*lamp;d[o+1]=(138+n*34+m*10)*k+26*lamp;d[o+2]=(112+n*24+m*8)*k+8*lamp;d[o+3]=255;}
 g.putImageData(img,0,0);
 const ink=(lw=2)=>{g.strokeStyle='rgba(34,28,20,.9)';g.lineWidth=lw;g.stroke();};
 // Conduit along the wall and down to the shelf.
 g.strokeStyle='rgba(70,64,52,.85)';g.lineWidth=5;g.beginPath();g.moveTo(0,52);g.lineTo(560,52);g.quadraticCurveTo(590,52,590,80);g.lineTo(590,150);g.stroke();
 // The map: parchment, a coastline, borders, pins and a string to the relay's sector.
 g.save();g.translate(70,40);g.rotate(-.012);
 g.fillStyle='#d9cfae';g.fillRect(0,0,310,196);
 const R=rng(31);g.fillStyle='rgba(122,150,96,.75)';g.beginPath();g.moveTo(20,40);
 for(let i=0;i<=14;i++){const a=i/14,x=20+a*270+(R()-.5)*16,y=36+Math.sin(a*5.2)*22+(R()-.5)*14;g.lineTo(x,y);}
 g.lineTo(290,170);for(let i=14;i>=0;i--){const a=i/14,x=20+a*270+(R()-.5)*14,y=150+Math.sin(a*4.1+1)*18+(R()-.5)*12;g.lineTo(x,y);}g.closePath();g.fill();
 g.fillStyle='rgba(96,138,164,.55)';g.beginPath();g.ellipse(210,104,38,20,.4,0,Math.PI*2);g.fill();
 g.strokeStyle='rgba(90,70,50,.55)';g.lineWidth=1;for(let i=1;i<6;i++){g.beginPath();g.moveTo(i*52,0);g.lineTo(i*52,196);g.stroke();}for(let i=1;i<4;i++){g.beginPath();g.moveTo(0,i*49);g.lineTo(310,i*49);g.stroke();}
 g.strokeStyle='rgba(170,40,30,.85)';g.lineWidth=1.5;g.beginPath();g.moveTo(64,120);g.lineTo(150,78);g.lineTo(236,138);g.stroke();
 for(const [px,py] of [[64,120],[150,78],[236,138]]){g.fillStyle='#b8302a';g.beginPath();g.arc(px,py,4.5,0,Math.PI*2);g.fill();ink(1.2);}
 g.beginPath();g.rect(0,0,310,196);ink(2.5);g.restore();
 // The shelf of radio sets on the right, behind the transceiver.
 g.fillStyle='#4a4436';g.fillRect(560,150,240,10);g.beginPath();g.rect(560,150,240,10);ink(1.5);
 for(const [bx,by,bw,bh,dials] of [[580,92,96,58,3],[684,74,116,76,4],[600,206,120,64,2],[728,198,72,72,2]]){
  g.fillStyle='#3d4231';g.fillRect(bx,by,bw,bh);g.fillStyle='rgba(20,22,16,.5)';g.fillRect(bx+6,by+8,bw-12,bh*.38);
  g.fillStyle='rgba(222,206,150,.85)';g.fillRect(bx+10,by+12,Math.min(40,bw*.35),bh*.18);
  for(let i=0;i<dials;i++){g.fillStyle='#1d1f18';g.beginPath();g.arc(bx+16+i*(bw-26)/Math.max(1,dials-1),by+bh*.72,6,0,Math.PI*2);g.fill();}
  g.beginPath();g.rect(bx,by,bw,bh);ink(1.6);}
 g.fillStyle='#4a4436';g.fillRect(560,272,240,8);
 // The desk lamp: a green enamel shade throwing a warm cone down.
 g.save();g.globalCompositeOperation='lighter';const cone=g.createLinearGradient(700,40,700,330);cone.addColorStop(0,'rgba(255,214,140,.28)');cone.addColorStop(1,'rgba(255,214,140,0)');
 g.fillStyle=cone;g.beginPath();g.moveTo(672,46);g.lineTo(736,46);g.lineTo(800,330);g.lineTo(600,330);g.closePath();g.fill();g.restore();
 g.strokeStyle='#2c3024';g.lineWidth=4;g.beginPath();g.moveTo(770,0);g.lineTo(745,20);g.stroke();
 g.fillStyle='#4f6a3e';g.beginPath();g.moveTo(668,48);g.lineTo(740,48);g.lineTo(726,18);g.lineTo(684,18);g.closePath();g.fill();ink(2);
 g.fillStyle='rgba(255,236,190,.95)';g.beginPath();g.ellipse(704,48,30,5,0,0,Math.PI*2);g.fill();
 const big=document.createElement('canvas');big.width=WIDTH;big.height=HEIGHT;const bg=big.getContext('2d');bg.imageSmoothingQuality='high';bg.drawImage(c,0,0,WIDTH,HEIGHT);
 return roomCache=big;
}
function renderRoom(ctx,t,L){
 ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(roomBackdrop(),0,0);
 const f=frameAt(L.seq,t);if(f.sprite){const [sh,x,y,w,h]=f.sprite;ctx.drawImage(L.sheets[sh],x,y,w,h,f.pos[0],f.pos[1],w,h);}
 finishFrame(ctx,WIDTH,HEIGHT);
 // Location card, then her line as a subtitle (after the grade: titles are not painted).
 const s=L.shot,card=smooth(s.from,s.from+.4,t)*(1-smooth(s.from+2,s.from+2.6,t));
 if(card>0){ctx.save();ctx.globalAlpha=card;ctx.fillStyle='rgba(20,22,18,.72)';ctx.fillRect(48,44,372,50);ctx.fillStyle='#e9e2cc';ctx.font='24px Georgia, serif';ctx.fillText('OVERSEAS RADIO ROOM',66,78);ctx.restore();}
 const line=smooth(s.from+.5,s.from+.8,t)*(1-smooth(s.to-.5,s.to-.2,t));
 if(line>0){ctx.save();ctx.globalAlpha=line;ctx.font='italic 34px Georgia, serif';const tw=ctx.measureText('“'+HANDLER_LINE+'”').width;
  ctx.fillStyle='rgba(16,18,14,.66)';ctx.fillRect((WIDTH-tw)/2-28,786,tw+56,62);ctx.fillStyle='#f1ead2';ctx.fillText('“'+HANDLER_LINE+'”',(WIDTH-tw)/2,828);ctx.restore();}
 return {t,shot:s.id,frame:f.t};
}

export function createAmbush(canvas,A){
 const ctx=canvas.getContext('2d');
 // Build the tinted puff sprites up front (proof.js: on first use they stalled playback).
 for(let c=0;c<4;c++)for(const tint of ['atop:rgba(246,244,238,.8)','atop:rgba(226,222,212,.72)'])puffSprite(A.smoke,c,tint);
 function begin(L,subjectPx,t){const s=L.shot,win=lensWindow(s,t,subjectPx),z=win.zoom*WIDTH/s.camera.window[0];
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#2c3524';ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.setTransform(z,0,0,z,WIDTH/2-win.cx*z,HEIGHT/2-win.cy*z);ctx.drawImage(L.plate,0,0);}
 const drawFrame=(L,f)=>{if(f.sprite){const [sh,x,y,w,h]=f.sprite;ctx.drawImage(L.sheets[sh],x,y,w,h,f.pos[0],f.pos[1],w,h);}};
 function renderHeli(t,L){
  const V=L.view,p=lensPath(t);begin(L,V.project(p.x,p.y,p.h+1.2),t);
  const f=frameAt(L.seq,t);drawFrame(L,f);
  const d=f.rotorDisc;rotorDisc(ctx,{hub:d.hub,u:d.u,v:d.v},{alpha:1,angle:31*t});
  ctx.setTransform(1,0,0,1,0,0);finishFrame(ctx,WIDTH,HEIGHT);
  return {t,shot:L.shot.id,heli:p,frame:f.t};
 }
 function renderSam(t,L){
  const V=L.view,site=[SAM_SITE.x,SAM_SITE.y,2.4];begin(L,V.project(...site),t);
  const f=frameAt(L.seq,t),items=launchItems(t,L.seq.tracks,V),depth=V.depth(...site);
  for(const it of items)if(it.kind==='flame')it.backPx=V.project(...it.back);
  const puffs=items.filter(it=>it.kind==='puff').sort((a,b)=>a.depth-b.depth);
  for(const it of puffs)if(it.depth<depth)drawLaunchItem(ctx,A.smoke,it);
  drawFrame(L,f);
  for(const it of puffs)if(it.depth>=depth)drawLaunchItem(ctx,A.smoke,it);
  for(const it of items)if(it.kind!=='puff')drawLaunchItem(ctx,A.smoke,it);
  ctx.setTransform(1,0,0,1,0,0);finishFrame(ctx,WIDTH,HEIGHT);
  return {t,shot:L.shot.id,frame:f.t,puffs:puffs.length};
 }
 function unpainted(t,s){
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#1d2620';ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle='#e9e2cc';ctx.font='30px Georgia, serif';ctx.fillText(`${s.id} · ${s.title}`,64,96);
  ctx.fillStyle='#a9ad98';ctx.font='22px Georgia, serif';ctx.fillText(`${s.place}, ${s.from}–${s.to} s: not painted yet`,64,136);
  return {t,shot:s.id,unpainted:true};
 }
 function render(t){t=clamp(t,SHOTS[0].from,SHOTS.at(-1).to);const s=shotAt(t),L=A.lens[s.id];
  if(s.id==='04')return renderRadarInsert(ctx,t);
  if(s.id==='02'&&A.room)return renderRoom(ctx,t,A.room);
  return !L?unpainted(t,s):L.kind==='heli'?renderHeli(t,L):renderSam(t,L);}
 return {render};
}
