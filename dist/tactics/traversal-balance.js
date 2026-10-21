import {V,Q,clamp,smooth,track,MASS_SEGMENTS,BODY_MASS,createSurfaceProbe} from './traversal-pose.js';
// Balance for the tile-to-tile traversals (docs/tactics/NATURAL-TRAVERSAL.md): the centre of mass is planned against
// what actually holds the body at each moment, then the hips are moved until the real centre of mass follows the plan
// (the grenade throw's pendulum, grenade-throw-motion.js, generalised to flight and grips).
// The plan stays as near the authored path as the contacts allow, with low jerk, subject to:
// - airborne (nothing touching): exactly ballistic, a = -g;
// - on the feet alone: the pressure point of a linear inverted pendulum, p = c - h a / (g + a_y), inside the soles'
//   outline (their convex hull), the push within friction, and the floor pushing (never pulling);
// - hands gripping (with or without feet): any direction, each axis within FMAX body weights;
// - the first and last samples at rest, where the battle's own stance hands over.
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
// hi}; an equality has lo = hi; a half-plane has lo = -Infinity). Rows are scaled to unit norm.
export function boxedPath(c0,wT,wJ,rows,{rho=2e5,iters=1500,tol=1e-8,stride=1}={}){
 const n=c0.length,R=rows.map(r=>{const s=Math.hypot(...r.c)||1;return {at:r.at,c:r.c.map(x=>x/s),lo:r.lo/s,hi:r.hi/s};}),W=R.reduce((m,r)=>Math.max(m,r.c.length),3),k=Math.max(3*stride,W-1),w=k+1,M=new Float64Array(n*w);
 const jerk=[-1,3,-3,1].flatMap((x,i)=>i?[...new Array(stride-1).fill(0),x]:[x]);
 const outer=(at,cs,f)=>{for(let a=0;a<cs.length;a++){const i=at+a;if(i<0||i>=n)continue;for(let b=0;b<=a;b++){const j=at+b;if(j<0)continue;M[i*w+j-i+k]+=f*cs[a]*cs[b];}}};
 for(let i=0;i<n;i++)M[i*w+k]+=wT[i];for(let i=0;i+3*stride<n;i++)outer(i,jerk,wJ);for(const r of R)outer(r.at,r.c,rho);
 // the iterations run on flat arrays (rows of up to W coefficients): the same sums in the same order
 const L=cholesky(n,k,M),m=R.length,at=Int32Array.from(R,r=>r.at),len=Uint8Array.from(R,r=>r.c.length),C=new Float64Array(m*W),lo=Float64Array.from(R,r=>r.lo),hi=Float64Array.from(R,r=>r.hi);
 R.forEach((r,j)=>r.c.forEach((x,a)=>{C[j*W+a]=x;}));
 const dot=(j,c)=>{let s=0;for(let a=0;a<len[j];a++)s+=C[j*W+a]*c[at[j]+a];return s;};
 let c=Float64Array.from(c0);const z=new Float64Array(m),u=new Float64Array(m),b0=Float64Array.from(c0,(x,i)=>wT[i]*x),b=new Float64Array(n),y=new Float64Array(n);for(let j=0;j<m;j++)z[j]=clamp(dot(j,c),lo[j],hi[j]);let res=Infinity;
 for(let it=0;it<iters&&res>tol;it++){b.set(b0);
  for(let j=0;j<m;j++){const v=rho*(z[j]-u[j]);for(let a=0;a<len[j];a++)b[at[j]+a]+=C[j*W+a]*v;}c=cholSolve(n,k,L,b,y,c===c0?new Float64Array(n):c);
  res=0;for(let j=0;j<m;j++){const ax=dot(j,c),zn=clamp(ax+u[j],lo[j],hi[j]);u[j]+=ax-zn;z[j]=zn;res=Math.max(res,Math.abs(ax-zn));}}
 return {c,res};}
