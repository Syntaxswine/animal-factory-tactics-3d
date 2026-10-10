import * as T from './vendor/three.module.js';
import {CHAIR_CONTACT} from './painted-chairs.js';
import {createMammalMotion} from './animal-motion.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
const clamp=x=>T.MathUtils.clamp(x,0,1),ease=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
export const HORSE_CHAIR_DURATION=9.2;
export const HORSE_CHAIR_KEYS=[{time:0,label:'Stand'},{time:.7,label:'Prepare'},{time:1.6,label:'Lower'},{time:3.8,label:'Sit'},{time:6.2,label:'Weight forward'},{time:6.7,label:'Rise'},{time:8.5,label:'Stand again'}];
export const HORSE_CHAIR_FIT={pelvis:[.18,CHAIR_CONTACT.seatHeight+.17],footForward:.43};
// Monotone Hermite tracks keep velocity continuous without overshooting contact poses.
function track(rows,t){
 let i=1;while(i<rows.length-1&&t>rows[i][0])i++;const a=rows[i-1],b=rows[i],dt=b[0]-a[0],u=clamp((t-a[0])/dt);
 const slope=(k,j)=>{if(!k||k===rows.length-1)return 0;const l=(rows[k][j]-rows[k-1][j])/(rows[k][0]-rows[k-1][0]),r=(rows[k+1][j]-rows[k][j])/(rows[k+1][0]-rows[k][0]);return l*r<=0?0:2*l*r/(l+r);};
 return a.slice(1).map((x,j)=>(2*u**3-3*u*u+1)*x+(u**3-2*u*u+u)*dt*slope(i-1,j+1)+(-2*u**3+3*u*u)*b[j+1]+(u**3-u*u)*dt*slope(i,j+1));
}

