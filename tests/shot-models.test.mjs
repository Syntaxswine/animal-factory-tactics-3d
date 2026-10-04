import test from 'node:test';
import assert from 'node:assert/strict';
import {angularHelicoidShot} from '../dist/tactics/helicoid-shot.js';
import {SHOT_MODELS,DEFAULT_SHOT_SETUP,angularSize,prepareShotSetup,shotInputs,modelShot,compareShots,distanceComparison} from '../dist/tactics/shot-models.js';

const fixed={die:10,roll:.5,rotation:.25,damage:.5,graze:.5};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('angular projection counts distance once, with no near-range floor or hidden range penalty',()=>{
 let direction;
 for(const distance of [1,10,100]){
  const shot=angularHelicoidShot({origin:[0,0,1.3],aim:[0,distance,1.3],error:Math.PI/180,rotation:.2});
  close(Math.hypot(...shot.targetPlane.map((v,i)=>v-shot.aim[i])),distance*Math.tan(Math.PI/180));
  if(direction)shot.direction.forEach((v,i)=>close(v,direction[i]));direction=shot.direction;
 }
 close(angularSize(.4,10),2*Math.atan(.02));
 assert.ok(angularSize(.4,1)>angularSize(.4,10));
 assert.throws(()=>angularSize(.4,0));
 assert.throws(()=>angularHelicoidShot({origin:[0,0,0],aim:[0,0,0],error:0,rotation:0}));
 assert.throws(()=>angularHelicoidShot({origin:[0,0,0],aim:[0,1,0],error:Math.PI/2,rotation:0}));
});

test('the muzzle/aim axis supports vertical rays, rotation and reproducible construction points',()=>{
 for(const aim of [[0,0,10],[0,0,-10],[10,1,5]]){
  const input={origin:[0,0,0],aim,error:.1,rotation:.7},s=angularHelicoidShot(input);
  close(Math.hypot(...s.direction),1);assert.ok([...s.targetPlane,...s.point].every(Number.isFinite));
  assert.deepEqual(s,angularHelicoidShot(input));
  const centered=angularHelicoidShot({...input,error:0});centered.targetPlane.forEach((v,i)=>close(v,aim[i]));
 }
});

test('natural 1 and 20 each occupy one of twenty outcomes, independently of skill and weapon',()=>{
 const inputs=Array.from({length:20},(_,i)=>({...fixed,die:i+1}));
 for(const accuracy of [1,100]){
  const {models}=compareShots({...DEFAULT_SHOT_SETUP,accuracy},inputs);
  for(const m of models){assert.equal(m.summary.successes,m.id==='angular'?0:1);assert.equal(m.summary.failures,m.id==='angular'?0:1);}
 }
 const setup=prepareShotSetup();
 for(const die of [2,10,19]){
  const a=modelShot('angular',setup,{...fixed,die}),b=modelShot('critical',setup,{...fixed,die});
  assert.deepEqual(a.direction,b.direction);assert.deepEqual(a.collision,b.collision);
 }
});

test('critical success hits each actual aimed body part, but never bypasses cover',()=>{
 for(const zone of ['head','torso','legs'])for(const model of ['critical','margin']){
  const shot=modelShot(model,prepareShotSetup({zone,accuracy:1,distance:100}),{...fixed,die:20});
  assert.equal(shot.error,0);assert.equal(shot.collision.zone,zone);assert.equal(shot.hit,true);
 }
 const blocked=modelShot('critical',prepareShotSetup({cover:'head'}),{...fixed,die:20});
 assert.equal(blocked.collision.zone,'cover');assert.equal(blocked.damage,0);
 // Cover is in front of the body even at one metre, never inside the muzzle.
 const closeBlocked=modelShot('critical',prepareShotSetup({distance:1,cover:'waist'}),{...fixed,die:20});
 assert.equal(closeBlocked.collision.zone,'cover');assert.ok(closeBlocked.collision.distance>0);
});

