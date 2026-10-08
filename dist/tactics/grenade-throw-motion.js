import * as T from './vendor/three.module.js';
const V=(a=[0,0,0])=>new T.Vector3(...a),Q=()=>new T.Quaternion(),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const blend=(t,a,b)=>smooth((t-a)/(b-a));
const turn=(axis,a)=>Q().setFromAxisAngle(V(axis),a),UP=V([0,1,0]),DEG=Math.PI/180;
// FM 3-23.30 standing throw: pull the pin with the free hand, turn side-on with the grenade shoulder high and
// the free hand pointing at the target, throw overhand so it arcs, and let the arm follow through.
export const GRENADE_THROW=Object.freeze({duration:4.6,pin:.50,drop:.70,plant:1.60,release:1.94,lever:1.965,gravity:9.81,target:5});
export const GRENADE_KEYS=Object.freeze([{time:.46,label:'Pull pin'},{time:1.30,label:'Turn & load'},{time:1.60,label:'Plant'},{time:1.94,label:'Release'},{time:2.20,label:'Follow through'},{time:4.50,label:'Recover'}].map(Object.freeze));
// Each keyframe time falls inside the phase it is named after.
const PHASES=[[.30,'Ready'],[.72,'Pull pin'],[1.32,'Turn & load'],[1.58,'Stride'],[1.66,'Plant'],[1.935,'Throw'],[1.945,'Release'],[2.40,'Follow through'],[Infinity,'Recover']];
// Quintic Hermite through [t,...values] rows, continuous to the acceleration (a cubic's acceleration steps at
// every key, which reads as a jolt of force). Slopes are Catmull-Rom, limited so an automatic slope never
// overshoots its keys (flat at extremes and at the ends); key accelerations come from the neighbouring slopes.
// pins={index:[slopes]} or {index:{v:[...],a:[...]}} fixes a key's slope and/or acceleration (null keeps automatic).
function track(rows,pins={}){
 const keys=rows.map(([t,...p])=>({t,p})),n=keys.length,pin=i=>Array.isArray(pins[i])?{v:pins[i]}:pins[i]||{};
 keys.forEach((k,i)=>{const a=keys[i-1],b=keys[i+1],P=pin(i).v;k.v=k.p.map((x,j)=>{if(P&&P[j]!=null)return P[j];if(!a||!b)return 0;const l=(x-a.p[j])/(k.t-a.t),r=(b.p[j]-x)/(b.t-k.t);if(l*r<=0)return 0;const m=(b.p[j]-a.p[j])/(b.t-a.t);return Math.sign(m)*Math.min(Math.abs(m),3*Math.abs(l),3*Math.abs(r));});});
 keys.forEach((k,i)=>{const P=pin(i).a;k.a=k.p.map((x,j)=>P&&P[j]!=null?P[j]:i&&i<n-1?(keys[i+1].v[j]-keys[i-1].v[j])/(keys[i+1].t-keys[i-1].t):0);});
 return t=>{let i=1;while(i<n-1&&t>keys[i].t)i++;const a=keys[i-1],b=keys[i],dt=b.t-a.t,u=clamp((t-a.t)/dt),u2=u*u,u3=u2*u,u4=u3*u,u5=u4*u;
  const h0=1-10*u3+15*u4-6*u5,h1=u-6*u3+8*u4-3*u5,h2=.5*u2-1.5*u3+1.5*u4-.5*u5,h3=.5*u3-u4+.5*u5,h4=-4*u3+7*u4-3*u5,h5=10*u3-15*u4+6*u5;
  return a.p.map((x,j)=>h0*x+h5*b.p[j]+dt*(h1*a.v[j]+h4*b.v[j])+dt*dt*(h2*a.a[j]+h3*b.a[j]));};
}
const logq=q=>{const w=clamp(q.w,-1,1),s=Math.sqrt(1-w*w);return s<1e-9?V():V([q.x,q.y,q.z]).multiplyScalar(2*Math.acos(w)/s);};
const expq=r=>{const a=r.length();return a<1e-12?Q():Q().setFromAxisAngle(r.clone().divideScalar(a),a);};
// Rate of the rotation vector r that turns at world angular velocity w at exp(r) (inverse left Jacobian of SO(3)).
const rateOf=(r,w)=>{const a=r.length(),rx=r.clone().cross(w),rxx=r.clone().cross(rx);if(a<1e-6)return w.clone().addScaledVector(rx,-.5);return w.clone().addScaledVector(rx,-.5).addScaledVector(rxx,1/(a*a)-(1+Math.cos(a))/(2*a*Math.sin(a)));};
// Orientation keys joined by cubic rotation-vector segments whose end rates are corrected through the Jacobian, so
// angular velocity is continuous through a key (and flows through it unless the rotation reverses there): a wrist
// can snap through release instead of stopping on a pose.
function spinTrack(rows){
 const keys=rows.map(([t,q])=>({t,q:q.clone().normalize()}));for(let i=1;i<keys.length;i++)if(keys[i].q.dot(keys[i-1].q)<0)keys[i].q.set(-keys[i].q.x,-keys[i].q.y,-keys[i].q.z,-keys[i].q.w);
 const d=keys.slice(1).map((k,i)=>logq(k.q.clone().multiply(keys[i].q.clone().invert())));
 keys.forEach((k,i)=>{if(!i||i===keys.length-1){k.w=V();return;}const a=d[i-1].clone().divideScalar(k.t-keys[i-1].t),b=d[i].clone().divideScalar(keys[i+1].t-k.t);k.w=a.dot(b)<=0?V():a.add(b).multiplyScalar(.5);});
 return t=>{let i=1;while(i<keys.length-1&&t>keys[i].t)i++;const a=keys[i-1],b=keys[i],dt=b.t-a.t,u=clamp((t-a.t)/dt),u2=u*u,u3=u2*u;
  return expq(d[i-1].clone().multiplyScalar(3*u2-2*u3).addScaledVector(a.w,dt*(u3-2*u2+u)).addScaledVector(rateOf(d[i-1],b.w),dt*(u3-u2))).multiply(a.q);};
}
// A hand basis from its thumb-side (+X) and wrist-ward (+Y) directions.
const hand=(x,y)=>{const Y=V(y).normalize(),X=V(x).addScaledVector(Y,-V(x).dot(Y)).normalize();return Q().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,X.clone().cross(Y)));};
const arcDir=(az,el,side=1)=>V([Math.cos(el)*Math.cos(az),Math.sin(el),side*Math.cos(el)*Math.sin(az)]);
// A hand laid along a direction: fingers along it, palm facing as asked (the left palm is +Z, the right -Z).
const along=(dir,palmFacing,side)=>{const Y=V(dir).normalize().negate(),Z=V(palmFacing).multiplyScalar(-side).addScaledVector(Y,-V(palmFacing).multiplyScalar(-side).dot(Y)).normalize();return hand(Y.clone().cross(Z).toArray(),Y.toArray());};
const trunkQ=(yaw,flex,lean)=>turn([0,1,0],yaw).multiply(turn([1,0,0],-lean)).multiply(turn([0,0,1],-flex));
// Pelvis height, forward tilt and lean to the free side; its yaw has its own track and its horizontal path is not
// keyed at all: the balance planner below places it.
const pelvisAt=track([
 [0,0,0,0],[.30,-.012,.02,0],[.50,-.018,.02,.005],[.66,-.03,.02,.01],[.84,-.045,.02,.02],[1.00,-.045,.03,.005],[1.14,-.045,.04,-.015],
 [1.30,-.048,.04,-.03],[1.48,-.05,.03,-.03],[1.60,-.05,.03,-.02],[1.72,-.048,.04,.01],[1.84,-.045,.06,.04],[1.94,-.042,.10,.06],[2.06,-.055,.18,.05],
 [2.22,-.07,.28,.03],[2.40,-.08,.30,.02],[2.60,-.07,.24,0],[2.85,-.05,.12,0],[3.10,-.04,.05,0],[3.28,-.033,.03,0],[3.45,-.028,.02,0],[3.85,0,0,0]]);
