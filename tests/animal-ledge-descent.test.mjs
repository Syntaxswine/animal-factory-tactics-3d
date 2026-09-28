import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createLedgeDescent,LEDGE_DESCENT_PHASES} from '../dist/tactics/ledge-descent.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';

// Geometry assertions use the published species meshes at authored scale.
// Painted outfits and both environment presentations also require visual QA.
const mammals=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed);
const cases=[...mammals.map(profile=>({profile,label:profile.id})),{profile:mammals.find(p=>p.id==='donkey'),label:'donkey guide',unarmed:true}];
const V=(...args)=>new T.Vector3(...args),Q=()=>new T.Quaternion();
const phase=(m,name)=>{const p=m.phases.find(p=>p.label===name);assert(p,'missing phase '+name);return p;};
const at=(m,name,u=.5)=>{const p=phase(m,name);return m.apply((p.start+(p.end-p.start)*u)/m.duration);};
const joint=(w,name)=>w.bones.find(b=>b.name===name).getWorldPosition(V());
const indices=mesh=>mesh.geometry.index?new Set(mesh.geometry.index.array):Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i);
function surfaces(w){
 const out=new Map();w.root.traverse(mesh=>{
  if(!mesh.isMesh)return;for(let o=mesh;o;o=o.parent)if(!o.visible)return;
  for(const i of indices(mesh))out.set(mesh.uuid+':'+i,{name:mesh.name,p:mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)});
 });return out;
}
function gap(mesh,y){
 let nearest=Infinity;for(const i of indices(mesh)){const p=mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld);if(y===0||p.x>=0&&p.x<=3&&Math.abs(p.z)<=2)nearest=Math.min(nearest,Math.abs(p.y-y));}return nearest;
}
function foot(w,side){const mesh=w.parts.find(p=>/(hoof|boot|foot)/i.test(p.name)&&p.name.endsWith(' '+side));assert(mesh,'missing authored foot '+side);return mesh;}
function entry(w){
 const objects=[];w.root.traverse(o=>objects.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible,children:[...o.children]}));
 return {objects,parts:w.parts.map(p=>({p,g:p.geometry,index:p.geometry.index,indexData:p.geometry.index?.array.slice(),attributes:Object.fromEntries(Object.entries(p.geometry.attributes).map(([k,a])=>[k,{a,data:a.array.slice()}])),material:p.material,hook:p.material.onBeforeCompile,key:p.material.customProgramCacheKey}))};
}
function restored(w,s,disposed=false){
 for(const {o,p,q,s:scale,visible,children}of s.objects){assert(o.position.equals(p),'entry position '+o.name);assert(o.quaternion.equals(q),'entry rotation '+o.name);assert(o.scale.equals(scale),'entry scale '+o.name);assert.equal(o.visible,visible);if(disposed)assert.deepEqual(o.children,children,'temporary children remain '+o.name);}
 for(const {p,g,index,indexData,attributes,material,hook,key}of s.parts){assert.equal(p.geometry,g);assert.equal(g.index,index);if(index)assert.deepEqual(index.array,indexData,'source indices changed');assert.deepEqual(Object.keys(g.attributes).sort(),Object.keys(attributes).sort());for(const [k,{a,data}]of Object.entries(attributes)){assert.equal(g.attributes[k],a,'attribute identity '+k);assert.deepEqual(a.array,data,'source data changed '+k);}assert.equal(p.material,material);assert.equal(material.onBeforeCompile,hook);assert.equal(material.customProgramCacheKey,key);}
}
function load(c){const w=c.profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+c.profile.file,import.meta.url))));if(c.unarmed)w.equipWeapon(createWeaponModel('hands'));return w;}
function withMotion(c,run){const w=load(c);let m;try{m=createLedgeDescent(w,c.profile);run(w,m);}finally{m?.dispose();w.dispose();}}

test('descent matrix covers eleven authored mammals and the unarmed donkey guide',()=>{
 assert.deepEqual(mammals.map(p=>p.id),['horse','goat','bull','cow','donkey','sheep','skunk','pig-foreman','pig-director','rabbit','dog']);assert.equal(cases.length,12);
 assert(Object.isFrozen(LEDGE_DESCENT_PHASES));
});

