import {V,Q,DEG,clamp,track,spinTrack,bodyQ,yawQ,relQ,keyedLimb,posedFrom,steadyPoles,steadyTurns,limbSample,createTraversalBody,createSurfaceProbe} from './traversal-pose.js';
import {bodyFit,createTailBend,createClearanceFit,edgeBoxes} from './traversal-fit.js';
// Climb over a 2 m wall (docs/tactics/NATURAL-TRAVERSAL.md). Local frame: start on the tile at the origin facing +X,
// the wall on the edge at X = .5 (faces .42 and .58, top 2.0), finish standing on the next tile's centre (1, 0, 0)
// facing on. The top is 0.35 above the head and the standing palm reach is about 1.71, so: a jump to catch the top,
// hang with the hooves on the face, walk up and pull until the chest is over, hook the right knee up and straddle the
// 16 cm top, bring the left leg over turning to face the wall, lower down the far face, drop the last few
// centimetres, then turn round onto the tile centre.
export const WALL=Object.freeze({edge:.5,half:.08,top:2.0});
// Heights are the horse's (traversal-fit.js): a key the legs hold up (stand) is scaled to each character's legs, a key
// hanging from the hands (hang) keeps the shoulders where the horse's were, and a body deeper in front stands back while
// it faces the wall (near), feet and all. A key that grips the top (grip) rises until both hands reach it. A foot
// leaving a face keeps its ankle off it, toe up, so a long foot (rabbit, dog, skunk) never swings into the wall. The
// straddle faces along the wall, one leg down each side, so the thighs hang outside the 16 cm top; the left leg
// comes over behind it, knee to the top, so the body turns left to face the wall from the far side.
const TRUNK=[
 {t:0,label:'Ready',hips:[0,.80,0],stand:true},
 {t:.40,label:'Step in',hips:[.10,.79,0],pitch:4,nod:-10,stand:true,near:true},
 {t:.62,label:'Crouch',hips:[.08,.62,0],pitch:14,flex:4,nod:-30,turn:40,stand:true,near:true},
 {t:.88,label:'Jump and catch',grip:true,hips:[.25,1.20,0],pitch:-4,flex:-2,nod:-10,turn:40,hang:true},
 {t:1.12,label:'Hang',grip:true,hips:[.25,1.14,0],pitch:-8,flex:-2,nod:-8,turn:40,hang:true},
 {t:1.52,label:'Walk up the face',grip:true,hips:[.24,1.36,0],pitch:-12,flex:2,nod:-8,turn:40,hang:true},
 {t:1.92,label:'Chest over the top',grip:true,hips:[.30,1.86,0],pitch:34,flex:14,nod:-5,turn:30,hang:true},
 {t:2.32,label:'Right knee up',hips:[.42,2.20,.04],pitch:62,roll:-18,heading:-30,flex:10,nod:-5,turn:15},
 {t:2.68,label:'Straddle',hips:[.50,2.18,0],pitch:28,heading:-90,flex:6,nod:-12},
 {t:2.92,label:'Left knee up behind',hips:[.52,2.24,-.03],pitch:52,heading:-108,flex:12,nod:-14,turn:10},
 {t:3.24,label:'Left leg over',hips:[.72,2.05,.02],pitch:26,heading:-165,flex:10,nod:-10,turn:-20},
 {t:3.52,label:'Lower down the far face',grip:true,hips:[.72,1.24,0],pitch:-6,heading:-180,flex:-2,nod:-8,turn:-40,hang:true},
 {t:3.62,label:'Let go',grip:true,hips:[.73,1.20,0],pitch:-4,heading:-180,flex:-2,nod:-8,turn:-40,hang:true},
 {t:3.82,label:'Drop',hips:[.82,.80,0],pitch:6,heading:-180,flex:4,nod:-10,turn:-40,stand:true},
 {t:4.05,label:'Absorb',hips:[.93,.66,0],pitch:6,heading:-180,flex:6,nod:-5,turn:-40,stand:true},
 {t:4.35,label:'Step round',hips:[.97,.79,-.07],heading:-270,turn:-10,stand:true},
 {t:4.85,label:'Turn onto the tile',hips:[1,.80,0],heading:-360,stand:true},
];
export function createWallClimb(worker,profile={id:'horse'}){
 const body=createTraversalBody(worker),tails=createTailBend(worker),probe=createSurfaceProbe(worker,{stride:2,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),fitB=bodyFit(body,probe),back=fitB.back,D=TRUNK.at(-1).t;
 const keys=TRUNK.map(k=>({...k,hips:[k.hips[0]-(k.near?back:0),k.stand?fitB.stand(k.hips[1]):k.hang?fitB.hang(k.hips[1]):k.hips[1],k.hips[2]]}));
 // Gripping keys rise until both hands reach the top at .97 of the arm (the horse's keys left them 13 cm short); the
 // hooves on the face rise with them (rise).
 const top=WALL.top+.07,rise={};
 for(const k of keys)if(k.grip){const hipsQ=yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG)),chestQ=hipsQ.clone().multiply(relQ(k.flex||0,k.side||0,k.twist||0));let y=k.hips[1];
  for(const s of [-1,1]){const g=V(k.t<3?.45:.54,top,k.t<3?s*.18:-s*.20),A=V(k.hips[0],0,k.hips[2]).add(body.offsets.spine.clone().applyQuaternion(hipsQ)).add(body.offsets.shoulder[s].clone().applyQuaternion(chestQ)),h=Math.hypot(g.x-A.x,g.z-A.z),r=.97*(body.L[s].upper+body.L[s].fore);
   if(h<r)y=Math.max(y,g.y-A.y-Math.sqrt(r*r-h*h));}
  rise[k.t]=y-k.hips[1];k.hips=[k.hips[0],y,k.hips[2]];}
 const posTrack=track(keys.map(k=>[k.t,...k.hips])),rotTrack=spinTrack(keys.map(k=>[k.t,yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG))]));
 const shape=track(keys.map(k=>[k.t,k.flex||0,k.side||0,k.twist||0,k.nod||0,k.tilt||0,k.turn||0]));
 let fit=null,steady=null,turnRef=null;
 function trunkAt(t){const [flex,side,twist,nod,tilt,turn]=shape(clamp(t,0,D));let hips=V(...posTrack(t)),hipsQ=rotTrack(t),headQ=relQ(nod,tilt,turn);const spineQ=relQ(flex,side,twist);
  if(fit){hips.add(fit.trunk(t));const bow=fit.bow(t);if(bow)hipsQ=hipsQ.clone().multiply(bodyQ(bow*DEG));const h=fit.head(t);if(h[0]||h[1]||h[2])headQ=headQ.multiply(relQ(...h));}
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
 const HANG=[-1,0,.8]; // a gripping hand's elbow: back and out from the wall
 const LIMB={
  'leg-1':[[0,stance(-1)],[.40,foot(-.035-back,-.20)],[.62,foot(-.035-back,-.20,15,0,.25)],[.88,{f:'pelvis',p:[.02,-.62,-.13],hoof:20,knee:OUT}],[1.12,{...onFace(true,.46,-.16,1.12),knee:OUT}],[1.52,{...onFace(true,.80,-.16,1.52),knee:OUT}],[1.92,{...onFace(true,1.26,-.16,1.92),knee:OUT}],[2.32,{...onFace(true,1.56,-.16,2.32),knee:OUT}],
   [2.68,{f:'world',p:[.19,1.70,0],hoof:20,heading:-90}],[2.92,{f:'world',p:[.44,2.24,.62],hoof:10,heading:-108}],[3.10,{f:'world',p:[.68,2.12,.66],hoof:40,heading:-140,knee:SIDE}],[3.30,{f:'world',p:[.80,1.36,.20],hoof:20,heading:-170,knee:SIDE}],
   [3.52,{...onFace(false,.56,.16,3.52),knee:OUT,lift:.3}],[3.82,foot(.90,.14,0,-180)],[4.05,foot(.90,.14,0,-180)],[4.20,{f:'world',p:[.96,ANKLE+.07,-.04],hoof:-10,heading:-225}],[4.35,land(-1,-270)],[4.85,land(-1,-360)]],
  leg1:[[0,stance(1)],[.40,foot(.14-back,.14)],[.62,foot(.14-back,.14,15,0,.25)],[.88,{f:'pelvis',p:[.02,-.62,.13],hoof:20,knee:OUT}],[1.12,{...onFace(true,.58,.16,1.12),knee:OUT}],[1.52,{...onFace(true,.96,.16,1.52),knee:OUT}],[1.92,{...onFace(true,1.30,.16,1.92),knee:OUT}],[2.14,{f:'world',p:[.20,1.96,.36],hoof:-60,knee:OUT}],[2.32,{f:'world',p:[.52,2.16,.42],hoof:0,heading:-30}],[2.52,{f:'world',p:[.72,2.04,.30],hoof:30,heading:-60}],
   [2.68,{f:'world',p:[.81,1.70,0],hoof:20,heading:-90}],[3.10,{f:'world',p:[.80,1.58,-.10],hoof:20,heading:-140,knee:SIDE}],[3.30,{f:'world',p:[.80,1.36,-.16],hoof:20,heading:-170,knee:SIDE}],
   [3.52,{...onFace(false,.70,-.16,3.52),knee:OUT,lift:.3}],[3.82,foot(.90,-.16,0,-180)],[4.05,foot(.90,-.16,0,-180)],[4.35,foot(.90,-.16,0,-270)],[4.60,{f:'world',p:[.95,ANKLE+.07,.04],hoof:-10,heading:-315}],[4.85,land(1,-360)]],
  // The left hand holds from the catch until the left knee is up, then re-grips on the far side's left; the right lets go
  // once the chest is over and plants ahead before the right knee comes up beside it. Gripping, the elbows bend back
  // and out from the wall (bent down, the forearms lay across its near edge). The arms swing up ahead of the jump, in
  // front of the face, and come down onto the top (reaching straight for it, the forearms went 7 cm into the face).
  'arm-1':[[0,{f:'chest',p:restWrist(-1)}],[.40,{f:'chest',p:[.20,.15,-.30]}],[.62,{f:'chest',p:[.10,-.05,-.32]}],[.74,{f:'chest',p:[.14,.40,-.26],elbow:HANG}],[.88,{f:'world',p:[.45,top,-.18],palm:0,elbow:HANG}],[3.10,{f:'world',p:[.46,top,-.18],palm:0,elbow:HANG}],[3.20,{f:'world',p:[.50,top+.06,.04]}],[3.30,{f:'world',p:[.54,top,.20],palm:-180}],[3.62,{f:'world',p:[.54,top,.20],palm:-180,lift:.3}],[3.80,{f:'chest',p:[.10,.30,-.30]}],[3.96,{f:'chest',p:[.14,-.10,-.32]}],[4.35,{f:'chest',p:restWrist(-1)}],[4.85,{f:'chest',p:restWrist(-1)}]],
  arm1:[[0,{f:'chest',p:restWrist(1)}],[.40,{f:'chest',p:[.20,.15,.30]}],[.62,{f:'chest',p:[.10,-.05,.32]}],[.74,{f:'chest',p:[.14,.40,.26],elbow:HANG}],[.88,{f:'world',p:[.45,top,.18],palm:0,elbow:HANG}],[1.96,{f:'world',p:[.45,top,.18],palm:0,elbow:HANG}],[2.08,{f:'world',p:[.52,top+.06,0]}],[2.20,{f:'world',p:[.54,top,-.10],palm:-40}],[3.28,{f:'world',p:[.54,top,-.20],palm:-180}],[3.62,{f:'world',p:[.54,top,-.20],palm:-180,lift:.3}],[3.80,{f:'chest',p:[.10,.30,.30]}],[3.96,{f:'chest',p:[.14,-.10,.32]}],[4.35,{f:'chest',p:restWrist(1)}],[4.85,{f:'chest',p:restWrist(1)}]],
 };
 const spec=t=>{const tr=trunkAt(t),limbs={};for(const id of Object.keys(LIMB))limbs[id]=keyedLimb(LIMB[id],t,tr);return posedFrom(tr,limbs,{poles:steady?id=>steady(id,t):null,offsets:fit?.limb?id=>fit.limb(id,t):null,snaps:fit?.plant?id=>fit.plant(id,t):null,turns:turnRef?b=>turnRef(b,t):null});};
 // Fit this character's surface: trunk, head and tail out of the floor and the wall. The face is the way out until the
 // chest is nearly over (1.88): a hanging front (the sheep's waistcoat hem) meets the top edge before the chest does.
 fit=createClearanceFit(D);fit.solve({body,probe,tails,obstacles:edgeBoxes(WALL.edge,WALL.half,[[0,WALL.top]]),poseAt:t=>body.pose(spec(t),'fit'),stage:t=>t<1.88?'near':t<3.3?'over':'far'});
 steady=steadyPoles(D,t=>limbSample(body,spec(t)));
 // The limbs are fitted with their steady bend directions, which are then found again for the moved targets.
 // How planted each limb's end is (a palm on a surface, a hoof set on the floor or a face), for the limb fit.
 const planted=(id,t)=>{const l=keyedLimb(LIMB[id],t,trunkAt(t));if(id.startsWith('arm'))return [l.palm!==undefined?l.palmW:0,[0,1,0]];
  const [na,nb,u]=l.plant;return [l.plantW||0,na&&nb?na.map((v,j)=>v+(nb[j]-v)*u):na||nb];};
 fit.solveLimbs({planted});steady=steadyPoles(D,t=>limbSample(body,spec(t)));fit.solvePlants({planted});
 // Twice: the first pass unwraps the palms' yaw blends, the second finds the hands' ways round for those continuous
 // targets (found for the wrapped ones, they named the wrong way where a blend passed 180 degrees: a 47 m/s snap).
 const turnsAt=t=>{body.pose(spec(t),'turns');return body.turns.slice();};turnRef=steadyTurns(D,turnsAt);turnRef=steadyTurns(D,turnsAt);
 const KEYS=TRUNK.map(k=>({t:k.t,label:k.label}));let state=null;
 const api={duration:D,keys:KEYS,body,probe,obstacle:WALL,fit:fit.report,clearance:fit,phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();const [tp,ty]=fit.tail(time);tails.set(tp*DEG,ty*DEG);
   state={time,phase:api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){tails.restore();body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
