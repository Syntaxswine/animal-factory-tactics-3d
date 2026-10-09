import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {floorBreachFixture} from '../dist/tactics/floor-breach-fixture.js';
import {floorBreachMasks,damagedFloorVisuals} from '../dist/tactics/floor-breaches.js';
import {environmentGeometries,environmentGeometry} from '../dist/tactics/environment-geometry.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {materialKind,surfacePixels} from '../dist/tactics/hybrid-materials.js';
import {buildWorld,DIMENSIONS as D} from '../dist/tactics/hybrid-world.js';
import {blankMap,setTerrain,passable,validateMap} from '../dist/tactics/core/maps.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {BattleGrenades} from '../dist/tactics/battle-grenades.js';
const edges=s=>[...floorBreachMasks(s).values()].reduce((n,m)=>n+[1,2,4,8].filter(b=>b&m).length,0);

test('neighboring missing tiles form only the outer perimeter on either upper level',()=>{
 for(const level of [1,2])for(const material of ['concrete','wood','asphalt'])for(const layout of ['strip','block'])for(let size=0;size<=5;size++){
  const {state,removed}=floorBreachFixture({level,material,layout,size}),before=structuredClone(state),visuals=environmentVisuals(buildWorld(state),state);
  assert.equal(edges(state),size?(layout==='block'?4*size:2*size+2):0);
  assert.equal(removed.length,layout==='block'?size*size:size);
  for(const p of removed)assert.ok(!visuals.some(b=>b.id==='floor:'+p.x+','+p.y+','+p.z));
  assert.ok(visuals.filter(b=>b.floorBreach).every(b=>b.source.z===level));assert.deepEqual(state,before);
 }
});
test('separate holes merge, diagonal holes remain separate, and isolated survivors retain all four sides',()=>{
 const separate=floorBreachFixture({layout:'separated',size:2}).state;assert.equal(floorBreachMasks(separate).get('8,8,1'),10);
 delete separate.upper[0]['8,8'];assert.equal(floorBreachMasks(separate).has('8,8,1'),false);assert.equal(edges(separate),8);
 const island=floorBreachFixture({layout:'island',size:1}).state;assert.equal(floorBreachMasks(island).get('8,8,1'),15);
 const diagonal=floorBreachFixture({size:0}).state;delete diagonal.upper[0]['7,7'];delete diagonal.upper[0]['8,8'];assert.equal(edges(diagonal),8);assert.equal(floorBreachMasks(diagonal).get('8,7,1'),12);
 const elbow=floorBreachFixture({layout:'elbow',size:3}).state;assert.equal(edges(elbow),12);
 let previous=0;for(let size=1;size<=5;size++){const f=floorBreachFixture({layout:'island',size});assert.ok(f.removed.length>previous);previous=f.removed.length;assert.ok(passable(f.state,f.worker));}
});
test('authored voids, stairs, cliffs, roof modules, canopy levels and ground erasures never invent slab damage',()=>{
 const {state}=floorBreachFixture({size:0});assert.equal(edges(state),0);delete state.definition;delete state.upper[0]['7,7'];assert.equal(edges(state),0);
 for(const kind of ['stairs','cliff','roof']){
  const {state:s}=floorBreachFixture({size:0});
  if(kind==='stairs')s.definition.stairs=[{x:7,y:7,z:0,kind:'stairs'}];
  if(kind==='cliff')s.definition.props=[{x:7,y:7,z:0,kind:'cliff-ledge'}];
  if(kind==='roof')s.definition.props=[{x:7,y:7,z:1,kind:'roof-corrugated-flat'}];
  delete s.upper[0]['7,7'];assert.equal(edges(s),0,kind+' original omitted slab');
 }
 const s=floorBreachFixture({size:0}).state;s.upper.push({'7,7':'floor','8,7':'floor'});s.definition.upper.push({'7,7':'floor','8,7':'floor'});delete s.upper[2]['7,7'];s.map[7][7]='void';assert.equal(edges(s),0);
 s.upper[0]['7,7']='void';assert.equal(edges(s),4);s.definition.upper[0]['7,7']='void';assert.equal(edges(s),0);
});
test('retained floor paints and physical transforms are unchanged while rims use vertex color',()=>{
 const {state}=floorBreachFixture({size:1});const world=buildWorld(state);
 for(const material of ['floor','ground-wood-planks','bridge','ground-concrete','ground-grass','woodland','road-diagonal-grass-ne']){
  const b={...world.boxes.find(b=>b.id==='floor:6,5,1'),material},v=damagedFloorVisuals([b],state)[0];
  assert.ok(v.floorBreach);assert.equal(v.material,'breach-'+materialKind(b));assert.deepEqual(v.center,b.center);assert.deepEqual(v.size,b.size);assert.equal(v.kind,'floor');
  if(!/grass|woodland|road/.test(material))assert.deepEqual(surfacePixels(v.material),surfacePixels(materialKind(b)));
 }
});
test('all 135 floor meshes are closed, outward, bounded, deterministic and shared',()=>{
 const cache=environmentGeometries();try{
  for(const family of ['concrete','wood','metal'])for(let mask=1;mask<=15;mask++)for(let seed=0;seed<3;seed++){
   const name='floor-breach-'+family+'-'+mask+'-'+seed,g=environmentGeometry(cache,name),p=g.attributes.position,edges=new Map();let volume=0;
   assert.equal(g,environmentGeometry(cache,name));assert.equal(p.count,g.attributes.color.count);
   for(let i=0;i<p.count;i+=3){
    const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j));assert.ok(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).length()>1e-9,name);
    volume+=v[0].dot(v[1].clone().cross(v[2]))/6;
    const keys=v.map(q=>q.toArray().map(n=>Math.round(n*1e6)).join(','));for(let j=0;j<3;j++){const e=[keys[j],keys[(j+1)%3]].sort().join('|');edges.set(e,(edges.get(e)||0)+1);}
   }
   assert.ok([...edges.values()].every(n=>n===2),name+' closed');assert.ok(volume>.5&&volume<1.001,name+' outward');
   for(const n of p.array)assert.ok(Number.isFinite(n)&&n>=-.500001&&n<=.500001,name+' footprint');
   for(const n of g.attributes.normal.array)assert.ok(Number.isFinite(n),name+' normals');
  }
  assert.equal(Object.keys(cache).filter(k=>k.startsWith('floor-breach-')).length,135);
 }finally{Object.values(cache).forEach(g=>g.dispose());}
});
test('rendered holes pass upward and downward rays while remaining slabs block at prototype height and thickness',()=>{
 const cache=environmentGeometries(),material=new T.MeshBasicMaterial();try{
  for(const level of [1,2])for(const layout of ['block','elbow','separated','island']){
   const {state,removed}=floorBreachFixture({level,layout,size:2}),meshes=environmentVisuals(buildWorld(state),state).filter(b=>b.kind==='floor'&&b.source.z===level).map(b=>{const m=new T.Mesh(environmentGeometry(cache,b.shape),material);m.position.fromArray(b.center);m.scale.fromArray(b.size);m.updateMatrixWorld();return m;});
   const ray=(p,up)=>new T.Raycaster(new T.Vector3(p.x,level*D.floorSpacing+(up?-.3:.3),p.y),new T.Vector3(0,up?1:-1,0),0,.6).intersectObjects(meshes);
   for(const p of removed){assert.equal(ray(p,true).length,0);assert.equal(ray(p,false).length,0);assert.equal(passable(state,p),false);}
   assert.ok(Math.abs(ray({x:5,y:8},false)[0].point.y-level*D.floorSpacing)<1e-6);
   assert.ok(Math.abs(ray({x:5,y:8},true)[0].point.y-(level*D.floorSpacing-D.slab))<1e-6);
  }
 }finally{material.dispose();Object.values(cache).forEach(g=>g.dispose());}
});
test('missing structural tiles survive encounter save/load and grenade presentation can rewind them',()=>{
 const definition=blankMap('Floor damage test');for(let y=10;y<=18;y++)for(let x=10;x<=18;x++)definition.upper[0][x+','+y]='floor';
 assert.deepEqual(validateMap(definition),[]);const state=createGame(7,definition,true,'easy');startEncounterClock(state);
 setTerrain(state,14,14,1,'void');setTerrain(state,15,14,1,'void');assert.equal(edges(state),6);
 const loaded=restoreEncounter(captureEncounter(state));assert.deepEqual(floorBreachMasks(loaded),floorBreachMasks(state));
 const b=new BattleGrenades(new T.Scene());try{
  const shot={event:{grenade:{scenery:{edges:{},props:[],tiles:[{x:14,y:14,z:1,kind:'floor'},{x:15,y:14,z:1,kind:'floor'}]}}},phase:{discharged:false}};
  assert.equal(edges(b.scenery(state,{active:shot,queue:[]})),0);shot.phase.discharged=true;assert.equal(edges(b.scenery(state,{active:shot,queue:[]})),6);
 }finally{b.dispose();}
});
