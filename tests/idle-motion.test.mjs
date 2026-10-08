import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createIdle,IDLE} from '../dist/tactics/idle-motion.js';
const load=file=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url))),horseData=load('horse-10k-data.json'),V=a=>new T.Vector3(...(a||[0,0,0])),DEG=180/Math.PI;
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed),profileOf=id=>MAMMALS.find(p=>p.id===id);
// The rig's own skin weights, kept before the idle blends the clothes at the waist and the neck.
const snapshot=worker=>new Map(worker.parts.map(m=>[m,{skinIndex:m.geometry.attributes.skinIndex.clone(),skinWeight:m.geometry.attributes.skinWeight.clone()}]));
function fixture(fn,{seed=1,profile=null,length}={}){const worker=profile?profile.create(load(profile.file)):createLightHorse(horseData),orig=snapshot(worker),motion=createIdle(worker,{seed,...(length?{length}:{})});try{fn({worker,motion,orig});}finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}}
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
// Skin through cloth, written apart from the module's own fit. Triangles are sorted by the rig's own weights (every corner
// more than half to the named bones) and skinned as drawn. Every pair whose bounds share a 4 cm cell is tested, an edge of
// either piercing the other. A crossing is new unless the rest pose has it, or has one within two triangles of it on both
// sides (the same crossing slid along), or its edge pokes through by 2 mm or less (a graze, about a pixel at the study's
// close-up scale). count() returns the new crossings of each set against the torso.
const SETS={head:/^head$/,'arm+1':/^(hand|fingers|forearm)1$/,'arm-1':/^(hand|fingers|forearm)-1$/,torso:/^(spine|hips)$/,spine:/^spine$/,hips:/^hips$/};
function clothCounter(worker,orig,names=['head','arm+1','arm-1'],against='torso',keep=()=>true){
 const weight=(mesh,i,re)=>{const {skinIndex,skinWeight}=orig.get(mesh);let s=0;for(let k=0;k<4;k++)if(re.test(worker.bones[skinIndex.getComponent(i,k)].name))s+=skinWeight.getComponent(i,k);return s;};
 worker.pose('neutral');worker.root.updateMatrixWorld(true);
 const restAt=(mesh,i)=>{const p=V().fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.applyBoneTransform(i,p);return p.applyMatrix4(mesh.matrixWorld);};
 const tris=(re,extra=()=>true)=>{const list=[];for(const mesh of worker.parts){const g=mesh.geometry,ix=g.index?g.index.array:Array.from({length:g.attributes.position.count},(_,i)=>i);for(let t=0;t<ix.length;t+=3){const v=[ix[t],ix[t+1],ix[t+2]];if(v.every(i=>weight(mesh,i,re)>.5)&&extra(mesh,v))list.push({mesh,v});}}
  const byCorner=new Map();list.forEach((t,n)=>{t.keys=t.v.map(i=>mesh2key(t.mesh,i));for(const k of t.keys){if(!byCorner.has(k))byCorner.set(k,[]);byCorner.get(k).push(n);}});
  const one=n=>new Set(list[n].keys.flatMap(k=>byCorner.get(k)));list.near=n=>{const out=new Set();for(const m of one(n))for(const x of one(m))out.add(x);return out;};return list;};
 const mesh2key=(mesh,i)=>mesh.uuid+':'+[0,1,2].map(k=>Math.round(mesh.geometry.attributes.position.getComponent(i,k)*1e4)).join(',');
 const B=tris(SETS[against],(mesh,v)=>keep(v.map(i=>restAt(mesh,i)))),A=Object.fromEntries(names.map(n=>[n,tris(SETS[n])]));
 const skin=list=>{const memo=new Map();return list.map(({mesh,v})=>v.map(i=>{const k=mesh.uuid+i;let p=memo.get(k);if(!p){p=restAt(mesh,i);memo.set(k,p);}return p;}));};
 const through=(a,b,t)=>{const d=b.clone().sub(a),e1=t[1].clone().sub(t[0]),e2=t[2].clone().sub(t[0]),p=d.clone().cross(e2),det=e1.dot(p);if(Math.abs(det)<1e-12)return -1;const s=a.clone().sub(t[0]),u=s.dot(p)/det;if(u<0||u>1)return -1;const q=s.clone().cross(e1),v=d.dot(q)/det;if(v<0||u+v>1)return -1;const h=e2.dot(q)/det;if(h<=0||h>=1)return -1;return Math.min(h,1-h)*Math.abs(d.dot(e1.clone().cross(e2).normalize()));};
 const C=.04,cells=(t,f)=>{const lo=[0,1,2].map(k=>Math.floor(Math.min(...t.map(v=>v.getComponent(k)))/C)),hi=[0,1,2].map(k=>Math.floor(Math.max(...t.map(v=>v.getComponent(k)))/C));for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++)f(x+','+y+','+z);};
 const crossings=(PA,PB)=>{const grid=new Map(),out=new Map();PB.forEach((t,n)=>cells(t,k=>{if(!grid.has(k))grid.set(k,[]);grid.get(k).push(n);}));
  PA.forEach((t,a)=>{const seen=new Set();cells(t,k=>{for(const b of grid.get(k)||[]){if(seen.has(b))continue;seen.add(b);const u=PB[b];let depth=-1;for(const [i,j] of [[0,1],[1,2],[2,0]])depth=Math.max(depth,through(t[i],t[j],u),through(u[i],u[j],t));if(depth>=0)out.set(a+':'+b,depth);}});});return out;};
 const now=()=>{worker.root.updateMatrixWorld(true);const PB=skin(B);return Object.fromEntries(names.map(n=>[n,crossings(skin(A[n]),PB)]));};
 const rest=now(),byA=Object.fromEntries(names.map(n=>{const m=new Map();for(const k of rest[n].keys()){const [a,b]=k.split(':').map(Number);if(!m.has(a))m.set(a,[]);m.get(a).push(b);}return [n,m];}));
 const fresh=(n,k,depth)=>{if(depth<=.002||rest[n].has(k))return false;const [a,b]=k.split(':').map(Number),nb=B.near(b);for(const x of A[n].near(a))for(const y of byA[n].get(x)||[])if(nb.has(y))return false;return true;};
 const count=()=>{const c=now();return Object.fromEntries(names.map(n=>[n,[...c[n]].filter(([k,d])=>fresh(n,k,d)).length]));};
 count.rest=Object.fromEntries(names.map(n=>[n,rest[n].size]));return count;
}
const knee=(worker,side)=>{const h=wp(worker,'thigh'+side),k=wp(worker,'shin'+side),a=wp(worker,'hoof'+side);return 180-h.sub(k).angleTo(a.sub(k))*DEG;};

