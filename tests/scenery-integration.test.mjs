import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,validateMap,parseMap,passable,neighbors} from '../dist/tactics/core/maps.js';
import {PROPS,propCells} from '../dist/tactics/core/environment.js';
import {createGame,pathTo} from '../dist/tactics/core/engine.js';
import {traceProjectile} from '../dist/tactics/core/projectiles.js';
import {terrainVisibility} from '../dist/tactics/core/visibility.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {validateBlock,placeBlock} from '../dist/tactics/core/blocks.js';
import {SCENERY_PROPS,sceneryRule,sceneryPoint,sceneryId,isHelicopter} from '../dist/tactics/scenery-catalog.js';
import {helicopterData,helicopterBlocked,helicopterMoveAllowed,helicopterRayHit} from '../dist/tactics/scenery-rules.js';
import {createUtilityHelicopter} from '../dist/tactics/utility-helicopter.js';
import {SceneryScene} from '../dist/tactics/scenery-scene.js';
import {sceneryFixture} from '../dist/tactics/scenery-fixture.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {grenadeWorld,sweepGrenade} from '../dist/tactics/grenade-geometry.js';
import {helicopterStart} from '../dist/tactics/helicopter-start.js';
import {EditorCharacterMenu} from '../dist/tactics/editor-character-menu.js';

function mapFor(kind='helicopter-crash-smoke',rotated=false,z=0){const map=blankMap('New assets');map.props=[{kind,x:24,y:24,z,rotated}];if(z)for(let level=0;level<z;level++)for(let y=20;y<42;y++)for(let x=20;x<42;x++)map.upper[level][`${x},${y}`]='ground-grass';return map;}

test('patrol overlay waits for the initial map to load before reading a character',()=>{
 assert.equal(EditorCharacterMenu.prototype.row.call({getDocument:()=>undefined}),null);
});
test('setting a crash start preserves identities and equipment and supports undo',()=>{
 for(const rotated of [false,true]){
  const map=mapFor('helicopter-crash-smoke',rotated,2),doc=new EditingDocument().open(JSON.stringify(map)),before=structuredClone(doc.map.starts),selection=doc.inspect(24,24,2,{mode:'prop'});
  doc.crashStart(selection);assert.ok(doc.map.starts.every(p=>p.heading===135&&p.z===2));
  for(let i=0;i<4;i++)assert.equal(doc.map.starts[i].character.id,before[i].character.id);
  assert.ok(doc.undo());assert.deepEqual(doc.map.starts,before);assert.ok(doc.redo());assert.ok(doc.map.starts.every(p=>p.heading===135));
  const next=helicopterStart(map,map.props[0]),p=next.starts[0];map.upper[1][`${p.x},${p.y}`]='void';assert.throws(()=>helicopterStart(map,map.props[0]),/Clear the four survivor/);
 }
});

