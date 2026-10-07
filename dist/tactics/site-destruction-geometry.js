import * as T from './vendor/three.module.js';
const V=()=>new T.Vector3();
function clip(poly,axis,bound,sign){
 const next=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=(a.p[axis]-bound)*sign,db=(b.p[axis]-bound)*sign;
  if(da>=-1e-9)next.push(a);
  if((da>=0)!==(db>=0)){const t=da/(da-db);next.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),uv:a.uv.clone().lerp(b.uv,t)});}
 }return next;
}
export function siteTriangles(nodes,{frame=new T.Matrix4(),planes=[],exclude=()=>false}={}){
 const inverse=frame.clone().invert(),triangles=[];
 for(const root of [nodes].flat())root.traverse(m=>{
  if(!m.isMesh||exclude(m))return;
  const matrix=inverse.clone().multiply(m.matrixWorld),normal=new T.Matrix3().getNormalMatrix(matrix),g=m.geometry,ix=g.index;
  for(let i=0;i<(ix?.count??g.attributes.position.count);i+=3){
   let poly=[0,1,2].map(j=>{const n=ix?ix.getX(i+j):i+j;return {p:V().fromBufferAttribute(g.attributes.position,n).applyMatrix4(matrix),n:V().fromBufferAttribute(g.attributes.normal,n).applyNormalMatrix(normal),uv:new T.Vector2().fromBufferAttribute(g.attributes.uv,n)};});
   for(const [axis,bound,sign]of planes)poly=clip(poly,axis,bound,sign);
   for(let j=1;j<poly.length-1;j++)if(new T.Triangle(poly[0].p,poly[j].p,poly[j+1].p).getArea()>1e-10)triangles.push({material:m.material,morphKey:m.userData.morphKey,v:[poly[0],poly[j],poly[j+1]]});
  }
 });return triangles;
}
export function meshFromTriangles(triangles,ownGeometry,ownMaterial){
 const group=new T.Group(),buckets=new Map();
 for(const t of triangles){if(!buckets.has(t.material))buckets.set(t.material,[]);buckets.get(t.material).push(...t.v);}
 for(const [material,verts]of buckets){
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(verts.flatMap(v=>v.p.toArray()),3));
  geometry.setAttribute('normal',new T.Float32BufferAttribute(verts.flatMap(v=>v.n.toArray()),3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(verts.flatMap(v=>v.uv.toArray()),2));geometry.computeBoundingBox();geometry.computeBoundingSphere();ownGeometry(geometry);
  const mesh=new T.Mesh(geometry,ownMaterial(material));mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
 }return group;
}
export function shardTriangles(triangles,size=.5){
 const buckets=new Map();
 for(const triangle of triangles){
  const bounds=new T.Box3().setFromPoints(triangle.v.map(v=>v.p));
  const lo=['x','y','z'].map(a=>Math.floor(bounds.min[a]/size)),hi=['x','y','z'].map(a=>Math.floor((bounds.max[a]-1e-8)/size));
  for(let x=lo[0];x<=Math.max(lo[0],hi[0]);x++)for(let y=lo[1];y<=Math.max(lo[1],hi[1]);y++)for(let z=lo[2];z<=Math.max(lo[2],hi[2]);z++){
   let poly=triangle.v;for(const [axis,k]of [['x',x],['y',y],['z',z]]){poly=clip(poly,axis,k*size,1);poly=clip(poly,axis,(k+1)*size,-1);}
   const key=[x,y,z].join(',');
   for(let j=1;j<poly.length-1;j++)if(new T.Triangle(poly[0].p,poly[j].p,poly[j+1].p).getArea()>1e-10){if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({...triangle,v:[poly[0],poly[j],poly[j+1]]});}
  }
 }return [...buckets.values()];
}
