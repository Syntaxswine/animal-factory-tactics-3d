import * as T from './vendor/three.module.js';
import {naturalArchLayout} from './natural-arch-data.js';

const V=(p=[0,0,0])=>new T.Vector3(...p),clamp=T.MathUtils.clamp;
const panels={front:[0,0],rear:[1,0],underside:[0,1],top:[1,1],end:[1,0]};
const noise=(x,y,z)=>Math.sin(x*1.83+y*.73+z*1.11)*.55+Math.sin(x*.71-y*1.37+z*2.17)*.28;
export function archPaintUV(role,u,v){const [c,r]=panels[role],pad=.007;return [c*.5+pad+clamp(u,0,1)*(.5-2*pad),(1-r)*.5+pad+clamp(v,0,1)*(.5-2*pad)];}

// A single closed rock volume, rather than intersecting boulders or an open
// facade. The author mesh is reduced by sampling the same constrained form:
// contacts and the level walking strip survive the reduction exactly.
export function naturalArchGeometry(kind='large',{detail='runtime'}={}){
 if(!['runtime','author'].includes(detail))throw Error('Unknown arch detail');
 const layout=naturalArchLayout(kind),{width:w,opening:c,depth:d,height:H,spring,crown}=layout;
 const section=[];
 const add=(x,y,role)=>section.push({x,y,role});
 add(-w/2,0,'end');
 for(let j=1;j<=6;j++){const t=j/6,inset=.57*Math.exp(-(((t-.40)/.24)**2))+.13*Math.exp(-(((t-.80)/.10)**2));add(-w/2+(j===6?0:inset*(kind==='large'?1:.65)),H*t,'end');}
 for(let j=1;j<=24;j++)add(-w/2+w*j/24,H,'top');
 for(let j=5;j>=0;j--){const t=j/6,inset=.47*Math.exp(-(((t-.25)/.20)**2))+.16*Math.exp(-(((t-.69)/.15)**2));add(w/2-(j===0?0:inset*(kind==='large'?1:.65)),H*t,'end');}
 add(c/2,0,'underside');
 const undercut=[0,.2,.4,.6,.85,1];
 for(let j=1;j<undercut.length;j++)add(c/2+(j===5?0:.23),spring*undercut[j],'end');
 for(let j=1;j<=24;j++){const x=c/2-c*j/24,u=Math.abs(x)/(c/2);add(x,spring+(crown-spring)*Math.pow(Math.max(0,1-u*u),.68),'underside');}
 for(let j=4;j>=0;j--)add(-c/2-(j===0?0:.23),spring*undercut[j],'end');
 const N=section.length,sub=detail==='author'?3:1,depths=[-d/2,-1.1,0,1.1,d/2],stations=[];
 for(let i=0;i<depths.length-1;i++)for(let j=0;j<sub;j++)stations.push(T.MathUtils.lerp(depths[i],depths[i+1],j/sub));stations.push(d/2);
 const capDepth=(x,y,side)=>{
  const gaussian=(center,width)=>Math.exp(-(((x-center)/width)**2)),front=side>0;
  const coves=front?gaussian(-w*.24,w*.12)+.72*gaussian(w*.27,w*.15):.8*gaussian(-w*.05,w*.16)+gaussian(w*.38,w*.10);
  const shoulder=(kind==='large'?.48:.27)*coves*T.MathUtils.smoothstep(y,1.85,H);
  const corner=(kind==='large'?.32:.20)*T.MathUtils.smoothstep(Math.abs(x),w/2-.9,w/2)*Math.sin(clamp(y/H,0,1)*Math.PI)**2;
  return Math.max(1.18,d/2-.035-corner-shoulder);
 };
 const point=(p,z)=>{
  const edge=T.MathUtils.smoothstep(Math.abs(z),1.1,d/2),end=Math.abs(p.x)>=w/2-.001;
  let x=p.x,y=p.y,zz=z;
  if(p.y===H){
   // Rock rims can rise beside the route, breaking a manufactured lintel's
   // straight skyline while keeping the entire two-tile path level and clear.
   const rim=(kind==='large'?.32:.24)*(.65+.65*Math.sin(p.x*1.21+z*.55)+.35*Math.sin(p.x*2.71-z*.8));
   y+=edge*rim;if(!end)x+=edge*(kind==='small'?.04:.09)*noise(p.x,0,z);else x-=Math.sign(x)*edge*(kind==='small'?.10:.20);
  }
  else if(p.y>0){
   if(Math.abs(p.x)<=c/2+.24){y+=(kind==='small'?.008:.065)*noise(p.x,p.y,z);x+=Math.sign(p.x)*edge*(kind==='small'?.025:.065)*Math.max(0,noise(p.x,0,z));}
   else {
    // Broad, asymmetric erosion bites continue around the outer corners.
    const corner=(kind==='large'?.28:.13)*edge*Math.sin(p.y/H*Math.PI)*(.7+.3*Math.sin(z*1.9+p.y));
    x-=Math.sign(p.x)*(corner+.035*noise(p.x,p.y,z));
   }
  }
  // Warp the whole shoulder, including author-mesh intermediate stations.
  // Moving only its lip can fold the denser mesh back through an inner ring.
  if(Math.abs(z)>1.1)zz=Math.sign(z)*T.MathUtils.lerp(1.1,capDepth(x,y,Math.sign(z)),(Math.abs(z)-1.1)/(d/2-1.1));
  // Exact, two-tile wide end connections and a continuous flat top.
  if(p.y===H&&Math.abs(z)<=1.1){x=p.x;y=H;zz=z;}
  return [x,y,zz];
 };
 const ring=stations.map(z=>section.map(p=>point(p,z))),position=[],uv=[],color=[],roles=[];
 const project=(p,role)=>role==='front'||role==='rear'?[(p[0]+w/2)/w,p[1]/(H+.6)]:role==='end'?[(p[2]+d/2)/d,p[1]/(H+.6)]:[(p[0]+w/2)/w,(p[2]+d/2)/d];
 function triangle(a,b,c,role,out){
  const normal=V(b).sub(V(a)).cross(V(c).sub(V(a)));if(normal.lengthSq()<1e-14)return;
  if(normal.dot(V(out))<0)[b,c]=[c,b];
  for(const p of [a,b,c]){
   position.push(...p);const paintRole=kind==='small'&&role==='front'?'rear':kind==='small'&&role==='rear'?'front':role;uv.push(...archPaintUV(paintRole,...project(p,role)));
   const tone=.97+.035*noise(p[0],p[1],p[2]);color.push(tone,tone,tone);roles.push(Object.keys(panels).indexOf(role));
  }
 }
 for(let j=0;j<stations.length-1;j++)for(let i=0;i<N;i++){
  const next=(i+1)%N,a=ring[j][i],b=ring[j][next],c1=ring[j+1][next],e=ring[j+1][i],p=section[i],q=section[next];
  const out=[-(q.y-p.y),q.x-p.x,0],role=q.role;
  triangle(a,b,c1,role,out);triangle(a,c1,e,role,out);
 }
 function faceDepth(x,y,sign,outline){
  let distance=Infinity;
  for(let i=0;i<outline.length;i++){const p=outline[i],q=outline[(i+1)%outline.length],dx=q[0]-p[0],dy=q[1]-p[1],t=clamp(((x-p[0])*dx+(y-p[1])*dy)/(dx*dx+dy*dy),0,1);distance=Math.min(distance,Math.hypot(x-p[0]-t*dx,y-p[1]-t*dy));}
  // One shallow continuous relief field, fading at the outline. This avoids
  // assigning a separate dent to every thin triangulation fan.
  const relief=.11*(1-Math.exp(-distance/.6))*(.78+.22*Math.sin(x*.8+y*1.1));return capDepth(x,y,sign)-relief;
 }
 function cap(a,b,c,role,sign,levels,outline){
  if(!levels){triangle(a,b,c,role,[0,0,sign]);return;}
  const area=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])),longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]));
  if(area/longest<.003){triangle(a,b,c,role,[0,0,sign]);return;}
  const mid=a.map((x,i)=>(x+b[i]+c[i])/3);mid[2]=sign*faceDepth(mid[0],mid[1],sign,outline);
  cap(a,b,mid,role,sign,levels-1,outline);cap(b,c,mid,role,sign,levels-1,outline);cap(c,a,mid,role,sign,levels-1,outline);
 }
 for(const [j,sign,role]of [[0,-1,'rear'],[stations.length-1,1,'front']]){
  // Triangulate the actual eroded lip, not its undeformed author outline:
  // the raised rim changes concavity and an old diagonal can cross the face.
  const triangles=T.ShapeUtils.triangulateShape(ring[j].map(p=>new T.Vector2(p[0],p[1])),[]);
  for(const ids of triangles)cap(...ids.map(i=>ring[j][i]),role,sign,detail==='author'?2:1,ring[j]);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setAttribute('surface',new T.Float32BufferAttribute(roles,1));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();
 // A shared broad-face normal keeps the painterly strata quiet: lighting
 // must not reveal the cap triangulator's long slivers. The eroded silhouette,
 // ledges, ends and soffit retain their geometric normals and cast shadows.
 const normals=g.attributes.normal;
 for(let i=0;i<position.length/3;i++)if(roles[i]<=1)normals.setXYZ(i,0,0,roles[i]===0?1:-1);
 g.userData={kind,detail,layout,triangles:position.length/9,construction:'Closed constrained rock volume; author-to-runtime surface resampling preserves the opening and top contacts.'};
 g.userData.minPassageCeiling=Math.min(...layout.passage.map(([x,,z])=>naturalArchUnderside(g,x,z)).filter(Number.isFinite));return g;
}

