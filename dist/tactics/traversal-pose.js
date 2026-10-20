import * as T from './vendor/three.module.js';
// Shared posing for tile-to-tile traversals (window, waist-high wall, 2 m wall): trunk placement, two-bone
// limbs that keep their bend-plane twist, the segment mass model the physics audit uses, and an exact skinned
// probe of the visible surface so contacts are placed where the clothes actually touch.
export const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion(),DEG=Math.PI/180;
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const AX={x:V(1,0,0),y:V(0,1,0),z:V(0,0,1)},turn=(axis,a)=>Q().setFromAxisAngle(AX[axis],a);
// Orientation from yaw (about up), roll (about forward, +X) and a forward pitch (the top tips toward +X).
export const bodyQ=(pitch=0,roll=0,yaw=0)=>turn('y',yaw).multiply(turn('x',roll)).multiply(turn('z',-pitch));
// Quintic Hermite through [t,...values] rows (C2: a cubic's acceleration steps at every key, which reads as a
// jolt of force). Slopes are Catmull-Rom, limited so a channel never overshoots its keys; key accelerations come
// from the neighbouring slopes. pins fixes a key's slope ({index: [slopes]}). A channel sampled densely from a
// solver (not authored keys) passes {limit:false}: plain central slopes, since a flat slope forced at every sampled
// extremum steps the velocity inside one segment (the balance shift turning at a 5 ms key: 2 cm/s, read as 8 m/s^2).
// accel fixes a key's acceleration ({index: [accelerations]}): a fall from rest keyed v = 0 and a = -g at both ends
// is exactly the free-fall parabola between them.
export function track(rows,pins={},{limit=true,accel={}}={}){
 const keys=rows.map(([t,...p])=>({t,p})),n=keys.length;if(n<2)throw Error('A track needs two keys');
 keys.forEach((k,i)=>{const a=keys[i-1],b=keys[i+1];k.v=pins[i]||k.p.map((x,j)=>{if(!a||!b)return 0;const m=(b.p[j]-a.p[j])/(b.t-a.t);if(!limit)return m;const l=(x-a.p[j])/(k.t-a.t),r=(b.p[j]-x)/(b.t-k.t);if(l*r<=0)return 0;return Math.sign(m)*Math.min(Math.abs(m),3*Math.abs(l),3*Math.abs(r));});});
 keys.forEach((k,i)=>{k.a=accel[i]||k.p.map((x,j)=>i&&i<n-1?(keys[i+1].v[j]-keys[i-1].v[j])/(keys[i+1].t-keys[i-1].t):0);});
 return t=>{let i=1;while(i<n-1&&t>keys[i].t)i++;const a=keys[i-1],b=keys[i],dt=b.t-a.t,u=clamp((t-a.t)/dt),u2=u*u,u3=u2*u,u4=u3*u,u5=u4*u;
  const h0=1-10*u3+15*u4-6*u5,h1=u-6*u3+8*u4-3*u5,h2=.5*u2-1.5*u3+1.5*u4-.5*u5,h3=.5*u3-u4+.5*u5,h4=-4*u3+7*u4-3*u5,h5=10*u3-15*u4+6*u5;
  return a.p.map((x,j)=>h0*x+h5*b.p[j]+dt*(h1*a.v[j]+h4*b.v[j])+dt*dt*(h2*a.a[j]+h3*b.a[j]));};
}
export const smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
export const basisQ=(x,y)=>{const Y=V(...y).normalize(),X=V(...x).addScaledVector(Y,-V(...x).dot(Y)).normalize();return Q().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,X.clone().cross(Y)));};
// Palm on a surface: palm normal (+X of the hand) into the surface, wrist (+Y) back along the forearm, fingers
// toward heading (degrees from +X toward +Z).
export const palmDown=(heading=0)=>{const a=heading*DEG;return basisQ([0,-1,0],[-Math.cos(a),0,-Math.sin(a)]);};
// Heading in degrees from +X toward +Z (the battle's map convention), as a turn about up.
export const yawQ=deg=>Q().setFromAxisAngle(V(0,1,0),-deg*DEG);
// A joint's turn relative to its parent: forward flex, side bend, twist (degrees).
export const relQ=(flex=0,side=0,twist=0)=>Q().setFromAxisAngle(V(0,1,0),twist*DEG).multiply(Q().setFromAxisAngle(V(1,0,0),side*DEG)).multiply(bodyQ(flex*DEG));
// Keyed limbs: per limb, [time, key] rows; a key is a point in a frame ('world', or 'pelvis' / 'chest': carried by
// the trunk), with an optional hoof pitch (degrees, toe down) and heading, or a palm-down heading. Between keys in
// different frames both are taken to world at the current time and blended; an orientation fades in or out (w)
// where a key has none, so a hoof or hand never flips at a hand-over.
export const frameToWorld=(tr,frame,p)=>frame==='world'?V(...p):frame==='pelvis'?V(...p).applyQuaternion(tr.hipsQ).add(tr.hips):V(...p).applyQuaternion(tr.chestQ).add(tr.chest);
export function keyedLimb(keys,t,tr){let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const [ta,a]=keys[i],[tb,b]=keys[Math.min(keys.length-1,i+1)];
 const u=tb>ta?smooth((t-ta)/(tb-ta)):1,pa=frameToWorld(tr,a.f,a.p),pb=frameToWorld(tr,b.f,b.p),lerp=(x,y,k)=>x+(y-x)*k;
 const has=k=>k.hoof!==undefined,hp=has(a)?a.hoof:b.hoof,hq=has(b)?b.hoof:a.hoof,pal=k=>k.palm!==undefined;
 // knee: an optional bend direction in the pelvis frame ([x, y, z], z mirrored per side), blended like the point.
 // lift: on a key a foot or hand pushes off from, how far the straightened limb may leave its mark until the next key
 // (a toe-off as the trunk rises, a hand letting go early), without counting as a shortfall. plant: a foot set on the
 // floor or a wall face, given as the surface's outward normal (true: the floor), which a clearance fit moves only out
 // along it (plant: both keys' normals and the blend, so a foot going from a face to the floor never switches at once).
 const kn=k=>k.knee||[1,0,.25],knee=kn(a).map((v,j)=>lerp(v,kn(b)[j],u));
 // elbow: an optional bend direction in the chest frame (z mirrored per side), weighted in (elbowW) over the arm's
 // own rule where a key has none.
 const pn=p=>p===true?[0,1,0]:p||null,el=k=>k.elbow,elbow=el(a)||el(b)?(el(a)||el(b)).map((v,j)=>lerp(v,(el(b)||el(a))[j],u)):undefined;
 // soft (metres): on a key carried by the trunk next to a floor key, the end's height between them is the smooth
 // maximum of the two (softplus over soft), and it moves along the floor only while it is off it (g: how far down, held
 // to zero at the trunk key; the blends are smooth ors, u + (1 - u) g, as a min or max kinked where its sides crossed and
 // stepped the centre of mass's velocity by 0.1 m/s at a toe-off). Leaving a mark, a hoof stays down until the leg's own reach lifts it; coming down, it
 // slows onto the mark. Driven at an unreachable mark instead, a leg locks straight and its knee whips as it frees or
 // catches (14 m/s at a toe-off). The softplus never quite reaches either key, so its gap is taken out at both ends with
 // (1 - u)^3 and u^3 (a 2 mm step there read as 2,000 m/s^2). Mid-segment the leg's soft reach (zone) widens to 2 soft,
 // back to the exact one at both keys (stepped at the trunk key, a leg already near its reach jumped): a leg asked past
 // its reach stays bent, and a falling hoof slows onto the floor over about 3 zones of the hips' travel instead of
 // stopping in the last centimetre. The zone is what it adds to the IK's exact soft reach (.015): taken as the larger
 // of the two, it kinked where it passed it and the hoof jumped at 110 m/s^2.
 const sk=a.soft&&b.f==='world'&&b.plant===true?a:b.soft&&a.f==='world'&&a.plant===true?b:null;let p=pa.clone().lerp(pb,u),g=0,zone=0;
 if(sk){const W=sk===a?pb:pa,F=sk===a?pa:pb,s=sk.soft,d=(F.y-W.y)/s,top=W.y+s*(d>30?d:Math.log1p(Math.exp(d))),v=1-u,
   down=1/(1+Math.exp(Math.min(30,d)));g=down*(sk===a?1-v*v*v:1-u*u*u);
  p=pa.clone().lerp(pb,sk===a?u+v*g:u*(1-g));p.y=top+(pa.y-top)*v*v*v+(pb.y-top)*u*u*u;zone=Math.max(0,2*s-.015)*smooth(Math.min(u,v)/.25);}
 // arc (metres): on a key, the end rises that much mid-way from the key before, 64 u^3 (1 - u)^3 (C2 at both keys): a
 // step in one swing, where a mid-step key stopped the hoof in the air and the swing leg's turning read as 640 N·m.
 if(b.arc){const q=tb>ta?clamp((t-ta)/(tb-ta))*(1-clamp((t-ta)/(tb-ta))):0;p.y+=b.arc*64*q*q*q;}
 return {f:'world',p:p.toArray(),knee,lift:a.lift||0,hoof:has(a)||has(b)?lerp(hp??0,hq??0,u):undefined,hoofW:lerp(has(a)?1:0,has(b)?1:0,u),heading:lerp(a.heading||0,b.heading||0,u),
  palm:pal(a)||pal(b)?lerp(pal(a)?a.palm:b.palm,pal(b)?b.palm:a.palm,u):undefined,palmW:lerp(pal(a)?1:0,pal(b)?1:0,u),
  elbow,elbowW:lerp(el(a)?1:0,el(b)?1:0,u),plantW:(w=>w+(1-w)*g)(lerp(a.plant?1:0,b.plant?1:0,u)),plant:[pn(a.plant),pn(b.plant),u],zone};}
