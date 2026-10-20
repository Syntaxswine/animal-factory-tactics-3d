import {V,clamp,track,MASS_SEGMENTS,BODY_MASS} from './traversal-pose.js';
// Balance for the tile-to-tile traversals (docs/tactics/NATURAL-TRAVERSAL.md): the centre of mass is planned against
// what actually holds the body at each moment, then the hips are moved until the real centre of mass follows the plan
// (the grenade throw's pendulum, grenade-throw-motion.js, generalised to flight and grips).
// The plan stays as near the authored path as the contacts allow, with low jerk, subject to:
// - airborne (nothing touching): exactly ballistic, a = -g;
// - on the feet alone: the pressure point of a linear inverted pendulum, p = c - h a / (g + a_y), inside the soles,
//   the push within friction, and the floor pushing (never pulling);
// - hands gripping (with or without feet): any direction, each axis within FMAX body weights;
// - the first and last samples at rest, where the battle's own stance hands over.
// A convex quadratic programme per axis (the vertical first: the pendulum's stiffness h / (g + a_y) comes from it),
// solved by ADMM on one banded factorisation. Clamping the pressure point sample by sample instead (re-weighted least
// squares) turned the feet into an unstable pendulum: the plan drifted 90 cm sideways and snapped back.
const G=9.81,FMAX=3,MU=.9;
function cholesky(n,k,A){const w=k+1,L=Float64Array.from(A);
 for(let i=0;i<n;i++)for(let j=Math.max(0,i-k);j<=i;j++){let s=L[i*w+j-i+k];for(let m=Math.max(0,i-k);m<j;m++)s-=L[i*w+m-i+k]*L[j*w+m-j+k];
  if(j===i)L[i*w+k]=Math.sqrt(Math.max(s,1e-18));else L[i*w+j-i+k]=s/L[j*w+k];}
 return L;}
function cholSolve(n,k,L,b,y=new Float64Array(n),x=new Float64Array(n)){const w=k+1;for(let i=0;i<n;i++){let s=b[i];for(let m=Math.max(0,i-k);m<i;m++)s-=L[i*w+m-i+k]*y[m];y[i]=s/L[i*w+k];}
 for(let i=n-1;i>=0;i--){let s=y[i];for(let m=i+1;m<=Math.min(n-1,i+k);m++)s-=L[m*w+i-m+k]*x[m];x[i]=s/L[i*w+k];}
 return x;}
// One axis: minimise sum wT (c - c0)^2 + wJ |third difference|^2 subject to lo <= row . c <= hi for every row
// ({at, c: coefficients, lo, hi}; an equality has lo = hi). Rows are scaled to unit norm.
function boxedPath(c0,wT,wJ,rows,{rho=2e5,iters=1500,tol=1e-8}={}){
 const n=c0.length,k=3,w=k+1,M=new Float64Array(n*w),R=rows.map(r=>{const s=Math.hypot(...r.c)||1;return {at:r.at,c:r.c.map(x=>x/s),lo:r.lo/s,hi:r.hi/s};});
 const outer=(at,cs,f)=>{for(let a=0;a<cs.length;a++){const i=at+a;if(i<0||i>=n)continue;for(let b=0;b<=a;b++){const j=at+b;if(j<0)continue;M[i*w+j-i+k]+=f*cs[a]*cs[b];}}};
 for(let i=0;i<n;i++)M[i*w+k]+=wT[i];for(let i=0;i+3<n;i++)outer(i,[-1,3,-3,1],wJ);for(const r of R)outer(r.at,r.c,rho);
 // the iterations run on flat arrays (rows of up to three coefficients): the same sums in the same order
 const L=cholesky(n,k,M),m=R.length,at=Int32Array.from(R,r=>r.at),len=Uint8Array.from(R,r=>r.c.length),C=new Float64Array(m*3),lo=Float64Array.from(R,r=>r.lo),hi=Float64Array.from(R,r=>r.hi);
 R.forEach((r,j)=>r.c.forEach((x,a)=>{C[j*3+a]=x;}));
 const dot=(j,c)=>{let s=0;for(let a=0;a<len[j];a++)s+=C[j*3+a]*c[at[j]+a];return s;};
 let c=Float64Array.from(c0);const z=new Float64Array(m),u=new Float64Array(m),b0=Float64Array.from(c0,(x,i)=>wT[i]*x),b=new Float64Array(n),y=new Float64Array(n);for(let j=0;j<m;j++)z[j]=clamp(dot(j,c),lo[j],hi[j]);let res=Infinity;
 for(let it=0;it<iters&&res>tol;it++){b.set(b0);
  for(let j=0;j<m;j++){const v=rho*(z[j]-u[j]);for(let a=0;a<len[j];a++)b[at[j]+a]+=C[j*3+a]*v;}c=cholSolve(n,k,L,b,y,c===c0?new Float64Array(n):c);
  res=0;for(let j=0;j<m;j++){const ax=dot(j,c),zn=clamp(ax+u[j],lo[j],hi[j]);u[j]+=ax-zn;z[j]=zn;res=Math.max(res,Math.abs(ax-zn));}}
 return {c,res};}
