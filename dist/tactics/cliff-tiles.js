import * as T from './vendor/three.module.js';
import {shoreField,shoreMask,SHORE_VARIANTS} from './shore-tiles.js';
import {CLIFF_HEIGHT,CLIFF_SETS,cliffMaterials} from './cliff-models.js';

// Identical corner bits, scalar field and A/B/C variants to the river shoreline kit.
export const CLIFF_TILE_VARIANTS=SHORE_VARIANTS;
export const CLIFF_TILE_RESOLUTION=8;
export const CLIFF_LANDSCAPES={
 plateau:(x,z)=>((x-5)/4.2)**2+((z-4)/3.3)**2<1,
 gorge:(x,z)=>x>0&&x<10&&z>0&&z<8&&Math.abs(x-(5+1.1*Math.sin(z*.95)))>1.05,
 coast:(x,z)=>x<5+.85*Math.sin(z*1.1)
};
const hash=(x,z)=>{const q=Math.sin(x*127.1+z*311.7)*43758.5453;return q-Math.floor(q);};
const vertexKey=p=>`${p.x.toFixed(7)},${p.z.toFixed(7)}`;
export function cliffCrestHeight(set,field,x,z){
 if(!CLIFF_SETS.includes(set))throw Error('Unknown cliff set');
 if(set==='ledge')return CLIFF_HEIGHT;
 // The broken crown now falls to 0.60 at the exposed lip. The same world-space
 // crown field continues through tile seams; no tile-local peak normalization.
 const rise=Math.min(1,Math.max(0,field)/.78);
 const ix=Math.floor(x),iz=Math.floor(z),u=x-ix,v=z-iz;
 const crest=(a,b)=>(a*3+b*5)%11===0?1:.18+.65*hash(a,b);
 const a=crest(ix,iz),b=crest(ix+1,iz),c=crest(ix,iz+1),d=crest(ix+1,iz+1);
 const crown=u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
 return .60+rise*(.40+(CLIFF_HEIGHT-1)*crown);
}
function validateTile(t){if(!Number.isInteger(t.x)||!Number.isInteger(t.z)||!Number.isInteger(t.mask)||t.mask<0||t.mask>15||!Number.isInteger(t.variant)||t.variant<0||t.variant>=SHORE_VARIANTS)throw Error('Invalid cliff tile');}
export function cliffLandscapeTiles(layout='plateau',variant=0){
 if(!Object.hasOwn(CLIFF_LANDSCAPES,layout)||!Number.isInteger(variant)||variant<0||variant>=SHORE_VARIANTS)throw Error('Invalid cliff landscape');
 const tiles=[];for(let z=0;z<8;z++)for(let x=0;x<10;x++)tiles.push({x:x-5,z:z-4,mask:shoreMask(CLIFF_LANDSCAPES[layout],x,z),variant:(x*7+z*11+variant)%SHORE_VARIANTS});return tiles;
}

