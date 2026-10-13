// Crash sector of the intro, painted in 2D from the real tutorial map.
// Terrain = sector-library/tutorial-step-1 (two-tier plateau, 240 x 240);
// woodland = the user's marked map, digitized per tile (crash-sector-woodland.json).
// Camera = the game camera (azimuth 45 deg, elevation 30 deg: a 2:1 tile diamond).
export const LEVEL_HEIGHT=2.12; // DIMENSIONS.floorSpacing in hybrid-world.js
export const SUN=Object.freeze((()=>{const v=[12,35,20],n=Math.hypot(...v);return v.map(c=>c/n);})()); // study's sun (x, up, y)
export const COS_EL=Math.cos(Math.PI/6),SIN_EL=Math.sin(Math.PI/6);

// --- deterministic noise -------------------------------------------------
export function hash(ix,iy,seed=0){let h=(ix*374761393+iy*668265263+seed*2147483647)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
const fade=t=>t*t*(3-2*t);
export function vnoise(x,y,seed=0){const ix=Math.floor(x),iy=Math.floor(y),fx=fade(x-ix),fy=fade(y-iy);
 const a=hash(ix,iy,seed),b=hash(ix+1,iy,seed),c=hash(ix,iy+1,seed),d=hash(ix+1,iy+1,seed);
 return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;}
export function fbm(x,y,seed=0,oct=4){let s=0,a=.5,f=1,n=0;for(let i=0;i<oct;i++){s+=a*vnoise(x*f,y*f,seed+i*17);n+=a;a*=.5;f*=2.03;}return s/n;}
export const rng=seed=>{let s=seed>>>0||1;return ()=>{s=Math.imul(s^(s>>>15),2246822507)^Math.imul(s^(s>>>13),3266489909);s^=s>>>16;return (s>>>0)/4294967296;};};
const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,smooth=(a,b,t)=>{t=clamp((t-a)/(b-a));return t*t*(3-2*t);};
const mixc=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];

