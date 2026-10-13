// Animated A -> B -> C proof: the hit, the drop past the plateau rim and the
// crash in the user's clearing, as sprites over one painted plate.
//   proof.html[?t=26.6][&play]
// Everything is a pure function of time t, so scrubbing and recording agree.
import {buildSector,makeView,loadGroundTextures,LEVEL_HEIGHT,SUN,COS_EL,rng} from './crash-sector.js';
import {loadFloraSprites} from './painted-trees.js';
import {rotorDisc,gouge,puff,puffSprite,missile,flash} from './effects.js';
import {paintPlate,finishFrame} from './plate.js';
import {heliPath,cameraAt,EVENTS,PROOF_START,PROOF_END,TOUCHDOWN,KEYFRAME_TIMES,smooth} from './trajectory.js';
export {PROOF_START,PROOF_END,KEYFRAME_TIMES};
// The three stills shown to the user are frames of this player.
export const KEYFRAMES=Object.freeze({
 A:{title:'Descent past the plateau',caption:'The hit aircraft drops off the curved plateau rim toward the wooded pocket below; its shadow and the smoke trail give the altitude.'},
 B:{title:'Impact in the marked clearing',caption:'Skids plant and buckle first; rotor wash and soil burst outward, the blades still turning. Same rim and screen direction.'},
 C:{title:'Settled survivable wreck',caption:'Upright cabin, attached damaged tail, crushed skids, broken rotor and an open starboard door with clear ground for the squad. Thin engine smoke.'},
});

export const WIDTH=1600,HEIGHT=900,PLATE_TILE=52;
const HV=PLATE_TILE/Math.SQRT2*COS_EL,GRAVITY=18;
// The plate is painted once at the closest zoom (52 px tiles, the scale the
// aircraft frames were baked at) and must contain every camera frame.
export function plateGeometry(){
 const P=(x,y,h)=>[(x-y)*PLATE_TILE/2,(x+y)*PLATE_TILE/4-h*HV];
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(let t=PROOF_START;t<=PROOF_END+1e-9;t+=.02){const c=cameraAt(t),s=c.w/PLATE_TILE,[fx,fy]=P(...c.F);
  for(const [dx,dy] of [[0,0],[WIDTH,0],[0,HEIGHT],[WIDTH,HEIGHT]]){const px=fx+(dx-c.S[0])/s,py=fy+(dy-c.S[1])/s;x0=Math.min(x0,px);y0=Math.min(y0,py);x1=Math.max(x1,px);y1=Math.max(y1,py);}}
 const m=32;return {width:Math.ceil(x1-x0+2*m),height:Math.ceil(y1-y0+2*m),ox:Math.round(m-x0),oy:Math.round(m-y0)};
}
export const plateView=(g=plateGeometry())=>makeView({w:PLATE_TILE,anchor:[0,0,0],at:[g.ox,g.oy],width:g.width,height:g.height});

const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('Missing '+src));i.src=src;});
const json=async p=>{const r=await fetch(p);if(!r.ok)throw Error('Missing '+p);return r.json();};
export async function loadProofAssets({paint=false}={}){
 const [map,woodland,seq,smoke]=await Promise.all([json('../sector-library/tutorial-step-1/rough-plateau.json'),json('crash-sector-woodland.json'),json('heli-seq/sequence.json'),load('../../assets/effects/painted-fire/smoke-atlas-v1.png')]);
 // Decode every sheet up front: the browser otherwise decodes a 2048 px WebP on
 // its first draw, which stalled playback 35-92 ms at each new sheet.
 const bitmap=async src=>createImageBitmap(await load(src));
 const [sheets,shadowSheets]=await Promise.all([Promise.all(seq.sheets.map(s=>bitmap('heli-seq/'+s))),Promise.all(seq.shadowSheets.map(s=>bitmap('heli-seq/'+s)))]);
 const sector=buildSector(map,woodland),geometry=plateGeometry(),view=plateView(geometry);
 let plate=null,plateSource='painted live';
 if(!paint){try{const meta=await json('plate/crash-plate.json');if(['width','height','ox','oy'].every(k=>meta.geometry[k]===geometry[k])){plate=await bitmap('plate/crash-plate.webp');plateSource='plate/crash-plate.webp';}else plateSource='painted live (stored plate is for another camera path)';}catch{}}
 if(!plate){const [textures,flora]=await Promise.all([loadGroundTextures(),loadFloraSprites()]);plate=paintPlate({sector,textures,flora},view).canvas;}
 return {sector,view,geometry,plate,plateSource,seq,sheets,shadowSheets,smoke};
}

