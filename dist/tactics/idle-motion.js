import * as T from './vendor/three.module.js';
import {IDLE_FITS} from './idle-fits.js';
// Idle: a worker standing and looking around, on any of the eleven mammal rigs (the hen has wings, not arms). Seeded
// and seamless: at(t) repeats every `length` seconds, and each seed draws its own looks, breaths and weight shifts.
// Both hooves stay planted.
const V=(a=[0,0,0])=>new T.Vector3(...a),Q=()=>new T.Quaternion(),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const turn=(axis,a)=>Q().setFromAxisAngle(V(axis),a),DEG=Math.PI/180;
const logq=q=>{const w=clamp(q.w,-1,1),s=Math.sqrt(1-w*w);return s<1e-9?V():V([q.x,q.y,q.z]).multiplyScalar(2*Math.acos(w)/s);};
const expq=r=>{const a=r.length();return a<1e-12?Q():Q().setFromAxisAngle(r.clone().divideScalar(a),a);};
const trunkQ=(yaw,flex,lean)=>turn([0,1,0],yaw).multiply(turn([1,0,0],-lean)).multiply(turn([0,0,1],-flex));
export const IDLE=Object.freeze({length:30,gravity:9.81,neck:40});
// Leaning toward one hoof, in degrees per unit of lean: the pelvis rolls, that hip up; the chest bends back past level on
// it, so the shoulders tilt a little the other way. ramp() is max(0, x) with its corner rounded, so nothing snaps as the
// lean crosses over.
const ramp=x=>(x+Math.hypot(x,.15))/2-.075;
const POSTURE={roll:4.5,lean:6,sink:.003};
// Breathing: per unit of breath the shoulders rise 5 mm (a shrug at the arm roots) and the chest opens half a degree.
const BREATH={shrug:.005,chest:.5};
// Segment masses for balance (kg, 74.9 in all), as in the grenade throw: the horse head is counted at 6 kg.
const SEGMENTS=[['pelvis','chest',18],['chest','neck',13],['neck','headTip',6],...[-1,1].flatMap(s=>[['pelvis','hip'+s,1],['chest','shoulder'+s,1],['shoulder'+s,'elbow'+s,1.9],['elbow'+s,'wrist'+s,1.1],
 ['wrist'+s,'palm'+s,.45],['hip'+s,'knee'+s,9.5],['knee'+s,'ankle'+s,3],['ankle'+s,'toe'+s,.5],['ankle'+s,'heel'+s,.5]])],MASS=SEGMENTS.reduce((m,s)=>m+s[2],0);

// ---- seeded schedules ----
// mulberry32 from a 32-bit integer seed, mixed by a bijection so that every seed starts its own sequence.
function random(seed){let a=Math.imul((seed>>>0)^0x5bd1e995,0x9e3779b1)>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const between=(r,a,b)=>a+(b-a)*r();
// A gaze shift takes longer the further it goes (about 0.4 s for 20 degrees, 0.5 s for 40).
const shiftTime=(a,b)=>.30+.0055*Math.hypot(b.yaw-a.yaw,b.pitch-a.pitch);
// When the trunk follows a gaze shift, [chest delay, chest stretch, hips delay, hips stretch]: by default the chest
// starts 0.10 s after the head and takes 1.5 times as long, the hips 0.16 s after and 1.8 times as long. A wide look
// cannot wait that long (the head would stall against its limit mid-turn), so it takes the first, most relaxed timing
// that keeps the head within 36 degrees of yaw from the chest; the trunk then starts sooner and moves faster.
const TIMINGS=[[.10,1.5,.16,1.8],[.07,1.35,.12,1.6],[.04,1.2,.08,1.4],[.02,1.08,.04,1.2],[0,1,0,1.05]],trunkTail=d=>TIMINGS[0][2]+(TIMINGS[0][3]-1)*d;
// A look is named by what it is (a glance at the ground, a look aside, the rest ahead, a drift), or else by where it goes.
export const lookLabel=l=>l.kind==='ground'?'Glance down':l.kind==='side'?(l.yaw>0?'Look left':'Look right'):l.kind==='home'?'Look ahead':l.kind==='drift'?'Drift':
 l.pitch<-12?'Glance down':l.yaw>20?'Look left':l.yaw<-20?'Look right':Math.abs(l.yaw)<7?'Look ahead':'Drift';
// Looks: degrees from straight ahead (yaw positive to the left, pitch positive up, roll tilts the head). A relaxed worker
// mostly rests the eyes ahead, 4-9 s at a time and now and then for 9-13; otherwise the gaze drifts 6-12 degrees for a
// while near eye level, looks 28-50 degrees to one side (the sides are random, with a lean toward the side not looked at
// last), or glances at the ground in front and comes back up: after a glance down the gaze rests ahead or drifts up, and a
// drift never goes below 10 degrees under level. About a dozen gaze shifts a minute. Every look moves at least 6 degrees
// (or a third of what the gaze can span, for a head its clothes hold), and only to where this rig can turn, nod, look up
// and tilt without its head meeting its clothes (`reach`). The loop opens and closes on the same look ahead.
function draftLooks(r,L,reach){
 const shallow=reach.down<22,below=p=>Math.max(-reach.down,p),home={yaw:between(r,-3,3),pitch:below(shallow?between(r,-4,-1):between(r,-8,-4)),roll:0},list=[];let t=between(r,2,5),cur=home,last='home',lastSide=r()<.5?1:-1;
 const sideMax=s=>s>0?reach.left:reach.right,low=-10;
 // every look moves at least 6 degrees, or a third of what this rig's gaze can span where that is less (a head its
 // clothes hold); a thousand draws in a row too small for that end the plan where it is
 const span=Math.hypot(Math.max(0,reach.left-3)+Math.max(0,reach.right-3),Math.max(0,reach.down-1)+Math.max(0,Math.min(4,reach.up))),step=Math.min(6,span/3);let misses=0;
 for(;;){
  const u=r(),narrow=Math.max(reach.left,reach.right)<14,level=reach.down<8;let kind=last==='home'?(u<.42?'drift':u<.78?'side':'ground'):last==='side'?(u<.55?'home':u<.88?'drift':'side'):last==='ground'?(u<.7?'home':'drift'):(u<.40?'home':u<.62?'drift':u<.86?'side':'ground');
  // a rig that cannot turn its head 14 degrees either way drifts instead of looking aside, and one that cannot look 8
  // degrees down drifts instead of glancing at the ground
  if(kind==='side'&&narrow||kind==='ground'&&level)kind='drift';
  let next,hold;
  if(kind==='side'){const s=r()<.62?-lastSide:lastSide,top=Math.min(50,sideMax(s)-2);next={yaw:s*between(r,Math.min(28,top-6),top),pitch:below(between(r,-7,Math.min(3,reach.up))),roll:r()<.25?-s*Math.min(reach.tilt,between(r,1.5,4)):0};lastSide=s;hold=between(r,1.5,3.5);}
  else if(kind==='ground'){const deep=Math.min(26,reach.down-1);next={yaw:between(r,-15,15),pitch:-between(r,Math.min(14,deep-4),deep),roll:0};hold=between(r,1.0,2.2);}
  else if(kind==='home'){next={yaw:between(r,-4,4),pitch:below(shallow?between(r,-5,-1):between(r,-9,-3)),roll:0};hold=r()<.15?between(r,9,13):between(r,4,9);}
  else{const dir=Math.abs(cur.yaw)>18&&r()<.75?-Math.sign(cur.yaw):r()<.5?-1:1,yaw=cur.yaw+dir*between(r,6,12),pitch=last==='ground'?Math.max(low,cur.pitch+between(r,6,10)):cur.pitch+between(r,-4,4);
   next={yaw:Math.max(-Math.max(0,sideMax(-1)-3),Math.min(Math.max(0,sideMax(1)-3),yaw)),pitch:Math.max(low,Math.max(-Math.max(0,reach.down-1),Math.min(Math.min(4,reach.up),pitch))),roll:0};hold=between(r,2,4.5);}
  if(Math.hypot(next.yaw-cur.yaw,next.pitch-cur.pitch)<step){if(++misses>1000)break;continue;}misses=0;
  const dur=shiftTime(cur,next),back=shiftTime(next,home);
  if(t+dur+hold+back+trunkTail(back)+1.5>L)break;
  list.push({time:t,dur,...next,kind,label:lookLabel({...next,kind})});cur=next;last=kind;t+=dur+hold;
 }
 // A last look within a step of the opening one is dropped, so the loop closes on a real shift (or none at all).
 while(list.length&&Math.hypot(cur.yaw-home.yaw,cur.pitch-home.pitch)<step){t=list.pop().time;cur=list.at(-1)??home;}
 if(list.length)list.push({time:t,dur:shiftTime(cur,home),...home,kind:'home',label:'Look ahead'});
 return {home,list};
}
// A loop of looking around has at least one look to the side and one at the ground: a draft without both is drawn again.
function lookPlan(r,L,reach){let plan;for(let i=0;i<12;i++){plan=draftLooks(r,L,reach);if(plan.list.some(l=>l.kind==='side')&&plan.list.some(l=>l.kind==='ground'))break;}return plan;}
// Lean: square on both hooves, or leaning onto one (side -1 is the left hoof, +1 the right), shifting over 1.2-1.7 s.
function stancePlan(r,L){
 const list=[];let t=between(r,3,7),cur=0;
 for(;;){const next=cur===0?(r()<.5?-1:1):(r()<.35?-cur:0),dur=between(r,1.2,1.7),hold=next===0?between(r,4,8):between(r,6,11);
  if(t+dur+hold+1.7+1.5>L)break;list.push({time:t,dur,side:next});cur=next;t+=dur+hold;}
 if(cur!==0)list.push({time:t,dur:between(r,1.2,1.6),side:0});
 return list;
}
// Breaths whose lengths, about 4.3 s on average, add up to the loop; the inhale is the shorter part, and one breath is
// a sigh: nearly three times as deep, with a long exhale.
function breathPlan(r,L){
 const n=Math.max(2,Math.round(L/4.3)),raw=Array.from({length:n},()=>between(r,.88,1.12)),sum=raw.reduce((a,b)=>a+b,0),sigh=Math.floor(r()*n);let t=0;
 return raw.map((x,i)=>{const d=x*L/sum,b={time:t,dur:d,amp:i===sigh?2.8:between(r,.85,1.15),inhale:i===sigh?.32:between(r,.38,.45)};t+=d;return b;});
}
// A value that holds and then eases (minimum jerk) to each new value; overlapping steps blend smoothly.
const steps=(v0,list)=>t=>{let v=v0;for(const [s,d,x] of list){if(t<=s)break;v+=(x-v)*smooth((t-s)/d);}return v;};
// Slow periodic noise: sines with whole cycles per loop, amplitude falling with frequency, scaled to an rms.
function wave(r,L,k0,k1,rms){const terms=[];for(let k=k0;k<=k1;k++)terms.push([2*Math.PI*k/L,between(r,0,2*Math.PI),1/k]);const s=Math.sqrt(terms.reduce((a,[,,c])=>a+c*c/2,0));return t=>rms*terms.reduce((a,[w,p,c])=>a+c*Math.sin(w*t+p),0)/s;}

// ---- periodic solvers on a uniform grid ----
function thomas(a,b,c,d){const n=b.length,cp=new Float64Array(n),dp=new Float64Array(n),x=new Float64Array(n);cp[0]=c[0]/b[0];dp[0]=d[0]/b[0];
 for(let i=1;i<n;i++){const m=b[i]-a[i]*cp[i-1];cp[i]=c[i]/m;dp[i]=(d[i]-a[i]*dp[i-1])/m;}x[n-1]=dp[n-1];for(let i=n-2;i>=0;i--)x[i]=dp[i]-cp[i]*x[i+1];return x;}
// Cyclic tridiagonal system (Sherman-Morrison): row 0 also couples x[n-1] by a[0], row n-1 couples x[0] by c[n-1].
function cyclic(a,b,c,d){const n=b.length,gamma=-b[0],bb=Float64Array.from(b);bb[0]-=gamma;bb[n-1]-=c[n-1]*a[0]/gamma;
 const x=thomas(a,bb,c,d),u=new Float64Array(n);u[0]=gamma;u[n-1]=c[n-1];const z=thomas(a,bb,c,u),f=(x[0]+a[0]*x[n-1]/gamma)/(1+z[0]+a[0]*z[n-1]/gamma);return x.map((v,i)=>v-f*z[i]);}
// Periodic C2 cubic spline through samples y[i] at i*dt.
function loopSpline(y,dt){const n=y.length,r=y.map((v,i)=>6*(y[(i+1)%n]-2*v+y[(i-1+n)%n])/(dt*dt)),m=cyclic(new Float64Array(n).fill(1),new Float64Array(n).fill(4),new Float64Array(n).fill(1),r),L=n*dt;
 return t=>{const u=((t%L)+L)%L/dt,i=Math.min(n-1,Math.floor(u)),j=(i+1)%n,f=u-i,g=1-f;return m[i]*g*g*g*dt*dt/6+m[j]*f*f*f*dt*dt/6+(y[i]-m[i]*dt*dt/6)*g+(y[j]-m[j]*dt*dt/6)*f;};}
// x'' = w2 (x - p), periodic: the linear inverted pendulum with no start or end, only a loop.
function loopPendulum(w2,p,dt){const n=w2.length,h=dt*dt;return cyclic(new Float64Array(n).fill(-1),Float64Array.from(w2,w=>2+h*w),new Float64Array(n).fill(-1),Float64Array.from(p,(x,i)=>h*w2[i]*x));}
// Second-order lag (natural frequency f, damping zeta) of a periodic signal, run twice round so it closes.
function loopLag(y,dt,f,zeta){const n=y.length,w=2*Math.PI*f,out=new Float64Array(n);let x=y[0],v=0;for(let pass=0;pass<2;pass++)for(let i=0;i<n;i++){v+=(w*w*(y[i]-x)-2*zeta*w*v)*dt;x+=v*dt;if(pass)out[i]=x;}return out;}

// The neck bends like a branch loaded at its tip: curvature greatest at the base and none where it meets the skull,
// kappa(s) = kappa0 (1 - s/l), so the tangent turns as theta (2u - u^2) along it (u = s/l) and the tip, tilted by theta,
// moves l*along(theta) out of line and l*drop(theta) back down its axis (Simpson's rule over the branch). along() is odd
// and drop() even in theta, so one signed angle bends the neck forward or back.
const branch=(theta,f)=>{let a=0;for(let i=0;i<=16;i++){const u=i/16;a+=(i%16?i%2?4:2:1)*f(theta*(2*u-u*u));}return a/48;},along=th=>branch(th,Math.sin),drop=th=>1-branch(th,Math.cos);
// The branch takes all of a downward tilt and half of an upward one, eased smoothly through level (no kink at zero).
const bendOf=pitch=>-pitch*(.75-.25*Math.tanh(pitch/(2*DEG)));
// The share of the neck skin's chest weight that moves to the neck bone, by height above the branch's base (in branch
// lengths): none from 0.15 below the base, all from 0.45 above it, so the skin bends most at the base.
const neckShare=u=>smooth((u+.15)/.6);
// Elbow or knee of a two-bone limb whose end must reach target, bent toward pole.
function bend(start,target,l1,l2,pole){const axis=target.clone().sub(start),d=Math.min(axis.length(),l1+l2-1e-9);axis.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),side=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();return start.clone().addScaledVector(axis,along).addScaledVector(side,Math.sqrt(Math.max(0,l1*l1-along*along)));}
function hull2(pts){const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];for(const q of p){while(lo.length>=2&&cr(lo.at(-2),lo.at(-1),q)<=0)lo.pop();lo.push(q);}for(const q of [...p].reverse()){while(up.length>=2&&cr(up.at(-2),up.at(-1),q)<=0)up.pop();up.push(q);}return lo.slice(0,-1).concat(up.slice(0,-1));}
// Distance from q to the boundary of a convex polygon, positive inside.
function inside(h,q){let best=Infinity,isIn=h.length>2;for(let i=0;i<h.length;i++){const a=h[i],b=h[(i+1)%h.length],ex=b[0]-a[0],ez=b[1]-a[1],L=Math.hypot(ex,ez)||1e-12;if((ex*(q[1]-a[1])-ez*(q[0]-a[0]))/L<0)isIn=false;const k=clamp(((q[0]-a[0])*ex+(q[1]-a[1])*ez)/(L*L));best=Math.min(best,Math.hypot(q[0]-a[0]-k*ex,q[1]-a[1]-k*ez));}return isIn?best:-best;}

