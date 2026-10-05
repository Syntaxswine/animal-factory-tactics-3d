import test from 'node:test';
import assert from 'node:assert/strict';
import {angularHelicoidShot} from '../dist/tactics/helicoid-shot.js';
import {SHOT_MODELS,DEFAULT_SHOT_SETUP,angularSize,prepareShotSetup,shotInputs,resolveHitRoll,modelShot,compareShots,distanceComparison} from '../dist/tactics/shot-models.js';

const fixed={die:10,roll:.5,rotation:.25,damage:.5,graze:.5,accuracyRoll:.99};
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
  for(const m of models){assert.equal(m.summary.successes,1);assert.equal(m.summary.failures,1);}
 }
 const setup=prepareShotSetup();
 for(const die of [2,10,19]){
  const a=modelShot('angular',setup,{...fixed,die}),b=modelShot('critical',setup,{...fixed,die});
  assert.deepEqual(a.direction,b.direction);assert.deepEqual(a.collision,b.collision);
 }
});

test('successful probability rolls directly hit each selected part at every range and precision',()=>{
 for(const zone of ['head','torso','legs'])for(const model of SHOT_MODELS)for(const distance of [1,20,100])for(const precision of [1,100])for(const die of [10,20]){
  const shot=modelShot(model.id,prepareShotSetup({zone,accuracy:65,distance,precision}),{...fixed,die,accuracyRoll:.1});
  assert.equal(shot.rolledHit,true);assert.equal(shot.error,0);assert.equal(shot.missAdjusted,false);assert.equal(shot.collision.zone,zone);assert.equal(shot.hit,true);
  assert.deepEqual(shot.targetPlane,shot.aim);
 }
});

test('solid cover intercepts ordinary and critical successes, even at point blank',()=>{
 for(const model of SHOT_MODELS)for(const distance of [1,20])for(const die of [10,20]){
  const blocked=modelShot(model.id,prepareShotSetup({cover:'head',distance}),{...fixed,die,accuracyRoll:.1});
  assert.equal(blocked.rolledHit,true);assert.equal(blocked.collision.zone,'cover');assert.equal(blocked.damage,0);assert.ok(blocked.collision.distance>0);
  const exposed=modelShot(model.id,prepareShotSetup({cover:'head',zone:'head',distance}),{...fixed,die,accuracyRoll:.1});
  assert.equal(exposed.collision.zone,'head');
 }
});

test('point-blank natural failures miss the intended part but may still strike another part',()=>{
 const setup=prepareShotSetup({distance:1});
 const outcomes=shotInputs(42).filter(i=>i.die===1).map(i=>modelShot('critical',setup,i));
 assert.ok(outcomes.some(s=>s.hit),'some wild shots still intersect the body');
 assert.ok(outcomes.some(s=>!s.hit),'point-blank misses remain possible');
 for(const s of outcomes){assert.equal(s.rolledHit,false);assert.notEqual(s.collision.zone,'torso');assert.ok(s.error>=28*Math.PI/180&&s.error<48*Math.PI/180);}
 const natural=modelShot('critical',prepareShotSetup({accuracy:100,precision:100}),{...fixed,die:1});
 assert.equal(natural.error,modelShot('critical',prepareShotSetup({accuracy:1,precision:1}),{...fixed,die:1}).error);
});

test('aim costs increase hit probability, while penalties still apply',()=>{
 const hip=prepareShotSetup({accuracy:50}),aimed=prepareShotSetup({accuracy:50,aimLevel:'aimed'}),full=prepareShotSetup({accuracy:50,aimLevel:'full'});
 assert.deepEqual([hip.ap,aimed.ap,full.ap],[4,6,8]);assert.deepEqual([hip.effective,aimed.effective,full.effective],[50,60,70]);
 assert.deepEqual([hip.hitChance,aimed.hitChance,full.hitChance],[50,60,70]);
 const penalized=prepareShotSetup({accuracy:50,aimLevel:'full',penalty:40});assert.equal(penalized.hitChance,30);
 const input={...fixed,accuracyRoll:.55};
 for(const m of SHOT_MODELS){assert.equal(modelShot(m.id,hip,input).rolledHit,false);assert.equal(modelShot(m.id,full,input).rolledHit,true);assert.equal(modelShot(m.id,penalized,input).rolledHit,false);}
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
 for(const m of first.models){const s=m.summary;assert.equal(s.any+s.miss+s.ground+s.cover,inputs.length);assert.equal(s.selected+s.other,s.any);assert.equal(s.rolledHits,s.selected);assert.equal(s.incidental,s.other);assert.ok(s.grazes<=s.any);assert.deepEqual(row.models.find(v=>v.id===m.id).summary,s);}
 assert.equal(first.models[1].summary.successes,first.models[2].summary.successes);
 assert.throws(()=>shotInputs(-1));assert.throws(()=>modelShot('missing',first.setup,fixed));
 assert.throws(()=>modelShot('angular',first.setup,{...fixed,die:0}));
});

