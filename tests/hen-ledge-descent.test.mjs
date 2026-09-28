import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createHen} from '../dist/tactics/hen-worker.js';
import {createHenMotion} from '../dist/tactics/hen-motion.js';
import {createHenLedgeDescent,HEN_LEDGE_DESCENT_PHASES} from '../dist/tactics/hen-ledge-descent.js';
const load=()=>createHen(JSON.parse(fs.readFileSync(new URL('../dist/tactics/hen-10k-data.json',import.meta.url)))),V=()=>new T.Vector3();
const vertices=w=>w.parts.flatMap(mesh=>[...new Set(mesh.geometry.index.array)].map(i=>mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)));
function withClip(fn){const w=load(),m=createHenLedgeDescent(w,{id:'hen'});try{fn(w,m);}finally{m.dispose();w.dispose();}}
test('hen descent uses nine unarmed phases with actual feather/toe contacts and solid clearance',()=>withClip((w,m)=>{
 assert.equal(m.duration,3.78);assert.equal(m.phases.length,9);const lengths=new Map(m.skeleton.bones.map(b=>[b,b.position.clone()])),toes=w.parts.filter(p=>p.name.includes('scaly leg')).map(p=>({p,a:p.geometry.attributes.position.array.slice()}));
 for(let step=0;step<=500;step++){const r=m.apply(step/500);assert.equal(w.weapon,undefined);assert(r.unarmed);for(const[b,p]of lengths)assert(b.position.distanceTo(p)<1e-10,b.name);for(const amount of Object.values(r.clothDeflection))assert(amount<.07,'excessive soft surface deflection');
 for(const c of r.contacts){assert(c.error<1e-7,c.id);if(!c.planted)continue;const limb=m.limbs.find(l=>l.id===c.id),mesh=limb.surface,point=new T.Vector3(...c.worldPoint),plane=c.kind==='floor'?0:2;let closest=Infinity,onSurface=Infinity;for(const index of new Set(mesh.geometry.index.array)){const p=mesh.getVertexPosition(index,V()).applyMatrix4(mesh.matrixWorld);closest=Math.min(closest,p.distanceTo(point));if(c.kind==='floor'||p.x>=-1e-5)onSurface=Math.min(onSurface,Math.abs(p.y-plane));}assert(closest<(c.id.startsWith('wing')?1e-5:.012),c.id+' actual surface misses hold');assert(onSurface<1e-4,c.id+' misses support plane');if(c.id.startsWith('wing'))assert(mesh.getVertexPosition(limb.index,V()).applyMatrix4(mesh.matrixWorld).distanceTo(point)<1e-5);}
 if(r.index===3||r.index===4){assert(r.contacts.find(c=>c.id==='wing-1').planted);assert(!r.contacts.find(c=>c.id==='wing1').planted);assert(!r.contacts.some(c=>c.id.startsWith('foot')&&c.planted));}if(r.index===5)assert(!r.supported);else assert(r.supported);
 for(const p of vertices(w)){assert(p.y>-.002,'ground penetration at '+r.time);if(p.x>0&&p.y>0)assert(Math.min(p.x,2-p.y)<.002,'roof penetration at '+r.time);}
 for(const {p,a}of toes)assert.deepEqual(p.geometry.attributes.position.array,a,'rigid toe source geometry changed');
 }
}));
test('hen descent boundaries and arbitrary forward/reverse scrubs are continuous and absolute',()=>withClip((w,m)=>{
 for(const phase of HEN_LEDGE_DESCENT_PHASES.slice(0,-1)){m.apply((phase.end-1e-7)/m.duration);const before=vertices(w);m.apply((phase.end+1e-7)/m.duration);vertices(w).forEach((p,i)=>assert(p.distanceTo(before[i])<.0001,phase.label+' snaps'));}
 const samples=[.1,.28,.36,.43,.51,.59,.64,.72,.87].map(p=>{m.apply(p);return{p,v:vertices(w)};});for(const {p,v}of samples.reverse()){m.apply(p);vertices(w).forEach((n,i)=>assert(n.distanceTo(v[i])<1e-9));}
}));
test('hen descent transforms rendered meshes and contact diagnostics together',()=>withClip((w,m)=>{
 m.apply(.51);const base=vertices(w),origin=[3,2,-4],heading=73,q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-heading*Math.PI/180),r=m.apply(.51,{origin,heading});vertices(w).forEach((p,i)=>assert(p.distanceTo(base[i].clone().applyQuaternion(q).add(new T.Vector3(...origin)))<1e-6));for(const c of r.contacts)assert(new T.Vector3(...c.worldPoint).distanceTo(new T.Vector3(...c.point).applyQuaternion(q).add(new T.Vector3(...origin)))<1e-9);
}));
for(const borrowed of [false,true])test('hen descent restores '+(borrowed?'borrowed':'owned')+' rig, source attributes, and caller transforms',()=>{
 const w=load(),owner=borrowed?createHenMotion(w):null;if(owner)owner.apply(.37,{speed:1});w.root.position.set(2,3,4);w.root.rotation.y=.3;w.root.updateMatrixWorld(true);const nodes=[];w.root.traverse(o=>nodes.push({o,parent:o.parent,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));const parts=w.parts.map(p=>({p,skeleton:p.skeleton,attrs:Object.fromEntries(Object.entries(p.geometry.attributes).map(([k,a])=>[k,a.array.slice()]))})),m=createHenLedgeDescent(w,{id:'hen'});m.apply(.60);m.restore();m.apply(.75);m.dispose();m.dispose();for(const {p,skeleton,attrs}of parts){assert.equal(p.skeleton,skeleton);for(const[k,a]of Object.entries(attrs))assert.deepEqual(p.geometry.attributes[k].array,a,p.name+' '+k);}for(const n of nodes){assert.equal(n.o.parent,n.parent);assert(n.o.position.distanceTo(n.p)<1e-9);assert(n.o.quaternion.angleTo(n.q)<1e-7);assert(n.o.scale.distanceTo(n.s)<1e-9);}assert.equal(w.root.getObjectByName('wing brace -1'),undefined);assert.throws(()=>m.apply(.5),/disposed/);owner?.dispose();w.dispose();
});
test('hen descent rejects invalid playback and unsupported actor frames before mutation',()=>withClip((w,m)=>{
 m.apply(.5);const before=vertices(w);for(const value of [NaN,Infinity])assert.throws(()=>m.apply(value),/Invalid/);assert.throws(()=>m.apply(.4,{origin:null}),/Invalid/);assert.throws(()=>m.apply(.4,{heading:Infinity}),/Invalid/);vertices(w).forEach((p,i)=>assert(p.distanceTo(before[i])<1e-9));w.root.scale.setScalar(2);assert.throws(()=>m.apply(.4),/unscaled/);w.root.scale.setScalar(1);assert.throws(()=>createHenLedgeDescent(w,{id:'horse'}),/unarmed hen/);
}));

test('descent cloth hook preserves Original paint and restores the material owner',async()=>{
 const {createHenLedgeDescentPaint}=await import('../dist/tactics/hen-ledge-descent-paint.js'),{createHenRoofMantlePaint}=await import('../dist/tactics/hen-roof-mantle-paint.js');
 const make=faction=>{const original=function(shader){shader.uniforms.uHenUnderlay={value:null};if(faction)shader.uniforms.uFactionPaint={value:null};},key=()=> 'authored-hen';return{parts:[{material:{onBeforeCompile:original,customProgramCacheKey:key},geometry:{hasAttribute:()=>true}}],original,key};};
 const baseline=make(false),plain=make(false),basePaint=createHenRoofMantlePaint(baseline),paint=createHenLedgeDescentPaint(plain),shader=()=>({uniforms:{},fragmentShader:'void main(){\n#include <alphamap_fragment>\n}'}),a=shader(),b=shader();baseline.parts[0].material.onBeforeCompile(a);plain.parts[0].material.onBeforeCompile(b);assert.equal(a.fragmentShader,b.fragmentShader,'Original hen shader changed');paint.dispose();assert.equal(plain.parts[0].material.onBeforeCompile,plain.original);assert.equal(plain.parts[0].material.customProgramCacheKey,plain.key);basePaint.dispose();
 const red=make(true),redPaint=createHenLedgeDescentPaint(red),s=shader();red.parts[0].material.onBeforeCompile(s);redPaint.set(1);assert.equal(s.uniforms.uHenDescentCloth.value,1);redPaint.set(0);assert.equal(s.uniforms.uHenDescentCloth.value,0);redPaint.dispose();redPaint.dispose();assert.equal(red.parts[0].material.onBeforeCompile,red.original);assert.equal(red.parts[0].material.customProgramCacheKey,red.key);
});
