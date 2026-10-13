// Procedural painted trees, shrubs and rocks for the intro keyframes.
// Each is a flat sprite standing on a ground point; the light comes from the
// upper left / front like the study's sun, shadows fall back and to the right.
import {rng,hash,fbm,LEVEL_HEIGHT,SUN} from './crash-sector.js';
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,smooth01=t=>{t=clamp(t);return t*t*(3-2*t);};
const rgb=(c,k=1,a=1)=>`rgba(${Math.round(clamp(c[0]*k,0,255))},${Math.round(clamp(c[1]*k,0,255))},${Math.round(clamp(c[2]*k,0,255))},${a})`;
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];

// Trees on woodland tiles, a few lone trees and shrubs in the open, nothing in
// the keep-clear shapes (landing pocket, exit lane, descent corridor).
export function planFlora(sector,bounds,{keepClear=[],spacing=1.32,seed=1}={}){
 // Game scale (environment.js TREE_VARIANTS / foliage-models.js): a pine is
 // about 2.3 units tall, the large variant 1.8x. The two-tier rim is 4.24
 // units, so the canopy must not out-top it or the plateau edge disappears.
 const out=[];const [x0,y0,x1,y1]=bounds;
 const blocked=(x,y,r,lone)=>keepClear.some(k=>k.test(x,y,r,lone));
 for(let gy=Math.floor(y0/spacing);gy<=y1/spacing;gy++)for(let gx=Math.floor(x0/spacing);gx<=x1/spacing;gx++){
  const r=rng(hash(gx,gy,seed)*4294967296);
  const x=(gx+.12+r()*.76)*spacing,y=(gy+.12+r()*.76)*spacing;
  if(x<0||y<0||x>sector.W-1||y>sector.H-1)continue;
  const wood=sector.woodAt(x,y),lev=sector.levelAt(x,y);
  // Keep the lip and a scree apron at each cliff foot open, so the rim reads.
  const up=sector.distUp(x,y),down=sector.distDown(x,y);
  // Narrow shelf between the tiers: grass tufts and low shrubs only.
  if(lev===1&&up>.45&&down>.45){if(r()<.42){const rr=.32+r()*.28;if(!blocked(x,y,rr,true))out.push({kind:'shrub',x,y,base:LEVEL_HEIGHT,height:.5+r()*.3,radius:rr,seed:Math.floor(r()*1e9),tint:r()});}continue;}
  if(down<1.1||up<1.7)continue;
  const roll=r();let kind=null,lone=false;
  // Copses and lone trees break up the open ground (the user asked for more
  // trees around the aircraft); clustered by low-frequency noise.
  const copse=fbm(x*.11+40,y*.11,53,3);
  if(wood>.55||(wood>.3&&roll<(wood-.3)/.25))kind=r()<.66?'pine':'broadleaf';
  else if(copse>.5&&roll<.8*smooth01((copse-.5)/.09)){kind=r()<.55?'pine':'broadleaf';lone=true;}
  else if(roll<.045){kind=r()<.5?'pine':'broadleaf';lone=true;}
  else if(roll<.11){kind='shrub';lone=true;}
  else if(wood>.12&&roll<.4)kind='shrub';
  if(!kind)continue;
  // Younger, lower growth on the talus just beyond the apron.
  const talus=up<3.4?.7:1,large=r()<.38;
  const height=(kind==='pine'?(large?3.6+r()*.7:2.3+r()*.7):kind==='broadleaf'?(large?3.5+r()*.8:2.4+r()*.7):.55+r()*.45)*talus;
  const radius=(kind==='pine'?(large?1.05+r()*.25:.72+r()*.2):kind==='broadleaf'?(large?1.3+r()*.3:.9+r()*.25):.38+r()*.3)*talus;
  if(blocked(x,y,kind==='shrub'?radius*.6:radius*.85,lone))continue;
  out.push({kind,x,y,base:lev*LEVEL_HEIGHT,height,radius,seed:Math.floor(r()*1e9),tint:r()});
 }
 return out;
}
export function planRocks(sector,bounds,{keepClear=[],seed=5}={}){
 const out=[];const [x0,y0,x1,y1]=bounds;
 for(let gy=Math.floor(y0);gy<=y1;gy+=1)for(let gx=Math.floor(x0);gx<=x1;gx+=1){
  const r=rng(hash(gx,gy,seed)*4294967296),x=gx+r(),y=gy+r(),lev=sector.levelAt(x,y),up=sector.distUp(x,y),down=sector.distDown(x,y);
  // A few weathered boulders out in the grass, as in the storyboard meadows.
  if(up>1.4&&down>1.2&&sector.woodAt(x,y)<.3){if(r()<.012&&!keepClear.some(k=>k.test(x,y,1.2,true)))out.push({kind:'rock',x,y,base:lev*LEVEL_HEIGHT,height:.25+r()*.4,radius:.35+r()*.5,seed:Math.floor(r()*1e9)});continue;}
  if(up>1.4||up<.15)continue; // scree at the foot of a face
  if(r()>.1+.2*(1-up/1.4))continue;if(keepClear.some(k=>k.test(x,y,.5)))continue;
  out.push({kind:'rock',x,y,base:lev*LEVEL_HEIGHT,height:.18+r()*.35,radius:.22+r()*.4,seed:Math.floor(r()*1e9)});
 }
 return out;
}

