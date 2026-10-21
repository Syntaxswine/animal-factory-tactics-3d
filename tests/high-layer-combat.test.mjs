import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,setTerrain} from '../dist/tactics/core/maps.js';
import {findFallLanding} from '../dist/tactics/fall-damage.js';
import {damageStructure} from '../dist/tactics/structure-health.js';
import {settleStructureCollapse} from '../dist/tactics/structure-collapse.js';
import {visibleShotPath} from '../dist/tactics/battle-shot-effects.js';
import {grenadeBlastLevel,blastPointVisible} from '../dist/tactics/grenade-blast-field.js';
import {traceHybrid} from '../dist/tactics/hybrid-combat.js';
import {DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {GRENADE_FLOOR} from '../dist/tactics/grenade-geometry.js';
import {MAP_LEVELS} from '../dist/tactics/map-layers.js';

test('an upper collapse lands on the first intact floor and never tunnels through an occupied slab',()=>{
 for(let z=4;z<MAP_LEVELS;z++){
 const m=blankMap('High collapse');setTerrain(m,10,10,z-1,'floor');setTerrain(m,10,10,z,'floor');
 const u={id:1,species:'horse',x:10,y:10,z,hp:150,ap:18,pack:[]};
 const s={...m,map:m.terrain,units:[u],queue:[],loot:[]};
 assert.deepEqual(findFallLanding(s,u,u,z),{x:10,y:10,z:z-1});
 const blocker={id:2,x:10,y:10,z:z-1,hp:100};s.units.push(blocker);
 assert.equal(findFallLanding(s,u,u,z),null,'an occupied intact floor stops the fall');s.units.pop();
 const receipt=damageStructure(s,u,200),result=settleStructureCollapse(s,[receipt]);
 assert.equal(u.z,z-1);assert.equal(result.falls[0].height,1);assert.ok(u.hp>100,'one-floor injury, not a fall to ground');
 }
});

test('high-floor shot effects follow their own visibility rather than a lower floor',()=>{
 for(let z=3;z<MAP_LEVELS;z++){
  const points=[new T.Vector3(10,z*DIMENSIONS.floorSpacing+1,10),new T.Vector3(10.1,z*DIMENSIONS.floorSpacing+1,10)];
  const s={props:[],visible:new Set([`10,10,${z}`])};
  assert.ok(visibleShotPath(s,points).length>1);
  s.visible=new Set(['10,10,2']);assert.deepEqual(visibleShotPath(s,points),[]);
 }
});

test('upper blasts use their own visibility with consistent physical heights',()=>{
 for(let z=3;z<MAP_LEVELS;z++){
 const s={props:[],visible:new Set([`10,10,${z}`])},p={x:10,y:10,h:z*GRENADE_FLOOR+.1,z};
 const field={level:grenadeBlastLevel(s,p)};assert.equal(field.level,z);assert.equal(blastPointVisible(field,s,10,10),true);
 s.visible=new Set([`10,10,${z-1}`]);assert.equal(blastPointVisible(field,s,10,10),false);
 assert.equal(grenadeBlastLevel(s,{...p,z:undefined}),z,'physical height resolves to the same floor');
 }
});

test('hybrid impacts report the actual upper floor hit',()=>{
 for(let z=3;z<MAP_LEVELS;z++){
 const m=blankMap('High hybrid hit');setTerrain(m,10,10,z,'floor');
 const s={...m,map:m.terrain,units:[],geometryMode:'hybrid'};
 const hit=traceHybrid(s,null,{x:10,y:10,h:z*DIMENSIONS.floorSpacing+1},{x:0,y:0,h:-1},2);
 assert.equal(hit.kind,'floor');assert.equal(hit.z,z);
 }
});
