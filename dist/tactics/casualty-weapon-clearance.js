import * as T from './vendor/three.module.js';
// A temporary actual-skinned head surface for the study's cached prone fitting.
// No combat collision rules or caller-owned geometry are changed.
export function createCasualtyHeadClearance(worker,{margin=.008}={}){
 const head=worker.parts.find(m=>/unified.*skull/.test(m.name));if(!head)throw Error('No native head surface for equipment fitting');
 const geometry=head.geometry.clone(),p=geometry.attributes.position,point=new T.Vector3();for(let i=0;i<p.count;i++){head.getVertexPosition(i,point).applyMatrix4(head.matrixWorld);p.setXYZ(i,point.x,point.y,point.z);}geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const box=geometry.boundingBox.clone().expandByScalar(margin),ray=new T.Ray(),directions=[[1,.013,.007],[.011,1,.017],[.019,.009,1]].map(v=>new T.Vector3(...v).normalize()),triangles=[],index=geometry.index;
 for(let i=0;i<(index?.count||p.count);i+=3)triangles.push(new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j))));
 const closest=new T.Vector3(),edgeBox=new T.Box3(),delta=new T.Vector3(),hit=new T.Vector3();
 function tree(items){const bounds=new T.Box3();for(const t of items)bounds.expandByPoint(t.a).expandByPoint(t.b).expandByPoint(t.c);if(items.length<=8)return {bounds,items};const size=bounds.getSize(new T.Vector3()),axis=size.x>size.y&&size.x>size.z?'x':size.y>size.z?'y':'z';items.sort((a,b)=>a.a[axis]+a.b[axis]+a.c[axis]-b.a[axis]-b.b[axis]-b.c[axis]);const middle=items.length>>1;return {bounds,left:tree(items.slice(0,middle)),right:tree(items.slice(middle))};}
 const surface=tree(triangles);geometry.dispose();
 function hits(node,distances,max){if(!ray.intersectsBox(node.bounds))return;if(node.items){for(const t of node.items)if(ray.intersectTriangle(t.a,t.b,t.c,false,hit)){const distance=hit.distanceTo(ray.origin);if(distance>1e-6&&distance<max&&!distances.some(d=>Math.abs(d-distance)<1e-5))distances.push(distance);}}else{hits(node.left,distances,max);hits(node.right,distances,max);}}
 function nearby(node,v){if(node.bounds.distanceToPoint(v)>=margin)return false;if(node.items)return node.items.some(t=>t.closestPointToPoint(v,closest).distanceToSquared(v)<margin*margin);return nearby(node.left,v)||nearby(node.right,v);}
 function inside(v){for(const direction of directions){ray.set(v,direction);const distances=[];hits(surface,distances,Infinity);if(distances.length%2===0)return false;}return true;}
 return {clear(weapon){const surfaces=[];let blocked=false;weapon.root.updateWorldMatrix(true,true);weapon.root.traverse(m=>{if(!m.isMesh||blocked)return;const a=m.geometry.attributes.position,vertices=Array.from({length:a.count},(_,i)=>new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld));surfaces.push({vertices,index:m.geometry.index});for(const v of vertices)if(box.containsPoint(v)&&(inside(v)||nearby(surface,v))){blocked=true;break;}});if(blocked)return false;
  // Vertex containment alone misses a long thin surface passing through a head.
  for(const {vertices,index}of surfaces)for(let i=0;i<(index?.count||vertices.length);i+=3)for(const [a,b]of [[0,1],[1,2],[2,0]]){const start=vertices[index?index.getX(i+a):i+a],end=vertices[index?index.getX(i+b):i+b];edgeBox.makeEmpty().expandByPoint(start).expandByPoint(end);if(!edgeBox.intersectsBox(box))continue;delta.subVectors(end,start);const length=delta.length();if(length<1e-8)continue;ray.set(start,delta.divideScalar(length));const distances=[];hits(surface,distances,length-1e-6);if(distances.length)return false;}return true;
 },dispose(){}};
}
