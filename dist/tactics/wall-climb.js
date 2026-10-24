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
// it faces the wall (near), feet and all. A key that grips the top (grip) rises until both hands reach it. A foot
// leaving a face keeps its ankle off it, toe up, so a long foot (rabbit, dog, skunk) never swings into the wall. The
// straddle faces along the wall, one leg down each side, so the thighs hang outside the 16 cm top; the left leg
// comes over behind it, knee to the top, so the body turns left to face the wall from the far side.
const TRUNK=[
 {t:0,label:'Ready',hips:[0,.80,0],stand:true},
 {t:.4,label:'Step in',hips:[.10,.79,0],pitch:4,nod:-10,stand:true,near:true},
 {t:.7,label:'Crouch',hips:[.08,.56,0],push:18,pitch:14,flex:4,nod:-30,turn:40,stand:true,near:true},
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
 {t:4.105,label:'Lower down the far face',grip:true,hips:[.72,1.24,0],pitch:-6,heading:-180,flex:-2,nod:-8,turn:-40,hang:true},
 {t:4.205,label:'Let go',grip:true,still:true,hips:[.73,1.20,0],pitch:-4,heading:-180,flex:-2,nod:-8,turn:-40,hang:true},
 {t:4.505,label:'Drop',hips:[.84,.86,0],pitch:4,heading:-180,flex:3,nod:-10,turn:-40,stand:true,fall:true},
 {t:4.685,label:'Absorb',hips:[.93,.64,0],pitch:8,heading:-180,flex:6,nod:-5,turn:-40,stand:true},
 {t:4.95,label:'Weight on the right foot',hips:[.91,.74,-.10],pitch:4,heading:-200,flex:3,turn:-30,stand:true},
 {t:5.27,label:'Left foot round',hips:[.95,.79,-.12],heading:-270,turn:-10,stand:true},
 {t:5.52,label:'Weight on the left foot',hips:[1.0,.80,-.18],heading:-300,stand:true},
 {t:5.84,label:'Right foot round',hips:[1.0,.80,-.15],heading:-345,stand:true},
 {t:6.1,label:'Turn onto the tile',hips:[1,.80,0],heading:-360,stand:true},
];
export function createWallClimb(worker,profile={id:'horse'}){
 const body=createTraversalBody(worker),tails=createTailBend(worker),probe=createSurfaceProbe(worker,{stride:2,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),fitB=bodyFit(body,probe),back=fitB.back,D=TRUNK.at(-1).t;
 // Hanging, a body deeper in front stands back too (near) and leans over its belly toward the wall (lean, degrees of
 // pitch) until its shoulders are where the horse's were. Unadapted, the fit pushed a pig's belly 17 to 26 cm back off
 // the face, out of its arms' reach of the top; stood back alone, the pig director's shoulders were 52 cm from it, past
 // its arms' 50. Its hands never gripped, and the balance, finding nothing holding the body until the straddle,
 // planned a second-long flight and drove the hips 25 to 40 cm into the floor to launch it.
 const lean=Math.asin(Math.min(1,back/(body.offsets.spine.y+body.offsets.shoulder[1].y)))/DEG;
 const keys=TRUNK.map(k=>({...k,pitch:(k.pitch||0)+(k.near&&k.hang?lean:0),hips:[k.hips[0]-(k.near?back:0),k.stand?fitB.stand(k.hips[1]):k.hang?fitB.hang(k.hips[1]):k.hips[1],k.hips[2]]}));
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
 const deep=back>.05;
 if(deep){probe.update();const h0=body.at0('hips'),s0=body.at0('spine'),hipsPts=[],spinePts=[];
  for(let i=0;i<probe.count;i++){const b=probe.boneNames[probe.bone[i]],q=V(probe.x[i],probe.y[i],probe.z[i]);if(b==='hips')hipsPts.push(q.sub(h0));else if(b==='spine')spinePts.push(q.sub(s0));}
  const MARKS={1:[[1.265,2.345,[.45,top,.18]],[2.585,3.0,[.54,top,-.10]],[3.12,4.175,[.54,top,-.20]]],'-1':[[1.265,3.485,[.45,top,-.18]],[3.605,4.175,[.54,top,.20]]]};
  const reach=.97*(body.L[1].upper+body.L[1].fore),REST=[.006,.009],inTop=q=>q.x>WALL.edge-WALL.half&&q.x<WALL.edge+WALL.half&&Math.abs(q.z)<.5;
  for(const k of keys){if(k.t<2.265||k.t>=3.685)continue;const resting=k.t>2.5;let best=null;
   for(let dp=-30;dp<=30;dp+=2){const hipsQ=yawQ(k.heading||0).multiply(bodyQ(((k.pitch||0)+dp)*DEG,(k.roll||0)*DEG)),chestQ=hipsQ.clone().multiply(relQ(k.flex||0,k.side||0,k.twist||0)),H=V(...k.hips),C=H.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ));
    let low=Infinity;for(const q of hipsPts){const w=q.clone().applyQuaternion(hipsQ).add(H);if(inTop(w))low=Math.min(low,w.y-WALL.top);}for(const q of spinePts){const w=q.clone().applyQuaternion(chestQ).add(C);if(inTop(w))low=Math.min(low,w.y-WALL.top);}
    if(low===Infinity)continue;const dy=resting?(REST[0]+REST[1])/2-low:Math.max(0,REST[0]-low);
    let over=0;for(const s of ['1','-1']){const m=MARKS[s].find(([a,b])=>k.t>=a&&k.t<=b);if(!m)continue;const sh=C.clone().add(V(0,dy,0)).add(body.offsets.shoulder[+s].clone().applyQuaternion(chestQ));over=Math.max(over,sh.distanceTo(V(...m[2]))-reach);}
    const cost=Math.abs(dp)/10+Math.abs(dy)/.05+30*Math.max(0,over);if(!best||cost<best.cost)best={cost,dp,dy};}
   if(best){k.pitch=(k.pitch||0)+best.dp;k.hips=[k.hips[0],k.hips[1]+best.dy,k.hips[2]];}}}
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
 function trunkAt(t){const [flex,side,twist,nod,tilt,turn]=shape(clamp(t,0,D));let hips=V(...posTrack(t)),hipsQ=rotTrack(t),headQ=relQ(nod,tilt,turn);const spineQ=relQ(flex,side,twist);
  if(onTop)hips.add(onTop(t));if(balance)hips.add(balance.shift(t));
  if(fit){hips.add(fit.trunk(t));const bow=fit.bow(t);if(bow)hipsQ=hipsQ.clone().multiply(bodyQ(bow*DEG));const h=fit.head(t);if(h[0]||h[1]||h[2])headQ=headQ.multiply(relQ(...h));}
  const sp=balance?.spin?.(t);if(sp){hipsQ=sp.q.clone().multiply(hipsQ);hips.sub(sp.pivot).applyQuaternion(sp.q).add(sp.pivot);}
  return {hips,hipsQ,spineQ,headQ,chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))};}
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray(),ANKLE=fitB.ankle;
 // The crouched hooves push off for the jump (lift).
 const foot=(x,z,hoof=0,heading=0,lift=0)=>({f:'world',p:[x,ANKLE,z],hoof,heading,lift,plant:true}),stance=(s,dx=0)=>foot(fitB.foot(s,dx)[0],fitB.foot(s)[2]);
 // A hoof set flat against the near or far face: sole toward the wall (toe up), ankle a hoof's depth out.
 const onFace=(near,y,z,t)=>({f:'world',p:[near?WALL.edge-WALL.half-.12:WALL.edge+WALL.half+.12,y+(rise[t]||0),z],hoof:-85,heading:near?0:-180,plant:[near?-1:1,0,0]});
 const OUT=[.25,0,1]; // knees out to the sides while the hooves are on a wall face
 const SIDE=[-.3,0,1]; // straight out (a touch back) while a leg comes down the far side, clear of the face
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
 // from the top to the face, the fingers cut through its corner (4 cm); arced over it, the hand's turn onto the face
 // switched its way round 2 ms short of done and popped the palm.
 const FAR=[1,0,0],SLIDE=z=>[[4.235,{f:'world',p:[.63,2.04,.21*z]}],[4.33,{f:'world',p:[.62,1.80,.22*z],face:FAR}],[4.685,{f:'world',p:[.62,1.10,.26*z],face:FAR}]];
 const LIMB={
  'leg-1':[[0,stance(-1)],[.4,foot(-.035-back,-.20)],[.7,foot(-.035-back,-.20,15)],[.995,{f:'pelvis',p:[body.offsets.thigh[-1].x-.165,body.offsets.thigh[-1].y-1.03*fitB.leg,-.20],hoof:55,soft:.03}],[1.195,{f:'pelvis',p:[body.offsets.thigh[-1].x-.165,body.offsets.thigh[-1].y-.95*fitB.leg,-.20],hoof:50}],[1.375,{f:'pelvis',p:[.02,-.62,-.13],hoof:20,knee:OUT}],[1.505,{...onFace(true,.46,-.16,1.505),knee:OUT}],[1.905,{...onFace(true,.80,-.16,1.905),knee:OUT}],[2.305,{...onFace(true,1.26,-.16,2.305),knee:OUT}],[2.705,{...onFace(true,1.56,-.16,2.705),knee:OUT}],
   [3.065,{f:'world',p:[.19,1.70,0],hoof:20,heading:-90}],[3.305,{f:'world',p:[.44,2.24,.62],hoof:10,heading:-108}],[3.485,{f:'world',p:[.68,2.12,.66],hoof:40,heading:-140,knee:SIDE}],[3.685,{f:'world',p:[.80,1.36,.20],hoof:20,heading:-170,knee:SIDE}],
   [4.04,{...onFace(false,.56,.16,4.105),knee:OUT,lift:.3}],[4.205,{f:'pelvis',p:[-.06,body.offsets.thigh[-1].y-.95*fitB.leg,-.14],hoof:25,knee:OUT}],[4.375,{f:'pelvis',p:[-.06,body.offsets.thigh[-1].y-1.0*fitB.leg,-.14],hoof:25,soft:.03,knee:OUT}],[4.625,foot(.90,.14,0,-180)],[4.95,foot(.90,.14,0,-190)],[5.23,{...over(-1,-265),arc:.07}],[5.27,land(-1,-270)],[6.1,land(-1,-360)]],
  leg1:[[0,stance(1)],[.4,foot(.14-back,.14)],[.7,foot(.14-back,.14,15)],[.995,{f:'pelvis',p:[body.offsets.thigh[1].x+.01,body.offsets.thigh[1].y-1.03*fitB.leg,.14],hoof:55,soft:.03}],[1.195,{f:'pelvis',p:[body.offsets.thigh[1].x+.01,body.offsets.thigh[1].y-.95*fitB.leg,.14],hoof:50}],[1.375,{f:'pelvis',p:[.02,-.62,.13],hoof:20,knee:OUT}],[1.505,{...onFace(true,.58,.16,1.505),knee:OUT}],[1.905,{...onFace(true,.96,.16,1.905),knee:OUT}],[2.305,{...onFace(true,1.30,.16,2.305),knee:OUT}],[2.525,{f:'world',p:[.20,1.96,.36],hoof:-60,knee:OUT}],[2.705,{f:'world',p:[.52,2.16,.42],hoof:0,heading:-30}],[2.905,{f:'world',p:[.72,2.04,.30],hoof:30,heading:-60}],
   [3.065,{f:'world',p:[.81,1.70,0],hoof:20,heading:-90}],[3.485,{f:'world',p:[.80,1.58,-.10],hoof:20,heading:-140,knee:SIDE}],[3.685,{f:'world',p:[.80,1.36,-.16],hoof:20,heading:-170,knee:SIDE}],
   [4.04,{...onFace(false,.70,-.16,4.105),knee:OUT,lift:.3}],[4.205,{f:'pelvis',p:[-.06,body.offsets.thigh[1].y-.95*fitB.leg,.16],hoof:25,knee:OUT}],[4.375,{f:'pelvis',p:[-.06,body.offsets.thigh[1].y-1.0*fitB.leg,.16],hoof:25,soft:.03,knee:OUT}],[4.625,foot(.90,-.16,0,-180)],[5.27,foot(.90,-.16,0,-270)],[5.52,foot(.90,-.16,0,-300)],[5.8,{...over(1,-355),arc:.07}],[5.84,land(1,-360)],[6.1,land(1,-360)]],
  // The left hand holds from the catch until the left knee is up, then re-grips on the far side's left while the seat is
 // still on the top; the right re-plants turned to the far side in the straddle (a palm turning 140 degrees where it lay
 // touched the top at two points, and held the body alone on them while the left crossed: 37% of its weight of phantom
 // push). The right lets go
  // once the chest is over and plants ahead before the right knee comes up beside it. Gripping, the elbows bend back
  // and out from the wall (bent down, the forearms lay across its near edge). The arms swing up ahead of the jump, in
  // front of the face, and come down onto the top (reaching straight for it, the forearms went 7 cm into the face).
  'arm-1':[[0,{f:'chest',p:restWrist(-1)}],[.4,{f:'chest',p:[.20,.15,-.30]}],[.7,{f:'chest',p:[.10,-.05,-.32]}],[.86,{f:'chest',p:[.06,.40,-.26],elbow:HANG}],[1.115,{f:'chest',p:[.04,.56,-.22],elbow:HANG}],[1.265,{f:'world',p:[.45,top,-.18],palm:0,elbow:HANG}],[3.485,{f:'world',p:[.46,top,-.18],palm:0,elbow:HANG}],[3.545,{f:'world',p:[.50,top+.06,.04]}],[3.605,{f:'world',p:[.54,top,.20],palm:-180}],[4.175,{f:'world',p:[.54,top,.20],palm:-180,lift:.3}],...SLIDE(1),[4.95,{f:'chest',p:[.18,-.18,-.16]}],[5.27,{f:'chest',p:[.16,-.26,-.20]}],[6.1,{f:'chest',p:restWrist(-1)}]],
  arm1:[[0,{f:'chest',p:restWrist(1)}],[.4,{f:'chest',p:[.20,.15,.30]}],[.7,{f:'chest',p:[.10,-.05,.32]}],[.86,{f:'chest',p:[.06,.40,.26],elbow:HANG}],[1.115,{f:'chest',p:[.04,.56,.22],elbow:HANG}],[1.265,{f:'world',p:[.45,top,.18],palm:0,elbow:HANG}],[2.345,{f:'world',p:[.45,top,.18],palm:0,elbow:HANG}],[2.465,{f:'world',p:[.52,top+.06,0]}],[2.585,{f:'world',p:[.54,top,-.10],palm:-40}],[3,{f:'world',p:[.54,top,-.10],palm:-40}],[3.06,{f:'world',p:[.56,top+.06,-.15]}],[3.12,{f:'world',p:[.54,top,-.20],palm:-180}],[3.665,{f:'world',p:[.54,top,-.20],palm:-180}],[4.175,{f:'world',p:[.54,top,-.20],palm:-180,lift:.3}],...SLIDE(-1),[4.95,{f:'chest',p:[.18,-.18,.16]}],[5.27,{f:'chest',p:[.16,-.26,.20]}],[6.1,{f:'chest',p:restWrist(1)}]],
 };
 const spec=t=>{const tr=trunkAt(t),limbs={};for(const id of Object.keys(LIMB))limbs[id]=keyedLimb(LIMB[id],t,tr);return posedFrom(tr,limbs,{poles:steady?id=>steady(id,t):null,offsets:fit?.limb?id=>fit.limb(id,t):null,snaps:fit?.plant?id=>fit.plant(id,t):null,turns:turnRef?b=>turnRef(b,t):null});};
 // Fit this character's surface: trunk, head and tail out of the floor and the wall. The face is the way out until the
 // chest is nearly over (2.265): a hanging front (the sheep's waistcoat hem) meets the top edge before the chest does.
 fit=createClearanceFit(D);fit.solve({body,probe,tails,obstacles:edgeBoxes(WALL.edge,WALL.half,[[0,WALL.top]]),poseAt:t=>body.pose(spec(t),'fit'),stage:t=>t<2.265?'near':t<3.685?'over':'far'});
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
 const TOP_BAND=[2.55,3.66],LOWERED=4.105;
 if(deep){const TOUCH=.006,REACH=.009,[a,b]=TOP_BAND,all=createSurfaceProbe(worker,{stride:1,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),want=[],lo=[],hi=[],ts=[],inTop=(x,z)=>x>WALL.edge-WALL.half&&x<WALL.edge+WALL.half&&Math.abs(z)<.5;
  for(let t=a;t<=LOWERED+1e-9;t+=.005){body.pose(spec(t),'top');all.update();let low=Infinity;
   for(let i=0;i<all.count;i++){if(/hoof|boot|foot|toe|hand/i.test(all.names[all.part[i]]))continue;const bone=all.boneNames[all.bone[i]];if(bone!=='hips'&&bone!=='spine'&&bone!=='head')continue;if(inTop(all.x[i],all.z[i]))low=Math.min(low,all.y[i]-WALL.top);}
   ts.push(t);if(low===Infinity||t>b){want.push(0);lo.push(-1);hi.push(1);}else{want.push(TOUCH-low);lo.push(-low);hi.push(REACH-low);}}
  const P=boxedPath(want,want.map(()=>1),2e7,want.map((_,i)=>({at:i,c:[1],lo:lo[i],hi:hi[i]})));
  const tr=track(ts.map((t,i)=>[t,0,P.c[i]*smooth(Math.min(t-a,LOWERED-t)/.08),0]),{},{limit:false});onTop=t=>t>a&&t<LOWERED?V(...tr(t)):V();
  steady=steadyPoles(D,t=>limbSample(body,spec(t)));turns();}
 // Balance: the centre of mass planned against what holds the body at each moment, the hips moved to follow it. It
 // runs on the hands' final turns (a palm's angle decides when it first touches), which are then found again. Resting
 // on the top, the plan keeps the authored path (hold): its own hips' move lifted the seat off it.
 // the tails as played (the fit's bend, the base squashed onto the floor), for the balance's contacts too
 const playTail=t=>{const [a,b]=fit.tail(t);tails.set(a*DEG,b*DEG);tails.squash(body.root);};
 const bal=balanceTraversal({duration:D,probe:contactProbe(worker),obstacles:edgeBoxes(WALL.edge,WALL.half,[[0,WALL.top]]),pose:t=>{const P=body.pose(spec(t),'balance');playTail(t);return P;},com:P=>body.com(P),setMove:m=>{balance=m;},base:t=>fit.trunk(t).add(onTop?onTop(t):V()).toArray(),
  hold:deep?t=>t>=TOP_BAND[0]&&t<=TOP_BAND[1]:null});
 // The head and tail are fitted again to the balanced motion, the head held through the flights (traversal-fit.js,
 // fit.solveHead and fit.solveTail), and the report taken on it.
 balance=bal;fit.solveHead({air:t=>bal.samples[Math.round(t/(bal.times[1]-bal.times[0]))]?.kind==='air'});fit.solveTail();turns();
 const KEYS=TRUNK.map(k=>({t:k.t,label:k.label}));let state=null;
 const api={duration:D,keys:KEYS,body,probe,obstacle:WALL,fit:fit.report,clearance:fit,balance:bal,phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();playTail(time);
   state={time,phase:api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){tails.restore();body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
