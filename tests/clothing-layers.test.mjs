import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createLadderMotion,LADDER_PRESETS} from '../dist/tactics/ladder-motion.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createGrenadeThrow,GRENADE_THROW} from '../dist/tactics/grenade-throw-motion.js';
import {createGrenadeModel} from '../dist/tactics/grenade-model.js';
import {createRoofMantle} from '../dist/tactics/roof-mantle.js';
import {createLedgeDescent} from '../dist/tactics/ledge-descent.js';
import {census} from '../tools/clothing-census.mjs';
import {snapshot} from '../tools/clothing-main-fixture.mjs';
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
 // Measured, the worst of the five poses: 3.8-9.6 mm (95th percentile) on nine mammals; on the name rules' weights
 // (main), 19-66 mm. The sheep's neckerchief lies under its wool ruff and the pig director's collar under his jowls: the
 // skin under them is the head's own overhang, which the fit leaves alone (a collar is not glued to the jaw above it), so
 // they are held only to sliding no more than they would on the chest's weights (68.5 mm against 75.0 on the director,
 // 40.2 against 63.2 on the sheep). An asset change, not a weight, would free them.
 const held=new Set(['sheep','pig-director']);
 for(const p of MAMMALS){const w=load(p);try{const on=onTheNeck(w);assert.ok(on.pairs.length>=6,p.id+': layers on the neck found');
  for(const pose of [[30,0,0],[-30,0,0],[0,20,0],[0,-15,0],[0,0,20]]){const moved=slide(w,on,pose),worst=p95(moved);
   if(held.has(p.id)){const chest=p95(slide(w,on,pose,true));assert.ok(worst<=chest+.001,`${p.id}: the head at ${pose} drags the layers on its neck ${(worst*1000).toFixed(1)} mm, against ${(chest*1000).toFixed(1)} mm on the chest's weights`);}else assert.ok(worst<.012,`${p.id}: the head at ${pose} drags the layers on its neck ${(worst*1000).toFixed(1)} mm (95th percentile) against the skin under them`);}
  // hair grows from the skin: a mane or beard keeps within 1 cm of where it sat on it
  const hair={...on,pairs:on.pairs.filter(x=>x.hair)};if(hair.pairs.length)for(const pose of [[30,0,0],[0,20,0]])assert.ok(p95(slide(w,hair,pose))<.01,p.id+': hair slides off the neck');
 }finally{w.dispose();}}
});

