import * as T from './vendor/three.module.js';
import {siteTriangles,meshFromTriangles,shardTriangles} from './site-destruction-geometry.js';

export const SITE_DESTRUCTION_DURATION=7.6;
export const SITE_DESTRUCTION_KEYS=Object.freeze({
 radio:[{time:0,title:'Intact',note:'The hut and four mast footings stay in place.'},{time:.92,title:'Buckle',note:'The lower bays yield; the upper mast tears at the joint.'},{time:1.30,title:'Fold & separate',note:'Two lattice sections fall. A dish and aerial break away.'},{time:1.98,title:'Impact',note:'The lower mast and dish are down; the upper section lands.'},{time:2.8,title:'Fragments settle',note:'Small painted splinters land before fading.'},{time:7.6,title:'Wreck',note:'Folded lattice, a fallen dish and scattered debris remain.'}],
 radar:[{time:0,title:'Intact',note:'The dish sits above its platform and open trestle.'},{time:.9,title:'Supports fail',note:'The trestle folds; the yoke and ladder break apart.'},{time:1.4,title:'Dish drops',note:'A sector tears free as the reflector tips off its supports.'},{time:1.76,title:'Impact',note:'The platform lands; the reflector follows into the wreck.'},{time:2.6,title:'Fragments settle',note:'Ribs and fittings reach the ground before fading.'},{time:7.6,title:'Wreck',note:'The broken dish and platform rest on the unchanged slab.'}],
 sam:[{time:0,title:'Intact',note:'Two missiles sit on the raised launcher.'},{time:.70,title:'Launcher ruptures',note:'The lift arms fail and the rails twist.'},{time:.94,title:'Break apart',note:'A missile body, nose cone and rail section separate.'},{time:1.18,title:'Impact',note:'The rail and missile body land; the nose cone follows.'},{time:2.3,title:'Fragments settle',note:'Thin casing splinters land before fading.'},{time:7.6,title:'Wreck',note:'Torn rails remain on the mount; heavier debris stays.'}],
});
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
const mix=(a,b,t)=>a+(b-a)*t;
const rand=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const named=(root,name)=>root.getObjectByName(name);
const ancestor=(mesh,p)=>{for(let n=mesh;n;n=n.parent)if(p(n))return true;return false;};

