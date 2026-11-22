import {V,Q,clamp,smooth,track,MASS_SEGMENTS,BODY_MASS,createSurfaceProbe} from './traversal-pose.js';
// Balance for the tile-to-tile traversals (docs/tactics/NATURAL-TRAVERSAL.md): the centre of mass is planned against
// what actually holds the body at each moment, then the hips are moved until the real centre of mass follows the plan
// (the grenade throw's pendulum, grenade-throw-motion.js, generalised to flight and grips).
// The plan stays as near the authored path as the contacts allow, with low jerk, subject to:
// - airborne (nothing touching): exactly ballistic, a = -g;
// - on the feet alone: the pressure point of a linear inverted pendulum, p = c - h a / (g + a_y), inside the soles'
//   outline (their convex hull), the push within friction, and the floor pushing (never pulling);
// - hands gripping (with or without feet): any direction, each axis within FMAX body weights;
// - held as a seat (the climb's top for a deep body): pushing up between none and FMAX body weights, never pulling,
//   the push sideways within friction;
// - at rest at either end, as the battle's own stance hands over: the first sample on the authored path, with no
//   velocity and no acceleration there, the first interval a cubic from rest; at the end the same into the last sample
//   before the crossing's end, the last sample (at the end or up to 5 ms past it) held there too; these rows met
//   exactly (stiff: see boxedPath). With the first two samples pinned equal instead, the plan stood still for 5 ms and
//   then accelerated all at once, and the hips' track through it overshot that step by about 40%: on the goat's window
//   the centre of mass went 3.9 m/s^2 sideways at 5 ms where the plan asked 2.7, its pressure point, planned at the
//   heel-side margin, carried past the heels (76 N of phantom force, 104% of the limit, once the hooves stood flat).
//   Resting at the last sample, past the end, with the rows met only as far as the iterations reached, the rabbit's
//   still moved 5.8 mm/s at the end (3.4 with the pins). Now it starts under 0.1 m/s^2 and ends under 0.3 mm/s; the
//   first interval's ramp still overshoots the plan's first acceleration, by up to a third (the goat's 3.4 sideways at
//   5 ms against its 2.7): see END_MARGIN.
// A convex quadratic programme per axis (the vertical first: the pendulum's stiffness h / (g + a_y) comes from it),
// solved by ADMM on one banded factorisation. Clamping the pressure point sample by sample instead (re-weighted least
// squares) turned the feet into an unstable pendulum: the plan drifted 90 cm sideways and snapped back.
// The feet's push fades over RAMP samples next to a flight, to a tenth of the body's weight at its edge (quadratic):
// the push before a toe-off and the catch after a landing build as real ones do, and a toe-off a sample earlier than
// planned (moving the hips moves it) costs that tenth, where at full push it read as 3 body weights of phantom.
const G=9.81,FMAX=3,MU=.9,RAMP=4;
function cholesky(n,k,A){const w=k+1,L=Float64Array.from(A);
 for(let i=0;i<n;i++)for(let j=Math.max(0,i-k);j<=i;j++){let s=L[i*w+j-i+k];for(let m=Math.max(0,i-k);m<j;m++)s-=L[i*w+m-i+k]*L[j*w+m-j+k];
  if(j===i)L[i*w+k]=Math.sqrt(Math.max(s,1e-18));else L[i*w+j-i+k]=s/L[j*w+k];}
 return L;}
function cholSolve(n,k,L,b,y=new Float64Array(n),x=new Float64Array(n)){const w=k+1;for(let i=0;i<n;i++){let s=b[i];for(let m=Math.max(0,i-k);m<i;m++)s-=L[i*w+m-i+k]*y[m];y[i]=s/L[i*w+k];}
 for(let i=n-1;i>=0;i--){let s=y[i];for(let m=i+1;m<=Math.min(n-1,i+k);m++)s-=L[m*w+i-m+k]*x[m];x[i]=s/L[i*w+k];}
 return x;}
// One channel, or several interleaved (stride 2: x0, z0, x1, z1, ..., each with its own jerk): minimise
// sum wT (c - c0)^2 + wJ |third difference|^2 subject to lo <= row . c <= hi for every row ({at, c: coefficients, lo,
// hi}; an equality has lo = hi; a half-plane has lo = -Infinity). Rows are scaled to unit norm. A row's stiff
// multiplies its step size rho (OSQP gives equality rows 1000 times the rest; here the plan's end rows alone take it,
// its flights' rows keep rho): the iterations stop at iters, and on the plans' cross programme (x and z, coupled over
// the whole crossing) they stopped with the rows met to about 1e-5, the end rows among them. Kept at rho, the end rows
// miss by up to 74 um on the windows (the rabbit's) and 277 on the climbs (the rabbit's), so the plan's first interval
// is no longer from rest: the rabbit's window's centre of mass starts at 0.51 m/s^2 (1.65 a millisecond in).
export function boxedPath(c0,wT,wJ,rows,{rho=2e5,iters=1500,tol=1e-8,stride=1}={}){
 const n=c0.length,R=rows.map(r=>{const s=Math.hypot(...r.c)||1;return {at:r.at,c:r.c.map(x=>x/s),lo:r.lo/s,hi:r.hi/s,rho:rho*(r.stiff||1)};}),W=R.reduce((m,r)=>Math.max(m,r.c.length),3),k=Math.max(3*stride,W-1),w=k+1,M=new Float64Array(n*w);
 const jerk=[-1,3,-3,1].flatMap((x,i)=>i?[...new Array(stride-1).fill(0),x]:[x]);
 const outer=(at,cs,f)=>{for(let a=0;a<cs.length;a++){const i=at+a;if(i<0||i>=n)continue;for(let b=0;b<=a;b++){const j=at+b;if(j<0)continue;M[i*w+j-i+k]+=f*cs[a]*cs[b];}}};
 for(let i=0;i<n;i++)M[i*w+k]+=wT[i];for(let i=0;i+3*stride<n;i++)outer(i,jerk,wJ);for(const r of R)outer(r.at,r.c,r.rho);
 // the iterations run on flat arrays (rows of up to W coefficients): the same sums in the same order
 const L=cholesky(n,k,M),m=R.length,at=Int32Array.from(R,r=>r.at),len=Uint8Array.from(R,r=>r.c.length),C=new Float64Array(m*W),lo=Float64Array.from(R,r=>r.lo),hi=Float64Array.from(R,r=>r.hi),rh=Float64Array.from(R,r=>r.rho);
 R.forEach((r,j)=>r.c.forEach((x,a)=>{C[j*W+a]=x;}));
 const dot=(j,c)=>{let s=0;for(let a=0;a<len[j];a++)s+=C[j*W+a]*c[at[j]+a];return s;};
 let c=Float64Array.from(c0);const z=new Float64Array(m),u=new Float64Array(m),b0=Float64Array.from(c0,(x,i)=>wT[i]*x),b=new Float64Array(n),y=new Float64Array(n);for(let j=0;j<m;j++)z[j]=clamp(dot(j,c),lo[j],hi[j]);let res=Infinity;
 for(let it=0;it<iters&&res>tol;it++){b.set(b0);
  for(let j=0;j<m;j++){const v=rh[j]*(z[j]-u[j]);for(let a=0;a<len[j];a++)b[at[j]+a]+=C[j*W+a]*v;}c=cholSolve(n,k,L,b,y,c===c0?new Float64Array(n):c);
  res=0;for(let j=0;j<m;j++){const ax=dot(j,c),zn=clamp(ax+u[j],lo[j],hi[j]);u[j]+=ax-zn;z[j]=zn;res=Math.max(res,Math.abs(ax-zn));}}
 return {c,res};}
