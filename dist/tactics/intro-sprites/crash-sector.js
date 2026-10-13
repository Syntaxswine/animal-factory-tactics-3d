// Crash sector of the intro, painted in 2D from the real tutorial map.
// Terrain = sector-library/tutorial-step-1 (two-tier plateau, 240 x 240);
// woodland = the user's marked map, digitized per tile (crash-sector-woodland.json).
// The wide shots use the game camera (azimuth 45 deg, elevation 30 deg: a 2:1
// tile diamond); closeup.js paints the same solid through a perspective lens.
export const LEVEL_HEIGHT=2.12; // DIMENSIONS.floorSpacing in hybrid-world.js
// The user, 2026-10-12: "its basically a butte, so it should feel tall." The
// cutscene stretches the two tiers; the map's outline and the clearing stay exact.
export const HEIGHT_SCALE=Object.freeze({wide:1.6,closeup:4});
// How much small-scale breakage the rock carries: the close-up shows every
// fracture and worn top; at wide scale that much detail reads as a sawtooth.
export const ROCK_DETAIL=Object.freeze({wide:.5,closeup:1});
export const SUN=Object.freeze((()=>{const v=[12,35,20],n=Math.hypot(...v);return v.map(c=>c/n);})()); // study's sun (x, up, y)
export const COS_EL=Math.cos(Math.PI/6),SIN_EL=Math.sin(Math.PI/6);

// --- deterministic noise -------------------------------------------------
export function hash(ix,iy,seed=0){let h=(ix*374761393+iy*668265263+seed*2147483647)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
export function hash3(ix,iy,iz,seed=0){let h=(ix*374761393+iy*668265263+iz*1440662683+seed*2147483647)|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
const fade=t=>t*t*(3-2*t);
export function vnoise(x,y,seed=0){const ix=Math.floor(x),iy=Math.floor(y),fx=fade(x-ix),fy=fade(y-iy);
 const a=hash(ix,iy,seed),b=hash(ix+1,iy,seed),c=hash(ix,iy+1,seed),d=hash(ix+1,iy+1,seed);
 return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;}
export function vnoise3(x,y,z,seed=0){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=fade(x-ix),fy=fade(y-iy),fz=fade(z-iz);
 const a=hash3(ix,iy,iz,seed),b=hash3(ix+1,iy,iz,seed),c=hash3(ix,iy+1,iz,seed),d=hash3(ix+1,iy+1,iz,seed);
 const e=hash3(ix,iy,iz+1,seed),f=hash3(ix+1,iy,iz+1,seed),g=hash3(ix,iy+1,iz+1,seed),h=hash3(ix+1,iy+1,iz+1,seed);
 const p=a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy,q=e+(f-e)*fx+(g-e)*fy+(e-f-g+h)*fx*fy;return p+(q-p)*fz;}
export function fbm(x,y,seed=0,oct=4){let s=0,a=.5,f=1,n=0;for(let i=0;i<oct;i++){s+=a*vnoise(x*f,y*f,seed+i*17);n+=a;a*=.5;f*=2.03;}return s/n;}
export function fbm3(x,y,z,seed=0,oct=3){let s=0,a=.5,f=1,n=0;for(let i=0;i<oct;i++){s+=a*vnoise3(x*f,y*f,z*f,seed+i*17);n+=a;a*=.5;f*=2.03;}return s/n;}
export const rng=seed=>{let s=seed>>>0||1;return ()=>{s=Math.imul(s^(s>>>15),2246822507)^Math.imul(s^(s>>>13),3266489909);s^=s>>>16;return (s>>>0)/4294967296;};};
const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v,smooth=(a,b,t)=>{t=clamp((t-a)/(b-a));return t*t*(3-2*t);};
const mixc=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];

// --- distance transforms ---------------------------------------------------
// Exact squared Euclidean distance transform (Felzenszwalb and Huttenlocher),
// in place: 0 marks the features, a large value everything else.
function edt1d(f,n,d,v,z){let k=0;v[0]=0;z[0]=-Infinity;z[1]=Infinity;
 for(let q=1;q<n;q++){let s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);
  while(s<=z[k]){k--;s=((f[q]+q*q)-(f[v[k]]+v[k]*v[k]))/(2*q-2*v[k]);}
  k++;v[k]=q;z[k]=s;z[k+1]=Infinity;}
 k=0;for(let q=0;q<n;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])*(q-v[k])+f[v[k]];}}
