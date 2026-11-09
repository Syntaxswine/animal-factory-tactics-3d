import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {naturalTraversal,createNaturalTraversal} from '../dist/tactics/natural-traversal.js';
import {contactProbe,supportAt} from '../dist/tactics/traversal-balance.js';
import {steadyPoles} from '../dist/tactics/traversal-pose.js';
import {rigKey} from '../dist/tactics/idle-motion.js';
import {IDLE_FITS} from '../dist/tactics/idle-fits.js';
// The natural crossings (docs/tactics/NATURAL-TRAVERSAL.md) on every mammal, built the way the battle builds a model.
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>p.id!=='hen'),KINDS=['window','low-wall','wall'];
const model=p=>{const worker=p.create(JSON.parse(readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url),'utf8')));return {worker,profile:p,posture:createBattlePosture(worker,p),locomotion:createWorkerLocomotion(worker,p)};};
const crossing=kind=>({id:1,unitId:1,kind,from:{x:0,y:0,z:0},to:{x:1,y:0,z:0}});
// The deepest trunk, head and tail point each crossing leaves in the floor or the obstacle as it is played (the
// clearance fit's report, taken again after the balance; a tail's root counts as trunk), in cm: about a centimetre,
// except the named gaps, which may only shrink. 8 cm is right through the 16 cm wall; past that the way out is up.
// Read before the balance (to d3fec1f), the report missed the window's tails, the climb's heads 5 to 8 cm in its wall
// and the pigs 25 to 40 cm in its floor; read here, it found the pigs' bellies 8 to 16 cm through the top in the straddle.
const LEFT={'window/pig-foreman/trunk':2,'window/pig-director/trunk':3, // the belly on the sill as the body tips over
 'window/donkey/head':3,'window/rabbit/head':6, // long ears graze the lintel at the hop for ~20 ms
 'window/skunk/trunk':2, // the plume's root, which rides the hips, on the floor in the roll
 'window/dog/trunk':2,'wall/dog/trunk':2, // the dog's utility pouch on the sill's far edge, and on the face in the hang
 'low-wall/pig-director/trunk':2, // the waistcoat on the wall's near edge at the spring
 'wall/pig-foreman/trunk':2,'wall/pig-director/trunk':3}; // the seat resting on the 16 cm top in the straddle (15.6 and 7.9 through it before)
