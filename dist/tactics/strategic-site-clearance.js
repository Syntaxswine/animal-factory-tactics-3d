import * as THREE from './vendor/three.module.js';

// Presentation clearance envelopes, not new gameplay character dimensions.
// Horse includes its relaxed arms. Wide includes the largest neutral bodies,
// long ears and tail overhang, with margin; weapons/poses need separate fitting.
export const SITE_CLEARANCE_PROFILES=Object.freeze({
 horse:Object.freeze({id:'horse',label:'Horse',halfWidth:.46,height:1.70}),
 wide:Object.freeze({id:'wide',label:'Whole roster · conservative',halfWidth:.70,height:1.85}),
});
export const SITE_STEP_CLEARANCE=.08;
const key=(x,z)=>x+','+z;

export function analyzeSiteClearance(root,profileId='horse'){
 const profile=SITE_CLEARANCE_PROFILES[profileId];
 if(!profile)throw RangeError('Unknown site clearance profile: '+profileId);
 const floor=root.userData.slabHeight;
 if(!Number.isFinite(floor))throw TypeError('A strategic site root is required');
 root.updateMatrixWorld(true);
 // Convert into the asset's local frame so placing/rotating a site does not
 // change its authored local cell mask.
 const inverse=root.matrixWorld.clone().invert(),triangles=[];
 for(const assembly of root.children){
  if(assembly.name==='hardstanding')continue;
  assembly.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const transform=inverse.clone().multiply(mesh.matrixWorld),p=mesh.geometry.attributes.position,index=mesh.geometry.index;
   for(let i=0;i<(index?.count??p.count);i+=3){
    const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(transform));
    const bounds=new THREE.Box3().setFromPoints(vertices);
    if(bounds.max.y<=floor+SITE_STEP_CLEARANCE||bounds.min.y>=floor+profile.height)continue;
    triangles.push({triangle:new THREE.Triangle(...vertices),bounds,part:assembly.name});
   }
  });
 }
 const probe=(from,to=from)=>{
  const box=new THREE.Box3(
   new THREE.Vector3(Math.min(from[0],to[0])-profile.halfWidth,floor+SITE_STEP_CLEARANCE,Math.min(from[1],to[1])-profile.halfWidth),
   new THREE.Vector3(Math.max(from[0],to[0])+profile.halfWidth,floor+profile.height,Math.max(from[1],to[1])+profile.halfWidth));
  for(const t of triangles)if(box.intersectsBox(t.bounds)&&box.intersectsTriangle(t.triangle))return t.part;
  return null;
 };
 const cells=[];
 for(let z=0;z<8;z++)for(let x=0;x<8;x++){
  const center=[x-3.5,z-3.5],reason=probe(center);
  cells.push({x,z,center,passable:!reason,reason});
 }
 const byKey=new Map(cells.map(c=>[key(c.x,c.z),c])),links=[],entries=[];
 for(const cell of cells){
  if(!cell.passable)continue;
  for(const [dx,dz]of [[1,0],[0,1]]){
   const next=byKey.get(key(cell.x+dx,cell.z+dz));
   if(next?.passable&&!probe(cell.center,next.center))links.push({from:[cell.x,cell.z],to:[next.x,next.z]});
  }
  for(const [edge,condition,dx,dz]of [['west',cell.x===0,-1,0],['east',cell.x===7,1,0],['north',cell.z===0,0,-1],['south',cell.z===7,0,1]]){
   if(condition&&!probe(cell.center,[cell.center[0]+dx,cell.center[1]+dz]))entries.push({cell:[cell.x,cell.z],edge});
  }
 }
 // Reachability prevents an isolated clear pocket being advertised as a route.
 const reachable=new Set(entries.map(e=>key(...e.cell))),queue=[...reachable],adj=new Map();
 for(const link of links){const a=key(...link.from),b=key(...link.to);if(!adj.has(a))adj.set(a,[]);if(!adj.has(b))adj.set(b,[]);adj.get(a).push(b);adj.get(b).push(a);}
 for(let i=0;i<queue.length;i++)for(const next of adj.get(queue[i])||[])if(!reachable.has(next)){reachable.add(next);queue.push(next);}
 for(const c of cells)c.reachable=c.passable&&reachable.has(key(c.x,c.z));
 return {
  status:'proposed-standing-clearance',profile:{...profile},surfaceHeight:floor,stepClearance:SITE_STEP_CLEARANCE,
  width:8,depth:8,cellOrigin:[-3.5,-3.5],placementOriginOffset:[3.5,3.5],
  rows:Array.from({length:8},(_,z)=>cells.filter(c=>c.z===z).map(c=>c.reachable?'.':c.passable?'o':'#').join('')),
  legend:{'.':'clear and reachable','#':'equipment / rubble blocks standing clearance',o:'clear but disconnected'},
  cells,links,entries,
 };
}
