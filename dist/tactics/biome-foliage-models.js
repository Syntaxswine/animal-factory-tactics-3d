import * as T from './vendor/three.module.js';
import {foliageModel} from './foliage-models.js';
import {environmentGeometries} from './environment-geometry.js';
import {BIOME_PLANTS,MATURE_TREE_SCALE} from './biome-foliage-data.js';

// Leaves are folded ribbons with a curved spine. Their veins/leaflets are paint.
function leafGeometry(frond=false){
 const p=[],uv=[],n=frond?7:4,point=(t,side)=>{const w=Math.pow(Math.sin(t*Math.PI),.8)*(frond?.42:.5),y=frond?Math.sin(t*Math.PI)*.27-t*t*.42:Math.sin(t*Math.PI)*.18-t*t*.08;return [side*w,y-Math.abs(side)*w*.17,t];};
 const emit=(a,b,c)=>{const values=[a,b,c].map(([t,s])=>new T.Vector3(...point(t,s)));if(new T.Vector3().subVectors(values[1],values[0]).cross(new T.Vector3().subVectors(values[2],values[0])).lengthSq()<1e-12)return;for(const [t,s]of [a,b,c]){p.push(...point(t,s));uv.push((s+1)/2,t);}};
 for(let i=0;i<n;i++){const a=i/n,b=(i+1)/n;for(const s of [-1,1]){emit([a,0],[b,0],[a,s]);emit([a,s],[b,0],[b,s]);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
export function biomePlantParts(id,variant=0){
 if(!BIOME_PLANTS[id])throw Error('Unknown biome plant: '+id);
 if(!Number.isInteger(variant)||variant<0||variant>2)throw Error('Plant variant must be 0, 1 or 2');
 const parts=[],add=(shape,paint,position,size,rotation=[0,0,0])=>parts.push({shape,paint,position,size,rotation}),branch=(a,b,w,paint='bark')=>parts.push({shape:'taper',paint,a,b,size:[w,Math.hypot(...b.map((x,i)=>x-a[i])),w]}),phase=variant*.71;
 const crown=(p,s,paint='leaves')=>add('biome-crown',paint,p,s,[0,phase+.3,0]);
 const base=(height=1.6,width=.22)=>{branch([0,.05,0],[.06,height,0],width);for(let i=0;i<4;i++){const a=i*Math.PI/2+phase;if(['jungle-canopy','wetland-cypress'].includes(id))add('biome-buttress','bark',[0,0,0],[.16,id==='jungle-canopy'?.75:.48,.48],[0,a,0]);else branch([0,.24,0],[Math.cos(a)*.36,.03,Math.sin(a)*.36],width*.58);}};
 const leaf=(p,length,width,angle,paint='frond',frond=false,tilt=0)=>add(frond?'biome-frond':'biome-leaf',paint,p,[width,length,length],[tilt,angle,0]);
 const tuft=(paint='blade',height=.55,count=9)=>{for(let i=0;i<count;i++){const a=i*2.399+phase,h=height*(.7+(i%4)*.1);leaf([Math.cos(a)*.1,0,Math.sin(a)*.1],h,.10,a,paint,false,-.9-(i%3)*.18);}};
 if(id.startsWith('temperate-')&&BIOME_PLANTS[id].category==='tree'){
  const kind=id==='temperate-pine'?'tree-pine':'tree-broadleaf';
  for(const p of foliageModel(kind))parts.push({shape:p.shape,paint:p.material==='bark'?'bark':p.material==='pine'?'pine':'leaves',position:p.center,size:p.size,rotation:p.rotation});
 }else if(id==='jungle-canopy'){
  base(2.1,.32);for(let i=0;i<4;i++){const a=i*1.57+phase,tip=[Math.cos(a)*.76,2.25+(i%2)*.17,Math.sin(a)*.62];branch([.04,1.3,0],tip,.15);crown([tip[0],tip[1]+.16,tip[2]],[1.55,.72,1.42],'jungle');}
  crown([0,2.65,0],[1.85,.70,1.65],'jungle');for(const a of [.4,2.7])branch([Math.cos(a)*.95,2.4,Math.sin(a)*.7],[Math.cos(a)*.98,1.5,Math.sin(a)*.73],.025,'moss');
 }else if(id==='jungle-palm'){
  const points=[[0,0,0],[.05,.7,0],[.19,1.5,.04],[.29,2.35,.06]];for(let i=0;i<3;i++)branch(points[i],points[i+1],.20-i*.025);
  crown([.29,2.34,.06],[.3,.35,.3],'jungle');for(let i=0;i<10;i++)leaf([.29,2.35+(i%2)*.1,.06],1.5+(i%3)*.1,.60,i*Math.PI/5+phase,'frond',true,(i%3-1)*.12);
 }else if(id==='snow-spruce'){
  base(2.8,.18);for(let i=0;i<5;i++){const width=1.50-i*.25;add('pine-tier','snowPine',[0,.8+i*.49,0],[width,.93,width*.92],[0,phase+i*.6,0]);}
 }else if(id==='snow-alpine-pine'){
  base(2.4,.18);for(let i=0;i<7;i++){const a=i*2.4+phase,r=.72-i*.065,tip=[Math.cos(a)*r,.8+i*.24,Math.sin(a)*r];branch([.03,tip[1]-.27,0],tip,.075);crown(tip,[.9-i*.045,.33,.72-i*.025],'snowPine');crown([tip[0],tip[1]+.13,tip[2]],[.58-i*.022,.13,.48],'snow');}add('pine-tier','snowPine',[0,2.45,0],[.52,.58,.48],[0,phase,0]);
 }else if(id==='dry-acacia'){
  base(1.2,.20);for(let i=0;i<4;i++){const a=i*1.6+phase,tip=[Math.cos(a)*.85,1.95+(i%2)*.08,Math.sin(a)*.65];branch([.02,.9,0],tip,.1);crown([tip[0],tip[1]+.04,tip[2]],[1.55,.33,1.20],'dry');}crown([0,2.16,0],[1.45,.28,1.25],'dry');
 }else if(id==='dry-scrub-tree'){
  branch([0,0,0],[-.16,.7,.05],.22);branch([-.16,.7,.05],[.12,1.32,0],.15);for(let i=0;i<5;i++){const a=i*2.4+phase,tip=[Math.cos(a)*.55,1.25+(i%3)*.2,Math.sin(a)*.45];branch([-.08,.65,0],tip,.09);crown(tip,[.75,.56,.66],'dry');}
 }else if(id==='wetland-cypress'){
  base(2.6,.24);add('taper','bark',[0,.25,0],[.44,.5,.4]);for(let i=0;i<3;i++)crown([.03,1.8+i*.43,0],[.88-i*.19,.95,.80-i*.16],'cypress');for(let i=0;i<7;i++){const a=i*2.4+phase,r=.60-i*.045,tip=[Math.cos(a)*r,1.0+i*.23,Math.sin(a)*r];branch([0,tip[1]-.13,0],tip,.065);crown(tip,[.64,.62,.52],'cypress');}
 }else if(id==='wetland-willow'){
  base(1.95,.28);for(let i=0;i<7;i++){const a=i*Math.PI*2/7+phase,tip=[Math.cos(a)*.86,2.0+(i%2)*.1,Math.sin(a)*.73];branch([.04,1.25,0],tip,.08);crown([tip[0],1.52+(i%3)*.08,tip[2]],[.62,1.48,.60],'wet');}crown([0,2.24,0],[2.15,.58,1.92],'wet');
 }else if(id==='jungle-broadleaf'||id==='wetland-marsh-leaves'){
  for(let i=0;i<8;i++){const a=i*2.4+phase;leaf([0,.02,0],.66+(i%3)*.13,id==='jungle-broadleaf'?.52:.65,a,id==='jungle-broadleaf'?'jungle':'wet',false,-.7-(i%3)*.2);}
 }else if(id==='jungle-fern'){
  for(let i=0;i<9;i++)leaf([0,.03,0],.70+(i%3)*.1,.34,i*2.4+phase,'frond',true,-.55);
 }else if(id==='temperate-shrub'||id==='dry-shrub'||id==='snow-scrub'){
  const paint=id==='dry-shrub'?'dry':id==='snow-scrub'?'snowPine':'leaves';
  for(let i=0;i<3;i++){const a=i*2.1+phase;branch([0,0,0],[Math.cos(a)*.2,.37,Math.sin(a)*.2],.025);crown([Math.cos(a)*.18,.36,Math.sin(a)*.18],[.6,.56,.55],paint);if(id==='snow-scrub')crown([Math.cos(a)*.18,.61,Math.sin(a)*.18],[.4,.10,.38],'snow');}
 }else if(id==='wetland-reeds'){
  tuft('blade',.70,9);for(let i=0;i<5;i++){const a=i*2.4+phase,x=Math.cos(a)*.2,z=Math.sin(a)*.2,h=.65+(i%3)*.14;branch([x,0,z],[x+.02,h,z],.018,'moss');add('cylinder','bark',[x+.02,h,z],[.05,.16,.05]);}
 }else tuft(id==='dry-tussock'||id==='snow-grass'?'straw':'blade',id==='dry-tussock'?.72:.50,id==='snow-grass'?5:12);
 return parts;
}

export function createBiomePlantFactory(materials){
 const geometries=environmentGeometries();geometries['biome-leaf']=leafGeometry();geometries['biome-frond']=leafGeometry(true);
 const crown=new T.SphereGeometry(.5,10,6),cp=crown.attributes.position;for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),a=Math.atan2(z,x),r=1+.1*Math.sin(a*3+.3)+.04*Math.cos(a*5-y*7);cp.setXYZ(i,x*r,y*(1+.08*Math.sin(a*3)),z*r);}crown.computeVertexNormals();geometries['biome-crown']=crown;
 const buttress=new T.BufferGeometry(),vertices=[-.5,0,0,.5,0,0,-.18,1,0,.18,1,0,-.05,0,1,.05,0,1];buttress.setAttribute('position',new T.Float32BufferAttribute(vertices,3));buttress.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,1,0,0,1,0],2));buttress.setIndex([0,2,1,1,2,3,0,4,2,1,3,5,2,4,3,3,4,5,0,1,4,1,5,4]);buttress.computeVertexNormals();geometries['biome-buttress']=buttress;let disposed=false;
 function create(id,{variant=0,mature=false,grey=false}={}){
  if(disposed)throw Error('Plant factory is disposed');const info=BIOME_PLANTS[id];if(!info)throw Error('Unknown biome plant: '+id);
  const root=new T.Group();root.name=id;const parts=biomePlantParts(id,variant);
  for(const p of parts){const material=grey?materials.grey:materials[p.paint];if(!material)throw Error('Missing plant paint: '+p.paint);const mesh=new T.Mesh(geometries[p.shape],material);mesh.name=p.paint+':'+p.shape;mesh.scale.fromArray(p.size);if(p.a){mesh.position.fromArray(p.a).add(new T.Vector3().fromArray(p.b)).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3().fromArray(p.b).sub(new T.Vector3().fromArray(p.a)).normalize());}else{mesh.position.fromArray(p.position);mesh.rotation.set(...p.rotation,'YXZ');}mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
  root.rotation.y=variant*.45;
  // Ground the vertices inside the root so ordinary tile placement cannot
  // overwrite a correction stored in root.position. Rotated boxes overestimate
  // the underside of curved fronds and used to leave them visibly floating.
  root.updateMatrixWorld(true);const before=new T.Box3().setFromObject(root,true);
  for(const child of root.children)child.position.y-=before.min.y;
  const scale=mature&&info.category==='tree'?MATURE_TREE_SCALE:1;root.scale.setScalar(scale);root.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(root,true);let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
  root.userData={id,biome:info.biome,category:info.category,variant,mature:info.category==='tree'&&mature,triangles,anchor:[0,0,0],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},materials:[...new Set(parts.map(p=>p.paint))],note:'Visual bounds only; gameplay owns passability and collision.'};return root;
 }
 return {create,geometries,dispose(){if(disposed)return;disposed=true;for(const g of new Set(Object.values(geometries)))g.dispose();}};
}
