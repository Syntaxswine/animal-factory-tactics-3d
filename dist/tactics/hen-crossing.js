import * as T from './vendor/three.module.js';
import {clamp,smooth,track} from './traversal-pose.js';
import {createHenLadderMotion} from './hen-ladder-motion.js';
import {LADDER_PRESETS} from './ladder-motion.js';
import {guardHenConstruction} from './hen-rig-transaction.js';
// The hen's crossings (docs/tactics/NATURAL-TRAVERSAL.md). She has wings and no hands, so no roll or vault: she hops
// up onto the sill or the wall top on her wings and down the other side. Local frame as the mammals' crossings: start
// on the tile at the origin facing +X, the obstacle on the edge at X = .5 (faces .42 and .58), finish on the next
// tile's centre. The rig is the one the hen's ladder and roof mantle use (thighs added, wing and leg IK).
//   window: the opening is .70 tall and she stands 1.65, so she sits on the sill the way a hen sits a perch, legs
//   folded under and body tipped flat (it then spans about .94 to 1.54), ducks through and flutters down.
//   low-wall and wall: nothing above, so she perches upright on the top, then flutters down.
const DEG=Math.PI/180,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
// Keys: time, label, root [x, y, z] (the ground point under her, at the feet's level), crouch (how far the pelvis sinks,
// m), pitch (forward tip of the body, degrees), breast and head (forward bend, degrees), wings {spread, sweep, raise}
// (degrees: out to the side, forward, and forward-up) with flap (beat amplitude, degrees), feet ('ground' at the root,
// 'tuck' under the body, 'tight' drawn up against the belly, or {y, x, z}: planted at that height at root x + x,
// z = +-z), tail (0 spread, 1 gathered upright), cloth (0..1: apron and waist tie drawn in, as on the ladder).
const FOLDED={spread:0,sweep:0,raise:0};
const HOP=(spread,raise=20)=>({spread,sweep:10,raise}),PERCH={spread:28,sweep:0,raise:0};
// The window is threaded: the head goes in low and early (pitch about 45 degrees as it reaches the wall), the body rises
// onto the sill as it flattens to 90, so the comb (.88 above the pelvis) never sweeps the wall above the opening; flat,
// with the tail fan gathered (tail 1), she spans .86 to 1.54 between the sill (.85) and the lintel (1.55).
// Coming down she clears the wall before she drops below its top: her rump trails .3 to .5 behind her, so from the
// window she launches forward still flat and comes upright only once it is past the far face; from a wall top she hops
// out and flutters down almost straight.
const CROSSINGS={
 window:{top:.85,keys:[
  {t:0,label:'Ready',root:[0,0,0],feet:'ground'},
  {t:.30,label:'Crouch',root:[-.06,0,0],crouch:.22,pitch:34,head:4,wings:HOP(25,0),feet:'ground',tail:.4},
  {t:.50,label:'Wing-assisted hop',root:[.01,.26,0],crouch:.12,pitch:52,head:12,wings:HOP(85,35),flap:45,feet:'tuck',tail:.8},
  {t:.66,label:'Head through',root:[.14,.44,0],crouch:.12,pitch:68,head:12,wings:HOP(55,20),flap:30,feet:'tuck',tail:1},
  {t:.84,label:'Onto the sill',root:[.34,.85,0],crouch:.415,pitch:90,head:8,wings:FOLDED,feet:{y:.85,x:.12,z:.12},tail:1,cloth:1},
  {t:1.15,label:'Duck through',root:[.40,.85,0],crouch:.415,pitch:92,breast:4,head:6,wings:FOLDED,feet:{y:.85,x:.08,z:.12},tail:1,cloth:1},
  {t:1.40,label:'Lean over the far side',root:[.46,.85,0],crouch:.40,pitch:118,breast:6,head:-10,wings:HOP(25,0),feet:{y:.85,x:.03,z:.12},tail:1,cloth:1},
  {t:1.55,label:'Launch off the sill',root:[.72,.85,0],crouch:.40,pitch:95,head:-5,wings:HOP(80,20),flap:40,feet:'tight',tail:1,cloth:1},
  {t:1.72,label:'Fly clear',root:[1.02,.78,0],crouch:.40,pitch:70,head:-5,wings:HOP(85,20),flap:40,feet:'tight',tail:1,cloth:.5},
  {t:1.86,label:'Come upright',root:[1.04,.62,0],crouch:.30,pitch:40,head:-5,wings:HOP(85,25),flap:30,feet:'tight',tail:.9},
  {t:2.06,label:'Land',root:[1,0,0],crouch:.24,pitch:20,head:-5,wings:HOP(70,15),feet:'ground',tail:.8},
  {t:2.36,label:'Fold the wings',root:[1,0,0],crouch:.06,pitch:6,wings:PERCH,feet:'ground',tail:.6},
  {t:2.72,label:'Settle on the tile',root:[1,0,0],feet:'ground'}]},
 'low-wall':{top:1.0,keys:[
  {t:0,label:'Ready',root:[0,0,0],feet:'ground'},
  {t:.35,label:'Crouch',root:[-.02,0,0],crouch:.20,pitch:25,head:-10,wings:HOP(25,0),feet:'ground',tail:.2},
  {t:.62,label:'Wing-assisted hop',root:[.04,.88,0],crouch:.10,pitch:30,head:-5,wings:HOP(85,35),flap:45,feet:'tuck',tail:.6},
  {t:.84,label:'Onto the wall',root:[.38,1.0,0],crouch:.24,pitch:24,wings:HOP(55,10),flap:15,feet:{y:1.0,x:.11,z:.12},tail:.5},
  {t:1.20,label:'Perch',root:[.40,1.0,0],crouch:.10,pitch:10,wings:PERCH,feet:{y:1.0,x:.09,z:.12},tail:.3},
  {t:1.42,label:'Lean off',root:[.43,1.0,0],crouch:.18,pitch:35,head:-15,wings:HOP(35,0),feet:{y:1.0,x:.07,z:.12},tail:.5},
  {t:1.56,label:'Hop off',root:[.66,1.12,0],crouch:.08,pitch:25,head:-10,wings:HOP(85,25),flap:40,feet:'tuck',tail:.9},
  {t:1.72,label:'Clear the wall',root:[.93,.80,0],crouch:.08,pitch:25,head:-10,wings:HOP(85,25),flap:40,feet:'tuck',tail:.9},
  {t:1.90,label:'Flutter down',root:[.98,.30,0],crouch:.12,pitch:20,head:-8,wings:HOP(80,25),flap:30,feet:'tuck',tail:.9},
  {t:2.04,label:'Land',root:[1,0,0],crouch:.24,pitch:18,head:-5,wings:HOP(70,15),feet:'ground',tail:.9},
  {t:2.34,label:'Fold the wings',root:[1,0,0],crouch:.06,pitch:6,wings:PERCH,feet:'ground',tail:.7},
  {t:2.70,label:'Settle on the tile',root:[1,0,0],feet:'ground'}]},
 wall:{top:2.0,keys:[
  {t:0,label:'Ready',root:[0,0,0],feet:'ground'},
  {t:.40,label:'Crouch',root:[-.04,0,0],crouch:.24,pitch:20,head:-20,wings:HOP(30,0),feet:'ground',tail:.3},
  {t:.66,label:'Spring',root:[-.04,.70,0],crouch:.04,pitch:8,head:-15,wings:HOP(90,40),flap:50,feet:'tuck',tail:.6},
  {t:1.04,label:'Beat up the face',root:[-.02,1.64,0],crouch:.06,pitch:12,head:-10,wings:HOP(90,40),flap:50,feet:'tuck',tail:.8},
  {t:1.20,label:'Over the top',root:[.10,2.10,0],crouch:.10,pitch:20,head:-5,wings:HOP(80,25),flap:35,feet:'tuck',tail:.8},
  {t:1.36,label:'Onto the wall',root:[.38,2.0,0],crouch:.26,pitch:28,wings:HOP(60,10),flap:15,feet:{y:2.0,x:.11,z:.12},tail:.6},
  {t:1.74,label:'Perch',root:[.40,2.0,0],crouch:.10,pitch:10,head:5,wings:PERCH,feet:{y:2.0,x:.09,z:.12},tail:.3},
  {t:1.96,label:'Lean off',root:[.43,2.0,0],crouch:.18,pitch:35,head:-20,wings:HOP(40,0),feet:{y:2.0,x:.07,z:.12},tail:.5},
  {t:2.12,label:'Hop off',root:[.68,2.14,0],crouch:.08,pitch:25,head:-10,wings:HOP(95,20),flap:30,feet:'tuck',tail:.9},
  {t:2.34,label:'Clear the wall',root:[.94,1.70,0],crouch:.06,pitch:22,head:-10,wings:HOP(95,20),flap:25,feet:'tuck',tail:.9},
  {t:2.58,label:'Glide down',root:[.98,.60,0],crouch:.08,pitch:18,head:-8,wings:HOP(95,25),flap:20,feet:'tuck',tail:.9},
  {t:2.78,label:'Flare and land',root:[1,0,0],crouch:.26,pitch:12,head:-5,wings:HOP(80,30),flap:10,feet:'ground',tail:.9},
  {t:3.08,label:'Fold the wings',root:[1,0,0],crouch:.06,pitch:5,wings:PERCH,feet:'ground',tail:.7},
  {t:3.44,label:'Settle on the tile',root:[1,0,0],feet:'ground'}]},
};
export const HEN_CROSSINGS=Object.freeze(Object.keys(CROSSINGS));
const FLAP_HZ=5;
export function createHenCrossing(worker,profile,kind){return guardHenConstruction(worker,()=>build(worker,profile,kind));}
function build(worker,profile,kind){
 const plan=CROSSINGS[kind];if(profile?.id!=='hen'||!plan)throw Error('No hen crossing for '+kind);
 const rig=createHenLadderMotion(worker,LADDER_PRESETS.tower),root=worker.root,named=Object.fromEntries(rig.skeleton.bones.map(b=>[b.name,b]));
 const keys=plan.keys,D=keys.at(-1).t,feet=rig.limbs.filter(l=>l.id.startsWith('foot')),pelvisY=named.pelvis.position.y;
 const num=k=>[...k.root,k.crouch||0,k.pitch||0,k.breast||0,k.head||0,...['spread','sweep','raise'].map(n=>(k.wings||FOLDED)[n]),k.flap||0,k.tail||0,k.cloth||0];
 const channels=track(keys.map(k=>[k.t,...num(k)]));
 const phases=keys.slice(0,-1).map((k,i)=>({label:keys[i+1].label,start:k.t,end:keys[i+1].t}));
 // Where each foot is at a key, in the local frame; a tucked foot rides under the body.
 const footAt=(k,s)=>{const f=k.feet;if(f==='tuck'||f==='tight')return null;if(f==='ground')return V(k.root[0]+.09,k.root[1],s*.157);return V(k.root[0]+f.x,f.y,s*f.z);};
 // In flight the feet ride under the body, or drawn up against the belly where they would trail into the wall.
 const TUCK={tuck:[.16,-.36],tight:[.22,-.20]};
 const tucked=(s,k)=>{const hip=named['thigh '+s].getWorldPosition(V()),q=named.pelvis.getWorldQuaternion(new T.Quaternion()),[tx,ty]=TUCK[k.feet]||TUCK.tuck;return hip.add(V(tx,ty,0).applyQuaternion(q));};
 let disposed=false,state=null;
 function at(time){
  const t=clamp(time,0,D),c=channels(t),[x,y,z,crouch,pitch,breast,head,spread,sweep,raise,flap,tail,cloth]=c;
  rig.reset();root.position.set(x,y,z);named.pelvis.position.y=pelvisY-crouch;named.pelvis.rotation.set(0,0,-pitch*DEG);
  named.breast.rotation.z=-breast*DEG;named.head.rotation.z=-head*DEG;root.updateMatrixWorld(true);
  // Wings beat about their open pose while flap is up: down-strokes lead, a beat every 1 / FLAP_HZ s.
  const beat=flap*Math.sin(2*Math.PI*FLAP_HZ*t);
  for(const s of [-1,1])named['wing '+s].rotation.set(-s*(spread+beat)*DEG,s*sweep*DEG,raise*DEG);
  root.updateMatrixWorld(true);rig.tail(clamp(tail));rig.apron(clamp(cloth));rig.tie(clamp(cloth));
  // Feet: planted where the keys put them, tucked under the body in flight; between, carried from one to the other.
  let i=0;while(i<keys.length-2&&t>keys[i+1].t)i++;const a=keys[i],b=keys[i+1],u=smooth((t-a.t)/(b.t-a.t));
  const contacts=[];
  for(const l of feet){const s=l.side,pa=footAt(a,s),pb=footAt(b,s),tk=tucked(s,pa?b:a).lerp(tucked(s,pb?a:b),pa||pb?0:u);let target=(pa||tk).clone().lerp(pb||tk,u),planted=!!pa&&!!pb&&pa.distanceTo(pb)<1e-6;
   // A planted foot that moves between keys steps: it lifts and sets down.
   if(pa&&pb&&!planted)target.y+=.06*Math.sin(Math.PI*u);
   const start=l.a.getWorldPosition(V()),end=target.clone().sub(l.offset),axis=end.clone().sub(start),len=axis.length(),reach=clamp(len,Math.abs(l.la-l.lb)+.012,l.la+l.lb-.002);
   if(len!==reach){target=start.clone().addScaledVector(axis,reach/len).add(l.offset);planted=false;}
   rig.solve(l,target);contacts.push({id:l.id,side:s,point:target.toArray(),planted});}
  root.updateMatrixWorld(true);rig.skeleton.update();
  const phase=phases.find(p=>t<=p.end)?.label||keys.at(-1).label;
  return state={time:t,phase,contacts,airborne:contacts.every(c=>!c.planted),points:{pelvis:named.pelvis.getWorldPosition(V()).toArray()}};}
 const api={duration:D,keys:keys.map(k=>({t:k.t,label:k.label})),phases,obstacle:{edge:.5,half:.08,top:plan.top},climb:{skeleton:rig.skeleton},
  at,apply(progress,{origin=[0,0,0],heading=0}={}){if(disposed)throw Error('Hen crossing disposed');const r=at(clamp(progress)*D),local=root.position.clone(),q=new T.Quaternion().setFromAxisAngle(V(0,1,0),-heading*DEG);
   root.quaternion.copy(q);root.position.copy(local.applyQuaternion(q)).add(V(...origin));root.updateMatrixWorld(true);rig.skeleton.update();r.worldRoot=root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){if(disposed)return;rig.dispose();disposed=true;state=null;}};
 return api;
}