// ---- skinned triangles, and when two of them cross ----
// World positions of a part's vertices from its skeleton's current bones: one matrix per bone, not per vertex.
function skinner(mesh){const a=mesh.geometry.attributes,p=a.position.array,n=a.position.count,out=new Float64Array(n*3),M=[],tmp=new T.Matrix4(),W=new T.Matrix4();
 return {out,update(){const sk=mesh.skeleton;W.multiplyMatrices(mesh.matrixWorld,mesh.bindMatrixInverse);for(let b=0;b<sk.bones.length;b++){M[b]??=new T.Matrix4();tmp.multiplyMatrices(sk.bones[b].matrixWorld,sk.boneInverses[b]).multiply(mesh.bindMatrix);M[b].multiplyMatrices(W,tmp);}
  const si=a.skinIndex.array,sw=a.skinWeight.array;for(let i=0;i<n;i++){const x=p[3*i],y=p[3*i+1],z=p[3*i+2];let X=0,Y=0,Z=0;for(let k=0;k<4;k++){const w=sw[4*i+k];if(!w)continue;const e=M[si[4*i+k]].elements;X+=w*(e[0]*x+e[4]*y+e[8]*z+e[12]);Y+=w*(e[1]*x+e[5]*y+e[9]*z+e[13]);Z+=w*(e[2]*x+e[6]*y+e[10]*z+e[14]);}out[3*i]=X;out[3*i+1]=Y;out[3*i+2]=Z;}return out;}};}
// Moller-Trumbore on plain arrays: does the segment a-b pass through triangle (p, q, r)?
function meets(a,b,p,q,r){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],e1x=q[0]-p[0],e1y=q[1]-p[1],e1z=q[2]-p[2],e2x=r[0]-p[0],e2y=r[1]-p[1],e2z=r[2]-p[2];
 const px=dy*e2z-dz*e2y,py=dz*e2x-dx*e2z,pz=dx*e2y-dy*e2x,det=e1x*px+e1y*py+e1z*pz;if(Math.abs(det)<1e-14)return false;const inv=1/det,sx=a[0]-p[0],sy=a[1]-p[1],sz=a[2]-p[2],u=(sx*px+sy*py+sz*pz)*inv;if(u<0||u>1)return false;
 const qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,w=(dx*qx+dy*qy+dz*qz)*inv;if(w<0||u+w>1)return false;const h=(e2x*qx+e2y*qy+e2z*qz)*inv;return h>0&&h<1;}
// The nearest point of triangle (A, B, C) to point p (Ericson's region test): its barycentric weights b, the offset e of p
// from it and its squared length d2, and the feature it lies on (feat -1 inside the face, 0-2 on the edge from that
// corner to the next, 3-5 at corner 0-2).
function closest(p,A,B,C){const ab=[B[0]-A[0],B[1]-A[1],B[2]-A[2]],ac=[C[0]-A[0],C[1]-A[1],C[2]-A[2]],ap=[p[0]-A[0],p[1]-A[1],p[2]-A[2]],dot=(x,y)=>x[0]*y[0]+x[1]*y[1]+x[2]*y[2];
 let b,feat;const d1=dot(ab,ap),d2=dot(ac,ap);
 if(d1<=0&&d2<=0){b=[1,0,0];feat=3;}else{const bp=[p[0]-B[0],p[1]-B[1],p[2]-B[2]],d3=dot(ab,bp),d4=dot(ac,bp);
  if(d3>=0&&d4<=d3){b=[0,1,0];feat=4;}else{const vc=d1*d4-d3*d2;
   if(vc<=0&&d1>=0&&d3<=0){const t=d1/(d1-d3);b=[1-t,t,0];feat=0;}else{const cp=[p[0]-C[0],p[1]-C[1],p[2]-C[2]],d5=dot(ab,cp),d6=dot(ac,cp);
    if(d6>=0&&d5<=d6){b=[0,0,1];feat=5;}else{const vb=d5*d2-d1*d6;
     if(vb<=0&&d2>=0&&d6<=0){const t=d2/(d2-d6);b=[1-t,0,t];feat=2;}else{const va=d3*d6-d5*d4;
      if(va<=0&&d4-d3>=0&&d5-d6>=0){const t=(d4-d3)/((d4-d3)+(d5-d6));b=[0,1-t,t];feat=1;}else{const den=1/(va+vb+vc),v=vb*den,w=vc*den;b=[1-v-w,v,w];feat=-1;}}}}}}
 const e=[0,1,2].map(k=>p[k]-(b[0]*A[k]+b[1]*B[k]+b[2]*C[k]));return {b,e,d2:dot(e,e),feat};}

