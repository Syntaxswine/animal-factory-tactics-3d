// 2D effect layers for the intro keyframes: spinning rotor disc, smoke, dust,
// skid furrows and debris. Smoke and dust reuse the painted smoke atlas
// (dist/assets/effects/painted-fire/smoke-atlas-v1.png, 2 x 2 columns).
import {rng,SUN} from './crash-sector.js';
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;

// A painted column from the atlas, its base at (x,y), growing along `angle`
// (radians from screen-up, clockwise), tinted and faded.
const tintCache=new Map();
function tinted(img,cell,tint){
 const key=cell+'|'+tint;if(tintCache.has(key))return tintCache.get(key);
 const s=img.width/2,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
 g.drawImage(img,(cell%2)*s,(cell>>1)*s,s,s,0,0,s,s);
 if(tint){g.globalCompositeOperation='multiply';g.fillStyle=tint;g.fillRect(0,0,s,s);g.globalCompositeOperation='destination-in';g.drawImage(img,(cell%2)*s,(cell>>1)*s,s,s,0,0,s,s);}
 tintCache.set(key,c);return c;
}
export function plume(ctx,img,{cell=0,x,y,angle=0,length,width,alpha=1,tint=null,flip=false}){
 const c=tinted(img,cell,tint),s=c.width;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);if(flip)ctx.scale(-1,1);
 // The columns' bases sit near the bottom of each cell (about 8% margin).
 ctx.drawImage(c,-width/2,-length*.94,width,length);ctx.restore();
}

