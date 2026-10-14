import {generateEnvironments,localEnvironmentProfile} from '../dist/tactics/environment-regions.js';
import {blank} from '../dist/tactics/overmap-model.js';
import {biomePlans} from '../dist/tactics/biome-gameplay.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,passable,parseMap} from '../dist/tactics/core/maps.js';
import {createGame,zoneVisible,lineOfSight,perceive,refresh} from '../dist/tactics/core/engine.js';
import {traceProjectile} from '../dist/tactics/core/projectiles.js';
import {traceProjectile as legacyTrace} from '../dist/tactics/projectiles.js';
import {buildWorld,traceWorld} from '../dist/tactics/hybrid-world.js';
import {hybridWorld,synchronizeHybrid} from '../dist/tactics/hybrid-combat.js';
import {buildFoliageObstacles,synchronizeFoliage,foliageObstacles,traceFoliage,foliageSegment} from '../dist/tactics/foliage-obstacles.js';
import {foliageErrors,foliagePreset} from '../dist/tactics/foliage-data.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {extractBlock,placeBlock} from '../dist/tactics/core/blocks.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {terrainVisibility} from '../dist/tactics/core/visibility.js';

function screen(family='temperate',z=0,preset=family==='wetlands'?'wetland-v1':'thicket-v1'){
 const m=blankMap();m.foliage={};for(let y=8;y<=13;y++){if(z)m.upper[z-1][`10,${y}`]=`ground-biome-${family}`;else m.terrain[y][10]=`ground-biome-${family}`;m.foliage[`10,${y},${z}`]=[5,true,preset];}return m;
}
const ray=(s,h=1.2,y=10,purpose='shot')=>traceProjectile(s,null,{x:8,y,h},{x:1,y:0,h:0},4,{purpose});

