import test from 'node:test';
import assert from 'node:assert/strict';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,parseMap,passable,validateMap,setTerrain} from '../dist/tactics/core/maps.js';
import {blockCanvas,extractBlock,validateBlock} from '../dist/tactics/core/blocks.js';
import {traceProjectile} from '../dist/tactics/core/projectiles.js';
import {cliffRayHit,cliffSurfaceAt} from '../dist/tactics/cliff-map-geometry.js';
import {cliffMapErrors} from '../dist/tactics/cliff-map.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {cliffTileGeometry} from '../dist/tactics/cliff-tiles.js';
import {hideUnknownCliffTriangles} from '../dist/tactics/cliff-map-scene.js';
import {createGame,visibleZones} from '../dist/tactics/core/engine.js';
import {illuminationAt} from '../dist/tactics/awareness.js';
const paint=(d,options={},start={x:10,y:10,z:0},end=start)=>d.apply({tool:'cliff',start,end,options});
test('cliffs paint atomically, save in maps and blocks, and retain undo/redo',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap('Cliffs'))),before=d.export();
 assert.equal(paint(d,{cliffSand:.5,cliffVariant:2},{x:10,y:10,z:0},{x:12,y:11,z:0}).ok,true);
 assert.equal(d.map.props.length,6);assert.equal(passable(d.map,{x:10,y:10,z:0}),false);
 const saved=d.export(),loaded=parseMap(saved);assert.equal(loaded.props[0].cliffSand,.5);
 assert.equal(loaded.climbs.length,0);assert.equal(d.undo(),true);assert.equal(d.export(),before);d.redo();assert.equal(d.export(),saved);
 const block=validateBlock(d.capture(0,0)),other=new EditingDocument().open(JSON.stringify(blankMap()));other.place(block,2,2);
 assert.equal(other.map.props[0].x,58);assert.equal(other.map.props[0].cliffVariant,2);
 const b=new EditingDocument().open(JSON.stringify(extractBlock(blockCanvas())));assert.equal(paint(b).ok,true);assert.equal(validateBlock(JSON.parse(b.export())).props[0].kind,'cliff-ledge');
 assert.equal(d.apply({tool:'erase-cliff',start:{x:10,y:10,z:0},end:{x:12,y:11,z:0}}).ok,true);assert.equal(d.map.props.length,0);d.undo();assert.equal(d.export(),saved);
});
test('invalid cliff edits reject without changing other props, starts or shared corners',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap()));assert.equal(paint(d).ok,true);const before=d.export();
 assert.equal(paint(d,{cliffMask:1},{x:11,y:10,z:0}).ok,false);assert.equal(d.export(),before);
 assert.equal(paint(d,{cliffMask:16}).ok,false);assert.equal(d.export(),before);
 assert.equal(paint(d,{},d.map.starts[0]).ok,false);assert.equal(d.export(),before);
 assert.equal(d.rotate({type:'prop',data:d.map.props[0]}).ok,false);
 assert.ok(cliffMapErrors({props:Array.from({length:513},(_,x)=>({kind:'cliff-ledge',x,y:0}))})[0].includes('512'));
});
test('water accepts cliffs without authorizing walking or ordinary props on water',()=>{
 const map=blankMap();map.terrain[10][10]='water';const d=new EditingDocument().open(JSON.stringify(map));
 assert.equal(paint(d,{cliffKind:'cliff-crag',cliffSand:1}).ok,true);assert.equal(passable(d.map,{x:10,y:10,z:0}),false);
 assert.deepEqual(validateMap(d.map,{connectivity:false}),[]);
 const world=buildWorld(d.map);assert.deepEqual(world.diagnostics,[]);assert.equal(world.boxes.some(b=>b.source.prop?.includes('cliff')),false);
});
test('shots hit welded rock geometry, pass above it and through empty contour corners',()=>{
 const s=blankMap(),shooter={x:8,y:10,z:0,hp:100};s.units=[shooter,{id:'behind',x:13,y:10,z:0,hp:100}];s.props=[{kind:'cliff-ledge',x:10,y:10,z:0}];
 const hit=traceProjectile(s,shooter,{x:8,y:10,h:1.3},{x:1,y:0,h:0},8);assert.equal(hit.kind,'cover');assert.equal(hit.x,9.5);
 assert.equal(cliffRayHit(s.props,{x:8,y:10,h:2.1},{x:1,y:0,h:0},8),null);
 assert.equal(cliffSurfaceAt(s.props,10,10).height,2);
 s.props[0].cliffMask=1;
 assert.equal(cliffRayHit(s.props,{x:8,y:10.45,h:1.3},{x:1,y:0,h:0},8),null);
 assert.equal(cliffSurfaceAt(s.props,10.45,10.45),null);
 s.props[0].cliffMask=15;s.props[0].z=1;setTerrain(s,10,10,1,'floor');
 assert.equal(cliffSurfaceAt(s.props,10,10,1).height,5);assert.equal(cliffRayHit(s.props,{x:8,y:10,h:1.3},{x:1,y:0,h:0},8),null);
});
test('fog hides unknown triangles without changing mixed-family heights or seams',()=>{
 const g=cliffTileGeometry('mixed',[{x:10,z:10,mask:15,variant:0,set:'ledge'},{x:11,z:10,mask:15,variant:1,set:'crag'}]);
 const before=Array.from(g.attributes.position.array),total=g.attributes.position.count;
 hideUnknownCliffTriangles(g,(x,y)=>x===10&&y===10);
 assert.ok(g.index.count>0&&g.index.count<total);assert.deepEqual(Array.from(g.attributes.position.array),before);
 for(let i=0;i<g.index.count;i+=3){const xs=[0,1,2].map(j=>g.attributes.position.getX(g.index.getX(i+j)));assert.ok(xs.reduce((a,b)=>a+b)/3<=11+1e-6);}
 g.dispose();
});
test('cliffs occlude observed bodies and artificial light in the 3D rules',()=>{
 const map=blankMap();map.time={startMinutes:1260};const s=createGame(1,map,false,'easy',{awareness:true}),a=s.units[0],b=s.units[1];
 Object.assign(a,{x:8,y:10,heading:0});Object.assign(b,{x:12,y:10});
 s.props=[{kind:'floor-lamp',x:12,y:10,z:0,lightMode:'on'}];
 assert.ok(visibleZones(s,a,b).length);assert.ok(illuminationAt(s,a)>.12);
 s.props.push({kind:'cliff-ledge',x:10,y:10,z:0});
 assert.equal(visibleZones(s,a,b).length,0);assert.equal(illuminationAt(s,a),.12);
});
