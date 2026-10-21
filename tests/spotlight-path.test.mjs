import test from 'node:test';
import assert from 'node:assert/strict';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,validateMap} from '../dist/tactics/core/maps.js';
import {validateBlock} from '../dist/tactics/core/blocks.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {clickSpotlightPoint,spotlightAimPoints,spotlightPathError} from '../dist/tactics/spotlight-path.js';
import {spotlightTarget,sampledEmitters,lightConeFactor} from '../dist/tactics/light-sources.js';

const point=(x,y=15,waitSeconds=0,z=0)=>({x,y,z,waitSeconds});
function fixture(kind='spotlight'){
 const d=new EditingDocument().open(JSON.stringify(blankMap('Spotlight flags')));
 assert.ok(d.apply({tool:'prop',start:point(10,10),options:{propKind:kind,lightMode:'on'}}).ok);
 return {d,selection:d.inspect(10,10,0,{mode:'prop'})};
}
test('flag clicks add points and 15-second waits without changing the three-point limit',()=>{
 let points=clickSpotlightPoint([],point(12));points=clickSpotlightPoint(points,point(15));points=clickSpotlightPoint(points,point(18));
 const before=structuredClone(points);points=clickSpotlightPoint(points,point(12));points=clickSpotlightPoint(points,point(12));
 assert.equal(points[0].waitSeconds,30);assert.equal(points.length,3);assert.equal(before[0].waitSeconds,0);
 assert.throws(()=>clickSpotlightPoint(points,point(19)),/three/);
 for(const bad of [point(-1),point(240),point(12,15,0,6),point(12,15,-15),point(12,15,16),point(12,15,NaN),point(12,15,86415)])assert.ok(spotlightPathError([bad]));
 assert.throws(()=>clickSpotlightPoint([point(12,15,86400)],point(12)),/24 hours/);
});
test('spotlight flag edits, waits and clearing survive undo, redo and map export/import',()=>{
 const {d,selection}=fixture();let points=clickSpotlightPoint([],point(12));d.lightTargets(selection,points);
 points=clickSpotlightPoint(points,point(12));d.lightTargets(selection,points);points=clickSpotlightPoint(points,point(12));d.lightTargets(selection,points);
 d.undo();assert.equal(d.map.props[0].lightTargets[0].waitSeconds,15);d.redo();
 const loaded=new EditingDocument().open(d.export());assert.deepEqual(spotlightAimPoints(loaded.map.props[0]),[point(12,15,30)]);
 d.lightTargets(selection,[]);assert.equal(d.map.props[0].lightTargets,undefined);d.undo();assert.equal(d.map.props[0].lightTargets[0].waitSeconds,30);
 const before=d.export();assert.throws(()=>d.lightTargets(selection,[point(12,15,17)]),/15 seconds/);assert.equal(d.export(),before);
});
test('aiming can target water, obstructed tiles and upper air without a walkable floor',()=>{
 const {d,selection}=fixture(),map=structuredClone(d.map);map.terrain[15][12]='water';d.replace(map);
 d.lightTargets(selection,[point(12),point(10,10),point(15,15,15,5)]);
 assert.deepEqual(validateMap(d.map,{connectivity:false}),[]);assert.deepEqual(spotlightAimPoints(d.map.props[0]),[point(12),point(10,10),point(15,15,15,5)]);
 assert.deepEqual(spotlightAimPoints(new EditingDocument().open(d.export()).map.props[0]),[point(12),point(10,10),point(15,15,15,5)]);
 d.apply({tool:'erase-prop',start:point(10,10),options:{}});assert.throws(()=>d.lightTargets(selection,[point(12)]),/no longer exists/);
});
test('tower flags retain waits and relative offsets through rotation and reusable blocks',()=>{
 for(const kind of ['wooden-spotlight-tower','iron-searchlight-ladder-tower','iron-searchlight-stair-tower']){
  const {d,selection}=fixture(kind);d.lightTargets(selection,[point(18,18,30),point(8,18,15,1)]);
  assert.ok(d.rotate(d.inspect(10,10,0,{mode:'prop'})).ok);const targets=structuredClone(d.map.props[0].lightTargets),block=d.capture(0,0);
  const copy=new EditingDocument().open(JSON.stringify(blankMap()));copy.place(block,2,2);
  assert.deepEqual(copy.map.props[0].lightTargets,targets);assert.deepEqual(spotlightAimPoints(copy.map.props[0]),[point(66,66,30),point(56,66,15,1)]);
  const reopened=new EditingDocument().open(JSON.stringify(copy.capture(2,2)));assert.deepEqual(reopened.map.props[0].lightTargets,targets);
 }
});
test('legacy aims have zero wait; invalid waits, duplicate flags and non-spotlight routes reject on load',()=>{
 const {d,selection}=fixture();d.lightTargets(selection,[point(12),point(15,15,15)]);
 const raw=JSON.parse(d.export());delete raw.props[0].lightTargets[0].waitSeconds;
 assert.equal(spotlightAimPoints(new EditingDocument().open(JSON.stringify(raw)).map.props[0])[0].waitSeconds,0);
 for(const targets of [null,{},[null],[{x:2,y:3,waitSeconds:-15}],[{x:2,y:3,waitSeconds:1}],[{x:2,y:3,waitSeconds:null}],[{x:2,y:3,z:6}],[{x:2,y:3},{x:2,y:3}]]){
  const bad=structuredClone(raw);bad.props[0].lightTargets=targets;assert.throws(()=>new EditingDocument().open(JSON.stringify(bad)),/Spotlight|spotlight|Duplicate/);
 }
 const block=d.capture(0,0);block.props[0].lightTargets[0].waitSeconds=Infinity;assert.throws(()=>validateBlock(block),/Spotlight|spotlight/);
 raw.props[0].kind='floor-lamp';assert.throws(()=>new EditingDocument().open(JSON.stringify(raw)),/Only spotlights/);
});
test('reusable blocks preserve beams aimed beyond the block, validating their final map destination',()=>{
 const {d,selection}=fixture();d.lightTargets(selection,[point(30,12,15)]);
 const block=d.capture(0,0),copy=new EditingDocument().open(JSON.stringify(blankMap()));copy.place(block,1,1);
 assert.deepEqual(spotlightAimPoints(copy.map.props[0]),[point(54,36,15)]);
 assert.throws(()=>copy.place(block,9,9),/inside the map/);
});
test('precise legacy beam targets retain their position when a wait is added',()=>{
 const {d,selection}=fixture();d.lightTargets(selection,[point(12.65,17.4)]);
 const loaded=new EditingDocument().open(d.export()),points=spotlightAimPoints(loaded.map.props[0]);
 const changed=clickSpotlightPoint(points,points[0]);loaded.lightTargets(loaded.inspect(10,10,0,{mode:'prop'}),changed);
 assert.deepEqual(spotlightAimPoints(loaded.map.props[0]),[point(12.65,17.4,15)]);
});
test('the beam holds at each flag then sweeps for one minute, including the loop return',()=>{
 const p={kind:'spotlight',x:10,y:10,z:0,lightMode:'on',lightTargets:[{x:0,y:8,z:0,waitSeconds:30},{x:8,y:0,z:1,waitSeconds:15}]};
 const at=s=>spotlightTarget(p,s/60);
 assert.deepEqual(at(0),{x:10,y:18,h:.1});assert.deepEqual(at(15),at(0));assert.deepEqual(at(30),at(0));
 assert.deepEqual(at(60),{x:14,y:14,h:1.6});assert.deepEqual(at(90),{x:18,y:10,h:3.1});assert.deepEqual(at(100),at(90));
 assert.deepEqual(at(105),at(90));assert.deepEqual(at(135),at(60));assert.deepEqual(at(165),at(0));
 assert.deepEqual(at(165*10000+15),at(0));
 const source=sampledEmitters(p,15/60)[0];assert.deepEqual(source.aim,at(0));assert.equal(lightConeFactor(source,at(0)),1);assert.equal(lightConeFactor(source,at(90)),0);
 p.lightTargets.length=1;assert.deepEqual(at(1e6),at(0));
});
test('encounter save/load keeps the same held beam; corrupt live routes reject as damaged saves',()=>{
 const {d,selection}=fixture();d.lightTargets(selection,[point(12,15,30),point(18,10,15)]);
 const state=createGame(7,d.map,false,'easy');startEncounterClock(state);state.clock.minutes=15/60;
 const record=captureEncounter(state),loaded=restoreEncounter(record);
 assert.deepEqual(spotlightTarget(loaded.props[0],loaded.clock.minutes),spotlightTarget(state.props[0],state.clock.minutes));
 for(const targets of [null,[{x:3,y:4,z:0,waitSeconds:-15}],[{x:3,y:4,z:0,waitSeconds:Infinity}]]){
  const bad=structuredClone(record);bad.state.props[0].lightTargets=targets;assert.throws(()=>restoreEncounter(bad),/damaged/);
 }
});
