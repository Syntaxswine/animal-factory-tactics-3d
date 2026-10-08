import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createIdle,IDLE,rigKey} from '../dist/tactics/idle-motion.js';
import {createMammalMotion} from '../dist/tactics/animal-motion.js';
const load=file=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url))),horseData=load('horse-10k-data.json'),V=a=>new T.Vector3(...(a||[0,0,0])),DEG=180/Math.PI;
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed),profileOf=id=>MAMMALS.find(p=>p.id===id);
// The rig's own skin weights, kept before the idle blends the clothes at the waist and the neck.
const snapshot=worker=>new Map(worker.parts.map(m=>[m,{skinIndex:m.geometry.attributes.skinIndex.clone(),skinWeight:m.geometry.attributes.skinWeight.clone()}]));
function fixture(fn,{seed=1,profile=null,length}={}){const worker=profile?profile.create(load(profile.file)):createLightHorse(horseData),orig=snapshot(worker),motion=createIdle(worker,{seed,eye:profile?.eye??null,...(length?{length}:{})});try{fn({worker,motion,orig});}finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}}
const bone=(worker,name)=>worker.bones.find(b=>b.name===name),wq=(worker,name)=>bone(worker,name).getWorldQuaternion(new T.Quaternion()),wp=(worker,name)=>bone(worker,name).getWorldPosition(V());
const heading=(worker,name)=>{const f=V([1,0,0]).applyQuaternion(wq(worker,name));return Math.atan2(-f.z,f.x)*DEG;};
const onChest=(worker,name)=>wq(worker,'spine').invert().multiply(wq(worker,name));
const neckAngle=worker=>{const q=onChest(worker,'head');return 2*Math.acos(Math.min(1,Math.abs(q.w)))*DEG;};
const foot=(worker,side)=>worker.parts.find(p=>/hoof|boot|foot/.test(p.name)&&p.name.endsWith(' '+side));
// The soles: vertices of each hoof, boot or foot within 3 mm of the floor in the rest pose (a boot heel can sit a
// millimetre or two up in the mesh).
function floorVertices(worker){const out=[];for(const side of [-1,1]){const f=foot(worker,side),a=f.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);f.applyBoneTransform(i,p);p.applyMatrix4(f.matrixWorld);if(p.y<.003)out.push({f,i,p});}}return out;}
function hull(pts){const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];for(const q of p){while(lo.length>=2&&cr(lo.at(-2),lo.at(-1),q)<=0)lo.pop();lo.push(q);}for(const q of [...p].reverse()){while(up.length>=2&&cr(up.at(-2),up.at(-1),q)<=0)up.pop();up.push(q);}return lo.slice(0,-1).concat(up.slice(0,-1));}
function outside(h,q){let inside=h.length>2,best=Infinity;for(let i=0;i<h.length;i++){const a=h[i],b=h[(i+1)%h.length],ex=b[0]-a[0],ez=b[1]-a[1],L=Math.hypot(ex,ez)||1e-12;if((ex*(q[1]-a[1])-ez*(q[0]-a[0]))/L<0)inside=false;const k=Math.max(0,Math.min(1,((q[0]-a[0])*ex+(q[1]-a[1])*ez)/(L*L)));best=Math.min(best,Math.hypot(q[0]-a[0]-k*ex,q[1]-a[1]-k*ez));}return inside?-best:best;}
const knee=(worker,side)=>{const h=wp(worker,'thigh'+side),k=wp(worker,'shin'+side),a=wp(worker,'hoof'+side);return 180-h.sub(k).angleTo(a.sub(k))*DEG;};

