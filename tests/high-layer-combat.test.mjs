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

test('a layer-five collapse lands on layer four and never tunnels through an occupied slab',()=>{
 const m=blankMap('High collapse');setTerrain(m,10,10,3,'floor');setTerrain(m,10,10,4,'floor');
 const u={id:1,species:'horse',x:10,y:10,z:4,hp:150,ap:18,pack:[]};
 const s={...m,map:m.terrain,units:[u],queue:[],loot:[]};
 assert.deepEqual(findFallLanding(s,u,u,4),{x:10,y:10,z:3});
 const blocker={id:2,x:10,y:10,z:3,hp:100};s.units.push(blocker);
 assert.equal(findFallLanding(s,u,u,4),null,'an occupied intact floor stops the fall');s.units.pop();
 const receipt=damageStructure(s,u,200),result=settleStructureCollapse(s,[receipt]);
 assert.equal(u.z,3);assert.equal(result.falls[0].height,1);assert.ok(u.hp>100,'one-floor injury, not a fall to ground');
});

test('high-floor shot effects follow their own visibility rather than a lower floor',()=>{
 for(const z of [3,4]){
  const points=[new T.Vector3(10,z*DIMENSIONS.floorSpacing+1,10),new T.Vector3(10.1,z*DIMENSIONS.floorSpacing+1,10)];
  const s={props:[],visible:new Set([`10,10,${z}`])};
  assert.ok(visibleShotPath(s,points).length>1);
  s.visible=new Set(['10,10,2']);assert.deepEqual(visibleShotPath(s,points),[]);
 }
});

test('a fifth-layer blast uses fifth-layer visibility',()=>{
 const s={props:[],visible:new Set(['10,10,4'])},p={x:10,y:10,h:12.1,z:4};
 const field={level:grenadeBlastLevel(s,p)};assert.equal(field.level,4);assert.equal(blastPointVisible(field,s,10,10),true);
 s.visible=new Set(['10,10,3']);assert.equal(blastPointVisible(field,s,10,10),false);
 assert.equal(grenadeBlastLevel(s,{...p,z:undefined}),4,'physical height resolves to the same floor');
});

test('hybrid impacts report the actual upper floor hit',()=>{
 const m=blankMap('High hybrid hit');setTerrain(m,10,10,4,'floor');
 const s={...m,map:m.terrain,units:[],geometryMode:'hybrid'};
 const hit=traceHybrid(s,null,{x:10,y:10,h:4*DIMENSIONS.floorSpacing+1},{x:0,y:0,h:-1},2);
 assert.equal(hit.kind,'floor');assert.equal(hit.z,4);
});
