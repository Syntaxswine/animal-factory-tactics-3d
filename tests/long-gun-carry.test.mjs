import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {IDLE_ANIMALS} from '../dist/tactics/armed-idle-actor.js';
import {IDLE_MOODS} from '../dist/tactics/armed-idle-state.js';
import {STOCKED_WEAPONS} from '../dist/tactics/weapon-carry-fit.js';
import {idleFixture} from './helpers/idle-fixture.mjs';
import {rifleArmCrossings,stockCoverage} from './helpers/idle-rifle-clearance.mjs';
import {weaponClearance} from './helpers/idle-clearance.mjs';
const views=[[1,.175,0],[Math.sin(.73),.475,Math.cos(.73)]].map(a=>new T.Vector3(...a).normalize());
for(const p of IDLE_ANIMALS.filter(p=>!p.unarmed&&!p.id.startsWith('pig-')))for(const id of STOCKED_WEAPONS)test(p.id+' '+id+': stock sits behind arm through both idle cycles',()=>{
 idleFixture(p,id,({worker,weapon,motion})=>{
  for(const [mood,{duration}]of Object.entries(IDLE_MOODS))for(let i=0;i<16;i++){
   motion.at(duration*i/16,{mood});const label=mood+' '+i;
   assert.deepEqual(rifleArmCrossings(worker,weapon),[],label+' real surface crossings');
   assert.deepEqual(weaponClearance(worker,weapon),[],label+' stock/receiver cuts through clothing');
   for(const view of views)assert.ok(stockCoverage(worker,weapon,view),label+' physical forearm occlusion');
  }
 });
});