// A reversible presentation rig. It borrows the approved endpoints and atlas,
// owns its cut geometry/materials, and never advances a mutable simulation.
export function createSiteDestruction(library,id){
 if(!SITE_DESTRUCTION_KEYS[id])throw RangeError('Unknown strategic site: '+id);
 const root=new T.Group();root.name=id+'-destruction';
 const intact=library.build(id).root,wreck=library.build(id,{state:'destroyed'}).root;
 const source=library.articulated(id),destination=library.articulated(id,{state:'destroyed'});
 const rig=new T.Group();rig.name='collapse';root.add(intact,rig,wreck);
 const geometries=new Set(),materials=new Set(),tracks=[],clouds=[],fixed=[];
 let disposed=false,time=0;
 const ownGeometry=g=>(geometries.add(g),g);
 const material=m=>{const copy=m.clone();copy.alphaHash=true;materials.add(copy);return copy;};
 const mesh=tris=>meshFromTriangles(tris,ownGeometry,material);
 const alpha=(g,value)=>{g.visible=value>1e-6;g.traverse(o=>{if(o.isMesh)o.material.opacity=value;});};
 const all=node=>siteTriangles(node);
 const frame=node=>node.matrixWorld.clone();
 const cut=(node,planes=[],exclude=()=>false,f=frame(node))=>siteTriangles(node,{frame:f,planes,exclude});
 const localData=(triangles,matrix)=>{
  const bounds=new T.Box3().setFromPoints(triangles.flatMap(t=>t.v.map(v=>v.p))),center=bounds.getCenter(V()),size=bounds.getSize(V());
  const centered=triangles.map(t=>({...t,v:t.v.map(v=>({...v,p:v.p.clone().sub(center)}))}));
  const group=mesh(centered),p=center.clone().applyMatrix4(matrix),q=new T.Quaternion();matrix.decompose(V(),q,V());
  return {group,p,q,size,triangles:centered,points:centered.flatMap(t=>t.v.map(v=>v.p.clone()))};
 };
 function paintBlend(m0,m1,amount){
  const m=material(m0);m.alphaHash=false;
  if(m0.map&&m1.map){
   m1.map.updateMatrix();
   m.onBeforeCompile=shader=>{
    shader.uniforms.damageAmount=amount;shader.uniforms.damageMap={value:m1.map};shader.uniforms.damageTransform={value:m1.map.matrix};
    shader.vertexShader='uniform mat3 damageTransform; varying vec2 vDamageUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvDamageUv=(damageTransform*vec3(uv,1.0)).xy;');
    shader.fragmentShader='uniform float damageAmount; uniform sampler2D damageMap; varying vec2 vDamageUv;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','diffuseColor *= mix(texture2D(map,vMapUv),texture2D(damageMap,vDamageUv),damageAmount);');
   };m.customProgramCacheKey=()=> 'site-fixed-paint-transition';
  }
  return m;
 }
 function solidMorph(a,b){
  const keyed=new Map(),counters=new Map(),amount={value:0},blends=new Map(),targets=new Map();
  for(const t of b.triangles)if(t.morphKey){if(!keyed.has(t.morphKey))keyed.set(t.morphKey,[]);keyed.get(t.morphKey).push(t);}
  const direct=a.triangles.length===b.triangles.length,exactKeys=a.triangles.every(t=>t.morphKey&&keyed.has(t.morphKey));
  // Subdivision preserves the intact surface exactly, but gives a straight
  // rail enough vertices to bend into its authored torn-tube profile.
  const aa=direct||exactKeys?a.triangles:shardTriangles(a.triangles,.30).flat();
  const shapes=b.triangles.map(t=>new T.Triangle(...t.v.map(v=>v.p))),ratio=V(...['x','y','z'].map(k=>b.size[k]/(a.size[k]||1)));
  const nearest=(p,triangles)=>{const q=V();let distance=Infinity,index=0;triangles.forEach((tri,i)=>{tri.closestPointToPoint(p,q);const d=q.distanceToSquared(p);if(d<distance){distance=d;index=i;}});return index;};
  const project=(p,shape,t,inset=0)=>{
   const best=shape.closestPointToPoint(p,V()),weights=shape.getBarycoord(best,V());
   const n=V(),uv=new T.Vector2();t.v.forEach((v,i)=>{const weight=weights.getComponent(i);n.addScaledVector(v.n,weight);uv.addScaledVector(v.uv,weight);});n.normalize();
   return {p:best.addScaledVector(n,-inset),n,uv,material:t.material};
  };
  const sample=(vertex,index)=>{
   const p=vertex.p.clone().multiply(ratio);
   return project(p,shapes[index],b.triangles[index],.00004);
  };
  const mixed=aa.map((t,i)=>{
   let target;
   if(t.morphKey&&keyed.has(t.morphKey)){const j=counters.get(t.morphKey)||0;target=keyed.get(t.morphKey)[j];counters.set(t.morphKey,j+1);}
   else if(direct)target=b.triangles[i];
   const face=target?0:nearest(t.v.reduce((p,v)=>p.add(v.p),V()).multiplyScalar(1/3).multiply(ratio),shapes);
   const vertices=target?target.v:t.v.map(v=>sample(v,face)),m1=target?.material??vertices[0].material,key=t.material.uuid+':'+m1.uuid;
   if(!blends.has(key)){const m=paintBlend(t.material,m1,amount);blends.set(key,{m,m0:t.material,m1});targets.set(m,[]);}
   const m=blends.get(key).m;targets.get(m).push(...vertices);return {...t,material:m};
  });
  a.group=meshFromTriangles(mixed,ownGeometry,m=>m);a.points=[];const buffers=[];
  a.group.traverse(o=>{if(!o.isMesh)return;const dst=targets.get(o.material),g=o.geometry,points=dst.map(()=>V());a.points.push(...points);
   buffers.push({g,points,src:{p:g.attributes.position.array.slice(),n:g.attributes.normal.array.slice(),uv:g.attributes.uv.array.slice()},dst});});
  // Different tessellations need both sides of the correspondence. Each new
  // target triangle starts inside ONE source face; retiring triangles end
  // inside ONE target face. This preserves complete opaque silhouettes and
  // avoids bridging empty space or adding missing rails in a final mesh swap.
  let fill=null;
  if(!direct&&!exactKeys){
   const sourceShapes=a.triangles.map(t=>new T.Triangle(...t.v.map(v=>v.p)));
   const start=b.triangles.map(t=>{
    const centroid=t.v.reduce((p,v)=>p.add(v.p),V()).multiplyScalar(1/3).divide(ratio),i=nearest(centroid,sourceShapes),s=a.triangles[i];
    return {material:s.material,v:t.v.map(v=>project(v.p.clone().divide(ratio),sourceShapes[i],s,.00004))};
   });
   const data={triangles:start,size:a.size};fill={data,update:solidMorph(data,b)};
  }
  let previousDeform,previousPaint;
  const update=(deform,paint)=>{
   if(deform===previousDeform&&paint===previousPaint)return;previousDeform=deform;previousPaint=paint;
   fill?.update(deform,paint);
   amount.value=paint;for(const {m,m0,m1}of blends.values())m.color.copy(m0.color).lerp(m1.color,paint);
   for(const {g,points,src,dst}of buffers){
    const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    dst.forEach((v,i)=>{for(let j=0;j<3;j++){p.array[i*3+j]=mix(src.p[i*3+j],v.p.getComponent(j),deform);n.array[i*3+j]=mix(src.n[i*3+j],v.n.getComponent(j),deform);}uv.setXY(i,mix(src.uv[i*2],v.uv.x,deform),mix(src.uv[i*2+1],v.uv.y,deform));points[i].fromBufferAttribute(p,i);});
    p.needsUpdate=n.needsUpdate=uv.needsUpdate=true;g.computeBoundingSphere();
   }
  };update.fill=fill;return update;
 }
 function minY(data,q,scale=V(1,1,1)){
  let y=Infinity;const p=V();for(const v of data.points)y=Math.min(y,p.copy(v).multiply(scale).applyQuaternion(q).y);return y;
 }
 function part(name,sourceTriangles,sourceFrame,target,{start=.65,hinge=0,pivot=null,ground=true,span=null}={}){
  const a=localData(sourceTriangles,sourceFrame),b=localData(cut(target),frame(target)),holder=new T.Group();holder.name=name;
  const morph=solidMorph(a,b);holder.add(a.group,b.group);if(morph.fill)holder.add(morph.fill.data.group);rig.add(holder);
  const endQ=b.q,startP=a.p.clone(),startQ=a.q.clone();
  // A short, accelerating hinge motion communicates the loss of support before
  // a fractured assembly becomes free debris.
  const hingeQ=a.q.clone().slerp(endQ,.20),pivotPoint=pivot?V(...pivot):a.p.clone();
  const hingeP=a.p.clone().sub(pivotPoint).applyQuaternion(hingeQ.clone().multiply(a.q.clone().invert())).add(pivotPoint);
  const flightP=hinge?hingeP:a.p,flightQ=hinge?hingeQ:a.q;
  const fallTime=span??Math.max(.38,Math.sqrt(2*Math.max(.40,flightP.y-b.p.y)/9.81));
  const impact=start+hinge+fallTime;
  const track={name,a,b,holder,start,impact,ground,pivot:pivotPoint.toArray(),floor:ground?.24:null,position:[],phase:'intact'};
  track.update=t=>{
   const h=smooth((t-start)/(hinge||1)),u=clamp((t-start-hinge)/fallTime);
   holder.position.copy(startP);holder.quaternion.copy(startQ);
   if(t>start&&hinge){holder.quaternion.copy(startQ).slerp(hingeQ,h*h);holder.position.copy(startP).sub(pivotPoint).applyQuaternion(holder.quaternion.clone().multiply(startQ.clone().invert())).add(pivotPoint);}
   if(t>=start+hinge){
    holder.position.copy(flightP).lerp(b.p,u);
    holder.position.y+=.5*9.81*fallTime*fallTime*u*(1-u);
    holder.quaternion.copy(flightQ).slerp(endQ,u**1.25);
   }
   // Major pieces remain fully opaque. Corresponding vertices deform into
   // the wreck; only their painted surface changes. Missing fittings shatter.
   morph(smooth((u-.20)/.80),smooth((u-.25)/.75));
   a.group.visible=t<impact+.16;b.group.visible=!a.group.visible;
   if(morph.fill)morph.fill.data.group.visible=t>=start&&t<impact+.16;
   if(ground&&t>start){
    let bottom=Infinity;
    if(a.group.visible)bottom=Math.min(bottom,minY(a,holder.quaternion,a.group.scale));
    if(morph.fill?.data.group.visible)bottom=Math.min(bottom,minY(morph.fill.data,holder.quaternion));
    if(b.group.visible)bottom=Math.min(bottom,minY(b,holder.quaternion));
    holder.position.y=Math.max(holder.position.y,.24-bottom);
   }
   if(t>=impact+.16){holder.position.copy(b.p);holder.quaternion.copy(endQ);a.group.visible=false;b.group.visible=true;}
   track.position=holder.position.toArray();track.phase=t<start?'supported':t<start+hinge?'buckling':t<impact?'falling':'settled';
  };
  tracks.push(track);return track;
 }
 function fragments(name,triangles,{birth=.7,size=.52,kick=1.2}={}){
  if(!triangles.length)return;
  const pieces=shardTriangles(triangles,size).map((tris,i)=>{
   const data=localData(tris,new T.Matrix4()),g=data.group;g.name=name+'-'+i;rig.add(g);
   const seed=i+name.length*31,velocity=V((rand(seed)-.5)*kick,rand(seed+1)*.6,(rand(seed+2)-.5)*kick);
   const axis=V(rand(seed+3)-.5,rand(seed+4)-.5,rand(seed+5)-.5).normalize(),spin=(rand(seed+6)-.5)*7;
   const rot=age=>new T.Quaternion().setFromAxisAngle(axis,age*spin);
   const height=age=>data.p.y+velocity.y*age-4.905*age*age+minY(data,rot(age));
   let lo=0,hi=2.5;for(let j=0;j<22;j++){const mid=(lo+hi)/2;if(height(mid)>.24)lo=mid;else hi=mid;}
   const hit=hi,land=data.p.clone().addScaledVector(velocity,hit);land.y=.24-minY(data,rot(hit));
   return {data,g,velocity,rot,hit,land,opacity:1,grounded:false};
  });
  const cloud={name,birth,pieces,update:t=>{
   for(const p of pieces){
    const age=Math.max(0,t-birth),air=Math.min(age,p.hit);p.g.position.copy(p.data.p).addScaledVector(p.velocity,air);p.g.position.y-=4.905*air*air;p.g.quaternion.copy(p.rot(air));
    if(age>=p.hit)p.g.position.copy(p.land);
    p.grounded=t>=birth+p.hit;p.opacity=1-smooth((t-Math.max(3.2,birth+p.hit+.65))/.9);alpha(p.g,p.opacity);
   }
  }};clouds.push(cloud);
 }
 function fixedPair(a,b){
  const aa=all(a),bb=all(b);
  // Matched fixed structures burn in place. Blending their painted material is
  // deliberately separate from the fragment fade; foundations never dissolve.
  if(aa.length===bb.length){
   const blends=new Map(),amount={value:0},targetPositions=new Map();
   const mixed=aa.map((t,i)=>{
    const target=bb[i],key=t.material.uuid+':'+target.material.uuid;
    if(!blends.has(key)){
     const m=material(t.material);m.alphaHash=false;
     const m0=t.material,m1=target.material;
     if(m0.map&&m1.map){
      m1.map.updateMatrix();
      m.onBeforeCompile=shader=>{
       shader.uniforms.damageAmount=amount;shader.uniforms.damageMap={value:m1.map};shader.uniforms.damageTransform={value:m1.map.matrix};
       shader.vertexShader='uniform mat3 damageTransform; varying vec2 vDamageUv;\n'+shader.vertexShader;
       shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvDamageUv=(damageTransform*vec3(uv,1.0)).xy;');
       shader.fragmentShader='uniform float damageAmount; uniform sampler2D damageMap; varying vec2 vDamageUv;\n'+shader.fragmentShader;
       shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','diffuseColor *= mix(texture2D(map,vMapUv),texture2D(damageMap,vDamageUv),damageAmount);');
      };
      m.customProgramCacheKey=()=> 'site-fixed-paint-transition';
     }
     blends.set(key,{m,m0,m1});targetPositions.set(m,[]);
    }
    const m=blends.get(key).m;targetPositions.get(m).push(...target.v.map(v=>v.p));return {...t,material:m};
   });
   const ga=meshFromTriangles(mixed,ownGeometry,m=>m);rig.add(ga);
   const buffers=[];ga.traverse(o=>{if(o.isMesh)buffers.push({o,original:o.geometry.attributes.position.array.slice(),target:targetPositions.get(o.material).flatMap(v=>v.toArray())});});
   fixed.push({name:a.name,a:ga,b:null,update:t=>{
    const d=smooth((t-1.0)/.60);amount.value=d;
    for(const {m,m0,m1}of blends.values())m.color.copy(m0.color).lerp(m1.color,d);
    for(const {o,original,target}of buffers){const p=o.geometry.attributes.position;for(let i=0;i<p.array.length;i++)p.array[i]=mix(original[i],target[i],d);p.needsUpdate=true;}
   }});
  }else{
   const ga=mesh(aa),gb=mesh(bb);rig.add(ga,gb);
   fixed.push({name:a.name,a:ga,b:gb,update:t=>{const d=smooth((t-1.1)/.20);alpha(ga,1-d);alpha(gb,d);}});
  }
 }
 // Concrete and buildings retain world anchors throughout, including the two
 // cabinets on the SAM. Geometry is baked in the site's frame, not re-centered.
 const common=new Set(['hardstanding','tower-foundations','launcher-foundation','service-hut','control-cabinet']);
 for(const name of common){const aa=source.children.filter(g=>g.name===name),bb=destination.children.filter(g=>g.name===name);aa.forEach((a,i)=>fixedPair(a,bb[i]));}
 const sf=n=>named(source,n),df=n=>named(destination,n);
 const keys=node=>{const result=new Set();node.traverse(m=>{if(m.isMesh&&m.userData.morphKey)result.add(m.userData.morphKey);});return result;};
 if(id==='radio'){
  const mast=sf('radio-mast'),base=frame(mast),noDish=m=>ancestor(m,n=>n.name==='microwave-dish');
  const retained=keys(df('fallen-mast-lower'));
  part('Lower mast',cut(mast,[],m=>noDish(m)||!retained.has(m.userData.morphKey)||m.userData.latticeBay>=3),base,df('fallen-mast-lower'),{start:.48,hinge:.57,pivot:[.60,.63,-.30]});
  part('Upper mast',cut(mast,[],m=>noDish(m)||!retained.has(m.userData.morphKey)||m.userData.latticeBay<3),base,df('fallen-mast-upper'),{start:.75,hinge:.20,pivot:[.6,4.455,-.3]});
  const dishes=mast.children.filter(g=>g.name==='microwave-dish');
  part('Lower microwave dish',cut(dishes[0]),frame(dishes[0]),df('fallen-radio-dish'),{start:.9});
  fragments('Aerial, ladder, torn braces & second dish',[...siteTriangles(mast,{exclude:m=>noDish(m)||retained.has(m.userData.morphKey)}),...all(dishes[1])],{birth:.9,size:.48,kick:1.1});
  fixedPair(sf('fixed-detail'),df('fixed-detail'));
 }else if(id==='radar'){
  const reflector=sf('radar-reflector'),missing=m=>{const s=m.userData.reflectorSector;return s>=2&&s<=6;};
  const retained=keys(df('fallen-reflector'));
  part('Reflector',cut(reflector,[],m=>!retained.has(m.userData.morphKey)),frame(reflector),df('fallen-reflector'),{start:.78,hinge:.13,pivot:[.3,3.8,-.25]});
  part('Torn reflector sector',cut(reflector,[],m=>!missing(m)),frame(reflector),df('broken-dish-sector'),{start:.91});
  const deck=sf('maintenance-platform'),retainedDeck=new Set([deck.children[0],deck.children[9],deck.children[11]]);
  part('Maintenance platform',cut(deck,[],m=>!retainedDeck.has(m)),frame(deck),df('fallen-platform'),{start:.78,hinge:.16,pivot:[1.35,3.65,-1.2]});
  part('Trestle feet',cut(sf('radar-trestle'),[['y',.79,-1]]),frame(sf('radar-trestle')),df('buckled-trestle'),{start:.48,ground:false,span:.4});
  fragments('Trestle, ladder, planks & yoke',[...siteTriangles(sf('radar-trestle'),{planes:[['y',1.43,1]]}),...all(sf('dish-yoke')),...all(sf('fixed-detail')),...siteTriangles(deck,{exclude:m=>retainedDeck.has(m)}),...siteTriangles(reflector,{exclude:m=>missing(m)||retained.has(m.userData.morphKey)})],{birth:.72,size:.50,kick:1.1});
 }else{
  const launcher=sf('elevated-launcher'),left=sf('missile-left'),right=sf('missile-right');
  const rails=launcher.children.filter(g=>g.name==='launch-rail');
  // One rear rail section survives independently. Everything else in the rail
  // envelope bends into the turntable's remaining rails.
  const railCut=[['x',0,1],['z',-.5,-1]],railWorld=frame(launcher);
  part('Detached rail',siteTriangles(rails,{frame:railWorld,planes:railCut}),railWorld,df('fallen-rail'),{start:.65});
  part('Bent launcher rails',siteTriangles(rails,{frame:railWorld,exclude:m=>m.parent===rails[1]}).concat(siteTriangles(rails[1],{frame:railWorld,planes:[['z',-.5,1]]})),railWorld,df('broken-launch-rails'),{start:.48,ground:false,hinge:.12,pivot:[0,1.92,0],span:.55});
  part('Missile body',cut(left,[['z',.295,-1]]),frame(left),df('fallen-missile'),{start:.67});
  const nose=named(right,'missile-nose');
  part('Nose cone',cut(nose),frame(nose),df('detached-nose'),{start:.59});
  fragments('Missile casings',[...siteTriangles(left,{frame:frame(left),planes:[['z',.295,1]]}).map(t=>({...t,v:t.v.map(v=>({...v,p:v.p.clone().applyMatrix4(frame(left)),n:v.n.clone().transformDirection(frame(left))}))})),...siteTriangles(right,{exclude:m=>m===nose}),...siteTriangles(launcher,{exclude:m=>ancestor(m,n=>['launch-rail','missile-left','missile-right'].includes(n.name))})],{birth:.62,size:.38,kick:2.2});
  // The lower mount crumples locally; its actuator arms become small fragments.
  const mount=sf('fixed-detail'),low=siteTriangles(mount,{planes:[['y',1.43,-1]]});
  part('Turntable casing',low,new T.Matrix4(),df('fixed-detail'),{start:.48,ground:false,span:.3});
  fragments('Lift arms',siteTriangles(mount,{planes:[['y',1.43,1]]}),{birth:.60,size:.42,kick:1.4});
 }
 // Persistent small rubble travels from the failing structure to its authored
 // final positions. It is part of the approved wreck, unlike fading splinters.
 const debris=df('scattered-fragments'),spawn=id==='radio'?V(.6,3.2,-.3):id==='radar'?V(.3,3.5,-.25):V(0,2,0);
 debris.children.forEach((target,i)=>{
  const tris=cut(target),targetFrame=frame(target),q=new T.Quaternion().setFromEuler(new T.Euler(i*.3,i*.7,0));
  const matrix=new T.Matrix4().compose(spawn.clone().add(V((rand(i)-.5)*.6,rand(i+3)*.4,(rand(i+6)-.5)*.6)),q,V(.65,.65,.65));
  const p=part('Persistent fragment '+(i+1),tris,matrix,target,{start:.77+i*.017});
  const update=p.update;p.update=t=>{update(t);p.holder.visible=t>=p.start;};
 });
 function apply(value){
  if(disposed)throw Error('Destruction rig has been disposed');
  if(!Number.isFinite(value))throw TypeError('Destruction time must be finite');
  time=Math.max(0,Math.min(SITE_DESTRUCTION_DURATION,value));
  intact.visible=time===0;wreck.visible=time===SITE_DESTRUCTION_DURATION;rig.visible=!intact.visible&&!wreck.visible;
  for(const t of tracks)t.update(time);for(const c of clouds)c.update(time);for(const f of fixed)f.update(time);
  root.updateMatrixWorld(true);return diagnostics();
 }
 function diagnostics(){return {site:id,time,duration:SITE_DESTRUCTION_DURATION,endpoint:intact.visible?'intact':wreck.visible?'destroyed':null,
  parts:tracks.map(t=>({name:t.name,start:t.start,impact:t.impact,position:t.position.slice(),phase:t.phase,ground:t.ground,visible:t.holder.visible})),
  fragments:clouds.map(c=>({name:c.name,birth:c.birth,count:c.pieces.length,airborne:c.pieces.filter(p=>p.opacity>0&&!p.grounded&&time>c.birth).length,visible:c.pieces.filter(p=>p.opacity>1e-6).length,landedBeforeFade:c.pieces.every(p=>p.opacity===1||p.grounded)})),
  fixed:fixed.map(f=>f.name),owned:{geometries:geometries.size,materials:materials.size},disposed};}
 apply(0);
 return {root,intact,wreck,rig,tracks,clouds,keyframes:SITE_DESTRUCTION_KEYS[id],duration:SITE_DESTRUCTION_DURATION,apply,diagnostics,
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.clear();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.clear();materials.clear();},
 };
}