// Lowest actual downward-facing triangle above an X/Z point. This uses the
// mesh, including its uneven underside, rather than only an apex measurement.
export function naturalArchUnderside(geometry,x,z){
 const a=geometry.attributes.position;let height=Infinity;
 for(let i=0;i<a.count;i+=3){
  const A=V().fromBufferAttribute(a,i),B=V().fromBufferAttribute(a,i+1),C=V().fromBufferAttribute(a,i+2),n=B.clone().sub(A).cross(C.clone().sub(A));
  if(n.y>=-1e-7)continue;
  const den=(B.z-C.z)*(A.x-C.x)+(C.x-B.x)*(A.z-C.z);if(Math.abs(den)<1e-9)continue;
  const u=((B.z-C.z)*(x-C.x)+(C.x-B.x)*(z-C.z))/den,v=((C.z-A.z)*(x-C.x)+(A.x-C.x)*(z-C.z))/den,t=1-u-v;
  if(Math.min(u,v,t)<-1e-7)continue;const y=u*A.y+v*B.y+t*C.y;if(y>.1)height=Math.min(height,y);
 }return Number.isFinite(height)?height:null;
}

export function createNaturalArchLibrary(atlas){
 if(atlas){atlas.colorSpace=T.SRGBColorSpace;atlas.anisotropy=8;atlas.minFilter=T.LinearMipmapLinearFilter;}
 const material=new T.MeshStandardMaterial({map:atlas||null,roughness:1,vertexColors:true}),grey=new T.MeshStandardMaterial({color:0xaaa797,roughness:1});
 // Keep the broad painted faces quiet without increasing scene-wide shadow
 // bias. All rock still casts shadows; ledges, ends and the underside receive
 // them normally, including character contact shadows on the upper route.
 for(const m of [material,grey]){
  m.onBeforeCompile=shader=>{
   shader.vertexShader='attribute float surface;\nvarying float vArchSurface;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvArchSurface = surface;');
   shader.fragmentShader='varying float vArchSurface;\n'+shader.fragmentShader.replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin.replaceAll('receiveShadow','(receiveShadow && vArchSurface > 1.5)'));
  };
  m.customProgramCacheKey=()=> 'natural-arch-painted-faces-v1';
 }
 const geometries=new Map(),instances=new Set();let disposed=false;
 function build(kind='large',{detail='runtime'}={}){
  if(disposed)throw Error('Arch library disposed');const key=kind+':'+detail;
  if(!geometries.has(key))geometries.set(key,naturalArchGeometry(kind,{detail}));
  const geometry=geometries.get(key),root=new T.Group(),mesh=new T.Mesh(geometry,material);root.name='Natural rock arch · '+kind;mesh.name='Closed painted rock';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);instances.add(root);
  return {root,mesh,layout:geometry.userData.layout,remove(){instances.delete(root);root.removeFromParent();}};
 }
 return {build,setStyle({grey:plain=false,wire=false}={}){for(const root of instances)root.children[0].material=plain?grey:material;material.wireframe=grey.wireframe=wire;},dispose(){if(disposed)return;disposed=true;for(const root of instances)root.removeFromParent();instances.clear();for(const g of geometries.values())g.dispose();geometries.clear();material.dispose();grey.dispose();}};
}
