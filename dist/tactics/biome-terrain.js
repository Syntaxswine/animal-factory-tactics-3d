import * as T from './vendor/three.module.js';
import {BIOME_FAMILIES} from './biome-foliage-data.js';
import {BIOME_OBSTACLES,CELL_EDGES} from './biome-obstacle-data.js';

const noise=n=>{const p=Math.sin(n*173.71+19.3)*44758.12;return p-Math.floor(p);};
const quad=(a,b,c,d,out)=>out.push(...a,...c,...b,...a,...d,...c);
// Round only exposed corners inward. The occupied tile and neighboring tile
// seams remain authoritative; no bank or foliage extends into the clear route.
export function terrainCellOutline(plan,x,z){
 const h=plan.heightAt(x,z),outside=CELL_EDGES.map(e=>!plan.blockedAt(x+e.dx,z+e.dz)||plan.heightAt(x+e.dx,z+e.dz)!==h),corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],points=[];
 for(let i=0;i<4;i++){
  const p=corners[i],before=corners[(i+3)%4],next=corners[(i+1)%4],clip=outside[i]&&outside[(i+3)%4];
  if(clip){points.push([x+p[0]+(before[0]-p[0])*.19,z+p[1]+(before[1]-p[1])*.19]);points.push([x+p[0]+(next[0]-p[0])*.19,z+p[1]+(next[1]-p[1])*.19]);}else points.push([x+p[0],z+p[1]]);
  if(outside[i])points.push([x+(p[0]+next[0])*.5-CELL_EDGES[i].dx*.045,z+(p[1]+next[1])*.5-CELL_EDGES[i].dz*.045]);
 }
 return {points,outside};
}
function makeGeometry(positions,color){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(color){const colors=[];for(let i=0;i<positions.length/3;i++)colors.push(...color);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));}g.computeVertexNormals();g.computeBoundingSphere();return g;}

