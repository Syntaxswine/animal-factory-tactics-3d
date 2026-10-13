import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createWorkerLocomotion} from '../dist/tactics/worker-locomotion.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createLadderMotion,LADDER_PRESETS,WIDE_LADDER_EXIT} from '../dist/tactics/ladder-motion.js';
import {createIdle,rigKey} from '../dist/tactics/idle-motion.js';
import {holdSkin,skinHolds} from '../dist/tactics/skin-holds.js';
// Two controllers that rewrite a worker's skin and put it back on dispose (the ladder motion, the idle) used to compose
// only last in, first out: disposing the ladder under a live idle left 211-974 vertices of every mammal with the ladder's
// weights for good (main 74a8a6b). Skin holds (skin-holds.js) run the restores newest first whatever the dispose order.
const MAMMALS=ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed),profile=id=>MAMMALS.find(p=>p.id===id);
// A worker as the game builds one: posture, locomotion, a rifle, standing neutral.
function build(p){const w=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));createBattlePosture(w,p);createWorkerLocomotion(w,p);w.equipWeapon(createWeaponModel('rifle'));w.pose('neutral');return w;}
const ladderOf=p=>({...LADDER_PRESETS.floor,...(p.id.startsWith('pig')?{exitWidth:WIDE_LADDER_EXIT}:{})});
const weights=w=>w.parts.map(m=>({name:m.name,si:m.geometry.attributes.skinIndex.array.slice(),sw:m.geometry.attributes.skinWeight.array.slice()}));
// the worker's own skin: weights, the skeleton each part is bound to and its bind matrix, and the rig's key
const own=w=>({key:rigKey(w),weights:weights(w),bound:w.parts.map(m=>({skeleton:m.skeleton,bind:m.bindMatrix.clone()}))});
// vertices whose four bones or weights differ (a part that changed size counts every vertex)
function differ(a,b){if(a.si.length!==b.si.length)return Math.max(a.si.length,b.si.length)/4;let n=0;for(let i=0;i<a.si.length;i+=4)for(let j=0;j<4;j++)if(a.si[i+j]!==b.si[i+j]||a.sw[i+j]!==b.sw[i+j]){n++;break;}return n;}
const total=(a,b)=>a.reduce((n,x,k)=>n+differ(x,b[k]),0);
const neckOf=w=>w.parts[0].skeleton.bones.find(b=>b.name==='idle neck');
function assertOwn(w,o,label){
 const now=weights(w);now.forEach((x,k)=>assert.equal(differ(x,o.weights[k]),0,label+': '+x.name+' keeps vertices with weights that are not its own'));
 w.parts.forEach((m,k)=>{assert.ok(m.skeleton===o.bound[k].skeleton,label+': '+m.name+' is bound to another skeleton');assert.ok(m.bindMatrix.equals(o.bound[k].bind),label+': '+m.name+' bind matrix');});
 assert.equal(neckOf(w),undefined,label+': the idle neck bone is still bound');let neck=0;w.root.traverse(o=>{if(o.name==='idle neck')neck++;});assert.equal(neck,0,label+': the idle neck bone is still in the rig');
 assert.equal(rigKey(w),o.key,label+': rig key');assert.deepEqual(skinHolds(w),[],label+': holds left on the worker');
}

test('skin holds put the skin back newest first, whatever order they are released in',()=>{
 for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){const worker={},log=[];
  const holds=['a','b','c'].map((name,i)=>holdSkin(worker,name,()=>{assert.ok(holds.slice(i+1).every(h=>h.released),name+' put back while a later hold was live (order '+order+')');log.push(name);}));
  for(const i of order){holds[i].release();holds[i].release();}
  assert.deepEqual(log,['c','b','a'],'released '+order.map(i=>'abc'[i]).join(''));assert.deepEqual(skinHolds(worker),[]);}
 // a released hold under a live one waits; the holds report where they stand; another worker's holds are its own
 const worker={},other={},log=[],[a,b,c]=['a','b','c'].map(name=>holdSkin(worker,name,()=>log.push(name))),x=holdSkin(other,'x',()=>log.push('x'));
 assert.ok(c.top&&!b.top&&!a.top&&x.top);assert.deepEqual(a.above(),['c','b']);assert.deepEqual(c.above(),[]);
 b.release();assert.deepEqual(log,[]);assert.deepEqual(skinHolds(worker),[{owner:'a',released:false},{owner:'b',released:true},{owner:'c',released:false}]);
 c.release();assert.deepEqual(log,['c','b']);assert.ok(a.top);assert.deepEqual(skinHolds(other),[{owner:'x',released:false}]);
 a.release();x.release();assert.deepEqual(log,['c','b','a','x']);
 // a restore that throws does not keep the holds under it from putting their skin back
 const w2={},seen=[],low=holdSkin(w2,'low',()=>seen.push('low')),bad=holdSkin(w2,'bad',()=>{throw Error('broken restore');});
 low.release();assert.throws(()=>bad.release(),/broken restore/);assert.deepEqual(seen,['low']);assert.deepEqual(skinHolds(w2),[]);
 assert.throws(()=>holdSkin({},'none'),/needs a function/);
});

