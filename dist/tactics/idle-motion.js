import * as T from './vendor/three.module.js';
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
// Contrapposto, in degrees per unit of weight shift: the pelvis roll (free hip down), the chest's bend back on the pelvis,
// and how far each arm swings out from the body: the free side's past its dropping hip, the bearing side's past the coat
// that rides up on its rising hip. ramp() is max(0, x) with its corner rounded, so an arm does not snap as the weight
// crosses over.
const ramp=x=>(x+Math.hypot(x,.15))/2-.075;
const POSTURE={roll:4.5,lean:3,free:5,bearing:8,sink:.003};
// Segment masses for balance (kg, 74.9 in all), as in the grenade throw: the horse head is counted at 6 kg.
const SEGMENTS=[['pelvis','chest',18],['chest','neck',13],['neck','headTip',6],...[-1,1].flatMap(s=>[['pelvis','hip'+s,1],['chest','shoulder'+s,1],['shoulder'+s,'elbow'+s,1.9],['elbow'+s,'wrist'+s,1.1],
 ['wrist'+s,'palm'+s,.45],['hip'+s,'knee'+s,9.5],['knee'+s,'ankle'+s,3],['ankle'+s,'toe'+s,.5],['ankle'+s,'heel'+s,.5]])],MASS=SEGMENTS.reduce((m,s)=>m+s[2],0);