for(const c of cases){
 test(c.label+': outward left-hand hop releases, absorbs landing and returns to the entry stance',()=>withMotion(c,(w,m)=>{
  assert(Math.abs(m.duration-3.78)<1e-8,'approved descent duration changed');assert(Object.isFrozen(m.phases));assert(m.phases.every(Object.isFrozen));
  assert.equal(m.phases[0].start,0);assert.equal(m.phases.at(-1).end,m.duration);m.phases.forEach((p,i)=>{assert(p.end>p.start);if(i)assert.equal(p.start,m.phases[i-1].end);});
  m.apply(0);const standing=joint(w,'hips').y;
  at(m,'Crouch at edge',1);assert(joint(w,'hips').y<standing-.3,'crouch does not lower pelvis');
  let hold;
  for(const label of ['Hop off holding edge','Lower on left hand'])for(const u of [.001,.25,.5,.75,1]){
   const r=at(m,label,u),left=r.contacts.find(p=>p.id==='hand-1'),right=r.contacts.find(p=>p.id==='hand1');assert(left.planted&&left.kind==='roof','left hand must retain edge');assert(!right.planted,'right hand unexpectedly supports descent');
   if(hold)assert(V(...left.point).distanceTo(hold)<1e-8,'edge grip slides');hold=V(...left.point);
   for(const finger of m.grips[0].meshes.slice(1,5))assert(gap(finger,2)<.003,'declared hold lacks rendered finger contact');
  }
  const hop=at(m,'Hop off holding edge',.5);assert(hop.contacts.filter(p=>p.id.startsWith('foot')).every(p=>p.point[1]>2.1),'feet never hop clear of roof');
  assert(at(m,'Release and drop',.5).contacts.every(p=>!p.planted),'release remains attached');
  at(m,'Absorb landing',0);const landing=joint(w,'hips').y;at(m,'Absorb landing',1);assert(joint(w,'hips').y<landing-.15,'landing lacks absorption');
  for(const label of ['Absorb landing','Stand',m.phases.at(-1).label])for(const u of [.001,.5,1])assert(at(m,label,u).contacts.filter(p=>p.id.startsWith('foot')).every(p=>p.planted&&p.kind==='floor'),'landing feet must stay planted');
  for(const t of [0,.2,.4,.6,.8,1]){m.apply(t);assert(V(1,0,0).applyQuaternion(w.bones.find(b=>b.name==='head').getWorldQuaternion(Q())).x<-.45,'actor faces into ledge');}
  m.apply(0);const first=surfaces(w),start=w.root.position.clone();m.apply(1);const last=surfaces(w),delta=w.root.position.clone().sub(start);assert.equal(first.size,last.size);for(const [k,{p,name}]of first)assert(p.clone().add(delta).distanceTo(last.get(k).p)<1e-6,'entry/exit stance differs '+name);
 }));

 test(c.label+': fixed bone lengths, reachable targets and stationary supports in both playback directions',()=>withMotion(c,(w,m)=>{
  const lengths=w.bones.filter(b=>b.parent.isBone).map(b=>({b,length:b.position.length()}));
  for(const direction of [1,-1]){let previous;for(let i=0;i<=400;i++){
   const r=m.apply(direction===1?i/400:1-i/400);
   for(const {b,length}of lengths){assert(Math.abs(b.position.length()-length)<1e-9,'local bone stretched '+b.name);assert(Math.abs(b.getWorldPosition(V()).distanceTo(b.parent.getWorldPosition(V()))-length)<1e-8,'world bone stretched '+b.name);}
   for(const contact of r.contacts){assert(Number.isFinite(contact.error)&&contact.error<1e-5,`${r.time.toFixed(5)} ${contact.id} unreachable ${contact.error}`);if(!contact.planted)continue;assert(contact.point&&contact.worldPoint);assert(Math.abs(contact.point[1]-(contact.kind==='floor'?0:2))<1e-8);const old=previous?.contacts.find(p=>p.id===contact.id&&p.planted&&p.kind===contact.kind);if(old)assert(V(...old.point).distanceTo(V(...contact.point))<1e-8,'planted support slides '+contact.id);}
   if(c.unarmed){assert.equal(r.equipment,'empty');assert(r.contacts.every(p=>p.kind!=='weapon'),'unarmed guide grasps a weapon');assert.equal(w.root.getObjectByName('Equipment shoulder sling').visible,false);}
   else if(r.index>0&&r.index<m.phases.length-1){assert.equal(r.equipment,'slung');assert(w.weapon.root.visible);}
   previous=r;
  }}
 }));

 test(c.label+': actual indexed body, foot, glove and equipment vertices clear roof and floor',()=>withMotion(c,(w,m)=>{
  for(let i=0;i<=320;i++){
   const r=m.apply(i/320);
   for(const {p,name}of surfaces(w).values()){
    assert([p.x,p.y,p.z].every(Number.isFinite),'non-finite surface '+name);assert(p.y>=-.001,`${name} below floor at ${r.time}`);
    if(p.x>0&&p.x<3&&p.y>0&&p.y<2&&Math.abs(p.z)<2){const depth=Math.min(p.x,3-p.x,p.y,2-p.y,2-Math.abs(p.z));assert(depth<.004,`${name} penetrates ledge ${depth}m at ${r.time}`);}
   }
   for(const p of r.contacts.filter(p=>p.planted)){
    if(p.id.startsWith('foot'))assert(gap(foot(w,p.id==='foot-1'?-1:1),p.kind==='roof'?2:0)<.015,'declared sole contact floats '+r.time);
    if(p.id.startsWith('hand'))for(const finger of m.grips[p.id==='hand-1'?0:1].meshes.slice(1,5))assert(gap(finger,2)<.003,'declared finger contact floats '+r.time);
   }
  }
 }));

 test(c.label+': phase boundaries preserve visible surfaces and joint rotation continuity',()=>withMotion(c,(w,m)=>{
  for(const p of m.phases.slice(0,-1)){
   m.apply((p.end-1e-6)/m.duration);const a=surfaces(w),bones=w.bones.map(b=>({p:b.getWorldPosition(V()),q:b.getWorldQuaternion(Q())}));m.apply((p.end+1e-6)/m.duration);const b=surfaces(w);
   for(const [k,{p:v,name}]of a)if(b.has(k))assert(v.distanceTo(b.get(k).p)<.0001,`${name} pops at ${p.label}`);
   w.bones.forEach((bone,i)=>{assert(bone.getWorldPosition(V()).distanceTo(bones[i].p)<.0001,`joint pops at ${p.label}: ${bone.name}`);assert(bone.getWorldQuaternion(Q()).angleTo(bones[i].q)<.001,`joint roll pops at ${p.label}: ${bone.name}`);});
  }
 }));

 test(c.label+': reverse scrubbing is deterministic and arbitrary placement is rigid',()=>withMotion(c,(w,m)=>{
  const snapshots=[0,.1,.28,.39,.47,.56,.64,.71,.82,.93,1].map(t=>{m.apply(t);return {t,points:surfaces(w)};});
  for(const {t,points}of snapshots.reverse()){m.apply(t);const current=surfaces(w);assert.equal(current.size,points.size);for(const [k,{p,name}]of points)assert(p.distanceTo(current.get(k).p)<1e-8,'history changes '+name);}
  for(const t of [.1,.3,.48,.6,.76,.92]){const local=m.apply(t),points=surfaces(w),origin=[5,3,-7],heading=73,q=Q().setFromAxisAngle(V(0,1,0),-heading*Math.PI/180),world=m.apply(t,{origin,heading}),current=surfaces(w);for(const [k,{p,name}]of points)assert(p.clone().applyQuaternion(q).add(V(...origin)).distanceTo(current.get(k).p)<1e-6,'placement distorts '+name);local.contacts.forEach((p,i)=>{if(p.point)assert(V(...p.point).applyQuaternion(q).add(V(...origin)).distanceTo(V(...world.contacts[i].worldPoint))<1e-8);});}
 }));

 test(c.label+': restore, disposal and construction failure preserve authored geometry and ownership',()=>{
  const w=load(c);let m;try{
   w.parts[0].geometry.setAttribute('paintPart',new T.Float32BufferAttribute(new Float32Array(w.parts[0].geometry.attributes.position.count).fill(1),1));w.pose('carry');w.root.position.set(7,2,-4);w.root.rotation.set(.2,.6,-.1);const original=entry(w);
   m=createLedgeDescent(w,c.profile);restored(w,original);for(const t of [.2,.5,.7,1]){m.apply(t);m.restore();restored(w,original);}
   for(const args of [[NaN],[Infinity],[.5,{origin:[0,NaN,0]}],[.5,{origin:[0,0]}],[.5,{heading:Infinity}]])assert.throws(()=>m.apply(...args),/Invalid/);
   m.apply(.6);m.dispose();m.dispose();restored(w,original,true);assert.throws(()=>m.apply(0),/disposed/);m=null;
   const pose=w.pose;let calls=0;w.pose=(...args)=>{if(++calls===2)throw Error('Injected animal descent failure');return pose(...args);};try{assert.throws(()=>createLedgeDescent(w,c.profile),/Injected animal descent failure/);}finally{w.pose=pose;}restored(w,original,true);
  }finally{m?.dispose();w.dispose();}
 });
}
// The director's deep forward torso lean must not swing the slung barrel
// through its raised head; compare full triangles, including edge crossings.
const EPS=1e-7;
function soup(mesh){
 const g=mesh.geometry,index=g.index,vertices=Array.from({length:g.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)),triangles=[];
 for(let i=0;i<(index?.count||vertices.length);i+=3){const points=[0,1,2].map(j=>vertices[index?index.getX(i+j):i+j]);triangles.push({points,box:new T.Box3().setFromPoints(points)});}
 return {vertices,triangles,box:new T.Box3().setFromPoints(vertices)};
}
function edgeHitsTriangle(a,b,triangle){
 const direction=b.clone().sub(a),length=direction.length();if(length<EPS)return false;
 const hit=new T.Ray(a,direction.multiplyScalar(1/length)).intersectTriangle(...triangle.points,false,V());
 return !!hit&&a.distanceTo(hit)>EPS&&a.distanceTo(hit)<length-EPS;
}
// Three non-axis-aligned rays vote on containment. Shared triangle edges are
// deduplicated, so the count does not double at a triangulation diagonal.
function inside(point,body){
 if(!body.box.containsPoint(point))return false;
 let votes=0;
 for(const direction of [[1,.371,.193],[.217,1,.437],[.317,.223,1]]){
  const ray=new T.Ray(point,new T.Vector3(...direction).normalize()),distances=[];
  for(const triangle of body.triangles){const hit=ray.intersectTriangle(...triangle.points,false,V());if(hit){const distance=point.distanceTo(hit);if(distance<EPS)return false;if(!distances.some(d=>Math.abs(d-distance)<1e-6))distances.push(distance);}}
  if(distances.length%2)votes++;
 }
 return votes>=2;
}
function intersects(a,b){
 if(!a.box.intersectsBox(b.box))return null;
 for(const first of a.triangles)for(const second of b.triangles){
  if(!first.box.intersectsBox(second.box))continue;
  for(let i=0;i<3;i++)if(edgeHitsTriangle(first.points[i],first.points[(i+1)%3],second)||edgeHitsTriangle(second.points[i],second.points[(i+1)%3],first))return 'triangle crossing';
 }
 // Surface-only intersection misses a small weapon part enclosed by the head.
 if(a.vertices.some(p=>inside(p,b)))return 'rifle contained in head';
 if(b.vertices.some(p=>inside(p,a)))return 'head contained in rifle';
 return null;
}
function edgeDistanceSquared(a,b,c,d){
 const direction=b.clone().sub(a),length=direction.length(),closest=V();
 if(length<EPS)return new T.Line3(c,d).closestPointToPoint(a,true,closest).distanceToSquared(a);
 const distance=new T.Ray(a,direction.multiplyScalar(1/length)).distanceSqToSegment(c,d,closest,V());
 return a.distanceTo(closest)<=length+EPS?distance:new T.Line3(c,d).closestPointToPoint(b,true,V()).distanceToSquared(b);
}
function clearanceBelow(a,b,limit){
 if(!a.box.clone().expandByScalar(limit).intersectsBox(b.box))return Infinity;
 let minimum=Infinity;
 for(const first of a.triangles)for(const second of b.triangles){
  if(!first.box.clone().expandByScalar(limit).intersectsBox(second.box))continue;
  const ta=new T.Triangle(...first.points),tb=new T.Triangle(...second.points);
  for(let i=0;i<3;i++){
   minimum=Math.min(minimum,tb.closestPointToPoint(first.points[i],V()).distanceToSquared(first.points[i]),ta.closestPointToPoint(second.points[i],V()).distanceToSquared(second.points[i]));
   for(let j=0;j<3;j++)minimum=Math.min(minimum,edgeDistanceSquared(first.points[i],first.points[(i+1)%3],second.points[j],second.points[(j+1)%3]));
  }
 }
 return Math.sqrt(Math.max(0,minimum));
}

test('pig director: slung rifle retains two millimetres of actual skull clearance through the hop',()=>withMotion(cases.find(c=>c.label==='pig-director'),(w,m)=>{
 const head=w.parts.find(p=>p.name==='unified director skull folded ears and snout');assert(head);
 const meshes=[];w.weapon.root.traverse(o=>{if(o.isMesh)meshes.push(o);});assert(meshes.length);
 const start=phase(m,'Crouch at edge').start,end=phase(m,'Lower on left hand').end;
 for(let i=0;i<=90;i++){
  const time=start+(end-start)*i/90;m.apply(time/m.duration);const skull=soup(head);
  for(const mesh of meshes){const weapon=soup(mesh);assert.equal(intersects(weapon,skull),null,`${mesh.name} intersects skull at ${time.toFixed(5)}s`);const clearance=clearanceBelow(weapon,skull,.002);assert(clearance>=.002,`${mesh.name} skull clearance ${clearance} at ${time.toFixed(5)}s`);}
 }
}));
