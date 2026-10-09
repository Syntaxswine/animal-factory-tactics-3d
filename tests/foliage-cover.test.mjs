import {foliageAt} from '../dist/tactics/foliage-data.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,addStairs,passable,setTerrain,terrainAt} from '../dist/tactics/core/maps.js';
import {extractBlock,validateBlock,placeBlock} from '../dist/tactics/core/blocks.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {createGame,canSee,detectionChance,pathTo} from '../dist/tactics/core/engine.js';
import {woodlandDepth} from '../dist/tactics/core/woodland.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {materialKind} from '../dist/tactics/hybrid-materials.js';
import {paintFoliageMaterial} from '../dist/tactics/foliage-materials.js';
import {environmentGeometries} from '../dist/tactics/environment-geometry.js';
import {coverUndergrowth,grassTufts} from '../dist/tactics/foliage-models.js';
import {createCliffTiles} from '../dist/tactics/cliff-tiles.js';
const command=(tool,a={x:8,y:8,z:0},b={x:20,y:20,z:0})=>({tool,start:a,end:b});
test('large foliage strokes skip structural terrain, complete prop footprints and access tiles; one undo restores all',()=>{
 const map=blankMap();map.terrain[10][10]='water';map.terrain[10][11]='floor';map.terrain[10][12]='ground-concrete';map.terrain[10][13]='bridge';map.terrain[10][14]='ground-asphalt';map.terrain[10][15]='void';map.props=[{x:12,y:12,z:0,kind:'workbench-metal'}];addStairs(map,18,18,0,'ladder');
 const d=new EditingDocument().open(JSON.stringify(map)),before=d.export(),r=d.apply(command('foliage-cover'));assert.ok(r.ok,r.error);assert.equal(d.editor.undo.length,1);
 for(let x=10;x<=15;x++)assert.equal(d.map.terrain[10][x],map.terrain[10][x]);assert.equal(d.map.terrain[12][12],'yard');assert.equal(d.map.terrain[12][13],'yard');assert.equal(d.map.terrain[18][18],map.terrain[18][18]);assert.equal(d.map.terrain[9][9],'yard');assert.deepEqual(foliageAt(d.map,9,9),[100,false]);
 const painted=d.export();assert.ok(d.undo());assert.equal(d.export(),before);assert.ok(d.redo());assert.equal(d.export(),painted);assert.equal(new EditingDocument().open(painted).export(),painted);
 assert.ok(d.apply(command('clear-foliage')).ok);assert.equal(d.map.terrain[9][9],'yard');assert.equal(foliageAt(d.map,9,9),null);assert.equal(d.map.terrain[10][10],'water');assert.equal(d.map.terrain[12][12],'yard');
 assert.equal(d.apply(command('foliage-cover',{x:8,y:8,z:1},{x:20,y:20,z:1})).ok,false);
});
test('painted cover remains traversable while hiding distant people and reducing close detection',()=>{
 const map=blankMap();map.guards=[{x:22,y:10,species:'cow',weapon:'rifle',heading:180}];const d=new EditingDocument().open(JSON.stringify(map));
 const open=createGame(1,map,false),a=open.units[0],g=open.units[4];Object.assign(a,{x:10,y:10,heading:0});assert.ok(canSee(open,a,g));
 assert.ok(d.apply(command('foliage-cover',{x:12,y:9,z:0},{x:19,y:11,z:0})).ok);
 const s=createGame(1,JSON.parse(d.export()),false),u=s.units[0],v=s.units[4];Object.assign(u,{x:10,y:10,heading:0});assert.ok(Math.abs(woodlandDepth(s,u,v)-8)<1e-9);assert.equal(canSee(s,u,v),false);assert.ok(passable(s,{x:15,y:10,z:0}));assert.ok(pathTo(s,u,21,10));
 v.x=14;g.x=14;assert.ok(detectionChance(s,u,v)<detectionChance(open,a,g));
});
test('cover visuals are deterministic, painted darker and do not add collision volumes',()=>{
 const map={terrain:[['ground-grass','woodland','woodland']],props:[{x:2,y:0,z:0,kind:'crate-wood'}],edges:{},stairs:[]},world=buildWorld(map),before=JSON.stringify(world.boxes);
 const visuals=environmentVisuals(world,map),cover=visuals.filter(b=>b.kind==='foliage-cover');assert.equal(cover.length,2);assert.ok(cover.every(b=>b.source.x===1&&b.source.z===0));assert.deepEqual(environmentVisuals(world,map),visuals);assert.equal(JSON.stringify(world.boxes),before);
 const floor=world.boxes.find(b=>b.source.x===1);assert.equal(materialKind(floor),'cover-grass');
 const dark=new T.MeshStandardMaterial({map:new T.Texture()}),light=new T.MeshStandardMaterial({map:new T.Texture()}),atlas=new T.Texture();paintFoliageMaterial(dark,'cover-grass',atlas);paintFoliageMaterial(light,'grass',atlas);
 const luminance=c=>c.r*.2126+c.g*.7152+c.b*.0722;assert.ok(luminance(dark.color)<luminance(light.color)*.6);dark.dispose();light.dispose();atlas.dispose();
});

