import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,parseMap,validateMap,terrainAt,passable,neighbors,setTerrain,LEVELS} from '../dist/tactics/core/maps.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {createGame,pathTo} from '../dist/tactics/core/engine.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {sceneryPoint,scenerySize} from '../dist/tactics/scenery-catalog.js';
import {sceneryRayHit} from '../dist/tactics/scenery-rules.js';
import {archSurfaceAt,archPlacementErrors} from '../dist/tactics/stone-arches.js';
import {STONE_ARCH_SPECS,stoneArchData} from '../dist/tactics/stone-arch-geometry.js';
import {createStoneArchLibrary} from '../dist/tactics/stone-arch-scene.js';
import {stoneArchFixture} from '../dist/tactics/stone-arch-fixture.js';
import {ensureMapLayer} from '../dist/tactics/map-layers.js';
import {buildWorld,traceWorld,DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {grenadeWorld,sweepGrenade} from '../dist/tactics/grenade-geometry.js';

const place=(kind,rotation=0)=>{const map=blankMap('Arch checks'),prop={kind,x:30,y:30,z:0,rotation,rotated:rotation%180===90},spec=STONE_ARCH_SPECS[kind];ensureMapLayer(map,spec.rise);map.props.push(prop);return {map,prop,spec};};
const cell=(prop,x,y,z)=>{const p=sceneryPoint(prop,[x,y]);return {x:p.x,y:p.y,z};};
function lineOfTravel(map,points){for(let i=1;i<points.length;i++)assert.ok(neighbors(map,points[i-1]).some(p=>p.x===points[i].x&&p.y===points[i].y&&p.z===points[i].z),JSON.stringify(points.slice(i-1,i+1)));}

test('arch routes work in four orientations within their declared map layer capacity',()=>{
 const legacy=blankMap('Legacy capacity');legacy.props.push({kind:'stone-arch-large',x:30,y:30,z:0});assert.match(validateMap(legacy).join(' '),/playable layers/);
 for(const kind of Object.keys(STONE_ARCH_SPECS))for(const rotation of [0,90,180,270]){
  const {map,prop,spec}=place(kind,rotation);if(spec.rise>=LEVELS){assert.match(validateMap(map).join(' '),/playable layers/);continue;}assert.deepEqual(validateMap(map),[]);
  for(let x=spec.pier;x<spec.w-spec.pier;x++)lineOfTravel(map,Array.from({length:spec.h+4},(_,y)=>cell(prop,x,y-2,0)));
  for(const x of [0,spec.w-1])for(let y=0;y<spec.h;y++)assert.equal(passable(map,cell(prop,x,y,0)),false);
  for(let y=0;y<spec.h;y++){
   const points=Array.from({length:spec.w+2},(_,x)=>cell(prop,x-1,y,spec.rise));
   for(const p of [points[0],points.at(-1)])setTerrain(map,p.x,p.y,p.z,'ground-gravel');
   lineOfTravel(map,points);
  }
  const under=cell(prop,spec.pier,1,0);assert.ok(neighbors(map,under).every(p=>p.z===0));
  assert.equal(terrainAt(map,under.x,under.y,spec.rise),'ground-gravel');
 }
});

test('large opening clears a six-tile road and one full tile on either side',()=>{
 const {map,prop}=place('stone-arch-large',90);
 for(let y=prop.y+3;y<=prop.y+8;y++)for(let x=prop.x-4;x<=prop.x+6;x++)map.terrain[y][x]='ground-asphalt';
 for(let y=prop.y+2;y<=prop.y+9;y++)lineOfTravel(map,Array.from({length:11},(_,i)=>({x:prop.x-4+i,y,z:0})));
 assert.equal(passable(map,{x:prop.x+1,y:prop.y+1,z:0}),false);assert.equal(passable(map,{x:prop.x+1,y:prop.y+10,z:0}),false);
});

test('shots pass through the opening and strike real piers and overhead stone',()=>{
 for(const kind of Object.keys(STONE_ARCH_SPECS))for(const rotation of [0,90,180,270]){
  const {prop,spec}=place(kind,rotation),ray=(x,height)=>{const a=sceneryPoint(prop,[x,-2,height]),b=sceneryPoint(prop,[x,spec.h+1,height]),length=Math.hypot(b.x-a.x,b.y-a.y);return sceneryRayHit([prop],a,{x:(b.x-a.x)/length,y:(b.y-a.y)/length,h:0},length);};
  assert.equal(ray((spec.w-1)/2,1.6),null);assert.ok(ray(0,1));assert.ok(ray((spec.w-1)/2,stoneArchData(kind).top-.06));
 }
});

test('top surfaces follow placement edits and disappear after removal without deleting authored terrain',()=>{
 const {map,prop,spec}=place('stone-arch-small');const original={x:prop.x,y:prop.y,z:spec.rise};
 assert.ok(archSurfaceAt(map,original.x,original.y,original.z));prop.x+=20;
 assert.equal(terrainAt(map,original.x,original.y,original.z),'void');assert.equal(terrainAt(map,prop.x,prop.y,spec.rise),'ground-gravel');
 setTerrain(map,original.x,original.y,original.z,'ground-concrete');map.props.splice(0);
 assert.equal(terrainAt(map,prop.x,prop.y,spec.rise),'void');assert.equal(terrainAt(map,original.x,original.y,original.z),'ground-concrete');
});

test('placement, four rotations, undo/redo, export and deletion preserve the upper route',()=>{
 for(const kind of Object.keys(STONE_ARCH_SPECS).filter(k=>STONE_ARCH_SPECS[k].rise<LEVELS)){
  const map=blankMap('Arch authoring');ensureMapLayer(map,STONE_ARCH_SPECS[kind].rise);const doc=new EditingDocument().open(JSON.stringify(map));
  assert.equal(doc.apply({tool:'prop',start:{x:30,y:30,z:0},options:{propKind:kind}}).ok,true);
  const selection=()=>doc.inspect(30,30,0,{mode:'prop'});
  for(let i=0;i<4;i++)assert.equal(doc.rotate(selection()).ok,true);
  assert.equal(doc.map.props[0].rotation,0);assert.ok(doc.undo());assert.equal(doc.map.props[0].rotation,270);assert.ok(doc.redo());
  const saved=parseMap(doc.export()),p=saved.props[0],d=stoneArchData(kind);assert.equal(terrainAt(saved,p.x,p.y,d.rise),'ground-gravel');
  assert.equal(doc.apply({tool:'erase-prop',start:{x:30,y:30,z:0},options:{}}).ok,true);assert.equal(terrainAt(doc.map,30,30,d.rise),'void');assert.ok(doc.undo());assert.equal(terrainAt(doc.map,30,30,d.rise),'ground-gravel');
 }
});

test('invalid height and objects or floors inside solid stone are rejected',()=>{
 const {map,prop,spec}=place('stone-arch-large');prop.z=map.levels-spec.rise;assert.match(archPlacementErrors(map).join(' '),/playable layers/);
 prop.z=0;map.upper[0][`${prop.x},${prop.y}`]='floor';assert.match(archPlacementErrors(map).join(' '),/solid arch/);
 delete map.upper[0][`${prop.x},${prop.y}`];map.props.push({kind:'crate-wood',x:prop.x,y:prop.y,z:1});assert.match(archPlacementErrors(map,null,{'crate-wood':{w:1,h:1,solid:true}}).join(' '),/solid object/);
});

test('selected-level picking has separate ground and top slabs, with no duplicate visible floor',()=>{
 const {map,prop,spec}=place('stone-arch-large'),x=prop.x+4,y=prop.y+1,world=buildWorld(map),a=[x,12,y],b=[x,-1,y];
 for(const level of [0,spec.rise]){const hit=traceWorld(world,a,b,{filter:q=>q.kind==='floor'&&q.source.z===level});assert.equal(hit.source.z,level);assert.ok(Math.abs(hit.point[1]-level*DIMENSIONS.floorSpacing)<1e-6);}
 assert.equal(environmentVisuals(world,map).some(b=>b.archSurface),false);
});

test('grenades traverse the open passage and collide with the actual stone',()=>{
 const {map,prop,spec}=place('stone-arch-large'),world=grenadeWorld(map),ray=(x)=>{const from=sceneryPoint(prop,[x,-2,1.3],'render'),to=sceneryPoint(prop,[x,spec.h+1,1.3],'render');return sweepGrenade(world,from,to,.05);};
 assert.equal(ray(4),null);assert.equal(ray(0).kind,'scenery');
});

test('shared low-poly meshes match the collision bounds and preserve exact top elevation',()=>{
 const library=createStoneArchLibrary();try{for(const kind of Object.keys(STONE_ARCH_SPECS)){const model=library.build(kind),mesh=model.root.children[0],box=new T.Box3().setFromObject(model.root),d=stoneArchData(kind),geometry=mesh.geometry;assert.equal(geometry.attributes.position.count/3,d.triangles.length/9);assert.ok(Math.abs(box.max.y-d.top)<1e-6);assert.ok(d.triangles.length/9<300);
  assert.equal(geometry.groups.length,2,'top and stone each submit one group, rather than a draw per triangle');
  const actual=[],expected=[];
  for(let i=0;i<d.triangles.length;i+=9){const triangle=[];for(let j=0;j<9;j+=3)triangle.push(Math.fround(d.triangles[i+j]),Math.fround(d.triangles[i+j+2]),Math.fround(d.triangles[i+j+1]));expected.push(triangle.join(','));actual.push(Array.from(geometry.attributes.position.array.slice(i,i+9)).join(','));}
  assert.deepEqual(actual.sort(),expected.sort(),'grouping preserves every oriented collision triangle');
  assert.equal(geometry.groups.reduce((n,g)=>n+g.count,0),geometry.attributes.position.count);model.dispose();}}finally{library.dispose();}
});

test('timber approaches make the small arch top reachable and preserve it through encounter saves',()=>{
 const map=stoneArchFixture();assert.deepEqual(validateMap(map),[]);const s=createGame(42,map,false,'easy'),u=s.units[0];startEncounterClock(s);
 // Keep routing bounded to the purpose-built review area.
 const reachable=(from,to)=>{const queue=[from],seen=new Set([JSON.stringify(from)]);for(const p of queue){if(p.x===to.x&&p.y===to.y&&p.z===to.z)return true;for(const q of neighbors(s,p)){if(q.x<7||q.x>49||q.y<5||q.y>47)continue;const n={x:q.x,y:q.y,z:q.z},key=JSON.stringify(n);if(!seen.has(key)){seen.add(key);queue.push(n);}}}return false;};
 assert.ok(reachable({x:32,y:38,z:0},{x:38,y:38,z:1}));assert.ok(reachable({x:38,y:34,z:0},{x:38,y:43,z:0}));
 u.x=38;u.y=38;u.z=1;const restored=restoreEncounter(captureEncounter(s));assert.equal(terrainAt(restored,38,38,1),'ground-gravel');assert.equal(restored.units[0].z,1);
});
