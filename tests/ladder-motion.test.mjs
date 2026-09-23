import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createLadderMotion,LADDER_PRESETS,WIDE_LADDER_EXIT,ladderRailZ} from '../dist/tactics/ladder-motion.js';
const load=p=>p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url))));
for(const p of profiles.filter(p=>!p.unarmed&&(!process.env.REVIEW_ANIMAL||process.env.REVIEW_ANIMAL===p.id)))test(p.id+': ladder contacts, surfaces, timing, reverse playback and cancellation',()=>{
 for(const preset of Object.values(LADDER_PRESETS)){const definition={...preset,...(p.id.startsWith('pig')?{exitWidth:WIDE_LADDER_EXIT}:{})};
  const w=load(p),handHeights=Object.fromEntries([-1,1].map(side=>[side,w.bones.find(b=>b.name==='hand'+side).getWorldPosition(new T.Vector3()).y]));w.root.position.set(1.3,.5,-2.1);w.root.rotation.y=.37;
  const saved=w.parts.map(p=>({si:p.geometry.attributes.skinIndex.array.slice(),sw:p.geometry.attributes.skinWeight.array.slice(),position:p.geometry.attributes.position.array.slice(),index:p.geometry.index.array.slice()})),m=createLadderMotion(w,p,definition),lengths=w.bones.map(b=>b.position.length()),rows=[];
  try{
   assert.equal(m.duration,6);assert.equal(m.phases[0].start,0);assert.equal(m.phases.at(-1).end,6);assert.ok(Math.abs(m.phases.at(-4).start-5.16)<1e-10);assert.ok(Math.abs(m.phases.at(-4).end-m.phases.at(-4).start-.27)<1e-10);assert.ok(Math.abs(m.phases.at(-3).end-m.phases.at(-3).start-.27)<1e-10);
   for(const phase of m.phases)for(let i=0;i<=16;i++){
    const progress=(phase.start+(phase.end-phase.start)*i/16)/m.duration,r=m.apply(progress),joints=w.bones.map(b=>b.getWorldPosition(new T.Vector3())),previous=rows.at(-1);assert.ok(Math.abs(r.time-progress*6)<1e-8);assert.equal(r.duration,6);rows.push({progress,joints,poseTime:r.poseTime});
    w.bones.forEach((b,i)=>{assert.ok(b.matrixWorld.elements.every(Number.isFinite));if(b.parent.isBone)assert.ok(Math.abs(b.position.length()-lengths[i])<1e-8,'rig length changed');});
    // Preserve geometric continuity on the source clock; faster real-time pacing is reviewed in-browser.
    if(previous&&progress>previous.progress){const dt=r.poseTime-previous.poseTime;assert.ok(joints.every((q,i)=>q.distanceTo(previous.joints[i])<dt*4+.005),'trajectory discontinuity '+JSON.stringify({phase:r.phase,progress,dt,jumps:joints.map((q,i)=>[w.bones[i].name,q.distanceTo(previous.joints[i])]).filter(q=>q[1]>=dt*4+.005)}));}
    for(const c of r.contacts){assert.ok(c.error<1e-5);if(!c.planted)continue;const hand=c.id.startsWith('hand'),side=c.id.endsWith('-1')?-1:1,point=new T.Vector3(...c.point);
     if(c.kind==='rung'){assert.ok(c.index>=0&&c.index<definition.rungs);assert.ok(Math.abs(point.y-(definition.firstRung+c.index*definition.spacing+(hand?0:(definition.rungThickness||.055)/2)))<1e-8);}
     if(c.kind==='rail'){assert.ok(point.y<=definition.railTop);assert.ok(Math.abs(Math.abs(point.z)-Math.abs(ladderRailZ(definition,point.y)))<1e-8);}
     if(hand&&c.grasp>.999){const glove=m.grips.find(g=>g.arm.name.endsWith(' '+side));assert.equal(glove.group.visible,true);const q=glove.group.getWorldQuaternion(new T.Quaternion()).invert(),box=new T.Box3();let hook=false,back=false;
      for(const part of glove.meshes)for(let j=0;j<part.geometry.attributes.position.count;j++){const v=part.getVertexPosition(j,new T.Vector3()).applyMatrix4(part.matrixWorld).sub(point).applyQuaternion(q);box.expandByPoint(v);if(v.x>.04&&v.y<.025)hook=true;if(v.x<-.04&&v.y>0)back=true;}
      assert.ok(hook&&back&&box.min.y<-.035&&box.max.y>.035,'glove must visibly wrap the named grip');
     }
     if(previous){const prev=m.apply(previous.progress).contacts.find(q=>q.id===c.id);m.apply(progress);if(prev.planted&&prev.kind===c.kind&&prev.index===c.index)assert.ok(Math.hypot(...c.point.map((v,i)=>v-prev.point[i]))<1e-8,'planted contact slid');}
    }
    if(r.contacts.filter(c=>c.kind==='floor'||c.kind==='landing').length<2)assert.ok(r.contacts.filter(c=>c.planted).length>=3,'climb lost three-point support');
   }
   for(const row of rows.filter((_,i)=>i%17===8).reverse()){m.apply(1-row.progress,{direction:'down'});assert.ok(w.bones.every((b,i)=>b.getWorldPosition(new T.Vector3()).distanceTo(row.joints[i])<1e-7),'descending path or reverse scrub differs');}
   const baseline=m.apply(.45),baseJoints=w.bones.map(b=>b.getWorldPosition(new T.Vector3()));
   for(const heading of [0,37,90,180,273]){const origin=[7,2.12,-3],q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-heading*Math.PI/180),o=new T.Vector3(...origin),r=m.apply(.45,{heading,origin});
    w.bones.forEach((b,i)=>assert.ok(b.getWorldPosition(new T.Vector3()).distanceTo(baseJoints[i].clone().applyQuaternion(q).add(o))<1e-7,'world frame differs'));
    r.contacts.forEach((c,i)=>assert.ok(new T.Vector3(...c.worldPoint).distanceTo(new T.Vector3(...baseline.contacts[i].point).applyQuaternion(q).add(o))<1e-7));
   }
   m.restore();assert.equal(m.diagnostics(),null);assert.ok(w.root.position.distanceTo(new T.Vector3(1.3,.5,-2.1))<1e-8);assert.ok(Math.abs(w.root.rotation.y-.37)<1e-8);assert.equal(w.weapon.root.visible,true);assert.ok(w.diagnostics().contacts.every(c=>c.error<1e-6));assert.equal(w.root.getObjectByName('Equipment shoulder sling').visible,false);
  }finally{m.dispose();for(let i=0;i<w.parts.length;i++){assert.deepEqual(w.parts[i].geometry.attributes.skinIndex.array,saved[i].si);assert.deepEqual(w.parts[i].geometry.attributes.skinWeight.array,saved[i].sw);assert.deepEqual(w.parts[i].geometry.attributes.position.array,saved[i].position);assert.deepEqual(w.parts[i].geometry.index.array,saved[i].index);}assert.equal(w.root.getObjectByName('Equipment shoulder sling'),undefined);assert.ok(w.parts.every(p=>!p.geometry.hasAttribute('ladderTorso')));w.dispose();}
 }
});
test('ladder rejects unprovided upper handholds and unsupported hen contacts',()=>{const p=profiles[0],w=load(p);try{assert.throws(()=>createLadderMotion(w,p,{...LADDER_PRESETS.floor,railTop:2.12}),/upper handholds/);assert.throws(()=>createLadderMotion(w,p,{...LADDER_PRESETS.floor,plane:NaN}),/finite/);}finally{w.dispose();}const hen=profiles.find(p=>p.unarmed),h=load(hen);try{assert.throws(()=>createLadderMotion(h,hen),/Hen wing/);}finally{h.dispose();}});

