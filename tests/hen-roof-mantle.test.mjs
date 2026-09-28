import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createHen} from '../dist/tactics/hen-worker.js';
import {createHenRoofMantle,HEN_ROOF_MANTLE_PHASES} from '../dist/tactics/hen-roof-mantle.js';
const load=()=>createHen(JSON.parse(fs.readFileSync(new URL('../dist/tactics/hen-10k-data.json',import.meta.url)))),V=()=>new T.Vector3();
const vertices=w=>w.parts.flatMap(mesh=>[...new Set(mesh.geometry.index.array)].map(i=>mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)));
function withClip(fn){const w=load(),m=createHenRoofMantle(w,{id:'hen'});try{fn(w,m);}finally{m.dispose();w.dispose();}}
test('hen roof mantle preserves fixed avian bones, supports transfers and clears the solid roof',()=>withClip((w,m)=>{
 const lengths=new Map(m.skeleton.bones.map(b=>[b,b.position.length()]));
 // A free apron hem may fold through its own hanging length; this limit
 // comes from the original garment, not the measured animation. Feathers
 // and body still receive at most seven centimetres of local compression.
 const apron=w.parts.find(p=>p.name==='continuous apron').geometry.attributes.position,ys=Array.from({length:apron.count},(_,i)=>apron.getY(i)),hangingLength=Math.max(...ys)-Math.min(...ys);let prone=0;
 for(let i=0;i<=500;i++){const r=m.apply(i/500);assert.equal(w.weapon,undefined);assert.equal(r.unarmed,true);for(const [name,amount]of Object.entries(r.clothDeflection))assert.ok(amount<(name==='continuous apron'?hangingLength:.07),name+' excessive contact deformation');for(const[b,n]of lengths)assert.ok(Math.abs(b.position.length()-n)<1e-10,b.name);for(const c of r.contacts)assert.ok(c.error<1e-7,c.id);if(r.time>=1.25)assert.ok(r.supported,r.phase+' unsupported');if(r.prone){prone++;assert.ok(m.skeleton.bones.find(b=>b.name==='pelvis').rotation.z<-1.4);}
 for(const p of vertices(w)){assert.ok(p.y>-.002,'below ground');if(p.x>0&&p.y>0)assert.ok(Math.min(p.x,2-p.y)<.002,'roof penetration '+r.time+' '+p.toArray());}
 }assert.ok(prone>10);assert.ok(Math.abs(m.duration-6.25)<1e-10);
}));
test('hen roof mantle boundaries and reverse scrubbing are continuous and deterministic',()=>withClip((w,m)=>{
 for(const p of HEN_ROOF_MANTLE_PHASES.slice(0,-1)){m.apply((p.end-1e-7)/m.duration);const before=vertices(w);m.apply((p.end+1e-7)/m.duration);const after=vertices(w);for(let i=0;i<before.length;i++)assert.ok(before[i].distanceTo(after[i])<.0001,p.label+' snap '+before[i].distanceTo(after[i]));}
 const samples=[.15,.35,.51,.62,.70,.81,.95].map(p=>{m.apply(p);return{p,v:vertices(w)};});for(const {p,v}of samples.reverse()){m.apply(p);vertices(w).forEach((n,i)=>assert.ok(n.distanceTo(v[i])<1e-9));}
}));
test('hen mantle placement transforms actual meshes and diagnostic contacts together',()=>withClip((w,m)=>{
 m.apply(.67);const base=vertices(w),origin=[3,2,-4],heading=73,q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-heading*Math.PI/180);const r=m.apply(.67,{origin,heading});vertices(w).forEach((p,i)=>assert.ok(p.distanceTo(base[i].clone().applyQuaternion(q).add(new T.Vector3(...origin)))<1e-6));for(const c of r.contacts)assert.ok(new T.Vector3(...c.worldPoint).distanceTo(new T.Vector3(...c.point).applyQuaternion(q).add(new T.Vector3(...origin)))<1e-9);
}));
test('hen mantle owns and restores its temporary articulation and all geometry',()=>{
 const w=load();w.root.position.set(2,3,4);w.root.rotation.y=.3;const original=w.skeleton,nodes=[];w.root.traverse(o=>nodes.push({o,p:o.position.clone(),q:o.quaternion.clone(),parent:o.parent}));const attrs=w.parts.map(p=>Object.fromEntries(Object.entries(p.geometry.attributes).map(([k,a])=>[k,a.array.slice()])));const m=createHenRoofMantle(w,{id:'hen'});m.apply(.60);m.restore();m.apply(.75);m.dispose();m.dispose();w.parts.forEach((p,i)=>{assert.equal(p.skeleton,original);for(const[k,a]of Object.entries(attrs[i]))assert.deepEqual(p.geometry.attributes[k].array,a,p.name+' '+k);});for(const n of nodes){assert.equal(n.o.parent,n.parent);assert.ok(n.o.position.distanceTo(n.p)<1e-9);assert.ok(n.o.quaternion.angleTo(n.q)<1e-7);}assert.equal(w.root.getObjectByName('wing brace -1'),undefined);assert.equal(w.root.getObjectByName('thigh -1'),undefined);assert.throws(()=>m.apply(.5),/disposed/);w.dispose();
});
test('hen mantle rejects unsupported species and invalid playback',()=>{const w=load();assert.throws(()=>createHenRoofMantle(w,{id:'horse'}),/unarmed hen/);const m=createHenRoofMantle(w,{id:'hen'});for(const value of[NaN,Infinity])assert.throws(()=>m.apply(value),/Invalid/);assert.throws(()=>m.apply(.4,{heading:Infinity}),/Invalid/);assert.throws(()=>m.apply(.4,{origin:[0,0,NaN]}),/Invalid/);m.dispose();w.dispose();});