// --- map field --------------------------------------------------------------
export function buildSector(map,woodland){
 const W=map.width,H=map.height,level=new Float32Array(W*H),wood=new Float32Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=x+','+y;level[y*W+x]=map.upper[1]?.[k]?2:map.upper[0]?.[k]?1:0;wood[y*W+x]=woodland.rows[y][x]==='#'?1:0;}
 const blur=(src,sigma)=>{const r=Math.ceil(sigma*3),k=[];let s=0;for(let i=-r;i<=r;i++){const v=Math.exp(-i*i/(2*sigma*sigma));k.push(v);s+=v;}for(let i=0;i<k.length;i++)k[i]/=s;
  const tmp=new Float32Array(W*H),out=new Float32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let a=0;for(let i=-r;i<=r;i++)a+=k[i+r]*src[y*W+Math.min(W-1,Math.max(0,x+i))];tmp[y*W+x]=a;}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let a=0;for(let i=-r;i<=r;i++)a+=k[i+r]*tmp[Math.min(H-1,Math.max(0,y+i))*W+x];out[y*W+x]=a;}
  return out;};
 const F=blur(level,1.15),Wd=blur(wood,1.4);
 const sample=(G,x,y)=>{x=Math.max(0,Math.min(W-1.001,x));y=Math.max(0,Math.min(H-1.001,y));const ix=x|0,iy=y|0,fx=x-ix,fy=y-iy,i=iy*W+ix;
  return G[i]*(1-fx)*(1-fy)+G[i+1]*fx*(1-fy)+G[i+W]*(1-fx)*fy+G[i+W+1]*fx*fy;};
 const f=(x,y)=>sample(F,x,y),w=(x,y)=>sample(Wd,x,y);
 // Level field on a quarter-tile grid, with a low-frequency wobble so the
 // contour does not trace the tile staircase (precomputed: the painter samples
 // it ~20 times per pixel).
 const R=4,W4=W*R,H4=H*R,F4=new Float32Array(W4*H4);
 // Domain warp: the rim is sampled from a displaced position, so it bends into
 // lobes and bays (about +-1.5 tiles, ~14 tiles apart along the rim) without
 // raising islands in open ground. x+y runs across the rim, x-y along it.
 for(let j=0;j<H4;j++)for(let i=0;i<W4;i++){const x=i/R,y=j/R;
  const lobe=Math.sin((x-y)*.23+fbm(x*.04,y*.04,5,2)*5)*.95+(fbm(x*.07,y*.07,7,3)-.5)*1.6,bay=(fbm(x*.22,y*.22,8,2)-.5)*.9;
  const d=lobe+bay;F4[j*W4+i]=f(x+d+(fbm(x*.3,y*.3,12,2)-.5)*.5,y+d+(fbm(x*.3,y*.3,13,2)-.5)*.5);}
 const field=(x,y)=>{x=Math.max(0,Math.min(W-1.001,x))*R;y=Math.max(0,Math.min(H-1.001,y))*R;const ix=x|0,iy=y|0,fx=x-ix,fy=y-iy,i=iy*W4+ix;
  return F4[i]*(1-fx)*(1-fy)+F4[i+1]*fx*(1-fy)+F4[i+W4]*(1-fx)*fy+F4[i+W4+1]*fx*fy;};
 const levelAt=(x,y)=>{const v=field(x,y);return v>=1.5?2:v>=.5?1:0;};
 // Distances (tiles) from each quarter-tile cell to the nearest higher ground
 // (a cliff foot ahead) and to the nearest lower ground (a lip). Two-pass
 // chamfer transforms of the thresholded field: the wobble shapes the rim but
 // never fakes a rim in open ground.
 const lev4=new Uint8Array(W4*H4);for(let i=0;i<F4.length;i++)lev4[i]=F4[i]>=1.5?2:F4[i]>=.5?1:0;
 const chamfer=seed=>{const D=new Float32Array(W4*H4),A=1,B=Math.SQRT2;for(let i=0;i<D.length;i++)D[i]=seed(i)?0:1e9;
  for(let j=0;j<H4;j++)for(let i=0;i<W4;i++){const k=j*W4+i;let d=D[k];if(i>0)d=Math.min(d,D[k-1]+A);if(j>0){d=Math.min(d,D[k-W4]+A);if(i>0)d=Math.min(d,D[k-W4-1]+B);if(i<W4-1)d=Math.min(d,D[k-W4+1]+B);}D[k]=d;}
  for(let j=H4-1;j>=0;j--)for(let i=W4-1;i>=0;i--){const k=j*W4+i;let d=D[k];if(i<W4-1)d=Math.min(d,D[k+1]+A);if(j<H4-1){d=Math.min(d,D[k+W4]+A);if(i<W4-1)d=Math.min(d,D[k+W4+1]+B);if(i>0)d=Math.min(d,D[k+W4-1]+B);}D[k]=d;}
  for(let i=0;i<D.length;i++)D[i]/=R;return D;};
 const toAtLeast=[null,chamfer(i=>lev4[i]>=1),chamfer(i=>lev4[i]>=2)],toBelow=[null,chamfer(i=>lev4[i]<1),chamfer(i=>lev4[i]<2)];
 const cell=(x,y)=>Math.round(Math.max(0,Math.min(H-1,y))*R)*W4+Math.round(Math.max(0,Math.min(W-1,x))*R);
 const distUp=(x,y)=>{const L=levelAt(x,y);return L>=2?Infinity:toAtLeast[L+1][Math.min(W4*H4-1,cell(x,y))];};
 const distDown=(x,y)=>{const L=levelAt(x,y);return L<=0?Infinity:toBelow[L][Math.min(W4*H4-1,cell(x,y))];};
 const heightAt=(x,y)=>levelAt(x,y)*LEVEL_HEIGHT;
 const woodAt=(x,y)=>w(x,y);
 const rawWood=(x,y)=>{x=Math.round(x);y=Math.round(y);return x>=0&&y>=0&&x<W&&y<H&&wood[y*W+x]===1;};
 const grad=(x,y)=>{const e=.35;return [(field(x+e,y)-field(x-e,y))/(2*e),(field(x,y+e)-field(x,y-e))/(2*e)];};
 return {W,H,field,levelAt,heightAt,woodAt,rawWood,grad,distUp,distDown};
}

// --- view ---------------------------------------------------------------------
// w = tile diamond width in px. Screen: sx=(x-y)w/2, sy=(x+y)w/4-h*hv, hv=w/sqrt2*cos30.
// The point `anchor` (tile x, y, height) lands on screen pixel `at` (default: centre).
export function makeView({w,anchor,at,width,height}){
 const hv=w/Math.SQRT2*COS_EL,[cx,cy,ch=0]=anchor,[ax,ay]=at||[width/2,height/2];
 const ox=ax-(cx-cy)*w/2,oy=ay-((cx+cy)*w/4-ch*hv);
 const project=(x,y,h=0)=>[ox+(x-y)*w/2,oy+(x+y)*w/4-h*hv];
 // Ground point under a screen pixel at height h.
 const unproject=(sx,sy,h=0)=>{const A=2*(sx-ox)/w,B=4*(sy-oy+h*hv)/w;return [(A+B)/2,(B-A)/2];};
 // View depth: larger = nearer the camera.
 const depth=(x,y,h=0)=>(x+y)*COS_EL/Math.SQRT2+h*SIN_EL;
 return {w,hv,width,height,ox,oy,project,unproject,depth,scale:w/48};
}

