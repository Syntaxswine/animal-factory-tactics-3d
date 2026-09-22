import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createRifleFiring} from '../dist/tactics/rifle-firing.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {BattleRenderer} from '../dist/tactics/battle-renderer.js';
import {BattleShotEffects} from '../dist/tactics/battle-shot-effects.js';
import {shotPhase} from '../dist/tactics/battle-combat.js';
const endpointKey=(species,weapon,prone,target)=>JSON.stringify([species,weapon,prone,target]);
const approvedEndpoints=new Set(JSON.parse(fs.readFileSync(new URL('../docs/tactics/hybrid-review/prone-gameplay/coverage.json',import.meta.url))).rows.filter(r=>r.supported).map(r=>endpointKey(r.species,r.weapon,r.prone,r.target)));

for(const p of profiles.filter(p=>!p.unarmed))test(p.id+': near and steep aiming preserves valid grips and reports unavailable presentation',()=>{
 const w=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),posture=createBattlePosture(w,p),f=createRifleFiring(w,p,posture);
 const lengths=w.bones.map(b=>b.position.length());let unavailable=0;
 try{for(const id of ['rifle','assault','smg','shotgun','sniper']){
  const gun=createWeaponModel(id);w.equipWeapon(gun);
  try{for(const prone of [0,.25,.5,.75,1])for(const xyz of [[12,.48,0],[3,.4,2],[1,1.4,0],[2,3,0],[3,.05,-2]]){
   const target=new T.Vector3(...xyz),sample={pose:{prone},heading:0,blend:0,distance:0};
   const result=f.apply({aim:1,target,sample});
   if(approvedEndpoints.has(endpointKey(p.id,id,prone,xyz)))assert.equal(result.supported,true,'previously supported endpoint regressed: '+endpointKey(p.id,id,prone,xyz));
   for(const contact of w.diagnostics().contacts)assert.ok(contact.error<1e-6,'failed search left a wrist off its grip');
   w.bones.forEach((b,i)=>{if(b.parent?.isBone)assert.ok(Math.abs(b.position.length()-lengths[i])<1e-8,'bone length changed: '+b.name);assert.deepEqual(b.scale.toArray(),[1,1,1]);assert.ok(b.matrixWorld.elements.every(Number.isFinite));});
   if(result.supported){assert.ok(result.direction.angleTo(target.clone().sub(result.origin))<=.0005);assert.ok(f.muzzle());}
   else {unavailable++;assert.equal(f.muzzle(),null);assert.ok(['grip-range','endpoint-not-aligned'].includes(result.reason));}
   if(xyz[0]>=3)assert.equal(result.supported,true,'ordinary reachable shot was dropped');
   // A later valid shot must recover, then reverse scrubbing must reproduce the result.
   assert.equal(f.apply({aim:1,target:new T.Vector3(12,.48,0),sample}).supported,true);
   const again=f.apply({aim:1,target,sample});assert.equal(again.supported,result.supported);assert.ok(again.origin.distanceTo(result.origin)<1e-8);
  }}finally{gun.dispose();}
 }if(p.id==='horse')assert.ok(unavailable>0,'fixture no longer exercises unavailable coverage');}finally{w.dispose();}
});

test('renderer suppresses unavailable discharge for the whole shot, keeps impact, and recovers on the next shot',()=>{
 const scene=new T.Scene(),fx=new BattleShotEffects(scene),root=new T.Group(),worker={root:new T.Group(),parts:[],skeleton:{update(){}},diagnostics(){return{};}},sample={x:0,y:0,z:0,heading:0,blend:0,pose:{prone:1}},unit={id:1,name:'Test',species:'horse',weapon:'rifle',hp:100};
 let available=true;const model={root,worker,profile:{},weapon:'rifle',paint:{},posture:{},firing:{apply(){return {origin:new T.Vector3(),direction:new T.Vector3(1,0,0),supported:available,reason:available?null:'endpoint-not-aligned'};},muzzle(){return available?{origin:new T.Vector3(),direction:new T.Vector3(1,0,0)}:null;}}};
 const state={units:[unit],visible:new Set(['0,0','1,0']),detected:new Set()},before=structuredClone(state);
 const renderer={models:new Map([[1,model]]),motion:{sample:()=>sample},combat:{},state,shotEffects:fx,diagnostics:[],firingDiagnostic:BattleRenderer.prototype.firingDiagnostic};
 const shot=start=>({start,rifle:true,knownUnitIds:[],event:{shooter:1,ax:0,ay:0,trajectories:[{x:1,y:0,h:0,kind:'wall'}]},phase:shotPhase(380)});
 const draw=()=>{fx.hide();BattleRenderer.prototype.actor.call(renderer,unit);};
 try{
  renderer.combat.active=shot(1);draw();assert.equal(fx.flash.visible,true);assert.ok(renderer.combat.active.traceOrigin);
  available=false;renderer.combat.active.phase=shotPhase(390);draw();assert.equal(fx.flash.visible,false);assert.equal(fx.trace.visible,false);assert.equal(fx.impact.visible,true);assert.equal(renderer.combat.active.traceOrigin,null);assert.match(renderer.diagnostics[0],/shot outcome unchanged/);
  available=true;renderer.combat.active.phase=shotPhase(400);draw();assert.equal(fx.flash.visible,false);assert.equal(fx.trace.visible,false);assert.equal(fx.impact.visible,true);assert.equal(renderer.diagnostics.length,1);
  renderer.combat.active=shot(2);draw();assert.equal(fx.flash.visible,true);assert.equal(fx.trace.visible,true);assert.equal(renderer.diagnostics.length,0);
  assert.deepEqual(state,before);
 }finally{fx.dispose();}
});

test('actual shot phases keep complete poses through recoil, aim-out and reverse scrubbing',()=>{
 for(const p of profiles.filter(p=>!p.unarmed)){
  const w=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),gun=createWeaponModel('rifle');w.equipWeapon(gun);
  const f=createRifleFiring(w,p,createBattlePosture(w,p));
  try{for(const prone of [0,.5,1])for(const xyz of [[6,.48,0],[1,1.4,0]]){
   const sample={pose:{prone},heading:0,blend:0},target=new T.Vector3(...xyz),rows=[];
   for(let t=0;t<=1100;t+=25){const r=f.apply({...shotPhase(t),target,sample});rows.push(r);for(const c of w.diagnostics().contacts)assert.ok(c.error<1e-6,`${p.id} at ${t}ms`);assert.ok(w.bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)));}
   for(let i=rows.length-1;i>=0;i--){const r=f.apply({...shotPhase(i*25),target,sample});assert.equal(r.supported,rows[i].supported);assert.ok(r.origin.distanceTo(rows[i].origin)<1e-8);}
  }}finally{gun.dispose();w.dispose();}
 }
});


