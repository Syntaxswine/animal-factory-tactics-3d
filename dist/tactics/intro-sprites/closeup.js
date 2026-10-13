// The close-up of the drop past the cliff: the same map solid, stretched into a
// butte (HEIGHT_SCALE.closeup), painted once through a perspective lens.
// The user, 2026-10-12, on round 2: "maybe its as simple as having another shot
// of the descent. a prior shot ... where its zoomed in to show the scale and
// detail of the cliff." The camera floats out over the lowland looking along
// the wall, so the cliff recedes to the right and the aircraft's nose (+x)
// stays toward screen right, as in every other shot.
import {buildSector,shadeTop,shadeFace,setGroundTextures,groundLod,HEIGHT_SCALE,ROCK_DETAIL,ROCK_KEY,fbm,vnoise,hash,rng} from './crash-sector.js';
import {planFlora,planRocks,planLedges,floraVariant} from './painted-trees.js';
import {keepClear,HAZE_COLOR} from './plate.js';
import {splitToneCanvas} from './grade.js';
import {CLOSEUP} from './trajectory.js';
export {CLOSEUP};

// Tile coordinates (x, y, h). The plate is the 1600 x 900 window plus a margin
// for the 2D push-in and follow pan the player applies.
export const CLOSEUP_CAMERA=Object.freeze({pos:[180.5,139.5,19],target:[180.5,98,11.5],hfov:50,plate:[1760,990],window:[1600,900]});
// Atmospheric perspective: clear to t0 tiles, then a veil that thickens with distance.
export const CLOSEUP_HAZE=Object.freeze({t0:28,k:.009,max:.85});
// Light raking along the wall from its near end (crash-sector.js ROCK_KEY, the
// wide shots' key too): it lights the main face obliquely and the facets turned
// toward the near end brightest.
const KEY=ROCK_KEY;
const INK=[40,34,26],TMAX=1200;
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,smooth=(a,b,t)=>{t=clamp((t-a)/(b-a));return t*t*(3-2*t);};
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const HAZE=HAZE_COLOR.split(',').map(Number);
export const closeupSpec=()=>({camera:CLOSEUP_CAMERA,heightScale:HEIGHT_SCALE.closeup,detail:ROCK_DETAIL.closeup,haze:CLOSEUP_HAZE});

// --- the lens -------------------------------------------------------------------
// Right, up and forward in tile coordinates; the same basis three.js builds for
// a camera looking along f with world up (X, Y, Z) = (x, h, y).
// scale < 1 paints a smaller preview of the same picture.
export function closeupView(cam=CLOSEUP_CAMERA,scale=1){
 const W=Math.round(cam.plate[0]*scale),H=Math.round(cam.plate[1]*scale),cx=W/2,cy=H/2,focal=(cam.window[0]*scale/2)/Math.tan(cam.hfov*Math.PI/360),C=cam.pos;
 const d=[cam.target[0]-C[0],cam.target[1]-C[1],cam.target[2]-C[2]],n=Math.hypot(...d),f=d.map(v=>v/n);
 const rn=Math.hypot(f[0],f[1]),right=[-f[1]/rn,f[0]/rn,0];
 // up = cross(right, f) in (X,Y,Z) = (x,h,y), written back in (x,y,h).
 const up=[-right[1]*f[2],right[0]*f[2],right[1]*f[0]-right[0]*f[1]];
 const cam3=(x,y,h)=>{const a=x-C[0],b=y-C[1],c=h-C[2];return [a*right[0]+b*right[1]+c*right[2],a*up[0]+b*up[1]+c*up[2],a*f[0]+b*f[1]+c*f[2]];};
 const project=(x,y,h)=>{const [xc,yc,zc]=cam3(x,y,h);if(zc<.05)return null;return [cx+focal*xc/zc,cy-focal*yc/zc];};
 const zOf=(x,y,h)=>cam3(x,y,h)[2];
 const ray=(px,py)=>{const a=(px-cx)/focal,b=(cy-py)/focal,v=[f[0]+a*right[0]+b*up[0],f[1]+a*right[1]+b*up[1],f[2]+a*right[2]+b*up[2]],l=Math.hypot(...v);return [v[0]/l,v[1]/l,v[2]/l];};
 return {W,H,cx,cy,focal,C,f,right,up,project,ray,cam3,
  depth:(x,y,h)=>-zOf(x,y,h),            // larger = nearer, as the iso views
  scaleAt:(x,y,h)=>focal/Math.max(.05,zOf(x,y,h)), // px per tile at that point
  dist:(x,y,h)=>Math.hypot(x-C[0],y-C[1],h-C[2])};
}
export const closeupHazeAt=(t,H=CLOSEUP_HAZE)=>H.max*(1-Math.exp(-H.k*Math.max(0,t-H.t0)));