test('review reproduction: generated trunk stops core/hybrid shots and sight; genuine adjacent gap stays open',()=>{
 const m=blankMap();m.foliage={};for(let y=25;y<60;y++)for(let x=25;x<60;x++)m.foliage[`${x},${y},0`]=[100,false];
 for(const manual of [false,true]){const map=structuredClone(m);if(manual){delete map.foliage;map.props.push({kind:'tree-broadleaf',x:46,y:30,z:0});}
  const s=createGame(1,map,false),world=buildWorld(map);assert.equal(passable(s,{x:46,y:30}),false);
  assert.equal(traceProjectile(s,null,{x:44,y:30,h:1.2},{x:1,y:0,h:0},4).kind,'cover');
  assert.equal(zoneVisible(s,{x:44,y:30},{x:48,y:30,hp:100},'torso'),false);
  assert.ok(traceWorld(world,[44,1.2,30],[48,1.2,30]));
  const hybrid={...s,geometryMode:'hybrid'};assert.ok(['cover','prop'].includes(legacyTrace(hybrid,null,{x:44,y:30,h:1.2},{x:1,y:0,h:0},4).kind));
  assert.ok(traceWorld(world,[44,1.2,30],[48,1.2,30],{filter:b=>b.blocksSight!==false}));
  assert.equal(traceProjectile(s,null,{x:44,y:29,h:1.2},{x:1,y:0,h:0},4).kind,'range');
  assert.equal(traceWorld(world,[44,1.2,29],[48,1.2,29]),null);
 }
});
for(const family of ['temperate','jungle','snow','dry','wetlands'])test(`${family}: low-density thicket hides every target zone and stance at close range, including seams`,()=>{
 const s=createGame(2,screen(family),false);s.units=[];
 const a={x:9,y:10,z:0,heading:0,cone:360,perception:100,stats:{perception:100},hp:100};
 for(const stance of ['standing','kneeling','prone'])for(const y of [10,10.5,11]){
  const b={x:11,y,z:0,hp:100,stance,moved:true};
  for(const zone of ['head','torso','legs','weapon'])assert.equal(zoneVisible(s,a,b,zone),false,`${stance}/${zone}/${y}`);
  assert.equal(lineOfSight(s,a,b),false);assert.equal(perceive(s,a,b),0);
 }
 assert.equal(zoneVisible(s,{...a,y:9},{x:11,y:12,hp:100},'head'),false,'diagonal cannot leak through tile corners');
 assert.equal(ray(s,2,10,'sight').kind,'cover');assert.equal(ray(s,2).kind,'range','leaf screen does not stop an elevated shot');
});
test('wetland thicket contains shot cover; a separate open bog keeps both water and islands sight-transparent',()=>{
 const m=screen('wetlands'),scene=buildFoliageObstacles(m),s=createGame(1,m,false),w=scene.wood[0];assert.ok(scene.wood.length>0);
 const c=w.center,start=[c[0]-2,c[1],c[2]],end=[c[0]+2,c[1],c[2]];
 assert.ok(traceFoliage(scene,start,end,'shot','world'));assert.ok(traceFoliage(scene,start,end,'sight','world'));
 assert.ok(traceWorld(buildWorld(m),start,end));
 const bog=createGame(1,screen('wetlands',0,'bog-v1'),false);assert.equal(passable(bog,{x:10,y:10}),false);assert.equal(ray(bog,1.2,10,'sight').kind,'range');assert.equal(ray(bog).kind,'range');
 const legacy=screen('wetlands');legacy.foliage['10,10,0']=[100,true];assert.equal(foliagePreset(legacy,10,10),'wetland-v1');
});
test('finite screens on ground, upper floors and ledges leave elevated rays clear',()=>{
 for(const z of [0,1,2]){const m=screen('snow',z),s=createGame(1,m,false),base=z*3;assert.equal(ray(s,base+1.4,10,'sight').kind,'cover');assert.equal(ray(s,base+4,10,'sight').kind,'range');
  const world=buildWorld(m),v=z*2.12;assert.ok(traceWorld(world,[8,v+1.4,10],[12,v+1.4,10],{filter:b=>b.blocksSight!==false}));assert.equal(traceWorld(world,[8,v+3.8,10],[12,v+3.8,10],{filter:b=>b.blocksSight!==false}),null);
 }
 const ledge=screen('jungle',1);for(let y=8;y<=13;y++)ledge.props.push({kind:'cliff-ledge',x:10,y,z:0,cliffMask:15});const d=buildFoliageObstacles(ledge);assert.equal(d.screens[0].base,2);assert.ok(traceFoliage(d,[8,3.8,10],[12,3.8,10],'sight'));assert.equal(traceFoliage(d,[8,6.0,10],[12,6.0,10],'sight'),null);
});
test('visibility updates after painting/erasing and does not confuse remembered terrain with spotted occupants',()=>{
 const s=createGame(1,screen(),false),a=s.units[0];Object.assign(a,{x:8,y:10,heading:0,cone:360});s.units=[a];s.seen=new Set(['12,10']);
 assert.equal(terrainVisibility(s,[a]).has('12,10'),false);const first=foliageObstacles(s);s.camera={azimuth:2};s.lod='far';assert.equal(synchronizeFoliage(s),first);
 s.foliage={};assert.equal(terrainVisibility(s,[a]).has('12,10'),true);assert.equal(ray(s,1.2,10,'sight').kind,'range');assert.ok(s.seen.has('12,10'));
 s.foliage={'10,10,0':[1,true,'thicket-v1']};refresh(s);assert.equal(ray(s,1.2,10,'sight').kind,'cover');assert.equal(s.visible.has('12,10'),false);
 s.geometryMode='hybrid';const h=hybridWorld(s);s.foliage={};synchronizeHybrid(s);assert.notEqual(hybridWorld(s),h);assert.equal(legacyTrace(s,null,{x:8,y:10,h:1.2},{x:1,y:0,h:0},4,{purpose:'sight'}).kind,'range');
});
test('presets validate and round-trip through editor undo, blocks, maps and encounter saves',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap())),command={tool:'foliage-cover',start:{x:10,y:10,z:0},end:{x:12,y:12,z:0},options:{foliageShape:'rectangle',foliageDensity:20,foliagePreset:'wetland-v1'}};
 assert.ok(d.apply(command).ok);const saved=d.export();assert.equal(foliagePreset(d.map,10,10),'wetland-v1');assert.ok(d.undo());assert.equal(d.map.foliage,undefined);assert.ok(d.redo());assert.equal(d.export(),saved);assert.deepEqual(parseMap(saved),d.map);
 const block=extractBlock(d.map),placed=placeBlock(blankMap(),block,2,2);assert.deepEqual(placed.foliage['58,58,0'],[20,true,'wetland-v1']);assert.ok(buildFoliageObstacles(placed).screens.some(s=>s.x===58&&s.y===58));
 const s=createGame(1,d.map,false);startEncounterClock(s);const loaded=restoreEncounter(captureEncounter(s));assert.deepEqual(buildFoliageObstacles(loaded).worldBoxes,buildFoliageObstacles(s).worldBoxes);
 for(const value of [[50,false,'thicket-v1'],[50,true,'unknown'],[50,true,'bog-v1',0]]){const bad=structuredClone(d.map);bad.foliage['10,10,0']=value;assert.ok(foliageErrors(bad).length);assert.throws(()=>parseMap(JSON.stringify(bad)),/foliage/);}
});

