import * as T from '../../dist/tactics/vendor/three.module.js';
import {posedSurface} from './idle-clearance.mjs';

function triangles(mesh){
 const s=posedSurface(mesh),index=s.index,at=i=>index?index.getX(i):i,n=index?.count??s.points.length,out=[];
 for(let i=0;i<n;i+=3){const p=[s.points[at(i)],s.points[at(i+1)],s.points[at(i+2)]];out.push({p,box:new T.Box3().setFromPoints(p)});}
 return out;
}

// Both directions catch thin triangle intersections that have no contained
// mesh vertices. Coplanar contact and segment endpoints are not penalized.
function crossings(a,b,toGun){
 if(!a.box.intersectsBox(b.box))return [];
 const hit=new T.Vector3(),dir=new T.Vector3(),ray=new T.Ray(),out=[];
 for(const [e,t] of [[a,b],[b,a]])for(let i=0;i<3;i++){
  const p=e.p[i],z=e.p[(i+1)%3],len=p.distanceTo(z);if(len<1e-8)continue;
  ray.set(p,dir.subVectors(z,p).divideScalar(len));
  if(ray.intersectTriangle(...t.p,false,hit)&&p.distanceTo(hit)>1e-6&&p.distanceTo(hit)<len-1e-6){
   const local=hit.clone().applyMatrix4(toGun);
   // Stock neck/finger wrap at x >= -.10 is intentional grip contact.
   if(local.x<-.10001)out.push({point:hit.toArray(),local:local.toArray()});
  }
 }
 return out;
}

export function rifleArmCrossings(worker,weapon){
 const stock=weapon.parts.find(p=>p.name==='wooden shoulder stock');
 const a=triangles(stock),toGun=weapon.root.matrixWorld.clone().invert(),out=[];
 for(const arm of worker.parts.filter(p=>/forearm|shirt/.test(p.name))){
  const b=triangles(arm),hits=[];
  for(const x of a)for(const y of b)hits.push(...crossings(x,y,toGun));
  if(hits.length){hits.sort((p,z)=>p.local[0]-z.local[0]);out.push({arm:arm.name,count:hits.length,minLocalX:hits[0].local[0],maxLocalX:hits.at(-1).local[0],deepest:hits[0]});}
 }
 return out;
}
