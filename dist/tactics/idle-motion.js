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
// Leaning toward one hoof, in degrees per unit of lean: the pelvis rolls, that hip up; the chest bends back past level on
// it, so the shoulders tilt a little the other way. ramp() is max(0, x) with its corner rounded, so nothing snaps as the
// lean crosses over.
const ramp=x=>(x+Math.hypot(x,.15))/2-.075;
const POSTURE={roll:4.5,lean:6,sink:.003};
// Breathing: per unit of breath the shoulders rise 4 mm (a shrug at the arm roots) and the chest opens half a degree.
const BREATH={shrug:.004,chest:.5};
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
export const lookLabel=l=>l.pitch<-12?'Glance down':l.yaw>20?'Look left':l.yaw<-20?'Look right':Math.abs(l.yaw)<7&&l.pitch>-12?'Look ahead':'Drift';
// Looks: degrees from straight ahead (yaw positive to the left, pitch positive up, roll tilts the head). A relaxed worker
// mostly rests the eyes ahead, 4-9 s at a time and now and then for 9-13; otherwise the gaze drifts 6-12 degrees for a
// while, looks 28-50 degrees to one side (the sides are random, with a lean toward the side not looked at last), or glances
// at the ground in front. About a dozen gaze shifts a minute. Every look moves at least 6 degrees, and only to where this
// rig can turn, nod and look up without its head meeting its clothes (`reach`). The loop opens and closes on the same look
// ahead.
function draftLooks(r,L,reach){
 const home={yaw:between(r,-3,3),pitch:between(r,-8,-4),roll:0},list=[];let t=between(r,2,5),cur=home,last='home',lastSide=r()<.5?1:-1;
 const sideMax=s=>s>0?reach.left:reach.right;
 for(;;){
  const u=r();let kind=last==='home'?(u<.42?'drift':u<.78?'side':'ground'):last==='side'?(u<.55?'home':u<.88?'drift':'side'):last==='ground'?(u<.62?'home':'drift'):(u<.40?'home':u<.62?'drift':u<.86?'side':'ground');
  let next,hold;
  if(kind==='side'){const s=r()<.62?-lastSide:lastSide,top=Math.min(50,sideMax(s)-2);next={yaw:s*between(r,Math.min(28,top-6),top),pitch:between(r,-7,Math.min(3,reach.up)),roll:r()<.25?-s*between(r,1.5,4):0};lastSide=s;hold=between(r,1.5,3.5);}
  else if(kind==='ground'){const deep=Math.min(26,reach.down-1);next={yaw:between(r,-15,15),pitch:-between(r,Math.min(14,deep-4),deep),roll:0};hold=between(r,1.0,2.2);}
  else if(kind==='home'){next={yaw:between(r,-4,4),pitch:between(r,-9,-3),roll:0};hold=r()<.15?between(r,9,13):between(r,4,9);}
  else{const dir=Math.abs(cur.yaw)>18&&r()<.75?-Math.sign(cur.yaw):r()<.5?-1:1,yaw=cur.yaw+dir*between(r,6,12);
   next={yaw:Math.max(-sideMax(-1)+3,Math.min(sideMax(1)-3,yaw)),pitch:Math.max(-reach.down+1,Math.min(Math.min(4,reach.up),cur.pitch+between(r,-4,4))),roll:0};hold=between(r,2,4.5);}
  if(Math.hypot(next.yaw-cur.yaw,next.pitch-cur.pitch)<6)continue;
  const dur=shiftTime(cur,next),back=shiftTime(next,home);
  if(t+dur+hold+back+trunkTail(back)+1.5>L)break;
  list.push({time:t,dur,...next,kind,label:lookLabel(next)});cur=next;last=kind;t+=dur+hold;
 }
 // A last look within 6 degrees of the opening one is dropped, so the loop closes on a real shift (or none at all).
 while(list.length&&Math.hypot(cur.yaw-home.yaw,cur.pitch-home.pitch)<6){t=list.pop().time;cur=list.at(-1)??home;}
 if(list.length)list.push({time:t,dur:shiftTime(cur,home),...home,kind:'home',label:lookLabel(home)});
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
// Elbow or knee of a two-bone limb whose end must reach target, bent toward pole.
function bend(start,target,l1,l2,pole){const axis=target.clone().sub(start),d=Math.min(axis.length(),l1+l2-1e-9);axis.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),side=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();return start.clone().addScaledVector(axis,along).addScaledVector(side,Math.sqrt(Math.max(0,l1*l1-along*along)));}
function hull2(pts){const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];for(const q of p){while(lo.length>=2&&cr(lo.at(-2),lo.at(-1),q)<=0)lo.pop();lo.push(q);}for(const q of [...p].reverse()){while(up.length>=2&&cr(up.at(-2),up.at(-1),q)<=0)up.pop();up.push(q);}return lo.slice(0,-1).concat(up.slice(0,-1));}
// Distance from q to the boundary of a convex polygon, positive inside.
function inside(h,q){let best=Infinity,isIn=h.length>2;for(let i=0;i<h.length;i++){const a=h[i],b=h[(i+1)%h.length],ex=b[0]-a[0],ez=b[1]-a[1],L=Math.hypot(ex,ez)||1e-12;if((ex*(q[1]-a[1])-ez*(q[0]-a[0]))/L<0)isIn=false;const k=clamp(((q[0]-a[0])*ex+(q[1]-a[1])*ez)/(L*L));best=Math.min(best,Math.hypot(q[0]-a[0]-k*ex,q[1]-a[1]-k*ez));}return isIn?best:-best;}

