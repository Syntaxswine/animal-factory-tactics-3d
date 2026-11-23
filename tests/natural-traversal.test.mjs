import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {naturalTraversal,createNaturalTraversal} from '../dist/tactics/natural-traversal.js';
import {contactProbe,supportAt,planCentre,turnAir} from '../dist/tactics/traversal-balance.js';
import * as BALANCE from '../dist/tactics/traversal-balance.js';
import {steadyPoles,steadyTurns,createSurfaceProbe,MASS_SEGMENTS} from '../dist/tactics/traversal-pose.js';
import {WALL} from '../dist/tactics/wall-climb.js';
import {edgeBoxes} from '../dist/tactics/traversal-fit.js';
import {rigKey} from '../dist/tactics/idle-motion.js';
import {IDLE_FITS} from '../dist/tactics/idle-fits.js';
// The natural crossings (docs/tactics/NATURAL-TRAVERSAL.md) on every mammal, built the way the battle builds a model.
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>p.id!=='hen'),KINDS=['window','low-wall','wall'];
const model=p=>{const worker=p.create(JSON.parse(readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url),'utf8')));return {worker,profile:p,posture:createBattlePosture(worker,p),locomotion:createWorkerLocomotion(worker,p)};};
const crossing=kind=>({id:1,unitId:1,kind,from:{x:0,y:0,z:0},to:{x:1,y:0,z:0}});
// The deepest trunk, head and tail point each crossing leaves in the floor or the obstacle as it is played (the
// clearance fit's report, taken again after the balance; a tail's root counts as trunk), in cm: about a centimetre,
// except the named gaps, which may only shrink (one has grown, by the user's choice: the pig foreman's on the wall,
// below). 8 cm is right through the 16 cm wall; past that the way out is up.
// Read before the balance (to d3fec1f), the report missed the window's tails, the climb's heads 5 to 8 cm in its wall
// and the pigs 25 to 40 cm in its floor; read here, it found the pigs' bellies 8 to 16 cm through the top in the straddle.
const LEFT={'window/pig-foreman/trunk':2,'window/pig-director/trunk':3, // the belly on the sill as the body tips over
 // long ears touch the floor as the body reaches down for it (2.1 and 1.3 cm at 1.92 s); allowed 3 and 6 at the lintel
 // (2.8 and 5.2 cm in) until the head's turns were judged on everything they move
 'window/donkey/head':2.5,'window/rabbit/head':2,
 'window/skunk/trunk':2, // the plume's root, which rides the hips, on the floor in the roll
 'window/dog/trunk':2,'wall/dog/trunk':2, // the dog's utility pouch on the sill's far edge, and on the face in the hang
 'low-wall/pig-director/trunk':2, // the waistcoat on the wall's near edge at the spring
 // the seat resting on the 16 cm top in the straddle (15.6 and 7.9 through it before); the pig foreman's now its
 // trouser fold as its left leg swings over (below)
 'wall/pig-foreman/trunk':3.5,'wall/pig-director/trunk':3};