// Yaws (negative turns the throwing side back). A single hoof can barely twist the body, so on one hoof (the drop
// step .84-1.14 and the stride 1.30-1.60) each yaw turns at a steady rate or holds; it spins up and brakes while
// both hooves are down. The hips open first at the plant; the shoulders stay closed a moment longer (separation).
const pelvisYaw=track([[0,0],[.50,0],[.84,-.35],[1.14,-.965],[1.30,-1.13],[1.60,-1.13],[1.72,-.82],[1.84,-.38],[1.94,-.08],[2.06,.12],[2.22,.24],
 [2.40,.32],[2.60,.30],[2.85,.18],[3.10,.09],[3.28,.05],[3.45,.025],[3.85,0]],{2:{v:[-2.05],a:[0]},3:{v:[-2.05],a:[0]},4:{v:[0],a:[0]},5:{v:[0],a:[0]}});
const chestYaw=track([[0,0],[.70,0],[.84,-.06],[1.14,-.18],[1.30,-.24],[1.60,-.24],[1.72,-.26],[1.80,-.20],[1.88,-.05],[1.94,.05],[2.06,.15],
 [2.22,.26],[2.45,.32],[2.80,.16],[3.20,.04],[3.70,0]],{2:{v:[-.4],a:[0]},3:{v:[-.4],a:[0]},4:{v:[0],a:[0]},5:{v:[0],a:[0]}});
// Upper trunk flex and lean relative to the pelvis: it tips toward the free side so the arm comes over the top,
// and starts bending forward over the lead leg just before release, which takes up the momentum of the arm; it
// stays bent until the arm has finished its sweep.
const chestAt=track([
 [0,0,0],[.30,.04,0],[.70,.04,0],[1.00,-.02,-.05],[1.20,-.05,-.09],[1.60,-.06,-.11],[1.72,-.05,-.08],[1.80,0,.04],[1.88,.08,.16],
 [1.94,.16,.21],[2.04,.27,.20],[2.16,.35,.14],[2.30,.42,.08],[2.50,.40,.03],[2.70,.28,0],[2.95,.12,0],[3.30,.04,0],[3.70,0,0]]);
// Throwing palm on arcs about the shoulder, in the chest frame: [t, azimuth (0 forward, 90 out to the side),
// elevation, reach] in degrees and metres. Reach stays inside the arm, so the elbow never locks or snaps.
// The release key is solved from the target. The draw keeps moving through the stride and cocks the arm out to the
// side; the forearm lays back and the elbow bends deepest 140 ms before release, then extends without a pause into a
// release ahead of the throwing shoulder, the sweep building to its fastest at the release. Afterwards the arm only
// slows (no second push) and sweeps down in front of the lead thigh while the trunk stays bent and turns through;
// then it swings back to the side like a pendulum as the trunk rises, passing in front of the thighs, not into them.
const RELEASE_ARC=[78,52,.38],LAUNCH_ANGLE=.44;
const rightArcRows=[[0,-24,-14,.42],[.56,-24,-14,.42],[.70,-25,-15,.355],[.92,15,5,.32],[1.10,80,30,.32],[1.30,122,43,.36],[1.50,118,44,.36],
 [1.66,112,42,.355],[1.74,110,38,.33],[1.80,110,38,.30],[1.85,104,42,.303],[1.90,94,46,.32],null,[1.98,63,51,.465],[2.03,50,44,.475],[2.10,34,30,.475],
 [2.22,8,4,.475],[2.36,-16,-26,.475],[2.56,-28,-38,.475],[2.80,-6,-47,.475],[3.05,24,-54,.47],[3.35,38,-61,.48],[3.70,43.5,-64.6,.508]];
// Elbow direction (chest frame); the closing key is the rest pose's own elbow, added once the rig is known.
const rightPoleRows=[[0,-.25,-.75,.6],[.78,-.25,-.7,.65],[1.0,-.25,-.35,.9],[1.30,-.3,-.25,.92],[1.66,-.3,-.25,.92],[1.78,0,-.3,.95],[1.88,.25,-.35,.9],[1.94,.2,-.55,.8],[2.06,.3,-.3,.9],[2.30,.5,.1,.85],[2.56,.3,.3,.9],[2.80,.1,-.5,.8]];
// Palm down at the chest, so the ring lies flat on top of the fist where the free hand can hook it; the fist holds
// still on the chest while the free hand twists and pulls.
const rightHand=spinTrack([[0,hand([0,0,-1],[-1,0,0])],[.56,hand([0,0,-1],[-1,0,0])],[.70,hand([0,.15,-1],[-1,0,0])],[.82,hand([0,.6,-.8],[-1,0,0])],
 [1.08,hand([0,.4,-.9],[-.5,-.85,0])],[1.30,hand([0,0,-1],[0,-1,0])],[1.66,hand([0,0,-1],[.1,-1,0])],[1.78,hand([0,0,-1],[.45,-.9,0])],[1.88,hand([0,0,-1],[-.15,-1,0])],
 [2.00,hand([-.1,0,-1],[-.75,-.65,0])],[2.16,hand([-.4,-.3,-.85],[-.6,.2,.3])],[2.40,hand([-.5,-.2,-.8],[-.25,.9,.3])],[2.80,hand([.4,-.1,-.9],[0,1,.1])],[3.70,hand([1,0,0],[0,1,0])]]);
