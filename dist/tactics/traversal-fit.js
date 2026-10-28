import * as T from './vendor/three.module.js';
import {V,Q,DEG,clamp,smooth,track,relQ} from './traversal-pose.js';
// Fitting the traversals (docs/tactics/NATURAL-TRAVERSAL.md) to every mammal. The keys were written on the horse.
// All the mammals share its skeleton except the pig foreman (shorter legs, lower hips), but their surfaces differ:
// tails, horns, ears, snouts, bellies and kit. A hips key held up by the legs is scaled to the character's own legs,
// a key hanging from the hands keeps the shoulders where the horse's were, and the rest is fitted by clearance
// against the character's real, skinned surface.
// front and half: how far the torso's surface reaches ahead of the hips and to either side at rest (points riding the
// hips or spine).
export const AUTHORED=Object.freeze({hips:.80,leg:.67,shoulder:1.19,front:.208,half:.256});
export function bodyFit(body,probe){
 const d={hips:body.at0('hips').y,leg:body.L[1].thigh+body.L[1].shin,shoulder:body.at0('upperArm1').y,ankle:body.at0('hoof1').y,front:-Infinity,half:0};
 probe.update();for(let i=0;i<probe.count;i++){const b=probe.boneNames[probe.bone[i]];if((b==='hips'||b==='spine')&&!/tail/.test(probe.names[probe.part[i]])){d.front=Math.max(d.front,probe.x[i]);d.half=Math.max(d.half,Math.abs(probe.z[i]));}}
 return {...d,
  // A body deeper in front than the horse's (the pigs) stands back that much while it faces the obstacle, feet and all.
  back:Math.max(0,d.front-AUTHORED.front),
  // A body wider than the horse's keeps that much farther from a wall it moves along.
  wide:Math.max(0,d.half-AUTHORED.half),
  // A hips height held up by the legs: the same crouch on this character's legs.
  stand:y=>d.hips-(AUTHORED.hips-y)*d.leg/AUTHORED.leg,
  // A hips height hanging from the hands: the shoulders where the horse's were.
  hang:y=>y-((d.shoulder-d.hips)-(AUTHORED.shoulder-AUTHORED.hips)),
  // Where a hoof stands at rest, moved dx along the crossing.
  foot:(s,dx=0)=>{const p=body.at0('hoof'+s);return [p.x+dx,p.y,p.z];}};
}
// Tails are meshes named "tail" that ride the hips rigidly. They bend about the root as the game's tower tuck does
// (tower-tail-tuck.js): the root stays on the rump and the turn grows along the tail. pitch turns about the body's
// side axis (bind +Z: positive tips the tail up over the back), yaw about its up axis (bind +Y), in radians.
// The bend's reach grows along the tail from the hips joint; where it is under a third is the root, which does not turn:
// it counts as the body (isRoot), and the window's roll, the seat and the trunk's fit find it where it is played (turned
// a third of the way at its edge, the skunk's plume root rose 2.2 to 3 cm off the floor as the body lay back on it in
// the window's roll, which turns about it, and the phantom-wrench rig found nothing under the body). The turn grows
// from the root's edge, so the base just beyond, turned less than half the way, cannot get far out of anything's way
// either: it is fitted out of the obstacles alone, and pressed into the floor it squashes onto it (squash), as the root
// does (the roll reads every second point of the body: the bull's rocking seat put a root point between them 3.1 cm in).
// The rest of the tail is fitted at every point (at every third, the bull's coarse tube hid its underside, 2.2 cm in
// the floor as it rose). restore() puts the surface back exactly.
const ROOT=.35;
export function createTailBend(worker){
 const hips=worker.bones.find(b=>b.name==='hips');
 const tails=worker.parts.filter(p=>/tail/.test(p.name)).map(part=>{
  const pos=part.geometry.attributes.position,nrm=part.geometry.attributes.normal,base=Float32Array.from(pos.array),baseN=nrm&&Float32Array.from(nrm.array),sk=part.skeleton,hi=sk.bones.indexOf(hips),n=pos.count;
  // The root: the tail's points nearest the hips joint, in the mesh's bind space.
  const joint=V().applyMatrix4(sk.boneInverses[hi].clone().invert()).applyMatrix4(part.bindMatrixInverse),P=i=>V(base[3*i],base[3*i+1],base[3*i+2]);
  const dist=Array.from({length:n},(_,i)=>P(i).distanceTo(joint)),near=Math.min(...dist),pivot=V();let m=0;
  for(let i=0;i<n;i++)if(dist[i]<near+.025){pivot.add(P(i));m++;}pivot.divideScalar(m);
  const len=Math.max(...Array.from({length:n},(_,i)=>P(i).distanceTo(pivot))),r1=Math.max(.05,.45*len);
  const reach=Float32Array.from({length:n},(_,i)=>T.MathUtils.smoothstep(P(i).distanceTo(pivot),.015,r1)),blend=reach.map(r=>T.MathUtils.smoothstep(r,ROOT,1));
  // soft: which fitted points are the base's; flat: the root's and the base's points, for squash
  const sample=Array.from({length:n},(_,i)=>i).filter(i=>reach[i]>=ROOT),flat=Uint32Array.from({length:n},(_,i)=>i).filter(i=>blend[i]<.5);
  return {part,pos,nrm,base,baseN,pivot,blend,reach,hi,n,len,sample,flat,soft:Uint8Array.from(sample,i=>blend[i]<.5?1:0)};});
 const byName=new Map(tails.map(t=>[t.part.name,t]));
 const q=Q(),qz=Q(),Y=V(0,1,0),Z=V(0,0,1),M=new T.Matrix4(),B=new T.Matrix4(),Ri=new T.Matrix4(),Mi=new T.Matrix4(),v=V(),w=V();
 const turn=(pitch,yaw,b)=>q.setFromAxisAngle(Y,yaw*b).multiply(qz.setFromAxisAngle(Z,pitch*b));
 const bent=(t,i,pitch,yaw,out)=>out.set(t.base[3*i]-t.pivot.x,t.base[3*i+1]-t.pivot.y,t.base[3*i+2]-t.pivot.z).applyQuaternion(turn(pitch,yaw,t.blend[i])).add(t.pivot);
 return {count:tails.length,
  isRoot:(name,i)=>{const t=byName.get(name);return !!t&&t.reach[i]<ROOT;},
  set(pitch,yaw){for(const t of tails){for(let i=0;i<t.n;i++){bent(t,i,pitch,yaw,v);t.pos.setXYZ(i,v.x,v.y,v.z);if(t.nrm){w.set(t.baseN[3*i],t.baseN[3*i+1],t.baseN[3*i+2]).applyQuaternion(turn(pitch,yaw,t.blend[i]));t.nrm.setXYZ(i,w.x,w.y,w.z);}}
   t.pos.needsUpdate=true;if(t.nrm)t.nrm.needsUpdate=true;}},
  // Where each tail is carried under the current bones (to keep for later), and the world points of the tail bent by
  // (pitch, yaw) under a kept frame or the current bones, for fitting, each with whether it is the base's.
  frame:()=>tails.map(t=>{const s=t.part.skeleton;return new T.Matrix4().multiplyMatrices(t.part.matrixWorld,t.part.bindMatrixInverse).multiply(B.multiplyMatrices(s.bones[t.hi].matrixWorld,s.boneInverses[t.hi])).multiply(t.part.bindMatrix);}),
  world(pitch,yaw,visit,frame=null){tails.forEach((t,j)=>{if(frame)M.copy(frame[j]);else{const s=t.part.skeleton;M.multiplyMatrices(t.part.matrixWorld,t.part.bindMatrixInverse).multiply(B.multiplyMatrices(s.bones[t.hi].matrixWorld,s.boneInverses[t.hi])).multiply(t.part.bindMatrix);}
   t.sample.forEach((i,k)=>visit(bent(t,i,pitch,yaw,v).applyMatrix4(M),t.soft[k]));});},
  // Each candidate bend's points (pitch, yaw in degrees), bent once in the space a kept frame carries, then their centre
  // and radius; and each tail's root and reach there, and which of its fitted points are the base's, for the planned
  // follow.
  bends:cands=>tails.map(t=>cands.map(([a,b])=>{const out=new Float32Array(3*t.sample.length+4);let cx=0,cy=0,cz=0;const N=t.sample.length;t.sample.forEach((i,k)=>{bent(t,i,a*DEG,b*DEG,v);out[3*k]=v.x;out[3*k+1]=v.y;out[3*k+2]=v.z;cx+=v.x/N;cy+=v.y/N;cz+=v.z/N;});
   let r=0;for(let k=0;k<N;k++)r=Math.max(r,Math.hypot(out[3*k]-cx,out[3*k+1]-cy,out[3*k+2]-cz));out.set([cx,cy,cz,r],3*N);return out;})),
  reach:()=>tails.map(t=>({pivot:t.pivot.clone(),len:t.len,soft:t.soft})),
  // The root and the base where they are in the floor, squashed onto it: in the motion's own frame (root, its object),
  // under the current bones, after set().
  squash(root){Ri.copy(root.matrixWorld).invert();for(const t of tails){const s=t.part.skeleton;let moved=false;
   M.multiplyMatrices(Ri,t.part.matrixWorld).multiply(t.part.bindMatrixInverse).multiply(B.multiplyMatrices(s.bones[t.hi].matrixWorld,s.boneInverses[t.hi])).multiply(t.part.bindMatrix);Mi.copy(M).invert();
   for(const i of t.flat){v.fromBufferAttribute(t.pos,i).applyMatrix4(M);if(v.y<0){v.y=0;v.applyMatrix4(Mi);t.pos.setXYZ(i,v.x,v.y,v.z);moved=true;}}if(moved)t.pos.needsUpdate=true;}},
  restore(){for(const t of tails){t.pos.array.set(t.base);t.pos.needsUpdate=true;if(t.nrm){t.nrm.array.set(t.baseN);t.nrm.needsUpdate=true;}}}};
}
// Clearance. Where the trunk, head or tail would go into the floor or the obstacle, the least correction takes it out.
// The torso (points riding the hips or spine, and a tail's root) moves the trunk. The head (points riding the head)
// turns within the neck, turning preferred to tilting and tilting to nodding; what the neck cannot clear the body bows
// from the hips for, and what is left moves the trunk. The tail bends about its root. A head turn, bow or tail bend is
// chosen once for each stretch of contact (up to 0.24 s: a body ducks once and stays ducked, so neighbouring moments
// cannot pull opposite ways) and eased in and out around it; a trunk move is spread so its full size holds through
// the contact. All are joined by quintic tracks. The motion reads fit.trunk(t) (a hips offset), fit.bow(t) (degrees
// of extra forward pelvis pitch), fit.head(t) ([nod, tilt, turn] in degrees, after its own head pose) and fit.tail(t)
// ([pitch, yaw] in degrees).
// The way out of an obstacle follows the crossing (stage(t)): straight back while approaching it; over it, the nearest
// of back, up or on; past it, the nearer of on or up. From under an overhead obstacle (a lintel) the way out is always
// down: duck. The floor always pushes up.
const EASE=.12,LIMBS=['leg-1','leg1','arm-1','arm1'];
// The arm and leg capsules the arms are kept off (fit.solveSelf): [from, to, radius(, gain)], points named per side.
const SELF_ARM=[['shoulder','elbow',.045,2],['elbow','wrist',.04,1.5],['wrist','palm',.045,1]],SELF_LEG=[['hip','knee',.075],['knee','ankle',.05],['ankle','toe',.03]];
// The closest points of segments p1q1 and p2q2 (Ericson, Real-Time Collision Detection 5.1.9).
function segments(p1,q1,p2,q2){const d1=q1.clone().sub(p1),d2=q2.clone().sub(p2),r=p1.clone().sub(p2),a=d1.dot(d1),e=d2.dot(d2),f=d2.dot(r);let s=0,t=0;
 if(a>1e-12||e>1e-12){if(a<=1e-12)t=clamp(f/e);else{const c=d1.dot(r);if(e<=1e-12)s=clamp(-c/a);else{const b=d1.dot(d2),den=a*e-b*b;s=den>1e-12?clamp((b*f-c*e)/den):0;t=(b*s+f)/e;
  if(t<0){t=0;s=clamp(-c/a);}else if(t>1){t=1;s=clamp((b-c)/a);}}}}
 const pa=p1.clone().addScaledVector(d1,s),pc=p2.clone().addScaledVector(d2,t);return {dist:pa.distanceTo(pc),pa,pc};}