// Ground shadow (an ellipse cast back along the sun) drawn before the sprites.
export function drawFloraShadow(ctx,t,view,sprites=null){
 if(t.kind==='rock')return;
 const S=sprites?.[t.kind];
 if(S){// The sprite's own silhouette sheared along the sun onto the ground.
  const sil=S.silhouettes[(t.seed>>1)%S.silhouettes.length],H=(t.kind==='shrub'?t.height*1.25:t.height)*view.hv,W=H*S.aspect,k=H/(sil.height-8),[bx,by]=view.project(t.x,t.y,t.base);
  const sx=-(SUN[0]-SUN[2])/SUN[1]*view.w/2/view.hv,sy=-(SUN[0]+SUN[2])/SUN[1]*view.w/4/view.hv; // screen shift per px of sprite height
  ctx.save();ctx.globalAlpha=.42;ctx.setTransform(...(()=>{const m=ctx.getTransform();return [m.a,m.b,m.c,m.d,m.e,m.f];})());ctx.transform(1,0,-sx,-sy,bx,by);ctx.drawImage(sil,-S.foot*W-4*k,-H-4*k,sil.width*k,sil.height*k);ctx.restore();return;}
 const hc=t.kind==='shrub'?t.height*.45:t.height*.6,dx=-SUN[0]/SUN[1]*hc,dy=-SUN[2]/SUN[1]*hc;
 const [sx,sy]=view.project(t.x+dx,t.y+dy,t.base),ppu=view.w/Math.SQRT2,r=t.radius*ppu*(t.kind==='pine'?.95:1.05);
 const [bx,by]=view.project(t.x,t.y,t.base);
 ctx.save();ctx.fillStyle='rgba(22,30,12,.46)';
 ctx.beginPath();ctx.ellipse(sx,sy,r,r*.55,0,0,Math.PI*2);ctx.fill();
 // Trunk shadow joining crown shadow to the trunk foot.
 ctx.lineWidth=Math.max(1,t.radius*ppu*.22);ctx.strokeStyle='rgba(28,34,16,.3)';ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(sx,sy);ctx.stroke();
 ctx.restore();
}