test('idle keeps native scale, limb lengths and legal IK over the whole loop, on every mammal and twelve horse seeds',()=>{
 const check=({worker,motion},step)=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);const rest=worker.bones.map(b=>b.position.clone());
  for(let t=0;t<motion.length;t+=step){motion.at(t);assert.deepEqual(worker.root.scale.toArray(),[1,1,1]);
   for(let i=0;i<worker.bones.length;i++){const b=worker.bones[i];assert.ok(Math.abs(b.quaternion.length()-1)<1e-7);if(['hips','spine','head'].includes(b.name))continue;
    // the shoulders shrug as the chest breathes: up along the chest, never more than 15 mm (a sigh), and nothing else moves its joint
    const d=b.position.clone().sub(rest[i]);if(/^upperArm/.test(b.name))assert.ok(Math.hypot(d.x,d.z)<1e-9&&d.y>-1e-9&&d.y<.015,b.name+' shrug '+(d.y*1000).toFixed(2)+' mm');else assert.ok(d.length()<1e-8,b.name);}}};
 for(const seed of [1,2,3,4,5,6,7,8,9,10,11,12])fixture(f=>check(f,seed===1?1/30:.1),{seed});
 for(const profile of MAMMALS)fixture(f=>check(f,.1),{profile,seed:1});
});
test('both hooves stay planted: no floor vertex moves, slides or sinks, on every mammal',()=>{
 for(const profile of [null,...MAMMALS])fixture(({worker,motion})=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);const floor=floorVertices(worker);assert.ok(floor.length>=10,(profile?.id??'horse')+' has '+floor.length+' sole vertices');let worst=0;
  for(let t=0;t<motion.length;t+=.1){motion.at(t);worker.root.updateMatrixWorld(true);for(const {f,i,p} of floor){const q=V().fromBufferAttribute(f.geometry.attributes.position,i);f.applyBoneTransform(i,q);q.applyMatrix4(f.matrixWorld);worst=Math.max(worst,q.distanceTo(p));}
   for(const side of [-1,1])assert.equal(motion.at(t).feet[side].contact,'flat');}
  assert.ok(worst<1e-6,(profile?.id??'horse')+': a floor vertex moved '+(worst*1000).toFixed(4)+' mm');},{profile});
});
test('the hooves can push what the idle needs: the required centre of pressure stays inside the soles on every mammal, and follows the plan',()=>{
 // Dempster (1955) segment fractions, independent of the motion's own balance model, as in the grenade-throw test.
 const KG=75,SEG=[['hips','spine',.281],['spine','head',.216],['head','headTip',.081],...[-1,1].flatMap(s=>[['upperArm'+s,'forearm'+s,.028],['forearm'+s,'hand'+s,.016],['hand'+s,'palm'+s,.006],['thigh'+s,'shin'+s,.10],['shin'+s,'hoof'+s,.0465],['hoof'+s,'toe'+s,.00725],['hoof'+s,'heel'+s,.00725]])];
 const FRACTION=SEG.reduce((s,x)=>s+x[2],0),MASS=KG*FRACTION,report=[];
 for(const profile of MAMMALS)for(const seed of [1,2])fixture(({worker,motion})=>{
  worker.pose('neutral');worker.root.updateMatrixWorld(true);const floor=floorVertices(worker),sole=hull(floor.map(({p})=>[p.x,p.z]));
  const ends=Object.fromEntries([-1,1].map(s=>{const x=floor.filter(({f})=>f===foot(worker,s)).map(({p})=>p);return [s,{toe:V([Math.max(...x.map(p=>p.x)),0,x[0].z]),heel:V([Math.min(...x.map(p=>p.x)),0,x[0].z])}];}));
  const points=t=>{motion.at(t);const P={};for(const b of worker.bones)P[b.name]=b.getWorldPosition(V());P.headTip=V([.14,.32,0]).applyQuaternion(wq(worker,'head')).add(P.head);
   for(const s of [-1,1]){P['palm'+s]=V([.052,-.01,0]).applyQuaternion(wq(worker,'hand'+s)).add(P['hand'+s]);P['toe'+s]=ends[s].toe;P['heel'+s]=ends[s].heel;}return P;};
  const com=P=>{const c=V();for(const [a,b,f] of SEG)c.addScaledVector(P[a].clone().add(P[b]),f/2);return c.divideScalar(FRACTION);},h=.004;
  const momentum=t=>{const A=points(t-h),P=points(t),C=points(t+h),c=com(P),vc=com(C).sub(com(A)).divideScalar(2*h),L=V();
   for(const [a,b,f] of SEG){const m=KG*f,mid=Q=>Q[a].clone().add(Q[b]).multiplyScalar(.5),dir=Q=>Q[b].clone().sub(Q[a]).normalize(),len=P[a].distanceTo(P[b]);L.add(mid(P).sub(c).cross(mid(C).sub(mid(A)).divideScalar(2*h).sub(vc)).multiplyScalar(m)).add(dir(P).cross(dir(C).sub(dir(A)).divideScalar(2*h)).multiplyScalar(m*len*len/12));}return L;};
  let worst=-Infinity,at=0,swing=0;const required=[],planned=[];
  for(let t=.04;t<motion.length;t+=.04){const c=com(points(t)),acc=com(points(t-h)).add(com(points(t+h))).addScaledVector(c,-2).divideScalar(h*h),F=acc.add(V([0,IDLE.gravity,0])).multiplyScalar(MASS),dL=momentum(t+h).sub(momentum(t-h)).divideScalar(2*h);
   const q=[c.x-(c.y*F.x-dL.z)/F.y,c.z-(c.y*F.z+dL.x)/F.y],out=outside(sole,q);if(out>worst){worst=out;at=t;}required.push(q);planned.push(motion.balance.cop(t));}
  // The plan and the requirement move together: as the idle leans, the required pressure point moves the planned
  // amount (the two body models differ by a few millimetres at rest, so the comparison is of changes from the loop mean).
  const mean=a=>[0,1].map(k=>a.reduce((s,x)=>s+x[k],0)/a.length),mr=mean(required),mp=mean(planned);for(let i=0;i<required.length;i++)swing=Math.max(swing,Math.hypot(required[i][0]-mr[0]-(planned[i][0]-mp[0]),required[i][1]-mr[1]-(planned[i][1]-mp[1])));
  report.push(profile.id+' '+seed+': '+(-100*worst).toFixed(1)+' cm in, '+(1000*swing).toFixed(1)+' mm off the plan');
  assert.ok(worst<-.025,profile.id+' seed '+seed+': the required centre of pressure comes within '+(-100*worst).toFixed(1)+' cm of the edge of the soles at '+at.toFixed(2)+' s');
  assert.ok(swing<.006,profile.id+' seed '+seed+': the required centre of pressure strays '+(1000*swing).toFixed(1)+' mm from the planned one');},{profile,seed});
});
test('the loop closes without a seam: pose and velocity match across the wrap, on every mammal and an odd length',()=>{
 const check=({worker,motion})=>{const pose=t=>{motion.at(t);worker.root.updateMatrixWorld(true);return worker.bones.flatMap(b=>b.getWorldPosition(V()).toArray());},h=.001,L=motion.length;
  const a=pose(L-h),b=pose(0),c=pose(h),d=pose(L-2*h),e=pose(2*h);
  for(let i=0;i<b.length;i++){const vBefore=(b[i]-a[i])/h,vAfter=(c[i]-b[i])/h;assert.ok(Math.abs(vBefore-vAfter)<.02,'velocity jumps across the seam of a '+L+' s loop');const accBefore=(b[i]-2*a[i]+d[i])/(h*h),accAfter=(e[i]-2*c[i]+b[i])/(h*h);assert.ok(Math.abs(accBefore-accAfter)<1,'acceleration jumps across the seam');}
  // a wrapped time lands within rounding of the same moment (L need not be a whole number of seconds)
  const same=(x,y)=>x.every((v,i)=>Math.abs(v-y[i])<1e-9);assert.ok(same(pose(L+3.25),pose(3.25)),'time wraps');assert.ok(same(pose(-L+3.25),pose(3.25)),'time wraps backwards too');};
 for(const profile of [null,...MAMMALS])fixture(check,{profile});
 for(const length of [17.77,30.01])fixture(check,{length});
});
test('nothing snaps: no bone accelerates faster than 5 m/s2 anywhere in the loop',()=>{
 // Second differences tiled 1.25 ms apart, so a slope that jumps anywhere (as abs() or max() of a moving value makes, or a
 // bend whose direction flips) lands inside a stencil and reads as tens of m/s2.
 const h=.00125;
 for(const [profile,seed] of [[null,1],[null,2],[null,3],[null,4],[profileOf('pig-foreman'),1],[profileOf('dog'),2]])fixture(({worker,motion})=>{
  const pose=t=>{motion.at(t);worker.root.updateMatrixWorld(true);return worker.bones.map(b=>b.getWorldPosition(V()));};let a=pose(-h),b=pose(0),worst=0,at=0,who='';
  for(let t=0;t<motion.length;t+=h){const c=pose(t+h);b.forEach((p,i)=>{const acc=a[i].clone().add(c[i]).addScaledVector(p,-2).divideScalar(h*h).length();if(acc>worst){worst=acc;at=t;who=worker.bones[i].name;}});a=b;b=c;}
  assert.ok(worst<5,`${profile?.id??'horse'} seed ${seed}: ${who} accelerates at ${worst.toFixed(1)} m/s2 at ${at.toFixed(4)} s`);},{profile,seed});
});
test('the same seed replays exactly; other seeds make other loops; characters on one seed each draw their own',()=>{
 const capture=seed=>{const worker=createLightHorse(horseData),motion=createIdle(worker,{seed});try{const out=[0,4.4,11.1,23.7].map(t=>{motion.at(t);return worker.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]);});return {out,looks:motion.schedule.looks.map(l=>[l.time,l.yaw,l.pitch])};}finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}};
 const a=capture(7),b=capture(7),c=capture(8),d=capture(4294967295),e=capture(0);assert.deepEqual(a,b);assert.notDeepEqual(a.looks,c.looks);assert.notDeepEqual(d.looks,e.looks,'the largest and smallest seeds are different loops');
 // the seed is mixed with the rig's key, so the cast on one seed do not share one choreography
 const plans=new Set();for(const profile of MAMMALS)fixture(({motion})=>{plans.add(JSON.stringify(motion.schedule.looks.map(l=>l.time.toFixed(2))));},{profile,seed:1});
 assert.equal(plans.size,MAMMALS.length,'each of the eleven draws its own looks on seed 1');
});
// The trunk turns in time to keep the head within 36 degrees of the chest (the skinned neck seam allows 40); with the pitch
// and the drift the neck stays under 37. A look aside tilts the head up to 4 degrees, and the head stays level in the
// world as the chest counter-tilts in a lean (1.6 degrees or so), so on the chest it tilts up to about 5.5: within the 10
// the fit probes.
test('the head turns at most 37 degrees from the chest, and tilts at most 6 on it, on every mammal',()=>{
 for(const profile of [null,...MAMMALS])for(const seed of [1,2,3,4])fixture(({worker,motion})=>{let worst=0,at=0,roll=0;for(let t=0;t<motion.length;t+=.02){motion.at(t);const a=neckAngle(worker);if(a>worst){worst=a;at=t;}
   roll=Math.max(roll,Math.abs(new T.Euler().setFromQuaternion(onChest(worker,'head'),'YZX').x*DEG));}
  assert.ok(worst<=37&&worst<=IDLE.neck,(profile?.id??'horse')+' seed '+seed+': the head turns '+worst.toFixed(1)+' degrees from the chest at '+at.toFixed(2)+' s');
  assert.ok(roll<=6,(profile?.id??'horse')+' seed '+seed+': the head tilts '+roll.toFixed(1)+' degrees on the chest');
  // a head that tilts on a look aside tilts into the turn, its crown toward the side it looks to
  for(const l of motion.schedule.looks){if(Math.abs(l.roll)<1)continue;motion.at(l.time+l.dur+.2);const e=new T.Euler().setFromQuaternion(wq(worker,'head'),'YZX');assert.ok(e.x*e.y<0,`${profile?.id??'horse'} seed ${seed}: the head tilts away from a look ${l.yaw>0?'left':'right'}`);}},{profile,seed});
});
test('the eyes land on each look and hold it while the trunk settles, on every mammal',()=>{
 for(const profile of [null,...MAMMALS])for(const seed of [1,2,3,4])fixture(({worker,motion})=>{const looks=motion.schedule.looks;
  looks.forEach((l,i)=>{const t=l.time+1.8*l.dur+.25,next=looks[i+1]?.time??motion.length;if(t>=next)return;motion.at(t);
   const want=V([1,0,0]).applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(0,l.yaw/DEG,l.pitch/DEG,'YZX'))),face=V([1,0,0]).applyQuaternion(wq(worker,'head'));
   assert.ok(face.angleTo(want)*DEG<3,`${profile?.id??'horse'} seed ${seed} ${l.label} at ${t.toFixed(2)} s is ${(face.angleTo(want)*DEG).toFixed(1)} degrees off`);
   // and the head gets there on time: a trunk that turned too late would leave it stalled at the neck's limit
   const soon=l.time+l.dur+.15;if(soon<next&&Math.abs(l.yaw-(i?looks[i-1].yaw:looks.at(-1).yaw))>25){motion.at(soon);const early=V([1,0,0]).applyQuaternion(wq(worker,'head')).angleTo(want)*DEG;assert.ok(early<4,`${profile?.id??'horse'} seed ${seed} ${l.label}: ${early.toFixed(1)} degrees off just after the shift`);}});},{profile,seed});
});
test('on a wide look the head leads, the chest follows and the hips come last; the hips stay within 10 degrees and the knees over the hooves',()=>{
 let checked=0;
 for(const seed of [1,2,3,4,5,6])fixture(({worker,motion})=>{const looks=motion.schedule.looks;
  for(let t=0;t<motion.length;t+=.05){motion.at(t);assert.ok(Math.abs(heading(worker,'hips'))<=10.5,`seed ${seed}: the hips turn ${heading(worker,'hips').toFixed(1)} degrees at ${t.toFixed(2)} s`);
   for(const s of [-1,1])assert.ok(Math.abs(heading(worker,'shin'+s)-heading(worker,'hoof'+s))<4,`seed ${seed}: the ${s} knee twists ${(heading(worker,'shin'+s)-heading(worker,'hoof'+s)).toFixed(1)} degrees off its hoof`);}
  looks.forEach((l,i)=>{const prev=i?looks[i-1].yaw:looks.at(-1).yaw;if(Math.abs(l.yaw-prev)<30)return;const peak={head:[0,0],spine:[0,0],hips:[0,0]};let last=null;
   for(let t=l.time-.05;t<=l.time+2.2*l.dur+.3;t+=.01){motion.at(t);const now={head:heading(worker,'head'),spine:heading(worker,'spine'),hips:heading(worker,'hips')};if(last)for(const k in peak){const v=Math.abs(now[k]-last[k]);if(v>peak[k][0])peak[k]=[v,t];}last=now;}
   assert.ok(peak.head[1]<peak.spine[1]&&peak.spine[1]<=peak.hips[1]+1e-9,`seed ${seed} ${l.label}: head ${peak.head[1].toFixed(2)}, chest ${peak.spine[1].toFixed(2)}, hips ${peak.hips[1].toFixed(2)} s`);checked++;});},{seed});
 assert.ok(checked>=4,'enough wide looks to check');
});
// How far an upper arm hangs out from straight down: a turn of its heading leaves this alone, a swing outward does not.
const fromPlumb=(worker,s)=>{const d=wp(worker,'forearm'+s).sub(wp(worker,'upperArm'+s));return Math.acos(Math.max(-1,Math.min(1,-d.y/d.length())))*DEG;};
test('the arms hang and ease: within 2 degrees of their rest hang where the clothes allow, the elbows bending a little, the hands hanging on, a beat behind the trunk',()=>{
 fixture(({worker,motion})=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);
  const elbow=s=>{const a=wp(worker,'upperArm'+s),e=wp(worker,'forearm'+s),w=wp(worker,'hand'+s);return 180-a.sub(e).angleTo(w.sub(e))*DEG;};
  const rest=Object.fromEntries([-1,1].map(s=>[s,{plumb:fromPlumb(worker,s),elbow:elbow(s)}])),seen=Object.fromEntries([-1,1].map(s=>[s,{lo:Infinity,hi:-Infinity}]));
  for(let t=0;t<motion.length;t+=.05){motion.at(t);for(const s of [-1,1]){const out=Math.abs(fromPlumb(worker,s)-rest[s].plumb);assert.ok(out<2,`the ${s} arm swings ${out.toFixed(1)} degrees from its rest hang at ${t.toFixed(2)} s`);
    const e=elbow(s);seen[s].lo=Math.min(seen[s].lo,e);seen[s].hi=Math.max(seen[s].hi,e);const wrist=2*Math.acos(Math.min(1,Math.abs(bone(worker,'hand'+s).quaternion.w)))*DEG;assert.ok(wrist<8,`the ${s} wrist bends ${wrist.toFixed(1)} degrees`);}}
  for(const s of [-1,1]){assert.ok(seen[s].hi-seen[s].lo>1,`the ${s} elbow eases ${(seen[s].hi-seen[s].lo).toFixed(2)} degrees over the loop`);assert.ok(seen[s].hi<rest[s].elbow+5&&seen[s].lo>rest[s].elbow-1,`the ${s} elbow stays near its rest bend (${seen[s].lo.toFixed(1)}-${seen[s].hi.toFixed(1)}, rest ${rest[s].elbow.toFixed(1)})`);}
  // On the widest look each arm's own heading (its hang from the shoulder, seen from above) reaches half its turn after the
  // trunk's (the hips' and half the chest's twist on them): the arms follow a beat behind.
  const l=motion.schedule.looks.reduce((a,b)=>Math.abs(b.yaw)>Math.abs(a.yaw)?b:a),hangs=s=>{const d=wp(worker,'hand'+s).sub(wp(worker,'upperArm'+s));return Math.atan2(-d.z,d.x)*DEG;},hand=()=>(hangs(1)+hangs(-1))/2,trunk=()=>heading(worker,'hips')+.5*(heading(worker,'spine')-heading(worker,'hips'));
  const end=Math.min(l.time+3,motion.schedule.looks.find(x=>x.time>l.time)?.time??Infinity),series=[];for(let t=l.time-.2;t<end;t+=.01){motion.at(t);series.push([t,trunk(),hand()]);}const half=k=>{const a=series[0][k],b=series.at(-1)[k];return series.find(r=>Math.abs(r[k]-a)>=Math.abs(b-a)/2)[0];};
  assert.ok(half(2)-half(1)>.03,`the hands follow the trunk ${((half(2)-half(1))*1000).toFixed(0)} ms behind`);
 },{seed:1});
 // On every mammal an arm hangs from its rest no further than this rig's fitted swing (as its hip juts toward it in a lean,
 // and as the chest rounds) and 2 degrees for the rest of the motion: the elbow easing and the heading lagging move the
 // upper arm 1.4-1.6 degrees on these rigs, outward and forward alike.
 for(const profile of MAMMALS)fixture(({worker,motion})=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);const {swing}=motion.fitted,rest={[-1]:fromPlumb(worker,-1),[1]:fromPlumb(worker,1)};
  for(let t=0;t<motion.length;t+=.1){motion.at(t);for(const s of [-1,1]){const out=Math.abs(fromPlumb(worker,s)-rest[s]),top=swing.lean[s]+swing.round+2;assert.ok(out<top,`${profile.id}: the ${s} arm swings ${out.toFixed(1)} degrees out at ${t.toFixed(1)} s (its fit allows ${top.toFixed(1)})`);}}},{profile,seed:1});
});
test('looking down, the neck bends forward like a heavy branch and carries the head out over the chest, and the chest rounds for the deepest looks (the goat, whose clothes let it look down furthest)',()=>{
 const goat=profileOf('goat');let deepest=null;for(const seed of [1,2,3,4,5,6,7,8]){const worker=goat.create(load(goat.file)),motion=createIdle(worker,{seed,eye:goat.eye});for(const l of motion.schedule.looks)if(l.label==='Glance down'&&(!deepest||l.pitch<deepest.l.pitch))deepest={seed,l};motion.dispose();worker.skeleton.dispose();worker.dispose();}
 assert.ok(deepest,'a glance down in eight seeds');
 fixture(({worker,motion})=>{const down=deepest.l;worker.pose('neutral');worker.root.updateMatrixWorld(true);const rest=bone(worker,'head').position.clone();
  motion.at(down.time+down.dur+.4);const moved=bone(worker,'head').position.clone().sub(rest),face=V([1,0,0]).applyQuaternion(onChest(worker,'head')),chest=new T.Euler().setFromQuaternion(bone(worker,'spine').quaternion,'YXZ').z*DEG;
  assert.ok(face.y<-.2,'the face is turned down from the chest');assert.ok(moved.x>.03,'the head joint is carried forward '+(moved.x*100).toFixed(1)+' cm');
  assert.ok(moved.length()<.08,'the bend stays within the neck skin');assert.ok(chest<-1,'the chest rounds forward '+(-chest).toFixed(1)+' degrees');
 },{seed:deepest.seed,profile:goat});
});
test('the chest rounds no further than its fitted rounding, on every mammal over four of its own seeds',()=>{
 // the deepest glances ask the chest for 30% of the look below 12 degrees down, up to 10; a rig whose clothes allow less
 // rounds only that far
 MAMMALS.forEach((profile,i)=>{for(const seed of [1,2,3,4].map(k=>k+11*i))fixture(({worker,motion})=>{const top=motion.fitted.rounding;let most=-Infinity,at=0;
  for(let t=0;t<motion.length;t+=.05){motion.at(t);const flex=-new T.Euler().setFromQuaternion(bone(worker,'spine').quaternion,'YXZ').z*DEG;if(flex>most){most=flex;at=t;}}
  assert.ok(most<=top+.25,`${profile.id} seed ${seed} rounds its chest ${most.toFixed(2)} degrees at ${at.toFixed(2)} s (fitted ${top})`);},{profile,seed});});
});
test('leaning toward one hoof: the hips move over toward it and hike, and that leg does not buckle, on every mammal',()=>{
 let checked=0;
 for(const profile of [null,...MAMMALS])for(const seed of [1,2])fixture(({worker,motion})=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);const restKnee={[-1]:knee(worker,-1),[1]:knee(worker,1)},restZ=wp(worker,'hips').z;
  for(const s of motion.schedule.stances){if(!s.side)continue;motion.at(s.time+s.dur+.5);const near=s.side,far=-s.side,id=(profile?.id??'horse')+' seed '+seed;
   const share=motion.fitted.weightShift;assert.ok((wp(worker,'hips').z-restZ)*near>.03*share,`${id}: the hips move toward the hoof (${((wp(worker,'hips').z-restZ)*100).toFixed(1)} cm)`);
   assert.ok(wp(worker,'thigh'+far).y<wp(worker,'thigh'+near).y-.01*share,id+': the near hip hikes above the far one');
   assert.ok(Math.abs(knee(worker,near)-restKnee[near])<3,`${id}: the near knee holds near its rest bend (${knee(worker,near).toFixed(1)} degrees, rest ${restKnee[near].toFixed(1)}), it does not buckle`);
   assert.ok(/^Leaning toward the (left|right) hoof$/.test(motion.at(s.time+s.dur+.5).stance)&&motion.at(s.time+s.dur+.5).stance.includes(near<0?'left':'right'),id+': labelled as a lean toward that hoof');checked++;}},{profile,seed});
 assert.ok(checked>=12,'enough leans to check');
});
test('breathing: 11 to 17 breaths a minute, the inhale shorter than the exhale, one deeper sigh, the shoulders rising on each',()=>fixture(({worker,motion})=>{
 const b=motion.schedule.breaths,perMinute=b.length/motion.length*60;assert.ok(perMinute>11&&perMinute<17,perMinute.toFixed(1)+' breaths a minute');
 assert.ok(b.every(x=>x.inhale<.5),'inhale is the shorter part');assert.equal(b.filter(x=>x.amp>1.5).length,1,'one sigh per loop');
 // Each breath shrugs the shoulders up the chest (3 mm or more, the sigh 10 mm or more), and in the world they rise by a
 // few millimetres on a typical breath, whatever else the body is doing at the time.
 const onSpine=t=>{motion.at(t);const inv=wq(worker,'spine').invert(),c=wp(worker,'spine');return [-1,1].reduce((y,s)=>y+wp(worker,'upperArm'+s).sub(c).applyQuaternion(inv).y/2,0);};
 const inWorld=t=>{motion.at(t);return (wp(worker,'upperArm1').y+wp(worker,'upperArm-1').y)/2-wp(worker,'hips').y;},seen=[];
 for(const x of b){const peak=x.time+x.inhale*x.dur,shrug=onSpine(peak)-onSpine(x.time);assert.ok(shrug>(x.amp>1.5?.010:.003),`a ${x.amp>1.5?'sigh':'breath'} at ${x.time.toFixed(1)} s shrugs the shoulders ${(shrug*1000).toFixed(1)} mm`);if(x.amp<1.5)seen.push(inWorld(peak)-inWorld(x.time));}
 seen.sort((a,b)=>a-b);assert.ok(seen[seen.length>>1]>.0025,'a typical breath lifts the shoulders '+(seen[seen.length>>1]*1000).toFixed(1)+' mm');
}));
test('looks vary: about a dozen gaze shifts a minute, long rests ahead, each loop looks aside and down, sides not strictly alternating, every shift at least 6 degrees',()=>{
 const dwell=[],labels=new Set(),perMinute=[];let repeats=0,pairs=0,tilted=0;
 for(let seed=1;seed<=40;seed++){const worker=createLightHorse(horseData),motion=createIdle(worker,{seed});try{const {looks}=motion.schedule,home=looks.at(-1);
   perMinute.push(looks.length/motion.length*60);assert.ok(looks.some(l=>l.kind==='side')&&looks.some(l=>l.kind==='ground'),'seed '+seed+' looks aside and down');
   let prev=home,side=0;looks.forEach((l,i)=>{labels.add(l.label);assert.ok(Math.hypot(l.yaw-prev.yaw,l.pitch-prev.pitch)>=5.9,'seed '+seed+' look '+i+' barely moves');if(i)dwell.push(l.time-looks[i-1].time-looks[i-1].dur);prev=l;
    if(l.kind==='side'){const s=Math.sign(l.yaw);if(side){pairs++;if(s===side)repeats++;}side=s;}
    // a look aside may tilt the head, gently and into the turn; no other look tilts it
    if(l.roll){assert.ok(l.kind==='side'&&Math.abs(l.roll)>=1.5&&Math.abs(l.roll)<=4&&l.roll*l.yaw<0,`seed ${seed} look ${i} tilts ${l.roll.toFixed(1)} degrees on a ${l.kind} look ${l.yaw.toFixed(0)}`);tilted++;}});}finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}}
 assert.ok(tilted>=5,'some looks aside tilt the head ('+tilted+' in 40 loops)');
 const mean=dwell.reduce((a,b)=>a+b,0)/dwell.length,sd=Math.sqrt(dwell.reduce((a,b)=>a+(b-mean)**2,0)/dwell.length),median=[...perMinute].sort((a,b)=>a-b)[20];
 assert.ok(sd/mean>.3,'fixation times vary (cv '+(sd/mean).toFixed(2)+')');assert.ok(Math.max(...dwell)>=8,'now and then a long rest ('+Math.max(...dwell).toFixed(1)+' s)');
 assert.ok(median>=10&&median<=14.5,'gaze shifts a minute: median '+median.toFixed(1));assert.ok(repeats>0&&repeats<pairs,`side looks repeat a side ${repeats} times in ${pairs}`);
 for(const l of ['Look left','Look right','Glance down','Look ahead','Drift'])assert.ok(labels.has(l),l);
});
test('the fitted limits come from the rig, are reused for its next loops, and bound the looks to what it can reach',()=>{
 const fitted=[];for(const seed of [1,2])fixture(({motion})=>fitted.push(motion.fitted),{seed});
 assert.deepEqual(fitted[0].nod,fitted[1].nod);assert.deepEqual(fitted[0].yaw,fitted[1].yaw);assert.deepEqual(fitted[0].twist,fitted[1].twist);
 for(const profile of [profileOf('pig-foreman'),profileOf('sheep')])for(const seed of [1,2,3])fixture(({motion})=>{const {reach}=motion.fitted;
  for(const l of motion.schedule.looks){assert.ok(l.yaw<=reach.left+.5&&-l.yaw<=reach.right+.5,`${profile.id} looks ${l.yaw.toFixed(1)} degrees, past its reach`);assert.ok(-l.pitch<=reach.down+.5,`${profile.id} looks ${l.pitch.toFixed(1)} degrees down, past its reach`);}},{profile,seed});
});
// The neck as designed, restated apart from the module: a branch three quarters of the spine-to-head span (15-22 cm)
// along the rest neck from the chest bone, bent square to its own axis toward where the face points by the chord of a
// branch loaded at its tip (its tangent turning as theta (2u - u^2) along it), theta all of a downward tilt and half of an
// upward one, eased through level; the head joint rides the branch's tip.
const branch=(theta,f)=>{let a=0;for(let i=0;i<=16;i++){const u=i/16;a+=(i%16?i%2?4:2:1)*f(theta*(2*u-u*u));}return a/48;};
test('the neck is a branch three quarters of the spine-to-head span, bending toward the face: the neck bone and the head joint sit where the bent branch puts them, on every mammal',()=>{
 for(const profile of [null,...MAMMALS])fixture(({worker,motion})=>{const id=profile?.id??'horse',neck=worker.parts[0].skeleton.bones.find(b=>b.name==='idle neck');assert.ok(neck,id+' has its idle neck bone');
  motion.poseHead(0,0,0);const off=wp(worker,'head').sub(wp(worker,'spine')),len=Math.min(.22,Math.max(.15,.75*off.length())),axis=off.clone().normalize(),base=off.clone().addScaledVector(axis,-len);
  assert.ok(neck.position.distanceTo(base)<1e-9,id+': the neck bone stands at the branch base');
  for(const [y,n,roll] of [[0,25,0],[0,-10,0],[30,15,0],[-20,-5,3],[12,0,0],[0,40,0]]){motion.poseHead(y,n,roll);const q=bone(worker,'head').quaternion,f=V([1,0,0]).applyQuaternion(q),pitch=Math.asin(Math.max(-1,Math.min(1,f.y)));
   const th=-pitch*(.75-.25*Math.tanh(pitch/(2/DEG))),d=f.clone().addScaledVector(axis,-f.dot(axis));if(d.lengthSq()<1e-9)d.set(1,0,0);d.normalize();
   const qn=new T.Quaternion().setFromAxisAngle(axis.clone().cross(d).normalize(),Math.atan2(branch(th,Math.sin),branch(th,Math.cos))),tip=base.clone().add(axis.clone().multiplyScalar(len).applyQuaternion(qn));
   assert.ok(neck.quaternion.angleTo(qn)<1e-9,`${id}: the neck bone bends by the branch's chord at ${y}/${n}/${roll}`);assert.ok(bone(worker,'head').position.distanceTo(tip)<1e-9,`${id}: the head joint rides the branch tip at ${y}/${n}/${roll}`);}
 },{profile});
});
test('the arms follow the trunk at 2 Hz, or at 5 Hz on a rig whose chest twists less than 10 degrees either way, and sooner at 5',()=>{
 const behind=(profile,seed)=>{let out=null;fixture(({worker,motion})=>{const {twist,armLag}=motion.fitted;assert.equal(armLag,Math.min(twist[1],twist[-1])<10?5:2,(profile?.id??'horse')+' arm lag');
  const l=motion.schedule.looks.reduce((a,b)=>Math.abs(b.yaw)>Math.abs(a.yaw)?b:a),hangs=s=>{const d=wp(worker,'hand'+s).sub(wp(worker,'upperArm'+s));return Math.atan2(-d.z,d.x)*DEG;},hand=()=>(hangs(1)+hangs(-1))/2,trunk=()=>heading(worker,'hips')+.5*(heading(worker,'spine')-heading(worker,'hips'));
  const end=Math.min(l.time+3,motion.schedule.looks.find(x=>x.time>l.time)?.time??Infinity),series=[];for(let t=l.time-.2;t<end;t+=.005){motion.at(t);series.push([t,trunk(),hand()]);}const half=k=>{const a=series[0][k],b=series.at(-1)[k];return series.find(r=>Math.abs(r[k]-a)>=Math.abs(b-a)/2)[0];};
  out={lag:armLag,delay:half(2)-half(1)};},{profile,seed});return out;};
 const lags=[behind(null,1),...MAMMALS.map((p,i)=>behind(p,3+i))],slow=lags.filter(x=>x.lag===2).map(x=>x.delay),fast=lags.filter(x=>x.lag===5).map(x=>x.delay);
 assert.ok(slow.length&&fast.length,'both kinds of rig');assert.ok(Math.max(...fast)<Math.min(...slow),`5 Hz arms follow sooner (${fast.map(x=>(x*1000).toFixed(0)).join(', ')} ms) than 2 Hz ones (${slow.map(x=>(x*1000).toFixed(0)).join(', ')} ms)`);
});
test('glances down are glances: the gaze comes back up after one, stays below 12 degrees down no more than 4 s at a stretch and a quarter of a loop, over 60 seeds',()=>{
 let longest=0,most=0;
 for(let seed=1;seed<=60;seed++){const worker=createLightHorse(horseData),motion=createIdle(worker,{seed});try{const {looks}=motion.schedule;
   looks.forEach((l,i)=>{const next=looks[i+1];if(l.kind!=='ground'||!next)return;assert.ok(next.kind==='home'||next.kind==='drift',`seed ${seed}: a ${next.kind} look follows a glance down`);
    if(next.kind==='drift')assert.ok(next.pitch>=-10-1e-9&&next.pitch>=l.pitch+6-1e-9,`seed ${seed}: a drift after a glance down rises (${l.pitch.toFixed(1)} to ${next.pitch.toFixed(1)})`);});
   let run=0,below=0;for(let t=0;t<motion.length;t+=.05){motion.at(t);if(motion.diagnostics().look.pitch<-12){run+=.05;below+=.05;longest=Math.max(longest,run);}else run=0;}most=Math.max(most,below/motion.length);}
  finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}}
 assert.ok(longest<=4,`the gaze stays below 12 degrees down ${longest.toFixed(2)} s at a stretch`);assert.ok(most<=.25,`the gaze spends ${(most*100).toFixed(0)}% of a loop below 12 degrees down`);
});
test('every mammal stands and looks about: over four of its loops its head turns 120 degrees a minute or more and sweeps 9 or more, its hips sway 3 cm or more and its elbows ease; all but the two whose clothes hold their heads reach 44 degrees or more to each side and 10 or more down',()=>{
 // A fit that collapsed (a measure that counted every slid crossing, say) would leave a character staring ahead. The two
 // whose heads their clothes still hold are named with what they reach, so that a change to either shows: the sheep (a
 // neckerchief tight on its wool) turns its head 40 degrees left and 10 right and does not nod; the pig director (his
 // jowls resting on his collar) turns his 5 left, none right, and does not nod, and looks about with his trunk.
 const held={sheep:{left:40,right:10,nod:0},'pig-director':{left:5,right:0,nod:0}};
 for(const profile of MAMMALS){const id=profile.id;let path=0,time=0,sway=Infinity,swing=-Infinity,ease=Infinity;
  for(const seed of [1,2,3,4])fixture(({worker,motion})=>{const {reach,yaw,nod}=motion.fitted,elbow=()=>{const a=wp(worker,'upperArm1'),e=wp(worker,'forearm1'),w=wp(worker,'hand1');return 180-a.sub(e).angleTo(w.sub(e))*DEG;};
   if(seed===1){if(held[id])assert.deepEqual({left:yaw[1],right:yaw[-1],nod},held[id],id+' is held as named');
    else assert.ok(reach.left>=44&&reach.right>=44&&reach.down>=10,`${id} reaches ${reach.left.toFixed(1)} / ${reach.right.toFixed(1)} / ${reach.down.toFixed(1)} degrees`);}
   let q0=null,ylo=Infinity,yhi=-Infinity,zlo=Infinity,zhi=-Infinity,elo=Infinity,ehi=-Infinity;
   for(let t=0;t<motion.length;t+=.05){motion.at(t);const q=wq(worker,'head'),y=heading(worker,'head'),z=wp(worker,'hips').z,e=elbow();if(q0)path+=q.angleTo(q0)*DEG;q0=q;
    ylo=Math.min(ylo,y);yhi=Math.max(yhi,y);zlo=Math.min(zlo,z);zhi=Math.max(zhi,z);elo=Math.min(elo,e);ehi=Math.max(ehi,e);}
   time+=motion.length;swing=Math.max(swing,yhi-ylo);sway=Math.min(sway,zhi-zlo);ease=Math.min(ease,ehi-elo);},{profile,seed});
  assert.ok(path/time*60>=120,`${id}: the head turns ${(path/time*60).toFixed(0)} degrees a minute`);assert.ok(swing>=9,`${id}: the head sweeps ${swing.toFixed(1)} degrees at most`);
  assert.ok(sway>=.03,`${id}: the hips sway ${(sway*100).toFixed(1)} cm`);assert.ok(ease>=.3,`${id}: the elbows ease ${ease.toFixed(2)} degrees`);}
});
test('options are checked; every accessor rejects non-finite time; dispose restores the rig, weights and all',()=>{
 const worker=createLightHorse(horseData),orig=snapshot(worker);worker.pose('neutral');worker.root.updateMatrixWorld(true);const rest=worker.bones.map(b=>b.position.clone());
 for(const seed of [NaN,1.5,-1,2**32,'3'])assert.throws(()=>createIdle(worker,{seed}),/seed/,String(seed));
 for(const length of [5,601,Infinity,NaN,'30'])assert.throws(()=>createIdle(worker,{length}),/12 to 600 s/,String(length));
 for(const refit of [1,'yes',null])assert.throws(()=>createIdle(worker,{refit}),/refit/,String(refit));
 for(const eye of [[1,2],[1,NaN,2],'eye',[0,10,0]])assert.throws(()=>createIdle(worker,{eye}),/eye/,String(eye));
 assert.throws(()=>createIdle(worker,null),/options must be an object/);assert.throws(()=>createIdle(worker,{lenght:60}),/"lenght" is not one of/);
 const motion=createIdle(worker,{seed:3,length:19.37});
 try{assert.equal(motion.length,19.37);for(const f of [t=>motion.at(t),t=>motion.gaze(t),motion.balance.cop,motion.balance.centre])assert.throws(()=>f(NaN),/finite/);
  motion.at(7.7);motion.dispose();for(const f of [t=>motion.at(t),t=>motion.gaze(t),motion.balance.cop])assert.throws(()=>f(1),/disposed/);
  worker.bones.forEach((b,i)=>{assert.ok(b.quaternion.angleTo(new T.Quaternion())<1e-9,b.name+' back in the neutral pose');assert.ok(b.position.distanceTo(rest[i])<1e-9,b.name+' back at its joint');});
  for(const m of worker.parts)for(const k of ['skinIndex','skinWeight'])assert.deepEqual([...m.geometry.attributes[k].array],[...orig.get(m)[k].array],m.name+' '+k+' restored');}
 finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}
});
test('the head never rests perfectly still: in every hold of 2 s or more it strays from where it landed, about a degree as a rule',()=>{
 // (the drift: slow noise on the gaze, 0.45 degrees rms in yaw and 0.30 in pitch, under every look)
 for(const profile of [null,profileOf('sheep'),profileOf('pig-director')]){const strays=[];
  for(const seed of [1,2,3,4,5,6,7,8,9,10])fixture(({worker,motion})=>{const looks=motion.schedule.looks,dir=t=>{motion.at(t);return V([1,0,0]).applyQuaternion(wq(worker,'head'));};
   looks.forEach((l,i)=>{const a=l.time+1.8*l.dur+.65,b=looks[i+1]?.time??motion.length;if(b-a<2)return;const d0=dir(a);let most=0;for(let t=a;t<b;t+=.05)most=Math.max(most,dir(t).angleTo(d0)*DEG);strays.push(most);});},{profile,seed});
  strays.sort((a,b)=>a-b);const id=profile?.id??'horse';assert.ok(strays.length>=20,id+': enough holds');
  assert.ok(strays[0]>=.15,`${id}: a hold where the head strays only ${strays[0].toFixed(2)} degrees`);assert.ok(strays[strays.length>>1]>=.6,`${id}: the head strays ${strays[strays.length>>1].toFixed(2)} degrees in a typical hold`);}
});
test('the chest turns on the hips a beat after the head and before the hips: its own twist follows its own timing',()=>{
 // the chest's twist on the hips (not its heading in the world, which carries the hips' turn too) is fastest after the
 // head's turn is, and the hips' turn after that (but on a look so wide that the trunk must start with the head)
 let checked=0;
 for(const seed of [1,2,3,4,5,6])fixture(({worker,motion})=>{const looks=motion.schedule.looks;
  looks.forEach((l,i)=>{const prev=i?looks[i-1].yaw:looks.at(-1).yaw;if(Math.abs(l.yaw-prev)<30||l.trunk>=4)return;const peak={head:[0,0],chest:[0,0],hips:[0,0]};let last=null;
   for(let t=l.time-.05;t<=l.time+2.2*l.dur+.3;t+=.005){motion.at(t);const now={head:heading(worker,'head'),chest:heading(worker,'spine')-heading(worker,'hips'),hips:heading(worker,'hips')};if(last)for(const k in peak){const v=Math.abs(now[k]-last[k]);if(v>peak[k][0])peak[k]=[v,t];}last=now;}
   assert.ok(peak.chest[1]-peak.head[1]>=.02,`seed ${seed} ${l.label}: the chest's own twist peaks ${((peak.chest[1]-peak.head[1])*1000).toFixed(0)} ms after the head's turn`);
   assert.ok(peak.hips[1]>=peak.chest[1],`seed ${seed} ${l.label}: the hips peak ${((peak.hips[1]-peak.chest[1])*1000).toFixed(0)} ms after the chest's twist`);checked++;});},{seed});
 assert.ok(checked>=4,'enough wide looks to check');
});
test('dispose rebinds every part to the skeleton it had (the rig\'s own, or the game motion\'s), takes the neck bone away, and an idle can be made again',()=>{
 for(const profile of [profileOf('horse'),profileOf('bull')]){const worker=profile.create(load(profile.file)),game=profile.id==='bull'?createMammalMotion(worker,profile):null;game?.restore();
  const before=new Map(worker.parts.map(m=>[m,{skeleton:m.skeleton,bind:m.bindMatrix.clone()}])),key=rigKey(worker);
  for(let round=0;round<2;round++){const motion=createIdle(worker,{seed:1+round,eye:profile.eye});assert.ok(worker.parts.every(m=>m.skeleton.bones.at(-1).name==='idle neck'),profile.id+' parts on the idle skeleton');
   assert.equal(rigKey(worker),key,profile.id+': the rig key holds while the idle runs');motion.at(3.3);motion.dispose();
   for(const [m,b] of before){assert.ok(m.skeleton===b.skeleton,profile.id+' '+m.name+' back on its own skeleton');assert.ok(m.bindMatrix.equals(b.bind),profile.id+' '+m.name+' bind matrix');}
   let neck=0;worker.root.traverse(o=>{if(o.name==='idle neck')neck++;});assert.equal(neck,0,profile.id+': the neck bone is gone');assert.equal(rigKey(worker),key,profile.id+': the rig key after dispose');}
  game?.dispose();worker.dispose();}
});
test('a worker without arms (the hen, with wings) is refused with a reason, before anything on it changes',()=>{
 const hen=ANIMAL_MOTION_CATALOG.find(p=>p.unarmed),worker=hen.create(load(hen.file)),orig=snapshot(worker);
 assert.throws(()=>createIdle(worker),/needs a mammal rig with arms and legs: this worker has no/);
 for(const m of worker.parts){assert.ok(m.skeleton===worker.skeleton,m.name+' untouched');for(const k of ['skinIndex','skinWeight'])assert.deepEqual([...m.geometry.attributes[k].array],[...orig.get(m)[k].array],m.name+' '+k);}
 worker.dispose();
});
test('trousers round a belly stay with the hips: no trouser vertex more than 18 cm in front of the hip joints takes a thigh or a shin while the idle runs',()=>{
 let bellies=0;
 for(const profile of MAMMALS)fixture(({worker})=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);const kneeY=wp(worker,'shin1').y,thighX=wp(worker,'thigh1').x,tr=worker.parts.find(m=>/trousers|overalls/.test(m.name)),a=tr.geometry.attributes,legs=new Set(tr.skeleton.bones.map((b,i)=>/^(thigh|shin)/.test(b.name)?i:-1).filter(i=>i>=0));
  for(let i=0;i<a.position.count;i++){if(a.position.getX(i)-thighX<=.18||a.position.getY(i)<kneeY)continue;bellies++;for(let k=0;k<4;k++)if(a.skinWeight.getComponent(i,k)>1e-6)assert.ok(!legs.has(a.skinIndex.getComponent(i,k)),`${profile.id} trousers vertex ${i}, round the belly, takes the ${tr.skeleton.bones[a.skinIndex.getComponent(i,k)].name}`);}},{profile});
 assert.ok(bellies>=200,'bellies to check ('+bellies+' vertices)');
});
test('each character gazes from its own eyes: the gaze starts at the catalog eye point (centred) carried by the head',()=>{
 const eyes=new Set();
 for(const profile of MAMMALS)fixture(({worker,motion})=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);const rest=V([profile.eye[0],profile.eye[1],0]).sub(wp(worker,'head')),restQ=wq(worker,'head').invert();
  for(const t of [0,4.4,11.1,23.7]){const g=motion.gaze(t);motion.at(t);const want=wp(worker,'head').add(rest.clone().applyQuaternion(wq(worker,'head').multiply(restQ)));
   assert.ok(g.eye.distanceTo(want)<1e-6,`${profile.id} at ${t} s gazes from ${g.eye.toArray().map(x=>x.toFixed(3))}, not its eyes ${want.toArray().map(x=>x.toFixed(3))}`);}
  eyes.add(profile.eye.slice(0,2).join(','));},{profile});
 assert.ok(eyes.size>=6,'the cast have their own eyes');
});
test('the neck skin bends: on a 25 degree nod the nape is carried forward more the higher up the neck it is, 2 cm or more at three quarters of the way up and 3 cm or more at the top, on every mammal',()=>{
 // (skin left on the rig's own weights, off the neck bone, moves 0-2 mm at three quarters of the way and 1-11 mm at the top)
 for(const profile of MAMMALS)fixture(({worker,motion})=>{const skull=worker.parts.find(m=>/unified/.test(m.name)&&/skull/.test(m.name)),a=skull.geometry.attributes.position;
  worker.pose('neutral');motion.poseHead(0,0,0);const at=()=>{worker.root.updateMatrixWorld(true);return Array.from({length:a.count},(_,i)=>{const v=V().fromBufferAttribute(a,i);skull.applyBoneTransform(i,v);return v.applyMatrix4(skull.matrixWorld);});};
  const rest=at(),spine=wp(worker,'spine'),head=wp(worker,'head'),off=head.clone().sub(spine),len=Math.min(.22,Math.max(.15,.75*off.length())),axis=off.clone().normalize(),base=head.clone().addScaledVector(axis,-len);
  // the nape: the back of the neck (more than 1 cm behind the branch's axis), in quarters of the branch from its base up
  const bins=[[],[],[],[]];rest.forEach((v,i)=>{const d=v.clone().sub(base),u=d.dot(axis)/len,back=d.clone().addScaledVector(axis,-d.dot(axis));if(u<0||u>=1||back.x>-.01)return;bins[Math.min(3,Math.floor(u*4))].push(i);});
  assert.ok(bins[2].length>=3&&bins[3].length>=3,profile.id+' nape vertices in the upper half');
  motion.poseHead(0,25,0);const now=at(),forward=bins.map(b=>b.length>=3?b.reduce((s,i)=>s+now[i].x-rest[i].x,0)/b.length:null),shown=forward.map(x=>x===null?'-':(x*1000).toFixed(1)).join(' / ');
  for(let k=1;k<4;k++)if(forward[k-1]!==null)assert.ok(forward[k]>forward[k-1],`${profile.id}: the nape is carried forward ${shown} mm from the branch's base up`);
  assert.ok(forward[2]>=.02&&forward[3]>=.03,`${profile.id}: the nape is carried forward ${shown} mm from the branch's base up`);
  motion.poseHead(0,0,0);},{profile});
});
test('the arms\' weight stays on the sleeves: no cloth more than 12 cm from an arm\'s bones moves with that arm while the idle runs, where the rigs weight some to it',()=>{
 let stripped=0;
 for(const profile of MAMMALS){const raw=profile.create(load(profile.file)),armOf=new Map();raw.pose('neutral');raw.root.updateMatrixWorld(true);
  const axis=s=>['upperArm','forearm','hand'].map(n=>wp(raw,n+s)),A={[-1]:axis(-1),[1]:axis(1)},seg=(x,a,b)=>{const ab=b.clone().sub(a),t=Math.max(0,Math.min(1,x.clone().sub(a).dot(ab)/ab.lengthSq()));return x.distanceTo(a.clone().addScaledVector(ab,t));};
  const far=(x,s)=>Math.min(seg(x,A[s][0],A[s][1]),seg(x,A[s][1],A[s][2]))>.12,isArm=(m,i,s)=>['upperArm'+s,'forearm'+s].includes(m.skeleton.bones[i].name);
  for(const m of raw.parts.filter(m=>/shirt|waistcoat|jacket|trousers|overalls|belt|pouch/.test(m.name))){const a=m.geometry.attributes;for(let i=0;i<a.position.count;i++){const x=V().fromBufferAttribute(a.position,i),s=x.z<0?-1:1;if(!far(x,s))continue;
   for(let k=0;k<4;k++)if(a.skinWeight.getComponent(i,k)>.01&&isArm(m,a.skinIndex.getComponent(i,k),s)){armOf.set(m.name+':'+i,true);stripped++;break;}}}
  raw.dispose();
  fixture(({worker})=>{for(const m of worker.parts.filter(m=>/shirt|waistcoat|jacket|trousers|overalls|belt|pouch/.test(m.name))){const a=m.geometry.attributes;for(let i=0;i<a.position.count;i++){const x=V().fromBufferAttribute(a.position,i),s=x.z<0?-1:1;if(!far(x,s))continue;
    for(let k=0;k<4;k++)assert.ok(!(a.skinWeight.getComponent(i,k)>1e-6&&isArm(m,a.skinIndex.getComponent(i,k),s)),`${profile.id} ${m.name} vertex ${i}, ${armOf.has(m.name+':'+i)?'which the rig weights to the arm, ':''}moves with the ${m.skeleton.bones[a.skinIndex.getComponent(i,k)].name}`);}}},{profile});}
 assert.ok(stripped>=50,'the rigs weight cloth beside the arms to them ('+stripped+' vertices), so the rule has work to do');
});
test('a sleeve stays on the forearm it is wrapped round: sleeve cloth within 1 cm of a forearm keeps its distance from it within 1 mm through the loop, on every mammal',()=>{
 // (the rigs weight a sleeve's inside at the elbow mostly to the chest: left so, the dog's, the pig director's and the
 // sheep's drift 7-16 mm off their forearms; sleeve cloth is cloth the idle weights to that arm)
 for(const profile of MAMMALS)fixture(({worker,motion})=>{const sleeves=worker.parts.filter(m=>/shirt|waistcoat|jacket/.test(m.name));
  const skinned=m=>{worker.root.updateMatrixWorld(true);const a=m.geometry.attributes.position;return Array.from({length:a.count},(_,i)=>{const v=V().fromBufferAttribute(a,i);m.applyBoneTransform(i,v);return v.applyMatrix4(m.matrixWorld);});};
  const tris=m=>{const ix=m.geometry.index.array,out=[];for(let t=0;t<ix.length;t+=3)out.push([ix[t],ix[t+1],ix[t+2]]);return out;};
  const nearest=(p,P,T3)=>{let best={d:Infinity};const tri=new T.Triangle(),q=V();for(const [i,j,k] of T3){tri.set(P[i],P[j],P[k]);tri.closestPointToPoint(p,q);const d=p.distanceTo(q);if(d<best.d)best={d,t:[i,j,k],b:tri.getBarycoord(q,V())};}return best;};
  worker.pose('neutral');motion.poseHead(0,0,0);const pairs=[];
  for(const s of [-1,1]){const arm=worker.parts.find(m=>m.name==='forearm and hand '+s),AP=skinned(arm),AT=tris(arm);
   const box=new T.Box3().setFromPoints(AP).expandByScalar(.01);for(const m of sleeves){const P=skinned(m),a=m.geometry.attributes,sleeve=i=>{let w=0;for(let k=0;k<4;k++)if(['upperArm'+s,'forearm'+s].includes(m.skeleton.bones[a.skinIndex.getComponent(i,k)].name))w+=a.skinWeight.getComponent(i,k);return w>.01;};
    P.forEach((p,i)=>{if((p.z<0?-1:1)!==s||!box.containsPoint(p)||!sleeve(i))return;const n=nearest(p,AP,AT);if(n.d<.01)pairs.push({m,i,arm,t:n.t,b:n.b,d:n.d});});}}
  assert.ok(pairs.length>=10,profile.id+' sleeve cloth on the forearms');
  for(let t=0;t<motion.length;t+=.5){motion.at(t);const cache=new Map(),pos=m=>{if(!cache.has(m))cache.set(m,skinned(m));return cache.get(m);};
   for(const {m,i,arm,t:[a,b,c],b:w,d} of pairs){const AP=pos(arm),on=V().addScaledVector(AP[a],w.x).addScaledVector(AP[b],w.y).addScaledVector(AP[c],w.z),now=pos(m)[i].distanceTo(on);
    assert.ok(Math.abs(now-d)<.001,`${profile.id} ${m.name} vertex ${i} at ${t.toFixed(1)} s is ${(now*1000).toFixed(1)} mm from the forearm point it lay ${(d*1000).toFixed(1)} mm from`);}}},{profile});
});
