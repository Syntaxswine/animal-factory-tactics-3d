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
 // below plant them on the top, by time). The torso is its points at rest riding the hips or spine; the height for a
 // lean is exact (a move up or down shifts every point alike).
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
 // weights there. Rising, the hooves end that whip (4.1 and 5.3 m/s now, that test's measure), though the foreman's
 // right arm then goes 5.4 cm into its trunk as its knee comes up (1.6 cm without the rise). With the far grips the
 // search sets the foreman's left leg over 8.7 cm above the horse's (0.8 on 4e9853f6), and its left leg, going down the
 // far side to its 3.685 s key, locked straight out of reach (the rig's knee point 14.3 m/s at 3.617 s, the test's
 // measure 13.6; 13.7 body weights). So the legs' keys at 3.685 s ride the search's height too (deepDy): the lock came
 // back near what it was on 4e9853f6 (the rig's knee point 10.4 m/s at 3.631 s on d1118c40, 10.9 then; 9.3 once the
 // band rested the torso, 10.5 since the far hang below took away the band's drop that hid it), at the cost of one
 // reading and the foreman's hand check in that test (7.7 mm from the wall against 3.6 without it, on d1118c40; 6.5
 // now, 7.2 on f293da69). Riding every leg key below the top over it instead cost the right knee up 9 readings (its
 // foot's 2.525 s key raised 17 cm), turned the airborne body at the band's jump harder (870 N·m at 3.405 s against 273
 // on d1118c40; the band no longer jumps there) and put the director's required force over the limit (5.1 body weights
 // against 4.9 on d1118c40; 4.8 on f293da69, and 6.5 since the far hang below, at its old left elbow whip).
 const deepDy={},deep=back>.05,farX=.54+(deep?.025:0),slideDZ=deep?.10:0;
 if(deep){probe.update();const h0=body.at0('hips'),s0=body.at0('spine'),hipsPts=[],spinePts=[];
  for(let i=0;i<probe.count;i++){const b=probe.boneNames[probe.bone[i]],q=V(probe.x[i],probe.y[i],probe.z[i]);if(b==='hips')hipsPts.push(q.sub(h0));else if(b==='spine')spinePts.push(q.sub(s0));}
  const MARKS={1:[[1.265,2.345,[.45,top,.18]],[2.585,3.0,[.54,top,-.10]],[3.12,4.175,[farX,top,-.20]]],'-1':[[1.265,3.485,[.45,top,-.18]],[3.605,4.175,[farX,top,.20]]]};
  const reach=.97*(body.L[1].upper+body.L[1].fore),REST=[.006,.009],inTop=q=>q.x>WALL.edge-WALL.half&&q.x<WALL.edge+WALL.half&&Math.abs(q.z)<.5;
  for(const k of keys){if(k.t<2.265||k.t>=3.685)continue;const resting=k.t>2.5;let best=null;
   for(let dp=-30;dp<=30;dp+=2){const hipsQ=yawQ(k.heading||0).multiply(bodyQ(((k.pitch||0)+dp)*DEG,(k.roll||0)*DEG)),chestQ=hipsQ.clone().multiply(relQ(k.flex||0,k.side||0,k.twist||0)),H=V(...k.hips),C=H.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ));
    let low=Infinity;for(const q of hipsPts){const w=q.clone().applyQuaternion(hipsQ).add(H);if(inTop(w))low=Math.min(low,w.y-WALL.top);}for(const q of spinePts){const w=q.clone().applyQuaternion(chestQ).add(C);if(inTop(w))low=Math.min(low,w.y-WALL.top);}
    if(low===Infinity)continue;const dy=resting?(REST[0]+REST[1])/2-low:Math.max(0,REST[0]-low);
    let over=0;for(const s of ['1','-1']){const m=MARKS[s].find(([a,b])=>k.t>=a&&k.t<=b);if(!m)continue;const sh=C.clone().add(V(0,dy,0)).add(body.offsets.shoulder[+s].clone().applyQuaternion(chestQ));over=Math.max(over,sh.distanceTo(V(...m[2]))-reach);}
    const cost=Math.abs(dp)/10+Math.abs(dy)/.05+30*Math.max(0,over);if(!best||cost<best.cost)best={cost,dp,dy};}
   if(best){k.pitch=(k.pitch||0)+best.dp;k.hips=[k.hips[0],k.hips[1]+best.dy,k.hips[2]];rise[k.t]=(rise[k.t]||0)+best.dy;deepDy[k.t]=best.dy;}}
  // On the far face a deep body's keys left its trunk in the wall, and the clearance fit pushed it out after them (the
  // pigs' 14 to 17 cm from 4.10 to 4.22 s on f293da69), past where the grip rise above set the keys: from about 4.0 s
  // their arms fell short of the far grips (6.3 to 7.9 cm past .97 of the arm on the pig foreman from 4.18 to 4.22 s,
  // 4.8 to 5.8 on the director, its most 7.5 at 4.095; the horse's 2.0 at the most), their palms came off the top onto
  // the face before they let go, and the balance found the foreman in flight inside its authored grip (4.045 to 4.140
  // s). So each far key is pushed out until the torso (its points at rest riding the hips or spine, as the search above
  // reads them) clears the far face by FAR_CLEAR below the top (the foreman's hanging keys 14.8 and 14.6 cm, the
  // director's 14.5 and 14.1; the drop's and the absorb's nothing; 6 mm lies inside the rig's centimetre, so the rig
  // still reads the director's shirt on the face from 4.150 to 4.220 s), and each hanging key (farLean) is raised
  // until both arms reach the far grips at .97 of the arm (the foreman's 7.6 and 7.2 cm, the director's 6.6 and 6.2):
  // the fit's push from 4.10 s is 3.7 cm at the most (the foreman's; 14.0 cm out and 3.4 up at 3.90), and the arms come
  // within 1 cm of the grips' reach from 4.165 s (the director's from 4.140), 3.5 cm past it at the most (the
  // foreman's, at 4.075 and 4.080). The let-go keeps its time, so its drop falls from the raised hang (the drop's arc
  // from the still key), and the hands' release and slide keys keep theirs with it. Let go earlier by the longer fall
  // instead, so that the drop touched down where and when it did, the falling body stretched the still-holding arms and
  // the palms snapped onto the far face (the foreman 10160% of the limit at 4.265 s); with the hands' keys moved with
  // the let-go, it snapped in the let-go (5398% at 4.125; both on d54c607d's code with the far hang, var-fh2 and
  // var-fh3). The pigs now touch down 25 and 30 ms later (the left boot at 4.555 and 4.545 s; the absorb's need the
  // same, about 2.2 kN), their hips coming 5.1 and 4.2 cm back toward the wall through the drop (3.6 and 3.3 before;
  // the foreman's let-go key lies 3.5 cm further out than its drop key, which nothing pushed); the foreman's head
  // passes within 5.0 mm of the far face as it lets go (4.230 s), the director's 10.4 (16.0 and 12.6 before), and the
  // director's left arm goes 2.9 cm into its left thigh as its left leg comes over (3.543 s, 1.4 before). Over the top
  // the fit now pushes the trunk out less (the foreman's hips 3.7 to 5.4 cm further back from 3.60 to 3.70 s), and the
  // foreman's band (below) no longer drops it as its left leg locks straight going down the far side (3.633 s): that
  // old lock, which the fall hid on f293da69, now asks 7.6 times its weight for 3 ms on the rig's 1 ms grid (its 5-ms
  // samples 3.9), over the rig's 5; the director's old left elbow whip as its left leg comes over now asks 6.5 for 1 ms
  // (3.517 s; 4.8 before).
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
 const DOWN_FAR=3.685; // the legs' keys hanging down the far face as the body leaves the top (deepDy rides them)
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
 // (through the key from 4.210 or 4.215 to 4.295 or 4.300), turns at 3.5 to 5.9 N·m at the most (the test's measure;
 // 20 to 32 through the key), under the rig's 10, and the nine climbs but the pigs' read 112 readings over its limits
 // against 188 on d54c607d (156 with the head held alone: the bull 50, then 18, now 8; the donkey 17, now 8; the skunk
 // 16, now 2; the dog 27, now 16; the other five as they were). Arced, the palm's turn onto the face switched its way
 // round 2.5 ms short of done and popped 0.09 degrees (steadyTurns now switches on the sample). A deep body arcs as
 // well now that its palms hold the top until it lets go (its far hang, above). With them off the top before the
 // let-go, arced, the pig foreman read 159 readings (7545% of the limit at its worst) against 88 through the key, the
 // director 67 (6399%) against 57; with the far hang, arced, 42 and 34 against 78 and 53 through the key (their let-go
 // and drop 5 and 4 against 41 and 23, the foreman's worst there 227% of the limit against 10810% at 4.265 s; their
 // worst readings now in the jump's flight, 603 and 455%, as they were there). Of the nine left in the let-go and
 // drop, eight are new: the foreman's five in the air from 4.306 to 4.310 s, up to 227%, in the last 5 ms before its
 // palms reach the far face (where f293da69's read up to 9.9 N·m, under the limit, before its palms reached it at
 // 4.276 s), and the director's three on contact from 4.231 to 4.233 s, up to 111%, as its hands leave the top.
 const FAR=[1,0,0],ONFACE=4.33,ARC=.06,SLIDE=z=>[[ONFACE,{f:'world',p:[.62,1.80,(.22+slideDZ)*z],face:FAR,arc:ARC,arcTo:FAR}],[4.685,{f:'world',p:[.62,1.10,(.26+slideDZ)*z],face:FAR}]];
 const LIMB={
  'leg-1':[[0,stance(-1)],[.4,foot(-.035-back,-.20)],[.7,foot(-.035-back,-.20,15)],[.995,{f:'pelvis',p:[body.offsets.thigh[-1].x-.165,body.offsets.thigh[-1].y-1.03*fitB.leg,-.20],hoof:55,soft:.03}],[1.195,{f:'pelvis',p:[body.offsets.thigh[-1].x-.165,body.offsets.thigh[-1].y-.95*fitB.leg,-.20],hoof:50}],[1.375,{f:'pelvis',p:[.02,-.62,-.13],hoof:20,knee:OUT}],[1.505,{...onFace(true,.46,-.16,1.505),knee:OUT}],[1.905,{...onFace(true,.80,-.16,1.905),knee:OUT}],[2.305,{...onFace(true,1.26,-.16,2.305),knee:OUT}],[2.705,{...onFace(true,1.56,-.16,2.705),knee:OUT}],
   [3.065,{f:'world',p:[.19,1.70,0],hoof:20,heading:-90}],[3.305,{f:'world',p:[.44,2.24,.62],hoof:10,heading:-108}],[3.485,{f:'world',p:[.68,2.12,.66],hoof:40,heading:-140,knee:SIDE}],[DOWN_FAR,{f:'world',p:[.80,1.36,.20],hoof:20,heading:-170,knee:SIDE}],
   [4.04,{...onFace(false,.56,.16,4.105),knee:OUT,lift:.3}],[4.205,{f:'pelvis',p:[-.06,body.offsets.thigh[-1].y-.95*fitB.leg,-.14],hoof:25,knee:OUT}],[4.375,{f:'pelvis',p:[-.06,body.offsets.thigh[-1].y-1.0*fitB.leg,-.14],hoof:25,soft:.03,knee:OUT}],[4.625,foot(.90+back,.14,0,-180)],[4.95,foot(.90+back,.14,0,-190)],[5.23,{...over(-1,-265),arc:.07}],[5.27,land(-1,-270)],[6.1,land(-1,-360)]],
  leg1:[[0,stance(1)],[.4,foot(.14-back,.14)],[.7,foot(.14-back,.14,15)],[.995,{f:'pelvis',p:[body.offsets.thigh[1].x+.01,body.offsets.thigh[1].y-1.03*fitB.leg,.14],hoof:55,soft:.03}],[1.195,{f:'pelvis',p:[body.offsets.thigh[1].x+.01,body.offsets.thigh[1].y-.95*fitB.leg,.14],hoof:50}],[1.375,{f:'pelvis',p:[.02,-.62,.13],hoof:20,knee:OUT}],[1.505,{...onFace(true,.58,.16,1.505),knee:OUT}],[1.905,{...onFace(true,.96,.16,1.905),knee:OUT}],[2.305,{...onFace(true,1.30,.16,2.305),knee:OUT}],[2.525,{f:'world',p:[.20,1.96,.36],hoof:-60,knee:OUT}],[2.705,{f:'world',p:[.52,2.16,.42],hoof:0,heading:-30}],[2.905,{f:'world',p:[.72,2.04,.30],hoof:30,heading:-60}],
   [3.065,{f:'world',p:[.81,1.70,0],hoof:20,heading:-90}],[3.485,{f:'world',p:[.80,1.58,-.10],hoof:20,heading:-140,knee:SIDE}],[DOWN_FAR,{f:'world',p:[.80,1.36,-.16],hoof:20,heading:-170,knee:SIDE}],
   [4.04,{...onFace(false,.70,-.16,4.105),knee:OUT,lift:.3}],[4.205,{f:'pelvis',p:[-.06,body.offsets.thigh[1].y-.95*fitB.leg,.16],hoof:25,knee:OUT}],[4.375,{f:'pelvis',p:[-.06,body.offsets.thigh[1].y-1.0*fitB.leg,.16],hoof:25,soft:.03,knee:OUT}],[4.625,foot(.90,-.16,0,-180)],[5.27,foot(.90,-.16,0,-270)],[5.52,foot(.90,-.16,0,-300)],[5.8,{...over(1,-355),arc:.07}],[5.84,land(1,-360)],[6.1,land(1,-360)]],
  // The left hand holds from the catch until the left knee is up, then re-grips on the far side's left while the seat is
 // still on the top; the right re-plants turned to the far side in the straddle (a palm turning 140 degrees where it lay
 // touched the top at two points, and held the body alone on them while the left crossed: 37% of its weight of phantom
 // push). The right lets go
  // once the chest is over and plants ahead before the right knee comes up beside it. Gripping, the elbows bend back
  // and out from the wall (bent down, the forearms lay across its near edge). The arms swing up ahead of the jump, in
  // front of the face, and come down onto the top (reaching straight for it, the forearms went 7 cm into the face).
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
 // ride the search's height there (deepDy, between the trunk keys either side).
 if(deep){const ks=keys.map(k=>[k.t,deepDy[k.t]||0]),dyAt=t=>{const j=ks.findIndex(([u])=>u>=t);if(j<=0)return j===0?ks[0][1]:0;const [a,da]=ks[j-1],[b,db]=ks[j];return da+(db-da)*(t-a)/(b-a);};
  for(const id of ['leg-1','leg1'])for(const [t,k] of LIMB[id])if(k.f==='world'&&t===DOWN_FAR&&k.p[1]<WALL.top)k.p=[k.p[0],k.p[1]+dyAt(t),k.p[2]];}
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
  hold:deep?t=>t>=TOP_BAND[0]&&t<=TOP_BAND[1]&&'seat':null,ceiling:pushCeiling});
 // The head and tail are fitted again to the balanced motion, the head held through the flights but for the catch's
 // ease (traversal-fit.js, fit.solveHead and fit.solveTail), and the report taken on it.
 balance=bal;fit.solveHead({air:t=>bal.samples[Math.round(t/(bal.times[1]-bal.times[0]))]?.kind==='air'});fit.solveTail();turns();
 const KEYS=TRUNK.map(k=>({t:k.t,label:k.label}));let state=null;
 const api={duration:D,keys:KEYS,body,probe,obstacle:WALL,fit:fit.report,clearance:fit,balance:bal,phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();playTail(time);
   state={time,phase:api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){tails.restore();body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
