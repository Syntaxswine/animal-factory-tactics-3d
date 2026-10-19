import * as T from './vendor/three.module.js';
// Shared posing for tile-to-tile traversals (window, waist-high wall, 2 m wall): trunk placement, two-bone
// limbs that keep their bend-plane twist, the segment mass model the physics audit uses, and an exact skinned
// probe of the visible surface so contacts are placed where the clothes actually touch.
export const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion(),DEG=Math.PI/180;
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const AX={x:V(1,0,0),y:V(0,1,0),z:V(0,0,1)},turn=(axis,a)=>Q().setFromAxisAngle(AX[axis],a);
// Orientation from yaw (about up), roll (about forward, +X) and a forward pitch (the top tips toward +X).
export const bodyQ=(pitch=0,roll=0,yaw=0)=>turn('y',yaw).multiply(turn('x',roll)).multiply(turn('z',-pitch));
// Quintic Hermite through [t,...values] rows (C2: a cubic's acceleration steps at every key, which reads as a
// jolt of force). Slopes are Catmull-Rom, limited so a channel never overshoots its keys; key accelerations come
// from the neighbouring slopes. pins fixes a key's slope ({index: [slopes]}).
export function track(rows,pins={}){
 const keys=rows.map(([t,...p])=>({t,p})),n=keys.length;if(n<2)throw Error('A track needs two keys');
 keys.forEach((k,i)=>{const a=keys[i-1],b=keys[i+1];k.v=pins[i]||k.p.map((x,j)=>{if(!a||!b)return 0;const l=(x-a.p[j])/(k.t-a.t),r=(b.p[j]-x)/(b.t-k.t);if(l*r<=0)return 0;const m=(b.p[j]-a.p[j])/(b.t-a.t);return Math.sign(m)*Math.min(Math.abs(m),3*Math.abs(l),3*Math.abs(r));});});
 keys.forEach((k,i)=>{k.a=k.p.map((x,j)=>i&&i<n-1?(keys[i+1].v[j]-keys[i-1].v[j])/(keys[i+1].t-keys[i-1].t):0);});
 return t=>{let i=1;while(i<n-1&&t>keys[i].t)i++;const a=keys[i-1],b=keys[i],dt=b.t-a.t,u=clamp((t-a.t)/dt),u2=u*u,u3=u2*u,u4=u3*u,u5=u4*u;
  const h0=1-10*u3+15*u4-6*u5,h1=u-6*u3+8*u4-3*u5,h2=.5*u2-1.5*u3+1.5*u4-.5*u5,h3=.5*u3-u4+.5*u5,h4=-4*u3+7*u4-3*u5,h5=10*u3-15*u4+6*u5;
  return a.p.map((x,j)=>h0*x+h5*b.p[j]+dt*(h1*a.v[j]+h4*b.v[j])+dt*dt*(h2*a.a[j]+h3*b.a[j]));};
}
export const smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const logq=q=>{const w=clamp(q.w,-1,1),s=Math.sqrt(1-w*w);return s<1e-9?V():V(q.x,q.y,q.z).multiplyScalar(2*Math.acos(w)/s);};
const expq=r=>{const a=r.length();return a<1e-12?Q():Q().setFromAxisAngle(r.clone().divideScalar(a),a);};
// Orientation keys [t, quaternion] joined by cubic rotation-vector segments (C1): angular velocity flows through
// a key unless the rotation reverses there; the ends start and stop at rest. Pass w:[...] per key to pin a rate
// (world angular velocity, rad/s) where a keyed stretch meets a computed one.
export function spinTrack(rows){
 const keys=rows.map(([t,q,w])=>({t,q:q.clone().normalize(),pin:w}));for(let i=1;i<keys.length;i++)if(keys[i].q.dot(keys[i-1].q)<0)keys[i].q.set(-keys[i].q.x,-keys[i].q.y,-keys[i].q.z,-keys[i].q.w);
 const d=keys.slice(1).map((k,i)=>logq(k.q.clone().multiply(keys[i].q.clone().invert())));
 keys.forEach((k,i)=>{if(k.pin){k.w=k.pin.clone();return;}if(!i||i===keys.length-1){k.w=V();return;}const a=d[i-1].clone().divideScalar(k.t-keys[i-1].t),b=d[i].clone().divideScalar(keys[i+1].t-k.t);k.w=a.dot(b)<=0?V():a.add(b).multiplyScalar(.5);});
 return t=>{let i=1;while(i<keys.length-1&&t>keys[i].t)i++;const a=keys[i-1],b=keys[i],dt=b.t-a.t,u=clamp((t-a.t)/dt),u2=u*u,u3=u2*u;
  return expq(d[i-1].clone().multiplyScalar(3*u2-2*u3).addScaledVector(a.w,dt*(u3-2*u2+u)).addScaledVector(b.w,dt*(u3-u2))).multiply(a.q);};
}
// The 74.9 kg segment model of the phantom-wrench traversal rig (de Leva-like fractions), so the plan and the
// audit agree on where the centre of mass is. Points are named as the rig names them.
export const MASS_SEGMENTS=Object.freeze([['pelvis','chest',16],['chest','neck',6],['neck','headTip',6],...[-1,1].flatMap(s=>[['pelvis','hip'+s,3],['chest','shoulder'+s,3.5],
 ['shoulder'+s,'elbow'+s,1.9],['elbow'+s,'wrist'+s,1.1],['wrist'+s,'palm'+s,.45],['hip'+s,'knee'+s,9.5],['knee'+s,'ankle'+s,3],['ankle'+s,'toe'+s,1]])]);