// The body pose for a trunk (hips, hipsQ, spineQ, headQ, chest, chestQ) and world limb targets. Knees bend
// forward of the pelvis; elbows back and out from the chest, or toward elbowAway (world) while a palm is planted.
// A palm is never placed below the floor. poles(id) may replace a limb's bend direction (steadyPoles), offsets(id)
// move its end target (a clearance fit) and snaps(id) set a planted end onto its surface (unmasked); id is 'leg-1',
// 'leg1', 'arm-1' or 'arm1'. turns(bone) gives a partial hand
// or hoof turn its way round (steadyTurns). A planted contact stays on its surface: a planted foot or palm takes only
// the part of an offset out along its surface's normal (a toe-down hoof lifting its heel, a palm rising onto a sill, a
// long foot set off a wall face), not the slide (moved out by its forearm on an edge, a gripping hand left the wall top
// by 5 to 14 cm).
const outward=(off,w,n)=>{if(!(w>0)||!n)return off.clone();const N=V(...n).normalize(),out=Math.max(0,off.dot(N));return off.clone().multiplyScalar(1-w).addScaledVector(N,out*w);};
export function posedFrom(tr,limbs,{elbowAway=null,poles=null,offsets=null,snaps=null,turns=null}={}){const legs={},arms={};for(const s of [-1,1]){const l=limbs['leg'+s],a=limbs['arm'+s];
  const kn=l.knee||[1,0,.25],ankle=frameToWorld(tr,l.f,l.p),lo=offsets?.('leg'+s);if(lo){const [na,nb,u]=l.plant||[null,null,0];ankle.add(outward(lo,1,na).multiplyScalar(1-u).addScaledVector(outward(lo,1,nb),u));}const ls=snaps?.('leg'+s);if(ls)ankle.add(ls);
  legs[s]={ankle:ankle.toArray(),pole:(poles?.('leg'+s)||V(kn[0],kn[1],s*kn[2]).applyQuaternion(tr.hipsQ)).toArray(),q:l.hoof!==undefined?yawQ(l.heading||0).multiply(bodyQ(l.hoof*DEG)):null,w:l.hoofW??1,slack:l.lift||0,zone:l.zone||0,ref:turns?.('hoof'+s)||null};
  const k=a.palm!==undefined?a.palmW??1:0,pole=V(-.3,-.2,s).applyQuaternion(tr.chestQ);if(elbowAway)pole.lerp(V(...elbowAway),k);
  if(a.elbow&&a.elbowW>0)pole.lerp(V(a.elbow[0],a.elbow[1],s*a.elbow[2]).applyQuaternion(tr.chestQ),a.elbowW);const wrist=frameToWorld(tr,a.f,a.p),ao=offsets?.('arm'+s);if(ao)wrist.add(outward(ao,k,[0,1,0]));const as=snaps?.('arm'+s);if(as)wrist.add(as);wrist.y=Math.max(wrist.y,.06);
  arms[s]={wrist:wrist.toArray(),pole:(poles?.('arm'+s)||pole).toArray(),q:a.palm!==undefined?'palm':null,palm:a.palm,w:a.palmW??1,slack:a.lift||0,ref:turns?.('hand'+s)||null,palmRef:turns?.('palm'+s)??null};}
 return {hips:tr.hips.toArray(),hipsQ:tr.hipsQ,spineQ:tr.spineQ,headQ:tr.headQ,legs,arms};}