// The pig foreman's was 2 (1.8 cm in at 3.72 s) while its band over the top rested the trouser fold its bent left leg
// drags under the hip (the hips 60%, the left thigh 40%). Resting its torso instead (wall-climb.js, LEG) takes the
// gate's phantom force out of its left leg over (3046 N at 3.375 s) and its readings over the gate's limits from 374 to
// 207, and leaves the fold 3.4 cm in at 3.34 s as the leg swings over (3.3 on f293da69, before the far hang; 6.3 cm by
// the rig's collisions, 6.6 on f293da69, which read every point every 10 ms; this report reads every other point every
// 20 ms). Grown from 2 to 3.5: the user chose "Allow the 3.5 cm clip" over the seat rule alone (2026-11-16;
// docs/tactics/NATURAL-TRAVERSAL.md, the twenty-eighth part).
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
// fitted out of the obstacles again after the balance (the climb's inside it, after each round that plans), so the plan
// must not lean on that support (the skunk's plume on the window's sill at its last step: 102 readings over the limit).
// A tail's root on an obstacle, and any tail on the floor, still count.
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
// A hand grips (traversal-balance.js supportAt): skin the hand or fingers carry most of, on a mesh the rig names a
// hand, grips on an obstacle's top or against its face (as the climb's drop lands, its palms on the far face); the rest
// of that mesh, the forearm and the elbow, grips only hooked over a top, and elsewhere against a face it only pushes.
// Where the body is held the old rule stands (the whole mesh grips), so the held stretches are as they were. The mesh's
// name alone made a grip of an elbow brushing the wall's far face as the climbs walk away from it.
test('a hand grips the wall, and an elbow against its face only pushes',()=>{
 const wall={min:[.42,0,-.5],max:[.58,2,.5]},boot=[[.9,.2],[1.15,.2],[1.15,.33],[.9,.33]].map(([x,z],v)=>({part:0,bone:0,v,x,y:.001,z}));
 const probe=pts=>({count:pts.length,names:['work boot 1','forearm and hand 1','connected shirt and sleeves'],part:Uint8Array.from(pts,p=>p.part),vertex:Uint32Array.from(pts,p=>p.v),
  x:Float32Array.from(pts,p=>p.x),y:Float32Array.from(pts,p=>p.y),z:Float32Array.from(pts,p=>p.z),boneNames:['hoof1','forearm1','hand1','fingers1'],bone:Uint16Array.from(pts,p=>p.bone),tails:null});
 const kind=(pts,com=[.97,.75,.1],held=false)=>supportAt(probe([...boot,...pts]),[wall],com,held).kind,face={v:9,x:.585,y:.86,z:.2};
 assert.equal(kind([]),'feet','the boot alone');
 assert.equal(kind([{...face,part:1,bone:1}]),'feet','an elbow against the far face grips');
 assert.equal(kind([{...face,part:1,bone:1}],undefined,true),'grip','a held body leaning an elbow on the far face keeps its outline');
 assert.equal(kind([{...face,part:1,bone:2}]),'grip','a palm against the far face does not grip');
 assert.equal(kind([{...face,part:1,bone:3}]),'grip','fingertips against the far face do not grip');
 assert.equal(kind([{part:1,bone:1,v:9,x:.5,y:2.005,z:0}],[.8,1.2,0]),'grip','a forearm hooked over the top does not grip');
 assert.equal(kind([{...face,part:2,bone:2}]),'feet','a sleeve cuff riding the hand bone grips');
});
// A seat the balance holds (traversal-balance.js, planCentre: a 'hold' with seat, the climb's top for a deep body)
// pushes and never pulls: planned against a seat whose height drops 6 cm at once, the plan falls no faster than
// gravity (-9.81 m/s^2 at its least) and comes down onto it at the balance's 3 body weights at most (FMAX: 2 g net,
// which it meets; 27.2 m/s^2 with that bound lifted, fmax 100), where a plain hold, with no bounds, pulls the body
// down at 44.9 m/s^2 to follow it (as the seat did before it had bounds).
test('a held seat pushes the body up and never pulls it down',()=>{
 const dt=.005,n=121,G=9.81,at=seat=>Array.from({length:n},(_,i)=>({c:[0,i<60?1:.94,0],kind:'hold',seat}));
 const range=plan=>{let lo=Infinity,hi=-Infinity;for(let i=1;i<n-1;i++){const a=(plan[i+1][1]-2*plan[i][1]+plan[i-1][1])/dt/dt;lo=Math.min(lo,a);hi=Math.max(hi,a);}return [lo,hi];};
 const [lo,hi]=range(planCentre(at(true),dt)),[heldLo]=range(planCentre(at(false),dt));
 assert.ok(lo>=-G-.5,`a seat's plan falls at ${(-lo).toFixed(2)} m/s^2 (no faster than gravity)`);
 assert.ok(hi<=2*G+.1,`a seat's plan pushes the body up at ${hi.toFixed(2)} m/s^2 (the balance's 3 body weights at most: 2 g net)`);
 assert.ok(heldLo<-2*G,`a plain hold's plan falls at ${(-heldLo).toFixed(2)} m/s^2 (a seat's bound can be broken)`);
});
test("the limbs' bend sides run straight between their samples",()=>{
 const W=4,STEP=.005,pole=steadyPoles(1,t=>({leg1:{start:[0,1,0],target:[0,.2,0],pole:[Math.cos(W*t),0,Math.sin(W*t)],reach:.9}}),{step:STEP}),n=Math.round(1/STEP),h=1e-4;
 const f=t=>pole('leg1',t).toArray(),acc=t=>{const a=f(t-h),b=f(t),c=f(t+h);return a.map((x,i)=>(x-2*b[i]+c[i])/(h*h));};
 let worst=0;for(let k=10;k<n-10;k++){const a=[.2,.4,.6,.8].map(u=>acc((k+u)*STEP));for(let ax=0;ax<3;ax++)worst=Math.max(worst,Math.abs(a[1][ax]-(2*a[0][ax]+a[3][ax])/3),Math.abs(a[2][ax]-(a[0][ax]+2*a[3][ax])/3));}
 assert.ok(worst<=3e-3,`the bend side bends ${worst.toExponential(2)} /s^2 off a straight acceleration between its samples`);
 const s=f(.5),lag=Math.acos(Math.min(1,s[0]*Math.cos(W*.5)+s[2]*Math.sin(W*.5)))/Math.PI*180;assert.ok(lag<1,`the side is ${lag.toFixed(2)} degrees off its pole`);
});
test("a turn's way round switches on a sample, where the switch costs the least",()=>{
 // A palm turning onto a face, its weight rising to 1 at 0.015 s: its short way reverses at 0.01 (the turn past 180
 // degrees) with the turn 0.03% short of done (a switch there jumps 0.11 degrees, over SWITCH), so the long way is
 // kept; at 0.015 the turn is done and records nothing. The switch back to the short way falls on that sample, where it
 // jumps nothing, not halfway (0.0125 s: the climb's palms, still short of done there, popped 0.09 degrees so).
 const recs=new Map([[0,[[0,0,1],.5]],[.005,[[0,0,1],.9]],[.01,[[0,0,-1],.9997]]]);
 const ref=steadyTurns(.02,t=>{const r=recs.get(+t.toFixed(3));return r?[{bone:'hand1',axis:r[0],w:r[1]}]:[];});
 assert.equal(ref('hand1',.004)?.z,1,'before the reversal the short way');
 assert.equal(ref('hand1',.0149)?.z,1,'the long way is held until the turn is done, not switched halfway');
 assert.equal(ref('hand1',.015),null,'the turn is done on its sample');
 // Nearly done but still partial on the later sample (the low walls' palms coming onto the wall: 0.0279 degrees there
 // against 0.2168 on the sample before, 0.0929 halfway), the switch falls on the later sample too.
 const recs2=new Map([[0,[[0,0,1],.5]],[.005,[[0,0,1],.99]],[.01,[[0,0,-1],.999398]],[.015,[[0,0,-1],.999922]]]);
 const ref2=steadyTurns(.02,t=>{const r=recs2.get(+t.toFixed(3));return r?[{bone:'hand1',axis:r[0],w:r[1]}]:[];});
 assert.equal(ref2('hand1',.0149)?.z,1,'the long way is held up to the cheaper sample');
 assert.equal(ref2('hand1',.015)?.z,-1,'the short way from the cheaper sample');
});
test("a flight's turn is held from LEAD before the hooves leave, not the hands",()=>{
 // traversal-balance.js, turnAir, on the balance's 5 ms grid (LEAD 0.025 s, five samples): the last five samples of a
 // run on the feet longer than that, just before a flight, are held as flight (a take-off's, or a touch longer than the
 // lead between two flights); a let-go's run on a grip, a run no longer than the lead (counting the feet alone; a touch
 // between two flights, held whole, would join them under one median), a run on a held seat and a landing are left as
 // they are (traversal-balance.js says why a let-go is left).
 const K={f:'feet',g:'grip',h:'hold',a:'air'},held=s=>turnAir([...s].map(c=>({kind:K[c]})),.005).map(x=>x?'a':'-').join('');
 assert.equal(held('ffffffaaa'),'-aaaaaaaa','a take-off is held from the lead');
 assert.equal(held('ggggggaaa'),'------aaa','a let-go is left');
 assert.equal(held('fffffaaa'),'-----aaa','a run on the feet no longer than the lead is left');
 assert.equal(held('gggfffaaa'),'------aaa','the run counts the feet alone, not the grip before them');
 assert.equal(held('hhhfffaaa'),'------aaa','nor the held seat before them');
 assert.equal(held('aaffffffaaa'),'aa-aaaaaaaa','a touch longer than the lead between two flights is held from its lead');
 assert.equal(held('aaafffaaa'),'aaa---aaa','a touch no longer than the lead between two flights is left');
 assert.equal(held('aafffffaa'),'aa-----aa','a touch exactly as long as the lead between two flights is left');
 assert.equal(held('hhhhhhaaa'),'------aaa','a run on a held seat is left');
 assert.equal(held('aaaffffff'),'aaa------','a landing is left');
});
test('a grip the body leaves for a flight lets go 10 ms before its last touch, and no other grip does',()=>{
 // traversal-balance.js, releaseGrips, on the balance's 5 ms grid (RELEASE 0.01 s, two samples; LOST 0.06 s, twelve):
 // the last two samples of a grip run that a flight longer than LOST follows take that flight's first sample's kind and
 // raw contacts, keep their own centre and are marked released (upper case below); a flight of LOST or shorter (which
 // the round's LOST restore may give back to the support the authored motion lies on; or a slip between two grips, at
 // most 40 ms before the onset's lag makes it LOST), a grip that ends on the feet, on a hold or with the motion, and a
 // grip the motion starts on are left as they are. And roundSchedule runs a round's steps in their order, the authored
 // seat given back, then (after the first round) the plan's own short flights given back to their support (LOST), then
 // the release, so that a gap a round gives back is never released: released first, a seat the plan lifts for 65 ms
 // (longer than LOST, so only the seat's restore gives it back) keeps a 10 ms released flight before it; and a 60 ms
 // gap where the authored grip ended on the feet, which the LOST restore gives back, is left only while the release
 // waits for a flight longer than LOST (waiting for one of LOST, released first, it opened on a release and stayed a
 // flight).
 const {releaseGrips}=BALANCE;assert.equal(typeof releaseGrips,'function','traversal-balance.js exports releaseGrips');
 const K={f:'feet',g:'grip',h:'hold',a:'air'},C={feet:'f',grip:'g',hold:'h',air:'a'},g=n=>'g'.repeat(n),a=n=>'a'.repeat(n);
 const go=s=>releaseGrips([...s].map((c,i)=>({kind:K[c],raw:K[c],c:[i,0,0]})),.005),str=S=>S.map(x=>x.released?C[x.kind].toUpperCase():C[x.kind]).join('');
 assert.equal(str(go('ffff'+g(12)+a(18)+'ff')),'ffff'+g(10)+'AA'+a(18)+'ff','a let-go into a flight lets go 10 ms early');
 assert.equal(str(go('ffff'+g(12)+a(13)+'ff')),'ffff'+g(10)+'AA'+a(13)+'ff','a flight longer than LOST is one');
 assert.equal(str(go('ffff'+g(12)+a(12)+'ff')),'ffff'+g(12)+a(12)+'ff','a flight of LOST, which a round may give back, is left');
 assert.equal(str(go('ffff'+g(12)+a(12)+g(12)+'ff')),'ffff'+g(12)+a(12)+g(12)+'ff','a slip between two grips, as the onset leaves it, is left');
 assert.equal(str(go('ffff'+g(12)+'ffff')),'ffff'+g(12)+'ffff','a grip that ends on the feet is left');
 assert.equal(str(go('ffff'+g(12)+'hhhh')),'ffff'+g(12)+'hhhh','a grip that ends on a hold is left');
 assert.equal(str(go('ffff'+g(12))),'ffff'+g(12),'a grip that ends the motion is left');
 assert.equal(str(go('gggg'+a(14))),'gggg'+a(14),'a grip the motion starts on is left');
 const S=go('ffff'+g(12)+a(18)+'ff'),r=S.slice(14,16);
 assert.ok(r.every(x=>x.kind==='air'&&x.raw==='air'),'a released sample is the flight\'s, its raw contacts too');
 assert.deepEqual(r.map(x=>x.c[0]),[14,15],'a released sample keeps its own centre');
 const {roundSchedule}=BALANCE;assert.equal(typeof roundSchedule,'function','traversal-balance.js exports roundSchedule');
 const mk=s=>[...s].map((c,i)=>({kind:K[c],raw:K[c],c:[i,0,0]})),round=(au,me)=>str(roundSchedule(mk(me),mk(au),1,.005));
 assert.equal(round('ff'+g(12)+a(18)+'ffff','ff'+g(12)+a(18)+'ffff'),'ff'+g(10)+'AA'+a(18)+'ffff','a round releases a let-go after its restores');
 assert.equal(round('ff'+g(12)+'f'.repeat(16),'ff'+g(12)+a(12)+'ffff'),'ff'+g(12)+'f'.repeat(16),'a gap the plan made where the authored grip ends on the feet goes back to the feet before the release looks');
 assert.equal(round('ff'+g(12)+'h'.repeat(20),'ff'+g(12)+a(13)+'h'.repeat(7)),'ff'+g(12)+'h'.repeat(20),'a seat the plan lifted for longer than LOST goes back to the seat before the release looks');
});
for(const p of MAMMALS)test(`${p.id}: every crossing starts in its own stance, ends on the next tile's centre, clears the obstacle and gives the tail back`,()=>{
 const m=model(p),tails=m.worker.parts.filter(x=>/tail/.test(x.name)).map(x=>[x,Float32Array.from(x.geometry.attributes.position.array)]);
 for(const kind of KINDS){
  const hoofQ=()=>{m.worker.root?.updateMatrixWorld?.(true);return [-1,1].map(s=>m.worker.bones.find(b=>b.name==='hoof'+s).getWorldQuaternion(new T.Quaternion()));},stanceQ=hoofQ();
  const motion=createNaturalTraversal(m,crossing(kind),{species:p.id}),bones=Object.fromEntries(m.worker.bones.map(b=>[b.name,b]));
  const at=progress=>{motion.apply(progress);return n=>bones[n].getWorldPosition(bones[n].position.clone()).toArray();};
  const pose0=at(0),hips=pose0('hips');assert.ok(Math.abs(hips[0])<.01&&Math.abs(hips[2])<.01,`${kind} starts at x ${hips[0]}, z ${hips[2]}`);
  const rest={hips:pose0('hips'),feet:[-1,1].map(s=>pose0('hoof'+s))},pose1=at(1);
  for(const [a,b]of [[pose1('hips'),rest.hips],...[-1,1].map((s,i)=>[pose1('hoof'+s),rest.feet[i]])])
   assert.ok(Math.abs(a[0]-b[0]-1)<.01&&Math.abs(a[1]-b[1])<.01&&Math.abs(a[2]-b[2])<.01,`${kind} ends at ${a.map(x=>x.toFixed(3))}, not its stance moved one tile (${b.map(x=>x.toFixed(3))})`);
  // Both ends stand on the floor as the battle stance does: each hoof's lowest surface point within a millimetre of it,
  // and each hoof turned as the stance has it, within half a degree. Keyed with no orientation, the window's first
  // frame held the hooves in the floor (the left 2.5 mm on the dog to 9.5 on the pig foreman) and turned them off the
  // stance (9.9 degrees on every mammal but the pig foreman, 23.4 on it), and the clearance fit lifted them out under
  // load as the step in began.
  {const pr=createSurfaceProbe(m.worker,{stride:1});for(const progress of [0,1]){motion.apply(progress);pr.update();const low={[-1]:Infinity,1:Infinity};
    for(let i=0;i<pr.count;i++)if(/hoof|boot|foot|toe/i.test(pr.names[pr.part[i]])){const s=pr.boneNames[pr.bone[i]].endsWith('-1')?-1:1;low[s]=Math.min(low[s],pr.y[i]);}
    for(const s of [-1,1])assert.ok(Math.abs(low[s])<=.001,`${kind}: the ${s<0?'left':'right'} hoof's lowest point is ${(1e3*low[s]).toFixed(1)} mm off the floor at progress ${progress}`);
    hoofQ().forEach((q,i)=>{const a=2*Math.acos(Math.min(1,Math.abs(q.dot(stanceQ[i]))))*180/Math.PI;assert.ok(a<=.5,`${kind}: the ${i?'right':'left'} hoof is turned ${a.toFixed(2)} degrees off the stance at progress ${progress}`);});}}
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
  // Its plan of the centre of mass is at rest at both ends, its rows met within a micrometre (0.17 at the worst, the
  // rabbit's climb; 0.30 on 08274608): the first sample on the authored path and the first interval a cubic from rest
  // (7 c0 - 8 c1 + c2 = 0), and the same into the last sample before the end, the last held there. As played, the
  // centre of mass is at rest at both ends (under 0.3 m/s^2 and 1 mm/s there: at the start 0.04 at the most, at the end
  // 0.19, the donkey's window; on 26d37e89 0.10 to 3.76 at the end, the skunk's low wall to the bull's window); and
  // within 10 ms of either end its acceleration overshoots the plan's next to that end (at samples 1 to 6, and n-7 to
  // n-2) by at most 35%, give or take 0.1 m/s^2: the hips' track, easing from rest into the plan's first acceleration,
  // overshoots it by up to 32% (the horse's low wall); with the first two samples pinned equal, 26 of the 33 crossings
  // on 26d37e89 fail it, and every window with the hooves flat (on both, the rows fail too: this backs them up). Met
  // only as far as the programme's iterations reach (the rows' stiffness off), the end rows miss by more than a
  // micrometre on 16 of the 33 crossings, failing this on six of the eleven mammals: the windows' start rows by up to
  // 74 um (the rabbit's; the dog's 63, the sheep's 15, the goat's 13, the bull's and cow's 8), the climbs' by up to 277
  // (the rabbit's; the dog's 167) and the low walls' by up to 24 (the dog's). As this test reads the start, the
  // rabbit's window's centre of mass then starts at 0.51 m/s^2 and its climb's at 1.80, which fails the overshoot check
  // too; at the end the rabbit's window moves 0.91 mm/s. Resting at the last sample instead, up to 5 ms past the end
  // (the copy before the end rows were met), the rabbit's moved 5.8 mm/s at the end, read over 0.2 ms. None of this
  // guards the outline the plan asks in at the ends (traversal-balance.js END_MARGIN): the suite passes without it,
  // where the dog's window starts at 130% of phantom-wrench's limit, so that window and the climbs are gated again
  // after any change to the plan, its iterations or the hips' track.
  {const B=motion.balance,P=B.plan,n=P.length,D=motion.duration,dt=B.times[1]-B.times[0];let miss={d:0};
   const rows={'start row':a=>7*P[0][a]-8*P[1][a]+P[2][a],'end row':a=>P[n-4][a]-8*P[n-3][a]+7*P[n-2][a],'last two samples':a=>P[n-2][a]-P[n-1][a],
    'first sample':a=>P[0][a]-B.samples[0].c[a],'last sample':a=>P[n-1][a]-B.samples[n-1].c[a]};
   for(const [name,f] of Object.entries(rows))for(let a=0;a<3;a++)if(Math.abs(f(a))>miss.d)miss={d:Math.abs(f(a)),name};
   assert.ok(miss.d<=1e-6,`${kind}: the balance's plan misses its ${miss.name} by ${(1e6*miss.d).toFixed(2)} um`);
   const com=t=>[...motion.apply(Math.min(1,Math.max(0,t/D))).com],h=5e-4,e=2e-4,acc=(a,b,c,s=h)=>{const x=com(a),y=com(b),z=com(c);return x.map((v,i)=>(v-2*y[i]+z[i])/(s*s));};
   const speed=(a,b)=>{const x=com(a),y=com(b);return Math.hypot(...x.map((v,i)=>v-y[i]))/(b-a);},flat=v=>Math.hypot(v[0],v[2]);
   for(const [end,a,v] of [['start',acc(0,e,2*e,e),speed(0,1e-3)],['end',acc(D-2*e,D-e,D,e),speed(D-1e-3,D)]]){
    assert.ok(Math.hypot(...a)<=.3,`${kind}: the centre of mass accelerates ${Math.hypot(...a).toFixed(2)} m/s^2 at its ${end}`);
    assert.ok(v<=1e-3,`${kind}: the centre of mass moves ${(1e3*v).toFixed(2)} mm/s at its ${end}`);}
   const planAcc=i=>Math.hypot((P[i-1][0]-2*P[i][0]+P[i+1][0])/(dt*dt),(P[i-1][2]-2*P[i][2]+P[i+1][2])/(dt*dt));
   for(const [end,t0,ks] of [['start',h,[1,2,3,4,5,6]],['end',D-.01,[n-7,n-6,n-5,n-4,n-3,n-2]]]){let played=0;
    for(let t=t0;t<=t0+.01-h+1e-12;t+=h)played=Math.max(played,flat(acc(t-h,t,t+h)));
    const plan=Math.max(...ks.map(planAcc));
    assert.ok(played<=1.35*plan+.1,`${kind}: the centre of mass accelerates ${played.toFixed(2)} m/s^2 within 10 ms of its ${end}, past 1.35 times the plan's ${plan.toFixed(2)}`);}}
  // Between its 5 ms samples the balance's tracks, the hips' whole move (its shift with the offsets the motion adds
  // under it: the clearance fit's, and the window's sill and seat or the climb's top) and its turn of the body (angle
  // and pivot), are the cubic spline through them: their acceleration runs straight from sample to sample (away from
  // the tracks' own ends, which ease from rest), so they hold nothing between samples that the samples miss. Through
  // the climb's flights its turn, and through its take-off's flight its hips' move, are the cubic spline through keys 1
  // ms apart (traversal-balance.js, fine), read between those keys but for the first and last millisecond of each
  // corrected stretch (B.fineSpans), where the correction's track eases from rest as a track's own ends do (its
  // spline's end keys hold no acceleration): there it bends up to 0.020 rad/s^2 off straight (the horse's and the pig
  // director's turns at 1.234 and 1.229 s; the other climbs' 0.005 at most, the hips' 0.001; on 21efea5e, its stretches
  // ending inside their correction, 0.06 to 0.88, as far as a track through central-slope quintics bends between its
  // keys: 0.77 and 1.09 on the horse and the goat). With central slopes the quintic bent between its samples to meet
  // them: as the horse's weight went onto its right foot after the window, its hips rippled 2.5 to 3 m/s^2 between
  // samples, read as 77 to 243 N of phantom force a millisecond past a sample whose own reading was at most 14% of the
  // limit.
  {const B=motion.balance,n=B.times.length,h=1e-4,acc=(f,t)=>{const a=f(t-h),b=f(t),c=f(t+h);return a.map((x,i)=>(x-2*b[i]+c[i])/(h*h));};
   const turn=t=>{const s=B.spin(t);if(!s)return [0,0,0];const v=[s.q.x,s.q.y,s.q.z],l=Math.hypot(...v);return l<1e-15?[0,0,0]:v.map(x=>x*2*Math.atan2(l,s.q.w)/l);};
   const turning=k=>B.spin(B.times[k])&&B.spin(B.times[k+1]),fine=t=>(B.fineSpans||[]).some(([a,b])=>t>=a-1e-9&&t<=b+1e-9),rest=t=>(B.fineSpans||[]).some(([a,b])=>Math.abs(t-a)<1e-9||Math.abs(t+.001-b)<1e-9),unit={hips:'m/s^2',turn:'rad/s^2',pivot:'m/s^2'},seen={hips:0,turn:0,pivot:0};
   let bend={d:0};for(const [name,f,inner] of [['hips',t=>B.hips(t).toArray(),k=>k>0&&k<n-2],['turn',turn,turning],['pivot',t=>B.spin(t)?.pivot.toArray()??[0,0,0],turning]])
    for(let k=0;k<n-1;k++){if(!inner(k))continue;seen[name]++;const t0=B.times[k],T=B.times[k+1]-t0,parts=(name==='turn'||name==='hips')&&fine(t0)&&fine(t0+T)?Math.round(T/.001):1;
     for(let q=0;q<parts;q++){const u0=t0+q*T/parts;if(parts>1&&rest(u0))continue;const a=[.2,.4,.6,.8].map(u=>acc(f,u0+u*T/parts));
      for(let ax=0;ax<3;ax++){const d=Math.max(Math.abs(a[1][ax]-(2*a[0][ax]+a[3][ax])/3),Math.abs(a[2][ax]-(a[0][ax]+2*a[3][ax])/3));if(d>bend.d)bend={d,name,t:u0};}}}
   assert.ok(seen.hips>0&&seen.turn>0&&seen.pivot>0,`${kind}: the balance's tracks were not read between samples (${JSON.stringify(seen)})`);
   assert.ok(bend.d<=.01,`${kind}: the balance's ${bend.name} bends ${bend.d.toFixed(3)} ${unit[bend.name]} off a straight acceleration between its samples at ${bend.t?.toFixed(3)} s`);}
  // The climb's take-off keeps its authored time and leaves on the hooves it planned with. Its hooves leave the floor
  // on a soft key whose height rides the hips the balance moves (wall-climb.js, the push's ceiling): raising them, each
  // round's plan took the hooves off earlier, and the plan pushed on with nothing under it. On 148c6fb7 every climb's
  // take-off moved 5 to 15 ms between the balance's rounds, the lower hoof was 14 to 30 mm up at the last foot sample,
  // and in the flight's first 50 ms the body's angular momentum about its centre of mass lay 0.88 to 7.8 N·m·s from the
  // flight's median (its turn refined on the round before's hips, before the take-off moved). Every round now plans the
  // take-off at its authored time, a hoof is within the rig's centimetre of the floor at the last foot sample (2.4 to
  // 9.0 mm, the pig director's the lowest and the horse's the highest; 1.6 to 9.1 on 08274608, before the left foot
  // stepped back), and the flight's first 50 ms hold their angular momentum within 0.5 N·m·s, what the rig's airborne
  // limit of 10 N·m moves in 50 ms (0.0003 to 0.0016, the skunk's to the goat's; 0.0006 to 0.0015 on 08274608; 0.001 to
  // 0.13 on 21efea5e, 0.03 to 0.14 on 6fe975ef, to 0.12 on e909dcf4). That last check guards the runaway and the turn
  // together and barely sees either alone: on e909dcf4, with the take-off held and the turn not refined on the final
  // hips (traversal-balance.js), it read 0.15 to 0.51, the rabbit's alone over, and with that refinement alone on
  // 148c6fb7's motion 0.09 to 0.66; the gate shows the refinement's own worth.
  if(kind==='wall'){const B=motion.balance,S=B.samples,n=S.length,D=motion.duration,dt=B.times[1]-B.times[0],k0=S.findIndex((x,k)=>B.times[k]>.7&&x.kind==='air');
   assert.ok(k0>0,'wall: no flight after the push');
   const offs=(B.history||[]).map(h=>(h.match(/feet 0\.000-([0-9.]+), air/)||[])[1]);
   assert.ok(offs.length>1&&offs.every(x=>x&&x===offs[0]),`wall: the take-off moves between the balance's rounds (last foot sample ${offs.join(', ')} s)`);
   const pr=createSurfaceProbe(m.worker,{stride:1});motion.apply(B.times[k0-1]/D);pr.update();let low=Infinity;
   for(let i=0;i<pr.count;i++)if(/hoof|boot|foot|toe/i.test(pr.names[pr.part[i]]))low=Math.min(low,pr.y[i]);
   assert.ok(low<=.01,`wall: at the last foot sample (${B.times[k0-1].toFixed(3)} s) the lower hoof is ${(1e3*low).toFixed(1)} mm off the floor`);
   const at=t=>{const r=motion.apply(t/D);return [r.points,[...r.com]];},sub=(a,b)=>a.map((x,i)=>x-b[i]),mid=(P,a,b)=>P[a].map((x,i)=>(x+P[b][i])/2);
   const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=(P,a,b)=>{const d=sub(P[b],P[a]),l=Math.hypot(...d);return [d.map(x=>x/l),l];};
   const L=t=>{const [A,ca]=at(t-dt),[P,c]=at(t),[Bp,cb]=at(t+dt),vc=sub(cb,ca).map(x=>x/(2*dt)),out=[0,0,0];
    for(const [a,b,mass] of MASS_SEGMENTS){const r=sub(mid(P,a,b),c),v=sub(sub(mid(Bp,a,b),mid(A,a,b)).map(x=>x/(2*dt)),vc),[u,l]=unit(P,a,b),du=sub(unit(Bp,a,b)[0],unit(A,a,b)[0]).map(x=>x/(2*dt));
     const o=cross(r,v),s=cross(u,du);for(let q=0;q<3;q++)out[q]+=mass*o[q]+mass*l*l/12*s[q];}return out;};
   // Stepping in, the body asks less of the feet than it did (wall-climb.js: the left foot steps 4.5 cm further back):
   // over the first 50 ms, at each of the balance's samples from 5 ms with feet under the body, the pressure point the
   // played body asks for lies at most 10 cm outside the sample's outline: its centre of mass's acceleration and its
   // angular momentum's rate read over 0.5 ms chords (the angular momentum as the flights' checks below read it), the
   // floor's push placed where its moment about the centre meets that rate (p_x = c_x + (dL_z - h F_x) / F_y, F the
   // body's weight carried plus its mass times that acceleration, h the centre over the floor). The gate reads the same
   // played body: over the rabbit's and dog's starts it reads 8.9 to 9.3% of its limit per cm of this point outside the
   // outline (eleven samples on five copies), so 10 cm is about 90% of its limit. With the foot where it stepped before
   // (08274608) the rabbit's and dog's lay 14.9 and 15.9 cm outside (the gate: 137 and 143%); now 8.8 and 8.8 (81 and
   // 79%), the nine others' 3.6 at most; 4 cm back the dog's 11.3 (102%); back 5.5 cm for the step in alone the
   // rabbit's and dog's 10.3 and 11.2 (95 and 101%), both over this bound. The plan's own pressure point (the balance's
   // rows) does not follow the gate at the start: its turn is the balance's 5 ms differences averaged over five samples
   // and its force the plan's 5 ms second difference (on 08274608 at the rabbit's 5 ms sample the plan's point lies 5.5
   // cm outside, the played 14.4, where the gate reads 134%; 4 cm back with an arc on the step in's key, at the dog's
   // 15 ms sample the plan's 6.4, the played 6.2, the gate 55%). The floor pushes from nowhere outside the outline at
   // all.
   {const BM=MASS_SEGMENTS.reduce((m,x)=>m+x[2],0),G=9.81,h=5e-4,out=(hl,x,z)=>{let inside=true,best=Infinity;for(let j=0;j<hl.length;j++){const a=hl[j],b=hl[(j+1)%hl.length],ex=b[0]-a[0],ez=b[1]-a[1],L=Math.hypot(ex,ez)||1;
     if(ex*(z-a[1])-ez*(x-a[0])<0)inside=false;const u=Math.max(0,Math.min(1,((x-a[0])*ex+(z-a[1])*ez)/(L*L)));best=Math.min(best,Math.hypot(x-a[0]-u*ex,z-a[1]-u*ez));}return inside?0:best;};
    const Lh=t=>{const [A,ca]=at(t-h),[P,c]=at(t),[Q,cb]=at(t+h),vc=sub(cb,ca).map(x=>x/(2*h)),o3=[0,0,0];
     for(const [a,b,mass] of MASS_SEGMENTS){const r=sub(mid(P,a,b),c),v=sub(sub(mid(Q,a,b),mid(A,a,b)).map(x=>x/(2*h)),vc),[u,l]=unit(P,a,b),du=sub(unit(Q,a,b)[0],unit(A,a,b)[0]).map(x=>x/(2*h));
      const o=cross(r,v),w=cross(u,du);for(let q=0;q<3;q++)o3[q]+=mass*o[q]+mass*l*l/12*w[q];}return o3;};let worst={d:0},seen=0,all=0;
    for(let i=1;i<n-1&&B.times[i]<=.05+1e-9;i++){all++;const x=S[i];if(x.kind!=='feet'||!x.hull?.length)continue;seen++;const t=B.times[i],[,c0]=at(t-h),[,c]=at(t),[,c1]=at(t+h);
     const a=c.map((v,q)=>(c1[q]-2*v+c0[q])/(h*h)),L0=Lh(t-h),L1=Lh(t+h),dL=L0.map((v,q)=>(L1[q]-v)/(2*h)),Fy=BM*(a[1]+G),hc=c[1]-(x.floor||0);
     const d=out(x.hull,c[0]+(dL[2]-hc*BM*a[0])/Fy,c[2]-(dL[0]+hc*BM*a[2])/Fy);if(d>worst.d)worst={d,t};}
    assert.ok(all>0&&seen===all,`wall: stepping in, ${seen} of the first 50 ms's ${all} samples stand on the feet with an outline (all must, or this reads nothing)`);
    assert.ok(worst.d<=.10,`wall: stepping in, the played body's pressure point lies ${(100*worst.d).toFixed(1)} cm outside the feet at ${worst.t?.toFixed(3)} s (10 at most)`);}
   let k1=k0;while(k1+1<n&&S[k1+1].kind==='air')k1++;const Ls=[];for(let k=k0;k<=k1;k++)Ls.push(L(B.times[k]));
   const med=[0,1,2].map(q=>Ls.map(x=>x[q]).sort((x,y)=>x-y)[Ls.length>>1]);let worst={d:0};
   for(let k=k0;k<=k1&&B.times[k]<=B.times[k0]+.05+1e-9;k++){const d=Math.hypot(...sub(Ls[k-k0],med));if(d>worst.d)worst={d,t:B.times[k]};}
   assert.ok(worst.d<=.5,`wall: the flight's angular momentum lies ${worst.d.toFixed(2)} N·m·s from its median at ${worst.t?.toFixed(3)} s`);
   // The catch keeps the authored motion's time, and a hand is at the wall for it. A body deeper in front (the pigs)
   // leans over its belly toward the wall so its shoulders come within reach of the top (wall-climb.js, lean). Leant
   // from the catch key, in the flight's last 80 ms, the lean was taken back by the balance's turn about the centre of
   // mass (a body in the air cannot turn itself), the hands missed the top, and the second round put the catch 115 ms
   // late on the pig foreman and 90 on the pig director. Every round now plans the catch within 15 ms (three samples)
   // of the first round's, measured on the authored motion (10 ms early on both pigs, within 5 on the rest), and at the
   // catch a hand point lies within the rig's centimetre of the wall's surface, inside it or out (the rig counts a
   // point deeper than that a sink, not a contact; the hand is its mesh, forearm and hand, as the rig's grip reads it;
   // 0.0 to 0.6 mm, the donkey's 0.56; 0.0 to 1.2 on 08274608). On e909dcf4 each fails on both pigs and on no
   // other mammal, the second with the first switched off (the nearest hand 65.5 and 47.3 mm off the wall at the
   // catch).
   const catchOf=h=>{const sp=[...h.matchAll(/(\w+) ([0-9.]+)-[0-9.]+/g)].map(x=>({kind:x[1],a:+x[2]})),i=sp.findIndex(x=>x.kind==='air'&&x.a>.7),g=i<0?null:sp.slice(i+1).find(x=>x.kind==='grip');return g?g.a:NaN;};
   const cs=(B.history||[]).map(catchOf);
   assert.ok(cs.length>1&&cs.every(x=>Math.abs(x-cs[0])<=.015+1e-9),`wall: the catch moves between the balance's rounds (${cs.map(x=>x.toFixed(3)).join(', ')} s)`);
   const box=edgeBoxes(WALL.edge,WALL.half,[[0,WALL.top]])[0],off=(x,y,z)=>{const d=[Math.max(box.min[0]-x,0,x-box.max[0]),Math.max(box.min[1]-y,0,y-box.max[1]),Math.max(box.min[2]-z,0,z-box.max[2])];return d.some(v=>v>0)?Math.hypot(...d):Math.min(x-box.min[0],box.max[0]-x,y-box.min[1],box.max[1]-y,z-box.min[2],box.max[2]-z);};
   motion.apply(cs.at(-1)/D);pr.update();let hand=Infinity;
   for(let i=0;i<pr.count;i++)if(/hand/.test(pr.names[pr.part[i]]))hand=Math.min(hand,off(pr.x[i],pr.y[i],pr.z[i]));
   assert.ok(hand<=.01,`wall: at the catch (${cs.at(-1).toFixed(3)} s) the hand point nearest the wall's surface is ${(1e3*hand).toFixed(1)} mm from it`);
   // Over the top no knee whips, and lowering down the far face a hand stays at the wall: any point of a forearm or
   // hand within the rig's centimetre of any face of it (the pigs' wrists, read every 5 ms from 3.85 to 4.15 s, the
   // window this check reads every 10 ms, now hold the top, from 0.1 to 1.4 cm above their grip's height; on f293da69
   // they rode its far edge from 2.5 above to 3.8 below, and this said only that the rig read a grip there, not that a
   // palm lay on the top: wall-climb.js, the far hang). Knee speeds here are this check's own measure, the shin bone's
   // world position over 2 ms chords, not the rig's knee point. A deep body's hooves on the near face ride the height
   // its keys over the top are set at (wall-climb.js, rise), and it stands back from the far face and leans in over its
   // belly while it hangs there, its grips near the top's far edge (far, farLean, farX). On 4e9853f6 the pigs' right
   // legs locked straight out of reach until their knees whipped (12.6 and 14.1 m/s, read every 2 ms from 2.3 to 3.1 s;
   // every other mammal's knees 7.6 at most, the dog's; now the pigs' 4.4 and 5.5), and their hands came off the top as
   // they lowered (the nearest hand point, of the hand's mesh, forearm and hand, as the rig's grip reads it, up to 25.5
   // and 40.6 mm from the wall's surface, every 10 ms from 3.85 to 4.15 s; every other mammal's 1.9 at most, the
   // skunk's; now 6.5 and 3.2, 6.5 and 2.8 on 21efea5e, 7.2 and 4.3 on f293da69). Each check fails there on both pigs
   // and on no other mammal, the second with the first switched off. From 3.1 to 3.5 s, as the left knee comes up
   // behind, the knees are held at 11 m/s, a sentinel no copy measured fails: the pig director's left knee reads 8.8 at
   // 3.180 s (8.9 on f293da69, 8.05 on 4e9853f6), every other mammal's 6.1 to 7.5 near 3.19 s. Going down the far side,
   // from 3.5 to 3.7 s, they are held at the rig's 8: the pig foreman's left leg locked straight there, out of reach of
   // its 3.685 s key (10.2 m/s at 3.632 s on ba891c83, 9.1 on f293da69, where its top band's drop hid it; 13.8 at 3.618
   // with its authored keys alone), until those keys rose to its reach from the keyed trunk (wall-climb.js, the legs'
   // keys hanging down the far face): it straightens later and slower now (7.1 m/s at 3.644), and every other mammal
   // reads 6.2 to 7.2 there. As the left hand lets go of the near edge and crosses to the far grip, from 2.8 to 3.7 s,
   // the elbows are held at the rig's 8 too, by the same measure on the forearm bone: held to that grip out of its
   // arm's reach until 3.485 s, a pig's left arm went straight and its elbow whipped as the hand let go (15.7 and 14.1
   // m/s at 3.518 and 3.524 s on c44413ef, the director's and the foreman's), until a deep body's left hand let go
   // before its arm ran out (wall-climb.js): the pigs' fastest there are now their left elbows as the hands cross, 5.3
   // and 6.3 at 3.528 and 3.524 s (on 8da9a826 their right elbows, 5.8 and 5.6 at 3.034, before their hands held in
   // front of their chests, below), and every other mammal's its left, 7.55 to 7.67 at 3.514.
   const knee=s=>bones['shin'+s].getWorldPosition(bones['shin'+s].position.clone()),fastest=(a,b,at=knee)=>{let w={v:0},was=null;
    for(let t=a;t<=b+1e-9;t+=.002){motion.apply(t/D);const k=[at(-1),at(1)];if(was)for(const j of [0,1]){const v=k[j].distanceTo(was[j])/.002;if(v>w.v)w={v,t,side:j?'right':'left'};}was=k;}return w;};
   const whip=fastest(2.3,3.1),behind=fastest(3.1,3.5),lock=fastest(3.5,3.7),fold=fastest(2.8,3.7,s=>bones['forearm'+s].getWorldPosition(bones['forearm'+s].position.clone()));
   assert.ok(whip.v<=8,`wall: over the top the ${whip.side} knee moves at ${whip.v.toFixed(1)} m/s at ${whip.t?.toFixed(3)} s (the rig's limit is 8)`);
   assert.ok(behind.v<=11,`wall: as the left knee comes up behind the ${behind.side} knee moves at ${behind.v.toFixed(1)} m/s at ${behind.t?.toFixed(3)} s (11 at most; the pig director reads 8.8)`);
   assert.ok(lock.v<=8,`wall: going down the far side the ${lock.side} knee moves at ${lock.v.toFixed(1)} m/s at ${lock.t?.toFixed(3)} s (the rig's limit is 8; the pig foreman read 10.2 on ba891c83)`);
   assert.ok(fold.v<=8,`wall: as the left hand lets go and crosses to the far grip the ${fold.side} elbow moves at ${fold.v.toFixed(1)} m/s at ${fold.t?.toFixed(3)} s (the rig's limit is 8; the pig director read 15.7 on c44413ef)`);
   // Over the top (2.4 to 3.0 s, read every 2 ms) the right arm keeps out of the trunk, by the phantom-wrench rig's
   // capsules (the lower trunk pelvis to chest and the upper trunk chest to neck, .14; the upper arm .045, the forearm
   // .04, the hand .045; the rig leaves a hand or forearm against the lower trunk out). Every other mammal's right hand
   // re-grips the top there (the shared keys), and its upper arm goes 3.0 to 3.9 cm into its lower trunk (at 2.656 to
   // 2.688 s), so they are held at 4.5 cm, a sentinel. A deep body's right hand holds in front of its chest instead
   // (wall-climb.js), and the pigs' arms keep 8.0 and 10.4 cm clear of the trunk (the foreman's and the director's
   // nearest, the upper arm by the upper trunk, at 2.802 and 3.000 s; the foreman's at 2.754 on 21efea5e), by these
   // one-size capsules, which a pig's belly overruns (the clothes check below reads the pig's own); on 8da9a826 the arm
   // hung straight toward a re-grip it could not reach, the pig foreman's upper arm 5.4 cm into its lower trunk at
   // 2.596 s, the director's 3.1 at 2.604.
   const gap=(p1,q1,p2,q2)=>{const d1=q1.clone().sub(p1),d2=q2.clone().sub(p2),r=p1.clone().sub(p2),a=d1.dot(d1),e=d2.dot(d2),f=d2.dot(r),c=d1.dot(r),b=d1.dot(d2),den=a*e-b*b,cl=x=>Math.max(0,Math.min(1,x));
    let s=den>1e-12?cl((b*f-c*e)/den):0,t=(b*s+f)/e;if(t<0){t=0;s=cl(-c/a);}else if(t>1){t=1;s=cl((b-c)/a);}return p1.clone().addScaledVector(d1,s).distanceTo(p2.clone().addScaledVector(d2,t));};
   let into={o:-Infinity};
   for(let t=2.4;t<=3.0+1e-9;t+=.002){const P=motion.apply(t/D).points,v=k=>bones.hips.position.clone().fromArray(P[k]);
    for(const [a,b,ra,an] of [['shoulder1','elbow1',.045,'upper arm'],['elbow1','wrist1',.04,'forearm'],['wrist1','palm1',.045,'hand']])for(const [c,d,bn] of [['pelvis','chest','lower trunk'],['chest','neck','upper trunk']]){
     if(bn==='lower trunk'&&an!=='upper arm')continue;const o=ra+.14-gap(v(a),v(b),v(c),v(d));if(o>into.o)into={o,t,pair:bn+' and its '+an};}}
   const deepBody=/^pig-/.test(p.id);
   assert.ok(into.o<=(deepBody?0:.045),`wall: over the top the right arm's capsules meet the trunk's by ${(100*into.o).toFixed(1)} cm, the ${into.pair}, at ${into.t?.toFixed(3)} s (${deepBody?'a deep body keeps out':'4.5 cm at most'})`);
   // A deep body's held hands and forearms stay out of its clothes: over each hold (the right from 2.695 to 2.90 s, the
   // left from 3.195 to 3.42; wall-climb.js), read every 10 ms, no vertex of the hand or forearm (the "forearm and
   // hand" mesh's points carried by the hand, fingers or forearm) lies more than 1 cm inside the shirt (its sleeves
   // dropped, which opens the armholes) or the trousers: inside where its generalized winding number against that
   // garment passes .5, by its distance to that garment's nearest triangle. The rig's capsules give every body one .14
   // m trunk, which a pig's belly overruns, and passed arms held inside it. This fails on 8da9a826 (with the capsule
   // check above switched off, which fails there first), the pigs' right forearms 21.0 and 20.9 cm into their shirts
   // (the director's at 2.695 s, the foreman's at 2.715), whole hands and forearms lying in; on this fix's first round,
   // the hands held in toward the crossing's waypoints, the right hands 19.1 and 18.7 at 2.895; and on its second, the
   // hands held as now but each arm bent its own way, the foreman's left forearm 3.1 into its shirt at 3.415, its elbow
   // against the belly's side. Now the deepest are 0.3 cm, two vertices of the foreman's left elbow and two of its
   // wrist through its left hold (read every 2 ms). Read to the garment's nearest vertex instead (this check's first
   // version, 4 cm at most), a forearm 0.04 cm in read 4.5 and one 3.1 cm in read 3.7 (review round 3). The sleeves,
   // cloth over the forearm, are not read: the director's right stays in its clothes from its let-go to its far grip,
   // 5.0 cm into its waistcoat by the elbow through its hold, and its left until 3.17 s, where 8da9a826 had it out from
   // 2.98 s, and 1.1 to 1.2 cm from 3.20 to 3.31. Nor are the moves from each grip to its hold and on to the far grip:
   // the grips lie under the belly and the seat, and there the hands sit inside the clothes for 0.09 to 0.15 s after
   // each let-go and before each far grip (the foreman's left from its hold to its far grip but for about 4 ms at 3.50
   // s) and the forearms for up to 0.27 s (the foreman's left from 3.17 s to its far grip, 0.3 cm through its hold), up
   // to 18.0 cm in; on 8da9a826 they lay in from each let-go to its far grip. The deep bodies are taken by their ids,
   // the catalog's two pigs, the bodies the climb's rule picks by their depth in front (wall-climb.js, back over .05).
   if(deepBody){const first={};for(let i=0;i<pr.count;i++)if(first[pr.part[i]]===undefined)first[pr.part[i]]=i;
    const bone=i=>pr.boneNames[pr.bone[i]],part=re=>m.worker.parts.find(q=>re.test(q.name)),X=pr.x,Y=pr.y,Z=pr.z;
    const garment=(q,open)=>{const g=q.geometry,ix=g.index,k=first[pr.names.indexOf(q.name)],n=ix?ix.count/3:g.attributes.position.count/3,tris=[];
     for(let j=0;j<n;j++){const t=[0,1,2].map(c=>k+(ix?ix.getX(3*j+c):3*j+c));if(open&&t.some(i=>/^(upperArm|forearm|hand|fingers)/.test(bone(i))))continue;tris.push(t);}return {tris};};
    const shirt=part(/shirt/),trousers=part(/trousers/);assert.ok(shirt&&trousers,`wall: a deep body's shirt and trousers (${m.worker.parts.map(q=>q.name).join(', ')})`);
    const G={shirt:garment(shirt,true),trousers:garment(trousers,false)},wind=(i,tris)=>{const px=X[i],py=Y[i],pz=Z[i];let s=0;
     for(const [a,b,c] of tris){const ax=X[a]-px,ay=Y[a]-py,az=Z[a]-pz,bx=X[b]-px,by=Y[b]-py,bz=Z[b]-pz,cx=X[c]-px,cy=Y[c]-py,cz=Z[c]-pz,la=Math.hypot(ax,ay,az),lb=Math.hypot(bx,by,bz),lc=Math.hypot(cx,cy,cz);
      s+=2*Math.atan2(ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx),la*lb*lc+(ax*bx+ay*by+az*bz)*lc+(ax*cx+ay*cy+az*cz)*lb+(bx*cx+by*cy+bz*cz)*la);}return s/(4*Math.PI);};
    const tri=(i,a,b,c)=>{const px=X[i],py=Y[i],pz=Z[i],ax=X[a],ay=Y[a],az=Z[a],abx=X[b]-ax,aby=Y[b]-ay,abz=Z[b]-az,acx=X[c]-ax,acy=Y[c]-ay,acz=Z[c]-az,apx=px-ax,apy=py-ay,apz=pz-az,
     d1=abx*apx+aby*apy+abz*apz,d2=acx*apx+acy*apy+acz*apz;if(d1<=0&&d2<=0)return Math.hypot(apx,apy,apz);
     const bpx=px-X[b],bpy=py-Y[b],bpz=pz-Z[b],d3=abx*bpx+aby*bpy+abz*bpz,d4=acx*bpx+acy*bpy+acz*bpz;if(d3>=0&&d4<=d3)return Math.hypot(bpx,bpy,bpz);
     const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return Math.hypot(apx-v*abx,apy-v*aby,apz-v*abz);}
     const cpx=px-X[c],cpy=py-Y[c],cpz=pz-Z[c],d5=abx*cpx+aby*cpy+abz*cpz,d6=acx*cpx+acy*cpy+acz*cpz;if(d6>=0&&d5<=d6)return Math.hypot(cpx,cpy,cpz);
     const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return Math.hypot(apx-w*acx,apy-w*acy,apz-w*acz);}
     const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return Math.hypot(bpx-w*(X[c]-X[b]),bpy-w*(Y[c]-Y[b]),bpz-w*(Z[c]-Z[b]));}
     const k=1/(va+vb+vc),v=vb*k,w=vc*k;return Math.hypot(apx-abx*v-acx*w,apy-aby*v-acy*w,apz-abz*v-acz*w);};
    let inside={d:0};
    for(const [s,t0,t1,name] of [[1,2.695,2.90,'right'],[-1,3.195,3.42,'left']]){const hand=part(new RegExp('^forearm and hand '+s+'$')),hk=first[pr.names.indexOf(hand.name)],hv=[];
     for(let v=0;v<hand.geometry.attributes.position.count;v++)if(/^(hand|fingers|forearm)/.test(bone(hk+v)))hv.push(hk+v);
     for(let k=0;t0+k*.01<=t1+1e-9;k++){const t=t0+k*.01;motion.apply(t/D);pr.update();
      for(const [gn,g] of Object.entries(G))for(const i of hv){if(Math.abs(wind(i,g.tris))<=.5)continue;let d=Infinity;for(const [a,b,c] of g.tris)d=Math.min(d,tri(i,a,b,c));
       if(d>inside.d)inside={d,t,gn,what:name+' '+(/^forearm/.test(bone(i))?'forearm':'hand')};}}}
    assert.ok(inside.d<=.01,`wall: the held ${inside.what} lies ${(100*inside.d).toFixed(1)} cm inside the ${inside.gn} at ${inside.t?.toFixed(3)} s (1 cm at most)`);}
   let loose={d:0};
   for(let t=3.85;t<=4.15+1e-9;t+=.01){motion.apply(t/D);pr.update();let h=Infinity;for(let i=0;i<pr.count;i++)if(/hand/.test(pr.names[pr.part[i]]))h=Math.min(h,off(pr.x[i],pr.y[i],pr.z[i]));if(h>loose.d)loose={d:h,t};}
   assert.ok(loose.d<=.01,`wall: lowering down the far face the hand point nearest the wall's surface is ${(1e3*loose.d).toFixed(1)} mm from it at ${loose.t?.toFixed(2)} s`);
   // As the right knee comes up (2.20 to 2.60 s) the left hand keeps to its grip, the only hand a deep body keeps keyed
   // to the wall from the right's let-go at 2.345 s (the pig foreman's right hand peels off the top by 2.425, by the
   // gate's contacts; every other mammal's right hand re-grips the top at 2.585): the nearest point of its mesh
   // (forearm and hand) within 1 cm of the wall's surface, read every 10 ms. On 374c624c the pig foreman's left
   // shoulder rose out of its arm's reach of that grip and pulled the hand up to 43.1 mm off the top (2.44 s; its boots
   // alone held it from 2.355 to 2.500, and 27 readings over the gate's limits fell from 2.353 to 2.501); since a deep
   // body's trunk takes a key mid-way through the knee coming up (wall-climb.js, KNEE_MID) every mammal's keeps within
   // 4.3 mm (the pig director's at 2.28 s; 8.2 on 374c624c, the others' 2.5 at most).
   let lifted={d:0};
   for(let t=2.20;t<=2.60+1e-9;t+=.01){motion.apply(t/D);pr.update();let h=Infinity;for(let i=0;i<pr.count;i++)if(pr.names[pr.part[i]]==='forearm and hand -1')h=Math.min(h,off(pr.x[i],pr.y[i],pr.z[i]));if(h>lifted.d)lifted={d:h,t};}
   assert.ok(lifted.d<=.01,`wall: as the right knee comes up the left hand's nearest point is ${(1e3*lifted.d).toFixed(1)} mm from the wall's surface at ${lifted.t?.toFixed(2)} s (10 mm at most)`);
   // Over the top the hips do not jolt: from 2.6 to 3.5 s their vertical acceleration (the hips bone's world height,
   // 5 ms chords read every millisecond) stays within -25 and +30 m/s^2. A deep body's band over the top rests its
   // torso, not the skin a thigh carries (wall-climb.js, LEG). On d1118c40, resting the pig foreman on a trouser fold
   // its left thigh dragged under the hip, the band dropped it 8.3 cm in 15 ms as the fold slid off the top, and the
   // hips read -63.4 m/s^2 at 3.378 s (the pig director, on its own fold, -89.7 at 3.195 and +42.0 at 3.149; the
   // foreman +34.4 at 3.416); with the seat below but the band still resting the fold, only the director fails it
   // (-38.2 at 3.198). Every other mammal reads -19.8 to +11.5 there, unchanged, and the pigs now -15.3 to +24.4 (-15.2
   // to +24.3 on 374c624c, -15.4 to +23.7 on 8da9a826, -15.6 to +24.5 on c44413ef, -15.5 on ba891c83, -14.4 to +24.5 on
   // f293da69).
   const hipsY=t=>{motion.apply(t/D);return bones.hips.getWorldPosition(bones.hips.position.clone()).y;},ys=new Map();
   const yAt=t=>{const k=Math.round(t*1e3);if(!ys.has(k))ys.set(k,hipsY(k/1e3));return ys.get(k);};let jolt={a:0};
   for(let t=2.6;t<=3.5+1e-9;t+=.001){const a=(yAt(t+.005)-2*yAt(t)+yAt(t-.005))/.005**2;if(a<-25||a>30){if(Math.abs(a)>Math.abs(jolt.a))jolt={a,t};}}
   assert.ok(!jolt.t,`wall: over the top the hips' vertical acceleration reads ${jolt.a.toFixed(1)} m/s^2 at ${jolt.t?.toFixed(3)} s (-25 to +30)`);
   // Over the top a deep body sits (wall-climb.js, the balance's hold): its held samples are a seat, onto which the
   // plan's centre of mass falls no faster than gravity (traversal-balance.js, planCentre). Held with no bounds, the
   // plan pulled the pig foreman down at 51.4 m/s^2 at 3.380 s and the pig director at 53.6 at 3.195, and, with the
   // band resting the foreman's torso, the foreman at 51.1 at 3.655; seated, both pigs' plans fall at 9.81 at most.
   // Where no sample is a seat the fall check fails first; the seat check guards a held sample left unmarked.
   {const P=B.plan,T=B.times,held=[];for(let k=1;k<n-1;k++)if(S[k].kind==='hold')held.push(k);
    assert.ok(held.length>0===/^pig-/.test(p.id),`wall: ${held.length} held samples over the top`);
    let fall={a:0};for(const k of held){const a=(P[k-1][1]-2*P[k][1]+P[k+1][1])/dt**2;if(a<fall.a)fall={a,t:T[k]};}
    assert.ok(fall.a>=-9.82,`wall: over the top the plan pulls the held body down at ${(-fall.a).toFixed(2)} m/s^2 at ${fall.t?.toFixed(3)} s (gravity's 9.81 at most)`);
    assert.ok(held.every(k=>S[k].seat),`wall: ${held.filter(k=>!S[k].seat).length} of the ${held.length} held samples over the top are not a seat`);}
   // Walking away from the wall the body stands on its feet: from the landing (its first sample on the feet after the
   // Absorb key) to the end, the balance plans on its feet alone (traversal-balance.js, supportAt: of the mesh the rig
   // names a hand, the forearm and the elbow grip only hooked over a top). On b383d186 ten climbs read a grip from
   // their right elbows on the wall's far face as they walked away (from 5.150 to 5.295 s, 20 ms after the touch), and
   // the plan pulled the body back toward the wall on one boot (the pig foreman: 84 + 7 readings over the rig's limit);
   // only the pig director walked away on its feet.
   {const T=B.times,a=motion.phases.find(x=>x.label==='Absorb').end,k1=S.findIndex((x,k)=>T[k]>a&&x.kind==='feet'),k2=k1<0?-1:S.findIndex((x,k)=>k>k1&&x.kind!=='feet');
    assert.ok(k1>0&&k2<0,k1<0?'wall: no sample on the feet after the landing':`wall: walking away the balance plans on a ${S[k2]?.kind} at ${T[k2]?.toFixed(3)} s`);}
   // As the hooves leave, the body's turning comes off the floor: from 15 ms before the balance's last foot sample
   // before the flight to 10 ms after it, the body's angular momentum about its centre of mass (the model above, read
   // every millisecond, its rate over 2 ms chords) changes at most 100 N·m (traversal-balance.js, LEAD). The legs
   // fold before the hooves leave, and with the turn held only from the first sample in the air the floor was asked to
   // turn the body as they swung, on a fading push: on 6d7ac5d4 every mammal's climb read 229 to 408 N·m there (the
   // horse's 398 at 0.865 s, 147 N on its hooves), now 15 to 63 (12 to 64 on 08274608).
   {const h=5e-4,Lh=t=>{const [A,ca]=at(t-h),[P,c]=at(t),[Q,cb]=at(t+h),vc=sub(cb,ca).map(x=>x/(2*h)),out=[0,0,0];
     for(const [a,b,mass] of MASS_SEGMENTS){const r=sub(mid(P,a,b),c),v=sub(sub(mid(Q,a,b),mid(A,a,b)).map(x=>x/(2*h)),vc),[u,l]=unit(P,a,b),du=sub(unit(Q,a,b)[0],unit(A,a,b)[0]).map(x=>x/(2*h));
      const o=cross(r,v),s=cross(u,du);for(let q=0;q<3;q++)out[q]+=mass*o[q]+mass*l*l/12*s[q];}return out;};
    const spinOver=(t0,t1)=>{const Ls=[];for(let t=t0-.001;t<=t1+.001+1e-9;t+=.001)Ls.push([t,Lh(t)]);let spin={v:0};
     for(let i=1;i<Ls.length-1;i++){const v=Math.hypot(...[0,1,2].map(q=>(Ls[i+1][1][q]-Ls[i-1][1][q])/.002));if(v>spin.v)spin={v,t:Ls[i][0]};}return spin;};
    {const tf=B.times[k0-1],spin=spinOver(tf-.015,tf+.010);
     assert.ok(spin.v<=100,`wall: as the hooves leave the body's angular momentum changes at ${spin.v.toFixed(0)} N·m at ${spin.t?.toFixed(3)} s (100 at most)`);}
    // Nor does the flight that follows turn the body: from 5 ms after the balance's first sample in the air (where the
    // rig can still read a hoof on the floor: the pig director's boot at 0.870 s, where the rate read 10.2 N·m on
    // 21efea5e and reads 0.3 now) to 50 ms after it, the same angular momentum changes at most 10 N·m, the rig's
    // airborne limit (traversal-balance.js: the climb's flights' turn every millisecond, fine). On 6fe975ef, with the
    // turn held at the 5 ms samples alone, eight climbs read 14.6 to 24.8 N·m there (the goat's 24.8 at 0.889 s, as its
    // legs fold), the skunk, rabbit and pig director 8.9, 9.4 and 9.9; on 21efea5e 0.6 to 8.8 (the horse's 8.8, its
    // head fitted again after the balance, which the turn did not see); now 0.4 to 1.3 (0.3 to 1.2 on 08274608).
    {const spin=spinOver(B.times[k0]+.005,Math.min(B.times[k1],B.times[k0]+.05));
     assert.ok(spin.v<=10,`wall: in the take-off's flight (${(B.times[k0]+.005).toFixed(3)} to ${Math.min(B.times[k1],B.times[k0]+.05).toFixed(3)} s) the body's angular momentum changes at ${spin.v.toFixed(1)} N·m at ${spin.t?.toFixed(3)} s (10 at most)`);}
    // Nor as the hands reach the top: over the 50 ms to the last millisecond the balance's 1 ms pass reads in the air
    // before they land (B.fineAir; on code without it, the last sample whose own contacts read air: a grip counts in
    // the plan only from 20 ms after its touch), the same angular momentum changes at most 10 N·m
    // (traversal-balance.js: the flights' turn holds up to the hands, fine). On 21efea5e, its turn eased out 5 ms
    // before that sample, eight climbs read 11.5 to 79.4 N·m there (the rabbit's 79.4 at 1.225 s, as its arms stop at
    // the top); now 0.1 to 0.9 (the pig foreman's 0.9 at 1.180 s; 0.1 to 4.1 on 08274608, the rabbit's 4.1 at 1.224 s).
    // And the take-off's flight falls free: from 5 ms after its first sample in the air to that last millisecond, the
    // centre of mass (read every millisecond over 0.5 ms chords) accelerates within 0.98 m/s^2 of gravity, the rig's
    // force limit (10% of the body's weight). On 21efea5e, its centre held at the 5 ms samples alone, seven climbs read
    // 1.05 to 2.86 m/s^2 (the rabbit's at 1.224 s, its arms stopping); now 0.03 to 0.11 (0.04 to 0.14 on 08274608).
    {let kr=k0;while(kr+1<n&&(S[kr+1].raw??S[kr+1].kind)==='air')kr++;const T=B.times,fa=(B.fineAir||[]).find(([a,b])=>b>=T[k0]&&a<=T[k0]+.05),te=fa?fa[1]:T[kr],spin=spinOver(te-.05,te);
     assert.ok(spin.v<=10,`wall: as the hands reach the top (${(te-.05).toFixed(3)} to ${te.toFixed(3)} s) the body's angular momentum changes at ${spin.v.toFixed(1)} N·m at ${spin.t?.toFixed(3)} s (10 at most)`);
     let fall={v:0};for(let t=T[k0]+.005;t<=te+1e-9;t+=.001){const a=at(t-h)[1],c=at(t)[1],b=at(t+h)[1],v=Math.hypot(...a.map((x,q)=>(x-2*c[q]+b[q])/(h*h)+(q===1?9.81:0)));if(v>fall.v)fall={v,t};}
     assert.ok(fall.v<=.981,`wall: in the take-off's flight (${(T[k0]+.005).toFixed(3)} to ${te.toFixed(3)} s) the centre of mass accelerates ${fall.v.toFixed(2)} m/s^2 off gravity's at ${fall.t?.toFixed(3)} s (0.98 at most)`);}
    // Letting go, a hand holds nothing as it slides off (traversal-balance.js, RELEASE): around the hands' last touch
    // on the top after the let-go (read as the balance reads contacts, but for the climb's tails, whose roots it does
    // not tell from the rest, which can only add feet on the top within DRAPE of the centre of mass, as no body hanging
    // from the top is: contactProbe and supportAt on the played pose at each of its samples, a grip while a hand point
    // lies within the rig's centimetre of the wall), from the sample before the last that touches to the first that
    // does not, between which the touch ends, the support the played body asks for, its mass times its centre of mass's
    // acceleration less gravity's (read over 0.5 ms chords every millisecond), is at most 10% of its weight, the gate's
    // limit of phantom force. It bounds that force's size, not its direction nor the turn it asks for, and it guards
    // the release's premise, not a gate reading: the gate lets any hand point within its centimetre give any force.
    // Planned to the last touch (b6643d4a), every climb asked 125 to 185 N there, upward, at the window's first instant
    // (170 to 252% of that limit, the pigs the most), where 2 to 15 points still touched (2 to 12 of them the hands')
    // and the gate read nothing over its limit (0% on nine climbs, the bull's 51 and the donkey's 57%); its readings
    // came as the last one or two points left (the pig director's 111%, the donkey's and the sheep's 93 and 91%). Now
    // 21 to 32 N, every drop's reading 21% at most. That is the release's first sample, and it is downward: the plan's
    // flight meets gravity there, but the played centre, whose track cannot follow the plan's step from the grip's
    // support into free fall, dips a little past it (19 to 28 N as the gate's rows read it; on b6643d4a the same dip,
    // 17 to 26 N, fell at the drop's first sample in the air, where the gate read it as phantom force, 19 to 35% of its
    // limit), and with hand points still within its centimetre the gate lets them give it, as no palm sliding off the
    // top could.
    {const BM=MASS_SEGMENTS.reduce((m,x)=>m+x[2],0),G=9.81,h=5e-4,obstacles=edgeBoxes(WALL.edge,WALL.half,[[0,WALL.top]]),cp=contactProbe(m.worker),lg=motion.phases.find(x=>x.label==='Let go').end;
     const kindAt=t=>{const r=motion.apply(t/D);cp.update();return supportAt(cp,obstacles,[...r.com]).kind;};let last=null;
     for(let k=Math.ceil(lg/dt-1e-9);k*dt<=lg+.2;k++){const kd=kindAt(k*dt);if(kd==='grip')last=k*dt;else if(last!==null&&kd==='air')break;}
     assert.ok(last!==null,'wall: no hand on the top after the let-go');const com=t=>[...motion.apply(t/D).com];let worst={f:0};
     for(let q=0;q<=10;q++){const t=last-dt+q*.001,c0=com(t-h),c=com(t),c1=com(t+h),a=c.map((v,i)=>(c1[i]-2*v+c0[i])/(h*h)),f=BM*Math.hypot(a[0],a[1]+G,a[2]);if(f>worst.f)worst={f,t};}
     assert.ok(worst.f<=.1*BM*G,`wall: letting go, the body asks its hands for ${worst.f.toFixed(1)} N at ${worst.t?.toFixed(3)} s, around their last touch on the top (${(.1*BM*G).toFixed(1)} at most)`);}
    // Nor does the drop's flight turn the body: through the balance's first flight after the let-go (from the palms'
    // release, their last 10 ms on the top's far edge, until they are on the far face), the same angular momentum
    // changes at most 10 N·m, the rig's airborne limit (wall-climb.js: the palms arc out over the top's far corner
    // without stopping, and the head is held through the drop before the balance as after it). On d54c607d the nine
    // climbs read 20 to 32 N·m there (the hands braking to rest at a key past the edge, the bull's head turning in the
    // turn's plan alone), now 3.2 to 6.0 (3.1 to 5.9 on b6643d4a, its flight 10 ms shorter, from the palms' first
    // sample off the top; 3.4 to 5.9 on 21efea5e, 3.5 to 5.9 on 6fe975ef). The pigs are left out: their drop flights
    // turn at 12 N·m, at 4.330 and 4.324 s (51 and 11 on 21efea5e, the foreman and the director), as their palms land
    // on the far face; with their palms off the top before they let go (f293da69) they turned at 58 and 148, at 4.259
    // and 4.213 s, earlier in their drops. The rate here is a torque (N·m: the rig's airborne limit is 10 N·m).
    if(!/^pig-/.test(p.id)){const lg=motion.phases.find(x=>x.label==='Let go').end,a=S.findIndex((x,k)=>B.times[k]>=lg&&x.kind==='air');let b=a;while(b>=0&&b+1<n&&S[b+1].kind==='air')b++;
     assert.ok(a>0,'wall: no flight after the let-go');const spin=spinOver(B.times[a],B.times[b]);
     assert.ok(spin.v<=10,`wall: in the drop's flight (${B.times[a].toFixed(3)} to ${B.times[b].toFixed(3)} s) the body's angular momentum changes at ${spin.v.toFixed(1)} N·m at ${spin.t?.toFixed(3)} s (10 at most)`);}
    // And the release turns nothing: through its 10 ms (the drop's flight's first two samples, marked released:
    // traversal-balance.js, RELEASE), the same angular momentum changes at most 1 N·m, a tenth of the rig's airborne
    // limit: a hand that holds nothing turns nothing either (the 1 ms turn held from the release's first sample:
    // traversal-balance.js, fineFlights). Ramped in from FINE_RAMP after that sample instead, as into a flight off a
    // grip, the eleven read 1.9 to 9.5 N·m there (the rabbit's 9.5 at 4.236 s); held, 0.06 to 0.20. b6643d4a plans no
    // release (its drops' flights, from the palms' first sample off the top, read 0.9 to 3.1 in their first 10 ms). The
    // gate sees the hold only in part: it reads the hand points still within its centimetre as contacts there (40 N·m
    // on contact; the window's last 2 to 5 ms airborne on six climbs), and its drops' worst, ramped against held,
    // differ on three climbs (the skunk's 17.5 and 11.9%, the sheep's 19.3 and 17.6, the donkey's 20.2 and 20.6): the
    // bound guards the plan's own premise, that a released hand holds nothing.
    {const lg=motion.phases.find(x=>x.label==='Let go').end,a=S.findIndex((x,k)=>B.times[k]>=lg&&x.kind==='air');
     assert.ok(a>0&&S[a].released&&S[a+1]?.released&&!S[a+2]?.released,`wall: the drop's flight (from ${B.times[a]?.toFixed(3)} s) does not open on a 10 ms release`);
     const spin=spinOver(B.times[a],B.times[a]+.01);
     assert.ok(spin.v<=1,`wall: through the release (${B.times[a].toFixed(3)} to ${(B.times[a]+.01).toFixed(3)} s) the body's angular momentum changes at ${spin.v.toFixed(2)} N·m at ${spin.t?.toFixed(3)} s (1 at most)`);}
    // Nor does the walk-out's right foot jolt the body as it sets down: from 50 ms before the trunk's key as it comes
    // round (the end of Right foot round, 5.84 s) to 80 ms after it, the same angular momentum changes at most 100 N·m
    // (wall-climb.js: the hoof set down over 80 ms, its land key 40 ms after the trunk's). Set down over 40 ms
    // (f209cf98), every climb read 129 to 173 N·m there (the skunk's 173 at 5.833 s; the rig 147 and 148% of its limit on
    // the dog's and the rabbit's at 5.840), now 44 to 60. It bounds how hard the set-down jolts the body, not where that
    // asks the feet to push: f209cf98's rate peaked as the hoof started down and as it stopped (171 N·m at 5.807 s on the
    // rabbit and the dog, the others' peaks at 5.833), and at the rig's 148 and 147% (5.839 to 5.842 s) it read 22 to 77,
    // so a set-down under 100 N·m could still flip the moment. On the ground the feet may push that rate, so no fixed
    // limit holds it: 100 N·m is a guard between the two.
    {const rf=motion.phases.find(x=>x.label==='Right foot round').end,spin=spinOver(rf-.05,rf+.08);
     assert.ok(spin.v<=100,`wall: as the right foot sets down after the turn the body's angular momentum changes at ${spin.v.toFixed(0)} N·m at ${spin.t?.toFixed(3)} s (100 at most)`);}}
   // A pig hangs from the far grips within its arms' reach (wall-climb.js, the far hang): over the last 50 ms before it
   // lets go, each arm's shoulder lies within .97 of the arm's length, plus 1.5 cm, of its grip (the far edge's mark, x
   // .565, wall-climb.js's farX for a deep body; the wrist .07 over the top; z on its own side). On these rigs .97 of
   // the arm plus 1.5 cm is the arm's whole length (50.5 cm). On f293da69 the pigs' arms were up to 7.4 and 5.7 cm past
   // .97 of the arm there (the foreman's and the director's), their palms sliding off the top onto the face before they
   // let go; now 1.14 and 0.55 (0.54 on 21efea5e). It guards the pigs' last 50 ms only: over the last 60 and 75 ms the
   // foreman reads 1.46 and 2.05, and the other climbs hang at their arms' full length there (the dog 2.2 to 2.6 cm
   // past).
   if(/^pig-/.test(p.id)){const lg=motion.phases.find(x=>x.label==='Let go').end,W=q=>bones[q].getWorldPosition(new T.Vector3());
    motion.apply(lg/D);const arm=s=>W('upperArm'+s).distanceTo(W('forearm'+s))+W('forearm'+s).distanceTo(W('hand'+s)),L={'-1':arm(-1),'1':arm(1)};let worst={d:-Infinity};
    for(let t=lg-.05;t<=lg+1e-9;t+=.005){motion.apply(t/D);for(const s of [-1,1]){const d=W('upperArm'+s).distanceTo(new T.Vector3(.565,WALL.top+.07,-s*.20))-.97*L[s];if(d>worst.d)worst={d,t,s};}}
    assert.ok(worst.d<=.015,`wall: hanging from the far grips the arm on side ${worst.s} is ${(100*worst.d).toFixed(1)} cm past .97 of its reach at ${worst.t.toFixed(3)} s (1.5 at most)`);}}
  // A stepping leg keeps its knee bent: through the window's get-up steps and the climb's last two, the stepping leg's
  // hip-to-ankle distance stays short of the IK's soft reach (traversal-pose.js limb(): within SOFT, 1.5 cm, of
  // straight it eases the hoof short of its mark; mid-step the reach widens by the step's soft zone, so the bound is
  // exact at the lift and the landing and lenient between), so the hoof meets its mark. Each step is read over its
  // phase, the climb's right foot 40 ms on, to its landing (its land key 5.88 s, the trunk's 5.84: wall-climb.js). With
  // the hips near standing height the window's last step lifted and landed at 0.99 of the leg's length (10.7 to 15.0 mm
  // inside that reach at the worst, over the eleven mammals) and the climb's at 1.00, its hoof landing about 100 ms
  // late.
  {const STEPS={window:{'Left foot back':[-1],'Right foot back':[1],'Left foot round':[-1]},wall:{'Left foot round':[-1],'Right foot round':[1,.04]}}[kind];
   if(STEPS){const P=n=>bones[n].getWorldPosition(new T.Vector3());let worst={m:Infinity};
    for(const [label,[s,late=0]] of Object.entries(STEPS)){const ph=motion.phases.find(x=>x.label===label);assert.ok(ph,`${kind}: no "${label}" phase`);
     for(let t=ph.start;t<=ph.end+late+1e-9;t+=.005){motion.apply(t/motion.duration);const a=P('thigh'+s),b=P('shin'+s),c=P('hoof'+s),margin=a.distanceTo(b)+b.distanceTo(c)-.015-a.distanceTo(c);if(margin<worst.m)worst={m:margin,t,label};}}
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
