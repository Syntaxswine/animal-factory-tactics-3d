import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createGrenadeModel} from '../dist/tactics/grenade-model.js';
import {createGrenadeThrow,GRENADE_THROW,GRENADE_KEYS} from '../dist/tactics/grenade-throw-motion.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url))),V=a=>new T.Vector3(...(a||[0,0,0]));
function fixture(fn){const worker=createLightHorse(data),grenade=createGrenadeModel(),motion=createGrenadeThrow(worker,grenade);try{fn({worker,grenade,motion});}finally{motion.dispose();grenade.dispose();worker.skeleton.dispose();worker.dispose();}}
const {release,duration,plant}=GRENADE_THROW,bone=(worker,name)=>worker.bones.find(b=>b.name===name);
function lowestSole(worker,side){const foot=worker.parts.find(p=>p.name.includes('hoof')&&p.name.endsWith(' '+side)),a=foot.geometry.attributes.position;let low=Infinity;for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);foot.applyBoneTransform(i,p);low=Math.min(low,p.applyMatrix4(foot.matrixWorld).y);}return low;}
function soleOnFloor(worker,sides=[-1,1]){const out=[];for(const side of sides){const foot=worker.parts.find(p=>p.name.includes('hoof')&&p.name.endsWith(' '+side)),a=foot.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);foot.applyBoneTransform(i,p);p.applyMatrix4(foot.matrixWorld);if(p.y<.001)out.push([p.x,p.z]);}}return out;}
function hull(pts){const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];for(const q of p){while(lo.length>=2&&cr(lo.at(-2),lo.at(-1),q)<=0)lo.pop();lo.push(q);}for(const q of [...p].reverse()){while(up.length>=2&&cr(up.at(-2),up.at(-1),q)<=0)up.pop();up.push(q);}return lo.slice(0,-1).concat(up.slice(0,-1));}
// Signed distance from a convex polygon (negative inside); a point or an edge has no inside.
function outside(h,q){let inside=h.length>2,best=Infinity;for(let i=0;i<h.length;i++){const a=h[i],b=h[(i+1)%h.length],ex=b[0]-a[0],ez=b[1]-a[1],L=Math.hypot(ex,ez)||1e-12;if((ex*(q[1]-a[1])-ez*(q[0]-a[0]))/L<0)inside=false;const k=Math.max(0,Math.min(1,((q[0]-a[0])*ex+(q[1]-a[1])*ez)/(L*L)));best=Math.min(best,Math.hypot(q[0]-a[0]-k*ex,q[1]-a[1]-k*ez));}return inside?-best:best;}

