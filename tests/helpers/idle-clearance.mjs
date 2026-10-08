import * as T from '../../dist/tactics/vendor/three.module.js';
const v=()=>new T.Vector3(),direction=new T.Vector3(.71,.29,.643).normalize();
export function posedSurface(mesh){const a=mesh.geometry.attributes.position,points=Array.from({length:a.count},(_,i)=>{const p=v().fromBufferAttribute(a,i);if(mesh.isSkinnedMesh)mesh.applyBoneTransform(i,p);return p.applyMatrix4(mesh.matrixWorld);}),index=mesh.geometry.index;return {points,index,box:new T.Box3().setFromPoints(points)};}
export function inside(point,{points,index,box}){
 if(!box.containsPoint(point))return false;const ray=new T.Ray(point,direction),hit=v(),hits=[];
 for(let i=0;i<index.count;i+=3)if(ray.intersectTriangle(points[index.getX(i)],points[index.getX(i+1)],points[index.getX(i+2)],false,hit))hits.push(point.distanceTo(hit));
 hits.sort((a,b)=>a-b);return hits.filter((d,i)=>!i||d-hits[i-1]>1e-6).length%2===1;
}
export function weaponClearance(worker,weapon){
 const solids=worker.parts.filter(p=>/skull|shirt|overalls|trousers|tail|waistcoat|feathered body|head and/.test(p.name)).map(p=>({name:p.name,...posedSurface(p)})),findings=[];
 for(const part of weapon.parts.filter(p=>!/strap|hose/.test(p.name))){const {points}=posedSurface(part);for(const shape of solids){const hits=points.filter(p=>inside(p,shape));if(hits.length)findings.push({part:part.name,body:shape.name,count:hits.length,point:hits[0].toArray()});}}
 return findings;
}
