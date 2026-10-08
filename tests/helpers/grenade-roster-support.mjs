import * as T from '../../dist/tactics/vendor/three.module.js';
const V=a=>new T.Vector3(...(a||[0,0,0]));
export function solePoints(motion,side,all=false){
 const mesh=motion.footMesh(side),a=mesh.geometry.attributes.position,out=[];
 for(let i=0;i<a.count;i++){const p=V().fromBufferAttribute(a,i);mesh.applyBoneTransform(i,p);p.applyMatrix4(mesh.matrixWorld);if(all||p.y<.001)out.push(p);}
 return out;
}
export function hull(points){
 const p=points.map(p=>[p.x,p.z]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],hi=[];
 for(const q of p){while(lo.length>=2&&cross(lo.at(-2),lo.at(-1),q)<=0)lo.pop();lo.push(q);}for(const q of p.slice().reverse()){while(hi.length>=2&&cross(hi.at(-2),hi.at(-1),q)<=0)hi.pop();hi.push(q);}return lo.slice(0,-1).concat(hi.slice(0,-1));
}
export function outside(h,q){let inside=h.length>2,best=Infinity;for(let i=0;i<h.length;i++){
 const a=h[i],b=h[(i+1)%h.length],x=b[0]-a[0],z=b[1]-a[1],L=Math.hypot(x,z)||1e-12;if((x*(q[1]-a[1])-z*(q[0]-a[0]))/L<0)inside=false;
 const u=Math.max(0,Math.min(1,((q[0]-a[0])*x+(q[1]-a[1])*z)/(L*L)));best=Math.min(best,Math.hypot(q[0]-a[0]-u*x,q[1]-a[1]-u*z));}return inside?-best:best;
}
// Independent segment-fraction model sampled from the actual posed bones.
// This estimates ground reaction, including angular momentum, rather than
// trusting the animation's intended pressure point or a static COM projection.
export function supportAudit(motion,animal){
 const pig=animal.startsWith('pig-'),bird=animal==='hen';
 const segments=[['hips','spine',.281*(pig?1.6:bird?1.3:1)],['spine','head',.216*(pig?1.3:1)],['head','headTip',.081],
 ...[-1,1].flatMap(s=>[['upperArm'+s,'forearm'+s,.028],['forearm'+s,'hand'+s,.016],['hand'+s,'palm'+s,.006],['thigh'+s,'shin'+s,.10],['shin'+s,'hoof'+s,.0465],['hoof'+s,'toe'+s,.00725],['hoof'+s,'heel'+s,.00725]])];
 const fraction=segments.reduce((s,x)=>s+x[2],0),b=motion.bones,h=.002;
 const points=t=>{motion.at(t);const P={};for(const [name,bone]of Object.entries(b))P[name]=bone.getWorldPosition(V());
  P.headTip=V([.14,.32,0]).applyQuaternion(b.head.getWorldQuaternion(new T.Quaternion())).add(P.head);
  for(const s of [-1,1])for(const [name,offset]of [['palm',[.052,-.01,0]],['toe',[.145,-(bird?.06:.12),0]],['heel',[-.06,-(bird?.06:.12),0]]]){
   const bone=b[(name==='palm'?'hand':'hoof')+s];P[name+s]=V(offset).applyQuaternion(bone.getWorldQuaternion(new T.Quaternion())).add(bone.getWorldPosition(V()));}
  return P;
 };
 const com=P=>{const c=V();for(const [a,b,m]of segments)c.addScaledVector(P[a].clone().add(P[b]),m/2);return c.divideScalar(fraction);};
 const momentum=t=>{const A=points(t-h),P=points(t),C=points(t+h),c=com(P),vc=com(C).sub(com(A)).divideScalar(2*h),L=V();
  for(const [a,b,m]of segments){const mid=P=>P[a].clone().add(P[b]).multiplyScalar(.5),dir=P=>P[b].clone().sub(P[a]).normalize();L.add(mid(P).sub(c).cross(mid(C).sub(mid(A)).divideScalar(2*h).sub(vc)).multiplyScalar(m)).add(dir(P).cross(dir(C).sub(dir(A)).divideScalar(2*h)).multiplyScalar(m*P[a].distanceToSquared(P[b])/12));}return L;
 };
 let worst=-Infinity,worstTime=0,worstCop,worstHull,minNormal=Infinity;
 for(let t=.03;t<=4.57;t+=.03){const c=com(points(t)),F=com(points(t-h)).add(com(points(t+h))).addScaledVector(c,-2).divideScalar(h*h).add(V([0,9.81,0])).multiplyScalar(fraction),dL=momentum(t+h).sub(momentum(t-h)).divideScalar(2*h);
  motion.at(t);const cop=[c.x-(c.y*F.x-dL.z)/F.y,c.z-(c.y*F.z+dL.x)/F.y],error=outside(hull([...solePoints(motion,1),...solePoints(motion,-1)]),cop);
  minNormal=Math.min(minNormal,F.y/fraction);if(error>worst){worst=error;worstTime=t;worstCop=cop;worstHull=hull([...solePoints(motion,1),...solePoints(motion,-1)]);}
 }
 return {worst,worstTime,minNormal,worstCop,worstHull};
}
