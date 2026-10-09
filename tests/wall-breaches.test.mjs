import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {wallBreachEnds,damagedWallVisuals} from '../dist/tactics/wall-breaches.js';
import {wallBreachFixture,wallBreachBattleFixture} from '../dist/tactics/wall-breach-fixture.js';
import {environmentGeometries,environmentGeometry} from '../dist/tactics/environment-geometry.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {createGame,WEAPONS} from '../dist/tactics/core/engine.js';
import {detonate} from '../dist/tactics/core/explosives.js';
import {detonateGrenade} from '../dist/tactics/grenade-blast.js';
import {canStep,validateMap} from '../dist/tactics/core/maps.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {BattleGrenades} from '../dist/tactics/battle-grenades.js';
const endCount=map=>[...wallBreachEnds(map).values()].reduce((n,v)=>n+!!(v&1)+!!(v&2),0);

test('one to five destroyed neighbors leave only the two outside ends, in both axes and levels',()=>{
 for(const material of ['brick','concrete','corrugated'])for(const axis of ['e','s'])for(const level of [0,1])for(let count=0;count<=5;count++){
  const {state,removed,original}=wallBreachFixture({material,axis,level,count}),before=structuredClone(state),world=buildWorld(state),visuals=environmentVisuals(world,state),broken=visuals.filter(b=>b.breachEnds);
  assert.equal(endCount(state),count?2:0);assert.equal(broken.length,count?2:0);assert.equal(removed.length,count);assert.ok(broken.every(b=>!!original[b.source.edge]&&!!state.edges[b.source.edge]));assert.ok(removed.every(k=>!visuals.some(b=>b.source.edge===k)));assert.deepEqual(state,before);
 }
});
test('separate holes share a single connected survivor, then merge when that survivor is destroyed',()=>{
 const {state}=wallBreachFixture({layout:'separated',count:2}),ends=wallBreachEnds(state);assert.equal(endCount(state),4);assert.equal(ends.get('s:7:6'),3);
 delete state.edges['s:7:6'];assert.equal(endCount(state),2);assert.equal(wallBreachEnds(state).has('s:7:6'),false);
 for(let count=0;count<=5;count++)assert.equal(wallBreachFixture({layout:'separated',count}).removed.length,count);
});
test('corner breaches meet the surviving walls while intact junctions and floors remain independent',()=>{
 const {state}=wallBreachFixture({layout:'corner',count:4});assert.equal(endCount(state),2);
 const t={edges:{'s:4:4':'wall-brick','e:4:4':'wall-brick'},definition:{edges:{'s:4:4':'wall-brick','e:4:4':'wall-brick','s:5:4':'wall-brick'}}};assert.equal(endCount(t),0,'a surviving corner is not an exposed wall end');
 const floors={edges:{'s:3:4':'wall-brick','s:5:4:1':'wall-concrete'},definition:{edges:{'s:3:4':'wall-brick','s:4:4':'wall-brick','s:5:4:1':'wall-concrete'}}};assert.equal(endCount(floors),1);assert.equal(wallBreachEnds(floors).has('s:5:4:1'),false);
});
test('ordinary ends, doors, fences and authoring erasures are not mistaken for wall damage',()=>{
 const {state}=wallBreachFixture({count:1});delete state.definition;assert.equal(endCount(state),0);
 for(const kind of ['door-steel-closed','door-wood-closed','door']){const edges={'s:4:4':'wall-brick','s:5:4':kind,'s:6:4':'wall-brick'},s={edges:{...edges,'s:5:4':'doorway-concrete-open'},definition:{edges}};assert.equal(endCount(s),0);}
 const s={edges:{'s:4:4':'wall-concrete'},definition:{edges:{'s:4:4':'wall-concrete','s:5:4':'fence-chainlink'}}};assert.equal(endCount(s),0);
});
test('map-boundary walls accept negative perimeter coordinates and explicit zero-level aliases',()=>{
 for(const axis of ['e','s']){const key=n=>axis==='e'?`e:-1:${n}`:`s:${n}:-1`,s={edges:{[key(0)]: 'wall-brick',[key(2)+':0']:'wall-brick'},definition:{edges:{[key(0)]:'wall-brick',[key(1)]:'wall-brick',[key(2)]:'wall-brick'}}};assert.equal(endCount(s),2);
  const boxes=Object.entries(s.edges).map(([edge,material])=>({id:'edge:'+edge+':wall',source:{edge},material}));assert.ok(damagedWallVisuals(boxes,s).every(b=>/^breach-brick-[12]-[012]-[es]-wall$/.test(b.shape)));
 }
});
test('a window beside a breach retains its opening and only damages the exposed sill and lintel',()=>{
 const {state}=wallBreachFixture({layout:'window',count:1}),visuals=environmentVisuals(buildWorld(state),state),parts=visuals.filter(b=>b.source.edge==='s:6:6');assert.equal(parts.length,2);assert.ok(parts.every(b=>b.breachEnds===2));assert.deepEqual(parts.map(p=>Number(p.size[1].toFixed(5))),[.85,.45]);
});
test('broken meshes are capped, deterministic and bounded inside the surviving wall, with bounded shared caching',()=>{
 const cache=environmentGeometries();try{
  for(const family of ['brick','concrete','metal'])for(const mask of [1,2,3])for(const seed of [0,1,2])for(const axis of ['e','s'])for(const section of ['wall','sill','lintel']){
   const name=`breach-${family}-${mask}-${seed}-${axis}-${section}`,g=environmentGeometry(cache,name),p=g.attributes.position,edges=new Map();assert.equal(g,environmentGeometry(cache,name));assert.ok(g.attributes.color.count===p.count);
   for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j));assert.ok(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).length()>1e-9);const keys=v.map(q=>q.toArray().map(n=>Math.round(n*1e6)).join(','));for(let j=0;j<3;j++){const e=[keys[j],keys[(j+1)%3]].sort().join('|');edges.set(e,(edges.get(e)||0)+1);}}
   assert.ok([...edges.values()].every(n=>n===2),'closed surface '+name);for(const n of p.array)assert.ok(Number.isFinite(n)&&n>=-.500001&&n<=.500001,name+' footprint');
  }
  assert.equal(Object.keys(cache).filter(k=>k.startsWith('breach-')).length,162);
 }finally{Object.values(cache).forEach(g=>g.dispose());}
});
test('real explosive destruction opens movement, restores rough ends after save/load, and waits for the grenade fuse in presentation',()=>{
 const definition=wallBreachBattleFixture();assert.deepEqual(validateMap(definition),[]);
 for(const weapon of ['grenade','rpg']){
  const state=createGame(7,definition,true,'easy',{statSystem:true});startEncounterClock(state);const near={x:20,y:21,z:0},far={x:20,y:20,z:0};assert.equal(canStep(state,near,far),false);
  const impact={x:20,y:20.75,z:0,h:.8},result=weapon==='grenade'?detonateGrenade(state,impact):detonate(state,impact,WEAPONS.rpg);assert.ok(endCount(state)>=2);assert.ok(canStep(state,near,far));const loaded=restoreEncounter(captureEncounter(state));assert.deepEqual(wallBreachEnds(loaded),wallBreachEnds(state));
  const b=new BattleGrenades(new T.Scene());try{if(weapon==='grenade'){const shot={event:{grenade:{scenery:result.before},sites:result.sites},phase:{discharged:false}};assert.equal(endCount(b.scenery(state,{active:shot,queue:[]})),0);shot.phase.discharged=true;assert.equal(endCount(b.scenery(state,{active:shot,queue:[]})),endCount(state));}}finally{b.dispose();}
 }
});