test('idle keeps native scale, limb lengths and legal IK over the whole loop, on every mammal and twelve horse seeds',()=>{
 const check=({worker,motion},step)=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);const rest=worker.bones.map(b=>b.position.clone());
  for(let t=0;t<motion.length;t+=step){motion.at(t);assert.deepEqual(worker.root.scale.toArray(),[1,1,1]);
   for(let i=0;i<worker.bones.length;i++){const b=worker.bones[i];assert.ok(Math.abs(b.quaternion.length()-1)<1e-7);if(['hips','spine','head'].includes(b.name))continue;
    // the shoulders shrug as the chest breathes: up along the chest, never more than 12 mm, and nothing else moves its joint
    const d=b.position.clone().sub(rest[i]);if(/^upperArm/.test(b.name))assert.ok(Math.hypot(d.x,d.z)<1e-9&&d.y>-1e-9&&d.y<.012,b.name+' shrug '+(d.y*1000).toFixed(2)+' mm');else assert.ok(d.length()<1e-8,b.name);}}};
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
 const check=({worker,motion})=>{const pose=t=>{motion.at(t);worker.root.updateMatrixWorld(true);return worker.bones.flatMap(b=>b.getWorldPosition(V()).toArray());},h=.01,L=motion.length;
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
test('the same seed replays exactly; other seeds make other loops',()=>{
 const capture=seed=>{const worker=createLightHorse(horseData),motion=createIdle(worker,{seed});try{const out=[0,4.4,11.1,23.7].map(t=>{motion.at(t);return worker.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]);});return {out,looks:motion.schedule.looks.map(l=>[l.time,l.yaw,l.pitch])};}finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}};
 const a=capture(7),b=capture(7),c=capture(8),d=capture(4294967295),e=capture(0);assert.deepEqual(a,b);assert.notDeepEqual(a.looks,c.looks);assert.notDeepEqual(d.looks,e.looks,'the largest and smallest seeds are different loops');
});
// The trunk turns in time to keep the head within 36 degrees of the chest (the skinned neck seam allows 40); with the pitch
// and the drift the neck stays under 37.
test('the head turns at most 37 degrees from the chest, and tilts at most 5, on every mammal',()=>{
 for(const profile of [null,...MAMMALS])for(const seed of [1,2])fixture(({worker,motion})=>{let worst=0,at=0,roll=0;for(let t=0;t<motion.length;t+=.02){motion.at(t);const a=neckAngle(worker);if(a>worst){worst=a;at=t;}
   roll=Math.max(roll,Math.abs(new T.Euler().setFromQuaternion(onChest(worker,'head'),'YZX').x*DEG));}
  assert.ok(worst<=37&&worst<=IDLE.neck,(profile?.id??'horse')+' seed '+seed+': the head turns '+worst.toFixed(1)+' degrees from the chest at '+at.toFixed(2)+' s');
  assert.ok(roll<=5,(profile?.id??'horse')+' seed '+seed+': the head tilts '+roll.toFixed(1)+' degrees on the chest');
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
test('the arms hang and ease: within 1.5 degrees of their rest hang where the clothes allow, the elbows bending a little, the hands hanging on, a beat behind the trunk',()=>{
 fixture(({worker,motion})=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);
  const elbow=s=>{const a=wp(worker,'upperArm'+s),e=wp(worker,'forearm'+s),w=wp(worker,'hand'+s);return 180-a.sub(e).angleTo(w.sub(e))*DEG;};
  const rest=Object.fromEntries([-1,1].map(s=>[s,{plumb:fromPlumb(worker,s),elbow:elbow(s)}])),seen=Object.fromEntries([-1,1].map(s=>[s,{lo:Infinity,hi:-Infinity}]));
  for(let t=0;t<motion.length;t+=.05){motion.at(t);for(const s of [-1,1]){const out=Math.abs(fromPlumb(worker,s)-rest[s].plumb);assert.ok(out<1.5,`the ${s} arm swings ${out.toFixed(1)} degrees from its rest hang at ${t.toFixed(2)} s`);
    const e=elbow(s);seen[s].lo=Math.min(seen[s].lo,e);seen[s].hi=Math.max(seen[s].hi,e);const wrist=2*Math.acos(Math.min(1,Math.abs(bone(worker,'hand'+s).quaternion.w)))*DEG;assert.ok(wrist<8,`the ${s} wrist bends ${wrist.toFixed(1)} degrees`);}}
  for(const s of [-1,1]){assert.ok(seen[s].hi-seen[s].lo>1,`the ${s} elbow eases ${(seen[s].hi-seen[s].lo).toFixed(2)} degrees over the loop`);assert.ok(seen[s].hi<rest[s].elbow+5&&seen[s].lo>rest[s].elbow-1,`the ${s} elbow stays near its rest bend (${seen[s].lo.toFixed(1)}-${seen[s].hi.toFixed(1)}, rest ${rest[s].elbow.toFixed(1)})`);}
  // On the widest look each arm's own heading (its hang from the shoulder, seen from above) reaches half its turn after the
  // trunk's (the hips' and half the chest's twist on them): the arms follow a beat behind.
  const l=motion.schedule.looks.reduce((a,b)=>Math.abs(b.yaw)>Math.abs(a.yaw)?b:a),hangs=s=>{const d=wp(worker,'hand'+s).sub(wp(worker,'upperArm'+s));return Math.atan2(-d.z,d.x)*DEG;},hand=()=>(hangs(1)+hangs(-1))/2,trunk=()=>heading(worker,'hips')+.5*(heading(worker,'spine')-heading(worker,'hips'));
  const end=Math.min(l.time+3,motion.schedule.looks.find(x=>x.time>l.time)?.time??Infinity),series=[];for(let t=l.time-.2;t<end;t+=.01){motion.at(t);series.push([t,trunk(),hand()]);}const half=k=>{const a=series[0][k],b=series.at(-1)[k];return series.find(r=>Math.abs(r[k]-a)>=Math.abs(b-a)/2)[0];};
  assert.ok(half(2)-half(1)>.03,`the hands follow the trunk ${((half(2)-half(1))*1000).toFixed(0)} ms behind`);
 },{seed:1});
 // On every mammal an arm hangs out from its rest no more than this rig's fitted swing (as its hip juts toward it in a
 // lean, and as the chest rounds) and 1.5 degrees for the rest of the motion.
 for(const profile of MAMMALS)fixture(({worker,motion})=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);const {swing}=motion.fitted,rest={[-1]:fromPlumb(worker,-1),[1]:fromPlumb(worker,1)};
  for(let t=0;t<motion.length;t+=.1){motion.at(t);for(const s of [-1,1]){const out=Math.abs(fromPlumb(worker,s)-rest[s]),top=swing.lean[s]+swing.round+1.5;assert.ok(out<top,`${profile.id}: the ${s} arm swings ${out.toFixed(1)} degrees out at ${t.toFixed(1)} s (its fit allows ${top.toFixed(1)})`);}}},{profile,seed:1});
});
test('looking down, the neck bends forward like a heavy branch and carries the head out over the chest, and the chest rounds for the deepest looks',()=>{
 let deepest=null;for(const seed of [1,2,3,4,5,6,7,8]){const worker=createLightHorse(horseData),motion=createIdle(worker,{seed});for(const l of motion.schedule.looks)if(l.label==='Glance down'&&(!deepest||l.pitch<deepest.l.pitch))deepest={seed,l};motion.dispose();worker.skeleton.dispose();worker.dispose();}
 assert.ok(deepest,'a glance down in eight seeds');
 fixture(({worker,motion})=>{const down=deepest.l;worker.pose('neutral');worker.root.updateMatrixWorld(true);const rest=bone(worker,'head').position.clone();
  motion.at(down.time+down.dur+.4);const moved=bone(worker,'head').position.clone().sub(rest),face=V([1,0,0]).applyQuaternion(onChest(worker,'head')),chest=new T.Euler().setFromQuaternion(bone(worker,'spine').quaternion,'YXZ').z*DEG;
  assert.ok(face.y<-.2,'the face is turned down from the chest');assert.ok(moved.x>.03,'the head joint is carried forward '+(moved.x*100).toFixed(1)+' cm');
  assert.ok(moved.length()<.08,'the bend stays within the neck skin');assert.ok(chest<-1,'the chest rounds forward '+(-chest).toFixed(1)+' degrees');
 },{seed:deepest.seed});
});
test('leaning toward one hoof: the hips move over toward it and hike, and that leg does not buckle, on every mammal',()=>{
 let checked=0;
 for(const profile of [null,...MAMMALS])for(const seed of [1,2])fixture(({worker,motion})=>{worker.pose('neutral');worker.root.updateMatrixWorld(true);const restKnee={[-1]:knee(worker,-1),[1]:knee(worker,1)},restZ=wp(worker,'hips').z;
  for(const s of motion.schedule.stances){if(!s.side)continue;motion.at(s.time+s.dur+.5);const near=s.side,far=-s.side,id=(profile?.id??'horse')+' seed '+seed;
   assert.ok((wp(worker,'hips').z-restZ)*near>.03,`${id}: the hips move toward the hoof (${((wp(worker,'hips').z-restZ)*100).toFixed(1)} cm)`);
   assert.ok(wp(worker,'thigh'+far).y<wp(worker,'thigh'+near).y-.01,id+': the near hip hikes above the far one');
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
test('no face, jaw or arm passes through the clothes: the horse every 0.1 s, every mammal on two seeds',()=>{
 const run=(profile,seed,step)=>fixture(({worker,motion,orig})=>{const count=clothCounter(worker,orig);for(let t=0;t<motion.length;t+=step){motion.at(t);const c=count();assert.deepEqual(c,{head:0,'arm+1':0,'arm-1':0},`${profile?.id??'horse'} seed ${seed} at ${t.toFixed(2)} s (rest pose crossings ${JSON.stringify(count.rest)})`);}},{profile,seed});
 run(null,1,.1);for(const profile of MAMMALS)for(const seed of [1,2])run(profile,seed,.5);
});
test('the clothes hold together at the waist where the chest turns most on the hips, on every mammal',()=>{
 // Shirt, jacket or waistcoat cloth (on the spine, by the rig's own weights) against belt, trousers or overalls (on the
 // hips, above the knees), at the three moments of each loop when the chest is turned, bent or tilted most on the pelvis.
 for(const profile of [null,...MAMMALS])for(const seed of [1,2])fixture(({worker,motion,orig})=>{const count=clothCounter(worker,orig,['spine'],'hips',tri=>tri.every(p=>p.y>.55)),turn=[];
  for(let t=0;t<motion.length;t+=.05){motion.at(t);const q=bone(worker,'spine').quaternion;turn.push([2*Math.acos(Math.min(1,Math.abs(q.w))),t]);}turn.sort((a,b)=>b[0]-a[0]);
  const picked=[];for(const [,t] of turn)if(picked.length<3&&picked.every(x=>Math.abs(x-t)>2))picked.push(t);
  for(const t of picked){motion.at(t);const c=count();assert.equal(c.spine,0,`${profile?.id??'horse'} seed ${seed}: ${c.spine} new cloth crossings at the waist at ${t.toFixed(2)} s`);}},{profile,seed});
});
test('the fitted limits come from the rig, are reused for its next loops, and bound the looks to what it can reach',()=>{
 const fitted=[];for(const seed of [1,2])fixture(({motion})=>fitted.push(motion.fitted),{seed});
 assert.deepEqual(fitted[0].nod,fitted[1].nod);assert.deepEqual(fitted[0].yaw,fitted[1].yaw);assert.deepEqual(fitted[0].twist,fitted[1].twist);
 for(const profile of [profileOf('pig-foreman'),profileOf('sheep')])for(const seed of [1,2,3])fixture(({motion})=>{const {reach}=motion.fitted;
  for(const l of motion.schedule.looks){assert.ok(l.yaw<=reach.left+.5&&-l.yaw<=reach.right+.5,`${profile.id} looks ${l.yaw.toFixed(1)} degrees, past its reach`);assert.ok(-l.pitch<=reach.down+.5,`${profile.id} looks ${l.pitch.toFixed(1)} degrees down, past its reach`);}},{profile,seed});
});
// The head on the chest as the design bends the neck, restated here so that the fitted limits can be posed apart from
// the module's own fit: a branch three quarters of the spine-to-head span, bent square to its axis toward the face, the
// tilt eased through level. Degrees: yaw to the left, nod down, roll the crown's tilt.
const branch=(theta,f)=>{let a=0;for(let i=0;i<=16;i++){const u=i/16;a+=(i%16?i%2?4:2:1)*f(theta*(2*u-u*u));}return a/48;};
function poseHead(worker,yaw,nod,roll){worker.pose('neutral');worker.root.updateMatrixWorld(true);const off=wp(worker,'head').sub(wp(worker,'spine')),len=Math.min(.22,Math.max(.15,.75*off.length())),axis=off.clone().normalize();
 const q=new T.Quaternion().setFromAxisAngle(V([0,1,0]),yaw/DEG).multiply(new T.Quaternion().setFromAxisAngle(V([0,0,1]),-nod/DEG)).multiply(new T.Quaternion().setFromAxisAngle(V([1,0,0]),roll/DEG));
 const f=V([1,0,0]).applyQuaternion(q),pitch=Math.asin(Math.max(-1,Math.min(1,f.y))),th=-pitch*(.75-.25*Math.tanh(pitch/(2/DEG))),d=f.clone().addScaledVector(axis,-f.dot(axis));if(d.lengthSq()<1e-9)d.set(1,0,0);d.normalize();
 bone(worker,'head').position.copy(off.addScaledVector(d,len*branch(th,Math.sin)).addScaledVector(axis,-len*(1-branch(th,Math.cos))));bone(worker,'head').quaternion.copy(q);worker.root.updateMatrixWorld(true);}
test('every mammal can still look about: down 15 degrees or more and 39 or more to each side, the horse down 30',()=>{
 // A fit that collapsed (a measure that counted every slid crossing, say) would leave a character staring ahead.
 for(const profile of [null,...MAMMALS])fixture(({motion})=>{const {reach}=motion.fitted,id=profile?.id??'horse';assert.ok(reach.down>=15&&reach.left>=39&&reach.right>=39,`${id} reaches ${reach.left.toFixed(1)} / ${reach.right.toFixed(1)} / ${reach.down.toFixed(1)} degrees`);if(!profile)assert.ok(reach.down>=30,'the horse looks down '+reach.down);},{profile});
});
test('posed at its fitted limits (turned as far as it may, tilted, nodding or looking up while turned), each mammal\'s head crosses nothing new',()=>{
 for(const profile of MAMMALS)fixture(({worker,motion,orig})=>{const {yaw,nod,up}=motion.fitted,count=clothCounter(worker,orig,['head']),L=yaw[1],R=yaw[-1],l=Math.min(24,L),r=Math.min(24,R);
  for(const [y,n,t] of [[L,0,0],[L,0,5],[L,0,-5],[-R,0,0],[-R,0,5],[-R,0,-5],[0,-up,0],[l,-up,0],[-r,-up,0],[0,-up,5],[0,-up,-5],[0,nod,0],[l,nod,0],[-r,nod,0],[0,nod,5],[0,nod,-5]]){poseHead(worker,y,n,t);const c=count();assert.equal(c.head,0,`${profile.id}: the head turned ${y}, nodding ${n} and tilted ${t} degrees makes ${c.head} new crossings`);}},{profile});
});
test('options are checked; every accessor rejects non-finite time; dispose restores the rig, weights and all',()=>{
 const worker=createLightHorse(horseData),orig=snapshot(worker);worker.pose('neutral');worker.root.updateMatrixWorld(true);const rest=worker.bones.map(b=>b.position.clone());
 for(const seed of [NaN,1.5,-1,2**32,'3'])assert.throws(()=>createIdle(worker,{seed}),/seed/,String(seed));
 for(const length of [5,601,Infinity,NaN,'30'])assert.throws(()=>createIdle(worker,{length}),/12 to 600 s/,String(length));
 const motion=createIdle(worker,{seed:3,length:19.37});
 try{assert.equal(motion.length,19.37);for(const f of [t=>motion.at(t),t=>motion.gaze(t),motion.balance.cop,motion.balance.centre])assert.throws(()=>f(NaN),/finite/);
  motion.at(7.7);motion.dispose();for(const f of [t=>motion.at(t),t=>motion.gaze(t),motion.balance.cop])assert.throws(()=>f(1),/disposed/);
  worker.bones.forEach((b,i)=>{assert.ok(b.quaternion.angleTo(new T.Quaternion())<1e-9,b.name+' back in the neutral pose');assert.ok(b.position.distanceTo(rest[i])<1e-9,b.name+' back at its joint');});
  for(const m of worker.parts)for(const k of ['skinIndex','skinWeight'])assert.deepEqual([...m.geometry.attributes[k].array],[...orig.get(m)[k].array],m.name+' '+k+' restored');}
 finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}
});