test('family, seed, origin, supporting height and scenery edits invalidate the shared obstacle cache',()=>{
 const m=blankMap();m.foliage={};for(let y=20;y<50;y++)for(let x=20;x<50;x++)m.foliage[`${x},${y},0`]=[100,false];
 m.environment=localEnvironmentProfile(generateEnvironments(blank(),42),100);
 let previous=synchronizeFoliage(m);const initial=previous.trees.map(t=>[t.x,t.y,t.id,t.variant]);
 m.environment.field.seed+=17;let next=synchronizeFoliage(m);assert.notEqual(next,previous);assert.notDeepEqual(next.trees.map(t=>[t.x,t.y,t.id,t.variant]),initial);previous=next;
 m.environment.origin[0]++;next=synchronizeFoliage(m);assert.notEqual(next,previous);assert.notDeepEqual(next.trees,previous.trees);
 const tree=next.trees[0];assert.ok(tree);m.terrain[tree.y][tree.x]='ground-biome-snow';next=synchronizeFoliage(m);assert.equal(next.trees.find(t=>t.x===tree.x&&t.y===tree.y).family,'snow');
 m.props.push({kind:'crate-wood',x:tree.x,y:tree.y,z:0});next=synchronizeFoliage(m);assert.equal(next.trees.some(t=>t.x===tree.x&&t.y===tree.y),false);
 const elevated=screen('jungle',1),old=synchronizeFoliage(elevated);elevated.props.push({kind:'cliff-ledge',x:10,y:10,z:0,cliffMask:15});const raised=synchronizeFoliage(elevated);assert.notEqual(raised,old);assert.equal(raised.screens.find(s=>s.y===10).base,2);
});
test('dense tree placement protects headroom, starts, doors and props; hidden replacement foliage has no collision',()=>{
 const m=blankMap();m.foliage={};for(let y=20;y<50;y++)for(let x=20;x<50;x++)m.foliage[`${x},${y},0`]=[100,true];
 const tree=buildFoliageObstacles(m).trees[0];assert.ok(tree);
 for(const change of [map=>map.starts.push({...tree}),map=>map.upper[0][`${tree.x},${tree.y}`]='floor',map=>map.edges[`e:${tree.x}:${tree.y}`]='door']){
  const copy=structuredClone(m);change(copy);assert.equal(buildFoliageObstacles(copy).trees.some(t=>t.x===tree.x&&t.y===tree.y),false);
 }
 m.props.push({kind:'crate-wood',x:tree.x,y:tree.y,z:0});const scene=synchronizeFoliage(m);assert.equal(scene.screens.some(s=>s.x===tree.x&&s.y===tree.y),false);assert.equal(biomePlans(m)[0].blockedAt(tree.x,tree.y),false);
});
test('an elevated head can be identified when its ray really clears the finite screen',()=>{
 const s=createGame(1,screen(),false),observer={x:9,y:10,z:1,hp:100},target={x:11,y:10,z:0,hp:100,cliffSupport:{level:0,height:2}};
 assert.equal(zoneVisible(s,observer,target,'head'),true);
 assert.equal(zoneVisible(s,observer,{...target,cliffSupport:undefined},'legs'),false);
});

test('indexed foliage rays agree with brute force across chunk boundaries in both directions',()=>{
 const m=blankMap();m.foliage={};for(let y=7;y<27;y++)for(let x=7;x<27;x++)if(x!==16)m.foliage[`${x},${y},0`]=[100,true];
 const scene=buildFoliageObstacles(m);let seed=9213;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<120;i++){
  const start=[random()*35,random()*4,random()*35],end=[random()*35,random()*4,random()*35],purpose=i%2?'sight':'shot';
  const ts=scene.worldBoxes.filter(b=>purpose==='sight'?b.blocksSight:b.blocksShot).map(b=>foliageSegment(start,end,b)).filter(t=>t!==null),want=ts.length?Math.min(...ts):null,actual=traceFoliage(scene,start,end,purpose,'world')?.t??null;
  if(want===null)assert.equal(actual,null);else assert.ok(Math.abs(actual-want)<1e-9);
 }
});