export function createHorseChairMotion(worker,{contact=CHAIR_CONTACT,fit=HORSE_CHAIR_FIT}={}){
 const root=worker.root;root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');
 // Reuse the existing clothing and rigid-sole weighting, with exact restoration.
 const repair=createMammalMotion(worker,{id:'horse'}),skeleton=repair.skeleton;
 const bones=Object.fromEntries(worker.bones.map(b=>[b.name,b])),rest=new Map(worker.bones.map(b=>[b,b.getWorldPosition(V())]));
 const trousers=worker.parts.find(p=>p.name.includes('overalls')),feet={},patches={},state={};
 const cloth=trousers.geometry,clothPosition=cloth.attributes.position.array.slice(),clothNormal=cloth.attributes.normal.array.slice();
 let clothReport={points:[],maxCorrection:0,maxCompression:0};
 const at=name=>bones[name].getWorldPosition(V());
 function surface(mesh,i){return mesh.applyBoneTransform(i,V().fromBufferAttribute(mesh.geometry.attributes.position,i)).applyMatrix4(mesh.matrixWorld);}
 for(const side of [-1,1]){
  const foot=worker.parts.find(p=>p.name==='exposed hoof '+side),a=foot.geometry.attributes.position,ids=[];for(let i=0;i<a.count;i++)if(a.getY(i)<.005)ids.push(i);
  const box=new T.Box3();for(const i of ids)box.expandByPoint(V().fromBufferAttribute(a,i));const center=box.getCenter(V()),ankle=rest.get(bones['hoof'+side]);
  feet[side]={mesh:foot,ids,target:V(fit.footForward-center.x+ankle.x,-box.min.y+ankle.y,side*.23-center.z+ankle.z)};
  const p=trousers.geometry.attributes.position,index=trousers.geometry.index,goal=V(.12,.64,side*.21);let best=Infinity;
  for(let k=0;k<index.count;k+=3){const ids=[index.getX(k),index.getX(k+1),index.getX(k+2)],points=ids.map(i=>V().fromBufferAttribute(p,i)),c=points[0].clone().add(points[1]).add(points[2]).divideScalar(3),n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
   if(n.x<.35||side*c.z<.07)continue;const d=c.distanceToSquared(goal);if(d<best){best=d;patches[side]=ids;}
  }
 }
 // The standing overalls have loose fabric below the pelvis. Compress that
 // fabric against the shared cushion and fold it around the front edge. This
 // is a reversible cloth corrective; neither the anatomy nor chair is scaled.
 function resetCloth(){cloth.attributes.position.array.set(clothPosition);cloth.attributes.normal.array.set(clothNormal);cloth.attributes.position.needsUpdate=cloth.attributes.normal.needsUpdate=true;}
 function fitCloth(){
  const p=cloth.attributes.position,si=cloth.attributes.skinIndex,sw=cloth.attributes.skinWeight,m=new T.Matrix4(),bone=new T.Matrix4(),invWorld=trousers.matrixWorld.clone().invert(),points=[],posed=[],base=[];let maxCorrection=0,maxCompression=0;
  const front=contact.seatCenter[2]+contact.seatDepth/2,back=contact.seatCenter[2]-contact.seatDepth/2,top=contact.seatHeight+.003;
  for(let i=0;i<p.count;i++){
   const q=surface(trousers,i),next=q.clone();base.push(q);posed.push(next);
   if(p.getY(i)>.90||p.getY(i)<.39)continue;
   if(Math.abs(q.z)>contact.seatWidth/2+.01||q.x<back-.01||q.x>front+.12||q.y>top+.04)continue;
   if(p.getY(i)>.53){
    // Full support inside the seat, a rounded fold just beyond its nose.
    const w=1-ease((q.x-front-.035)/.075);next.y+=Math.max(0,top-q.y)*w;
   }else{
    // Start folding before the calf reaches the rim; switching the full
    // offset on at seat height creates a visible pop while settling.
    const w=ease((top+.04-q.y)/.04)*ease((q.y-top+.18)/.03);
    next.x+=Math.max(0,front+.045-next.x)*w;
   }
  }
  // Preserve a fold at the seat's nose. A triangle connecting a point on the
  // cushion to a calf point below it otherwise cuts diagonally through the rim.
  const index=cloth.index,boundary=new Map();
  for(let k=0;k<index.count;k+=3){const ids=[index.getX(k),index.getX(k+1),index.getX(k+2)];for(const i of ids){const a=posed[i],support=ease((a.y-top+.002)/.002)*ease((a.x-front+.14)/.04);if(!support||a.x>=front+.008)continue;
   // Blend a connected fold as its calf neighbor approaches the rim. A
   // binary front-edge membership test snaps on shallower chair seats.
   for(const j of ids){const b=posed[j],w=support*ease((b.x-front+.04)/.04)*(1-ease((b.x-front-.15)/.03))*ease((top+.008-b.y)/.035)*ease((b.y-top+.18)/.03);boundary.set(i,Math.max(boundary.get(i)||0,w));}
  }}
  for(const [i,w]of boundary)posed[i].x+=(front+.008-posed[i].x)*w;
  for(let i=0;i<p.count;i++){
   const q=base[i],next=posed[i],distance=next.distanceTo(q);if(distance<1e-8)continue;maxCorrection=Math.max(maxCorrection,distance);maxCompression=Math.max(maxCompression,Math.abs(next.y-q.y));
   m.elements.fill(0);for(let k=0;k<4;k++){const w=sw.getComponent(i,k);if(!w)continue;bone.fromArray(skeleton.boneMatrices,si.getComponent(i,k)*16);for(let j=0;j<16;j++)m.elements[j]+=bone.elements[j]*w;}
   m.premultiply(trousers.bindMatrixInverse).multiply(trousers.bindMatrix).invert();next.applyMatrix4(invWorld).applyMatrix4(m);p.setXYZ(i,next.x,next.y,next.z);points.push(i);
  }
  if(points.length)cloth.computeVertexNormals();p.needsUpdate=true;clothReport={points,maxCorrection,maxCompression};
 }
 function rotate(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));root.updateMatrixWorld(true);}
 function limb(a,b,c,target,pole){
  const start=a.getWorldPosition(V()),ra=rest.get(a),rb=rest.get(b),rc=rest.get(c),l1=ra.distanceTo(rb),l2=rb.distanceTo(rc),axis=target.clone().sub(start),d=axis.length();
  if(d>l1+l2+1e-6||d<Math.abs(l1-l2)-1e-6)throw Error('Chair pose cannot reach '+a.name+': '+d);
  axis.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize(),mid=start.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
  rotate(a,Q().setFromUnitVectors(rb.clone().sub(ra).normalize(),mid.clone().sub(start).normalize()));rotate(b,Q().setFromUnitVectors(rc.clone().sub(rb).normalize(),target.clone().sub(mid).normalize()));
 }
 const rz=a=>Q().setFromAxisAngle(V(0,0,1),-a),rows=[
  [0,.424,.795,0,0,0],[.7,.40,.775,.05,.30,.65],[1.6,.29,fit.pelvis[1]+.05,.12,.72,1],
  [1.95,.27,fit.pelvis[1]+.018,.12,.70,1],[2.7,...fit.pelvis,.07,.42,1],
  [3.4,...fit.pelvis,0,.06,1],[5.4,...fit.pelvis,0,.06,1],[6.2,.26,fit.pelvis[1],.13,.66,1],
  [6.5,.31,fit.pelvis[1]+.015,.12,.60,1],[7.6,.424,.795,0,.02,.10],[8.5,.424,.795,0,0,0],[9.2,.424,.795,0,0,0]
 ];
 function apply(time,{heading=0,position=[0,0,0]}={}){
  if(disposed)throw Error('Horse chair motion is disposed');
  if(!Number.isFinite(time)||!Number.isFinite(heading)||position.length!==3||!position.every(Number.isFinite))throw Error('Horse chair pose needs finite time and placement');
  const t=T.MathUtils.clamp(time,0,HORSE_CHAIR_DURATION),[x,y,hipLean,lean,hands]=track(rows,t);
  resetCloth();root.position.set(0,0,0);root.quaternion.identity();worker.pose('neutral');bones.hips.position.set(x,y,0);rotate(bones.hips,rz(hipLean));rotate(bones.spine,rz(lean));
  const look=ease((t-3.5)/.5)*(1-ease((t-4.8)/.5));rotate(bones.head,rz(lean*.36).multiply(Q().setFromAxisAngle(V(0,1,0),.13*Math.sin((t-3.5)*2)*look)));
  for(const s of [-1,1]){limb(bones['thigh'+s],bones['shin'+s],bones['hoof'+s],feet[s].target,V(1,0,0));rotate(bones['hoof'+s],Q());}
  skeleton.update();fitCloth();const handsReport=[];
  for(const s of [-1,1]){
   const p=patches[s].map(i=>surface(trousers,i)),normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize(),target=p[0].clone().add(p[1]).add(p[2]).divideScalar(3).addScaledVector(normal,.006);
   const finger=at('shin'+s).sub(at('thigh'+s)).normalize(),Y=finger.negate(),Z=normal.clone().multiplyScalar(s).addScaledVector(Y,-s*normal.dot(Y)).normalize(),X=Y.clone().cross(Z).normalize();
   const handQ=Q().setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,Z)),palm=V(.035,-.025,-s*.05),wrist=target.clone().sub(palm.clone().applyQuaternion(handQ));
   const idle=rest.get(bones['hand'+s]).clone().sub(rest.get(bones.spine)).applyQuaternion(bones.spine.getWorldQuaternion(Q())).add(at('spine'));
   // Lift clear of the thigh on approach/release instead of cutting through it
   // along a straight blend from a resting palm to the hanging arm.
   const handPath=idle.lerp(wrist,hands).addScaledVector(normal,.04*Math.sin(Math.PI*hands));
   // Fold back with enough outward clearance for the forearms to pass the
   // waist. The forward knee pole is not an arm pole.
   const elbowPole=V(-1,-.15,s*1.2).applyQuaternion(bones.spine.getWorldQuaternion(Q()));
   const q=Q().slerp(handQ,hands);limb(bones['upperArm'+s],bones['forearm'+s],bones['hand'+s],handPath,elbowPole);rotate(bones['hand'+s],q);bones['fingers'+s].rotation.z=-.10*hands;
   handsReport.push({side:s,target:target.toArray(),palm:bones['hand'+s].localToWorld(palm.clone()).toArray(),contact:hands>1-1e-9});
  }
  root.rotation.y=-Math.PI/2+heading;root.position.fromArray(position);root.updateMatrixWorld(true);skeleton.update();
  const phase=t<.7?'Prepare':t<2.7?'Lower onto seat':t<5.4?'Seated':t<6.3?'Weight forward':t<7.6?'Stand up':'Standing';
  for(const h of handsReport){h.target=root.localToWorld(V(...h.target)).toArray();h.palm=root.localToWorld(V(...h.palm)).toArray();}
  const front=contact.seatCenter[2]+contact.seatDepth/2,back=contact.seatCenter[2]-contact.seatDepth/2;
  const contacts=clothReport.points.map(i=>surface(trousers,i)).filter(p=>{const q=root.worldToLocal(p.clone());return q.x>=back&&q.x<front-.002&&Math.abs(q.z)<contact.seatWidth/2&&Math.abs(q.y-contact.seatHeight-.003)<.0001;}).map(p=>p.toArray());
  Object.assign(state,{time:t,phase,pelvis:[x,y,0],lean,hands:handsReport,cloth:{maxCorrection:clothReport.maxCorrection,maxCompression:clothReport.maxCompression,contacts},seatSupport:contacts.length>0});return state;
 }
 function diagnostics(){
  const footReport=[-1,1].map(s=>{const f=feet[s],points=f.ids.map(i=>surface(f.mesh,i));return {side:s,minY:Math.min(...points.map(v=>v.y)),points:points.map(v=>v.toArray())};});
  const joints=Object.fromEntries(Object.entries(bones).map(([name,b])=>[name,b.getWorldPosition(V()).toArray()]));
  return {...state,feet:footReport,joints,scale:root.scale.toArray(),unarmed:true};
 }
 let disposed=false;
 return {apply,diagnostics,skeleton,restore(){resetCloth();repair.restore();},dispose(){if(disposed)return;disposed=true;resetCloth();repair.restore();repair.dispose();}};
}