// The free hand: fingertip in the ring, a twist toward the body, a pull along the pin, the ring dropped. The grenade
// is held well out from the chest and the free elbow swings wide, so neither glove nor forearm passes into the body,
// the casing or the other glove.
const RING_CENTER=V([.026,.049,.017]),LEVER_CENTER=V([.015,.011,0]),HOOK=V([.030,-.09,0]),LEFT_IN_RING=hand([0,-1,-.3],[.3,-.3,1]);
const twistAt=t=>-.75*blend(t,.30,.40),pullAt=t=>.045*blend(t,.40,GRENADE_THROW.pin);
// Then the free WRIST on arcs about its shoulder (it holds nothing once the ring is dropped): it points along the
// throwing line, fingers joined and a little above level, reach .497 of .505 leaving the elbow about 20 degrees soft,
// and tucks to the side.
const leftArcRows=[[.90,40,10,.38],[1.12,84,26,.497],[1.64,86,28,.497],[1.76,70,20,.45],[1.88,35,-30,.30],[2.00,28,-40,.30],[2.32,24,-45,.31],[2.72,36,-58,.44],[3.70,54.8,-67.8,.485]];
const leftPoleRows=[[1.12,0,-1,-.3],[1.64,0,-1,-.3],[1.88,-.7,-.6,-.35],[2.32,-.7,-.6,-.35]];
const POINT=along(arcDir(85*DEG,27*DEG,-1).toArray(),[0,-1,0],-1),TUCK=hand([0,1,0],[-1,0,0]);
const leftHandRows=[[1.12,POINT],[1.64,POINT],[1.88,TUCK],[2.32,TUCK],[3.70,hand([1,0,0],[0,1,0])]];
// Finger curl (negative closes): the grip opens through release; the free hand hooks, lets go, points, tucks.
const curl=(side,t)=>side===1?(-.9+.82*blend(t,GRENADE_THROW.release-.025,GRENADE_THROW.release+.05))*(1-blend(t,2.7,3.6)):(-.25-.45*blend(t,.18,.30)+.62*blend(t,.66,.74)-.42*blend(t,1.82,1.97))*(1-blend(t,2.8,3.6));
// Hooves: steps between plants, and the rear hoof's pivot on its toe as the hips drive through: the heel lifts and
// the hoof rolls a little onto its inner edge (the knee drops in), so one inner corner carries it and stays put.
const STEPS={1:[{t0:.84,t1:1.14,to:[-.23,.05],yaw:-1.35,lift:.05},{t0:1.64,t1:2.10,pivot:true,yaw:-.50,pitch:.55,roll:.09,hold:.14},{t0:2.10,t1:2.55,to:[-.035,.232],yaw:0,lift:.07}],
 '-1':[{t0:1.30,t1:1.60,to:[.16,-.03],yaw:-.15,lift:.085},{t0:3.10,t1:3.45,to:[-.035,-.232],yaw:0,lift:.055}]};
// Where the hooves are asked to push, [t, x, z]: between both hooves, on the stance sole while the other swings,
// gliding hoof to hoof in double support. Sole centres sit .042 ahead of the ankle. The planner adds a small
// push toward the stepping hoof before the first step (the anticipatory shift of gait initiation) and a
// matching settle at the end, sized so the body starts and ends at rest.
const COP=[[0,.007,0],[.30,.007,0],[.84,.007,-.17],[1.14,.007,-.21],[1.30,-.221,.091],[1.60,-.20,.091],[1.78,.19,-.024],[2.10,.21,-.024],
 [2.55,.20,-.024],[3.10,.007,.17],[3.45,.007,.18],[3.85,.007,0],[4.6,.007,0]];
const copAt=t=>{let i=1;while(i<COP.length-1&&t>COP[i][0])i++;const a=COP[i-1],b=COP[i],u=smooth((t-a[0])/(b[0]-a[0]));return [a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];};
const hump=(t,a,b)=>t<=a||t>=b?0:Math.sin(Math.PI*(t-a)/(b-a))**2;
// Segment masses for balance (kg, 74.9 in all): the horse head is counted at 6 kg.
const SEGMENTS=[['pelvis','chest',18],['chest','neck',13],['neck','headTip',6],...[-1,1].flatMap(s=>[['pelvis','hip'+s,1],['chest','shoulder'+s,1],['shoulder'+s,'elbow'+s,1.9],['elbow'+s,'wrist'+s,1.1],
 ['wrist'+s,'palm'+s,.45],['hip'+s,'knee'+s,9.5],['knee'+s,'ankle'+s,3],['ankle'+s,'toe'+s,.5],['ankle'+s,'heel'+s,.5]])],MASS=SEGMENTS.reduce((m,s)=>m+s[2],0);
const bottom=(hull,q)=>{let m=Infinity;for(const p of hull){const y=p.clone().applyQuaternion(q).y;if(y<m)m=y;}return m;};
// Loose bodies: ballistic flight (optional linear drag), two bounces, then a roll or slide to rest.
function toss(p0,v0,q0,w0,hull,{drag=0,keep=.35,bounce=.22,settle=.45,lie=q=>q,roll=0}={}){
 const G=GRENADE_THROW.gravity,k=drag,decay=a=>k?(1-Math.exp(-k*a))/k:a,fly=(p,v,a)=>k?V([p.x+v.x*decay(a),p.y+(v.y+G/k)*decay(a)-G/k*a,p.z+v.z*decay(a)]):p.clone().addScaledVector(v,a).add(V([0,-.5*G*a*a,0]));
 const vel=(v,a)=>k?V([v.x*Math.exp(-k*a),(v.y+G/k)*Math.exp(-k*a)-G/k,v.z*Math.exp(-k*a)]):v.clone().add(V([0,-G*a,0])),rot=(q,w,a)=>expq(w.clone().multiplyScalar(a)).multiply(q);
 const above=(p,v,q,w,a)=>fly(p,v,a).y+bottom(hull,rot(q,w,a))>0;
 const legs=[];let p=p0.clone(),v=v0.clone(),q=q0.clone(),w=w0.clone(),start=0;
 for(let n=0;n<2;n++){let a=.002;while(a<4&&above(p,v,q,w,a))a+=.004;let lo=Math.max(0,a-.004),hi=a;for(let i=0;i<44;i++){const m=(lo+hi)/2;if(above(p,v,q,w,m))lo=m;else hi=m;}
  legs.push({start,p,v,q,w,end:start+hi});const vi=vel(v,hi);p=fly(p,v,hi);q=rot(q,w,hi);v=V([vi.x*keep,-vi.y*bounce,vi.z*keep]);w=w.clone().multiplyScalar(.45);start+=hi;}
 // A body lying down rolls about its own long axis (horizontal once it lies on its side), as far as the slide carries it.
 const slide=V([v.x,0,v.z]),qRest=lie(q),axis=roll&&slide.lengthSq()>1e-10?UP.clone().applyQuaternion(qRest):null,spin=axis?V().crossVectors(UP,slide).dot(axis)/roll:0,qs=q;
 return {impacts:legs.map(l=>l.end),rest:start+settle,at(age){for(const l of legs)if(age<=l.end){const a=Math.max(0,age-l.start);return {p:fly(l.p,l.v,a),q:rot(l.q,l.w,a),phase:l===legs[0]?'flight':'bounce'};}
  const s=clamp(age-start,0,settle),d=s-.5*s*s/settle,qq=qs.clone().slerp(qRest,smooth(s/settle));if(axis)qq.premultiply(turn(axis.toArray(),d*spin));const pp=p.clone().addScaledVector(slide,d);pp.y=-bottom(hull,qq);return {p:pp,q:qq,phase:'rest'};}};
}
const lieOnSide=q=>{const y=UP.clone().applyQuaternion(q),flat=y.clone().setY(0);if(flat.lengthSq()<1e-8)flat.set(1,0,0);return Q().setFromUnitVectors(y,flat.normalize()).multiply(q);};
const lieFlat=q=>{const n=V([0,0,1]).applyQuaternion(q);return Q().setFromUnitVectors(n,V([0,n.y<0?-1:1,0])).multiply(q);};
// Elbow or knee of a two-bone limb whose end must reach target, bent toward pole.
function bend(start,target,l1,l2,pole){const axis=target.clone().sub(start),d=Math.min(axis.length(),l1+l2-1e-9);axis.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),side=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();return start.clone().addScaledVector(axis,along).addScaledVector(side,Math.sqrt(Math.max(0,l1*l1-along*along)));}
// x'' = w2 (x - p) on a uniform grid with both ends held (Thomas algorithm for the tridiagonal system).
function pendulum(w2,p,x0,xn,dt){const n=w2.length-1,c=new Float64Array(n),d=new Float64Array(n),x=new Float64Array(n+1);x[0]=x0;x[n]=xn;
 for(let i=1;i<n;i++){const b=-(2+dt*dt*w2[i]),r=-dt*dt*w2[i]*p[i]-(i===1?x0:0)-(i===n-1?xn:0),m=b-(i>1?c[i-1]:0);c[i]=1/m;d[i]=(r-(i>1?d[i-1]:0))/m;}
 for(let i=n-1;i>=1;i--)x[i]=d[i]-(i<n-1?c[i]*x[i+1]:0);return x;}