export function createBiomeTerrain(plan,family,{ground,cliff,plantMaterials,obstacleMaterials,plantFactory,grey=false}){
 if(!BIOME_OBSTACLES[family])throw Error('Unknown terrain biome');
 const root=new T.Group(),owned=[],instances=[],treeInstances=[],groundPositions=[],wallPositions=[],densePositions=[],edgePositions=[];
 const bog=family==='wetlands',bed=bog?.018:family==='snow'?.12:.14;
 const point=(x,z,h)=>[x,h,z];
 for(let z=0;z<plan.depth;z++)for(let x=0;x<plan.width;x++){
  const h=plan.heightAt(x,z),corners=[[x-.5,z-.5],[x+.5,z-.5],[x+.5,z+.5],[x-.5,z+.5]],base=corners.map(([u,v])=>point(u,v,h));quad(...base,groundPositions);
  for(let i=0;i<4;i++){
   const {dx,dz}=CELL_EDGES[i],nh=plan.heightAt(x+dx,z+dz),a=corners[i],b=corners[(i+1)%4];
   if(nh!==null&&nh<h){quad(point(a[0],a[1],nh),point(b[0],b[1],nh),point(b[0],b[1],h),point(a[0],a[1],h),wallPositions);edgePositions.push(a[0],h+.012,a[1],b[0],h+.012,b[1]);}
  }
  if(!plan.blockedAt(x,z))continue;
  const outline=terrainCellOutline(plan,x,z);
  if(!outline.outside.some(Boolean)){const top=corners.map(([u,v])=>point(u,v,h+bed));quad(...top,densePositions);}else{
   const p=outline.points;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];densePositions.push(x,h+bed,z,...point(b[0],b[1],h+bed),...point(a[0],a[1],h+bed));quad(point(a[0],a[1],h),point(b[0],b[1],h),point(b[0],b[1],h+bed),point(a[0],a[1],h+bed),densePositions);}
  }
 }
 const add=(p,m,name,color)=>{const g=makeGeometry(p,color),mesh=new T.Mesh(g,m);mesh.name=name;mesh.receiveShadow=true;root.add(mesh);owned.push(g);return mesh;};
 const groundMesh=add(groundPositions,ground,'Saved tutorial terrain');add(wallPositions,cliff,'Two plateau tiers',[.63,.58,.46]);
 const dense=add(densePositions,grey?plantMaterials.grey:(family==='snow'?plantMaterials.snow:obstacleMaterials[BIOME_OBSTACLES[family].paint]),'Continuous impassable ground');
 const rimG=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(edgePositions,3)),rimM=new T.LineBasicMaterial({color:0x5f513c});owned.push(rimG);const rims=new T.LineSegments(rimG,rimM);root.add(rims);
 // A cheap, dense canopy of rounded undergrowth supplies the landscape mass.
 // It is independent of the much more detailed near-camera roots and branches.
 const shrubGeometry=new T.IcosahedronGeometry(.5,0);owned.push(shrubGeometry);
 const shrubGroups=new Map(),reedMatrices=[],o=new T.Object3D();let shrubs=0;
 const shrub=(material,x,y,z,sx,sy,sz)=>{if(!shrubGroups.has(material))shrubGroups.set(material,[]);o.position.set(x,y,z);o.rotation.set(0,0,0);o.scale.set(sx,sy,sz);o.updateMatrix();shrubGroups.get(material).push(o.matrix.clone());shrubs++;};
 for(const [x,z]of plan.cells){const h=plan.heightAt(x,z),n=z*plan.width+x;
  if(bog){
   for(const e of CELL_EDGES)if(!plan.blockedAt(x+e.dx,z+e.dz)||plan.heightAt(x+e.dx,z+e.dz)!==h){
    for(const s of [-.27,0,.27])shrub(grey?plantMaterials.grey:obstacleMaterials.peat,x+e.dx*.39+(e.dx?0:s),h+.045,z+e.dz*.39+(e.dz?0:s),e.dx?.16:.32,.10,e.dz?.16:.32);
    if(noise(n+e.bit)>.4)for(let j=0;j<3;j++){const ry=.45+.55*noise(n+j*31+e.bit),along=(j-1)*.065;o.position.set(x+e.dx*.30+(e.dx?0:along),h+ry/2,z+e.dz*.30+(e.dz?0:along));o.rotation.set(0,0,0);o.scale.set(.023,ry,.023);o.updateMatrix();reedMatrices.push(o.matrix.clone());}
   }
  }else{
   const tall=family==='snow'?.32+.25*noise(n):.72+.42*noise(n),leaf=family==='jungle'?'jungle':family==='temperate'?'leaves':family==='snow'?'snow':'dry';
   const m=grey?plantMaterials.grey:noise(n+7)<.64?plantMaterials[leaf]:family==='snow'?plantMaterials.snow:obstacleMaterials[BIOME_OBSTACLES[family].paint];
   shrub(m,x,h+bed+tall*.36,z,.99,tall,1.01);
  }
 }
 for(const [material,matrices]of shrubGroups){const mesh=new T.InstancedMesh(shrubGeometry,material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.name='Continuous undergrowth';root.add(mesh);instances.push(mesh);}
 if(reedMatrices.length){const geometry=new T.CylinderGeometry(.5,.5,1,5,1),mesh=new T.InstancedMesh(geometry,grey?plantMaterials.grey:plantMaterials.moss,reedMatrices.length);owned.push(geometry);reedMatrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.name='Bog margin reeds';root.add(mesh);instances.push(mesh);}
 // Crown-safe placement: the entire conservative footprint must lie in blocked
 // cells at one elevation. Trees cannot bridge cliffs or conceal clear paths.
 const prototypes=[],batches=new Map(),trees=[],world=new T.Matrix4(),translation=new T.Matrix4();
 for(const id of BIOME_FAMILIES[family].trees)for(let variant=0;variant<3;variant++)prototypes.push(plantFactory.create(id,{variant,mature:true,grey}));
 {const step=bog?10:family==='dry'?5:3.6;for(let z=3;z<plan.depth-3;z+=step)for(let x=3;x<plan.width-3;x+=step){
  const n=Math.round(z*plan.width+x),p=prototypes[Math.floor(noise(n)*prototypes.length)],b=p.userData.bounds,cx=x+(noise(n+3)-.5)*2.2,cz=z+(noise(n+7)-.5)*2.2,h=plan.heightAt(Math.floor(cx+.5),Math.floor(cz+.5));
  if(noise(n+17)<(bog?.40:family==='dry'?.28:.08))continue;
  const x0=Math.floor(cx+b.min[0]+.5),x1=Math.floor(cx+b.max[0]+.5),z0=Math.floor(cz+b.min[2]+.5),z1=Math.floor(cz+b.max[2]+.5);let safe=true;
  for(let iz=z0;iz<=z1&&safe;iz++)for(let ix=x0;ix<=x1;ix++)if(!plan.blockedAt(ix,iz)||plan.heightAt(ix,iz)!==h){safe=false;break;}
  if(!safe)continue;trees.push({id:p.userData.id,x:cx,y:h,z:cz,bounds:{min:[cx+b.min[0],h,cz+b.min[2]],max:[cx+b.max[0],h+b.max[1],cz+b.max[2]]}});p.updateMatrixWorld(true);translation.makeTranslation(cx,h,cz);
  p.traverse(mesh=>{if(!mesh.isMesh)return;const id=mesh.geometry.uuid+':'+mesh.material.uuid;if(!batches.has(id))batches.set(id,{geometry:mesh.geometry,material:mesh.material,matrices:[]});world.multiplyMatrices(translation,mesh.matrixWorld);batches.get(id).matrices.push(world.clone());});
 }}
 for(const b of batches.values()){const mesh=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.name='Trees';root.add(mesh);instances.push(mesh);treeInstances.push(mesh);}
 let disposed=false;
 return {root,groundMesh,dense,trees,treeInstances,stats:{terrainCells:plan.width*plan.depth,blockedCells:plan.cells.length,trees:trees.length,shrubs,baseTriangles:(groundPositions.length+wallPositions.length+densePositions.length)/9,batches:instances.length},dispose(){if(disposed)return;disposed=true;root.removeFromParent();instances.forEach(m=>m.dispose());owned.forEach(g=>g.dispose());rimM.dispose();}};
}