// The fitted limits depend only on the rig, not the seed: one fit per rig shape, kept for every later loop.
const FITS=new Map();
const fingerprint=worker=>worker.bones.map(b=>b.name+b.position.toArray().map(x=>x.toFixed(4)).join(',')).join(';')+'|'+worker.parts.map(p=>p.name+':'+p.geometry.attributes.position.count).join(';');

export function createIdle(worker,{seed=1,length=IDLE.length}={}){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Idle seed must be a whole number from 0 to 4294967295');
 if(typeof length!=='number'||!Number.isFinite(length)||length<12||length>600)throw Error('Idle loop must last 12 to 600 s');
 const L=length,root=worker.root,bones=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
 root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');root.updateMatrixWorld(true);
 const rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())])),at0=b=>rest.get(bones[b]).clone(),palm=V([.052,-.010,0]);
 const restHips=at0('hips'),spineOffset=at0('spine').sub(restHips),headOffset=at0('head').sub(at0('spine')),EYE=V([.123,.177,0]);
 // The neck as a branch rising from the shoulders to the head joint along the rest neck, three quarters as long as the
 // spine-to-head span of this rig.
 const NECK=clamp(.75*headOffset.length(),.15,.22),NECK_AXIS=headOffset.clone().normalize();
 const THIGH={},SHOULDER={},HANG={},LENGTH={},BEND={},ANKLE={},ARM_ROOT={},ELBOW={};
 // How far the shoulder is from the wrist with the elbow bent this many degrees past its rest bend, as a share of the rest
 // reach.
 const reachAt=(s,extra)=>{const [l1,l2]=LENGTH[s].arm,d=e=>Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(e));return d(ELBOW[s]+extra*DEG)/d(ELBOW[s]);};
 for(const s of [-1,1]){THIGH[s]=at0('thigh'+s).sub(restHips);SHOULDER[s]=at0('upperArm'+s).sub(at0('spine'));ANKLE[s]=at0('hoof'+s);ARM_ROOT[s]=bones['upperArm'+s].position.clone();
  const d=(a,b)=>at0(a+s).distanceTo(at0(b+s));LENGTH[s]={arm:[d('upperArm','forearm'),d('forearm','hand')],leg:[d('thigh','shin'),d('shin','hoof')]};
  // The direction each rest elbow and knee already bends, and the way the rest arm hangs from its shoulder.
  const bent=(a,b,c)=>{const o=at0(a+s),axis=at0(c+s).sub(o).normalize(),e=at0(b+s).sub(o);return e.addScaledVector(axis,-e.dot(axis)).normalize();};BEND[s]={arm:bent('upperArm','forearm','hand'),leg:bent('thigh','shin','hoof')};
  HANG[s]=at0('hand'+s).sub(at0('upperArm'+s));const e=at0('forearm'+s).sub(at0('upperArm'+s)).angleTo(at0('hand'+s).sub(at0('forearm'+s)));ELBOW[s]=e;}
 // Cloth that bends at the waist. The rigs' own weights cut the torso cloth hard between the spine and the hips, so a few
 // degrees of chest on pelvis tear a belt or a jacket hem open. While the idle runs, the shirt, waistcoat or jacket, any belt
 // or pouches, and the trousers or overalls take the smooth waist blend of the game's walk and aim motions (animal-motion.js),
 // each vertex keeping its own sleeve weights. All the layers share one blend, from 8 to 24 cm above the hips, so a brace or
 // a belt moves with the cloth behind it. Trousers more than 10-18 cm in front of the hip joints are round a belly, not a
 // leg, and stay with the hips. dispose() restores the rig's weights.
 const savedSkin=worker.parts.map(m=>({m,index:m.geometry.attributes.skinIndex.clone(),weight:m.geometry.attributes.skinWeight.clone()})),bi=n=>worker.bones.indexOf(bones[n]),hipY=at0('hips').y,kneeY=at0('shin1').y,thighX=at0('thigh1').x,waistAt=y=>smooth((y-(hipY+.08))/.16);
 for(const mesh of worker.parts.filter(m=>/shirt|waistcoat|jacket|belt|pouch/.test(m.name)&&!/trousers/.test(m.name))){const a=mesh.geometry.attributes,p=a.position,si=a.skinIndex,sw=a.skinWeight;
  for(let i=0;i<p.count;i++){const side=p.getZ(i)<0?-1:1,sh=bi('upperArm'+side),el=bi('forearm'+side);let upper=0,lower=0;for(let k=0;k<4;k++){if(si.getComponent(i,k)===sh)upper+=sw.getComponent(i,k);if(si.getComponent(i,k)===el)lower+=sw.getComponent(i,k);}
   const torso=1-upper-lower,waist=waistAt(p.getY(i));si.setXYZW(i,bi('hips'),bi('spine'),sh,el);sw.setXYZW(i,torso*(1-waist),torso*waist,upper,lower);}
  si.needsUpdate=sw.needsUpdate=true;}
 for(const mesh of worker.parts.filter(m=>/trousers|overalls/.test(m.name))){const a=mesh.geometry.attributes,p=a.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i),side=p.getZ(i)<0?-1:1,center=smooth((Math.abs(p.getZ(i))-.03)/.12),leg=(1-smooth((y-(hipY-.11))/.14))*(1-(1-center)*smooth((y-(kneeY+.045))/.12))*(1-smooth((p.getX(i)-thighX-.10)/.08)),knee=1-smooth((y-(kneeY-.055))/.11),waist=waistAt(y);
   a.skinIndex.setXYZW(i,bi('hips'),bi('thigh'+side),bi('shin'+side),bi('spine'));a.skinWeight.setXYZW(i,(1-leg)*(1-waist),leg*(1-knee),leg*knee,(1-leg)*waist);}
  a.skinIndex.needsUpdate=a.skinWeight.needsUpdate=true;}
 // Cloth worn round the neck, and a mane, move with the neck skin under them. The neck skin turns from the spine to the head
 // inside the collar, so a neck bending forward would carry it through a collar or a neckerchief that kept to the spine, and
 // would lift a mane, all head, off the nape. Each vertex of the clothes within 4.5 cm of the neck skin takes the head weight
 // of the nearest neck-skin vertex (skin, not the head itself), in full within 1.5 cm and easing to none at 4.5 cm; a mane
 // takes it in full.
 const skull=worker.parts.find(m=>/skull/.test(m.name));
 if(skull){const hi=bi('head'),C=.02,grid=new Map(),cellOf=v=>[Math.floor(v.x/C),Math.floor(v.y/C),Math.floor(v.z/C)];
  const restAt=(m,i)=>{const v=V().fromBufferAttribute(m.geometry.attributes.position,i);m.applyBoneTransform(i,v);return v.applyMatrix4(m.matrixWorld);};
  const headWeight=(a,i)=>{let h=0;for(let k=0;k<4;k++)if(a.skinIndex.getComponent(i,k)===hi)h+=a.skinWeight.getComponent(i,k);return h;};
  for(let i=0;i<skull.geometry.attributes.position.count;i++){const h=headWeight(skull.geometry.attributes,i);if(h>.98)continue;const v=restAt(skull,i),k=cellOf(v).join(',');if(!grid.has(k))grid.set(k,[]);grid.get(k).push([v,h]);}
  const nearest=v=>{const [x,y,z]=cellOf(v);let best=null,bd=Infinity;for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)for(let dz=-2;dz<=2;dz++)for(const [q,h] of grid.get((x+dx)+','+(y+dy)+','+(z+dz))||[]){const d=q.distanceTo(v);if(d<bd){bd=d;best=h;}}return [bd,best];};
  for(const mesh of worker.parts.filter(m=>m!==skull&&/shirt|overalls|trousers|waistcoat|jacket|neckerchief|collar|belt|pouch|mane/.test(m.name))){const a=mesh.geometry.attributes,mane=/mane/.test(mesh.name);
   for(let i=0;i<a.position.count;i++){const [d,h]=nearest(restAt(mesh,i));if(h===null)continue;const own=headWeight(a,i),want=mane?h:Math.max(own,(1-smooth((d-.015)/.03))*h);if(!mane&&want<=own+1e-6)continue;
    let others=[0,1,2,3].map(k=>[a.skinIndex.getComponent(i,k),a.skinWeight.getComponent(i,k)]).filter(([b,w])=>b!==hi&&w>0).sort((x,y)=>y[1]-x[1]).slice(0,3);if(!others.length)others=[[bi('spine'),1]];
    const sum=others.reduce((s,[,w])=>s+w,0),slots=[[hi,want],...others.map(([b,w])=>[b,w*(1-want)/sum])];while(slots.length<4)slots.push([0,0]);
    a.skinIndex.setXYZW(i,...slots.map(s=>s[0]));a.skinWeight.setXYZW(i,...slots.map(s=>s[1]));}
   a.skinIndex.needsUpdate=a.skinWeight.needsUpdate=true;}}
 const restoreSkin=()=>{for(const {m,index,weight} of savedSkin){m.geometry.attributes.skinIndex.copy(index);m.geometry.attributes.skinWeight.copy(weight);m.geometry.attributes.skinIndex.needsUpdate=m.geometry.attributes.skinWeight.needsUpdate=true;}};

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
 const headPose=(pitchQ,dir)=>{const f=V([1,0,0]).applyQuaternion(pitchQ),pitch=Math.asin(clamp(f.y,-1,1)),th=bendOf(pitch);return headOffset.clone().addScaledVector(dir,NECK*along(th)).addScaledVector(NECK_AXIS,-NECK*drop(th));};
 const bendDir=f=>{const d=f.clone().addScaledVector(NECK_AXIS,-f.dot(NECK_AXIS));if(d.lengthSq()<1e-9)d.set(1,0,0);return d.normalize();};
 const hangAt=(s,yaw)=>{const q=turn([0,1,0],yaw),sh=bones['upperArm'+s].getWorldPosition(V());limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],sh.add(HANG[s].clone().applyQuaternion(q)),BEND[s].arm.clone().applyQuaternion(q));};

 // ---- fitted to this rig: how far the head can turn and nod, and the chest twist, before skin goes through cloth ----
 // Skin goes through cloth where a head, forearm or glove triangle crosses a torso triangle on the skinned meshes, an edge of
 // either piercing the other. Triangles are sorted by the rig's own weights: every corner more than half to the head, to one
 // forearm, hand and fingers, or to the spine and hips (a sleeve rides with its arm and does not count against it). The rest
 // pose already has crossings (neck skin under a collar, an arm a coat sits over), and moving slides them along: a crossing
 // within two triangles, on both sides, of one in the rest pose is that crossing slid along. A crossing whose edge pokes
 // through by 2 mm or less (about a pixel at the study's close-up scale) is a graze. Any other crossing fails a pose.
 const fits=FITS.get(fingerprint(worker))??(()=>{
  const orig=new Map(savedSkin.map(s=>[s.m,s])),weightOf=(mesh,i,re)=>{const {index,weight}=orig.get(mesh);let w=0;for(let k=0;k<4;k++)if(re.test(worker.bones[index.getComponent(i,k)].name))w+=weight.getComponent(i,k);return w;};
  const trisOf=re=>worker.parts.flatMap(mesh=>{const g=mesh.geometry,a=g.attributes,ix=g.index?g.index.array:null,n=ix?ix.length:a.position.count,out=[];
   for(let t=0;t<n;t+=3){const v=ix?[ix[t],ix[t+1],ix[t+2]]:[t,t+1,t+2];if(v.every(i=>weightOf(mesh,i,re)>.5))out.push({mesh,a,v,by:new Set(v.flatMap(i=>[0,1,2,3].filter(k=>a.skinWeight.getComponent(i,k)>0).map(k=>worker.bones[a.skinIndex.getComponent(i,k)].name)))});}return out;});
  // Neighbours share a corner, matched by position so that a seam in the mesh does not cut them apart.
  const ringed=list=>{const byCorner=new Map();list.forEach((t,n)=>{t.keys=t.v.map(i=>t.mesh.uuid+':'+V().fromBufferAttribute(t.a.position,i).toArray().map(x=>Math.round(x*1e4)).join(','));for(const k of t.keys){if(!byCorner.has(k))byCorner.set(k,[]);byCorner.get(k).push(n);}});
   const one=n=>new Set(list[n].keys.flatMap(k=>byCorner.get(k))),memo=new Map();list.ring=n=>{let r=memo.get(n);if(!r){r=new Set();for(const m of one(n))for(const x of one(m))r.add(x);memo.set(n,r);}return r;};list.forEach((t,id)=>t.id=id);return list;};
  const skinTri=({mesh,a,v})=>v.map(i=>{const p=V().fromBufferAttribute(a.position,i);mesh.applyBoneTransform(i,p);return p.applyMatrix4(mesh.matrixWorld);});
  // Moller-Trumbore: how far the segment a-b pokes through triangle t (its nearer end's distance from the plane), or -1.
  const pierce=(a,b,t)=>{const d=b.clone().sub(a),e1=t[1].clone().sub(t[0]),e2=t[2].clone().sub(t[0]),p=d.clone().cross(e2),det=e1.dot(p);if(Math.abs(det)<1e-12)return -1;
   const s=a.clone().sub(t[0]),u=s.dot(p)/det;if(u<0||u>1)return -1;const q=s.clone().cross(e1),w=d.dot(q)/det;if(w<0||u+w>1)return -1;const h=e2.dot(q)/det;if(h<=0||h>=1)return -1;
   return Math.min(h,1-h)*Math.abs(d.dot(e1.clone().cross(e2).normalize()));};
  // Every crossing of probed and torso triangles, as 'probed:torso' ids with how far it pokes through. Both lists sit in
  // 4 cm cells by their bounds, so a pair that crosses always shares a cell.
  const CELL=.04,cells=(t,f)=>{const lo=[0,1,2].map(k=>Math.floor(Math.min(t[0].getComponent(k),t[1].getComponent(k),t[2].getComponent(k))/CELL)),hi=[0,1,2].map(k=>Math.floor(Math.max(t[0].getComponent(k),t[1].getComponent(k),t[2].getComponent(k))/CELL));for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)f(x+','+y+','+z);};
  const crossings=(A,B)=>{const grid=new Map(),out=new Map();B.forEach(({p},n)=>cells(p,k=>{if(!grid.has(k))grid.set(k,[]);grid.get(k).push(n);}));
   A.forEach(({p:t},ia)=>{const seen=new Set();cells(t,k=>{for(const ib of grid.get(k)||[]){if(seen.has(ib))continue;seen.add(ib);const u=B[ib].p;let depth=-1;for(const [i,j] of [[0,1],[1,2],[2,0]])depth=Math.max(depth,pierce(t[i],t[j],u),pierce(u[i],u[j],t));if(depth>=0)out.set(ia+':'+B[ib].id,depth);}});});return out;};
  const torsoT=ringed(trisOf(/^(spine|hips)$/));
  // Torso triangles that a probe's bones do not move are skinned once, in the rest pose.
  const probe=moves=>{worker.pose('neutral');root.updateMatrixWorld(true);return {movers:torsoT.filter(t=>[...t.by].some(moves)),still:torsoT.filter(t=>![...t.by].some(moves)).map(t=>({id:t.id,p:skinTri(t)}))};};
  const contact=(set,{movers,still})=>{root.updateMatrixWorld(true);return crossings(set.map(t=>({p:skinTri(t)})),still.concat(movers.map(t=>({id:t.id,p:skinTri(t)}))));};
  const isNew=(rest,set)=>{const byA=new Map();for(const k of rest.keys()){const [a,b]=k.split(':').map(Number);if(!byA.has(a))byA.set(a,[]);byA.get(a).push(b);}
   return (k,depth)=>{if(depth<=.002||rest.has(k))return false;const [a,b]=k.split(':').map(Number),near=torsoT.ring(b);for(const x of set.ring(a))for(const y of byA.get(x)||[])if(near.has(y))return false;return true;};};
  // The largest angle, in 5 degree steps, at which a pose makes no new crossing, less 5 degrees kept in hand for the idle's
  // other motions (a lean, a breath or a tilt the probe does not make); the probe runs 5 degrees past its top for that.
  const fit=(set,moves,pose,top)=>{const torso=probe(moves),fresh=isNew(contact(set,torso),set);let ok=0;
   for(let deg=5;deg<=top+5;deg+=5){worker.pose('neutral');pose(deg*DEG);if([...contact(set,torso)].some(([k,d])=>fresh(k,d)))break;ok=deg;}
   worker.pose('neutral');root.updateMatrixWorld(true);return Math.min(top,Math.max(0,ok-5));};
  const headT=ringed(trisOf(/^head$/)),moveHead=(yaw,nod,roll)=>{const q=turn([0,1,0],yaw).multiply(turn([0,0,1],-nod)).multiply(turn([1,0,0],roll));bones.head.position.copy(headPose(q,bendDir(V([1,0,0]).applyQuaternion(q))));bones.head.quaternion.copy(q);root.updateMatrixWorld(true);};
  // The head turning on the chest each way, level or tilted 5 degrees either way, up to the 40 degrees the neck seam allows;
  // then nodding (the neck bent as in at()), straight, turned as far as 24 degrees either way, or tilted 5 degrees either way;
  // and looking up the same ways (the back of the skull drops toward the back of a collar).
  const yaw=Object.fromEntries([1,-1].map(s=>[s,Math.min(...[0,5,-5].map(roll=>fit(headT,b=>b==='head',a=>moveHead(s*a,0,roll*DEG),IDLE.neck)))]));
  const ways=[[0,0],[Math.min(24,yaw[1]),0],[-Math.min(24,yaw[-1]),0],[0,5],[0,-5]];
  const nod=Math.min(...ways.map(([y,roll])=>fit(headT,b=>b==='head',a=>moveHead(y*DEG,a,roll*DEG),45))),up=Math.min(...ways.map(([y,roll])=>fit(headT,b=>b==='head',a=>moveHead(y*DEG,-a,roll*DEG),10)));
  // The chest twisting on the hips each way, the arms hanging as in at(): a pot belly or a thick coat twists less, and the
  // hips and head take the rest of a wide look.
  const armT=ringed([-1,1].flatMap(s=>trisOf(new RegExp('^(hand|fingers|forearm)'+s+'$'))));
  const twist=Object.fromEntries([1,-1].map(dir=>[dir,fit(armT,b=>b!=='hips'&&!/^(thigh|shin|hoof)/.test(b),a=>{bones.spine.quaternion.copy(turn([0,1,0],dir*a));root.updateMatrixWorld(true);for(const s of [-1,1])hangAt(s,dir*a*.5);},30)]));
  // The arms against the posture. Leaning fully toward each hoof (the hips carried about 7 cm over and hiked, as the
  // balance will carry them) the hip juts toward the hand on that side, and with the chest rounded its full 10 degrees
  // the hands hang nearer the coat. An arm that crosses the clothes there swings out as little as clears them, in half
  // degrees, and a degree more for what the probe does not do (the arm's heading lagging the trunk, the elbow easing).
  const posture=(w,flex,out)=>{worker.pose('neutral');bones.hips.position.copy(restHips).add(V([0,-POSTURE.sink*w*w,.072*w]));bones.hips.quaternion.copy(trunkQ(0,0,POSTURE.roll*DEG*w));bones.spine.quaternion.copy(trunkQ(0,flex*DEG,-POSTURE.lean*DEG*w));root.updateMatrixWorld(true);
   for(const s of [-1,1]){const q=turn([1,0,0],-s*out[s]*DEG),sh=bones['upperArm'+s].getWorldPosition(V());limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],sh.add(HANG[s].clone().multiplyScalar(reachAt(s,1.5)).applyQuaternion(q)),BEND[s].arm.clone().applyQuaternion(q));}};
  const all=probe(()=>true),armsFresh=isNew(contact(armT,all),armT),clears=(w,flex,out)=>{posture(w,flex,out);return ![...contact(armT,all)].some(([k,d])=>armsFresh(k,d));};
  const least=test=>{if(test(0))return 0;for(let a=.5;a<=4;a+=.5)if(test(a))return a+1;return 5;};
  const swing={lean:Object.fromEntries([-1,1].map(s=>[s,least(a=>clears(s,0,{[s]:a,[-s]:0}))])),round:least(a=>clears(0,10,{[-1]:a,[1]:a}))};
  worker.pose('neutral');root.updateMatrixWorld(true);
  const out={nod,up,yaw,twist,swing};FITS.set(fingerprint(worker),out);return out;})();
 const nodLimit=fits.nod,upLimit=fits.up,twistLimit=fits.twist,yawLimit=fits.yaw,swing=fits.swing;
 // The trunk turns only for looks too wide for the neck: the head keeps up to about 34 degrees of a turn (or what this rig
 // allows), and the trunk takes the rest, half in the chest (up to 12 degrees, or what this rig allows) and the remainder in
 // the hips, up to about 10 degrees on planted hooves, turning at the hip joints. Looking down rounds the chest forward a
 // little, and as much more as the face cannot nod, up to 10 degrees; it rounds with the head rather than after it, so the
 // muzzle never reaches the chest on the way down.
 const headShare=y=>{const H=Math.min(34,yawLimit[y<0?-1:1]);return H>0?H*Math.tanh(y/H):0;},trunkYaw=y=>y-headShare(y),chestPitch=p=>Math.min(10,Math.max(.30*Math.max(0,-12-p),-p-nodLimit));
 const chestTwist=y=>{const c=.5*trunkYaw(y),top=Math.min(12,twistLimit[c<0?-1:1]);return top>0?top*Math.tanh(c/top):0;},hipsTwist=y=>{const h=trunkYaw(y)-chestTwist(y);return 10*Math.tanh(h/10);};
 // What this rig can look at: the head no more than 35 degrees (or its fitted turn) from the chest either way, down by its
 // fitted nod and the chest's 10 degrees, and up by its fitted look up.
 const neckTop=s=>Math.min(35,yawLimit[s]),reachYaw=s=>{let lo=0,hi=90;for(let i=0;i<30;i++){const m=(lo+hi)/2;if(m-chestTwist(s*m)*s-hipsTwist(s*m)*s<=neckTop(s))lo=m;else hi=m;}return lo;};
 const reach={left:reachYaw(1),right:reachYaw(-1),down:nodLimit+10,up:upLimit};
 const r=random(seed),looks=lookPlan(r,L,reach),stances=stancePlan(r,L),breaths=breathPlan(r,L);
 const ch=(key,fn,part)=>steps(fn(looks.home[key]),looks.list.map(l=>{const [cd,cs,hd,hs]=TIMINGS[l.trunk||0],[d,k]=part==='chest'?[cd,cs]:part==='hips'?[hd,hs]:[0,1];return [l.time+d,l.dur*k,fn(l[key])];}));
 let gazeYaw,gazePitch,gazeRoll,chestYaw,hipsYaw,chestFlex;
 const build=()=>{gazeYaw=ch('yaw',y=>y);gazePitch=ch('pitch',p=>p);gazeRoll=ch('roll',x=>x);chestYaw=ch('yaw',chestTwist,'chest');hipsYaw=ch('yaw',hipsTwist,'hips');chestFlex=ch('pitch',chestPitch);};
 for(const l of looks.list)for(l.trunk=0;;l.trunk++){build();const [,,hd,hs]=TIMINGS[l.trunk];let peak=0;for(let t=l.time;t<=l.time+hd+hs*l.dur;t+=.01)peak=Math.max(peak,Math.abs(gazeYaw(t)-chestYaw(t)-hipsYaw(t)));if(peak<=Math.min(36,neckTop(1)+1,neckTop(-1)+1)||l.trunk===TIMINGS.length-1)break;}
 build();
 const weight=steps(0,stances.map(s=>[s.time,s.dur,s.side]));
 const breath=t=>{const b=breaths.find(b=>t<b.time+b.dur)||breaths.at(-1),u=(t-b.time)/b.dur;return b.amp*(u<b.inhale?smooth(u/b.inhale):1-smooth((u-b.inhale)/(1-b.inhale)));};
 // The head never rests perfectly still, the pressure point under the hooves wanders a few millimetres, and the elbows
 // and wrists ease a little.
 const drift={yaw:wave(r,L,4,22,.45),pitch:wave(r,L,4,22,.30),x:wave(r,L,3,14,.0035),z:wave(r,L,3,14,.0022),curl:wave(r,L,2,9,.04),elbow:[wave(r,L,2,8,.6),wave(r,L,2,8,.6)],wrist:[wave(r,L,2,9,2.5*DEG),wave(r,L,2,9,2.5*DEG)]};
 // Where the pressure point rests: under the centre of mass of the rest pose, unless that is within 4 cm of an edge of
 // the soles (a digitigrade foot, a heel-heavy stance), in which case it moves in toward the middle of the soles until it
 // is 4 cm clear. Leaning toward one hoof moves it up to 4.5 cm that way, less on a narrow stance, so that it stays
 // 4.5 cm inside the soles (4 cm, and the few millimetres it wanders); on the horse's stance the nearer hoof then carries
 // 55-65% of the weight. The hips follow it toward that hoof and hike (the pelvis rolls 4.5 degrees, that hip up) so the
 // nearer leg does not buckle; the other leg, its hoof planted wide, reaches out as a prop.
 // The soles are the vertices of each hoof, boot or foot within 3 mm of the floor (a boot heel can sit a millimetre or two
 // up in the mesh); the toe and heel are their front and back.
 const FLOOR=Object.fromEntries([-1,1].map(s=>{const f=worker.parts.find(p=>/hoof|boot|foot/.test(p.name)&&p.name.endsWith(' '+s));if(!f)throw Error('Idle needs a hoof, boot or foot on each side');
  const a=f.geometry.attributes.position,out=[];for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);f.applyBoneTransform(i,p);p.applyMatrix4(f.matrixWorld);if(p.y<.003)out.push(p);}if(out.length<3)throw Error('Idle needs a sole on the floor: '+f.name);return [s,out];}));
 const soles=hull2([...FLOOR[-1],...FLOOR[1]].map(p=>[p.x,p.z])),TOE={},HEEL={};
 for(const s of [-1,1]){const z=FLOOR[s].reduce((a,p)=>a+p.z,0)/FLOOR[s].length;TOE[s]=V([Math.max(...FLOOR[s].map(p=>p.x)),0,z]);HEEL[s]=V([Math.min(...FLOOR[s].map(p=>p.x)),0,z]);}
 const soleMid=(()=>{let a=0,x=0,z=0;for(let i=0;i<soles.length;i++){const [x0,z0]=soles[i],[x1,z1]=soles[(i+1)%soles.length],c=x0*z1-x1*z0;a+=c;x+=(x0+x1)*c;z+=(z0+z1)*c;}return [x/(3*a),z/(3*a)];})();
 const centre=P=>{const c=V();for(const [a,b,m] of SEGMENTS)c.addScaledVector(P[a],m/2).addScaledVector(P[b],m/2);return c.divideScalar(MASS);};
 let SHIFT=.045,base=[0,0];
 const copAt=t=>[base[0]+drift.x(t),base[1]+SHIFT*weight(t)+drift.z(t)];
 const wrap=t=>((t%L)+L)%L;

 // ---- pure kinematics for a given horizontal pelvis path xz(t); nothing is integrated ----
 function kinematics(xz,lag){
  const memo=new Map();
  function trunk(t){let k=memo.get(t);if(k)return k;const w=weight(t),qp=trunkQ(hipsYaw(t)*DEG,0,POSTURE.roll*DEG*w),local=trunkQ(chestYaw(t)*DEG,(chestFlex(t)-BREATH.chest*breath(t))*DEG,-POSTURE.lean*DEG*w),[dx,dz]=xz(t);
   const hips=restHips.clone().add(V([dx,-POSTURE.sink*w*w,dz]));k={hips,qp,local,qc:qp.clone().multiply(local),chest:hips.clone().add(spineOffset.clone().applyQuaternion(qp)),shrug:BREATH.shrug*breath(t)};if(memo.size>256)memo.clear();memo.set(t,k);return k;}
  // The head aims in world space; its turn from the chest is capped smoothly at the 40 degrees the neck seam allows, and
  // its nod at the limit fitted to this rig. The neck bends like a heavy branch toward where the face points, square to
  // the neck's own axis, and carries the head out over the chest rather than tipping the jaw into it.
  function head(t,tr){const want=turn([0,1,0],(gazeYaw(t)+drift.yaw(t))*DEG).multiply(turn([0,0,1],(gazePitch(t)+drift.pitch(t))*DEG)).multiply(turn([1,0,0],gazeRoll(t)*DEG));
   let q=tr.qc.clone().invert().multiply(want);const e=new T.Euler().setFromQuaternion(q,'YZX'),low=-nodLimit*DEG,ease=6*DEG;
   if(e.z<low+ease){e.z=low+ease-ease*Math.tanh((low+ease-e.z)/ease);q=Q().setFromEuler(e);}
   const v=logq(q),a=v.length(),k=30*DEG,top=IDLE.neck*DEG;if(a>k)q=expq(v.multiplyScalar((k+(top-k)*Math.tanh((a-k)/(top-k)))/a));
   return {q,offset:headPose(q,bendDir(V([1,0,0]).applyQuaternion(q)))};}
  // The arms hang from the shoulders, which rise as the chest breathes in, along a heading a beat behind the trunk's. An
  // arm swings out only as far as this rig needs to clear its clothes: as its hip juts toward it in a lean, or as the chest
  // rounds. The elbows bend and straighten a few degrees over the loop, and the hands hang on from the forearms, the
  // wrists easing.
  function arm(t,tr,s){const sh=tr.chest.clone().add(SHOULDER[s].clone().add(V([0,tr.shrug,0])).applyQuaternion(tr.qc)),q=turn([0,1,0],lag(t)*DEG),out=turn([1,0,0],-s*(swing.lean[s]*ramp(s*weight(t))/ramp(1)+swing.round*chestFlex(t)/10)*DEG);
   return {sh,wrist:sh.clone().add(HANG[s].clone().multiplyScalar(reachAt(s,1.5+drift.elbow[s>0?1:0](t))).applyQuaternion(out).applyQuaternion(q)),pole:BEND[s].arm.clone().applyQuaternion(out).applyQuaternion(q),q};}
  const kneePole=(t,s)=>BEND[s].leg.clone().applyQuaternion(turn([0,1,0],.15*hipsYaw(t)*DEG));
  // Segment end points for balance (the same two-bone solutions the bones receive in at()).
  function body(t){const tr=trunk(t),h=head(t,tr),P={pelvis:tr.hips,chest:tr.chest},neck=tr.chest.clone().add(h.offset.clone().applyQuaternion(tr.qc));P.neck=neck;P.headTip=V([.14,.32,0]).applyQuaternion(tr.qc.clone().multiply(h.q)).add(neck);
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
 const lag=loopSpline(loopLag(GRID.map(t=>hipsYaw(t)+.5*chestYaw(t)),DT,Math.min(...Object.values(twistLimit))<10?5:2,.55),DT);
 function plan(k){const P=GRID.map(t=>k.body(t)),C=P.map(centre),Lm=P.map((B,i)=>momentum(P[(i-1+N)%N],B,P[(i+1)%N],C[i],DT));
  const ydd=C.map((c,i)=>(C[(i+1)%N].y-2*c.y+C[(i-1+N)%N].y)/(DT*DT)),Fy=ydd.map(a=>MASS*(G+a)),w2=Fy.map((f,i)=>f/(MASS*C[i].y));
  const dL=Lm.map((l,i)=>Lm[(i+1)%N].clone().sub(Lm[(i-1+N)%N]).divideScalar(2*DT));
  const X=loopPendulum(w2,GRID.map((t,i)=>copAt(t)[0]-dL[i].z/Fy[i]),DT),Z=loopPendulum(w2,GRID.map((t,i)=>copAt(t)[1]+dL[i].x/Fy[i]),DT);
  const rows=GRID.map((t,i)=>{const [dx,dz]=k.xz(t);return [dx+SENSITIVITY*(X[i]-C[i].x),dz+SENSITIVITY*(Z[i]-C[i].z)];}),sx=loopSpline(rows.map(r=>r[0]),DT),sz=loopSpline(rows.map(r=>r[1]),DT);
  return {xz:t=>[sx(t),sz(t)],residual:Math.max(...GRID.map((t,i)=>Math.hypot(X[i]-C[i].x,Z[i]-C[i].z)))};}
 // The rest pose's centre of mass sets where the pressure point rests (see above).
 {const k=kinematics(()=>[0,0],lag),c=centre(k.body(0)),q=[c.x,c.z],m=inside(soles,q);
  if(m>=.04)base=[c.x,0];else{let lo=0,hi=1;for(let i=0;i<30;i++){const u=(lo+hi)/2,p=[q[0]+(soleMid[0]-q[0])*u,q[1]+(soleMid[1]-q[1])*u];if(inside(soles,p)>=.04)hi=u;else lo=u;}base=[q[0]+(soleMid[0]-q[0])*hi,0];}
 const across=[];for(let i=0;i<soles.length;i++){const [x0,z0]=soles[i],[x1,z1]=soles[(i+1)%soles.length];if((x0-base[0])*(x1-base[0])<=0&&x0!==x1)across.push(z0+(z1-z0)*(base[0]-x0)/(x1-x0));}
 SHIFT=clamp(Math.min(Math.max(...across),-Math.min(...across))-.045,0,.045);}
 // The legs must reach their planted hooves everywhere round the loop; if a lean would stretch a leg past 99.5% of its
 // reach, the lean is made gentler until none does.
 let kin,balance,stretch=0;
 for(let tries=0;tries<4;tries++){kin=kinematics(()=>[0,0],lag);for(let pass=0;pass<4;pass++){balance=plan(kin);kin=kinematics(balance.xz,lag);}
  stretch=0;for(const t of GRID){const P=kin.body(t);for(const s of [-1,1])stretch=Math.max(stretch,P['hip'+s].distanceTo(ANKLE[s])/(LENGTH[s].leg[0]+LENGTH[s].leg[1]));}
  if(stretch<.995)break;SHIFT*=.8;}
 if(stretch>=.995){restoreSkin();worker.pose('neutral');throw Error('Idle pose unreachable on this rig: a leg would stretch to '+(stretch*100).toFixed(1)+'% of its reach');}
 const {trunk,head,arm,kneePole,body}=kin;

 // ---- posing ----
 const eyeAt=(tr,h)=>tr.chest.clone().add(h.offset.clone().applyQuaternion(tr.qc)).add(EYE.clone().applyQuaternion(tr.qc.clone().multiply(h.q)));
 const lookAt=t=>looks.list.reduce((cur,l)=>t>=l.time?l:cur,{...looks.home,time:0,dur:0,kind:'home',label:lookLabel(looks.home)});
 const stanceAt=t=>{const w=weight(t),s=stances.reduce((cur,x)=>t>=x.time?x:cur,null),moving=s&&t<s.time+s.dur;return {weight:w,label:moving?'Shifting weight':Math.abs(w)<.5?'Standing square':w<0?'Leaning toward the left hoof':'Leaning toward the right hoof'};};
 return {worker,length:L,seed,fitted:{nod:nodLimit,up:upLimit,yaw:{...yawLimit},twist:{...twistLimit},swing:{lean:{...swing.lean},round:swing.round},reach:{...reach},neck:NECK,lean:SHIFT},
  schedule:{looks:looks.list.map(l=>({...l})),stances:stances.map(s=>({...s})),breaths:breaths.map(b=>({...b}))},
  balance:{residual:balance.residual,rest:[...base],cop:t=>copAt(live(t)),centre:t=>centre(body(live(t)))},
  // Where the eyes are pointed (world point 6 m out, or on the floor when looking down), for overlays and tests.
  gaze(t){t=live(t);const tr=trunk(t),h=head(t,tr),eye=eyeAt(tr,h),dir=V([1,0,0]).applyQuaternion(tr.qc.clone().multiply(h.q));const reach=dir.y<-.05?Math.min(6,eye.y/-dir.y):6;return {eye,dir,target:eye.clone().addScaledVector(dir,reach),want:{yaw:gazeYaw(t),pitch:gazePitch(t),roll:gazeRoll(t)}};},
  at(t){time=live(t);root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');
   const tr=trunk(time);bones.hips.position.copy(tr.hips);bones.hips.quaternion.copy(tr.qp);bones.spine.quaternion.copy(tr.local);const h=head(time,tr);bones.head.position.copy(h.offset);bones.head.quaternion.copy(h.q);
   for(const s of [-1,1])bones['upperArm'+s].position.copy(ARM_ROOT[s]).add(V([0,tr.shrug,0]));root.updateMatrixWorld(true);
   for(const s of [-1,1]){limb(bones['thigh'+s],bones['shin'+s],bones['hoof'+s],ANKLE[s].clone(),kneePole(time,s));rotate(bones['hoof'+s],Q());
    const a=arm(time,tr,s);limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],a.wrist,a.pole);bones['hand'+s].quaternion.multiply(turn([0,0,1],drift.wrist[s>0?1:0](time)));bones['fingers'+s].rotation.z=-.08+drift.curl(time+s*7);}
   root.updateMatrixWorld(true);worker.skeleton.update();
   const look=lookAt(time),stance=stanceAt(time);
   state={time,phase:look.label,turning:time<look.time+look.dur,look:{label:look.label,yaw:gazeYaw(time),pitch:gazePitch(time),roll:gazeRoll(time)},stance:stance.label,weight:stance.weight,breath:breath(time),
    feet:Object.fromEntries([-1,1].map(s=>[s,{ankle:bones['hoof'+s].getWorldPosition(V()).toArray(),contact:'flat',planted:true}])),hips:bones.hips.getWorldPosition(V()).toArray(),chest:bones.spine.getWorldPosition(V()).toArray()};
   return state;},
  diagnostics(){return state;},
  dispose(){if(disposed)return;disposed=true;restoreSkin();worker.pose('neutral');}
 };
}