// samples: [{c: [x,y,z] authored centre of mass, kind: 'air' | 'grip' | 'feet' | 'hold', box: [xmin,xmax,zmin,zmax] (feet),
// floor: y}] on a uniform grid dt. 'hold' keeps the authored path (a support this plan does not model, such as a roll).
export function planCentre(samples,dt,{jerk:wJ=2e5,hold:wH=400,fmax=FMAX,margin=.01}={}){
 const n=samples.length,d2=dt*dt,c0=[0,1,2].map(ax=>Float64Array.from(samples,s=>s.c[ax])),wT=samples.map(s=>s.kind==='hold'?wH:1),acc=[1,-2,1];
 const ends=ax=>[0,1,n-2,n-1].map(i=>({at:i,c:[1],lo:c0[ax][i<2?0:n-1],hi:c0[ax][i<2?0:n-1]}));
 // Vertical: ballistic in flight; a floor pushes between .3 and fmax body weights, a grip either way up to fmax.
 const ry=ends(1);for(let i=1;i<n-1;i++){const s=samples[i];if(s.kind==='air')ry.push({at:i-1,c:acc,lo:-G*d2,hi:-G*d2});
  else if(s.kind==='feet')ry.push({at:i-1,c:acc,lo:(.3-1)*G*d2,hi:(fmax-1)*G*d2});else if(s.kind==='grip')ry.push({at:i-1,c:acc,lo:(-fmax-1)*G*d2,hi:(fmax-1)*G*d2});}
 const Y=boxedPath(c0[1],wT,wJ,ry),ay=i=>i>0&&i<n-1?(Y.c[i+1]-2*Y.c[i]+Y.c[i-1])/d2:0;
 const out=[null,Y.c,null],res=[0,Y.res,0];
 for(const ax of [0,2]){const r=ends(ax);
  for(let i=1;i<n-1;i++){const s=samples[i];if(s.kind==='air'){r.push({at:i-1,c:acc,lo:0,hi:0});continue;}
   if(s.kind==='grip'){r.push({at:i-1,c:acc,lo:-fmax*G*d2,hi:fmax*G*d2});continue;}
   if(s.kind!=='feet')continue;const fy=Math.max(.3*G,ay(i)+G),h=Math.max(.2,Y.c[i]-(s.floor||0)),k=h/fy;
   // The pressure point also carries the body's turning: p_x = c_x - k a_x + dL_z / (M fy), p_z = c_z - k a_z - dL_x / (M fy).
   const dl=s.dL?(ax?-s.dL[0]:s.dL[2])/(BODY_MASS*fy):0,lo=s.box[ax?2:0]+margin-dl,hi=s.box[ax?3:1]-margin-dl,mid=(s.box[ax?2:0]+s.box[ax?3:1])/2-dl;
   r.push({at:i-1,c:[-k/d2,1+2*k/d2,-k/d2],lo:Math.min(lo,mid),hi:Math.max(hi,mid)},{at:i-1,c:acc,lo:-MU*fy*d2,hi:MU*fy*d2});}
  const P=boxedPath(c0[ax],wT,wJ,r);out[ax]=P.c;res[ax]=P.res;}
 const plan=Array.from(out[0],(x,i)=>[x,out[1][i],out[2][i]]);plan.residual=res;return plan;}
