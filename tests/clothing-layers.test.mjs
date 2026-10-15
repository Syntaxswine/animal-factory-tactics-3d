import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createLadderMotion,LADDER_PRESETS} from '../dist/tactics/ladder-motion.js';
import {census} from '../tools/clothing-census.mjs';
// The characters' clothes follow what they lie on (docs/tactics/CLOTHING-SKINNING.md). Written apart from the builder's
// own fit: these use skull vertices, not its surface search, and judge what the skinning does, not how it was set.
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed),V=()=>new T.Vector3();
const load=p=>p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));
const weights=(a,i)=>{const w=new Map();for(let k=0;k<4;k++){const x=a.skinWeight.getComponent(i,k);if(x>0){const b=a.skinIndex.getComponent(i,k);w.set(b,(w.get(b)||0)+x);}}return w;};
const skullOf=w=>w.parts.find(m=>/unified/.test(m.name)&&/skull/.test(m.name));
// The neck as the fit reads it: from its base (three quarters of the spine-to-head span below the head joint, 15-22 cm)
// up along the rest neck.
function neckOf(w){w.pose('neutral');w.root.updateMatrixWorld(true);const at=n=>w.bones.find(b=>b.name===n).getWorldPosition(V()),H=at('head'),S=at('spine'),axis=H.clone().sub(S).normalize();
 return {axis,base:H.clone().addScaledVector(axis,-Math.min(.22,Math.max(.15,.75*H.distanceTo(S)))),up(v){return v.clone().sub(this.base).dot(this.axis);}};}
// Each vertex of a layer on the neck (above its base) within 1.5 cm of a skull vertex no more than 1 cm higher up the
// neck than it: the skin it lies on, by the fit's own definition of "under".
function onTheNeck(w){const skull=skullOf(w),neck=neckOf(w),sk=skull.geometry.attributes.position,skin=Array.from({length:sk.count},(_,i)=>V().fromBufferAttribute(sk,i)),pairs=[];
 for(const m of w.parts.filter(m=>m!==skull&&!/forearm and hand|hoof|boot|foot|tail/.test(m.name))){const a=m.geometry.attributes.position;
  for(let i=0;i<a.count;i++){const v=V().fromBufferAttribute(a,i),up=neck.up(v);if(up<0)continue;let best=-1,d=.015;for(let j=0;j<skin.length;j++){if(neck.up(skin[j])>up+.01)continue;const e=v.distanceTo(skin[j]);if(e<d){d=e;best=j;}}if(best>=0)pairs.push({m,i,j:best,hair:/mane|beard/.test(m.name),off:v.clone().sub(skin[best])});}}
 return {skull,pairs};}
// How far each such vertex moves against its skin vertex with the head turned (yaw, nod, roll in degrees); with chest:
// true, how far it would if it kept to the chest, as the name rules weight every layer (the skin vertex's own travel,
// the chest being still).
function slide(w,{skull,pairs},[yaw,nod,roll],chest=false){const head=w.bones.find(b=>b.name==='head');w.pose('neutral');head.quaternion.setFromEuler(new T.Euler(roll*Math.PI/180,yaw*Math.PI/180,-nod*Math.PI/180,'YXZ'));w.root.updateMatrixWorld(true);
 return pairs.map(({m,i,j,off})=>{const s=skull.getVertexPosition(j,V()).applyMatrix4(skull.matrixWorld);return chest?s.sub(V().fromBufferAttribute(skull.geometry.attributes.position,j)).length():m.getVertexPosition(i,V()).applyMatrix4(m.matrixWorld).sub(s).sub(off).length();}).sort((x,y)=>x-y);}
const p95=l=>l[Math.floor(l.length*.95)];
const POSES=[[30,0,0],[-30,0,0],[0,20,0],[0,-15,0],[0,0,20]],posed=(w,[yaw,nod,roll])=>{const head=w.bones.find(b=>b.name==='head');w.pose('neutral');head.quaternion.setFromEuler(new T.Euler(roll*Math.PI/180,yaw*Math.PI/180,-nod*Math.PI/180,'YXZ'));w.root.updateMatrixWorld(true);};
const layer=name=>!/skull|forearm|hoof|boot|foot|tail|mane|beard/.test(name);

