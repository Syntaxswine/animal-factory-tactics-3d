import {V,Q,DEG,clamp,smooth,track,spinTrack,angleTrack,bodyQ,yawQ,relQ,keyedLimb,posedFrom,steadyPoles,steadyTurns,limbSample,createTraversalBody,createSurfaceProbe} from './traversal-pose.js';
import {bodyFit,createTailBend,createClearanceFit,edgeBoxes} from './traversal-fit.js';
import {balanceTraversal,contactProbe,boxedPath} from './traversal-balance.js';
// Climb over a 2 m wall (docs/tactics/NATURAL-TRAVERSAL.md). Local frame: start on the tile at the origin facing +X,
// the wall on the edge at X = .5 (faces .42 and .58, top 2.0), finish standing on the next tile's centre (1, 0, 0)
// facing on. The top is 0.35 above the head and the standing palm reach is about 1.71, so: a jump to catch the top,
// hang with the hooves on the face, walk up and pull until the chest is over, hook the right knee up and straddle the
// 16 cm top, bring the left leg over turning to face the wall, lower down the far face, drop the last few
// centimetres with the palms sliding down it, then turn round onto the tile centre.
export const WALL=Object.freeze({edge:.5,half:.08,top:2.0});
// Heights are the horse's (traversal-fit.js): a key the legs hold up (stand) is scaled to each character's legs, a key
// hanging from the hands (hang) keeps the shoulders where the horse's were, and a body deeper in front stands back while
// it faces the wall (near), feet and all, and again on the far side (far). A key that grips the top (grip) rises until
// both hands reach it. A foot leaving a face keeps its ankle off it, toe up, so a long foot (rabbit, dog, skunk) never
// swings into the wall. The straddle faces along the wall, one leg down each side, so the thighs hang outside the 16 cm
// top; the left leg comes over behind it, knee to the top, so the body turns left to face the wall from the far side.
// The crouch goes down to .50 (it was .56): held under the hooves' release (the push's ceiling, below), the jump finds
// its take-off speed in the push's length. From .56 the horse's centre of mass peaked at 2.93 m/s in the push and met
// the catch 7.9 cm under its authored path; from .50 it peaks at 3.13 m/s and meets it 0.6 cm under. On e909dcf4,
// with the ceiling and the turn refined on the final hips, the eleven climbs read 2218 readings over the limit from .56
// and 1878 from .50 (2546 on 148c6fb7).
const TRUNK=[
 {t:0,label:'Ready',hips:[0,.80,0],stand:true},
 {t:.4,label:'Step in',hips:[.10,.79,0],pitch:4,nod:-10,stand:true,near:true},
 {t:.7,label:'Crouch',hips:[.08,.50,0],push:18,pitch:14,flex:4,nod:-30,turn:40,stand:true,near:true},
 {t:.86,label:'Push off',hips:[.15,.85,0],pitch:2,nod:-16,turn:40,stand:true,near:true,launch:true},
 {t:1.185,label:'Over the top',hips:[.24,1.20,0],pitch:-3,flex:-2,nod:-12,turn:40,apex:.04,near:true},
 {t:1.265,label:'Jump and catch',grip:true,catch:true,hips:[.25,1.20,0],pitch:-4,flex:-2,nod:-10,turn:40,hang:true,near:true},
 {t:1.505,label:'Hang',grip:true,hips:[.25,1.14,0],pitch:-8,flex:-2,nod:-8,turn:40,hang:true,near:true},
 {t:1.905,label:'Walk up the face',grip:true,hips:[.24,1.36,0],pitch:-12,flex:2,nod:-8,turn:40,hang:true,near:true},
 {t:2.305,label:'Chest over the top',grip:true,hips:[.30,1.86,0],pitch:34,flex:14,nod:-5,turn:30,hang:true},
 {t:2.705,label:'Right knee up',hips:[.42,2.20,.04],pitch:62,roll:-18,heading:-30,flex:10,nod:-5,turn:15},
 {t:3.065,label:'Straddle',hips:[.50,2.18,0],pitch:28,heading:-90,flex:6,nod:-12},
 {t:3.305,label:'Left knee up behind',hips:[.52,2.17,-.03],pitch:52,heading:-108,flex:12,nod:-14,turn:10},
 {t:3.625,label:'Left leg over',hips:[.72,2.05,.02],pitch:26,heading:-165,flex:10,nod:-10,turn:-20},
 {t:4.105,label:'Lower down the far face',far:1,farLean:true,grip:true,hips:[.72,1.24,0],pitch:-6,heading:-180,flex:-2,nod:-8,turn:-40,hang:true},
 {t:4.205,label:'Let go',far:1,farLean:true,grip:true,still:true,hips:[.73,1.20,0],pitch:-4,heading:-180,flex:-2,nod:-8,turn:-40,hang:true},
 {t:4.505,label:'Drop',far:1,hips:[.84,.86,0],pitch:4,heading:-180,flex:3,nod:-10,turn:-40,stand:true,fall:true},
 {t:4.685,label:'Absorb',far:.5,hips:[.93,.64,0],pitch:8,heading:-180,flex:6,nod:-5,turn:-40,stand:true},
 {t:4.95,label:'Weight on the right foot',hips:[.91,.74,-.10],pitch:4,heading:-200,flex:3,turn:-30,stand:true},
 // The last two steps keep the knees bent (the hips at 0.75 to 0.77 m, and over toward the right foot as it lands): at
 // full standing height, the hips over the left foot, the right leg reached its full length and its hoof landed about
 // 100 ms late, the IK easing it short of its mark; the stepping legs now stay 20 mm or more short of the IK's soft reach.
 {t:5.27,label:'Left foot round',hips:[.95,.75,-.12],heading:-270,turn:-10,stand:true},
 {t:5.52,label:'Weight on the left foot',hips:[1.0,.77,-.18],heading:-300,stand:true},
 {t:5.84,label:'Right foot round',hips:[1.0,.75,-.05],heading:-345,stand:true},
 {t:6.1,label:'Turn onto the tile',hips:[1,.80,0],heading:-360,stand:true},
];
export function createWallClimb(worker,profile={id:'horse'}){
 const body=createTraversalBody(worker),tails=createTailBend(worker),probe=createSurfaceProbe(worker,{stride:2,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),fitB=bodyFit(body,probe),back=fitB.back,D=TRUNK.at(-1).t;
 // Facing the wall, a body deeper in front stands back too (near) and leans over its belly toward the wall (lean,
 // degrees of pitch) until its shoulders are where the horse's were. Unadapted, the fit pushed a pig's belly 17 to
 // 26 cm back off the face, out of its arms' reach of the top; stood back alone, the pig director's shoulders were
 // 52 cm from it, past its arms' 50. Its hands never gripped, and the balance, finding nothing holding the body until
 // the straddle, planned a second-long flight and drove the hips 25 to 40 cm into the floor to launch it.
 // It leans from the push on (leanFrom, the launch key), not from the catch: a body in the air cannot turn itself.
 // Leant in the flight's last 80 ms, the lean was taken back by the balance's turn about the centre of mass, the hands
 // missed the top, and the second round put the catch 115 and 90 ms after the first round's (the authored motion's), at
 // 1.365 and 1.345 s (there the turn was 25 degrees on the pig foreman and 29 on the director, the nearest hand 65.5
 // and 47.3 mm off the wall), the hang played with nothing holding the body. The pelvis-carried leg keys under the lean
 // are turned back by it (after LIMB), so the legs keep their tuck's place: turned with the pelvis, they lifted the
 // hooves 25 and 30 ms early into a longer jump than the pigs could make (the pig foreman's first round's plan 12 to
 // 14 cm under its authored path through the catch).
 // On the far face it stands back again (far: the share of back, from the lowering through the drop, half of it as the
 // landing is absorbed) and leans in again while it hangs (farLean), half as far again as on the near side (FAR_LEAN).
 // On 4e9853f6 the clearance fit pushed the pigs' trunks 21 to 22.5 and 24.7 to 25.0 cm off the far face as they
 // lowered (from 3.85 to 4.2 s; the horse's 4.7 at most), their hands came off the top (the nearest hand point up to
 // 25.5 and 40.6 mm from the wall from 3.85 to 4.15 s, every other body's within 2 mm) and the lowering and the let-go
 // read 79 + 63 and 112 + 8 readings over the gate's limits. Leant only as far as on the near side, the pig director's
 // hands still rose up to 6.0 cm above their grip as it lowered (on d1118c40's code its climb 341 readings against 78;
 // the pig foreman's 354 against 374, its drop cheaper and its let-go dearer at 1.0); leant half as far again, they
 // stayed within the rig's centimetre of the top, though the fit pushed its trunk further out (15 to 19 cm past its
 // stand-back, 13 to 18 at 1.0) and its hands held at the far edge, past its grip's mark, until the far hang (below)
 // pushed and raised its keys: the fit's push is now 15.3 cm at 3.80 s and 2.5 at 4.10 (19.3 and 15.8 on f293da69),
 // and the hands hold at it.
 // The lean comes off in the drop as the palms push on the face. Only the left landing foot stands back: with both, the
 // left foot stepping round passed in front of the planted right, the shins 10 cm through each other.
 const FAR_LEAN=1.5,lean=Math.asin(Math.min(1,back/(body.offsets.spine.y+body.offsets.shoulder[1].y)))/DEG,leanFrom=TRUNK.find(k=>k.launch).t,leanTo=TRUNK.findLast(k=>k.near&&k.t>=leanFrom).t;
 const farLeanFrom=TRUNK.find(k=>k.farLean).t,farLeanTo=TRUNK.findLast(k=>k.farLean).t,farLeanOff=TRUNK.find(k=>k.t>farLeanTo).t;
 const keys=TRUNK.map(k=>({...k,pitch:(k.pitch||0)+(k.near&&k.t>=leanFrom?lean:0)+(k.farLean?FAR_LEAN*lean:0),hips:[k.hips[0]-(k.near?back:0)+(k.far||0)*back,k.stand?fitB.stand(k.hips[1]):k.hang?fitB.hang(k.hips[1]):k.hips[1],k.hips[2]]}));
 // A deep body's trunk takes one more key mid-way through its right knee coming up (KNEE_MID), its fields blended by
 // time from the keys either side (chest over the top, right knee up) as they stand before the search over the top
 // below, which then sets it as it sets them. The search lifts each key before 2.5 s only as far as its torso needs to
 // clear the top (the chest over the top 26.3 cm on the pig foreman, 25.9 on the director) and sets each later one
 // resting on it (the right knee up raised 9.2, 1.7), its hands' reach weighed at the keys alone, and the trunk's path
 // between those two rose higher than either needed. The foreman's left shoulder rose out of its arm's reach of the
 // left hand's grip: 110.2% of the arm from it at 2.44 s (107.1 by the keyed path, the balance lifting it 1.4 cm more),
 // the hand pulled up to 4.3 cm off the top from 2.34 to 2.51 s; with its right hand let go (2.345 s), its boots alone
 // held it from 2.355 to 2.500, and 27 of its 49 readings over the gate's limits fell from 2.353 to 2.501, up to 273%
 // at 2.498. The balance counts no part against a face (supportAt: the boots on the near face), so with no hand within
 // its centimetre of the top from 2.340 s it planned a flight; the left hand was back within that centimetre from
 // 2.505, but a grip that short before the seat's hold at 2.550 is not counted (ONSET), so the flight ran to 2.545, the
 // body falling free in the plan. Through a flight the balance keeps the flight's median angular momentum, blended in
 // and out over the 0.25 s either side (traversal-balance.js, bodyTurn, EASE), and that turn swung the foreman by up to
 // 15.4 degrees at 2.25 s, mostly a roll, and 17.0 the other way at 2.61, a roll and a yaw (the turn's angle, every 10
 // ms); the first, with the clearance fit's push, lifted the left hand 16.3 mm off the top at 2.26 while the right
 // still held. The pig director's left shoulder reached 103.2% (2.30 s), its hand within 8.2 mm of the top. The new key
 // starts from the unsearched heights (the foreman's hips at 1.966 m) and the search lifts it the 16.3 cm its own torso
 // needs, pitched back 16 degrees (the director's 14.4, 22 degrees); the hands' reach does not bind at it (the left
 // shoulder 85.2% of the arm from its grip, the director's 83.9). So through the knee-up the trunk rides lower and,
 // from 2.36 s, more upright: at 2.45 s the foreman's pelvis 12.0 cm lower, its trunk 25.7 degrees from vertical
 // against 29.8 (the director's pelvis 6.5 cm lower), up to 11.5 degrees more upright at 2.60, its trousers on the top
 // from 2.395 s; before 2.31 s, its keyed path rising sooner into the chest over the top, it rides higher (by up to 5.2
 // cm at 2.23 s, the director's 4.9). The foreman's left hand keeps to the top, so the balance plans no flight there
 // and no longer turns it (1.2 degrees at the most from 1.90 to 2.96 s, every 10 ms). Its left arm now reaches 99.7% at
 // the most (2.29 s, where the clearance fit pushes the trunk back from the wall; 87.7 by the keyed path), the
 // director's 101.8; every mammal's left hand keeps within 4.3 mm of the wall's surface from 2.20 to 2.60 s (the
 // foreman's 2.1); and those 27 readings go (49 -> 22, none new), with the seat's moment as its left hand lifts off at
 // 2.968 s (29.1 N·m). A key at 2.40 read the same.
 const KNEE_MID=2.45;
 const deep=back>.05,farX=.54+(deep?.025:0),slideDZ=deep?.10:0;
 if(deep){const i=keys.findIndex(k=>k.t>KNEE_MID),a=keys[i-1],b=keys[i],u=(KNEE_MID-a.t)/(b.t-a.t),blend=(x,y)=>(x??0)+((y??0)-(x??0))*u;
  keys.splice(i,0,{t:KNEE_MID,label:'Knee coming up',hips:a.hips.map((x,j)=>blend(x,b.hips[j])),
   ...Object.fromEntries(['pitch','roll','heading','flex','side','twist','nod','tilt','turn'].map(f=>[f,blend(a[f],b[f])]))});}
 // Gripping keys rise until both hands reach the top at .97 of the arm (the horse's keys left them 13 cm short); the
 // hooves on the face rise with them (rise).
 const top=WALL.top+.07,rise={};
 for(const k of keys)if(k.grip){const hipsQ=yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG)),chestQ=hipsQ.clone().multiply(relQ(k.flex||0,k.side||0,k.twist||0));let y=k.hips[1];
  for(const s of [-1,1]){const g=V(k.t<3?.45:.54,top,k.t<3?s*.18:-s*.20),A=V(k.hips[0],0,k.hips[2]).add(body.offsets.spine.clone().applyQuaternion(hipsQ)).add(body.offsets.shoulder[s].clone().applyQuaternion(chestQ)),h=Math.hypot(g.x-A.x,g.z-A.z),r=.97*(body.L[s].upper+body.L[s].fore);
   if(h<r)y=Math.max(y,g.y-A.y-Math.sqrt(r*r-h*h));}
  rise[k.t]=y-k.hips[1];k.hips=[k.hips[0],y,k.hips[2]];}
 // Over the top, a body deeper in front than the horse's (deep: the pigs stand back 16 and 19 cm, every other body
 // within 1 mm; switched on by the donkey's 1 mm, this moved its legs 22 cm) lies on it differently. The horse's keys
 // lean its trunk over the 16 cm top, held there by its hands, its seat a few centimetres above it; at those leans a
 // pig's belly went 8 to 36 cm into the top, and its arms, set wider, fell 3 to 5 cm short of it even with its torso
 // touching it. So each key over the top takes the change of lean (pitch, searched) and the height that keep the torso
 // clear of the top, and from the right knee up to the left leg over that set its lowest point resting on it (REST: the
 // seat carries the body where the hands cannot), the hands' reach to their marks a cost (MARKS: where the arm keys
 // below plant them on the top, by time; a deep body's left hand lets go of its near mark at 2.895 s, but the search
 // weighs it to 3.485: the let-go below; and its right hand holds in front of its chest instead of re-planting on the
 // top from 2.585 to 3.0 s, while the search, which runs before the hands' rule and does not see it, still weighs that
 // mark: without it, on this fix's first round, the gate read 207 readings over its limits on the director against 34,
 // the foreman's as they were: review round 1's var-r1nom). The torso is its points at rest riding the hips or spine;
 // the height for a lean is exact (a move up or down shifts every point alike).
 // A deep body's far grips lie near the top's far edge (farX): hanging low on the far face, an arm reaching from
 // shoulders out past the belly to the top's middle crossed its far corner, and the clearance fit lifted the hand's
 // target off the top to clear it (up to 7.2 cm on the pig director leant only as far as on the near side). With the
 // grips at the middle, as the far lean is now, the foreman's hand came 10.6 mm off the wall as it lowered and the
 // climbs read 359 and 107 readings against 374 and 78 (on d1118c40's code); the forearms clear the corner while the
 // body hangs, not as it first comes over it (read every 5 ms: up to 5.4 and 5.9 cm in as they come over, from 3.40 to
 // 3.735 s, and 0.2 and 0.3 while they hang, from 3.76 to 4.10). Its hands slide down the face 10 cm further out on
 // each side (slideDZ): leant in over its belly, its head lay between its arms as the hands came off the top (the pig
 // foreman's right hand 8.3 cm into it at 4.214 s; 3.8 with the wider slide on f293da69, 3.7 on d1118c40; under 1 cm
 // since its palms arc off the top, below), and the wider slide doubled the pig director's turn in the air as it let go
 // (373 N·m at 4.206 s against 191; 8.1 at the most since its far hang and the arc, at 4.236 s).
 // The hooves on the near face rise with the search's change of height at their key (rise, as with the grip's rise). On
 // 4e9853f6 the search set the pig foreman's chest over the top 24 cm higher than the horse's with its feet left on the
 // face where the horse's were: its right leg hung straight, out of reach of its foot's target (1.31 leg lengths at
 // 2.40 s), until the knee whipped from straight (0.3 degrees at 2.424 s) to 46 at 2.444 (by the climb test's measure
 // in tests/natural-traversal.test.mjs, the shin bone's knee over 2 ms chords, 12.6 m/s at 2.438 and the pig director's
 // 14.1 at 2.402; the rig's knee point reads 13.4 and 14.5), and the climb's required force read 16.5 and 17.0 body
 // weights there. Rising, the hooves end that whip (4.4 and 5.5 m/s now, that test's measure), though the foreman's
 // right arm then went 5.4 cm into its trunk as its knee came up (1.6 cm without the rise), until a deep body's right
 // hand held in front of its chest over the top (below). With the far grips the search sets the foreman's left leg over
 // 8.7 cm above the horse's (0.8 on 4e9853f6), and its left leg, going down the far side to its 3.685 s key, locked
 // straight out of reach (the rig's knee point 14.3 m/s at 3.617 s, the test's measure 13.6; 13.7 body weights). So the
 // legs' keys at 3.685 s rode the search's height too (until they rose to the legs' reach instead, below): the lock
 // came back near what it was on 4e9853f6 (the rig's knee point 10.4 m/s at 3.631 s on d1118c40, 10.9 then; 9.3 once
 // the band rested the torso, 10.5 once the far hang below took away the band's drop that hid it, 7.3 since the legs'
 // keys there rise to their reach, below), at the cost of one reading and the foreman's hand check in that test (7.7 mm
 // from the wall against 3.6 without it, on d1118c40; 6.5 now, 7.2 on f293da69; the reach that replaced the ride costs
 // neither, below). Riding every leg key below the top over it instead cost the right knee up 9 readings (its foot's
 // 2.525 s key raised 17 cm), turned the airborne body at the band's jump harder (870 N·m at 3.405 s against 273 on
 // d1118c40; the band no longer jumps there) and put the director's required force over the limit (5.1 body weights
 // against 4.9 on d1118c40; 4.8 on f293da69, and 6.5 since the far hang below, at its old left elbow whip, until its
 // left hand let go before its arm ran out: below).
 let deepPts=null;if(deep){probe.update();const h0=body.at0('hips'),s0=body.at0('spine'),hipsPts=[],spinePts=[];deepPts={hips:hipsPts,spine:spinePts};
  for(let i=0;i<probe.count;i++){const b=probe.boneNames[probe.bone[i]],q=V(probe.x[i],probe.y[i],probe.z[i]);if(b==='hips')hipsPts.push(q.sub(h0));else if(b==='spine')spinePts.push(q.sub(s0));}
  const MARKS={1:[[1.265,2.345,[.45,top,.18]],[2.585,3.0,[.54,top,-.10]],[3.12,4.175,[farX,top,-.20]]],'-1':[[1.265,3.485,[.45,top,-.18]],[3.605,4.175,[farX,top,.20]]]};
  const reach=.97*(body.L[1].upper+body.L[1].fore),REST=[.006,.009],inTop=q=>q.x>WALL.edge-WALL.half&&q.x<WALL.edge+WALL.half&&Math.abs(q.z)<.5;
  for(const k of keys){if(k.t<2.265||k.t>=3.685)continue;const resting=k.t>2.5;let best=null;
   for(let dp=-30;dp<=30;dp+=2){const hipsQ=yawQ(k.heading||0).multiply(bodyQ(((k.pitch||0)+dp)*DEG,(k.roll||0)*DEG)),chestQ=hipsQ.clone().multiply(relQ(k.flex||0,k.side||0,k.twist||0)),H=V(...k.hips),C=H.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ));
    let low=Infinity;for(const q of hipsPts){const w=q.clone().applyQuaternion(hipsQ).add(H);if(inTop(w))low=Math.min(low,w.y-WALL.top);}for(const q of spinePts){const w=q.clone().applyQuaternion(chestQ).add(C);if(inTop(w))low=Math.min(low,w.y-WALL.top);}
    if(low===Infinity)continue;const dy=resting?(REST[0]+REST[1])/2-low:Math.max(0,REST[0]-low);
    let over=0;for(const s of ['1','-1']){const m=MARKS[s].find(([a,b])=>k.t>=a&&k.t<=b);if(!m)continue;const sh=C.clone().add(V(0,dy,0)).add(body.offsets.shoulder[+s].clone().applyQuaternion(chestQ));over=Math.max(over,sh.distanceTo(V(...m[2]))-reach);}
    const cost=Math.abs(dp)/10+Math.abs(dy)/.05+30*Math.max(0,over);if(!best||cost<best.cost)best={cost,dp,dy};}
   if(best){k.pitch=(k.pitch||0)+best.dp;k.hips=[k.hips[0],k.hips[1]+best.dy,k.hips[2]];rise[k.t]=(rise[k.t]||0)+best.dy;}}
  // On the far face a deep body's keys left its trunk in the wall, and the clearance fit pushed it out after them (the
  // pigs' 14 to 17 cm from 4.10 to 4.22 s on f293da69), past where the grip rise above set the keys: from about 4.0 s
  // their arms fell short of the far grips (6.3 to 7.9 cm past .97 of the arm on the pig foreman from 4.18 to 4.22 s,
  // 4.8 to 5.8 on the director, its most 7.5 at 4.095; the horse's 2.0 at the most), their palms came off the top onto
  // the face before they let go, and the balance found the foreman in flight inside its authored grip (4.045 to 4.140
  // s). So each far key is pushed out until the torso (its points at rest riding the hips or spine, as the search above
  // reads them) clears the far face by FAR_CLEAR below the top (the foreman's hanging keys 14.8 and 14.6 cm, the
  // director's 14.5 and 14.1; the drop's and the absorb's nothing; 6 mm lies inside the rig's centimetre, so the rig
  // still reads the director's shirt on the face from 4.150 to 4.220 s), and each hanging key (farLean) is raised until
  // both arms reach the far grips at .97 of the arm (the foreman's 7.6 and 7.2 cm, the director's 6.6 and 6.2): the
  // fit's push from 4.10 s is 3.7 cm at the most (the foreman's; 14.0 cm out and 3.4 up at 3.90), and the arms come
  // within 1 cm of the grips' reach from 4.165 s (the director's from 4.140), 3.5 cm past it at the most (the
  // foreman's, at 4.075 and 4.080). The let-go keeps its time, so its drop falls from the raised hang (the drop's arc
  // from the still key), and the hands' release and slide keys keep theirs with it. Let go earlier by the longer fall
  // instead, so that the drop touched down where and when it did, the falling body stretched the still-holding arms and
  // the palms snapped onto the far face (the foreman 10160% of the limit at 4.265 s); with the hands' keys moved with
  // the let-go, it snapped in the let-go (5398% at 4.125; both on d54c607d's code with the far hang, var-fh2 and
  // var-fh3). The pigs now touch down 25 and 30 ms later (the left boot at 4.555 and 4.545 s; the absorb's need the
  // same, about 2.2 kN), their hips coming 5.1 and 4.2 cm back toward the wall through the drop (3.6 and 3.3 before;
  // the foreman's let-go key lies 3.5 cm further out than its drop key, which nothing pushed); the foreman's head
  // passes within 4.9 mm of the far face as it lets go (4.230 s), the director's 10.5 (16.0 and 12.6 before), and the
  // director's left arm went 2.9 cm into its left thigh as its left leg came over (3.543 s, 1.4 before; under 1 cm
  // since the legs' keys at 3.685 s left the search's height, below). Over the top the fit now pushes the trunk out
  // less (the foreman's hips 3.7 to 5.4 cm further back from 3.60 to 3.70 s), and the foreman's band (below) no longer
  // drops it as its left leg locks straight going down the far side (3.633 s): that old lock, which the fall hid on
  // f293da69, asked 7.6 times its weight for 3 ms on the rig's 1 ms grid (its 5-ms samples 3.9), over the rig's 5,
  // until the legs' keys there rose to their reach (below: 3.7 now, at the later lock); the director's old left elbow
  // whip as its left leg came over asked 6.5 for 1 ms (3.517 s; 4.8 before), until its left hand let go before its arm
  // ran out (below: its peak now 3.3, at 3.037 s, since its hands hold in front of its chest; 3.6 at 3.040 before).
  const FACE=WALL.edge+WALL.half,FAR_CLEAR=.006;
  for(const k of keys){if(!k.far)continue;const hipsQ=yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG)),chestQ=hipsQ.clone().multiply(relQ(k.flex||0,k.side||0,k.twist||0)),H=V(...k.hips),C=H.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ));
   let push=0;const see=w=>{if(w.y<WALL.top&&Math.abs(w.z)<.5)push=Math.max(push,FACE+FAR_CLEAR-w.x);};for(const q of hipsPts)see(q.clone().applyQuaternion(hipsQ).add(H));for(const q of spinePts)see(q.clone().applyQuaternion(chestQ).add(C));
   k.hips=[k.hips[0]+push,k.hips[1],k.hips[2]];if(!k.farLean)continue;let y=k.hips[1];
   for(const s of [-1,1]){const g=V(farX,top,-s*.20),A=V(k.hips[0],0,k.hips[2]).add(body.offsets.spine.clone().applyQuaternion(hipsQ)).add(body.offsets.shoulder[s].clone().applyQuaternion(chestQ)),h=Math.hypot(g.x-A.x,g.z-A.z),r=.97*(body.L[s].upper+body.L[s].fore);if(h<r)y=Math.max(y,g.y-A.y-Math.sqrt(r*r-h*h));}
   rise[k.t]=(rise[k.t]||0)+y-k.hips[1];k.hips=[k.hips[0],y,k.hips[2]];}}
 // Flights are keyed as exact parabolas: the apex rises above the catch it comes down onto, and the launch and the catch
 // lie on the arc through it; a drop falls from a still hang to its touchdown. Each flight key is placed on its arc
 // with the arc's speed and an acceleration of -g (the quintics between them are then the parabola). Keyed by speed
 // alone, the drop outran gravity at 13.8 m/s^2 and the push went on past the toe-off at +24: the plan's arc could
 // fit neither, and moved the toe-off earlier each round to try.
 for(const [i,k] of keys.entries())if(k.apex!==undefined)k.hips=[k.hips[0],keys.slice(i+1).find(x=>x.grip).hips[1]+k.apex,k.hips[2]];
 const slope=(i,j)=>{const a=keys[i-1],k=keys[i],b=keys[i+1],l=(k.hips[j]-a.hips[j])/(k.t-a.t),r=(b.hips[j]-k.hips[j])/(b.t-k.t),m=(b.hips[j]-a.hips[j])/(b.t-a.t);return l*r<=0?0:Math.sign(m)*Math.min(Math.abs(m),3*Math.abs(l),3*Math.abs(r));};
 const g=9.81,pins={},accel={};
 for(const [i,k] of keys.entries()){const top=k.launch||k.catch?keys.find(x=>x.apex!==undefined):k.fall?keys.slice(0,i).findLast(x=>x.still):null;
  if(k.apex!==undefined||k.still){pins[i]=[slope(i,0),0,slope(i,2)];accel[i]=[0,-g,0];}
  // the crouch's bottom already pushing (push, m/s^2): starting from the neighbours' slopes, the push peaked near 30 m/s^2
  // late, beyond the legs' 3 body weights, and the plan began 80 ms earlier, 7 cm higher at the toe-off
  if(k.push){pins[i]=[slope(i,0),0,slope(i,2)];accel[i]=[0,k.push,0];}
  if(top){k.hips=[k.hips[0],top.hips[1]-g/2*(k.t-top.t)**2,k.hips[2]];pins[i]=[slope(i,0),-g*(k.t-top.t),slope(i,2)];accel[i]=[0,-g,0];}}
 const posTrack=track(keys.map(k=>[k.t,...k.hips]),pins,{accel}),rotTrack=angleTrack(keys.map(k=>[k.t,k.heading||0,k.pitch||0,k.roll||0]));
 const shape=track(keys.map(k=>[k.t,k.flex||0,k.side||0,k.twist||0,k.nod||0,k.tilt||0,k.turn||0]));
 let fit=null,steady=null,turnRef=null,balance=null,onTop=null;
 function trunkAt(t,bal=balance){const [flex,side,twist,nod,tilt,turn]=shape(clamp(t,0,D));let hips=V(...posTrack(t)),hipsQ=rotTrack(t),headQ=relQ(nod,tilt,turn);const spineQ=relQ(flex,side,twist);
  if(onTop)hips.add(onTop(t));if(bal)hips.add(bal.shift(t));
  if(fit){hips.add(fit.trunk(t));const bow=fit.bow(t);if(bow)hipsQ=hipsQ.clone().multiply(bodyQ(bow*DEG));const h=fit.head(t);if(h[0]||h[1]||h[2])headQ=headQ.multiply(relQ(...h));}
  const sp=bal?.spin?.(t);if(sp){hipsQ=sp.q.clone().multiply(hipsQ);hips.sub(sp.pivot).applyQuaternion(sp.q).add(sp.pivot);}
  return {hips,hipsQ,spineQ,headQ,chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))};}
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray(),ANKLE=fitB.ankle;
 // The crouched hooves push off for the jump (lift).
 const foot=(x,z,hoof=0,heading=0,lift=0)=>({f:'world',p:[x,ANKLE,z],hoof,heading,lift,plant:true}),stance=(s,dx=0)=>foot(fitB.foot(s,dx)[0],fitB.foot(s)[2]);
 // A hoof set flat against the near or far face: sole toward the wall (toe up), ankle a hoof's depth out.
 const onFace=(near,y,z,t)=>({f:'world',p:[near?WALL.edge-WALL.half-.12:WALL.edge+WALL.half+.12,y+(rise[t]||0),z],hoof:-85,heading:near?0:-180,plant:[near?-1:1,0,0]});
 const OUT=[.25,0,1]; // knees out to the sides while the hooves are on a wall face
 const SIDE=[-.3,0,1]; // straight out (a touch back) while a leg comes down the far side, clear of the face
 const DOWN_FAR=3.685; // the legs' keys hanging down the far face as the body leaves the top (raised to the legs' reach)
 // The far side faces the wall (heading -180): left foot and hand on +Z. The turn onto the tile steps the left foot
 // round behind the planted right, then the right round to its place (lifted mid-step); headings run on to -360.
 const land=(s,heading)=>({...stance(s,1),heading});
 // A stepping hoof arrives over its mark, flat, before it sets down (coming down on the slant, its heel touched with the
 // step still 6 cm from done, and slid).
 const over=(s,heading)=>({f:'world',p:[fitB.foot(s,1)[0],ANKLE+.025,fitB.foot(s)[2]],hoof:0,heading});
 const HANG=[-1,0,.8]; // a gripping hand's elbow: back and out from the wall
 // Letting go, the palms come off the top, out past its far edge and onto the far face, and slide down it as the body
 // drops, pushing it off the wall until the landing is absorbed (z: the hand's side, 1 for the hand on +Z). Raised
 // overhead instead, the hands swept down past the face at 8 m/s as the feet landed: the balance counted them gripping
 // it, carried the drop's turn into the landing and tipped every head and forearm 5 to 8 cm into the wall. Straight
 // from the top to the face, the fingers cut through its corner (4 cm), so they arc out over it (ARC, along the face's
 // outward normal, the most of it mid-way). Through a key just past the far edge instead (4.235 s, on d54c607d), every
 // limb key a stop, the hands braked to rest there in the air: the turn, sampled every 5 ms, could not follow (the
 // dog's arms' angular momentum changed at 330 N·m at 4.222 s and 15 at 4.236), and the rig read 217 to 249% of its
 // airborne limit at the key (the dog and the donkey 217, the skunk 246, the bull with its head held through the drop
 // 249). Arced, the palms slide off the top's far edge as the body starts down, the balance counting them a grip until
 // 4.240 s (through the key until 4.205 or 4.210). The horse's palms slide out over the top (outward at 1.2 to 2.5 m/s,
 // and down), its left hand in the wall's box to 4.234 (2.5 cm in at the let-go, as through the hang; 5.3 mm or less
 // from 4.225), as the motion's upward need, 458 N at the let-go (501 at 4.206), falls to 145 (through the key 223
 // there, none by 4.215); then both hands hover clear of it to 4.242, the nearer within the rig's centimetre (0.2 to
 // 8.9 mm), as the need falls from 132 N to 41: a hover as long as through the key (4.205 to 4.213 s, 223 to 29 N) and
 // lighter. The centre of mass starts down earlier and falls less fast after it (at most 5.5 mm off its path through
 // the key, at 4.218 s, within 1 mm by 4.33; the landing the same from 4.6 s). The drop's flight, from 4.245 to 4.325 s
 // (through the key from 4.210 or 4.215 to 4.295 or 4.300), turns at 3.4 to 5.9 N·m at the most (3.5 to 5.9 on
 // 6fe975ef; the test's measure; 20 to 32 through the key), under the rig's 10, and the nine climbs but the pigs' read
 // 112 readings over its limits against 188 on d54c607d (156 with the head held alone: the bull 50, then 18, then 8;
 // the donkey 17, then 8; the skunk 16, then 2; the dog 27, then 16; the other five as they were), and since the
 // flights' turn every millisecond (traversal-balance.js) 50: the horse 13, the goat 2, the bull and cow none, the
 // donkey 1, the sheep 4, the skunk none, the rabbit 21, the dog 9. Arced, the palm's turn onto the face switched its
 // way round 2.5 ms short of done and popped 0.09 degrees (steadyTurns now switches on the sample). A deep body arcs as
 // well now that its palms hold the top until it lets go (its far hang, above). With them off the top before the
 // let-go, arced, the pig foreman read 159 readings (7545% of the limit at its worst) against 88 through the key, the
 // director 67 (6399%) against 57; with the far hang, arced, 42 and 34 against 78 and 53 through the key (their let-go
 // and drop 5 and 4 against 41 and 23, the foreman's worst there 227% of the limit against 10810% at 4.265 s; their
 // worst readings then in the jump's flight, 603 and 455%, as they were there; since the climb's flights' turn every
 // millisecond, traversal-balance.js, the foreman's worst is its drop's 225% and the director's its catch's 337%). Of
 // the nine left in the let-go and drop, eight are new: the foreman's five in the air from 4.306 to 4.310 s, up to 227%
 // (six from 4.300, up to 225%, since that turn), in the last 5 ms before its palms reach the far face (where
 // f293da69's read up to 9.9 N·m, under the limit, before its palms reached it at 4.276 s), and the director's three on
 // contact from 4.231 to 4.233 s, up to 111%, as its hands leave the top (four, to 4.236 s, on 6fe975ef and since:
 // three on contact, one in the air).
 const FAR=[1,0,0],ONFACE=4.33,ARC=.06,SLIDE=z=>[[ONFACE,{f:'world',p:[.62,1.80,(.22+slideDZ)*z],face:FAR,arc:ARC,arcTo:FAR}],[4.685,{f:'world',p:[.62,1.10,(.26+slideDZ)*z],face:FAR}]];
 const LIMB={
  'leg-1':[[0,stance(-1)],[.4,foot(-.035-back,-.20)],[.7,foot(-.035-back,-.20,15)],[.995,{f:'pelvis',p:[body.offsets.thigh[-1].x-.165,body.offsets.thigh[-1].y-1.03*fitB.leg,-.20],hoof:55,soft:.03}],[1.195,{f:'pelvis',p:[body.offsets.thigh[-1].x-.165,body.offsets.thigh[-1].y-.95*fitB.leg,-.20],hoof:50}],[1.375,{f:'pelvis',p:[.02,-.62,-.13],hoof:20,knee:OUT}],[1.505,{...onFace(true,.46,-.16,1.505),knee:OUT}],[1.905,{...onFace(true,.80,-.16,1.905),knee:OUT}],[2.305,{...onFace(true,1.26,-.16,2.305),knee:OUT}],[2.705,{...onFace(true,1.56,-.16,2.705),knee:OUT}],
   [3.065,{f:'world',p:[.19,1.70,0],hoof:20,heading:-90}],[3.305,{f:'world',p:[.44,2.24,.62],hoof:10,heading:-108}],[3.485,{f:'world',p:[.68,2.12,.66],hoof:40,heading:-140,knee:SIDE}],[DOWN_FAR,{f:'world',p:[.80,1.36,.20],hoof:20,heading:-170,knee:SIDE}],
   [4.04,{...onFace(false,.56,.16,4.105),knee:OUT,lift:.3}],[4.205,{f:'pelvis',p:[-.06,body.offsets.thigh[-1].y-.95*fitB.leg,-.14],hoof:25,knee:OUT}],[4.375,{f:'pelvis',p:[-.06,body.offsets.thigh[-1].y-1.0*fitB.leg,-.14],hoof:25,soft:.03,knee:OUT}],[4.625,foot(.90+back,.14,0,-180)],[4.95,foot(.90+back,.14,0,-190)],[5.23,{...over(-1,-265),arc:.07}],[5.27,land(-1,-270)],[6.1,land(-1,-360)]],
  leg1:[[0,stance(1)],[.4,foot(.14-back,.14)],[.7,foot(.14-back,.14,15)],[.995,{f:'pelvis',p:[body.offsets.thigh[1].x+.01,body.offsets.thigh[1].y-1.03*fitB.leg,.14],hoof:55,soft:.03}],[1.195,{f:'pelvis',p:[body.offsets.thigh[1].x+.01,body.offsets.thigh[1].y-.95*fitB.leg,.14],hoof:50}],[1.375,{f:'pelvis',p:[.02,-.62,.13],hoof:20,knee:OUT}],[1.505,{...onFace(true,.58,.16,1.505),knee:OUT}],[1.905,{...onFace(true,.96,.16,1.905),knee:OUT}],[2.305,{...onFace(true,1.30,.16,2.305),knee:OUT}],[2.525,{f:'world',p:[.20,1.96,.36],hoof:-60,knee:OUT}],[2.705,{f:'world',p:[.52,2.16,.42],hoof:0,heading:-30}],[2.905,{f:'world',p:[.72,2.04,.30],hoof:30,heading:-60}],
   [3.065,{f:'world',p:[.81,1.70,0],hoof:20,heading:-90}],[3.485,{f:'world',p:[.80,1.58,-.10],hoof:20,heading:-140,knee:SIDE}],[DOWN_FAR,{f:'world',p:[.80,1.36,-.16],hoof:20,heading:-170,knee:SIDE}],
   [4.04,{...onFace(false,.70,-.16,4.105),knee:OUT,lift:.3}],[4.205,{f:'pelvis',p:[-.06,body.offsets.thigh[1].y-.95*fitB.leg,.16],hoof:25,knee:OUT}],[4.375,{f:'pelvis',p:[-.06,body.offsets.thigh[1].y-1.0*fitB.leg,.16],hoof:25,soft:.03,knee:OUT}],[4.625,foot(.90,-.16,0,-180)],[5.27,foot(.90,-.16,0,-270)],[5.52,foot(.90,-.16,0,-300)],[5.8,{...over(1,-355),arc:.07}],[5.84,land(1,-360)],[6.1,land(1,-360)]],
  // The left hand holds from the catch until the left knee is up (a deep body's left hand lets go in the straddle,
  // before its arm runs out: below), then re-grips on the far side's left while the seat is still on the top; the right
  // re-plants turned to the far side in the straddle (a palm turning 140 degrees where it lay touched the top at two
  // points, and held the body alone on them while the left crossed: 37% of its weight of phantom push). The right lets
  // go once the chest is over and plants ahead before the right knee comes up beside it (a deep body's hands hold in
  // front of its chest instead, from each let-go to its far grip: below). Gripping, the elbows bend back and out from
  // the wall (bent down, the forearms lay across its near edge). The arms swing up ahead of the jump, in front of the
  // face, and come down onto the top (reaching straight for it, the forearms went 7 cm into the face).
  'arm-1':[[0,{f:'chest',p:restWrist(-1)}],[.4,{f:'chest',p:[.20,.15,-.30]}],[.7,{f:'chest',p:[.10,-.05,-.32]}],[.86,{f:'chest',p:[.06,.40,-.26],elbow:HANG}],[1.115,{f:'chest',p:[.04,.56,-.22],elbow:HANG}],[1.265,{f:'world',p:[.45,top,-.18],palm:0,elbow:HANG}],[3.485,{f:'world',p:[.46,top,-.18],palm:0,elbow:HANG}],[3.545,{f:'world',p:[.50,top+.06,.04]}],[3.605,{f:'world',p:[farX,top,.20],palm:-180}],[4.175,{f:'world',p:[farX,top,.20],palm:-180,lift:.3}],...SLIDE(1),[4.95,{f:'chest',p:[.18,-.18,-.16]}],[5.27,{f:'chest',p:[.16,-.26,-.20]}],[6.1,{f:'chest',p:restWrist(-1)}]],
  arm1:[[0,{f:'chest',p:restWrist(1)}],[.4,{f:'chest',p:[.20,.15,.30]}],[.7,{f:'chest',p:[.10,-.05,.32]}],[.86,{f:'chest',p:[.06,.40,.26],elbow:HANG}],[1.115,{f:'chest',p:[.04,.56,.22],elbow:HANG}],[1.265,{f:'world',p:[.45,top,.18],palm:0,elbow:HANG}],[2.345,{f:'world',p:[.45,top,.18],palm:0,elbow:HANG}],[2.465,{f:'world',p:[.52,top+.06,0]}],[2.585,{f:'world',p:[.54,top,-.10],palm:-40}],[3,{f:'world',p:[.54,top,-.10],palm:-40}],[3.06,{f:'world',p:[.56,top+.06,-.15]}],[3.12,{f:'world',p:[farX,top,-.20],palm:-180}],[3.665,{f:'world',p:[farX,top,-.20],palm:-180}],[4.175,{f:'world',p:[farX,top,-.20],palm:-180,lift:.3}],...SLIDE(-1),[4.95,{f:'chest',p:[.18,-.18,.16]}],[5.27,{f:'chest',p:[.16,-.26,.20]}],[6.1,{f:'chest',p:restWrist(1)}]],
 };
 // Under the lean (leanFrom to leanTo) the pelvis-carried leg keys are turned back by it: the legs keep the tuck the
 // horse's keys give them, and the hooves leave the floor when they did. That takes in the hang's first key too
 // (1.375 s), which rode the lean from the catch on e909dcf4: its target moves 25 cm on the pig foreman and 32 on the
 // director. So are those under the far lean, by a share of it that falls linearly from the let-go to the drop (the
 // trunk's pitch eases off on a curve, so the two part by up to 5 degrees between the keys).
 if(lean>0)for(const id of ['leg-1','leg1'])for(const [t,k] of LIMB[id])if(k.f==='pelvis'&&t>leanFrom&&t<=leanTo)k.p=V(...k.p).applyQuaternion(bodyQ(-lean*DEG,0)).toArray();
 if(lean>0)for(const id of ['leg-1','leg1'])for(const [t,k] of LIMB[id])if(k.f==='pelvis'&&t>=farLeanFrom&&t<farLeanOff){const share=t<=farLeanTo?1:(farLeanOff-t)/(farLeanOff-farLeanTo);k.p=V(...k.p).applyQuaternion(bodyQ(-FAR_LEAN*lean*share*DEG,0)).toArray();}
 // A deep body's legs hanging down the far face as it leaves the top (their keys at 3.685 s, below the top's level)
 // rise as far as each leg needs to reach its key at .97 of its length (thigh and shin) from the keyed trunk's hip
 // there (trunkAt with no band, fit or balance), as the gripping keys rise for the arms; a key further out than the leg
 // could reach at any height is left where it is. They rode the search's height over the top before (between the trunk
 // keys either side: the pig foreman's 7.7 cm up, the director's 0.8), which left the foreman's at 104.1 and 104.2% of
 // its legs from that hip (116.9 and 117.1 as authored), and its left leg locked straight going down the far side (from
 // 3.645 s, the climb test's knee 10.2 m/s at 3.632; 13.8 at 3.618 as authored): on f293da69 the band's drop hid the
 // lock, but with the far hang holding the body there the gate's required force read 7.6 times its weight for 3 ms at
 // 3.633 (11.9 at 3.617 as authored, the knee point 14.4 m/s). Risen to 1.478 and 1.479 m, 4.2 and 4.3 cm above that
 // ride, the foreman's leg locks later and slower (the knee 7.1 m/s at 3.644; 3.8 times its weight at 3.646, where it
 // read 2.6, and 3.7 since its left hand lets go early, below) and its required force passes, its peak then the left
 // elbow's whip (3.9 at 3.523, where it read 3.1; the lock's since that let-go, 3.7 at 3.646, below); its readings over
 // the gate's limits and its hand check as they were (42; 43 since that let-go, 49 since its hands hold in front of its
 // chest and 22 since its trunk keeps its left hand on the top as its right knee comes up, KNEE_MID, above; 6.5 mm). As
 // played the keys still lie past the leg's reach (105.3 and 105.9% of it, against 112.4 and 113.3 on ba891c83): the
 // clearance fit pushes the trunk 11.9 cm further out than keyed and, with the band (which lowers it 6.6 cm there), 4.0
 // cm higher, and both legs hang straight down the far face as before (their knees bent under 5 degrees from 3.660 and
 // 3.647 s to 4.150 and 4.112; from 3.641 and 3.609 on ba891c83). The director's lie at 90.2 and 90.3% and stay as
 // authored, 7.5 mm below the ride: its left arm no longer goes into its left thigh as its left leg comes over (2.9 cm,
 // the forearm 2.4, at 3.543 s with the ride; under 1 cm now), at the cost of a little more required force there (2.10
 // times its weight at 3.589 s against 1.75, the largest rise, from 3.571 to 3.616 s) and a dip of its hips to 27.0
 // m/s^2 down at 3.790 s (21.3 there with the ride, its least then 27.0 at 3.747). Risen by the far hang's own rise on
 // top of the ride instead (the foreman's 7.6 cm, the director's 6.6), the foreman passed the same way, but the
 // director's left arm went 6.3 cm into its left thigh.
 if(deep){const tr=trunkAt(DOWN_FAR,null);
  for(const [id,s] of [['leg-1',-1],['leg1',1]]){const k=LIMB[id].find(([t])=>t===DOWN_FAR)?.[1];if(!k||k.f!=='world')continue;
   const hip=tr.hips.clone().add(body.offsets.thigh[s].clone().applyQuaternion(tr.hipsQ)),r=.97*(body.L[s].thigh+body.L[s].shin),h=Math.hypot(k.p[0]-hip.x,k.p[2]-hip.z);
   if(h<r)k.p=[k.p[0],Math.max(k.p[1],hip.y-Math.sqrt(r*r-h*h)),k.p[2]];}}
 // A deep body's free hands, from letting go of a grip until they take the far one, hold in front of its chest and go
 // round its belly. Seated over the top a pig's arms reach no grip there. Its right shoulder rides 45.7 to 57.4 cm
 // above the grips' height on the pig director (46.2 to 57.1 on the foreman, from 2.585 to 3.0 s), more than the arm's
 // 50.5 cm until 2.910 s (2.885 on the foreman), so that no point of the top lies within its reach, and the right
 // hand's re-plant, 4 cm in from the top's far edge and 10 cm along it from the wall's middle, lay 103.9 to 121.8% of
 // the arm (shoulder to wrist) from it (103.0 to 125.2; the horse's arm reaches it at 91.7 to 99.7%): the arm hung
 // straight, the hand 8.7 and 10.3 cm off the wall at 2.585 s, the upper arm 5.4 cm into the foreman's lower trunk at
 // 2.596 by the rig's capsules (3.1 on the director) and the director's forearm 2.9 cm into its right thigh at 2.995.
 // As they bring the left knee up behind, the left shoulder hangs out past the near face (22.3 cm on the director at
 // 3.27 s, 25.1 on the foreman at 3.34), and the left grip, 18 cm along the edge, lay past the arm's whole length from
 // 2.92 s to its old let-go (3.485; from 3.065 on the foreman): the arm went straight, the hand was dragged off its
 // grip, and as it let go its elbow whipped (16.9 and 15.0 m/s at 3.516 and 3.522 s; the director's required force 6.5
 // times its weight for 1 ms at 3.517). Held in to the body instead, toward each crossing's waypoint (the left at .6 of
 // the arm on 8da9a826, the right at .45 in this fix's first round), the hands lay inside the clothes (the ray from the
 // chest point to the palm leaving the shirt and trousers that much beyond it, read every 2 ms: the director's left
 // from 3.161 to 3.581 s, up to 20.3 cm at 3.543 as it passed through the left waypoint, 6 cm above the top and in its
 // belly; the foreman's left 7.7 at 2.983, the right hands 18.5 and 11.9 at 3.015 and 3.023), where the rig's capsules,
 // one .14 m trunk for every body, saw them clear. So each hand holds 30 degrees to its own side of straight ahead at
 // the chest's height, MARGIN out from the torso there (its farthest point within 10 degrees of that line, or 20 where
 // 10 hold fewer than two, every 50 ms over the hold: the climb's own surface probe, the points riding the hips or the
 // spine, carried by the keyed trunk), and the waypoints go. Each move from a grip to the hold, or from the hold to the
 // far grip, arcs out by as much as its chord's middle lies within CLEAR of the torso, along the line from the chest's
 // origin through that middle, but never down: a chord between two points outside a round belly cuts into it (up to
 // 14.2 cm without the arcs, by the chest ray: the first crossing of the clothes from the chest point toward the palm,
 // round 2's measure), and arced down near the top the left hand went 2.0 and 3.6 cm into the wall. Every chord's
 // middle lies below the chest, so each arc is pushed level, out to the side and back, 10.9 to 17.4 cm: each arc's size
 // is how far that middle falls short of CLEAR out from the torso, and it pushes level, not out along that line, so
 // CLEAR is not a clearance reached. Through each hold the elbow bends out to its side and a little up (ELBOW, in the
 // chest frame): bent the arm's own way, back, down and out, the elbows lay against the bellies' sides as the hands
 // held, the forearms up to 3.1 cm into the clothes (the foreman's left, into its shirt) and the sleeves up to 10.5
 // (the director's right, into its waistcoat), by the winding number and the depth to the nearest triangle (below),
 // every 10 ms. Bent straight out, the foreman's forearms stayed 1.1 and 1.2 cm in; bent further up, the director's
 // left sleeve went 2.8 to 3.3 cm in; holds wider than 30 degrees (35 or 40) put the foreman's right hand 1.5 to 2.3 cm
 // into its clothes. The left hand lets go at LET_GO and reaches its hold over LEFT_HOLD, holding it to LEFT_END; the
 // right lets go as before (2.345 s), reaches its hold over RIGHT_HOLD and holds it to RIGHT_END; then each goes
 // straight on to its far grip (3.605 and 3.12 s). LET_GO is fix 13's (the foreman's seat touches the top at one point
 // until 2.900 s and spreads from 2.905: let go at 2.875 s the palm left by 2.895 and the gate read 154.6 N·m there);
 // over LEFT_HOLD the palm now peels off the top, within the rig's centimetre of it until 2.965 s on the foreman and
 // 2.980 on the director, the director's up to 4.6 mm into it (2.945 s). A hand whose hold finds no torso point keeps
 // the keys it had before this rule, without arcs (the left would let go at 3.485 s again, its arm out of reach, as
 // before fix 13); it never happens for the pigs. The rest are the gate's and the probes' picks. Reaching the hold in
 // 120 ms, the director's left palm moved at 8.7 m/s (2.940 s); in 200 ms the foreman, its seat alone as the hand
 // lifted clear, read 41.5 N·m at 2.965 s (104% of the rig's limit); in 300 it read 29.1 N·m at the most there (2.968
 // s, 73% of the limit, between the 5 ms samples), and nothing since KNEE_MID (above), as on 8da9a826. Held to 3.45
 // (with the hold reached in 120 ms and arcs that could point down), the foreman's left palm crossed at 8.4 m/s (3.514
 // s); to 3.40, the director's left forearm went 2.1 cm into its left thigh by the rig's capsules (3.556). With CLEAR
 // at 5 or 6 cm the right hands dipped up to 1.1 and 0.7 cm into the trousers on their way to the hold, from 2.46 s
 // (0.3 at 7, none at 9; by the triangle depth every 2 ms, with the held elbows: review round 5's
 // righthand-c5679-2ms.txt). At 9 the hands come out of the clothes about 10 ms sooner at some grips, and the foreman's
 // left is out of its clothes for about 30 ms between its hold and its far grip (4 at 7) and rises only 0.9 cm into its
 // shirt as it leaves its hold (1.4 at 7): better on every clothes figure here, by 0.5 cm and tens of milliseconds at
 // most; but the fastest palm moves at 7.14 m/s (7.07 at 7), and gated, 9 reads over the limits at the same instants as
 // 7, the foreman's seat at 29.8 N·m (29.1 at 7) and its worst wrench 201 N (200): about even, so 7 stays. Not kept:
 // the holds pushed out from the old ones, or put on the belly's nearest point to the waypoint, lay in the thighs as
 // the knees came up (up to 7.7 and 12.0 cm by the rig's capsules); waypoints right above the far grips sent the hands
 // through the belly (up to 17.9 cm by the chest ray) and the thighs, at up to 12.8 m/s. As played, by the winding
 // number against the shirt and the trousers and the depth to the nearest triangle (every 2 ms), no vertex of a held
 // hand or forearm goes over 0.3 cm into the clothes (two of the foreman's left elbow and two of its wrist through its
 // left hold; the climb test checks the hands and forearms, 1 cm at most), and none of the director's; the director's
 // right sleeve lies 5.0 cm into its waistcoat by the elbow through its hold, a seam where the arm rests on the belly,
 // and stays in its clothes from its let-go to its far grip; its left stays in until 3.17 s, where 8da9a826 had it out
 // from 2.98 to 3.34 s (12.2 cm at 2.98), and lies 1.1 to 1.2 cm in from 3.20 to 3.31 s. On 8da9a826 the hands and
 // forearms lay in from each let-go to its far grip, up to 21.6 cm. Near the grips the hands still sit inside the
 // clothes for 0.09 to 0.15 s after each let-go and before each far grip (the foreman's left from its hold to its far
 // grip but for about 4 ms at 3.50 s) and the forearms for up to 0.27 s (the foreman's left from 3.17 s to its far
 // grip, 0.3 cm through its hold), up to 18.0 cm in (every 10 ms): the grips lie under the belly and the seat, which
 // rest on the top. The pigs' right arms keep 8.0 and 10.4 cm clear of the trunk from 2.4 to 3.0 s by the rig's
 // one-size capsules, and by the shirt itself the elbow joints keep out of it through the holds (read at 2.75 to 2.85
 // and 3.25 to 3.35 s, every 50 ms: the foreman's 1.6 cm or more from it, where its right came within 0.3 cm before the
 // held elbow); no arm capsule goes over 0.5 cm into another from 2.3 to 3.7 s, and the elbows, wrists and palms move
 // at 7.1 m/s at the most there (the foreman's left palm at 3.510 s, every 2 ms; its left elbow 6.3 at 3.524 as the
 // held elbow swings back, 4.5 on 8da9a826). The gate (8da9a826 -> this): the director's required force 3.6 -> 3.3
 // times its weight (3.037 s) and its capsule pairs over 1 cm 8 -> 3 (the three left as before: its left hand and
 // forearm by its head at 1.167 and 1.337 s, its hooves at 5.185); the foreman's capsule rule passes (pairs over 2 cm 3
 // -> 0). The director reads 34 readings over the limits as before; the foreman 43 -> 49 with this rule alone, the six
 // more where its boots alone held it as its right knee came up (2.36 to 2.50 s: 21 -> 27), and 22 since KNEE_MID
 // (above) keeps its left hand on the top there; none over the top from 2.55 to 3.68 s on either pig. The foreman's
 // left hand goes through the wall on its way to the far grip: held out over the near side (its chest faces back that
 // way), it crosses low, and its mesh enters the near face at 3.530 s and passes through the top to the grip (7.7 cm
 // deep at 3.560); on 8da9a826 it came down onto the grip from above, through the waypoint (5.1 cm at the grip, 3.590;
 // at the far grips the pigs' hands sit 1.6 to 5.7 cm into the wall's box otherwise, before and after). Arced straight
 // up instead, it cleared the near face, but the other hands rose into their bellies (up to 16.0 cm by the chest ray);
 // a waypoint over the near edge stalled both hands short of it; the keyed trunk plans that hand 10 cm higher than it
 // plays, so a lift planned from it does not fire.
 if(deep){const LET_GO=2.895,LEFT_END=3.42,RIGHT_HOLD=.35,RIGHT_END=2.90,MARGIN=.03,CLEAR=.07,LEFT_HOLD=.3,ELBOW=[0,.25,1],
   torso=t=>{const tr=trunkAt(t,null),inv=tr.chestQ.clone().invert();return [...deepPts.spine,...deepPts.hips.map(q=>q.clone().applyQuaternion(tr.hipsQ).add(tr.hips).sub(tr.chest).applyQuaternion(inv))];},
   radius=(pts,d)=>{for(const cone of [10,20]){let r=0,n=0;const c=Math.cos(cone*DEG);for(const q of pts){const l=q.length();if(l>1e-6&&q.dot(d)/l>=c){n++;r=Math.max(r,l);}}if(n>=2)return r;}return null;},
   hold=(s,w0,w1)=>{const d=V(1,0,s*Math.tan(30*DEG)).normalize();let r=null;for(let t=w0;t<=w1+1e-9;t+=.05){const q=radius(torso(t),d);if(q!==null)r=Math.max(r??0,q);}
    return r===null?null:d.multiplyScalar(r+MARGIN).toArray();};
  const held=new Set();
  {const A=LIMB['arm-1'],i=A.findIndex(([t])=>t===3.485);if(i>=0&&A[i+1]?.[0]===3.545){const p=hold(-1,LET_GO+LEFT_HOLD,LEFT_END);
   if(p){A.splice(i,2,[LET_GO,{...A[i][1]}],[LET_GO+LEFT_HOLD,{f:'chest',p,elbow:ELBOW}],[LEFT_END,{f:'chest',p:[...p],elbow:ELBOW}]);held.add('arm-1');}}}
  {const R=LIMB.arm1,j=R.findIndex(([t])=>t===2.345),k=R.findIndex(([t])=>t===3.06);if(j>=0&&k>j){const p=hold(1,2.345+RIGHT_HOLD,RIGHT_END);
   if(p){R.splice(j+1,k-j,[2.345+RIGHT_HOLD,{f:'chest',p,elbow:ELBOW}],[RIGHT_END,{f:'chest',p:[...p],elbow:ELBOW}]);held.add('arm1');}}}
  for(const [arm,t0,t1] of [['arm1',2.345,3.12],['arm-1',LET_GO,3.605]]){if(!held.has(arm))continue;const A=LIMB[arm];
   for(let i=0;i+1<A.length;i++){const [ta,ka]=A[i],[tb,kb]=A[i+1];if(ta<t0||tb>t1||ka.f==='chest'&&kb.f==='chest'&&ka.p.every((x,j)=>x===kb.p[j]))continue;
    const tm=(ta+tb)/2,tr=trunkAt(tm,null),inv=tr.chestQ.clone().invert(),at=k=>k.f==='chest'?V(...k.p):V(...k.p).sub(tr.chest).applyQuaternion(inv),
     m=at(ka).add(at(kb)).multiplyScalar(.5),r=radius(torso(tm),m.clone().normalize());
    if(r===null)continue;const c=m.length()-r;if(c>=CLEAR)continue;const w=m.normalize().applyQuaternion(tr.chestQ);if(w.y<0)w.set(w.x,0,w.z).normalize();
    A[i+1]=[tb,{...kb,arc:CLEAR-c,arcTo:w.toArray()}];}}}
 const spec=t=>{const tr=trunkAt(t),limbs={};for(const id of Object.keys(LIMB))limbs[id]=keyedLimb(LIMB[id],t,tr);return posedFrom(tr,limbs,{poles:steady?id=>steady(id,t):null,offsets:fit?.limb?id=>fit.limb(id,t):null,snaps:fit?.plant?id=>fit.plant(id,t):null,turns:turnRef?b=>turnRef(b,t):null});};
 // Fit this character's surface: trunk, head and tail out of the floor and the wall. The face is the way out until the
 // chest is nearly over (2.265): a hanging front (the sheep's waistcoat hem) meets the top edge before the chest does.
 // The head's turn is held through the jump (launch to catch) here too, as the fit after the balance holds it through
 // every flight, but for the catch's own turn, softened over three of the fit's samples, reaching back into the jump's
 // end (on the pig director 5.0 degrees at its last sample here, 1.26 s, and 5.2 in the played flight's last 15 ms,
 // where the rig already reads its hands on the top). The balance plans the flight's turn with the head as this fit
 // leaves it, and the pig foreman's head, easing out of a 15 degree tilt from 1.04 s in the air here and held by the
 // fit after the balance, left the turn answering a tilt no longer there (up to 65 N·m of airborne phantom torque from
 // 1.03 to 1.18 s). So it is held through the drop too (from the let-go to the palms on the far face, ONFACE): on
 // d54c607d the bull's head, as the balance planned the drop's turn, eased into a stretch that clears the wall from
 // 4.23 s (turned 6.0 degrees at 4.30, 12 at 4.38), where the fit after the balance turned it before the let-go (11.9
 // degrees at 4.20) and held it through the flight: the turn answered a head turning that the played body never made,
 // 10 to 20 N·m of airborne phantom torque from 4.228 to 4.280 s (the bull's drop 42 readings over the limit, 10 held;
 // the other ten climbs' readings as they were). The window is the keys', not the flight's: it holds the balance's
 // drop flight inside it (from 4.245 to 4.325 s on the nine climbs but the pigs', theirs from 4.240 to 4.325 or
 // 4.330) only while the let-go and the palms' face key bracket it.
 fit=createClearanceFit(D);const jump=[TRUNK.find(k=>k.launch).t,TRUNK.find(k=>k.catch).t],drop=[TRUNK.find(k=>k.still).t,ONFACE];
 fit.solve({body,probe,tails,obstacles:edgeBoxes(WALL.edge,WALL.half,[[0,WALL.top]]),poseAt:t=>body.pose(spec(t),'fit'),air:t=>t>jump[0]&&t<jump[1]||t>drop[0]&&t<drop[1],stage:t=>t<2.265?'near':t<3.685?'over':'far'});
 steady=steadyPoles(D,t=>limbSample(body,spec(t)));
 // The limbs are fitted with their steady bend directions, which are then found again for the moved targets.
 // How planted each limb's end is (a palm on a surface, a hoof set on the floor or a face), for the limb fit.
 const planted=(id,t)=>{const l=keyedLimb(LIMB[id],t,trunkAt(t));if(id.startsWith('arm'))return l.palm===undefined&&l.face?[l.faceW,l.face]:[l.palm!==undefined?l.palmW:0,[0,1,0]];
  const [na,nb,u]=l.plant;return [l.plantW||0,na&&nb?na.map((v,j)=>v+(nb[j]-v)*u):na||nb];};
 fit.solveLimbs({planted});steady=steadyPoles(D,t=>limbSample(body,spec(t)));fit.solvePlants({planted});
 // Twice: the first pass unwraps the palms' yaw blends, the second finds the hands' ways round for those continuous
 // targets (found for the wrapped ones, they named the wrong way where a blend passed 180 degrees: a 47 m/s snap).
 const turnsAt=t=>{body.pose(spec(t),'turns');return body.turns.slice();},turns=()=>{turnRef=null;turnRef=steadyTurns(D,turnsAt);turnRef=steadyTurns(D,turnsAt);};turns();
 // Over the top a body deeper in front rests on it (see the keys): one smooth vertical move holds its torso's lowest
 // point over the top between TOUCH and REACH above it (the contacts' reach is a centimetre) and never in it, measured
 // on the final limbs every 5 ms. Between the keys the hips' path lifted a pig's seat off the top, and the balance,
 // finding nothing holding it, planned a third of a second of flight through the straddle and swung the hips 40 cm.
 // Past the band the move runs on free until the body hangs on the far face (LOWERED, the lowering's key), easing off
 // as smoothly as it holds: let go in 80 ms at the band's end, the pig foreman, held 13 cm down onto the top's edge as
 // it slid off it, rose 12 cm, lifted its hands off the top and fell at 6 g (724% of its weight).
 // The torso is the skin the trunk carries: a point a thigh carries LEG (30%) or more of moves with the leg. Counted by
 // its heaviest bone alone, the trouser fold a bent leg drags under the hip (the hips 60%, the left thigh 40%) carried
 // the pig foreman through its left knee up behind and left leg over, up to 4.6 cm below the torso's own lowest point
 // (at 3.39 s, its points at rest riding the hips or spine); as the leg swung over, the fold slid off the top's near
 // edge (3.40 s) and the band dropped the body 8.3 cm in 15 ms, which the balance smoothed by pulling the body down at
 // 5.2 g with only the fold on the top (3046 N of phantom force at 3.375 s). Left out, the torso rests on its seat.
 const TOP_BAND=[2.55,3.66],LOWERED=4.105,LEG=.3;
 if(deep){const TOUCH=.006,REACH=.009,[a,b]=TOP_BAND,all=createSurfaceProbe(worker,{stride:1,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),want=[],lo=[],hi=[],ts=[],inTop=(x,z)=>x>WALL.edge-WALL.half&&x<WALL.edge+WALL.half&&Math.abs(z)<.5;
  let thigh=null;const thighOf=()=>{thigh=new Float32Array(all.count);for(let i=0;i<all.count;i++){const mesh=worker.parts.find(p=>p.name===all.names[all.part[i]]),g=mesh.geometry,v=all.vertex[i],bones=mesh.skeleton.bones;
   for(let j=0;j<4;j++)if(/^thigh/.test(bones[g.attributes.skinIndex.getComponent(v,j)].name))thigh[i]+=g.attributes.skinWeight.getComponent(v,j);}};
  for(let t=a;t<=LOWERED+1e-9;t+=.005){body.pose(spec(t),'top');all.update();if(!thigh)thighOf();let low=Infinity;
   for(let i=0;i<all.count;i++){if(/hoof|boot|foot|toe|hand/i.test(all.names[all.part[i]]))continue;const bone=all.boneNames[all.bone[i]];if(bone!=='hips'&&bone!=='spine'&&bone!=='head'||thigh[i]>=LEG)continue;if(inTop(all.x[i],all.z[i]))low=Math.min(low,all.y[i]-WALL.top);}
   ts.push(t);if(low===Infinity||t>b){want.push(0);lo.push(-1);hi.push(1);}else{want.push(TOUCH-low);lo.push(-low);hi.push(REACH-low);}}
  const P=boxedPath(want,want.map(()=>1),2e7,want.map((_,i)=>({at:i,c:[1],lo:lo[i],hi:hi[i]})));
  const tr=track(ts.map((t,i)=>[t,0,P.c[i]*smooth(Math.min(t-a,LOWERED-t)/.08),0]),{},{limit:false});onTop=t=>t>a&&t<LOWERED?V(...tr(t)):V();
  steady=steadyPoles(D,t=>limbSample(body,spec(t)));turns();}
 // Balance: the centre of mass planned against what holds the body at each moment, the hips moved to follow it. It
 // runs on the hands' final turns (a palm's angle decides when it first touches), which are then found again. Resting
 // on the top, the plan keeps the authored path (hold): its own hips' move lifted the seat off it. That hold is a seat
 // ('seat'), which pushes and never pulls (traversal-balance.js, planCentre).
 // the tails as played (the fit's bend, the base squashed onto the floor), for the balance's contacts too
 const playTail=t=>{const [a,b]=fit.tail(t);tails.set(a*DEG,b*DEG);tails.squash(body.root);};
 // The push's ceiling: how far up off its authored path the balance may move the trunk at t before a hoof leaving the
 // floor on its soft key rises more than EPS off its mark (bisection on the leg's own key; never below the authored
 // path, where the authored hoof leaves at its own time; null where no hoof is leaving). The hooves' release rides the
 // hips the plan moves, so a plan that raised them took the hooves off early: each round's take-off came about 10 ms
 // earlier (the horse's last foot sample 0.870 s authored, 0.860 in the schedule held from the second round, the hooves
 // within the rig's centimetre of the floor only until 0.848 and 0.854 as played), and the plan pushed on with nothing
 // under it (the horse's climb read up to 520 N·m of airborne phantom torque there, at 0.855 s). Held under the
 // release, the take-off keeps its authored time on every round, and the plan finds its speed by crouching and pushing
 // within the floor's 3 body weights. On these climbs the plan meets the ceiling only at its floor, over the last one
 // to three foot samples, where the authored hoof is already EPS up: it lies on its authored path at the last foot
 // sample and up to 1.7 mm under it before, and it stays at least 4.99 mm under the bisection's own heights above the
 // authored path (each plan's least gap 4.99 to 13.98 mm, the pigs' the least; every plan's ceiling rows logged, both
 // rounds, the eleven climbs). So the floor holds the take-off, and the bisection finds where it starts; that the
 // heights are found as a move of the trunk, while the balance bounds its centre of mass (a different move while the
 // legs stand), does not reach the plan. As the hooves leave (0.865 to 0.873 s) the horse's played ones are within
 // 0.5 mm of the authored ones.
 // On e909dcf4, without the floor (EPS at 5 mm), the take-off drifted later between the rounds on seven climbs (the
 // pig foreman's 0.855 -> 0.870 s), the horse's centre of mass lay 28 mm under its authored path at its last foot
 // sample and met the catch 7.3 cm under it, the pigs' walk up the face read 240 and 108 readings against 52 and 0, and
 // the eleven climbs 2253 against 1878; but seven climbs read their worst lower without it (the horse's 299% against
 // 2198%, at the take-off), the floor's cost.
 const EPS=.005,pushCeiling=t=>{let best=null;for(const id of ['leg-1','leg1']){const keys=LIMB[id];let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;
   const a=keys[i][1],b=keys[Math.min(keys.length-1,i+1)][1];if(!(b.soft&&a.f==='world'&&a.plant===true)||t<=keys[i][0]||t>=keys[i+1][0])continue;
   const base=trunkAt(t,null),up=d=>{const tr={...base,hips:base.hips.clone().add(V(0,d,0)),chest:base.chest.clone().add(V(0,d,0))};return keyedLimb(keys,t,tr).p[1]-a.p[1];};
   let lo=-.3,hi=.3;if(up(lo)>EPS)continue;if(up(hi)<=EPS)continue;for(let k=0;k<30;k++){const m=(lo+hi)/2;if(up(m)>EPS)hi=m;else lo=m;}best=best===null?lo:Math.min(best,lo);}return best===null?null:Math.max(0,best);};
 const bal=balanceTraversal({duration:D,probe:contactProbe(worker,tails),obstacles:edgeBoxes(WALL.edge,WALL.half,[[0,WALL.top]]),pose:t=>{const P=body.pose(spec(t),'balance');playTail(t);return P;},com:P=>body.com(P),setMove:m=>{balance=m;},base:t=>fit.trunk(t).add(onTop?onTop(t):V()).toArray(),
  hold:deep?t=>t>=TOP_BAND[0]&&t<=TOP_BAND[1]&&'seat':null,ceiling:pushCeiling,fine:true});
 // The head and tail are fitted again to the balanced motion, the head held through the flights but for the catch's
 // ease (traversal-fit.js, fit.solveHead and fit.solveTail), and the report taken on it. The balance's turn does not
 // see this head (traversal-balance.js, fine): the horse's take-off reads 11.8 N·m of airborne phantom torque at 0.871
 // s.
 balance=bal;fit.solveHead({air:t=>bal.samples[Math.round(t/(bal.times[1]-bal.times[0]))]?.kind==='air'});fit.solveTail();turns();
 const KEYS=TRUNK.map(k=>({t:k.t,label:k.label}));let state=null;
 const api={duration:D,keys:KEYS,body,probe,obstacle:WALL,fit:fit.report,clearance:fit,balance:bal,phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();playTail(time);
   state={time,phase:api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){tails.restore();body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