// The reproduction from the 2026-10-09 review: every mammal, a ladder at 0.3, an idle at 2 s on top, both disposal orders.
for(const p of MAMMALS)test(p.id+': a ladder and an idle on top put the worker\'s own skin back in either disposal order',()=>{
 for(const ladderFirst of [true,false]){const w=build(p),o=own(w),label=p.id+(ladderFirst?', ladder disposed first':', idle disposed first');
  try{
   const ladder=createLadderMotion(w,p,ladderOf(p));ladder.apply(.3);const climbing=weights(w);
   const idle=createIdle(w,{seed:3,eye:p.eye});idle.at(2);const idling=weights(w);
   // the fixture can fail: both controllers rewrite the cloth (the ladder 27 vertices off the arms on the sheep to 774 on
   // the dog, the idle 2,047-2,872 more, measured on 74a8a6b), and the character's fit of the neck cloth
   // (geometry.userData.layerFit) is set aside under the idle
   assert.ok(o.weights.reduce((n,x,k)=>n+(/forearm and hand/.test(x.name)?0:differ(x,climbing[k])),0)>=20,label+': the ladder rewrote too little to test');
   assert.ok(total(climbing,idling)>=1000,label+': the idle rewrote too little to test');
   const fitted=w.parts.filter(m=>m.geometry.userData.layerFit?.vertices.length);assert.ok(fitted.length>0,label+': no part carries the neck-cloth fit');
   if(ladderFirst){
    ladder.dispose();
    // the idle keeps the skin it built (weights and its neck bone); only a gripping arm lets go, to its own weights
    weights(w).forEach((x,k)=>{const d=differ(x,idling[k]);if(d)assert.ok(/forearm and hand/.test(x.name)&&differ(x,o.weights[k])===0,label+': '+x.name+' lost '+d+' vertices of the idle\'s weights under it');});
    assert.ok(neckOf(w),label+': the idle neck bone was unbound under the idle');
    assert.throws(()=>ladder.apply(.3),/disposed/);assert.throws(()=>ladder.restore(),/disposed/);
    assert.deepEqual(skinHolds(w),[{owner:'ladder motion',released:true},{owner:'idle',released:false}]);
    idle.at(3);idle.dispose();
   }else{idle.dispose();ladder.dispose();}
   assertOwn(w,o,label);
  }finally{w.dispose();}
 }
});

test('a ladder under a live idle will not put its weights on again, and works again once the idle is disposed',()=>{
 for(const p of [profile('horse'),profile('dog')]){const w=build(p),o=own(w);
  try{
   const ladder=createLadderMotion(w,p,ladderOf(p));ladder.apply(.3);const idle=createIdle(w,{seed:3,eye:p.eye});idle.at(2);const idling=weights(w),bones=w.bones.map(b=>b.quaternion.clone());
   for(const call of [()=>ladder.apply(.4),()=>ladder.transition(.5),()=>ladder.restore('carry')])assert.throws(call,/made after it holds the skin \(idle\)/);
   assert.equal(total(weights(w),idling),0,p.id+': a refused call changed the skin');assert.ok(w.bones.every((b,i)=>b.quaternion.equals(bones[i])),p.id+': a refused call moved the rig');
   idle.dispose();ladder.apply(.4);ladder.transition(.5);ladder.restore('carry');ladder.apply(.3);ladder.dispose();
   assertOwn(w,o,p.id);
  }finally{w.dispose();}
 }
});

test('an idle disposed under a ladder made after it waits for the ladder: its neck at rest, its key kept, no second idle',()=>{
 const p=profile('horse');
 for(const idleFirst of [true,false]){const w=build(p),o=own(w),label=idleFirst?'idle disposed first':'ladder disposed first';
  try{
   const idle=createIdle(w,{seed:5,eye:p.eye});idle.poseHead(25,10);const neck=neckOf(w);assert.ok(neck&&neck.quaternion.angleTo(new T.Quaternion())>.05,label+': the fixture needs a bent neck');
   const ladder=createLadderMotion(w,p,ladderOf(p));ladder.apply(.3);
   if(idleFirst){
    idle.dispose();
    assert.ok(neckOf(w)===neck,label+': the neck bone left before the ladder');assert.ok(neck.quaternion.angleTo(new T.Quaternion())<1e-9,label+': the waiting neck bone stays bent');
    assert.equal(rigKey(w),o.key,label+': the rig key while the idle waits');assert.throws(()=>createIdle(w,{seed:1,eye:p.eye}),/made after it \(ladder motion\) and keeps its skin until that is disposed/);
    assert.throws(()=>idle.at(1),/disposed/);assert.deepEqual(skinHolds(w),[{owner:'idle',released:true},{owner:'ladder motion',released:false}]);
    ladder.apply(.4);ladder.dispose();
   }else{ladder.dispose();idle.dispose();}
   assertOwn(w,o,label);
   const again=createIdle(w,{seed:1,eye:p.eye});again.at(1);again.dispose();assertOwn(w,o,label+', a later idle');
  }finally{w.dispose();}
 }
});
