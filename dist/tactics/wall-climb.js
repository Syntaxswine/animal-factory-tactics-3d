import {V,Q,DEG,clamp,track,spinTrack,bodyQ,yawQ,relQ,keyedLimb,posedFrom,createTraversalBody,createSurfaceProbe} from './traversal-pose.js';
// Climb over a 2 m wall (docs/tactics/NATURAL-TRAVERSAL.md). Local frame: start on the tile at the origin facing +X,
// the wall on the edge at X = .5 (faces .42 and .58, top 2.0), finish standing on the next tile's centre (1, 0, 0)
// facing on. The top is 0.35 above the head and the standing palm reach is about 1.71, so: a jump to catch the top,
// hang with the hooves on the face, walk up and pull until the chest is over, hook the right knee up and straddle the
// 16 cm top, bring the left leg over turning to face the wall, lower down the far face, drop the last few
// centimetres, then turn round onto the tile centre.
export const WALL=Object.freeze({edge:.5,half:.08,top:2.0});
const TRUNK=[
 {t:0,label:'Ready',hips:[0,.80,0]},
 {t:.40,label:'Step in',hips:[.10,.79,0],pitch:5},
 {t:.65,label:'Crouch',hips:[.13,.62,0],pitch:18,flex:6,nod:-25},
 {t:.90,label:'Jump and catch',hips:[.22,1.12,0],pitch:-4,flex:-4,nod:-30},
 {t:1.15,label:'Hang',hips:[.19,1.06,0],pitch:-8,flex:-2,nod:-20},
 {t:1.55,label:'Walk up the face',hips:[.22,1.34,0],pitch:-14,flex:4,nod:-15},
 {t:1.95,label:'Chest over the top',hips:[.28,1.72,0],pitch:32,flex:14,nod:-5},
 {t:2.35,label:'Right knee up',hips:[.40,2.02,.04],pitch:62,roll:-18,flex:10,nod:-5},
 {t:2.75,label:'Straddle',hips:[.50,2.13,0],pitch:18,roll:-6,heading:-40,flex:6,nod:-8},
 {t:3.15,label:'Left leg over',hips:[.62,1.86,0],pitch:30,heading:-130,flex:10,nod:-10},
 {t:3.55,label:'Lower down the far face',hips:[.72,1.20,0],pitch:-6,heading:-180,flex:-2,nod:-20},
 {t:3.85,label:'Drop',hips:[.80,.76,0],pitch:6,heading:-180,flex:4,nod:-10},
 {t:4.10,label:'Absorb',hips:[.79,.66,0],pitch:18,heading:-180,flex:8,nod:-5},
 {t:4.40,label:'Stand',hips:[.82,.80,0],heading:-180},
 {t:4.90,label:'Turn onto the tile',hips:[1,.80,0],heading:-360},
];
export function createWallClimb(worker,profile={id:'horse'}){
 const body=createTraversalBody(worker),probe=createSurfaceProbe(worker,{stride:2}),D=TRUNK.at(-1).t;
 const posTrack=track(TRUNK.map(k=>[k.t,...k.hips])),rotTrack=spinTrack(TRUNK.map(k=>[k.t,yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG))]));
 const shape=track(TRUNK.map(k=>[k.t,k.flex||0,k.side||0,k.twist||0,k.nod||0,k.tilt||0,k.turn||0]));
 function trunkAt(t){const [flex,side,twist,nod,tilt,turn]=shape(clamp(t,0,D)),hips=V(...posTrack(t)),hipsQ=rotTrack(t),spineQ=relQ(flex,side,twist),headQ=relQ(nod,tilt,turn);
  return {hips,hipsQ,spineQ,headQ,chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))};}
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray(),ANKLE=body.at0('hoof1').y,top=WALL.top+.07;
 const foot=(x,z,hoof=0,heading=0)=>({f:'world',p:[x,ANKLE,z],hoof,heading});
 // A hoof set flat against the near or far face: sole toward the wall (toe up), ankle a hoof's depth out.
 const onFace=(near,y,z)=>({f:'world',p:[near?WALL.edge-WALL.half-.13:WALL.edge+WALL.half+.13,y,z],hoof:near?-80:-80,heading:near?0:180});
 const LIMB={
  'leg-1':[[0,foot(-.035,-.232)],[.40,foot(-.035,-.20)],[.65,foot(-.035,-.20,15)],[.90,{f:'pelvis',p:[.10,-.62,-.13],hoof:20}],[1.15,onFace(true,.50,-.13)],[1.55,onFace(true,.82,-.13)],[1.95,onFace(true,1.14,-.13)],[2.35,onFace(true,1.40,-.13)],[2.75,{f:'pelvis',p:[-.04,-.55,-.14],hoof:20}],[2.95,{f:'world',p:[.50,2.34,-.18],hoof:40}],[3.15,{f:'world',p:[.74,1.55,-.16],hoof:20}],[3.55,onFace(false,.62,-.13)],[3.85,foot(.80,-.12)],[4.40,foot(.80,-.14)],[4.90,foot(1-.035,-.232)]],
  leg1:[[0,foot(-.035,.232)],[.40,foot(.16,.14)],[.65,foot(.16,.14,15)],[.90,{f:'pelvis',p:[.10,-.62,.13],hoof:20}],[1.15,onFace(true,.62,.13)],[1.55,onFace(true,.98,.13)],[1.95,onFace(true,1.30,.13)],[2.35,{f:'world',p:[.50,2.30,.22],hoof:50}],[2.55,{f:'world',p:[.70,2.10,.20],hoof:30}],[2.75,{f:'pelvis',p:[.16,-.55,.14],hoof:20}],[3.15,{f:'world',p:[.76,1.45,.16],hoof:20}],[3.55,onFace(false,.74,.13)],[3.85,foot(.80,.14)],[4.40,foot(.80,.16)],[4.90,foot(1-.035,.232)]],
  'arm-1':[[0,{f:'chest',p:restWrist(-1)}],[.40,{f:'chest',p:[.20,.15,-.30]}],[.65,{f:'chest',p:[.18,.30,-.28]}],[.90,{f:'world',p:[.48,top,-.18],palm:0}],[2.75,{f:'world',p:[.48,top,-.18],palm:0}],[3.15,{f:'world',p:[.52,top,-.20],palm:180}],[3.55,{f:'world',p:[.52,top,-.20],palm:180}],[3.80,{f:'chest',p:[.16,.20,-.30]}],[4.40,{f:'chest',p:restWrist(-1)}],[4.90,{f:'chest',p:restWrist(-1)}]],
  arm1:[[0,{f:'chest',p:restWrist(1)}],[.40,{f:'chest',p:[.20,.15,.30]}],[.65,{f:'chest',p:[.18,.30,.28]}],[.90,{f:'world',p:[.48,top,.18],palm:0}],[2.75,{f:'world',p:[.48,top,.18],palm:0}],[3.15,{f:'world',p:[.52,top,.20],palm:180}],[3.55,{f:'world',p:[.52,top,.20],palm:180}],[3.80,{f:'chest',p:[.16,.20,.30]}],[4.40,{f:'chest',p:restWrist(1)}],[4.90,{f:'chest',p:restWrist(1)}]],
 };
 const spec=t=>{const tr=trunkAt(t),limbs={};for(const id of Object.keys(LIMB))limbs[id]=keyedLimb(LIMB[id],t,tr);return posedFrom(tr,limbs);};
 const KEYS=TRUNK.map(k=>({t:k.t,label:k.label}));let state=null;
 const api={duration:D,keys:KEYS,body,probe,obstacle:WALL,phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();
   state={time,phase:api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