// The hips shift that makes the real centre of mass follow the plan: comAt(t, shift) poses the motion with the hips
// moved by shift ([x,y,z]) and returns its centre of mass. The pelvis carries most of the body, so each pass moves it
// by GAIN x the miss (the grenade throw's measured inverse sensitivity with the feet planted).
// base(t) is a hips offset the motion adds on top ([x,y,z], the clearance fit's): the shift is interpolated together
// with it and handed back without it, so between samples the hips follow their smooth sum. The shift cancels what
// the plan smooths out of that offset; apart, each kept its own knots (the fit's 20 ms, the shift's 5 ms), and the
// onset of a clearance push back from the wall read as 480 N of phantom push between samples.
const GAIN=1.29;
export function followCentre(times,plan,comAt,{passes=5,base=null}={}){
 const shift=times.map(()=>[0,0,0]);let worst=0;
 for(let p=0;p<passes;p++){worst=0;times.forEach((t,i)=>{const c=comAt(t,shift[i]);for(let ax=0;ax<3;ax++){const miss=plan[i][ax]-c[ax];shift[i][ax]+=GAIN*miss;worst=Math.max(worst,Math.abs(miss));}});}
 const tr=track(times.map((t,i)=>{const b=base?base(t):[0,0,0];return [t,...shift[i].map((x,ax)=>x+b[ax])];}),{},{limit:false});
 return {shift:t=>{const tc=clamp(t,times[0],times.at(-1)),s=V(...tr(tc));return base?s.sub(V(...base(tc))):s;},worst};}
// What holds the body at a moment, from its real surface (as the phantom-wrench rig decides it): a hand within 1 cm
// of an obstacle grips; hooves (and hands) within 1 cm of the floor stand, their extent the pressure point's box;
// anything else touching is held as authored (a support this plan does not model); nothing touching is flight.
const TOL=.01,ENDS=new WeakMap();
// Per probe point: 1 a hand, 2 a foot, 0 the rest, by its mesh as the rig names them (a sleeve cuff riding the hand
// bone is not a grip). Read once the probe has been skinned (its part indices are set by update).
const endsOf=probe=>{let e=ENDS.get(probe);if(!e){const kind=probe.names.map(p=>/hand/.test(p)?1:/hoof|boot|foot|toe/i.test(p)?2:0);e=Uint8Array.from(probe.part,pi=>kind[pi]);ENDS.set(probe,e);}return e;};
export function supportAt(probe,obstacles){
 const over=(x,z)=>obstacles.some(b=>x>b.min[0]&&x<b.max[0]&&z>b.min[2]&&z<b.max[2]),ends=endsOf(probe);
 let grip=false,body=false;const box=[Infinity,-Infinity,Infinity,-Infinity];
 for(let i=0;i<probe.count;i++){const x=probe.x[i],y=probe.y[i],z=probe.z[i],e=ends[i];
  if(y<TOL&&y>-TOL&&!over(x,z)){if(e){box[0]=Math.min(box[0],x);box[1]=Math.max(box[1],x);box[2]=Math.min(box[2],z);box[3]=Math.max(box[3],z);}else body=true;continue;}
  for(const o of obstacles){const dx=Math.max(o.min[0]-x,0,x-o.max[0]),dy=Math.max(o.min[1]-y,0,y-o.max[1]),dz=Math.max(o.min[2]-z,0,z-o.max[2]);if(dx>=TOL||dy>=TOL||dz>=TOL)continue;const inside=!dx&&!dy&&!dz;
   const d=inside?Math.min(x-o.min[0],o.max[0]-x,y-o.min[1],o.max[1]-y,z-o.min[2],o.max[2]-z):Math.hypot(dx,dy,dz);if(d<TOL){if(e===1)grip=true;else body=true;}}}
 const feet=box[0]<=box[1];
 return grip?{kind:'grip'}:feet?{kind:'feet',box,floor:0}:body?{kind:'hold'}:{kind:'air'};}
