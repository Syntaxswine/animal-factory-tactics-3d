import * as T from './vendor/three.module.js';
import {BIOME_OBSTACLES,obstacleEdges,OBSTACLE_LAYOUTS} from './biome-obstacle-data.js';

function random(x,z,variant){let n=(Math.imul(x+11003,73428767)^Math.imul(z+7001,912931)^Math.imul(variant+1,199933))>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function surfaceGeometry(mask){
 const positions=[],uv=[],indices=[],steps=6;
 for(let z=0;z<=steps;z++)for(let x=0;x<=steps;x++){
  let px=x/steps-.5,pz=z/steps-.5;const wave=t=>.022+.018*Math.sin(t*Math.PI*3)**2;
  // Keep all cell corners fixed, including concave corners. Neighboring masks
  // can then meet exactly without exposing a pinhole of safe ground between.
  if(z===0&&x>0&&x<steps&&(mask&1))pz+=wave(x/steps);if(x===steps&&z>0&&z<steps&&(mask&2))px-=wave(z/steps);
  if(z===steps&&x>0&&x<steps&&(mask&4))pz-=wave(x/steps);if(x===0&&z>0&&z<steps&&(mask&8))px+=wave(z/steps);
  positions.push(px,.012,pz);uv.push(x/steps,z/steps);
 }
 for(let z=0;z<steps;z++)for(let x=0;x<steps;x++){const a=z*(steps+1)+x,b=a+1,c=a+steps+1,d=c+1;indices.push(a,c,b,b,c,d);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function rootGeometry(){
 const points=[[-.5,0,0],[-.28,.28,.07],[.05,.48,.02],[.32,.30,-.05],[.5,0,0]].map(v=>new T.Vector3(...v));
 const g=new T.TubeGeometry(new T.CatmullRomCurve3(points),8,.065,5,false);g.translate(0,.08,0);return g;
}
function crownGeometry(detail=1){
 const g=new T.IcosahedronGeometry(.5,detail),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.09*Math.sin(x*14+z*9);p.setXYZ(i,x*f,y*(1+.07*Math.cos(z*13)),z*f);}
 g.computeBoundingBox();const b=g.boundingBox,c=b.getCenter(new T.Vector3()),s=b.getSize(new T.Vector3());g.translate(-c.x,-c.y,-c.z);g.scale(1/s.x,1/s.y,1/s.z);g.computeVertexNormals();return g;
}
function actualBounds(root){
 const box=new T.Box3(),instance=new T.Matrix4(),world=new T.Matrix4(),v=new T.Vector3();root.updateMatrixWorld(true);
 root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let n=0;n<(o.isInstancedMesh?o.count:1);n++){if(o.isInstancedMesh){o.getMatrixAt(n,instance);world.multiplyMatrices(o.matrixWorld,instance);}else world.copy(o.matrixWorld);for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(world));}});
 return box;
}