test('declared hen supports are actual indexed feather and toe surfaces after all cloth deformation',()=>withClip((w,m)=>{
 for(let i=0;i<=500;i++){const r=m.apply(i/500);let actualSupport=false;
 for(const c of r.contacts.filter(c=>c.planted)){const limb=m.limbs.find(l=>l.id===c.id),mesh=limb.surface,point=new T.Vector3(...c.worldPoint),y=c.kind==='floor'?0:2;let closest=Infinity,roof=Infinity;
 for(const j of new Set(mesh.geometry.index.array)){const v=mesh.getVertexPosition(j,V()).applyMatrix4(mesh.matrixWorld);closest=Math.min(closest,v.distanceTo(point));if(c.kind==='floor'||v.x>=-1e-5)roof=Math.min(roof,Math.abs(v.y-y));}
 assert.ok(closest<(c.id.startsWith('wing')?1e-5:.012),c.id+' does not reach actual hold at '+r.time);assert.ok(roof<.0001,c.id+' floats above supporting surface at '+r.time);actualSupport=true;
 if(c.id.startsWith('wing')){const feather=mesh.getVertexPosition(limb.index,V()).applyMatrix4(mesh.matrixWorld);assert.ok(feather.distanceTo(point)<1e-5,'authored wing-tip vertex misses contact');}
 }
 if(r.time>=1.25)assert.ok(actualSupport,'no real support through '+r.phase+' '+r.time);
 }
}));
test('buried hen shank overlap leaves original endpoint geometry and soles unchanged',()=>{
 const w=load(),legs=w.parts.filter(p=>p.name.includes('scaly leg')),original=legs.map(p=>p.geometry.attributes.position.array.slice()),m=createHenRoofMantle(w,{id:'hen'});
 try{for(const t of[0,1]){m.apply(t);legs.forEach((p,i)=>assert.deepEqual(p.geometry.attributes.position.array,original[i],'endpoint shank geometry changed'));}
 m.apply(.58);legs.forEach((p,i)=>{const position=p.geometry.attributes.position;for(let j=0;j<position.count;j++)if(original[i][j*3+1]<.20)for(let k=0;k<3;k++)assert.equal(position.array[j*3+k],original[i][j*3+k],'rigid toe geometry changed');});
 }finally{m.dispose();w.dispose();}
});

test('hen mantle reuses GPU attributes and keeps bind-space paint registration stable',()=>withClip((w,m)=>{
 m.apply(.4);const rows=w.parts.map(p=>({p,position:p.geometry.attributes.position,normal:p.geometry.attributes.normal,paintPosition:p.geometry.attributes.paintPosition,paintNormal:p.geometry.attributes.paintNormal,paintPositionValues:p.geometry.attributes.paintPosition.array.slice(),paintNormalValues:p.geometry.attributes.paintNormal.array.slice()}));
 for(const time of[.6,.7,.2,.95,.55,.4]){m.apply(time);for(const row of rows){for(const name of['position','normal','paintPosition','paintNormal'])assert.equal(row.p.geometry.attributes[name],row[name],row.p.name+' replaced '+name);assert.deepEqual(row.paintPosition.array,row.paintPositionValues);assert.deepEqual(row.paintNormal.array,row.paintNormalValues);}}
}));

