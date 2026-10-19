import {V,Q,DEG,clamp,track,spinTrack,bodyQ,yawQ,relQ,frameToWorld,keyedLimb,posedFrom,createTraversalBody,createSurfaceProbe} from './traversal-pose.js';
// Side vault over a waist-high wall (docs/tactics/NATURAL-TRAVERSAL.md). Local frame: start on the tile at the
// origin facing +X, the wall on the edge at X = .5 (faces .42 and .58, top 1.0), finish standing on the next tile's
// centre (1, 0, 0) facing on. Both hands go on the top; the jump swings the legs up in front and over the wall to the
// right of the hands while the trunk leans left over the arms; the hips pass just over the top, the hands push off
// and the vault lands on the far side, then steps onto the tile centre.
export const LOW_WALL=Object.freeze({edge:.5,half:.08,top:1.0});
// Keyed trunk: time, label, hips [x, y, z], pelvis pitch / roll / heading (degrees), chest flex / side / twist and
// head nod / tilt / turn (relative).
const TRUNK=[
 {t:0,label:'Ready',hips:[0,.80,0]},
 {t:.40,label:'Step in',hips:[.05,.79,0],pitch:6,flex:4},
 {t:.65,label:'Hands on the wall',hips:[.08,.73,-.02],pitch:22,flex:8,nod:-24},
 {t:.82,label:'Load',hips:[.08,.67,-.02],pitch:30,flex:8,nod:-30},
 {t:.98,label:'Spring',hips:[.22,1.16,.18],pitch:42,roll:-22,flex:10,side:-12,nod:-12,turn:-15},
 {t:1.10,label:'Legs up and out',hips:[.36,1.36,.34],pitch:40,roll:-40,flex:12,side:-20,nod:-8,turn:-25},
 {t:1.22,label:'Legs over',hips:[.52,1.32,.32],pitch:22,roll:-32,flex:10,side:-18,nod:-5,turn:-20},
 {t:1.36,label:'Down the far side',hips:[.74,1.12,.24],pitch:6,roll:-18,flex:6,side:-10,nod:-5,turn:-10},
 {t:1.50,label:'Hands off',hips:[.86,.92,.14],pitch:2,roll:-6,flex:3,side:-4},
 {t:1.64,label:'Land',hips:[.93,.72,.08],pitch:14,flex:8,nod:-5},
 {t:2.00,label:'Absorb',hips:[.96,.78,.04],pitch:6,flex:3},
 {t:2.40,label:'Settle on the tile',hips:[1,.80,0]},
];
export function createWallVault(worker,profile={id:'horse'}){
 const body=createTraversalBody(worker),probe=createSurfaceProbe(worker,{stride:2}),D=TRUNK.at(-1).t;
 const posTrack=track(TRUNK.map(k=>[k.t,...k.hips])),rotTrack=spinTrack(TRUNK.map(k=>[k.t,yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG))]));
 const shape=track(TRUNK.map(k=>[k.t,k.flex||0,k.side||0,k.twist||0,k.nod||0,k.tilt||0,k.turn||0]));
 function trunkAt(t){const [flex,side,twist,nod,tilt,turn]=shape(clamp(t,0,D)),hips=V(...posTrack(t)),hipsQ=rotTrack(t),spineQ=relQ(flex,side,twist),headQ=relQ(nod,tilt,turn);
  return {hips,hipsQ,spineQ,headQ,chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))};}
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray(),ANKLE=body.at0('hoof1').y,top=LOW_WALL.top+.07;
 // Hooves: planted in the world where they stand, tucked in the pelvis frame in the air. Palms flat on the top.
 const foot=(x,z,hoof=0,heading=0)=>({f:'world',p:[x,ANKLE,z],hoof,heading});
 const LIMB={
  'leg-1':[[0,foot(-.035,-.232)],[.40,foot(-.035,-.20)],[.65,foot(-.035,-.20)],[.82,foot(-.035,-.20,20)],[.98,{f:'pelvis',p:[.14,-.18,-.16],hoof:40}],[1.10,{f:'pelvis',p:[.26,.02,-.10],hoof:30}],[1.22,{f:'pelvis',p:[.44,-.08,-.10],hoof:15}],[1.36,{f:'pelvis',p:[.30,-.42,-.11],hoof:5}],[1.50,{f:'pelvis',p:[.12,-.62,-.12],hoof:0}],[1.64,foot(.92,-.06)],[2.00,foot(.92,-.06)],[2.40,foot(1-.035,-.232)]],
  leg1:[[0,foot(-.035,.232)],[.40,foot(.06,.16)],[.65,foot(.06,.16)],[.82,foot(.06,.16,20)],[.98,{f:'pelvis',p:[.18,-.14,.18],hoof:40}],[1.10,{f:'pelvis',p:[.30,.08,.18],hoof:30}],[1.22,{f:'pelvis',p:[.46,-.02,.16],hoof:15}],[1.36,{f:'pelvis',p:[.34,-.38,.14],hoof:5}],[1.50,{f:'pelvis',p:[.14,-.60,.13],hoof:0}],[1.64,foot(.98,.22)],[2.00,foot(.98,.22)],[2.40,foot(1-.035,.232)]],
  'arm-1':[[0,{f:'chest',p:restWrist(-1)}],[.40,{f:'world',p:[.44,1.12,-.18]}],[.65,{f:'world',p:[.53,top,-.18],palm:0}],[1.36,{f:'world',p:[.53,top,-.18],palm:0}],[1.50,{f:'chest',p:[.14,-.30,-.30]}],[1.64,{f:'chest',p:[.08,-.36,-.30]}],[2.40,{f:'chest',p:restWrist(-1)}]],
  arm1:[[0,{f:'chest',p:restWrist(1)}],[.40,{f:'world',p:[.44,1.12,.10]}],[.65,{f:'world',p:[.53,top,.10],palm:0}],[.98,{f:'world',p:[.53,top,.10],palm:0}],[1.10,{f:'chest',p:[.16,-.20,.36]}],[1.64,{f:'chest',p:[.08,-.36,.30]}],[2.40,{f:'chest',p:restWrist(1)}]],
 };
 const spec=t=>{const tr=trunkAt(t),limbs={};for(const id of Object.keys(LIMB))limbs[id]=keyedLimb(LIMB[id],t,tr);return posedFrom(tr,limbs);};
 const KEYS=TRUNK.map(k=>({t:k.t,label:k.label}));let state=null;
 const api={duration:D,keys:KEYS,body,probe,obstacle:LOW_WALL,phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();
   state={time,phase:api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