function edt2d(g,W,H){const n=Math.max(W,H),f=new Float64Array(n),d=new Float64Array(n),v=new Int32Array(n),z=new Float64Array(n+1);
 for(let x=0;x<W;x++){for(let y=0;y<H;y++)f[y]=g[y*W+x];edt1d(f,H,d,v,z);for(let y=0;y<H;y++)g[y*W+x]=d[y];}
 for(let y=0;y<H;y++){for(let x=0;x<W;x++)f[x]=g[y*W+x];edt1d(f,W,d,v,z);for(let x=0;x<W;x++)g[y*W+x]=d[x];}}
function blur2d(a,W,H,sigma){const r=Math.ceil(sigma*3),k=[];let s=0;for(let i=-r;i<=r;i++){const v=Math.exp(-i*i/(2*sigma*sigma));k.push(v);s+=v;}for(let i=0;i<k.length;i++)k[i]/=s;
 const t=new Float32Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){let v=0;for(let i=-r;i<=r;i++)v+=k[i+r]*a[y*W+Math.min(W-1,Math.max(0,x+i))];t[y*W+x]=v;}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){let v=0;for(let i=-r;i<=r;i++)v+=k[i+r]*t[Math.min(H-1,Math.max(0,y+i))*W+x];a[y*W+x]=v;}}