test('collars, neckerchiefs, bib and shirt tops and hair move with the neck skin under them as the head turns, nods and tilts',()=>{
 // Measured with the fit: 2-10 mm (95th percentile) on nine mammals for a 30 degree turn; without it, 19-66 mm. The
 // sheep's neckerchief lies under its wool ruff and the pig director's collar under his jowls: the skin under them is
 // the head's own overhang, which the fit leaves alone (a collar is not glued to the jaw above it), so they are held only
 // to sliding no more than they would on the chest's weights (turned 30 degrees, 68.5 mm against 75 mm on the director,
 // 40 against 63 mm on the sheep; nodding 20 degrees, 40.8 against 41.7 mm on the director). An asset change, not a
 // weight, would free them.
 const held=new Set(['sheep','pig-director']);
 for(const p of MAMMALS){const w=load(p);try{const on=onTheNeck(w);assert.ok(on.pairs.length>=6,p.id+': layers on the neck found');
  for(const pose of [[30,0,0],[-30,0,0],[0,20,0],[0,-15,0],[0,0,20]]){const moved=slide(w,on,pose),worst=p95(moved);
   if(held.has(p.id)){const chest=p95(slide(w,on,pose,true));assert.ok(worst<=chest+.001,`${p.id}: the head at ${pose} drags the layers on its neck ${(worst*1000).toFixed(1)} mm, against ${(chest*1000).toFixed(1)} mm on the chest's weights`);}else assert.ok(worst<.012,`${p.id}: the head at ${pose} drags the layers on its neck ${(worst*1000).toFixed(1)} mm (95th percentile) against the skin under them`);}
  // hair grows from the skin: a mane or beard keeps within 1 cm of where it sat on it
  const hair={...on,pairs:on.pairs.filter(x=>x.hair)};if(hair.pairs.length)for(const pose of [[30,0,0],[0,20,0]])assert.ok(p95(slide(w,hair,pose))<.01,p.id+': hair slides off the neck');
 }finally{w.dispose();}}
});

test('the battle posture and the ladder keep the head weight the fit gives a collar, and tuck every other hem vertex as before',()=>{
 const smooth=(lo,hi,x)=>T.MathUtils.smoothstep(x,lo,hi);
 for(const p of MAMMALS){const w=load(p);try{const bone=n=>w.bones.findIndex(b=>b.name===n),head=bone('head'),cloth=w.parts.filter(m=>m.name.includes('shirt')),before=cloth.map(m=>{const a=m.geometry.attributes;return Array.from({length:a.position.count},(_,i)=>weights(a,i));});
  const collared=before.flat().filter(x=>(x.get(head)||0)>.01).length;assert.ok(collared>=5,p.id+': the shirt collar takes head weight from the skin under it ('+collared+')');
  createBattlePosture(w,p);cloth.forEach((m,k)=>{const a=m.geometry.attributes;for(let i=0;i<a.position.count;i++){const now=weights(a,i),was=before[k][i],h=was.get(head)||0;
   assert.ok(Math.abs((now.get(head)||0)-h)<1e-6,`${p.id}: posture changed vertex ${i}'s head weight ${h} -> ${now.get(head)||0}`);let sum=0;for(let n=0;n<4;n++)sum+=a.skinWeight.getComponent(i,n);assert.ok(Math.abs(sum-1)<1e-6);
   // main's hem tuck, restated: the arm's weights kept above the hem or out at the sides, the rest of the torso blended
   // from the hips to the spine over 0.90-1.04 m
   if(!p.proneAim?.tuckHem||h>0)continue;const y=a.position.getY(i),z=a.position.getZ(i),side=z<0?-1:1,keep=1-(1-smooth(1,1.12,y))*(1-smooth(.20,.26,Math.abs(z))),u=(was.get(bone('upperArm'+side))||0)*keep,l=(was.get(bone('forearm'+side))||0)*keep,waist=smooth(.90,1.04,y),torso=Math.max(0,1-u-l);
   for(const [b,x] of [[bone('hips'),torso*(1-waist)],[bone('spine'),torso*waist],[bone('upperArm'+side),u],[bone('forearm'+side),l]])assert.ok(Math.abs((now.get(b)||0)-x)<1e-6,`${p.id}: the hem tuck changed vertex ${i} (bone ${b}: ${x} -> ${now.get(b)||0})`);}});
  // the ladder swaps its own weights in while it plays
  if(['dog','rabbit'].includes(p.id)){const m=createLadderMotion(w,p,LADDER_PRESETS.floor);try{for(const u of [.2,.5,.8]){m.apply(u);cloth.forEach((c,k)=>{const a=c.geometry.attributes;for(let i=0;i<a.position.count;i++)assert.ok(Math.abs((weights(a,i).get(head)||0)-(before[k][i].get(head)||0))<1e-6,p.id+': the ladder dropped a collar\'s head weight at '+u);});}}finally{m.dispose();}}
 }finally{w.dispose();}}
});