test('throw retains native scale, limb lengths and legal IK over the complete motion',()=>fixture(({worker,motion})=>{
 const length=worker.bones.map(b=>b.position.length());
 for(let frame=0;frame<=552;frame++){const d=motion.at(frame/120);assert.ok(d.ball.position.every(Number.isFinite));assert.deepEqual(worker.root.scale.toArray(),[1,1,1]);
  for(let i=0;i<worker.bones.length;i++){const b=worker.bones[i];assert.ok(Math.abs(b.quaternion.length()-1)<1e-7);if(!['hips','spine','head'].includes(b.name))assert.ok(Math.abs(b.position.length()-length[i])<1e-8,b.name);}
 }
}));
test('grenade stays in the actual palm until release, then inherits position, velocity and spin',()=>fixture(({motion})=>{
 for(let i=0;i/100<release;i++)assert.ok(motion.at(i/100).gripError<1e-8);
 const t=release,e=1e-5,a=motion.projectile(t-e),b=motion.projectile(t),c=motion.projectile(t+e);
 assert.ok(a.position.distanceTo(b.position)<.0001);
 const before=b.position.clone().sub(a.position).divideScalar(e),after=c.position.clone().sub(b.position).divideScalar(e);assert.ok(before.distanceTo(after)<.002,'release velocity must not jump');
 const spinBefore=b.quaternion.angleTo(a.quaternion)/e,spinAfter=b.quaternion.angleTo(c.quaternion)/e;assert.ok(spinBefore>1,'wrist imparts visible tumble');assert.ok(Math.abs(spinBefore-spinAfter)<.01,'spin cannot appear after release');
}));
test('airborne projectile follows gravity, loses energy at contact and rests on the target tile',()=>fixture(({motion})=>{
 const t=2.2,e=.001,a=motion.projectile(t-e).position,b=motion.projectile(t).position,c=motion.projectile(t+e).position,acc=c.clone().add(a).addScaledVector(b,-2).divideScalar(e*e);
 assert.ok(Math.abs(acc.y+GRENADE_THROW.gravity)<1e-5);assert.ok(Math.abs(acc.x)<1e-5&&Math.abs(acc.z)<1e-5);
 for(const impact of motion.impacts){const before=motion.projectile(impact-e).position,at=motion.projectile(impact).position,after=motion.projectile(impact+e).position;assert.ok(at.distanceTo(before)<.012&&at.distanceTo(after)<.012,'no impact teleport');const vin=at.clone().sub(before).divideScalar(e),vout=after.clone().sub(at).divideScalar(e);assert.ok(vout.length()<vin.length()*.9,'bounce/ground friction dissipate energy');}
 for(let t=release;t<=duration;t+=.01)assert.ok(motion.at(t).ball.groundClearance>=-.00001,'solid grenade cannot pass through floor');
 const end=motion.projectile(4.1),still=motion.projectile(duration);assert.ok(end.position.distanceTo(still.position)<1e-10);assert.ok(Math.abs(end.position.x-GRENADE_THROW.target)<.5&&Math.abs(end.position.z)<.5);assert.ok(end.quaternion.angleTo(still.quaternion)<1e-7);
 const axis=V([0,1,0]).applyQuaternion(still.quaternion);assert.ok(Math.abs(axis.y)<.05,'the casing comes to rest on its side, not balanced on its fuse');
}));
test('the hooves can push what the motion needs: required centre of pressure stays under the soles on the floor',()=>fixture(({worker,motion})=>{
 // Dempster (1955) segment fractions, independent of the motion's own balance table; finite differences of the
 // real bones give the required ground reaction and the rate of angular momentum about the centre of mass.
 const KG=75,SEG=[['hips','spine',.281],['spine','head',.216],['head','headTip',.081],...[-1,1].flatMap(s=>[['upperArm'+s,'forearm'+s,.028],['forearm'+s,'hand'+s,.016],['hand'+s,'palm'+s,.006],['thigh'+s,'shin'+s,.10],['shin'+s,'hoof'+s,.0465],['hoof'+s,'toe'+s,.00725],['hoof'+s,'heel'+s,.00725]])];
 const OFF={headTip:['head',[.14,.32,0]],...Object.fromEntries([-1,1].flatMap(s=>[['palm'+s,['hand'+s,[.052,-.01,0]]],['toe'+s,['hoof'+s,[.145,-.12,0]]],['heel'+s,['hoof'+s,[-.06,-.12,0]]]]))},FRACTION=SEG.reduce((s,x)=>s+x[2],0),MASS=KG*FRACTION;
 const points=t=>{motion.at(t);const P={};for(const b of worker.bones)P[b.name]=b.getWorldPosition(V());for(const [k,[b,o]] of Object.entries(OFF)){const bb=bone(worker,b);P[k]=V(o).applyQuaternion(bb.getWorldQuaternion(new T.Quaternion())).add(bb.getWorldPosition(V()));}return P;};
 const com=P=>{const c=V();for(const [a,b,f] of SEG)c.addScaledVector(P[a].clone().add(P[b]),f/2);return c.divideScalar(FRACTION);},h=.002;
 const momentum=t=>{const A=points(t-h),P=points(t),C=points(t+h),c=com(P),vc=com(C).sub(com(A)).divideScalar(2*h),L=V();
  for(const [a,b,f] of SEG){const m=KG*f,mid=Q=>Q[a].clone().add(Q[b]).multiplyScalar(.5),dir=Q=>Q[b].clone().sub(Q[a]).normalize(),len=P[a].distanceTo(P[b]);
   L.add(mid(P).sub(c).cross(mid(C).sub(mid(A)).divideScalar(2*h).sub(vc)).multiplyScalar(m)).add(dir(P).cross(dir(C).sub(dir(A)).divideScalar(2*h)).multiplyScalar(m*len*len/12));}return L;};
 let worst=-Infinity,at=0;
 for(let t=.02;t<=duration-.02+1e-9;t+=.02){const c=com(points(t)),acc=com(points(t-h)).add(com(points(t+h))).addScaledVector(c,-2).divideScalar(h*h),F=acc.add(V([0,GRENADE_THROW.gravity,0])).multiplyScalar(MASS),dL=momentum(t+h).sub(momentum(t-h)).divideScalar(2*h);
  const cop=[c.x-(c.y*F.x-dL.z)/F.y,c.z-(c.y*F.z+dL.x)/F.y];const d=motion.at(t);worker.root.updateMatrixWorld(true);const out=outside(hull(soleOnFloor(worker)),cop);if(out>worst){worst=out;at=t;}
  for(const side of [1,-1])if(d.feet[side].contact==='air')assert.notEqual(d.feet[-side].contact,'air','one hoof is always down');}
 assert.ok(worst<.015,'centre of pressure '+(100*worst).toFixed(1)+' cm outside the hooves at '+at.toFixed(2)+' s');
}));
test('lead hoof plants before the throw and holds; the rear hoof pivots on a fixed toe while the hips drive through',()=>fixture(({worker,motion})=>{
 assert.ok(plant<release);const planted=motion.at(plant).feet[-1];assert.equal(planted.contact,'flat');
 for(let t=plant;t<3.10;t+=.01){const d=motion.at(t);assert.equal(d.feet[-1].contact,'flat');assert.ok(V(d.feet[-1].ankle).distanceTo(V(planted.ankle))<1e-8,'lead hoof cannot skate');}
 // The rear hoof's contact: every skinned sole vertex on the floor. The heel lifts and the contact rolls forward onto the
 // toe; from about 1.82 s the hoof has rolled onto one inner corner; whatever touches must stay on the floor and in one place while the hoof turns.
 const touching=()=>{const foot=worker.parts.find(p=>p.name.includes('hoof')&&p.name.endsWith(' 1')),a=foot.geometry.attributes.position,out=[];for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);foot.applyBoneTransform(i,p);p.applyMatrix4(foot.matrixWorld);if(p.y<1e-6)out.push(p);}return out;};
 motion.at(1.84);const anchor=touching();assert.ok(anchor.length>=1);let pitched=0;
 for(let t=1.84;t<2.09;t+=.01){const d=motion.at(t),now=touching();assert.equal(d.feet[1].contact,'toe');assert.ok(now.length>=1,'rear toe stays on the floor');
  for(const p of now)assert.ok(anchor.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<1e-6),'rear toe cannot slide while it pivots');
  pitched=Math.min(pitched,V([1,0,0]).applyQuaternion(bone(worker,'hoof1').getWorldQuaternion(new T.Quaternion())).y);}
 assert.ok(pitched<-.3,'the rear heel lifts as the hips turn over it');
 const d=motion.at(release);assert.notEqual(d.feet[1].contact,'air');assert.notEqual(d.feet[-1].contact,'air');
}));
test('actual skinned hoof soles stay on or above the floor and match planted contacts',()=>fixture(({worker,motion})=>{
 for(let frame=0;frame<=138;frame++){const d=motion.at(frame/30);for(const side of [-1,1]){const low=lowestSole(worker,side);
   assert.ok(low>=-1e-7);if(d.feet[side].contact!=='air')assert.ok(Math.abs(low)<1e-7,d.feet[side].contact+' hoof touches the floor');
  }}
}));
test('reverse scrubbing, restart and clamped end frames are deterministic; invalid time is rejected',()=>fixture(({worker,motion})=>{
 const capture=t=>{const d=motion.at(t);return {d,bones:worker.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()])};},expected=capture(1.82);for(const t of [4.6,0,2.95,.42,2.1])motion.at(t);assert.deepEqual(capture(1.82),expected);assert.deepEqual(capture(-5),capture(0));assert.deepEqual(capture(99),capture(4.6));assert.throws(()=>motion.at(NaN),/finite/);assert.throws(()=>motion.at(Infinity),/finite/);
}));
test('grenade remains a small separately disposable prop with grip/release semantics',()=>fixture(({grenade})=>{
 assert.ok(grenade.triangles<1000);const box=new T.Box3().setFromObject(grenade.root),size=box.getSize(V());assert.ok(size.y<.13&&size.x<.1&&size.z<.1);assert.ok(grenade.anchors.grip&&grenade.anchors.release);assert.equal(grenade.anchors.muzzle,undefined);assert.ok(grenade.parts.some(p=>p.name==='curved safety lever'));let events=0;grenade.parts[0].geometry.addEventListener('dispose',()=>events++);grenade.dispose();grenade.dispose();assert.equal(events,1);
}));
test('free hand pulls the ring before the turn; ring and safety lever fall to rest on the floor, clear of the hooves',()=>fixture(({worker,motion})=>{
 const seen=[];let ringRest=null,leverRest=null;
 for(let t=0;t<=duration+1e-9;t+=.005){const d=motion.at(t);if(seen.at(-1)!==d.ring.phase)seen.push(d.ring.phase);
  assert.ok(d.ring.groundClearance>=-1e-5&&d.lever.groundClearance>=-1e-5,'ring and lever stay above the floor');
  if(d.ring.phase==='hand')assert.ok(V(d.ring.position).distanceTo(bone(worker,'fingers-1').getWorldPosition(V()))<.08,'ring rides the free fingers');
  if(t<GRENADE_THROW.lever)assert.equal(d.lever.phase,'held');
  if(d.ring.position[1]<.02){worker.root.updateMatrixWorld(true);for(const side of [-1,1]){const sole=soleOnFloor(worker,[side]);if(sole.length)assert.ok(outside(hull(sole),[d.ring.position[0],d.ring.position[2]])>.03,'nothing steps on the ring');}}
  if(d.ring.phase==='dropped')ringRest??=d.ring.position;if(d.lever.phase==='dropped')leverRest??=d.lever.position;}
 assert.deepEqual(seen,['pin','hand','falling','dropped']);assert.ok(GRENADE_THROW.drop<GRENADE_KEYS[1].time,'the pin is out before the turn');
 const settled=motion.at(duration-.5),end=motion.at(duration);assert.ok(ringRest&&leverRest);assert.ok(V(end.ring.position).distanceTo(V(settled.ring.position))<1e-9&&V(end.lever.position).distanceTo(V(settled.lever.position))<1e-9,'loose parts come to rest');
 assert.ok(end.lever.position[0]>.5&&end.lever.position[0]<GRENADE_THROW.target,'the lever flies off toward the target and falls short');
}));
test('throw runs hips, then chest, then hand; the hand is fastest at release and slows in the follow-through',()=>fixture(({worker,motion})=>{
 const heading=name=>{const f=V([1,0,0]).applyQuaternion(bone(worker,name).getWorldQuaternion(new T.Quaternion()));return Math.atan2(-f.z,f.x);};
 const peak={hips:{v:0,t:0},spine:{v:0,t:0}},speed=[];let last=null;
 for(let t=1.50;t<=2.10+1e-9;t+=.005){const d=motion.at(t),now={hips:heading('hips'),spine:heading('spine'),palm:V(d.palm)};
  if(last){for(const k of ['hips','spine']){const w=(now[k]-last[k])/.005;if(w>peak[k].v)peak[k]={v:w,t};}speed.push({t,v:now.palm.distanceTo(last.palm)/.005});}last=now;}
 assert.ok(peak.hips.t<peak.spine.t&&peak.spine.t<release,`hips peak ${peak.hips.t.toFixed(3)} s, chest ${peak.spine.t.toFixed(3)} s, release ${release} s`);
 const at=t=>speed.reduce((b,s)=>Math.abs(s.t-t)<Math.abs(b.t-t)?s:b).v,before=Math.max(...speed.filter(s=>s.t<=release+1e-9).map(s=>s.v));
 assert.ok(at(release)>=.95*before,'the hand reaches its top speed at the release');assert.ok(at(release+.08)<.65*at(release),'the arm decelerates once the grenade is gone');
}));
test('overhand release above the throwing shoulder on a rising arc',()=>fixture(({worker,motion})=>{
 motion.at(release);const shoulder=bone(worker,'upperArm1').getWorldPosition(V()),c=motion.releaseCenter,v=motion.launch;
 assert.ok(c.y>shoulder.y+.25,'released above the shoulder, not pushed from in front of the face');assert.ok(v.y>0&&v.x>0&&Math.atan2(v.y,v.x)>.35,'the grenade is thrown so that it arcs');
}));
test('throw ends standing where it began: hooves, pelvis and limbs back in the neutral stance, body at rest',()=>fixture(({worker,motion})=>{
 const neutral=new Map(worker.bones.map(b=>[b.name,b.getWorldPosition(V())]));worker.pose('neutral');worker.root.updateMatrixWorld(true);for(const b of worker.bones)neutral.set(b.name,b.getWorldPosition(V()));
 motion.at(duration);for(const b of worker.bones)if(b.name!=='head')assert.ok(b.getWorldPosition(V()).distanceTo(neutral.get(b.name))<.002,b.name+' returns to the neutral stance');
 const a=motion.at(0).hips,b=motion.at(.004).hips;assert.ok(V(a).distanceTo(V(b))/.004<.01,'the throw starts from rest');
}));