// samples: [{c: [x,y,z] authored centre of mass, kind: 'air' | 'grip' | 'feet' | 'hold', box: [xmin,xmax,zmin,zmax] and
// hull: [[x,z], ...] counter-clockwise (feet), floor: y}] on a uniform grid dt. 'hold' keeps the authored path (a support this plan does not model, such as a roll).
export function planCentre(samples,dt,{jerk:wJ=2e5,hold:wH=400,fmax=FMAX,margin=.01}={}){
 const n=samples.length,d2=dt*dt,c0=[0,1,2].map(ax=>Float64Array.from(samples,s=>s.c[ax])),wT=samples.map(s=>s.kind==='hold'?wH:1),acc=[1,-2,1];
 const ends=ax=>[0,1,n-2,n-1].map(i=>({at:i,c:[1],lo:c0[ax][i<2?0:n-1],hi:c0[ax][i<2?0:n-1]}));
 // Vertical: ballistic in flight; a floor pushes between .3 and fmax body weights, a grip either way up to fmax.
 const edge=i=>{for(let k=1;k<=RAMP;k++)if(samples[i-k]?.kind==='air'||samples[i+k]?.kind==='air')return ((k-1)/RAMP)**2;return 1;};
 const ry=ends(1);for(let i=1;i<n-1;i++){const s=samples[i];if(s.kind==='air')ry.push({at:i-1,c:acc,lo:-G*d2,hi:-G*d2});
  else if(s.kind==='feet'){const r=edge(i);ry.push({at:i-1,c:acc,lo:(.3*r-1)*G*d2,hi:(.1+(fmax-.1)*r-1)*G*d2});}else if(s.kind==='grip')ry.push({at:i-1,c:acc,lo:(-fmax-1)*G*d2,hi:(fmax-1)*G*d2});}
 const Y=boxedPath(c0[1],wT,wJ,ry),ay=i=>i>0&&i<n-1?(Y.c[i+1]-2*Y.c[i]+Y.c[i-1])/d2:0;
 const out=[null,Y.c,null],res=[0,Y.res,0];
 // A feet sample's outline is the intersection of its neighbours' within two samples: a foot lifting a sample earlier
 // than planned (moving the hips moves it) left the pressure point outside the one still down (41% of the body's weight).
 const outlineAt=i=>{let P=samples[i].hull;for(let j=i-2;j<=i+2&&P.length>=3;j++)if(j!==i&&samples[j]?.kind==='feet')P=clipConvex(P,samples[j].hull);
  return P.length>=3&&areaOf(P)>1e-6?P:samples[i].hull;};
 // Across, x and z together (interleaved: the outline's edges couple them): ballistic in flight, a grip within fmax
 // either way, and on the feet the pressure point inside the support's outline and the push within friction. The
 // outline is the contacts' convex hull, each edge drawn in by margin but never past its centre; their bounding box
 // let the pressure point sit 4 to 11 cm off the line between two hands set down on a diagonal (the window's), where
 // the rig, reading the hull, found 20 to 32% of the body's weight of phantom force.
 const acc2=[1,0,-2,0,1],rows=[];for(const i of [0,1,n-2,n-1])for(const ax of [0,2])rows.push({at:2*i+ax/2,c:[1],lo:c0[ax][i<2?0:n-1],hi:c0[ax][i<2?0:n-1]});
 for(let i=1;i<n-1;i++){const s=samples[i],at=2*(i-1),both=(lo,hi)=>rows.push({at,c:acc2,lo,hi},{at:at+1,c:acc2,lo,hi});
  if(s.kind==='air'){both(0,0);continue;}
  if(s.kind==='grip'){both(-fmax*G*d2,fmax*G*d2);continue;}
  if(s.kind!=='feet')continue;const fy=Math.max(.3*G,ay(i)+G),h=Math.max(.2,Y.c[i]-(s.floor||0)),k=h/fy,a=-k/d2,b=1+2*k/d2;
  // The pressure point also carries the body's turning: p_x = c_x - k a_x + dL_z / (M fy), p_z = c_z - k a_z - dL_x / (M fy).
  const dx=s.dL?s.dL[2]/(BODY_MASS*fy):0,dz=s.dL?-s.dL[0]/(BODY_MASS*fy):0,H=outlineAt(i),cx=H.reduce((m,p)=>m+p[0],0)/H.length,cz=H.reduce((m,p)=>m+p[1],0)/H.length;
  for(let j=0;j<H.length;j++){const p=H[j],q=H[(j+1)%H.length],ex=q[0]-p[0],ez=q[1]-p[1],l=Math.hypot(ex,ez);if(l<1e-9)continue;const nx=ez/l,nz=-ex/l;
   rows.push({at,c:[nx*a,nz*a,nx*b,nz*b,nx*a,nz*a],lo:-Infinity,hi:Math.max(nx*p[0]+nz*p[1]-margin,nx*cx+nz*cz)-nx*dx-nz*dz});}
  both(-MU*fy*d2,MU*fy*d2);}
 const XZ=boxedPath(Float64Array.from({length:2*n},(_,j)=>c0[j&1?2:0][j>>1]),Float64Array.from({length:2*n},(_,j)=>wT[j>>1]),wJ,rows,{stride:2});
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
// onset of a clearance push back from the wall read as 480 N of phantom push between samples.
// A pass moves a sample's hips at most STEP on each axis: a sample whose centre of mass stopped answering the hips (a
// catch whose hands missed the top) ran 1.3 m away in five passes.
const GAIN=1.29,STEP=.2;
export function followCentre(times,plan,comAt,{passes=5,base=null,from=null}={}){
 const shift=from?from.map(x=>x.slice()):times.map(()=>[0,0,0]);let worst=0;
 for(let p=0;p<passes;p++){worst=0;times.forEach((t,i)=>{const c=comAt(t,shift[i]);for(let ax=0;ax<3;ax++){const miss=plan[i][ax]-c[ax];shift[i][ax]+=clamp(GAIN*miss,-STEP,STEP);worst=Math.max(worst,Math.abs(miss));}});}
 const tr=track(times.map((t,i)=>{const b=base?base(t):[0,0,0];return [t,...shift[i].map((x,ax)=>x+b[ax])];}),{},{limit:false});
 return {shift:t=>{const tc=clamp(t,times[0],times.at(-1)),s=V(...tr(tc));return base?s.sub(V(...base(tc))):s;},worst,samples:shift};}
// What holds the body at a moment, from its real surface (the phantom-wrench rig's contacts: within 1 cm):
// - a hand on an obstacle grips (the rig's rule; a hand against a face is no grip, but the climb's landing leans on one);
// - anything on the floor stands on it (hooves, hands, a back in a roll), and so does a part on an obstacle's top or
//   its edge (within TOL of the top's height: the rig reads a point just past the edge as touching the edge, pushing up
//   and out) while the centre of mass is above that top or less than DRAPE below it (a belly on a sill): their extent
//   is the pressure point's outline (their convex hull), the floor's height (or the top's, with nothing on the floor)
//   its plane;
// - a part against a face, or on a top the body hangs below, is not counted: it can only push, and a plan leaning on
//   it would ask what it cannot give (the forearms on a wall's edge as the hands come over at a catch);
// - nothing counted is flight.
// DRAPE: a body draped over a top with its centre of mass a little below it (over the window's sill as it reaches for
// the floor, 2 cm below) still lies on it; one hanging well below (the forearms on a wall's edge at a catch, 70 cm) does
// not.
const TOL=.01,DRAPE=.15,ENDS=new WeakMap();
// The contacts' probe: the rig's own surface, every vertex (a fit's probe, every other vertex, found the hooves down 5 to
// 10 ms before the rig at a landing; every third of the body's missed a belly sliding over the window's sill, touching
// it between them: every vertex 0.03 to 0.3 cm off it, every third 1.5 to 2.2 cm).
export const contactProbe=worker=>createSurfaceProbe(worker,{stride:1});
// Per probe point: 1 a hand, 2 a foot, 0 the rest, by its mesh as the rig names them (a sleeve cuff riding the hand
// bone is not a grip). Read once the probe has been skinned (its part indices are set by update).
const endsOf=probe=>{let e=ENDS.get(probe);if(!e){const kind=probe.names.map(p=>/hand/.test(p)?1:/hoof|boot|foot|toe/i.test(p)?2:0);e=Uint8Array.from(probe.part,pi=>kind[pi]);ENDS.set(probe,e);}return e;};
export function supportAt(probe,obstacles,com){
 const over=(x,z)=>obstacles.some(b=>x>b.min[0]&&x<b.max[0]&&z>b.min[2]&&z<b.max[2]),ends=endsOf(probe),grow=(b,x,z)=>{b[0]=Math.min(b[0],x);b[1]=Math.max(b[1],x);b[2]=Math.min(b[2],z);b[3]=Math.max(b[3],z);};
 let grip=false,top=null;const box=[Infinity,-Infinity,Infinity,-Infinity],onTop=[Infinity,-Infinity,Infinity,-Infinity],pts=[],topPts=[];
 for(let i=0;i<probe.count;i++){const x=probe.x[i],y=probe.y[i],z=probe.z[i],e=ends[i];
  if(y<TOL&&y>-TOL&&!over(x,z)){grow(box,x,z);pts.push([x,z]);continue;}
  for(const o of obstacles){const dx=Math.max(o.min[0]-x,0,x-o.max[0]),dy=Math.max(o.min[1]-y,0,y-o.max[1]),dz=Math.max(o.min[2]-z,0,z-o.max[2]);if(dx>=TOL||dy>=TOL||dz>=TOL)continue;const inside=!dx&&!dy&&!dz;
   const d=inside?Math.min(x-o.min[0],o.max[0]-x,y-o.min[1],o.max[1]-y,z-o.min[2],o.max[2]-z):Math.hypot(dx,dy,dz);if(d>=TOL)continue;
   if(e===1)grip=true;else if(y>o.max[1]-TOL&&com&&com[1]>o.max[1]-DRAPE){grow(onTop,x,z);topPts.push([x,z]);top=Math.max(top??-Infinity,o.max[1]);}}}
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
//   and a turn left from a flight unwinds there over UNWIND.
// The turn is the integral of w, its drift taken out along the motion so that it ends unturned. w carries over between
// rounds (each adds what the last missed; delta, the largest, in rad/s, says when it has settled).
const EASE=.25,TAU=.04,UNWIND=.3,TURN_TOL=.02,REFINE=2;
function bodyTurn(w,S,L,I,dt){
 const n=S.length,k=Math.round(TAU/dt),e=Math.round(EASE/dt),air=S.map(x=>x.kind==='air'),fl=new Float64Array(n),nw=w.map(x=>x.slice());let delta=0;
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
 const wC=Array.from({length:n},()=>[0,0,0]);
 for(let i=0;i<n;i++){if(air[i])continue;const d=solve3(I[i],[0,1,2].map(a=>ref[i][a]-L[i][a]));delta=Math.max(delta,Math.hypot(...d)*(1-fl[i]));wC[i]=d.map(x=>x*(1-fl[i]));nw[i]=nw[i].map((y,a)=>y+wC[i][a]);}
 const thC=[[0,0,0]];for(let i=1;i<n;i++){const p=thC[i-1],q=(1-fl[i])*dt/UNWIND,cw=i=>air[i]?[0,0,0]:nw[i].map((y,a)=>y*(1-fl[i]));const a0=cw(i-1),a1=cw(i);thC.push(p.map((x,a)=>x+dt*(a0[a]+a1[a])/2-q*x));}
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
const ONSET=.02;
// setMove({shift(t), spin(t)}) hands the motion its hips' move while it is found (spin(t) is null where the body does
// not turn, or {q, pivot}: a turn about a point); the result's shift and spin are the final ones. hold(t), if given,
// marks times the plan keeps the authored path ('hold': a support it does not model, such as a seat the hips' own
// move would lift off the floor, losing the support the plan was leaning on).
export function balanceTraversal({duration,probe,obstacles,pose,com,setMove,base=null,hold=null,dt=.005,rounds=2,plan:options={}}){
 const n=Math.round(duration/dt)+1,times=Array.from({length:n},(_,i)=>Math.min(duration,i*dt));let c0=null,follow=null,samples=null,plan=null,last=null,settled=false,spin=null,w=times.map(()=>[0,0,0]);
 const turnAt=(theta,pivot)=>{let lo=theta.findIndex(x=>x[0]||x[1]||x[2]),hi=theta.findLastIndex(x=>x[0]||x[1]||x[2]);if(lo<0)return null;lo=Math.max(0,lo-1);hi=Math.min(n-1,hi+1);
  const tr=track(theta.slice(lo,hi+1).map((x,i)=>[times[lo+i],...x]),{},{limit:false}),pv=track(pivot.slice(lo,hi+1).map((x,i)=>[times[lo+i],...x]),{},{limit:false});
  return t=>{if(t<=times[lo]||t>=times[hi])return null;const r=V(...tr(t)),a=r.length();return a<1e-12?null:{q:Q().setFromAxisAngle(r.divideScalar(a),a),pivot:V(...pv(t))};};};
 const setShift=s=>setMove(s||spin?{shift:()=>s||V(),spin}:null);
 // each round's schedule as runs ('feet 0.000-0.690, ...'), for the diagnostics
 const history=[],runs=S=>{const out=[];S.forEach((s,i)=>{const r=out.at(-1);if(r&&r.kind===s.kind)r.end=times[i];else out.push({kind:s.kind,start:times[i],end:times[i]});});return out.map(r=>`${r.kind} ${r.start.toFixed(3)}-${r.end.toFixed(3)}`).join(', ');};
 const measure=()=>{const frames=[];const S=times.map(t=>{setShift(follow?follow.shift(t):null);const P=pose(t);probe.update();frames.push(Object.fromEntries(KEEP.map(k=>[k,P[k].clone()])));const c=com(P).toArray(),s=supportAt(probe,obstacles,c);return hold?.(t)&&s.kind!=='air'?{...s,kind:'hold',c}:{...s,c};});
  const lag=Math.round(ONSET/dt);for(let i=n-1;i>=0;i--)if(S[i].kind==='grip'){let j=i;while(j>0&&S[j-1].kind==='grip')j--;const end=i-j+1<3*lag?i+1:Math.min(n,j+lag);for(let k=j;k<end;k++)S[k]=j>0?{...S[j-1],c:S[k].c}:S[k];i=j;}
  return {S,...turning(frames,dt)};};
 // Two rounds: the second measures the schedule and the turning again on the balanced motion (four gave the climb no
 // more: 0.23 s against 0.21 s over). With more, the schedule is held from the second on: moved by each round's hips, a
 // toe-off came 5 ms earlier every round (the plan, pushing to reach it, raised the hips that lifted the hoof).
 let held=null;
 for(let r=0;r<rounds&&!settled;r++){const {S,dL,L,I}=measure();if(held)S.forEach((x,i)=>{if(x.kind!==held[i].kind)Object.assign(x,{...held[i],c:x.c});});else if(r===1)held=S.map(x=>({...x}));const key=S.map(x=>x.kind).join();history.push(runs(S));
  if(!c0)c0=S.map(x=>x.c);const turn=bodyTurn(w,S,L,I,dt);settled=key===last&&turn.delta<TURN_TOL;last=key;if(settled)break;
  samples=S.map((x,i)=>({...x,c:c0[i],dL:dL[i]}));plan=planCentre(samples,dt,options);w=turn.w;spin=turnAt(turn.theta,plan);
  // The turn refined REFINE times on the flight samples alone, posed with the turn so far: by rounds alone, a flight's
  // first samples never settled where the toe-off moved a sample each round (955 N·m at the push-off).
  for(let k=0;k<REFINE&&S.some(x=>x.kind==='air');k++){const L2=L.map(x=>x.slice()),I2=I.slice();
   for(let a=0;a<n;a++){if(S[a].kind!=='air')continue;let b=a;while(b+1<n&&S[b+1].kind==='air')b++;const lo=Math.max(0,a-1),hi=Math.min(n-1,b+1),frames=[];
    for(let i=lo;i<=hi;i++){setShift(follow?follow.shift(times[i]):null);const P=pose(times[i]);frames.push(Object.fromEntries(KEEP.map(q=>[q,P[q].clone()])));}
    const tu=turning(frames,dt);for(let i=a;i<=b;i++){L2[i]=tu.L[i-lo];I2[i]=tu.I[i-lo];}a=b;}
   const t2=bodyTurn(w,S,L2,I2,dt);w=t2.w;spin=turnAt(t2.theta,plan);}
  // the first round's hips only set up the second's measure: three passes; the second starts from them
  follow=followCentre(times,plan,(t,s)=>{setShift(V(...s));return com(pose(t)).toArray();},{base,passes:3,from:follow?.samples});}
 setMove(null);return {...follow,spin:spin||(()=>null),plan,samples,times,settled,history};}
