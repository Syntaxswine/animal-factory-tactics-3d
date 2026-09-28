import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createRoofMantle} from '../dist/tactics/roof-mantle.js';

// The approved pig style is a chest-first mantle, not the earlier upright
// leg-over pose. These checks measure the rendered rig/garment, not profile
// constants. Outfit appearance and anatomy still require visual review.
const profiles=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed&&!p.id.startsWith('pig-'));
const V=()=>new T.Vector3();
const joint=(w,n)=>w.bones.find(b=>b.name===n).getWorldPosition(V());
const indices=m=>[...new Set(m.geometry.index.array)];
const world=(m,i)=>m.getVertexPosition(i,V()).applyMatrix4(m.matrixWorld);
const phase=(m,label)=>{const p=m.phases.find(p=>p.label===label);assert(p,'Missing phase '+label);return p;};
const chest=w=>{
 const hips=joint(w,'hips'),shoulders=joint(w,'upperArm-1').add(joint(w,'upperArm1')).multiplyScalar(.5);
 return {hips,shoulders,axis:shoulders.clone().sub(hips).normalize()};
};
function withAnimal(profile,run){
 const w=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))));let m;
 try{
  w.pose('neutral');w.root.updateMatrixWorld(true);
  const hips=joint(w,'hips').y,shoulder=joint(w,'upperArm1').y;
  // The central front torso excludes sleeves, coat hems, limbs and tails.
  // Include bib/waistcoat surfaces covering the shirt so the outer clothing,
  // rather than a buried shirt alone, can supply the belly contact patch.
  const belly=w.parts.filter(p=>/shirt|overalls|waistcoat|jacket/.test(p.name)).flatMap(mesh=>{
   const a=mesh.geometry.attributes.position;
   return indices(mesh).filter(i=>a.getY(i)>hips+.05&&a.getY(i)<shoulder-.08&&a.getX(i)>.04&&Math.abs(a.getZ(i))<.10).map(i=>({mesh,i}));
  });
  assert(belly.length>=10,'Missing central torso surface samples');
  m=createRoofMantle(w,profile);run(w,m,belly);
 }finally{m?.dispose();w.dispose();}
}
function assertLoadedChest(w,label){
 const {shoulders,axis}=chest(w);
 assert(shoulders.x>.02,`${label}: upper chest remains outside roof (${shoulders.x})`);
 assert(axis.x>.45,`${label}: chest is not hinged forward (${axis.x})`);
 // Local +Z is the authored right leg. Negative Z relative to the hips is
 // the anatomical left lean seen from behind, independent of hip translation.
 assert(axis.z<-.55,`${label}: insufficient anatomical-left chest shift (${axis.z})`);
}
function touchesRoof(mesh,tolerance){
 return indices(mesh).some(i=>{const p=world(mesh,i);return p.x>=-.002&&p.x<=3&&Math.abs(p.z)<=2&&Math.abs(p.y-2)<tolerance;});
}

test('new mantle style covers exactly the nine non-pig mammals',()=>{
 assert.deepEqual(profiles.map(p=>p.id),['horse','goat','bull','cow','donkey','sheep','skunk','rabbit','dog']);
});
for(const profile of profiles){
 test(profile.id+': chest crosses the lip and shifts left before the right leg comes over',()=>withAnimal(profile,(w,m)=>{
  const lean=phase(m,'Lean forward and left'),leg=phase(m,'Right leg over');
  for(const t of [lean.end-.01,leg.start+.01]){m.apply(t/m.duration);assertLoadedChest(w,profile.id+' '+t);}
  let crossed=false;
  for(let i=0;i<=100;i++){
   const r=m.apply((leg.start+(leg.end-leg.start)*i/100)/m.duration),right=r.contacts.find(c=>c.id==='foot1');
   if(right.point[0]>=0&&!crossed){assertLoadedChest(w,profile.id+' first leading-foot crossing');crossed=true;}
  }
  assert(crossed,'Right foot never enters the roof');
 }));

 test(profile.id+': belly visibly settles onto the roof and remains supported throughout the flat pause',()=>withAnimal(profile,(w,m,belly)=>{
  const slide=phase(m,'Slide belly onto roof'),flat=phase(m,'Lie flat');
  let highest=-Infinity;
  for(let i=0;i<=20;i++){m.apply((slide.start+(slide.end-slide.start)*i/20)/m.duration);highest=Math.max(highest,chest(w).hips.y);}
  for(const t of [flat.start+.01,(flat.start+flat.end)/2,flat.end-.01]){
   m.apply(t/m.duration);const {hips,axis}=chest(w),points=belly.map(({mesh,i})=>world(mesh,i)).filter(v=>v.x>=0&&v.x<=3&&Math.abs(v.z)<=2);
   assert(Math.abs(axis.y)<.25,'Torso never reaches a horizontal belly settle');
   assert(highest-hips.y>.015,'No visible downward settle before the pause');
   assert(points.length>=10,'Belly is not over the roof');
   assert(Math.min(...points.map(v=>Math.abs(v.y-2)))<.025,'Central belly floats above roof');
   assert(points.filter(v=>v.y>=1.996&&v.y<2.04).length>=3,'No actual belly contact patch');
  }
 }));

 test(profile.id+': gather keeps real palm or foot support until standing is established',()=>withAnimal(profile,(w,m)=>{
  const gather=phase(m,'Gather legs underneath'),stand=phase(m,'Stand');
  for(const reverse of [false,true])for(let i=0;i<=160;i++){
   const f=reverse?1-i/160:i/160,r=m.apply((gather.start+(stand.end-gather.start)*f)/m.duration);
   let supported=false;
   for(const c of r.contacts.filter(c=>c.planted)){
    assert(c.error<1e-5,'Claimed support is out of reach');
    if(c.id.startsWith('hand'))supported ||= m.grips[c.id==='hand-1'?0:1].meshes.slice(1,5).some(mesh=>touchesRoof(mesh,.004));
    if(c.id.startsWith('foot')){const side=c.id==='foot-1'?-1:1,mesh=w.parts.find(p=>/(hoof|boot|foot)/i.test(p.name)&&p.name.endsWith(' '+side));supported ||= touchesRoof(mesh,.015);}
   }
   assert(supported,`${profile.id}: unsupported rise at ${r.time}`);
  }
 }));
}