export const BODY_MASS=MASS_SEGMENTS.reduce((m,s)=>m+s[2],0);
// Point masses for inertia: each uniform rod as Simpson's three points (m/6, 2m/3, m/6), which is exact for its
// moment of inertia about any axis.
export function massPoints(P){const out=[];for(const [a,b,m]of MASS_SEGMENTS)out.push([P[a],m/6],[P[b],m/6],[P[a].clone().add(P[b]).multiplyScalar(.5),2*m/3]);return out;}
export function inertiaAbout(points,origin,axis){let I=0;for(const [x,m]of points)I+=m*axis.clone().cross(x.clone().sub(origin)).lengthSq();return I;}
const HEAD_TIP=[.14,.32,0],PALM=[.052,-.010,0],TOE=[.13,-.10,0];
export function createTraversalBody(worker){
 // A limb asked past its reach is stretched straight toward the target, never thrown on mid-battle, and the
 // shortfall is recorded in warnings: the motions' tests require it to stay empty.
 const warnings=[];
 const root=worker.root,bones=Object.fromEntries(worker.bones.map(b=>[b.name,b]));
 for(const n of ['hips','spine','head',...[-1,1].flatMap(s=>['upperArm','forearm','hand','thigh','shin','hoof'].map(b=>b+s))])if(!bones[n])throw Error('Traversal rig is missing bone '+n);
 root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');root.updateMatrixWorld(true);
 const rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())])),at0=n=>rest.get(bones[n]).clone(),len=(a,b)=>at0(a).distanceTo(at0(b));
 const restQ=new Map(worker.bones.map(b=>[b,b.quaternion.clone()])),restP=new Map(worker.bones.map(b=>[b,b.position.clone()]));
 const L={},BEND={};for(const s of [-1,1]){L[s]={thigh:len('thigh'+s,'shin'+s),shin:len('shin'+s,'hoof'+s),upper:len('upperArm'+s,'forearm'+s),fore:len('forearm'+s,'hand'+s)};
  const bent=(a,b,c)=>{const o=at0(a+s),axis=at0(c+s).sub(o).normalize(),e=at0(b+s).sub(o);return e.addScaledVector(axis,-e.dot(axis)).normalize();};BEND[s]={leg:bent('thigh','shin','hoof'),arm:bent('upperArm','forearm','hand')};}
 const offsets={spine:at0('spine').sub(at0('hips')),head:at0('head').sub(at0('spine')),thigh:{},shoulder:{}};for(const s of [-1,1]){offsets.thigh[s]=at0('thigh'+s).sub(at0('hips'));offsets.shoulder[s]=at0('upperArm'+s).sub(at0('spine'));}
 function rotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));b.updateMatrixWorld(true);}
 const basis=(d,n)=>{const x=d.clone().normalize(),z=n.clone().addScaledVector(x,-n.dot(x)).normalize();return new T.Matrix4().makeBasis(x,z.clone().cross(x),z);};
 const align=(d0,n0,d1,n1)=>Q().setFromRotationMatrix(basis(d1,n1).multiply(basis(d0,n0).transpose()));
 // Two-bone limb: the elbow or knee bends toward pole, and the rest bend plane maps onto the posed one, so the
 // thigh and forearm turn with the pelvis and shoulder (no candy-wrapper twist). Throws outside native reach.
 let label='';
 function limb(a,b,c,target,pole,slack=0){const ra=rest.get(a),rb=rest.get(b),rc=rest.get(c),start=a.getWorldPosition(V()),l1=ra.distanceTo(rb),l2=rb.distanceTo(rc);let d=target.distanceTo(start);
  if(d>l1+l2+slack+1e-6||d<Math.abs(l1-l2)-1e-6)warnings.push({bone:a.name,label,over:d-(l1+l2)});
  const tgt=d>l1+l2-1e-7?start.clone().addScaledVector(target.clone().sub(start).normalize(),(d=l1+l2-1e-7)):target;
  const axis=tgt.clone().sub(start).normalize(),along=(l1*l1-l2*l2+d*d)/(2*d),side=pole.clone().addScaledVector(axis,-pole.dot(axis));if(side.lengthSq()<1e-12)side.copy(V(1,0,0).addScaledVector(axis,-axis.x));side.normalize();
  const mid=start.clone().addScaledVector(axis,along).addScaledVector(side,Math.sqrt(Math.max(0,l1*l1-along*along)));
  const d0a=rb.clone().sub(ra),d0b=rc.clone().sub(rb),n0=d0a.clone().cross(d0b).normalize(),d1a=mid.clone().sub(start),d1b=tgt.clone().sub(mid);let n1=d1a.clone().cross(d1b);if(n1.lengthSq()<1e-12)n1=axis.clone().cross(side);n1.normalize();
  rotate(a,align(d0a,n0,d1a,n1));rotate(b,align(d0b,n0,d1b,n1));return mid;}
 // A pose: hips (world position + bodyQ), chest and head relative to their parents, then each limb's end point
 // (world wrist or ankle), its bend direction (world) and the hand or hoof orientation (world). Without one the
 // hand or hoof keeps its rest turn on the forearm or shin; w (0..1) blends from that toward q, so a hoof can
 // lift off a planted orientation without popping.
 const endTurn=(b,q,w=1)=>{if(!q||w<=0)return;rotate(b,w>=1?q:b.getWorldQuaternion(Q()).slerp(q,w));};
 function pose(p,tag=''){label=tag;root.position.set(0,0,0);root.quaternion.identity();for(const b of worker.bones){b.position.copy(restP.get(b));b.quaternion.copy(restQ.get(b));}
  bones.hips.position.copy(V(...p.hips));bones.hips.quaternion.copy(p.hipsQ);bones.spine.quaternion.copy(p.spineQ||Q());bones.head.quaternion.copy(p.headQ||Q());root.updateMatrixWorld(true);
  for(const s of [-1,1]){const leg=p.legs?.[s];if(leg){limb(bones['thigh'+s],bones['shin'+s],bones['hoof'+s],V(...leg.ankle),V(...leg.pole),leg.slack||0);endTurn(bones['hoof'+s],leg.q,leg.w);}
   const arm=p.arms?.[s];if(arm){limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],V(...arm.wrist),V(...arm.pole),arm.slack||0);endTurn(bones['hand'+s],arm.q,arm.w);}}
  root.updateMatrixWorld(true);return points();}
 const world=(b,local)=>V(...local).applyQuaternion(b.getWorldQuaternion(Q())).add(b.getWorldPosition(V()));
 // The rig's named points, read from the posed bones.
 function points(){const P={pelvis:bones.hips.getWorldPosition(V()),chest:bones.spine.getWorldPosition(V()),neck:bones.head.getWorldPosition(V()),headTip:world(bones.head,HEAD_TIP)};
  for(const s of [-1,1])Object.assign(P,{['hip'+s]:bones['thigh'+s].getWorldPosition(V()),['knee'+s]:bones['shin'+s].getWorldPosition(V()),['ankle'+s]:bones['hoof'+s].getWorldPosition(V()),['toe'+s]:world(bones['hoof'+s],TOE),
   ['shoulder'+s]:bones['upperArm'+s].getWorldPosition(V()),['elbow'+s]:bones['forearm'+s].getWorldPosition(V()),['wrist'+s]:bones['hand'+s].getWorldPosition(V()),['palm'+s]:world(bones['hand'+s],PALM)});return P;}
 const com=(P=points())=>{const c=V();for(const [a,b,m]of MASS_SEGMENTS)c.addScaledVector(P[a],m/2).addScaledVector(P[b],m/2);return c.divideScalar(BODY_MASS);};
 return {worker,root,bones,rest,at0,L,BEND,offsets,pose,points,com,rotate,world,warnings};
}
// The visible surface, skinned exactly (four weights, as three.js does) for a subset of every body mesh's
// vertices: where the clothes, hooves and hands really are, for placing contacts.
export function createSurfaceProbe(worker,{stride=2,include=()=>true}={}){
 const sets=worker.parts.filter(include).map(mesh=>{const g=mesh.geometry,pos=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,n=Math.ceil(pos.count/stride),base=new Float32Array(n*3),bi=new Uint16Array(n*4),bw=new Float32Array(n*4),v=V();
  for(let k=0,i=0;i<pos.count;i+=stride,k++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.bindMatrix);base[k*3]=v.x;base[k*3+1]=v.y;base[k*3+2]=v.z;for(let j=0;j<4;j++){bi[k*4+j]=si.getComponent(i,j);bw[k*4+j]=sw.getComponent(i,j);}}
  return {mesh,n,base,bi,bw};});
 const count=sets.reduce((s,x)=>s+x.n,0),x=new Float32Array(count),y=new Float32Array(count),z=new Float32Array(count),part=new Uint8Array(count),m=new T.Matrix4(),post=new T.Matrix4();
 const names=sets.map(s=>s.mesh.name);
 function update(){let k0=0;sets.forEach((s,pi)=>{const sk=s.mesh.skeleton,mats=sk.bones.map((b,i)=>new T.Matrix4().multiplyMatrices(b.matrixWorld,sk.boneInverses[i]).elements);post.multiplyMatrices(s.mesh.matrixWorld,s.mesh.bindMatrixInverse);const P=post.elements;
  for(let k=0;k<s.n;k++){const bx=s.base[k*3],by=s.base[k*3+1],bz=s.base[k*3+2];let vx=0,vy=0,vz=0;for(let j=0;j<4;j++){const w=s.bw[k*4+j];if(!w)continue;const e=mats[s.bi[k*4+j]];vx+=w*(e[0]*bx+e[4]*by+e[8]*bz+e[12]);vy+=w*(e[1]*bx+e[5]*by+e[9]*bz+e[13]);vz+=w*(e[2]*bx+e[6]*by+e[10]*bz+e[14]);}
   const i=k0+k;x[i]=P[0]*vx+P[4]*vy+P[8]*vz+P[12];y[i]=P[1]*vx+P[5]*vy+P[9]*vz+P[13];z[i]=P[2]*vx+P[6]*vy+P[10]*vz+P[14];part[i]=pi;}k0+=s.n;});return api;}
 // The lowest surface point among those accepted by keep(x,y,z,partName).
 function lowest(keep=()=>true){let best=null;for(let i=0;i<count;i++)if((!best||y[i]<best.y)&&keep(x[i],y[i],z[i],names[part[i]]))best={x:x[i],y:y[i],z:z[i],part:names[part[i]]};return best;}
 const api={count,x,y,z,part,names,update,lowest};return api;
}
