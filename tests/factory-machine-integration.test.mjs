import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,validateMap,parseMap,passable,neighbors} from '../dist/tactics/core/maps.js';
import {propCells,propAt} from '../dist/tactics/core/environment.js';
import {createGame,pathTo,refresh,previewAttack,attack} from '../dist/tactics/core/engine.js';
import {traceProjectile} from '../dist/tactics/core/projectiles.js';
import {extractBlock,validateBlock,placeBlock} from '../dist/tactics/core/blocks.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {SCENERY_PROPS,SCENERY_ROTATIONS,sceneryRotation,sceneryOrientation,sceneryPoint,sceneryLocal,sceneryId,scenerySize} from '../dist/tactics/scenery-catalog.js';
import {sceneryBlocked,sceneryMoveAllowed,sceneryRayHit} from '../dist/tactics/scenery-rules.js';
import {factoryData} from '../dist/tactics/factory-gameplay.js';
import {createFactoryMachine} from '../dist/tactics/factory-machine-model.js';
import {createFactoryMachineLibrary} from '../dist/tactics/factory-machine-library.js';
import {rotateSceneryBlock} from '../dist/tactics/scenery-block-rotation.js';
import {factoryMachineFixture} from '../dist/tactics/factory-machine-fixture.js';
import {grenadeWorld,sweepGrenade} from '../dist/tactics/grenade-geometry.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {invalidateMapGeometry} from '../dist/tactics/map-geometry-cache.js';
import {detonate} from '../dist/tactics/core/explosives.js';
import {detonateGrenade} from '../dist/tactics/grenade-blast.js';

const read=form=>JSON.parse(fs.readFileSync(new URL(`../dist/tactics/machine-${form}-10k-data.json`,import.meta.url))),forms=['lathe','mill','press'];
function mapFor(form='press',rotation=0,z=0){const map=blankMap('Factory physical check');map.guards=[];map.props=[{kind:'machine-'+form,x:24,y:24,z,...sceneryOrientation({rotation})}];if(z)for(let y=21;y<=29;y++)for(let x=21;x<=29;x++)map.upper[z-1][`${x},${y}`]='ground-concrete';return map;}
const stateOf=m=>({...m,map:m.terrain,units:[]});
function direction(p,v){const o=sceneryPoint(p,[0,0,0]),b=sceneryPoint(p,v);return {x:b.x-o.x,y:b.y-o.y,h:b.h-o.h};}