test('with the head turned, nodded and tilted, no layer on the neck sinks into another or folds through itself, and the skin stays out of them',()=>{
 // The census (tools/clothing-census.mjs) above the shoulders. Measured: no layer into a layer on any mammal; the skin
 // into a layer at most 39 points and 6 mm (the goat nodding, the horse tilted), against hundreds of points and 11-16 mm
 // on the name rules' weights. The sheep's ruff and the director's jowls over their collars are the asset's (above).
 const held=new Set(['sheep','pig-director']);
 for(const p of MAMMALS){const w=load(p);try{w.pose('neutral');w.root.updateMatrixWorld(true);const at=n=>w.bones.find(b=>b.name===n).getWorldPosition(V()),sh=(at('upperArm-1').y+at('upperArm1').y)/2,sz=Math.min(Math.abs(at('upperArm-1').z),Math.abs(at('upperArm1').z)),now=census(w,{focus:r=>r[1]>sh-.08&&Math.abs(r[2])<sz-.02});
  for(const pose of POSES){posed(w,pose);const found=now().found,cloth=found.filter(f=>layer(f.part)&&layer(f.into)),skin=found.filter(f=>!(layer(f.part)&&layer(f.into))&&(layer(f.part)||layer(f.into)));
   assert.equal(cloth.length,0,`${p.id} at ${pose}: ${cloth.slice(0,3).map(f=>f.part+' into '+f.into+' '+(f.depth*1000).toFixed(1)+' mm').join('; ')}`);
   if(!held.has(p.id))assert.ok(skin.length<=60&&skin.every(f=>f.depth<.008),`${p.id} at ${pose}: the skin and a layer cross at ${skin.length} points, to ${(Math.max(0,...skin.map(f=>f.depth))*1000).toFixed(1)} mm`);}
 }finally{w.dispose();}}
});

test('a layer on the neck moves with the layer under it',()=>{
 // Each vertex of a layer above the neck's base within 1.5 cm of a vertex of another layer, against that vertex, with the
 // head turned 30 degrees and nodded 20: measured 0.3-3.6 mm (95th percentile); each layer taking the skin's weights for
 // itself instead, 0.8-5.1 mm (the dog, the cow, the rabbit past 4).
 for(const p of MAMMALS){const w=load(p);try{const neck=neckOf(w),layers=w.parts.filter(m=>layer(m.name)),P=new Map(layers.map(m=>{const a=m.geometry.attributes.position;return [m,Array.from({length:a.count},(_,i)=>V().fromBufferAttribute(a,i))];})),pairs=[];
  for(const m of layers)P.get(m).forEach((v,i)=>{if(neck.up(v)<0)return;let best=null,d=.015;for(const o of layers){if(o===m)continue;P.get(o).forEach((u,j)=>{const e=v.distanceTo(u);if(e<d){d=e;best={o,j};}});}if(best)pairs.push({m,i,...best,off:v.clone().sub(P.get(best.o)[best.j])});});
  if(!pairs.length)continue;
  for(const pose of [[30,0,0],[-30,0,0],[0,20,0]]){posed(w,pose);const d=pairs.map(({m,i,o,j,off})=>m.getVertexPosition(i,V()).applyMatrix4(m.matrixWorld).sub(o.getVertexPosition(j,V()).applyMatrix4(o.matrixWorld)).sub(off).length()).sort((x,y)=>x-y);
   assert.ok(p95(d)<.004,`${p.id} at ${pose}: the layers on its neck slide ${(p95(d)*1000).toFixed(1)} mm (95th percentile) against the layers under them`);}
 }finally{w.dispose();}}
});
