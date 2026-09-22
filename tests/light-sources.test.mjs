import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {LIGHT_FORMS,lightBrightness,lightEnabled,placedEmitters,fixturePlacement} from '../dist/tactics/light-sources.js';
import {createFurnitureLibrary} from '../dist/tactics/painted-furniture.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {illuminationAt} from '../dist/tactics/awareness.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
test('brightness halves at five-tile boundaries, with finite thirty-tile reach',()=>{
 for(const [d,v] of [[0,1],[5,1],[5.001,.5],[10,.5],[15,.25],[20,.125],[25,.0625],[30,.03125],[30.001,0]])assert.equal(lightBrightness(d),v);
 for(const bad of [-1,NaN,Infinity])assert.equal(lightBrightness(bad),0);
});
test('all fixture emitter definitions match the actual model anchors including rotation and levels',()=>{
 const textures=[new T.Texture(),new T.Texture()],library=createFurnitureLibrary(...textures);
 for(const kind of Object.keys(LIGHT_FORMS))for(const rotated of [false,true]){
  const p={kind,x:12,y:18,z:1,rotated},built=library.build(kind),center=fixturePlacement(p);built.root.position.set(center.x,3,center.y);built.root.rotation.y=rotated?-Math.PI/2:0;built.root.updateMatrixWorld(true);
  const actual=[];built.root.traverse(o=>{if(o.name.startsWith('emitter'))actual.push(o.getWorldPosition(new T.Vector3()));});
  const expected=placedEmitters(p);assert.equal(actual.length,expected.length,kind);
  actual.forEach((v,i)=>assert.ok(v.distanceTo(new T.Vector3(expected[i].x,expected[i].h,expected[i].y))<1e-8,kind));
 }
 library.dispose();textures.forEach(t=>t.dispose());
});
test('automatic schedules, fire overrides and editor undo/rotation/export survive',()=>{
 assert.equal(lightEnabled({kind:'streetlight'},720),false);assert.equal(lightEnabled({kind:'streetlight'},1080),true);assert.equal(lightEnabled({kind:'streetlight'},360),false);
 assert.equal(lightEnabled({kind:'campfire'},720),true);assert.equal(lightEnabled({kind:'campfire',lightMode:'off'},1200),false);
 const d=new EditingDocument().open(JSON.stringify(blankMap()));assert.ok(d.apply({tool:'prop',start:{x:10,y:10,z:0},options:{propKind:'streetlight-double',lightMode:'on'}}).ok);
 let selection=d.inspect(10,10,0,{mode:'prop'});assert.equal(selection.data.lightMode,'on');assert.ok(d.rotate(selection).ok);assert.equal(d.map.props[0].lightMode,'on');
 selection=d.inspect(10,10,0,{mode:'prop'});d.lightMode(selection,'off');assert.equal(d.map.props[0].lightMode,'off');d.undo();assert.equal(d.map.props[0].lightMode,'on');
 assert.equal(new EditingDocument().open(d.export()).map.props[0].lightMode,'on');
});
test('lamps illuminate people, stack to daylight, and walls/floors block their light',()=>{
 const m=blankMap();m.time={startMinutes:1260};m.props=[{kind:'floor-lamp',x:7,y:4,z:0}];const s=createGame(1,m,false,'easy'),u=s.units[0];startEncounterClock(s);
 assert.equal(illuminationAt(s,u),1);s.props[0].lightMode='off';assert.equal(illuminationAt(s,u),.12);s.props[0].lightMode='on';
 s.edges['e:5:4']='wall';assert.equal(illuminationAt(s,u),.12);delete s.edges['e:5:4'];
 s.props=[{kind:'floor-lamp',x:3,y:4,z:1,lightMode:'on'}];s.upper[0]['3,4']='floor';assert.equal(illuminationAt(s,u),.12);
 s.props=[{kind:'floor-lamp',x:11,y:4,z:0,lightMode:'on'}];assert.equal(illuminationAt(s,u),.62);
 s.props.push({kind:'floor-lamp',x:11,y:5,z:0,lightMode:'on'});assert.equal(illuminationAt(s,u),1);
});