// samples: [{c: [x,y,z] authored centre of mass, kind: 'air' | 'grip' | 'feet' | 'hold', box: [xmin,xmax,zmin,zmax] and
// hull: [[x,z], ...] counter-clockwise (feet), floor: y}] on a uniform grid dt. 'hold' keeps the authored path as near
// as its support allows (a support this plan must not move, such as a seat the hips' own move would lift): weighed in
// heavily, at its authored height, and across like the feet; with heightOnly, its height alone and lightly (wL: a body
// lying on the floor slides on it and gives a little, but cannot rise off it), planned across exactly as the feet are.
// At wL 50 the plan softens a window roll's landings within half a centimetre of the floor (the donkey's seat landing
// 4.7 body weights, read every millisecond; at 400, 5.1; at 20, 4.5, its pig director 0.6 cm up). With seat, a held
// seat: it pushes between none and fmax body weights, as a floor does, and never pulls (the climb's top; see below).
export function planCentre(samples,dt,{jerk:wJ=2e5,hold:wH=400,level:wL=50,fmax=FMAX,margin=.01}={}){
 const n=samples.length,d2=dt*dt,c0=[0,1,2].map(ax=>Float64Array.from(samples,s=>s.c[ax])),wT=samples.map(s=>s.kind==='hold'?(s.heightOnly?wL:wH):1),wA=samples.map(s=>s.kind==='hold'&&!s.heightOnly?wH:1),acc=[1,-2,1];
 // the ends at rest, met exactly (stiff): the first sample on the authored path and the next on the cubic from rest
 // (c1 = (7 c0 + c2) / 8); at the end the same into the last sample before the crossing's end, the last one held there
 const EQ=1e3,ends=ax=>[{at:0,c:[1],lo:c0[ax][0],hi:c0[ax][0],stiff:EQ},{at:0,c:[7,-8,1],lo:0,hi:0,stiff:EQ},{at:n-4,c:[1,-8,7],lo:0,hi:0,stiff:EQ},
  {at:n-2,c:[1],lo:c0[ax][n-1],hi:c0[ax][n-1],stiff:EQ},{at:n-1,c:[1],lo:c0[ax][n-1],hi:c0[ax][n-1],stiff:EQ}];
 // Vertical: ballistic in flight; a floor pushes between .3 and fmax body weights, a grip either way up to fmax, a
 // held seat between none and fmax. Held with no bounds, the climb's seat over the top let the plan pull the pig
 // foreman down at 5.2 g (51.4 m/s^2 at 3.380 s) where its band dropped it 8.3 cm in 15 ms, with only a trouser fold
 // on the top (3046 N of phantom force); with the band resting its torso and no bounds, the plan pulled it down at
 // 5.2 g at 3.655 s and its required force read 6.0 body weights for 1 ms at 3.632 s.
 // A feet sample's ceil, where given, is the highest its centre of mass may go (see balanceTraversal's ceiling).
 const edge=i=>{for(let k=1;k<=RAMP;k++)if(samples[i-k]?.kind==='air'||samples[i+k]?.kind==='air')return ((k-1)/RAMP)**2;return 1;};
 const ry=ends(1);for(let i=1;i<n-1;i++){const s=samples[i];if(s.kind==='air')ry.push({at:i-1,c:acc,lo:-G*d2,hi:-G*d2});
  else if(s.kind==='feet'){const r=edge(i);ry.push({at:i-1,c:acc,lo:(.3*r-1)*G*d2,hi:(.1+(fmax-.1)*r-1)*G*d2});}else if(s.kind==='grip')ry.push({at:i-1,c:acc,lo:(-fmax-1)*G*d2,hi:(fmax-1)*G*d2});
  else if(s.kind==='hold'&&s.seat)ry.push({at:i-1,c:acc,lo:-G*d2,hi:(fmax-1)*G*d2});
  if(Number.isFinite(s.ceil))ry.push({at:i,c:[1],lo:-Infinity,hi:s.ceil});}
 const Y=boxedPath(c0[1],wT,wJ,ry),ay=i=>i>0&&i<n-1?(Y.c[i+1]-2*Y.c[i]+Y.c[i-1])/d2:0;
 const out=[null,Y.c,null],res=[0,Y.res,0];
 // A feet (or held) sample's outline is the intersection of its neighbours' within two samples: a foot lifting a sample
 // earlier than planned (moving the hips moves it) left the pressure point outside the one still down (41% of the body's weight).
 const sup=s=>(s?.kind==='feet'||s?.kind==='hold')&&s.hull,outlineAt=i=>{let P=samples[i].hull;for(let j=i-2;j<=i+2&&P.length>=3;j++)if(j!==i&&sup(samples[j]))P=clipConvex(P,samples[j].hull);
  return P.length>=3&&areaOf(P)>1e-6?P:samples[i].hull;};
 // Across, x and z together (interleaved: the outline's edges couple them): ballistic in flight, a grip within fmax
 // either way, and on the feet the pressure point inside the support's outline and the push within friction. The
 // outline is the contacts' convex hull, each edge drawn in by margin but never past its centre; their bounding box
 // let the pressure point sit 4 to 11 cm off the line between two hands set down on a diagonal (the window's), where
 // the rig, reading the hull, found 20 to 32% of the body's weight of phantom force. A held stretch is planned across
 // as the feet are, near its authored path: held by its weight alone, the plan left it at 2 g in its last samples to
 // meet the feet's outline after it, where the floor could push it no more than friction allows (as a body rose off
 // its seat with its centre of mass 7 cm behind its heels: 121% of the body's weight of phantom force).
 // On the rows of the first and last END samples (samples 1 to 4 and n-5 to n-2, 20 ms at either end) the edges are
 // asked in by END_MARGIN: there the hips' track, easing from rest into the plan's first acceleration, overshoots it by
 // up to a third, and the plan ran its pressure point to the margin (the goat's to the heel side, from its first sample
 // to its seventh), so the track carried it behind the heels: the dog's window read 130% of the limit at 5 ms. Asked
 // in 4 cm there (the one setting gated), 95%. Against the plan's own centimetre it lowered every crossing's worst
 // reading within 10 ms of either end by 26 to 36 points at 148c6fb7 (the thirteen gated there, and the bull's and
 // cow's climbs; with the push's ceiling, the climbs' by 6 to 38). There, before the ceiling (planCentre's ceil), it
 // also put the bull's and cow's crouch over the limit (12 and 16 readings, and three more each at the top), moving
 // the plan up to 3.9 mm through the bull's first 0.65 s; solved to 100000 iterations, their crouch read over with
 // either margin. With the ceiling their crouch reads nothing with either, and over the eleven climbs on e909dcf4 the
 // margin took the readings within 10 ms of an end from 5 to 3 and those in all from 1871 to 1878. The plan does not
 // meet these rows: it stops with its rows met to about 1e-5, which on a pressure point's row is centimetres (its
 // pressure point at the dog's sample 1 lies 3.3 cm outside the outline, 6.0 without the margin). The margin works by
 // nudging that solve, so only the gate sees it (the test suite passes without it): the dog's window and the climbs
 // are gated again after any change to the plan, its iterations or the hips' track.
 const END=4,END_MARGIN=.04,acc2=[1,0,-2,0,1],rows=[];for(const ax of [0,2])rows.push({at:ax/2,c:[1],lo:c0[ax][0],hi:c0[ax][0],stiff:EQ},{at:ax/2,c:[7,0,-8,0,1],lo:0,hi:0,stiff:EQ},{at:2*(n-4)+ax/2,c:[1,0,-8,0,7],lo:0,hi:0,stiff:EQ},
  {at:2*(n-2)+ax/2,c:[1],lo:c0[ax][n-1],hi:c0[ax][n-1],stiff:EQ},{at:2*(n-1)+ax/2,c:[1],lo:c0[ax][n-1],hi:c0[ax][n-1],stiff:EQ});
 for(let i=1;i<n-1;i++){const s=samples[i],at=2*(i-1),both=(lo,hi)=>rows.push({at,c:acc2,lo,hi},{at:at+1,c:acc2,lo,hi});
  if(s.kind==='air'){both(0,0);continue;}
  if(s.kind==='grip'){both(-fmax*G*d2,fmax*G*d2);continue;}
  // A held seat keeps a hold's sideways bounds, as if it bore .3 g at least, even where its plan rides -g and it bears
  // nothing; the push then comes from elsewhere. On the climb's top a hand grips the wall at most seated samples
  // (supportAt reads a grip, no outline, at 211 and 213 of each pig's 227; at the other 16 and 14, from 2.970 to 3.045
  // s on the foreman and 2.985 to 3.050 on the director, with the left hand off the top and the right on its way from
  // its hold, which it leaves at 2.90 s, to the far grip, it reads the seat's outline, which takes the feet's bounds
  // below), and a seat's bounds, up, down and sideways, lie inside a grip's: the pigs' plans ride -g at 14 and 9 of the
  // 227 (13 and 9 on 374c624c, 13 and 10 on 8da9a826, 13 and 9 on c44413ef, 26 and 9 on f293da69, 16 and 9 on ba891c83)
  // and push the body sideways there at up to 4.89 and 3.86 m/s^2, at 2.985 and 2.995 s, inside the outline's samples
  // (3.75 on 8da9a826, at 3.680 and 3.265 s, outside them), and the gate reads no phantom wrench over its limits on
  // either pig from 2.55 to 3.68 s (its required force there stays under its 5 body weights: at the most 3.7 on the pig
  // foreman at 3.646 s and 3.3 on the director at 3.037, against the 6.5 the director's old left elbow whip read at
  // 3.517 on c44413ef).
  if(s.kind==='hold'&&!s.hull){const fy=Math.max(.3*G,ay(i)+G);both(-MU*fy*d2,MU*fy*d2);continue;}
  if(s.kind!=='feet'&&s.kind!=='hold')continue;const fy=Math.max(.3*G,ay(i)+G),h=Math.max(.2,Y.c[i]-(s.floor||0)),k=h/fy,a=-k/d2,b=1+2*k/d2;
  // The pressure point also carries the body's turning: p_x = c_x - k a_x + dL_z / (M fy), p_z = c_z - k a_z - dL_x / (M fy).
  const dx=s.dL?s.dL[2]/(BODY_MASS*fy):0,dz=s.dL?-s.dL[0]/(BODY_MASS*fy):0,H=outlineAt(i),cx=H.reduce((m,p)=>m+p[0],0)/H.length,cz=H.reduce((m,p)=>m+p[1],0)/H.length;
  for(let j=0;j<H.length;j++){const p=H[j],q=H[(j+1)%H.length],ex=q[0]-p[0],ez=q[1]-p[1],l=Math.hypot(ex,ez);if(l<1e-9)continue;const nx=ez/l,nz=-ex/l;
   rows.push({at,c:[nx*a,nz*a,nx*b,nz*b,nx*a,nz*a],lo:-Infinity,hi:Math.max(nx*p[0]+nz*p[1]-(i<=END||i>=n-1-END?END_MARGIN:margin),nx*cx+nz*cz)-nx*dx-nz*dz});}
  both(-MU*fy*d2,MU*fy*d2);}
 const XZ=boxedPath(Float64Array.from({length:2*n},(_,j)=>c0[j&1?2:0][j>>1]),Float64Array.from({length:2*n},(_,j)=>wA[j>>1]),wJ,rows,{stride:2});
 out[0]=Float64Array.from({length:n},(_,i)=>XZ.c[2*i]);out[2]=Float64Array.from({length:n},(_,i)=>XZ.c[2*i+1]);res[0]=res[2]=XZ.res;
 const plan=Array.from(out[0],(x,i)=>[x,out[1][i],out[2][i]]);plan.residual=res;return plan;}