// --- the game's painted ground ---------------------------------------------------
// ground-grass.png and ground-dirt.png are the 2D game's ground paintings; the
// cutscene maps them onto the ground plane, pre-scaled once to 256 px so the
// per-pixel painter can sample them without aliasing.
export async function loadGroundTextures(base='../../assets/environment/',n=256){
 const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('Missing '+src));i.src=src;});
 const out={};
 for(const [k,f]of [['grass','ground-grass.png'],['dirt','ground-dirt.png']]){
  let src=await load(base+f);
  while(src.width>n*2){const h=document.createElement('canvas');h.width=Math.round(src.width/2);h.height=Math.round(src.height/2);const g=h.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(src,0,0,h.width,h.height);src=h;}
  const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingQuality='high';g.drawImage(src,0,0,n,n);
  out[k]={n,data:g.getImageData(0,0,n,n).data};
 }
 return out;
}
const TEX_REPEAT=2.4; // tiles per repeat of a ground painting
function texel(T,u,v){const n=T.n,d=T.data;u=(u-Math.floor(u))*n;v=(v-Math.floor(v))*n;const x0=u|0,y0=v|0,x1=(x0+1)%n,y1=(y0+1)%n,fx=u-x0,fy=v-y0,a=(y0*n+x0)*4,b=(y0*n+x1)*4,c=(y1*n+x0)*4,e=(y1*n+x1)*4;
 return [0,1,2].map(k=>d[a+k]*(1-fx)*(1-fy)+d[b+k]*fx*(1-fy)+d[c+k]*(1-fx)*fy+d[e+k]*fx*fy);}
// Two samples on rotated grids hide the repeat.
function ground(T,x,y){const a=texel(T,x/TEX_REPEAT,y/TEX_REPEAT),b=texel(T,(x+y)/(TEX_REPEAT*1.37)+.37,(x-y)/(TEX_REPEAT*1.37)+.71);return [a[0]*.62+b[0]*.38,a[1]*.62+b[1]*.38,a[2]*.62+b[2]*.38];}
let TEX=null;