test('both pigs require the visible flared exit',()=>{for(const p of profiles.filter(p=>p.id.startsWith('pig'))){const w=load(p);try{for(const d of Object.values(LADDER_PRESETS))assert.throws(()=>createLadderMotion(w,p,d),/flared exit/);}finally{w.dispose();}}});

test('invalid construction rolls back; cached clips, guards and disposal preserve actor ownership',()=>{
 const p=profiles.find(p=>p.id==='horse'),w=load(p);w.root.position.set(4,2,3);w.root.rotation.y=.42;
 const weights=w.parts.map(p=>p.geometry.attributes.skinWeight.array.slice()),indices=w.parts.map(p=>p.geometry.index.array.slice()),children=w.root.children.length;
 try{
  assert.throws(()=>createLadderMotion(w,p,{...LADDER_PRESETS.floor,plane:2}),/outside reach/);
  assert.deepEqual(w.root.position.toArray(),[4,2,3]);assert.ok(Math.abs(w.root.rotation.y-.42)<1e-8);assert.equal(w.root.children.length,children);
  w.parts.forEach((p,i)=>{assert.deepEqual(p.geometry.attributes.skinWeight.array,weights[i]);assert.deepEqual(p.geometry.index.array,indices[i]);});
  const d={...LADDER_PRESETS.floor,plane:.351},first=createLadderMotion(w,p,d);first.apply(.43);const pose=w.bones.map(b=>b.getWorldPosition(new T.Vector3()));first.dispose();first.dispose();assert.throws(()=>first.apply(0),/disposed/);
  const cached=createLadderMotion(w,p,d);cached.apply(.43);w.bones.forEach((b,i)=>assert.ok(b.getWorldPosition(new T.Vector3()).distanceTo(pose[i])<1e-9));
  for(const [progress,options]of [[NaN,{}],[.5,{direction:'sideways'}],[.5,{origin:[0,NaN,0]}],[.5,{heading:Infinity}]])assert.throws(()=>cached.apply(progress,options),/Invalid/);
  const originalWeapon=w.weapon;w.equipWeapon({...originalWeapon,id:'hmg'});assert.throws(()=>cached.apply(.4),/Equipment changed/);w.equipWeapon(originalWeapon);cached.dispose();
  assert.equal(w.root.children.length,children);w.parts.forEach((p,i)=>assert.deepEqual(p.geometry.index.array,indices[i]));
 }finally{w.dispose();}
});
