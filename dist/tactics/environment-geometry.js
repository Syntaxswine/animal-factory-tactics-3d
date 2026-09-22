import * as THREE from './vendor/three.module.js';
// Rigid construction keeps planar faces and square corners. Rounding is an
// explicit shape choice for soft details, not the default for every box.
function rounded(){
 const g=new THREE.BoxGeometry(1,1,1,4,4,4),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i),c=v.clone().clampScalar(-.42,.42);v.sub(c).normalize().multiplyScalar(.08).add(c);p.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();return g;
}
function organic(type){
 const g=new THREE.SphereGeometry(.5,16,10),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),belt=Math.max(0,1-4*y*y);
  const lobes=1+(.105*Math.sin(a*5+y*9)+.055*Math.cos(a*9-y*5))*belt;
  if(type==='bag'){const q=n=>Math.sign(n)*Math.pow(Math.abs(n)*2,.56)*.5;p.setXYZ(i,q(x)*(1-.055*Math.cos(y*13)),q(y),q(z)*(1+.045*Math.sin(x*12)));}
  else if(type==='bough'){const taper=.58+(.5-y)*.55;p.setXYZ(i,x*lobes*taper,y+.06*Math.cos(a*5)*belt,z*lobes*taper);}
  else p.setXYZ(i,x*lobes,y+.045*Math.sin(a*4+y*5)*belt,z*lobes);
 }
 g.computeVertexNormals();return g;
}
export function environmentGeometries(){
 const g={box:new THREE.BoxGeometry(1,1,1),rounded:rounded(),cylinder:new THREE.CylinderGeometry(.5,.5,1,16),taper:new THREE.CylinderGeometry(.3,.5,1,12),cone:new THREE.ConeGeometry(.5,1,10),crown:organic('crown'),bough:organic('bough'),bag:organic('bag'),cushion:organic('bag'),leaf:new THREE.OctahedronGeometry(.5),ring:new THREE.TorusGeometry(.35,.15,6,16),wedge:new THREE.BoxGeometry(1,1,1)};
 const profile=[[0,-.5],[.43,-.5],[.475,-.47],[.49,-.36],[.5,-.15],[.495,.2],[.48,.43],[.44,.5],[0,.5]];
 g.drum=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),24);
 // Continuous terrain must meet at full tile edges; softened prop corners leave seams.
 g.slab=new THREE.BoxGeometry(1,1,1);
 g.hoop=new THREE.TorusGeometry(.48,.02,6,24);g.hoop.rotateX(Math.PI/2);
 g.ring.rotateX(Math.PI/2);
 const p=g.wedge.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<0)p.setY(i,-.5+(p.getX(i)+.5)*.88);p.needsUpdate=true;g.wedge.computeVertexNormals();
 for(const geometry of Object.values(g)){geometry.computeBoundingBox();const b=geometry.boundingBox,s=new THREE.Vector3(),c=new THREE.Vector3();b.getSize(s);b.getCenter(c);geometry.translate(-c.x,-c.y,-c.z);geometry.scale(1/s.x,1/s.y,1/s.z);geometry.computeBoundingSphere();}
 return g;
}
