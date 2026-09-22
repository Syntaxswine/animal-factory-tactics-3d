import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
import {createRifleFiring} from '../dist/tactics/rifle-firing.js';
import {BattleCombat,shotPhase} from '../dist/tactics/battle-combat.js';
import {visibleShotPath} from '../dist/tactics/battle-shot-effects.js';

test('rifle playback raises before discharge, recoils, lowers and respects reduced motion',()=>{
 assert.equal(shotPhase(200).flash,false);assert.equal(shotPhase(380).aim,1);assert.equal(shotPhase(395).flash,true);assert.ok(shotPhase(410).recoil>.9);assert.equal(shotPhase(1000).trace,false);assert.equal(shotPhase(1100).aim,0);
 assert.equal(shotPhase(0,true,true).flash,false);assert.equal(shotPhase(0,true,true).recoil,0);
});
test('sequence consumption is ordered, deduplicated, visibility-gated and does not mutate outcomes',()=>{
 const a={id:0,team:'squad',weapon:'rifle',hp:100,x:0,y:0},b={id:1,team:'guard',weapon:'rifle',hp:45,x:2,y:0};
 const state={units:[a,b],detected:new Set([1]),visible:new Set(['0,0','2,0'])},p=new BattleCombat();p.observe(state,0);
 const event={shooter:0,target:1,ax:0,ay:0,bx:2,by:0,trajectories:[{x:2,y:0,h:1.2,kind:'unit',unitId:1}],downed:[1]};
 b.hp=0;state.detected.clear();state.effect={sequence:[event]};const before=structuredClone(state);p.observe(state,10);p.observe(state,20);assert.equal(p.queue.length,0);assert.equal(p.display(b).hp,45);p.advance(410);assert.equal(p.display(b).hp,0);p.advance(1200);assert.equal(p.busy,false);assert.deepEqual(state,before);
 state.units[0].team='guard';state.visible.clear();state.effect={sequence:[event]};p.observe(state,1300);assert.equal(p.busy,false);
});
test('Easy map reveal never extends a shot trace into unseen terrain',()=>{
 const state={difficulty:'easy',visible:new Set(['0,0','1,0'])},path=visibleShotPath(state,[new T.Vector3(0,1,0),new T.Vector3(8,1,0)]);
 assert.ok(path.length>1);assert.ok(path.at(-1).x<1.5);
});
for(const profile of ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed))test(profile.id+': rifle grips and bore follow the resolved endpoint',()=>{
 const worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),gun=createWeaponModel('rifle');worker.equipWeapon(gun);const firing=createRifleFiring(worker,profile);
 try{for(const heading of [0,45,135,270])for(const height of [.3,1.2,3.5])for(const aim of [0,.5,1]){
  const a=heading*Math.PI/180,target=new T.Vector3(6*Math.cos(a),height,6*Math.sin(a));
  const muzzle=firing.apply({aim,recoil:.2,target});
  for(const contact of worker.diagnostics().contacts)assert.ok(contact.error<1e-6,'Hands left rifle grips');
  if(aim===1)assert.ok(muzzle.direction.dot(target.clone().sub(muzzle.origin).normalize())>.9999,'Rifle bore misses resolved endpoint');
 }}finally{gun.dispose();worker.dispose();}
});
