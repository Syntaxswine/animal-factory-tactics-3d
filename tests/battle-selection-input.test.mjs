import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BattleRenderer} from '../dist/tactics/battle-renderer.js';
import {selectionModifier,toggleSelection,pruneSelection} from '../dist/tactics/battle-selection.js';

test('Shift and Control portrait clicks can add and remove mercs while retaining a primary selection',()=>{
 const state={phase:'explore',selected:0,units:[0,1,2].map(id=>({id,team:'squad',hp:100}))};let ids=new Set([0]);
 for(const [id,event]of [[1,{shiftKey:true}],[2,{ctrlKey:true}],[0,{ctrlKey:true}]]){assert.equal(selectionModifier(event),true);ids=toggleSelection(ids,id);}
 assert.deepEqual([...pruneSelection(state,ids)],[1,2]);assert.equal(selectionModifier({}),false);
 state.units[2].hp=0;assert.deepEqual([...pruneSelection(state,ids)],[1]);
 assert.deepEqual([...toggleSelection(new Set([1]),1)],[1],'cannot toggle off the only merc');
});
function picker(team='squad'){
 const r=Object.create(BattleRenderer.prototype),root=new T.Group(),body=new T.Mesh(new T.BoxGeometry(.6,1.8,.5)),weapon=new T.Mesh(new T.BoxGeometry(2,.15,.2));weapon.position.set(1.2,0,.5);root.add(body,weapon);root.updateMatrixWorld(true);
 const camera=new T.OrthographicCamera(-5,5,5,-5,.1,100);camera.position.z=10;camera.updateMatrixWorld(true);
 Object.assign(r,{camera,state:{units:[{id:7,team,z:0}]},actors:new Map([[7,root]]),models:new Map([[7,{worker:{parts:[body]}}]]),paintedEnvironment:{barrelHit:()=>null},sites:{hit:()=>null},fire:{pick:()=>null}});
 return {r,body,weapon,dispose(){body.geometry.dispose();body.material.dispose();weapon.geometry.dispose();weapon.material.dispose();}};
}
test('direct body clicks select a merc; equipment and neighboring ground do not snap to that merc',()=>{
 const {r,dispose}=picker();try{
  assert.equal(r.pick(50,50,100,100,0,{selectBody:true}),7);
  assert.equal(r.pick(62,50,100,100,0),7,'context actions can still pick equipment');
  assert.equal(r.pick(62,50,100,100,0,{selectBody:true}),null,'ground below protruding weapon stays available');
  assert.equal(r.pick(54,45,100,100,0,{selectBody:true}),null,'no inflated body bounding-box hit');
  assert.equal(r.pick(50,50,100,100,1,{selectBody:true}),null,'interaction level remains authoritative');
 }finally{dispose();}
});
test('tight friendly selection does not shrink enemy targeting',()=>{
 const {r,dispose}=picker('guard');try{assert.equal(r.pick(62,50,100,100,0,{selectBody:true}),7);}finally{dispose();}
});
