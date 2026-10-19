import {V,Q,DEG,clamp,track,spinTrack,bodyQ,yawQ,relQ,keyedLimb,posedFrom,createTraversalBody,createSurfaceProbe} from './traversal-pose.js';
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
// it faces the wall (near), feet and all.
const TRUNK=[
 {t:0,label:'Ready',hips:[0,.80,0],stand:true},
 {t:.40,label:'Step in',hips:[.10,.79,0],pitch:4,nod:-10,stand:true,near:true},
 {t:.62,label:'Crouch',hips:[.08,.62,0],pitch:14,flex:4,nod:-30,turn:40,stand:true,near:true},
 {t:.88,label:'Jump and catch',hips:[.25,1.20,0],pitch:-4,flex:-2,nod:-10,turn:40,hang:true},
 {t:1.12,label:'Hang',hips:[.25,1.14,0],pitch:-8,flex:-2,nod:-8,turn:40,hang:true},
 {t:1.52,label:'Walk up the face',hips:[.24,1.36,0],pitch:-12,flex:2,nod:-8,turn:40,hang:true},
 {t:1.92,label:'Chest over the top',hips:[.30,1.86,0],pitch:34,flex:14,nod:-5,turn:30,hang:true},
 {t:2.32,label:'Right knee up',hips:[.42,2.12,.04],pitch:62,roll:-18,flex:10,nod:-5,turn:15},
 {t:2.72,label:'Straddle',hips:[.50,2.22,0],pitch:16,roll:-6,heading:-40,flex:6,nod:-8},
 {t:3.12,label:'Left leg over',hips:[.66,1.96,0],pitch:30,heading:-130,flex:10,nod:-10,turn:-20},
 {t:3.52,label:'Lower down the far face',hips:[.72,1.24,0],pitch:-6,heading:-180,flex:-2,nod:-8,turn:-40,hang:true},
 {t:3.62,label:'Let go',hips:[.73,1.20,0],pitch:-4,heading:-180,flex:-2,nod:-8,turn:-40,hang:true},
 {t:3.82,label:'Drop',hips:[.82,.80,0],pitch:6,heading:-180,flex:4,nod:-10,turn:-40,stand:true},
 {t:4.05,label:'Absorb',hips:[.90,.66,0],pitch:6,heading:-180,flex:6,nod:-5,turn:-40,stand:true},
 {t:4.35,label:'Stand',hips:[.88,.80,0],heading:-180,turn:-20,stand:true},
 {t:4.85,label:'Turn onto the tile',hips:[1,.80,0],heading:-360,stand:true},
];
export function createWallClimb(worker,profile={id:'horse'}){
 const body=createTraversalBody(worker),tails=createTailBend(worker),probe=createSurfaceProbe(worker,{stride:2,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),fitB=bodyFit(body,probe),back=fitB.back,D=TRUNK.at(-1).t;
 const keys=TRUNK.map(k=>({...k,hips:[k.hips[0]-(k.near?back:0),k.stand?fitB.stand(k.hips[1]):k.hang?fitB.hang(k.hips[1]):k.hips[1],k.hips[2]]}));
 const posTrack=track(keys.map(k=>[k.t,...k.hips])),rotTrack=spinTrack(keys.map(k=>[k.t,yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG))]));
 const shape=track(keys.map(k=>[k.t,k.flex||0,k.side||0,k.twist||0,k.nod||0,k.tilt||0,k.turn||0]));
 let fit=null;
 function trunkAt(t){const [flex,side,twist,nod,tilt,turn]=shape(clamp(t,0,D));let hips=V(...posTrack(t)),hipsQ=rotTrack(t),headQ=relQ(nod,tilt,turn);const spineQ=relQ(flex,side,twist);
  if(fit){hips.add(fit.trunk(t));const bow=fit.bow(t);if(bow)hipsQ=hipsQ.clone().multiply(bodyQ(bow*DEG));const h=fit.head(t);if(h[0]||h[1]||h[2])headQ=headQ.multiply(relQ(...h));}
  return {hips,hipsQ,spineQ,headQ,chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))};}
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray(),ANKLE=fitB.ankle,top=WALL.top+.07;
 // The crouched hooves push off for the jump (lift).
 const foot=(x,z,hoof=0,heading=0,lift=0)=>({f:'world',p:[x,ANKLE,z],hoof,heading,lift}),stance=(s,dx=0)=>foot(fitB.foot(s,dx)[0],fitB.foot(s)[2]);
 // A hoof set flat against the near or far face: sole toward the wall (toe up), ankle a hoof's depth out.
 const onFace=(near,y,z)=>({f:'world',p:[near?WALL.edge-WALL.half-.12:WALL.edge+WALL.half+.12,y,z],hoof:-85,heading:near?0:180});
 const OUT=[.25,0,1]; // knees out to the sides while the hooves are on a wall face
 const LIMB={
  'leg-1':[[0,stance(-1)],[.40,foot(-.035-back,-.20)],[.62,foot(-.035-back,-.20,15,0,.25)],[.88,{f:'pelvis',p:[.02,-.62,-.13],hoof:20,knee:OUT}],[1.12,{...onFace(true,.46,-.16),knee:OUT}],[1.52,{...onFace(true,.80,-.16),knee:OUT}],[1.92,{...onFace(true,1.16,-.16),knee:OUT}],[2.32,{...onFace(true,1.42,-.16),knee:OUT}],[2.72,{f:'world',p:[.28,1.66,-.16],hoof:20}],[2.92,{f:'world',p:[.46,2.36,-.18],hoof:40}],[3.12,{f:'world',p:[.76,1.55,-.16],hoof:20}],[3.52,{...onFace(false,.56,-.16),knee:OUT}],[3.82,foot(.84,-.12)],[4.35,foot(.88,-.14)],[4.85,stance(-1,1)]],
  leg1:[[0,stance(1)],[.40,foot(.14-back,.14)],[.62,foot(.14-back,.14,15,0,.25)],[.88,{f:'pelvis',p:[.02,-.62,.13],hoof:20,knee:OUT}],[1.12,{...onFace(true,.58,.16),knee:OUT}],[1.52,{...onFace(true,.96,.16),knee:OUT}],[1.92,{...onFace(true,1.30,.16),knee:OUT}],[2.32,{f:'world',p:[.50,2.30,.22],hoof:50}],[2.52,{f:'world',p:[.70,2.10,.20],hoof:30}],[2.72,{f:'world',p:[.72,1.66,.16],hoof:20}],[3.12,{f:'world',p:[.76,1.45,.16],hoof:20}],[3.52,{...onFace(false,.70,.16),knee:OUT}],[3.82,foot(.84,.14)],[4.35,foot(.88,.16)],[4.85,stance(1,1)]],
  'arm-1':[[0,{f:'chest',p:restWrist(-1)}],[.40,{f:'chest',p:[.20,.15,-.30]}],[.62,{f:'chest',p:[.10,-.05,-.32]}],[.88,{f:'world',p:[.45,top,-.18],palm:0}],[2.72,{f:'world',p:[.46,top,-.18],palm:0}],[3.12,{f:'world',p:[.54,top,.20],palm:180}],[3.62,{f:'world',p:[.54,top,.20],palm:180}],[3.72,{f:'chest',p:[.10,.30,-.30]}],[3.90,{f:'chest',p:[.14,-.10,-.32]}],[4.35,{f:'chest',p:restWrist(-1)}],[4.85,{f:'chest',p:restWrist(-1)}]],
  arm1:[[0,{f:'chest',p:restWrist(1)}],[.40,{f:'chest',p:[.20,.15,.30]}],[.62,{f:'chest',p:[.10,-.05,.32]}],[.88,{f:'world',p:[.45,top,.18],palm:0}],[2.72,{f:'world',p:[.46,top,.18],palm:0}],[3.12,{f:'world',p:[.54,top,-.20],palm:180}],[3.62,{f:'world',p:[.54,top,-.20],palm:180}],[3.72,{f:'chest',p:[.10,.30,.30]}],[3.90,{f:'chest',p:[.14,-.10,.32]}],[4.35,{f:'chest',p:restWrist(1)}],[4.85,{f:'chest',p:restWrist(1)}]],
 };
 const spec=t=>{const tr=trunkAt(t),limbs={};for(const id of Object.keys(LIMB))limbs[id]=keyedLimb(LIMB[id],t,tr);return posedFrom(tr,limbs);};
 // Fit this character's surface: trunk, head and tail out of the floor and the wall.
 fit=createClearanceFit(D);fit.solve({body,probe,tails,obstacles:edgeBoxes(WALL.edge,WALL.half,[[0,WALL.top]]),poseAt:t=>body.pose(spec(t),'fit'),stage:t=>t<1.7?'near':t<3.3?'over':'far'});
 const KEYS=TRUNK.map(k=>({t:k.t,label:k.label}));let state=null;
 const api={duration:D,keys:KEYS,body,probe,obstacle:WALL,fit:fit.report,clearance:fit,phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();const [tp,ty]=fit.tail(time);tails.set(tp*DEG,ty*DEG);
   state={time,phase:api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){tails.restore();body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