// The game's own painted foliage (dist/assets/environment/foliage, the sprites
// the 2D game draws). Each is cropped to its alpha, then pre-scaled once with a
// stepwise high-quality downscale into flipped and tinted variants, so a
// forest of thousands repeats three paintings without reading as a pattern.
const FLORA_FILES={pine:'tree-pine.png',broadleaf:'tree-broadleaf.png',shrub:'bush.png'};
const TINTS=['brightness(1.12) saturate(1.1) hue-rotate(-4deg)','brightness(1.0) saturate(1.18) hue-rotate(-8deg)','brightness(1.2) saturate(1.04)','brightness(.92) saturate(1.16)','brightness(1.1) saturate(1.0) sepia(.12)'];
export async function loadFloraSprites(base='../../assets/environment/foliage/',height=200){
 const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('Missing '+src));i.src=src;});
 const out={};
 for(const [kind,file]of Object.entries(FLORA_FILES)){
  const img=await load(base+file),c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
  const d=g.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>40){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  // Trunk foot: the weighted centre of the opaque pixels in the lowest 4 %.
  let sx=0,n=0;for(let y=Math.round(y1-(y1-y0)*.04);y<=y1;y++)for(let x=x0;x<=x1;x++){const a=d[(y*c.width+x)*4+3];if(a>40){sx+=x*a;n+=a;}}
  const cw=x1-x0+1,ch=y1-y0+1,foot=(n?sx/n:(x0+x1)/2)-x0;
  // Stepwise halving keeps the leaf texture from aliasing at sprite size.
  let src=document.createElement('canvas');src.width=cw;src.height=ch;src.getContext('2d').drawImage(img,x0,y0,cw,ch,0,0,cw,ch);
  while(src.height>height*2){const h=document.createElement('canvas');h.width=Math.round(src.width/2);h.height=Math.round(src.height/2);const hg=h.getContext('2d');hg.imageSmoothingQuality='high';hg.drawImage(src,0,0,h.width,h.height);src=h;}
  const W=Math.round(height*cw/ch),variants=[];
  // Ink contour (as on the game's character sprites) and a soft silhouette
  // for the cast shadow, both made once per variant.
  const P=3,silhouettes=[];
  for(const tint of TINTS)for(const flip of [false,true]){
   const body=document.createElement('canvas');body.width=W;body.height=height;const bg=body.getContext('2d');bg.imageSmoothingQuality='high';bg.filter=tint;if(flip){bg.translate(W,0);bg.scale(-1,1);}bg.drawImage(src,0,0,W,height);
   const mask=document.createElement('canvas');mask.width=W;mask.height=height;const mg=mask.getContext('2d');mg.drawImage(body,0,0);mg.globalCompositeOperation='source-in';mg.fillStyle='rgb(40,34,22)';mg.fillRect(0,0,W,height);
   const v=document.createElement('canvas');v.width=W+2*P;v.height=height+2*P;const vg=v.getContext('2d');vg.globalAlpha=.85;for(let k=0;k<12;k++){const a=k/12*Math.PI*2;vg.drawImage(mask,P+Math.cos(a)*1.6,P+Math.sin(a)*1.6);}vg.globalAlpha=1;vg.drawImage(body,P,P);
   variants.push(v);
   if(!flip){const sh=document.createElement('canvas');sh.width=W+8;sh.height=height+8;const sg=sh.getContext('2d');sg.filter='blur(2px)';sg.drawImage(mask,4,4);silhouettes.push(sh);}
  }
  out[kind]={variants,silhouettes,aspect:cw/ch,foot:foot/cw,flipFoot:1-foot/cw,pad:P};
 }
 return out;
}
export function drawFlora(ctx,t,view,sprites=null){
 const S=sprites?.[t.kind];
 if(S){const i=t.seed%S.variants.length,v=S.variants[i],flipped=i%2===1,[bx,by]=view.project(t.x,t.y,t.base);
  // Shrubs are drawn a little taller than their mass so the leaves overhang.
  const H=(t.kind==='shrub'?t.height*1.25:t.height)*view.hv,W=H*S.aspect,fx=(flipped?S.flipFoot:S.foot)*W,k=H/(v.height-2*S.pad);
  ctx.drawImage(v,bx-fx-S.pad*k,by-H*.985-S.pad*k,v.width*k,v.height*k);return;}
 if(t.kind==='pine')return pine(ctx,t,view);
 if(t.kind==='broadleaf')return broadleaf(ctx,t,view);
 if(t.kind==='shrub')return shrub(ctx,t,view);
 return rock(ctx,t,view);
}

function pine(ctx,t,view){
 const r=rng(t.seed),ppu=view.w/Math.SQRT2,hv=view.hv,[bx,by]=view.project(t.x,t.y,t.base);
 const H=t.height*hv,R=t.radius*ppu,tint=t.tint;
 const dark=mixc([14,34,26],[26,42,22],tint),mid=mixc([34,68,46],[56,82,38],tint),lit=mixc([96,130,66],[132,146,68],tint);
 // Trunk.
 ctx.fillStyle=rgb([62,44,30]);ctx.beginPath();ctx.moveTo(bx-R*.09,by);ctx.lineTo(bx-R*.05,by-H*.3);ctx.lineTo(bx+R*.05,by-H*.3);ctx.lineTo(bx+R*.09,by);ctx.closePath();ctx.fill();
 ctx.fillStyle='rgba(20,14,10,.45)';ctx.beginPath();ctx.ellipse(bx,by,R*.32,R*.12,0,0,Math.PI*2);ctx.fill();
 const tiers=6+Math.floor(r()*3),bottom=H*(.14+r()*.06);
 for(let i=0;i<tiers;i++){
  const f=i/(tiers-1),y=by-bottom-(H-bottom)*f*.86,w=R*(1-f*.82)*(.9+r()*.2),th=(H-bottom)/tiers*1.65,droop=th*.28;
  const apexY=y-th,sway=(r()-.5)*R*.08;
  // Tier silhouette: apex, ragged drooping skirt.
  const pts=[[bx+sway,apexY]];const n=7+Math.floor(r()*4);
  for(let k=0;k<=n;k++){const u=k/n,xx=bx+sway+(u*2-1)*w,edge=Math.abs(u*2-1),yy=y+droop*(1-edge*edge)*.4+droop*edge*.9+(k%2?-th*.18*(.6+r()*.6):th*.05);pts.push([xx,yy]);}
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
  for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.closePath();
  const g=ctx.createLinearGradient(bx-w,apexY,bx+w,y+droop);g.addColorStop(0,rgb(lit));g.addColorStop(.42,rgb(mid));g.addColorStop(1,rgb(dark));
  ctx.fillStyle=g;ctx.fill();
  // Shadow band under the tier above.
  ctx.save();ctx.clip();ctx.fillStyle=rgb(dark,.8,.55);ctx.beginPath();ctx.ellipse(bx+sway,apexY+th*.18,w*.55,th*.22,0,0,Math.PI*2);ctx.fill();
  // Needle strokes.
  ctx.lineCap='round';
  for(let k=0;k<14+w*.5;k++){const u=r()*2-1,xx=bx+sway+u*w*.92,yy=apexY+th*(.35+r()*.6)+Math.abs(u)*droop*.6,len=th*(.18+r()*.22),litSide=u<.1&&r()<.75;
   ctx.strokeStyle=litSide?rgb(lit,1.05+r()*.15,.8):rgb(dark,.85,.6);ctx.lineWidth=Math.max(.7,R*.035);ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+u*len*.5,yy+len*.7);ctx.stroke();}
  ctx.restore();
 }
}

