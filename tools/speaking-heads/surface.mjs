// The speaking heads' isosurface mesher: grey-surface.js sculptSurface, the same grid, tetrahedra,
// vertices and triangles, with one change, how each triangle is wound. The shared mesher winds a
// triangle to agree with the field's gradient at its first vertex; at a sharp edge of the field (a
// lip's edge, a face of the slab, a lining's foot, a wedge thinner than the grid) that gradient
// can be more than 90 degrees off the triangle's own facing, and the triangle came out inside-out
// (round 4: some 240 triangles about the bull's mouth, 280 mm², faced against the field; culled,
// the open mouth showed the inside of the head and the background through them, on one side more
// than the other, the tetrahedra's diagonals running one way). Here each triangle faces from its
// tetrahedron's inside corners toward its outside corners, as the field's linear surface in that
// tetrahedron separates them. The approved characters were meshed with the shared mesher, which is
// left as it is.
import * as THREE from '../../dist/tactics/vendor/three.module.js';

export function sculptSurface(field,min,max,step=.010){
 const n=min.map((v,i)=>Math.ceil((max[i]-v)/step)+1),stride=n[0]*n[1];
 const spacing=min.map((v,i)=>(max[i]-v)/(n[i]-1));
 const samples=new Float32Array(n[0]*n[1]*n[2]);
 const id=(x,y,z)=>x+n[0]*y+stride*z;
 const point=i=>[min[0]+i%n[0]*spacing[0],min[1]+Math.floor(i/n[0])%n[1]*spacing[1],min[2]+Math.floor(i/stride)*spacing[2]];
 for(let z=0;z<n[2];z++)for(let y=0;y<n[1];y++)for(let x=0;x<n[0];x++)samples[id(x,y,z)]=field(min[0]+x*spacing[0],min[1]+y*spacing[1],min[2]+z*spacing[2]);
 const positions=[],normals=[],indices=[],edges=new Map(),welded=new Map();
 function vertex(a,b){
  const key=a<b?a+':'+b:b+':'+a;if(edges.has(key))return edges.get(key);
  const pa=point(a),pb=point(b),t=samples[a]/(samples[a]-samples[b]),p=pa.map((v,i)=>v+(pb[i]-v)*t),e=step*.12;
  const weldKey=p.map(v=>Math.round(v*1e7)).join(',');if(welded.has(weldKey)){const i=welded.get(weldKey);edges.set(key,i);return i;}
  const normal=new THREE.Vector3(field(p[0]+e,p[1],p[2])-field(p[0]-e,p[1],p[2]),field(p[0],p[1]+e,p[2])-field(p[0],p[1]-e,p[2]),field(p[0],p[1],p[2]+e)-field(p[0],p[1],p[2]-e)).normalize();
  const i=positions.length/3;positions.push(...p);normals.push(...normal.toArray());edges.set(key,i);welded.set(weldKey,i);return i;
 }
 // `out`: from the tetrahedron's inside corners toward its outside corners
 function triangle(a,b,c,out){
  if(a===b||b===c||a===c)return;
  const p=i=>new THREE.Vector3(...positions.slice(i*3,i*3+3));
  const cross=p(b).sub(p(a)).cross(p(c).sub(p(a)));
  if(cross.lengthSq()<1e-30)return;
  if(cross.dot(out)<0)indices.push(a,c,b);else indices.push(a,b,c);
 }
 const mean=list=>{const m=new THREE.Vector3();for(const i of list)m.add(new THREE.Vector3(...point(i)));return m.divideScalar(list.length);};
 const tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 for(let z=0;z<n[2]-1;z++)for(let y=0;y<n[1]-1;y++)for(let x=0;x<n[0]-1;x++){
  const c=[id(x,y,z),id(x+1,y,z),id(x+1,y+1,z),id(x,y+1,z),id(x,y,z+1),id(x+1,y,z+1),id(x+1,y+1,z+1),id(x,y+1,z+1)];
  if(c.every(i=>samples[i]>0)||c.every(i=>samples[i]<=0))continue;
  for(const tet of tetra){
   const inside=tet.map(i=>c[i]).filter(i=>samples[i]<=0),outside=tet.map(i=>c[i]).filter(i=>samples[i]>0);
   if(!inside.length||!outside.length)continue;
   const out=mean(outside).sub(mean(inside));
   if(inside.length===1)triangle(...outside.map(i=>vertex(inside[0],i)),out);
   if(inside.length===3)triangle(...inside.map(i=>vertex(outside[0],i)),out);
   if(inside.length===2){const a=vertex(inside[0],outside[0]),b=vertex(inside[0],outside[1]),c=vertex(inside[1],outside[0]),d=vertex(inside[1],outside[1]);triangle(a,b,c,out);triangle(b,d,c,out);}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