const HEAD_TRY=[];for(let a=-40;a<=40;a+=10)for(let b=-60;b<=60;b+=15)for(let c=-48;c<=48;c+=12)HEAD_TRY.push([a,b,c]);
const headCost=h=>1.5*Math.abs(h[0])+1.2*Math.abs(h[1])+Math.abs(h[2]);HEAD_TRY.sort((x,y)=>headCost(x)-headCost(y));
const BOW_TRY=[];for(let b=-30;b<=45;b+=5)BOW_TRY.push(b);BOW_TRY.sort((x,y)=>Math.abs(x)-Math.abs(y));
const TAIL_TRY=[];for(let a=-150;a<=150;a+=10)for(let b=-120;b<=120;b+=10)TAIL_TRY.push([a,b]);TAIL_TRY.sort((x,y)=>Math.abs(x[0])+Math.abs(x[1])-Math.abs(y[0])-Math.abs(y[1]));
// How far a tail's bend may swing from one 20 ms sample to the next (degrees, each way): 2,000 degrees a second.
const TAIL_STEP=40;
export function createClearanceFit(duration,{step=.02}={}){
 const n=Math.max(2,Math.round(duration/step)+1),dt=duration/(n-1),times=Array.from({length:n},(_,k)=>k*dt);
 const ch={trunk:times.map(()=>[0,0,0]),bow:times.map(()=>[0]),head:times.map(()=>[0,0,0]),tail:times.map(()=>[0,0]),...Object.fromEntries(LIMBS.flatMap(id=>[[id,times.map(()=>[0,0,0])],['snap:'+id,times.map(()=>[0,0,0])]]))};let tracks=null,last=null;
 const at=(a,t)=>{const x=clamp(t/dt,0,n-1),i=Math.min(n-2,Math.floor(x)),u=x-i;return a[i].map((v,j)=>v+(a[i+1][j]-v)*u);};
 const get=k=>t=>tracks?tracks[k](clamp(t,0,duration)):at(ch[k],t);
 const W=Math.max(1,Math.round(.06/dt)),R=Math.max(1,Math.round(.1/dt)),R2=Math.max(1,Math.round(.25/dt)),CHUNK=Math.max(1,Math.round(.24/dt)),TAIL_CHUNK=Math.max(1,Math.round(.12/dt));
 // Spread a trunk move: hold the largest need within 2W samples, then two box blurs of W, so the full size holds
 // through the contact and eases in and out around it.
 function envelope(rows){const m=rows[0].length,out=rows.map(()=>new Array(m).fill(0));
  for(let j=0;j<m;j++)for(const sg of [1,-1]){let a=rows.map(r=>Math.max(0,sg*r[j]));if(!a.some(x=>x>0))continue;
   a=a.map((_,k)=>{let mx=0;for(let i=Math.max(0,k-2*W);i<=Math.min(n-1,k+2*W);i++)mx=Math.max(mx,a[i]);return mx;});
   for(let pass=0;pass<2;pass++)a=a.map((_,k)=>{let s=0;for(let i=k-W;i<=k+W;i++)s+=a[clamp(i,0,n-1)];return s/(2*W+1);});
   a.forEach((x,k)=>{out[k][j]+=sg*x;});}
  return out;}
 // Stretches of samples that need a part moved, cut to chunk samples (a tail, swept along faster, chooses more often):
 // [first, last].
 const runs=(flags,chunk=CHUNK)=>{const out=[];let s=-1;const close=e=>{for(let a=s;a<=e;a+=chunk)out.push([a,Math.min(e,a+chunk-1)]);s=-1;};
  flags.forEach((f,k)=>{if(f&&s<0)s=k;if(!f&&s>=0)close(k-1);});if(s>=0)close(n-1);return out;};
 // One value held through each stretch, eased in and out over r samples on either side (the nearer stretch wins),
 // softened over three samples where two stretches meet.
 function hold(list,m,r=R){const out=times.map(()=>new Array(m).fill(0)),dist=times.map(()=>Infinity);
  for(const {a,b,v}of list)for(let k=Math.max(0,a-r);k<=Math.min(n-1,b+r);k++){const d=k<a?a-k:k>b?k-b:0;if(d<dist[k]){dist[k]=d;const w=d?smooth(1-d/(r+1)):1;out[k]=v.map(x=>x*w);}}
  return out.map((r,k)=>r.map((x,j)=>(out[Math.max(0,k-1)][j]+x+out[Math.min(n-1,k+1)][j])/3));}
 // Corrections are zero at the start and the end, where the battle's own pose hands over.
 const ends=t=>smooth(Math.min(t,duration-t)/EASE);
 function solve({body,probe,tails,obstacles,poseAt,stage=()=>'over',free={},rounds=3,margin=.004}){
  const torso=[],head=[],hb=body.bones.head,hips=body.bones.hips;
  for(let i=0;i<probe.count;i++){const name=probe.names[probe.part[i]];if(/tail/.test(name)&&!tails?.isRoot(name,probe.vertex[i]))continue;const b=probe.boneNames[probe.bone[i]];if(b==='hips'||b==='spine')torso.push(i);else if(b==='head')head.push(i);}
  const inFoot=(x,z)=>obstacles.some(b=>x>b.min[0]&&x<b.max[0]&&z>b.min[2]&&z<b.max[2]);
  // How far a point is inside the floor or an obstacle along the way out (negative: clear of it), and that way; with
  // floor false, the obstacles alone (a tail's base, which squashes onto the floor).
  let st='over';
  const into=(p,out,floor=true)=>{let d=!floor||inFoot(p.x,p.z)?-Infinity:-p.y;out.set(0,1,0);
   for(const b of obstacles){const f=[p.x-b.min[0],b.max[0]-p.x,p.y-b.min[1],b.max[1]-p.y,p.z-b.min[2],b.max[2]-p.z],m=Math.min(...f);if(m<=d)continue;
    const k=b.min[1]>.5?2:st==='near'?0:st==='far'?(f[1]<=f[3]?1:3):[0,1,3].reduce((x,y)=>f[y]<f[x]?y:x),depth=m>0?f[k]:m;if(depth>d){d=depth;out.set(0,0,0).setComponent(k>>1,k&1?1:-1);}}return d;};
  const p=V(),way=V();
  const add=(name,need,free)=>{const sm=envelope(need);for(let k=0;k<n;k++){const f=(free?.(times[k])??1)*ends(times[k]);ch[name][k]=ch[name][k].map((v,j)=>v+sm[k][j]*f);}};
  // The trunk: the deepest torso point's way out at each sample.
  const torsoNeed=()=>times.map(t=>{st=stage(t);poseAt(t);probe.update();let deep=0,out=[0,0,0];
   for(const i of torso){p.set(probe.x[i],probe.y[i],probe.z[i]);const d=into(p,way)+margin;if(d>deep){deep=d;out=way.clone().multiplyScalar(d).toArray();}}return out;});
  // The head at every sample without its head turn or bow: the hips joint and side axis, the head joint, the head's
  // bare orientation, and each head point's place in the head's own frame.
  const bareHeads=()=>times.map(t=>{const s=stage(t);st=s;poseAt(t);probe.update();const cur=at(ch.head,t),curB=at(ch.bow,t)[0];
   const H=hips.getWorldPosition(V()),axis=V(0,0,1).applyQuaternion(hips.getWorldQuaternion(Q())),unbow=Q().setFromAxisAngle(axis,curB*DEG);
   const J=hb.getWorldPosition(V()),W0=hb.getWorldQuaternion(Q()),inv=W0.clone().invert(),l=new Float32Array(head.length*3);
   head.forEach((i,k)=>{p.set(probe.x[i],probe.y[i],probe.z[i]).sub(J).applyQuaternion(inv);l[3*k]=p.x;l[3*k+1]=p.y;l[3*k+2]=p.z;});
   return {st:s,H,axis,J:J.clone().sub(H).applyQuaternion(unbow).add(H),W:unbow.clone().multiply(W0).multiply(relQ(...cur).invert()),l};});
  // The deepest head point of a bare sample under a whole head turn c and bow b; visit sees every point.
  const headAt=(s,c,b,visit)=>{st=s.st;const Rh=s.W.clone().multiply(relQ(...c)),Rb=Q().setFromAxisAngle(s.axis,-b*DEG);let m=-Infinity;
   for(let k=0;k<s.l.length;k+=3){p.set(s.l[k],s.l[k+1],s.l[k+2]).applyQuaternion(Rh).add(s.J).sub(s.H).applyQuaternion(Rb).add(s.H);const d=into(p,way)+margin;if(visit)visit(p,d);if(d>m)m=d;}return m;};
  // One head turn and bow per stretch of contact; returns the trunk moves for what neither clears. The eases in and
  // out must clear too: a moment a neighbouring turn carries into contact joins its stretch, and the stretch is solved
  // again (up to three passes).
  // keepBow: the head alone, against the bow as it is (fit.solveHead, after the balance). air(t), if given: where
  // nothing holds the body; a turn is held through a flight next to its stretch, never turned there (eased out into
  // the jump at the climb's push-off, it put 10 N on the flight's peak and 0.01 s more over the limit).
  const solveHead=(keepBow=false,air=null)=>{const S=bareHeads(),B=keepBow?ch.bow.map(x=>x[0]):null,r=B?R2:R,inAir=k=>!!air?.(times[k]);
   let flags=S.map((s,k)=>head.length>0&&headAt(s,[0,0,0],B?B[k]:0)>0),pushes;
   for(let pass=0;pass<3;pass++){pushes=times.map(()=>[0,0,0]);const list=[];
    for(const [a,b]of runs(flags)){const run=S.slice(a,b+1);
     const worst=(c,bw,stop)=>{let m=-Infinity;for(const [j,s] of run.entries()){m=Math.max(m,headAt(s,c,B?B[a+j]:bw));if(m>=stop)break;}return m;};
     let c=[0,0,0],low=Infinity;for(const h of [[0,0,0],...HEAD_TRY]){const m=worst(h,0,low);if(m<=0){c=h;low=m;break;}if(m<low){low=m;c=h;}}
     let bw=0;if(low>0&&!B){let lowB=Infinity;for(const x of BOW_TRY){const m=worst(c,x,lowB);if(m<=0){bw=x;lowB=m;break;}if(m<lowB){lowB=m;bw=x;}}
      if(lowB>0)run.forEach((s,j)=>{let deep=0;headAt(s,c,bw,(q,d)=>{if(d>deep){deep=d;pushes[a+j]=way.clone().multiplyScalar(d).toArray();}});});}
     // a flight within the ease, with no other stretch before it, joins the stretch
     let a2=a,b2=b;for(let k=b+1;k<=Math.min(n-1,b+r)&&!flags[k];k++)if(inAir(k)){b2=k;while(b2+1<n&&inAir(b2+1))b2++;break;}
     for(let k=a-1;k>=Math.max(0,a-r)&&!flags[k];k--)if(inAir(k)){a2=k;while(a2>0&&inAir(a2-1))a2--;break;}
     list.push({a:a2,b:b2,c,bw});}
    const hv=hold(list.map(q=>({a:q.a,b:q.b,v:q.c})),3,r),bv=hold(list.map(q=>({a:q.a,b:q.b,v:[q.bw]})),1);
    for(let k=0;k<n;k++){const e=ends(times[k]);ch.head[k]=hv[k].map(v=>v*(free.head?.(times[k])??1)*e);if(!B)ch.bow[k]=[bv[k][0]*(free.trunk?.(times[k])??1)*e];}
    const more=S.map((s,k)=>!flags[k]&&head.length>0&&headAt(s,ch.head[k],ch.bow[k][0])>0);if(!more.some(Boolean))break;flags=flags.map((f,k)=>f||more[k]);}
   return pushes;};
  // The tail, soft, follows from moment to moment: the bend nearest the one before that clears, relaxing back toward
  // rest (a fifth per 20 ms) while nothing touches. It is followed forward from rest at the start and backward from rest
  // at the end, the two joined where they agree best, so it leaves and rejoins the battle's own tail; then softened over
  // three samples. Returns the trunk moves for what no bend clears (a rump that passes too low over the obstacle lifts
  // for its tail).
  // The tail's path planned over the whole motion (Viterbi) on the candidate grid: out of contact at the least swing,
  // leaving rest and coming back to it as the followed path does (from the nearest bend that clears where rest is held
  // down), drifting home (DRIFT a degree a sample) where nothing touches; a centimetre in for one sample outweighs a 200
  // degree swing. Planned with GAP to spare (the body moves between the samples), no faster than TAIL_STEP a sample,
  // and within NEAR of anything one grid step (10 degrees) a sample: planned at the full step there, the skunk's plume
  // swept 8 cm through the lintel between two samples that cleared. A step must clear half way too (under the poses at
  // both its ends and between them, H): one that does not is charged as its depth and the path planned again, up to
  // four times. Each bend's points are bent once and every sample's frame carries them; a sample where no tail can reach
  // anything, or a bend whose points all lie farther than NEAR from everything, is clear without its points. Returns the
  // path and the trunk moves for what it leaves in contact, as the followed one does.
  // into's depth without its way out or any allocation, for the planner's table (the same stage rules; into allocated
  // the six face distances and spread them, four times the planner's whole cost)
  const depthAt=(x,y,z,floor=true)=>{let d=floor?-y:-Infinity;for(const b of obstacles)if(x>b.min[0]&&x<b.max[0]&&z>b.min[2]&&z<b.max[2]){d=-Infinity;break;}
   for(const b of obstacles){const f0=x-b.min[0],f1=b.max[0]-x,f2=y-b.min[1],f3=b.max[1]-y,m=Math.min(f0,f1,f2,f3,z-b.min[2],b.max[2]-z);if(m<=d)continue;
    if(m<=0){d=m;continue;}const k=b.min[1]>.5?2:st==='near'?0:st==='far'?(f1<=f3?1:3):(f0<=f1?(f0<=f3?0:3):(f1<=f3?1:3)),depth=k===0?f0:k===1?f1:k===2?f2:f3;if(depth>d)d=depth;}return d;};
  const planTail=(S,H)=>{const GAP=.03,NEAR=.05,G=[];for(let a=-150;a<=150;a+=10)for(let b=-120;b<=120;b+=10)G.push([a,b]);const NB=25,NA=31,m=G.length,cache=tails.bends(G),reach=tails.reach();
   const D=times.map((_,k)=>{st=S[k].st;const F=S[k].F,d=new Float32Array(m).fill(-Infinity);
    const free=reach.every((r,j)=>{const E=F[j].elements,sc=Math.max(Math.hypot(E[0],E[1],E[2]),Math.hypot(E[4],E[5],E[6]),Math.hypot(E[8],E[9],E[10])),P=r.pivot.clone().applyMatrix4(F[j]),R=r.len*sc+margin+GAP+.01;if(P.y<R)return false;
     return obstacles.every(b=>Math.hypot(Math.max(b.min[0]-P.x,0,P.x-b.max[0]),Math.max(b.min[1]-P.y,0,P.y-b.max[1]),Math.max(b.min[2]-P.z,0,P.z-b.max[2]))>R);});
    if(free)return d;
    for(let j=0;j<reach.length;j++){const E=F[j].elements,soft=reach[j].soft,sc=Math.max(Math.hypot(E[0],E[1],E[2]),Math.hypot(E[4],E[5],E[6]),Math.hypot(E[8],E[9],E[10]));for(let c=0;c<m;c++){const pts=cache[j][c],N3=pts.length-4;let mx=d[c];
     {const x=pts[N3],y=pts[N3+1],z=pts[N3+2],R=pts[N3+3]*sc+margin+GAP+NEAR,X=E[0]*x+E[4]*y+E[8]*z+E[12],Y=E[1]*x+E[5]*y+E[9]*z+E[13],Z=E[2]*x+E[6]*y+E[10]*z+E[14];
      if(Y>R&&obstacles.every(o=>Math.hypot(Math.max(o.min[0]-X,0,X-o.max[0]),Math.max(o.min[1]-Y,0,Y-o.max[1]),Math.max(o.min[2]-Z,0,Z-o.max[2]))>R))continue;}
     for(let q=0;q<N3;q+=3){const x=pts[q],y=pts[q+1],z=pts[q+2];const dd=depthAt(E[0]*x+E[4]*y+E[8]*z+E[12],E[1]*x+E[5]*y+E[9]*z+E[13],E[2]*x+E[6]*y+E[10]*z+E[14],!soft[q/3])+margin+GAP;if(dd>mx)mx=dd;}d[c]=mx;}}
    return d;});
   const DEPTH=2e4,DRIFT=.05,reachStep=TAIL_STEP/10,cost=new Float64Array(m),prev=new Float64Array(m),from=times.map(()=>new Int16Array(m));
   const swing=c=>Math.abs(G[c][0])+Math.abs(G[c][1]),node=(k,c)=>(D[k][c]>0?DEPTH*D[k][c]:0)+DRIFT*swing(c);
   const pen=times.map(()=>null),path=new Int16Array(n),viterbi=()=>{for(let c=0;c<m;c++)cost[c]=node(0,c)+swing(c);
    for(let k=1;k<n;k++){prev.set(cost);const pk=pen[k],Dk=D[k],Dp=D[k-1];for(let c=0;c<m;c++){const ia=Math.floor(c/NB),ib=c%NB,nearC=Dk[c]>-NEAR;let best=Infinity,arg=-1;
      for(let da=-reachStep;da<=reachStep;da++){const ja=ia+da;if(ja<0||ja>=NA)continue;for(let db=-reachStep;db<=reachStep;db++){const jb=ib+db;if(jb<0||jb>=NB)continue;const c2=ja*NB+jb;if((nearC||Dp[c2]>-NEAR)&&(da*da>1||db*db>1))continue;const v2=prev[c2]+10*(Math.abs(da)+Math.abs(db))+(pk?.get(c2*m+c)||0);if(v2<best){best=v2;arg=c2;}}}
      cost[c]=best+node(k,c);from[k][c]=arg;}}
    let last=Infinity;for(let c=0;c<m;c++)if(cost[c]+swing(c)<last){last=cost[c]+swing(c);path[n-1]=c;}
    for(let k=n-1;k>0;k--)path[k-1]=from[k][path[k]];};
   const midDepth=(k,a,b)=>{let mx=-Infinity;for(const X of [S[k-1],H[k],S[k]]){st=X.st;tails.world((a[0]+b[0])/2*DEG,(a[1]+b[1])/2*DEG,(v,soft)=>{mx=Math.max(mx,into(v,way,!soft)+margin);},X.F);}return mx;};
   for(let it=0;it<4;it++){viterbi();let found=false;
    for(let k=1;k<n;k++){const a=G[path[k-1]],b=G[path[k]];if(a[0]===b[0]&&a[1]===b[1])continue;const d=midDepth(k,a,b);if(d>0){(pen[k]??=new Map()).set(path[k-1]*m+path[k],DEPTH*d+1e3);found=true;}}
    if(!found)break;}
   const out=times.map((_,k)=>G[path[k]].slice()),pushes=times.map(()=>[0,0,0]);
   for(let k=0;k<n;k++)if(D[k][path[k]]>0){st=S[k].st;let deep=0;tails.world(G[path[k]][0]*DEG,G[path[k]][1]*DEG,(v,soft)=>{const dd=into(v,way,!soft)+margin;if(dd>deep){deep=dd;pushes[k]=way.clone().multiplyScalar(dd).toArray();}},S[k].F);}
   return {out,pushes};};
  // planned: where the followed path leaves the tail in contact, at a sample or half way to one, the planned one replaces
  // it (after the balance, where the tail moves nothing else; the fit's own passes keep the followed one and the trunk
  // moves it asks).
  const solveTail=(planned=false)=>{const S=times.map(t=>{st=stage(t);poseAt(t);return {st,F:tails.frame()};});
   const follow=order=>{const out=new Array(n),pushes=times.map(()=>[0,0,0]);let cur=[0,0];
    for(const k of order){st=S[k].st;const depth=(a,b,visit)=>{let m=-Infinity;tails.world(a*DEG,b*DEG,(v,soft)=>{const d=into(v,way,!soft)+margin;if(visit)visit(d);if(d>m)m=d;},S[k].F);return m;};
     const rest=cur.map(v=>Math.round(.8*v));
     if(depth(...rest)<=0)cur=rest;
     // The nearest bend within TAIL_STEP that clears, and clears half way there from the bend before; else the least deep
     // of them: a tail held down stays pressed against what holds it. Taken from the whole range, the nearest bend that
     // cleared swung the tail through the floor between two samples (the cow's 13 cm for 10 ms; the dog's 230 degrees,
     // 22 cm in).
     else{const near=c=>Math.abs(c[0]-cur[0])+Math.abs(c[1]-cur[1])+.25*(Math.abs(c[0])+Math.abs(c[1]));let best=null,low=Infinity,end=null,fall=cur,fallLow=depth(...cur);
      for(const c of TAIL_TRY.filter(c=>Math.abs(c[0]-cur[0])<=TAIL_STEP&&Math.abs(c[1]-cur[1])<=TAIL_STEP).sort((x,y)=>near(x)-near(y))){const d=depth(...c);if(d<=0){if(depth((c[0]+cur[0])/2,(c[1]+cur[1])/2)<=0){best=c;low=d;break;}end??=c;}else if(d<fallLow){fallLow=d;fall=c;}}
      if(!best){if(end){best=end;low=0;}else{best=fall;low=fallLow;}}
      cur=best;if(low>0){let deep=0;depth(...best,d=>{if(d>deep){deep=d;pushes[k]=way.clone().multiplyScalar(d).toArray();}});}}
     out[k]=cur;}
    return {out,pushes};};
   const f=follow(times.map((_,k)=>k)),b=follow(times.map((_,k)=>n-1-k));
   let join=0,gap=Infinity;for(let k=0;k<n;k++){const g=Math.abs(f.out[k][0]-b.out[k][0])+Math.abs(f.out[k][1]-b.out[k][1]);if(g<=gap){gap=g;join=k;}}
   // Joined, the two follows may disagree: no faster than TAIL_STEP a sample either way, the swing spread over the samples.
   let out=times.map((_,k)=>(k<=join?f.out[k]:b.out[k]).slice()),pushes=times.map((_,k)=>k<=join?f.pushes[k]:b.pushes[k]);
   for(let k=1;k<n;k++)for(const j of [0,1])out[k][j]=clamp(out[k][j],out[k-1][j]-TAIL_STEP,out[k-1][j]+TAIL_STEP);
   for(let k=n-2;k>=0;k--)for(const j of [0,1])out[k][j]=clamp(out[k][j],out[k+1][j]-TAIL_STEP,out[k+1][j]+TAIL_STEP);
   for(let k=0;k<n;k++)ch.tail[k]=out[k].map((v,j)=>(out[Math.max(0,k-1)][j]+v+out[Math.min(n-1,k+1)][j])/3*smooth(Math.min(times[k],duration-times[k])/(EASE/2)));
   // Where the join or the softening left a bend in contact, the nearest bend that clears replaces it.
   for(let k=0;k<n;k++){st=S[k].st;const depth=(a,b)=>{let m=-Infinity;tails.world(a*DEG,b*DEG,(v,soft)=>{m=Math.max(m,into(v,way,!soft)+margin);},S[k].F);return m;},c0=ch.tail[k];
    if(depth(...c0)<=0||depth(...out[k])>0)continue;const near=c=>Math.abs(c[0]-c0[0])+Math.abs(c[1]-c0[1]);
    for(const c of [out[k],...TAIL_TRY.filter(c=>Math.abs(c[0]-c0[0])<=TAIL_STEP&&Math.abs(c[1]-c0[1])<=TAIL_STEP).sort((x,y)=>near(x)-near(y))])if(depth(...c)<=0){ch.tail[k]=c;break;}}
   // Followed from moment to moment, a tail held down stays pressed against what holds it: the cow's, sat on in the
   // window's roll, was pinned at the grid's corner 3 cm in the floor, the clear side 180 degrees away.
   if(planned){const H=times.map((t,k)=>{if(!k)return null;const h=(times[k-1]+t)/2;st=stage(h);poseAt(h);return {st,F:tails.frame()};});
    const deep=(X,c)=>{st=X.st;let m=-Infinity;tails.world(c[0]*DEG,c[1]*DEG,(v,soft)=>{m=Math.max(m,into(v,way,!soft)+margin);},X.F);return m;};
    if(ch.tail.some((c,k)=>deep(S[k],c)>0||k&&deep(H[k],[(c[0]+ch.tail[k-1][0])/2,(c[1]+ch.tail[k-1][1])/2])>0)){const plan=planTail(S,H);for(let k=0;k<n;k++)ch.tail[k]=plan.out[k];return plan.pushes;}}
   return pushes;};
  // Each round the torso moves the trunk, then the head, against the moved trunk, turns, bows and moves it for what is
  // left, then the tail bends and lifts it for what is left; a last pass fits the head and tail to the finished trunk.
  for(let r=0;r<rounds;r++){add('trunk',torsoNeed(),free.trunk);add('trunk',solveHead(),free.trunk);if(tails?.count)add('trunk',solveTail(),free.trunk);}
  solveHead();if(tails?.count)solveTail();
  // The tail again on the finished motion, for moves made since (a seat set on the floor, the balance): bent for the
  // trunk as it now is, with no trunk move for what no bend clears. Fitted only before them, the tails went 2 to 13 cm
  // into the floor as the body rocked and sat.
  // The report is taken again either way: after the balance it reads the motion as played (the traversal test's caps).
  fit.solveTail=()=>{if(tails?.count){tracks=null;solveTail(true);build();}report();return fit;};
  // The head again on the finished motion: turned for the body as the balance left it, the bow kept (the balance was
  // planned with it) and the turn eased over R2 (eased over R, the climb's push-off turn asked 123 N of the crouch:
  // 17% of the body's weight; over R2, 65 N). The balance's turn put the long heads 4 to 8 cm into the climb's wall
  // at the push-off and the landing, where the fit before it saw them clear.
  fit.solveHead=({air}={})=>{tracks=null;solveHead(true,air);build();report();return fit;};
  // Limbs: the points riding a limb's bones move its end target out (a planted palm rises to lie on the sill, a hoof
  // drops under the lintel, a leg lifts over the wall top). They are fitted afterwards (solveLimbs), once the motion has
  // given its limbs their steady bend directions. planted(id, t) gives [weight, surface normal] for a limb's end; over a
  // half, only the end's own points count (moving a planted hand cannot clear its forearm on an edge: that is the
  // bend's work), and a planted end's need is taken as the pose takes its offset, out along the normal only. Counted
  // whole, the need the pose would not apply grew round on round to 21 cm and folded the arms in the reach to the catch.
  const limbPts=Object.fromEntries(LIMBS.map(id=>[id,[]])),endPts=Object.fromEntries(LIMBS.map(id=>[id,[]]));
  for(let i=0;i<probe.count;i++){const m=probe.boneNames[probe.bone[i]].match(/^(upperArm|forearm|hand|fingers|thigh|shin|hoof)(-?1)$/);if(!m)continue;const id=(/^(thigh|shin|hoof)$/.test(m[1])?'leg':'arm')+m[2];limbPts[id].push(i);if(/^(hand|fingers|hoof)$/.test(m[1]))endPts[id].push(i);}
  const limbNeed=planted=>{const need=Object.fromEntries(LIMBS.map(id=>[id,[]]));
   for(const t of times){st=stage(t);poseAt(t);probe.update();for(const id of LIMBS){const [pw,pn]=planted?.(id,t)||[0,null];let deep=0,out=V();for(const i of(pw>.5?endPts:limbPts)[id]){p.set(probe.x[i],probe.y[i],probe.z[i]);const d=into(p,way)+margin;if(d>deep){deep=d;out=way.clone().multiplyScalar(d);}}
     if(pw>0&&pn){const N=V(...pn).normalize(),along=Math.max(0,out.dot(N));out.multiplyScalar(1-pw).addScaledVector(N,along*pw);}need[id].push(out.toArray());}}
   return need;};
  const build=()=>{tracks=Object.fromEntries(Object.keys(ch).map(k=>[k,track(times.map((t,i)=>[t,...ch[k][i]]))]));};
  // What is left after fitting, on the same grid: the deepest torso, head, tail and limb points.
  const report=()=>{const left=Object.fromEntries(['trunk','head','tail',...LIMBS].map(k=>[k,{depth:0,t:0}]));
   for(const t of times){st=stage(t);poseAt(t);probe.update();const note=(k,d)=>{if(d>left[k].depth)left[k]={depth:d,t};};
    for(const i of torso){p.set(probe.x[i],probe.y[i],probe.z[i]);note('trunk',into(p,way));}
    for(const i of head){p.set(probe.x[i],probe.y[i],probe.z[i]);note('head',into(p,way));}
    for(const id of LIMBS)for(const i of limbPts[id]){p.set(probe.x[i],probe.y[i],probe.z[i]);note(id,into(p,way));}
    if(tails?.count){const [a,b]=fit.tail(t);tails.world(a*DEG,b*DEG,(v,soft)=>note('tail',into(v,way,!soft)));}}
   fit.report=left;};
  fit.solveLimbs=({rounds:limbRounds=3,planted=null}={})=>{tracks=null;for(let r=0;r<limbRounds;r++){const need=limbNeed(planted);for(const id of LIMBS)add(id,need[id],free.limbs);}build();report();return fit;};
  // fit.report is what the motion as it stood at the last solve leaves in the floor and the obstacles. The traversals'
  // balance (and the window's seat band) move the body after the fit, so each takes it again on the balanced motion
  // (fit.solveTail, and the climb's fit.solveHead): taken before, it read the climb's heads clear that went 5 to 8 cm
  // into its wall (docs/tactics/NATURAL-TRAVERSAL.md, seventh part).
  // Arms clear of the legs: each arm's capsules (the phantom-wrench rig's: upper arm .045, forearm .04, hand .045) are
  // kept off both legs' (thigh .075, shank .05, hoof .03) by moving the arm's end out the way the two part, twice the
  // overlap for the upper arm and one and a half for the forearm (moving the hand moves the elbow about half as far; at
  // one for one, three rounds left a bull's forearm 8 cm in its shin), a planted hand left where it is.
  // For a crouch that draws the knees up to the chest, where no hand-placed arm stays clear of them for long.
  fit.solveSelf=({rounds:selfRounds=6,planted=null,margin:gap=.005}={})=>{tracks=null;for(let r=0;r<selfRounds;r++){const need={'arm-1':[],arm1:[]};
    for(const t of times){st=stage(t);const P=poseAt(t);for(const s of [-1,1]){const id='arm'+s,pw=planted?.(id,t)?.[0]||0;let best=V();
     // The forearm and hand are kept off the upper trunk too (chest to neck, .14): kept off a raised thigh alone, a hand
     // was pushed up across the chest (the rabbit's 18 cm into it). The lower trunk is where a hand may rest (the rig
     // leaves a hand or forearm against it out).
     const push=(q,o,gain)=>{const u=q.pa.clone().sub(q.pc),len=u.length();if(len<1e-9)return;u.multiplyScalar(o*gain*(1-pw)/len);if(u.lengthSq()>best.lengthSq())best=u;};
     if(pw<.5)for(const [a,b,ra,gain]of SELF_ARM){for(const L of [-1,1])for(const [c,d,rb]of SELF_LEG){const q=segments(P[a+s],P[b+s],P[c+L],P[d+L]),o=ra+rb+gap-q.dist;if(o>0)push(q,o,gain);}
      if(a!=='shoulder'){const q=segments(P[a+s],P[b+s],P.chest,P.neck),o=ra+.14+gap-q.dist;if(o>0)push(q,o,gain);}}
     need[id].push(best.toArray());}}
   for(const id of ['arm-1','arm1'])add(id,need[id],free.limbs);}build();report();return fit;};
  // Planted ends sit on their surface. Each planted end's lowest point, along its surface's normal, is put SNAP off the
  // surface it rests on, both ways: the phantom-wrench rig counts a contact only within 1 cm, and a palm keyed a fixed
  // height up hovered 1 to 3 cm over a top while a toe-down hoof lifted by the clearance hovered 4 cm over the floor,
  // so the gate read hand-supported stretches as flight. planted(id, t) gives [weight, normal]; the snap is weighted by
  // it, smoothed over three samples, and given to the pose unmasked (fit.plant).
  const SNAP=.002,lift=(q,N)=>{
   if(N.y>.5){let s=inFoot(q.x,q.z)?-Infinity:0;for(const b of obstacles)if(q.x>b.min[0]&&q.x<b.max[0]&&q.z>b.min[2]&&q.z<b.max[2]&&b.max[1]<=q.y+.06)s=Math.max(s,b.max[1]);return s===-Infinity?Infinity:q.y-s;}
   const ax=Math.abs(N.x)>.5?0:2,o=2-ax,sg=Math.sign(N.getComponent(ax));let best=Infinity;
   for(const b of obstacles){if(q.y<b.min[1]||q.y>b.max[1]||q.getComponent(o)<b.min[o]||q.getComponent(o)>b.max[o])continue;const h=sg*(q.getComponent(ax)-(sg<0?b.min[ax]:b.max[ax]));if(h>-.06&&h<best)best=h;}
   return best;};
  // The snap is measured where the end is fully planted (and near its surface) and fades in and out with the plant
  // from the nearest such sample, so it rides the approach and the release (switched on at half planted, it jerked the
  // wrists at 200 m/s^2 for 10 ms).
  fit.solvePlants=({planted=null,rounds=2}={})=>{if(!planted)return fit;tracks=null;
   for(let r=0;r<rounds;r++){const fix=times.map(()=>({})),full=LIMBS.map(()=>new Array(n).fill(null)),wt=LIMBS.map(()=>new Array(n).fill(0));
    times.forEach((t,k)=>{const ws=LIMBS.map(id=>planted(id,t));ws.forEach(([w],j)=>{wt[j][k]=w||0;});if(!ws.some(([w])=>w>.98))return;st=stage(t);poseAt(t);probe.update();
     LIMBS.forEach((id,j)=>{const [w,nrm]=ws[j];if(!(w>.98)||!nrm)return;const N=V(...nrm).normalize();let low=Infinity;
      for(const i of endPts[id]){p.set(probe.x[i],probe.y[i],probe.z[i]);const h=lift(p,N);if(h<low)low=h;}
      if(low<.06)full[j][k]=N.multiplyScalar(SNAP-low).toArray();});});
    LIMBS.forEach((id,j)=>{for(let k=0;k<n;k++){if(!(wt[j][k]>0))continue;let a=k,b=k;while(a>=0&&!full[j][a]&&wt[j][a]>0)a--;while(b<n&&!full[j][b]&&wt[j][b]>0)b++;
     const src=full[j][k]||(a>=0&&full[j][a]&&(b>=n||!full[j][b]||k-a<=b-k)?full[j][a]:b<n?full[j][b]:null);if(src)fix[k][id]=src.map(x=>x*smooth(wt[j][k])*ends(times[k]));}});
    for(const id of LIMBS){const key='snap:'+id,raw=times.map((_,k)=>fix[k][id]||[0,0,0]);
     for(let k=0;k<n;k++){const sm=[0,0,0];for(let d=-1;d<=1;d++){const q=raw[clamp(k+d,0,n-1)];for(let c=0;c<3;c++)sm[c]+=q[c]/3;}ch[key][k]=ch[key][k].map((v,c)=>v+sm[c]);}}
    build();}
   report();return fit;};
  build();report();return fit;}
 const fit={trunk:t=>V(...get('trunk')(t)),bow:t=>get('bow')(t)[0],head:get('head'),tail:get('tail'),limb:(id,t)=>V(...get(id)(t)),plant:(id,t)=>V(...get('snap:'+id)(t)),report:null,solve,solveLimbs:()=>fit,solvePlants:()=>fit,solveTail:()=>fit,solveHead:()=>fit};
 return fit;
}
// The rig's obstacle boxes (phantom-wrench rigs/traversal.mjs): one tile wide on the edge at x = edge.
export const edgeBoxes=(edge,half,spans)=>spans.map(([y0,y1])=>({min:[edge-half,y0,-.5],max:[edge+half,y1,.5]}));
