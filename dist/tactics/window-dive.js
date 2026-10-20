import * as T from './vendor/three.module.js';
import {V,Q,DEG,clamp,smooth,track,spinTrack,angleTrack,bodyQ,yawQ,relQ,frameToWorld as toWorld,keyedLimb,posedFrom,steadyPoles,steadyTurns,limbSample,createTraversalBody,createSurfaceProbe,massPoints,inertiaAbout,BODY_MASS} from './traversal-pose.js';
import {bodyFit,createTailBend,createClearanceFit,edgeBoxes} from './traversal-fit.js';
import {balanceTraversal,contactProbe,boxedPath} from './traversal-balance.js';
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
export const ROLL=Object.freeze({dir:78,start:2.40,flex:40,back:[.94,-.55],omega:2.2,maxTurn:150});
// Keyed trunk before the roll: time, label, hips [x, y, z], pelvis pitch / roll / heading (degrees: pitch forward,
// past 180 inverted; heading from +X toward +Z). The last keyed pose before the roll is built from the roll itself.
// Heights are the horse's; a key the legs hold up (stand) is scaled to each character's legs, and a body deeper in
// front stands back while it faces the window (near), feet and all, and lies that much higher on the sill (over)
// (traversal-fit.js). The hop, slide and reach are keyed 2.5 cm into the sill, so the clearance fit, which only lifts a
// body out, sets the belly on it: keyed above it, the body slid 1 to 2.6 cm over the sill with nothing holding it.
// The reach is paced by gravity: a belly on the sill is an inverted pendulum about its edge, the centre of mass about the
// belly's depth above it, so tipping head down carries the centre of mass past the edge and the tip speeds up (1.7 rad/s
// at the slide to 4 rad/s, computed about the edge with the body's own inertia) until the chest meets the far face, which
// then holds it with the edge. Keyed 0.1 s slower, the body leant 15 cm past the edge with nothing turning it.
// HANG: the trunk down the far face; LANDS: each hand set down on the floor where it then stays.
const HANG=1.90,LANDS=Object.freeze({[-1]:2.08,1:1.98});
const PRE=[
 {t:0,label:'Ready',hips:[0,.80,0],stand:true},
 {t:.55,label:'Step in',hips:[.08,.79,-.16],pitch:8,stand:true,near:true},
 {t:.90,label:'Hands on the sill',hips:[.12,.74,-.20],pitch:28,stand:true,near:true},
 {t:1.25,label:'Hop onto the sill',hips:[.34,.955,-.24],pitch:82,over:true},
 {t:1.60,label:'Slide over',hips:[.50,1.005,-.28],pitch:115,heading:10,over:true},
 {t:HANG,label:'Reach for the floor',hips:[.72,.91,-.32],pitch:166,heading:40,roll:-5},
 {t:LANDS[1],label:'Right hand down',hips:[.765,.875,-.32],pitch:167,heading:46,roll:-5},
 {t:2.22,label:'Hands to the floor',hips:[.95,.76,-.32],pitch:195,heading:58,roll:-5},
];
const TURN=35; // the head turns this way coming down, so the muzzle stays off the wall
// Spine and head (relative to their parents) over the whole motion: flex / side / twist, nod / tilt / turn.
const SHAPE_PRE=[[0,0,0,0,0,0,0],[.55,5,0,0,0,0,0],[.90,8,0,0,-10,0,0],[1.25,6,0,0,-25,0,0],[1.60,10,0,0,-30,0,0],[HANG,25,0,0,-20,0,TURN],[LANDS[1],28,0,0,-16,0,TURN],[2.22,32,0,0,-10,0,TURN],[ROLL.start,ROLL.flex,0,0,0,0,-15]];
// After the roll, by seconds past its end: unfold to standing.
const SHAPE_POST=[[.30,15,0,0,-5,0,0],[1.0,0,0,0,0,0,0]],G=9.81;
export function createWindowDive(worker,profile={id:'horse'}){
 // The roll turns about the body's own lowest point: a tail is soft and bends out of the way (fitted below), so only
 // its root, which cannot, is ever the pivot.
 const body=createTraversalBody(worker),tails=createTailBend(worker),probe=createSurfaceProbe(worker,{stride:2,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),fitB=bodyFit(body,probe),back=fitB.back;
 const pre=PRE.map(k=>({...k,hips:[k.hips[0]-(k.near?back:0),(k.stand?fitB.stand(k.hips[1]):k.hips[1])+(k.over?back:0),k.hips[2]]}));
 const shapePre=track(SHAPE_PRE);
 const chestOf=(hips,hipsQ,spineQ)=>({chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))});
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray();
 const d=V(Math.cos(ROLL.dir*DEG),0,Math.sin(ROLL.dir*DEG)),axis=V(0,1,0).cross(d).normalize();
 // The rolling shape, in the trunk's own frames: a squat tuck (heels under the seat, so the hooves arrive at the
 // floor as the body sits up: 0.7 cm short, measured), arms in.
 const TUCK={'leg-1':[.06,-.33,-.14],leg1:[.06,-.33,.14],'arm-1':[.28,.04,-.26],arm1:[.28,.04,.12]},TUCK_ELBOW={'arm-1':[.3,0,1],arm1:[.8,0,.4]};
 // fit: this character's clearance corrections; steady: its limbs' bend directions (both solved below, null until then).
 let fit=null,steady=null,turnRef=null,balance=null,onSill=null;
 const posed=(tr,limbs,t)=>posedFrom(tr,limbs,{elbowAway:[1,.15,0],poles:steady&&t!==undefined?id=>steady(id,t):null,offsets:fit?.limb&&t!==undefined?id=>fit.limb(id,t):null,snaps:fit?.plant&&t!==undefined?id=>fit.plant(id,t):null,turns:turnRef&&t!==undefined?b=>turnRef(b,t):null});
 const tuckLimbs=Object.fromEntries(Object.entries(TUCK).map(([k,p])=>[k,k.startsWith('leg')?{f:'pelvis',p}:{f:'chest',p,elbow:TUCK_ELBOW[k]}]));
 const lowest=()=>{probe.update();return probe.lowest();};
 const shapeOf=row=>{const [flex,side,twist,nod,tilt,turn]=row;return {spineQ:relQ(flex,side,twist),headQ:relQ(nod,tilt,turn)};};
 // ---- the roll: from the chest-flat start pose the curled body turns about the floor contact under it ----
 // Its pace comes from energy, not keys: kinetic energy about the contact (1/2 I_P w^2) plus gravity, conserved
 // while it rolls. Where the contact jumps from one part of the body to another (neck to back, back to seat), the
 // landing part takes an impact: angular momentum about the new contact is kept, and energy is lost.
 const s0=shapeOf(shapePre(ROLL.start)),q0=yawQ(ROLL.dir).multiply(bodyQ((270-ROLL.flex)*DEG));
 // A body wider than the horse's starts the roll that much farther from the wall it rolls along.
 const backX=ROLL.back[0]+fitB.wide;let p0=V(backX,.5,ROLL.back[1]);
 for(let i=0;i<4;i++){const tr={hips:p0,hipsQ:q0,...s0,...chestOf(p0,q0,s0.spineQ)};body.pose(posed(tr,tuckLimbs),'roll start');const L=lowest();p0=p0.clone().add(V(backX-L.x,-L.y,ROLL.back[1]-L.z));}
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
 // moving average of the trajectory, then re-seated on the floor, the re-seat averaged the same way), so the floor
 // never has to stop it in zero time. Re-seated exactly, sample by sample, the lowest point's jump from the mane to the
 // shoulder and on to the seat came back as a 0.6 m/s step of the hips' fall in 6 ms (14 body weights).
 const SOFT=.04,uni=[];{const t0=rollRows[0].t,t1=rollRows.at(-1).t,n=Math.ceil((t1-t0)/.0025),seg=t=>{let i=0;while(i<rollRows.length-2&&rollRows[i+1].t<t)i++;return i;};
  const raw=Array.from({length:n+1},(_,k)=>{const t=t0+(t1-t0)*k/n,i=seg(t),a=rollRows[i],b=rollRows[i+1]||a,f=b.t>a.t?(t-a.t)/(b.t-a.t):0;return {t,p:a.p.clone().lerp(b.p,f),q:a.q.clone().slerp(b.q,f)};});
  // The window narrows symmetrically toward the ends, so the softened roll starts and ends exactly where the keyed
  // descent hands over and the get-up takes over (a one-sided window shifted them by up to 2 cm: a pop of the whole body).
  const h=Math.round(SOFT/2/.0025),seated=[];for(let k=0;k<=n;k++){const hk=Math.min(h,k,n-k),lo=k-hk,hi=k+hk,p=V();let q=raw[k].q.clone(),m=0;for(let j=lo;j<=hi;j++){p.add(raw[j].p);m++;}p.divideScalar(m);
   const ref=raw[k].q,acc=V();for(let j=lo;j<=hi;j++){const dq=raw[j].q.clone().multiply(ref.clone().invert());if(dq.w<0)dq.set(-dq.x,-dq.y,-dq.z,-dq.w);const a=2*Math.acos(clamp(dq.w,-1,1)),sn=Math.sqrt(Math.max(0,1-dq.w*dq.w));if(sn>1e-9)acc.addScaledVector(V(dq.x,dq.y,dq.z).divideScalar(sn),a);}acc.divideScalar(m);
   const ang=acc.length();q=(ang>1e-9?Q().setFromAxisAngle(acc.clone().divideScalar(ang),ang):Q()).multiply(ref);
   const tr={hips:p,hipsQ:q,...s0,...chestOf(p,q,s0.spineQ)};body.pose(posed(tr,tuckLimbs),'roll soft');seated.push({t:raw[k].t,p,q,down:-lowest().y});}
  for(let k=0;k<=n;k++){const hk=Math.min(h,k,n-k);let m=0,y=0;for(let j=k-hk;j<=k+hk;j++){y+=seated[j].down;m++;}uni.push({t:seated[k].t,p:seated[k].p.clone().add(V(0,y/m,0)),q:seated[k].q});}}
 // The roll leaves and rejoins the keyed trunk at its own speed: the hips moving as the body turns about the first
 // contact, and as it turns about the seat at the end.
 const rEnd=rollRows.at(-1),D=END,c0=V(...rollRows[0].contact),hipsSpin=axis.clone().cross(p0.clone().sub(c0)).multiplyScalar(ROLL.omega);
 const endSpin=axis.clone().multiplyScalar(rEnd.w),endVel=axis.clone().cross(rEnd.p.clone().sub(seat)).multiplyScalar(rEnd.w);
 const rollPos=track(uni.map(r=>[r.t,...r.p.toArray()]),{0:hipsSpin.toArray(),[uni.length-1]:endVel.toArray()});
 const rollRot=spinTrack(uni.map((r,i)=>[r.t,r.q,i===0?axis.clone().multiplyScalar(ROLL.omega):i===uni.length-1?endSpin:undefined]));
 const rollAt=t=>{let i=0;while(i<rollRows.length-1&&rollRows[i+1].t<t)i++;return {hips:V(...rollPos(t)),hipsQ:rollRot(t),contact:rollRows[i].contact,part:rollRows[i].part};};
 // Spine and head over the whole motion: the pre-roll keys, the roll's fixed curl, then unfolding.
 const SHAPE=[...SHAPE_PRE,[ROLL_END,...SHAPE_PRE.at(-1).slice(1)],...SHAPE_POST.map(([dt,...v])=>[CATCH_END+dt,...v])];
 const shape=track(SHAPE),shapeAt=t=>shapeOf(shape(clamp(t,0,D)));
 // ---- keyed trunk: before the roll, then from the roll's end up to standing on the tile centre ----
 // The descent hands over at the roll's own spin (the hips moving as the body turns about the contact).
 const preRows=pre.map(k=>({t:k.t,p:V(...k.hips),q:yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG))}));
 // The get-up rises in place over the seat: the right foot catches the roll's forward spin just ahead, the left shin
 // lands beside the seat, and the body pivots on both feet to face on as it stands.
 // Until the foot lands the body keeps turning about the seat, slowing from the roll's spin to rest: the catch
 // pose is the roll's end turned a further CATCH about the seat contact, over the time that spin takes to stop.
 // The roll lands in a crouch on both feet; the body rises over them and pivots to face on as it stands.
 const catchT=CATCH_END,kneelT=catchT+.30,catchKey={t:catchT,p:rEnd.p,q:rEnd.q},trEnd={hips:rEnd.p,hipsQ:rEnd.q};
 const ANKLE=body.at0('hoof1').y,feet=Object.fromEntries([-1,1].map(s=>[s,toWorld(trEnd,'pelvis',TUCK['leg'+s]).setY(ANKLE)]));
 const mid=feet[-1].clone().add(feet[1]).multiplyScalar(.5);
 const kneel={t:kneelT,p:mid.clone().addScaledVector(d,-.10).setY(fitB.stand(.55)),q:yawQ(ROLL.dir*.6).multiply(bodyQ(30*DEG))};
 const stand={t:END,p:body.at0('hips').add(V(1,0,0)),q:Q()};
 const trunkRows=[...preRows,{t:ROLL.start,p:p0,q:q0},catchKey,kneel,stand];
 const iStart=trunkRows.findIndex(r=>r.t===ROLL.start),iEnd=iStart+1;
 const posTrack=track(trunkRows.map(r=>[r.t,...r.p.toArray()]),{[iStart]:hipsSpin.toArray(),[iEnd]:endVel.toArray()}),rotTrack=spinTrack(trunkRows.map((r,i)=>[r.t,r.q,i===iStart?axis.clone().multiplyScalar(ROLL.omega):i===iEnd?endSpin:undefined]));
 // Up to the roll the trunk turns by heading, pitch and roll, each on a quintic (C2), from rest into the roll's own
 // spin at its start; the rotation spline's cubic log map stepped the angular acceleration at every key (the hips' centre of mass
 // jolted by 12 m/s^2 at the reach). After the roll, from its arbitrary end, the rotation spline.
 const preRot=angleTrack([...pre.map(k=>[k.t,k.heading||0,k.pitch||0,k.roll||0]),[ROLL.start,ROLL.dir,270-ROLL.flex,0]],{0:[0,0,0],[pre.length]:[0,ROLL.omega/DEG,0]});
 // The clearance corrections are zero until solved, and held at zero through the roll.
 function trunkAt(t){const s=t>ROLL.start&&t<ROLL_END?s0:shapeAt(t);let hips,hipsQ;if(t>ROLL.start&&t<CATCH_END){const r=rollAt(t);hips=r.hips;hipsQ=r.hipsQ;}else{hips=V(...posTrack(t));hipsQ=t<=ROLL.start?preRot(t):rotTrack(t);}
  if(onSill)hips=hips.clone().add(onSill(t));if(balance)hips=hips.clone().add(balance.shift(t));
  let headQ=s.headQ;if(fit){hips=hips.clone().add(fit.trunk(t));const bow=fit.bow(t);if(bow)hipsQ=hipsQ.clone().multiply(bodyQ(bow*DEG));const [nod,tilt,turn]=fit.head(t);if(nod||tilt||turn)headQ=s.headQ.clone().multiply(relQ(nod,tilt,turn));}
  const sp=balance?.spin?.(t);if(sp){hipsQ=sp.q.clone().multiply(hipsQ);hips=hips.clone().sub(sp.pivot).applyQuaternion(sp.q).add(sp.pivot);}
  return {hips,hipsQ,...s,headQ,...chestOf(hips,hipsQ,s.spineQ)};}
 // ---- limbs: world targets where planted, the tuck through the roll ----
 const rest={leg:s=>({f:'world',p:body.at0('hoof'+s).toArray(),plant:true}),arm:s=>({f:'chest',p:restWrist(s)})};
 // Hands are placed from where the shoulders really are at that key, so the short arms are never asked past
 // their reach: dangling toward a direction, or flat on the floor near below the shoulder.
 const REACH=s=>body.L[s].upper+body.L[s].fore,shoulderAt=(t,s)=>{const tr=trunkAt(t);return tr.chest.clone().add(body.offsets.shoulder[s].clone().applyQuaternion(tr.chestQ));};
 // A dangling hand rides with the chest (so it stays within reach between keys): the key is given as a world
 // direction from the shoulder at that time and stored in the chest frame.
 const dangle=(t,s,dir,k=.92)=>{const tr=trunkAt(t),w=shoulderAt(t,s).addScaledVector(V(...dir).normalize(),k*REACH(s));return {f:'chest',p:w.sub(tr.chest).applyQuaternion(tr.chestQ.clone().invert()).toArray()};};
 // A hand the floor is out of reach for stays aimed at it; the limb records the shortfall (body.warnings).
 const floorHand=(t,s,off,palm)=>{const sh=shoulderAt(t,s);return {f:'world',p:[sh.x+off[0],.06,sh.z+off[2]],palm};};
 // While the hands take the floor and the body lies back onto them, the left elbow bends up and out to the open side;
 // the right shoulder is 7 to 11 cm off the wall face, so its hand goes under it and the elbow bends back along the body
 // (a narrow push-up). The sill's world-forward elbows folded the right arm across the chest of a body upside down at
 // 58 degrees (18 cm into it, phantom-wrench capsules); out or up, it met the wall or the head.
 const FLOOR_ELBOW={[-1]:[.6,0,1],1:[0,-1,.2]};
 let LIMB;const buildLimbs=()=>{const handAt={[-1]:{...floorHand(ROLL.start,-1,[.06,0,-.20],30),elbow:FLOOR_ELBOW[-1],plant:true},1:{...floorHand(2.22,1,[0,0,0],50),elbow:FLOOR_ELBOW[1],plant:true}},
  aim=(t,s,k)=>({...dangle(t,s,handAt[s].p.map((x,j)=>x-shoulderAt(t,s).getComponent(j)),k),soft:.03});LIMB={
  'leg-1':[[0,rest.leg(-1)],[.55,{f:'world',p:[-.035-back,fitB.ankle,-.40],hoof:0,plant:true}],[.90,{f:'world',p:[-.035-back,fitB.ankle,-.40],hoof:0,lift:.25,plant:true}],[1.25,{f:'pelvis',p:[-.06,-.56,-.13]}],[1.60,{f:'pelvis',p:[-.06,-.60,-.12]}],[HANG,{f:'pelvis',p:[.20,-.56,-.12]}],[LANDS[1],{f:'pelvis',p:[.12,-.52,-.12]}],[2.22,{f:'pelvis',p:[-.12,-.30,-.13]}],[ROLL.start,{f:'pelvis',p:TUCK['leg-1']}],[ROLL_END-.10,{f:'pelvis',p:TUCK['leg-1']}]],
  leg1:[[0,rest.leg(1)],[.55,{f:'world',p:[.20-back,fitB.ankle,-.06],hoof:0,plant:true}],[.90,{f:'world',p:[.20-back,fitB.ankle,-.06],hoof:0,lift:.25,plant:true}],[1.25,{f:'pelvis',p:[-.04,-.56,.13]}],[1.60,{f:'pelvis',p:[-.06,-.60,.12]}],[HANG,{f:'pelvis',p:[.20,-.56,.12]}],[LANDS[1],{f:'pelvis',p:[.12,-.52,.12]}],[2.22,{f:'pelvis',p:[-.12,-.30,.13]}],[ROLL.start,{f:'pelvis',p:TUCK.leg1}],[ROLL_END-.10,{f:'pelvis',p:TUCK.leg1}]],
  'arm-1':[[0,rest.arm(-1)],[.55,{f:'world',p:[.36,.92,-.42]}],[.90,{f:'world',p:[.44,.91,-.42],palm:0}],[1.25,{f:'world',p:[.47,.91,-.42],palm:0}],[1.60,dangle(1.60,-1,[.35,-1,-.05])],[HANG,aim(HANG,-1,.97)],[LANDS[-1],handAt[-1]],[2.22,handAt[-1]],[ROLL.start,handAt[-1]],[ROLL.start+.18,{f:'chest',p:TUCK['arm-1'],elbow:TUCK_ELBOW['arm-1']}],[ROLL_END,{f:'chest',p:TUCK['arm-1'],elbow:TUCK_ELBOW['arm-1']}]],
  arm1:[[0,rest.arm(1)],[.55,{f:'world',p:[.36,.92,.02]}],[.90,{f:'world',p:[.44,.91,0],palm:0}],[1.25,{f:'world',p:[.47,.91,-.02],palm:0}],[1.60,dangle(1.60,1,[.35,-1,.05])],[HANG,aim(HANG,1,.97)],[LANDS[1],handAt[1]],[2.22,handAt[1]],[ROLL.start,handAt[1]],[ROLL.start+.18,{f:'chest',p:TUCK.arm1,elbow:TUCK_ELBOW.arm1}],[ROLL_END,{f:'chest',p:TUCK.arm1,elbow:TUCK_ELBOW.arm1}]],
 };
 // After the roll both hooves stay where they landed (turning flat as they take the weight) until the stand,
 // which steps them into the stance on the tile centre.
 for(const s of [-1,1])LIMB['leg'+s].push([catchT,{f:'world',p:feet[s].toArray(),hoof:0,heading:ROLL.dir,plant:true}],[kneelT+.15,{f:'world',p:feet[s].toArray(),hoof:0,heading:ROLL.dir,plant:true}],[END,{f:'world',p:fitB.foot(s,1),hoof:0,heading:0,plant:true}]);
 for(const s of [-1,1])LIMB['arm'+s].push([kneelT,{f:'chest',p:restWrist(s)}],[END,{f:'chest',p:restWrist(s)}]);};buildLimbs();
 function spec(t){const tr=trunkAt(t),limbs={};for(const id of Object.keys(LIMB))limbs[id]=keyedLimb(LIMB[id],t,tr);return posed(tr,limbs,t);}
 // Fit this character's surface: trunk, head and tail out of the floor, the sill and the lintel. The roll is computed
 // from the body itself, so the trunk and head are held through it, easing in and out over 0.08 s; the hands are then
 // placed again from the fitted shoulders.
 const held=t=>t>=ROLL.start&&t<=CATCH_END?0:smooth((t<ROLL.start?ROLL.start-t:t-CATCH_END)/.08);
 fit=createClearanceFit(D);fit.solve({body,probe,tails,obstacles:edgeBoxes(WINDOW.edge,WINDOW.half,[[0,WINDOW.sill],[WINDOW.top,2]]),poseAt:t=>body.pose(spec(t),'fit'),
  stage:t=>t<1.0?'near':t<1.9?'over':'far',free:{trunk:held,head:held}});
 buildLimbs();
 // The belly rests on the sill from the hop until the hands are down on the floor. The clearance fit leaves its lowest
 // point 1 to 2 cm above (its 4 mm margin, its 20 ms samples), where the phantom-wrench rig's contact (1 cm) finds nothing
 // holding the body, so the trunk is set down onto it, never lifted: one smooth push, inside a band at every 5 ms:
 // - at least enough that the nearest point of the body on the sill's top or edge is within the rig's centimetre (from
 //   the hop until the left hand is down), measured on every vertex but the tail's and the hands' and feet's (on every
 //   third, cows' and sheep's trunks sank 1.4 cm between them); a point past the edge only has to come down to the
 //   top's height, where it touches the edge;
 // - at most so far that no point over the top is more than SINK in (a soft belly flattens on a sill: 4 mm in, REST, it
 //   touches over the sill's depth; at the edge alone, the plan pushed the centre of mass 3.6 cm forward to it and lifted
 //   the body off), and nothing beside the wall goes into the floor (pressed onto the sill, the pig foreman's head went
 //   16.8 cm into the floor reaching for it); the hands aside: a wrist is never set below the floor, the arm bends;
 // - the smoothest such push (the planner's banded programme, its jerk weighed), near REST where the band allows. As
 //   the body slides over the edge its nearest point moves from vertex to vertex, up to 2.4 cm higher at a step, and a
 //   point that has passed the edge may go on down beside the face, so the band never closes; the push followed sample
 //   by sample, or averaged, stepped the hips' velocity by up to 0.5 m/s (140 m/s^2 at the hips).
 {const REST=-.004,SINK=.008,EDGE=.008,FLOOR=.005,TOUCH=.006,[a,b]=[1.02,2.17],[h0,h1]=[1.25,LANDS[-1]],x0=WINDOW.edge-WINDOW.half,x1=WINDOW.edge+WINDOW.half,
   all=createSurfaceProbe(worker,{stride:1,keep:m=>!/tail/.test(m.name)}),want=[],lo=[],hi=[],ts=[];
  for(let t=a;t<=b+1e-9;t+=.005){body.pose(spec(t),'rest');all.update();let near=Infinity,touch=Infinity,deep=Infinity,room=Infinity;
   for(let i=0;i<all.count;i++){const x=all.x[i],y=all.y[i],dx=Math.max(x0-x,0,x-x1),part=all.names[all.part[i]];if(/hand/.test(part))continue;
    if(dx<EDGE&&y>WINDOW.sill-(dx?0:.02)&&!/hoof|boot|foot|toe/i.test(part)){const dy=y-WINDOW.sill;
     if(dx){near=Math.min(near,dy);touch=Math.min(touch,dy-Math.sqrt(Math.max(0,TOUCH*TOUCH-dx*dx)));}else{near=Math.min(near,dy-REST);touch=Math.min(touch,dy-TOUCH);deep=Math.min(deep,dy+SINK);}}
    else if(dx)room=Math.min(room,y-FLOOR);}
   const top=Math.max(0,Math.min(deep,room)),need=touch<Infinity&&t>=h0&&t<=h1?clamp(touch,0,top):0;
   ts.push(t);hi.push(top);lo.push(need);want.push(near<Infinity?clamp(near,need,top):need);}
  const P=boxedPath(want,want.map(()=>1),2e7,want.map((_,i)=>({at:i,c:[1],lo:lo[i],hi:hi[i]})));
  const tr=track(ts.map((t,i)=>[t,0,-P.c[i]*smooth(Math.min(t-a,b-t)/.08),0]),{},{limit:false});onSill=t=>t>a&&t<b?V(...tr(t)):V();}
 buildLimbs();
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
 const bal=balanceTraversal({duration:D,probe:contactProbe(worker),obstacles:edgeBoxes(WINDOW.edge,WINDOW.half,[[0,WINDOW.sill],[WINDOW.top,2]]),pose:t=>body.pose(spec(t),'balance'),com:P=>body.com(P),setMove:m=>{balance=m;},base:t=>fit.trunk(t).add(onSill(t)).toArray()});
 balance=bal;turns();
 const KEYS=[...PRE.map(k=>({t:k.t,label:k.label})),{t:ROLL.start,label:'Back to the floor'},{t:(ROLL.start+ROLL_END)/2,label:'Roll'},{t:ROLL_END,label:'Sit up'},{t:kneelT,label:'Rise from the crouch'},{t:END,label:'Stand on the tile'}];
 let state=null;
 const api={duration:D,keys:KEYS,body,probe,roll:{rows:rollRows,dir:ROLL.dir,start:ROLL.start,end:ROLL_END},
  phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();const [tp,ty]=fit.tail(time);tails.set(tp*DEG,ty*DEG);
   const phase=api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label;state={time,phase,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  fit:fit.report,clearance:fit,balance:bal,diagnostics:()=>state,dispose(){tails.restore();body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
