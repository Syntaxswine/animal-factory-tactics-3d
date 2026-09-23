import * as T from './vendor/three.module.js';

const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const bases=Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*.5,0,Math.sin(i*Math.PI/3)*.5]);
function rockGeometry(){const p=[],upper=bases.map(([x,,z],i)=>[x*.75,.48+.10*Math.sin(i*2.3),z*.75]);const tri=(a,b,c)=>p.push(...a,...b,...c);for(let i=0;i<6;i++){const j=(i+1)%6;tri([0,0,0],bases[i],bases[j]);tri(bases[i],upper[i],upper[j]);tri(bases[i],upper[j],bases[j]);tri(upper[i],[.07,1,-.1],upper[j]);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();g.computeBoundingSphere();return g;}
// Decorations rest on the ACTUAL cap/ground. They never change the cliff mesh,
// cap elevation or future navigation. Leave intentional gaps on climbable rims.
export function createCliffEdgeRocks(mesh,set){
 const candidates=[],seen=new Set(),rim=mesh.geometry.userData.rim||[],ray=new T.Raycaster();mesh.updateMatrixWorld(true);
 function surface(x,z){const origin=mesh.localToWorld(new T.Vector3(x,3,z)),direction=new T.Vector3(0,-1,0).transformDirection(mesh.matrixWorld);ray.set(origin,direction);const hit=ray.intersectObject(mesh,false)[0];return hit?{y:mesh.worldToLocal(hit.point.clone()).y,normal:hit.face.normal.clone()}:null;}
 for(const edge of rim){const kind=edge.set||set;const a=new T.Vector3(...edge.a),b=new T.Vector3(...edge.b),tangent=b.clone().sub(a),length=Math.hypot(tangent.x,tangent.z);if(length<1e-5)continue;
  const mid=a.clone().add(b).multiplyScalar(.5),key=`${Math.floor(mid.x*3)},${Math.floor(mid.z*3)}`;
  if(seen.has(key))continue;seen.add(key);const seed=mid.x*17.31+mid.z*23.73;
  if(hash(seed)>(kind==='crag'?.76:.27))continue;
  // Cap winding leaves land on the right of this oriented boundary.
  const inward=new T.Vector3(tangent.z,0,-tangent.x).normalize();
  for(const foot of [false,true]){
   if(foot&&hash(seed+4)>(kind==='crag'?.60:.25))continue;
   const center=mid.clone().addScaledVector(inward,foot?-.16:.16),radius=(kind==='crag'?.075:.055)+hash(seed+2)*.07;
   const hit=surface(center.x,center.z);let normal=new T.Vector3(0,1,0);
   if(foot){if(hit!==null)continue;center.y=0;}else{if(hit===null)continue;center.y=hit.y;normal=hit.normal;
    // Reject narrow lips: every support sample must remain on the cap.
    let supported=true;for(const [dx,dz]of [[radius,0],[-radius,0],[0,radius],[0,-radius]]){const h=surface(center.x+dx,center.z+dz);if(h===null||Math.abs(h.y-center.y)>.11)supported=false;}if(!supported)continue;
   }
   const height=radius*(kind==='crag'?1.65:.85),size=[radius*2,height,radius*(1.2+hash(seed+7)*.6)],yaw=hash(seed+3)*Math.PI,rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw)),base=center.clone().addScaledVector(normal,-.025);
   const bottom=bases.map(v=>new T.Vector3(...v).multiply(new T.Vector3(...size)).applyQuaternion(rotation).add(base));
   if(bottom.some(p=>{const h=surface(p.x,p.z);if(foot&&h!==null)return true;if(!foot&&h===null)return true;const gap=p.y-(h?.y||0);return gap>.015||gap<-.06;}))continue;
   candidates.push({center:center.toArray(),normal:normal.toArray(),size,yaw,foot,seed,bottom:bottom.map(p=>p.toArray())});
  }
 }
 const g=rockGeometry();
 const material=new T.MeshStandardMaterial({color:0x8b816b,roughness:1,flatShading:true}),root=new T.Group(),rocks=new T.InstancedMesh(g,material,candidates.length),matrix=new T.Matrix4(),q=new T.Quaternion();
 candidates.forEach((p,i)=>{const normal=new T.Vector3(...p.normal);q.setFromUnitVectors(new T.Vector3(0,1,0),normal).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw));matrix.compose(new T.Vector3(...p.center).addScaledVector(normal,-.025),q,new T.Vector3(...p.size));rocks.setMatrixAt(i,matrix);rocks.setColorAt(i,new T.Color().setHSL(.105,.12,.40+hash(p.seed+8)*.15));});rocks.castShadow=rocks.receiveShadow=true;rocks.userData.placements=candidates;rocks.instanceMatrix.needsUpdate=true;if(candidates.length)rocks.instanceColor.needsUpdate=true;root.add(rocks);let disposed=false;
 return {root,rocks,dispose(){if(disposed)return;disposed=true;rocks.dispose();g.dispose();material.dispose();}};
}