// The convex hull of points [x, z], counter-clockwise (Andrew's monotone chain), or the box [xmin, xmax, zmin, zmax]
// as a polygon where the points are too few or in one line.
const areaOf=P=>{let a=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;};
function hullOf(pts,box){
 const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),P=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),lo=[],up=[];
 for(const p of P){while(lo.length>=2&&cr(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
 for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up.at(-2),up.at(-1),p)<=0)up.pop();up.push(p);}
 const H=lo.slice(0,-1).concat(up.slice(0,-1));
 return H.length>=3&&areaOf(H)>1e-6?H:[[box[0],box[2]],[box[1],box[2]],[box[1],box[3]],[box[0],box[3]]];}
// P inside convex Q, both counter-clockwise (Sutherland-Hodgman).
function clipConvex(P,Q){let out=P;
 for(let i=0;i<Q.length&&out.length;i++){const a=Q[i],b=Q[(i+1)%Q.length],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),inp=out;out=[];
  for(let j=0;j<inp.length;j++){const p=inp[j],q=inp[(j+1)%inp.length],sp=side(p),sq=side(q);if(sp>=0)out.push(p);if((sp>=0)!==(sq>=0)){const f=sp/(sp-sq);out.push([p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f]);}}}
 return out;}
// The hips shift that makes the real centre of mass follow the plan: comAt(t, shift) poses the motion with the hips
// moved by shift ([x,y,z]) and returns its centre of mass. The pelvis carries most of the body, so each pass moves it
// by GAIN x the miss (the grenade throw's measured inverse sensitivity with the feet planted).
// base(t) is a hips offset the motion adds on top ([x,y,z], the clearance fit's): the shift is interpolated together
// with it and handed back without it, so between samples the hips follow their smooth sum. The shift cancels what
// the plan smooths out of that offset; apart, each kept its own knots (the fit's 20 ms, the shift's 5 ms), and the
// onset of a clearance push back from the wall read as 480 N of phantom push between samples. Their sum is the C2 cubic
// spline through the samples (track's spline: see there), handed out too as hips (the hips' whole move).
// A pass moves a sample's hips at most STEP on each axis: a sample whose centre of mass stopped answering the hips (a
// catch whose hands missed the top) ran 1.3 m away in five passes.
const GAIN=1.29,STEP=.2;
export function followCentre(times,plan,comAt,{passes=5,base=null,from=null}={}){
 const shift=from?from.map(x=>x.slice()):times.map(()=>[0,0,0]);let worst=0;
 for(let p=0;p<passes;p++){worst=0;times.forEach((t,i)=>{const c=comAt(t,shift[i]);for(let ax=0;ax<3;ax++){const miss=plan[i][ax]-c[ax];shift[i][ax]+=clamp(GAIN*miss,-STEP,STEP);worst=Math.max(worst,Math.abs(miss));}});}
 const tr=track(times.map((t,i)=>{const b=base?base(t):[0,0,0];return [t,...shift[i].map((x,ax)=>x+b[ax])];}),{},{limit:false,spline:true});
 return {shift:t=>{const tc=clamp(t,times[0],times.at(-1)),s=V(...tr(tc));return base?s.sub(V(...base(tc))):s;},hips:t=>V(...tr(clamp(t,times[0],times.at(-1)))),worst,samples:shift};}
// What holds the body at a moment, from its real surface (the phantom-wrench rig's contacts: within 1 cm):
// - a hand on an obstacle grips, on its top or against a face (the rig's rule; a palm against a face holds nothing,
//   but the climb's landing leans on one). A hand is skin the hand or fingers carry most of, on a mesh the rig names a
//   hand; the rest of that mesh, the forearm and the elbow, grips only hooked over a top (within TOL of its height),
//   and elsewhere against a face it is a part that can only push (below). Where the body is held (held: the motion's
//   hold) the old rule stands, the whole mesh gripping, so this rule leaves the held stretches as they were. The rig
//   lets the whole mesh grip anywhere, so the plan counts on less than the rig allows (a support the plan leaves
//   unused reads nothing in the rig).
//   By the mesh alone an elbow brushing a face gripped: walking away from the wall, ten climbs read a grip from their
//   right elbows on its far face (from 5.150 to 5.295 s, 45 to 120 ms each, 20 ms after the touch), and the plan pulled
//   the body back toward the wall on one boot (by 1.2 to 5.6 m/s^2 at most; the pig foreman's 2.5, where the rig,
//   finding only its sleeve on the face as played, read up to 158 N of phantom force: 84 + 7 readings over the limit).
//   Held, a grip only lifts the outline (planCentre keeps the hold by friction alone). The cow's and skunk's rolls on
//   the floor past the window's sill read one from their right elbows on its far face (from 3.195 to 3.325 s and from
//   2.940 to 3.045), and their plans there are not physical either: the skunk's pushes it along the sill at up to
//   13.3 m/s^2, its pressure point 27 to 42 cm outside the floor's outline (the cow's up to 37), which the rig misses
//   because it, too, lets the elbow grip (it reads nothing over the limit through the skunk's stretch, and 9 readings
//   at the start of the cow's). Held within that outline instead, the skunk's window read 301 readings over the limit
//   against 126, the cow's 59 against 53. A held body leaning on a face is left open;
// - anything on the floor stands on it (hooves, hands, a back in a roll), and so does a part on an obstacle's top or
//   its edge (within TOL of the top's height: the rig reads a point just past the edge as touching the edge, pushing up
//   and out) while the centre of mass is above that top or less than DRAPE below it (a belly on a sill): their extent
//   is the pressure point's outline (their convex hull), the floor's height (or the top's, with nothing on the floor)
//   its plane;
// - a part against a face, or on a top the body hangs below, is not counted: it can only push, and a plan leaning on
//   it would ask what it cannot give (the boots on the near face as the body walks up it, an elbow brushing the far
//   face as it walks away);
// - nor is a tail beyond its root on an obstacle: the tails are fitted out of the obstacles again once the balance has
//   moved the body (fit.solveTail), so the plan must not count on that support (the skunk's plume lay on the window's
//   sill behind it as its hips came down for its last step; the plan leant on it, the plume was then fitted 3.4 cm
//   clear, and the rig found the boot alone under the body: 102 readings over the limit). A support the plan does not
//   use costs nothing. On the floor a tail counts (the stalled roll turns on the skunk's plume: left out there too,
//   that roll's sit up read 43 readings, 17 with it);
// - nothing counted is flight.
// DRAPE: a body draped over a top with its centre of mass a little below it (over the window's sill as it reaches for
// the floor, 2 cm below) still lies on it; one hanging well below (from the wall's top at a catch, 70 cm) does not:
// there only what grips holds it.
const TOL=.01,DRAPE=.15,ENDS=new WeakMap();
// The contacts' probe: the rig's own surface, every vertex (a fit's probe, every other vertex, found the hooves down 5 to
// 10 ms before the rig at a landing; every third of the body's missed a belly sliding over the window's sill, touching
// it between them: every vertex 0.03 to 0.3 cm off it, every third 1.5 to 2.2 cm).
// The tails are read as the motion poses them before each update: bent, their base squashed onto the floor, as
// played. Read once, as made, the skunk's plume lay straight back along the floor 31 to 58 cm behind its boots
// through its last steps, where the played one rises clear, and the plan leant on it (its last step read 40% of its
// weight).
// tails (the motion's createTailBend) tells a tail's root from the rest (see supportAt).
export const contactProbe=(worker,tails=null)=>Object.assign(createSurfaceProbe(worker,{stride:1,live:m=>/tail/.test(m.name)}),{tails});
// Per probe point: 1 a hand (skin the hand or fingers carry most of, on a mesh the rig names a hand: a sleeve cuff
// riding the hand bone is not a grip), 4 the rest of a hand's mesh (the forearm, the elbow), 2 a foot, 3 a tail beyond
// its root, 0 the rest. Read once the probe has been skinned (its part indices are set by update).
const endsOf=probe=>{let e=ENDS.get(probe);if(!e){const kind=probe.names.map(p=>/hand/.test(p)?1:/hoof|boot|foot|toe/i.test(p)?2:0),handBone=probe.boneNames.map(b=>/^(hand|fingers)/.test(b));e=Uint8Array.from(probe.part,(pi,i)=>probe.tails&&/tail/.test(probe.names[pi])&&!probe.tails.isRoot(probe.names[pi],probe.vertex[i])?3:kind[pi]===1&&!handBone[probe.bone[i]]?4:kind[pi]);ENDS.set(probe,e);}return e;};
export function supportAt(probe,obstacles,com,held=false){
 const over=(x,z)=>obstacles.some(b=>x>b.min[0]&&x<b.max[0]&&z>b.min[2]&&z<b.max[2]),ends=endsOf(probe),grow=(b,x,z)=>{b[0]=Math.min(b[0],x);b[1]=Math.max(b[1],x);b[2]=Math.min(b[2],z);b[3]=Math.max(b[3],z);};
 let grip=false,top=null;const box=[Infinity,-Infinity,Infinity,-Infinity],onTop=[Infinity,-Infinity,Infinity,-Infinity],pts=[],topPts=[];
 for(let i=0;i<probe.count;i++){const x=probe.x[i],y=probe.y[i],z=probe.z[i],e=ends[i];
  if(y<TOL&&y>-TOL&&!over(x,z)){grow(box,x,z);pts.push([x,z]);continue;}
  if(e===3)continue;for(const o of obstacles){const dx=Math.max(o.min[0]-x,0,x-o.max[0]),dy=Math.max(o.min[1]-y,0,y-o.max[1]),dz=Math.max(o.min[2]-z,0,z-o.max[2]);if(dx>=TOL||dy>=TOL||dz>=TOL)continue;const inside=!dx&&!dy&&!dz;
   const d=inside?Math.min(x-o.min[0],o.max[0]-x,y-o.min[1],o.max[1]-y,z-o.min[2],o.max[2]-z):Math.hypot(dx,dy,dz);if(d>=TOL)continue;
   if(e===1||e===4&&(held||y>o.max[1]-TOL))grip=true;else if(y>o.max[1]-TOL&&com&&com[1]>o.max[1]-DRAPE){grow(onTop,x,z);topPts.push([x,z]);top=Math.max(top??-Infinity,o.max[1]);}}}
 if(grip)return {kind:'grip'};
 if(box[0]<=box[1]){if(onTop[0]<=onTop[1]){grow(box,onTop[0],onTop[2]);grow(box,onTop[1],onTop[3]);}return {kind:'feet',box,hull:hullOf(pts.concat(topPts),box),floor:0};}
 return onTop[0]<=onTop[1]?{kind:'feet',box:onTop,hull:hullOf(topPts,onTop),floor:top}:{kind:'air'};}
