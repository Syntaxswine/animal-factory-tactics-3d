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
  else if(roll<.05){kind='shrub';lone=true;}
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
  const r=rng(hash(gx,gy,seed)*4294967296),x=gx+r(),y=gy+r(),lev=sector.levelAt(x,y),up=sector.distUp(x,y);
  if(up>1.6||up<.15)continue; // scree at the foot of a face
  if(r()>.22+.3*(1-up/1.6))continue;if(keepClear.some(k=>k.test(x,y,.5)))continue;
  out.push({kind:'rock',x,y,base:lev*LEVEL_HEIGHT,height:.18+r()*.35,radius:.22+r()*.4,seed:Math.floor(r()*1e9)});
 }
 return out;
}

// Ground shadow (an ellipse cast back along the sun) drawn before the sprites.
export function drawFloraShadow(ctx,t,view){
 if(t.kind==='rock')return;
 const hc=t.kind==='shrub'?t.height*.45:t.height*.6,dx=-SUN[0]/SUN[1]*hc,dy=-SUN[2]/SUN[1]*hc;
 const [sx,sy]=view.project(t.x+dx,t.y+dy,t.base),ppu=view.w/Math.SQRT2,r=t.radius*ppu*(t.kind==='pine'?.95:1.05);
 const [bx,by]=view.project(t.x,t.y,t.base);
 ctx.save();ctx.fillStyle='rgba(22,30,12,.46)';
 ctx.beginPath();ctx.ellipse(sx,sy,r,r*.55,0,0,Math.PI*2);ctx.fill();
 // Trunk shadow joining crown shadow to the trunk foot.
 ctx.lineWidth=Math.max(1,t.radius*ppu*.22);ctx.strokeStyle='rgba(28,34,16,.3)';ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(sx,sy);ctx.stroke();
 ctx.restore();
}

export function drawFlora(ctx,t,view){
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
 const r=rng(t.seed),ppu=view.w/Math.SQRT2,[bx,by]=view.project(t.x,t.y,t.base),R=t.radius*ppu,Hh=t.height*view.hv;
 const pts=[];const n=7;for(let k=0;k<n;k++){const a=Math.PI+k/(n-1)*Math.PI,rr=R*(.75+r()*.35);pts.push([bx+Math.cos(a)*rr,by+Math.sin(a)*Hh*(.9+r()*.3)*(k===0||k===n-1?.1:1)]);}
 ctx.fillStyle='rgba(30,26,18,.35)';ctx.beginPath();ctx.ellipse(bx+R*.2,by,R*1.05,R*.35,0,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.moveTo(bx-R,by+R*.12);for(const p of pts)ctx.lineTo(p[0],p[1]);ctx.lineTo(bx+R,by+R*.12);ctx.closePath();
 const g=ctx.createLinearGradient(bx-R,by-Hh,bx+R,by);g.addColorStop(0,'rgb(196,184,156)');g.addColorStop(.55,'rgb(140,128,104)');g.addColorStop(1,'rgb(82,74,60)');ctx.fillStyle=g;ctx.fill();
 ctx.strokeStyle='rgba(50,44,34,.5)';ctx.lineWidth=1;ctx.stroke();
}