// Bend directions that do not flip. A two-bone limb bends toward its pole; where the limb's axis swings through the
// pole, the bend would change sides within a frame (a knee or elbow snapping across). Sampled every step seconds, the
// bend side follows the authored pole where it is well defined, is carried over from the sample before where the pole
// lies nearly along the limb, and turns toward a changed side only as fast as the limb allows: freely when it is nearly
// straight (the bend hardly shows), 2 degrees per 5 ms when it is bent. sample(t) gives, per limb id, {start, target,
// pole, reach} (world). Returns poleAt(id, t), the side to bend toward.
export function steadyPoles(duration,sample,{step=.005}={}){
 const n=Math.max(2,Math.round(duration/step)+1),dt=duration/(n-1),rows={};
 for(let k=0;k<n;k++){const t=k*dt;for(const [id,l]of Object.entries(sample(t))){
  const axis=V(...l.target).sub(V(...l.start)),len=axis.length();axis.normalize();const p=V(...l.pole),perp=p.clone().addScaledVector(axis,-p.dot(axis)),c=perp.length()/Math.max(1e-9,p.length());
  const list=rows[id]||(rows[id]=[]),prev=list.at(-1)?.side;let side;
  if(!prev)side=c>1e-6?perp.normalize():V(1,0,0);
  else{const cur=prev.clone().addScaledVector(axis,-prev.dot(axis));if(cur.lengthSq()<1e-12)cur.copy(perp.lengthSq()>1e-12?perp:V(1,0,0));cur.normalize();
   const want=c>.2?perp.normalize():cur,ang=Math.atan2(cur.clone().cross(want).dot(axis),clamp(cur.dot(want),-1,1)),lim=(2+13*smooth((len/l.reach-.9)/.09))*DEG*(dt/.005);
   side=cur.applyAxisAngle(axis,clamp(ang,-lim,lim)).normalize();}
  list.push({t,side});}}
 const tracks=Object.fromEntries(Object.entries(rows).map(([id,list])=>[id,track(list.map(r=>[r.t,...r.side.toArray()]))]));
 return (id,t)=>{const tr=tracks[id];return tr?V(...tr(clamp(t,0,duration))).normalize():null;};
}
// Ways round for partial hand and hoof turns. Sampled every step seconds (turnsAt(t) poses the motion and returns the
// body's turns), each turn's axis is kept continuous: where the short way's axis reverses (the turn passing 180
// degrees), the long way is kept, except where switching back to the short way is cheap: a partial turn of weight w
// jumps 360 x min(w, 1-w) degrees when its way changes, so a turn within SWITCH degrees of done or undone takes the short way again
// (kept, a hand released at 180 degrees went on the long way to 280 and spun; at 4 degrees the switch itself popped a
// palm 4 mm). A palm's yaw blend (delta, degrees) is
// unwrapped by whole turns. Returns ref(bone, t): the axis (or delta) that names the way round at the nearest sample.
const SWITCH=.1;
export function steadyTurns(duration,turnsAt,{step=.005}={}){
 const n=Math.max(2,Math.round(duration/step)+1),dt=duration/(n-1),axes={};
 for(let k=0;k<n;k++)for(const x of turnsAt(k*dt)){const list=axes[x.bone]||(axes[x.bone]=new Array(n).fill(null)),prev=list[k-1];
  if(x.delta!==undefined){list[k]=typeof prev==='number'?x.delta+360*Math.round((prev-x.delta)/360):x.delta;continue;}
  const a=V(...x.axis);if(prev&&a.dot(prev)<0&&360*Math.min(x.w,1-x.w)>=SWITCH)a.negate();list[k]=a;}
 return (bone,t)=>axes[bone]?.[clamp(Math.round(t/dt),0,n-1)]??null;
}
// A posed spec's limbs, for steadyPoles: where each starts once the trunk is posed, its end target, pole and reach.
export function limbSample(body,spec){body.pose(spec,'poles');const out={};
 for(const s of [-1,1]){out['leg'+s]={start:body.bones['thigh'+s].getWorldPosition(V()).toArray(),target:spec.legs[s].ankle,pole:spec.legs[s].pole,reach:body.L[s].thigh+body.L[s].shin};
  out['arm'+s]={start:body.bones['upperArm'+s].getWorldPosition(V()).toArray(),target:spec.arms[s].wrist,pole:spec.arms[s].pole,reach:body.L[s].upper+body.L[s].fore};}
 return out;}
