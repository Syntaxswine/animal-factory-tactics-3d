import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,move,stepMovement,moveGroup,setMovementMode,effectiveStealth} from '../dist/tactics/core/engine.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {BattleMotion,movementDuration,queuedMovementDuration} from '../dist/tactics/battle-motion.js';
import {movementSelection,setSelectionMovement} from '../dist/tactics/battle-selection.js';
test('mode timing matches 2x run and half-speed sneak, including mixed groups',()=>{
 for(const [mode,duration]of [['walk',500],['run',250],['sneak',1000]]){
  const u={id:0,x:0,y:0,z:0,hp:100,running:mode==='run',sneaking:mode==='sneak'},m=new BattleMotion();
  assert.equal(movementDuration(u),duration);m.update([u],0);u.x=1;m.update([u],10);m.update([u],10+duration/2);assert.equal(m.sample(u).x,.5);m.update([u],10+duration);assert.equal(m.sample(u).x,1);
 }
 const state={units:[{id:0,running:true},{id:1,sneaking:true}],queue:[{group:[{id:0},{id:1}]}]};assert.equal(queuedMovementDuration(state),1000);
 state.queue=[];assert.equal(queuedMovementDuration(state),500);
});
test('group pace controls are exclusive, free and unavailable during movement',()=>{
 const s=createGame(1,blankMap()),members=s.units.filter(u=>u.team==='squad'),ids=new Set(members.map(u=>u.id)),ap=members.map(u=>u.ap);
 for(const mode of ['sneak','run','walk']){assert.equal(setSelectionMovement(s,ids,mode).changed.length,4);assert.ok(movementSelection(s,ids,mode).all);assert.deepEqual(members.map(u=>u.ap),ap);}
 s.queue=[{}];assert.equal(movementSelection(s,ids,'run').ready.length,0);assert.equal(setSelectionMovement(s,ids,'run').changed.length,0);
});
test('animation queries preserve exact mixed-mode simulation outcomes',()=>{
 const a=createGame(1,blankMap()),u=a.units[0];assert.ok(setMovementMode(a,u,'sneak'));const skill=u.stealth;assert.equal(effectiveStealth(u),skill+20);
 const b=structuredClone(a);for(const s of [a,b])assert.ok(move(s,s.units[0],5,4));
 const motion=new BattleMotion();let now=0;motion.update(a.units,now);
 while(a.queue.length){stepMovement(a);motion.update(a.units,now+=1000);motion.update(a.units,now+500);}
 while(b.queue.length)stepMovement(b);assert.deepEqual(a,b);assert.equal(u.stealth,skill);
});