function broadleaf(ctx,t,view){
 const r=rng(t.seed),ppu=view.w/Math.SQRT2,hv=view.hv,[bx,by]=view.project(t.x,t.y,t.base);
 const H=t.height*hv,R=t.radius*ppu,tint=t.tint;
 const dark=mixc([30,48,20],[44,50,20],tint),mid=mixc([82,110,40],[104,114,40],tint),lit=mixc([156,172,78],[184,174,82],tint);
 // Trunk with a fork.
 ctx.strokeStyle=rgb([78,60,42]);ctx.lineCap='round';
 ctx.lineWidth=R*.17;ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo(bx-R*.05,by-H*.3,bx-R*.02,by-H*.45);ctx.stroke();
 ctx.lineWidth=R*.08;ctx.beginPath();ctx.moveTo(bx-R*.02,by-H*.4);ctx.lineTo(bx-R*.35,by-H*.62);ctx.moveTo(bx-R*.02,by-H*.42);ctx.lineTo(bx+R*.3,by-H*.66);ctx.stroke();
 ctx.fillStyle='rgba(20,14,10,.45)';ctx.beginPath();ctx.ellipse(bx,by,R*.3,R*.11,0,0,Math.PI*2);ctx.fill();
 // Crown: overlapping lumpy masses, back/top first.
 const cy=by-H*.66,n=8+Math.floor(r()*5),blobs=[];
 for(let i=0;i<n;i++){const a=r()*Math.PI*2,d=Math.sqrt(r());blobs.push({x:bx+Math.cos(a)*d*R*.62,y:cy+Math.sin(a)*d*R*.5-r()*R*.15,r:R*(.36+r()*.24)});}
 blobs.sort((a,b)=>a.y-b.y);
 // Dark underside mass first so gaps read as depth, not sky.
 ctx.fillStyle=rgb(dark,.9);ctx.beginPath();ctx.ellipse(bx,cy+R*.08,R*.95,R*.62,0,0,Math.PI*2);ctx.fill();
 for(const b of blobs){
  const pts=[],m=11;for(let k=0;k<m;k++){const a=k/m*Math.PI*2,rr=b.r*(.84+r()*.28);pts.push([b.x+Math.cos(a)*rr,b.y+Math.sin(a)*rr*.86]);}
  ctx.beginPath();ctx.moveTo((pts[0][0]+pts[m-1][0])/2,(pts[0][1]+pts[m-1][1])/2);
  for(let k=0;k<m;k++){const p=pts[k],q=pts[(k+1)%m];ctx.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2);}ctx.closePath();
  const g=ctx.createRadialGradient(b.x-b.r*.45,b.y-b.r*.5,b.r*.1,b.x,b.y,b.r*1.15);g.addColorStop(0,rgb(lit));g.addColorStop(.5,rgb(mid));g.addColorStop(1,rgb(dark));
  ctx.fillStyle=g;ctx.fill();
  // Leaf dabs.
  for(let k=0;k<10+b.r*.4;k++){const a=r()*Math.PI*2,d=Math.sqrt(r())*b.r*.9,xx=b.x+Math.cos(a)*d,yy=b.y+Math.sin(a)*d*.86,litSide=(Math.cos(a)+Math.sin(a))<-.2;
   ctx.fillStyle=litSide?rgb(lit,1.05+r()*.12,.75):rgb(dark,.85,.5);ctx.beginPath();ctx.ellipse(xx,yy,Math.max(.8,b.r*.13),Math.max(.6,b.r*.08),r()*Math.PI,0,Math.PI*2);ctx.fill();}
 }
}