// --- ray tracing the solid ---------------------------------------------------
// Bands between tier tops: above 2LH nothing is solid; in (LH, 2LH] only tier 2;
// in (0, LH] tiers 1 and 2; at 0 the ground. Within a band the ray sphere-steps
// on the 2D distance to that band's rock and walks the displaced surface only
// within MARGIN tiles of it; a downward band crossing over rock is a tier top.
export function traceRay(S,o,d,tMax=TMAX){
 const LH=S.LH,hz=Math.hypot(d[0],d[1]);let t=0;
 const at=t=>[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t];
 for(let it=0;it<4000&&t<tMax;it++){
  const [x,y,h]=at(t);
  if(h<=0)return {t,x,y,h:0,kind:'top',lev:0};
  const k=h>2*LH?3:h>LH?2:1;
  let tExit=Infinity,down=false;
  if(d[2]<-1e-9){tExit=((k-1)*LH-o[2])/d[2];down=true;}else if(d[2]>1e-9&&k<3)tExit=(k*LH-o[2])/d[2];
  if(k<3){
   // Coarse: the signed distance to this band's tier outline, less the
   // largest relief, is a safe step toward the rock. At least 0.1 tile: a ray
   // running alongside the outline just beyond M otherwise takes ever shorter
   // steps and runs out of iterations short of the rock (measured: 3.8% of the
   // close-up's rock pixels missed). M keeps 0.3 of margin, so 0.1 is safe.
   const M=S.ROUT+.3,D=-S.sdAt(k,x,y);
   if(D>M){const step=hz>1e-9?Math.max(.1,D-M)/hz:Infinity;if(t+step<tExit){t+=step;continue;}t=tExit;}
   else{
    // Fine: step on the rock function (a plan distance, relief included);
    // leave as soon as the ray is clear of the outline again. The relief is
    // not a true distance (worn tops and fracture steps change by many tiles
    // per tile of height), so steps stay short or rays slip through the rock.
    let prev=t,hit=false;
    for(;;){const [x0,y0,h0]=at(t),g=S.rockG(k,x0,y0,h0);
     if(g>=0){hit=true;break;}
     let tt=t+Math.max(.02,Math.min(.1,-g*.3))/Math.max(hz,.05),last=false;if(tt>=tExit){tt=tExit;last=true;}
     const [x1,y1,h1]=at(last?tt-1e-7:tt);
     if(S.rockG(k,x1,y1,h1)>=0){prev=t;t=tt;hit=true;break;}
     prev=t;t=tt;if(last||-S.sdAt(k,x1,y1)>M+.4)break;}
    if(hit){let a=prev,b=t;for(let i=0;i<10;i++){const m=(a+b)/2,[xx,yy,hh]=at(m);if(S.solidAt(xx,yy,hh))b=m;else a=m;}
     const [xx,yy,hh]=at(b);return {t:b,x:xx,y:yy,h:hh,kind:'face'};}
    if(t<tExit-1e-6)continue;
   }
  }else{if(!down)return null;t=tExit;}
  // At a band boundary.
  if(down){const nk=k-1,[xx,yy]=at(t);
   if(nk===0)return {t,x:xx,y:yy,h:0,kind:'top',lev:0};
   if(S.solidAt(xx,yy,nk*LH-1e-3))return {t,x:xx,y:yy,h:nk*LH,kind:'top',lev:nk};}
  t+=1e-5/Math.max(Math.abs(d[2]),1e-4);
 }
 return null;
}

// --- sky and distant hills -----------------------------------------------------
const SKY_TOP=[104,146,190],SKY_HORIZON=[214,222,218];
const RIDGES=[ // far to near: base elevation, amplitude (radians), colour
 {b:.034,a:.05,f:2.6,s:11,c:[170,186,200]},
 {b:.018,a:.034,f:4.3,s:23,c:[146,166,180]},
 {b:.006,a:.022,f:7.1,s:37,c:[118,140,140]}];