test('all new assets place, rotate, undo, save, export and survive reusable blocks',()=>{
 for(const kind of Object.keys(SCENERY_PROPS)){
  const doc=new EditingDocument().open(JSON.stringify(blankMap('Asset edit')));
  assert.ok(PROPS[kind]);assert.equal(doc.apply({tool:'prop',start:{x:6,y:6,z:0},options:{propKind:kind}}).ok,true,kind);
  assert.equal(doc.rotate(doc.inspect(6,6,0,{mode:'prop'})).ok,true,kind);assert.equal(doc.map.props[0].rotated,true);
  assert.ok(doc.undo());assert.equal(!!doc.map.props[0].rotated,false);assert.ok(doc.redo());
  const map=parseMap(doc.export());assert.equal(map.props[0].kind,kind);assert.equal(map.props[0].rotated,true);
  const block=validateBlock(doc.capture(0,0)),placed=placeBlock(blankMap('Block target'),block,1,1);assert.equal(placed.props[0].kind,kind);assert.equal(placed.props[0].x,30);
  assert.equal(buildWorld(map).diagnostics.some(x=>x.kind===kind),false);
 }
});
test('placement rejects overlapping and unsupported reservations while allowing raised terrain',()=>{
 for(const z of [0,1,2]){const map=mapFor('helicopter-crash-smoke',false,z);assert.deepEqual(validateMap(map,{connectivity:false}),[]);map.props.push({...map.props[0],kind:'chair-wood-honey'});assert.ok(validateMap(map,{connectivity:false}).some(s=>s.includes('Overlapping')));}
 const m=mapFor('helicopter-crash-smoke',false,2);delete m.upper[1]['28,28'];assert.ok(validateMap(m,{connectivity:false}).some(s=>s.includes('supported floor')));
});
test('standing clearance leaves rotor overhang open and prevents crossing solid body/debris',()=>{
 for(const kind of Object.keys(SCENERY_PROPS).filter(kind=>isHelicopter({kind})))for(const rotated of [false,true]){
  const map=mapFor(kind,rotated),p=map.props[0],data=helicopterData(p);let clear=0,blocked=0;
  for(let y=0;y<10;y++)for(let x=0;x<12;x++){const q=sceneryPoint(p,[x,y]),solid=helicopterBlocked(p,q);assert.equal(passable(map,q),!solid);solid?blocked++:clear++;}
  assert.ok(clear>60&&blocked>5,kind+' has physical body and open overhang');
  for(const [x,y,u,v]of data.clearance.links){const a=sceneryPoint(p,[x,y]),b=sceneryPoint(p,[u,v]);assert.ok(helicopterMoveAllowed(map,a,b));assert.ok(helicopterMoveAllowed(map,b,a));}
  for(const q of propCells(p))if(passable(map,q))for(const next of neighbors(map,q))assert.equal(helicopterBlocked(p,next),false);
 }
});
test('actual model triangles and baked bullet collisions agree after rotation and elevation',()=>{
 const texture=new T.Texture();let seed=741,hits=0,gaps=0;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 try{for(const kind of Object.keys(SCENERY_PROPS).filter(kind=>isHelicopter({kind})))for(const rotated of [false,true])for(const z of [0,2]){
  const map=mapFor(kind,rotated,z),p=map.props[0],rule=sceneryRule(p),model=createUtilityHelicopter(texture,{state:rule.state});
  try{const point=sceneryPoint(p,rule.origin);model.root.position.set(point.x,z*3,point.y);model.root.rotation.y=rotated?-Math.PI/2:0;model.root.updateMatrixWorld(true);
   const meshes=model.parts.filter(m=>m.userData.role!=='ground');for(const mesh of meshes){if(Array.isArray(mesh.material))mesh.material.forEach(m=>m.side=T.DoubleSide);else mesh.material.side=T.DoubleSide;}
   for(let n=0;n<55;n++){
    const o={x:20+rand()*20,y:20+rand()*20,h:z*3+.2+rand()*4},goal=sceneryPoint(p,[rand()*12,rand()*10,rand()*3]),v={x:goal.x-o.x,y:goal.y-o.y,h:goal.h-o.h},len=Math.hypot(v.x,v.y,v.h),d={x:v.x/len,y:v.y/len,h:v.h/len};
    const ray=new T.Raycaster(new T.Vector3(o.x,o.h,o.y),new T.Vector3(d.x,d.h,d.y),1e-7,30),a=ray.intersectObjects(meshes,false)[0],b=helicopterRayHit([p],o,d,30);
    assert.equal(!!b,!!a,kind+' geometry');if(a){assert.ok(Math.abs(a.distance-b.distance)<.001,kind+' distance');hits++;}else gaps++;
   }
  }finally{model.dispose();}
 }}finally{texture.dispose();}assert.ok(hits>80&&gaps>80);
});
test('live bullets, sight and grenade bounces respect the helicopter cabin',()=>{
 const map=mapFor(),s={...map,map:map.terrain,units:[]},p=map.props[0],o=sceneryPoint(p,[6.5,-2,1.3]),d={x:0,y:1,h:0};
 assert.equal(traceProjectile(s,null,o,d,15).propId,sceneryId(p));
 const observer={x:31,y:22,z:0,heading:90,cone:360};assert.equal(terrainVisibility(s,[observer]).has('31,30'),false);
 assert.equal(terrainVisibility({...s,props:[]},[observer]).has('31,30'),true);
 const hit=sweepGrenade(grenadeWorld(s),o,{...o,y:o.y+15},.09);assert.equal(hit?.propId,sceneryId(p));
});
test('the elevated crash preview starts four survivors facing southwest and remains saveable',()=>{
 const map=sceneryFixture();assert.deepEqual(validateMap(map),[]);
 const state=createGame(42,map,true,'easy',{statSystem:true});for(const unit of state.units.filter(u=>u.team==='squad')){assert.equal(unit.heading,135);assert.equal(unit.z,2);assert.ok(passable(map,unit));assert.ok(pathTo(state,unit,18,29,2).length);}
 startEncounterClock(state);const restored=restoreEncounter(captureEncounter(state));assert.equal(restored.props.find(isHelicopter).kind,'helicopter-crash-smoke');assert.ok(restored.units.filter(u=>u.team==='squad').every(u=>u.heading===135));
 const doc=new EditingDocument().open(JSON.stringify(map));assert.ok(doc.units.filter(u=>u.id.startsWith('start')).every(u=>u.heading===135));
 map.starts[0].heading=400;assert.ok(validateMap(map,{connectivity:false}).some(s=>s.includes('facing')));
});
test('editor and game scene owners preserve smoke location, fog visibility and resource lifetimes',async()=>{
 const textures=[],scene=new T.Scene(),owner=new SceneryScene(scene,{loadAsync:async()=>{const t=new T.Texture();t.disposals=0;t.addEventListener('dispose',()=>t.disposals++);textures.push(t);return t;}}),map={...mapFor(),difficulty:'easy'},camera=new T.PerspectiveCamera();
 try{
  owner.rebuild(map);await Promise.all(owner.pending.values());owner.rebuild(map);const item=[...owner.items.values()][0];assert.ok(item.smoke);owner.update(2,camera);const a=item.smoke.cards[0].position.clone();owner.update(3,camera);assert.notDeepEqual(item.smoke.cards[0].position.toArray(),a.toArray());owner.update(4,camera,{reducedMotion:true});const b=item.smoke.cards[0].position.clone();owner.update(5,camera,{reducedMotion:true});assert.deepEqual(item.smoke.cards[0].position.toArray(),b.toArray());
  const hidden=new Set(propCells(map.props[0]).map(q=>`${q.x},${q.y}`));owner.rebuild({...map,concealedInteriors:hidden});assert.equal(owner.items.size,0);assert.equal(owner.animated,false);
  owner.rebuild(map);assert.equal(owner.items.size,1);owner.rebuild({...map,props:[]});assert.equal(owner.items.size,0);
 }finally{owner.dispose();owner.dispose();}assert.ok(textures.every(t=>t.disposals===1));assert.equal(scene.children.length,0);
});
