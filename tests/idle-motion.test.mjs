import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createIdle,IDLE} from '../dist/tactics/idle-motion.js';
const load=file=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url))),horseData=load('horse-10k-data.json'),V=a=>new T.Vector3(...(a||[0,0,0])),DEG=180/Math.PI;
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed);
function fixture(fn,{seed=1,profile=null}={}){const worker=profile?profile.create(load(profile.file)):createLightHorse(horseData),motion=createIdle(worker,{seed});try{fn({worker,motion});}finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}}
const bone=(worker,name)=>worker.bones.find(b=>b.name===name),wq=(worker,name)=>bone(worker,name).getWorldQuaternion(new T.Quaternion()),wp=(worker,name)=>bone(worker,name).getWorldPosition(V());
const heading=(worker,name)=>{const f=V([1,0,0]).applyQuaternion(wq(worker,name));return Math.atan2(-f.z,f.x)*DEG;};
const neckAngle=worker=>{const q=wq(worker,'spine').invert().multiply(wq(worker,'head'));return 2*Math.acos(Math.min(1,Math.abs(q.w)))*DEG;};
const foot=(worker,side)=>worker.parts.find(p=>/hoof|boot|foot/.test(p.name)&&p.name.endsWith(' '+side));
function floorVertices(worker){const out=[];for(const side of [-1,1]){const f=foot(worker,side),a=f.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);f.applyBoneTransform(i,p);p.applyMatrix4(f.matrixWorld);if(p.y<.001)out.push({f,i,p});}}return out;}
function hull(pts){const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];for(const q of p){while(lo.length>=2&&cr(lo.at(-2),lo.at(-1),q)<=0)lo.pop();lo.push(q);}for(const q of [...p].reverse()){while(up.length>=2&&cr(up.at(-2),up.at(-1),q)<=0)up.pop();up.push(q);}return lo.slice(0,-1).concat(up.slice(0,-1));}
function outside(h,q){let inside=h.length>2,best=Infinity;for(let i=0;i<h.length;i++){const a=h[i],b=h[(i+1)%h.length],ex=b[0]-a[0],ez=b[1]-a[1],L=Math.hypot(ex,ez)||1e-12;if((ex*(q[1]-a[1])-ez*(q[0]-a[0]))/L<0)inside=false;const k=Math.max(0,Math.min(1,((q[0]-a[0])*ex+(q[1]-a[1])*ez)/(L*L)));best=Math.min(best,Math.hypot(q[0]-a[0]-k*ex,q[1]-a[1]-k*ez));}return inside?-best:best;}
// Skin through cloth, independent of the module's own fit: face (head-weighted, in front of the head joint) and forearm or
// glove triangles against torso triangles (every corner weighted over half to spine and hips), counting edges of either
// that pierce the other on the skinned meshes.
function clothCounter(worker){
 const weight=(a,i,re)=>{let s=0;for(let k=0;k<4;k++)if(re.test(worker.bones[a.skinIndex.getComponent(i,k)].name))s+=a.skinWeight.getComponent(i,k);return s;};
 worker.pose('neutral');worker.root.updateMatrixWorld(true);const headX=wp(worker,'head').x;
 const tris=test=>worker.parts.map(mesh=>{const g=mesh.geometry,a=g.attributes,ix=g.index?g.index.array:Array.from({length:a.position.count},(_,i)=>i),out=[];for(let t=0;t<ix.length;t+=3){const v=[ix[t],ix[t+1],ix[t+2]];if(v.every(i=>test(a,i)))out.push(v);}return {mesh,a,out};}).filter(x=>x.out.length);
 const sets={torso:tris((a,i)=>weight(a,i,/^(spine|hips)$/)>.5),face:tris((a,i)=>weight(a,i,/^head$/)>.95&&a.position.getX(i)>headX+.08),'arm+1':tris((a,i)=>weight(a,i,/^(hand|fingers|forearm)1$/)>.5),'arm-1':tris((a,i)=>weight(a,i,/^(hand|fingers|forearm)-1$/)>.5)};
 const skinned=set=>set.flatMap(({mesh,a,out})=>{const memo=new Map(),P=i=>{let v=memo.get(i);if(!v){v=V().fromBufferAttribute(a.position,i);mesh.applyBoneTransform(i,v);v.applyMatrix4(mesh.matrixWorld);memo.set(i,v);}return v;};return out.map(t=>t.map(P));});
 const C=.05,key=(x,y,z)=>x+','+y+','+z,cellOf=v=>key(Math.floor(v.x/C),Math.floor(v.y/C),Math.floor(v.z/C));
 const grid=list=>{const g=new Map();list.forEach((t,n)=>{const lo=[0,1,2].map(k=>Math.floor(Math.min(...t.map(v=>v.getComponent(k)))/C)),hi=[0,1,2].map(k=>Math.floor(Math.max(...t.map(v=>v.getComponent(k)))/C));for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){const k=key(x,y,z);if(!g.has(k))g.set(k,[]);g.get(k).push(n);}});return g;};
 const through=(a,b,t)=>{const d=b.clone().sub(a),e1=t[1].clone().sub(t[0]),e2=t[2].clone().sub(t[0]),p=d.clone().cross(e2),det=e1.dot(p);if(Math.abs(det)<1e-12)return false;const s=a.clone().sub(t[0]),u=s.dot(p)/det;if(u<0||u>1)return false;const q=s.clone().cross(e1),v=d.dot(q)/det;if(v<0||u+v>1)return false;const h=e2.dot(q)/det;return h>0&&h<1;};
 const hits=(A,B,g)=>{const hit=new Set();A.forEach((t,ia)=>{for(const [i,j] of [[0,1],[1,2],[2,0]]){const seen=new Set();for(const c of [t[i],t[j]])for(const ib of g.get(cellOf(c))||[]){if(seen.has(ib))continue;seen.add(ib);if(through(t[i],t[j],B[ib]))hit.add(ia);}}});return hit.size;};
 return ()=>{worker.root.updateMatrixWorld(true);const torso=skinned(sets.torso),gT=grid(torso),out={};for(const name of ['face','arm+1','arm-1']){const A=skinned(sets[name]);out[name]=hits(A,torso,gT)+hits(torso,A,grid(A));}return out;};
}