// The fitted limits depend only on the rig, not the seed: one fit per rig shape (6-11 s), kept for every later loop. The
// catalog rigs' fits ship in idle-fits.js, keyed by rigKey (tools/fit-idle-rigs.mjs writes it; tests/idle-fits.test.mjs
// refits every rig against it); a rig not in it is fitted when its first idle is made, and `refit: true` fits afresh.
const FITS=new Map(),LIVE=new WeakSet();
const fingerprint=worker=>worker.bones.map(b=>b.name+b.position.toArray().map(x=>x.toFixed(4)).join(',')).join(';')+'|'+worker.parts.map(p=>{const a=p.geometry.attributes.position.array;let sum=0;for(let i=0;i<a.length;i++)sum+=a[i]*(1+i%3);return p.name+':'+a.length/3+':'+sum.toFixed(3);}).join(';');
// A rig's key: its bones' rest places and its parts' names, sizes and vertex sums (the fingerprint), hashed (FNV-1a).
export const rigKey=worker=>{const f=fingerprint(worker);let h=0x811c9dc5;for(let i=0;i<f.length;i++){h^=f.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return 'k'+h.toString(16).padStart(8,'0');};

export function createIdle(worker,{seed=1,length=IDLE.length,eye=null,refit=false}={}){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Idle seed must be a whole number from 0 to 4294967295');
 if(typeof length!=='number'||!Number.isFinite(length)||length<12||length>600)throw Error('Idle loop must last 12 to 600 s');
 if(eye!==null&&!(Array.isArray(eye)&&eye.length===3&&eye.every(Number.isFinite)))throw Error('Idle eye must be a world point [x, y, z] on the rest pose');
 if(typeof refit!=='boolean')throw Error('Idle refit must be true or false');
 if(LIVE.has(worker))throw Error('This worker already has an idle running: dispose it first');
 const key=rigKey(worker),L=length,root=worker.root,bones=Object.fromEntries(worker.bones.map(b=>[b.name,b])),base0=worker.skeleton;
 root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');root.updateMatrixWorld(true);
 const rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())])),at0=b=>rest.get(bones[b]).clone(),palm=V([.052,-.010,0]);
 const restHips=at0('hips'),spineOffset=at0('spine').sub(restHips),headOffset=at0('head').sub(at0('spine'));
 // Where the eyes sit on the head (the catalog's eye height and depth, or the horse's): the gaze line starts there.
 const EYE=eye?V([eye[0],eye[1],0]).sub(at0('head')):V([.123,.177,0]);
 // The neck as a branch rising from the shoulders to the head joint along the rest neck, three quarters as long as the
 // spine-to-head span of this rig.
 const NECK=clamp(.75*headOffset.length(),.15,.22),NECK_AXIS=headOffset.clone().normalize(),NECK_BASE=headOffset.clone().addScaledVector(NECK_AXIS,-NECK);
 const THIGH={},SHOULDER={},HANG={},LENGTH={},BEND={},ANKLE={},ARM_ROOT={},ELBOW={};
 // How far the shoulder is from the wrist with the elbow bent this many degrees past its rest bend, as a share of the rest
 // reach.
 const reachAt=(s,extra)=>{const [l1,l2]=LENGTH[s].arm,d=e=>Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(e));return d(ELBOW[s]+extra*DEG)/d(ELBOW[s]);};
 for(const s of [-1,1]){THIGH[s]=at0('thigh'+s).sub(restHips);SHOULDER[s]=at0('upperArm'+s).sub(at0('spine'));ANKLE[s]=at0('hoof'+s);ARM_ROOT[s]=bones['upperArm'+s].position.clone();
  const d=(a,b)=>at0(a+s).distanceTo(at0(b+s));LENGTH[s]={arm:[d('upperArm','forearm'),d('forearm','hand')],leg:[d('thigh','shin'),d('shin','hoof')]};
  // The direction each rest elbow and knee already bends, and the way the rest arm hangs from its shoulder.
  const bent=(a,b,c)=>{const o=at0(a+s),axis=at0(c+s).sub(o).normalize(),e=at0(b+s).sub(o);return e.addScaledVector(axis,-e.dot(axis)).normalize();};BEND[s]={arm:bent('upperArm','forearm','hand'),leg:bent('thigh','shin','hoof')};
  HANG[s]=at0('hand'+s).sub(at0('upperArm'+s));const e=at0('forearm'+s).sub(at0('upperArm'+s)).angleTo(at0('hand'+s).sub(at0('forearm'+s)));ELBOW[s]=e;}

 // ---- the neck: a bone the rigs lack ----
 // The rigs' neck skin blends straight from the chest bone to the head bone, so a bending neck could only shear. While the
 // idle runs, a neck bone sits at the branch's base, the head joint rides at its tip, and the skin and the cloth round the
 // neck are weighted along it by height (below); dispose() removes it, rebinds the rig's own skeleton and restores the
 // rig's weights.
 const neck=new T.Bone();neck.name='idle neck';bones.spine.add(neck);neck.position.copy(NECK_BASE);root.updateMatrixWorld(true);
 const skeleton=new T.Skeleton([...base0.bones,neck],[...base0.boneInverses.map(m=>m.clone()),neck.matrixWorld.clone().invert()]);
 const savedBind=worker.parts.map(m=>[m,m.skeleton,m.bindMatrix.clone()]);for(const m of worker.parts)m.bind(skeleton,m.bindMatrix.clone());
 const boneIndex=b=>skeleton.bones.indexOf(b),bi=n=>boneIndex(n==='neck'?neck:bones[n]),boneName=i=>skeleton.bones[i].name;
 const neutral=()=>{worker.pose('neutral');neck.quaternion.identity();root.updateMatrixWorld(true);};
 const savedSkin=worker.parts.map(m=>({m,index:m.geometry.attributes.skinIndex.clone(),weight:m.geometry.attributes.skinWeight.clone()}));
 // A vertex's weights as {bone index: weight}, and back into the four slots (the largest four, renormalised).
 const weightsOf=(a,i)=>{const w={};for(let k=0;k<4;k++){const x=a.skinWeight.getComponent(i,k);if(x>0){const b=a.skinIndex.getComponent(i,k);w[b]=(w[b]||0)+x;}}return w;};
 const setWeights=(a,i,w)=>{const top=Object.entries(w).filter(([,x])=>x>1e-6).sort((p,q)=>q[1]-p[1]).slice(0,4),sum=top.reduce((s,[,x])=>s+x,0)||1;while(top.length<4)top.push([0,0]);
  a.skinIndex.setXYZW(i,...top.map(([b])=>+b));a.skinWeight.setXYZW(i,...top.map(([,x])=>x/sum));};
 // Cloth that bends at the waist. The rigs' own weights cut the torso cloth hard between the spine and the hips, so a few
 // degrees of chest on pelvis tear a belt or a jacket hem open. While the idle runs, the shirt, waistcoat or jacket, any belt
 // or pouches, and the trousers or overalls take the smooth waist blend of the game's walk and aim motions (animal-motion.js),
 // each vertex keeping its own sleeve weights. All the layers share one blend, from 8 to 24 cm above the hips, so a brace or
 // a belt moves with the cloth behind it. Trousers more than 10-18 cm in front of the hip joints are round a belly, not a
 // leg, and stay with the hips; below the knee the trousers keep the rig's own weights (the cuffs ride the hooves).
 const hipY=at0('hips').y,kneeY=at0('shin1').y,thighX=at0('thigh1').x,waistAt=y=>smooth((y-(hipY+.08))/.16);
 const sleeves=(a,i,side)=>{const w=weightsOf(a,i);return [w[bi('upperArm'+side)]||0,w[bi('forearm'+side)]||0];};
 for(const mesh of worker.parts.filter(m=>/shirt|waistcoat|jacket|belt|pouch/.test(m.name)&&!/trousers/.test(m.name))){const a=mesh.geometry.attributes,p=a.position;
  for(let i=0;i<p.count;i++){const side=p.getZ(i)<0?-1:1,[upper,lower]=sleeves(a,i,side),torso=1-upper-lower,waist=waistAt(p.getY(i));
   setWeights(a,i,{[bi('hips')]:torso*(1-waist),[bi('spine')]:torso*waist,[bi('upperArm'+side)]:upper,[bi('forearm'+side)]:lower});}
  a.skinIndex.needsUpdate=a.skinWeight.needsUpdate=true;}
 for(const mesh of worker.parts.filter(m=>/trousers|overalls/.test(m.name))){const a=mesh.geometry.attributes,p=a.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),side=p.getZ(i)<0?-1:1,center=smooth((Math.abs(p.getZ(i))-.03)/.12),leg=(1-smooth((y-(hipY-.11))/.14))*(1-(1-center)*smooth((y-(kneeY+.045))/.12))*(1-smooth((p.getX(i)-thighX-.10)/.08)),knee=1-smooth((y-(kneeY-.055))/.11),waist=waistAt(y);
   // a brace over the shoulder keeps the arm weights the rig gave it, so it shrugs with the shirt under it
   const [upper,lower]=sleeves(a,i,side),body=1-upper-lower,blend={[bi('hips')]:body*(1-leg)*(1-waist),[bi('thigh'+side)]:body*leg*(1-knee),[bi('shin'+side)]:body*leg*knee,[bi('spine')]:body*(1-leg)*waist,[bi('upperArm'+side)]:upper,[bi('forearm'+side)]:lower};
   const own=weightsOf(a,i),keep=1-smooth((y-(kneeY-.12))/.08),w={};for(const [b,x] of Object.entries(own))w[b]=(w[b]||0)+keep*x;for(const [b,x] of Object.entries(blend))w[b]=(w[b]||0)+(1-keep)*x;setWeights(a,i,w);}
  a.skinIndex.needsUpdate=a.skinWeight.needsUpdate=true;}
 // The neck weighted along its bone by height above the branch's base (u, in branch lengths), in rings: of the weight not
 // on the head, the neck bone takes neckShare(u), so the neck bends most at its base. Everything round the neck takes the
 // ring at its height, the neck skin and every layer of cloth on it (a collar, a neckerchief with its knot and ends, the
 // tops of a shirt, waistcoat, bib or braces), in full within 3 cm of the neck's median radius and easing to its own
 // weights 13 cm out: one smooth field for every part, so the layers on the neck and the shoulders move as one instead of
 // folding through each other. The neck skin keeps the head weight the rig gave it, and cloth takes none (the head's own
 // turn and nod do not drag the layers); the head itself (vertices the rig gives wholly to it) is left alone. A mane, which
 // nothing lies on, takes in full the weights of the skin it grows from, at the nearest point of the skull's surface.
 const skull=worker.parts.find(m=>/unified/.test(m.name)&&/skull/.test(m.name))??worker.parts.find(m=>/skull/.test(m.name)),hi=bi('head'),si=bi('spine'),ni=bi('neck'),B=at0('spine').add(NECK_BASE);
 const restAt=(m,i)=>{const v=V().fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,v);return v.applyMatrix4(m.matrixWorld);};
 const heightOf=v=>v.clone().sub(B).dot(NECK_AXIS)/NECK,radiusOf=v=>{const d=v.clone().sub(B);return d.addScaledVector(NECK_AXIS,-d.dot(NECK_AXIS)).length();};
 const field=v=>(1-smooth((radiusOf(v)-NECK_RADIUS-.03)/.10))*smooth((heightOf(v)+.5)/.3);
 const mix=(own,target,f)=>{const w={};for(const [b,x] of Object.entries(own))w[b]=(w[b]||0)+(1-f)*x;for(const [b,x] of Object.entries(target))w[b]=(w[b]||0)+f*x;return w;};
 let NECK_RADIUS=0;
 if(skull){const a=skull.geometry.attributes,radii=[],at=Array.from({length:a.position.count},(_,i)=>restAt(skull,i));
  for(const v of at){const u=heightOf(v);if(u>.2&&u<.8)radii.push(radiusOf(v));}radii.sort((x,y)=>x-y);NECK_RADIUS=radii[radii.length>>1]||.06;
  for(const mesh of worker.parts.filter(m=>!/forearm and hand|hoof|boot|foot|tail|mane/.test(m.name))){const b=mesh.geometry.attributes;
   for(let i=0;i<b.position.count;i++){const own=weightsOf(b,i);if((own[hi]||0)>.98)continue;const v=restAt(mesh,i),f=field(v);if(f<=0)continue;
    const h=mesh===skull?(own[hi]||0):0,n=neckShare(heightOf(v));setWeights(b,i,mix(own,{[hi]:h,[ni]:(1-h)*n,[si]:(1-h)*(1-n)},f));}
   b.skinIndex.needsUpdate=b.skinWeight.needsUpdate=true;}
  // the mane: the skull's triangles in 4 cm cells, searched in growing shells for the nearest point of its surface, whose
  // weights (the corners' as weighted above, in proportion) the mane takes
  const mane=worker.parts.filter(m=>/mane/.test(m.name));
  if(mane.length){const ix=skull.geometry.index?.array,corner=(t,k)=>ix?ix[3*t+k]:3*t+k,faces=(ix?ix.length:a.position.count)/3,P=at.map(v=>v.toArray()),SIDE=.04,cells=new Map(),cellKey=(x,y,z)=>x+','+y+','+z;
   for(let t=0;t<faces;t++){const c=[0,1,2].map(k=>P[corner(t,k)]),lo=[0,1,2].map(k=>Math.floor(Math.min(c[0][k],c[1][k],c[2][k])/SIDE)),up=[0,1,2].map(k=>Math.floor(Math.max(c[0][k],c[1][k],c[2][k])/SIDE));
    for(let x=lo[0];x<=up[0];x++)for(let y=lo[1];y<=up[1];y++)for(let z=lo[2];z<=up[2];z++){const k=cellKey(x,y,z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(t);}}
   const skinAt=v=>{const p=v.toArray(),c=p.map(x=>Math.floor(x/SIDE)),seen=new Set();let best=null,near=null;
    for(let r=0;r<=8&&!(best&&Math.sqrt(best.d2)<=(r-1)*SIDE);r++)for(let x=-r;x<=r;x++)for(let y=-r;y<=r;y++)for(let z=-r;z<=r;z++){if(Math.max(Math.abs(x),Math.abs(y),Math.abs(z))<r)continue;
     for(const t of cells.get(cellKey(c[0]+x,c[1]+y,c[2]+z))||[]){if(seen.has(t))continue;seen.add(t);const k=[0,1,2].map(j=>corner(t,j)),q=closest(p,P[k[0]],P[k[1]],P[k[2]]);if(!best||q.d2<best.d2){best=q;near=k;}}}
    const w={};if(best)near.forEach((i,j)=>{for(const [b,x] of Object.entries(weightsOf(a,i)))w[b]=(w[b]||0)+best.b[j]*x;});return best?w:null;};
   for(const mesh of mane){const b=mesh.geometry.attributes;for(let i=0;i<b.position.count;i++){const w=skinAt(restAt(mesh,i));if(w)setWeights(b,i,w);}b.skinIndex.needsUpdate=b.skinWeight.needsUpdate=true;}}}
 const restoreSkin=()=>{for(const {m,index,weight} of savedSkin){m.geometry.attributes.skinIndex.copy(index);m.geometry.attributes.skinWeight.copy(weight);m.geometry.attributes.skinIndex.needsUpdate=m.geometry.attributes.skinWeight.needsUpdate=true;}
  for(const [m,sk,bm] of savedBind)m.bind(sk,bm);neck.removeFromParent();skeleton.dispose();};

 let built=false;try{
 let time=0,state,disposed=false;
 const live=t=>{if(disposed)throw Error('Idle motion was disposed');if(!Number.isFinite(t))throw Error('Idle time must be finite');return wrap(t);};
 function rotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));root.updateMatrixWorld(true);}
 const basis=(d,n)=>{const x=d.clone().normalize(),z=n.clone().addScaledVector(x,-n.dot(x)).normalize();return new T.Matrix4().makeBasis(x,z.clone().cross(x),z);};
 const align=(d0,n0,d1,n1)=>Q().setFromRotationMatrix(basis(d1,n1).multiply(basis(d0,n0).transpose()));
 // Two-bone limb with twist: the bend plane maps onto the rest bend plane, so a thigh or forearm turns with its hip or
 // shoulder instead of keeping its rest twist.
 function limb(a,b,c,target,pole){const ra=rest.get(a),rb=rest.get(b),rc=rest.get(c),start=a.getWorldPosition(V()),l1=ra.distanceTo(rb),l2=rb.distanceTo(rc),d=target.distanceTo(start);
  if(d>l1+l2+1e-6||d<Math.abs(l1-l2)+1e-7)throw Error('Idle pose unreachable: '+a.name+' at '+time.toFixed(3)+' ('+d.toFixed(4)+' / '+(l1+l2).toFixed(4)+')');
  const mid=bend(start,target,l1,l2,pole),d0a=rb.clone().sub(ra),d0b=rc.clone().sub(rb),n0=d0a.clone().cross(d0b).normalize(),d1a=mid.clone().sub(start),d1b=target.clone().sub(mid);let n1=d1a.clone().cross(d1b);if(n1.lengthSq()<1e-12)n1=target.clone().sub(start).cross(pole);n1.normalize();
  rotate(a,align(d0a,n0,d1a,n1));rotate(b,align(d0b,n0,d1b,n1));return mid;}
 const bendDir=f=>{const d=f.clone().addScaledVector(NECK_AXIS,-f.dot(NECK_AXIS));if(d.lengthSq()<1e-9)d.set(1,0,0);return d.normalize();};
 // The neck bends like a heavy branch toward where the face points, square to the neck's own axis: the neck bone turns by
 // the chord of the bent branch, so its tip (the head joint) lands on the branch's tip; the head, on top, takes the rest of
 // its nod and all of its turn and tilt.
 const headPose=q=>{const f=V([1,0,0]).applyQuaternion(q),pitch=Math.asin(clamp(f.y,-1,1)),th=bendOf(pitch),d=bendDir(f),chord=Math.atan2(along(th),1-drop(th));
  const qn=Q().setFromAxisAngle(NECK_AXIS.clone().cross(d).normalize(),chord);return {neck:qn,offset:NECK_BASE.clone().add(NECK_AXIS.clone().multiplyScalar(NECK).applyQuaternion(qn))};};
 const placeHead=(q,p=headPose(q))=>{neck.quaternion.copy(p.neck);bones.head.position.copy(p.offset);bones.head.quaternion.copy(q);root.updateMatrixWorld(true);};
 const hangAt=(s,yaw)=>{const q=turn([0,1,0],yaw),sh=bones['upperArm'+s].getWorldPosition(V());limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],sh.add(HANG[s].clone().applyQuaternion(q)),BEND[s].arm.clone().applyQuaternion(q));};

 // ---- fitted to this rig: how far the head can turn, nod and look up, the chest twist, and the arms' swing ----
 // Two tests, on every part of the rig as skinned. Crossings: a pose fails when two triangles cross that the rest pose does
 // not have crossing, skin through cloth, cloth through cloth or a part through itself (triangles that share a corner aside;
 // two held rigidly by one bone cannot cross anew and are not tested). The rest pose already has crossings (neck skin under
 // a collar, an arm a coat sits over), and moving slides them along: a crossing within two triangles, on both sides, of one
 // in the rest pose is that crossing slid along, and one that goes 3 mm deep or less is a graze: a pixel at the study's
 // close-up scale (280-400 px a metre as the window allows; the game draws at 130). A crossing goes as deep as the
 // shallower of the two triangles pokes through the other's plane, so two that meet nearly flat (a coarse band on the
 // skin it wraps) read the sliver they cross in, not their size. Depth: the skin of the head, the forearms and the hands
 // is measured inside the cloth (every garment is a closed solid: a vertex's depth is its distance, up to 6 cm, from the
 // nearest point of the garment it lies deepest in), and a pose fails where skin that shows in the rest pose (outside
 // every garment) goes more than 3 mm into one: a slid crossing may not sink in. Skin already inside the cloth at rest is
 // hidden there, however deep it goes; any sinking shows where the skin beside it, which showed, goes under.
 const fits=(!refit&&(FITS.get(key)??IDLE_FITS[key]))||(()=>{
  const tri=[],skins=new Map(worker.parts.map(m=>[m,skinner(m)])),keyOf=(m,i)=>m.uuid+':'+[0,1,2].map(k=>Math.round(m.geometry.attributes.position.getComponent(i,k)*1e4)).join(',');
  const COVER=/shirt|overalls|trousers|waistcoat|jacket|neckerchief|collar|belt|pouch|mane|cap/;
  for(const mesh of worker.parts){const g=mesh.geometry,a=g.attributes,ix=g.index?g.index.array:null,n=ix?ix.length:a.position.count,cover=COVER.test(mesh.name);
   for(let t=0;t<n;t+=3){const v=ix?[ix[t],ix[t+1],ix[t+2]]:[t,t+1,t+2],w=v.map(i=>weightsOf(a,i)),names=new Set(w.flatMap(x=>Object.keys(x).map(b=>boneName(+b))));
    const solo=w.every(x=>Object.keys(x).length===1)&&new Set(w.map(x=>Object.keys(x)[0])).size===1?+Object.keys(w[0])[0]:-1;
    tri.push({mesh,v,names,solo,cover,keys:v.map(i=>keyOf(mesh,i))});}}
  const byCorner=new Map();tri.forEach((t,n)=>{for(const k of t.keys){if(!byCorner.has(k))byCorner.set(k,[]);byCorner.get(k).push(n);}});
  const one=n=>new Set(tri[n].keys.flatMap(k=>byCorner.get(k))),memo=new Map(),ring=n=>{let r=memo.get(n);if(!r){r=new Set();for(const m of one(n))for(const x of one(m))r.add(x);memo.set(n,r);}return r;};
  const touching=(a,b)=>a.mesh===b.mesh&&a.keys.some(k=>b.keys.includes(k));
  // Each garment is a closed solid, but a few of its triangles are wound the wrong way round (where a brace, a pocket or a
  // cuff is welded on). For the measure each cloth mesh is wound again, triangle by triangle across its edges from one
  // triangle, and the whole turned outward where that walk left it inside out (its signed volume negative).
  const edgeKey=(x,y)=>x<y?x+'|'+y:y+'|'+x,byEdge=new Map(),sense=new Int8Array(tri.length);
  tri.forEach((t,n)=>{if(!t.cover)return;for(let e=0;e<3;e++){const x=t.keys[e],y=t.keys[(e+1)%3];if(x===y)continue;const k=edgeKey(x,y);if(!byEdge.has(k))byEdge.set(k,[]);byEdge.get(k).push(n);}});
  const restCorners=n=>{const t=tri[n],P=t.mesh.geometry.attributes.position;return t.v.map(i=>[P.getX(i),P.getY(i),P.getZ(i)]);};
  for(let first=0;first<tri.length;first++){if(!tri[first].cover||sense[first])continue;const part=[first];sense[first]=1;
   for(let q=0;q<part.length;q++){const i=part[q],t=tri[i];for(let e=0;e<3;e++){const x=t.keys[e],y=t.keys[(e+1)%3];if(x===y)continue;const l=byEdge.get(edgeKey(x,y));if(l.length!==2)continue;const o=l[0]===i?l[1]:l[0];if(sense[o])continue;
     // two triangles face the same side when they run their shared edge in opposite directions
     const j=tri[o].keys.indexOf(x);sense[o]=tri[o].keys[(j+1)%3]===y?-sense[i]:sense[i];part.push(o);}}
   let volume=0;for(const i of part){const [A,B,C]=restCorners(i);volume+=sense[i]*(A[0]*(B[1]*C[2]-B[2]*C[1])-A[1]*(B[0]*C[2]-B[2]*C[0])+A[2]*(B[0]*C[1]-B[1]*C[0]));}if(volume<0)for(const i of part)sense[i]=-sense[i];}
  // the skin measured for depth: every vertex of a forearm and hand, and of the skull those the rig gives mostly to the head
  const orig=new Map(savedSkin.map(x=>[x.m,x])),origHead=(m,i)=>{const {index,weight}=orig.get(m);let h=0;for(let k=0;k<4;k++)if(base0.bones[index.getComponent(i,k)]===bones.head)h+=weight.getComponent(i,k);return h;};
  const skinV=[];for(const mesh of worker.parts){const a=mesh.geometry.attributes,head=mesh===skull;if(!head&&!/forearm and hand/.test(mesh.name))continue;
   for(let i=0;i<a.position.count;i++){if(head&&origHead(mesh,i)<=.5)continue;skinV.push({mesh,i,names:new Set(Object.keys(weightsOf(a,i)).map(b=>boneName(+b)))});}}
  const corners=n=>{const t=tri[n],P=skins.get(t.mesh).out;return t.v.map(i=>[P[3*i],P[3*i+1],P[3*i+2]]);};
  const CELL=.04,range=(c,pad,f)=>{const lo=[0,1,2].map(k=>Math.floor((Math.min(...c.map(p=>p[k]))-pad)/CELL)),hi=[0,1,2].map(k=>Math.floor((Math.max(...c.map(p=>p[k]))+pad)/CELL));for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)f(x+','+y+','+z);};
  const put=(grid,k,n)=>{let g=grid.get(k);if(!g)grid.set(k,g=[]);g.push(n);};
  const nearest=(p,c)=>closest(p,c[0],c[1],c[2]);
  // A cloth triangle's outward unit normal, as wound for the measure.
  const outward=(n,c)=>{const ab=[c[1][0]-c[0][0],c[1][1]-c[0][1],c[1][2]-c[0][2]],ac=[c[2][0]-c[0][0],c[2][1]-c[0][1],c[2][2]-c[0][2]],m=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],l=(Math.hypot(...m)||1)*sense[n];return m.map(x=>x/l);};
  // How deep point p sits in the cloth: for each garment within reach, p lies inside it where it lies behind that garment's
  // nearest point, as told by the angle-weighted pseudo-normal there (the face's normal inside a face, the sum of the two
  // faces' at an edge, the faces' round a corner weighted by their angles there: Baerentzen and Aanaes, exact for a closed
  // surface), as deep as it is far from that point; its depth is the deepest it lies in any one garment, or 0.
  const sunk=(p,list,cornersOf,reach)=>{const near=new Map();for(const b of list){const r=nearest(p,cornersOf(b));if(r.d2>=reach*reach)continue;const m=tri[b].mesh,o=near.get(m);if(!o||r.d2<o.best.d2)near.set(m,{best:r,bn:b});}
   let deep=0;for(const {best,bn} of near.values()){
   const t=tri[bn],N=[0,0,0],add=(n,w=1)=>{const u=outward(n,cornersOf(n));for(let x=0;x<3;x++)N[x]+=w*u[x];};
   if(best.feat<0)add(bn);else if(best.feat<3)for(const m of byEdge.get(edgeKey(t.keys[best.feat],t.keys[(best.feat+1)%3])))add(m);
   else{const key=t.keys[best.feat-3];for(const m of byCorner.get(key)){const c=cornersOf(m),i=tri[m].keys.indexOf(key),o=c[i],u=c[(i+1)%3].map((x,k)=>x-o[k]),v=c[(i+2)%3].map((x,k)=>x-o[k]);
     add(m,Math.acos(clamp((u[0]*v[0]+u[1]*v[1]+u[2]*v[2])/((Math.hypot(...u)*Math.hypot(...v))||1),-1,1)));}}
   if(best.e[0]*N[0]+best.e[1]*N[1]+best.e[2]*N[2]<0)deep=Math.max(deep,Math.sqrt(best.d2));}
   return deep;};
  // How far a crossing goes: the shallower of the two triangles' pokes through the other's plane, each the less of its
  // reaches either side of that plane (their overlap along each one's normal). Two triangles meeting nearly flat, a coarse
  // band on the skin it wraps, cross in a sliver and read the sliver's depth, not their size.
  const overlap=(A,B)=>{const reach=(P,Q)=>{const o=Q[0],e1=[Q[1][0]-o[0],Q[1][1]-o[1],Q[1][2]-o[2]],e2=[Q[2][0]-o[0],Q[2][1]-o[1],Q[2][2]-o[2]],n=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]],l=Math.hypot(...n)||1;
    let hi=0,lo=0;for(const p of P){const d=((p[0]-o[0])*n[0]+(p[1]-o[1])*n[1]+(p[2]-o[2])*n[2])/l;hi=Math.max(hi,d);lo=Math.min(lo,d);}return Math.min(hi,-lo);};return Math.min(reach(A,B),reach(B,A));};
  const pairOf=(A,B)=>{for(const [i,j] of [[0,1],[1,2],[2,0]])if(meets(A[i],A[j],B[0],B[1],B[2])||meets(B[i],B[j],A[0],A[1],A[2]))return overlap(A,B);return -1;};
  // The crossings in the current pose that involve a moving triangle ('low:high' triangle numbers with their edge depth),
  // and how deep each moving skin vertex sits behind cloth.
  // (A probe passes stop, and the skin is measured first: the first vertex or pair stop names as failing ends the
  // measure, null for the probe's answer.)
  const contact=({movers,still,skin},reach=.06,stop=null)=>{root.updateMatrixWorld(true);for(const s of skins.values())s.update();const grid=new Map(),cover=new Map(),C=new Map(movers.map(n=>[n,corners(n)])),pairs=new Map(),depth=new Map(),cornersOf=b=>C.get(b)??still.at.get(b);
   for(const [n,c] of C)if(tri[n].cover)range(c,reach,k=>put(cover,k,n));
   for(const j of skin){const {mesh,i}=skinV[j],P=skins.get(mesh).out,p=[P[3*i],P[3*i+1],P[3*i+2]],k=Math.floor(p[0]/CELL)+','+Math.floor(p[1]/CELL)+','+Math.floor(p[2]/CELL),near=new Set();
    for(const list of [cover.get(k),still.cover.get(k)])for(const b of list||[])near.add(b);const d=sunk(p,near,cornersOf,reach);depth.set(j,d);if(stop?.depth(j,d))return null;}
   for(const [n,c] of C)range(c,0,k=>put(grid,k,n));
   let failed=false;
   for(const [a,A] of C){const seen=new Set(),ta=tri[a];range(A,0,k=>{if(failed)return;for(const list of [grid.get(k),still.grid.get(k)])for(const b of list||[]){if(failed||b===a||seen.has(b)||(C.has(b)&&b<a))continue;seen.add(b);const tb=tri[b];if(ta.solo>=0&&ta.solo===tb.solo)continue;if(touching(ta,tb))continue;
     const d=pairOf(A,C.get(b)??still.at.get(b));if(d>=0){const key=a<b?a+':'+b:b+':'+a;pairs.set(key,d);if(stop?.pair(key,d))failed=true;}}});if(failed)return null;}
   return {pairs,depth};};
  // The triangles and skin a probe's bones move; the rest are skinned once, in the rest pose, and sit in a fixed grid (and
  // the cloth among them also in the cells 6 cm round it, so that skin under it finds it).
  const probe=moves=>{neutral();for(const s of skins.values())s.update();const movers=[],grid=new Map(),cover=new Map(),at=new Map(),skin=[];
   tri.forEach((t,n)=>{if([...t.names].some(moves))movers.push(n);else{const c=corners(n);at.set(n,c);range(c,0,k=>put(grid,k,n));if(t.cover)range(c,.06,k=>put(cover,k,n));}});
   skinV.forEach((v,j)=>{if([...v.names].some(moves))skin.push(j);});return {movers,still:{grid,cover,at},skin};};
  // the rest pose is measured to 10 cm, so skin a little deeper than a pose's 6 cm reach is known deep and not taken as new
  const everything=probe(()=>true),rest=contact(everything,.10);
  const freshPair=(k,d,hand=0)=>{if(d<=.003-hand||rest.pairs.has(k))return false;const [a,b]=k.split(':').map(Number);for(const x of ring(a))for(const y of ring(b))if(rest.pairs.has(x<y?x+':'+y:y+':'+x))return false;return true;};
  // (a probe of the arms keeps a millimetre in hand, for what it does not combine: the hips turning, the arm lagging, the
  // chest opening on a breath)
  const clear=(family,hand=0)=>contact(family,.06,{depth:(j,d)=>d>.003-hand&&rest.depth.get(j)<.0005,pair:(k,d)=>freshPair(k,d,hand)})!==null;
  // The largest angle, in 5 degree steps, at which a pose makes no new crossing, less 5 degrees kept in hand for the idle's
  // other motions (a lean, a breath or a tilt the probe does not make); the probe runs 5 degrees past its top for that.
  const fit=(moves,pose,top)=>{const family=probe(moves);let ok=0;for(let deg=5;deg<=top+5;deg+=5){neutral();pose(deg*DEG);if(!clear(family))break;ok=deg;}neutral();return Math.min(top,Math.max(0,ok-5));};
  const headBones=b=>b==='head'||b==='idle neck',moveHead=(yaw,nod,roll)=>placeHead(turn([0,1,0],yaw).multiply(turn([0,0,1],-nod)).multiply(turn([1,0,0],roll)));
  // The head tilting each way, up to the 5 degrees a side look tilts it (the look plan tilts no further than this); turning
  // on the chest each way, level or tilted that far either way, up to the 40 degrees the neck seam allows; then nodding
  // (the neck bent as in at()), straight, turned as far as 24 degrees either way, or tilted either way; and looking up the
  // same ways (the back of the skull drops toward the back of a collar).
  const tilt=Math.min(...[1,-1].map(s=>fit(headBones,a=>moveHead(0,0,s*a),5))),rolls=tilt?[0,tilt,-tilt]:[0];
  const yaw=Object.fromEntries([1,-1].map(s=>[s,Math.min(...rolls.map(roll=>fit(headBones,a=>moveHead(s*a,0,roll*DEG),IDLE.neck)))]));
  const ways=[[0,0],[Math.min(24,yaw[1]),0],[-Math.min(24,yaw[-1]),0],...rolls.slice(1).map(roll=>[0,roll])];
  const nod=Math.min(...ways.map(([y,roll])=>fit(headBones,a=>moveHead(y*DEG,a,roll*DEG),45))),up=Math.min(...ways.map(([y,roll])=>fit(headBones,a=>moveHead(y*DEG,-a,roll*DEG),10)));
  // The chest twisting on the hips each way, the arms hanging as in at(): a pot belly or a thick coat twists less, and the
  // hips and head take the rest of a wide look.
  const twist=Object.fromEntries([1,-1].map(dir=>[dir,fit(b=>b!=='hips'&&!/^(thigh|shin|hoof)/.test(b),a=>{bones.spine.quaternion.copy(turn([0,1,0],dir*a));root.updateMatrixWorld(true);for(const s of [-1,1])hangAt(s,dir*a*.5);},30)]));
  // The arms against the clothes. A probe poses the trunk (leaning w of a full lean toward a hoof, the hips carried about
  // 7 cm over and hiked at a full lean, as the balance will carry them; the chest rounded flex degrees), the shoulders
  // risen by shrug with the chest opened as a breath that deep opens it, each arm swung out by out[s] and eased to each
  // extreme its easing reaches over a loop, scaled by k (see drift: the elbow 3.5 degrees past its rest bend, or half a
  // degree short of it; the wrist 9 degrees and the fingers 8, one way and then the other). It clears where none of those
  // covers skin that shows at rest or crosses anything new, a millimetre in hand.
  const EXTREMES=[[3.5,9,.14],[3.5,-9,-.14],[-.5,0,0]],SIGH=BREATH.shrug*2.8,BREATHE=BREATH.shrug*1.15,none={[-1]:0,[1]:0};
  const posture=(w,flex,out,k,shrug,[elbow,wrist,curl])=>{neutral();bones.hips.position.copy(restHips).add(V([0,-POSTURE.sink*w*w,.072*w]));bones.hips.quaternion.copy(trunkQ(0,0,POSTURE.roll*DEG*w));
   bones.spine.quaternion.copy(trunkQ(0,(flex-BREATH.chest*shrug/BREATH.shrug)*DEG,-POSTURE.lean*DEG*w));for(const s of [-1,1])bones['upperArm'+s].position.copy(ARM_ROOT[s]).add(V([0,shrug,0]));root.updateMatrixWorld(true);
   for(const s of [-1,1]){const q=turn([1,0,0],-s*out[s]*DEG),sh=bones['upperArm'+s].getWorldPosition(V());limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],sh.add(HANG[s].clone().multiplyScalar(reachAt(s,elbow*k)).applyQuaternion(q)),BEND[s].arm.clone().applyQuaternion(q));
    bones['hand'+s].quaternion.multiply(turn([0,0,1],wrist*k*DEG));bones['fingers'+s].rotation.z=-.08+curl*k;}root.updateMatrixWorld(true);};
  const clears=(w,flex,out,k,shrug)=>{const ok=EXTREMES.every(x=>{posture(w,flex,out,k,shrug,x);return clear(everything,.001);});neutral();return ok;};
  const least=test=>{if(test(0))return 0;for(let a=.5;a<=4;a+=.5)if(test(a))return a+1;return 5;};
  // In that order, each the most (in quarters) that clears with those before it: weightShift, the share of a full lean
  // toward each hoof, the arms held still (the hip juts toward the hand on that side, and an arm that crosses the clothes
  // swings out as little as clears them, in half degrees, and a degree more for the arm's heading lagging the trunk, which
  // the probe does not do); ease, the share of the arms' easing, standing square and leaning that far; shrug, the share of
  // the shoulders' rise, a sigh standing and an ordinary breath leaning; and rounding, how far (in steps of 2.5 degrees,
  // up to its full 10) the chest rounds, standing and leaning (a look down while leaning). A rig whose clothes hold its
  // arms at rest (a forearm in a waistband) keeps its weight shift before its arms' ease.
  const leanAt=(share,k,shrug)=>Object.fromEntries([-1,1].map(s=>[s,least(a=>clears(share*s,0,{[s]:a,[-s]:0},k,shrug))]));
  let weightShift=0,lean={[-1]:0,[1]:0};
  for(const share of [1,.75,.5,.25]){const fit=leanAt(share,0,0);if(fit[-1]<5&&fit[1]<5){weightShift=share;lean=fit;break;}}
  const holds=(k,stand,leaning)=>clears(0,0,none,k,stand)&&(!weightShift||[-1,1].every(s=>clears(s*weightShift,0,{[s]:lean[s],[-s]:0},k,leaning)));
  const ease=[1,.75,.5,.25].find(k=>holds(k,0,0))??0,shrug=[1,.5,.25].find(x=>holds(ease,SIGH*x,BREATHE*x))??0;
  let rounding=0,round=0;
  for(const flex of [10,7.5,5,2.5]){const a=least(x=>[0,-1,1].every(w=>clears(w*weightShift,flex,{[-1]:x+(w<0?lean[-1]:0),[1]:x+(w>0?lean[1]:0)},ease,BREATHE*shrug)));if(a<5){rounding=flex;round=a;break;}}
  const swing={lean,round};
  neutral();
  const out={nod,up,yaw,tilt,twist,swing,ease,shrug,weightShift,rounding};FITS.set(key,out);return out;})();
 const nodLimit=fits.nod,upLimit=fits.up,tiltLimit=fits.tilt,twistLimit=fits.twist,yawLimit=fits.yaw,swing=fits.swing,EASE=fits.ease,SHRUG=fits.shrug,SHIFTED=fits.weightShift,ROUND=fits.rounding;
 // The trunk turns only for looks too wide for the neck: the head keeps up to about 34 degrees of a turn (or what this rig
 // allows), and the trunk takes the rest, half in the chest (up to 12 degrees, or what this rig allows) and the remainder in
 // the hips, up to about 10 degrees on planted hooves, turning at the hip joints. Looking down rounds the chest forward a
 // little, and as much more as the face cannot nod, up to 10 degrees; it rounds with the head rather than after it, so the
 // muzzle never reaches the chest on the way down.
 const headShare=y=>{const H=Math.min(34,yawLimit[y<0?-1:1]);return H>0?H*Math.tanh(y/H):0;},trunkYaw=y=>y-headShare(y),chestPitch=p=>Math.min(ROUND,Math.max(.30*Math.max(0,-12-p),-p-nodLimit));
 const chestTwist=y=>{const c=.5*trunkYaw(y),top=Math.min(12,twistLimit[c<0?-1:1]);return top>0?top*Math.tanh(c/top):0;},hipsTwist=y=>{const h=trunkYaw(y)-chestTwist(y);return 10*Math.tanh(h/10);};
 // What this rig can look at: the head no more than 35 degrees (or its fitted turn, and half a degree for the hips' eased
 // turn) from the chest either way, down by its fitted nod and the chest's 10 degrees, and up by its fitted look up.
 const neckTop=s=>Math.min(35,yawLimit[s]),reachYaw=s=>{let lo=0,hi=90;for(let i=0;i<30;i++){const m=(lo+hi)/2;if(m-chestTwist(s*m)*s-hipsTwist(s*m)*s<=neckTop(s)+.5)lo=m;else hi=m;}return lo;};
 const reach={left:reachYaw(1),right:reachYaw(-1),down:nodLimit+ROUND,up:upLimit,tilt:tiltLimit};
 const r=random(seed),looks=lookPlan(r,L,reach),stances=SHIFTED?stancePlan(r,L):[],breaths=breathPlan(r,L);
 const ch=(key,fn,part)=>steps(fn(looks.home[key]),looks.list.map(l=>{const [cd,cs,hd,hs]=TIMINGS[l.trunk||0],[d,k]=part==='chest'?[cd,cs]:part==='hips'?[hd,hs]:[0,1];return [l.time+d,l.dur*k,fn(l[key])];}));
 let gazeYaw,gazePitch,gazeRoll,chestYaw,hipsYaw,chestFlex;
 const build=()=>{gazeYaw=ch('yaw',y=>y);gazePitch=ch('pitch',p=>p);gazeRoll=ch('roll',x=>x);chestYaw=ch('yaw',chestTwist,'chest');hipsYaw=ch('yaw',hipsTwist,'hips');chestFlex=ch('pitch',chestPitch);};
 for(const l of looks.list)for(l.trunk=0;;l.trunk++){build();const [,,hd,hs]=TIMINGS[l.trunk];let peak=0;for(let t=l.time;t<=l.time+hd+hs*l.dur;t+=.01)peak=Math.max(peak,Math.abs(gazeYaw(t)-chestYaw(t)-hipsYaw(t)));if(peak<=Math.min(36,neckTop(1)+1,neckTop(-1)+1)||l.trunk===TIMINGS.length-1)break;}
 build();
 const leaning=steps(0,stances.map(s=>[s.time,s.dur,s.side])),weight=t=>SHIFTED*leaning(t);
 const breath=t=>{const b=breaths.find(b=>t<b.time+b.dur)||breaths.at(-1),u=(t-b.time)/b.dur;return b.amp*(u<b.inhale?smooth(u/b.inhale):1-smooth((u-b.inhale)/(1-b.inhale)));};
 // The head never rests perfectly still, the pressure point under the hooves wanders a few millimetres, and the elbows
 // and wrists ease a little.
 const drift={yaw:wave(r,L,4,22,.45),pitch:wave(r,L,4,22,.30),x:wave(r,L,3,14,.0035),z:wave(r,L,3,14,.0022),curl:wave(r,L,2,9,.04),elbow:[wave(r,L,2,8,.6),wave(r,L,2,8,.6)],wrist:[wave(r,L,2,9,2.5*DEG),wave(r,L,2,9,2.5*DEG)]};
 // Where the pressure point rests: under the centre of mass of the rest pose, unless that is within 4 cm of an edge of
 // the soles (a digitigrade foot, a heel-heavy stance), in which case it moves in toward the middle of the soles until it
 // is 4 cm clear, or as far in as the soles allow (a foot too short to be 4 cm clear anywhere: the dog's). Leaning toward
 // one hoof moves it up to 4.5 cm that way, less on a narrow stance, so that it stays 4.5 cm inside the soles (4 cm, and
 // the few millimetres it wanders); on the horse's stance the nearer hoof then carries 55-65% of the weight. The hips
 // follow it toward that hoof and hike (the pelvis rolls 4.5 degrees, that hip up) so the nearer leg does not buckle; the
 // other leg, its hoof planted wide, reaches out as a prop.
 // The soles are the vertices of each hoof, boot or foot within 3 mm of the floor (a boot heel can sit a millimetre or two
 // up in the mesh); the toe and heel are their front and back.
 const FLOOR=Object.fromEntries([-1,1].map(s=>{const f=worker.parts.find(p=>/hoof|boot|foot/.test(p.name)&&p.name.endsWith(' '+s));if(!f)throw Error('Idle needs a hoof, boot or foot on each side');
  const a=f.geometry.attributes.position,out=[];for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);f.applyBoneTransform(i,p);p.applyMatrix4(f.matrixWorld);if(p.y<.003)out.push(p);}if(out.length<3)throw Error('Idle needs a sole on the floor: '+f.name);return [s,out];}));
 const soles=hull2([...FLOOR[-1],...FLOOR[1]].map(p=>[p.x,p.z])),TOE={},HEEL={};
 for(const s of [-1,1]){const z=FLOOR[s].reduce((a,p)=>a+p.z,0)/FLOOR[s].length;TOE[s]=V([Math.max(...FLOOR[s].map(p=>p.x)),0,z]);HEEL[s]=V([Math.min(...FLOOR[s].map(p=>p.x)),0,z]);}
 const soleMid=(()=>{let a=0,x=0,z=0;for(let i=0;i<soles.length;i++){const [x0,z0]=soles[i],[x1,z1]=soles[(i+1)%soles.length],c=x0*z1-x1*z0;a+=c;x+=(x0+x1)*c;z+=(z0+z1)*c;}return [x/(3*a),z/(3*a)];})();
 const centre=P=>{const c=V();for(const [a,b,m] of SEGMENTS)c.addScaledVector(P[a],m/2).addScaledVector(P[b],m/2);return c.divideScalar(MASS);};
 let SHIFT=.045,base=[0,0],clearance=0;
 const copAt=t=>[base[0]+drift.x(t),base[1]+SHIFT*weight(t)+drift.z(t)];
 const wrap=t=>((t%L)+L)%L;

 // ---- pure kinematics for a given horizontal pelvis path xz(t); nothing is integrated ----
 function kinematics(xz,lag){
  const memo=new Map();
  function trunk(t){let k=memo.get(t);if(k)return k;const w=weight(t),qp=trunkQ(hipsYaw(t)*DEG,0,POSTURE.roll*DEG*w),local=trunkQ(chestYaw(t)*DEG,(chestFlex(t)-BREATH.chest*breath(t))*DEG,-POSTURE.lean*DEG*w),[dx,dz]=xz(t);
   const hips=restHips.clone().add(V([dx,-POSTURE.sink*w*w,dz]));k={hips,qp,local,qc:qp.clone().multiply(local),chest:hips.clone().add(spineOffset.clone().applyQuaternion(qp)),shrug:BREATH.shrug*SHRUG*breath(t)};if(memo.size>256)memo.clear();memo.set(t,k);return k;}
  // The head aims in world space; its turn from the chest is capped smoothly at the 40 degrees the neck seam allows, and
  // its nod at the limit fitted to this rig. The neck bends like a heavy branch toward where the face points (headPose)
  // and carries the head out over the chest rather than tipping the jaw into it.
  function head(t,tr){const want=turn([0,1,0],(gazeYaw(t)+drift.yaw(t))*DEG).multiply(turn([0,0,1],(gazePitch(t)+drift.pitch(t))*DEG)).multiply(turn([1,0,0],gazeRoll(t)*DEG));
   let q=tr.qc.clone().invert().multiply(want);const e=new T.Euler().setFromQuaternion(q,'YZX'),low=-nodLimit*DEG,ease=6*DEG;
   if(e.z<low+ease){e.z=low+ease-ease*Math.tanh((low+ease-e.z)/ease);q=Q().setFromEuler(e);}
   const v=logq(q),a=v.length(),k=30*DEG,top=IDLE.neck*DEG;if(a>k)q=expq(v.multiplyScalar((k+(top-k)*Math.tanh((a-k)/(top-k)))/a));
   const p=headPose(q);return {q,offset:p.offset,neck:p.neck};}
  // The arms hang from the shoulders, which rise as the chest breathes in, along a heading a beat behind the trunk's. An
  // arm swings out only as far as this rig needs to clear its clothes: as its hip juts toward it in a lean, or as the chest
  // rounds. The elbows bend and straighten a few degrees over the loop, and the hands hang on from the forearms, the
  // wrists easing.
  function arm(t,tr,s){const sh=tr.chest.clone().add(SHOULDER[s].clone().add(V([0,tr.shrug,0])).applyQuaternion(tr.qc)),q=turn([0,1,0],lag(t)*DEG),out=turn([1,0,0],-s*(swing.lean[s]*ramp(s*weight(t))/ramp(1)+(ROUND?swing.round*chestFlex(t)/ROUND:0))*DEG);
   return {sh,wrist:sh.clone().add(HANG[s].clone().multiplyScalar(reachAt(s,EASE*(1.5+drift.elbow[s>0?1:0](t)))).applyQuaternion(out).applyQuaternion(q)),pole:BEND[s].arm.clone().applyQuaternion(out).applyQuaternion(q),q};}
  const kneePole=(t,s)=>BEND[s].leg.clone().applyQuaternion(turn([0,1,0],.15*hipsYaw(t)*DEG));
  // Segment end points for balance (the same two-bone solutions the bones receive in at()).
  function body(t){const tr=trunk(t),h=head(t,tr),P={pelvis:tr.hips,chest:tr.chest},neckTip=tr.chest.clone().add(h.offset.clone().applyQuaternion(tr.qc));P.neck=neckTip;P.headTip=V([.14,.32,0]).applyQuaternion(tr.qc.clone().multiply(h.q)).add(neckTip);
   for(const s of [-1,1]){const hip=tr.hips.clone().add(THIGH[s].clone().applyQuaternion(tr.qp)),a=arm(t,tr,s);P['hip'+s]=hip;P['ankle'+s]=ANKLE[s];P['knee'+s]=bend(hip,ANKLE[s],...LENGTH[s].leg,kneePole(t,s));
    P['toe'+s]=TOE[s];P['heel'+s]=HEEL[s];P['shoulder'+s]=a.sh;P['wrist'+s]=a.wrist;P['elbow'+s]=bend(a.sh,a.wrist,...LENGTH[s].arm,a.pole);P['palm'+s]=palm.clone().applyQuaternion(a.q).add(a.wrist);}
   return P;}
  return {xz,trunk,head,arm,kneePole,body};
 }
 // ---- balance: the centre of mass rides a linear inverted pendulum over the centre-of-pressure plan ----
 // x'' = w2 (x - p), w2 = Fy / (M y), with p the planned pressure point shifted by what the arms' and trunk's angular
 // momentum needs (dL/dt about the centre of mass moves the required pressure point by dL/Fy). Solved round the loop on a
 // grid that divides the loop exactly, so there is no start or end to hold; the pelvis is then shifted until the real
 // segment centre of mass follows.
 // Angular momentum about the centre of mass from the body at grid points either side (central differences round the
 // loop): an idle moves slowly enough for a 20 ms grid.
 function momentum(A,B,C,c,h){const vc=centre(C).sub(centre(A)).divideScalar(2*h),Lm=V();
  for(const [a,b,m] of SEGMENTS){const mid=P=>P[a].clone().add(P[b]).multiplyScalar(.5),dir=P=>P[b].clone().sub(P[a]).normalize(),len=B[b].distanceTo(B[a]),vm=mid(C).sub(mid(A)).divideScalar(2*h);
   Lm.add(mid(B).sub(c).cross(vm.sub(vc)).multiplyScalar(m)).add(dir(B).cross(dir(C).sub(dir(A)).divideScalar(2*h)).multiplyScalar(m*len*len/12));}return Lm;}
 const N=Math.round(L/.02),DT=L/N,GRID=Array.from({length:N},(_,i)=>i*DT),G=IDLE.gravity,SENSITIVITY=1.29;
 // The heading the arms hang along, a beat behind the trunk (2 Hz): the hips' yaw and half the chest's twist on them, so
 // the hands stay by the thighs when the chest turns. Where the chest cannot twist far (a thick coat or a belly beside the
 // arms), the arms follow stiffly (5 Hz).
 const LAG=Math.min(...Object.values(twistLimit))<10?5:2,lag=loopSpline(loopLag(GRID.map(t=>hipsYaw(t)+.5*chestYaw(t)),DT,LAG,.55),DT);
 function plan(k){const P=GRID.map(t=>k.body(t)),C=P.map(centre),Lm=P.map((B,i)=>momentum(P[(i-1+N)%N],B,P[(i+1)%N],C[i],DT));
  const ydd=C.map((c,i)=>(C[(i+1)%N].y-2*c.y+C[(i-1+N)%N].y)/(DT*DT)),Fy=ydd.map(a=>MASS*(G+a)),w2=Fy.map((f,i)=>f/(MASS*C[i].y));
  const dL=Lm.map((l,i)=>Lm[(i+1)%N].clone().sub(Lm[(i-1+N)%N]).divideScalar(2*DT));
  const X=loopPendulum(w2,GRID.map((t,i)=>copAt(t)[0]-dL[i].z/Fy[i]),DT),Z=loopPendulum(w2,GRID.map((t,i)=>copAt(t)[1]+dL[i].x/Fy[i]),DT);
  const rows=GRID.map((t,i)=>{const [dx,dz]=k.xz(t);return [dx+SENSITIVITY*(X[i]-C[i].x),dz+SENSITIVITY*(Z[i]-C[i].z)];}),sx=loopSpline(rows.map(r=>r[0]),DT),sz=loopSpline(rows.map(r=>r[1]),DT);
  return {xz:t=>[sx(t),sz(t)],residual:Math.max(...GRID.map((t,i)=>Math.hypot(X[i]-C[i].x,Z[i]-C[i].z)))};}
 // The rest pose's centre of mass sets where the pressure point rests (see above).
 {const k=kinematics(()=>[0,0],lag),c=centre(k.body(0)),q=[c.x,c.z],m=inside(soles,q),toward=u=>[q[0]+(soleMid[0]-q[0])*u,q[1]+(soleMid[1]-q[1])*u];
  if(m>=.04)base=[c.x,0];else if(inside(soles,toward(1))<.04){let best=0,bu=0;for(let u=0;u<=1.0001;u+=.01){const g=inside(soles,toward(u));if(g>best){best=g;bu=u;}}base=[toward(bu)[0],0];}
  else{let lo=0,hi=1;for(let i=0;i<30;i++){const u=(lo+hi)/2;if(inside(soles,toward(u))>=.04)hi=u;else lo=u;}base=[toward(hi)[0],0];}
  clearance=inside(soles,[base[0],0]);
 const across=[];for(let i=0;i<soles.length;i++){const [x0,z0]=soles[i],[x1,z1]=soles[(i+1)%soles.length];if((x0-base[0])*(x1-base[0])<=0&&x0!==x1)across.push(z0+(z1-z0)*(base[0]-x0)/(x1-x0));}
 SHIFT=clamp(Math.min(Math.max(...across),-Math.min(...across))-.045,0,.045);}
 // The legs must reach their planted hooves everywhere round the loop; if a lean would stretch a leg past 99.5% of its
 // reach, the lean is made gentler until none does.
 let kin,balance,stretch=0;
 for(let tries=0;tries<4;tries++){kin=kinematics(()=>[0,0],lag);for(let pass=0;pass<4;pass++){balance=plan(kin);kin=kinematics(balance.xz,lag);}
  stretch=0;for(const t of GRID){const P=kin.body(t);for(const s of [-1,1])stretch=Math.max(stretch,P['hip'+s].distanceTo(ANKLE[s])/(LENGTH[s].leg[0]+LENGTH[s].leg[1]));}
  if(stretch<.995)break;SHIFT*=.8;}
 if(stretch>=.995){throw Error('Idle pose unreachable on this rig: a leg would stretch to '+(stretch*100).toFixed(1)+'% of its reach');}
 const {trunk,head,arm,kneePole,body}=kin;
 LIVE.add(worker);built=true;

 // ---- posing ----
 const eyeAt=(tr,h)=>tr.chest.clone().add(h.offset.clone().applyQuaternion(tr.qc)).add(EYE.clone().applyQuaternion(tr.qc.clone().multiply(h.q)));
 const lookAt=t=>looks.list.reduce((cur,l)=>t>=l.time?l:cur,{...looks.home,time:0,dur:0,kind:'home',label:'Look ahead'});
 const stanceAt=t=>{const w=leaning(t),s=stances.reduce((cur,x)=>t>=x.time?x:cur,null),moving=s&&t<s.time+s.dur;return {weight:SHIFTED*w,label:moving?'Shifting weight':Math.abs(w)<.5?'Standing square':w<0?'Leaning toward the left hoof':'Leaning toward the right hoof'};};
 return {worker,length:L,seed,fitted:{nod:nodLimit,up:upLimit,tilt:tiltLimit,rounding:ROUND,ease:EASE,shrug:SHRUG,weightShift:SHIFTED,yaw:{...yawLimit},twist:{...twistLimit},swing:{lean:{...swing.lean},round:swing.round},reach:{...reach},neck:NECK,neckRadius:NECK_RADIUS,lean:SHIFT,armLag:LAG},
  schedule:{looks:looks.list.map(l=>({...l})),stances:stances.map(s=>({...s})),breaths:breaths.map(b=>({...b}))},
  balance:{residual:balance.residual,rest:[...base],clearance,cop:t=>copAt(live(t)),centre:t=>centre(body(live(t)))},
  // Where the eyes are pointed (world point 6 m out, or on the floor when looking down), for overlays and tests.
  gaze(t){t=live(t);const tr=trunk(t),h=head(t,tr),eye=eyeAt(tr,h),dir=V([1,0,0]).applyQuaternion(tr.qc.clone().multiply(h.q));const reach=dir.y<-.05?Math.min(6,eye.y/-dir.y):6;return {eye,dir,target:eye.clone().addScaledVector(dir,reach),want:{yaw:gazeYaw(t),pitch:gazePitch(t),roll:gazeRoll(t)}};},
  at(t){time=live(t);root.position.set(0,0,0);root.quaternion.identity();neutral();
   const tr=trunk(time);bones.hips.position.copy(tr.hips);bones.hips.quaternion.copy(tr.qp);bones.spine.quaternion.copy(tr.local);const h=head(time,tr);placeHead(h.q,h);
   for(const s of [-1,1])bones['upperArm'+s].position.copy(ARM_ROOT[s]).add(V([0,tr.shrug,0]));root.updateMatrixWorld(true);
   for(const s of [-1,1]){limb(bones['thigh'+s],bones['shin'+s],bones['hoof'+s],ANKLE[s].clone(),kneePole(time,s));rotate(bones['hoof'+s],Q());
    const a=arm(time,tr,s);limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],a.wrist,a.pole);bones['hand'+s].quaternion.multiply(turn([0,0,1],EASE*drift.wrist[s>0?1:0](time)));bones['fingers'+s].rotation.z=-.08+EASE*drift.curl(time+s*7);}
   root.updateMatrixWorld(true);skeleton.update();
   const look=lookAt(time),stance=stanceAt(time);
   state={time,phase:look.label,turning:time<look.time+look.dur,look:{label:look.label,yaw:gazeYaw(time),pitch:gazePitch(time),roll:gazeRoll(time)},stance:stance.label,weight:stance.weight,breath:breath(time),
    feet:Object.fromEntries([-1,1].map(s=>[s,{ankle:bones['hoof'+s].getWorldPosition(V()).toArray(),contact:'flat',planted:true}])),hips:bones.hips.getWorldPosition(V()).toArray(),chest:bones.spine.getWorldPosition(V()).toArray()};
   return state;},
  // For checking the fit: the rest pose with the head turned (yaw, degrees to the left), nodded (pitch, degrees down)
  // and tilted (roll) as the fit poses it, the neck bent as in at(); the next at() poses the idle again.
  poseHead(yaw,nod,roll=0){if(disposed)throw Error('Idle motion was disposed');if(![yaw,nod,roll].every(Number.isFinite))throw Error('Idle head pose must be finite');
   root.position.set(0,0,0);root.quaternion.identity();neutral();placeHead(turn([0,1,0],yaw*DEG).multiply(turn([0,0,1],-nod*DEG)).multiply(turn([1,0,0],roll*DEG)));skeleton.update();},
  diagnostics(){return state;},
  dispose(){if(disposed)return;disposed=true;LIVE.delete(worker);restoreSkin();worker.pose('neutral');}
 };
 }finally{if(!built){restoreSkin();worker.pose('neutral');}}
}
