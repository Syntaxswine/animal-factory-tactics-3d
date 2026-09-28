import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../dist/tactics/horse-light-model.js';
import {createWindowVault,WINDOW_VAULT_IMPACT} from '../dist/tactics/window-vault.js';
const V=()=>new T.Vector3();
const load=()=>createLightHorse(JSON.parse(fs.readFileSync(new URL('../dist/tactics/horse-10k-data.json',import.meta.url))));
function surfaces(w){const out=new Map();w.root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;for(const i of o.geometry.index?new Set(o.geometry.index.array):Array.from({length:o.geometry.attributes.position.count},(_,j)=>j))out.set(o.uuid+':'+i,{v:o.getVertexPosition(i,V()).applyMatrix4(o.matrixWorld),name:o.name});});return out;}
function snapshot(w){const a=[];w.root.traverse(o=>a.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible}));return a;}
function same(a){for(const {o,p,q,s,visible}of a){assert(o.position.equals(p),o.name+' position changed');assert(o.quaternion.equals(q),o.name+' rotation changed');assert(o.scale.equals(s));assert.equal(o.visible,visible,o.name+' visibility changed');}}
function withVault(fn){const w=load(),m=createWindowVault(w);try{fn(w,m);}finally{m.dispose();w.dispose();}}

test('window vault rendered character and rifle clear the canonical aperture and ground throughout',()=>withVault((w,m)=>{
 let worst={depth:0};
 for(let i=0;i<=480;i++){const t=m.duration*i/480;m.apply(t);for(const {v,name}of surfaces(w).values()){
  assert(v.y>=-.004,name+' below floor at '+t);
  if(Math.abs(v.x)>.08||v.y<=0||v.y>=2)continue;
  const depth=Math.max(.875-v.y,v.y-1.525,Math.abs(v.z)-.475);
  if(depth>worst.depth)worst={depth,t,name,point:v.toArray()};
 }}assert(worst.depth<.004,'Rendered geometry clips wall/frame: '+JSON.stringify(worst));
}));

test('vault boundary poses are continuous without hand, equipment or clothing snaps',()=>withVault((w,m)=>{
 for(const phase of m.phases.slice(0,-1)){m.apply(phase.end-1e-7);const a=surfaces(w);m.apply(phase.end+1e-7);const b=surfaces(w);let worst={d:0};for(const [key,{v,name}]of a){if(!b.has(key))continue;const d=v.distanceTo(b.get(key).v);if(d>worst.d)worst={d,name};}assert(worst.d<.0001,phase.label+' boundary pop '+JSON.stringify(worst));}
}));

test('planted supports remain fixed and reachable without stretched bones',()=>withVault((w,m)=>{
 const lengths=w.bones.filter(b=>b.parent.isBone).map(b=>({b,length:b.position.length()}));let last;
 for(let i=0;i<=480;i++){const r=m.apply(m.duration*i/480);for(const {b,length}of lengths)assert(Math.abs(b.position.length()-length)<1e-9,'bone stretched');for(const c of r.contacts){assert(c.error<.002,JSON.stringify({t:r.time,phase:r.phase,...c}));if(c.planted){const before=last?.contacts.find(p=>p.id===c.id&&p.planted);if(before)assert(V().fromArray(c.point).distanceTo(V().fromArray(before.point))<.00001,'planted support slides '+JSON.stringify({t:r.time,...c}));}}last=r;}
}));

test('glass impact is tied to a hand reaching the pane and remains irreversible in forward time',()=>withVault((w,m)=>{
 const before=m.apply(WINDOW_VAULT_IMPACT-1e-7);assert(before.glassTime<0);
 const hit=m.apply(WINDOW_VAULT_IMPACT);assert.equal(hit.glassTime,0);const hand=w.bones.find(b=>b.name==='hand1').localToWorld(new T.Vector3(.052,-.010,0));assert(Math.abs(hand.x)<.045&&hand.y>.875&&hand.y<1.525&&Math.abs(hand.z)<.475,'glass breaks before the striking hand reaches pane '+hand.toArray());
 for(const time of [WINDOW_VAULT_IMPACT+.1,m.duration])assert(Math.abs(m.apply(time).glassTime-(time-WINDOW_VAULT_IMPACT))<1e-9);
}));

test('random scrubbing reproduces rendered geometry and finite inputs clamp to valid endpoints',()=>withVault((w,m)=>{
 const samples=[0,.18,.35,.49,.58,.7,.86,1].map(u=>{const t=u*m.duration;m.apply(t);return {t,points:surfaces(w)};});
 for(const {t,points}of samples.reverse()){m.apply(t);const next=surfaces(w);for(const [key,{v}]of points)assert(v.distanceTo(next.get(key).v)<1e-9,'non-deterministic vertex');}
 assert.equal(m.apply(-1).time,0);assert.equal(m.apply(100).time,m.duration);for(const t of [NaN,Infinity,-Infinity])assert.throws(()=>m.apply(t),/Invalid/);
}));

