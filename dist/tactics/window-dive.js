import * as T from './vendor/three.module.js';
import {V,Q,DEG,clamp,smooth,track,spinTrack,bodyQ,createTraversalBody,createSurfaceProbe} from './traversal-pose.js';
// Head-first window entry and roll (docs/tactics/NATURAL-TRAVERSAL.md). Local frame: start on the tile at the
// origin facing +X, the window on the edge at X = .5 (faces .42 and .58, sill top .85, opening top 1.55),
// finish standing on the next tile's centre (1, 0, 0) facing on.
// These characters cannot tuck the chin (measured nod limit 0-35 degrees), so the roll starts with the chest flat on
// its back, spine curled, and the neck lying back along the floor. That points the head back toward the window,
// so the roll runs across the tile, along the wall (ROLL.dir from +X): the head clears the wall face, the roll's
// travel fits the tile, and the character comes up out of the window's line.
export const WINDOW={edge:.5,half:.08,sill:.85,top:1.55};
export const ROLL=Object.freeze({dir:68,start:2.40,end:2.85,turn:85,flex:40,back:[.92,-.42]});
const basisQ=(x,y)=>{const Y=V(...y).normalize(),X=V(...x).addScaledVector(Y,-V(...x).dot(Y)).normalize();return Q().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,X.clone().cross(Y)));};
// Palm on a surface: palm normal (+X of the hand) into the surface, wrist (+Y) back along the forearm, fingers
// toward heading (degrees from +X toward +Z).
const palmDown=(heading=0)=>{const a=heading*DEG;return basisQ([0,-1,0],[-Math.cos(a),0,-Math.sin(a)]);};
const yawQ=deg=>Q().setFromAxisAngle(V(0,1,0),-deg*DEG);
const relQ=(flex=0,side=0,twist=0)=>Q().setFromAxisAngle(V(0,1,0),twist*DEG).multiply(Q().setFromAxisAngle(V(1,0,0),side*DEG)).multiply(bodyQ(flex*DEG));
// Keyed trunk before the roll: time, label, hips [x, y, z], pelvis pitch / roll / heading (degrees: pitch forward,
// past 180 inverted; heading from +X toward +Z). The last keyed pose before the roll is built from the roll itself.
const PRE=[
 {t:0,label:'Ready',hips:[0,.80,0]},
 {t:.55,label:'Step in',hips:[.08,.79,-.16],pitch:8},
 {t:.90,label:'Hands on the sill',hips:[.12,.74,-.20],pitch:28},
 {t:1.25,label:'Hop onto the sill',hips:[.34,.98,-.24],pitch:82},
 {t:1.60,label:'Slide over',hips:[.50,1.03,-.28],pitch:115,heading:10},
 {t:2.00,label:'Reach for the floor',hips:[.70,.96,-.32],pitch:155,heading:40,roll:-5},
 {t:2.22,label:'Hands to the floor',hips:[.90,.76,-.30],pitch:195,heading:58,roll:-5},
];
const TURN=35; // the head turns this way coming down, so the muzzle stays off the wall
// Spine and head (relative to their parents) over the whole motion: flex / side / twist, nod / tilt / turn.
const SHAPE=[[0,0,0,0,0,0,0],[.55,5,0,0,0,0,0],[.90,8,0,0,-10,0,0],[1.25,6,0,0,-25,0,0],[1.60,10,0,0,-30,0,0],[2.00,25,0,0,-20,0,TURN],[2.22,32,0,0,-10,0,TURN],
 [ROLL.start,ROLL.flex,0,0,0,0,-15],[ROLL.end,ROLL.flex,0,0,0,0,-5],[ROLL.end+.40,15,0,0,-5,0,0],[ROLL.end+1.0,0,0,0,0,0,0]];
