import test from 'node:test';
import assert from 'node:assert/strict';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {blankMap,parseMap} from '../dist/tactics/core/maps.js';
import {createEditor,applyBrush} from '../dist/tactics/core/editor-model.js';
import {receivePlaytest} from '../dist/tactics/editor-playtest.js';
test('3D edit commands match existing editor operations; previews and rejection never mutate',()=>{
 const raw=blankMap('Tutorial'),d=new EditingDocument().open(JSON.stringify(raw)),core=createEditor(raw);
 const room={tool:'room',start:{x:6,y:6,z:0},options:{width:6,height:5}};
 const saved=d.export();assert.equal(d.preview(room).ok,true);assert.equal(d.export(),saved);assert.equal(d.editor.undo.length,0);
 assert.ok(d.apply(room).ok);applyBrush(core,'room',6,6,undefined,room.options);assert.deepEqual(d.map,core.map);
 const guard={tool:'guard',start:{x:8,y:8,z:0},options:{species:'goat',weapon:'rifle',heading:90}};assert.ok(d.apply(guard).ok);applyBrush(core,'guard',8,8,undefined,guard.options);assert.deepEqual(d.map,core.map);
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