test('the battle posture and the ladder keep the head weight the fit gives a collar, and tuck and corridor every vertex as main did',()=>{
 const smooth=(lo,hi,x)=>T.MathUtils.smoothstep(x,lo,hi);
 // four slots from a weight list: the largest four, renormalised (what the posture and the ladder write)
 const slots=list=>{const top=list.filter(([,x])=>x>1e-6).sort((p,q)=>q[1]-p[1]).slice(0,4),sum=top.reduce((s,[,x])=>s+x,0)||1,m=new Map();for(const [b,x] of top)m.set(b,(m.get(b)||0)+x/sum);return m;};
 const same=(now,want,label)=>{for(const b of new Set([...now.keys(),...want.keys()]))assert.ok(Math.abs((now.get(b)||0)-(want.get(b)||0))<1e-6,`${label}: bone ${b} ${want.get(b)||0} -> ${now.get(b)||0}`);};
 for(const p of MAMMALS){const w=load(p);try{const bone=n=>w.bones.findIndex(b=>b.name===n),head=bone('head'),cloth=w.parts.filter(m=>m.name.includes('shirt')),read=()=>cloth.map(m=>{const a=m.geometry.attributes;return Array.from({length:a.position.count},(_,i)=>weights(a,i));}),before=read();
  const collared=before.flat().filter(x=>(x.get(head)||0)>.01).length;assert.ok(collared>=5,p.id+': the shirt collar takes head weight from the skin under it ('+collared+')');
  createBattlePosture(w,p);const tucked=read();
  // main's hem tuck, restated: the arm's weights kept above the hem or out at the sides, any other bone's (a collar's head)
  // kept as it is, and the rest of the torso blended from the hips to the spine over 0.90-1.04 m
  cloth.forEach((m,k)=>{const a=m.geometry.attributes;for(let i=0;i<a.position.count;i++){const was=before[k][i],now=tucked[k][i];let sum=0;for(let n=0;n<4;n++)sum+=a.skinWeight.getComponent(i,n);assert.ok(Math.abs(sum-1)<1e-6);
   if(!p.proneAim?.tuckHem){same(now,was,p.id+' vertex '+i+' without a hem tuck');continue;}
   const y=a.position.getY(i),z=a.position.getZ(i),side=z<0?-1:1,up=bone('upperArm'+side),lo=bone('forearm'+side),keep=1-(1-smooth(1,1.12,y))*(1-smooth(.20,.26,Math.abs(z))),u=(was.get(up)||0)*keep,l=(was.get(lo)||0)*keep;
   const other=[...was].filter(([b])=>![up,lo,bone('hips'),bone('spine')].includes(b)),held=other.reduce((s,[,x])=>s+x,0),waist=smooth(.90,1.04,y),torso=Math.max(0,1-u-l-held);
   same(now,slots([[bone('hips'),torso*(1-waist)],[bone('spine'),torso*waist],[up,u],[lo,l],...other]),`${p.id}: the hem tuck at vertex ${i}`);}});
  // the dog's and rabbit's inner sleeve corridor on the ladder (ladder-motion.js), restated: the arm's share is the larger
  // of what the cloth had (outside the rabbit's medial band) and a corridor round the upper arm, split at the elbow, the
  // rest the spine's, any other bone's kept; swapped in while the ladder plays
  if(['dog','rabbit'].includes(p.id)){w.pose('neutral');w.root.position.set(0,0,0);w.root.rotation.set(0,0,0);w.root.updateMatrixWorld(true);const REST=new Map(w.bones.map(b=>[b.name,b.getWorldPosition(V())])),rest=n=>REST.get(n).clone();
   const m=createLadderMotion(w,p,LADDER_PRESETS.floor);try{for(const t of [.2,.5,.8]){m.apply(t);const now=read();
    cloth.forEach((c,k)=>{const a=c.geometry.attributes;for(let i=0;i<a.position.count;i++){const q=V().fromBufferAttribute(a.position,i),side=q.z<0?-1:1,up=bone('upperArm'+side),lo=bone('forearm'+side),U=rest('upperArm'+side),axis=rest('forearm'+side).sub(U),s=T.MathUtils.clamp(q.clone().sub(U).dot(axis)/axis.lengthSq(),0,1.2),distance=q.distanceTo(U.clone().addScaledVector(axis,s));
     const corridor=(1-smooth(.095,.13,distance))*smooth(p.id==='dog'?.215:.24,p.id==='dog'?.235:.27,Math.abs(q.z)),was=tucked[k][i],arm=(was.get(up)||0)+(was.get(lo)||0),medial=p.id==='rabbit'?smooth(.21,.25,Math.abs(q.z)):1,total=Math.max(arm*medial,corridor),elbow=1-smooth(.98,1.06,q.y);
     const other=[...was].filter(([b])=>![up,lo,bone('hips'),bone('spine')].includes(b)),k1=1-other.reduce((s,[,x])=>s+x,0);
     same(now[k][i],other.length?slots([[bone('spine'),(1-total)*k1],[up,total*(1-elbow)*k1],[lo,total*elbow*k1],...other]):slots([[bone('spine'),1-total],[up,total*(1-elbow)],[lo,total*elbow]]),`${p.id}: the ladder's corridor at vertex ${i}, ${t}`);}});}}finally{m.dispose();}}
 }finally{w.dispose();}}
});

test('the fit leaves everything that reads the rig by its names as main had it: the weights, the arms, the falls, the fire and the idle',async()=>{
 // tests/fixtures/clothing-main.json is tools/clothing-main-fixture.mjs run on main (b546dfb). The weights read as the
 // parts' names give them (the fitted vertices from what the fit kept) and every arm weight as drawn hash alike, so the
 // fit moved nothing else and no arm; the casualty's four fallen poses, the burning fire's cards and the idle's seed-1
 // looks are main's (the idle's key, which seeds its loops and keys its fitted limits, reads the names' weights).
 const main=JSON.parse(fs.readFileSync(new URL('./fixtures/clothing-main.json',import.meta.url))),now=await snapshot();
 for(const p of MAMMALS){const a=main[p.id],b=now[p.id];assert.ok(a&&b,p.id+' in the fixture');
  assert.deepEqual(b.named,a.named,p.id+': a weight the fit did not record changed, or a recorded one is not what the name gave');
  assert.deepEqual(b.arms,a.arms,p.id+': an arm weight changed');
  let fall=0;a.fallen.forEach((pose,i)=>pose.forEach((v,j)=>v.forEach((x,k)=>fall=Math.max(fall,Math.abs(x-b.fallen[i][j][k])))));assert.ok(fall<2e-5,`${p.id}: a fallen pose moved ${(fall*1000).toFixed(3)} mm`);
  assert.deepEqual(b.fire,a.fire,p.id+': the fire\'s cards changed');assert.deepEqual(b.looks,a.looks,p.id+': the idle\'s seed-1 looks changed');}
});