test('every registered scenery kind cycles four distinct facings; legacy rotated import retains its meaning',()=>{
 assert.equal(sceneryRotation({rotated:true}),90);assert.equal(sceneryRotation({rotated:true,rotation:180}),180);assert.throws(()=>sceneryRotation({rotation:45}),/orientation/);
 for(const kind of Object.keys(SCENERY_PROPS)){
  const doc=new EditingDocument().open(JSON.stringify(blankMap('Four-way scenery'))),result=doc.apply({tool:'prop',start:{x:6,y:6,z:0},options:{propKind:kind,rotation:0}});assert.ok(result.ok,kind+': '+result.error);
  const initial=structuredClone(doc.map.props[0]);
  for(const angle of [90,180,270,0]){assert.ok(doc.rotate(doc.inspect(6,6,0,{mode:'prop'})).ok,kind);assert.equal(doc.map.props[0].rotation,angle);const restored=parseMap(doc.export());assert.equal(restored.props[0].rotation,angle);assert.ok(doc.undo());assert.ok(doc.redo());}
  assert.deepEqual(doc.map.props[0],initial,kind+' four turns');
 }
});
test('scenery transforms have exact inverse and cardinal footprint at all elevations',()=>{
 for(const kind of Object.keys(SCENERY_PROPS))for(const rotation of SCENERY_ROTATIONS)for(const z of [0,1,2]){
  const p={kind,x:24,y:24,z,rotation},rule=SCENERY_PROPS[kind];assert.equal(propCells(p).length,rule.w*rule.h);
  for(const space of ['render','tactical'])for(const q of [[0,0,0],[rule.w-1,rule.h-1,2.3],[.37,1.21,.82]]){const r=sceneryLocal(p,sceneryPoint(p,q,space),space);assert.ok(Math.abs(r.x-q[0])+Math.abs(r.y-q[1])+Math.abs(r.h-q[2])<1e-12);}
 }
});
test('failed support, overlapping rotation, low ceilings and cross-level objects leave the editor unchanged',()=>{
 const map=mapFor('mill');for(let y=24;y<27;y++)for(let x=24;x<26;x++)map.upper[0][`${x},${y}`]='floor';assert.match(validateMap(map,{connectivity:false}).join(' '),/headroom/);
 map.props[0].kind='machine-lathe';assert.deepEqual(validateMap(map,{connectivity:false}),[]);
 const doc=new EditingDocument().open(JSON.stringify(blankMap('Headroom')));doc.map.upper[0]['25,25']='floor';const before=doc.export(),r=doc.apply({tool:'prop',start:{x:24,y:24,z:0},options:{propKind:'machine-press',rotation:0}});assert.equal(r.ok,false);assert.match(r.error,/headroom/);assert.equal(doc.export(),before);
 const turn=new EditingDocument().open(JSON.stringify(mapFor('lathe')));assert.ok(turn.apply({tool:'prop',start:{x:26,y:24,z:0},options:{propKind:'chair-wood-honey'}}).ok);const prior=turn.export();assert.equal(turn.rotate(turn.inspect(24,24,0,{mode:'prop'})).ok,false);assert.equal(turn.export(),prior);
 const unsupported=mapFor('press',270,2);delete unsupported.upper[1]['24,24'];assert.match(validateMap(unsupported,{connectivity:false}).join(' '),/supported/);
 const invalid=mapFor();invalid.props[0].rotation=360;assert.match(validateMap(invalid,{connectivity:false}).join(' '),/orientation/);
 const upperWall=mapFor('mill');upperWall.edges['e:24:24:1']='wall-concrete';assert.match(validateMap(upperWall,{connectivity:false}).join(' '),/upper wall/);
 const tall=new EditingDocument().open(JSON.stringify(mapFor('press',0,2))),tallBefore=tall.export(),ceiling=tall.apply({tool:'roof-tile',start:{x:24,y:24,z:3},options:{propKind:'roof-corrugated-flat'}});assert.equal(ceiling.ok,false);assert.match(ceiling.error,/headroom/);assert.equal(tall.export(),tallBefore,'builder roofs cannot bypass machine headroom');
});
test('machine blocks compose orientation and return exactly after four turns',()=>{
 const block=extractBlock(mapFor('lathe',270),1,1);let rotated=structuredClone(block);
 for(let i=0;i<4;i++){rotated=rotateSceneryBlock(rotated);validateBlock(rotated);assert.equal(rotated.props[0].rotation,(270+90*(i+1))%360);}
 assert.deepEqual(rotated,block);const placed=placeBlock(blankMap('Placed'),rotated,2,2);assert.equal(placed.props[0].rotation,270);assert.equal(parseMap(JSON.stringify(placed)).props[0].rotation,270);
});
test('independent transformed reduced meshes agree with baked finite rays for every machine, direction and raised floor',()=>{
 let seed=4511,hits=0,gaps=0;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const form of forms)for(const rotation of SCENERY_ROTATIONS)for(const z of [0,2]){
  const p=mapFor(form,rotation,z).props[0],rule=SCENERY_PROPS[p.kind],model=createFactoryMachine(read(form)),point=sceneryPoint(p,rule.origin);model.root.position.set(point.x,z*3,point.y);model.root.rotation.y=-rotation*Math.PI/180;model.root.scale.y=rule.heightScale;model.root.updateMatrixWorld(true);for(const m of model.parts)m.material.side=T.DoubleSide;
  try{for(let i=0;i<80;i++){
   const origin={x:22+random()*7,y:22+random()*7,h:z*3+random()*5},goal=sceneryPoint(p,[random()*2,random()*3,random()*3]),v={x:goal.x-origin.x,y:goal.y-origin.y,h:goal.h-origin.h},length=Math.hypot(v.x,v.y,v.h),d={x:v.x/length,y:v.y/length,h:v.h/length},reach=i%2?length:12;
   const raw=new T.Raycaster(new T.Vector3(origin.x,origin.h,origin.y),new T.Vector3(d.x,d.h,d.y),1e-7,reach).intersectObjects(model.parts,false)[0],baked=sceneryRayHit([p],origin,d,reach);assert.equal(!!baked,!!raw,`${form} ${rotation}° floor ${z} ray ${i}`);if(raw){hits++;assert.ok(Math.abs(raw.distance-baked.distance)<.0001);}else gaps++;
  }}finally{model.dispose();}
 }
 assert.ok(hits>500&&gaps>300);
});
test('movement and swept diagonal links cannot cut machine bodies, while routes go around',()=>{
 for(const form of forms)for(const rotation of SCENERY_ROTATIONS){const map=mapFor(form,rotation),p=map.props[0];for(const q of propCells(p)){assert.equal(passable(map,q),!sceneryBlocked(p,q));for(const n of neighbors(map,q))assert.ok(sceneryMoveAllowed(map,q,n));}const state=createGame(4,map,false,'easy'),u=state.units[0];u.x=22;u.y=25;const path=pathTo(state,u,29,25,0);assert.ok(path.length>0);let prev=u,cost=0;for(const q of path){cost+=Math.hypot(q.x-prev.x,q.y-prev.y);prev=q;}assert.ok(cost>7);assert.ok(path.every(q=>!sceneryBlocked(p,q)));}
});
test('a diagonal with both endpoints outside the reservation cannot clip a machine corner',()=>{
 const map=mapFor('press'),a={x:23,y:24,z:0},b={x:24,y:23,z:0};assert.ok(passable(map,a)&&passable(map,b));assert.equal(sceneryMoveAllowed(map,a,b),false);assert.equal(neighbors(map,a).some(q=>q.x===b.x&&q.y===b.y),false);
});
test('body-zone previews, committed shots and guard fire agree about a press opening',()=>{
 const map=mapFor('press');map.starts[0]={...map.starts[0],x:21,y:24};map.guards=[{x:29,y:24,z:0,species:'pig-foreman',weapon:'rifle',heading:180}];
 const s=createGame(42,map,true,'easy'),a=s.units[0],b=s.units[4];a.heading=0;a.ap=b.ap=100;
 for(const [stance,torso]of [['standing',true],['kneeling',false],['prone',true]]){a.stance=b.stance=stance;refresh(s);assert.equal(previewAttack(s,a,b,false,'torso').ok,torso);assert.equal(previewAttack(s,a,b,false,'legs').ok,false);}
 a.stance=b.stance='standing';refresh(s);const before=structuredClone(s),preview=previewAttack(s,a,b,false,'torso');assert.ok(preview.ok);assert.deepEqual(s,before,'inspecting does not modify state');assert.ok(attack(s,a,b,false,false,'torso'));assert.equal(s.effect.sequence[0].trajectories[0].unitId,b.id);
 s.phase='enemy';assert.ok(attack(s,b,a,false,true,'torso'));assert.equal(s.effect.sequence[0].trajectories[0].unitId,a.id);
 a.stance=b.stance='kneeling';refresh(s);const ap=a.ap,ammo=a.ammo[a.weapon];assert.equal(attack(s,a,b,false,false,'torso'),false);assert.equal(a.ap,ap);assert.equal(a.ammo[a.weapon],ammo);
});
test('real gaps, low and high body rays, cross-floor rays and grenade radii use the same geometry',()=>{
 for(const rotation of SCENERY_ROTATIONS)for(const z of [0,2]){
  const map=mapFor('press',rotation,z),p=map.props[0],s=stateOf(map),origin=sceneryPoint(p,[.5,1.6,1.2]),d=direction(p,[0,-1,0]);assert.equal(sceneryRayHit([p],origin,d,1),null);assert.equal(traceProjectile(s,null,origin,d,1).kind,'range');
  const end={x:origin.x+d.x,y:origin.y+d.y,h:origin.h},renderOrigin=sceneryPoint(p,[.5,1.6,1.2],'render'),renderEnd={...renderOrigin,x:renderOrigin.x+d.x,y:renderOrigin.y+d.y};assert.equal(sweepGrenade(grenadeWorld(s),renderOrigin,renderEnd,.045),null);
  const blocked=sceneryPoint(p,[.5,3.5,.4]),ray=direction(p,[0,-1,0]);assert.equal(traceProjectile(s,null,blocked,ray,5).propId,sceneryId(p));assert.ok(sweepGrenade(grenadeWorld(s),sceneryPoint(p,[.5,3.5,.4],'render'),sceneryPoint(p,[.5,-1.5,.4],'render'),.045));
  assert.ok(sceneryRayHit([p],sceneryPoint(p,[.5,1,4]),direction(p,[0,0,-1]),6),'descending ray reaches the cross-floor machine');
 }
 const lathe=mapFor('lathe').props[0];assert.equal(sceneryRayHit([lathe],sceneryPoint(lathe,[-2,1,1.9]),direction(lathe,[1,0,0]),6),null,'above the lathe stays open');
});
test('removal immediately clears navigation, sight and grenade caches and remains removed after save/load',()=>{
 const map=mapFor('lathe'),s=createGame(42,map,false,'easy'),p=s.props[0],q={x:24,y:25,z:0};startEncounterClock(s);assert.ok(sceneryBlocked(p,q));assert.equal(passable(s,q),false);grenadeWorld(s);
 s.props.splice(0,1);invalidateMapGeometry(s);assert.equal(propAt(s,q.x,q.y,0),undefined);assert.equal(passable(s,q),true);assert.equal(sceneryRayHit(s.props,{x:20,y:25,h:.5},{x:1,y:0,h:0},10),null);assert.equal(grenadeWorld(s).items.some(i=>i.source.propId===sceneryId(p)),false);
 const restored=restoreEncounter(captureEncounter(s));assert.equal(restored.props.some(p=>p.kind.startsWith('machine-')),false);assert.equal(passable(restored,q),true);
 const blast=createGame(8,map,false,'easy');detonate(blast,{x:23,y:25,h:.6},{blast:4,damage:120});assert.equal(blast.props.some(p=>p.kind==='machine-lathe'),false,'existing blast removal policy applies');assert.equal(passable(blast,q),true);
});
test('factory fixtures validate, including the thirty-machine stress map',()=>{for(const mode of ['review','baseline','small','stress'])assert.deepEqual(validateMap(factoryMachineFixture(mode)),[],mode);});
test('mutable placement indexes see in-place rotations, replacements and removals',()=>{
 const map=mapFor('press'),p=map.props[0];assert.equal(propAt(map,26,24),undefined);p.rotation=90;assert.equal(propAt(map,26,24),p);assert.equal(propAt(map,24,26),undefined);assert.ok(sceneryMoveAllowed(map,{x:20,y:24,z:0},{x:21,y:24,z:0}));
 map.props[0]={...p,x:30};assert.equal(propAt(map,26,24),undefined);assert.equal(propAt(map,30,24),map.props[0]);map.props.splice(0,1);assert.equal(propAt(map,30,24),undefined);
});
test('save loading rejects unsupported live orientations, and a grenade can remove its own machine surface',()=>{
 const s=createGame(3,mapFor('press',270),false,'easy');startEncounterClock(s);const record=captureEncounter(s);assert.equal(restoreEncounter(record).props[0].rotation,270);record.state.props[0].rotation=45;assert.throws(()=>restoreEncounter(record),/damaged/);
 const g=createGame(4,mapFor('lathe'),false,'easy');detonateGrenade(g,{x:23,y:25,h:.6,z:0});assert.equal(g.props.some(p=>p.kind==='machine-lathe'),false);assert.equal(passable(g,{x:24,y:25,z:0}),true);
});
test('thirty instances share geometry, paint and preparation; disposing one never disposes shared resources',()=>{
 let prepared=0,paintDisposals=0,geometryDisposals=0;const texture=new T.Texture({width:1536,height:1024});
 const library=createFactoryMachineLibrary(null,read('lathe'),texture,{preparePaint(renderer,model){prepared++;const materials=model.parts.map(()=>new T.MeshStandardMaterial());return {materials,dispose(){paintDisposals++;materials.forEach(m=>m.dispose());}};}}),instances=Array.from({length:30},()=>library.build());
 const first=[...instances[0].parts];for(const part of first)part.geometry.addEventListener('dispose',()=>geometryDisposals++);
 for(const instance of instances)for(let i=0;i<first.length;i++){assert.equal(instance.parts[i].geometry,first[i].geometry);assert.equal(instance.parts[i].material,first[i].material);}
 instances[0].dispose();assert.equal(geometryDisposals,0);assert.equal(paintDisposals,0);assert.equal(prepared,1);for(const instance of instances.slice(1))instance.dispose();library.dispose();library.dispose();assert.equal(geometryDisposals,first.length);assert.equal(paintDisposals,1);texture.dispose();
});
test('factory geometry bake is reproducible and records current source hashes',()=>{execFileSync(process.execPath,['tools/export-factory-gameplay.mjs','--check'],{cwd:new URL('..',import.meta.url)});assert.equal(factoryData({kind:'machine-press'}).triangleCount,9997);});
