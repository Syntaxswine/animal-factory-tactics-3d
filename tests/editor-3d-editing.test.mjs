import test from 'node:test';
import assert from 'node:assert/strict';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,parseMap} from '../dist/tactics/core/maps.js';
import {createEditor,applyBrush} from '../dist/tactics/core/editor-model.js';
import {receivePlaytest} from '../dist/tactics/editor-playtest.js';
import {blockCanvas,extractBlock,validateBlock,placeBlock} from '../dist/tactics/core/blocks.js';
import {generateConnectedMap} from '../dist/tactics/editor-3d-generator.js';
import {generateConnectedMap as originalGenerator} from '../dist/tactics/block-generator.js';
import {emptyFeaturePlan} from '../dist/tactics/core/feature-plan.js';

// Independently executed edits mint different UUIDs; compare all other saved fields.
const withoutIds=m=>{const c=structuredClone(m);for(const p of [...(c.starts||[]),...(c.guards||[])])if(p.character)delete p.character.id;return c;};

test('editable blocks preserve their portable format and reject cross-boundary edits atomically',()=>{
 const raw={...extractBlock(blockCanvas('Reusable')),authorNote:'Keep this'},d=new EditingDocument().open(JSON.stringify(raw));
 const initial=d.export();assert.equal(d.apply({tool:'prop',start:{x:23,y:8,z:0},options:{propKind:'workbench-metal'}}).ok,false);assert.equal(d.export(),initial);
 assert.equal(d.apply({tool:'squad',start:{x:3,y:3,z:0},options:{slot:0}}).ok,false);
 assert.ok(d.apply({tool:'room',start:{x:4,y:4,z:0},options:{width:6,height:5}}).ok);
 assert.ok(d.apply({tool:'guard',start:{x:6,y:6,z:0},options:{species:'goat',weapon:'rifle',outfit:'red-hats'}}).ok);
 const portable=validateBlock(JSON.parse(d.export()));assert.equal(portable.guards[0].outfit,'red-hats');assert.equal(portable.authorNote,'Keep this');assert.equal(portable.terrain.length,24);assert.equal(d.map.starts.length,0);
 assert.ok(d.undo());assert.equal(d.map.guards.length,0);assert.ok(d.redo());assert.equal(d.export(),JSON.stringify(portable,null,2));
 const map=new EditingDocument().open(JSON.stringify(blankMap('Assembly'))),before=map.export();
 map.place(portable,2,3);assert.deepEqual(withoutIds(map.map),withoutIds(placeBlock(JSON.parse(before),portable,2,3)));assert.equal(map.map.guards[0].x,54);assert.equal(map.capture(2,3).guards[0].outfit,'red-hats');map.undo();assert.equal(map.export(),before);
});

test('connections and connected generation match the existing generator and retain undo',()=>{
 const d=new EditingDocument().open(JSON.stringify(extractBlock(blockCanvas('Empty')))),types={north:'none',east:'none',south:'none',west:'none'};
 d.connections(types);const block=JSON.parse(d.export());assert.deepEqual(block.connections,types);d.undo();assert.equal(JSON.parse(d.export()).connections,undefined);d.redo();
 const before=d.export();assert.throws(()=>d.connections({...types,north:'road'}));assert.equal(d.export(),before);
 const plan=emptyFeaturePlan(),generated=generateConnectedMap([block],7,plan);assert.deepEqual(generated,originalGenerator([block],7,plan));assert.equal(Object.keys(generated.blockConnections).length,100);assert.ok(parseMap(JSON.stringify(generated)));
 const map=new EditingDocument().open(JSON.stringify(blankMap('Original'))),original=map.export();map.replace(generated);assert.equal(map.editor.undo.length,1);map.undo();assert.equal(map.export(),original);
 assert.throws(()=>generateConnectedMap([],7));assert.throws(()=>generateConnectedMap([block],-1));plan.rows[2]='road';assert.throws(()=>generateConnectedMap([block],7,plan),/Missing blocks/);
});
test('3D edit commands match existing editor operations; previews and rejection never mutate',()=>{
 const raw=blankMap('Tutorial'),d=new EditingDocument().open(JSON.stringify(raw)),core=createEditor(raw);
 const room={tool:'room',start:{x:6,y:6,z:0},options:{width:6,height:5}};
 const saved=d.export();assert.equal(d.preview(room).ok,true);assert.equal(d.export(),saved);assert.equal(d.editor.undo.length,0);
 assert.ok(d.apply(room).ok);applyBrush(core,'room',6,6,undefined,room.options);assert.deepEqual(withoutIds(d.map),withoutIds(core.map));
 const guard={tool:'guard',start:{x:8,y:8,z:0},options:{species:'goat',weapon:'rifle',heading:90}};assert.ok(d.apply(guard).ok);applyBrush(core,'guard',8,8,undefined,guard.options);assert.deepEqual(withoutIds(d.map),withoutIds(core.map));
 const before=d.export();assert.equal(d.apply({tool:'prop',start:guard.start,options:{propKind:'crate-stack'}}).ok,false);assert.equal(d.export(),before);
 assert.ok(d.undo());assert.equal(d.map.guards.length,0);assert.ok(d.redo());assert.equal(d.export(),before);assert.deepEqual(d.validate(),[]);assert.equal(parseMap(d.export()).guards.length,1);
});
test('rectangle and wall gestures are single undo operations, rejected strokes are atomic',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap('Strokes'))),before=d.export();
 assert.ok(d.apply({tool:'floor',start:{x:8,y:8,z:1},end:{x:10,y:10,z:1}}).ok);assert.equal(Object.keys(d.map.upper[0]).length,9);assert.equal(d.editor.undo.length,1);d.undo();assert.equal(d.export(),before);
 assert.ok(d.apply({tool:'wall',start:{x:8,y:8,z:0,edge:'e:8:8'},end:{x:12,y:10,z:0,edge:'e:12:10'},options:{edgeKind:'wall-brick'}}).ok);assert.deepEqual(Object.keys(d.map.edges),['e:8:8','e:8:9','e:8:10']);
 const saved=d.export();assert.equal(d.apply({tool:'water',start:{x:0,y:0,z:0},end:{x:5,y:7,z:0}}).ok,false);assert.equal(d.export(),saved);
});
test('playtest accepts only the matching opener, origin and token; invalid snapshots fail',async()=>{
 const listeners=new Set(),opener={postMessage(){}},host={opener,location:{origin:'https://example.test'},addEventListener:(k,f)=>listeners.add(f),removeEventListener:(k,f)=>listeners.delete(f)};
 const emit=e=>{for(const f of listeners)f(e);},json=JSON.stringify(blankMap('Exact snapshot'));
 const promise=receivePlaytest('nonce',{host,timeout:1000}),message={source:opener,origin:host.location.origin,data:{type:'aft-editor-map',token:'nonce',json}};
 emit({...message,source:{}});emit({...message,origin:'https://wrong.test'});emit({...message,data:{...message.data,token:'wrong'}});assert.equal(listeners.size,1);emit(message);assert.equal((await promise).name,'Exact snapshot');assert.equal(listeners.size,0);
 const invalid=receivePlaytest('nonce',{host,timeout:1000});emit({...message,data:{...message.data,json:'{}'}});await assert.rejects(invalid,/rejected/);assert.equal(listeners.size,0);
});
