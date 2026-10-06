import test from 'node:test';
import assert from 'node:assert/strict';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,terrainAt,setTerrain,passable,neighbors,validateMap,parseMap,MAX_MAP_BYTES} from '../dist/tactics/core/maps.js';
import {extractBlock,placeBlock,validateBlock} from '../dist/tactics/core/blocks.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {landBrushCells} from '../dist/tactics/land-paint.js';

const point=(x,y,z=0)=>({x,y,z});
const fresh=()=>new EditingDocument().open(JSON.stringify(blankMap('Painted land')));
const command=(x=35,y=35,options={})=>({tool:'land',start:point(x,y),options:{landSize:9,landShape:'square',landHeight:1,groundKind:'ground-grass',...options}});
const apply=(d,c)=>{const r=d.apply(c);assert(r.ok,r.error);return r;};
const cliff=(m,x,y,z=0)=>m.props.find(p=>p.kind==='cliff-ledge'&&p.x===x&&p.y===y&&(p.z||0)===z);

test('large round and square brushes interpolate a freehand path without filling its bounding rectangle',()=>{
 const a=landBrushCells(point(20,20),point(20,20),{landSize:9,landShape:'square'}),b=landBrushCells(point(20,20),point(20,20),{landSize:9,landShape:'round'});
 assert.equal(a.length,81);assert(b.length>40&&b.length<81);
 const path=[point(20,20),point(30,20),point(30,30)],cells=landBrushCells(path[0],path[2],{landSize:1},240,path);
 assert.equal(cells.length,21);assert(cells.some(p=>p.x===25&&p.y===20));assert(!cells.some(p=>p.x===25&&p.y===25));
 assert.equal(landBrushCells(point(0,0),point(0,0),{landSize:9,landShape:'square'},24).length,25);
 assert.throws(()=>landBrushCells(point(20,20),point(20,20),{landSize:64}));
 assert.throws(()=>landBrushCells(point(-1,20)));assert.throws(()=>landBrushCells(point(20,20),point(20,20),{landShape:'invalid'}));
});

test('paint creates a closed rim and walkable top, with no implicit climb routes',()=>{
 const d=fresh();apply(d,command());assert.equal(Object.keys(d.map.landPaint).length,81);assert.equal(d.map.props.length,32);
 assert.equal(terrainAt(d.map,35,35,0),'void');assert.equal(terrainAt(d.map,35,35,1),'ground-grass');
 for(let y=31;y<=39;y++)for(let x=31;x<=39;x++){
  assert(passable(d.map,point(x,y,1)));assert(!passable(d.map,point(x,y,0)));
  for(const p of neighbors(d.map,point(x,y,1)))assert.equal(p.z,1);
 }
 assert.deepEqual(d.map.climbs,[]);assert.deepEqual(d.map.stairs,[]);assert.deepEqual(validateMap(d.map),[]);
 for(const p of [point(30,35),point(40,35),point(35,30),point(35,40)])assert(neighbors(d.map,p).every(q=>q.z===0));
});

test('overlapping strokes reflow the old rim; a second plateau and lowering keep both tiers closed',()=>{
 const d=fresh();apply(d,command());assert(cliff(d.map,39,35));apply(d,command(40,35));assert(!cliff(d.map,39,35));assert.equal(terrainAt(d.map,39,35,0),'void');
 apply(d,command(35,35,{landSize:3,landHeight:2}));assert.equal(terrainAt(d.map,35,35,2),'ground-grass');assert.equal(terrainAt(d.map,35,35,1),'void');assert(cliff(d.map,34,35,1));
 apply(d,command(35,35,{landSize:3,landHeight:1}));assert.equal(terrainAt(d.map,35,35,2),'void');assert(!d.map.props.some(p=>p.z===1));
 apply(d,command(35,35,{landSize:1,landHeight:0}));assert(!d.map.landPaint['35,35']);assert(passable(d.map,point(35,35)));for(const [x,y]of [[34,35],[36,35],[35,34],[35,36]])assert(cliff(d.map,x,y));assert.deepEqual(validateMap(d.map),[]);
});

test('a complete drag previews without mutation and is one undoable edit',()=>{
 const d=fresh(),before=d.export(),c={...command(35,35,{landSize:5,landShape:'round'}),path:[point(35,35),point(45,35),point(45,45)]},r=d.preview(c);
 assert(r.ok,r.error);assert.equal(d.export(),before);apply(d,c);const after=d.export();assert.equal(d.editor.undo.length,1);assert(d.undo());assert.equal(d.export(),before);assert(d.redo());assert.equal(d.export(),after);
});

test('manual climb points keep their 8 AP route, survive nearby edits and cannot be buried or removed',()=>{
 const d=fresh();apply(d,command());apply(d,{tool:'cliff-climb',start:{...point(30,35),edge:'e:30:35'}});
 assert(neighbors(d.map,point(30,35)).some(p=>p.x===31&&p.y===35&&p.z===1&&p.kind==='cliff'&&p.cost===8));
 const link=structuredClone(d.map.climbs);apply(d,command(39,35));assert.deepEqual(d.map.climbs,link);
 for(const c of [command(30,35,{landSize:1}),command(31,35,{landSize:1,landHeight:0})]){const before=d.export(),r=d.apply(c);assert.equal(r.ok,false);assert.equal(d.export(),before);}
});

