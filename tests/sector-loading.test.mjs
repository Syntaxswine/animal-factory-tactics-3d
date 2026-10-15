import test from 'node:test';
import assert from 'node:assert/strict';
import {LoadingTracker,trackLoadingManager,prepareSectorView} from '../dist/tactics/loading-tracker.js';
import {LoadingManager} from '../dist/tactics/vendor/three.module.js';

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