function shrub(ctx,t,view){
 const r=rng(t.seed),ppu=view.w/Math.SQRT2,[bx,by]=view.project(t.x,t.y,t.base),R=t.radius*ppu;
 const dark=[44,62,28],mid=[90,112,46],lit=[146,160,76];
 ctx.fillStyle='rgba(20,14,10,.35)';ctx.beginPath();ctx.ellipse(bx,by,R*.9,R*.32,0,0,Math.PI*2);ctx.fill();
 for(let i=0;i<4;i++){const x=bx+(r()-.5)*R*.9,y=by-R*(.35+r()*.35),rr=R*(.42+r()*.25);
  const g=ctx.createRadialGradient(x-rr*.4,y-rr*.45,rr*.1,x,y,rr*1.1);g.addColorStop(0,rgb(lit));g.addColorStop(.55,rgb(mid));g.addColorStop(1,rgb(dark));
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,rr,rr*.8,0,0,Math.PI*2);ctx.fill();}
}

function rock(ctx,t,view){
 // A weathered grey boulder: irregular crown, lit left, shaded right flank,
 // ink contour, a crack, and grass growing over its foot.
 const r=rng(t.seed),ppu=view.w/Math.SQRT2,[bx,by]=view.project(t.x,t.y,t.base),R=t.radius*ppu,Hh=Math.max(R*.42,t.height*view.hv);
 const n=13,pts=[];for(let k=0;k<n;k++){const a=Math.PI+k/(n-1)*Math.PI,rr=R*(.72+r()*.4),lift=Math.pow(Math.abs(Math.sin(a)),.7)*Hh*(.7+r()*.45);pts.push([bx+Math.cos(a)*rr,by-lift]);}
 const outline=()=>{ctx.beginPath();ctx.moveTo(bx-R*.95,by+R*.08);for(const p of pts)ctx.lineTo(p[0],p[1]);ctx.lineTo(bx+R*.95,by+R*.08);ctx.quadraticCurveTo(bx,by+R*.42,bx-R*.95,by+R*.08);ctx.closePath();};
 ctx.fillStyle='rgba(28,26,18,.34)';ctx.beginPath();ctx.ellipse(bx+R*.4,by+R*.12,R*1.15,R*.36,0,0,Math.PI*2);ctx.fill();
 outline();const g=ctx.createLinearGradient(bx-R,by-Hh,bx+R*.8,by+R*.2);g.addColorStop(0,'rgb(190,186,172)');g.addColorStop(.45,'rgb(150,146,134)');g.addColorStop(1,'rgb(86,86,82)');ctx.fillStyle=g;ctx.fill();
 // Shaded right flank.
 ctx.save();outline();ctx.clip();ctx.fillStyle='rgba(60,64,76,.38)';ctx.beginPath();ctx.moveTo(bx+R*(.05+r()*.2),by-Hh*1.2);ctx.lineTo(bx+R*1.2,by-Hh*.4);ctx.lineTo(bx+R*1.2,by+R);ctx.lineTo(bx+R*(r()*.2-.1),by+R);ctx.closePath();ctx.fill();ctx.restore();
 ctx.strokeStyle='rgba(42,36,28,.9)';ctx.lineWidth=Math.max(1,ppu*.028);ctx.lineJoin='round';outline();ctx.stroke();
 if(r()<.75){ctx.lineWidth=Math.max(.7,ppu*.016);ctx.beginPath();const cx=bx+(r()-.6)*R*.7;ctx.moveTo(cx,by-Hh*(.55+r()*.3));ctx.lineTo(cx+(r()-.5)*R*.35,by-Hh*(.2+r()*.2));ctx.stroke();}
 // Grass over the foot.
 ctx.lineWidth=Math.max(1,ppu*.022);for(let k=0;k<9;k++){const gx=bx+(r()-.5)*R*2.1,gy=by+R*(.05+r()*.2),len=ppu*(.12+r()*.16),an=(r()-.5)*.8;ctx.strokeStyle=r()<.5?'rgba(120,118,52,.9)':'rgba(176,160,84,.9)';ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx+Math.sin(an)*len,gy-Math.cos(an)*len);ctx.stroke();}
}