// The whole pipeline for a motion: pose(t) poses it (with the hips moved by the current trial shift, set through
// setShift) and returns its points; com(points) is its centre of mass.
// Angular momentum about the centre of mass at each grid sample, from the posed points (the rig's model: each
// segment's mass at its middle plus a rod's spin, m l^2 / 12 (u x du/dt)), its rate, and the inertia about the centre
// of mass (row-major 3 x 3: each middle's m (|r|^2 E - r r^T) plus each rod's m l^2 / 12 (E - u u^T)).
function inertia(P,c){const I=new Float64Array(9);for(const [a,b,m]of MASS_SEGMENTS){const r=P[a].clone().add(P[b]).multiplyScalar(.5).sub(c),u=P[b].clone().sub(P[a]),l2=u.lengthSq();u.normalize();
 const R=[r.x,r.y,r.z],U=[u.x,u.y,u.z],rr=r.lengthSq();for(let i=0;i<3;i++)for(let j=0;j<3;j++)I[3*i+j]+=m*((i===j?rr:0)-R[i]*R[j]+l2/12*((i===j?1:0)-U[i]*U[j]));}return I;}
const solve3=(A,v)=>{const [a,b,c,d,e,f,g,h,k]=A,det=a*(e*k-f*h)-b*(d*k-f*g)+c*(d*h-e*g),inv=[e*k-f*h,c*h-b*k,b*f-c*e,f*g-d*k,a*k-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d];
 return [0,1,2].map(i=>(inv[3*i]*v[0]+inv[3*i+1]*v[1]+inv[3*i+2]*v[2])/det);};
function turning(frames,dt){const n=frames.length,mid=(P,a,b)=>P[a].clone().add(P[b]).multiplyScalar(.5),c=frames.map(P=>{const x=V();for(const [a,b,m]of MASS_SEGMENTS)x.addScaledVector(mid(P,a,b),m);return x.divideScalar(BODY_MASS);});
 const L=frames.map((P,i)=>{const A=frames[Math.max(0,i-1)],B=frames[Math.min(n-1,i+1)],h=(Math.min(n-1,i+1)-Math.max(0,i-1))*dt,vc=c[Math.min(n-1,i+1)].clone().sub(c[Math.max(0,i-1)]).divideScalar(h),out=V();
  for(const [a,b,m]of MASS_SEGMENTS){const vm=mid(B,a,b).sub(mid(A,a,b)).divideScalar(h),u=P[b].clone().sub(P[a]),len=u.length();u.divideScalar(len);
   const du=B[b].clone().sub(B[a]).normalize().sub(A[b].clone().sub(A[a]).normalize()).divideScalar(h);out.add(mid(P,a,b).sub(c[i]).cross(vm.sub(vc)).multiplyScalar(m)).add(u.cross(du).multiplyScalar(m*len*len/12));}return out;});
 const dL=L.map((_,i)=>L[Math.min(n-1,i+1)].clone().sub(L[Math.max(0,i-1)]).divideScalar((Math.min(n-1,i+1)-Math.max(0,i-1))*dt));
 // a light five-sample average: the differences of differences are noisy at 5 ms
 return {dL:dL.map((_,i)=>{const s=V();let m=0;for(let j=i-2;j<=i+2;j++)if(j>=0&&j<n){s.add(dL[j]);m++;}return s.divideScalar(m).toArray();}),L:L.map(v=>v.toArray()),I:frames.map((P,i)=>inertia(P,c[i]))};}