function sky(dir){
 const phi=Math.asin(clamp(dir[2],-1,1)),th=Math.atan2(dir[1],dir[0]);
 for(let i=RIDGES.length-1;i>=0;i--){const R=RIDGES[i],r=R.b+R.a*(fbm(th*R.f+3,i*7.1,R.s,4)-.35)+.006*(vnoise(th*R.f*7,i,R.s+1)-.5);
  if(phi<r){// A ridge: lit toward the key side, darker in its folds, paler at its foot.
   const e=.002,slope=(fbm((th+e)*R.f+3,i*7.1,R.s,4)-fbm((th-e)*R.f+3,i*7.1,R.s,4))/(2*e)*R.a,lit=clamp(.5-slope*.6),depthIn=clamp((r-phi)/.05);
   let c=mixc(R.c.map(v=>v*.86),R.c.map(v=>Math.min(255,v*1.12)),lit);
   if(i===2){const tex=fbm(th*90,phi*260,R.s+5,3);c=mixc(c,[84,104,92],.35+.3*tex);} // forested near hills
   return mixc(c,SKY_HORIZON,(1-depthIn)*.25);}}
 // Sky: a warm horizon to a clear blue top, soft cumulus lit from the upper left.
 const u=clamp(phi/.45);let c=mixc(SKY_HORIZON,SKY_TOP,Math.pow(u,.7));
 const cl=fbm(th*3.1+5,phi*8.5,61,5)*smooth(.02,.08,phi)*(1-smooth(.25,.45,phi));
 const shape=smooth(.5,.62,cl+.08*Math.sin(th*1.3));
 if(shape>0){const lit=smooth(-.02,.03,fbm(th*3.1+4.97,phi*8.5+.06,61,5)-cl);c=mixc(c,mixc([196,202,212],[248,246,238],.35+.65*lit),shape*.92);}
 return c;
}