const logq=q=>{const w=clamp(q.w,-1,1),s=Math.sqrt(1-w*w);return s<1e-9?V():V(q.x,q.y,q.z).multiplyScalar(2*Math.acos(w)/s);};
const expq=r=>{const a=r.length();return a<1e-12?Q():Q().setFromAxisAngle(r.clone().divideScalar(a),a);};
// Orientation keys [t, quaternion] joined by cubic rotation-vector segments (C1): angular velocity flows through
// a key unless the rotation reverses there; the ends start and stop at rest. Pass w:[...] per key to pin a rate
// (world angular velocity, rad/s) where a keyed stretch meets a computed one.
// A trunk orientation keyed as heading, pitch and roll (degrees): each angle on its own quintic track (C2), composed as
// yawQ(heading) x bodyQ(pitch, roll). spinTrack's cubic in the log of the turn steps the angular acceleration at every
// key, and each key's change is taken about a different reference: the head and chest jerked sideways at a key of the
// climb's turn onto the tile (headTip 55 m/s^2 within 2 ms; 42% of the body's weight of phantom push).
export function angleTrack(rows){const tr=track(rows);return t=>{const [h,p,r]=tr(t);return yawQ(h).multiply(bodyQ(p*DEG,r*DEG));};}
export function spinTrack(rows){
 const keys=rows.map(([t,q,w])=>({t,q:q.clone().normalize(),pin:w}));for(let i=1;i<keys.length;i++)if(keys[i].q.dot(keys[i-1].q)<0)keys[i].q.set(-keys[i].q.x,-keys[i].q.y,-keys[i].q.z,-keys[i].q.w);
 const d=keys.slice(1).map((k,i)=>logq(k.q.clone().multiply(keys[i].q.clone().invert())));
 keys.forEach((k,i)=>{if(k.pin){k.w=k.pin.clone();return;}if(!i||i===keys.length-1){k.w=V();return;}const a=d[i-1].clone().divideScalar(k.t-keys[i-1].t),b=d[i].clone().divideScalar(keys[i+1].t-k.t);k.w=a.dot(b)<=0?V():a.add(b).multiplyScalar(.5);});
 return t=>{let i=1;while(i<keys.length-1&&t>keys[i].t)i++;const a=keys[i-1],b=keys[i],dt=b.t-a.t,u=clamp((t-a.t)/dt),u2=u*u,u3=u2*u;
  return expq(d[i-1].clone().multiplyScalar(3*u2-2*u3).addScaledVector(a.w,dt*(u3-2*u2+u)).addScaledVector(b.w,dt*(u3-u2))).multiply(a.q);};
}
// The 74.9 kg segment model of the phantom-wrench traversal rig (de Leva-like fractions), so the plan and the
// audit agree on where the centre of mass is. Points are named as the rig names them.
export const MASS_SEGMENTS=Object.freeze([['pelvis','chest',16],['chest','neck',6],['neck','headTip',6],...[-1,1].flatMap(s=>[['pelvis','hip'+s,3],['chest','shoulder'+s,3.5],
 ['shoulder'+s,'elbow'+s,1.9],['elbow'+s,'wrist'+s,1.1],['wrist'+s,'palm'+s,.45],['hip'+s,'knee'+s,9.5],['knee'+s,'ankle'+s,3],['ankle'+s,'toe'+s,1]])]);