test('point-blank D20 failure changes the ray rather than forcing a miss outcome',()=>{
 const setup=prepareShotSetup({distance:1});
 const outcomes=shotInputs(42).filter(i=>i.die===1).map(i=>modelShot('critical',setup,i));
 assert.ok(outcomes.some(s=>s.hit),'some wild shots still intersect the body');
 assert.ok(outcomes.some(s=>!s.hit),'point-blank misses remain possible');
 for(const s of outcomes)assert.ok(s.error>=28*Math.PI/180&&s.error<48*Math.PI/180);
 const natural=modelShot('critical',prepareShotSetup({accuracy:100,precision:100}),{...fixed,die:1});
 assert.equal(natural.error,modelShot('critical',prepareShotSetup({accuracy:1,precision:1}),{...fixed,die:1}).error);
});

test('aim costs and skill modifiers tighten ordinary trajectories, while penalties still apply',()=>{
 const hip=prepareShotSetup({accuracy:50}),aimed=prepareShotSetup({accuracy:50,aimLevel:'aimed'}),full=prepareShotSetup({accuracy:50,aimLevel:'full'});
 assert.deepEqual([hip.ap,aimed.ap,full.ap],[4,6,8]);assert.deepEqual([hip.effective,aimed.effective,full.effective],[50,60,70]);
 for(const m of SHOT_MODELS){assert.ok(modelShot(m.id,full,fixed).error<modelShot(m.id,hip,fixed).error);assert.ok(modelShot(m.id,prepareShotSetup({accuracy:50,aimLevel:'full',penalty:40}),fixed).error>modelShot(m.id,full,fixed).error);}
 assert.ok(modelShot('margin',hip,{...fixed,die:19}).error<modelShot('margin',hip,{...fixed,die:2}).error);
 assert.ok(modelShot('angular',prepareShotSetup({precision:100}),fixed).error<modelShot('angular',prepareShotSetup({precision:1}),fixed).error);
});

test('smoke limits body hits to 6–8 damage; bypass lifts the cap without changing trajectories',()=>{
 for(const graze of [0,.5,.999])for(const zone of ['head','torso','legs']){
  const input={...fixed,die:20,graze},setup=prepareShotSetup({smoke:true,zone});
  const a=modelShot('critical',setup,input),b=modelShot('critical',{...setup,smokeBypass:true},input);
  assert.equal(a.graze,true);assert.equal(a.damage,6+Math.floor(graze*3));assert.ok(b.damage>8);assert.equal(b.graze,false);
  assert.deepEqual(a.direction,b.direction);assert.deepEqual(a.collision,b.collision);
 }
 const blocked=modelShot('critical',prepareShotSetup({cover:'head',smoke:true}),{...fixed,die:20});assert.equal(blocked.damage,0);assert.equal(blocked.graze,false);
 const clear=modelShot('critical',prepareShotSetup({smoke:false}),{...fixed,die:20});assert.equal(clear.damage,50,'perfect aim has no damage multiplier');
 const miss=modelShot('critical',prepareShotSetup({distance:20,smoke:true}),{...fixed,die:1});assert.equal(miss.hit,false);assert.equal(miss.damage,0);
});

test('shared random inputs and summary accounting stay reproducible across models, charts and reruns',()=>{
 const inputs=shotInputs(42),before=structuredClone(inputs),config={...DEFAULT_SHOT_SETUP},first=compareShots(config,inputs);
 assert.deepEqual(compareShots(config,inputs),first);assert.deepEqual(inputs,before);assert.notDeepEqual(shotInputs(43),inputs);
 const curves=distanceComparison(config,inputs),row=curves.find(r=>r.distance===20);
 for(const m of first.models){const s=m.summary;assert.equal(s.any+s.miss+s.ground+s.cover,inputs.length);assert.equal(s.selected+s.other,s.any);assert.ok(s.grazes<=s.any);assert.deepEqual(row.models.find(v=>v.id===m.id).summary,s);}
 assert.equal(first.models[1].summary.successes,first.models[2].summary.successes);
 assert.throws(()=>shotInputs(-1));assert.throws(()=>modelShot('missing',first.setup,fixed));
 assert.throws(()=>modelShot('angular',first.setup,{...fixed,die:0}));
});
