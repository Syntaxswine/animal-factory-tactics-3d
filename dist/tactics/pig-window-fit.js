import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*x*(10+x*(-15+6*x));};
const phases=Object.freeze([
 {label:'Prepare native crossing',start:0,end:2},
 {label:'Native body crossing',start:2,end:6},
 {label:'Settle inside',start:6,end:8}
]);

// Clearance study, still held for support/choreography review. Geometry, native
// joint offsets and scale stay unchanged. Each limb follows an authored target;
// unreachable targets retain their residual, and swing limbs are support:false.
export function createPigWindowFit(worker,{hipPitch=-100,spinePitch=-15,headPitch=-60,tailTurn=90}={}){
 const {root,bones}=worker,n=Object.fromEntries(bones.map(b=>[b.name,b]));
 worker.pose('neutral');root.position.set(0,0,0);root.quaternion.identity();root.updateMatrixWorld(true);
 const neutral=bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));
 const tail=worker.parts.find(m=>m.name==='pig curly tail'),tailPivot=V(-.237,.825,0),tailBind=tail?.bindMatrix.clone(),radians=Math.PI/180;
 const rest=new Map(bones.map(b=>[b,b.getWorldPosition(V())]));
 const markers=[-1,1].flatMap(side=>[
  {name:'hand'+side,bone:n['hand'+side],offset:V(.052,-.010,0)},
  {name:'foot'+side,bone:n['hoof'+side],offset:V(0,-.12,0),floor:V(-.0235041,0,side*.232)}
 ]);
 function rotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));root.updateMatrixWorld(true);}
 function aim(b,child,direction){const from=child.getWorldPosition(V()).sub(b.getWorldPosition(V())).normalize();rotate(b,Q().setFromUnitVectors(from,direction.clone().normalize()).multiply(b.getWorldQuaternion(Q())));}
 function solve(m,target,q,pole){
  const side=m.name.endsWith('-1')?-1:1,hand=m.name.startsWith('hand'),a=n[(hand?'upperArm':'thigh')+side],b=n[(hand?'forearm':'shin')+side],c=m.bone;
  const start=a.getWorldPosition(V()),endTarget=target.clone().sub(m.offset.clone().applyQuaternion(q)),delta=endTarget.clone().sub(start),raw=delta.length();
  const l1=rest.get(a).distanceTo(rest.get(b)),l2=rest.get(b).distanceTo(rest.get(c)),d=T.MathUtils.clamp(raw,Math.abs(l1-l2)+1e-6,l1+l2-1e-6),axis=raw>1e-8?delta.divideScalar(raw):V(0,-1,0);
  pole.addScaledVector(axis,-pole.dot(axis));if(pole.lengthSq()<1e-10)pole=V(0,0,1).addScaledVector(axis,-axis.z);pole.normalize();
  const along=(l1*l1-l2*l2+d*d)/(2*d),mid=start.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,l1*l1-along*along))),end=start.clone().addScaledVector(axis,d);
  aim(a,b,mid.sub(start));aim(b,c,end.sub(b.getWorldPosition(V())));rotate(c,q);
 }
 function keyed(t,keys){for(let i=1;i<keys.length;i++)if(t<=keys[i][0]){const a=keys[i-1],b=keys[i],u=smooth((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>T.MathUtils.lerp(v,b[j+1],u));}return keys.at(-1).slice(1);}
 function apply(time){
  if(!Number.isFinite(time))throw Error('Invalid pig fit time');
  const t=T.MathUtils.clamp(time,0,8);
  bones.forEach((b,i)=>{b.position.copy(neutral[i].p);b.quaternion.copy(neutral[i].q);});root.quaternion.identity();
  const [x,height,fold]=keyed(t,[[0,-.8,-.025,.5],[1,-.8,-.03,.6],[1.6,-.8,.35,.95],[2,-.45,.458,1],[3,-.1,.458,1],[3.5,.15,.458,1],[4,.45,.458,1],[4.5,.55,.132,1.7],[5,.62,.088,1.72],[6,.62,.088,1.6],[6.5,.6,-.04,1.25],[7,.5,-.265,.9],[8,.45,-.32,.2]]);
  root.position.set(x,height,0);n.hips.rotation.z=hipPitch*radians*fold;n.spine.rotation.z=keyed(t,[[0,-5],[2,-15],[4,-15],[4.5,0],[5,2],[6,-10],[7,0],[8,-5]])[0]*radians;root.updateMatrixWorld(true);
  for(const side of [-1,1]){
   const upper=n['upperArm'+side],fore=n['forearm'+side],hand=n['hand'+side];
   const a=fore.getWorldPosition(V()).sub(upper.getWorldPosition(V())),b=hand.getWorldPosition(V()).sub(fore.getWorldPosition(V()));
   aim(upper,fore,a.lerp(V(.24,0,-side*.07),fold));aim(fore,hand,b.lerp(V(.25,0,side*.03),fold));
   n['hoof'+side].rotation.z=20*radians*fold;
  }
  rotate(n.head,Q().setFromAxisAngle(V(0,0,1),keyed(t,[[0,-45],[1,-35],[2,headPitch],[4,headPitch],[4.5,-110],[6,-110],[7,-80],[8,0]])[0]*radians));
  if(tail){
   // The entire tail is weighted to the pelvis. A rigid bind-space rotation
   // turns it at its authored base before pelvis skinning, without moving or
   // rewriting vertices and without attached-bind cancellation/double motion.
   tail.bindMatrix.copy(new T.Matrix4().makeTranslation(...tailPivot.toArray()))
    .multiply(new T.Matrix4().makeRotationY(tailTurn*radians*Math.min(1,fold*2)))
    .multiply(new T.Matrix4().makeTranslation(...tailPivot.clone().negate().toArray()))
    .multiply(tailBind);
  }
  root.updateMatrixWorld(true);worker.skeleton.update();
  const errors=markers.map(m=>{
   const side=m.name.endsWith('-1')?-1:1,hand=m.name.startsWith('hand');
   let target,support=false;
   if(hand){
    const [tx,ty]=keyed(t,[[0,-.11,.8985041],[side<0?2:2.6,-.11,.8985041],[side<0?2.6:3.2,.11,.8985041],[side<0?3.3:3.8,.11,.8985041],[side<0?3.55:4,.5,1.05],[side<0?4.4:4.5,.8,.0235041],[7,.8,.0235041],[8,.72,.51]]);
    target=V(tx,ty,side*.27);support=(t<=(side<0?2:2.6)||t>=(side<0?2.6:3.2)&&t<=(side<0?3.3:3.8))||t>=(side<0?4.4:4.5)&&t<=7;
    solve(m,target,Q().setFromAxisAngle(V(0,0,1),keyed(t,[[0,0],[1,-90],[7,-90],[8,0]])[0]*radians),V(-1,0,side*.3));
   }else{
    const [tx,ty]=keyed(t,[[0,-.8,0],[1,-.8,0],[2,-.8,.95],[3.2,-.01,.875],[4.5,-.01,.875],[4.7,.25,.9],[6,.25,.48],[7,.25,0],[8,.25,0]]);
    target=V(tx,ty,side*.23);support=t<=1||t>=3.2&&t<=4.5||t>=7;
    // Trail both legs outside while the belly crosses the sill. The effort is
    // an alternating swimming kick, not feet searching for an invisible step.
    const trail=smooth((t-1.2)/.6)*(1-smooth((t-2.6)/.6));
    const flutter=smooth((t-1.7)/.35)*(1-smooth((t-2.5)/.4));
    const kick=side*Math.sin((t-1.7)*Math.PI*2*2.2)*flutter;
    const hip=n['thigh'+side].getWorldPosition(V());
    target.lerp(V(hip.x-.74,hip.y-.10,side*.23),trail);
    target.y+=.065*kick;
    solve(m,target,Q().setFromAxisAngle(V(0,0,1),(-65*trail+18*kick)*radians),V(T.MathUtils.lerp(-1,1,smooth((t-4.7)/.3)),0,side*.3));
   }
   const actual=m.bone.localToWorld(m.offset.clone());target??=actual.clone();
   return {name:m.name,error:actual.distanceTo(target),target:target.toArray(),actual:actual.toArray(),support,constraint:support?'authored support':'free'};
  });
  root.updateMatrixWorld(true);worker.skeleton.update();
  return {errors,phase:t<2?phases[0].label:t<6?phases[1].label:phases[2].label,supported:false};
 }
 const restore=()=>{if(tail)tail.bindMatrix.copy(tailBind);};
 return {apply,phases,restore,dispose:restore};
}