export const BODY_MASS=MASS_SEGMENTS.reduce((m,s)=>m+s[2],0);
// Point masses for inertia: each uniform rod as Simpson's three points (m/6, 2m/3, m/6), which is exact for its
// moment of inertia about any axis.
export function massPoints(P){const out=[];for(const [a,b,m]of MASS_SEGMENTS)out.push([P[a],m/6],[P[b],m/6],[P[a].clone().add(P[b]).multiplyScalar(.5),2*m/3]);return out;}
export function inertiaAbout(points,origin,axis){let I=0;for(const [x,m]of points)I+=m*axis.clone().cross(x.clone().sub(origin)).lengthSq();return I;}
const HEAD_TIP=[.14,.32,0],PALM=[.052,-.010,0],TOE=[.13,-.10,0];
export function createTraversalBody(worker){
 // A limb asked past its reach is stretched straight toward the target, never thrown on mid-battle, and the
 // shortfall is recorded in warnings (a reach still on its way to a surface, or one the keys should not ask for; the
 // scratch audits list them). Within SOFT of full reach the
 // limb straightens asymptotically (soft IK): the bend grows as the square root of the distance short of full reach,
 // so a hard reach throws the knee or elbow centimetres in a millisecond as a target passes in or out of it. The soft
 // reach, L - SOFT (1 + x) e^(-2x) past the knee, is C2 there (a plain exponential steps the end's acceleration by
 // v^2/SOFT: standing legs sit at the knee, and the body's centre of mass shivered 8 m/s^2), leaves the end short by
 // at most 0.27 SOFT at full reach and is exact closer in.
 const warnings=[],SOFT=.015;
 const root=worker.root,bones=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
 for(const n of ['hips','spine','head',...[-1,1].flatMap(s=>['upperArm','forearm','hand','thigh','shin','hoof'].map(b=>b+s))])if(!bones[n])throw Error('Traversal rig is missing bone '+n);
 root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');root.updateMatrixWorld(true);
 const rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())])),at0=n=>rest.get(bones[n]).clone(),len=(a,b)=>at0(a).distanceTo(at0(b));
 const restQ=new Map(worker.bones.map(b=>[b,b.quaternion.clone()])),restP=new Map(worker.bones.map(b=>[b,b.position.clone()]));
 const L={},BEND={};for(const s of [-1,1]){L[s]={thigh:len('thigh'+s,'shin'+s),shin:len('shin'+s,'hoof'+s),upper:len('upperArm'+s,'forearm'+s),fore:len('forearm'+s,'hand'+s)};
  const bent=(a,b,c)=>{const o=at0(a+s),axis=at0(c+s).sub(o).normalize(),e=at0(b+s).sub(o);return e.addScaledVector(axis,-e.dot(axis)).normalize();};BEND[s]={leg:bent('thigh','shin','hoof'),arm:bent('upperArm','forearm','hand')};}
 const offsets={spine:at0('spine').sub(at0('hips')),head:at0('head').sub(at0('spine')),thigh:{},shoulder:{}};for(const s of [-1,1]){offsets.thigh[s]=at0('thigh'+s).sub(at0('hips'));offsets.shoulder[s]=at0('upperArm'+s).sub(at0('spine'));}
 function rotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));b.updateMatrixWorld(true);}
 const basis=(d,n)=>{const x=d.clone().normalize(),z=n.clone().addScaledVector(x,-n.dot(x)).normalize();return new T.Matrix4().makeBasis(x,z.clone().cross(x),z);};
 const align=(d0,n0,d1,n1)=>Q().setFromRotationMatrix(basis(d1,n1).multiply(basis(d0,n0).transpose()));
 // Two-bone limb: the elbow or knee bends toward pole, and the rest bend plane maps onto the posed one, so the
 // thigh and forearm turn with the pelvis and shoulder (no candy-wrapper twist). Throws outside native reach.
 let label='';
 function limb(a,b,c,target,pole,slack=0,zone=0){const ra=rest.get(a),rb=rest.get(b),rc=rest.get(c),start=a.getWorldPosition(V()),l1=ra.distanceTo(rb),l2=rb.distanceTo(rc),S=SOFT+zone;let d=target.distanceTo(start);
  if(d>l1+l2+slack+1e-6||d<Math.abs(l1-l2)-1e-6)warnings.push({bone:a.name,label,over:d-(l1+l2)});
  const knee0=l1+l2-S,x=(d-knee0)/S,tgt=d>knee0?start.clone().addScaledVector(target.clone().sub(start).normalize(),(d=l1+l2-S*(1+x)*Math.exp(-2*x))):target;
  const axis=tgt.clone().sub(start).normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),side=pole.clone().addScaledVector(axis,-pole.dot(axis));if(side.lengthSq()<1e-12)side.copy(V(1,0,0).addScaledVector(axis,-axis.x));side.normalize();
  const mid=start.clone().addScaledVector(axis,along).addScaledVector(side,Math.sqrt(Math.max(0,l1*l1-along*along)));
  const d0a=rb.clone().sub(ra),d0b=rc.clone().sub(rb),n0=d0a.clone().cross(d0b).normalize(),d1a=mid.clone().sub(start),d1b=tgt.clone().sub(mid);
  // The posed bend plane's normal is side x axis exactly (d1a x d1b points the same way while the limb bends), and it
  // stays defined as the limb straightens, where the cross of the two bones turns to noise and the forearm or shin
  // would spin about its own length.
  const n1=side.clone().cross(axis).normalize();
  rotate(a,align(d0a,n0,d1a,n1));rotate(b,align(d0b,n0,d1b,n1));return mid;}
 // A pose: hips (world position + bodyQ), chest and head relative to their parents, then each limb's end point
 // (world wrist or ankle), its bend direction (world) and the hand or hoof orientation (world). Without one the
 // hand or hoof keeps its rest turn on the forearm or shin; w (0..1) blends from that toward q, so a hoof can
 // lift off a planted orientation without popping.
 // turns: for the last pose, each partial hand or hoof turn's angle (degrees) between its follow and its target, for
 // finding flips (a turn near 180 degrees changes its way round).
 const turns=[];
 // A palm laid flat: the least turn that brings the palm (the hand's +X) face down from where the forearm holds it, so
 // the fingers point as the forearm's twist leaves them (a fixed heading asked for up to 177 degrees of wrist). With the
 // palm facing up that turn has no axis and would swing between frames, so there it gives way to the authored heading:
 // both are palm down and differ only by a twist about the vertical.
 // Both ends are palm down, so they differ by a yaw: blended as an angle whose way round (ref, steadyTurns) stays
 // continuous, since a slerp switches sides where the two headings pass opposite (an 80-degree snap of the hand).
 const palmFrom=(b,heading,s,ref=null)=>{const f=b.getWorldQuaternion(Q()),x=V(1,0,0).applyQuaternion(f),least=Q().setFromUnitVectors(x,V(0,-1,0)).multiply(f),w=smooth((x.y-.6)/.35);
  if(!(w>0)||heading===undefined)return least;if(w>=1)return palmDown(heading);
  const fing=V(0,-1,0).applyQuaternion(least),yaw=Math.atan2(fing.z,fing.x)/DEG;let delta=((heading-yaw)%360+540)%360-180;
  if(ref!==null)delta+=360*Math.round((ref-delta)/360);turns.push({bone:'palm'+s,delta});return palmDown(yaw+w*delta);};
 // A partial turn goes the short way round unless ref (an axis kept continuous over time, steadyTurns) says the long
 // way: past 180 degrees the short way switches sides, and the hand would jump.
 const endTurn=(b,q,w=1,ref=null)=>{if(!q||w<=0)return;const f=b.getWorldQuaternion(Q());if(w>=1){rotate(b,q);return;}
  const r=q.clone().multiply(f.clone().invert());if(r.w<0)r.set(-r.x,-r.y,-r.z,-r.w);let angle=2*Math.acos(clamp(r.w,-1,1)),axis=V(r.x,r.y,r.z);const sn=axis.length();axis=sn>1e-9?axis.divideScalar(sn):V(1,0,0);
  // The record is the short way (what steadyTurns keeps continuous); used is the angle actually turned through.
  const rec={bone:b.name,w,angle:angle/DEG,axis:axis.toArray(),from:f.toArray(),to:q.toArray()};if(ref&&axis.dot(ref)<0){axis.negate();angle=2*Math.PI-angle;}
  rec.used=angle/DEG;turns.push(rec);rotate(b,Q().setFromAxisAngle(axis,angle*w).multiply(f));};
 function pose(p,tag=''){label=tag;turns.length=0;root.position.set(0,0,0);root.quaternion.identity();for(const b of worker.bones){b.position.copy(restP.get(b));b.quaternion.copy(restQ.get(b));}
  bones.hips.position.copy(V(...p.hips));bones.hips.quaternion.copy(p.hipsQ);bones.spine.quaternion.copy(p.spineQ||Q());bones.head.quaternion.copy(p.headQ||Q());root.updateMatrixWorld(true);
  for(const s of [-1,1]){const leg=p.legs?.[s];if(leg){limb(bones['thigh'+s],bones['shin'+s],bones['hoof'+s],V(...leg.ankle),V(...leg.pole),leg.slack||0,leg.zone||0);endTurn(bones['hoof'+s],leg.q,leg.w,leg.ref);}
   const arm=p.arms?.[s];if(arm){limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],V(...arm.wrist),V(...arm.pole),arm.slack||0);endTurn(bones['hand'+s],arm.q==='palm'?palmFrom(bones['hand'+s],arm.palm,s,arm.palmRef??null):arm.q,arm.w,arm.ref);}}
  root.updateMatrixWorld(true);return points();}
 const world=(b,local)=>V(...local).applyQuaternion(b.getWorldQuaternion(Q())).add(b.getWorldPosition(V()));
 // The rig's named points, read from the posed bones.
 function points(){const P={pelvis:bones.hips.getWorldPosition(V()),chest:bones.spine.getWorldPosition(V()),neck:bones.head.getWorldPosition(V()),headTip:world(bones.head,HEAD_TIP)};
  for(const s of [-1,1])Object.assign(P,{['hip'+s]:bones['thigh'+s].getWorldPosition(V()),['knee'+s]:bones['shin'+s].getWorldPosition(V()),['ankle'+s]:bones['hoof'+s].getWorldPosition(V()),['toe'+s]:world(bones['hoof'+s],TOE),
   ['shoulder'+s]:bones['upperArm'+s].getWorldPosition(V()),['elbow'+s]:bones['forearm'+s].getWorldPosition(V()),['wrist'+s]:bones['hand'+s].getWorldPosition(V()),['palm'+s]:world(bones['hand'+s],PALM)});return P;}
 const com=(P=points())=>{const c=V();for(const [a,b,m]of MASS_SEGMENTS)c.addScaledVector(P[a],m/2).addScaledVector(P[b],m/2);return c.divideScalar(BODY_MASS);};
 return {worker,root,bones,rest,at0,L,BEND,offsets,pose,points,com,rotate,world,warnings,turns};
}
// The visible surface, skinned exactly (four weights, as three.js does) for a subset of every body mesh's
// vertices: where the clothes, hooves and hands really are, for placing contacts. bone[i] is the bone that carries
// the most of point i (named in boneNames), so a fit can tell torso from head; vertex[i] is its index in its mesh.
// keep(mesh, index) can drop single vertices (a tail but for its root).
export function createSurfaceProbe(worker,{stride=2,include=()=>true,keep=()=>true}={}){
 const sets=worker.parts.filter(include).map(mesh=>{const g=mesh.geometry,pos=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,idx=[];for(let i=0;i<pos.count;i+=stride)if(keep(mesh,i))idx.push(i);
  const n=idx.length,base=new Float32Array(n*3),bi=new Uint16Array(n*4),bw=new Float32Array(n*4),dom=new Uint16Array(n),vi=Uint32Array.from(idx),v=V();
  idx.forEach((i,k)=>{v.fromBufferAttribute(pos,i).applyMatrix4(mesh.bindMatrix);base[k*3]=v.x;base[k*3+1]=v.y;base[k*3+2]=v.z;let most=-1;for(let j=0;j<4;j++){bi[k*4+j]=si.getComponent(i,j);bw[k*4+j]=sw.getComponent(i,j);if(bw[k*4+j]>most){most=bw[k*4+j];dom[k]=bi[k*4+j];}}});
  return {mesh,n,base,bi,bw,dom,vi};});
 const count=sets.reduce((s,x)=>s+x.n,0),x=new Float32Array(count),y=new Float32Array(count),z=new Float32Array(count),part=new Uint8Array(count),m=new T.Matrix4(),post=new T.Matrix4();
 const names=sets.map(s=>s.mesh.name),bone=new Uint16Array(count),vertex=new Uint32Array(count),boneNames=(sets[0]?.mesh.skeleton.bones||[]).map(b=>b.name);
 {let k0=0;for(const s of sets){bone.set(s.dom,k0);vertex.set(s.vi,k0);k0+=s.n;}}
 function update(){let k0=0;sets.forEach((s,pi)=>{const sk=s.mesh.skeleton,mats=sk.bones.map((b,i)=>new T.Matrix4().multiplyMatrices(b.matrixWorld,sk.boneInverses[i]).elements);post.multiplyMatrices(s.mesh.matrixWorld,s.mesh.bindMatrixInverse);const P=post.elements;
  for(let k=0;k<s.n;k++){const bx=s.base[k*3],by=s.base[k*3+1],bz=s.base[k*3+2];let vx=0,vy=0,vz=0;for(let j=0;j<4;j++){const w=s.bw[k*4+j];if(!w)continue;const e=mats[s.bi[k*4+j]];vx+=w*(e[0]*bx+e[4]*by+e[8]*bz+e[12]);vy+=w*(e[1]*bx+e[5]*by+e[9]*bz+e[13]);vz+=w*(e[2]*bx+e[6]*by+e[10]*bz+e[14]);}
   const i=k0+k;x[i]=P[0]*vx+P[4]*vy+P[8]*vz+P[12];y[i]=P[1]*vx+P[5]*vy+P[9]*vz+P[13];z[i]=P[2]*vx+P[6]*vy+P[10]*vz+P[14];part[i]=pi;}k0+=s.n;});return api;}
 // The lowest surface point among those accepted by keep(x,y,z,partName).
 function lowest(keep=()=>true){let best=null;for(let i=0;i<count;i++)if((!best||y[i]<best.y)&&keep(x[i],y[i],z[i],names[part[i]]))best={x:x[i],y:y[i],z:z[i],part:names[part[i]]};return best;}
 const api={count,x,y,z,part,names,bone,vertex,boneNames,update,lowest};return api;
}