export function createGrenadeThrow(worker,grenade,{releaseArc=RELEASE_ARC,launchAngle=LAUNCH_ANGLE}={}){
 if(grenade.id!=='grenade')throw Error('Grenade throw needs the grenade prop');
 const root=worker.root,bones=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
 worker.equipWeapon(grenade);root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');
 const rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())])),at0=b=>rest.get(bones[b]).clone(),palm=V([.052,-.010,0]),grip=grenade.anchors.grip.position.clone(),savedFeet=[];
 const restHips=at0('hips'),spineOffset=at0('spine').sub(restHips),headOffset=at0('head').sub(at0('spine')),rightShoulder=at0('upperArm1').sub(at0('spine')),leftShoulder=at0('upperArm-1').sub(at0('spine'));
 const THIGH={},SHOULDER={1:rightShoulder,'-1':leftShoulder},LENGTH={},BEND={};for(const s of [-1,1]){THIGH[s]=at0('thigh'+s).sub(restHips);const d=(a,b)=>at0(a+s).distanceTo(at0(b+s));LENGTH[s]={arm:[d('upperArm','forearm'),d('forearm','hand')],leg:[d('thigh','shin'),d('shin','hoof')]};
  // The direction each rest elbow and knee already bends, so the throw opens and closes on the rig's own neutral stance.
  const bent=(a,b,c)=>{const o=at0(a+s),axis=at0(c+s).sub(o).normalize(),e=at0(b+s).sub(o);return e.addScaledVector(axis,-e.dot(axis)).normalize();};BEND[s]={arm:bent('upperArm','forearm','hand'),leg:bent('thigh','shin','hoof')};}
 const rightPole=track([...rightPoleRows,[3.70,...BEND[1].arm.toArray()]]);
 for(const side of [-1,1]){const foot=worker.parts.find(p=>/hoof/.test(p.name)&&p.name.endsWith(' '+side)),a=foot.geometry.attributes;
  savedFeet.push({foot,index:a.skinIndex.clone(),weight:a.skinWeight.clone()});
  for(let i=0;i<a.position.count;i++){const u=blend(a.position.getY(i),.10,.20);a.skinIndex.setXYZW(i,worker.bones.indexOf(bones['hoof'+side]),worker.bones.indexOf(bones['shin'+side]),0,0);a.skinWeight.setXYZW(i,1-u,u,0,0);}a.skinIndex.needsUpdate=a.skinWeight.needsUpdate=true;
 }
 // Rigid sole points relative to each ankle: the hoof bone alone carries everything below 10 cm.
 const soles={};for(const side of [-1,1]){const foot=worker.parts.find(p=>/hoof/.test(p.name)&&p.name.endsWith(' '+side)),a=foot.geometry.attributes.position,ankle=rest.get(bones['hoof'+side]),pts=[];for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);if(p.y<.10)pts.push(p.sub(ankle));}soles[side]=pts;}
 const footQ=(yaw,pitch,roll=0)=>turn([0,1,0],yaw).multiply(turn([0,0,1],-pitch)).multiply(turn([1,0,0],roll));
 const ankleY=rest.get(bones.hoof1).y,lowest=(side,q)=>{let m=Infinity;for(const p of soles[side]){const y=p.clone().applyQuaternion(q).y;if(y<m)m=y;}return m;};
 // The pivot turns about the sole vertex that carries the hoof at full heel lift, so the contact itself stays put.
 const toe={};for(const side of [-1,1]){const q=footQ(0,.55,-side*.09);toe[side]=soles[side].reduce((b,p)=>p.clone().applyQuaternion(q).y<b.clone().applyQuaternion(q).y?p:b).clone();}
 // Loose parts: casing, ring and lever, each with its own collision hull about its own centre.
 const loose={ring:grenade.parts.find(p=>p.name==='pull ring'),lever:grenade.parts.find(p=>p.name==='curved safety lever')},hullOf=(meshes,c)=>{const out=[];for(const m of meshes){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)out.push(V().fromBufferAttribute(a,i).sub(c));}return out;};
 const casing=hullOf(grenade.parts.filter(p=>!Object.values(loose).includes(p)),V()),ringHull=hullOf([loose.ring],RING_CENTER),leverHull=hullOf([loose.lever],LEVER_CENTER);
 const G=GRENADE_THROW.gravity,rel=GRENADE_THROW.release,D=GRENADE_THROW.duration;
 // Hooves: flat, swinging between plants (never below the floor), or pivoting on the toe with the toe fixed.
 const kneePole=(yaw,side)=>BEND[side].leg.clone().applyQuaternion(turn([0,1,0],yaw));
 function hoof(side,t){let s={ankle:rest.get(bones['hoof'+side]).clone(),yaw:0,pitch:0,roll:0};
  for(const e of STEPS[side]){if(t<e.t0)break;const u=t<e.t1?blend(t,e.t0,e.t1):1;
   if(e.pivot){const tip=s.ankle.clone().add(toe[side].clone().applyQuaternion(footQ(s.yaw,0))),yaw=T.MathUtils.lerp(s.yaw,e.yaw,t<e.t1?blend(t,e.t0+e.hold,e.t1):1),pitch=e.pitch*u,roll=-side*e.roll*u,q=footQ(yaw,pitch,roll),ankle=tip.sub(toe[side].clone().applyQuaternion(q));ankle.y=-lowest(side,q);
    const next={ankle,yaw,pitch,roll};if(t<e.t1)return {...next,q,contact:'toe'};s=next;continue;}
   const end={ankle:V([e.to[0],ankleY,e.to[1]]),yaw:e.yaw,pitch:0,roll:0};if(t>=e.t1){s=end;continue;}
   const yaw=T.MathUtils.lerp(s.yaw,e.yaw,u),pitch=s.pitch*(1-u),roll=s.roll*(1-u),q=footQ(yaw,pitch,roll),ankle=s.ankle.clone().lerp(end.ankle,u);ankle.y+=e.lift*Math.sin(Math.PI*u);ankle.y=Math.max(ankle.y,-lowest(side,q)+1e-4*Math.sin(Math.PI*u));return {ankle,yaw,pitch,q,contact:'air'};}
  return {...s,q:footQ(s.yaw,s.pitch,s.roll),contact:s.pitch>1e-9?'toe':'flat'};}
 // ---- pure kinematics for a given horizontal pelvis path xz(t) -> [dx,dz]; nothing is integrated ----
 function kinematics(xz){
  const memo=new Map(),trunk=t=>{let r=memo.get(t);if(r)return r;const [dy,flex,lean]=pelvisAt(t),[yaw]=pelvisYaw(t),[dx,dz]=xz(t),[cf,cl]=chestAt(t),[cy]=chestYaw(t),qp=trunkQ(yaw,flex,lean),local=trunkQ(cy,cf,cl),hips=restHips.clone().add(V([dx,dy,dz]));
   r={hips,qp,local,qc:qp.clone().multiply(local),chest:hips.clone().add(spineOffset.clone().applyQuaternion(qp)),lean:lean+cl};if(memo.size>64)memo.clear();memo.set(t,r);return r;};
  const toWorld=(tr,p)=>tr.chest.clone().add(V(p).applyQuaternion(tr.qc)),toLocal=(tr,p)=>p.clone().sub(tr.chest).applyQuaternion(tr.qc.clone().invert());
  const handWorld=t=>trunk(t).qc.clone().multiply(rightHand(t)),turnRate=(f,t,h=1e-5)=>{const a=f(t-h),b=f(t+h);return logq(b.multiply(a.invert())).divideScalar(2*h);};
  // Release: palm above and ahead of the throwing shoulder, elbow still bent; the centre is launched on an arc
  // that lands short of the target tile, so the casing rolls onto it.
  const trR=trunk(rel),relQ=handWorld(rel),relPalm=toWorld(trR,arcDir(releaseArc[0]*DEG,releaseArc[1]*DEG).multiplyScalar(releaseArc[2]).add(rightShoulder).toArray()),relCenter=relPalm.clone().sub(grip.clone().applyQuaternion(relQ)),spinAt=turnRate(handWorld,rel);
  const aim=V([GRENADE_THROW.target-.62,.045,0]),angle=launchAngle,dist=Math.hypot(aim.x-relCenter.x,aim.z-relCenter.z),rise=aim.y-relCenter.y;
  const speed=Math.sqrt(G*dist*dist/(2*Math.cos(angle)**2*(dist*Math.tan(angle)-rise))),launch=V([aim.x-relCenter.x,0,aim.z-relCenter.z]).normalize().multiplyScalar(speed*Math.cos(angle)).setY(speed*Math.sin(angle));
  // The chest-frame arc rates that give the centre exactly the launch velocity at release.
  const relLocal=toLocal(trR,relPalm),h=1e-5,frameVel=toWorld(trunk(rel+h),relLocal.toArray()).sub(toWorld(trunk(rel-h),relLocal.toArray())).divideScalar(2*h);
  const gripVel=grip.clone().applyQuaternion(handWorld(rel+h)).sub(grip.clone().applyQuaternion(handWorld(rel-h))).divideScalar(2*h);
  const rate=launch.clone().sub(frameVel).add(gripVel).applyQuaternion(trR.qc.clone().invert()),[az,el,r]=[releaseArc[0]*DEG,releaseArc[1]*DEG,releaseArc[2]];
  const out=arcDir(az,el),eAz=V([-Math.cos(el)*Math.sin(az),0,Math.cos(el)*Math.cos(az)]),eEl=V([-Math.sin(el)*Math.cos(az),Math.cos(el),-Math.sin(el)*Math.sin(az)]);
  const arcRows=rightArcRows.map(r=>r||[rel,...releaseArc]),arc=track(arcRows,{[arcRows.findIndex(r=>r[0]===rel)]:[rate.dot(eAz)/(r*Math.cos(el)**2)/DEG,rate.dot(eEl)/r/DEG,rate.dot(out)]});
  const reachOf=LENGTH[1].arm[0]+LENGTH[1].arm[1],soft=(d,k,L)=>d>k?k+(L-k)*Math.tanh((d-k)/(L-k)):d;
  const palmWorld=t=>{const [a,e,d]=arc(t),tr=trunk(t),p=toWorld(tr,arcDir(a*DEG,e*DEG).multiplyScalar(d).add(rightShoulder).toArray());if(t<=rel)return p;
   const sh=toWorld(tr,rightShoulder.toArray()),off=palm.clone().applyQuaternion(handWorld(t)),w=p.clone().sub(off).sub(sh),n=w.length();return sh.add(w.multiplyScalar(soft(n,.95*reachOf,.995*reachOf)/n)).add(off);},heldCenter=t=>palmWorld(t).sub(grip.clone().applyQuaternion(handWorld(t)));
  // Free hand while hooked in the ring: held in the grenade's frame, so the pull is exact; then carried clear
  // in the chest frame, so it travels with the trunk.
  const ringOnGrenade=t=>{const q=handWorld(t),c=heldCenter(t);return {position:RING_CENTER.clone().add(V([pullAt(t),0,0])).applyQuaternion(q).add(c),quaternion:q.clone().multiply(turn([1,0,0],twistAt(t)))};};
  const hookedHand=t=>{const r=ringOnGrenade(Math.min(t,GRENADE_THROW.pin)),q=r.quaternion.clone().multiply(LEFT_IN_RING);return {palm:r.position.clone().sub(HOOK.clone().sub(palm).applyQuaternion(q)),q};};
  const pulled=hookedHand(GRENADE_THROW.pin),pinTrunk=trunk(GRENADE_THROW.pin),pulledLocal=toLocal(pinTrunk,pulled.palm),pulledQ=pinTrunk.qc.clone().invert().multiply(pulled.q),carry=V([.06,-.03,-.12]);
  function freeHand(t){if(t<=GRENADE_THROW.pin){const f=hookedHand(t);f.palm.add(V([-.02,.06,-.07]).applyQuaternion(trunk(t).qc).multiplyScalar(1-blend(t,0,.22)));return f;}
   const u=blend(t,GRENADE_THROW.pin,GRENADE_THROW.drop),tr=trunk(t);return {palm:toWorld(tr,pulledLocal.clone().addScaledVector(carry,u).toArray()),q:tr.qc.clone().multiply(pulledQ).multiply(turn([0,0,1],.35*u))};}
  const dropPose=freeHand(GRENADE_THROW.drop),dropChest=trunk(GRENADE_THROW.drop),qDrop=dropChest.qc.clone().invert().multiply(dropPose.q);
  const dropAt=toLocal(dropChest,dropPose.palm.clone().sub(palm.clone().applyQuaternion(dropPose.q))).sub(leftShoulder),dropR=dropAt.length();
  const leftArc=track([[GRENADE_THROW.drop,Math.atan2(-dropAt.z,dropAt.x)/DEG,Math.asin(dropAt.y/dropR)/DEG,dropR],...leftArcRows]),leftPole=track([[GRENADE_THROW.drop,.6,-.3,-.75],...leftPoleRows,[3.70,...BEND[-1].arm.toArray()]]),leftHand=spinTrack([[GRENADE_THROW.drop,qDrop],...leftHandRows]);
  const leftAt=(t,tr)=>{if(t<GRENADE_THROW.drop){const f=freeHand(t);return {wrist:f.palm.sub(palm.clone().applyQuaternion(f.q)),q:f.q,pole:V([.6,-.3,-.75])};}const [a,e,d]=leftArc(t);return {wrist:toWorld(tr,arcDir(a*DEG,e*DEG,-1).multiplyScalar(d).add(leftShoulder).toArray()),q:tr.qc.clone().multiply(leftHand(t)),pole:V(leftPole(t))};};
  const flight=toss(relCenter,launch,relQ,spinAt,casing,{keep:.38,bounce:.24,settle:.55,lie:lieOnSide,roll:.034}),settled=flight.at(flight.rest).p;
  // Lever: the striker spring flips it off a moment after release; drag on the light strip makes it fall short.
  const sepAge=GRENADE_THROW.lever-rel,sep=flight.at(sepAge),sepVel=flight.at(sepAge+1e-5).p.sub(flight.at(sepAge-1e-5).p).divideScalar(2e-5),leverStart=LEVER_CENTER.clone().applyQuaternion(sep.q).add(sep.p);
  const leverFlight=toss(leverStart,sepVel.add(spinAt.clone().cross(leverStart.clone().sub(sep.p))).add(V([2.2,.8,0]).applyQuaternion(sep.q)),sep.q,spinAt.clone().add(V([0,0,-38]).applyQuaternion(sep.q)),leverHull,{drag:2.2,keep:.30,bounce:.25,settle:.30,lie:lieFlat});
  // Ring: rides the grenade until the pin clears, then the free hand, then falls when that hand opens.
  const ringInHand=t=>{const f=freeHand(t),hook=f.palm.clone().add(HOOK.clone().sub(palm).applyQuaternion(f.q));return {position:hook,quaternion:f.q.clone().multiply(LEFT_IN_RING.clone().invert())};};
  const ringLetGo=ringInHand(GRENADE_THROW.drop),ringVel=ringLetGo.position.clone().sub(ringInHand(GRENADE_THROW.drop-1e-4).position).divideScalar(1e-4).add(V([.05,.25,-.35]));
  const ringFlight=toss(ringLetGo.position,ringVel,ringLetGo.quaternion,V([4,-6,3]),ringHull,{keep:.3,bounce:.3,settle:.25,lie:lieFlat});
  const ring=t=>{if(t<GRENADE_THROW.pin)return {...ringOnGrenade(t),phase:'pin'};if(t<GRENADE_THROW.drop)return {...ringInHand(t),phase:'hand'};const f=ringFlight.at(t-GRENADE_THROW.drop);return {position:f.p,quaternion:f.q,phase:f.phase==='rest'?'dropped':'falling'};};
  const projectile=t=>{const age=t-rel;if(age<0)return {position:heldCenter(t),quaternion:handWorld(t),phase:'held'};const f=flight.at(age);return {position:f.p,quaternion:f.q,phase:f.phase};};
  const lever=t=>{if(t<GRENADE_THROW.lever){const b=projectile(t);return {position:LEVER_CENTER.clone().applyQuaternion(b.quaternion).add(b.position),quaternion:b.quaternion,phase:'held'};}const f=leverFlight.at(t-GRENADE_THROW.lever);return {position:f.p,quaternion:f.q,phase:f.phase==='rest'?'dropped':'flying'};};
  // Head: eyes on the target, a glance at the pin, then the grenade's flight; it stays upright as the trunk leans and
  // turns at most 40 degrees from the chest (identity to 30, smooth beyond): past that the neck mesh parts from the
  // collar. A horse's eyes sit on the sides of its head, so the lead eye still has the target. It eases in from and
  // back out to the neutral head, so the clip joins the idle pose without a pop.
  function look(tr,t){const eye=tr.chest.clone().add(headOffset.clone().applyQuaternion(tr.qc)).add(V([0,.17,0])),age=t-rel-.07,target=V([GRENADE_THROW.target,.35,0]);
   if(t>.24&&t<.70)target.lerp(heldCenter(t),.55*blend(t,.24,.34)*(1-blend(t,.56,.68)));
   if(age>0){const g=age<flight.impacts[0]?flight.at(age).p:settled.clone();g.lerp(settled,blend(age,flight.impacts[0]-.30,flight.impacts[0]-.02));target.lerp(g,.65*blend(age,0,.32)*(1-blend(t,3.55,4.05)));}
   const d=target.sub(eye),want=turn([0,1,0],Math.atan2(-d.z,d.x)).multiply(turn([0,0,1],clamp(Math.atan2(d.y,Math.hypot(d.x,d.z)),-.55,.40))),q=tr.qc.clone().invert().multiply(want);
   const v=logq(q),a=v.length(),k=.52,L=.70,limit=a>k?(k+(L-k)*Math.tanh((a-k)/(L-k)))/a:1;return expq(v.multiplyScalar(limit*blend(t,0,.35)*(1-blend(t,3.95,4.45))));}
  // Segment end points for balance (the same two-bone solutions the bones receive in at()).
  function body(t){const tr=trunk(t),P={pelvis:tr.hips,chest:tr.chest},neck=tr.chest.clone().add(headOffset.clone().applyQuaternion(tr.qc));P.neck=neck;P.headTip=V([.14,.32,0]).applyQuaternion(tr.qc.clone().multiply(look(tr,t))).add(neck);
   for(const s of [-1,1]){const hip=tr.hips.clone().add(THIGH[s].clone().applyQuaternion(tr.qp)),f=hoof(s,t),sh=tr.chest.clone().add(SHOULDER[s].clone().applyQuaternion(tr.qc));
    P['hip'+s]=hip;P['ankle'+s]=f.ankle;P['knee'+s]=bend(hip,f.ankle,...LENGTH[s].leg,kneePole(f.yaw,s));P['toe'+s]=V([.145,-ankleY,0]).applyQuaternion(f.q).add(f.ankle);P['heel'+s]=V([-.06,-ankleY,0]).applyQuaternion(f.q).add(f.ankle);
    const arm=s===1?{q:handWorld(t),wrist:null,pole:V(rightPole(t))}:leftAt(t,tr),wrist=arm.wrist||palmWorld(t).sub(palm.clone().applyQuaternion(arm.q));
    P['shoulder'+s]=sh;P['wrist'+s]=wrist;P['elbow'+s]=bend(sh,wrist,...LENGTH[s].arm,arm.pole.applyQuaternion(tr.qc));P['palm'+s]=palm.clone().applyQuaternion(arm.q).add(wrist);}
   return P;}
  const releaseRates=[rate.dot(eAz)/(r*Math.cos(el)**2)/DEG,rate.dot(eEl)/r/DEG,rate.dot(out)];
  return {xz,trunk,toWorld,handWorld,palmWorld,heldCenter,leftAt,look,body,flight,launch,relCenter,ring,projectile,lever,releaseRates};
 }
 // ---- balance: the centre of mass rides a linear inverted pendulum over the centre-of-pressure plan ----
 // x'' = w2 (x - p), w2 = Fy / (M y), with p the planned pressure point shifted by what the arms' and trunk's
 // angular momentum needs (dL/dt about the centre of mass moves the required pressure point by dL/Fy). Both ends
 // are held, and the anticipatory push and the end settle are sized so the body starts and ends at rest. The
 // pelvis is then shifted until the real segment centre of mass follows that path.
 const centre=P=>{const c=V();for(const [a,b,m] of SEGMENTS)c.addScaledVector(P[a],m/2).addScaledVector(P[b],m/2);return c.divideScalar(MASS);};
 function momentum(k,t,c,h=.002){const A=k.body(t-h),B=k.body(t),C=k.body(t+h),vc=centre(C).sub(centre(A)).divideScalar(2*h),L=V();
  for(const [a,b,m] of SEGMENTS){const mid=P=>P[a].clone().add(P[b]).multiplyScalar(.5),dir=P=>P[b].clone().sub(P[a]).normalize(),len=B[b].distanceTo(B[a]),vm=mid(C).sub(mid(A)).divideScalar(2*h);
   L.add(mid(B).sub(c).cross(vm.sub(vc)).multiplyScalar(m)).add(dir(B).cross(dir(C).sub(dir(A)).divideScalar(2*h)).multiplyScalar(m*len*len/12));}return L;}
 const DT=.005,N=Math.round(D/DT),GRID=Array.from({length:N+1},(_,i)=>i*DT),SENSITIVITY=1.29;
 const table=rows=>{const M=[0,1].map(c=>{const y=rows.map(r=>r[c]),m=new Float64Array(N+1),cp=new Float64Array(N),dp=new Float64Array(N);for(let i=1;i<N;i++){const r=6*(y[i+1]-2*y[i]+y[i-1])/(DT*DT),d=4-(i>1?cp[i-1]:0);cp[i]=1/d;dp[i]=(r-(i>1?dp[i-1]:0))/d;}for(let i=N-1;i>=1;i--)m[i]=dp[i]-(i<N-1?cp[i]*m[i+1]:0);return {y,m};});
  return t=>{const u=clamp(t/DT,0,N-1e-9),i=Math.floor(u),f=u-i,g=1-f;return M.map(({y,m})=>m[i]*g*g*g*DT*DT/6+m[i+1]*f*f*f*DT*DT/6+(y[i]-m[i]*DT*DT/6)*g+(y[i+1]-m[i+1]*DT*DT/6)*f);};};
 function plan(k){const C=GRID.map(t=>centre(k.body(t))),Lm=GRID.map((t,i)=>momentum(k,t,C[i]));
  const ydd=C.map((c,i)=>i&&i<N?(C[i+1].y-2*c.y+C[i-1].y)/(DT*DT):0),Fy=ydd.map(a=>MASS*(G+a)),w2=Fy.map((f,i)=>f/(MASS*C[i].y));
  const dL=Lm.map((l,i)=>Lm[Math.min(N,i+1)].clone().sub(Lm[Math.max(0,i-1)]).divideScalar((Math.min(N,i+1)-Math.max(0,i-1))*DT));
  // Standing still means the centre of mass is over the pressure point, so the plan starts and ends exactly under
  // the actual opening and closing poses' centres of mass.
  const solve=(axis,shift)=>{const x0=C[0].getComponent(axis?2:0),xn=C[N].getComponent(axis?2:0),plan=t=>copAt(t)[axis]+(x0-copAt(0)[axis])*(1-blend(t,.10,.50))+(xn-copAt(D)[axis])*blend(t,3.45,3.85),base=pendulum(w2,GRID.map((t,i)=>plan(t)+shift(i)),x0,xn,DT);
   const a=pendulum(w2,GRID.map(t=>hump(t,.30,.84)),0,0,DT),b=pendulum(w2,GRID.map(t=>hump(t,3.45,4.20)),0,0,DT);
   const m11=a[1],m12=b[1],m21=-a[N-1],m22=-b[N-1],r1=base[0]-base[1],r2=base[N-1]-base[N],det=m11*m22-m12*m21,al=(r1*m22-m12*r2)/det,be=(m11*r2-m21*r1)/det;
   return {path:base.map((x,i)=>x+al*a[i]+be*b[i]),push:[al,be],cop:t=>plan(t)+al*hump(t,.30,.84)+be*hump(t,3.45,4.20)};};
  const X=solve(0,i=>-dL[i].z/Fy[i]),Z=solve(1,i=>dL[i].x/Fy[i]);
  const rows=GRID.map((t,i)=>{const [dx,dz]=k.xz(t);return [dx+SENSITIVITY*(X.path[i]-C[i].x),dz+SENSITIVITY*(Z.path[i]-C[i].z)];});
  return {xz:table(rows),residual:Math.max(...GRID.map((t,i)=>Math.hypot(X.path[i]-C[i].x,Z.path[i]-C[i].z))),push:{x:X.push,z:Z.push},cop:t=>[X.cop(t),Z.cop(t)]};}
 let kin=kinematics(()=>[0,0]),balance;for(let pass=0;pass<4;pass++){balance=plan(kin);kin=kinematics(balance.xz);}
 const {trunk,handWorld,palmWorld,leftAt,look,flight,launch,relCenter,ring,projectile,lever}=kin;
 // Two-bone limb with twist: the bend plane maps onto the rest bend plane, so thighs and forearms turn with the
 // hips and shoulder instead of keeping their rest twist (no candy-wrapper at the hip or elbow).
 let time=0,state,disposed=false;
 const live=t=>{if(disposed)throw Error('Throw motion was disposed');if(!Number.isFinite(t))throw Error('Throw time must be finite');return clamp(t,0,D);};
 function rotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));root.updateMatrixWorld(true);}
 const basis=(d,n)=>{const x=d.clone().normalize(),z=n.clone().addScaledVector(x,-n.dot(x)).normalize();return new T.Matrix4().makeBasis(x,z.clone().cross(x),z);};
 const align=(d0,n0,d1,n1)=>Q().setFromRotationMatrix(basis(d1,n1).multiply(basis(d0,n0).transpose()));
 function limb(a,b,c,target,pole){const ra=rest.get(a),rb=rest.get(b),rc=rest.get(c),start=a.getWorldPosition(V()),l1=ra.distanceTo(rb),l2=rb.distanceTo(rc),d=target.distanceTo(start);
  if(d>l1+l2+1e-6||d<Math.abs(l1-l2)+1e-7)throw Error('Throw pose unreachable: '+a.name+' at '+time.toFixed(3)+' ('+d.toFixed(4)+' / '+(l1+l2).toFixed(4)+')');
  const mid=bend(start,target,l1,l2,pole),d0a=rb.clone().sub(ra),d0b=rc.clone().sub(rb),n0=d0a.clone().cross(d0b).normalize(),d1a=mid.clone().sub(start),d1b=target.clone().sub(mid);let n1=d1a.clone().cross(d1b);if(n1.lengthSq()<1e-12)n1=target.clone().sub(start).cross(pole);n1.normalize();
  rotate(a,align(d0a,n0,d1a,n1));rotate(b,align(d0b,n0,d1b,n1));return mid;}
 // A loose part's geometry is authored in grenade space; place it at a world pose about its own centre.
 function place(mesh,center,pose){const m=new T.Matrix4().compose(pose.position.clone().sub(center.clone().applyQuaternion(pose.quaternion)),pose.quaternion,V([1,1,1]));grenade.root.matrix.clone().invert().multiply(m).decompose(mesh.position,mesh.quaternion,mesh.scale);}
 return {worker,grenade,bones,launch:launch.clone(),releaseCenter:relCenter.clone(),impacts:flight.impacts.map(a=>rel+a),projectile:t=>projectile(live(t)),ring:t=>ring(live(t)),lever:t=>lever(live(t)),palmAt:t=>palmWorld(live(t)),
  balance:{residual:balance.residual,push:balance.push,cop:t=>balance.cop(live(t)),centre:t=>centre(kin.body(live(t)))},release:{arc:releaseArc,rates:kin.releaseRates},
  at(t){time=live(t);root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');
   const tr=trunk(time);bones.hips.position.copy(tr.hips);bones.hips.quaternion.copy(tr.qp);bones.spine.quaternion.copy(tr.local);bones.head.quaternion.copy(look(tr,time));root.updateMatrixWorld(true);
   const feet={};for(const side of [-1,1]){const f=hoof(side,time);feet[side]=f;limb(bones['thigh'+side],bones['shin'+side],bones['hoof'+side],f.ankle,kneePole(f.yaw,side));rotate(bones['hoof'+side],f.q);}
   const rq=handWorld(time);limb(bones.upperArm1,bones.forearm1,bones.hand1,palmWorld(time).sub(palm.clone().applyQuaternion(rq)),V(rightPole(time)).applyQuaternion(tr.qc));rotate(bones.hand1,rq);bones.fingers1.rotation.z=curl(1,time);
   const L=leftAt(time,tr);limb(bones['upperArm-1'],bones['forearm-1'],bones['hand-1'],L.wrist,L.pole.applyQuaternion(tr.qc));rotate(bones['hand-1'],L.q);bones['fingers-1'].rotation.z=curl(-1,time);
   const ball=projectile(time),rp=ring(time),lp=lever(time);grenade.root.visible=true;grenade.root.position.copy(ball.position);grenade.root.quaternion.copy(ball.quaternion);grenade.root.updateMatrix();
   place(loose.ring,RING_CENTER,rp);place(loose.lever,LEVER_CENTER,lp);root.updateMatrixWorld(true);worker.skeleton.update();
   const actual=bones.hand1.localToWorld(palm.clone()),gripAt=grenade.anchors.grip.getWorldPosition(V()),released=time>=rel;
   state={time,phase:PHASES.find(([end])=>time<end)[1],released,ball:{phase:ball.phase,position:ball.position.toArray(),quaternion:ball.quaternion.toArray(),groundClearance:ball.position.y+bottom(casing,ball.quaternion)},
    ring:{phase:rp.phase,position:rp.position.toArray(),groundClearance:rp.position.y+bottom(ringHull,rp.quaternion)},lever:{phase:lp.phase,position:lp.position.toArray(),groundClearance:lp.position.y+bottom(leverHull,lp.quaternion)},
    palm:actual.toArray(),gripError:released?null:actual.distanceTo(gripAt),feet:Object.fromEntries(Object.entries(feet).map(([s,f])=>[s,{target:f.ankle.toArray(),ankle:bones['hoof'+s].getWorldPosition(V()).toArray(),contact:f.contact,planted:f.contact==='flat',yaw:f.yaw}])),
    hips:bones.hips.getWorldPosition(V()).toArray(),chest:bones.spine.getWorldPosition(V()).toArray()};return state;
  },
  diagnostics(){return state;},
  dispose(){if(disposed)return;disposed=true;worker.pose('neutral');for(const m of Object.values(loose)){m.position.set(0,0,0);m.quaternion.identity();m.scale.set(1,1,1);}for(const s of savedFeet){s.foot.geometry.attributes.skinIndex.copy(s.index);s.foot.geometry.attributes.skinWeight.copy(s.weight);s.foot.geometry.attributes.skinIndex.needsUpdate=s.foot.geometry.attributes.skinWeight.needsUpdate=true;}}
 };
}