// The body's turning. Nothing touches in flight, so there its angular momentum about the centre of mass must hold (the
// rig allows 10 N·m of phantom torque airborne); on contacts it may change, but only as fast as they can turn the body
// (a leg's swing or a stepping hoof's arrival asked 270 to 640 N·m of one hand or one hoof in 30 ms). Everywhere the
// limbs keep their authored motion and the whole body turns about its centre of mass at the rate w = I^-1 (L* - L)
// that gives it the angular momentum L*, as a diver or a skater does:
// - in flight L* is the flight's median (taken at the catch, which carries the arms' reach onto the top, the whole
//   flight turned and wound 59 degrees into the push);
// - on contacts L* is L averaged over TAU either side, blended into a flight's median over EASE before and after it,
//   and a turn left from a flight unwinds there over UNWIND;
// - a take-off's flight is held from LEAD before the hooves leave (turnAir: the last five samples of a run on the feet
//   longer than that, just before a flight), as the legs begin to fold: there the push fades to a tenth of the body's
//   weight (RAMP), and the floor cannot turn the body as the legs' swing asks. On the horse's climb the legs' own
//   angular momentum turned at 0.851 s and swung 4.3 N·m·s by its last foot sample (0.870), at up to 356 N·m, its
//   hooves bearing 2087 N at 0.845 s and 147 at 0.865. Held from the first sample in the air, the turn left that swing
//   to the floor: the body's angular momentum changed at up to 398 N·m at 0.865 s, and the rig read 252 N and 115 N·m
//   of phantom wrench there. Across the release (15 ms before the last foot sample to 10 ms after) the eleven climbs
//   read 229 to 408 N·m that way, and 12 to 64 held from LEAD before (15 to 63 since the climb's left foot steps back,
//   wall-climb.js), the plan reading no turning on the lead (below, at the rounds); their push-off and flight up read
//   105 readings over the limit against 381 (14 on the feet against 144), all their readings 333 against 620 (at a 20
//   or 30 ms lead 378 or 313; at 30 the horse's push reads 541% at 0.744 s, 227 at 25, and the rabbit's catch 1133% at
//   1.224 s, 999 at 25, 824 at 1.225 since the climb's flights' turn every millisecond, below). A run on the feet no
//   longer than the lead (a touch between two flights) is left as it is: held whole, it would join the flights under
//   one median (none of the 33 crossings has one; the unit test of turnAir reaches that branch). The support schedule
//   is as it was on ten climbs; the donkey's catch comes one sample later (1.250 s; in its second round 1.245 again
//   since the climb's left foot steps back, wall-climb.js).
// - a let-go's is not (a run on a grip before a flight). Held from LEAD before the hands leave as well, the turn helped
//   only while a deep body's palms stopped at a key past the far edge: the pigs' far hang raised to their arms' reach
//   (wall-climb.js) read 41 and 23 readings over the limit in their let-go and drop held from the flight's first
//   sample (the foreman's drop 10810% at 4.265 s), 15 and 10 held from the lead. With their palms arcing off the top
//   (wall-climb.js, SLIDE) the lead reads the foreman's let-go and drop the same (5 readings) and the director's 5
//   against 4 (its worst 385% in the air at 4.239 s against 111%, on contact at 4.231). On the nine other climbs no
//   reading changes, while the lead turns their bodies up to 1.8 cm off their paths before the let-go, puts five right
//   toes past the rig's 8 m/s (8.03 to 8.12 m/s at 4.12 s) and holds the horse's head within the rig's centimetre of
//   the far face through its drop, none of which the rig then reads as airborne. Its one gain is the pig foreman's
//   flight over the top (from 2.335 s, after a run on a grip): 13 readings against 20, its worst 603% at 2.490 s
//   against 323% at 2.364. Together 182 readings against 188, 0.190 s over the limit at the samples either way. That
//   flight is gone since wall-climb.js's KNEE_MID: the foreman's left hand keeps to the top, and the balance plans a
//   grip there.
// The turn is the integral of w, its drift taken out along the motion so that it ends unturned. w carries over between
// rounds (each adds what the last missed; delta, the largest, in rad/s, says when it has settled). Without contacts
// the contacts' w is kept as it comes: a flight's refinement measures the flights alone again.
// At both ends the battle's own stance hands over at rest, so the contacts' turn (its rate and its unwinding) fades in
// from rest over REST, twice TAU, and out over the last REST, a smoothstep: it starts and ends with no rate and no
// acceleration, as its track does. Let in at full rate from the first sample, where L* (averaged over TAU on one side
// only) was not L, the turn's track, at rest at its ends, caught up within its first and last 5 ms, turning the body on
// the spot (the phantom-wrench rig, reading every millisecond, found it at every crossing's start: the low-wall horse
// 105 N of phantom force 4 ms in, the window sheep 317 N 2 ms in).
const EASE=.25,TAU=.04,UNWIND=.3,TURN_TOL=.02,REFINE=2,REST=2*TAU,LEAD=.025;
export const turnAir=(S,dt)=>{const a=S.map(x=>x.kind==='air'),out=a.slice(),lead=Math.round(LEAD/dt);
 for(let i=1;i<S.length;i++){if(!a[i]||a[i-1]||S[i-1].kind!=='feet')continue;let run=0;while(i-1-run>=0&&S[i-1-run].kind==='feet')run++;
  if(run>lead)for(let j=i-lead;j<i;j++)out[j]=true;}return out;};
function bodyTurn(w,S,L,I,dt,contacts=true){
 const n=S.length,k=Math.round(TAU/dt),e=Math.round(EASE/dt),air=turnAir(S,dt),fl=new Float64Array(n),nw=w.map(x=>x.slice());let delta=0;
 const add=(i,target)=>{const d=solve3(I[i],[0,1,2].map(a=>target[a]-L[i][a]));delta=Math.max(delta,Math.hypot(...d));nw[i]=nw[i].map((y,a)=>y+d[a]);};
 // a quintic from (p, v, a) at u = 0 to rest at zero at u = 1, over T
 const ease=(p,v,a,T,u)=>{const u2=u*u,u3=u2*u,u4=u3*u,u5=u4*u,h0=1-10*u3+15*u4-6*u5,h1=u-6*u3+8*u4-3*u5,h2=.5*u2-1.5*u3+1.5*u4-.5*u5;return p.map((x,j)=>h0*x+T*h1*v[j]+T*T*h2*a[j]);};
 // flights: the median held, the turn zero at a feet end, eased in and out over the contacts beside it
 const thF=Array.from({length:n},()=>[0,0,0]);
 for(let i0=0;i0<n;i0++){if(!air[i0])continue;let i1=i0;while(i1+1<n&&air[i1+1])i1++;
  const med=[0,1,2].map(a=>{const v=L.slice(i0,i1+1).map(x=>x[a]).sort((p,q)=>p-q);return v[v.length>>1];});
  for(let i=i0;i<=i1;i++)add(i,med);
  const back=S[i1+1]?.kind==='feet'&&S[i0-1]?.kind!=='feet';
  if(!back)for(let i=i0+1;i<=i1;i++)thF[i]=thF[i-1].map((x,a)=>x+dt*(nw[i-1][a]+nw[i][a])/2);
  else for(let i=i1-1;i>=i0;i--)thF[i]=thF[i+1].map((x,a)=>x-dt*(nw[i][a]+nw[i+1][a])/2);
  for(const [ed,sg] of [[i0,-1],[i1,1]]){let run=0;while(ed+sg*(run+1)>=0&&ed+sg*(run+1)<n&&!air[ed+sg*(run+1)])run++;
   const m=Math.min(e,run-1),T=m*dt,v=nw[ed].map(x=>sg*x),acc=nw[ed].map((x,j)=>i1>i0?(x-nw[ed-sg][j])/dt*sg:0);
   for(let q=1;q<=m;q++){thF[ed+sg*q]=ease(thF[ed],v,acc,T,q/m);fl[ed+sg*q]=Math.max(fl[ed+sg*q],smooth(1-q/m));}}
  for(let i=i0;i<=i1;i++)fl[i]=1;
  i0=i1;}
 // contacts: L averaged over TAU either side, faded out beside a flight; the turn unwinds there and its drift is taken
 // out along the motion
 const ref=L.map((_,i)=>{const s=[0,0,0];let m=0;for(let j=Math.max(0,i-k);j<=Math.min(n-1,i+k);j++){for(let a=0;a<3;a++)s[a]+=L[j][a];m++;}return s.map(x=>x/m);});
 const wC=Array.from({length:n},()=>[0,0,0]),rest=i=>smooth(Math.min(i,n-1-i)*dt/REST);
 for(let i=0;i<n;i++){if(air[i]||!contacts)continue;const d=solve3(I[i],[0,1,2].map(a=>ref[i][a]-L[i][a])),r=(1-fl[i])*rest(i);delta=Math.max(delta,Math.hypot(...d)*r);wC[i]=d.map(x=>x*r);nw[i]=nw[i].map((y,a)=>y+wC[i][a]);}
 const thC=[[0,0,0]];for(let i=1;i<n;i++){const p=thC[i-1],q=(1-fl[i])*rest(i)*dt/UNWIND,cw=i=>air[i]?[0,0,0]:nw[i].map((y,a)=>y*(1-fl[i]));const a0=cw(i-1),a1=cw(i);thC.push(p.map((x,a)=>x+dt*(a0[a]+a1[a])/2-q*x));}
 // the drift out along a smoothstep, at rest at both ends (taken out linearly, the turn began at a constant rate from
 // rest: 11% of the body's weight at the first sample)
 const end=thC[n-1],theta=thF.map((x,i)=>x.map((y,a)=>y+thC[i][a]-end[a]*smooth(i/(n-1))));
 return {theta,w:nw,delta};}