// --- terrain painter ----------------------------------------------------------
const PAL={
 meadowLight:[176,170,92],meadow:[128,138,64],meadowDark:[82,100,46],meadowWarm:[170,150,86],
 summit:[150,150,80],summitDark:[96,108,52],
 woodFloor:[58,70,36],woodFloorWarm:[84,72,44],
 stoneLight:[214,200,166],stone:[168,154,124],stoneDark:[104,92,74],stoneMoss:[112,118,66],
 scree:[150,140,112],
};
export function paintTerrain(ctx,sector,view,opts={}){
 const {width,height}=view,img=ctx.createImageData(width,height),d=img.data;
 // March each pixel's view ray down from above the summit. The first sample
 // inside the terrain brackets the surface; bisection finds the crossing. A
 // crossing at a level's top height is that top; anything lower is a face.
 const HMAX=2*LEVEL_HEIGHT+.01,N=12,TOL=.02;
 const hs=Array.from({length:N+1},(_,i)=>HMAX*(1-i/N));
 const inside=(sx,sy,h)=>{const [x,y]=view.unproject(sx,sy,h);return sector.heightAt(x,y)>=h-1e-6;};
 TEX=opts.textures||null;FACE_PX=[1.3*view.w/Math.SQRT2,.62*view.hv];
 const faces=new Uint8Array(width*height);
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){
  const sx=px+.5,sy=py+.5;let i=1;
  while(i<N&&!inside(sx,sy,hs[i]))i++;
  let a=hs[i],b=hs[i-1];
  for(let k=0;k<9;k++){const m=(a+b)/2;if(inside(sx,sy,m))a=m;else b=m;}
  const [x,y]=view.unproject(sx,sy,a),lev=sector.levelAt(x,y),top=lev*LEVEL_HEIGHT;
  const face=top-a>TOL;
  const c=face?shadeFace(sector,x,y,a,sx,sy):shadeTop(sector,x,y,lev,sx,sy);
  const o=(py*width+px)*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;if(face)faces[py*width+px]=1;
 }
 // Ink: a firm line along every lip (top surface directly above a face) and
 // a softer one where a face meets the ground at its foot.
 const ink=(i,a)=>{const o=i*4;d[o]=d[o]*(1-a)+INK_RGB[0]*a;d[o+1]=d[o+1]*(1-a)+INK_RGB[1]*a;d[o+2]=d[o+2]*(1-a)+INK_RGB[2]*a;};
 const lip=Math.max(1,Math.round(view.w/40));
 for(let py=1;py<height-1;py++)for(let px=0;px<width;px++){const i=py*width+px;
  if(!faces[i]&&faces[i+width]){for(let k=0;k<lip;k++)ink(i-k*width,k?.55:.9);}
  else if(faces[i]&&!faces[i+width])ink(i,.6);
  else if(faces[i]&&(px>0&&!faces[i-1]||px<width-1&&!faces[i+1]))ink(i,.5);}
 if(TEX){grassStrokes(d,faces,width,height,view,sector);edgeTufts(d,faces,width,height,view);}
 ctx.putImageData(img,0,0);
 return {faces};
}
const INK_RGB=[46,38,28];
// Grass tufts hanging over each lip and sprouting at each foot, so the rock
// meets the meadow the way the storyboard paints it.
function edgeTufts(d,faces,W,H,view){
 const k=view.w/52,r=rng(5119),put=(x,y,c,a)=>{x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const o=(y*W+x)*4;d[o]+=(c[0]-d[o])*a;d[o+1]+=(c[1]-d[o+1])*a;d[o+2]+=(c[2]-d[o+2])*a;};
 for(let y=1;y<H-1;y++)for(let x=0;x<W;x++){const i=y*W+x,lip=!faces[i]&&faces[i+W],foot=faces[i]&&!faces[i+W];if(!lip&&!foot)continue;if(r()>(lip?.16:.1))continue;
  const blades=3+Math.floor(r()*4),dir=lip?1:-1,dark=r()<.6;
  for(let b=0;b<blades;b++){const len=(2.5+r()*(lip?6:5))*k,an=(r()-.5)*.9,c=dark?[64+r()*20,74+r()*18,34]:[150+r()*30,140+r()*24,64];
   for(let t=0;t<=len;t+=.7){const u=t/len;put(x+Math.sin(an)*t+(b-blades/2)*.8,y+dir*Math.cos(an)*t,c,.85-.35*u);}}}
}
// Brushwork: short grass strokes laid straight into the painted ground, each
// tinted from the paint beneath it: sunlit tips, darker roots. Open ground
// only (woodland floor is under the canopy, faces are rock).
function grassStrokes(d,faces,W,H,view,sector){
 const k=view.w/52,n=Math.round(W*H/34),r=rng(4111);
 const put=(x,y,c,a)=>{x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const i=y*W+x;if(faces[i])return;const o=i*4;d[o]+=(c[0]-d[o])*a;d[o+1]+=(c[1]-d[o+1])*a;d[o+2]+=(c[2]-d[o+2])*a;};
 for(let s=0;s<n;s++){
  const x=r()*W,y=r()*H,i=(y|0)*W+(x|0);if(faces[i])continue;
  const [tx,ty]=view.unproject(x,y,0);if(sector.levelAt(tx,ty)!==0&&sector.levelAt(tx,ty)!==2){/* the narrow shelf keeps its scree */}
  const [gx,gy]=view.unproject(x,y,sector.heightAt(tx,ty));if(sector.woodAt(gx,gy)>.45)continue;
  const o=i*4,base=[d[o],d[o+1],d[o+2]],roll=r(),len=(3.5+r()*5.5)*k,ang=(r()-.5)*.7,dx=Math.sin(ang),dy=-Math.cos(ang),w=r()<.5?1:2;
  // Mostly sunlit tips; the darker strokes stay close to the ground's value,
  // because the frame's contrast grade would turn them into black ticks.
  const tip=roll<.62?[base[0]*1.18+10,base[1]*1.15+8,base[2]*1.0]:roll<.86?[base[0]*.88,base[1]*.93,base[2]*.8]:[base[0]*1.06,base[1]*1.13,base[2]*.88];
  const root=[base[0]*.9,base[1]*.93,base[2]*.84];
  for(let t=0;t<=len;t+=.7){const u=t/len,c=[root[0]+(tip[0]-root[0])*u,root[1]+(tip[1]-root[1])*u,root[2]+(tip[2]-root[2])*u],px=x+dx*t,py=y+dy*t,a=.5+.35*u;
   put(px,py,c,a);if(w===2)put(px+1,py,c,a*.6);}
 }
}
function shadeTop(sector,x,y,lev,sx,sy){
 const up=sector.distUp(x,y),down=sector.distDown(x,y);
 const n1=fbm(x*.08,y*.08,3,4),n2=fbm(x*.6,y*.6,11,3);
 let c;
 if(TEX){
  // Sunlit meadow from the game's grass painting; the summit a shade drier.
  const g=ground(TEX.grass,x,y),lift=lev===2?[1.7,1.66,1.38]:[1.66,1.64,1.38];
  c=[g[0]*lift[0],g[1]*lift[1],g[2]*lift[2]];
  // Painted variation: broad light and shade, lusher hollows, dry sunlit patches.
  const v=.74+.5*n1;c=c.map(k=>k*v);
  c=mixc(c,[c[0]*.84,c[1]*.94,c[2]*.8],smooth(.58,.76,fbm(x*.13+7,y*.13,43,3))*.38);
  c=mixc(c,[c[0]*1.2,c[1]*1.08,c[2]*.78],smooth(.55,.78,fbm(x*.05,y*.05,41,3))*.6);
  const wd=sector.woodAt(x,y);if(wd>.05){const dt=ground(TEX.dirt,x*.9+3,y*.9+5);c=mixc(c,[dt[0]*.58+g[0]*.28,dt[1]*.55+g[1]*.36,dt[2]*.5+g[2]*.2],smooth(.15,.75,wd)*.9);}
  const reach=lev===1?.7:1.6;
  if(up<reach){const dt=ground(TEX.dirt,x*1.3,y*1.3),ao=smooth(reach*.75,0,up)*.36,s=smooth(reach*.8,.1,up)*smooth(.35,.75,fbm(x*.55,y*.55,61,2)+.1);
   c=mixc(c,mixc([dt[0]*1.12,dt[1]*1.08,dt[2]*1.05],PAL.stone,.35),s*.8);c=c.map(k=>k*(1-ao));}
  if(down<.9){const s=smooth(.9,.05,down)*smooth(.25,.65,fbm(x*.7,y*.7,71,2)+.2);c=mixc(c,mixc(PAL.stoneLight,PAL.stone,n2),s*.85);}
  return c;
 }
 const n3=vnoise(sx*.16+sy*.05,sy*.42,23),n4=vnoise(sx*.45,sy*.9,31);
 if(lev===2){c=mixc(PAL.summitDark,PAL.summit,clamp(.25+n1*.9+(n2-.5)*.45+(n3-.5)*.2));}
 else{c=mixc(PAL.meadowDark,PAL.meadow,clamp(.2+n1*.95+(n2-.5)*.5+(n3-.5)*.22));c=mixc(c,PAL.meadowLight,smooth(.58,.85,n1+(n2-.5)*.3)*.7);c=mixc(c,PAL.meadowWarm,smooth(.55,.8,fbm(x*.05,y*.05,41,3))*.35);}
 const wd=sector.woodAt(x,y);if(wd>.05)c=mixc(c,mixc(PAL.woodFloor,PAL.woodFloorWarm,n2),smooth(.15,.75,wd)*.92);
 const g=(n4-.5)*14;c=[c[0]+g,c[1]+g,c[2]+g*.6];
 if(up<2.2){const ao=smooth(1.3,0,up)*.38;const s=smooth(1.9,.2,up)*smooth(.3,.7,fbm(x*.55,y*.55,61,2)+.12);c=mixc(c,mixc(PAL.scree,PAL.stone,n2*.6),s*.75);c=c.map(k=>k*(1-ao));}
 if(down<.9){const s=smooth(.9,.05,down)*smooth(.25,.65,fbm(x*.7,y*.7,71,2)+.2);c=mixc(c,mixc(PAL.stoneLight,PAL.stone,n2),s*.85);}
 return c;
}
// Limestone in the storyboard's manner: vertical columns broken into
// faceted blocks. Each facet has its own normal (turned left or right, tipped
// up or down), lit by the study's sun: warm where it faces the light, cool
// blue-grey in shade, with dark crevices between columns and blocks.
let FACE_PX=[48,20];
const SUN_WARM=[1.07,.88,.7],SKY_COOL=[.46,.54,.74];
// A painter rakes the light across rock: the faces take a key from screen-left
// (the side the cast shadows already imply) instead of the frontal sun.
const ROCK_KEY=(()=>{const v=[.15,.55,.85],n=Math.hypot(...v);return v.map(c=>c/n);})();
function shadeFace(sector,x,y,h,sx,sy){
 const [gx,gy]=sector.grad(x,y),gl=Math.hypot(gx,gy)||1,nx=-gx/gl,ny=-gy/gl;
 const along=(x-y)/Math.SQRT2,level=h%LEVEL_HEIGHT,fromTop=LEVEL_HEIGHT-level;
 // Broad pillars with wandering joints.
 const w=along/1.7+fbm(along*.13,h*.04,77,3)*2.6+(fbm(along*.9,h*.45,78,2)-.5)*.32,col=Math.floor(w),u=w-col;
 const tone=hash(col,0,93),tone2=hash(col,0,94);
 // Most pillars run the full tier; some break once.
 const breakAt=tone2>.6?(.3+tone*.4)*LEVEL_HEIGHT:-1,blk=breakAt>0&&level>breakAt?1:0,bt=hash(col,blk,97);
 const top=blk||breakAt<0?LEVEL_HEIGHT:breakAt,bottom=blk?breakAt:0,v=(level-bottom)/Math.max(.2,top-bottom);
 // Facets across a pillar: a long sunlit front, a shadowed right flank whose
 // edge wanders down the face, and on some pillars a narrow left flank.
 const edge=.58+bt*.22+(fbm(h*1.2,col*.37,99,2)-.5)*.16,left=tone>.55?.1+tone2*.08:0,soft=.035;
 const wR=smooth(edge-soft,edge+soft,u),wL=left?1-smooth(left-soft,left+soft,u):0,wF=Math.max(0,1-wR-wL);
 const turn=wL*-.85+wR*1.05+wF*(-.18+(bt-.5)*.3);
 // Rounded crown: the top of each pillar bevels toward the sky.
 const tip=.6*smooth(.82,1,v)-.25*smooth(.12,0,v);
 const ca=Math.cos(turn),sa=Math.sin(turn),fx=nx*ca-ny*sa,fy=nx*sa+ny*ca,cu=Math.cos(tip),N=[fx*cu,Math.sin(tip),fy*cu];
 const diff=Math.max(0,N[0]*ROCK_KEY[0]+N[1]*ROCK_KEY[1]+N[2]*ROCK_KEY[2]),sky=.5+.5*N[1];
 // Pale grey limestone; ochre-orange staining only in patches (about a third
 // of the face, as on the storyboard's cliffs).
 let base=mixc([152,150,148],[198,194,188],tone);
 base=mixc(base,[204,146,92],smooth(.45,.7,fbm(along*1.4,h*.24,95,3)+tone2*.12)*.85);
 const grain=(fbm(along*3.4,h*4.6,13,3)-.5)*16+(fbm(along*.9,h*9,14,2)-.5)*10;
 let c=[0,1,2].map(k=>(base[k]+grain)*(SKY_COOL[k]*(.5+.5*sky)*.72+SUN_WARM[k]*Math.pow(diff,1.3)*.8));
 c=mixc(c,[92,104,58],smooth(.38,0,fromTop)*smooth(.35,.7,fbm(along*.8,h*.8,29,2))*.65);
 c=mixc(c,[60,58,54],smooth(.45,0,level)*.4);
 c=mixc(c,[74,74,72],smooth(.6,.82,fbm(along*2.8,h*.06,59,2))*smooth(0,1.6,fromTop)*.28);
 // Crevices between pillars (deepest at the foot) and the odd block joint.
 const colPx=Math.min(u,1-u)*1.9*FACE_PX[0]/1.3,crev=1.2+1.8*smooth(LEVEL_HEIGHT,0,level)+tone*1.2;
 c=mixc(c,[32,30,30],smooth(crev,crev*.2,colPx)*.92);
 if(breakAt>0){const dpx=Math.abs(level-breakAt)*FACE_PX[1]/.62;c=mixc(c,[36,34,32],smooth(1.4,.3,dpx)*.8);}
 // Hairline cracks running down some pillars.
 if(tone>.4){const cu=.3+tone2*.4+(fbm(h*2.2,col,101,2)-.5)*.12,cpx=Math.abs(u-cu)*1.7*FACE_PX[0]/1.3;c=mixc(c,[52,48,44],smooth(1.1,.2,cpx)*smooth(0,.6,fromTop)*.6);}
 return c;
}
