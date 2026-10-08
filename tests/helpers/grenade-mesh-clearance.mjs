import * as T from '../../dist/tactics/vendor/three.module.js';
const V=()=>new T.Vector3(),direction=new T.Vector3(.71,.29,.643).normalize();
function surface(mesh){const a=mesh.geometry.attributes.position,points=Array.from({length:a.count},(_,i)=>mesh.applyBoneTransform(i,V().fromBufferAttribute(a,i)).applyMatrix4(mesh.matrixWorld));return {points,index:mesh.geometry.index,box:new T.Box3().setFromPoints(points)};}
function inside(point,{points,index,box}){
 if(!box.containsPoint(point))return false;const ray=new T.Ray(point,direction),hit=V(),hits=[];
 for(let i=0;i<index.count;i+=3)if(ray.intersectTriangle(points[index.getX(i)],points[index.getX(i+1)],points[index.getX(i+2)],false,hit))hits.push(point.distanceTo(hit));
 hits.sort((a,b)=>a-b);return hits.filter((v,i)=>!i||v-hits[i-1]>1e-6).length%2===1;
}
export function meshVerticesInside(mesh,obstacle){const shape=surface(obstacle);return surface(mesh).points.filter(p=>inside(p,shape)).length;}
// Seven samples on the actual casing against posed body triangles. This catches
// the observed belly/tail penetrations; renders still judge the complete grip.
export function grenadeMeshClearance(worker,grenade,motion){
 const casing=[];for(const mesh of grenade.parts.filter(p=>!['pull ring','curved safety lever'].includes(p.name))){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)casing.push(V().fromBufferAttribute(a,i));}
 const sample=[V()];for(let axis=0;axis<3;axis++)for(const sign of [-1,1])sample.push(casing.reduce((best,p)=>sign*p.getComponent(axis)>sign*best.getComponent(axis)?p:best).clone());
 const findings=[];
 for(let t=0;t<1.92;t+=.02){motion.at(t);const points=sample.map(p=>p.clone().applyMatrix4(grenade.root.matrixWorld));
  for(const mesh of worker.parts.filter(p=>/skull|shirt|overalls|trousers|tail|waistcoat|cap|feathered body|head and/.test(p.name))){const shape=surface(mesh);if(points.some(p=>inside(p,shape)))findings.push({time:+t.toFixed(3),part:mesh.name});}
 }
 return findings;
}