export function createProof(canvas,A){
 const ctx=canvas.getContext('2d'),{view,sector,seq}=A,ppu=PLATE_TILE/Math.SQRT2;
 const frameAt=t=>seq.frames[Math.max(0,Math.min(seq.frames.length-1,Math.round((t-seq.from)*seq.fps)))];
 const at=(t,key)=>{const p=heliPath(t),o=frameAt(t)[key];return [p.x+o[0],p.y+o[1],p.h+o[2]];};
 const ground=(x,y)=>sector.heightAt(x,y);
 const fx=buildEffects(at,ground);
 // Build every tinted puff sprite now: building them on first use stalled the
 // first playback by up to 90 ms a frame (0 frames over 33 ms once warm).
 for(const p of fx.puffs)puffSprite(A.smoke,p.cell,p.tint);
 function render(t){
  t=Math.max(PROOF_START,Math.min(PROOF_END,t));
  const c=cameraAt(t),s=c.w/PLATE_TILE,[fpx,fpy]=view.project(...c.F);
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#2c3524';ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.setTransform(s,0,0,s,c.S[0]-fpx*s,c.S[1]-fpy*s);
  ctx.drawImage(A.plate,0,0);
  const path=heliPath(t),f=frameAt(t);
  // Ground decals: the gouges grow with the slide, landed clods and shards stay.
  if(t>EVENTS.contact)gouge(ctx,view,{x0:TOUCHDOWN[0]-1.6,xEnd:heliPath(PROOF_END).x+1.9,xNow:path.x+1.9,lanes:[path.y-.92,path.y+.92],seed:23});
  const air=[];
  for(const k of fx.clods){if(t<k.t)continue;const s=clodAt(k,t);if(s.landed)drawClod(ctx,view,k,s);else air.push({depth:view.depth(s.x,s.y,s.h),draw:()=>drawClod(ctx,view,k,s)});}
  // The aircraft's shadow, dropped along the sun onto the ground below it.
  if(f.shadow){let g=0;for(let i=0;i<2;i++){const alt=Math.max(0,path.h-g);g=ground(path.x-SUN[0]/SUN[1]*alt,path.y-SUN[2]/SUN[1]*alt);}
   const alt=Math.max(0,path.h-g),[sx,sy]=view.project(path.x-SUN[0]/SUN[1]*alt,path.y-SUN[2]/SUN[1]*alt,g),[sh,x,y,w,h]=f.shadow;
   ctx.save();ctx.globalAlpha=Math.max(.16,.5-alt*.014);if(alt>.3)ctx.filter=`blur(${(1+alt*.22)*s}px)`;ctx.drawImage(A.shadowSheets[sh],x,y,w,h,sx-f.shadowAnchor[0],sy-f.shadowAnchor[1],w,h);ctx.restore();}
  // Smoke, dust, missiles and the aircraft, far to near.
  for(const p of fx.puffs){const age=t-p.t;if(age<0||age>=p.life)continue;const u=age/p.life,x=p.p[0]+p.v[0]*age,y=p.p[1]+p.v[1]*age,h=p.p[2]+p.v[2]*age-(p.sink||0)*age*age;
   const [px,py]=view.project(x,y,h),size=(p.s0+(p.s1-p.s0)*Math.sqrt(u))*ppu,alpha=p.a*Math.pow(1-u,1.4)*Math.min(1,age/.08);
   air.push({depth:view.depth(x,y,h),draw:()=>puff(ctx,A.smoke,{x:px,y:py,size,cell:p.cell,tint:p.tint,alpha,flip:p.flip,angle:p.rot})});}
  for(const m of fx.missiles){if(t<m.t0||t>=m.t1)continue;const a=m.pos(t),nose=a.map((v,k)=>v+m.dir[k]*1.5);air.push({depth:view.depth(...a)+.01,draw:()=>missile(ctx,view.project(...a),view.project(...nose),{width:.17*ppu})});}
  const k=frameAt(t);
  air.push({depth:view.depth(path.x,path.y,path.h+1.2),draw:()=>{
   const [ax,ay]=view.project(path.x,path.y,path.h),[sh,x,y,w,h]=k.sprite;
   ctx.drawImage(A.sheets[sh],x,y,w,h,ax-k.anchor[0],ay-k.anchor[1],w,h);
   const fade=1-smooth(26.2,27.35,t);
   if(k.rotorDisc&&fade>0){const d=k.rotorDisc,dt=Math.max(0,Math.min(t,28.1)-26),spin=31*(Math.min(t,26)+dt-dt*dt/4.2);
    rotorDisc(ctx,{hub:[ax+d.hub[0],ay+d.hub[1]],u:d.u,v:d.v},{alpha:fade,angle:spin});}
  }});
  air.sort((a,b)=>a.depth-b.depth);for(const it of air)it.draw();
  for(const fl of fx.flashes){const age=t-fl.t;if(age>=0&&age<.4)flash(ctx,view.project(...fl.at),{radius:fl.radius*ppu,age,seed:fl.seed});}
  ctx.setTransform(1,0,0,1,0,0);finishFrame(ctx,WIDTH,HEIGHT);
  return {t,camera:c,heli:path,frame:k.t};
 }
 return {render,fx};
}