// --- painter ----------------------------------------------------------------------
export function paintCloseupPlate(assets,view,{haze=CLOSEUP_HAZE,billboards=true}={}){
 const {sector,textures,flora}=assets,W=view.W,H=view.H;setGroundTextures(textures);
 const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});
 const img=g.createImageData(W,H),d=img.data,T=new Float32Array(W*H),K=new Uint8Array(W*H),HZ=new Float32Array(W*H),BELOW=new Uint8Array(W*H);
 for(let py=0;py<H;py++)for(let px=0;px<W;px++){
  const p=py*W+px,dir=view.ray(px+.5,py+.5),hit=traceRay(sector,view.C,dir);let col;
  // A ray below the horizon that runs out of range was still bound for far
  // terrain, which by then is all haze: paint the haze it would have reached
  // (the hills and sky belong above the horizon). Measured: such misses had
  // painted the near-hill ridge colour, dark specks among hazed far rock.
  if(!hit){col=dir[2]<0?mixc(SKY_HORIZON,HAZE,.25):sky(dir);T[p]=Infinity;K[p]=0;HZ[p]=1;BELOW[p]=dir[2]<0?1:0;}
  else{
   if(hit.kind==='top'){const fp=hit.t/view.focal/Math.max(.18,-dir[2]);col=shadeTop(sector,hit.x,hit.y,hit.lev,0,0,groundLod(fp));K[p]=1;
    // Far forest reads as one canopy mass (its trees are culled below 3 px);
    // without this the woodland floor shows through as dark specks.
    const far=smooth(110,165,hit.t)*smooth(.25,.6,sector.woodAt(hit.x,hit.y));
    if(far>0){const n=fbm(hit.x*.35,hit.y*.35,71,3);col=mixc(col,mixc([46,60,36],[96,112,62],n*.9+.05),far);}}
   else{col=shadeFace(sector,hit.x,hit.y,hit.h,view.focal/hit.t,KEY);K[p]=2;}
   T[p]=hit.t;const a=closeupHazeAt(hit.t,haze);HZ[p]=a;
   // The veil takes the sky's colour toward the horizon.
   const hc=mixc(HAZE,SKY_HORIZON,smooth(.3,.8,a));col=mixc(col,hc,a);}
  const o=p*4;d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=255;}
 // Below the horizon there is no sky to show: a miss there takes the colour of
 // the terrain beside it (a few dilation passes; wide miss areas keep the haze).
 for(let pass=0;pass<6;pass++){let changed=0;for(let py=1;py<H-1;py++)for(let px=1;px<W-1;px++){const p=py*W+px;if(K[p]!==0||!BELOW[p])continue;
  const n=[p-1,p+1,p-W,p+W].filter(q=>K[q]!==0);if(!n.length)continue;const o=p*4;for(let ch=0;ch<3;ch++)d[o+ch]=n.reduce((s,q)=>s+d[q*4+ch],0)/n.length;
  K[p]=K[n[0]];T[p]=n.reduce((s,q)=>s+T[q],0)/n.length;HZ[p]=n.reduce((s,q)=>s+HZ[q],0)/n.length;changed++;}if(!changed)break;}
 // A sky pixel inside rock is a slip of the tracer, not a feature: when three
 // or four of its neighbours are rock, take their colour, kind and depth.
 // Two passes clear the occasional pair as well as lone pixels.
 for(let pass=0;pass<2;pass++)for(let py=1;py<H-1;py++)for(let px=1;px<W-1;px++){const p=py*W+px;if(K[p]!==0)continue;
  const n=[p-1,p+1,p-W,p+W].filter(q=>K[q]!==0);if(n.length<3)continue;
  const o=p*4;for(let ch=0;ch<3;ch++)d[o+ch]=n.reduce((s,q)=>s+d[q*4+ch],0)/n.length;K[p]=K[n[0]];T[p]=n.reduce((s,q)=>s+T[q],0)/n.length;}
 // Ink: lips and feet (top over face, face over top), the outline where the
 // rock stands in front of something much farther, all fading with the haze.
 const ink=(p,a)=>{a*=1-HZ[p];if(a<=0)return;const o=p*4;d[o]+=(INK[0]-d[o])*a;d[o+1]+=(INK[1]-d[o+1])*a;d[o+2]+=(INK[2]-d[o+2])*a;};
 for(let py=0;py<H-1;py++)for(let px=0;px<W-1;px++){const p=py*W+px;
  for(const q of [p+1,p+W]){
   if(K[p]===1&&K[q]===2&&q===p+W){ink(p,.9);if(py>0)ink(p-W,.5);}
   else if(K[p]===2&&K[q]===1&&q===p+W)ink(p,.6);
   // Silhouettes only near the camera: far off, a flat surface seen at a
   // grazing angle jumps more than 12% in depth between rows and would speckle.
   else if(K[p]&&K[q]){const n=T[p]<T[q]?p:q,fN=Math.min(T[p],T[q]),fF=Math.max(T[p],T[q]);if(fN<110&&fF>fN*1.12+.6)ink(n,.8);}
   else if(K[p]!==K[q]){ink(K[p]?p:q,.7);}}}
 // Grass tufts over each lip and at each foot, sized by distance.
 const r=rng(5221),put=(x,y,cc,a)=>{x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const o=(y*W+x)*4;d[o]+=(cc[0]-d[o])*a;d[o+1]+=(cc[1]-d[o+1])*a;d[o+2]+=(cc[2]-d[o+2])*a;};
 // (Only within 90 tiles: farther, a tuft is a sub-pixel speck on the far cliff's ledges.)
 for(let py=1;py<H-1;py++)for(let px=0;px<W;px++){const p=py*W+px,lip=K[p]===1&&K[p+W]===2,foot=K[p]===2&&K[p+W]===1;if(!lip&&!foot)continue;if(r()>(lip?.2:.12)||T[p]>90)continue;
  const sc=Math.min(3,view.focal/T[p]/37),fade=1-HZ[p],blades=3+Math.floor(r()*4),dir=lip?1:-1,dark=r()<.6;
  for(let b=0;b<blades;b++){const len=(2.5+r()*(lip?7:5))*sc,an=(r()-.5)*.9,cc=dark?[64+r()*20,74+r()*18,34]:[150+r()*30,140+r()*24,64];
   for(let t=0;t<=len;t+=.7){const u=t/len;put(px+Math.sin(an)*t+(b-blades/2)*.9*sc,py+dir*Math.cos(an)*t,cc,(.85-.35*u)*fade);}}}
 // Distance softening: rock detail far away is smaller than a pixel and would
 // alias into speckle; blend toward a small blur as the distance grows.
 {const src=new Uint8ClampedArray(d);for(let py=1;py<H-1;py++)for(let px=1;px<W-1;px++){const p=py*W+px,w=smooth(70,170,T[p]);if(w<=0)continue;const o=p*4;
  for(let ch=0;ch<3;ch++){let s=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)s+=src[o+(j*W+i)*4+ch]*(i||j?(i&&j?.0625:.125):.25);d[o+ch]=src[o+ch]+(s-src[o+ch])*w;}}}
 g.putImageData(img,0,0);
 // Flora: the game's sprites as billboards, far to near, depth-tested
 // against the rock so the lip hides the trunks of the trees behind it.
 const n=billboards?drawBillboards(g,view,sector,flora,T,haze):0;
 splitToneCanvas(c);
 return {canvas:c,depth:T,kind:K,flora:n};
}