const KEEP=[...new Set(MASS_SEGMENTS.flatMap(([a,b])=>[a,b]))];
// The whole pipeline for a motion: pose(t) poses it (with the hips moved by the current trial shift, set through
// setShift) and returns its points; com(points) is its centre of mass. Planned against the authored path, the
// contacts and the body's turning are measured again on the balanced motion and the plan solved again (rounds):
// moving the hips moves where a hand first touches.
// A grip counts from ONSET after the first touch (a hand's hold builds up; planned on at the touch itself, a hand that
// touched 40 ms later once the hips moved left the feet braking the body alone), and a touch shorter than 3 ONSET
// not at all: a hand brushing the wall in flight cannot hold the body, and planned as a grip it moved the hips enough
// to brush elsewhere in the next round. Unused, a support the rig sees costs nothing.
const ONSET=.02,LOST=.06;
// setMove({shift(t), spin(t)}) hands the motion its hips' move while it is found (spin(t) is null where the body does
// not turn, or {q, pivot}: a turn about a point); the result's shift and spin are the final ones. hold(t), if given,
// marks times the plan keeps near the authored path ('hold': a support it must not move, such as a seat the hips' own
// move would lift off the floor, losing the support the plan was leaning on; see planCentre), or its height alone where
// it returns 'height', or as a seat, which pushes and never pulls, where it returns 'seat'.
// ceiling(t), if given, is how far up off the authored path the plan may move the centre of mass at t, or null (the
// climb's push: its hooves leave the floor on a soft key, at a height carried by the hips the plan moves, so a plan
// that raised them lifted the hooves early and pushed on feet already off; see the climb).
// refit({samples, times}), if given, is called after each round that plans (a round that settles breaks first), with
// its move set (with one round, once after the loop): the motion fits its own parts to that move there (the climb: its
// head and tail), and after the last refit, whichever round it follows, the hips are found again for them
// (followCentre, three passes), so the rounds after it, the refine and the 1 ms pass (fine) plan the body as played.
// The samples are dt apart and cover the crossing: the last may fall up to dt past its end, where the body stands in
// its stance. pose, hold and base are asked there and must answer as they do at the end, as the window's, the vault's
// and the climb's do (their tracks, fits and bands all hold past the end). Everything here reads the samples as dt
// apart. Clamped to the end, every window (their durations follow the roll's physics) ended on a short last step read
// as a whole one (six: the sheep's 2.5 ms) or stopped up to 2 ms short of its end (five); in the sheep's last 2.5 ms,
// where the turn's track also came back to rest, the rig read 266 and 239 N of phantom force. Stretched to fit the
// duration instead, the steps slid the hips' shift's knots off the rig's 5 ms samples, which then read the ripple the
// shift carries between its knots (the horse's window, gated with the turn's rate fade and a change to the hooves'
// clearance: 0.375 s over the limit at the samples, 0.060 before, and 60 fewer readings flagged between them).
export function balanceTraversal({duration,probe,obstacles,pose,com,setMove,base=null,hold=null,ceiling=null,dt=.005,rounds=2,fine=false,refit=null,plan:options={}}){
 const n=Math.max(2,Math.ceil((duration-1e-9)/dt)+1),times=Array.from({length:n},(_,i)=>Math.abs(i*dt-duration)<1e-9?duration:i*dt);let c0=null,follow=null,samples=null,plan=null,last=null,settled=false,spin=null,w=times.map(()=>[0,0,0]);
 const turnAt=(theta,pivot)=>{let lo=theta.findIndex(x=>x[0]||x[1]||x[2]),hi=theta.findLastIndex(x=>x[0]||x[1]||x[2]);if(lo<0)return null;lo=Math.max(0,lo-1);hi=Math.min(n-1,hi+1);
  const tr=track(theta.slice(lo,hi+1).map((x,i)=>[times[lo+i],...x]),{},{limit:false,spline:true}),pv=track(pivot.slice(lo,hi+1).map((x,i)=>[times[lo+i],...x]),{},{limit:false,spline:true});
  return t=>{if(t<=times[lo]||t>=times[hi])return null;const r=V(...tr(t)),a=r.length();return a<1e-12?null:{q:Q().setFromAxisAngle(r.divideScalar(a),a),pivot:V(...pv(t))};};};
 const setShift=s=>setMove(s||spin?{shift:()=>s||V(),spin}:null);
 // each round's schedule as runs ('feet 0.000-0.690, ...'), for the diagnostics
 const history=[],runs=S=>{const out=[];S.forEach((s,i)=>{const r=out.at(-1);if(r&&r.kind===s.kind)r.end=times[i];else out.push({kind:s.kind,start:times[i],end:times[i]});});return out.map(r=>`${r.kind} ${r.start.toFixed(3)}-${r.end.toFixed(3)}`).join(', ');};
 const measure=()=>{const frames=[];const S=times.map(t=>{setShift(follow?follow.shift(t):null);const P=pose(t);probe.update();frames.push(Object.fromEntries(KEEP.map(k=>[k,P[k].clone()])));const c=com(P).toArray(),h=hold?.(t),s=supportAt(probe,obstacles,c,!!h);return h&&s.kind!=='air'?{...s,kind:'hold',heightOnly:h==='height',seat:h==='seat',c}:{...s,c};});
  const raw=fine?S.map(x=>x.kind):null,lag=Math.round(ONSET/dt);for(let i=n-1;i>=0;i--)if(S[i].kind==='grip'){let j=i;while(j>0&&S[j-1].kind==='grip')j--;const end=i-j+1<3*lag?i+1:Math.min(n,j+lag);for(let k=j;k<end;k++)S[k]=j>0?{...S[j-1],c:S[k].c}:S[k];i=j;}
  if(raw)S.forEach((x,i)=>{x.raw=raw[i];});return {S,...turning(frames,dt)};};
 // Two rounds: the second measures the schedule and the turning again on the balanced motion (four gave the climb no
 // more: 0.23 s against 0.21 s over). With more, the schedule is held from the second on: moved by each round's hips, a
 // toe-off came 5 ms earlier every round (the plan, pushing to reach it, raised the hips that lifted the hoof; on the
 // climb the push's ceiling now holds it at its authored time on both rounds).
 // A held sample keeps the support the authored motion had (its premise is the authored path), whatever the moved hips
 // touch: measured again on them, a seat carried on raised thighs rose off the floor, and the plan, finding the feet
 // alone 17 cm ahead of the centre of mass, dragged the hips 11 cm toward them (the window's lean, 78% of the body's
 // weight); a pig's seat rose 5 mm off the climb's top for 40 ms, and the plan, finding it in flight, jerked the body
 // at 39 m/s. Held in height alone, a sample's support is measured each round, as the feet's is: the body moves across.
 // The turn refined REFINE times on the flight samples alone, posed with the turn so far: by rounds alone, a flight's
 // first samples never settled where the toe-off moved a sample each round (955 N·m at the push-off). The contacts
 // keep the round's turn: their angular momentum is not measured again, and the same correction, added to it at each
 // refinement, turned them about twice as far (two 5 ms flights in the goat's roll turned its whole window so: its
 // step in read 30% of its weight, 15 turned once).
 // On a take-off's lead (the samples on the feet the turn holds as flight: turnAir) the plan's pressure point reads no
 // turning (dL zero): the turn holds the flight's angular momentum there. Reading the rate measured before the round's
 // turn, with the lead alone, the plan still counted on the legs' swing the turn takes out (the horse's 147 N·m at
 // 0.860 s, against -32 as played, its rate over 1 ms chords), pushed the body toward the wall at 2.9 m/s^2 on 0.82 g
 // of load, and the rig read up to 275% of its limit on the horse's feet there (five climbs read more on their feet at
 // the release than without the lead). Taken from the turn's own angular momentum (L + I (w_new - w)), the rate's chords
 // and five-sample mean smeared the step into the hold over the lead's first three samples (the horse's +56, +96 and
 // +57 N·m, where the played body read -79, -38 and -8 by the same rate), and nine climbs read new readings on the
 // feet there (review round 2 of this part).
 // Elsewhere the measured rate stands: read as the turn leaves it on every contact, the walk-outs moved too (the goat's
 // right foot round 7 readings, none before). Two things are left of it. Its five-sample mean carries the lead's zero
 // back over the two samples before the lead: on five climbs the plan reads 88 to 115 N·m less turning there than is
 // played over 1 ms chords (the rabbit's -135 against -250 at 0.845 s, where it reads a new 106%; since the climb's
 // left foot steps back, wall-climb.js, -120 against -235, and 99.9% of the limit). And on the lead the played rate
 // rings about the plan's zero from sample to sample (the dog's -18, +56, -33, +22 and -13), the turn's track following
 // the kink at the lead's start: the horse's -30 at 0.860 s, on 0.82 g, puts its pressure point 1.8 cm behind its
 // heels, beside its two new readings (108 and 101% at 0.861 and 0.862 s, 98.1 and 93.1% on 08274608 and 30.0 and 44.9%
 // since the climb's left foot steps back; the sheep's two at 0.856 and 0.857, 108 and 113%, 109.9 and 114.7% on
 // 08274608, under the limit since that step back; the dog's and the horse's turns here are that round's, on its code).
 // Review round 3 of this part.
 let held=null,authored=null,last1=null,theta5=null,fineSpans=[],fineAir=[],fineMove=null,refitted=false,refound=false;const ceil=times.map(t=>ceiling?.(t)??null);
 const refind=()=>followCentre(times,plan,(t,s)=>{setShift(V(...s));return com(pose(t)).toArray();},{base,passes:3,from:follow.samples});
 const refine=(S,L,I)=>{for(let k=0;k<REFINE&&S.some(x=>x.kind==='air');k++){const L2=L.map(x=>x.slice()),I2=I.slice(),A=turnAir(S,dt);
   for(let a=0;a<n;a++){if(!A[a])continue;let b=a;while(b+1<n&&A[b+1])b++;const lo=Math.max(0,a-1),hi=Math.min(n-1,b+1),frames=[];
    for(let i=lo;i<=hi;i++){setShift(follow?follow.shift(times[i]):null);const P=pose(times[i]);frames.push(Object.fromEntries(KEEP.map(q=>[q,P[q].clone()])));}
    const tu=turning(frames,dt);for(let i=a;i<=b;i++){L2[i]=tu.L[i-lo];I2[i]=tu.I[i-lo];}a=b;}
   const t2=bodyTurn(w,S,L2,I2,dt,false);w=t2.w;spin=turnAt(theta5=t2.theta,plan);}};
 // The climb's flights, every millisecond (fine: true). The turn is held at the 5 ms samples and its track is a spline
 // between them, and the centre of mass meets the plan at the samples alone, but a body's own momentum changes faster
 // than that: its legs fold off the ground as the hooves leave, its arms stop at the top as its hands reach it. So
 // after the last refine each run of samples in the air (by their own contacts before ONSET: a touch counts here from
 // its first sample) is posed every half FINE with the move so far, the body's contacts read at every key FINE apart on
 // the first pass (the probe and supportAt, as at the samples: which keys lie in the air, the run's keys in the air
 // from the first to the last that are; read again on every pass, the motion came out the same to the bit, and the
 // eleven climbs built 11.5% longer than on 21efea5e against 2.9%, each against it in its own run before the head was
 // fitted after the second round too, its total 2.2% apart between runs) and its angular momentum about the centre of
 // mass at every key over a chord of FINE, and the rate I^-1 (L* - L) that holds the run's median L* is added to the
 // turn through a spline of those keys. The rate is weighted by a window, full from the last foot sample before a
 // take-off (the lead, which the turn already holds as flight) or from FINE_RAMP into a flight off a grip, to FINE_PAST
 // after the last key in the air (on the hands or palms it lands on; never nearer than FINE_RAMP to the stretch's end),
 // ramping over FINE_RAMP either side (a smoothstep), and the angle it adds is brought back to nothing over the run (a
 // smoothstep of its end value). Through a take-off's flight with three keys or more in the air the centre of mass is
 // held too: those keys give the flight's own ballistic path (least squares, gravity fixed), and the difference, less
 // the Hermite cubic that meets it at the window's ends in value, and in slope over the 2 ms inside each (FINE_LEAD
 // before the first key in the air, on the hooves, to FINE_PAST after the last), is added to the hips' move through a
 // spline of the keys (the result's shift and hips). Three passes. Outside the windows the turn and the hips are the 5
 // ms ones; each corrected stretch (fineSpans) runs from three samples before its run to three after it, and its keys
 // in the air span fineAir.
 // With the 5 ms turn alone (6fe975ef) the eleven climbs read 168 readings over the rig's limits, 93 of them in their
 // phase over the top (up to 26 N·m of airborne phantom torque as the legs fold, against the rig's 10); with the turn
 // held every millisecond to FINE_RAMP before each run's last sample, 72 (21efea5e). Held to the contact then, the turn
 // moved a catch's leftover from torque into force (the goat's 93 N and 49 N·m at 1.222 s became 131 N and 7.5 N·m):
 // there the hands reach for grips keyed in the world (the arms' key at the catch, 1.265 s, blended in from 1.115) and
 // do not turn with the trunk (trunkAt turns it about the plan's centre), so the turn moved the centre of mass. Its
 // catches still read 19 (the rabbit's 824% at 1.225 s): the rabbit's centre of mass met the plan within 0.3 mm at its
 // samples there but took 214 N of phantom force between them (1.224 s, the rig's mass model), its arms stopping at the
 // top (their own -544 N along the wall's normal at 1.229 s) faster than the 5 ms hips answer, and its turn, held to
 // 1.219 s, read 98 N·m at 1.225 as its arms, head and legs swung in the window's ramp-out.
 // The centre's window starts on the hooves (each way below a prototype, gated but for the two fades, read by a probe):
 // started at the first key in the air, its join read in the air (the rabbit a new 138% at 0.877 s); 2 or 3 ms before
 // it, on hooves too lightly loaded to take it (164 and 119% at 0.875 and 0.874 s); eased in over 5 ms in the air, it
 // let the flight's first milliseconds through (the goat's 0.867 s 111 -> 119%, the sheep's 106 -> 114%, the donkey's
 // 0.871 112 -> 121%). A 5 ms fade of the whole difference took its slow drift (0.54 mm off the flight's parabola on
 // the rabbit) out in 5 ms, up to 3.8 kN of phantom force; a straight blend of its two ends left a kink of slope (563 N
 // at the rabbit's last millisecond in the air). Off a grip the centre is not held: eased in over 5 ms there it raised
 // the pig director's first millisecond in the air from 110 to 120% (4.236 s) and changed nothing else gated (the pig
 // foreman, donkey, horse and goat).
 // The eleven climbs read 30 readings over the limits against 72 (22 since the walk-out's set-down and 4 since the left
 // foot's step back, both wall-climb.js): their catches none against 19, their phases over the top 1 against 10, their
 // push-offs 4 against 12, their drops 4 against 10 (since the left foot's step back, their phases over the top and
 // push-offs none, the rabbit's push at 99.9% of the limit). Two are new (the dog's 107% at 0.868 s as its hooves
 // leave, the rabbit's 104% at 0.846 s in its push; both gone since) and of the 28 kept, 21 rose (the rabbit's 0.845 s
 // 106 -> 112%, the sheep's two by 1.6 and 1.5 points, eighteen by 0.223 at most) and seven fell or held. By the climb
 // test's measures the last 50 ms before the hands land (to the last millisecond in the air) turn at 0.1 to 4.1 N·m
 // against 3.1 to 79.4 (21efea5e's, to its last sample in the air), and the take-off's flight falls within 0.04 to 0.14
 // m/s^2 of gravity against 0.50 to 2.86 (since the climb's left foot steps back, 0.1 to 0.9 N·m and 0.03 to 0.11
 // m/s^2). A prototype of this pass with the head and tail still fitted after the balance read 52 (var-f25b); with them
 // fitted inside it (refit, wall-climb.js), 30.
 const FINE=.001,FINE_RAMP=.005,FINE_LEAD=.005,FINE_PAST=.003,ramp=u=>u<=0?0:u>=1?1:u*u*(3-2*u),fineFlights=S=>{if(!theta5||!plan)return;
  let lo=theta5.findIndex(x=>x[0]||x[1]||x[2]),hi=theta5.findLastIndex(x=>x[0]||x[1]||x[2]);if(lo<0)return;lo=Math.max(0,lo-1);hi=Math.min(n-1,hi+1);
  const coarse=track(theta5.slice(lo,hi+1).map((x,i)=>[times[lo+i],...x]),{},{limit:false,spline:true}),pv=track(plan.slice(lo,hi+1).map((x,i)=>[times[lo+i],...x]),{},{limit:false,spline:true});
  const isAir=i=>(S[i].raw??S[i].kind)==='air',runs=[];for(let i=lo+1;i<hi;i++){if(!isAir(i))continue;let j=i;while(j+1<hi&&isAir(j+1))j++;if(j-i>=2)runs.push([i,j]);i=j;}if(!runs.length)return;
  let corr=runs.map(([a,b])=>{const lead=(S[a-1].raw??S[a-1].kind)==='feet',ta=lead?times[a]-dt:times[a]+FINE_RAMP,k0=Math.max(lo,a-Math.ceil((dt+FINE_LEAD+FINE_RAMP)/dt-1e-9)),k1=Math.min(hi,b+Math.ceil((dt+FINE_PAST+FINE_RAMP)/dt-1e-9)),t0=times[k0],m=Math.round((times[k1]-t0)/FINE),z=()=>Array.from({length:m+1},()=>[0,0,0]);
   return {t0,m,ta,a,b,lead,d:z(),s:z(),tr:null,str:null};});
  const thetaAt=t=>{const base=coarse(t);for(const r of corr){if(!r.tr||t<r.t0||t>r.t0+r.m*FINE)continue;const x=r.tr(t);return base.map((y,a)=>y+x[a]);}return base;};
  const spinOf=()=>t=>{if(t<=times[lo]||t>=times[hi])return null;const r=V(...thetaAt(t)),ang=r.length();return ang<1e-12?null:{q:Q().setFromAxisAngle(r.divideScalar(ang),ang),pivot:V(...pv(t))};};
  const moved=t=>{for(const r of corr)if(r.str&&t>=r.t0&&t<=r.t0+r.m*FINE)return V(...r.str(t));return null;},shiftAt=t=>{const x=follow?follow.shift(t):V(),y=moved(t);return y?x.add(y):x;};
  const comOf=P=>{const x=V();for(const [p,q,mm] of MASS_SEGMENTS)x.addScaledVector(P[p].clone().add(P[q]).multiplyScalar(.5),mm);return x.divideScalar(BODY_MASS).toArray();},G=[0,-9.81,0];
  for(let pass=0;pass<3;pass++){spin=spinOf();
   corr=corr.map(r=>{const h=FINE/2,fr=[],air=r.air||[];for(let k=0;k<=2*r.m+2;k++){const t=r.t0-h+k*h;setShift(shiftAt(t));const P=pose(t);fr.push(Object.fromEntries(KEEP.map(q=>[q,P[q].clone()])));if(k%2&&!r.air){probe.update();air.push(supportAt(probe,obstacles,comOf(P),false).kind==='air');}}
    const tu=turning(fr,h),L=[],I=[],ts=[],cm=[];for(let j=0;j<=r.m;j++){L.push(tu.L[2*j+1]);I.push(tu.I[2*j+1]);ts.push(r.t0+j*FINE);cm.push(comOf(fr[2*j+1]));}
    let fa=ts.findIndex(t=>t>=times[r.a]-1e-9),fb=ts.findLastIndex(t=>t<=times[r.b]+1e-9);while(fa>0&&air[fa-1])fa--;while(fb<r.m&&air[fb+1])fb++;while(fa<fb&&!air[fa])fa++;while(fb>fa&&!air[fb])fb--;
    const ja=Math.max(0,fa-Math.round(FINE_LEAD/FINE)),jb=Math.min(r.m-Math.round(FINE_RAMP/FINE),fb+Math.round(FINE_PAST/FINE));
    const La=L.filter((_,j)=>ts[j]>=times[r.a]-1e-9&&ts[j]<=times[r.b]+1e-9),med=[0,1,2].map(a=>{const v=La.map(x=>x[a]).sort((p,q)=>p-q);return v[v.length>>1];});
    const t0T=Math.max(times[lo],r.ta-FINE_RAMP),win=ts.map((t,j)=>t<r.ta?ramp((t-t0T)/Math.max(1e-9,r.ta-t0T)):j<=jb?1:ramp((ts[jb]+FINE_RAMP-t)/FINE_RAMP));
    const c=L.map((x,j)=>solve3(I[j],med.map((y,a)=>y-x[a])).map(v=>v*win[j])),d=[[0,0,0]];for(let j=1;j<=r.m;j++)d.push(d[j-1].map((x,a)=>x+FINE*(c[j-1][a]+c[j][a])/2));
    const end=d[r.m],nd=d.map((x,j)=>{const w2=ramp(j/r.m);return x.map((y,a)=>r.d[j][a]+y-w2*end[a]);});
    let ns=r.s;if(r.lead&&fb-fa>=2){const t1=ts[fa],fit=[0,1,2].map(ax=>{let S0=0,S1=0,S2=0,Sy=0,Sty=0;for(let j=fa;j<=fb;j++){const u=ts[j]-t1,y=cm[j][ax]-.5*G[ax]*u*u;S0++;S1+=u;S2+=u*u;Sy+=y;Sty+=u*y;}const det=S0*S2-S1*S1;return [(Sy*S2-S1*Sty)/det,(S0*Sty-S1*Sy)/det];});
     const ev=j=>{const u=ts[j]-t1;return [0,1,2].map(ax=>fit[ax][0]+fit[ax][1]*u+.5*G[ax]*u*u-cm[j][ax]);},slope=(j,k)=>{const p=ev(j),q=ev(k);return p.map((x,ax)=>(q[ax]-x)/(ts[k]-ts[j]));};
     const eA=ev(ja),eB=ev(jb),sA=slope(ja,ja+2),sB=slope(jb-2,jb),Tw=ts[jb]-ts[ja],H=(u,ax)=>{const u2=u*u,u3=u2*u;return (2*u3-3*u2+1)*eA[ax]+(u3-2*u2+u)*Tw*sA[ax]+(3*u2-2*u3)*eB[ax]+(u3-u2)*Tw*sB[ax];};
     ns=r.s.map((x,j)=>{if(j<ja||j>jb)return x;const e=ev(j),u=(ts[j]-ts[ja])/Tw;return x.map((y,ax)=>y+e[ax]-H(u,ax));});}
    return {...r,air,airSpan:[ts[fa],ts[fb]],d:nd,s:ns,tr:track(nd.map((x,j)=>[ts[j],...x]),{},{limit:false,spline:true}),str:r.lead?track(ns.map((x,j)=>[ts[j],...x]),{},{limit:false,spline:true}):null};});}
  spin=spinOf();fineMove=moved;fineSpans=corr.map(r=>[r.t0,r.t0+r.m*FINE]);fineAir=corr.map(r=>r.airSpan);setMove(null);};
 for(let r=0;r<rounds&&!settled;r++){const {S,dL,L,I}=measure();last1={S,L,I};
  if(!authored)authored=S.map(x=>({...x}));else S.forEach((x,i)=>{if(authored[i].kind==='hold'&&!authored[i].heightOnly)Object.assign(x,{...authored[i],c:x.c});});
  // A flight shorter than LOST that a round finds where the authored motion lies on the floor is the plan's own: its
  // last move lifted the body off what held it, and that support stands. Planned as a flight, the sheep's roll (its back
  // lifted off the floor by the round before) crouched 1.8 cm into the floor to spring over 40 ms of it.
  if(r)for(let i=0;i<n;i++){if(S[i].kind!=='air')continue;let j=i;while(j+1<n&&S[j+1].kind==='air')j++;if(j-i<LOST/dt&&i>0&&j<n-1&&authored.slice(i,j+1).every(x=>x.kind==='feet'||x.heightOnly))for(let k=i;k<=j;k++)Object.assign(S[k],{...authored[k],c:S[k].c});i=j;}
  if(held)S.forEach((x,i)=>{if(x.kind!==held[i].kind)Object.assign(x,{...held[i],c:x.c});});else if(r===1)held=S.map(x=>({...x}));const key=S.map(x=>x.kind).join();history.push(runs(S));
  if(!c0)c0=S.map(x=>x.c);const turn=bodyTurn(w,S,L,I,dt),lead=turnAir(S,dt).map((a,i)=>a&&S[i].kind==='feet');settled=key===last&&turn.delta<TURN_TOL;last=key;if(settled)break;
  samples=S.map((x,i)=>({...x,c:c0[i],dL:lead[i]?[0,0,0]:dL[i],ceil:x.kind==='feet'&&ceil[i]!==null?c0[i][1]+ceil[i]:null}));plan=planCentre(samples,dt,options);w=turn.w;spin=turnAt(turn.theta,plan);
  refine(S,L,I);
  // the first round's hips only set up the second's measure: three passes; the second starts from them
  follow=followCentre(times,plan,(t,s)=>{setShift(V(...s));return com(pose(t)).toArray();},{base,passes:3,from:follow?.samples});
  if(refit&&rounds>1){setMove({shift:follow.shift,spin:spin||(()=>null)});refit({samples,times});refitted=true;refound=r===rounds-1;if(refound)follow=refind();}}
 // The flights' turn once more on the final hips: the loop refines it on frames posed with the round before's hips and
 // then finds the hips again, so the played flights begin with a move the turn never saw (the climb's legs swing as the
 // hooves leave, and when they leave rides on the hips). On the horse's climb its angular momentum about the centre of
 // mass fell from 3.3 N·m·s to -0.1 in the flight's first 30 ms (the flight's median -0.18), which the rig read as up
 // to 379 N·m of airborne phantom torque. In flight a turn about the centre of mass leaves the plan as it was; on the
 // contacts beside a flight, where the turn eases in and out after the hips were found, it moves the played centre of
 // mass off the plan by up to 0.37 mm (the horse's push). Left out on e909dcf4, the eleven climbs read 2053 readings
 // over the limit against 1878, every climb's worst higher; the test suite's flight check sees it only on the rabbit's
 // climb (0.51 N·m·s against its 0.5), so the climbs are gated again after any change to it.
 if(follow&&last1&&plan){if(refit&&!refitted){setMove({shift:follow.shift,spin:spin||(()=>null)});refit({samples,times});refitted=true;}if(refitted&&!refound){follow=refind();refound=true;}refine(last1.S,last1.L,last1.I);if(fine)fineFlights(last1.S);}
 const add=g=>t=>{const x=g(t),y=fineMove?.(t);return y?x.add(y):x;};setMove(null);return {...follow,...(fineMove?{shift:add(follow.shift),hips:add(follow.hips)}:{}),spin:spin||(()=>null),plan,samples,times,settled,history,fineSpans,fineAir};}
