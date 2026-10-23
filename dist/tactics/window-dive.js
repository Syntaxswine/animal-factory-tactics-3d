import * as T from './vendor/three.module.js';
import {V,Q,DEG,clamp,smooth,track,spinTrack,angleTrack,bodyQ,yawQ,relQ,frameToWorld as toWorld,keyedLimb,posedFrom,steadyPoles,steadyTurns,limbSample,createTraversalBody,createSurfaceProbe,massPoints,inertiaAbout,BODY_MASS} from './traversal-pose.js';
import {bodyFit,createTailBend,createClearanceFit,edgeBoxes} from './traversal-fit.js';
import {balanceTraversal,contactProbe,boxedPath,supportAt} from './traversal-balance.js';
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
// hips: where the hips lie, x and z, as the roll starts (the horse's, set by its mane crest touching at .94, -.55).
export const ROLL=Object.freeze({dir:78,start:2.46,flex:40,hips:[1.002778,-.173734],omega:2.2,maxTurn:150});
// Keyed trunk before the roll: time, label, hips [x, y, z], pelvis pitch / roll / heading (degrees: pitch forward,
// past 180 inverted; heading from +X toward +Z). The last keyed pose before the roll is built from the roll itself.
// Heights are the horse's; a key the legs hold up (stand) is scaled to each character's legs, and a body deeper in
// front stands back while it faces the window (near), feet and all, lies that much higher on the sill (over), and hangs
// that much further out from the far face as it goes down it head first (far; keyed at the horse's, the pig director's
// belly went through the sill and the clearance fit, lifting it 19 to 26 cm, still left it 5.7 cm in) (traversal-fit.js). The hop, slide and reach are keyed 2.5 cm into the sill, so the clearance fit, which only lifts a
// body out, sets the belly on it: keyed above it, the body slid 1 to 2.6 cm over the sill with nothing holding it.
// The reach is paced by gravity: a belly on the sill is an inverted pendulum about its edge, the centre of mass about the
// belly's depth above it, so tipping head down carries the centre of mass past the edge and the tip speeds up (1.7 rad/s
// at the slide to 4 rad/s, computed about the edge with the body's own inertia) until the chest meets the far face, which
// then holds it with the edge. Keyed 0.1 s slower, the body leant 15 cm past the edge with nothing turning it.
// HANG: the trunk down the far face; DOWN: the trunk at its lowest on the sill; LANDS: each hand set down on the floor,
// where it then stays (the right hand once the left is down: it braces on the wall until then).
const HANG=1.90,DOWN=1.98,LANDS=Object.freeze({[-1]:2.08,1:2.18});
const PRE=[
 {t:0,label:'Ready',hips:[0,.80,0],stand:true},
 {t:.55,label:'Step in',hips:[.08,.79,-.16],pitch:8,stand:true,near:true},
 {t:.90,label:'Hands on the sill',hips:[.12,.74,-.20],pitch:28,stand:true,near:true},
 {t:1.25,label:'Hop onto the sill',hips:[.34,.955,-.24],pitch:82,over:true},
 {t:1.60,label:'Slide over',hips:[.50,1.005,-.28],pitch:115,heading:10,over:true},
 {t:HANG,label:'Reach for the floor',hips:[.72,.91,-.32],pitch:166,heading:40,roll:-5,far:true},
 {t:DOWN,label:'Down the wall',hips:[.765,.875,-.32],pitch:167,heading:46,roll:-5,far:true},
 {t:LANDS[1],label:'Hands to the floor',hips:[.92,.78,-.32],pitch:190,heading:46,roll:-5,far:true},
];
const TURN=35; // the head turns this way coming down, so the muzzle stays off the wall
// Spine and head (relative to their parents) over the whole motion: flex / side / twist, nod / tilt / turn. The head
// tucks a little as the hands land (nod 10): tilted back, the goat's ears went 2.3 cm into the floor for 40 ms while the
// clearance fit swung its head from one turn to the next.
const SHAPE_PRE=[[0,0,0,0,0,0,0],[.55,5,0,0,0,0,0],[.90,8,0,0,-10,0,0],[1.25,6,0,0,-25,0,0],[1.60,10,0,0,-30,0,0],[HANG,25,0,0,-20,0,TURN],[DOWN,28,0,0,10,0,TURN],[LANDS[1],32,0,0,10,0,TURN],[ROLL.start,ROLL.flex,0,0,0,0,-15]];
// After the roll, by seconds past its end (at rest on the seat and the hooves): the right foot slides in toward the
// seat, then the left, the seat holding the body; lean forward over the feet, the seat still down, until the centre of
// mass is over them; rise; with the weight on the right foot, the left steps back half way; with it on the left, the
// right steps back to its mark; with it on the right, the left steps round to its mark, turning to face on; settle. The
// spine and head unfold to standing meanwhile.
const GETUP=Object.freeze({inR:.30,inL:.58,lean:.80,rise:1.18,weightR:1.36,leftBack:1.64,weightL:1.82,rightDown:2.06,weightR2:2.22,leftDown:2.48,stand:2.70});
// The knees point up and out while the body sits, leans and rises over the feet (in the pelvis frame), and forward
// again through the steps: left to the default (forward), the bend lay along a sitting leg's hip-ankle line, the side
// the roll left was carried on, and the knees splayed out and down, into the floor (the rabbit's knees 9 cm under it,
// its trousers 19; the sheep's 16, the pigs' 14). Straight up, the thighs met the chest leaning over them (4 to 5 cm);
// out at about 30 degrees, it leans between them.
const KNEE_UP=[.3,1,.6];
// (The lean's row is set with its pitch: see the sit-to-stand.)
const SHAPE_POST=[[GETUP.lean,45,0,0,-8,0,0],[GETUP.rise,15,0,0,-5,0,0],[GETUP.weightL,4,0,0,0,0,0],[GETUP.stand,0,0,0,0,0,0]],G=9.81;
export function createWindowDive(worker,profile={id:'horse'}){
 // The roll turns about the body's own lowest point: a tail is soft and bends out of the way (fitted below), so only
 // its root, which cannot, is ever the pivot.
 const body=createTraversalBody(worker),tails=createTailBend(worker),probe=createSurfaceProbe(worker,{stride:2,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),fitB=bodyFit(body,probe),back=fitB.back;
 const pre=PRE.map(k=>({...k,hips:[k.hips[0]-(k.near?back:0)+(k.far?back:0),(k.stand?fitB.stand(k.hips[1]):k.hips[1])+(k.over?back:0),k.hips[2]]}));
 const shapePre=track(SHAPE_PRE);
 const chestOf=(hips,hipsQ,spineQ)=>({chestQ:hipsQ.clone().multiply(spineQ),chest:hips.clone().add(body.offsets.spine.clone().applyQuaternion(hipsQ))});
 const restWrist=s=>body.at0('hand'+s).sub(body.at0('spine')).toArray();
 const d=V(Math.cos(ROLL.dir*DEG),0,Math.sin(ROLL.dir*DEG)),axis=V(0,1,0).cross(d).normalize();
 // The rolling shape, in the trunk's own frames: a squat tuck (heels under the seat, so the hooves arrive at the
 // floor as the body sits up: 0.7 cm short, measured), arms in.
 const TUCK={'leg-1':[.06,-.33,-.14],leg1:[.06,-.33,.14],'arm-1':[.28,.04,-.26],arm1:[.28,.04,.12]},TUCK_ELBOW={'arm-1':[.3,0,1],arm1:[.8,0,.4]};
 // fit: this character's clearance corrections; steady: its limbs' bend directions (both solved below, null until then).
 let fit=null,steady=null,turnRef=null,balance=null,onSill=null,onSeat=null;
 const posed=(tr,limbs,t)=>posedFrom(tr,limbs,{elbowAway:[1,.15,0],poles:steady&&t!==undefined?id=>steady(id,t):null,offsets:fit?.limb&&t!==undefined?id=>fit.limb(id,t):null,snaps:fit?.plant&&t!==undefined?id=>fit.plant(id,t):null,turns:turnRef&&t!==undefined?b=>turnRef(b,t):null});
 const tuckLimbs=Object.fromEntries(Object.entries(TUCK).map(([k,p])=>[k,k.startsWith('leg')?{f:'pelvis',p}:{f:'chest',p,elbow:TUCK_ELBOW[k]}]));
 const lowest=()=>{probe.update();return probe.lowest();};
 // The seat's lowest point: the lowest the hips bone carries (the trouser legs are the same mesh as the seat).
 const seatLow=()=>{probe.update();let b={y:Infinity};for(let i=0;i<probe.count;i++)if(probe.boneNames[probe.bone[i]]==='hips'&&probe.y[i]<b.y)b={x:probe.x[i],y:probe.y[i],z:probe.z[i],part:probe.names[probe.part[i]]};return b;};
 const shapeOf=row=>{const [flex,side,twist,nod,tilt,turn]=row;return {spineQ:relQ(flex,side,twist),headQ:relQ(nod,tilt,turn)};};
 // ---- the roll: from the chest-flat start pose the curled body turns about the floor contact under it ----
 // Its pace comes from energy, not keys: kinetic energy about the contact (1/2 I_P w^2) plus gravity, conserved
 // while it rolls. Where the contact jumps from one part of the body to another (neck to back, back to seat), the
 // landing part takes an impact: angular momentum about the new contact is kept, and energy is lost. Once the hooves
 // land it rocks on over the seat to rest (ROCK).
 const s0=shapeOf(shapePre(ROLL.start)),q0=yawQ(ROLL.dir).multiply(bodyQ((270-ROLL.flex)*DEG));
 // The hips lie where the descent brings them, and the body's lowest point sets only their height: placed by its lowest
 // point instead (the horse's mane crest, most others' shirt on the back, the goat's horns), each body lay up to 19 cm
 // along the wall from the horse's (the goat's 30 cm the other way), the left hand's mark under its shoulder with it, out
 // of reach as that hand came down (8 to 13 cm short on six species). A body wider than the horse's starts the roll
 // that much farther from the wall it rolls along.
 let p0=V(ROLL.hips[0]+fitB.wide,.5,ROLL.hips[1]);
 for(let i=0;i<2;i++){const tr={hips:p0,hipsQ:q0,...s0,...chestOf(p0,q0,s0.spineQ)};body.pose(posed(tr,tuckLimbs),'roll start');p0=p0.clone().add(V(0,-lowest().y,0));}
 // ROCK: how far the body rocks on over its seat once the hooves are down, braked to rest by them.
 const ROCK=32*DEG,rollRows=[],impacts=[],SOFT=.04;let caughtAt=null;{const dth=.5*DEG;let q=q0.clone(),p=p0.clone(),t=0,w=ROLL.omega,E=null,prev=null,u=0,caught=null,brake=0,rocked=0;
  for(let k=0;k*dth<=ROLL.maxTurn*DEG;k++){const tr={hips:p,hipsQ:q,...s0,...chestOf(p,q,s0.spineQ)};const P=body.pose(posed(tr,tuckLimbs),'roll');let L=lowest();if(brake)L=seatLow();
   if(Math.abs(L.y)>1e-9){p=p.clone().add(V(0,-L.y,0));for(const n of Object.keys(P))P[n].y-=L.y;}
   const contact=V(L.x,0,L.z),c=body.com(P),IP=inertiaAbout(massPoints(P),contact,axis),U=BODY_MASS*G*c.y;
   // braked as w0 (1 - rocked / ROCK)^.75: to rest over ROCK with the braking itself fading out, so the get-up starts at
   // rest without a pull (braked evenly, it would hand over a backward turn of 12 rad/s^2)
   let jumped=false;if(brake){rocked+=dth;w=brake*Math.pow(Math.max(0,1-rocked/ROCK),.75);}else if(E===null)E=.5*IP*w*w+U;
   else if(prev&&contact.distanceTo(prev.contact)>.03){const Ic=IP-BODY_MASS*axis.clone().cross(c.clone().sub(contact)).lengthSq(),vc=axis.clone().cross(c.clone().sub(prev.contact)).multiplyScalar(prev.w);
    w=Math.max(0,(Ic*prev.w+BODY_MASS*c.clone().sub(contact).cross(vc).dot(axis))/IP);E=.5*IP*w*w+U;jumped=true;}
   else w=Math.sqrt(Math.max(0,2*(E-U)/IP));
   // The hooves land with the seat still down: the body rocks on over the seat, the hooves braking it to rest over ROCK.
   // Turning about the hoof instead lifted the seat with the centre of mass 40 cm behind the feet and 35 J to rise over
   // them where it needed 180 (it would fall back); stopped dead on both, it sat 6 cm behind its seat, tipping back.
   const landed=!brake&&caught===null&&/hoof|boot|foot|toes/.test(L.part);if(landed){brake=prev.w;rocked=dth;w=brake*Math.pow(1-rocked/ROCK,.75);jumped=false;}
   // Each step's time from its mean spin (the step before's alone ran 12% fast as the body slowed rising about the hoof,
   // and the curve through the steps had to lose it at the hand-over), across an impact the spin before it.
   if(prev)t=prev.t+(jumped||prev.w+w<1e-6?dth/prev.w:2*dth/(prev.w+w));if(jumped)impacts.push({t,from:prev.part,to:L.part,lost:prev.E-E});
   const up=V(0,1,0).applyQuaternion(tr.chestQ),about=landed?prev.contact:contact;rollRows.push({t,p:p.clone(),q:q.clone(),turn:k*dth,contact:about.toArray(),part:L.part,w,com:c,upright:up.y,u,impact:jumped,rock:!!brake});
   // Stop once the rock has the body at rest, sitting up (chest within 10 degrees of upright), or if the roll runs out
   // of speed. Stopped at 35 degrees, just before the hooves landed, the get-up had to catch the roll's spin (3.3 rad/s)
   // itself, with the feet 40 cm ahead of the centre of mass (46% of the body's weight of phantom force).
   if(landed)caught=t;
   if(brake?w<.05:w<.25||up.y>Math.cos(10*DEG))break;
   const r=Q().setFromAxisAngle(axis,dth);q=r.clone().multiply(q);p=p.clone().sub(about).applyQuaternion(r).add(about);prev={contact:about,w,part:L.part,E,t};}
  caughtAt=caught;}
 const last=rollRows.at(-1),pivot=V(...last.contact),ROLL_T=last.t,ROLL_END=ROLL.start+ROLL_T,CATCH_END=ROLL_END,END=CATCH_END+SHAPE_POST.at(-1)[0];
 for(const r of rollRows)r.t+=ROLL.start;
 // The roll leaves and rejoins the keyed trunk at its own speed: the hips moving as the body turns about the first
 // contact, and as it turns about the seat at the end (all but at rest).
 const rEnd=rollRows.at(-1),D=END,c0=V(...rollRows[0].contact),hipsSpin=axis.clone().cross(p0.clone().sub(c0)).multiplyScalar(ROLL.omega);
 // At the end the hips also carry the turn's own acceleration (its slowing, and its pull toward the axis), on both sides
 // of the hand-over: left to each track's own, the roll's ended at none and the get-up's started from its keys', and
 // the floor's push stepped by 3 body weights there.
 const endSpin=axis.clone().multiplyScalar(rEnd.w),arm=rEnd.p.clone().sub(pivot),endVel=axis.clone().cross(arm).multiplyScalar(rEnd.w);
 const rPre=rollRows.at(-2),alpha=rPre&&rEnd.t>rPre.t?(rEnd.w-rPre.w)/(rEnd.t-rPre.t):0,endAcc=axis.clone().cross(arm).multiplyScalar(alpha).add(axis.clone().cross(axis.clone().cross(arm)).multiplyScalar(rEnd.w*rEnd.w));
 // A landing part of the body is soft, not rigid: each impact's change of velocity is spread over about SOFT seconds
 // (an average of the trajectory, then re-seated on the floor, the re-seat averaged the same way), so the floor never
 // has to stop it in zero time. Re-seated exactly, sample by sample, the lowest point's jump from the mane to the
 // shoulder and on to the seat came back as a 0.6 m/s step of the hips' fall in 6 ms (14 body weights). Between the
 // roll's steps the hips and the turn about the axis follow smooth curves through them, from and to the roll's own
 // motion at its ends: joined by straight lines and slerps, they turned at every step (half a degree, 2 to 17 ms apart),
 // which the averaging hides but its ends do not (the hips' acceleration swung from +10 to -22 m/s^2 in the roll's last
 // 4 ms, and the turn met the get-up's 0.2 rad/s apart).
 const uni=[];{const t0=rollRows[0].t,t1=rollRows.at(-1).t,n=Math.ceil((t1-t0)/.0025),last=rollRows.length-1;
 // The raw path: smooth between the impacts, each a step of the hips' velocity and the spin at its step, from the turn
 // about the contact before to the turn about the one after (one curve through every step rang about each impact,
 // which the softening kept: the hips' fall swung by 34 m/s^2 within 5 ms at the hoof's landing).
  const cuts=[0,...rollRows.flatMap((r,i)=>r.impact&&i>0&&i<last?[i]:[]),last],spinAbout=(r,c,w)=>axis.clone().cross(r.p.clone().sub(V(...c))).multiplyScalar(w);
  const pieces=cuts.slice(0,-1).map((a,j)=>{const b=cuts[j+1],rs=rollRows.slice(a,b+1),m=rs.length-1,pb=rollRows[b-1];
   const vA=a?spinAbout(rollRows[a],rollRows[a].contact,rollRows[a].w):hipsSpin,vB=b===last?endVel:spinAbout(rollRows[b],pb.contact,pb.w),end=b===last?{accel:{[m]:endAcc.toArray()}}:{};
   return {t1:rollRows[b].t,pos:track(rs.map(r=>[r.t,...r.p.toArray()]),{0:vA.toArray(),[m]:vB.toArray()},{limit:false,...end}),
    turn:track(rs.map(r=>[r.t,r.turn]),{0:[a?rollRows[a].w:ROLL.omega],[m]:[b===last?rEnd.w:pb.w]},{limit:false,...(b===last?{accel:{[m]:[alpha]}}:{})})};});
  const piece=t=>pieces.find(q=>t<=q.t1+1e-12)||pieces.at(-1),rockFrom=rollRows.find(r=>r.rock)?.t??Infinity;
  const raw=Array.from({length:n+1},(_,k)=>{const t=t0+(t1-t0)*k/n,q=piece(t);return {t,p:V(...q.pos(t)),a:q.turn(t)[0]};});
  // Softened by a triangle (the hips' and spin's averages, weights falling off linearly over H samples either side):
  // a box stepped the floor's push at its edges as they passed each impact. The window is whole wherever it fits and
  // gives way to the raw path over the next H samples toward each end (a smoothstep), so the softened roll starts and
  // ends exactly where the keyed descent hands over and the get-up takes over (a one-sided window shifted them by up
  // to 2 cm: a pop of the whole body; narrowed sample by sample instead, its edge kinked the hips' path, 12 m/s^2).
  // The roll's impacts are all well inside: the first comes 90 ms after its start, the rock takes 0.6 s.
  const H=Math.round(.75*SOFT/.0025),W=(H+1)*(H+1),fits=k=>Math.min(k,n-k)>=H,whole=k=>smooth((Math.min(k,n-k)-H)/H),seated=[];
  for(let k=0;k<=n;k++){let p=raw[k].p.clone(),a=raw[k].a;if(fits(k)){const avg=V();let ang=0;for(let j=k-H;j<=k+H;j++){const f=H+1-Math.abs(j-k);avg.addScaledVector(raw[j].p,f);ang+=f*raw[j].a;}
    const w=whole(k);p.lerp(avg.divideScalar(W),w);a+=(ang/W-a)*w;}
   const q=Q().setFromAxisAngle(axis,a).multiply(q0),tr={hips:p,hipsQ:q,...s0,...chestOf(p,q,s0.spineQ)};body.pose(posed(tr,tuckLimbs),'roll soft');seated.push({t:raw[k].t,p,q,down:-(raw[k].t>=rockFrom?seatLow():lowest()).y});}
  // The re-seat goes with the window: the raw path is on the floor already at every step (re-seated sample by sample
  // there, the lowest vertex's own jumps came back as a 13 m/s^2 dip of the hips).
  for(let k=0;k<=n;k++){let y=0;if(fits(k)){for(let j=k-H;j<=k+H;j++)y+=(H+1-Math.abs(j-k))*seated[j].down;y*=whole(k)/W;}uni.push({t:seated[k].t,p:seated[k].p.clone().add(V(0,y,0)),q:seated[k].q});}}
 const rollPos=track(uni.map(r=>[r.t,...r.p.toArray()]),{0:hipsSpin.toArray(),[uni.length-1]:endVel.toArray()},{accel:{[uni.length-1]:endAcc.toArray()}});
 const rollRot=spinTrack(uni.map((r,i)=>[r.t,r.q,i===0?axis.clone().multiplyScalar(ROLL.omega):i===uni.length-1?endSpin:undefined]));
 const rollAt=t=>{let i=0;while(i<rollRows.length-1&&rollRows[i+1].t<t)i++;return {hips:V(...rollPos(t)),hipsQ:rollRot(t),contact:rollRows[i].contact,part:rollRows[i].part};};
 // Spine and head over the whole motion: the pre-roll keys, the roll's fixed curl, then unfolding.
 const SHAPE=[...SHAPE_PRE,[ROLL_END,...SHAPE_PRE.at(-1).slice(1)],...SHAPE_POST.map(([dt,...v])=>[CATCH_END+dt,...v])];
 let shape=track(SHAPE);const shapeAt=t=>shapeOf(shape(clamp(t,0,D)));
 // ---- keyed trunk: before the roll, then from the roll's end up to standing on the tile centre ----
 // The descent hands over at the roll's own spin (the hips moving as the body turns about the contact).
 const preRows=pre.map(k=>({t:k.t,p:V(...k.hips),q:yawQ(k.heading||0).multiply(bodyQ((k.pitch||0)*DEG,(k.roll||0)*DEG))}));
 // The get-up. The hooves land (FOOT_DOWN) 40 cm along the wall from the centre of mass (the roll's own reach: drawing
 // the heels 14 cm nearer the seat moved them 4 cm), and the roll's momentum after their landing is 35 J where rising
 // over them takes 180: so the body rocks on over its seat to sitting, draws its feet in, leans its weight forward onto
 // them with the seat still down, rises over them, and steps back onto the tile centre, each foot in turn with the
 // weight over the other, turning to face on: the hips' keys over the support of the moment, heights held up by the
 // legs. Before, the get-up rose short of the feet and the feet slid 25 and 70 cm into the stance under load.
 // A roll that ends before its hooves land (the skunk's and cow's run out of spin climbing over their tails' roots, the
 // feet still tucked up to 50 cm off the floor) brings them down from DROP_STALL before its end, or from 0.05 s into it
 // if that is later, as it slows. Pulled from the tuck in the last 60 ms, the skunk's toes struck at 16.7 m/s, its seat
 // bounced 4.5 cm and its sit-up read 322% of its weight. Over the last 0.18 s, the legs fell faster than gravity off a
 // trunk that rolls on as if they were still tucked (the floor's push 0 to -200 N), and the plan, keeping the pressure
 // point on the root, wiggled the hips 2 cm in 50 ms (the sit-up 73%, the first step 56). Landing later instead (eased
 // down over 0.3 s after the roll), the body lay on its tail's root with nothing else under it, and the plan moved the
 // hips 9 cm before the roll to meet that (the left elbow folded to 163 degrees).
 const DROP_STALL=.33;
 const catchT=CATCH_END,T=k=>CATCH_END+GETUP[k],catchKey={t:catchT,p:rEnd.p,q:rEnd.q},FOOT_DOWN=caughtAt===null?ROLL_END:ROLL.start+caughtAt,TUCKED=caughtAt===null?Math.max(ROLL.start+.05,ROLL_END-DROP_STALL):FOOT_DOWN-.06,rDown=rollRows.find(r=>r.t>=FOOT_DOWN-1e-9)||rEnd;
 const ANKLE=body.at0('hoof1').y,feet=Object.fromEntries([-1,1].map(s=>[s,toWorld({hips:rDown.p,hipsQ:rDown.q},'pelvis',TUCK['leg'+s]).setY(ANKLE)]));
 const R1=V(...fitB.foot(1,1)),L1=V(...fitB.foot(-1,1)),turned=(h,pitch)=>yawQ(h).multiply(bodyQ(pitch*DEG));
 const hipsOver=(f,y,toward,k=.12)=>f.clone().lerp(toward,k).setY(fitB.stand(y));
 // The body turns to face on along one smooth curve over the whole get-up (heading), each key leaning (pitch) as it
 // rises: turned key by key, a turn on one foot asked the hoof for 50 to 140 N·m it cannot twist.
 const heading=t=>ROLL.dir*(1-smooth((t-CATCH_END)/GETUP.stand)),lean=(k,pitch)=>({t:T(k),h:heading(T(k)),pitch});
 // The lean keeps the seat on the floor: the hips come down as the pelvis tips up from lying back (turned about the
 // hips alone, the seat rose off the floor 0.3 s before the centre of mass was over the feet, and the plan dragged it
 // 20 cm forward). Posed in the tuck, the lowest point the hips bone carries (the seat: the trouser legs are the same
 // mesh) is set on the floor.
 const seatOn=(p,q,k)=>{const sh=shapeOf(shape(T(k))),tr={hips:p,hipsQ:q,...sh,...chestOf(p,q,sh.spineQ)};body.pose(posed(tr,tuckLimbs),'seat');probe.update();let lo=Infinity;
  for(let i=0;i<probe.count;i++)if(probe.boneNames[probe.bone[i]]==='hips')lo=Math.min(lo,probe.y[i]);return p.clone().setY(p.y-lo);};
 // The sit-to-stand. Sat after the roll, every body's centre of mass was 9 to 22 cm behind its feet's support, the
 // trunk leaning back (pitch -5) and the knees already folded 115 to 145 degrees, so the seat could not let go of it:
 // the plan threw the body at the feet as the seat lifted (28 m/s^2, turned round in 3 ms), and before that the splayed
 // thigh and the hands on the floor behind the hips had hidden the gap. So each foot first slides in toward a point
 // WIDE outside its hip joint (IN) until its knee folds to fold degrees (from the leg's lengths), the seat holding the
 // body; then the lean tips the trunk forward (pitch), the arms reaching forward, until the centre of mass is MARGIN
 // inside the feet's own support (their skin on the floor, as the balance reads it). Drawn straight in toward its hip,
 // a shin pressed into the belly as the trunk leant over it (5 cm). The chest leans CHEST degrees in all, the hips'
 // pitch and the spine's flex for the rest, and the head nods back so the face looks GAZE below level: curled its 45
 // degrees on top of the hips' pitch, the spine tipped the chest to 80 and hung the head down between the feet.
 const CHEST=60,GAZE=25,leanShape=pitch=>{const flex=clamp(CHEST-pitch,0,45);return [flex,0,0,clamp(GAZE-pitch-flex,-35,0),0,0];};
 const FOLD=[125,140],BOW=35,MARGIN=.03,WIDE=.18,KNEE_WALL=.12,feetProbe=createSurfaceProbe(worker,{stride:1,include:m=>/hoof|boot|foot|toe/i.test(m.name)});
 // The fold is read across the floor: sitting, the hip joints are below the ankles (4 cm off the floor to 12), so
 // rising they pass the ankles' height, nearest them there (capped at the lean key, the knees folded on to 156-160
 // degrees as the hips rose).
 const inMark=(s,hips,q,h,fold)=>{const H=hips.clone().add(body.offsets.thigh[s].clone().applyQuaternion(q)).addScaledVector(V(Math.sin(h*DEG),0,-Math.cos(h*DEG)),-s*WIDE).setY(ANKLE),A=feet[s],E=H.clone().sub(A),D0=A.clone().sub(H),T0=body.L[s].thigh,S0=body.L[s].shin;
  // the furthest along A -> under the hip joint that keeps the ankle dmin from it (the distance falls along the way)
  const dmin2=T0*T0+S0*S0-2*T0*S0*Math.cos((180-fold)*DEG),a=E.lengthSq(),b=2*D0.dot(E),c=D0.lengthSq()-dmin2;if(c<=0)return A.clone();
  const disc=b*b-4*a*c;return A.clone().addScaledVector(E,disc<0?1:clamp((-b-Math.sqrt(disc))/(2*a)));};
 // An arm reaching forward from its shoulder, a little out and down, kept clear of the wall's face.
 const reachFwd=(tr,h,s)=>{const F=V(Math.cos(h*DEG),0,Math.sin(h*DEG)),dir=F.clone().addScaledVector(V(0,1,0).cross(F),-s*.2).add(V(0,-.2,0)).normalize(),
  w=tr.chest.clone().add(body.offsets.shoulder[s].clone().applyQuaternion(tr.chestQ)).addScaledVector(dir,.9*(body.L[s].upper+body.L[s].fore));w.x=Math.max(w.x,WINDOW.edge+WINDOW.half+.12);return w;};
 const inside=(h,x,z)=>{let d=Infinity,inn=true;for(let i=0;i<h.length;i++){const [ax,az]=h[i],[bx,bz]=h[(i+1)%h.length],ex=bx-ax,ez=bz-az,L=Math.hypot(ex,ez)||1e-9;if(ex*(z-az)-ez*(x-ax)<0)inn=false;
  const u=clamp(((x-ax)*ex+(z-az)*ez)/(L*L));d=Math.min(d,Math.hypot(x-ax-u*ex,z-az-u*ez));}return inn?d:-d;};
 const seats={},leanAt=(pitch,fold)=>{const tL=T('lean'),h=heading(tL),q=turned(h,360+pitch),p=seats[pitch]??=seatOn(rEnd.p.clone().add(V(0,0,.02)),q,'lean'),sh=shapeOf(leanShape(pitch)),tr={hips:p,hipsQ:q,...sh,...chestOf(p,q,sh.spineQ)};
  const IN={[-1]:inMark(-1,p,q,h,fold),1:inMark(1,p,q,h,fold)},limbs={};for(const s of [-1,1]){limbs['leg'+s]={f:'world',p:IN[s].toArray(),hoof:0,heading:ROLL.dir,plant:true,knee:KNEE_UP};limbs['arm'+s]={f:'world',p:reachFwd(tr,h,s).toArray()};}
  const P=body.pose(posed(tr,limbs),'lean'),c=body.com(P);feetProbe.update();const sup=supportAt(feetProbe,[],c.toArray());
  return {pitch,fold,p,IN,margin:sup.hull?inside(sup.hull,c.x,c.z):-Infinity,clear:P.knee1.x>=WINDOW.edge+WINDOW.half+KNEE_WALL};};
 // The least fold that reaches it within BOW degrees of lean (folded deepest, the pig foreman's trouser seat went 4 cm
 // into the floor), then the deepest fold with the least lean that does, then the nearest (the rabbit's and dog's furry
 // feet hold from the ankle forward, their heels off the floor). At the lean the right knee is KNEE_WALL clear of the
 // wall's face.
 let leanFit=null,deep=null,best=null;
 for(let fold=FOLD[0];fold<=FOLD[1]&&!leanFit;fold+=3)for(let pitch=-5;pitch<=45;pitch+=2){const e=leanAt(pitch,fold);if(!e.clear)break;if(!best||e.margin>best.margin)best=e;
  if(e.margin>=MARGIN){if(pitch<=BOW)leanFit=e;else deep=e;break;}}
 leanFit??=deep??best??leanAt(45,FOLD[0]);
 shape=track(SHAPE.map(r=>r[0]===T('lean')?[r[0],...leanShape(leanFit.pitch)]:r));
 const IN=leanFit.IN,midIn=IN[-1].clone().add(IN[1]).multiplyScalar(.5);
 // LH: the left foot's halfway mark, back toward the tile centre and in from where it stepped in.
 const LH=V(IN[-1].x+(L1.x-IN[-1].x)*.45,ANKLE,IN[-1].z+(L1.z-IN[-1].z)*.55);
 const leanKey=lean('lean',leanFit.pitch),getup=[{...leanKey,p:leanFit.p},{...lean('rise',28),p:V(midIn.x,fitB.stand(.58),midIn.z-.06)},{...lean('weightR',18),p:hipsOver(IN[1],.67,IN[-1])},
  {...lean('leftBack',12),p:IN[1].clone().add(LH).multiplyScalar(.5).setY(fitB.stand(.72))},{...lean('weightL',8),p:hipsOver(LH,.75,IN[1])},
  {...lean('rightDown',5),p:LH.clone().add(R1).multiplyScalar(.5).setY(fitB.stand(.78))},{...lean('weightR2',3),p:hipsOver(R1,.79,LH)},
  {...lean('leftDown',1),p:L1.clone().add(R1).multiplyScalar(.5).setY(fitB.stand(.80))}].map(k=>({...k,q:turned(k.h,k.pitch)}));
 const stand={t:END,p:body.at0('hips').add(V(1,0,0)),q:Q(),h:0,pitch:0};
 const trunkRows=[...preRows,{t:ROLL.start,p:p0,q:q0},catchKey,...getup,stand];
 const iStart=trunkRows.findIndex(r=>r.t===ROLL.start),iEnd=iStart+1;
 const posTrack=track(trunkRows.map(r=>[r.t,...r.p.toArray()]),{[iStart]:hipsSpin.toArray(),[iEnd]:endVel.toArray()},{accel:{[iEnd]:endAcc.toArray()}}),rollTurn=rEnd.turn/DEG;
 // After the roll its own frame carries on: heading ROLL.dir, the roll's turn added to its starting pitch, from the roll's
 // spin and its slowing (C2, as before the roll; the rotation spline stepped the turning's acceleration at every key).
 const postRot=angleTrack([[CATCH_END,ROLL.dir,270-ROLL.flex+rollTurn,0],...[...getup,stand].map(k=>[k.t,k.h,360+k.pitch,0])],{0:[0,rEnd.w/DEG,0]},{0:[0,alpha/DEG,0]});
 // Up to the roll the trunk turns by heading, pitch and roll, each on a quintic (C2), from rest into the roll's own
 // spin at its start; the rotation spline's cubic log map stepped the angular acceleration at every key (the hips' centre of mass
 // jolted by 12 m/s^2 at the reach). After the roll, from its arbitrary end, the rotation spline.
 const preRot=angleTrack([...pre.map(k=>[k.t,k.heading||0,k.pitch||0,k.roll||0]),[ROLL.start,ROLL.dir,270-ROLL.flex,0]],{0:[0,0,0],[pre.length]:[0,ROLL.omega/DEG,0]});
 // The clearance corrections are zero until solved, and held at zero through the roll.
 function trunkAt(t){const s=t>ROLL.start&&t<ROLL_END?s0:shapeAt(t);let hips,hipsQ;if(t>ROLL.start&&t<CATCH_END){const r=rollAt(t);hips=r.hips;hipsQ=r.hipsQ;}else{hips=V(...posTrack(t));hipsQ=t<=ROLL.start?preRot(t):postRot(t);}
  if(onSill)hips=hips.clone().add(onSill(t));if(onSeat)hips=hips.clone().add(onSeat(t));if(balance)hips=hips.clone().add(balance.shift(t));
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
 // As the body lies back onto its hands its right elbow turns up (UP, in the world) by the roll's start: still bent back
 // along the body, a body lying lower than the horse's (its back's surface nearer its bones: the skunk, cow and rabbit 4
 // to 5 cm) folded the arm over the hand toward the trunk's middle, and the upper arm went 4 to 6 cm into the lower trunk
 // (the horse's half a centimetre clear). Turned up, it clears the trunk on every mammal; out to the side is the wall.
 const UP=[.2,1,.3];
 // The right hand braces on the far face as the body tips over the sill: off the sill top and over its edge onto the
 // face, down the face under the body's weight, then, once the left hand is down, one step onto its floor mark. Pressed
 // on the face it pushes the body out from the wall below the edge, which slows the tip (a belly on the edge is an
 // inverted pendulum: under gravity alone the tip runs from 1.7 to 4.1 rad/s before a hand reaches the floor). It slides
 // down rather than stepping: lifted mid-way for 50 ms, the tip ran on with nothing to slow it (55% of body weight).
 // Its elbow points out to the right along the wall (OUT, in the world): bent away from the wall the arm went 7.5 cm into
 // the chest as the shoulder neared the wall, and out to the side in the chest's frame it turned into the wall as the
 // chest tipped. WALL: the face's outward normal; the palm presses against it.
 const WALL=[1,0,0],OUT=[.25,0,1],BRACE=[[1.42,{f:'world',p:[.62,.70,-.04],face:WALL,elbowTo:OUT,arc:.12,arcTo:[.6,.8,0]}],[1.58,{f:'world',p:[.62,.70,-.04],face:WALL,elbowTo:OUT}],
  [1.84,{f:'world',p:[.62,.32,-.12],face:WALL,elbowTo:OUT}],[2.06,{f:'world',p:[.62,.32,-.12],face:WALL,elbowTo:OUT}]];
 let LIMB;const buildLimbs=()=>{const handAt={[-1]:{...floorHand(ROLL.start,-1,[.03,0,-.15],30),elbow:FLOOR_ELBOW[-1],plant:true},1:{...floorHand(LANDS[1],1,[0,0,0],50),elbow:FLOOR_ELBOW[1],plant:true}},
  aim=(t,s,k)=>({...dangle(t,s,handAt[s].p.map((x,j)=>x-shoulderAt(t,s).getComponent(j)),k),soft:.03});LIMB={
  'leg-1':[[0,rest.leg(-1)],[.55,{f:'world',p:[-.035-back,fitB.ankle,-.40],hoof:0,plant:true}],[.90,{f:'world',p:[-.035-back,fitB.ankle,-.40],hoof:0,lift:.25,plant:true}],[1.25,{f:'pelvis',p:[-.06,-.56,-.13]}],[1.60,{f:'pelvis',p:[-.06,-.60,-.12]}],[HANG,{f:'pelvis',p:[.20,-.56,-.12]}],[DOWN,{f:'pelvis',p:[.12,-.52,-.12]}],[LANDS[1],{f:'pelvis',p:[-.12,-.30,-.13]}],[ROLL.start,{f:'pelvis',p:TUCK['leg-1']}],[TUCKED,{f:'pelvis',p:TUCK['leg-1']}]],
  leg1:[[0,rest.leg(1)],[.55,{f:'world',p:[.20-back,fitB.ankle,-.06],hoof:0,plant:true}],[.90,{f:'world',p:[.20-back,fitB.ankle,-.06],hoof:0,lift:.25,plant:true}],[1.25,{f:'pelvis',p:[-.04,-.56,.13]}],[1.60,{f:'pelvis',p:[-.06,-.60,.12]}],[HANG,{f:'pelvis',p:[.20,-.56,.12]}],[DOWN,{f:'pelvis',p:[.12,-.52,.12]}],[LANDS[1],{f:'pelvis',p:[-.12,-.30,.13]}],[ROLL.start,{f:'pelvis',p:TUCK.leg1}],[TUCKED,{f:'pelvis',p:TUCK.leg1}]],
  'arm-1':[[0,rest.arm(-1)],[.55,{f:'world',p:[.36,.92,-.42]}],[.90,{f:'world',p:[.44,.91,-.42],palm:0}],[1.25,{f:'world',p:[.47,.91,-.42],palm:0}],[1.60,dangle(1.60,-1,[.35,-1,-.05])],[HANG,aim(HANG,-1,.97)],[LANDS[-1],handAt[-1]],[ROLL.start,handAt[-1]],[ROLL.start+.12,{f:'chest',p:body.offsets.shoulder[-1].clone().add(V(.05,.05,-.24)).toArray(),elbow:TUCK_ELBOW['arm-1']}],[ROLL.start+.24,{f:'chest',p:TUCK['arm-1'],elbow:TUCK_ELBOW['arm-1']}],[ROLL_END,{f:'chest',p:TUCK['arm-1'],elbow:TUCK_ELBOW['arm-1']}]],
  arm1:[[0,rest.arm(1)],[.55,{f:'world',p:[.36,.92,.02]}],[.90,{f:'world',p:[.44,.91,0],palm:0}],[1.25,{f:'world',p:[.47,.91,-.02],palm:0}],...BRACE.map(([t,k])=>[t,k]),[LANDS[1],handAt[1]],[ROLL.start,{...handAt[1],elbowTo:UP}],[ROLL.start+.18,{f:'chest',p:TUCK.arm1,elbow:TUCK_ELBOW.arm1}],[ROLL_END,{f:'chest',p:TUCK.arm1,elbow:TUCK_ELBOW.arm1}]],
 };
 // After the roll both hooves stay where they landed (turning flat as they take the weight) until the stand,
 // which steps them into the stance on the tile centre.
 // Each step comes off its mark, arcs over and arrives over the new one, flat, before setting down (the climb's).
 const hoofAt=(p,heading)=>({f:'world',p:p.toArray(),hoof:0,heading,plant:true}),over=(p,heading,arc)=>({f:'world',p:[p.x,ANKLE+.025,p.z],hoof:0,heading,arc});
 // A foot lifts once the weight is over the other (lifted as the weight still crossed, the pressure point had to jump
 // from between the feet to the one left down: 49% of the body's weight).
 // The knees point up and out while the body sits, draws its feet in, leans and rises (KNEE_UP), and forward again
 // through the steps back. Once the body sits each foot slides in along the floor off its landing mark, the right first
 // (lifted, a foot left the seat and the other foot alone holding the body: the skunk's steps read 40 and 80% of its
 // weight, 30 and 56 sliding).
 const up=k=>({...k,knee:KNEE_UP});
 LIMB.leg1.push([FOOT_DOWN,up(hoofAt(feet[1],ROLL.dir))],[T('inR')-.26,up(hoofAt(feet[1],ROLL.dir))],[T('inR'),up(hoofAt(IN[1],ROLL.dir))],[T('weightL')+.03,up(hoofAt(IN[1],ROLL.dir-6))],[T('rightDown')-.04,over(R1,ROLL.dir-52,.05)],[T('rightDown'),hoofAt(R1,ROLL.dir-56)],[END,hoofAt(R1,0)]);
 LIMB['leg-1'].push([FOOT_DOWN,up(hoofAt(feet[-1],ROLL.dir))],[T('inL')-.26,up(hoofAt(feet[-1],ROLL.dir))],[T('inL'),up(hoofAt(IN[-1],ROLL.dir))],[T('weightR')+.03,up(hoofAt(IN[-1],ROLL.dir-4))],[T('leftBack')-.04,over(LH,ROLL.dir-28,.06)],[T('leftBack'),hoofAt(LH,ROLL.dir-32)],
  [T('weightR2')+.03,hoofAt(LH,ROLL.dir-40)],[T('leftDown')-.04,over(L1,8,.05)],[T('leftDown'),hoofAt(L1,6)],[END,hoofAt(L1,0)]);
 // Both arms reach forward as the trunk leans over the feet and rises (their weight ahead of the seat: 2 to 3 cm of the
 // centre of mass), set from where the shoulders are then and carried with the chest, then come back to rest beside the
 // body, the right out beside its thigh (at rest beside the body the arms went 10 cm into the thighs and shins).
 const reachAt=(t,s)=>{const tr=trunkAt(t);return {f:'chest',p:reachFwd(tr,heading(t),s).sub(tr.chest).applyQuaternion(tr.chestQ.clone().invert()).toArray()};};
 LIMB['arm-1'].push([T('lean'),reachAt(T('lean'),-1)],[T('rise'),reachAt(T('rise'),-1)],[T('leftBack'),{f:'chest',p:restWrist(-1)}],[END,{f:'chest',p:restWrist(-1)}]);
 LIMB.arm1.push([T('lean'),reachAt(T('lean'),1)],[T('rise'),reachAt(T('rise'),1)],[T('weightR'),{f:'chest',p:[.30,-.26,.22]}],[T('leftBack'),{f:'chest',p:restWrist(1)}],[END,{f:'chest',p:restWrist(1)}]);};buildLimbs();
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
 // - at most so far that no point over the top, or already inside the sill, is more than SINK in (a deep belly wraps
 //   round the edge: the pig director's went 5.7 cm in; a soft belly flattens on a sill: 4 mm in, REST, it
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
    if(!dx&&y<WINDOW.sill-.02)deep=Math.min(deep,y-WINDOW.sill+SINK);
    else if(dx<EDGE&&y>WINDOW.sill-(dx?0:.02)&&!/hoof|boot|foot|toe/i.test(part)){const dy=y-WINDOW.sill;
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
 const planted=(id,t)=>{const l=keyedLimb(LIMB[id],t,trunkAt(t));if(id.startsWith('arm'))return l.palm===undefined&&l.face?[l.faceW,l.face]:[l.palm!==undefined?l.palmW:0,[0,1,0]];
  const [na,nb,u]=l.plant;return [l.plantW||0,na&&nb?na.map((v,j)=>v+(nb[j]-v)*u):na||nb];};
 fit.solveLimbs({planted});steady=steadyPoles(D,t=>limbSample(body,spec(t)));fit.solvePlants({planted});fit.solveSelf({planted});
 // Twice: the first pass unwraps the palms' yaw blends, the second finds the hands' ways round for those continuous
 // targets (found for the wrapped ones, they named the wrong way where a blend passed 180 degrees: a 47 m/s snap).
 const turnsAt=t=>{body.pose(spec(t),'turns');return body.turns.slice();},turns=()=>{turnRef=null;turnRef=steadyTurns(D,turnsAt);turnRef=steadyTurns(D,turnsAt);};turns();
 // The seat rests on the floor from the landing until the lean has the weight over the feet, as the belly on the sill:
 // one smooth push, the seat's lowest point (the hips bone's: the trouser legs are the same mesh) within TOUCH of the
 // floor and no more than SINK into it, nothing else but the feet and hands in it; as the body rises it only keeps the
 // seat out of the floor. The overalls' seat rides on the thighs, so with the legs planted it rose 1 to 5 cm off the
 // floor as the body rocked (the rig found nothing holding it), and sank 7.5 cm into it as the pelvis tipped upright
 // (its height found in the tuck). Measured on the final legs (the limbs' fit and bend directions swing the thighs, and
 // the seat's skin with them: measured before, it sank 8.6 cm all the same); the bend directions and turns are then
 // found again for the moved hips. A tail's root counts as seat: it rides the hips and cannot bend out of the way (left
 // out, the skunk's plume root went 9 cm into the floor as the body rocked, the cow's 5 cm).
 // Measured twice: the bend directions found again for the moved hips swing the thighs, and the seat's skin with them
 // (with the knees up the seat rose 1 to 2.5 cm off the floor through the lean, and the plan, finding the feet alone,
 // dragged the hips 11 cm toward them and folded the knees to 160 degrees).
 const seatBand=()=>{const TOUCH=.006,SINK=.008,FLOOR=.005,[a,b]=[FOOT_DOWN-.06,T('rise')-.10],all=createSurfaceProbe(worker,{stride:1,keep:(m,i)=>!/tail/.test(m.name)||tails.isRoot(m.name,i)}),want=[],lo=[],hi=[],ts=[];
  for(let t=a;t<=b+1e-9;t+=.005){body.pose(spec(t),'seat');all.update();let seat=Infinity,other=Infinity;
   // the rest of the trunk and the head only: the limbs' own skin (a trouser cuff by a planted hoof) does not move with
   // the hips, and holding it out of the floor threw them 40 cm up
   for(let i=0;i<all.count;i++){if(/hoof|boot|foot|toe|hand/i.test(all.names[all.part[i]]))continue;const bone=all.boneNames[all.bone[i]];if(bone==='hips')seat=Math.min(seat,all.y[i]);else if(bone==='spine'||bone==='head')other=Math.min(other,all.y[i]);}
   const down=t<=T('lean'),top=Math.min(seat+SINK,other+FLOOR),need=down?Math.min(seat-TOUCH,top):-1;ts.push(t);lo.push(need);hi.push(top);want.push(down?clamp(seat+.002,need,top):Math.min(0,top));}
  const P=boxedPath(want,want.map(()=>1),2e7,want.map((_,i)=>({at:i,c:[1],lo:lo[i],hi:hi[i]})));
  const tr=track(ts.map((t,i)=>[t,0,-P.c[i]*smooth(Math.min(t-a,b-t)/.08),0]),{},{limit:false}),prev=onSeat;onSeat=t=>(prev?prev(t):V()).add(t>a&&t<b?V(...tr(t)):V());};
 seatBand();steady=steadyPoles(D,t=>limbSample(body,spec(t)));seatBand();steady=steadyPoles(D,t=>limbSample(body,spec(t)));turns();
 // Balance: the centre of mass planned against what holds the body at each moment, the hips moved to follow it. It
 // runs on the hands' final turns (a palm's angle decides when it first touches), which are then found again.
 const bal=balanceTraversal({duration:D,probe:contactProbe(worker),obstacles:edgeBoxes(WINDOW.edge,WINDOW.half,[[0,WINDOW.sill],[WINDOW.top,2]]),pose:t=>body.pose(spec(t),'balance'),com:P=>body.com(P),setMove:m=>{balance=m;},base:t=>fit.trunk(t).add(onSill(t)).add(onSeat(t)).toArray(),
  // sitting, the plan keeps the authored path: its own hips' move lifted the seat off the floor, and the next round,
  // finding the feet alone under a centre of mass 30 cm behind them, dragged it forward until the knees locked and the
  // hips ran away (80 to 210 m/s); and through a roll that ends before its hooves land, which turns about its tail's
  // root: moved by the plan, the skunk's root lifted off the floor and the rig found the body on its shirt and seat,
  // nothing under the roll's pivot (its roll read 147% of its weight, 108 held)
  hold:t=>t>=FOOT_DOWN-.05&&t<=T('lean')+.05||caughtAt===null&&t>=ROLL.start+.08&&t<FOOT_DOWN});
 // On the balanced motion the tails are bent clear of the trunk as it now is (they carry no mass in the balance), and
 // the fit's report is then the played motion's. The arms are not fitted again here: moved after the balance, they
 // move the centre of mass it planned (the step in read 44% of the body's weight). Nor is the head (fit.solveHead, as
 // the climb's is): held through the hop, a turn chosen for the donkey's ears at one moment of it took them 8.3 cm
 // into the lintel at another (2.8 as fitted before the balance), and no turn clears the goat's horns in the roll.
 balance=bal;fit.solveTail();turns();
 // The get-up's premise, read on the balance as planned: the centre of mass's least depth inside what holds it (m,
 // negative outside) from the lean until the body is up, the seat letting go between (the traversal test reads it).
 let liftoff=Infinity;bal.times.forEach((t,i)=>{const s=bal.samples[i];if(t>=T('lean')&&t<=T('rise')&&s.hull)liftoff=Math.min(liftoff,inside(s.hull,bal.plan[i][0],bal.plan[i][2]));});
 const KEYS=[...PRE.map(k=>({t:k.t,label:k.label})),{t:ROLL.start,label:'Back to the floor'},{t:(ROLL.start+ROLL_END)/2,label:'Roll'},{t:ROLL_END,label:'Sit up'},{t:T('inR'),label:'Right foot in'},{t:T('inL'),label:'Left foot in'},{t:T('lean'),label:'Lean over the feet'},{t:T('rise'),label:'Rise over the feet'},{t:T('weightR'),label:'Weight on the right foot'},{t:T('leftBack'),label:'Left foot back'},{t:T('weightL'),label:'Weight on the left foot'},{t:T('rightDown'),label:'Right foot back'},{t:T('weightR2'),label:'Weight on the right again'},{t:T('leftDown'),label:'Left foot round'},{t:END,label:'Stand on the tile'}];
 let state=null;
 const api={duration:D,keys:KEYS,body,probe,getup:{pitch:leanFit.pitch,fold:leanFit.fold,feet:[IN[-1].toArray(),IN[1].toArray()],liftoff},roll:{rows:rollRows,dir:ROLL.dir,start:ROLL.start,end:ROLL_END},
  phases:KEYS.slice(0,-1).map((k,i)=>({label:KEYS[i+1].label,start:k.t,end:KEYS[i+1].t})),
  at(t){const time=clamp(t,0,D),P=body.pose(spec(time),time.toFixed(3));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();const [tp,ty]=fit.tail(time);tails.set(tp*DEG,ty*DEG);tails.squash(body.root);
   const phase=api.phases.find(p=>time<=p.end)?.label||KEYS.at(-1).label;state={time,phase,com:body.com(P).toArray(),points:Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v.toArray()]))};return state;},
  apply(progress,{origin=[0,0,0],heading=0}={}){const r=api.at(clamp(progress)*D),q=Q().setFromAxisAngle(V(0,1,0),-heading*DEG);body.root.quaternion.copy(q);body.root.position.copy(V(...origin));body.root.updateMatrixWorld(true);worker.skeleton?.update?.();r.worldRoot=body.root.position.toArray();return r;},
  fit:fit.report,clearance:fit,balance:bal,diagnostics:()=>state,dispose(){tails.restore();body.root.position.set(0,0,0);body.root.quaternion.identity();worker.pose('neutral');}};
 return api;
}