// ---- seeded schedules ----
function random(seed){let a=(Math.floor(seed)>>>0)||0x9e3779b9;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const between=(r,a,b)=>a+(b-a)*r();
// A gaze shift takes longer the further it goes (about 0.4 s for 20 degrees, 0.6 s for 60).
const shiftTime=(a,b)=>.30+.0055*Math.hypot(b.yaw-a.yaw,b.pitch-a.pitch);
// When the trunk follows a gaze shift, [chest delay, chest stretch, hips delay, hips stretch]: by default the chest
// starts 0.10 s after the head and takes 1.5 times as long, the hips 0.16 s after and 1.8 times as long. A wide look
// cannot wait that long (the head would stall against its limit mid-turn), so it takes the first, most relaxed timing
// that keeps the head within 36 degrees of yaw from the chest; the trunk then starts sooner and moves faster.
const TIMINGS=[[.10,1.5,.16,1.8],[.07,1.35,.12,1.6],[.04,1.2,.08,1.4],[.02,1.08,.04,1.2],[0,1,0,1.05]],trunkTail=d=>TIMINGS[0][2]+(TIMINGS[0][3]-1)*d;
export const lookLabel=l=>l.pitch<-18?'Glance down':l.yaw>22?'Look left':l.yaw<-22?'Look right':Math.abs(l.yaw)<8&&l.pitch>-12?'Look ahead':'Scan';
// Looks: degrees from straight ahead (yaw positive to the left, pitch positive up, roll tilts the head). Mostly
// small scans and returns ahead, sometimes a look well to one side (the sides alternate), sometimes the ground in
// front. A scan from far to one side usually drifts back toward the middle. The loop opens and closes on the same look ahead, held across the seam.
function lookPlan(r,L){
 const home={yaw:between(r,-4,4),pitch:between(r,-8,-4),roll:0},list=[];let t=between(r,1.0,2.4),cur=home,last='home',side=r()<.5?1:-1;
 for(;;){
  const u=r();let kind=last==='side'?(u<.45?'home':u<.75?'scan':'side'):last==='ground'?(u<.5?'home':'scan'):(u<.34?'scan':u<.62?'side':u<.80?'ground':'home');
  if(kind===last&&kind!=='scan')kind='scan';
  let next;
  if(kind==='side'){next={yaw:side*between(r,46,66),pitch:between(r,-6,4),roll:r()<.3?side*between(r,3,6):0};side=-side;}
  else if(kind==='ground')next={yaw:between(r,-22,22),pitch:between(r,-30,-20),roll:0};
  else if(kind==='home')next={yaw:between(r,-5,5),pitch:between(r,-9,-3),roll:0};
  else{const d=(Math.abs(cur.yaw)>25&&r()<.7?-Math.sign(cur.yaw):r()<.5?-1:1)*between(r,10,26);next={yaw:clamp(cur.yaw+d,-40,40),pitch:clamp(cur.pitch+between(r,-6,6),-16,6),roll:r()<.2?(r()<.5?-1:1)*between(r,2.5,5):0};}
  if(Math.hypot(next.yaw-cur.yaw,next.pitch-cur.pitch)<6)continue;
  const dur=shiftTime(cur,next),dwell=kind==='home'?between(r,1.6,3.8):kind==='side'?between(r,1.0,2.6):kind==='ground'?between(r,.8,1.8):between(r,.6,1.6),back=shiftTime(next,home);
  if(t+dur+dwell+back+trunkTail(back)+1.0>L)break;
  list.push({time:t,dur,...next,kind,label:lookLabel(next)});cur=next;last=kind;t+=dur+dwell;
 }
 list.push({time:t,dur:shiftTime(cur,home),...home,kind:'home',label:lookLabel(home)});
 return {home,list};
}
// Weight: on both hooves, or settled onto one (side -1 is the left hoof, +1 the right), shifting over 1.2-1.7 s.
function stancePlan(r,L){
 const list=[];let t=between(r,3,7),cur=0;
 for(;;){const next=cur===0?(r()<.5?-1:1):(r()<.35?-cur:0),dur=between(r,1.2,1.7),hold=next===0?between(r,4,8):between(r,6,11);
  if(t+dur+hold+1.7+1.5>L)break;list.push({time:t,dur,side:next});cur=next;t+=dur+hold;}
 if(cur!==0)list.push({time:t,dur:between(r,1.2,1.6),side:0});
 return list;
}
// Breaths of 3.8-4.8 s whose lengths add up to the loop; the inhale is the shorter part, and one breath is a sigh.
function breathPlan(r,L){
 const n=Math.max(2,Math.round(L/4.3)),raw=Array.from({length:n},()=>between(r,.88,1.12)),sum=raw.reduce((a,b)=>a+b,0),sigh=Math.floor(r()*n);let t=0;
 return raw.map((x,i)=>{const d=x*L/sum,b={time:t,dur:d,amp:i===sigh?1.8:between(r,.85,1.15),inhale:i===sigh?.36:between(r,.38,.45)};t+=d;return b;});
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
// moves l*along(theta) out of line and l*drop(theta) back down its axis (Simpson's rule over the branch).
const branch=(theta,f)=>{let a=0;for(let i=0;i<=16;i++){const u=i/16;a+=(i%16?i%2?4:2:1)*f(theta*(2*u-u*u));}return a/48;},along=th=>branch(th,Math.sin),drop=th=>1-branch(th,Math.cos);
// Elbow or knee of a two-bone limb whose end must reach target, bent toward pole.
function bend(start,target,l1,l2,pole){const axis=target.clone().sub(start),d=Math.min(axis.length(),l1+l2-1e-9);axis.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),side=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();return start.clone().addScaledVector(axis,along).addScaledVector(side,Math.sqrt(Math.max(0,l1*l1-along*along)));}

export function createIdle(worker,{seed=1,length=IDLE.length}={}){
 if(!Number.isFinite(seed))throw Error('Idle seed must be finite');
 if(!(length>=12))throw Error('Idle loop must last at least 12 s');
 const L=length,root=worker.root,bones=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
 root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');root.updateMatrixWorld(true);
 const rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())])),at0=b=>rest.get(bones[b]).clone(),palm=V([.052,-.010,0]);
 const restHips=at0('hips'),spineOffset=at0('spine').sub(restHips),headOffset=at0('head').sub(at0('spine')),EYE=V([.123,.177,0]);
 // The neck as a 17 cm branch rising from the shoulders to the head joint, along the rest neck.
 const NECK=.17,NECK_AXIS=headOffset.clone().normalize();
 const THIGH={},SHOULDER={},HANG={},LENGTH={},BEND={},ANKLE={};
 for(const s of [-1,1]){THIGH[s]=at0('thigh'+s).sub(restHips);SHOULDER[s]=at0('upperArm'+s).sub(at0('spine'));ANKLE[s]=at0('hoof'+s);
  const d=(a,b)=>at0(a+s).distanceTo(at0(b+s));LENGTH[s]={arm:[d('upperArm','forearm'),d('forearm','hand')],leg:[d('thigh','shin'),d('shin','hoof')]};
  // The direction each rest elbow and knee already bends, and the way the rest arm hangs from its shoulder.
  const bent=(a,b,c)=>{const o=at0(a+s),axis=at0(c+s).sub(o).normalize(),e=at0(b+s).sub(o);return e.addScaledVector(axis,-e.dot(axis)).normalize();};BEND[s]={arm:bent('upperArm','forearm','hand'),leg:bent('thigh','shin','hoof')};
  HANG[s]=at0('hand'+s).sub(at0('upperArm'+s));}
 const ankleY=ANKLE[1].y;

 // ---- the seed's schedules ----
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
 // ---- fitted to this rig: how far the face can nod, how far out the arms must hang, how far the chest can twist ----
 // Skin meets cloth where a face, forearm or glove triangle crosses a torso triangle on the skinned meshes, as the eye sees
 // it: torso triangles have every corner weighted more than half to the spine and hips (sleeves ride the arms and do not
 // count), and an edge of either piercing the other counts. Torso triangles that a probe's bones do not move are skinned
 // once, in the rest pose.
 const weightOf=(a,i,re)=>{let w=0;for(let k=0;k<4;k++)if(re.test(worker.bones[a.skinIndex.getComponent(i,k)].name))w+=a.skinWeight.getComponent(i,k);return w;};
 const trisOf=test=>worker.parts.flatMap(mesh=>{const g=mesh.geometry,a=g.attributes,ix=g.index?g.index.array:null,n=ix?ix.length:a.position.count,out=[];
  for(let t=0;t<n;t+=3){const v=ix?[ix[t],ix[t+1],ix[t+2]]:[t,t+1,t+2];if(v.every(i=>test(a,i)))out.push({mesh,a,v,by:new Set(v.flatMap(i=>[0,1,2,3].filter(k=>a.skinWeight.getComponent(i,k)>0).map(k=>worker.bones[a.skinIndex.getComponent(i,k)].name)))});}return out;});
 const skinTri=({mesh,a,v})=>v.map(i=>{const p=V().fromBufferAttribute(a.position,i);mesh.applyBoneTransform(i,p);return p.applyMatrix4(mesh.matrixWorld);});
 const CELL=.05,cellKey=p=>Math.floor(p.x/CELL)+','+Math.floor(p.y/CELL)+','+Math.floor(p.z/CELL);
 const index=list=>{const grid=new Map();list.forEach((t,n)=>{const lo=[0,1,2].map(k=>Math.floor(Math.min(t[0].getComponent(k),t[1].getComponent(k),t[2].getComponent(k))/CELL)),hi=[0,1,2].map(k=>Math.floor(Math.max(t[0].getComponent(k),t[1].getComponent(k),t[2].getComponent(k))/CELL));
  for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){const k=x+','+y+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(n);}});return grid;};
 // Moller-Trumbore: does the segment a-b pass through triangle t?
 const pierce=(a,b,t)=>{const d=b.clone().sub(a),e1=t[1].clone().sub(t[0]),e2=t[2].clone().sub(t[0]),p=d.clone().cross(e2),det=e1.dot(p);if(Math.abs(det)<1e-12)return false;
  const s=a.clone().sub(t[0]),u=s.dot(p)/det;if(u<0||u>1)return false;const q=s.clone().cross(e1),w=d.dot(q)/det;if(w<0||u+w>1)return false;const h=e2.dot(q)/det;return h>0&&h<1;};
 const crossings=(A,parts)=>{let n=0;for(const t of A)for(const [i,j] of [[0,1],[1,2],[2,0]])for(const [B,g] of parts){const seen=new Set();for(const c of [t[i],t[j]])for(const k of g.get(cellKey(c))||[]){if(seen.has(k))continue;seen.add(k);if(pierce(t[i],t[j],B[k]))n++;}}return n;};
 const torsoT=trisOf((a,i)=>weightOf(a,i,/^(spine|hips)$/)>.5);
 const probe=moves=>{worker.pose('neutral');root.updateMatrixWorld(true);const still=torsoT.filter(t=>![...t.by].some(moves)).map(skinTri);return {movers:torsoT.filter(t=>[...t.by].some(moves)),still,gStill:index(still)};};
 function contact(set,{movers,still,gStill}){root.updateMatrixWorld(true);const moved=movers.map(skinTri),probed=set.map(skinTri),gP=index(probed);
  return crossings(probed,[[still,gStill],[moved,index(moved)]])+crossings(still,[[probed,gP]])+crossings(moved,[[probed,gP]]);}
 // The largest angle, in 5 degree steps, at which a pose crosses no more cloth than it does at zero, less 5 degrees kept
 // in hand for the idle's other motions (a lean or a tilt the probe does not make).
 function fit(set,moves,pose,top){const torso=probe(moves);pose(0);const base=contact(set,torso);let ok=0;for(let deg=5;deg<=top;deg+=5){worker.pose('neutral');pose(deg*DEG);if(contact(set,torso)>base)break;ok=deg;}worker.pose('neutral');root.updateMatrixWorld(true);return ok>=top?top:Math.max(0,ok-5);}
 // The face (head-weighted, 8 cm or more in front of the head joint, so the neck skin inside the collar does not count)
 // nodding down with the neck bent as in at(), turned up to 24 degrees either way, as downward looks are. The chest rounds
 // forward for any deeper look. A long face on a short neck nods less.
 const faceT=trisOf((a,i)=>weightOf(a,i,/^head$/)>.95&&a.position.getX(i)>at0('head').x+.08);
 const nodLimit=Math.min(...[-24,0,24].map(yaw=>fit(faceT,b=>b==='head',th=>{const dir=V([Math.cos(yaw*DEG),0,-Math.sin(yaw*DEG)]);bones.head.position.copy(headOffset.clone().addScaledVector(dir,NECK*along(th)).addScaledVector(NECK_AXIS,-NECK*drop(th)));bones.head.quaternion.copy(turn([0,1,0],yaw*DEG).multiply(turn([0,0,1],-th)));root.updateMatrixWorld(true);},45)));
 const armT={};for(const s of [-1,1])armT[s]=trisOf((a,i)=>weightOf(a,i,new RegExp('^(hand|fingers|forearm)'+s+'$'))>.5);
 const hangAt=(s,yaw,out=0)=>{const q=turn([0,1,0],yaw).multiply(turn([1,0,0],-s*out*DEG)),sh=bones['upperArm'+s].getWorldPosition(V());limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],sh.add(HANG[s].clone().applyQuaternion(q)),BEND[s].arm.clone().applyQuaternion(q));rotate(bones['hand'+s],q);};
 // Some coats sit over the hanging arms in the rig's own rest pose (a belt, a coat edge, a vest, a jacket skirt). The idle
 // holds such an arm out from the body by the least whole-degree angle at which it crosses no cloth, plus 2 degrees of room
 // for the idle's own small motions (12 at most).
 const restOut={},armBones=b=>/^(upperArm|forearm|hand|fingers)/.test(b);
 for(const s of [-1,1]){const torso=probe(armBones);let deg=0;for(;deg<12;deg++){worker.pose('neutral');if(deg)hangAt(s,0,deg);if(!contact(armT[s],torso))break;}restOut[s]=deg?Math.min(12,deg+2):0;}worker.pose('neutral');root.updateMatrixWorld(true);
 // The chest twisting on the hips each way, the arms hanging as in at(): a pot belly or a thick coat twists less, and the
 // hips take the rest of a wide look.
 const twistLimit=Object.fromEntries([1,-1].map(dir=>[dir,fit([...armT[1],...armT[-1]],b=>b!=='hips'&&!/^(thigh|shin|hoof)/.test(b),a=>{bones.spine.quaternion.copy(turn([0,1,0],dir*a));root.updateMatrixWorld(true);for(const s of [-1,1])hangAt(s,dir*a*.5,restOut[s]);},30)]));
 const r=random(seed),looks=lookPlan(r,L),stances=stancePlan(r,L),breaths=breathPlan(r,L);
 // The trunk turns only for looks too wide for the neck: the head keeps up to about 30 degrees of the yaw and the
 // trunk takes the rest, 45% in the chest (up to the twist this rig allows) and the remainder in the hips, up to about
 // 28 degrees on planted hooves (a relaxed chest twists little on them). Looking down rounds the chest forward a little,
 // and as much more as the face cannot nod, up to 10 degrees (the shirt's waist rides the same spine bone and swings back
 // into the hanging arms beyond that); it rounds with the head rather than after it, so the muzzle never reaches the chest
 // on the way down. A face that cannot nod far glances less deep: its nod stops at the limit fitted above.
 const headShare=y=>30*Math.tanh(y/30),trunkYaw=y=>y-headShare(y),chestPitch=p=>Math.min(10,Math.max(.30*Math.max(0,-12-p),-p-nodLimit));
 const chestTwist=y=>{const c=.45*trunkYaw(y),top=twistLimit[c<0?-1:1];return top>0?top*Math.tanh(c/top):0;},hipsTwist=y=>{const h=trunkYaw(y)-chestTwist(y);return 28*Math.tanh(h/28);};
 const ch=(key,fn,part)=>steps(fn(looks.home[key]),looks.list.map(l=>{const [cd,cs,hd,hs]=TIMINGS[l.trunk||0],[d,k]=part==='chest'?[cd,cs]:part==='hips'?[hd,hs]:[0,1];return [l.time+d,l.dur*k,fn(l[key])];}));
 let gazeYaw,gazePitch,gazeRoll,chestYaw,hipsYaw,chestFlex;
 const build=()=>{gazeYaw=ch('yaw',y=>y);gazePitch=ch('pitch',p=>p);gazeRoll=ch('roll',x=>x);chestYaw=ch('yaw',chestTwist,'chest');hipsYaw=ch('yaw',hipsTwist,'hips');chestFlex=ch('pitch',chestPitch);};
 for(const l of looks.list)for(l.trunk=0;;l.trunk++){build();const [,,hd,hs]=TIMINGS[l.trunk];let peak=0;for(let t=l.time;t<=l.time+hd+hs*l.dur;t+=.01)peak=Math.max(peak,Math.abs(gazeYaw(t)-chestYaw(t)-hipsYaw(t)));if(peak<=36||l.trunk===TIMINGS.length-1)break;}
 build();
 const weight=steps(0,stances.map(s=>[s.time,s.dur,s.side]));
 const breath=t=>{const b=breaths.find(b=>t<b.time+b.dur)||breaths.at(-1),u=(t-b.time)/b.dur;return b.amp*(u<b.inhale?smooth(u/b.inhale):1-smooth((u-b.inhale)/(1-b.inhale)));};
 // The head never rests perfectly still, and the pressure point under the hooves wanders a few millimetres.
 const drift={yaw:wave(r,L,4,22,.45),pitch:wave(r,L,4,22,.30),x:wave(r,L,3,14,.0035),z:wave(r,L,3,14,.0022),curl:wave(r,L,2,9,.04)};
 // Settling onto one hoof, for a stance this wide: the pressure point moves 4.5 cm toward the bearing hoof, and the hips
 // follow it over that hoof and hike (the pelvis rolls 4.5 degrees, the bearing hip up) so the bearing leg stands straight
 // instead of buckling; the free leg, its hoof planted wide, reaches out as a prop. The chest bends 3 degrees back on the
 // pelvis, which keeps the shoulders nearly level. The free leg must still reach its hoof, which bounds all of this.
 const SHIFT=.045,copAt=t=>[drift.x(t),SHIFT*weight(t)+drift.z(t)];
 const wrap=t=>((t%L)+L)%L;

 // ---- pure kinematics for a given horizontal pelvis path xz(t); nothing is integrated ----
 function kinematics(xz,lag){
  const memo=new Map();
  function trunk(t){let k=memo.get(t);if(k)return k;const w=weight(t),qp=trunkQ(hipsYaw(t)*DEG,0,POSTURE.roll*DEG*w),local=trunkQ(chestYaw(t)*DEG,(chestFlex(t)-1.8*breath(t))*DEG,-POSTURE.lean*DEG*w),[dx,dz]=xz(t);
   const hips=restHips.clone().add(V([dx,-POSTURE.sink*w*w,dz]));k={hips,qp,local,qc:qp.clone().multiply(local),chest:hips.clone().add(spineOffset.clone().applyQuaternion(qp))};if(memo.size>256)memo.clear();memo.set(t,k);return k;}
  // The head aims in world space; its turn from the chest is capped smoothly at the 40 degrees the neck seam allows.
  // Looking down, the neck bends forward like a heavy branch and carries the head out over the chest instead of
  // tipping the jaw into it: the branch takes the whole downward tilt. Looking up it bends back, taking half.
  function head(t,tr){const want=turn([0,1,0],(gazeYaw(t)+drift.yaw(t))*DEG).multiply(turn([0,0,1],(gazePitch(t)+drift.pitch(t))*DEG)).multiply(turn([1,0,0],gazeRoll(t)*DEG));
   let q=tr.qc.clone().invert().multiply(want);const e=new T.Euler().setFromQuaternion(q,'YZX'),low=-nodLimit*DEG,ease=6*DEG;
   if(e.z<low+ease){e.z=low+ease-ease*Math.tanh((low+ease-e.z)/ease);q=Q().setFromEuler(e);}
   const v=logq(q),a=v.length(),k=30*DEG,top=IDLE.neck*DEG;if(a>k)q=expq(v.multiplyScalar((k+(top-k)*Math.tanh((a-k)/(top-k)))/a));
   const f=V([1,0,0]).applyQuaternion(q),pitch=Math.asin(clamp(f.y,-1,1)),face=V([f.x,0,f.z]);if(face.lengthSq()<1e-9)face.set(1,0,0);face.normalize();
   const th=pitch<0?-pitch:.5*pitch,dir=pitch<0?face:face.negate();return {q,offset:headOffset.clone().addScaledVector(dir,NECK*along(th)).addScaledVector(NECK_AXIS,-NECK*drop(th))};}
  // The arms hang from the shoulders like pendulums, along the lagging heading; they keep their angle to the pelvis's
  // tilt, so a hip that juts out over the bearing hoof does not run into its hand.
  function arm(t,tr,s){const sh=tr.chest.clone().add(SHOULDER[s].clone().applyQuaternion(tr.qc)),q=turn([0,1,0],lag(t)*DEG),u=s*weight(t),out=turn([1,0,0],-s*(restOut[s]+POSTURE.bearing*ramp(u)+POSTURE.free*ramp(-u))*DEG);return {sh,wrist:sh.clone().add(HANG[s].clone().applyQuaternion(out).applyQuaternion(q)),pole:BEND[s].arm.clone().applyQuaternion(q),q};}
  const kneePole=(t,s)=>BEND[s].leg.clone().applyQuaternion(turn([0,1,0],.5*hipsYaw(t)*DEG));
  // Segment end points for balance (the same two-bone solutions the bones receive in at()).
  function body(t){const tr=trunk(t),h=head(t,tr),P={pelvis:tr.hips,chest:tr.chest},neck=tr.chest.clone().add(h.offset.clone().applyQuaternion(tr.qc));P.neck=neck;P.headTip=V([.14,.32,0]).applyQuaternion(tr.qc.clone().multiply(h.q)).add(neck);
   for(const s of [-1,1]){const hip=tr.hips.clone().add(THIGH[s].clone().applyQuaternion(tr.qp)),a=arm(t,tr,s);P['hip'+s]=hip;P['ankle'+s]=ANKLE[s];P['knee'+s]=bend(hip,ANKLE[s],...LENGTH[s].leg,kneePole(t,s));
    P['toe'+s]=V([.145,-ankleY,0]).add(ANKLE[s]);P['heel'+s]=V([-.06,-ankleY,0]).add(ANKLE[s]);P['shoulder'+s]=a.sh;P['wrist'+s]=a.wrist;P['elbow'+s]=bend(a.sh,a.wrist,...LENGTH[s].arm,a.pole);P['palm'+s]=palm.clone().applyQuaternion(a.q).add(a.wrist);}
   return P;}
  return {xz,trunk,head,arm,kneePole,body};
 }
 // ---- balance: the centre of mass rides a linear inverted pendulum over the centre-of-pressure plan ----
 // x'' = w2 (x - p), w2 = Fy / (M y), with p the planned pressure point shifted by what the arms' and trunk's angular
 // momentum needs (dL/dt about the centre of mass moves the required pressure point by dL/Fy). Solved round the loop,
 // so there is no start or end to hold; the pelvis is then shifted until the real segment centre of mass follows.
 const centre=P=>{const c=V();for(const [a,b,m] of SEGMENTS)c.addScaledVector(P[a],m/2).addScaledVector(P[b],m/2);return c.divideScalar(MASS);};
 // Angular momentum about the centre of mass from the body at grid points either side (central differences round the
 // loop): an idle moves slowly enough for the 20 ms grid.
 function momentum(A,B,C,c,h){const vc=centre(C).sub(centre(A)).divideScalar(2*h),Lm=V();
  for(const [a,b,m] of SEGMENTS){const mid=P=>P[a].clone().add(P[b]).multiplyScalar(.5),dir=P=>P[b].clone().sub(P[a]).normalize(),len=B[b].distanceTo(B[a]),vm=mid(C).sub(mid(A)).divideScalar(2*h);
   Lm.add(mid(B).sub(c).cross(vm.sub(vc)).multiplyScalar(m)).add(dir(B).cross(dir(C).sub(dir(A)).divideScalar(2*h)).multiplyScalar(m*len*len/12));}return Lm;}
 const DT=.02,N=Math.round(L/DT),GRID=Array.from({length:N},(_,i)=>i*DT),G=IDLE.gravity,SENSITIVITY=1.29;
 // The heading the arms hang along, a beat behind the trunk: the hips' yaw and half the chest's twist on them, so the
 // hands stay by the thighs when the chest turns (lean and flex barely turn it).
 // Where an arm hangs close to a thick coat or a belly it cannot swing behind the trunk: it follows stiffly.
 const lag=loopSpline(loopLag(GRID.map(t=>hipsYaw(t)+.5*chestYaw(t)),DT,Math.min(...Object.values(twistLimit))<10||Math.max(...Object.values(restOut))>0?5:2,.55),DT);
 function plan(k){const P=GRID.map(t=>k.body(t)),C=P.map(centre),Lm=P.map((B,i)=>momentum(P[(i-1+N)%N],B,P[(i+1)%N],C[i],DT));
  const ydd=C.map((c,i)=>(C[(i+1)%N].y-2*c.y+C[(i-1+N)%N].y)/(DT*DT)),Fy=ydd.map(a=>MASS*(G+a)),w2=Fy.map((f,i)=>f/(MASS*C[i].y));
  const dL=Lm.map((l,i)=>Lm[(i+1)%N].clone().sub(Lm[(i-1+N)%N]).divideScalar(2*DT));
  const X=loopPendulum(w2,GRID.map((t,i)=>copAt(t)[0]-dL[i].z/Fy[i]),DT),Z=loopPendulum(w2,GRID.map((t,i)=>copAt(t)[1]+dL[i].x/Fy[i]),DT);
  const rows=GRID.map((t,i)=>{const [dx,dz]=k.xz(t);return [dx+SENSITIVITY*(X[i]-C[i].x),dz+SENSITIVITY*(Z[i]-C[i].z)];}),sx=loopSpline(rows.map(r=>r[0]),DT),sz=loopSpline(rows.map(r=>r[1]),DT);
  return {xz:t=>[sx(t),sz(t)],residual:Math.max(...GRID.map((t,i)=>Math.hypot(X[i]-C[i].x,Z[i]-C[i].z)))};}
 let kin=kinematics(()=>[0,0],lag),balance;for(let pass=0;pass<4;pass++){balance=plan(kin);kin=kinematics(balance.xz,lag);}
 const {trunk,head,arm,kneePole,body}=kin;

 // ---- posing ----
 const eyeAt=(tr,h)=>tr.chest.clone().add(h.offset.clone().applyQuaternion(tr.qc)).add(EYE.clone().applyQuaternion(tr.qc.clone().multiply(h.q)));
 const lookAt=t=>looks.list.reduce((cur,l)=>t>=l.time?l:cur,{...looks.home,time:0,dur:0,kind:'home',label:lookLabel(looks.home)});
 const stanceAt=t=>{const w=weight(t),s=stances.reduce((cur,x)=>t>=x.time?x:cur,null),moving=s&&t<s.time+s.dur;return {weight:w,label:moving?'Shifting weight':Math.abs(w)<.5?'Weight on both hooves':w<0?'Weight on the left hoof':'Weight on the right hoof'};};
 return {worker,length:L,seed,fitted:{nod:nodLimit,twist:{...twistLimit},armsOut:{...restOut}},
  schedule:{looks:looks.list.map(l=>({...l})),stances:stances.map(s=>({...s})),breaths:breaths.map(b=>({...b}))},
  balance:{residual:balance.residual,cop:t=>copAt(live(t)),centre:t=>centre(body(live(t)))},
  // Where the eyes are pointed (world point 6 m out, or on the floor when looking down), for overlays and tests.
  gaze(t){t=live(t);const tr=trunk(t),h=head(t,tr),eye=eyeAt(tr,h),dir=V([1,0,0]).applyQuaternion(tr.qc.clone().multiply(h.q));const reach=dir.y<-.05?Math.min(6,eye.y/-dir.y):6;return {eye,dir,target:eye.clone().addScaledVector(dir,reach),want:{yaw:gazeYaw(t),pitch:gazePitch(t),roll:gazeRoll(t)}};},
  at(t){time=live(t);root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');
   const tr=trunk(time);bones.hips.position.copy(tr.hips);bones.hips.quaternion.copy(tr.qp);bones.spine.quaternion.copy(tr.local);const h=head(time,tr);bones.head.position.copy(h.offset);bones.head.quaternion.copy(h.q);root.updateMatrixWorld(true);
   for(const s of [-1,1]){limb(bones['thigh'+s],bones['shin'+s],bones['hoof'+s],ANKLE[s].clone(),kneePole(time,s));rotate(bones['hoof'+s],Q());
    const a=arm(time,tr,s);limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],a.wrist,a.pole);rotate(bones['hand'+s],a.q);bones['fingers'+s].rotation.z=-.08+drift.curl(time+s*7);}
   root.updateMatrixWorld(true);worker.skeleton.update();
   const look=lookAt(time),stance=stanceAt(time);
   state={time,phase:look.label,turning:time<look.time+look.dur,look:{label:look.label,yaw:gazeYaw(time),pitch:gazePitch(time),roll:gazeRoll(time)},stance:stance.label,weight:stance.weight,breath:breath(time),
    feet:Object.fromEntries([-1,1].map(s=>[s,{ankle:bones['hoof'+s].getWorldPosition(V()).toArray(),contact:'flat',planted:true}])),hips:bones.hips.getWorldPosition(V()).toArray(),chest:bones.spine.getWorldPosition(V()).toArray()};
   return state;},
  diagnostics(){return state;},
  dispose(){if(disposed)return;disposed=true;worker.pose('neutral');}
 };
}