// --- map field --------------------------------------------------------------
// heightScale stretches the tiers for the cutscene (HEIGHT_SCALE); 1 = the game.
// extend: queries past the map edge reflect back into it, so the far view of the
// close-up sees the plateau ring and lowland continue instead of a clamped smear.
export function buildSector(map,woodland,{heightScale=1,extend=false,detail=1}={}){
 const W=map.width,H=map.height,level=new Float32Array(W*H),wood=new Float32Array(W*H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=x+','+y;level[y*W+x]=map.upper[1]?.[k]?2:map.upper[0]?.[k]?1:0;wood[y*W+x]=woodland.rows[y][x]==='#'?1:0;}
 const blur=(src,sigma)=>{const r=Math.ceil(sigma*3),k=[];let s=0;for(let i=-r;i<=r;i++){const v=Math.exp(-i*i/(2*sigma*sigma));k.push(v);s+=v;}for(let i=0;i<k.length;i++)k[i]/=s;
  const tmp=new Float32Array(W*H),out=new Float32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let a=0;for(let i=-r;i<=r;i++)a+=k[i+r]*src[y*W+Math.min(W-1,Math.max(0,x+i))];tmp[y*W+x]=a;}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let a=0;for(let i=-r;i<=r;i++)a+=k[i+r]*tmp[Math.min(H-1,Math.max(0,y+i))*W+x];out[y*W+x]=a;}
  return out;};
 const F=blur(level,1.15),Wd=blur(wood,1.4);
 const reflect=(v,n)=>{const p=2*(n-1);v=((v%p)+p)%p;return v>n-1?p-v:v;},wx=extend?(x=>reflect(x,W)):(x=>x),wy=extend?(y=>reflect(y,H)):(y=>y);
 const sample=(G,x,y)=>{x=wx(x);y=wy(y);x=Math.max(0,Math.min(W-1.001,x));y=Math.max(0,Math.min(H-1.001,y));const ix=x|0,iy=y|0,fx=x-ix,fy=y-iy,i=iy*W+ix;
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
 const field=(x,y)=>{x=Math.max(0,Math.min(W-1.001,wx(x)))*R;y=Math.max(0,Math.min(H-1.001,wy(y)))*R;const ix=x|0,iy=y|0,fx=x-ix,fy=y-iy,i=iy*W4+ix;
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
 const cell=(x,y)=>Math.round(Math.max(0,Math.min(H-1,wy(y)))*R)*W4+Math.round(Math.max(0,Math.min(W-1,wx(x)))*R);
 // Distance (tiles) to the nearest ground of tier >= k (0 inside it): the
 // perspective tracer's safe step toward a cliff.
 const distAtLeast=(k,x,y)=>toAtLeast[k][Math.min(W4*H4-1,cell(x,y))];
 const distUp=(x,y)=>{const L=levelAt(x,y);return L>=2?Infinity:toAtLeast[L+1][Math.min(W4*H4-1,cell(x,y))];};
 const distDown=(x,y)=>{const L=levelAt(x,y);return L<=0?Infinity:toBelow[L][Math.min(W4*H4-1,cell(x,y))];};
 const LH=LEVEL_HEIGHT*heightScale;
 const heightAt=(x,y)=>levelAt(x,y)*LH;
 const woodAt=(x,y)=>w(x,y);
 const rawWood=(x,y)=>{x=Math.round(x);y=Math.round(y);return x>=0&&y>=0&&x<W&&y<H&&wood[y*W+x]===1;};
 const grad=(x,y)=>{const e=.35;return [(field(x+e,y)-field(x-e,y))/(2*e),(field(x,y+e)-field(x,y-e))/(2*e)];};

 // --- the rock: jointed limestone with real relief ----------------------------
 // The user, 2026-10-12, on the first close-up: "it looks fairly low poly with
 // the thick block shapes on a flat plane. this should look fairly realistic."
 // So the face is no longer a field contour nudged a fraction of a tile. Each
 // tier gets a true signed distance (tiles, + inside rock) to its smooth
 // outline, and the rock surface is where that distance plus a relief in tiles
 // reaches zero: buttresses and bays that scale with the cliff's height,
 // jointed columns that stand forward or sit back, each rounded like a pillar,
 // dark slots at the joints, fracture ledges and overhangs at each column's own
 // heights, worn column tops, lumps and hollows.
 const sdf=[null,signedDistance(1),signedDistance(2)];
 function signedDistance(k){
  const N=W4*H4,inside=new Uint8Array(N),a=new Float64Array(N),b=new Float64Array(N),INF=1e12;
  for(let i=0;i<N;i++){inside[i]=F4[i]>=k-.5?1:0;a[i]=inside[i]?INF:0;b[i]=inside[i]?0:INF;}
  edt2d(a,W4,H4);edt2d(b,W4,H4);
  const sd=new Float32Array(N);
  for(let i=0;i<N;i++)sd[i]=inside[i]?Math.sqrt(a[i])-.5:-(Math.sqrt(b[i])-.5);
  // Near the edge, the field's own sub-cell contour (value over gradient).
  for(let j=1;j<H4-1;j++)for(let i=1;i<W4-1;i++){const q=j*W4+i;if(Math.abs(sd[q])>1.6)continue;
   const gx=(F4[q+1]-F4[q-1])/2,gy=(F4[q+W4]-F4[q-W4])/2,g=Math.hypot(gx,gy);if(g>1e-4)sd[q]=(F4[q]-(k-.5))/g;}
  blur2d(sd,W4,H4,1);
  for(let i=0;i<N;i++)sd[i]/=R;
  return sd;}
 const sdAt=(k,x,y)=>{x=Math.max(0,Math.min(W-1.001,wx(x)))*R;y=Math.max(0,Math.min(H-1.001,wy(y)))*R;const ix=x|0,iy=y|0,fx=x-ix,fy=y-iy,i=iy*W4+ix,S=sdf[k];
  return S[i]*(1-fx)*(1-fy)+S[i+1]*fx*(1-fy)+S[i+W4]*(1-fx)*fy+S[i+W4+1]*fx*fy;};
 // Bounds on the relief, term by term below: ROUT how far rock can reach out
 // past the outline (the tracer's safe step), RIN how deep a notch can cut in
 // (worn tops reach 2.4). Past them the outline alone decides.
 const COL=1.2,BUTTRESS=.19*LH,NB=Math.floor(2.4*detail+detail*.6);
 const ROUT=BUTTRESS+.55+.5+NB*.45*detail+.34+.25,RIN=BUTTRESS+.55+.32+NB*(.45*detail+.28)+(detail>0?2.4:0)+.34+.3+.1,RMAX=ROUT;
 const columns=(x0,y0)=>{
  // Warped in plan only, so column widths vary but the columns stay vertical.
  const x=x0+(vnoise(x0*.29,y0*.29,301)-.5)*1.3,y=y0+(vnoise(x0*.29,y0*.29,302)-.5)*1.3;
  const gx=Math.floor(x/COL),gy=Math.floor(y/COL);let d1=1e9,d2=1e9,id=0;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=gx+i,cy=gy+j,px=(cx+.1+hash(cx,cy,201)*.8)*COL,py=(cy+.1+hash(cx,cy,202)*.8)*COL,dd=(x-px)*(x-px)+(y-py)*(y-py);
   if(dd<d1){d2=d1;d1=dd;id=(cx*92821+cy*68917)|0;}else if(dd<d2)d2=dd;}
  return {edge:(Math.sqrt(d2)-Math.sqrt(d1))*.5,id};};
 const relief=(x,y,h,lev,col=columns(x,y))=>{
  const z=h-(lev-1)*LH,top=LH-z,r1=hash(col.id,lev,203),r2=hash(col.id,lev,204),r3=hash(col.id,lev,205);
  // Buttresses and bays, nearly vertical, as deep as the cliff is tall.
  let d=(fbm3(x*.1,y*.1,h*.03,311,3)-.5)*2*BUTTRESS;
  // The column: its own set-back, a face rounded unevenly (not a pipe), a
  // dark slot at its joints.
  const e=Math.min(col.edge,.5),bulge=(.35+.65*r2)*(.75+.5*vnoise3(x*.8,y*.8,h*.35,217));
  d+=(r1-.5)*1.1+Math.sqrt(Math.max(0,.25-(.5-e)*(.5-e)))*.8*bulge-.32*smooth(.06,0,col.edge);
  // Fractures at the column's own heights: a groove, and above it the column
  // steps back (an overhang below) or juts forward (a ledge below).
  const nb=Math.floor(r2*2.4*detail+detail*.6);
  for(let k=0;k<nb;k++){const q=hash(col.id,lev*16+k,207),bz=(.12+q*.76)*LH,step=(hash(col.id,lev*16+k,208)-.5)*.9*detail;
   d+=step*smooth(bz-.05,bz+.05,z)-.28*smooth(.11,0,Math.abs(z-bz));}
  // Worn tops: some columns stop short of the tier top, broken unevenly.
  if(r3<.32*detail){const tz=LH-.4-r3*7+(vnoise(x*2.3,y*2.3,218)-.5)*1.1;d-=2.4*smooth(tz-.25,tz+.25,z);}
  // Bedding: horizontal layering shared by every column, gently undulating.
  const bed=z/1.55+(vnoise(x*.12,y*.12,219)-.5)*1.4,bf=bed-Math.floor(bed);
  d-=.1*smooth(.09,0,Math.abs(bf-.5)-.41)*smooth(.35,.7,vnoise(x*.45,y*.45,220));
  // Lumps and small hollows; a slightly proud cap with a rounded lip.
  d+=(vnoise3(x*1.2,y*1.2,h*.5,215)-.5)*.5+(vnoise3(x*3.4,y*3.4,h*1.7,216)-.5)*.16;
  d+=.25*smooth(.7,.05,top)-.3*smooth(.05,0,top);
  return d;};
 // Signed plan distance into the rock of tier lev at (x, y, h), relief included
 // (>= 0 is rock). Far from the outline the relief cannot matter.
 const rockG=(lev,x,y,h)=>{const s=sdAt(lev,x,y);if(s>RIN+.2||s<-ROUT-.2)return s;return s+relief(x,y,h,lev);};
 const solidAt=(x,y,h)=>{
  if(h<=0)return true;
  const lev=h<=LH?1:h<=2*LH?2:0;if(!lev)return false;
  return rockG(lev,x,y,h)>=0;};
 // Everything a face shader needs at a hit: tier, column, relief and the
 // outward normal (x, y, h) from the gradient of the rock function.
 const rock=(x,y,h)=>{const lev=h<=LH?1:2,col=columns(x,y),rel=relief(x,y,h,lev,col),z=h-(lev-1)*LH,e=.035,Gf=(a,b,c)=>rockG(lev,a,b,c);
  const gx=(Gf(x+e,y,h)-Gf(x-e,y,h))/(2*e),gy=(Gf(x,y+e,h)-Gf(x,y-e,h))/(2*e),gh=(Gf(x,y,h+e)-Gf(x,y,h-e))/(2*e),l=Math.hypot(gx,gy,gh)||1;
  return {lev,id:col.id,edge:col.edge,disp:rel,z,top:LH-z,N:[-gx/l,-gy/l,-gh/l]};};
 // Light reaching a rock point: soft shadow toward the key (x, y, h), and
 // ambient occlusion along the normal.
 const softShadow=(x,y,h,L,maxT=5)=>{let res=1,t=.12;
  // Start clear of the surface: a hit point can sit a hair inside rough rock,
  // and a ray that starts inside would shadow itself (black pepper dots).
  const lev0=h<=LH?1:2;for(let k=0;k<6&&rockG(lev0,x+L[0]*t,y+L[1]*t,h+L[2]*t)>=0;k++)t+=.06;
  for(let i=0;i<40&&t<maxT;i++){const px=x+L[0]*t,py=y+L[1]*t,ph=h+L[2]*t;if(ph>2*LH)break;
   const lev=ph<=LH?1:2,g=ph<=0?1:rockG(lev,px,py,ph);if(g>=0)return 0;
   res=Math.min(res,6*(-g)/t);t+=Math.max(.05,Math.min(.6,-g*.6));}
  return clamp(res);};
 const occlusion=(x,y,h,N,lev)=>{let occ=0,w=.5;
  for(const dd of [.07,.18,.36,.65,1.05]){const g=rockG(lev,x+N[0]*dd,y+N[1]*dd,h+N[2]*dd);occ+=w*Math.max(0,(dd+g)/dd);w*=.6;}
  return clamp(1-.75*occ);};
 // Distance (tiles) inside a tier's lip, and to the next tier's foot, relief
 // included; Infinity away from the outline (the chamfer maps take over).
 const lipDist=(x,y,lev)=>{if(lev<1)return Infinity;const g=rockG(lev,x,y,lev*LH-.02);return g>RIN?Infinity:Math.max(0,g);};
 const footDist=(x,y,lev)=>{if(lev>=2)return Infinity;const g=rockG(lev+1,x,y,lev*LH+.02);return g<-ROUT?Infinity:Math.max(0,-g);};
 return {W,H,LH,heightScale,extend,detail,RMAX,ROUT,RIN,field,levelAt,heightAt,woodAt,rawWood,grad,distUp,distDown,distAtLeast,sdAt,rockG,solidAt,rock,softShadow,occlusion,lipDist,footDist};
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
// cutscene maps them onto the ground plane, pre-scaled once to 256 px (with a mip
// chain for the perspective close-up) so the per-pixel painter can sample them
// without aliasing.
export async function loadGroundTextures(base='../../assets/environment/',n=256){
 const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('Missing '+src));i.src=src;});
 const out={};
 for(const [k,f]of [['grass','ground-grass.png'],['dirt','ground-dirt.png']]){
  let src=await load(base+f);
  while(src.width>n*2){const h=document.createElement('canvas');h.width=Math.round(src.width/2);h.height=Math.round(src.height/2);const g=h.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(src,0,0,h.width,h.height);src=h;}
  const levels=[];let prev=null;
  for(let m=n;m>=8;m/=2){const c=document.createElement('canvas');c.width=c.height=m;const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingQuality='high';g.drawImage(prev||src,0,0,m,m);levels.push({n:m,data:g.getImageData(0,0,m,m).data});prev=c;}
  out[k]={n,data:levels[0].data,levels};
 }
 return out;
}
const TEX_REPEAT=2.4; // tiles per repeat of a ground painting
// Texture lod for a pixel footprint (tiles per pixel) in the perspective painter.
export const groundLod=footprint=>Math.max(0,Math.log2(footprint*256/TEX_REPEAT));
function texel(T,u,v,lod=0){const L=T.levels?T.levels[Math.min(T.levels.length-1,Math.round(lod))]:T,n=L.n,d=L.data;u=(u-Math.floor(u))*n;v=(v-Math.floor(v))*n;const x0=u|0,y0=v|0,x1=(x0+1)%n,y1=(y0+1)%n,fx=u-x0,fy=v-y0,a=(y0*n+x0)*4,b=(y0*n+x1)*4,c=(y1*n+x0)*4,e=(y1*n+x1)*4;
 return [0,1,2].map(k=>d[a+k]*(1-fx)*(1-fy)+d[b+k]*fx*(1-fy)+d[c+k]*(1-fx)*fy+d[e+k]*fx*fy);}