// Spinning main rotor: a translucent disc in the blade plane with streaks.
export function rotorDisc(ctx,{hub,u,v},{alpha=1,seed=3,speed=1}={}){
 const r=rng(seed);ctx.save();ctx.translate(hub[0],hub[1]);ctx.transform(u[0],u[1],v[0],v[1],0,0);
 const g=ctx.createRadialGradient(0,0,.08,0,0,1);g.addColorStop(0,`rgba(60,58,44,${.05*alpha})`);g.addColorStop(.75,`rgba(60,58,44,${.12*alpha})`);g.addColorStop(.97,`rgba(52,50,38,${.24*alpha})`);g.addColorStop(1,'rgba(52,50,38,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();
 // Blade streaks: two motion-blurred arcs (a two-blade rotor) plus faint ghosts.
 const base=r()*Math.PI*2;ctx.lineCap='round';
 for(let b=0;b<2;b++)for(let k=0;k<4;k++){const a0=base+b*Math.PI-k*.16*speed,len=(.5+k*.12)*speed;
  ctx.strokeStyle=`rgba(46,44,32,${(.42-k*.09)*alpha})`;ctx.lineWidth=(.07-k*.012);
  ctx.beginPath();ctx.arc(0,0,.62+k*.08,a0-len,a0);ctx.stroke();}
 // Tip path ring.
 ctx.strokeStyle=`rgba(232,224,190,${.22*alpha})`;ctx.lineWidth=.018;ctx.beginPath();ctx.arc(0,0,.985,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}

// Dust burst around a ground contact: a ring of tan puffs pushed outward by
// the rotor wash, heavier on the side the aircraft slides away from.
export function dustBurst(ctx,img,view,{x,y,h=0,radius=4,seed=11,strength=1,bias=[-1,0]}){
 const r=rng(seed),ppu=view.w/Math.SQRT2,pts=[];
 for(let i=0;i<26;i++){const a=r()*Math.PI*2,d=radius*(.45+r()*.75),bx=Math.cos(a),by=Math.sin(a),push=1+.6*Math.max(0,bx*bias[0]+by*bias[1]);
  const px=x+bx*d*push,py=y+by*d*push,[sx,sy]=view.project(px,py,h);pts.push({sx,sy,size:(1.6+r()*2.2)*ppu*strength,cell:Math.floor(r()*4),flip:r()<.5,ang:(r()-.5)*.9+Math.atan2(sx-view.project(x,y,h)[0],-(sy-view.project(x,y,h)[1]))*.35,alpha:.55+r()*.35});}
 pts.sort((a,b)=>a.sy-b.sy);
 for(const p of pts)plume(ctx,img,{cell:p.cell,x:p.sx,y:p.sy+p.size*.2,angle:p.ang,length:p.size*1.25,width:p.size*1.15,alpha:p.alpha*strength,tint:'rgb(236,206,150)',flip:p.flip});
}
// Clods and grit thrown from the contact.
export function clods(ctx,view,{x,y,h=0,radius=5,seed=17,count=60,lift=2.5}){
 const r=rng(seed);
 for(let i=0;i<count;i++){const a=r()*Math.PI*2,d=radius*(.3+r()),z=h+r()*lift,[sx,sy]=view.project(x+Math.cos(a)*d,y+Math.sin(a)*d,z),s=(.06+r()*.14)*view.w/Math.SQRT2;
  ctx.fillStyle=r()<.5?'rgba(74,56,36,.9)':'rgba(112,90,60,.85)';ctx.beginPath();ctx.ellipse(sx,sy,s,s*.75,r()*3,0,Math.PI*2);ctx.fill();}
}

// Skid furrows: each skid ploughs a trench from the touchdown point forward to
// its tip (world +x is the slide direction). The trench widens and deepens as
// the load comes on, turf is torn up along both lips and soil piles in front.
export function furrows(ctx,view,{x0,x1,lanes,seed=23}){
 const r=rng(seed),ppu=view.w/Math.SQRT2,L=Math.max(.05,x1-x0),steps=Math.max(10,Math.round(L*6));
 for(const yc of lanes){
  const wander=r()*6,line=t=>yc+Math.sin(t*2.3+wander)*.08*t,half=(t,k)=>(.06+.22*Math.pow(t,.6))*k;
  const band=(k,fill)=>{ctx.beginPath();for(let i=0;i<=steps;i++){const t=i/steps,[a,b]=view.project(x0+L*t,line(t)-half(t,k)*(1+(r()-.5)*.25),0);i?ctx.lineTo(a,b):ctx.moveTo(a,b);}
   for(let i=steps;i>=0;i--){const t=i/steps,[a,b]=view.project(x0+L*t,line(t)+half(t,k)*(1+(r()-.5)*.25),0);ctx.lineTo(a,b);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();};
  band(2.1,'rgba(142,116,78,.55)');band(1.35,'rgba(104,78,50,.92)');band(.75,'rgba(64,46,30,.95)');band(.3,'rgba(40,28,18,.9)');
  // Torn turf and clods along the lips, more where the trench is deep.
  for(let i=0;i<L*14;i++){const t=Math.pow(r(),.7),side=r()<.5?-1:1,x=x0+L*t,y=line(t)+side*(half(t,1.6)+r()*.25),[a,b]=view.project(x,y,0),s=(.05+r()*.11)*ppu*(.6+t*.6);
   ctx.save();ctx.translate(a,b);ctx.rotate(r()*Math.PI);ctx.fillStyle=r()<.45?'rgba(92,118,46,.95)':r()<.5?'rgba(84,62,38,.95)':'rgba(132,108,72,.95)';
   ctx.beginPath();ctx.moveTo(-s,0);ctx.lineTo(-s*.2,-s*.6);ctx.lineTo(s,-s*.2);ctx.lineTo(s*.4,s*.5);ctx.closePath();ctx.fill();ctx.restore();}
  // Soil heaped in front of the skid tip.
  const [hx,hy]=view.project(x1+.15,line(1),0);
  for(let i=0;i<7;i++){const [cx,cy]=view.project(x1+.1+r()*.35,line(1)+(r()-.5)*.6,0),s=(.1+r()*.16)*ppu;ctx.fillStyle=r()<.5?'rgba(128,102,68,.9)':'rgba(92,70,44,.9)';ctx.beginPath();ctx.ellipse(cx,cy,s,s*.6,r()*3,0,Math.PI*2);ctx.fill();}
 }
}

// Small debris: panel shards and grit near the wreck.
export function debris(ctx,view,{x,y,radius=5,seed=31,count=26}){
 const r=rng(seed);
 for(let i=0;i<count;i++){const a=r()*Math.PI*2,d=radius*(.4+r()*.8),[sx,sy]=view.project(x+Math.cos(a)*d,y+Math.sin(a)*d*.8,0),s=(.1+r()*.22)*view.w/Math.SQRT2;
  ctx.save();ctx.translate(sx,sy);ctx.rotate(r()*Math.PI);ctx.fillStyle='rgba(30,26,18,.35)';ctx.fillRect(-s*.6,-s*.1,s*1.3,s*.5);
  ctx.fillStyle=r()<.55?'rgb(108,104,58)':r()<.5?'rgb(70,66,52)':'rgb(150,140,110)';ctx.beginPath();ctx.moveTo(-s*.6,0);ctx.lineTo(s*.2,-s*.35);ctx.lineTo(s*.65,-s*.05);ctx.lineTo(0,s*.25);ctx.closePath();ctx.fill();ctx.restore();}
}

// Ground shadow of the aircraft: the baked flattened silhouette, softened with
// altitude, dropped along the sun onto whatever level lies below.
export function aircraftShadow(ctx,view,img,sprite,{x,y,h,ground=0,k}){
 const dx=-SUN[0]/SUN[1]*(h-ground),dy=-SUN[2]/SUN[1]*(h-ground),[sx,sy]=view.project(x+dx,y+dy,ground);
 ctx.save();const alt=Math.max(0,h-ground);ctx.globalAlpha=clamp(.55-alt*.012,.2,.55);ctx.filter=`blur(${(1+alt*.22)*view.w/48}px)`;
 ctx.drawImage(img,sx-sprite.anchor[0]*k,sy-sprite.anchor[1]*k,sprite.size[0]*k,sprite.size[1]*k);ctx.restore();
}