export function biomeObstacleParts(family,cells=OBSTACLE_LAYOUTS.patch,variant=0,{occupied,density,detailOnly=false}={}){
 const spec=BIOME_OBSTACLES[family];if(!spec)throw Error('Unknown obstacle family');if(!Number.isInteger(variant)||variant<0||variant>2)throw Error('Obstacle variant must be 0, 1 or 2');
 const edges=obstacleEdges(cells,{occupied}),parts=[];
 for(const cell of edges){
  const {x,z,mask}=cell,rng=random(x,z,variant),yaw=rng()*Math.PI*2;
  if(density&&rng()>Math.max(0,Math.min(1,density(x,z))))continue;
  const add=(shape,paint,p,size,rotation=[0,0,0])=>parts.push({shape,paint,position:[p[0]+x,p[1],p[2]+z],size,rotation,cell:[x,z]});
  const limb=(a,b,width,paint='brokenWood')=>parts.push({shape:'branch',paint,a:[a[0]+x,a[1],a[2]+z],b:[b[0]+x,b[1],b[2]+z],width,cell:[x,z]});
  if(!detailOnly)add('surface-'+mask,spec.ground,[0,0,0],[1,1,1]);
  if(family==='wetlands'){
   // Only exposed boundaries get banks. Joined cells remain one continuous bog;
   // even small edge roots stay parallel to the shore and cannot form bridges.
   for(const edge of cell.exposed){const northSouth=edge==='north'||edge==='south',sign=edge==='north'||edge==='west'?-1:1;
    if(!detailOnly)for(let j=0;j<3;j++){const along=(j-1)*.29,across=sign*.421;add('bank','peat',northSouth?[along,.045,across]:[across,.045,along],northSouth?[.34,.09,.105]:[.105,.09,.34]);}
    if(rng()>.28){const along=(rng()-.5)*.44,across=sign*.375;
     for(let j=0;j<3;j++){const a=northSouth?[along+j*.045,.04,across]:[across,.04,along+j*.045];const b=[a[0]+.035,.45+rng()*.35,a[2]-.02];limb(a,b,.012,'moss');if(j===0)add('branch','brokenWood',[b[0],b[1]-.055,b[2]],[.037,.15,.037]);}
    }
   }
  }else if(family==='jungle'){
   if(!detailOnly)add('crown','vines',[0,.30,0],[.90,.58,.90]);
   add('root','vines',[0,.06,0],[.73,1.08,1],[0,yaw,0]);add('root','brokenWood',[0,.045,0],[.70,1.0,.9],[0,yaw+1.7,0]);
   if(!detailOnly)for(let j=0;j<2;j++){const a=yaw+j*Math.PI;add('crown','jungle',[Math.cos(a)*.15,.67+rng()*.10,Math.sin(a)*.15],[.52,.47,.51]);}
  }else if(family==='temperate'){
   if(!detailOnly)add('crown','bramble',[0,.34,0],[.94,.66,.94]);
   const length=.32+rng()*.12;limb([Math.cos(yaw)*-length,.31,Math.sin(yaw)*-length],[Math.cos(yaw)*length,.48,Math.sin(yaw)*length],.15);
   for(let j=0;j<3;j++){const a=yaw+j*2.1;limb([0,.38,0],[Math.cos(a)*.34,.83+rng()*.10,Math.sin(a)*.34],.04,'bramble');}
  }else if(family==='snow'){
   if(!detailOnly)add('crown','snow',[0,.17,0],[.94,.32,.94]);
   // One dominant fallen limb, sometimes a shorter snag: no repeated X braces.
   const count=rng()>.62?2:1;
   for(let j=0;j<count;j++){const angle=yaw+j*(.45+rng()),length=.24+rng()*.17,y=.23+rng()*.22,r=.12+rng()*.06,a=[-Math.cos(angle)*length,y,-Math.sin(angle)*length],b=[Math.cos(angle)*length,y+.08+rng()*.16,Math.sin(angle)*length];limb(a,b,r);limb([a[0]*.9,a[1]+r*.55,a[2]*.9],[b[0]*.9,b[1]+r*.55,b[2]*.9],r*.53,'snow');}
   for(let j=0;j<2;j++){const a=yaw+j*2.1;limb([Math.cos(a)*.08,.25,Math.sin(a)*.08],[Math.cos(a)*.31,.63+rng()*.25,Math.sin(a)*.31],.05);}
  }else{
   if(!detailOnly)add('crown','dryThorns',[0,.38,0],[.94,.73,.94]);
   for(let j=0;j<6;j++){const a=yaw+j*Math.PI/3,top=[Math.cos(a)*.30,.73+rng()*.25,Math.sin(a)*.30];limb([Math.cos(a)*.16,.34,Math.sin(a)*.16],top,.047);const tip=[Math.cos(a+.28)*.43,.78+rng()*.20,Math.sin(a+.28)*.43];limb([top[0]*.85,top[1]*.82,top[2]*.85],tip,.027,'dryThorns');}
  }
 }
 return {parts,edges};
}

export function createBiomeObstacleFactory(materials){
 const geometries={crown:crownGeometry(),bank:crownGeometry(0),branch:new T.CylinderGeometry(.5,.5,1,6,1),root:rootGeometry()};
 for(let mask=0;mask<16;mask++)geometries['surface-'+mask]=surfaceGeometry(mask);
 const live=new Set();let disposed=false;
 function release(root){if(!live.delete(root))return;root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});root.removeFromParent();}
 function create(family,{cells=OBSTACLE_LAYOUTS.patch,variant=0,grey=false,occupied,density,detailOnly=false}={}){
  if(disposed)throw Error('Obstacle factory is disposed');const {parts,edges}=biomeObstacleParts(family,cells,variant,{occupied,density,detailOnly}),groups=new Map();
  for(const part of parts){const name=part.shape+':'+(grey?'grey':part.paint);if(!materials[grey?'grey':part.paint])throw Error('Missing obstacle material: '+part.paint);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(part);}
  const root=new T.Group(),o=new T.Object3D(),up=new T.Vector3(0,1,0);root.name=BIOME_OBSTACLES[family].id;let triangles=0;
  for(const entries of groups.values()){
   const first=entries[0],g=geometries[first.shape],m=materials[grey?'grey':first.paint],mesh=new T.InstancedMesh(g,m,entries.length);mesh.name=first.shape+':'+(grey?'grey':first.paint);mesh.castShadow=!first.shape.startsWith('surface-');mesh.receiveShadow=true;
   entries.forEach((p,i)=>{o.position.set(0,0,0);o.rotation.set(0,0,0);if(p.a){const a=new T.Vector3(...p.a),b=new T.Vector3(...p.b);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());o.scale.set(p.width,a.distanceTo(b),p.width);}else{o.position.fromArray(p.position);o.rotation.set(...p.rotation,'YXZ');o.scale.fromArray(p.size);}o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();root.add(mesh);triangles+=entries.length*(g.index?.count??g.attributes.position.count)/3;
  }
  const b=actualBounds(root);if(b.isEmpty())b.set(new T.Vector3(),new T.Vector3());root.userData={id:root.name,biome:family,variant,triangles,cells:edges.map(({x,z})=>[x,z]),edges,placement:{unit:1,anchor:[0,0,0]},bounds:{min:b.min.toArray(),max:b.max.toArray()},traversal:{proposed:'impassable',blockedCells:edges.map(({x,z})=>[x,z]),gameplayIntegrated:false},reason:BIOME_OBSTACLES[family].reason};live.add(root);return root;
 }
 return {create,release,geometries,get liveCount(){return live.size;},dispose(){if(disposed)return;disposed=true;for(const root of [...live])release(root);for(const g of Object.values(geometries))g.dispose();}};
}
