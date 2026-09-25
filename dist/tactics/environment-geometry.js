import * as THREE from './vendor/three.module.js';
export function environmentGeometries(){
 const g={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(.5,.5,1,12),taper:new THREE.CylinderGeometry(.3,.5,1,9),cone:new THREE.ConeGeometry(.5,1,10),crown:new THREE.IcosahedronGeometry(.5,1),cushion:new THREE.SphereGeometry(.5,12,8),leaf:new THREE.OctahedronGeometry(.5),ring:new THREE.TorusGeometry(.35,.15,5,12),wedge:new THREE.BoxGeometry(1,1,1)};
 g.ring.rotateX(Math.PI/2);
 const crown=new THREE.IcosahedronGeometry(.5,2),cp=crown.attributes.position;
 for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),angle=Math.atan2(z,x),r=1+.10*Math.sin(angle*7+y*13)+.055*Math.cos(x*23-z*17);cp.setXYZ(i,x*r,y*(.97+.06*Math.sin(x*19+z*11)),z*r);}
 crown.computeVertexNormals();g['foliage-crown']=crown;
 // One joined canopy, with unequal lobes in its outline rather than intersecting balls.
 const canopy=new THREE.SphereGeometry(.5,28,16),bp=canopy.attributes.position;
 for(let i=0;i<bp.count;i++){const x=bp.getX(i),y=bp.getY(i),z=bp.getZ(i),a=Math.atan2(z,x),r=1+.14*Math.sin(a*3+.4)+.07*Math.cos(a*7-y*7);bp.setXYZ(i,x*r+.035*Math.sin(y*8),y*(1+.12*Math.sin(a*4))+.035*Math.cos(a*3)*(1-Math.abs(y)*2),z*r);}
 canopy.computeVertexNormals();g['broadleaf-crown']=canopy;
 // A modest irregular hem avoids a perfect geometric cone without individual needles.
 const tier=new THREE.ConeGeometry(.5,1,12,3),tp=tier.attributes.position;
 for(let i=0;i<tp.count;i++){const x=tp.getX(i),y=tp.getY(i),z=tp.getZ(i),a=Math.atan2(z,x),edge=.5-y,r=1+.055*Math.sin(a*5)+.035*Math.cos(a*3);tp.setXYZ(i,x*r,y-.045*edge*Math.cos(a*5),z*r);}
 tier.computeVertexNormals();g['pine-tier']=tier;
 const scrub=new THREE.IcosahedronGeometry(.5,1),sp=scrub.attributes.position;
 for(let i=0;i<sp.count;i++){const x=sp.getX(i),y=sp.getY(i),z=sp.getZ(i),a=Math.atan2(z,x),r=1+.18*Math.sin(a*5+y*9);sp.setXYZ(i,x*r,y+.065*Math.cos(a*3)*(1-Math.abs(y)*2),z*r);}
 scrub.computeVertexNormals();g['cover-crown']=scrub;
 const vertices=[];
 for(let i=0;i<7;i++){
  const a=i*2.399,dx=Math.cos(a),dz=Math.sin(a),h=.55+(i%3)*.21,bx=dx*.12,bz=dz*.12;
  const left=[bx-dz*.045,0,bz+dx*.045],right=[bx+dz*.045,0,bz-dx*.045],mid=[bx+dx*.15,h*.55,bz+dz*.15],tip=[bx+dx*.34,h,bz+dz*.34];
  // Two-sided folded blades have thickness in silhouette without alpha cards.
  vertices.push(...left,...right,...mid,...left,...mid,...tip,...right,...tip,...mid,...right,...left,...tip);
 }
 const tuft=new THREE.BufferGeometry();tuft.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));tuft.computeVertexNormals();g['grass-tuft']=tuft;
 const p=g.wedge.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<0)p.setY(i,-.5+(p.getX(i)+.5)*.88);p.needsUpdate=true;g.wedge.computeVertexNormals();
 for(const geometry of Object.values(g)){geometry.computeBoundingBox();const b=geometry.boundingBox,s=new THREE.Vector3(),c=new THREE.Vector3();b.getSize(s);b.getCenter(c);geometry.translate(-c.x,-c.y,-c.z);geometry.scale(1/s.x,1/s.y,1/s.z);geometry.computeBoundingSphere();}
 g.ramp=new THREE.BoxGeometry(1,1,1);const rp=g.ramp.attributes.position;for(let i=0;i<rp.count;i++)if(rp.getY(i)>0)rp.setY(i,rp.getX(i));rp.needsUpdate=true;g.ramp.computeVertexNormals();
 return g;
}