// Two samples on rotated grids hide the repeat.
function ground(T,x,y,lod=0){const a=texel(T,x/TEX_REPEAT,y/TEX_REPEAT,lod),b=texel(T,(x+y)/(TEX_REPEAT*1.37)+.37,(x-y)/(TEX_REPEAT*1.37)+.71,lod);return [a[0]*.62+b[0]*.38,a[1]*.62+b[1]*.38,a[2]*.62+b[2]*.38];}
let TEX=null;
export const setGroundTextures=t=>{TEX=t||null;};

// --- terrain painter ----------------------------------------------------------
const PAL={
 meadowLight:[176,170,92],meadow:[128,138,64],meadowDark:[82,100,46],meadowWarm:[170,150,86],
 summit:[150,150,80],summitDark:[96,108,52],
 woodFloor:[58,70,36],woodFloorWarm:[84,72,44],
 stoneLight:[214,200,166],stone:[168,154,124],stoneDark:[104,92,74],stoneMoss:[112,118,66],
 scree:[150,140,112],
};
export function paintTerrain(ctx,sector,view,opts={}){
 const {width,height}=view,img=ctx.createImageData(width,height),d=img.data,LH=sector.LH;
 // March each pixel's view ray down from above the summit. The first sample
 // inside the rock brackets the surface; bisection finds the crossing. A
 // crossing at a tier's top height is that top; anything else is a face.
 // Samples every .12 of height (.2 tiles along the ground): the rock's relief
 // has columns and ledges finer than the old .3 spacing could catch.
 const HMAX=2*LH+.01,N=Math.max(12,Math.ceil(HMAX/.12)),TOL=.01;
 const hs=Array.from({length:N+1},(_,i)=>HMAX*(1-i/N));
 const inside=(sx,sy,h)=>{const [x,y]=view.unproject(sx,sy,h);return sector.solidAt(x,y,h);};
 TEX=opts.textures||null;
 const faces=new Uint8Array(width*height),depth=new Float32Array(width*height),ppt=view.w/Math.SQRT2;
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){
  const sx=px+.5,sy=py+.5;let i=1;
  while(i<N&&!inside(sx,sy,hs[i]))i++;
  let a=hs[i],b=hs[i-1];
  for(let k=0;k<10;k++){const m=(a+b)/2;if(inside(sx,sy,m))a=m;else b=m;}
  const [x,y]=view.unproject(sx,sy,a),k=Math.min(2,Math.round(a/LH)),face=Math.abs(a-k*LH)>TOL;
  const c=face?shadeFace(sector,x,y,a,ppt):shadeTop(sector,x,y,k,sx,sy);
  const p=py*width+px,o=p*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;if(face)faces[p]=1;depth[p]=view.depth(x,y,a);
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
 return {faces,depth};
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
  const [tx,ty]=view.unproject(x,y,0);
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
// Top surfaces: the game's ground paintings with painted variation, woodland
// floor, scree at each cliff foot and a rocky lip. lod > 0 samples a coarser
// mip (the perspective close-up's distant ground).
export function shadeTop(sector,x,y,lev,sx=0,sy=0,lod=0){
 const up=Math.min(sector.distUp(x,y),sector.footDist(x,y,lev)),down=Math.min(sector.distDown(x,y),sector.lipDist(x,y,lev));
 const n1=fbm(x*.08,y*.08,3,4),n2=fbm(x*.6,y*.6,11,3);
 let c;
 if(TEX){
  // Sunlit meadow from the game's grass painting; the summit a shade drier.
  const g=ground(TEX.grass,x,y,lod),lift=lev===2?[1.7,1.66,1.38]:[1.66,1.64,1.38];
  c=[g[0]*lift[0],g[1]*lift[1],g[2]*lift[2]];
  // Painted variation: broad light and shade, lusher hollows, dry sunlit patches.
  const v=.74+.5*n1;c=c.map(k=>k*v);
  c=mixc(c,[c[0]*.84,c[1]*.94,c[2]*.8],smooth(.58,.76,fbm(x*.13+7,y*.13,43,3))*.38);
  c=mixc(c,[c[0]*1.2,c[1]*1.08,c[2]*.78],smooth(.55,.78,fbm(x*.05,y*.05,41,3))*.6);
  const wd=sector.woodAt(x,y);if(wd>.05){const dt=ground(TEX.dirt,x*.9+3,y*.9+5,lod);c=mixc(c,[dt[0]*.58+g[0]*.28,dt[1]*.55+g[1]*.36,dt[2]*.5+g[2]*.2],smooth(.15,.75,wd)*.9);}
  const reach=lev===1?.7:1.6;
  if(up<reach){const dt=ground(TEX.dirt,x*1.3,y*1.3,lod),ao=smooth(reach*.75,0,up)*.36,s=smooth(reach*.8,.1,up)*smooth(.35,.75,fbm(x*.55,y*.55,61,2)+.1);
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
// Limestone faces in the storyboard's manner, lit by their own geometry: the
// key (warm) with a soft cast shadow, the sky (cool) with ambient occlusion,
// so jutting rock shades what lies behind it. Pale grey stone with ochre
// staining in patches, grey-green lichen, dark water streaks under each
// fracture, moss under the lip and a damp foot. pxPerTile fades out detail
// the eye cannot resolve and keeps the joint ink 1-2 px wide.
const SUN_WARM=[1.08,.92,.76],SKY_COOL=[.56,.61,.72],ROCK_INK=[34,30,28];
// A painter rakes the light across rock: the faces take a key from the front
// left (the side the cast shadows already imply) instead of the frontal sun.
const ROCK_KEY=(()=>{const v=[.15,.55,.85],n=Math.hypot(...v);return v.map(c=>c/n);})(); // (x, up, y)
export function shadeFace(sector,x,y,h,pxPerTile=37,key=ROCK_KEY){
 const R=sector.rock(x,y,h),N=R.N,L=[key[0],key[2],key[1]]; // N and L in (x, y, h)
 const ndl=Math.max(0,N[0]*L[0]+N[1]*L[1]+N[2]*L[2]),sky=.5+.5*N[2];
 const shadow=ndl>0?sector.softShadow(x+N[0]*.03,y+N[1]*.03,h+N[2]*.03,L):0,ao=sector.occlusion(x,y,h,N,R.lev);
 const tone=hash(R.id,R.lev,93),tone2=hash(R.id,R.lev,94),near=smooth(12,36,pxPerTile);
 let base=mixc([156,153,147],[202,197,188],tone);
 base=mixc(base,[206,152,100],smooth(.53,.77,fbm3(x*.5,y*.5,h*.16,95)+tone2*.12)*.78);       // ochre staining, in patches
 base=mixc(base,[150,156,140],smooth(.6,.78,fbm3(x*1.2,y*1.2,h*.5,96))*.5);                   // lichen
 const grain=(vnoise3(x*3,y*3,h*3,13)-.5)*14*smooth(3,12,pxPerTile)+(vnoise3(x*9,y*9,h*9,14)-.5)*10*near;
 // Shade keeps the sky's cool light (the storyboard's shadowed rock is a light
 // blue-grey, not black); the warm key adds on top where it reaches.
 let c=[0,1,2].map(k=>(base[k]+grain)*(SKY_COOL[k]*(.62+.38*sky)*.78*(.35+.65*ao)+SUN_WARM[k]*Math.pow(ndl,1.15)*.6*shadow*(.7+.3*ao)));
 c=mixc(c,[90,100,58],smooth(.45,0,R.top)*smooth(.35,.7,fbm3(x*.8,y*.8,h,29))*.6);         // moss under the lip
 // Rock that faces the sky holds soil: moss and grass on ledges and worn tops.
 // (Faded with distance: far off, each ledge is a few green pixels, a speck.)
 c=mixc(c,mixc([86,98,52],[128,128,70],vnoise3(x*2,y*2,h*2,30)),smooth(.45,.8,N[2])*.85*smooth(5,16,pxPerTile));
 c=mixc(c,[62,60,56],smooth(.6,0,R.z)*.35);                                                    // damp foot
 // Water streaks: dark vertical runs, strongest just below the lip and fractures.
 const run=vnoise3(x*2.6,y*2.6,h*.05,59);c=mixc(c,[64,64,62],smooth(.66,.86,run)*smooth(0,1.2,R.top)*.32);
 // A few long cracks, only where they can be resolved.
 if(near>0){const cr=Math.abs(vnoise3(x*1.4,y*1.4,h*.12,321)-.5);c=mixc(c,ROCK_INK,smooth(.018,0,cr)*.55*near*smooth(.45,.65,vnoise3(x*.4,y*.4,h*.2,322)));}
 // Ink in the joints, 1-2 px wide whatever the zoom.
 c=mixc(c,ROCK_INK,smooth(1.5,.35,R.edge*pxPerTile)*.8);
 return c;
}