// --- effects schedule (deterministic) ----------------------------------------
const SMOKE_DARK='rgb(60,56,52)',SMOKE='rgb(92,88,82)',SMOKE_LIGHT='rgb(176,172,164)',DUST='atop:rgba(236,210,158,.62)',DUST_DEEP='atop:rgba(204,170,118,.6)';
function buildEffects(at,ground){
 const R=rng(2026),fx={puffs:[],clods:[],missiles:[],flashes:[]};
 const add=(o)=>fx.puffs.push({cell:Math.floor(R()*4),flip:R()<.5,rot:(R()-.5)*.6,...o});
 const clod=(o)=>fx.clods.push({size:.05+R()*.12,tone:R(),rot:R()*3,...o});
 // Two missiles from the remote SAM chase in from behind. The first hits the
 // tail at 20.5 s; the second passes above and carries on out of the frame.
 const hit=at(EVENTS.hit,'tail'),speed=88;
 const shot=(target,t1,end)=>{const from=[target[0]-26,target[1]-2.8,target[2]-5.5],d=target.map((v,k)=>v-from[k]),L=Math.hypot(...d),dir=d.map(v=>v/L),t0=t1-L/speed;
  return {t0,t1:end,dir,pos:t=>from.map((v,k)=>v+dir[k]*speed*(t-t0))};};
 const m1=shot(hit,EVENTS.hit,EVENTS.hit),miss=[hit[0]+2.6,hit[1]-3.4,hit[2]+3.4],m2=shot(miss,EVENTS.hit+.13,21.4);
 fx.missiles.push(m1,m2);
 for(const m of [m1,m2])for(let t=m.t0;t<m.t1;t+=.007){const p=m.pos(t);add({t,p:p.map((v,k)=>v-m.dir[k]*.4),v:[R()*.3-.15,R()*.3-.15,.25+R()*.2],s0:.35,s1:2.1+R()*.7,life:1.3+R()*.6,a:.72,tint:'atop:rgba(246,244,238,.75)'});}
 fx.flashes.push({at:hit,t:EVENTS.hit,radius:2.4,seed:41});
 // Shards from the tail: fall with the aircraft's speed and lie where they land.
 for(let i=0;i<16;i++){const a=R()*Math.PI*2;clod({t:EVENTS.hit,p:hit,v:[5.5+Math.cos(a)*2.5,.4+Math.sin(a)*2.5,1+R()*4],shard:true});}
 // Tail smoke from the hit until the aircraft settles, then a thin engine plume.
 for(let t=EVENTS.hit;t<29;t+=t<26?.035:.1){const p=at(t,'tail');add({t,p,v:[.35+R()*.3,-.25+R()*.3,.45+R()*.4],s0:.7+R()*.4,s1:3.4+R()*1.6,life:2.8+R()*1.3,a:t<26?.82:.55,tint:t<22.2?SMOKE_DARK:SMOKE});}
 for(let t=27;t<PROOF_END;t+=.12){const p=at(t,'engine');add({t,p,v:[.28+R()*.15,-.18+R()*.1,1.4+R()*.4],s0:.55+R()*.2,s1:3.0+R()*1.1,life:3.4+R()*.8,a:.55,tint:SMOKE_LIGHT});}
 // Rotor wash raises dust as the aircraft comes low over the clearing.
 for(let t=24.6;t<26.5;t+=.022){const q=heliPath(t),k=Math.max(0,1-q.h/5.5);if(k<=0)continue;for(let j=0;j<2;j++){const a=R()*Math.PI*2,r0=2+R()*1.6,sp=3+R()*2.5;
  add({t,p:[q.x+Math.cos(a)*r0,q.y+Math.sin(a)*r0,.15],v:[Math.cos(a)*sp,Math.sin(a)*sp,.45+R()*.3],s0:1.1,s1:3.6+R(),life:.9+R()*.7,a:.55*k,tint:DUST});}}
 // Contact: the skids plant, buckle and plough; soil bursts out and back.
 const skid=(t,u,side)=>{const q=heliPath(t);return [q.x-1.6+3.5*u,q.y+side*.92,0];};
 for(let i=0;i<36;i++){const t=EVENTS.contact+R()*.4,side=R()<.5?-1:1,p=skid(t,R()*.7,side);
  add({t,p,v:[-1.8+R()*2.2,side*(1.2+R()*3),.7+R()*1.4],s0:1.6+R()*.6,s1:5.2+R()*1.8,life:2.2+R()*1.6,a:.95,tint:R()<.5?DUST:DUST_DEEP});}
 for(let i=0;i<64;i++){const t=EVENTS.contact+R()*.5,side=R()<.5?-1:1;clod({t,p:skid(t,R(),side),v:[-2+R()*4.5,side*(.8+R()*3.2),2.5+R()*5]});}
 for(let t=26.1;t<28.4;t+=.05){const k=1-(t-26)/2.5;for(const side of [-1,1]){const p=skid(t,1,side);add({t,p,v:[1.2+R(),side*(.3+R()*.6),.5+R()*.4],s0:.7,s1:2.3,life:.8+R()*.3,a:.6*k,tint:DUST});}}
 // Rotor strike: the blade tip digs in, throws a spray and breaks.
 const tip=at(EVENTS.rotorStrike,'bladeTip');tip[2]=Math.max(0,Math.min(tip[2],.3));
 for(let i=0;i<16;i++){const t=EVENTS.rotorStrike+R()*.2,a=R()*Math.PI*2;add({t,p:tip,v:[Math.cos(a)*(1+R()*2),Math.sin(a)*(1+R()*2),.8+R()],s0:.9,s1:3.6+R(),life:1.4+R(),a:.75,tint:DUST_DEEP});}
 for(let i=0;i<40;i++){const a=R()*Math.PI*2;clod({t:EVENTS.rotorStrike+R()*.12,p:tip,v:[Math.cos(a)*(1+R()*4),Math.sin(a)*(1+R()*4),2+R()*5],shard:i<8});}
 for(const k of fx.clods)k.ground=ground(k.p[0],k.p[1]);
 return fx;
}
function clodAt(k,t){
 const age=t-k.t,h0=k.p[2],vz=k.v[2],g=k.ground,disc=vz*vz+2*GRAVITY*(h0-g),tl=disc>0?(vz+Math.sqrt(disc))/GRAVITY:0;
 const a=Math.min(age,tl),landed=age>=tl;return {x:k.p[0]+k.v[0]*a,y:k.p[1]+k.v[1]*a,h:landed?g:h0+vz*a-GRAVITY*a*a/2,landed};
}
function drawClod(ctx,view,k,s){
 const [x,y]=view.project(s.x,s.y,s.h),r=k.size*view.w/Math.SQRT2;
 ctx.fillStyle=k.shard?(k.tone<.5?'rgb(96,96,58)':'rgb(58,56,48)'):(k.tone<.4?'rgb(124,116,54)':k.tone<.75?'rgb(84,62,38)':'rgb(128,104,70)');
 ctx.beginPath();if(k.shard){ctx.save();ctx.translate(x,y);ctx.rotate(k.rot);ctx.rect(-r*1.2,-r*.35,r*2.4,r*.7);ctx.restore();}else ctx.ellipse(x,y,r,r*.72,k.rot,0,Math.PI*2);ctx.fill();
}