test('apron hem has a two-millimetre roof gap and no degenerate triangle after draping',()=>withClip((w,m)=>{
 const mesh=w.parts.find(p=>p.name==='continuous apron'),index=mesh.geometry.index;
 for(let step=0;step<=250;step++){const r=m.apply(step/250),points=Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld));
 for(const p of points)if(p.x>-.0015&&p.y>0)assert.ok(p.y>2.0015,'coplanar apron/roof contact at '+r.time);
 for(let i=0;i<index.count;i+=3){const triangle=new T.Triangle(points[index.getX(i)],points[index.getX(i+1)],points[index.getX(i+2)]);assert.ok(triangle.getArea()>1e-9,'degenerate apron triangle at '+r.time);}
 }
}));

test('hen presses the upper breast over the lip and shifts left before the lead foot lifts',()=>withClip((w,m)=>{
 const mesh=w.parts.find(p=>p.name==='fitted waistcoat'),chest=[...new Set(mesh.geometry.index.array)].filter(i=>{const p=new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);return p.x>.10&&p.y>.98&&p.y<1.15&&Math.abs(p.z)<.15;});assert(chest.length>10);
 const lift=m.phases.find(p=>p.label==='Right leg over'),joint=name=>m.skeleton.bones.find(b=>b.name===name).getWorldPosition(V());
 for(const time of [lift.start-.001,lift.start+.025]){
  const r=m.apply(time/m.duration),center=chest.reduce((sum,i)=>sum.add(mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)),V()).multiplyScalar(1/chest.length),left=joint('wing -1'),right=joint('wing 1');
  assert(center.x>.06&&center.y>2.025,'upper breast must already be above and inside the lip');
  assert((right.y-left.y)/left.distanceTo(right)>Math.sin(15*Math.PI/180),'left wing shoulder must visibly drop before the foot lift');
  assert(joint('breast').z-joint('pelvis').z<-.10,'breast has not shifted toward the braced left wing');
  assert(r.contacts.find(c=>c.id==='wing-1').planted,'left wing-tip support released during the press');
  if(time<lift.start){const foot=r.contacts.find(c=>c.id==='foot1');assert(foot.point[0]<0&&foot.point[1]<1.85,'foot lifted before the upper-body transfer');}
 }
}));

test('hen settles the feathered belly and low feet while unloading one wing',()=>withClip((w,m)=>{
 const mesh=w.parts.find(p=>p.name==='feathered body'),belly=[...new Set(mesh.geometry.index.array)].filter(i=>{const p=new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);return p.x>.12&&p.y>.50&&p.y<.90&&Math.abs(p.z)<.20;});assert(belly.length>10);
 const flat=m.phases.find(p=>p.label==='Lie flat');
 for(const fraction of [.25,.5,.9]){const r=m.apply((flat.start+(flat.end-flat.start)*fraction)/m.duration),points=belly.map(i=>mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld));
  assert(points.filter(p=>p.x>0&&p.y>=1.998&&p.y<2.04).length>=3,'feathered belly is suspended above the roof');
  assert(r.contacts.find(c=>c.id==='foot-1').planted,'low trailing foot should share the settled support');
  assert(r.contacts.find(c=>c.id==='wing1').planted&&!r.contacts.find(c=>c.id==='wing-1').planted,'one wing should visibly unload during the belly pause');
 }
}));

test('hen gathers a foot underneath before raising the hips and keeps the other foot planted',()=>withClip((w,m)=>{
 const gather=m.phases.find(p=>p.label==='Gather legs underneath'),start=m.apply(gather.start/m.duration),height=start.root[1];
 for(const fraction of [.1,.2,.3,.4]){const r=m.apply((gather.start+(gather.end-gather.start)*fraction)/m.duration);assert(Math.abs(r.root[1]-height)<1e-10,'hips rise before the first foot is gathered');assert(r.contacts.find(c=>c.id==='foot-1').planted,'trailing foot slides while it should support the gather');}
}));
