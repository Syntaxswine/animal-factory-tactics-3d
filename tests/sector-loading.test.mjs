import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingTracker,trackLoadingManager,prepareSectorView} from '../dist/tactics/loading-tracker.js';
import {LoadingManager,Scene,Texture} from '../dist/tactics/vendor/three.module.js';
import {BattleBlood} from '../dist/tactics/battle-blood.js';
import {BLOOD_ATLAS} from '../dist/tactics/painted-blood-spray-data.js';
import {STAIN_ATLAS} from '../dist/tactics/painted-blood-followup-data.js';
import {FATAL_HEAD_ATLAS} from '../dist/tactics/fatal-head-data.js';

test('artwork remains pending until character preparation and nested textures finish',async()=>{
 const tracker=new LoadingTracker(),manager=trackLoadingManager(new LoadingManager(),tracker);let ready=false;
 tracker.start();manager.itemStart('skin');const pending=tracker.wait().then(()=>ready=true);
 manager.itemEnd('skin');await Promise.resolve();assert.equal(ready,false);
 tracker.end();await pending;assert.equal(ready,true);assert.equal(tracker.pending,0);
});
test('failed assets release their requests and report a retryable loading error',async()=>{
 const tracker=new LoadingTracker(),manager=trackLoadingManager(new LoadingManager(),tracker);
 manager.itemStart('missing.png');const waiting=tracker.wait();manager.itemError('missing.png');manager.itemEnd('missing.png');
 await assert.rejects(waiting,/missing.png/);assert.equal(tracker.pending,0);
});
test('sector completion waits for late assets, worker painting and the final scene rebuild',async()=>{
 const loading=new LoadingTracker(),events=[],renderer={loading,world:null,biomes:{terrains:[]}};let draws=0,painted=false;
 await prepareSectorView(renderer,()=>{
  events.push('draw');draws++;renderer.world={};
  if(draws<=2){loading.start();queueMicrotask(()=>{events.push('asset');renderer.world=null;loading.end();});}
  if(draws===2)renderer.biomes.terrains=[{groundSkin:{whenReady:async()=>{await Promise.resolve();painted=true;events.push('paint');}}}];
 },{paint:async()=>{events.push('frame');}});
 assert.equal(draws,3);assert.equal(painted,true);assert.ok(renderer.world);assert.equal(events.at(-1),'frame');
});
test('unsettled scene errors do not announce a ready sector',async()=>{
 const renderer={loading:new LoadingTracker(),world:null};
 await assert.rejects(prepareSectorView(renderer,()=>{}, {paint:async()=>{}}),/did not finish/);
});

for(const failed of [BLOOD_ATLAS,STAIN_ATLAS,FATAL_HEAD_ATLAS])for(const mode of ['full','off'])test(mode+' optional atlas '+failed+' can fail through the real manager lifecycle without blocking sector entry',async()=>{
 const loading=new LoadingTracker(),mandatory=trackLoadingManager(new LoadingManager(),loading),optional=trackLoadingManager(new LoadingManager(),loading,{required:false}),warnings=[],requested=[];let fail=true,disposed=0;
 const loader={loadAsync(url){requested.push(url);optional.itemStart(url);return new Promise((resolve,reject)=>queueMicrotask(()=>{
  if(fail&&url===failed){optional.itemError(url);optional.itemEnd(url);reject(Error('Controlled optional failure'));}
  else{const t=new Texture();t.addEventListener('dispose',()=>disposed++);optional.itemEnd(url);resolve(t);}
 }));}};
 const blood=new BattleBlood(new Scene(),{loader,loading,mode,onError:message=>warnings.push(message)});
 try{
  await blood.ready;if(mode==='off'){assert.equal(requested.length,0);blood.setMode('full');await blood.ready;}
  assert.equal(requested.length,3);assert.equal(warnings.length,1);assert.equal(disposed,2);assert.equal(loading.errors.length,0);assert.equal(loading.optionalErrors.length,1);assert.equal(loading.pending,0);
  const renderer={loading,world:{},biomes:{terrains:[]}};await prepareSectorView(renderer,()=>{}, {paint:async()=>{}});
  fail=false;blood.setMode('off');blood.setMode('full');await blood.ready;assert.ok(blood.pool);assert.equal(requested.length,6);assert.equal(warnings.length,1);
  mandatory.itemStart('required-actor.png');mandatory.itemError('required-actor.png');mandatory.itemEnd('required-actor.png');
  await assert.rejects(()=>prepareSectorView(renderer,()=>{}, {paint:async()=>{}}),/required-actor/);
 }finally{blood.dispose();}
 assert.equal(disposed,5);assert.equal(loading.pending,0);
});

test('disposal during optional loading balances the shared tracker and retires every late texture',async()=>{
 const loading=new LoadingTracker(),manager=trackLoadingManager(new LoadingManager(),loading,{required:false}),finish=[];let disposed=0;
 const blood=new BattleBlood(new Scene(),{loading,loader:{loadAsync(url){manager.itemStart(url);return new Promise(resolve=>finish.push(()=>{const t=new Texture();t.addEventListener('dispose',()=>disposed++);manager.itemEnd(url);resolve(t);}));}}});
 blood.dispose();for(const done of finish)done();await blood.ready;assert.equal(disposed,3);assert.equal(loading.pending,0);assert.equal(loading.errors.length,0);
});