test('manual ramps connect to painted walls and later strokes protect their approaches and support',()=>{
 const d=fresh();apply(d,command());apply(d,{tool:'ramp',start:{...point(31,34),edge:'e:30:34'},end:point(31,36),options:{rampSurface:'road'}});
 const ramps=d.map.props.filter(p=>p.kind.startsWith('ramp-'));assert.equal(ramps.length,3);assert.equal(ramps[0].kind,'ramp-road-east');
 apply(d,command(39,35));assert.deepEqual(d.map.props.filter(p=>p.kind.startsWith('ramp-')),ramps);
 for(const c of [command(30,35,{landSize:1}),command(31,35,{landSize:1,landHeight:0})]){const before=d.export(),r=d.apply(c);assert.equal(r.ok,false);assert.equal(d.export(),before);}
 assert.deepEqual(validateMap(d.map),[]);
});

test('raising cannot bury characters, objects or walls, or adopt an existing building floor',()=>{
 for(const prepare of [d=>command(3,4,{landSize:1}),d=>{d.map.props.push({kind:'barrel-single',x:35,y:35,z:0});return command();},d=>{d.map.edges['e:35:35']='wall';return command();},d=>{setTerrain(d.map,35,35,1,'floor');return command();}]){
  const d=fresh(),c=prepare(d),before=d.export(),r=d.apply(c);assert.equal(r.ok,false);assert.equal(d.export(),before);
 }
 const d=fresh();apply(d,command());d.map.edges['e:35:35:1']='wall';const before=d.export();assert.equal(d.apply(command(35,35,{landHeight:0})).ok,false);assert.equal(d.export(),before);
});

test('neighbor repaint preserves custom surfaces and unrelated upper construction',()=>{
 const d=fresh();apply(d,command());setTerrain(d.map,39,35,1,'ground-wood-planks');setTerrain(d.map,39,35,2,'floor');
 apply(d,command(40,35,{landSize:1}));assert.equal(terrainAt(d.map,39,35,1),'ground-wood-planks');assert.equal(terrainAt(d.map,39,35,2),'floor');
 assert.equal(d.apply(command(39,35,{landSize:1,landHeight:2})).ok,false);
 for(const tool of ['erase-cliff','erase-prop','erase-tile'])assert.equal(d.apply({tool,start:point(31,35)}).ok,false);
});

test('save/reload, portable JSON and live playtest retain the baked terrain and future editability',()=>{
 const d=fresh();apply(d,command());const saved=d.export(),parsed=parseMap(saved),copy=new EditingDocument().open(saved);
 assert.deepEqual(parsed.landPaint,d.map.landPaint);assert.deepEqual(copy.map.props,d.map.props);
 const game=createGame(42,parsed,false);assert.deepEqual(game.definition.landPaint,d.map.landPaint);assert.equal(terrainAt(game,35,35,1),'ground-grass');assert(!passable(game,point(35,35)));
 apply(copy,command(40,35));assert(!cliff(copy.map,39,35));
});

test('reusable blocks and their copies remap ownership; replacing them removes stale ownership',()=>{
 const d=fresh();apply(d,command(12,12,{landSize:7}));const block=d.capture(0,0);validateBlock(block);
 const b=new EditingDocument().open(JSON.stringify(block));assert.equal(b.size,24);apply(b,command(16,12,{landSize:3}));
 const map=placeBlock(placeBlock(blankMap('Copies'),block,1,1),block,3,3);
 assert(map.landPaint['36,36']);assert(map.landPaint['84,84']);assert(!map.landPaint['12,12']);assert.deepEqual(validateMap(map),[]);
 const copy=new EditingDocument().open(JSON.stringify(map));apply(copy,command(39,36,{landSize:3}));assert(!cliff(copy.map,39,36));assert(cliff(copy.map,87,84));
 const empty=extractBlock(blankMap());const cleared=placeBlock(copy.map,empty,1,1);assert(!cleared.landPaint['36,36']);assert(cleared.landPaint['84,84']);assert.deepEqual(validateMap(cleared),[]);
});

test('import rejects malformed ownership and block coordinates without affecting legacy maps',()=>{
 const map=blankMap();assert.deepEqual(validateMap(map),[]);
 for(const land of [[],{'10,10':[3,'yard']},{'240,10':[1,'yard']},{'10,10':[1,'arbitrary-terrain']},{'1e1,10':[1,'yard']}])assert.throws(()=>parseMap(JSON.stringify({...map,landPaint:land})),/land/);
 const d=fresh();apply(d,command(12,12,{landSize:3}));const block=d.capture(0,0);block.landPaint['24,0']=[1,'yard'];assert.throws(()=>validateBlock(block),/land/);
 const bad=structuredClone(d.map);delete bad.landPaint;assert(validateMap(bad).some(e=>e.includes('footprint')));
});

test('large brush strokes enforce the cliff budget atomically and clip at the map boundary',()=>{
 const d=fresh();apply(d,command(50,50,{landSize:63,landHeight:2}));apply(d,command(130,50,{landSize:63,landHeight:2}));
 const before=d.export(),r=d.apply(command(50,130,{landSize:63,landHeight:2}));assert.equal(r.ok,false);assert.match(r.error,/1024/);assert.equal(d.export(),before);
 const small=fresh();apply(small,command(239,239));assert(cliff(small.map,239,239));assert.deepEqual(validateMap(small.map),[]);
 // Near-limit authored maps must not become impossible to re-import after a brush stroke.
 const large=fresh();large.map.notes='x'.repeat(MAX_MAP_BYTES-large.export().length-160);const saved=large.export();assert(saved.length<MAX_MAP_BYTES);
 const result=large.apply(command());assert.equal(result.ok,false);assert.match(result.error,/4 MB/);assert.equal(large.export(),saved);
});