const END=ROLL.end+1.0;
export function createWindowDive(worker,profile={id:'horse'}){
 const body=createTraversalBody(worker),probe=createSurfaceProbe(worker,{stride:2}),D=END;
 const shape=track(SHAPE);
 const shapeAt=t=>{const [flex,side,twist,nod,tilt,turn]=shape(clamp(t,0,D));return {spineQ:relQ(flex,side,twist),headQ:relQ(nod,tilt,turn)};};
 const chestOf=(hips,hipsQ,spineQ)=>({chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))});
 const toWorld=(tr,frame,p)=>frame==='world'?V(...p):frame==='pelvis'?V(...p).applyQuaternion(tr.hipsQ).add(tr.hips):V(...p).applyQuaternion(tr.chestQ).add(tr.chest);
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray();
 const d=V(Math.cos(ROLL.dir*DEG),0,Math.sin(ROLL.dir*DEG)),axis=V(0,1,0).cross(d).normalize();
 // The rolling shape, in the trunk's own frames: legs tucked to the chest, arms in.
 const TUCK={'leg-1':[.30,.08,-.14],leg1:[.30,.10,.14],'arm-1':[.26,.05,-.28],arm1:[.30,.02,.10]};
 const posed=(tr,limbs,palms={})=>{const legs={},arms={};for(const s of [-1,1]){const l=limbs['leg'+s],a=limbs['arm'+s];
   legs[s]={ankle:toWorld(tr,l.f,l.p).toArray(),pole:V(1,0,s*.25).applyQuaternion(tr.hipsQ).toArray(),q:l.hoof!==undefined?bodyQ(l.hoof*DEG,0,(l.heading||0)):null};
   arms[s]={wrist:toWorld(tr,a.f,a.p).toArray(),pole:V(-.3,-.2,s).applyQuaternion(tr.chestQ).toArray(),q:palms[s]!==undefined?palmDown(palms[s]):null};}
  return {hips:tr.hips.toArray(),hipsQ:tr.hipsQ,spineQ:tr.spineQ,headQ:tr.headQ,legs,arms};};
 const tuckLimbs=Object.fromEntries(Object.entries(TUCK).map(([k,p])=>[k,{f:k.startsWith('leg')?'pelvis':'chest',p}]));
 const lowest=()=>{probe.update();return probe.lowest();};
 // ---- the roll: from the chest-flat start pose, turn about the floor contact under the body, step by step ----
 const s0=shapeAt(ROLL.start),q0=yawQ(ROLL.dir).multiply(bodyQ((270-ROLL.flex)*DEG));
 let p0=V(ROLL.back[0],.5,ROLL.back[1]);
 for(let i=0;i<4;i++){const tr={hips:p0,hipsQ:q0,...s0,...chestOf(p0,q0,s0.spineQ)};body.pose(posed(tr,tuckLimbs),'roll start');const L=lowest();p0=p0.clone().add(V(ROLL.back[0]-L.x,-L.y,ROLL.back[1]-L.z));}
 const STEPS=140,rollRows=[];{let q=q0.clone(),p=p0.clone();
  for(let k=0;k<=STEPS;k++){const u=k/STEPS,t=ROLL.start+u*(ROLL.end-ROLL.start),s=shapeAt(t),tr={hips:p,hipsQ:q,...s,...chestOf(p,q,s.spineQ)};
   body.pose(posed(tr,tuckLimbs),'roll '+t.toFixed(3));const L=lowest();if(k){p=p.clone().add(V(0,-L.y,0));}rollRows.push({t,p:p.clone(),q:q.clone(),contact:[L.x,0,L.z],part:L.part});
   if(k===STEPS)break;const th=(smooth((k+1)/STEPS)-smooth(k/STEPS))*ROLL.turn*DEG,r=Q().setFromAxisAngle(axis,th),c=V(L.x,0,L.z);q=r.clone().multiply(q);p=p.clone().sub(c).applyQuaternion(r).add(c);}}
 const rollAt=t=>{const u=clamp((t-ROLL.start)/(ROLL.end-ROLL.start))*STEPS,i=Math.min(STEPS-1,Math.floor(u)),f=u-i,a=rollRows[i],b=rollRows[i+1];return {hips:a.p.clone().lerp(b.p,f),hipsQ:a.q.clone().slerp(b.q,f),contact:a.contact,part:a.part};};
 const rEnd=rollRows.at(-1);
 // ---- keyed trunk: before the roll, then from the roll's end up to standing on the tile centre ----
 const preRows=PRE.map(k=>({t:k.t,p:V(...k.hips),q:yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG))}));
 const kneel={t:ROLL.end+.40,p:rEnd.p.clone().addScaledVector(d,.10).setY(.50),q:yawQ(ROLL.dir*.7).multiply(bodyQ(25*DEG))};
 const stand={t:END,p:V(1,.80,0),q:Q()};
 const trunkRows=[...preRows,{t:ROLL.start,p:p0,q:q0},{t:ROLL.end,p:rEnd.p,q:rEnd.q},kneel,stand];
 const posTrack=track(trunkRows.map(r=>[r.t,...r.p.toArray()])),rotTrack=spinTrack(trunkRows.map(r=>[r.t,r.q]));
 function trunkAt(t){const s=shapeAt(t);let hips,hipsQ;if(t>ROLL.start&&t<ROLL.end){const r=rollAt(t);hips=r.hips;hipsQ=r.hipsQ;}else{hips=V(...posTrack(t));hipsQ=rotTrack(t);}return {hips,hipsQ,...s,...chestOf(hips,hipsQ,s.spineQ)};}
 // ---- limbs: world targets where planted, the tuck through the roll ----
 const rest={leg:s=>({f:'world',p:body.at0('hoof'+s).toArray()}),arm:s=>({f:'chest',p:restWrist(s)})};
 // Hands are placed from where the shoulders really are at that key, so the short arms are never asked past
 // their reach: dangling toward a direction, or flat on the floor near below the shoulder.
 const REACH=s=>body.L[s].upper+body.L[s].fore,shoulderAt=(t,s)=>{const tr=trunkAt(t);return tr.chest.clone().add(body.offsets.shoulder[s].clone().applyQuaternion(tr.chestQ));};
 // A dangling hand rides with the chest (so it stays within reach between keys): the key is given as a world
 // direction from the shoulder at that time and stored in the chest frame.
 const dangle=(t,s,dir,k=.92)=>{const tr=trunkAt(t),w=shoulderAt(t,s).addScaledVector(V(...dir).normalize(),k*REACH(s));return {f:'chest',p:w.sub(tr.chest).applyQuaternion(tr.chestQ.clone().invert()).toArray()};};
 const floorHand=(t,s,off,palm)=>{const sh=shoulderAt(t,s),w=V(sh.x+off[0],.06,sh.z+off[2]),gap=w.distanceTo(sh),reach=.97*REACH(s);
  if(gap>reach)throw Error('Window dive: the '+(s<0?'left':'right')+' hand cannot reach the floor at '+t+' s ('+gap.toFixed(3)+' / '+reach.toFixed(3)+')');return {f:'world',p:w.toArray(),palm};};
 const LIMB={
  'leg-1':[[0,rest.leg(-1)],[.55,{f:'world',p:[-.035,.12,-.40]}],[.90,{f:'world',p:[-.035,.12,-.40]}],[1.25,{f:'world',p:[.13,.45,-.40],hoof:40}],[1.60,{f:'pelvis',p:[-.06,-.60,-.12],hoof:60}],[2.00,{f:'pelvis',p:[-.16,-.52,-.12],hoof:50}],[2.22,{f:'pelvis',p:[-.02,-.36,-.13],hoof:40}],[ROLL.start,{f:'pelvis',p:TUCK['leg-1']}],[ROLL.end,{f:'pelvis',p:TUCK['leg-1']}]],
  leg1:[[0,rest.leg(1)],[.55,{f:'world',p:[.20,.12,-.06]}],[.90,{f:'world',p:[.20,.12,-.06]}],[1.25,{f:'world',p:[.15,.47,-.14],hoof:40}],[1.60,{f:'pelvis',p:[-.06,-.60,.12],hoof:60}],[2.00,{f:'pelvis',p:[-.16,-.52,.12],hoof:50}],[2.22,{f:'pelvis',p:[-.02,-.36,.13],hoof:40}],[ROLL.start,{f:'pelvis',p:TUCK.leg1}],[ROLL.end,{f:'pelvis',p:TUCK.leg1}]],
  'arm-1':[[0,rest.arm(-1)],[.55,{f:'world',p:[.36,.92,-.42]}],[.90,{f:'world',p:[.44,.91,-.42],palm:0}],[1.25,{f:'world',p:[.47,.91,-.42],palm:0}],[1.60,dangle(1.60,-1,[.35,-1,-.05])],[2.00,dangle(2.00,-1,[.25,-1,-.10],.97)],[2.22,floorHand(2.22,-1,[.10,0,-.08],30)],[ROLL.start,floorHand(2.22,-1,[.10,0,-.08],30)],[ROLL.start+.12,{f:'chest',p:TUCK['arm-1']}],[ROLL.end,{f:'chest',p:TUCK['arm-1']}]],
  arm1:[[0,rest.arm(1)],[.55,{f:'world',p:[.36,.92,.02]}],[.90,{f:'world',p:[.44,.91,0],palm:0}],[1.25,{f:'world',p:[.47,.91,-.02],palm:0}],[1.60,dangle(1.60,1,[.35,-1,.05])],[2.00,dangle(2.00,1,[.25,-1,.10],.97)],[2.22,floorHand(2.22,1,[.12,0,.08],50)],[ROLL.start,floorHand(2.22,1,[.12,0,.08],50)],[ROLL.start+.12,{f:'chest',p:TUCK.arm1}],[ROLL.end,{f:'chest',p:TUCK.arm1}]],
 };
 // After the roll: the left shin down, the right foot planted, then the stance on the tile centre.
 const knee=rEnd.p.clone().addScaledVector(d,.32).setY(.07);
 LIMB['leg-1'].push([ROLL.end+.40,{f:'world',p:knee.clone().addScaledVector(d,-.34).setY(.16).add(V(0,0,-.05)).toArray(),hoof:60,heading:ROLL.dir}],[END,rest.leg(-1).p&&{f:'world',p:[1-.035,.12,-.232]}]);
 LIMB.leg1.push([ROLL.end+.40,{f:'world',p:rEnd.p.clone().addScaledVector(d,.38).add(V(.12,0,.10)).setY(.12).toArray(),hoof:0}],[END,{f:'world',p:[1-.035,.12,.232]}]);
 for(const s of [-1,1])LIMB['arm'+s].push([ROLL.end+.40,{f:'chest',p:restWrist(s)}],[END,{f:'chest',p:restWrist(s)}]);
 function limb(id,t,tr){const keys=LIMB[id];let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const [ta,a]=keys[i],[tb,b]=keys[Math.min(keys.length-1,i+1)];
  const u=tb>ta?smooth((t-ta)/(tb-ta)):1,pa=toWorld(tr,a.f,a.p),pb=toWorld(tr,b.f,b.p);
  return {f:'world',p:pa.lerp(pb,u).toArray(),hoof:a.hoof!==undefined||b.hoof!==undefined?T.MathUtils.lerp(a.hoof||0,b.hoof||0,u):undefined,heading:T.MathUtils.lerp(a.heading||0,b.heading||0,u),palm:u<.5?a.palm:b.palm};}
 function spec(t){const tr=trunkAt(t),limbs={},palms={};for(const id of Object.keys(LIMB)){const L=limb(id,t,tr);limbs[id]=L;if(L.palm!==undefined&&id.startsWith('arm'))palms[+id.slice(3)]=L.palm;}return posed(tr,limbs,palms);}
 const KEYS=[...PRE.map(k=>({t:k.t,label:k.label})),{t:ROLL.start,label:'Back to the floor'},{t:(ROLL.start+ROLL.end)/2,label:'Roll'},{t:ROLL.end,label:'Roll onto the hip'},{t:kneel.t,label:'Up on one knee'},{t:END,label:'Stand on the tile'}];
 let state=null;
 const api={duration:D,keys:KEYS,body,probe,roll:{rows:rollRows,dir:ROLL.dir,start:ROLL.start,end:ROLL.end},
  phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();
   const phase=api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label;state={time,phase,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