test('idle keeps native scale, limb lengths and legal IK over the whole loop, for twelve seeds',()=>{for(const seed of [1,2,3,4,5,6,7,8,9,10,11,12])fixture(({worker,motion})=>{
 const length=worker.bones.map(b=>b.position.length());
 for(let t=0;t<motion.length;t+=seed===1?1/30:.1){motion.at(t);assert.deepEqual(worker.root.scale.toArray(),[1,1,1]);
  for(let i=0;i<worker.bones.length;i++){const b=worker.bones[i];assert.ok(Math.abs(b.quaternion.length()-1)<1e-7);if(!['hips','spine','head'].includes(b.name))assert.ok(Math.abs(b.position.length()-length[i])<1e-8,b.name);}}
},{seed});});
test('both hooves stay planted: no floor vertex moves, slides or sinks',()=>fixture(({worker,motion})=>{
 worker.pose('neutral');worker.root.updateMatrixWorld(true);const floor=floorVertices(worker);assert.ok(floor.length>20);let worst=0;
 for(let t=0;t<motion.length;t+=.05){motion.at(t);worker.root.updateMatrixWorld(true);for(const {f,i,p} of floor){const q=V().fromBufferAttribute(f.geometry.attributes.position,i);f.applyBoneTransform(i,q);q.applyMatrix4(f.matrixWorld);worst=Math.max(worst,q.distanceTo(p));}
  for(const side of [-1,1])assert.equal(motion.at(t).feet[side].contact,'flat');}
 assert.ok(worst<1e-6,'a floor vertex moved '+(worst*1000).toFixed(4)+' mm');
}));
test('the hooves can push what the idle needs: required centre of pressure stays well inside the soles',()=>fixture(({worker,motion})=>{
 // Dempster (1955) segment fractions, independent of the motion's own balance model, as in the grenade-throw test.
 const KG=75,SEG=[['hips','spine',.281],['spine','head',.216],['head','headTip',.081],...[-1,1].flatMap(s=>[['upperArm'+s,'forearm'+s,.028],['forearm'+s,'hand'+s,.016],['hand'+s,'palm'+s,.006],['thigh'+s,'shin'+s,.10],['shin'+s,'hoof'+s,.0465],['hoof'+s,'toe'+s,.00725],['hoof'+s,'heel'+s,.00725]])];
 const OFF={headTip:['head',[.14,.32,0]],...Object.fromEntries([-1,1].flatMap(s=>[['palm'+s,['hand'+s,[.052,-.01,0]]],['toe'+s,['hoof'+s,[.145,-.12,0]]],['heel'+s,['hoof'+s,[-.06,-.12,0]]]]))},FRACTION=SEG.reduce((s,x)=>s+x[2],0),MASS=KG*FRACTION;
 const points=t=>{motion.at(t);const P={};for(const b of worker.bones)P[b.name]=b.getWorldPosition(V());for(const [k,[b,o]] of Object.entries(OFF))P[k]=V(o).applyQuaternion(wq(worker,b)).add(wp(worker,b));return P;};
 const com=P=>{const c=V();for(const [a,b,f] of SEG)c.addScaledVector(P[a].clone().add(P[b]),f/2);return c.divideScalar(FRACTION);},h=.004;
 const momentum=t=>{const A=points(t-h),P=points(t),C=points(t+h),c=com(P),vc=com(C).sub(com(A)).divideScalar(2*h),L=V();
  for(const [a,b,f] of SEG){const m=KG*f,mid=Q=>Q[a].clone().add(Q[b]).multiplyScalar(.5),dir=Q=>Q[b].clone().sub(Q[a]).normalize(),len=P[a].distanceTo(P[b]);L.add(mid(P).sub(c).cross(mid(C).sub(mid(A)).divideScalar(2*h).sub(vc)).multiplyScalar(m)).add(dir(P).cross(dir(C).sub(dir(A)).divideScalar(2*h)).multiplyScalar(m*len*len/12));}return L;};
 worker.pose('neutral');worker.root.updateMatrixWorld(true);const sole=hull(floorVertices(worker).map(({p})=>[p.x,p.z]));let worst=-Infinity,at=0;
 for(let t=.02;t<motion.length;t+=.02){const c=com(points(t)),acc=com(points(t-h)).add(com(points(t+h))).addScaledVector(c,-2).divideScalar(h*h),F=acc.add(V([0,IDLE.gravity,0])).multiplyScalar(MASS),dL=momentum(t+h).sub(momentum(t-h)).divideScalar(2*h);
  const out=outside(sole,[c.x-(c.y*F.x-dL.z)/F.y,c.z-(c.y*F.z+dL.x)/F.y]);if(out>worst){worst=out;at=t;}}
 assert.ok(worst<-.03,'the required centre of pressure comes within '+(-100*worst).toFixed(1)+' cm of the edge of the soles at '+at.toFixed(2)+' s');
}));
test('the loop closes without a seam: pose and velocity match across the wrap',()=>fixture(({worker,motion})=>{
 const pose=t=>{motion.at(t);worker.root.updateMatrixWorld(true);return worker.bones.flatMap(b=>b.getWorldPosition(V()).toArray());},h=.01,L=motion.length;
 const a=pose(L-h),b=pose(0),c=pose(h),d=pose(L-2*h),e=pose(2*h);
 for(let i=0;i<b.length;i++){const vBefore=(b[i]-a[i])/h,vAfter=(c[i]-b[i])/h;assert.ok(Math.abs(vBefore-vAfter)<.02,'velocity jumps across the seam');const accBefore=(b[i]-2*a[i]+d[i])/(h*h),accAfter=(e[i]-2*c[i]+b[i])/(h*h);assert.ok(Math.abs(accBefore-accAfter)<1,'acceleration jumps across the seam');}
 assert.deepEqual(pose(L+3.25),pose(3.25),'time wraps');assert.deepEqual(pose(-L+3.25),pose(3.25),'time wraps backwards too');
}));
test('nothing snaps: no bone accelerates faster than 5 m/s2 anywhere in the loop',()=>{
 // A kink (a slope that jumps, as abs() or max() of a moving value makes) shows up here as a spike of tens of m/s2.
 for(const seed of [1,2])fixture(({worker,motion})=>{const pose=t=>{motion.at(t);worker.root.updateMatrixWorld(true);return worker.bones.map(b=>b.getWorldPosition(V()));},h=.0025;let worst=0,at=0,who='';
  for(let t=h;t<motion.length-h;t+=.005){const a=pose(t-h),b=pose(t),c=pose(t+h);b.forEach((p,i)=>{const acc=a[i].clone().add(c[i]).addScaledVector(p,-2).divideScalar(h*h).length();if(acc>worst){worst=acc;at=t;who=worker.bones[i].name;}});}
  assert.ok(worst<5,`seed ${seed}: ${who} accelerates at ${worst.toFixed(1)} m/s2 at ${at.toFixed(3)} s`);},{seed});
});
test('the same seed replays exactly; other seeds make other loops',()=>{
 const capture=seed=>{const worker=createLightHorse(horseData),motion=createIdle(worker,{seed});try{const out=[0,4.4,11.1,23.7].map(t=>{motion.at(t);return worker.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]);});return {out,looks:motion.schedule.looks.map(l=>[l.time,l.yaw,l.pitch])};}finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}};
 const a=capture(7),b=capture(7),c=capture(8);assert.deepEqual(a,b);assert.notDeepEqual(a.looks,c.looks);
});
test('the head turns at most 40 degrees from the chest, so the skinned neck seam holds',()=>{
 for(const seed of [1,2,3,4])fixture(({worker,motion})=>{let worst=0,at=0;for(let t=0;t<motion.length;t+=.02){motion.at(t);const a=neckAngle(worker);if(a>worst){worst=a;at=t;}}assert.ok(worst<=IDLE.neck+.5,'seed '+seed+': the head turns '+worst.toFixed(1)+' degrees from the chest at '+at.toFixed(2)+' s');},{seed});
});
test('the eyes land on each look and hold it while the trunk settles',()=>{
 for(const seed of [1,2,3,4])fixture(({worker,motion})=>{const looks=motion.schedule.looks;
  looks.forEach((l,i)=>{const t=l.time+1.8*l.dur+.25,next=looks[i+1]?.time??motion.length;if(t>=next)return;motion.at(t);
   const want=V([1,0,0]).applyQuaternion(new T.Quaternion().setFromEuler(new T.Euler(0,l.yaw/DEG,l.pitch/DEG,'YZX'))),face=V([1,0,0]).applyQuaternion(wq(worker,'head'));
   assert.ok(face.angleTo(want)*DEG<3,`seed ${seed} ${l.label} at ${t.toFixed(2)} s is ${(face.angleTo(want)*DEG).toFixed(1)} degrees off`);});},{seed});
});
test('on a wide look the head leads, the chest follows and the hips come last',()=>{
 let checked=0;
 for(const seed of [1,2,3,4,5,6])fixture(({worker,motion})=>{const looks=motion.schedule.looks;
  looks.forEach((l,i)=>{const prev=i?looks[i-1].yaw:0;if(Math.abs(l.yaw-prev)<35)return;const peak={head:[0,0],spine:[0,0],hips:[0,0]};let last=null;
   for(let t=l.time-.05;t<=l.time+2.2*l.dur+.3;t+=.01){motion.at(t);const now={head:heading(worker,'head'),spine:heading(worker,'spine'),hips:heading(worker,'hips')};if(last)for(const k in peak){const v=Math.abs(now[k]-last[k]);if(v>peak[k][0])peak[k]=[v,t];}last=now;}
   assert.ok(peak.head[1]<peak.spine[1]&&peak.spine[1]<=peak.hips[1]+1e-9,`seed ${seed} ${l.label}: head ${peak.head[1].toFixed(2)}, chest ${peak.spine[1].toFixed(2)}, hips ${peak.hips[1].toFixed(2)} s`);checked++;});},{seed});
 assert.ok(checked>=4,'enough wide looks to check');
});
test('looking down, the neck bends forward like a heavy branch and carries the head out over the chest',()=>fixture(({worker,motion})=>{
 const down=motion.schedule.looks.find(l=>l.label==='Glance down');assert.ok(down,'seed 1 glances down');
 worker.pose('neutral');worker.root.updateMatrixWorld(true);const rest=bone(worker,'head').position.clone();
 motion.at(down.time+down.dur+.4);const moved=bone(worker,'head').position.clone().sub(rest),face=V([1,0,0]).applyQuaternion(wq(worker,'spine').invert().multiply(wq(worker,'head')));
 assert.ok(face.y<-.3,'the face is turned down from the chest');assert.ok(moved.x>.03,'the head joint is carried forward '+(moved.x*100).toFixed(1)+' cm');
 // tipping the same head about its joint alone, with no bend, carries it nowhere
 assert.ok(moved.length()<.08,'the bend stays within the neck skin');
}));
test('weight settles onto one hoof: the hips over it and hiked, the bearing leg straight, the free leg out as a prop',()=>{
 let checked=0;
 for(const seed of [1,2,3])fixture(({worker,motion})=>{const knee=side=>{const h=wp(worker,'thigh'+side),k=wp(worker,'shin'+side),a=wp(worker,'hoof'+side);return 180-h.sub(k).angleTo(a.sub(k))*DEG;};
  worker.pose('neutral');worker.root.updateMatrixWorld(true);const restKnee=knee(1);
  for(const s of motion.schedule.stances){if(!s.side)continue;motion.at(s.time+s.dur+.5);const stance=s.side,free=-s.side;
   assert.ok(wp(worker,'hips').z*stance>.04,`seed ${seed}: the hips move over the bearing hoof (${(wp(worker,'hips').z*100).toFixed(1)} cm)`);
   assert.ok(wp(worker,'thigh'+free).y<wp(worker,'thigh'+stance).y-.012,'the bearing hip hikes above the free one');
   assert.ok(Math.abs(knee(stance)-restKnee)<3,'the bearing knee holds near its rest bend ('+knee(stance).toFixed(1)+' degrees), it does not buckle');
   assert.ok(knee(free)<knee(stance),'the free leg is the straighter one: its hoof is planted wide');checked++;}},{seed});
 assert.ok(checked>=3,'enough weight shifts to check');
});
test('breathing: 11 to 17 breaths a minute, the inhale shorter than the exhale, one deeper sigh',()=>fixture(({worker,motion})=>{
 const b=motion.schedule.breaths,perMinute=b.length/motion.length*60;assert.ok(perMinute>11&&perMinute<17,perMinute.toFixed(1)+' breaths a minute');
 assert.ok(b.every(x=>x.inhale<.5),'inhale is the shorter part');assert.equal(b.filter(x=>x.amp>1.5).length,1,'one sigh per loop');
 const flex=t=>{motion.at(t);return new T.Euler().setFromQuaternion(bone(worker,'spine').quaternion,'YXZ').z*DEG;},peak=b[0].time+b[0].inhale*b[0].dur;
 assert.ok(flex(peak)-flex(b[0].time)>.5,'the chest lifts on the inhale');
}));
test('looks vary: fixation times spread, both sides visited, no pointless re-fixations',()=>{
 const dwell=[],labels=new Set();
 for(const seed of [1,2,3,4,5,6,7,8])fixture(({motion})=>{const looks=motion.schedule.looks;looks.forEach((l,i)=>{labels.add(l.label);if(!i)return;const prev=looks[i-1];assert.ok(Math.hypot(l.yaw-prev.yaw,l.pitch-prev.pitch)>=5.9,'seed '+seed+' look '+i+' barely moves');dwell.push(l.time-prev.time-prev.dur);});},{seed});
 const mean=dwell.reduce((a,b)=>a+b,0)/dwell.length,sd=Math.sqrt(dwell.reduce((a,b)=>a+(b-mean)**2,0)/dwell.length);
 assert.ok(sd/mean>.3,'fixation times vary (cv '+(sd/mean).toFixed(2)+')');for(const l of ['Look left','Look right','Glance down','Look ahead','Scan'])assert.ok(labels.has(l),l);
});
test('no face or arm passes through the clothes on the horse',()=>{
 for(const seed of [1,2,3])fixture(({worker,motion})=>{const count=clothCounter(worker);for(let t=0;t<motion.length;t+=.1){motion.at(t);const c=count();assert.deepEqual(c,{face:0,'arm+1':0,'arm-1':0},'seed '+seed+' at '+t.toFixed(1)+' s');}},{seed});
});
test('every mammal idles on planted feet, its neck within 40 degrees, its face and arms out of its clothes (even where its rest pose has them in)',()=>{
 for(const profile of MAMMALS)fixture(({worker,motion})=>{const count=clothCounter(worker);worker.pose('neutral');const rest=count();worker.root.updateMatrixWorld(true);const floor=floorVertices(worker);let slip=0,neck=0;const worst={face:0,'arm+1':0,'arm-1':0};
  for(let t=0;t<motion.length;t+=.25){motion.at(t);worker.root.updateMatrixWorld(true);neck=Math.max(neck,neckAngle(worker));for(const {f,i,p} of floor){const q=V().fromBufferAttribute(f.geometry.attributes.position,i);f.applyBoneTransform(i,q);slip=Math.max(slip,q.applyMatrix4(f.matrixWorld).distanceTo(p));}
   const c=count();for(const k in worst)worst[k]=Math.max(worst[k],c[k]);}
  assert.ok(slip<1e-6,profile.id+' feet move');assert.ok(neck<=IDLE.neck+.5,profile.id+' neck '+neck.toFixed(1));assert.equal(worst.face,0,profile.id+' face in its clothes');
  for(const s of ['arm+1','arm-1'])assert.equal(worst[s],0,`${profile.id} ${s}: ${worst[s]} crossings (its rest pose has ${rest[s]})`);},{profile,seed:2});
});
test('every accessor rejects non-finite time; a disposed idle refuses time; options are checked',()=>{
 const worker=createLightHorse(horseData),motion=createIdle(worker,{seed:3});
 try{for(const f of [t=>motion.at(t),t=>motion.gaze(t),motion.balance.cop,motion.balance.centre])assert.throws(()=>f(NaN),/finite/);
  assert.throws(()=>createIdle(worker,{seed:NaN}),/seed/);assert.throws(()=>createIdle(worker,{length:5}),/12 s/);
  motion.dispose();for(const f of [t=>motion.at(t),t=>motion.gaze(t),motion.balance.cop])assert.throws(()=>f(1),/disposed/);
  for(const b of worker.bones)assert.ok(b.quaternion.angleTo(new T.Quaternion())<1e-9,b.name+' back in the neutral pose');}
 finally{motion.dispose();worker.skeleton.dispose();worker.dispose();}
});