test('the fit moves only hair and the cloth in the field round the neck, inside the shoulder joints',()=>{
 // Restated apart from the builder: the neck's base and axis as above, the skull's median radius R round the axis (over
 // the middle of the branch), and the shoulder joints' distance from it; a recorded vertex of a layer lies no lower than
 // a tenth of the branch below the base and no further out than R + 13 cm or the shoulder joints.
 for(const p of MAMMALS){const w=load(p);try{const neck=neckOf(w),skull=skullOf(w),at=n=>w.bones.find(b=>b.name===n).getWorldPosition(V()),H=at('head'),S=at('spine'),NECK=Math.min(.22,Math.max(.15,.75*H.distanceTo(S)));
  const radius=v=>{const d=v.clone().sub(neck.base);return d.addScaledVector(neck.axis,-d.dot(neck.axis)).length();},sk=skull.geometry.attributes.position,r=[];for(let i=0;i<sk.count;i++){const v=V().fromBufferAttribute(sk,i),u=neck.up(v)/NECK;if(u>.2&&u<.8)r.push(radius(v));}r.sort((x,y)=>x-y);
  const out=Math.min(r[r.length>>1]+.13,radius(at('upperArm-1')),radius(at('upperArm1')));let moved=0;
  for(const m of w.parts){const f=m.geometry.userData.layerFit;if(!f)continue;assert.ok(!/skull|forearm|hoof|boot|foot|tail/.test(m.name),p.id+': the fit moved '+m.name);if(/mane|beard/.test(m.name))continue;
   for(const i of f.vertices){const v=V().fromBufferAttribute(m.geometry.attributes.position,i);moved++;assert.ok(neck.up(v)>=-.1*NECK-1e-6&&radius(v)<out+1e-6,`${p.id}: ${m.name} vertex ${i} moved outside the field (${(neck.up(v)*100).toFixed(1)} cm up, ${(radius(v)*100).toFixed(1)} cm out)`);}}
  assert.ok(moved>0,p.id+': the fit moved some cloth');
 }finally{w.dispose();}}
});

test('with the head turned, nodded and tilted, no layer on the neck sinks into another or folds through itself, and the skin stays out of them',()=>{
 // The census (tools/clothing-census.mjs) above the shoulders. Measured: no layer into a layer on any mammal; the skin
 // and a layer crossing at most at 39 points and 5.7 mm (the goat; the horse 18 points), against 219-4,095 points at
 // 10.6-16.0 mm on the name rules' weights (the donkey at none either way). The sheep's ruff and the director's jowls
 // over their collars are the asset's (above).
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

test('a character made from mesh data already fitted copies the fit: the same weights and the same record',()=>{
 for(const p of MAMMALS){const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))),a=p.create(data),b=p.create(data),c=load(p);
  try{for(let j=0;j<c.parts.length;j++)for(const w of [a,b]){const x=w.parts[j].geometry,y=c.parts[j].geometry;
    assert.ok(x.attributes.skinIndex.array.every((v,i)=>v===y.attributes.skinIndex.array[i])&&x.attributes.skinWeight.array.every((v,i)=>v===y.attributes.skinWeight.array[i]),p.id+': '+c.parts[j].name+' weights differ from a fresh fit');
    const f=x.userData.layerFit,g=y.userData.layerFit;assert.equal(!!f,!!g,p.id+': '+c.parts[j].name+' record');if(f)assert.ok(f.vertices.length===g.vertices.length&&f.vertices.every((v,i)=>v===g.vertices[i])&&f.weight.every((v,i)=>v===g.weight[i])&&f.index.every((v,i)=>v===g.index[i]),p.id+': '+c.parts[j].name+' record differs');}}
  finally{[a,b,c].forEach(w=>w.dispose());}}
});

