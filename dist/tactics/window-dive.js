import * as T from './vendor/three.module.js';
import {V,Q,DEG,clamp,smooth,track,spinTrack,bodyQ,createTraversalBody,createSurfaceProbe,massPoints,inertiaAbout,BODY_MASS} from './traversal-pose.js';
// Head-first window entry and roll (docs/tactics/NATURAL-TRAVERSAL.md). Local frame: start on the tile at the
// origin facing +X, the window on the edge at X = .5 (faces .42 and .58, sill top .85, opening top 1.55),
// finish standing on the next tile's centre (1, 0, 0) facing on.
// These characters cannot tuck the chin (measured nod limit 0-35 degrees), so the roll starts with the chest flat on
// its back, spine curled, and the neck lying back along the floor. That points the head back toward the window,
// so the roll runs across the tile, along the wall (ROLL.dir from +X, chosen so the roll ends on the tile centre with nothing in the wall): the head clears the wall face, the roll's
// travel fits the tile, and the character comes up out of the window's line.
export const WINDOW={edge:.5,half:.08,sill:.85,top:1.55};
// The roll's pace is not keyed: it starts spinning at omega (rad/s) and gravity, the contact and the impacts
// where the contact jumps decide the rest (see rollDynamics).
export const ROLL=Object.freeze({dir:78,start:2.40,flex:40,back:[.86,-.55],omega:2.2,maxTurn:150});
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
 {t:2.00,label:'Reach for the floor',hips:[.74,.96,-.32],pitch:155,heading:40,roll:-5},
 {t:2.22,label:'Hands to the floor',hips:[.95,.76,-.32],pitch:195,heading:58,roll:-5},
];
const TURN=35; // the head turns this way coming down, so the muzzle stays off the wall
// Spine and head (relative to their parents) over the whole motion: flex / side / twist, nod / tilt / turn.
const SHAPE_PRE=[[0,0,0,0,0,0,0],[.55,5,0,0,0,0,0],[.90,8,0,0,-10,0,0],[1.25,6,0,0,-25,0,0],[1.60,10,0,0,-30,0,0],[2.00,25,0,0,-20,0,TURN],[2.22,32,0,0,-10,0,TURN],[ROLL.start,ROLL.flex,0,0,0,0,-15]];
// After the roll, by seconds past its end: unfold to standing.
const SHAPE_POST=[[.30,15,0,0,-5,0,0],[1.0,0,0,0,0,0,0]],G=9.81;
export function createWindowDive(worker,profile={id:'horse'}){
 const body=createTraversalBody(worker),probe=createSurfaceProbe(worker,{stride:2});
 const shapePre=track(SHAPE_PRE);
 const chestOf=(hips,hipsQ,spineQ)=>({chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))});
 const toWorld=(tr,frame,p)=>frame==='world'?V(...p):frame==='pelvis'?V(...p).applyQuaternion(tr.hipsQ).add(tr.hips):V(...p).applyQuaternion(tr.chestQ).add(tr.chest);
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray();
 const d=V(Math.cos(ROLL.dir*DEG),0,Math.sin(ROLL.dir*DEG)),axis=V(0,1,0).cross(d).normalize();
 // The rolling shape, in the trunk's own frames: a squat tuck (heels under the seat, so the hooves arrive at the
 // floor as the body sits up: 0.7 cm short, measured), arms in.
 const TUCK={'leg-1':[.06,-.33,-.14],leg1:[.06,-.33,.14],'arm-1':[.26,.05,-.28],arm1:[.26,.06,-.06]};
 const posed=(tr,limbs,palms={})=>{const legs={},arms={};for(const s of [-1,1]){const l=limbs['leg'+s],a=limbs['arm'+s];
   legs[s]={ankle:toWorld(tr,l.f,l.p).toArray(),pole:V(1,0,s*.25).applyQuaternion(tr.hipsQ).toArray(),q:l.hoof!==undefined?yawQ(l.heading||0).multiply(bodyQ(l.hoof*DEG)):null,w:l.hoofW??1};
   const chestPole=V(-.3,-.2,s).applyQuaternion(tr.chestQ),wallSafe=V(1,.15,0),k=palms[s]?.w??0;
   const wrist=toWorld(tr,a.f,a.p);wrist.y=Math.max(wrist.y,.06); // a palm never goes through the floor
   arms[s]={wrist:wrist.toArray(),pole:chestPole.lerp(wallSafe,k).toArray(),q:palms[s]?palmDown(palms[s].heading):null,w:palms[s]?.w??1};}
  return {hips:tr.hips.toArray(),hipsQ:tr.hipsQ,spineQ:tr.spineQ,headQ:tr.headQ,legs,arms};};
 const tuckLimbs=Object.fromEntries(Object.entries(TUCK).map(([k,p])=>[k,{f:k.startsWith('leg')?'pelvis':'chest',p}]));
 const lowest=()=>{probe.update();return probe.lowest();};
 const shapeOf=row=>{const [flex,side,twist,nod,tilt,turn]=row;return {spineQ:relQ(flex,side,twist),headQ:relQ(nod,tilt,turn)};};
 // ---- the roll: from the chest-flat start pose the curled body turns about the floor contact under it ----
 // Its pace comes from energy, not keys: kinetic energy about the contact (1/2 I_P w^2) plus gravity, conserved
 // while it rolls. Where the contact jumps from one part of the body to another (neck to back, back to seat), the
 // landing part takes an impact: angular momentum about the new contact is kept, and energy is lost.
 const s0=shapeOf(shapePre(ROLL.start)),q0=yawQ(ROLL.dir).multiply(bodyQ((270-ROLL.flex)*DEG));
 let p0=V(ROLL.back[0],.5,ROLL.back[1]);
 for(let i=0;i<4;i++){const tr={hips:p0,hipsQ:q0,...s0,...chestOf(p0,q0,s0.spineQ)};body.pose(posed(tr,tuckLimbs),'roll start');const L=lowest();p0=p0.clone().add(V(ROLL.back[0]-L.x,-L.y,ROLL.back[1]-L.z));}
 const rollLimbs=()=>tuckLimbs;
 const rollRows=[],impacts=[];{const dth=.5*DEG;let q=q0.clone(),p=p0.clone(),t=0,w=ROLL.omega,E=null,prev=null,u=0;
  for(let k=0;k*dth<=ROLL.maxTurn*DEG;k++){const tr={hips:p,hipsQ:q,...s0,...chestOf(p,q,s0.spineQ)};const P=body.pose(posed(tr,tuckLimbs),'roll');const L=lowest();
   if(Math.abs(L.y)>1e-9){p=p.clone().add(V(0,-L.y,0));for(const n of Object.keys(P))P[n].y-=L.y;}
   const contact=V(L.x,0,L.z),c=body.com(P),IP=inertiaAbout(massPoints(P),contact,axis),U=BODY_MASS*G*c.y;
   if(E===null)E=.5*IP*w*w+U;
   else if(prev&&contact.distanceTo(prev.contact)>.03){const Ic=IP-BODY_MASS*axis.clone().cross(c.clone().sub(contact)).lengthSq(),vc=axis.clone().cross(c.clone().sub(prev.contact)).multiplyScalar(prev.w);
    w=Math.max(0,(Ic*prev.w+BODY_MASS*c.clone().sub(contact).cross(vc).dot(axis))/IP);E=.5*IP*w*w+U;impacts.push({t,from:prev.part,to:L.part,lost:prev.E-E});}
   else w=Math.sqrt(Math.max(0,2*(E-U)/IP));
   const up=V(0,1,0).applyQuaternion(tr.chestQ);rollRows.push({t,p:p.clone(),q:q.clone(),contact:contact.toArray(),part:L.part,w,com:c,upright:up.y,u});
   // Stop sitting up (chest within 35 degrees of upright) or as a hoof lands, or if the roll runs out of speed.
   if(w<.25||up.y>Math.cos(35*DEG)||/hoof|boot|foot|toes/.test(L.part))break;
   const r=Q().setFromAxisAngle(axis,dth);q=r.clone().multiply(q);p=p.clone().sub(contact).applyQuaternion(r).add(contact);t+=dth/w;prev={contact,w,part:L.part,E};}}
 const last=rollRows.at(-1),seat=V(...(/hoof|boot|foot|toes/.test(last.part)?rollRows.at(-2):last).contact),ROLL_T=last.t,ROLL_END=ROLL.start+ROLL_T,CATCH_END=ROLL_END,END=CATCH_END+SHAPE_POST.at(-1)[0];
 for(const r of rollRows)r.t+=ROLL.start;
 // A landing part of the body is soft, not rigid: each impact's change of velocity is spread over SOFT seconds (a
 // moving average of the trajectory, then re-seated on the floor), so the floor never has to stop it in zero time.
 const SOFT=.04,uni=[];{const t0=rollRows[0].t,t1=rollRows.at(-1).t,n=Math.ceil((t1-t0)/.0025),seg=t=>{let i=0;while(i<rollRows.length-2&&rollRows[i+1].t<t)i++;return i;};
  const raw=Array.from({length:n+1},(_,k)=>{const t=t0+(t1-t0)*k/n,i=seg(t),a=rollRows[i],b=rollRows[i+1]||a,f=b.t>a.t?(t-a.t)/(b.t-a.t):0;return {t,p:a.p.clone().lerp(b.p,f),q:a.q.clone().slerp(b.q,f)};});
  const h=Math.round(SOFT/2/.0025);for(let k=0;k<=n;k++){const lo=Math.max(0,k-h),hi=Math.min(n,k+h),p=V();let q=raw[k].q.clone(),m=0;for(let j=lo;j<=hi;j++){p.add(raw[j].p);m++;}p.divideScalar(m);
   const ref=raw[k].q,acc=V();for(let j=lo;j<=hi;j++){const dq=raw[j].q.clone().multiply(ref.clone().invert());if(dq.w<0)dq.set(-dq.x,-dq.y,-dq.z,-dq.w);const a=2*Math.acos(clamp(dq.w,-1,1)),sn=Math.sqrt(Math.max(0,1-dq.w*dq.w));if(sn>1e-9)acc.addScaledVector(V(dq.x,dq.y,dq.z).divideScalar(sn),a);}acc.divideScalar(m);
   const ang=acc.length();q=(ang>1e-9?Q().setFromAxisAngle(acc.clone().divideScalar(ang),ang):Q()).multiply(ref);
   const tr={hips:p,hipsQ:q,...s0,...chestOf(p,q,s0.spineQ)};body.pose(posed(tr,tuckLimbs),'roll soft');const L=lowest();uni.push({t:raw[k].t,p:p.clone().add(V(0,-L.y,0)),q});}}
 const rollPos=track(uni.map(r=>[r.t,...r.p.toArray()])),rollRot=spinTrack(uni.map(r=>[r.t,r.q]));
 const rollAt=t=>{let i=0;while(i<rollRows.length-1&&rollRows[i+1].t<t)i++;return {hips:V(...rollPos(t)),hipsQ:rollRot(t),contact:rollRows[i].contact,part:rollRows[i].part};};
 const rEnd=rollRows.at(-1),D=END;
 // Spine and head over the whole motion: the pre-roll keys, the roll's fixed curl, then unfolding.
 const SHAPE=[...SHAPE_PRE,[ROLL_END,...SHAPE_PRE.at(-1).slice(1)],...SHAPE_POST.map(([dt,...v])=>[CATCH_END+dt,...v])];
 const shape=track(SHAPE),shapeAt=t=>shapeOf(shape(clamp(t,0,D)));
 // ---- keyed trunk: before the roll, then from the roll's end up to standing on the tile centre ----
 // The descent hands over at the roll's own spin (the hips moving as the body turns about the contact).
 const preRows=PRE.map(k=>({t:k.t,p:V(...k.hips),q:yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG))}));
 const c0=V(...rollRows[0].contact),hipsSpin=axis.clone().cross(p0.clone().sub(c0)).multiplyScalar(ROLL.omega);
 // The get-up rises in place over the seat: the right foot catches the roll's forward spin just ahead, the left shin
 // lands beside the seat, and the body pivots on both feet to face on as it stands.
 // Until the foot lands the body keeps turning about the seat, slowing from the roll's spin to rest: the catch
 // pose is the roll's end turned a further CATCH about the seat contact, over the time that spin takes to stop.
 // The roll lands in a crouch on both feet; the body rises over them and pivots to face on as it stands.
 const catchT=CATCH_END,kneelT=catchT+.30,catchKey={t:catchT,p:rEnd.p,q:rEnd.q},trEnd={hips:rEnd.p,hipsQ:rEnd.q};
 const ANKLE=body.at0('hoof1').y,feet=Object.fromEntries([-1,1].map(s=>[s,toWorld(trEnd,'pelvis',TUCK['leg'+s]).setY(ANKLE)]));
 const mid=feet[-1].clone().add(feet[1]).multiplyScalar(.5);
 const kneel={t:kneelT,p:mid.clone().addScaledVector(d,-.10).setY(.55),q:yawQ(ROLL.dir*.6).multiply(bodyQ(30*DEG))};
 const stand={t:END,p:V(1,.80,0),q:Q()};
 const trunkRows=[...preRows,{t:ROLL.start,p:p0,q:q0},catchKey,kneel,stand];
 const iStart=trunkRows.findIndex(r=>r.t===ROLL.start),iEnd=iStart+1,endSpin=axis.clone().multiplyScalar(rEnd.w),endVel=axis.clone().cross(rEnd.p.clone().sub(seat)).multiplyScalar(rEnd.w);
 const posTrack=track(trunkRows.map(r=>[r.t,...r.p.toArray()]),{[iStart]:hipsSpin.toArray(),[iEnd]:endVel.toArray()}),rotTrack=spinTrack(trunkRows.map((r,i)=>[r.t,r.q,i===iStart?axis.clone().multiplyScalar(ROLL.omega):i===iEnd?endSpin:undefined]));
 function trunkAt(t){const s=t>ROLL.start&&t<ROLL_END?s0:shapeAt(t);let hips,hipsQ;if(t>ROLL.start&&t<CATCH_END){const r=rollAt(t);hips=r.hips;hipsQ=r.hipsQ;}else{hips=V(...posTrack(t));hipsQ=rotTrack(t);}return {hips,hipsQ,...s,...chestOf(hips,hipsQ,s.spineQ)};}
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
 let LIMB;const buildLimbs=()=>{LIMB={
  'leg-1':[[0,rest.leg(-1)],[.55,{f:'world',p:[-.035,.12,-.40]}],[.90,{f:'world',p:[-.035,.12,-.40]}],[1.25,{f:'pelvis',p:[-.06,-.56,-.13],hoof:40}],[1.60,{f:'pelvis',p:[-.06,-.60,-.12],hoof:60}],[2.00,{f:'pelvis',p:[-.22,-.46,-.12],hoof:50}],[2.22,{f:'pelvis',p:[-.12,-.30,-.13],hoof:40}],[ROLL.start,{f:'pelvis',p:TUCK['leg-1']}],[ROLL_END-.10,{f:'pelvis',p:TUCK['leg-1']}]],
  leg1:[[0,rest.leg(1)],[.55,{f:'world',p:[.20,.12,-.06]}],[.90,{f:'world',p:[.20,.12,-.06]}],[1.25,{f:'pelvis',p:[-.04,-.56,.13],hoof:40}],[1.60,{f:'pelvis',p:[-.06,-.60,.12],hoof:60}],[2.00,{f:'pelvis',p:[-.22,-.46,.12],hoof:50}],[2.22,{f:'pelvis',p:[-.12,-.30,.13],hoof:40}],[ROLL.start,{f:'pelvis',p:TUCK.leg1}],[ROLL_END-.10,{f:'pelvis',p:TUCK.leg1}]],
  'arm-1':[[0,rest.arm(-1)],[.55,{f:'world',p:[.36,.92,-.42]}],[.90,{f:'world',p:[.44,.91,-.42],palm:0}],[1.25,{f:'world',p:[.47,.91,-.42],palm:0}],[1.60,dangle(1.60,-1,[.35,-1,-.05])],[2.00,dangle(2.00,-1,[.25,-1,-.10],.97)],[2.22,floorHand(2.22,-1,[.10,0,-.08],30)],[ROLL.start,floorHand(2.22,-1,[.10,0,-.08],30)],[ROLL.start+.12,{f:'chest',p:TUCK['arm-1']}],[ROLL_END,{f:'chest',p:TUCK['arm-1']}]],
  arm1:[[0,rest.arm(1)],[.55,{f:'world',p:[.36,.92,.02]}],[.90,{f:'world',p:[.44,.91,0],palm:0}],[1.25,{f:'world',p:[.47,.91,-.02],palm:0}],[1.60,dangle(1.60,1,[.35,-1,.05])],[2.00,dangle(2.00,1,[.25,-1,.10],.97)],[2.22,floorHand(2.22,1,[.12,0,.08],50)],[ROLL.start,floorHand(2.22,1,[.12,0,.08],50)],[ROLL.start+.12,{f:'chest',p:TUCK.arm1}],[ROLL_END,{f:'chest',p:TUCK.arm1}]],
 };
 // After the roll both hooves stay where they landed (turning flat as they take the weight) until the stand,
 // which steps them into the stance on the tile centre.
 for(const s of [-1,1])LIMB['leg'+s].push([catchT,{f:'world',p:feet[s].toArray(),hoof:0,heading:ROLL.dir}],[kneelT+.15,{f:'world',p:feet[s].toArray(),hoof:0,heading:ROLL.dir}],[END,{f:'world',p:[1-.035,.12,s*.232],hoof:0,heading:0}]);
 for(const s of [-1,1])LIMB['arm'+s].push([kneelT,{f:'chest',p:restWrist(s)}],[END,{f:'chest',p:restWrist(s)}]);};buildLimbs();
 function limb(id,t,tr){const keys=LIMB[id];let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const [ta,a]=keys[i],[tb,b]=keys[Math.min(keys.length-1,i+1)];
  const u=tb>ta?smooth((t-ta)/(tb-ta)):1,pa=toWorld(tr,a.f,a.p),pb=toWorld(tr,b.f,b.p);
  // An orientation fades in or out (w) where a key has none, so a hoof or hand never flips at a hand-over.
  const has=k=>k.hoof!==undefined,hp=has(a)?a.hoof:b.hoof,hq=has(b)?b.hoof:a.hoof,pal=k=>k.palm!==undefined;
  return {f:'world',p:pa.lerp(pb,u).toArray(),hoof:has(a)||has(b)?T.MathUtils.lerp(hp??0,hq??0,u):undefined,hoofW:T.MathUtils.lerp(has(a)?1:0,has(b)?1:0,u),heading:T.MathUtils.lerp(a.heading||0,b.heading||0,u),
   palm:pal(a)||pal(b)?T.MathUtils.lerp(pal(a)?a.palm:b.palm,pal(b)?b.palm:a.palm,u):undefined,palmW:T.MathUtils.lerp(pal(a)?1:0,pal(b)?1:0,u)};}
 function spec(t){const tr=trunkAt(t),limbs={},palms={};for(const id of Object.keys(LIMB)){const L=limb(id,t,tr);limbs[id]=L;if(L.palm!==undefined&&id.startsWith('arm'))palms[+id.slice(3)]={heading:L.palm,w:L.palmW};}return posed(tr,limbs,palms);}
 const KEYS=[...PRE.map(k=>({t:k.t,label:k.label})),{t:ROLL.start,label:'Back to the floor'},{t:(ROLL.start+ROLL_END)/2,label:'Roll'},{t:ROLL_END,label:'Sit up'},{t:kneelT,label:'Rise from the crouch'},{t:END,label:'Stand on the tile'}];
 let state=null;
 const api={duration:D,keys:KEYS,body,probe,roll:{rows:rollRows,dir:ROLL.dir,start:ROLL.start,end:ROLL_END},
  phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();
   const phase=api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label;state={time,phase,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  diagnostics:()=>state,dispose(){body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