// The whole pipeline for a motion: pose(t) poses it (with the hips moved by the current trial shift, set through
// setShift) and returns its points; com(points) is its centre of mass.
// Angular momentum about the centre of mass at each grid sample, from the posed points (the rig's model: each
// segment's mass at its middle plus a rod's spin, m l^2 / 12 (u x du/dt)), and its rate.
function turning(frames,dt){const n=frames.length,mid=(P,a,b)=>P[a].clone().add(P[b]).multiplyScalar(.5),c=frames.map(P=>{const x=V();for(const [a,b,m]of MASS_SEGMENTS)x.addScaledVector(mid(P,a,b),m);return x.divideScalar(BODY_MASS);});
 const L=frames.map((P,i)=>{const A=frames[Math.max(0,i-1)],B=frames[Math.min(n-1,i+1)],h=(Math.min(n-1,i+1)-Math.max(0,i-1))*dt,vc=c[Math.min(n-1,i+1)].clone().sub(c[Math.max(0,i-1)]).divideScalar(h),out=V();
  for(const [a,b,m]of MASS_SEGMENTS){const vm=mid(B,a,b).sub(mid(A,a,b)).divideScalar(h),u=P[b].clone().sub(P[a]),len=u.length();u.divideScalar(len);
   const du=B[b].clone().sub(B[a]).normalize().sub(A[b].clone().sub(A[a]).normalize()).divideScalar(h);out.add(mid(P,a,b).sub(c[i]).cross(vm.sub(vc)).multiplyScalar(m)).add(u.cross(du).multiplyScalar(m*len*len/12));}return out;});
 const dL=L.map((_,i)=>L[Math.min(n-1,i+1)].clone().sub(L[Math.max(0,i-1)]).divideScalar((Math.min(n-1,i+1)-Math.max(0,i-1))*dt));
 // a light five-sample average: the differences of differences are noisy at 5 ms
 return dL.map((_,i)=>{const s=V();let m=0;for(let j=i-2;j<=i+2;j++)if(j>=0&&j<n){s.add(dL[j]);m++;}return s.divideScalar(m).toArray();});}
const KEEP=[...new Set(MASS_SEGMENTS.flatMap(([a,b])=>[a,b]))];
// The whole pipeline for a motion: pose(t) poses it (with the hips moved by the current trial shift, set through
// setShift) and returns its points; com(points) is its centre of mass. Planned against the authored path, the
// contacts and the body's turning are measured again on the balanced motion and the plan solved again (rounds):
// moving the hips moves where a hand first touches.
// A grip counts from ONSET after the first touch (a hand's hold builds up; planned on at the touch itself, a hand that
// touched 40 ms later once the hips moved left the feet braking the body alone).
const ONSET=.02;
export function balanceTraversal({duration,probe,obstacles,pose,com,setShift,base=null,dt=.005,rounds=4,plan:options={}}){
 const n=Math.round(duration/dt)+1,times=Array.from({length:n},(_,i)=>Math.min(duration,i*dt));let c0=null,follow=null,samples=null,plan=null,last=null,settled=false;
 // each round's schedule as runs ('feet 0.000-0.690, ...'), for the diagnostics
 const history=[],runs=S=>{const out=[];S.forEach((s,i)=>{const r=out.at(-1);if(r&&r.kind===s.kind)r.end=times[i];else out.push({kind:s.kind,start:times[i],end:times[i]});});return out.map(r=>`${r.kind} ${r.start.toFixed(3)}-${r.end.toFixed(3)}`).join(', ');};
 const measure=()=>{const frames=[];const S=times.map(t=>{setShift(follow?follow.shift(t):null);const P=pose(t);probe.update();frames.push(Object.fromEntries(KEEP.map(k=>[k,P[k].clone()])));return {...supportAt(probe,obstacles),c:com(P).toArray()};});
  const lag=Math.round(ONSET/dt);for(let i=n-1;i>=0;i--)if(S[i].kind==='grip'){let j=i;while(j>0&&S[j-1].kind==='grip')j--;for(let k=j;k<Math.min(n,j+lag);k++)S[k]=j>0?{...S[j-1],c:S[k].c}:S[k];i=j;}
  return {S,dL:turning(frames,dt)};};
 for(let r=0;r<rounds&&!settled;r++){const {S,dL}=measure(),key=S.map(x=>x.kind).join();history.push(runs(S));
  if(!c0)c0=S.map(x=>x.c);settled=key===last;last=key;if(settled)break;
  samples=S.map((x,i)=>({...x,c:c0[i],dL:dL[i]}));plan=planCentre(samples,dt,options);
  follow=followCentre(times,plan,(t,s)=>{setShift(V(...s));return com(pose(t)).toArray();},{base});}
 setShift(null);return {...follow,plan,samples,times,settled,history};}
