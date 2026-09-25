import * as sceneryRules from '../dist/tactics/environment.js';
import * as coreRules from '../dist/tactics/core/environment.js';
import {CLIFF_PROPS} from '../dist/tactics/cliff-map.js';
import {LIGHT_PROPS} from '../dist/tactics/light-sources.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {InspectionDocument,PREVIEW_FOOTPRINTS} from '../dist/tactics/editor-3d-model.js';
import {setInspectionCamera,floorPoint} from '../dist/tactics/editor-3d-camera.js';
import {blankMap,generateRiverMap} from '../dist/tactics/core/maps.js';
import {extractBlock} from '../dist/tactics/core/blocks.js';
import {propCells} from '../dist/tactics/core/environment.js';
const root=new URL('../dist/tactics/',import.meta.url);
test('factory inspection retains every saved field and all authored guards',()=>{
 const raw=JSON.parse(fs.readFileSync(new URL('default-factory.json',root)));raw.extension={future:['keep',17]};
 const doc=new InspectionDocument().open(JSON.stringify(raw));assert.deepEqual(JSON.parse(doc.export()),raw);assert.equal(doc.units.length,40);assert.equal(doc.map.props.length,398);
 doc.inspect(3,3,0);assert.deepEqual(JSON.parse(doc.export()),raw);
});
test('river and reusable block inspection preserve portable documents without fake squad starts',()=>{
 const river=generateRiverMap(42,'River inspection',0),block=extractBlock(river,0,0);
 for(const raw of [river,block]){const doc=new InspectionDocument().open(JSON.stringify(raw));assert.deepEqual(JSON.parse(doc.export()),raw);assert.equal(doc.size,raw===block?24:240);if(raw===block)assert.equal(doc.units.filter(u=>u.id.startsWith('start')).length,0);}
});
test('logical selection handles multi-tile props, empty upper cells, edges and hidden objects',()=>{
 const m=blankMap('Picking');m.props=[{x:10,y:10,z:0,kind:'roof-flat-parapet'},{x:20,y:20,z:0,kind:'roof-corrugated-sloped',rotated:true}];m.edges={'e:5:5':'wall','s:5:5:1':'window-brick'};
 const doc=new InspectionDocument().open(JSON.stringify(m));
 for(const p of m.props)for(const q of propCells(p))assert.deepEqual(doc.inspect(q.x,q.y,q.z,{mode:'prop'}).data,p);
 assert.equal(doc.inspect(10,10,0,{roofs:false}).type,'tile');assert.equal(doc.inspect(5.49,5,0).edge,'e:5:5');assert.equal(doc.inspect(5.49,5,0,{walls:false}).type,'tile');
 assert.equal(doc.inspect(5,5.49,1).edge,'s:5:5:1');assert.equal(doc.inspect(150,150,2).label,'Empty floor cell');assert.equal(doc.inspect(-1,5,0),null);
});
test('active plane picking round-trips across all floors, camera presets and empty space',()=>{
 const camera=new T.OrthographicCamera(),w=960,h=720;
 for(const preset of ['0','1','2','3','top'])for(const level of [0,1,2]){
  setInspectionCamera(camera,{x:20,y:30,level,preset,span:30},w,h);
  for(const [x,y]of [[20,30],[22.49,28],[18,34.49]]){const p=new T.Vector3(x,level*2.12,y).project(camera),hit=floorPoint(camera,(p.x+1)*w/2,(1-p.y)*h/2,w,h,level);assert.ok(Math.abs(hit.x-x)<1e-8);assert.ok(Math.abs(hit.y-y)<1e-8);}
 }
});
test('invalid imports fail without replacing an existing document; cargo sizes follow decisions',()=>{
 const doc=new InspectionDocument().open(JSON.stringify(blankMap('Keep me'))),saved=doc.export();
 assert.throws(()=>doc.open('{broken'));assert.equal(doc.export(),saved);
 assert.throws(()=>doc.open(JSON.stringify({...doc.original,version:1})),/legacy/i);assert.equal(doc.export(),saved);
 assert.deepEqual(PREVIEW_FOOTPRINTS.find(p=>p.id==='truck').tiles,[2,3]);assert.deepEqual(PREVIEW_FOOTPRINTS.find(p=>p.id==='barrel-row').tiles,[1,2]);
});
test('scenery map catalog agrees with the pinned editing and encounter rules',()=>{
 assert.deepEqual(coreRules.PROPS,{...sceneryRules.PROPS,...LIGHT_PROPS,...CLIFF_PROPS});assert.deepEqual(coreRules.EDGES,sceneryRules.EDGES);assert.deepEqual(coreRules.GROUNDS,sceneryRules.GROUNDS);
});
