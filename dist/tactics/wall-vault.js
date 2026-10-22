import {V,Q,DEG,clamp,track,spinTrack,angleTrack,bodyQ,yawQ,relQ,frameToWorld,keyedLimb,posedFrom,steadyPoles,steadyTurns,limbSample,createTraversalBody,createSurfaceProbe} from './traversal-pose.js';
import {bodyFit,createTailBend,createClearanceFit,edgeBoxes} from './traversal-fit.js';
import {balanceTraversal,contactProbe} from './traversal-balance.js';
// Side vault over a waist-high wall (docs/tactics/NATURAL-TRAVERSAL.md). Local frame: start on the tile at the
// origin facing +X, the wall on the edge at X = .5 (faces .42 and .58, top 1.0), finish standing on the next tile's
// centre (1, 0, 0) facing on. Both hands go on the top; the jump swings the legs up in front and over the wall to the
// right of the hands while the trunk leans left over the arms; the hips pass just over the top, the hands push off
// and the vault lands on the far side, then steps onto the tile centre.
export const LOW_WALL=Object.freeze({edge:.5,half:.08,top:1.0});
// Keyed trunk: time, label, hips [x, y, z], pelvis pitch / roll / heading (degrees), chest flex / side / twist and
// head nod / tilt / turn (relative). Heights are the horse's; a key the legs hold up (stand) is scaled to each
// character's legs, and a body deeper in front stands back while it faces the wall (near), feet and all
// (traversal-fit.js).
const TRUNK=[
 {t:0,label:'Ready',hips:[0,.80,0],stand:true},
 {t:.40,label:'Step in',hips:[.05,.79,0],pitch:6,flex:4,stand:true,near:true},
 {t:.65,label:'Hands on the wall',hips:[.08,.73,-.02],pitch:22,flex:8,nod:-24,stand:true,near:true},
 {t:.82,label:'Load',hips:[.08,.67,-.02],pitch:30,flex:8,nod:-30,stand:true,near:true},
 {t:.98,label:'Spring',hips:[.20,1.26,.18],pitch:42,roll:-22,flex:10,side:-12,nod:-12,turn:-15},
 {t:1.10,label:'Legs up and out',hips:[.35,1.42,.34],pitch:40,roll:-40,flex:12,side:-20,nod:-8,turn:-25},
 {t:1.22,label:'Legs over',hips:[.52,1.32,.32],pitch:22,roll:-32,flex:10,side:-18,nod:-5,turn:-20},
 {t:1.36,label:'Down the far side',hips:[.74,1.12,.24],pitch:6,roll:-18,flex:6,side:-10,nod:-5,turn:-10},
 {t:1.50,label:'Hands off',hips:[.86,.92,.14],pitch:2,roll:-6,flex:3,side:-4},
 {t:1.64,label:'Land',hips:[.93,.72,.08],pitch:14,flex:8,nod:-5,stand:true},
 {t:2.00,label:'Absorb',hips:[.96,.78,.04],pitch:6,flex:3,stand:true},
 {t:2.40,label:'Settle on the tile',hips:[1,.80,0],stand:true},
];
export function createWallVault(worker,profile={id:'horse'}){
 // Fitted to the character: its legs and depth (traversal-fit.js), and below, its surface against the wall.
 // A deeper body stands back part of its extra depth and plants its hands nearer the wall's near edge; the clearance
 // fit moves it the rest of the way, so its short arms still reach the top.
 const body=createTraversalBody(worker),tails=createTailBend(worker),probe=createSurfaceProbe(worker,{stride:2,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),fitB=bodyFit(body,probe),back=.6*fitB.back,palmX=.53-.5*fitB.back,D=TRUNK.at(-1).t;
 const keys=TRUNK.map(k=>({...k,hips:[k.hips[0]-(k.near?back:0),k.stand?fitB.stand(k.hips[1]):k.hips[1],k.hips[2]]}));
 const posTrack=track(keys.map(k=>[k.t,...k.hips])),rotTrack=angleTrack(keys.map(k=>[k.t,k.heading||0,k.pitch||0,k.roll||0]));
 const shape=track(keys.map(k=>[k.t,k.flex||0,k.side||0,k.twist||0,k.nod||0,k.tilt||0,k.turn||0]));
 let fit=null,steady=null,turnRef=null,balance=null;
 function trunkAt(t){const [flex,side,twist,nod,tilt,turn]=shape(clamp(t,0,D));let hips=V(...posTrack(t)),hipsQ=rotTrack(t),headQ=relQ(nod,tilt,turn);const spineQ=relQ(flex,side,twist);
 if(balance)hips.add(balance.shift(t));
  if(fit){hips.add(fit.trunk(t));const bow=fit.bow(t);if(bow)hipsQ=hipsQ.clone().multiply(bodyQ(bow*DEG));const h=fit.head(t);if(h[0]||h[1]||h[2])headQ=headQ.multiply(relQ(...h));}
  const sp=balance?.spin?.(t);if(sp){hipsQ=sp.q.clone().multiply(hipsQ);hips.sub(sp.pivot).applyQuaternion(sp.q).add(sp.pivot);}
  return {hips,hipsQ,spineQ,headQ,chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))};}
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray(),ANKLE=fitB.ankle,top=LOW_WALL.top+.07;
 // Hooves: planted in the world where they stand, tucked in the pelvis frame in the air. Palms flat on the top. The
 // loaded hooves push off as the trunk springs (lift). The right hand lets go as the spring starts and lifts out to the
 // side at shoulder height for balance, wide of the chest, while the legs pass under it (dropped to the hip, it met the right thigh: 11.8 cm,
 // phantom-wrench capsules). The left hand stays on the top until the hooves are down (the body lowers as it moves off,
 // so the shoulder stays within reach), so the vault has no free flight to keep its spin through. Planted, the
 // elbows bend back and out as in a dip: bent down, the forearms of the bigger
 // bodies crossed the wall's near edge, and the fit dragged the hands 20 to 30 cm off the top (an elbow whip of 27 m/s).
 const PUSH=[-1,0,.8];
 const foot=(x,z,hoof=0,heading=0,lift=0)=>({f:'world',p:[x,ANKLE,z],hoof,heading,lift,plant:true}),stance=(s,dx=0)=>foot(fitB.foot(s,dx)[0],fitB.foot(s)[2]);
 const LIMB={
  'leg-1':[[0,stance(-1)],[.40,foot(-.035-back,-.20)],[.65,foot(-.035-back,-.20)],[.82,foot(-.035-back,-.20,20,0,.25)],[.98,{f:'pelvis',p:[.14,-.18,-.16],hoof:40}],[1.10,{f:'pelvis',p:[.26,.02,-.10],hoof:30}],[1.22,{f:'pelvis',p:[.44,-.08,-.10],hoof:15}],[1.36,{f:'pelvis',p:[.30,-.42,-.11],hoof:5}],[1.50,{f:'pelvis',p:[.12,-.62,-.12],hoof:0}],[1.64,foot(.92,-.06)],[2.00,foot(.92,-.06)],[2.40,stance(-1,1)]],
  leg1:[[0,stance(1)],[.40,foot(.06-back,.16)],[.65,foot(.06-back,.16)],[.82,foot(.06-back,.16,20,0,.25)],[.98,{f:'pelvis',p:[.18,-.14,.18],hoof:40}],[1.10,{f:'pelvis',p:[.34,0,.18],hoof:30}],[1.22,{f:'pelvis',p:[.46,-.02,.16],hoof:15}],[1.36,{f:'pelvis',p:[.34,-.38,.14],hoof:5}],[1.50,{f:'pelvis',p:[.14,-.60,.13],hoof:0}],[1.64,foot(.98,.22)],[2.00,foot(.98,.22)],[2.40,stance(1,1)]],
  'arm-1':[[0,{f:'chest',p:restWrist(-1)}],[.40,{f:'world',p:[palmX-.09,1.12,-.18]}],[.65,{f:'world',p:[palmX,top,-.18],palm:0,elbow:PUSH}],[1.62,{f:'world',p:[palmX,top,-.18],palm:0,elbow:PUSH}],[1.78,{f:'chest',p:[.14,-.30,-.30]}],[1.96,{f:'chest',p:[.08,-.36,-.30]}],[2.40,{f:'chest',p:restWrist(-1)}]],
  arm1:[[0,{f:'chest',p:restWrist(1)}],[.40,{f:'world',p:[palmX-.09,1.12,.10]}],[.65,{f:'world',p:[palmX,top,.10],palm:0,lift:.25,elbow:PUSH}],[.86,{f:'world',p:[palmX,top,.10],palm:0,lift:.25,elbow:PUSH}],[1.10,{f:'chest',p:[.14,.22,.44],elbow:[0,-1,.3]}],[1.36,{f:'chest',p:[.12,.12,.44],elbow:[0,-1,.3]}],[1.64,{f:'chest',p:[.08,-.36,.30]}],[2.40,{f:'chest',p:restWrist(1)}]],
 };
 const spec=t=>{const tr=trunkAt(t),limbs={};for(const id of Object.keys(LIMB))limbs[id]=keyedLimb(LIMB[id],t,tr);return posedFrom(tr,limbs,{poles:steady?id=>steady(id,t):null,offsets:fit?.limb?id=>fit.limb(id,t):null,snaps:fit?.plant?id=>fit.plant(id,t):null,turns:turnRef?b=>turnRef(b,t):null});};
 // Fit this character's surface: trunk, head and tail out of the floor and the wall.
 fit=createClearanceFit(D);fit.solve({body,probe,tails,obstacles:edgeBoxes(LOW_WALL.edge,LOW_WALL.half,[[0,LOW_WALL.top]]),poseAt:t=>body.pose(spec(t),'fit'),stage:t=>t<.9?'near':t<1.45?'over':'far'});
 steady=steadyPoles(D,t=>limbSample(body,spec(t)));
 // The limbs are fitted with their steady bend directions, which are then found again for the moved targets.
 // How planted each limb's end is (a palm on a surface, a hoof set on the floor or a face), for the limb fit.
 const planted=(id,t)=>{const l=keyedLimb(LIMB[id],t,trunkAt(t));if(id.startsWith('arm'))return [l.palm!==undefined?l.palmW:0,[0,1,0]];
  const [na,nb,u]=l.plant;return [l.plantW||0,na&&nb?na.map((v,j)=>v+(nb[j]-v)*u):na||nb];};
 fit.solveLimbs({planted});steady=steadyPoles(D,t=>limbSample(body,spec(t)));fit.solvePlants({planted});
 // Twice: the first pass unwraps the palms' yaw blends, the second finds the hands' ways round for those continuous
 // targets (found for the wrapped ones, they named the wrong way where a blend passed 180 degrees: a 47 m/s snap).
 const turnsAt=t=>{body.pose(spec(t),'turns');return body.turns.slice();},turns=()=>{turnRef=null;turnRef=steadyTurns(D,turnsAt);turnRef=steadyTurns(D,turnsAt);};turns();
 // Balance: the centre of mass planned against what holds the body at each moment, the hips moved to follow it. It
 // runs on the hands' final turns (a palm's angle decides when it first touches), which are then found again.
 const bal=balanceTraversal({duration:D,probe:contactProbe(worker),obstacles:edgeBoxes(LOW_WALL.edge,LOW_WALL.half,[[0,LOW_WALL.top]]),pose:t=>body.pose(spec(t),'balance'),com:P=>body.com(P),setMove:m=>{balance=m;},base:t=>fit.trunk(t).toArray()});
 // The tail is fitted again to the balanced motion, and the report taken on it (traversal-fit.js, fit.solveTail).
 balance=bal;fit.solveTail();turns();
 const KEYS=TRUNK.map(k=>({t:k.t,label:k.label}));let state=null;
 const api={duration:D,keys:KEYS,body,probe,obstacle:LOW_WALL,fit:fit.report,clearance:fit,balance:bal,phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();const [tp,ty]=fit.tail(time);tails.set(tp*DEG,ty*DEG);tails.squash(body.root);
   state={time,phase:api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){tails.restore();body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
