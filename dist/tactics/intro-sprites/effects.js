// 2D effect layers for the intro sprite proof: spinning rotor disc, smoke and
// dust puffs, skid gouges, missiles and the impact flash. Puffs reuse the
// painted smoke atlas (dist/assets/effects/painted-fire/smoke-atlas-v1.png).
import {rng} from './crash-sector.js';
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;

// Spinning main rotor: a translucent disc in the blade plane with streaks.
export function rotorDisc(ctx,{hub,u,v},{alpha=1,seed=3,speed=1,angle=null}={}){
 const r=rng(seed);ctx.save();ctx.translate(hub[0],hub[1]);ctx.transform(u[0],u[1],v[0],v[1],0,0);
 const g=ctx.createRadialGradient(0,0,.08,0,0,1);g.addColorStop(0,`rgba(60,58,44,${.05*alpha})`);g.addColorStop(.75,`rgba(60,58,44,${.12*alpha})`);g.addColorStop(.97,`rgba(52,50,38,${.24*alpha})`);g.addColorStop(1,'rgba(52,50,38,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();
 // Blade streaks: two motion-blurred arcs (a two-blade rotor) plus faint ghosts.
 const base=angle??r()*Math.PI*2;ctx.lineCap='round';
 for(let b=0;b<2;b++)for(let k=0;k<4;k++){const a0=base+b*Math.PI-k*.16*speed,len=(.5+k*.12)*speed;
  ctx.strokeStyle=`rgba(46,44,32,${(.26-k*.06)*alpha})`;ctx.lineWidth=(.06-k*.011);
  ctx.beginPath();ctx.arc(0,0,.62+k*.08,a0-len,a0);ctx.stroke();}
 // Tip path ring.
 ctx.strokeStyle=`rgba(232,224,190,${.14*alpha})`;ctx.lineWidth=.014;ctx.beginPath();ctx.arc(0,0,.985,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}

// --- animated proof ---------------------------------------------------------
// A billowy puff: the head (upper half) of one painted smoke column, tinted.
const puffCache=new Map();
export function puffSprite(img,cell,tint){
 const key=cell+'|'+tint;if(puffCache.has(key))return puffCache.get(key);
 const s=img.width/2,h=Math.round(s*.56),c=document.createElement('canvas');c.width=s;c.height=h;const g=c.getContext('2d');
 g.drawImage(img,(cell%2)*s,(cell>>1)*s,s,h,0,0,s,h);
 // 'atop:' tints wash colour over the paint (light dust keeps its value);
 // plain tints multiply (smoke darkens).
 if(tint?.startsWith('atop:')){g.globalCompositeOperation='source-atop';g.fillStyle=tint.slice(5);g.fillRect(0,0,s,h);}
 else if(tint){g.globalCompositeOperation='multiply';g.fillStyle=tint;g.fillRect(0,0,s,h);g.globalCompositeOperation='destination-in';g.drawImage(img,(cell%2)*s,(cell>>1)*s,s,h,0,0,s,h);}
 // Feather the cut along the bottom so a puff never shows a straight edge.
 g.globalCompositeOperation='destination-in';const f=g.createLinearGradient(0,h*.55,0,h);f.addColorStop(0,'rgba(0,0,0,1)');f.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=f;g.fillRect(0,0,s,h);
 // Puffs never draw wider than ~250 px, so keep a 256 px copy: a quarter of the
 // pixels to upload and sample per draw.
 const W=256,H=Math.round(W*h/s),small=document.createElement('canvas');small.width=W;small.height=H;
 const half=document.createElement('canvas');half.width=Math.round(s/2);half.height=Math.round(h/2);const hg=half.getContext('2d');hg.imageSmoothingQuality='high';hg.drawImage(c,0,0,half.width,half.height);
 const sg=small.getContext('2d');sg.imageSmoothingQuality='high';sg.drawImage(half,0,0,W,H);
 puffCache.set(key,small);return small;
}
export function puff(ctx,img,{x,y,size,cell=0,tint=null,alpha=1,flip=false,angle=0}){
 const c=puffSprite(img,cell,tint),w=size,h=size*c.height/c.width;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);if(angle)ctx.rotate(angle);if(flip)ctx.scale(-1,1);ctx.drawImage(c,-w/2,-h*.62,w,h);ctx.restore();
}

// A growing skid gouge. Its width profile and torn-turf clumps are fixed in
// world x along the FINAL length, so extending it never reshuffles what is
// already drawn.
export function gouge(ctx,view,{x0,xEnd,xNow,lanes,seed=23}){
 if(xNow<=x0+.02)return;
 const ppu=view.w/Math.SQRT2,L=xEnd-x0,steps=Math.max(8,Math.round((xNow-x0)*8));
 for(const [li,yc] of lanes.entries()){
  const r=rng(seed+li*101),wander=r()*6,line=x=>yc+Math.sin((x-x0)/L*2.3+wander)*.08*((x-x0)/L),half=(x,k)=>(.06+.22*Math.pow(clamp((x-x0)/L),.6))*k;
  const band=(k,fill)=>{ctx.beginPath();for(let i=0;i<=steps;i++){const x=x0+(xNow-x0)*i/steps,[a,b]=view.project(x,line(x)-half(x,k),0);i?ctx.lineTo(a,b):ctx.moveTo(a,b);}
   for(let i=steps;i>=0;i--){const x=x0+(xNow-x0)*i/steps,[a,b]=view.project(x,line(x)+half(x,k),0);ctx.lineTo(a,b);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();};
  band(2.1,'rgba(142,116,78,.55)');band(1.35,'rgba(104,78,50,.92)');band(.75,'rgba(64,46,30,.95)');band(.3,'rgba(40,28,18,.9)');
  const n=Math.round(L*14);
  for(let i=0;i<n;i++){const u=Math.pow(r(),.7),x=x0+L*u,side=r()<.5?-1:1,off=r()*.25,s=(.05+r()*.11)*ppu*(.6+u*.6),rot=r()*Math.PI,tone=r(),tone2=r();
   if(x>xNow)continue;const [a,b]=view.project(x,line(x)+side*(half(x,1.6)+off),0);
   ctx.save();ctx.translate(a,b);ctx.rotate(rot);ctx.fillStyle=tone<.45?'rgba(124,116,54,.95)':tone2<.5?'rgba(84,62,38,.95)':'rgba(132,108,72,.95)';
   ctx.beginPath();ctx.moveTo(-s,0);ctx.lineTo(-s*.2,-s*.6);ctx.lineTo(s,-s*.2);ctx.lineTo(s*.4,s*.5);ctx.closePath();ctx.fill();ctx.restore();}
  // Soil shoved ahead of the skid tip.
  const rr=rng(seed+li*7);for(let i=0;i<7;i++){const dx=.1+rr()*.35,dy=(rr()-.5)*.6,s=(.1+rr()*.16)*ppu,tone=rr(),rot=rr()*3,[cx,cy]=view.project(xNow+dx,line(xNow)+dy,0);ctx.fillStyle=tone<.5?'rgba(128,102,68,.9)':'rgba(92,70,44,.9)';ctx.beginPath();ctx.ellipse(cx,cy,s,s*.6,rot,0,Math.PI*2);ctx.fill();}
 }
}

// A missile in flight: white body, red nose, exhaust glow (plate px).
export function missile(ctx,[tx,ty],[nx,ny],{width=3}={}){
 ctx.save();ctx.lineCap='round';
 const g=ctx.createRadialGradient(tx,ty,0,tx,ty,width*4);g.addColorStop(0,'rgba(255,250,220,.95)');g.addColorStop(.35,'rgba(255,190,90,.75)');g.addColorStop(1,'rgba(255,120,40,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(tx,ty,width*4,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='rgb(236,234,226)';ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(nx,ny);ctx.stroke();
 const k=.22;ctx.strokeStyle='rgb(176,40,30)';ctx.beginPath();ctx.moveTo(nx+(tx-nx)*k,ny+(ty-ny)*k);ctx.lineTo(nx,ny);ctx.stroke();
 ctx.restore();
}
// Impact flash: a hot core and a short-lived star of sparks.
export function flash(ctx,[x,y],{radius,age,seed=41}){
 const r=rng(seed),life=.38,u=clamp(age/life);if(u>=1)return;
 const core=radius*(.4+1.2*Math.sqrt(u)),a=1-u;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const g=ctx.createRadialGradient(x,y,0,x,y,core);g.addColorStop(0,`rgba(255,252,230,${a})`);g.addColorStop(.3,`rgba(255,214,120,${.85*a})`);g.addColorStop(.7,`rgba(255,120,40,${.5*a})`);g.addColorStop(1,'rgba(255,90,20,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,core,0,Math.PI*2);ctx.fill();
 ctx.lineCap='round';for(let i=0;i<14;i++){const ang=r()*Math.PI*2,len=radius*(.8+r()*1.6)*Math.sqrt(u),l0=len*.55;ctx.strokeStyle=`rgba(255,226,150,${.9*a})`;ctx.lineWidth=Math.max(1,radius*.05);
  ctx.beginPath();ctx.moveTo(x+Math.cos(ang)*l0,y+Math.sin(ang)*l0);ctx.lineTo(x+Math.cos(ang)*(l0+len*.5),y+Math.sin(ang)*(l0+len*.5));ctx.stroke();}
 ctx.restore();
}