test('both foliage types paint supported levels 2 and 3, retain block/map identity, and clear with undo',()=>{
 const map=blankMap();for(const z of [1,2])for(let x=8;x<=12;x++)setTerrain(map,x,9,z,'ground-grass');
 const d=new EditingDocument().open(JSON.stringify(map));
 for(const z of [1,2])for(const [x,kind]of [[8,'undergrowth'],[9,'dense']]){
  const before=d.export(),r=d.apply({...command('foliage-cover',{x,y:9,z},{x,y:10,z}),options:{foliageKind:kind}});
  assert.ok(r.ok,r.error);assert.equal(r.cells.length,1,'void beside the ledge is never filled');assert.equal(terrainAt(d.map,x,9,z),'ground-grass');assert.deepEqual(foliageAt(d.map,x,9,z),[100,kind==='dense']);
  const after=d.export();d.undo();assert.equal(d.export(),before);d.redo();assert.equal(d.export(),after);
 }
 assert.equal(terrainAt(d.map,8,9,0),'yard');const loaded=new EditingDocument().open(d.export());assert.equal(loaded.export(),d.export());
 const block=extractBlock(d.map);validateBlock(block);const copy=placeBlock(blankMap(),block,1,1);
 for(const z of [1,2]){assert.deepEqual(foliageAt(copy,32,33,z),[100,false]);assert.deepEqual(foliageAt(copy,33,33,z),[100,true]);}
 const beforeClear=d.export();assert.ok(d.apply(command('clear-foliage',{x:8,y:9,z:2},{x:9,y:9,z:2})).ok);
 assert.equal(terrainAt(d.map,8,9,2),'ground-grass');assert.equal(terrainAt(d.map,9,9,2),'ground-grass');d.undo();assert.equal(d.export(),beforeClear);
});

test('dense fill blocks paths, skips characters and access, and survives encounter save/load',()=>{
 const map=blankMap();map.starts[0]={x:10,y:10};map.guards=[{x:14,y:10,species:'cow',weapon:'rifle'}];map.exits=[{x:15,y:10}];addStairs(map,16,10,0,'ladder');
 const d=new EditingDocument().open(JSON.stringify(map)),r=d.apply({...command('foliage-cover',{x:10,y:9,z:0},{x:17,y:11,z:0}),options:{foliageKind:'dense'}});assert.ok(r.ok,r.error);
 for(const x of [10,14,15,16])assert.equal(foliageAt(d.map,x,10,0),null);assert.equal(passable(d.map,{x:12,y:10,z:0}),false);
 assert.ok(d.apply(command('clear-foliage',{x:14,y:9,z:0},{x:16,y:9,z:0})).ok);
 const state=createGame(1,d.map,false);assert.equal(pathTo(state,state.units[0],12,10,0),null);assert.ok(woodlandDepth(state,{x:10,y:11},{x:17,y:11})>6);
 startEncounterClock(state);const loaded=restoreEncounter(captureEncounter(state));assert.equal(loaded.map[9][12],'yard');assert.deepEqual(foliageAt(loaded,12,9),[100,true]);assert.equal(passable(loaded,{x:12,y:9,z:0}),false);
});

test('plateau ledge caps keep foliage at their actual height without adding duplicate floor slabs',()=>{
 const map=blankMap();for(const z of [1,2]){setTerrain(map,10+z,10,z,'woodland-dense');map.props.push({x:10+z,y:10,z:z-1,kind:'cliff-ledge',cliffMask:15});}
 const world=buildWorld(map),visuals=environmentVisuals(world,map);
 for(const z of [1,2]){const parts=visuals.filter(b=>b.kind==='foliage-cover'&&b.source.z===z);assert.equal(parts.length,2);assert(!world.boxes.some(b=>b.kind==='floor'&&b.source.z===z&&b.source.x===10+z));for(const part of parts)assert(Math.abs(part.center[1]-part.size[1]/2-((z-1)*2.12+2-.04))<1e-9);}
});

test('bulk foliage varies silhouettes and paint while staying below a quarter of the previous triangle budget',()=>{
 const geometries=environmentGeometries(),shapes=new Set(),colors=new Set();
 try{for(const material of ['woodland','woodland-dense'])for(let x=0;x<10;x++)for(let y=0;y<10;y++){
  const box={id:`floor:${x},${y}`,source:{x,y,z:2},kind:'floor',material,center:[x,4.18,y],size:[1,.12,1]},parts=coverUndergrowth(box);
  assert.deepEqual(grassTufts(box),[]);assert.deepEqual(coverUndergrowth(box),parts);
  let triangles=0;for(const p of parts){shapes.add(p.shape);colors.add(p.material);assert.equal(materialKind(p),p.material,'every leaf tint uses its painted foliage material');const g=geometries[p.shape];triangles+=(g.index?.count??g.attributes.position.count)/3;}
  assert(triangles<=72,`foliage uses ${triangles} triangles; previous clumps and hidden tufts used 296`);
 }assert.equal(shapes.size,3);assert.equal(colors.size,3);}finally{for(const g of Object.values(geometries))g.dispose();}
});

test('in-map cliff caps share grass paint and world coordinates without owning the atlas',()=>{
 const atlas=new T.Texture(),part=createCliffTiles('ledge',[{x:0,z:0,mask:15,variant:0}],{grassTexture:atlas}),grass=new T.MeshStandardMaterial();paintFoliageMaterial(grass,'grass',atlas);
 assert.equal(part.original[1].map,atlas);assert.deepEqual(part.original[1].color,grass.color);
 const shader=()=>({vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader,uniforms:{}}),capShader=shader(),groundShader=shader();part.original[1].onBeforeCompile(capShader);grass.onBeforeCompile(groundShader);
 for(const s of [capShader,groundShader]){assert.match(s.vertexShader,/#ifdef USE_INSTANCING/);assert.match(s.vertexShader,/natureTransform=modelMatrix/);assert.match(s.fragmentShader,/vNaturePosition\*\.45/);}
 assert.match(capShader.fragmentShader,/sandCoverage/);let disposed=false;atlas.addEventListener('dispose',()=>disposed=true);part.dispose();grass.dispose();assert.equal(disposed,false);atlas.dispose();
});