test('constructing, restoring and disposing a vault preserve exact actor entry transforms and geometry',()=>{
 const w=load();w.pose('carry');w.root.position.set(7,2,-4);w.root.rotation.set(.2,.6,-.1);const entry=snapshot(w),geometry=w.parts.map(p=>({g:p.geometry,index:p.geometry.index,attributes:{...p.geometry.attributes}})),children=w.root.children.length;
 const m=createWindowVault(w);try{same(entry);m.apply(1.9);m.restore();same(entry);m.apply(2.1);m.dispose();m.dispose();same(entry);assert.equal(w.root.children.length,children);for(const {g,index,attributes}of geometry){assert.equal(g.index,index);for(const [key,a]of Object.entries(attributes))assert.equal(g.attributes[key],a);}assert.throws(()=>m.apply(0),/disposed/);}finally{m.dispose();w.dispose();}
});
// Clip each triangle to the wall thickness; this catches a long rifle barrel
// crossing the wall even when both of its endpoints sit outside the slab.
function clipPlane(poly,axis,bound,greater){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ain=greater?a[axis]>=bound:a[axis]<=bound,bin=greater?b[axis]>=bound:b[axis]<=bound;if(ain)out.push(a);if(ain!==bin)out.push(a.clone().lerp(b,(bound-a[axis])/(b[axis]-a[axis])));}return out;}
function wallIntersection(triangle){let p=clipPlane(triangle,'x',-.08,true);p=clipPlane(p,'x',.08,false);p=clipPlane(p,'y',0,true);return clipPlane(p,'y',2,false);}
function intrusion(v){return Math.max(.875-v.y,v.y-1.525,Math.abs(v.z)-.475);}
test('triangle clearance detector catches crossing edges without interior vertices',()=>{
 const crossing=[new T.Vector3(-.2,.8,0),new T.Vector3(.2,.8,.01),new T.Vector3(.2,.81,-.01)];assert(crossing.every(v=>Math.abs(v.x)>.08));assert(wallIntersection(crossing).some(p=>intrusion(p)>.06));
});
test('rendered triangle faces and weapon edges clear the wall slab between vertices',()=>withVault((w,m)=>{
 let worst={depth:0};
 for(let i=0;i<=240;i++){const t=m.duration*i/240;m.apply(t);w.root.traverse(o=>{if(!o.isMesh)return;for(let parent=o;parent;parent=parent.parent)if(!parent.visible)return;const g=o.geometry,vertices=Array.from({length:g.attributes.position.count},(_,j)=>o.getVertexPosition(j,V()).applyMatrix4(o.matrixWorld)),indices=g.index?.array||vertices.map((_,j)=>j);for(let j=0;j<indices.length;j+=3){const tri=[vertices[indices[j]],vertices[indices[j+1]],vertices[indices[j+2]]];if(tri.every(p=>p.x<-.08)||tri.every(p=>p.x>.08))continue;for(const p of wallIntersection(tri)){const depth=intrusion(p);if(depth>worst.depth)worst={depth,t,name:o.name,point:p.toArray()};}}});}
 assert(worst.depth<.004,'Rendered triangle enters wall/frame: '+JSON.stringify(worst));
}));


test('the visible bracing glove reaches the sill while the horse launches',()=>withVault((w,m)=>{
 let checked=0;
 for(let i=0;i<=160;i++){const r=m.apply(m.duration*i/160);if(!r.contacts.some(c=>c.id==='hand-1'&&c.planted))continue;let gap=Infinity;for(const {name,v}of surfaces(w).values())if(name==='Ladder grip surface'&&Math.abs(v.x)<=.09&&Math.abs(v.z)<=.5)gap=Math.min(gap,Math.abs(v.y-.875));assert(gap<.015,'support glove floats '+gap+' above sill at '+r.time);checked++;}
 assert(checked>8,'no sustained hand-supported launch');
}));

test('airborne crossing descends and carries momentum into landing rather than hovering or stopping',()=>withVault((w,m)=>{
 const phase=m.phases.find(p=>p.label==='Through opening'),hip=w.bones.find(b=>b.name==='hips'),at=t=>{m.apply(t);return hip.getWorldPosition(V());},start=at(phase.start),end=at(phase.end);
 assert(end.y<start.y-.025,'airborne hips stay level');
 const dt=.0001,before=end.clone().sub(at(phase.end-dt)).divideScalar(dt),after=at(phase.end+dt).sub(end).divideScalar(dt);
 assert(before.x>1&&after.x>1,'travel stops before descending');assert(before.y<-.1&&after.y<-.1,'descent stops at phase boundary');assert(before.distanceTo(after)<.025,'velocity jumps at crossing-to-drop transition');
}));