// As the window's seat lets go the centre of mass is over the feet (cm inside their support, the least from the lean to
// the rise, as the balance plans it): sat after the roll, every mammal's was 9 to 22 cm behind its feet, and the plan
// threw the body at them as the seat lifted. The rabbit's and dog's furry feet hold from the ankle forward, their heels
// off the floor.
const LIFT={rabbit:-3,dog:-2};
// The hen hops on her wings (hen-crossing.js). Her body parts stay within 4 cm of clear of the floor and the obstacle,
// except the tail fan in the last 0.3 s: spreading back to her standing pose, it reaches .54 behind her, into the wall.
test('the hen hops up and down every obstacle, ends on the next tile and is given back whole',()=>{
 for(const kind of KINDS)for(const species of ['horse','hen'])assert.equal(naturalTraversal(crossing(kind),{species}),true);
 assert.equal(naturalTraversal(crossing('ladder'),{species:'hen'}),false);
 const hen=ANIMAL_MOTION_CATALOG.find(p=>p.id==='hen'),worker=hen.create(JSON.parse(readFileSync(new URL('../dist/tactics/'+hen.file,import.meta.url),'utf8')));
 const before=worker.parts.map(p=>Float32Array.from(p.geometry.attributes.position.array)),bonesBefore=worker.bones.map(b=>b.position.toArray().concat(b.quaternion.toArray()));
 const H=.08,boxes={window:[[0,.85],[1.55,2]],'low-wall':[[0,1]],wall:[[0,2]]};
 for(const kind of KINDS){const motion=createNaturalTraversal({worker,profile:hen},crossing(kind),{species:'hen'}),pelvis=()=>worker.root.getObjectByName('pelvis').getWorldPosition(worker.root.position.clone());
  motion.apply(0);const p0=pelvis();assert.ok(Math.abs(p0.x)<.01&&Math.abs(p0.z)<.01,`${kind} starts at ${p0.toArray()}`);
  const obst=boxes[kind].map(([y0,y1])=>({min:[.5-H,y0,-.5],max:[.5+H,y1,.5]})),v=p0.clone();let worst={d:0};
  for(let t=0;t<=motion.duration;t+=.02){motion.apply(t/motion.duration);for(const part of worker.parts){if(/tail/.test(part.name)&&t>motion.duration-.3)continue;const a=part.geometry.attributes.position;
   for(let i=0;i<a.count;i+=3){v.fromBufferAttribute(a,i);part.applyBoneTransform(i,v);v.applyMatrix4(part.matrixWorld);let d=obst.some(b=>v.x>b.min[0]&&v.x<b.max[0]&&v.z>b.min[2]&&v.z<b.max[2])?0:-v.y;
    for(const b of obst)if([v.x,v.y,v.z].every((c,j)=>c>b.min[j]&&c<b.max[j]))d=Math.max(d,Math.min(v.x-b.min[0],b.max[0]-v.x,v.y-b.min[1],b.max[1]-v.y));if(d>worst.d)worst={d,t,part:part.name};}}}
  assert.ok(worst.d<=.04,`${kind}: the ${worst.part} goes ${(100*worst.d).toFixed(1)} cm in at ${worst.t?.toFixed(2)} s`);
  motion.apply(1);const p1=pelvis();assert.ok(Math.abs(p1.x-p0.x-1)<.01&&Math.abs(p1.y-p0.y)<.01&&Math.abs(p1.z)<.01,`${kind} ends at ${p1.toArray()}`);
  motion.apply(.5);motion.dispose();
  worker.parts.forEach((p,i)=>assert.deepEqual(p.geometry.attributes.position.array,before[i],`${kind}: the ${p.name} is not given back`));
  assert.deepEqual(worker.bones.map(b=>b.position.toArray().concat(b.quaternion.toArray())),bonesBefore,`${kind}: the hen's bones are not given back`);}
});
// The limbs' bend sides (traversal-pose.js steadyPoles) are the cubic spline through their samples: a bent leg whose
// pole turns about its axis at 4 rad/s gives a side that follows it (0.16 degrees behind) and whose acceleration runs
// straight between its samples (2.7e-4 /s^2 off at most), away from the first and last 50 ms, where the track is held at
// rest while this pole keeps turning. With central slopes it rippled at the sample period (5.2e-2), the wiggle the
// balance's hips no longer cancel (splined without it, the skunk's window read 308 N at 2.904 s beside samples at 77
// and 68% of the phantom-wrench rig's limit).
// The balance counts no tail beyond its root as support on an obstacle (traversal-balance.js supportAt): the tails are
// fitted out of the obstacles again after the balance, so the plan must not lean on that support (the skunk's plume on
// the window's sill at its last step: 102 readings over the limit). A tail's root on an obstacle, and any tail on the
// floor, still count.
test('a tail beyond its root holds the body on the floor, not on an obstacle',()=>{
 const sill={min:[.42,0,-.5],max:[.58,.85,.5]},boot=[[.9,.2],[1.15,.2],[1.15,.33],[.9,.33]].map(([x,z],v)=>({part:0,v,x,y:.001,z}));
 const probe=pts=>({count:pts.length,names:['work boot 1','skunk tail plume'],part:Uint8Array.from(pts,p=>p.part),vertex:Uint32Array.from(pts,p=>p.v),
  x:Float32Array.from(pts,p=>p.x),y:Float32Array.from(pts,p=>p.y),z:Float32Array.from(pts,p=>p.z),boneNames:[],bone:new Uint16Array(pts.length),tails:{isRoot:(name,i)=>i<10}});
 const back=pts=>supportAt(probe([...boot,...pts]),[sill],[.97,.75,.1]).box[0];
 const near=(a,b)=>Math.abs(a-b)<1e-6;
 assert.ok(near(back([]),.9),'the boot alone');
 assert.ok(near(back([{part:1,v:50,x:.57,y:.849,z:.2}]),.9),'a bent tail on the sill holds the body');
 assert.ok(near(back([{part:1,v:5,x:.57,y:.849,z:.2}]),.57),"a tail's root on the sill does not hold the body");
 assert.ok(near(back([{part:1,v:50,x:.7,y:.002,z:.2}]),.7),'a tail on the floor does not hold the body');
});
test("the limbs' bend sides run straight between their samples",()=>{
 const W=4,STEP=.005,pole=steadyPoles(1,t=>({leg1:{start:[0,1,0],target:[0,.2,0],pole:[Math.cos(W*t),0,Math.sin(W*t)],reach:.9}}),{step:STEP}),n=Math.round(1/STEP),h=1e-4;
 const f=t=>pole('leg1',t).toArray(),acc=t=>{const a=f(t-h),b=f(t),c=f(t+h);return a.map((x,i)=>(x-2*b[i]+c[i])/(h*h));};
 let worst=0;for(let k=10;k<n-10;k++){const a=[.2,.4,.6,.8].map(u=>acc((k+u)*STEP));for(let ax=0;ax<3;ax++)worst=Math.max(worst,Math.abs(a[1][ax]-(2*a[0][ax]+a[3][ax])/3),Math.abs(a[2][ax]-(a[0][ax]+2*a[3][ax])/3));}
 assert.ok(worst<=3e-3,`the bend side bends ${worst.toExponential(2)} /s^2 off a straight acceleration between its samples`);
 const s=f(.5),lag=Math.acos(Math.min(1,s[0]*Math.cos(W*.5)+s[2]*Math.sin(W*.5)))/Math.PI*180;assert.ok(lag<1,`the side is ${lag.toFixed(2)} degrees off its pole`);
});
for(const p of MAMMALS)test(`${p.id}: every crossing starts in its own stance, ends on the next tile's centre, clears the obstacle and gives the tail back`,()=>{
 const m=model(p),tails=m.worker.parts.filter(x=>/tail/.test(x.name)).map(x=>[x,Float32Array.from(x.geometry.attributes.position.array)]);
 for(const kind of KINDS){
  const motion=createNaturalTraversal(m,crossing(kind),{species:p.id}),bones=Object.fromEntries(m.worker.bones.map(b=>[b.name,b]));
  const at=progress=>{motion.apply(progress);return n=>bones[n].getWorldPosition(bones[n].position.clone()).toArray();};
  const pose0=at(0),hips=pose0('hips');assert.ok(Math.abs(hips[0])<.01&&Math.abs(hips[2])<.01,`${kind} starts at x ${hips[0]}, z ${hips[2]}`);
  const rest={hips:pose0('hips'),feet:[-1,1].map(s=>pose0('hoof'+s))},pose1=at(1);
  for(const [a,b]of [[pose1('hips'),rest.hips],...[-1,1].map((s,i)=>[pose1('hoof'+s),rest.feet[i]])])
   assert.ok(Math.abs(a[0]-b[0]-1)<.01&&Math.abs(a[1]-b[1])<.01&&Math.abs(a[2]-b[2])<.01,`${kind} ends at ${a.map(x=>x.toFixed(3))}, not its stance moved one tile (${b.map(x=>x.toFixed(3))})`);
  for(const part of ['trunk','head','tail']){const left=100*motion.fit[part].depth,limit=LEFT[`${kind}/${p.id}/${part}`]??1;
   assert.ok(left<=limit,`${kind}: the ${part} is left ${left.toFixed(1)} cm in at ${motion.fit[part].t.toFixed(2)} s (allowed ${limit})`);}
  // Both ends hand over to and from the battle's own stance, at rest. The balance's samples are evenly spaced and cover
  // the crossing, the last at its end or less than a step past it: clamped to the end, every window ended on a short
  // last step, read as a whole one, or stopped short of its end. Its turn of the body starts and ends at rest, turning
  // the body by at most 0.03 milliradian within 10 ms of either end: let in at full rate, the turn's track caught up
  // within its first and last 5 ms (the windows' 1.4 to 3.7 milliradian 10 ms from an end; the phantom-wrench rig,
  // reading every millisecond, found the body turning on the spot at every crossing's start).
  {const B=motion.balance,D=motion.duration,dt=B.times[1]-B.times[0];
   assert.ok(B.times[0]===0&&B.times.every((t,i)=>!i||Math.abs(t-B.times[i-1]-dt)<1e-9)&&B.times.at(-1)>=D&&B.times.at(-1)-D<dt,`${kind}: the balance's samples end at ${B.times.at(-1)} s, not evenly spaced over the crossing (${D} s)`);
   let turn={a:0};for(const x of [.0025,.005,.0075,.01])for(const t of [x,D-x]){const s=B.spin(t),a=s?2*Math.acos(Math.min(1,Math.abs(s.q.w))):0;if(a>turn.a)turn={a,t};}
   assert.ok(turn.a<=3e-5,`${kind}: the balance turns the body ${(1e3*turn.a).toFixed(3)} milliradian at ${turn.t?.toFixed(4)} s, within 10 ms of an end`);}
  // Between its 5 ms samples the balance's tracks, the hips' whole move (its shift with the offsets the motion adds
  // under it: the clearance fit's, and the window's sill and seat or the climb's top) and its turn of the body (angle
  // and pivot), are the cubic spline through them: their acceleration runs straight from sample to sample (away from
  // the tracks' own ends, which ease from rest), so they hold nothing between samples that the samples miss. With
  // central slopes the quintic bent between its samples to meet them: as the horse's weight went onto its right foot
  // after the window, its hips rippled 2.5 to 3 m/s^2 between samples, read as 77 to 243 N of phantom force a
  // millisecond past a sample whose own reading was at most 14% of the limit.
  {const B=motion.balance,n=B.times.length,h=1e-4,acc=(f,t)=>{const a=f(t-h),b=f(t),c=f(t+h);return a.map((x,i)=>(x-2*b[i]+c[i])/(h*h));};
   const turn=t=>{const s=B.spin(t);if(!s)return [0,0,0];const v=[s.q.x,s.q.y,s.q.z],l=Math.hypot(...v);return l<1e-15?[0,0,0]:v.map(x=>x*2*Math.atan2(l,s.q.w)/l);};
   const turning=k=>B.spin(B.times[k])&&B.spin(B.times[k+1]),unit={hips:'m/s^2',turn:'rad/s^2',pivot:'m/s^2'},seen={hips:0,turn:0,pivot:0};
   let bend={d:0};for(const [name,f,inner] of [['hips',t=>B.hips(t).toArray(),k=>k>0&&k<n-2],['turn',turn,turning],['pivot',t=>B.spin(t)?.pivot.toArray()??[0,0,0],turning]])
    for(let k=0;k<n-1;k++){if(!inner(k))continue;seen[name]++;const t0=B.times[k],T=B.times[k+1]-t0,a=[.2,.4,.6,.8].map(u=>acc(f,t0+u*T));
     for(let ax=0;ax<3;ax++){const d=Math.max(Math.abs(a[1][ax]-(2*a[0][ax]+a[3][ax])/3),Math.abs(a[2][ax]-(a[0][ax]+2*a[3][ax])/3));if(d>bend.d)bend={d,name,t:t0};}}
   assert.ok(seen.hips>0&&seen.turn>0&&seen.pivot>0,`${kind}: the balance's tracks were not read between samples (${JSON.stringify(seen)})`);
   assert.ok(bend.d<=.01,`${kind}: the balance's ${bend.name} bends ${bend.d.toFixed(3)} ${unit[bend.name]} off a straight acceleration between its samples at ${bend.t?.toFixed(3)} s`);}
  // A stepping leg keeps its knee bent: through the window's get-up steps and the climb's last two, the stepping leg's
  // hip-to-ankle distance stays short of the IK's soft reach (traversal-pose.js limb(): within SOFT, 1.5 cm, of straight
  // it eases the hoof short of its mark; mid-step the reach widens by the step's soft zone, so the bound is exact at the
  // lift and the landing and lenient between), so the hoof meets its mark. With the hips near standing height the
  // window's last step lifted and landed at 0.99 of the leg's length (10.7 to 15.0 mm inside that reach at the worst,
  // over the eleven mammals) and the climb's at 1.00, its hoof landing about 100 ms late.
  {const STEPS={window:{'Left foot back':-1,'Right foot back':1,'Left foot round':-1},wall:{'Left foot round':-1,'Right foot round':1}}[kind];
   if(STEPS){const P=n=>bones[n].getWorldPosition(new T.Vector3());let worst={m:Infinity};
    for(const [label,s] of Object.entries(STEPS)){const ph=motion.phases.find(x=>x.label===label);assert.ok(ph,`${kind}: no "${label}" phase`);
     for(let t=ph.start;t<=ph.end+1e-9;t+=.005){motion.apply(t/motion.duration);const a=P('thigh'+s),b=P('shin'+s),c=P('hoof'+s),margin=a.distanceTo(b)+b.distanceTo(c)-.015-a.distanceTo(c);if(margin<worst.m)worst={m:margin,t,label};}}
    assert.ok(worst.m>=0,`${kind}: the stepping leg is ${(-1e3*worst.m).toFixed(1)} mm inside the IK's soft reach in "${worst.label}" at ${worst.t?.toFixed(3)} s`);}}
  if(kind==='window'){const lift=100*motion.getup.liftoff,least=LIFT[p.id]??2;
   assert.ok(lift>=least,`window: the centre of mass is ${lift.toFixed(1)} cm inside the feet as the seat lets go (at least ${least})`);
   // A roll that stalls before its hooves land (the skunk's and cow's) turns about its tail's root: as played, the tail
   // lies on the floor within the rig's centimetre there. Bent a third of the way with the rest of the tail, the
   // skunk's root rose 2.1 to 3 cm off it and the phantom-wrench rig found nothing under the body.
   const rows=motion.roll.rows,v=new T.Vector3();
   if(!rows.some(r=>/hoof|boot|foot|toe/.test(r.part)))for(const r of rows.filter((r,i)=>/tail/.test(r.part)&&i%3===0)){motion.apply(r.t/motion.duration);let lo=Infinity;
    for(const part of m.worker.parts.filter(x=>/tail/.test(x.name))){const a=part.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i);part.applyBoneTransform(i,v);v.applyMatrix4(part.matrixWorld);lo=Math.min(lo,v.y);}}
    assert.ok(Math.abs(lo)<=.01,`window: the roll turns about the ${r.part} at ${r.t.toFixed(2)} s, its lowest point ${(100*lo).toFixed(1)} cm off the floor`);}
   // Every landing in the roll is soft: read every millisecond, the floor's push the body needs (its centre of mass's
   // acceleration less gravity) stays within the rig's 5 body weights. Lying back, the cow's and rabbit's mid back met
   // the floor 15 ms into the roll, where the roll's softening gave way to its raw path: 12.2 and 11.5 body weights read
   // here (the rig, at its 5 ms samples, 5.6 and 5.2), and the sheep's 5.7, which fell between the rig's samples.
   {const h=.001,c=[];for(let t=motion.roll.start-h;t<=motion.roll.end+h+1e-9;t+=h)c.push(motion.apply(t/motion.duration).com);let push={f:0};
    for(let i=1;i<c.length-1;i++){const a=[0,1,2].map(j=>(c[i-1][j]-2*c[i][j]+c[i+1][j])/(h*h));a[1]+=9.81;const f=Math.hypot(...a)/9.81;if(f>push.f)push={f,t:motion.roll.start+(i-1)*h};}
    assert.ok(push.f<=5,`window: the roll asks the floor for ${push.f.toFixed(1)} body weights at ${push.t.toFixed(3)} s`);}
   // The roll keeps the floor: read on every point of the body every 5 ms (the phantom-wrench rig's contacts), its
   // lowest point stays within the rig's centimetre of the floor from the roll's start to its end. Planning the roll
   // freely, the balance smoothed its landings (the centre of mass filtered at about 4 Hz) and lifted the goat's seat,
   // the sheep's waistcoat and the pig director's tail's root 1.1 to 1.3 cm off the floor for two or three of the rig's
   // 5 ms samples, with nothing holding them up (the rig read 154, 207 and 195% of their weight there).
   {const pr=contactProbe(m.worker);let up={y:-1};for(let t=motion.roll.start;t<=motion.roll.end+1e-9;t+=.005){motion.apply(t/motion.duration);pr.update();let lo=Infinity;for(let i=0;i<pr.count;i++)lo=Math.min(lo,pr.y[i]);if(lo>up.y)up={y:lo,t};}
    assert.ok(up.y<=.01,`window: the body leaves the floor in the roll, its lowest point ${(100*up.y).toFixed(1)} cm up at ${up.t.toFixed(3)} s`);}
   // No roll turns about the head: a head that would be the lowest point lying back nods forward, the chin toward the
   // chest, within the neck's measured range (idle-fits.js, read on the rig as made: the battle's posture changes its
   // key). Rolling on its swept horns with its back 11 cm off the floor, the goat fell onto the back at 1.7 m/s.
   {const r=rows.find(x=>x.bone==='head'),nod=IDLE_FITS[rigKey(p.create(JSON.parse(readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url),'utf8'))))].nod;
    assert.ok(!r,`window: the roll turns about the head (the ${r?.part}) at ${r?.t.toFixed(3)} s`);
    assert.ok(motion.roll.chin<=nod,`window: the chin nods ${motion.roll.chin} degrees lying back, past the neck's ${nod}`);}
   // The seat comes down after the roll no faster than the body can fall: as the feet are drawn in, the centre of mass
   // falls at most 1.2 g (the floor never asked to pull more than a fifth of the body's weight). Holding the skunk's
   // plume root on the floor as it sat up, the seat band pulled its hips 11 cm down in 0.2 s (1.5 g).
   const ph=l=>motion.phases.find(q=>q.label===l),a=ph('Right foot in').start+.05,b=ph('Lean over the feet').start,h=.005,cy=t=>motion.apply(t/motion.duration).com[1];let fall=0;
   for(let t=a+h;t<=b-h+1e-9;t+=h)fall=Math.max(fall,-(cy(t+h)-2*cy(t)+cy(t-h))/(h*h)/9.81);
   assert.ok(fall<=1.2,`window: the centre of mass falls at ${fall.toFixed(2)} g as the feet are drawn in`);
   // The balance plans against what holds the body as played: from the lean over the feet on, every corner of its
   // floor support lies within 5 cm of something the played body has on the floor. Read once as made, the skunk's
   // plume lay straight back along the floor where the played one rose clear of it, and through the last steps the
   // plan leant on it 31 to 58 cm behind the boots (its last step read 40% of its weight). Before the lean, where
   // contacts come and go, the plan's last round reads them on the hips of the round before, and the tails as bent
   // before it (bent again after, the rabbit's is off the floor at 2.59 to 2.61 s in its roll, where the plan leans on
   // it 20 to 25 cm from anything the body has there).
   const B=motion.balance;
   for(let i=0;i<B.times.length;i+=20){const s=B.samples[i];if(B.times[i]<b||s.kind!=='feet'||s.floor!==0)continue;motion.apply(B.times[i]/motion.duration);const on=[];
    for(const part of m.worker.parts){const a=part.geometry.attributes.position;for(let j=0;j<a.count;j++){v.fromBufferAttribute(a,j);part.applyBoneTransform(j,v);v.applyMatrix4(part.matrixWorld);if(Math.abs(v.y)<=.01)on.push(v.x,v.z);}}
    let far=0;for(const [x,z]of s.hull){let d=Infinity;for(let k=0;k<on.length;k+=2)d=Math.min(d,Math.hypot(x-on[k],z-on[k+1]));far=Math.max(far,d);}
    assert.ok(far<=.05,`window: at ${B.times[i].toFixed(2)} s the balance leans on the floor ${(100*far).toFixed(0)} cm from anything the body has there`);}
   // Lying back onto its hands and rolling, both elbows stay inside the rig's table (150 degrees). The balance, keeping
   // the centre of mass over the hands until the back is down, pulled the goat's hips 13 to 18 cm toward a horn tip it
   // rolled on alone (its left elbow folded to 155), and the skunk's 2.7 cm, its body lying lower than the horse's (151).
   const fold=(a,b,c)=>{const q=bones[b].getWorldPosition(v.clone());return 180-bones[a].getWorldPosition(v.clone()).sub(q).angleTo(bones[c].getWorldPosition(v.clone()).sub(q))*180/Math.PI;};
   let top={f:0};for(let t=ph('Hands to the floor').start;t<=ph('Roll').end;t+=.01){motion.apply(t/motion.duration);for(const s of [-1,1]){const f=fold('upperArm'+s,'forearm'+s,'hand'+s);if(f>top.f)top={f,t,s};}}
   assert.ok(top.f<=150,`window: the ${top.s<0?'left':'right'} elbow folds to ${top.f.toFixed(1)} degrees at ${top.t?.toFixed(2)} s as the body lies back onto its hands`);
   // As the hands tuck, the elbows keep the sides the tucks give them, out from the trunk (in the chest's frame, z
   // mirrored: the left's [.3, 0, 1], the right's [.8, 0, .4]), off the arm: the left's within 30 degrees from 0.12 s
   // after the hands let go to the roll's end, the right's within 20 from 0.28 s, just after it is tucked. Passed out
   // beside the shoulder, the left arm pointed along its side, and every left elbow came to the tuck bent down toward the
   // hips, 101 to 117 degrees off it (the goat's, let go later with its elbow up, 179), and swung out over the next
   // 0.25 s. Swung straight up from under its shoulder, the right arm turned about its own side: its elbow, up, was
   // carried up toward the head, and its forearm went by the jaw (the horse's and cow's 0.2 cm from it; the bull's,
   // sheep's, rabbit's and goat's within 1.8). Tucked at 0.28 s with no way point, the right elbow was still 25 to 30
   // degrees off its side on seven bodies at 0.28. Each hand keeps 2 cm from the head as it tucks, read at every other
   // point every 5 ms (read at every fourth point every 10 ms, a left hand 0.9 cm from the pig director's ears read 2 cm).
   const release=rows.find(r=>r.bone!=='head').t,q=new T.Quaternion();
   const offSide=(s,want,from)=>{const out=new T.Vector3(...want).normalize();let off={d:0};
    for(let t=release+from;t<=motion.roll.end;t+=.01){motion.apply(t/motion.duration);bones.spine.getWorldQuaternion(q).invert();const at=n=>bones[n].getWorldPosition(v.clone()).applyQuaternion(q);
     const S=at('upperArm'+s),ax=at('hand'+s).sub(S).normalize(),e=at('forearm'+s).sub(S),side=e.addScaledVector(ax,-e.dot(ax)),aim=out.clone().addScaledVector(ax,-out.dot(ax)),d=side.angleTo(aim)*180/Math.PI;
     if(d>off.d)off={d,t};}
    return off;};
   for(const [s,want,from,most] of [[-1,[.3,0,-1],.12,30],[1,[.8,0,.4],.28,20]]){const off=offSide(s,want,from);
    assert.ok(off.d<=most,`window: the ${s<0?'left':'right'} elbow bends ${off.d.toFixed(0)} degrees off its tucked side at ${off.t?.toFixed(2)} s`);}
   const hands=[-1,1].map(s=>m.worker.parts.find(x=>x.name==='forearm and hand '+s)),head=[];
   for(const part of m.worker.parts){const g=part.geometry.attributes,sk=part.skeleton;for(let i=0;i<g.position.count;i+=2){let w=0,k=0;for(let j=0;j<4;j++){const x=g.skinWeight.getComponent(i,j);if(x>w){w=x;k=g.skinIndex.getComponent(i,j);}}if(sk.bones[k].name==='head')head.push([part,i]);}}
   const pt=([part,i])=>{v.fromBufferAttribute(part.geometry.attributes.position,i);part.applyBoneTransform(i,v);return v.applyMatrix4(part.matrixWorld).clone();},near=[{d:Infinity},{d:Infinity}];
   for(let t=release;t<=release+.3;t+=.005){motion.apply(t/motion.duration);const H=head.map(pt);hands.forEach((hand,k)=>{for(let i=0;i<hand.geometry.attributes.position.count;i+=2){const x=pt([hand,i]);for(const y of H){const d=x.distanceTo(y);if(d<near[k].d)near[k]={d,t};}}});}
   near.forEach((n,k)=>assert.ok(n.d>=.02,`window: the ${k?'right':'left'} hand passes ${(100*n.d).toFixed(1)} cm from the head at ${n.t.toFixed(2)} s as it tucks`));}
  // Cut short where the tail is bent (as a casualty ends a crossing), the tail still comes back exactly.
  motion.apply(.6);motion.dispose();for(const [part,base]of tails)assert.deepEqual(part.geometry.attributes.position.array,base,`${kind}: the ${part.name} is not given back`);}
});
