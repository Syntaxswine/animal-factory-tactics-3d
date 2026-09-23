import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {WEAPON_MODELS,createWeaponModel} from '../dist/tactics/weapon-models.js';
import {BattleTraversal,ladderFrame} from '../dist/tactics/battle-traversal.js';
import {createLadderJourney} from '../dist/tactics/ladder-journey.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {towerEntry,towerSlots,towerPost} from '../dist/tactics/tower-geometry.js';
const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='horse');
const tower={kind:'iron-searchlight-ladder-tower',x:10,y:10,z:0},bottom=towerEntry(tower),top=towerSlots(tower)[0];top.towerPost=towerPost(tower,top);
const event={id:1,unitId:0,access:'ladder',direction:'up',tower,from:bottom,to:top};
const make=()=>profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url))));
const accessories=w=>w.root.children.filter(c=>/^Equipment /.test(c.name));
for(const id of Object.keys(WEAPON_MODELS))test(id+': full journey, phase cancellations and casualty restore shared equipment',()=>{
 const worker=make(),gun=createWeaponModel(id),root=new T.Group();root.add(worker.root);worker.equipWeapon(gun);worker.pose('carry');
 const posture=createBattlePosture(worker,profile),model={worker,root,profile,posture},v=new BattleTraversal();
 try{
  for(const direction of ['up','down']){
   const e={...event,direction,from:direction==='up'?bottom:top,to:direction==='up'?top:bottom};
   const journey=createLadderJourney(worker,profile,e,ladderFrame(tower));
   const times=journey.phases.map(p=>(p.start+p.end)/2),duration=journey.duration;
   for(const phase of journey.phases)for(const t of [phase.start,...[.25,.5,.75].map(f=>phase.start+(phase.end-phase.start)*f),phase.end]){
    const result=journey.apply(t/duration);assert.ok(result.worldRoot.every(Number.isFinite));assert.equal(worker.weapon,gun);assert.ok(gun.root.matrixWorld.elements.every(Number.isFinite));
    if(gun.hose&&gun.hose.visible){const a=gun.hose.geometry.attributes.position,radial=gun.hose.geometry.parameters.radialSegments,ring=radial+1;for(const [start,anchor]of [[0,gun.anchors.hoseOut],[a.count-ring,gun.anchors.hoseIn]]){const center=new T.Vector3();for(let i=0;i<radial;i++)center.add(new T.Vector3().fromBufferAttribute(a,start+i));center.divideScalar(radial).applyMatrix4(gun.hose.matrixWorld);assert.ok(center.distanceTo(anchor.getWorldPosition(new T.Vector3()))<1e-6,'hose detached at '+phase.label);}}
    if(phase.label==='Climb'&&t>phase.start&&t<phase.end){assert.equal(gun.root.visible,id!=='hands');assert.equal(accessories(worker).length>0,true);if(gun.hose){assert.equal(gun.hose.visible,true);assert.equal(gun.mount.visible,true);}}
   }
   journey.dispose();assert.equal(accessories(worker).length,0);
   for(const time of times)for(const interruption of ['cancel','casualty','swap','complete']){
    v.clear();worker.pose('carry');const unit={id:0,team:'squad',species:'horse',weapon:id,hp:100,ap:6,...e.to},state={units:[unit],towerTraversal:e,clock:{minutes:123}},before=structuredClone(state);
    v.observe(state,0);v.pose(model,unit,0);v.pose(model,unit,time*1000);
    if(interruption==='casualty'){unit.hp=0;unit.casualty='dead';v.observe(state,time*1000);}
    else if(interruption==='swap'){unit.weapon=id==='pistol'?'rifle':'pistol';v.observe(state,time*1000);}
    else if(interruption==='complete')v.observe(state,v.active.motion.duration*1000);
    else v.observe(state,time*1000,true);
    assert.equal(v.busy,false);assert.equal(accessories(worker).length,0);assert.equal(model.drawRequested,false);assert.equal(worker.weapon,gun);assert.equal(unit.ap,before.units[0].ap);assert.deepEqual(state.clock,before.clock);assert.deepEqual(unit.towerPost,before.units[0].towerPost);const expected=structuredClone(before);if(interruption==='casualty'){expected.units[0].hp=0;expected.units[0].casualty='dead';}if(interruption==='swap')expected.units[0].weapon=unit.weapon;assert.deepEqual(state,expected);
    worker.pose('carry');posture.apply({pose:interruption==='casualty'?{down:1}:{},casualty:unit.casualty});worker.root.updateMatrixWorld(true);worker.skeleton.update();
    assert.ok(worker.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)));assert.ok(gun.root.matrixWorld.elements.every(Number.isFinite));
    if(interruption==='casualty')assert.equal(gun.root.visible,false);else assert.equal(gun.root.visible,true);
   }
  }
 }finally{v.clear();worker.equipWeapon();gun.dispose();worker.dispose();}
});