test('failed rolls preserve the original scatter when it already misses the intended part',()=>{
 const setup=prepareShotSetup({distance:40,precision:50});
 // Recorded ordinary scatter from ef6bb7b, before the frequency adjustment.
 const previousErrors={angular:.016663319837225382,critical:.016663319837225382,margin:.02076165560365482};
 for(const model of SHOT_MODELS){
  const input={...fixed,roll:.7,rotation:0},failed=modelShot(model.id,setup,input),passed=modelShot(model.id,setup,{...input,accuracyRoll:.1});
  close(failed.error,previousErrors[model.id]);assert.equal(failed.rolledHit,false);assert.equal(failed.hit,false);assert.equal(failed.missAdjusted,false);
  assert.equal(passed.rolledHit,true);assert.equal(passed.collision.zone,'torso');assert.equal(passed.error,0);
 }
});

test('the configured hit chance includes criticals exactly, with a 5–95 percent limit',()=>{
 // Exhaust the D20 and a uniform accuracy grid; no sampling tolerance needed.
 for(const accuracy of [1,5,25,50,65,85,95,100]){
  const setup=prepareShotSetup({accuracy});let wins=0;
  for(let die=1;die<=20;die++)for(let i=0;i<900;i++)if(resolveHitRoll(setup,{die,accuracyRoll:(i+.5)/900}).rolledHit)wins++;
  assert.equal(wins,Math.max(5,Math.min(95,accuracy))*180);
 }
 for(const die of [2,10,19]){
  assert.equal(resolveHitRoll(prepareShotSetup({accuracy:100}),{die,accuracyRoll:1-Number.EPSILON/2}).rolledHit,true);
  assert.equal(resolveHitRoll(prepareShotSetup({accuracy:1}),{die,accuracyRoll:0}).rolledHit,false);
 }
});

test('hit probability is identical across miss models, distance, precision and body part',()=>{
 const inputs=shotInputs(42,300),expected=inputs.map(i=>resolveHitRoll(prepareShotSetup(),i).rolledHit);
 for(const distance of [1,20,100])for(const precision of [1,100])for(const zone of ['head','torso','legs']){
  const {models}=compareShots({distance,precision,zone},inputs);
  for(const m of models){
   assert.deepEqual(m.shots.map(s=>s.rolledHit),expected);
   assert.equal(m.summary.selected,expected.filter(Boolean).length);
   assert.ok(m.shots.filter(s=>!s.rolledHit).every(s=>s.collision.zone!==zone));
  }
 }
});

test('misses that would land on the selected part move beyond it without rerolling the bearing',()=>{
 for(const zone of ['head','torso','legs'])for(const model of SHOT_MODELS)for(const rotation of [0,.125,.25,.375,.5,.625,.75,.875]){
  const setup=prepareShotSetup({zone,distance:1,precision:100}),shot=modelShot(model.id,setup,{...fixed,roll:0,rotation});
  assert.equal(shot.rolledHit,false);assert.equal(shot.missAdjusted,true);assert.notEqual(shot.collision.zone,zone);
  close(shot.angle,(rotation+1)*Math.PI*2);assert.ok(shot.error>0&&Number.isFinite(shot.error));
 }
 const shots=compareShots({distance:20},shotInputs(42)).models[1].shots;
 assert.ok(shots.some(s=>!s.rolledHit&&s.collision.zone==='head'),'torso misses can strike the head');
 assert.ok(shots.some(s=>!s.rolledHit&&s.collision.zone==='legs'),'torso misses can strike the legs');
});

test('weapon precision and D20 margin only shape failed shots',()=>{
 const setup=prepareShotSetup({distance:100}),input={...fixed,roll:.7,rotation:0};
 for(const m of SHOT_MODELS){
  const coarse=modelShot(m.id,{...setup,precision:1},input),precise=modelShot(m.id,{...setup,precision:100},input);
  assert.equal(coarse.rolledHit,false);assert.equal(precise.rolledHit,false);assert.ok(precise.error<coarse.error);
  const passed={...input,accuracyRoll:.1};
  assert.deepEqual(modelShot(m.id,{...setup,precision:1},passed).direction,modelShot(m.id,{...setup,precision:100},passed).direction);
 }
 assert.ok(modelShot('margin',setup,{...input,die:19}).error<modelShot('margin',setup,{...input,die:2}).error);
});