function drawBillboards(g,view,sector,S,T,haze){
 const W=view.W,H=view.H,C=view.C,R=260;
 const bounds=[C[0]-R,C[1]-R,C[0]+R,C[1]+R],kc=keepClear();
 const all=[...planFlora(sector,bounds,{keepClear:kc,seed:3}),...planRocks(sector,bounds,{keepClear:kc,seed:9}),...planLedges(sector,bounds,{seed:13,density:.7})].filter(t=>t.kind!=='rock');
 const items=[];
 for(const t of all){const z=view.cam3(t.x,t.y,t.base)[2];if(z<2)continue;const b=view.project(t.x,t.y,t.base);if(!b)continue;
  // Below 3 px a sprite is only its ink ring (a dark dot): the woodland floor
  // already paints the far forest's tone.
  const sc=view.focal/z,hpx=(t.kind==='shrub'?t.height*1.25:t.height)*sc;if(hpx<3)continue;
  const wpx=hpx*S[t.kind].aspect;if(b[0]+wpx<0||b[0]-wpx>W||b[1]<0||b[1]-hpx>H)continue;
  const dist=view.dist(t.x,t.y,t.base+t.height*.4);
  // Ledge plants too far to read as plants are blots on the pale rock; the
  // rock's own mossy ledges carry that tone. Far, tiny trees likewise.
  if((t.ledge&&dist>80)||dist>165)continue;
  items.push({t,z,b,hpx,dist,fade:1-smooth(130,165,dist)});}
 items.sort((a,b)=>b.z-a.z);
 const img=g.getImageData(0,0,W,H),d=img.data,cache=new Map(),tmp=document.createElement('canvas'),tg=tmp.getContext('2d',{willReadFrequently:true});
 for(const it of items){
  const {t}=it,K=S[t.kind],v=floraVariant(K,t,closeupHazeAt(it.dist,haze),HAZE_COLOR),flipped=(t.seed%K.variants.length)%2===1;
  const hq=Math.max(2,Math.round(it.hpx)),key=t.kind+'|'+(t.seed%K.variants.length)+'|'+Math.round(Math.min(1,closeupHazeAt(it.dist,haze))*16)+'|'+hq;
  let sp=cache.get(key);
  if(!sp){const k=hq/(v.height-2*K.pad),w=Math.max(1,Math.round(v.width*k)),h=Math.max(1,Math.round(v.height*k));
   // Halve toward the target first: one big downscale aliases the leaf texture.
   let src=v;while(src.height>h*2){const m=document.createElement('canvas');m.width=Math.max(1,Math.round(src.width/2));m.height=Math.max(1,Math.round(src.height/2));const mg=m.getContext('2d');mg.imageSmoothingQuality='high';mg.drawImage(src,0,0,m.width,m.height);src=m;}
   tmp.width=w;tmp.height=h;tg.clearRect(0,0,w,h);tg.imageSmoothingQuality='high';tg.drawImage(src,0,0,w,h);sp={w,h,k,data:tg.getImageData(0,0,w,h).data};cache.set(key,sp);}
  const Wd=hq*K.aspect,fx=(flipped?K.flipFoot:K.foot)*Wd,x0=Math.round(it.b[0]-fx-K.pad*sp.k),y0=Math.round(it.b[1]-hq*.985-K.pad*sp.k),slack=.5+it.dist*.012;
  for(let j=0;j<sp.h;j++){const yy=y0+j;if(yy<0||yy>=H)continue;for(let i=0;i<sp.w;i++){const xx=x0+i;if(xx<0||xx>=W)continue;const s=(j*sp.w+i)*4,a=sp.data[s+3];if(!a)continue;const p=yy*W+xx;if(T[p]<it.dist-slack)continue;
   const A=a/255*it.fade,o=p*4;d[o]+=(sp.data[s]-d[o])*A;d[o+1]+=(sp.data[s+1]-d[o+1])*A;d[o+2]+=(sp.data[s+2]-d[o+2])*A;}}
 }
 g.putImageData(img,0,0);
 return items.length;
}

// The heli's place in the close-up window: a slow push-in and a follow pan
// that takes up a third of the aircraft's travel, clamped inside the plate.
export function closeupWindow(t,heliPx,cam=CLOSEUP_CAMERA){
 const [W,H]=cam.plate,[ww,wh]=cam.window,u=smooth(CLOSEUP.start,CLOSEUP.end,t),zoom=1+.06*u;
 const mx=(W-ww/zoom)/2,my=(H-wh/zoom)/2,want=heliPx?[(heliPx[0]-W/2)*.33,(heliPx[1]-H/2)*.33]:[0,0];
 return {zoom,cx:W/2+clamp(want[0],-mx,mx),cy:H/2+clamp(want[1],-my,my)};
}
