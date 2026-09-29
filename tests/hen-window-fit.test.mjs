import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createHen} from '../dist/tactics/hen-worker.js';
import {createHenWindowFit,HEN_WINDOW_PHASES,HEN_WINDOW_IMPACT} from '../dist/tactics/hen-window-fit.js';
import {WINDOW_SOLIDS} from '../dist/tactics/body-collisions.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/hen-10k-data.json',import.meta.url)));
const make=()=>createHen(data),v=()=>new T.Vector3();
const vertices=w=>w.parts.flatMap(m=>Array.from({length:m.geometry.attributes.position.count},(_,i)=>m.getVertexPosition(i,v()).applyMatrix4(m.matrixWorld).toArray()));

test('rigid controls preserve neutral surfaces and source geometry; restore reattaches safely',()=>{
 const w=make(),base=vertices(w),original=w.skeleton,bones=[...w.bones],attrs=w.parts.map(m=>({...m.geometry.attributes}));
 const fit=createHenWindowFit(w);fit.apply(0);const posed=vertices(w);
 const vest=w.parts.find(m=>m.name==='fitted waistcoat'),originalVest=attrs[w.parts.indexOf(vest)];
 for(const key of ['paintPosition','paintNormal'])assert.deepEqual(vest.geometry.attributes[key].array,originalVest[key].array,'neutral paint '+key);
 for(let i=0;i<base.length;i++)for(let k=0;k<3;k++)assert(Math.abs(posed[i][k]-base[i][k]-w.root.position.getComponent(k))<1e-6);
 fit.apply(3.5);const mid=vertices(w);assert.notDeepEqual(vest.geometry.attributes.paintPosition.array,originalVest.paintPosition.array);fit.restore();assert.equal(w.skeleton,original);assert.deepEqual(w.bones,bones);
 for(let i=0;i<w.parts.length;i++)for(const [name,a]of Object.entries(attrs[i]))assert.equal(w.parts[i].geometry.attributes[name],a);
 fit.apply(3.5);assert.deepEqual(vertices(w),mid);
 fit.apply(8);for(const key of ['paintPosition','paintNormal'])assert.deepEqual(vest.geometry.attributes[key].array,originalVest[key].array,'final neutral paint '+key);
 const extra=w.skeleton;extra.computeBoneTexture();let disposed=0;extra.boneTexture.addEventListener('dispose',()=>disposed++);
 fit.dispose();fit.dispose();assert.equal(disposed,1);assert.equal(w.skeleton,original);assert.throws(()=>fit.apply(0),/disposed/);w.dispose();
});

test('eight-second poses remain upright, retain native bone lengths, and have no root jumps',()=>{
 const w=make(),fit=createHenWindowFit(w),positions=w.bones.map(b=>b.position.clone()),names=Object.fromEntries(w.bones.map(b=>[b.name,b]));let previous=null,peak=0;
 for(let i=0;i<=800;i++){
  const t=i/100,d=fit.apply(t);assert.equal(d.supported,false);assert.equal(d.errors.length,4);assert(d.errors.every(e=>e.constraint==='reference'&&e.error>=0));
  const hip=names.pelvis.getWorldPosition(v()),chest=names.breast.getWorldPosition(v()),head=names.head.getWorldPosition(v());assert(chest.y>hip.y);assert(head.y>hip.y);
  for(const s of [-1,1])assert(names['foot '+s].getWorldPosition(v()).y<hip.y);
  for(let j=0;j<w.bones.length;j++){assert(w.bones[j].position.distanceTo(positions[j])<1e-12);assert.deepEqual(w.bones[j].scale.toArray(),[1,1,1]);}
  if(previous)peak=Math.max(peak,w.root.position.distanceTo(previous));previous=w.root.position.clone();
 }
 assert(peak<.035,'10 ms root displacement '+peak);
 for(const t of HEN_WINDOW_PHASES.slice(1).map(p=>p.start)){fit.apply(t-1e-5);const before=w.bones.map(b=>b.getWorldPosition(v()));fit.apply(t+1e-5);for(let i=0;i<before.length;i++)assert(before[i].distanceTo(w.bones[i].getWorldPosition(v()))<.001);}
 fit.apply(2.8);const a=vertices(w);fit.apply(7.4);fit.apply(2.8);assert.deepEqual(vertices(w),a);assert.throws(()=>fit.apply(NaN),/finite/);fit.dispose();w.dispose();
});

test('posed triangles clear the unchanged opening and floor; final native body fits adjacent tile',()=>{
 const w=make(),fit=createHenWindowFit(w),solids=WINDOW_SOLIDS.map(s=>new T.Box3(new T.Vector3(...s.lo).addScalar(.001),new T.Vector3(...s.hi).addScalar(-.001))),tri=new T.Triangle(),bounds=new T.Box3();
 let final;
 for(let i=0;i<=200;i++){
  const t=i*.04;fit.apply(t);const all=new T.Box3();
  for(const m of w.parts){const ps=Array.from({length:m.geometry.attributes.position.count},(_,j)=>m.getVertexPosition(j,v()).applyMatrix4(m.matrixWorld));for(const p of ps){assert(p.y>=-.001,'floor at '+t);all.expandByPoint(p);}const idx=m.geometry.index.array;
   for(let j=0;j<idx.length;j+=3){tri.set(ps[idx[j]],ps[idx[j+1]],ps[idx[j+2]]);bounds.setFromPoints([tri.a,tri.b,tri.c]);assert(!solids.some(b=>b.intersectsBox(bounds)&&b.intersectsTriangle(tri)),m.name+' at '+t);}}
  if(i===200)final=all;
 }
 assert(final.min.x>=.09&&final.max.x<=1);fit.dispose();w.dispose();
});

test('invalid native parts fail without leaving controls or changing the skeleton',()=>{
 const w=make(),s=w.skeleton,count=w.bones[0].children.length;w.parts=w.parts.filter(m=>m.name!=='apron waist tie');assert.throws(()=>createHenWindowFit(w),/native part/);assert.equal(w.skeleton,s);assert.equal(w.bones[0].children.length,count);w.dispose();
});

test('glass breaks on actual hen beak passage and rewinds deterministically',()=>{
 const w=make(),fit=createHenWindowFit(w);
 function leadingBeak(){const m=w.parts.find(p=>p.name==='short hooked beak');let x=-Infinity;for(let i=0;i<m.geometry.attributes.position.count;i++){const p=m.getVertexPosition(i,v()).applyMatrix4(m.matrixWorld);if(p.y>.875&&p.y<1.525&&Math.abs(p.z)<.475)x=Math.max(x,p.x);}return x;}
 try{
  assert.equal(fit.apply(.8).glassTime,-1,'glass broke on mannequin clock');
  assert.equal(fit.apply(HEN_WINDOW_IMPACT-.01).glassTime,-1);assert(leadingBeak()<0,'beak crossed before impact');
  assert.equal(fit.apply(HEN_WINDOW_IMPACT).glassTime,0);assert(Math.abs(leadingBeak())<.002,'break is not at the pane');
  assert(Math.abs(fit.apply(HEN_WINDOW_IMPACT+.01).glassTime-.01)<1e-12);assert(leadingBeak()>0);
  assert(Math.abs(fit.apply(4).glassTime-(4-HEN_WINDOW_IMPACT))<1e-12);
  assert.equal(fit.apply(2).glassTime,-1,'rewind did not restore intact pane');
 }finally{fit.dispose();w.dispose();}
});