test('through the throw, the cloth at the arms lies where the name rules put it',()=>{
 // The census reads the arms as everything within 7 cm of their bones at rest; the fit changes three vertices there, the
 // tops of the horse's overall straps beside his shoulders, moving them at most 0.6 mm through the throw from where their name
 // rules' weights (the fit's record) would put them, so what the census sees at the arms is main's.
 const seg=(q,a,b)=>{const ab=b.clone().sub(a),t=Math.max(0,Math.min(1,q.clone().sub(a).dot(ab)/ab.lengthSq()));return q.distanceTo(a.clone().addScaledVector(ab,t));};
 for(const p of MAMMALS){const w=load(p);try{w.pose('neutral');w.root.updateMatrixWorld(true);const at=n=>w.bones.find(b=>b.name===n).getWorldPosition(V()),arms=[-1,1].map(k=>['upperArm','forearm','hand','fingers'].map(n=>at(n+k)));
  const near=[];for(const m of w.parts){const f=m.geometry.userData.layerFit;if(!f)continue;f.vertices.forEach((v,k)=>{const q=V().fromBufferAttribute(m.geometry.attributes.position,v);if(Math.min(...arms.map(([u,e,h,g])=>Math.min(seg(q,u,e),seg(q,e,h),seg(q,h,g))))<.07)near.push({m,v,k});});}
  if(!near.length)continue;const g=createGrenadeModel(),mo=createGrenadeThrow(w,g,{animal:p.id});let far=0;
  try{for(let i=0;i<=Math.round(GRENADE_THROW.duration*30);i+=2){mo.at(i/30);w.root.updateMatrixWorld(true);
   for(const {m,v,k} of near){const a=m.geometry.attributes,f=m.geometry.userData.layerFit,si=[0,1,2,3].map(j=>a.skinIndex.getComponent(v,j)),sw=[0,1,2,3].map(j=>a.skinWeight.getComponent(v,j)),now=m.getVertexPosition(v,V());
    a.skinIndex.setXYZW(v,...f.index.subarray(4*k,4*k+4));a.skinWeight.setXYZW(v,...f.weight.subarray(4*k,4*k+4));far=Math.max(far,now.distanceTo(m.getVertexPosition(v,V())));a.skinIndex.setXYZW(v,...si);a.skinWeight.setXYZW(v,...sw);}}}
  finally{mo.dispose();g.dispose?.();}
  assert.ok(far<.001,`${p.id}: the fit moves the cloth at its arms ${(far*1000).toFixed(1)} mm in the throw (${near.length} vertices)`);
 }finally{w.dispose();}}
});

test('hair follows the skin it grows from through the mantle, the descent and the throw without folding through itself',()=>{
 // The census round the hair (rest points within 3 cm of it), the roof mantle and the ledge descent in 11 frames each and
 // the throw every 0.2 s. Measured: no fold in the mantle or the descent; the throw folds the horse's mane 5.8 mm at most
 // (the inside of the crest as it bends). A mane eased off the skin back to the head's weights (in full within 1 cm, its
 // own 4 cm out) sheared through itself instead: 10.8 mm in the mantle, 5.1 in the descent, 14.3 in the throw; eased
 // to 8 cm, 4.0 mm in the mantle. Where the skin folds the mane folds with it (the prone aim: CLOTHING-SKINNING.md).
 for(const p of MAMMALS){const make=weapon=>{const w=load(p);createBattlePosture(w,p);createWorkerLocomotion(w,p);if(weapon)w.equipWeapon(createWeaponModel(weapon));w.pose('neutral');w.root.updateMatrixWorld(true);return w;};
  const first=make(null),hair=first.parts.filter(m=>/mane|beard/.test(m.name)),box=new T.Box3();for(const m of hair){const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++)box.expandByPoint(V().fromBufferAttribute(a,i));}first.dispose();
  if(!hair.length)continue;box.expandByScalar(.03);const focus=r=>box.containsPoint(V().set(...r));
  for(const [motion,weapon,run,most] of [['the mantle','rifle',(w,m)=>{const mo=createRoofMantle(w,p);try{for(let i=0;i<=10;i++){mo.apply(i/10);m('u '+i/10);}}finally{mo.dispose();}},0],
   ['the descent','rifle',(w,m)=>{const mo=createLedgeDescent(w,p);try{for(let i=0;i<=10;i++){mo.apply(i/10);m('u '+i/10);}}finally{mo.dispose();}},0],
   ['the throw',null,(w,m)=>{const g=createGrenadeModel(),mo=createGrenadeThrow(w,g,{animal:p.id});try{for(let t=0;t<=GRENADE_THROW.duration+1e-9;t+=.2){mo.at(t);m('t '+t.toFixed(1));}}finally{mo.dispose();}},.008]]){
   const w=make(weapon);try{const now=census(w,{focus});run(w,label=>{const fold=now().found.filter(f=>f.kind==='self'&&/mane|beard/.test(f.part));
    assert.ok(fold.every(f=>f.depth<=most),`${p.id} in ${motion} at ${label}: ${fold[0]?.part} folds through itself ${(Math.max(...fold.map(f=>f.depth))*1000).toFixed(1)} mm`);});}finally{w.dispose();}}}
});