// Clip a fine triangulation to the river's positive (land) field. Welding the
// entire patch before making skirts removes internal walls and duplicate seams.
export function cliffTileGeometry(set,tiles){
 if(!CLIFF_SETS.includes(set)||!Array.isArray(tiles))throw Error('Invalid cliff terrain');
 const occupied=new Map();for(const t of tiles){validateTile(t);const k=`${t.x},${t.z}`;if(occupied.has(k))throw Error('Duplicate cliff tile');occupied.set(k,t);}
 for(const t of tiles)for(const [dx,dz,a,b]of [[1,0,[2,4],[1,8]],[0,1,[8,4],[1,2]]]){const next=occupied.get(`${t.x+dx},${t.z+dz}`);if(next&&a.some((bit,i)=>!!(t.mask&bit)!==!!(next.mask&b[i])))throw Error('Mismatched cliff corner bits');}
 const points=new Map(),caps=[],N=CLIFF_TILE_RESOLUTION;
 function save(p){const key=vertexKey(p);if(!points.has(key))points.set(key,{x:p.x,z:p.z,y:cliffCrestHeight(set,Math.max(0,p.f),p.x,p.z),key});return points.get(key);}
 function clip(triangle){
  const out=[];for(let i=0;i<3;i++){const a=triangle[i],b=triangle[(i+1)%3],ia=a.f>=0,ib=b.f>=0;if(ia)out.push(a);if(ia!==ib){const t=a.f/(a.f-b.f);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,f:0});}}
  const unique=out.filter((p,i)=>!out.slice(0,i).some(q=>vertexKey(p)===vertexKey(q))).map(save);
  for(let i=1;i<unique.length-1;i++){const a=unique[0],b=unique[i],c=unique[i+1],area=(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);if(Math.abs(area)>1e-10)caps.push(area>0?[a,c,b]:[a,b,c]);}
 }
 for(const t of tiles){if(!t.mask)continue;for(let j=0;j<N;j++)for(let i=0;i<N;i++){
  const at=(a,b)=>({x:t.x+a/N,z:t.z+b/N,f:shoreField(t.mask,a/N,b/N,t.variant)}),a=at(i,j),b=at(i+1,j),c=at(i+1,j+1),d=at(i,j+1);clip([a,b,c]);clip([a,c,d]);
 }}
 const boundary=new Map();for(const triangle of caps)for(let i=0;i<3;i++){const a=triangle[i],b=triangle[(i+1)%3],k=[a.key,b.key].sort().join('|');if(boundary.has(k))boundary.delete(k);else boundary.set(k,[a,b]);}
 const positions=[[],[]],colors=[[],[]];
 function tri(a,b,c,material=0){const xyz=[...a,...b,...c],centroid=[(a[0]+b[0]+c[0])/3,(a[2]+b[2]+c[2])/3];positions[material].push(...xyz);const tint=new T.Color(material?0x898459:0xa5997e).multiplyScalar(.86+.18*hash(...centroid));for(let i=0;i<3;i++)colors[material].push(tint.r,tint.g,tint.b);}
 const p3=p=>[p.x,p.y,p.z];for(const [a,b,c]of caps){tri(p3(a),p3(b),p3(c),set==='ledge'?1:0);tri([a.x,0,a.z],[c.x,0,c.z],[b.x,0,b.z]);}
 // Shared per-vertex normals preserve a watertight skirt even at curved corners.
 const normals=new Map();for(const [a,b]of boundary.values()){const n=[b.z-a.z,a.x-b.x];for(const p of [a,b]){const q=normals.get(p.key)||[0,0];q[0]+=n[0];q[1]+=n[1];normals.set(p.key,q);}}
 function ring(p,i){const f=i/5,n=normals.get(p.key),length=Math.hypot(...n)||1;
  // At a patch crop, keep its edge on the exact tile plane for neighboring chunks.
  const tileEdge=Math.abs(p.x-Math.round(p.x))<1e-7||Math.abs(p.z-Math.round(p.z))<1e-7;
  const recess=tileEdge?0:Math.sin(Math.PI*f)*(.025+.035*hash(p.x+i,p.z));return [p.x+n[0]/length*recess,p.y*f,p.z+n[1]/length*recess];}
 for(const [a,b]of boundary.values())for(let i=0;i<5;i++){const aa=ring(a,i),bb=ring(b,i),cc=ring(b,i+1),dd=ring(a,i+1);tri(aa,bb,cc);tri(aa,cc,dd);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...positions[0],...positions[1]],3));g.setAttribute('color',new T.Float32BufferAttribute([...colors[0],...colors[1]],3));if(positions[0].length)g.addGroup(0,positions[0].length/3,0);if(positions[1].length)g.addGroup(positions[0].length/3,positions[1].length/3,1);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 g.userData={set,tiles:tiles.map(t=>({...t})),capTriangles:caps.length,boundarySegments:boundary.size,height:CLIFF_HEIGHT,climbable:set==='ledge',rim:[...boundary.values()].map(([a,b])=>({a:p3(a),b:p3(b)}))};return g;
}
export function createCliffTiles(set,tiles){
 const geometry=cliffTileGeometry(set,tiles),materials=cliffMaterials(),root=new T.Group(),mesh=new T.Mesh(geometry,materials);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);let disposed=false;
 return {root,mesh,original:materials,dispose(){if(disposed)return;disposed=true;geometry.dispose();materials.forEach(m=>m.dispose());}};
}
