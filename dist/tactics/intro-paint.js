import * as T from './vendor/three.module.js';

// Small owned geometry/material kit. Atlas images remain owned by the caller.
export function createIntroPaint(atlas) {
 const geometries=new Set(),materials=new Set(),paint=new T.MeshStandardMaterial({map:atlas,roughness:1,side:T.DoubleSide}),grey=new T.MeshStandardMaterial({color:0xaaa69a,roughness:1,side:T.DoubleSide});
 materials.add(paint);materials.add(grey);const meshes=[];let disposed=false;
 function add(parent,name,g,cell=2,p=[0,0,0],r=[0,0,0]) {
  const uv=g.attributes.uv;
  if(uv){let u0=Infinity,v0=Infinity,u1=-Infinity,v1=-Infinity;for(let i=0;i<uv.count;i++){u0=Math.min(u0,uv.getX(i));v0=Math.min(v0,uv.getY(i));u1=Math.max(u1,uv.getX(i));v1=Math.max(v1,uv.getY(i));}
   for(let i=0;i<uv.count;i++)uv.setXY(i,(cell%4+.025+.95*(uv.getX(i)-u0)/(u1-u0||1))/4,(cell<4?.5:0)+.012+.476*(uv.getY(i)-v0)/(v1-v0||1));}
  geometries.add(g);g.computeBoundingBox();const m=new T.Mesh(g,paint);m.name=name;m.position.fromArray(p);m.rotation.set(...r);m.castShadow=m.receiveShadow=true;parent.add(m);meshes.push(m);return m;
 }
 const box=(parent,name,size,p,cell=2,r=[0,0,0])=>add(parent,name,new T.BoxGeometry(...size),cell,p,r);
 const cylinder=(parent,name,top,bottom,length,p,cell=4,r=[0,0,0],sides=12)=>add(parent,name,new T.CylinderGeometry(top,bottom,length,sides),cell,p,r);
 function beam(parent,name,a,b,width,cell=4){const A=new T.Vector3(...a),B=new T.Vector3(...b),m=cylinder(parent,name,width,width,A.distanceTo(B),A.clone().add(B).multiplyScalar(.5).toArray(),cell);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),B.sub(A).normalize());return m;}
 return {add,box,cylinder,beam,meshes,paint,grey,setGrey(v){if(disposed)return;for(const m of meshes)m.material=v?grey:paint;},dispose(){if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