test('batched lighting restores materials, visibility and render targets after rendering and failure',async()=>{
 const {LightRenderer}=await import('../dist/tactics/light-renderer.js');
 for(const fail of [false,true]){
  const passes=new LightRenderer(),scene=new T.Scene(),camera=new T.Camera(),material=new T.MeshStandardMaterial({emissive:0xff0000,emissiveIntensity:.4}),mesh=new T.Mesh(new T.BoxGeometry(),material);scene.add(mesh);
  const lamps=Array.from({length:10},()=>new T.PointLight());scene.add(...lamps);const ambient=new T.AmbientLight();scene.add(ambient);
  let target=null,calls=0;const renderer={autoClear:true,getDrawingBufferSize:v=>v.set(64,64),getRenderTarget:()=>target,setRenderTarget:t=>target=t,render(s){calls++;if(s===scene)assert.ok(lamps.filter(l=>l.visible).length<=4);if(fail&&calls===2)throw Error('render failed');}};
  if(fail)assert.throws(()=>passes.render(renderer,scene,camera,lamps));else {passes.render(renderer,scene,camera,lamps);assert.equal(calls,4);}
  assert.equal(target,null);assert.equal(renderer.autoClear,true);assert.equal(material.transparent,false);assert.equal(material.depthWrite,true);assert.equal(material.emissiveIntensity,.4);assert.ok(lamps.every(l=>l.visible));assert.ok(ambient.visible);
  passes.dispose();material.dispose();mesh.geometry.dispose();
 }
});
import {spotlightTarget,lightConeFactor,lightSources} from '../dist/tactics/light-sources.js';
test('spotlight cycle is clock-driven, loops through up to three relative targets, and holds one point',()=>{
 const p={kind:'spotlight',x:10,y:20,z:1,lightMode:'on',lightTargets:[{x:0,y:8,z:-1},{x:8,y:0,z:0},{x:0,y:-8,z:-1}]};
 assert.deepEqual(spotlightTarget(p,0),{x:10,y:28,h:.1});
 assert.deepEqual(spotlightTarget(p,.5),{x:14,y:24,h:1.6});
 assert.deepEqual(spotlightTarget(p,3),spotlightTarget(p,0));
 assert.deepEqual(spotlightTarget(p,2),{x:10,y:12,h:.1});
 p.lightTargets.length=1;assert.deepEqual(spotlightTarget(p,100.75),spotlightTarget(p,0));
 const source=lightSources([p],0)[0];assert.equal(lightConeFactor(source,source.aim),1);assert.equal(lightConeFactor(source,{x:10,y:12,h:.1}),0);
});
test('spotlight editor targets survive save, undo, rotation and block placement',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap()));assert.ok(d.apply({tool:'prop',start:{x:10,y:10,z:0},options:{propKind:'spotlight',lightMode:'on'}}).ok);
 const selection=d.inspect(10,10,0,{mode:'prop'});d.lightTargets(selection,[{x:10,y:18,z:0},{x:18,y:10,z:0}]);
 const targets=structuredClone(d.map.props[0].lightTargets);assert.deepEqual(targets,[{x:0,y:8,z:0},{x:8,y:0,z:0}]);d.undo();assert.equal(d.map.props[0].lightTargets,undefined);d.redo();assert.ok(d.rotate(d.inspect(10,10,0,{mode:'prop'})).ok);
 const reopened=new EditingDocument().open(d.export());assert.deepEqual(reopened.map.props[0].lightTargets,targets);
 const block=d.capture(0,0),other=new EditingDocument().open(JSON.stringify(blankMap()));other.place(block,1,1);const placed=other.map.props.find(p=>p.kind==='spotlight');assert.deepEqual(placed.lightTargets,targets);assert.equal(spotlightTarget(placed,0).x,34);
 assert.throws(()=>d.lightTargets(selection,[]));assert.throws(()=>d.lightTargets(selection,Array(4).fill({x:10,y:10,z:0})));
});
test('spotlight cone sweeps illumination without leaking behind the fixture or through walls',()=>{
 const map=blankMap();map.time={startMinutes:1260};map.props=[{kind:'spotlight',x:7,y:4,z:0,lightMode:'on',lightTargets:[{x:-4,y:0,z:0},{x:4,y:0,z:0}]}];
 const s=createGame(1,map,false,'easy'),u=s.units[0];startEncounterClock(s);assert.equal(illuminationAt(s,u),1);
 s.clock.minutes+=1;assert.equal(illuminationAt(s,u),.12);s.clock.minutes-=1;s.edges['e:5:4']='wall';assert.equal(illuminationAt(s,u),.12);
});
