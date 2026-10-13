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
 const faces=opts.faceMask?new Uint8Array(width*height):null;
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){
  const sx=px+.5,sy=py+.5;let i=1;
  while(i<N&&!inside(sx,sy,hs[i]))i++;
  let a=hs[i],b=hs[i-1];
  for(let k=0;k<9;k++){const m=(a+b)/2;if(inside(sx,sy,m))a=m;else b=m;}
  const [x,y]=view.unproject(sx,sy,a),lev=sector.levelAt(x,y),top=lev*LEVEL_HEIGHT;
  const face=top-a>TOL;
  const c=face?shadeFace(sector,x,y,a,sx,sy):shadeTop(sector,x,y,lev,sx,sy);
  const o=(py*width+px)*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;if(faces&&face)faces[py*width+px]=1;
 }
 ctx.putImageData(img,0,0);
 return {faces};
}
function shadeTop(sector,x,y,lev,sx,sy){
 const up=sector.distUp(x,y),down=sector.distDown(x,y);
 const n1=fbm(x*.11,y*.11,3,4),n2=fbm(x*.6,y*.6,11,3),n3=vnoise(sx*.16+sy*.05,sy*.42,23),n4=vnoise(sx*.45,sy*.9,31);
 let c;
 if(lev===2){c=mixc(PAL.summitDark,PAL.summit,clamp(.25+n1*.9+(n2-.5)*.45+(n3-.5)*.2));}
 else{c=mixc(PAL.meadowDark,PAL.meadow,clamp(.2+n1*.95+(n2-.5)*.5+(n3-.5)*.22));c=mixc(c,PAL.meadowLight,smooth(.58,.85,n1+(n2-.5)*.3)*.7);c=mixc(c,PAL.meadowWarm,smooth(.55,.8,fbm(x*.05,y*.05,41,3))*.35);}
 // Woodland floor (mostly under canopy).
 const wd=sector.woodAt(x,y);if(wd>.05)c=mixc(c,mixc(PAL.woodFloor,PAL.woodFloorWarm,n2),smooth(.15,.75,wd)*.92);
 // Brush grain.
 const g=(n4-.5)*14;c=[c[0]+g,c[1]+g,c[2]+g*.6];
 // Cliff foot: scree apron and ambient occlusion against the face.
 if(up<2.2){const ao=smooth(1.3,0,up)*.38;const s=smooth(1.9,.2,up)*smooth(.3,.7,fbm(x*.55,y*.55,61,2)+.12);c=mixc(c,mixc(PAL.scree,PAL.stone,n2*.6),s*.75);c=c.map(k=>k*(1-ao));}
 // Rocky, sunlit lip along the top of a face.
 if(down<.9){const s=smooth(.9,.05,down)*smooth(.25,.65,fbm(x*.7,y*.7,71,2)+.2);c=mixc(c,mixc(PAL.stoneLight,PAL.stone,n2),s*.85);}
 return c;
}
function shadeFace(sector,x,y,h,sx,sy){
 const [gx,gy]=sector.grad(x,y),gl=Math.hypot(gx,gy)||1,nx=-gx/gl,ny=-gy/gl;
 const diff=Math.max(0,SUN[0]*nx+SUN[2]*ny),light=.48+.95*diff;
 const along=(x-y)*.5,strata=fbm(along*.35,h*2.6+fbm(along*.2,h*.5,5,2)*1.6,13,3),crack=Math.abs(vnoise(along*1.7+fbm(h,along,9,2)*.8,h*.35,19)-.5);
 const level=h%LEVEL_HEIGHT,fromTop=LEVEL_HEIGHT-level;
 let c=mixc(PAL.stoneDark,PAL.stoneLight,clamp(.15+strata*.95));
 // Vertical jointing: light buttresses and darker gullies down the face.
 const cols=fbm(along*1.1,h*.18,43,3);c=mixc(c,PAL.stoneDark,smooth(.5,.28,cols)*.55);c=mixc(c,PAL.stoneLight,smooth(.55,.75,cols)*.35);
 c=mixc(c,PAL.stoneDark,smooth(.08,0,crack)*.8);
 // Horizontal bedding lines.
 const bed=Math.abs(((h*1.6+fbm(along*.3,1,3,2)*1.4)%1)-.5);c=mixc(c,PAL.stoneDark,smooth(.05,0,.5-bed)*.14*smooth(.4,.6,fbm(along*.5,h,4,2)));
 // Ochre and grey weathering patches, dark rain streaks from the lip.
 c=mixc(c,[196,168,112],smooth(.55,.75,fbm(along*.35+9,h*.6,47,3))*.45);
 c=mixc(c,[70,66,58],smooth(.62,.8,fbm(along*2.4,h*.07,59,2))*smooth(0,1.4,fromTop)*.35);
 // Moss and grass hanging from the lip, damp darker foot.
 c=mixc(c,PAL.stoneMoss,smooth(.55,0,fromTop)*smooth(.35,.7,fbm(along*.8,h*.8,29,2))*.85);
 c=mixc(c,PAL.stoneDark,smooth(.5,0,level)*.35);
 const g=(vnoise(sx*.35,sy*.12,37)-.5)*16;
 return [c[0]*light+g,c[1]*light+g,c[2]*light+g*.7];
}
