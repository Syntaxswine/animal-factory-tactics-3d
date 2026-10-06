import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BattleLoot} from '../dist/tactics/battle-loot.js';
import {visibleFireLayers} from '../dist/tactics/battle-tank-effects.js';

test('visible supplies on stacked floors stay drawn but picking is restricted to the selected floor',()=>{
 const low={x:4,y:5,items:[{kind:'rifle'}]},high={...low,z:1},hidden={...low,z:2};
 const state={loot:[low,high,hidden],visible:new Set(['4,5','4,5,1']),seen:new Set(['4,5','4,5,1','4,5,2'])};
 const scene=new T.Scene(),loot=new BattleLoot(scene);
 try{
  loot.sync(state,null);scene.updateMatrixWorld(true);
  assert.deepEqual([...loot.models.keys()],[low,high]);
  const ray=new T.Raycaster(new T.Vector3(4,8,5),new T.Vector3(0,-1,0));
  assert.equal(loot.pick(ray,0),low,'higher supplies cannot intercept a ground-floor click');
  assert.equal(loot.pick(ray,1),high);assert.equal(loot.pick(ray,2),null,'explored but unseen supplies stay hidden');
  loot.sync(state,0);assert.deepEqual([...loot.models.keys()],[low],'explicit legacy layer filtering remains available');
 }finally{loot.dispose();}
});

test('all-level fire rendering retains separate heights and per-floor fog visibility',()=>{
 const low={x:4,y:5,turns:3},high={...low,z:1},hidden={...low,z:2},expired={x:6,y:5,z:1,turns:0};
 const state={fires:[low,high,hidden,expired],props:[],visible:new Set(['4,5','4,5,1','6,5,1'])};
 assert.deepEqual([...visibleFireLayers(state,null).values()],[[low],[high]]);
 assert.deepEqual([...visibleFireLayers(state,0).values()],[[low]]);
 assert.deepEqual([...visibleFireLayers(state,null,new Set(['4,5,1'])).values()],[[low]],'pending impacts remain withheld on their own floor');
});
