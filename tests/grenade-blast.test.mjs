import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BattleGrenades,grenadePhase} from '../dist/tactics/battle-grenades.js';
import {grenadeBlastFixture} from '../dist/tactics/grenade-blast-fixture.js';
import {grenadeBlastField,blastReach,blastPointVisible,resolvedGrenadeBlast} from '../dist/tactics/grenade-blast-field.js';
import {createGrenadeBlastEffects,loadGrenadeBlastTextures} from '../dist/tactics/grenade-blast-effects.js';

test('blast follows the resolved bounce endpoint and event radius, not the aim or chain explosion',()=>{
 const {shot}=grenadeBlastFixture();shot.event.trajectories[0].x=1;shot.event.bx=14;
 shot.event.explosions.unshift({kind:'tank',x:12,y:3,h:1,radius:9});
 shot.event.explosions[1].radius=3.75;
 const resolved=resolvedGrenadeBlast(shot);assert.equal(resolved.x,8);assert.equal(resolved.radius,3.75);
 delete shot.event.explosions;assert.equal(resolvedGrenadeBlast(shot).x,1);assert.equal(resolvedGrenadeBlast(shot).radius,5);
});
test('open ground reaches the five-tile perimeter; cover is the intact pre-damage geometry',()=>{
 const {shot,state}=grenadeBlastFixture('wall'),before=structuredClone(state);
 shot.event.grenade.scenery.edges={...state.edges};state.edges={};
 const field=grenadeBlastField(state,shot);
 assert.ok(blastReach(field,12,8)<1.51);assert.equal(blastReach(field,4,8),5);
 assert.deepEqual(state.edges,{});assert.deepEqual(shot.event.grenade.scenery.edges,before.edges);
 const open=grenadeBlastFixture();assert.ok(grenadeBlastField(open.state,open.shot).rays.every(r=>r===5));
});
test('roof, cliff and native-height tower flashes stay at their physical surface and logical visibility layer',()=>{
 for(const [kind,level] of [['open',0],['roof',1],['cliff',0],['tower',0]]){
  const {state,shot,floor}=grenadeBlastFixture(kind),field=grenadeBlastField(state,shot);
  assert.ok(Math.abs(field.floor-floor)<1e-6,kind+' surface');assert.equal(field.level,level,kind+' layer');
  assert.ok(blastPointVisible(field,state,8,8),kind+' visible');
  state.visible=new Set(level?['8,8']:['8,8,1']);assert.equal(blastPointVisible(field,state,8,8),false,kind+' other floor cannot reveal effect');
 }
});
test('only current visibility populates the clip mask and updates in place during playback',()=>{
 const {state,shot}=grenadeBlastFixture('fog'),scene=new T.Scene(),fx=createGrenadeBlastEffects(scene),field=grenadeBlastField(state,shot),camera=new T.Camera();
 try{fx.update(.3,{field,state,camera});const mask=fx.visibilityMask;
  assert.ok(mask.image.data.some(v=>v===255));assert.ok(mask.image.data.some(v=>v===0));
  state.visible.clear();fx.update(.31,{field,state,camera});assert.equal(fx.visibilityMask,mask);assert.ok(mask.image.data.every(v=>v===0),'explored tiles remain hidden');
  state.visible.add('8,8');fx.update(.32,{field,state,camera});assert.equal(mask.image.data.filter((v,i)=>i%4===3&&v===255).length,1);
 }finally{fx.dispose();}
});
test('intact ceilings cap the rising flash while airborne bursts do not invent a floating floor',()=>{
 const {state,shot}=grenadeBlastFixture('ceiling'),field=grenadeBlastField(state,shot);assert.ok(field.ceiling>1.9&&field.ceiling<2.13);assert.equal(field.floor,0);
 const open=grenadeBlastFixture();open.shot.event.explosions[0].h=1.4;const air=grenadeBlastField(open.state,open.shot);assert.ok(Math.abs(air.floor)<1e-6);assert.equal(air.ceiling,6.4);
 // Damage may already have removed the overhead tile from live state.
 const old=state.upper[0]['8,8'];delete state.upper[0]['8,8'];shot.event.grenade.scenery.tiles=[{x:8,y:8,z:1,kind:old}];
 assert.equal(grenadeBlastField(state,shot).ceiling,field.ceiling);
 const edge=grenadeBlastFixture('roof');Object.assign(edge.shot.event.explosions[0],{x:4,h:.045,z:0});const overhang=grenadeBlastField(edge.state,edge.shot),c=overhang.columns;
 assert.ok(overhang.ceiling>5);assert.equal(c.ceilings[(8-c.y)*c.size+5-c.x],2,'adjacent overhang caps its own column');assert.ok(c.ceilings[(8-c.y)*c.size+4-c.x]>5,'open column stays open');
});
test('normal blast clears at .8 seconds and reduced motion shows a static broad dust footprint',()=>{
 const {state,shot}=grenadeBlastFixture(),scene=new T.Scene(),fx=createGrenadeBlastEffects(scene),field=grenadeBlastField(state,shot),camera=new T.Camera();
 try{
  fx.update(.30,{field,state,camera});assert.ok(fx.group.visible);assert.ok(fx.puffs.some(p=>Math.hypot(p.position.x-8,p.position.z-8)>4));
  fx.update(.8,{field,state,camera});assert.equal(fx.group.visible,false);
  fx.update(.02,{field,state,camera,reduced:true});const positions=fx.puffs.map(p=>p.position.toArray()),phases=fx.puffs.map(p=>p.material.uniforms.phase.value);
  assert.ok(fx.puffs.every(p=>p.visible));assert.equal(fx.core.material.uniforms.phase.value,3,'no bright flash');
  fx.update(.16,{field,state,camera,reduced:true});assert.deepEqual(fx.puffs.map(p=>p.position.toArray()),positions);assert.deepEqual(fx.puffs.map(p=>p.material.uniforms.phase.value),phases);
  fx.update(.18,{field,state,camera,reduced:true});assert.equal(fx.group.visible,false);
  assert.equal(grenadePhase(shot,0).duration,6720);assert.equal(grenadePhase({...shot,reduced:true},0).duration,180);
 }finally{fx.dispose();}
});
test('cancellation hides the effect and sequential grenades rebuild their field without retaining masks',()=>{
 const {state,shot}=grenadeBlastFixture(),scene=new T.Scene(),fx=new BattleGrenades(scene);shot.phase=grenadePhase(shot,6220);
 try{fx.update(shot,state);const field=fx.field,mask=fx.blast.visibilityMask;let disposed=0;mask.addEventListener('dispose',()=>disposed++);
  fx.update(shot,state);assert.equal(fx.field,field);fx.update(null,state);assert.equal(fx.dust.visible,false);
  const next=structuredClone(shot);next.event.explosions[0].x=10;next.event.explosions[0].radius=2;fx.update(next,state);
  assert.equal(fx.field.origin.x,10);assert.equal(fx.field.radius,2);assert.equal(disposed,1);
 }finally{fx.dispose();}assert.equal(scene.children.length,0);fx.update(shot,state);assert.equal(fx.field,null);
});
test('late texture completion after teardown and a partial loading failure release owned textures',async()=>{
 const textures=[new T.Texture(),new T.Texture()],disposed=[0,0],pending=[];textures.forEach((t,i)=>t.addEventListener('dispose',()=>disposed[i]++));
 const fx=new BattleGrenades(new T.Scene(),{loader:{loadAsync:()=>new Promise(resolve=>pending.push(resolve))}});fx.dispose();pending.forEach((resolve,i)=>resolve(textures[i]));await fx.ready;assert.deepEqual(disposed,[1,1]);fx.dispose();assert.deepEqual(disposed,[1,1]);
 let index=0;await assert.rejects(loadGrenadeBlastTextures({loadAsync:()=>index++?Promise.reject(new Error('missing atlas')):Promise.resolve(textures[0])}),/missing atlas/);assert.deepEqual(disposed,[2,1]);
});
