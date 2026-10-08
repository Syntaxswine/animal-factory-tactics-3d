import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createGrenadeModel} from '../dist/tactics/grenade-model.js';
import {createGrenadeThrow,GRENADE_THROW,GRENADE_KEYS} from '../dist/tactics/grenade-throw-motion.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url))),V=a=>new T.Vector3(...(a||[0,0,0]));
function fixture(fn){const worker=createLightHorse(data),grenade=createGrenadeModel(),motion=createGrenadeThrow(worker,grenade);try{fn({worker,grenade,motion});}finally{motion.dispose();grenade.dispose();worker.skeleton.dispose();worker.dispose();}}
const {release,duration}=GRENADE_THROW,bone=(worker,name)=>worker.bones.find(b=>b.name===name),DEG=180/Math.PI;
const heading=(worker,name)=>{const f=V([1,0,0]).applyQuaternion(bone(worker,name).getWorldQuaternion(new T.Quaternion()));return Math.atan2(-f.z,f.x);};
function lowestSole(worker,side){const foot=worker.parts.find(p=>p.name.includes('hoof')&&p.name.endsWith(' '+side)),a=foot.geometry.attributes.position;let low=Infinity;for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);foot.applyBoneTransform(i,p);low=Math.min(low,p.applyMatrix4(foot.matrixWorld).y);}return low;}
function soleOnFloor(worker,sides=[-1,1]){const out=[];for(const side of sides){const foot=worker.parts.find(p=>p.name.includes('hoof')&&p.name.endsWith(' '+side)),a=foot.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);foot.applyBoneTransform(i,p);p.applyMatrix4(foot.matrixWorld);if(p.y<.001)out.push([p.x,p.z]);}}return out;}
function hull(pts){const p=[...pts].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];for(const q of p){while(lo.length>=2&&cr(lo.at(-2),lo.at(-1),q)<=0)lo.pop();lo.push(q);}for(const q of [...p].reverse()){while(up.length>=2&&cr(up.at(-2),up.at(-1),q)<=0)up.pop();up.push(q);}return lo.slice(0,-1).concat(up.slice(0,-1));}
// Signed distance from a convex polygon (negative inside); a point or an edge has no inside.
function outside(h,q){let inside=h.length>2,best=Infinity;for(let i=0;i<h.length;i++){const a=h[i],b=h[(i+1)%h.length],ex=b[0]-a[0],ez=b[1]-a[1],L=Math.hypot(ex,ez)||1e-12;if((ex*(q[1]-a[1])-ez*(q[0]-a[0]))/L<0)inside=false;const k=Math.max(0,Math.min(1,((q[0]-a[0])*ex+(q[1]-a[1])*ez)/(L*L)));best=Math.min(best,Math.hypot(q[0]-a[0]-k*ex,q[1]-a[1]-k*ez));}return inside?-best:best;}
// Palm speeds by finite difference of the reported palm, every dt from t0 to t1.
function palmSpeeds(motion,t0,t1,dt){const out=[];let last=V(motion.at(t0).palm);for(let t=t0+dt;t<=t1+1e-9;t+=dt){const p=V(motion.at(t).palm);out.push({t,v:p.distanceTo(last)/dt});last=p;}return out;}

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
 // Sampled every 5 ms, and every 1 ms through the release, where the arm brakes hardest.
 const KG=75,SEG=[['hips','spine',.281],['spine','head',.216],['head','headTip',.081],...[-1,1].flatMap(s=>[['upperArm'+s,'forearm'+s,.028],['forearm'+s,'hand'+s,.016],['hand'+s,'palm'+s,.006],['thigh'+s,'shin'+s,.10],['shin'+s,'hoof'+s,.0465],['hoof'+s,'toe'+s,.00725],['hoof'+s,'heel'+s,.00725]])];
 const OFF={headTip:['head',[.14,.32,0]],...Object.fromEntries([-1,1].flatMap(s=>[['palm'+s,['hand'+s,[.052,-.01,0]]],['toe'+s,['hoof'+s,[.145,-.12,0]]],['heel'+s,['hoof'+s,[-.06,-.12,0]]]]))},FRACTION=SEG.reduce((s,x)=>s+x[2],0),MASS=KG*FRACTION;
 const points=t=>{motion.at(t);const P={};for(const b of worker.bones)P[b.name]=b.getWorldPosition(V());for(const [k,[b,o]] of Object.entries(OFF)){const bb=bone(worker,b);P[k]=V(o).applyQuaternion(bb.getWorldQuaternion(new T.Quaternion())).add(bb.getWorldPosition(V()));}return P;};
 const com=P=>{const c=V();for(const [a,b,f] of SEG)c.addScaledVector(P[a].clone().add(P[b]),f/2);return c.divideScalar(FRACTION);},h=.002;
 const momentum=t=>{const A=points(t-h),P=points(t),C=points(t+h),c=com(P),vc=com(C).sub(com(A)).divideScalar(2*h),L=V();
  for(const [a,b,f] of SEG){const m=KG*f,mid=Q=>Q[a].clone().add(Q[b]).multiplyScalar(.5),dir=Q=>Q[b].clone().sub(Q[a]).normalize(),len=P[a].distanceTo(P[b]);
   L.add(mid(P).sub(c).cross(mid(C).sub(mid(A)).divideScalar(2*h).sub(vc)).multiplyScalar(m)).add(dir(P).cross(dir(C).sub(dir(A)).divideScalar(2*h)).multiplyScalar(m*len*len/12));}return L;};
 const times=[];for(let i=1;i<duration/.005-1;i++)times.push(i*.005);for(let t=release-.02;t<=release+.06;t+=.001)times.push(t);
 let worst=-Infinity,at=0;
 for(const t of times){const c=com(points(t)),acc=com(points(t-h)).add(com(points(t+h))).addScaledVector(c,-2).divideScalar(h*h),F=acc.add(V([0,GRENADE_THROW.gravity,0])).multiplyScalar(MASS),dL=momentum(t+h).sub(momentum(t-h)).divideScalar(2*h);
  const cop=[c.x-(c.y*F.x-dL.z)/F.y,c.z-(c.y*F.z+dL.x)/F.y];const d=motion.at(t);worker.root.updateMatrixWorld(true);const out=outside(hull(soleOnFloor(worker)),cop);if(out>worst){worst=out;at=t;}
  for(const side of [1,-1])if(d.feet[side].contact==='air')assert.notEqual(d.feet[-side].contact,'air','one hoof is always down');}
 assert.ok(worst<0,'centre of pressure '+(100*worst).toFixed(1)+' cm outside the hooves at '+at.toFixed(3)+' s');
}));
test('lead hoof plants well before the throw and holds; the rear hoof pivots on a fixed toe while the hips drive through',()=>fixture(({worker,motion})=>{
 let plantedAt=null;for(let t=1.30;t<release&&plantedAt===null;t+=.005)if(motion.at(t).feet[-1].contact==='flat'&&motion.at(t-.005).feet[-1].contact!=='flat')plantedAt=t;
 assert.ok(plantedAt!==null&&plantedAt<=release-.25,'the lead hoof is down a quarter second before the release');const planted=motion.at(plantedAt).feet[-1];
 for(let t=plantedAt;t<3.10;t+=.01){const d=motion.at(t);assert.equal(d.feet[-1].contact,'flat');assert.ok(V(d.feet[-1].ankle).distanceTo(V(planted.ankle))<1e-8,'lead hoof cannot skate');}
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
test('no sole vertex that touches the floor slides, on either hoof, at any time',()=>fixture(({worker,motion})=>{
 const touch=side=>{const foot=worker.parts.find(p=>p.name.includes('hoof')&&p.name.endsWith(' '+side)),a=foot.geometry.attributes.position,out=new Map();for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);foot.applyBoneTransform(i,p);p.applyMatrix4(foot.matrixWorld);if(p.y<1e-6)out.set(i,p);}return out;};
 let last=null,worst=0,at=0;
 for(let t=0;t<=duration+1e-9;t+=.005){motion.at(t);worker.root.updateMatrixWorld(true);const now=[touch(-1),touch(1)];
  if(last)for(let s=0;s<2;s++)for(const [i,p] of now[s]){const q=last[s].get(i);if(q){const d=Math.hypot(p.x-q.x,p.z-q.z);if(d>worst){worst=d;at=t;}}}last=now;}
 assert.ok(worst<5e-5,'a touching sole vertex slid '+(1000*worst).toFixed(3)+' mm in 5 ms at '+at.toFixed(3)+' s');
}));
test('actual skinned hoof soles stay on or above the floor and match planted contacts',()=>fixture(({worker,motion})=>{
 for(let frame=0;frame<=138;frame++){const d=motion.at(frame/30);for(const side of [-1,1]){const low=lowestSole(worker,side);
   assert.ok(low>=-1e-7);if(d.feet[side].contact!=='air')assert.ok(Math.abs(low)<1e-7,d.feet[side].contact+' hoof touches the floor');
  }}
}));
test('reverse scrubbing, restart and clamped end frames are deterministic; invalid time is rejected',()=>fixture(({worker,motion})=>{
 const capture=t=>{const d=motion.at(t);return {d,bones:worker.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()])};},expected=capture(1.82);for(const t of [4.6,0,2.95,.42,2.1])motion.at(t);assert.deepEqual(capture(1.82),expected);assert.deepEqual(capture(-5),capture(0));assert.deepEqual(capture(99),capture(4.6));assert.throws(()=>motion.at(NaN),/finite/);assert.throws(()=>motion.at(Infinity),/finite/);
}));
test('every accessor rejects non-finite time, and a disposed motion refuses time',()=>{
 const worker=createLightHorse(data),grenade=createGrenadeModel(),motion=createGrenadeThrow(worker,grenade);
 try{for(const f of [t=>motion.at(t),motion.projectile,motion.ring,motion.lever,motion.palmAt,motion.balance.cop,motion.balance.centre])assert.throws(()=>f(NaN),/finite/);
  motion.dispose();for(const f of [t=>motion.at(t),motion.projectile,motion.ring,motion.lever,motion.palmAt,motion.balance.cop])assert.throws(()=>f(1),/disposed/);}
 finally{motion.dispose();grenade.dispose();worker.skeleton.dispose();worker.dispose();}
});
test('phase labels name the key frames',()=>fixture(({motion})=>{
 for(const key of GRENADE_KEYS)assert.equal(motion.at(key.time).phase,key.label,key.label+' at '+key.time+' s');
}));
test('grenade remains a small separately disposable prop with grip/release semantics',()=>fixture(({grenade})=>{
 assert.ok(grenade.triangles<1000);const box=new T.Box3().setFromObject(grenade.root),size=box.getSize(V());assert.ok(size.y<.13&&size.x<.1&&size.z<.1);assert.ok(grenade.anchors.grip&&grenade.anchors.release);assert.equal(grenade.anchors.muzzle,undefined);assert.ok(grenade.parts.some(p=>p.name==='curved safety lever'));let events=0;grenade.parts[0].geometry.addEventListener('dispose',()=>events++);grenade.dispose();grenade.dispose();assert.equal(events,1);
}));
test('free hand pulls the ring before the turn; ring and safety lever fall to rest on the floor, clear of the hooves',()=>fixture(({worker,motion})=>{
 const seen=[];let ringRest=null,leverRest=null,inHand=null,ringOut=null,turned=null;motion.at(0);const hips0=heading(worker,'hips');
 for(let t=0;t<=duration+1e-9;t+=.005){const d=motion.at(t);if(seen.at(-1)!==d.ring.phase)seen.push(d.ring.phase);
  assert.ok(d.ring.groundClearance>=-1e-5&&d.lever.groundClearance>=-1e-5,'ring and lever stay above the floor');
  // Hooked on the free fingers, the ring moves rigidly with that hand.
  if(d.ring.phase==='hand'){const local=bone(worker,'hand-1').worldToLocal(V(d.ring.position));inHand??=local;assert.ok(local.distanceTo(inHand)<1e-4,'ring rides the free hand');}
  if(t<GRENADE_THROW.lever)assert.equal(d.lever.phase,'held');
  if(ringOut===null&&d.ring.phase!=='pin')ringOut=t;
  if(turned===null&&Math.abs(heading(worker,'hips')-hips0)>10/DEG)turned=t;
  if(d.ring.position[1]<.02){worker.root.updateMatrixWorld(true);for(const side of [-1,1]){const sole=soleOnFloor(worker,[side]);if(sole.length)assert.ok(outside(hull(sole),[d.ring.position[0],d.ring.position[2]])>.03,'nothing steps on the ring');}}
  if(d.ring.phase==='dropped')ringRest??=d.ring.position;if(d.lever.phase==='dropped')leverRest??=d.lever.position;}
 assert.deepEqual(seen,['pin','hand','falling','dropped']);assert.ok(inHand,'the ring was carried in the free hand');
 assert.ok(ringOut!==null&&turned!==null&&ringOut<turned,`the pin is out (${ringOut?.toFixed(3)} s) before the hips turn 10 degrees (${turned?.toFixed(3)} s)`);
 const settled=motion.at(duration-.5),end=motion.at(duration);assert.ok(ringRest&&leverRest);assert.ok(V(end.ring.position).distanceTo(V(settled.ring.position))<1e-9&&V(end.lever.position).distanceTo(V(settled.lever.position))<1e-9,'loose parts come to rest');
 assert.ok(end.lever.position[0]>.5&&end.lever.position[0]<3&&Math.abs(end.lever.position[2])<1,'the strip of lever flies off toward the target and falls well short of it');
}));
test('ring and lever meshes are drawn exactly where the motion reports them',()=>fixture(({grenade,motion})=>{
 const parts={ring:grenade.parts.find(p=>p.name==='pull ring'),lever:grenade.parts.find(p=>p.name==='curved safety lever')},first={};
 for(let t=0;t<=duration+1e-9;t+=.01){motion.at(t);for(const [k,mesh] of Object.entries(parts)){const pose=motion[k](t),rel=new T.Matrix4().compose(pose.position,pose.quaternion,V([1,1,1])).invert().multiply(mesh.matrixWorld);
  first[k]??=rel;assert.ok(rel.elements.every((x,i)=>Math.abs(x-first[k].elements[i])<1e-9),k+' mesh follows its reported pose at '+t.toFixed(2)+' s');}}
}));
test('throw runs hips, then chest, then hand; the hand is fastest at release and slows in the follow-through',()=>fixture(({worker,motion})=>{
 const peak={hips:{v:0,t:0},spine:{v:0,t:0}},speed=[];let last=null;
 for(let t=1.50;t<=2.10+1e-9;t+=.005){const d=motion.at(t),now={hips:heading(worker,'hips'),spine:heading(worker,'spine'),palm:V(d.palm)};
  if(last){for(const k of ['hips','spine']){const w=(now[k]-last[k])/.005;if(w>peak[k].v)peak[k]={v:w,t};}speed.push({t,v:now.palm.distanceTo(last.palm)/.005});}last=now;}
 assert.ok(peak.hips.t<peak.spine.t&&peak.spine.t<release,`hips peak ${peak.hips.t.toFixed(3)} s, chest ${peak.spine.t.toFixed(3)} s, release ${release} s`);
 const at=t=>speed.reduce((b,s)=>Math.abs(s.t-t)<Math.abs(b.t-t)?s:b).v,before=Math.max(...speed.filter(s=>s.t<=release+1e-9).map(s=>s.v));
 assert.ok(at(release)>=.95*before,'the hand reaches its top speed at the release');assert.ok(at(release+.04)<.8*at(release),'the arm brakes as soon as the grenade is gone');
}));
test('the arm builds speed into the release: no lull in the last 80 ms, and the elbow extends once, without a second pump',()=>fixture(({worker,motion})=>{
 let top=0,drop=0;for(const s of palmSpeeds(motion,release-.085,release,.005)){top=Math.max(top,s.v);drop=Math.max(drop,top-s.v);}
 assert.ok(drop<.15,'the hand loses '+drop.toFixed(3)+' m/s on its way to the release');
 // Over the whole stroke from the plant: once the elbow has opened 1 degree from its deepest bend, it never bends again.
 let deepest=-Infinity,opening=false,least=Infinity,rebend=0,at=0;
 for(let t=1.60;t<=release+1e-9;t+=.005){motion.at(t);const sh=bone(worker,'upperArm1').getWorldPosition(V()),el=bone(worker,'forearm1').getWorldPosition(V()),wr=bone(worker,'hand1').getWorldPosition(V()),f=180-sh.sub(el).angleTo(wr.sub(el))*DEG;
  deepest=Math.max(deepest,f);if(deepest-f>1)opening=true;if(opening){if(f-least>rebend){rebend=f-least;at=t;}least=Math.min(least,f);}}
 assert.ok(rebend<.5,'the elbow bends again by '+rebend.toFixed(2)+' degrees at '+at.toFixed(3)+' s');
}));
test('after release the hand only slows, sweeping down in front of the lead thigh',()=>fixture(({motion})=>{
 let low=Infinity,rise=0,at=0;for(const s of palmSpeeds(motion,release,2.54,.01)){if(s.v-low>rise){rise=s.v-low;at=s.t;}low=Math.min(low,s.v);}
 assert.ok(rise<.05,'the follow-through speeds up again by '+rise.toFixed(3)+' m/s at '+at.toFixed(2)+' s');
 let z=Infinity,y=Infinity;for(let t=2.40;t<=2.60;t+=.01){const p=motion.at(t).palm;z=Math.min(z,p[2]);y=Math.min(y,p[1]);}
 assert.ok(z<-.05&&y<.70,`the hand finishes low and across the body (z ${z.toFixed(3)}, height ${y.toFixed(3)})`);
}));
test('overhand release above the throwing shoulder on a rising arc',()=>fixture(({worker,motion})=>{
 motion.at(release);const shoulder=bone(worker,'upperArm1').getWorldPosition(V()),c=motion.releaseCenter,v=motion.launch;
 assert.ok(c.y>shoulder.y+.25,'released above the shoulder, not pushed from in front of the face');assert.ok(v.y>0&&v.x>0&&Math.atan2(v.y,v.x)>.35,'the grenade is thrown so that it arcs');
}));
test('the head turns at most 40 degrees from the chest, so the skinned neck seam holds',()=>fixture(({worker,motion})=>{
 let worst=0,at=0;for(let t=0;t<=duration+1e-9;t+=.005){motion.at(t);const rel=bone(worker,'spine').getWorldQuaternion(new T.Quaternion()).invert().multiply(bone(worker,'head').getWorldQuaternion(new T.Quaternion())),a=2*Math.acos(Math.min(1,Math.abs(rel.w)))*DEG;if(a>worst){worst=a;at=t;}}
 assert.ok(worst<40.5,'the head turns '+worst.toFixed(1)+' degrees from the chest at '+at.toFixed(3)+' s');
}));
test('while loading, the free arm points along the throw and the rear hoof is turned out',()=>fixture(({worker,motion})=>{
 for(let t=1.20;t<=1.60;t+=.01){motion.at(t);const dir=bone(worker,'hand-1').getWorldPosition(V()).sub(bone(worker,'upperArm-1').getWorldPosition(V())).normalize(),h=Math.atan2(-dir.z,dir.x)*DEG,e=Math.asin(dir.y)*DEG;
  assert.ok(Math.abs(h)<20&&e>20&&e<45,`free arm heading ${h.toFixed(1)}, elevation ${e.toFixed(1)} degrees at ${t.toFixed(2)} s`);
  assert.ok(heading(worker,'hoof1')*DEG<-60,'the rear hoof is turned out across the throw at '+t.toFixed(2)+' s');}
}));
test('neither arm passes into the torso',()=>fixture(({worker,motion})=>{
 // Shirt and overalls vertices skinned to the spine and hips form the torso surface; each forearm and glove vertex is
 // signed against its nearest torso vertex (within 6 cm) along that vertex's skinned normal. Negative is inside.
 const weight=(a,i,re)=>{let s=0;for(let k=0;k<4;k++)if(re.test(worker.bones[a.skinIndex.getComponent(i,k)].name))s+=a.skinWeight.getComponent(i,k);return s;};
 const pick=(name,re,min)=>{const mesh=worker.parts.find(p=>p.name===name),a=mesh.geometry.attributes,idx=[];for(let i=0;i<a.position.count;i++)if(weight(a,i,re)>min)idx.push(i);return {mesh,a,idx};};
 const torso=['connected shirt and sleeves','connected overalls seat and legs'].map(n=>pick(n,/^(spine|hips)$/,.8)),arms=[1,-1].map(s=>pick('forearm and hand '+s,new RegExp('^(hand|fingers|forearm)'+s+'$'),.6));
 const skin=({mesh,a},i,off=0)=>{const p=V().fromBufferAttribute(a.position,i);if(off)p.addScaledVector(V().fromBufferAttribute(a.normal,i),off);mesh.applyBoneTransform(i,p);return p.applyMatrix4(mesh.matrixWorld);};
 const CELL=.06,key=p=>[Math.floor(p.x/CELL),Math.floor(p.y/CELL),Math.floor(p.z/CELL)];let worst=0,at=0;
 for(let t=0;t<=duration+1e-9;t+=.02){motion.at(t);worker.root.updateMatrixWorld(true);const grid=new Map();
  for(const part of torso)for(const i of part.idx){const p=skin(part,i),n=skin(part,i,1e-3).sub(p).normalize(),k=key(p).join();if(!grid.has(k))grid.set(k,[]);grid.get(k).push([p,n]);}
  for(const arm of arms)for(const i of arm.idx){const q=skin(arm,i),[x,y,z]=key(q);let best=CELL*CELL,near=null;
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)for(const s of grid.get([x+dx,y+dy,z+dz].join())||[]){const d=q.distanceToSquared(s[0]);if(d<best){best=d;near=s;}}
   if(near){const depth=-q.clone().sub(near[0]).dot(near[1]);if(depth>worst){worst=depth;at=t;}}}}
 assert.ok(worst<.01,'an arm is '+(100*worst).toFixed(2)+' cm inside the torso at '+at.toFixed(2)+' s');
}));
test('throw starts and ends on the neutral head; ends standing where it began, limbs neutral and at rest',()=>fixture(({worker,motion})=>{
 worker.pose('neutral');worker.root.updateMatrixWorld(true);const neutral=new Map(worker.bones.map(b=>[b.name,[b.getWorldPosition(V()),b.getWorldQuaternion(new T.Quaternion())]]));
 const head=bone(worker,'head');for(const t of [0,duration]){motion.at(t);assert.ok(head.getWorldPosition(V()).distanceTo(neutral.get('head')[0])<1e-3&&head.getWorldQuaternion(new T.Quaternion()).angleTo(neutral.get('head')[1])<.5/DEG,'the head is neutral at '+t+' s');}
 motion.at(duration);for(const b of worker.bones)assert.ok(b.getWorldPosition(V()).distanceTo(neutral.get(b.name)[0])<.002,b.name+' returns to the neutral stance');
 const a=motion.at(0).hips,b=motion.at(.004).hips;assert.ok(V(a).distanceTo(V(b))/.004<.01,'the throw starts from rest');
}));
